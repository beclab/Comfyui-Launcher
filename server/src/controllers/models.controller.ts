import { Context } from 'koa';
import fs from 'fs-extra';
import path from 'path';
import { promisify } from 'util';
import stream from 'stream';
import { logger } from '../utils/logger';
import superagent from 'superagent';  // 使用已有的 superagent 代替 axios
import { config } from '../config';
import https from 'https';  // 使用内置的 https 模块
import http from 'http';    // 使用内置的 http 模块
import { v4 as uuidv4 } from 'uuid';
import { DownloadController } from './download.controller';
import { Model, DownloadProgress, EssentialModel } from '../types/models.types';

// 必要模型接口定义

// 下载任务接口
interface DownloadTask {
  overallProgress: number;
  currentModelIndex: number;
  currentModelProgress: number;
  currentModel: EssentialModel | null;
  completed: boolean;
  error: string | null;
  canceled: boolean;
  temporaryCanceled?: boolean;
  totalBytes: number;       // 总字节数
  downloadedBytes: number;  // 已下载字节数
  speed: number;           // 下载速度 (bytes/second)
  startTime?: number;      // 下载开始时间
  lastUpdateTime?: number; // 上次更新时间戳
  lastBytes?: number;      // 上次更新时的字节数
  lastLogTime?: number;    // 添加这个属性
  status: 'downloading' | 'completed' | 'error';  // 添加 status 字段
  startBytes?: number;  // 开始下载前已存在的字节数
}

export const isDev = process.env.NODE_ENV !== 'production';

// 记录下载任务状态
const downloadTasks = new Map<string, DownloadTask>();

// 模型信息接口
interface ModelInfo {
  name: string;
  type: string;
  base_url: string;
  save_path: string;
  description?: string;
  reference?: string;
  filename?: string;
  sha256?: string;
  installed?: boolean;
  url?: string;  // 添加 url 属性
}

// 定义接口来匹配远程API的响应结构
interface ModelListResponse {
  models: ModelInfo[];
}

// 添加响应类型接口
interface ProgressResponse {
  overallProgress: number;
  currentModelIndex: number;
  currentModelProgress: number;
  currentModel: EssentialModel | null;
  completed: boolean;
  error: string | null;
  totalBytes: number;
  downloadedBytes: number;
  speed: number;
  status: string;
}

export class ModelsController extends DownloadController {
  private modelCache: ModelInfo[] = [];
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 1天的缓存时间
  private readonly MODEL_LIST_URL = 'https://raw.githubusercontent.com/ltdrdata/ComfyUI-Manager/main/model-list.json';
  private readonly LOCAL_CACHE_PATH = path.join(config.dataDir, 'model-cache.json');
  private comfyuiPath: string;
  private modelsDir: string;
  
  // 增加全局计数器跟踪进度事件
  private progressEventCounter = 0;
  
  constructor() {
    super(); // 调用父类构造函数
    
    // 初始化路径
    this.comfyuiPath = process.env.COMFYUI_PATH || 
      (isDev ? path.join(process.cwd(), 'comfyui') : '/root/ComfyUI');
    this.modelsDir = config.modelsDir;
    
    // 确保模型目录存在
    fs.ensureDirSync(this.modelsDir);
  }

  private ensureCacheDirectory() {
    const dir = path.dirname(this.LOCAL_CACHE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // 获取模型列表
  async getModelList(mode: 'cache' | 'local' | 'remote' = 'cache'): Promise<ModelInfo[]> {
    try {
      let models: ModelInfo[] = [];
      
      switch (mode) {
        case 'remote':
          models = await this.getRemoteModels();
          break;
        case 'local':
          models = await this.getLocalModels();
          break;
        case 'cache':
        default:
          models = await this.getCachedModels();
          if (models.length === 0 || Date.now() - this.cacheTimestamp > this.CACHE_DURATION) {
            models = await this.getRemoteModels();
          }
          break;
      }

      // 确保返回值是数组
      return Array.isArray(models) ? models : [];
    } catch (error) {
      console.error('获取模型列表失败:', error);
      return [];
    }
  }

  // 从缓存获取模型列表
  private async getCachedModels(): Promise<ModelInfo[]> {
    try {
      if (!fs.existsSync(this.LOCAL_CACHE_PATH)) {
        return [];
      }

      const cacheData = JSON.parse(fs.readFileSync(this.LOCAL_CACHE_PATH, 'utf-8'));
      
      // 验证缓存数据格式
      if (!cacheData || !Array.isArray(cacheData.models)) {
        console.error('缓存数据格式不正确');
        return [];
      }

      this.modelCache = cacheData.models;
      this.cacheTimestamp = cacheData.timestamp || Date.now();
      
      return this.checkInstalledStatus(this.modelCache);
    } catch (error) {
      console.error('读取模型缓存失败:', error);
      return [];
    }
  }

  // 获取本地模型列表（不依赖网络）
  private getLocalModels(): ModelInfo[] {
    try {
      // 这里可以添加一个预先打包的模型列表作为备用
      const localModelListPath = path.join(__dirname, '../../data/default-model-list.json');
      if (fs.existsSync(localModelListPath)) {
        const models = JSON.parse(fs.readFileSync(localModelListPath, 'utf-8'));
        return this.checkInstalledStatus(models);
      }
    } catch (error) {
      console.error('Error loading local model list:', error);
    }
    return [];
  }

  // 从远程获取最新模型列表
  private async getRemoteModels(): Promise<ModelInfo[]> {
    try {
      return new Promise((resolve, reject) => {
        https.get(this.MODEL_LIST_URL, (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            try {
              // 解析响应数据并获取models数组
              const parsedData = JSON.parse(data) as ModelListResponse;
              const models = parsedData.models || [];
              
              // 更新缓存
              this.modelCache = models;
              this.cacheTimestamp = Date.now();
              
              // 保存到本地缓存
              fs.writeFileSync(this.LOCAL_CACHE_PATH, JSON.stringify({
                models,
                timestamp: this.cacheTimestamp
              }));
              
              resolve(this.checkInstalledStatus(models));
            } catch (error) {
              console.error('解析模型数据失败:', error);
              resolve([]); 
            }
          });
        }).on('error', (error) => {
          console.error('获取远程模型列表失败:', error);
          resolve([]);
        });
      });
    } catch (error) {
      console.error('获取远程模型列表发生错误:', error);
      return [];
    }
  }

  // 检查模型是否已安装
  private checkInstalledStatus(models: ModelInfo[]): ModelInfo[] {
    if (!Array.isArray(models)) {
      console.error('checkInstalledStatus: 输入不是数组');
      return [];
    }

    return models.map(model => {
      if (!model || typeof model !== 'object') {
        console.error('无效的模型数据:', model);
        return null;
      }

      try {
        const targetPath = path.join(
          this.comfyuiPath,
          model.save_path || '',
          model.filename || ''
        );
        model.installed = fs.existsSync(targetPath);
        return model;
      } catch (error) {
        console.error('检查模型安装状态失败:', error);
        return null;
      }
    }).filter(model => model !== null) as ModelInfo[];
  }

  // 添加一个新的API端点来处理模型名称下载请求
  async installModel(ctx: Context): Promise<void> {
    const { modelName } = ctx.params;
    const { source = 'hf' } = ctx.request.body as { source?: string };
    
    logger.info(`请求安装模型(通过API): ${modelName}`);
    
    if (!modelName) {
      ctx.status = 400;
      ctx.body = { 
        success: false,
        message: '模型名称不能为空' 
      };
      return;
    }
    
    try {
      // 1. 获取模型信息
      const modelInfo = await this.getModelInfo(modelName);
      if (!modelInfo) {
        throw new Error(`未找到模型 ${modelName} 的信息`);
      }
      
      // 2. 创建任务ID
      const taskId = this.createDownloadTask();
      
      // 3. 保存模型名称到任务ID的映射
      this.modelDownloads.set(modelName, taskId);
      
      // 4. 确定模型类型和保存路径
      const modelType = modelInfo.type || this.inferModelType(modelName);
      const modelDir = this.getModelSaveDir(modelType);
      const outputPath = path.join(this.comfyuiPath, modelDir, modelName);
      
      // 5. 构建下载URL - 兼容不同的模型信息结构
      let downloadUrl;
      if (modelInfo.url) {
        if (typeof modelInfo.url === 'string') {
          // 如果URL是字符串，也需要根据source参数决定使用哬镜像站
          downloadUrl = modelInfo.url;
          // 如果用户选择使用镜像站而不是HuggingFace
          if (source !== 'hf' && downloadUrl.includes('huggingface.co')) {
            // 将huggingface.co替换为hf-mirror.com
            downloadUrl = downloadUrl.replace('huggingface.co', 'hf-mirror.com');
          }
        } else if (modelInfo.url.hf && modelInfo.url.mirror) {
          // 如果URL是包含hf和mirror的对象，则根据source选择
          downloadUrl = source === 'hf' ? modelInfo.url.hf : modelInfo.url.mirror;
        } else {
          // 其他情况
          downloadUrl = Object.values(modelInfo.url)[0];
        }
      } else if (modelInfo.download_url) {
        // 某些API可能使用download_url字段
        downloadUrl = modelInfo.download_url;
      } else {
        // 如果没有URL信息，使用默认的HuggingFace或镜像站构建URL
        const baseUrl = source === 'hf' ? 'https://huggingface.co/' : 'https://hf-mirror.com/';
        const repo = modelInfo.repo || `models/${modelName}`;
        const filename = modelInfo.filename || modelName;
        downloadUrl = `${baseUrl}${repo}/resolve/main/${filename}`;
      }
      
      // 6. 异步启动下载过程
      this.downloadModelByName(modelName, downloadUrl, outputPath, taskId).catch(err => {
        logger.error(`下载模型 ${modelName} 失败: ${err instanceof Error ? err.message : String(err)}`);
      });
      
      // 7. 立即返回成功响应，让前端开始轮询
      ctx.body = {
        success: true,
        taskId: taskId,
        message: `开始下载模型 ${modelName}`
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `启动下载失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // 添加获取模型信息的方法
  private async getModelInfo(modelName: string): Promise<any> {
    // 实际实现中，应该从数据库或API获取模型信息
    // 这里提供一个简单的示例
    const models = await this.getModelList();
    return models.find(model => model.name === modelName);
  }

  // 获取下载进度
  getDownloadProgress(modelName: string): DownloadProgress | null {
    return this.modelDownloads.get(modelName) ? null : null;
  }

  // 重命名方法以避免与基类冲突
  async cancelModelDownload(modelName: string): Promise<void> {
    const taskId = this.modelDownloads.get(modelName);
    if (!taskId) {
      return;
    }
    
    // 调用基类的取消方法
    await this.cancelDownloadById(taskId);
    
    logger.info(`模型 ${modelName} 下载已取消，保留部分下载文件以支持断点续传`);
  }
  
  // 为路由处理添加符合基类签名的方法
  async cancelDownload(ctx: Context): Promise<void> {
    const { modelName } = ctx.request.body as { modelName?: string };
    
    if (!modelName) {
      ctx.status = 400;
      ctx.body = { error: '缺少模型名称' };
      return;
    }
    
    await this.cancelModelDownload(modelName);
    ctx.body = { success: true };
  }
  
  // 修改访问修饰符，与基类保持一致
  protected async cancelDownloadById(taskId: string): Promise<void> {
    if (!this.taskProgress.has(taskId)) {
      return;
    }
    
    const progress = this.taskProgress.get(taskId)!;
    progress.status = 'error';
    progress.error = '下载已取消';
    progress.canceled = true;
    
    if (progress.abortController) {
      progress.abortController.abort();
    }
    
    this.updateTaskProgress(taskId, progress);
  }

  // 在路由处理中添加获取下载进度的端点
  async getModelProgress(ctx: Context): Promise<void> {
    // 直接调用父类的 getProgress 方法
    await this.getProgress(ctx);
  }

  // 添加ensureDirectories方法
  private async ensureDirectories(models: EssentialModel[]): Promise<void> {
    // 收集所有需要创建的目录
    const dirSet = new Set<string>();
    
    for (const model of models) {
      const dirPath = path.join(this.comfyuiPath, model.dir);
      dirSet.add(dirPath);
    }
    
    // 确保所有目录存在
    for (const dir of dirSet) {
      logger.info(`确保目录存在: ${dir}`);
      await fs.ensureDir(dir);
    }
  }

  // 获取所有模型
  async getAllModels(ctx: Context): Promise<void> {
    // 实现获取所有模型的逻辑
    // 如果 getModels 方法有额外逻辑，应合并到这里
    ctx.body = {
      available: [
        { id: 'sd_1.5', name: 'SD 1.5 基础模型', size: '4.2 GB', downloaded: false },
        { id: 'sd_2.1', name: 'SD 2.1 基础模型', size: '5.3 GB', downloaded: false },
        { id: 'sdxl', name: 'SDXL 基础模型', size: '6.8 GB', downloaded: false },
        { id: 'controlnet', name: 'ControlNet', size: '3.5 GB', downloaded: true },
        { id: 'lora', name: 'LoRA 模型集合', size: '2.1 GB', downloaded: false }
      ],
      downloaded: [
        { id: 'controlnet', name: 'ControlNet', size: '3.5 GB', path: '/models/controlnet' }
      ]
    };
  }

  // 删除模型
  public async deleteModel(ctx: Context) {
    const { modelName } = ctx.request.body as { modelName?: string };
    
    if (!modelName) {
      ctx.status = 400;
      ctx.body = { error: '缺少模型名称' };
      return;
    }
    
    // 实现删除模型逻辑
    // ...
    
    ctx.body = { success: true };
  }
  
  // 获取已安装模型列表
  public async getInstalledModels(ctx: Context) {
    // 获取已安装模型列表逻辑
    // ...
    
    ctx.body = [];
  }

  // 增强获取内容长度的函数
  private getContentLength(headers: any): number | null {
    if (!headers) {
      logger.debug('!!!!! getContentLength: headers 为空');
      return null;
    }
    
    logger.info(`!!!!! getContentLength: headers 类型 = ${typeof headers}`);
    
    try {
      // 处理字符串形式的 content-length
      if (headers['content-length']) {
        const contentLength = headers['content-length'];
        logger.info(`!!!!! getContentLength: content-length 值 = "${contentLength}", 类型 = ${typeof contentLength}`);
        
        if (typeof contentLength === 'string') {
          const size = parseInt(contentLength.trim(), 10);
          logger.info(`!!!!! getContentLength: 解析后的大小 = ${size}, 是否有效: ${!isNaN(size)}`);
          return isNaN(size) ? null : size;
        } else if (typeof contentLength === 'number') {
          logger.info(`!!!!! getContentLength: 数字类型的大小 = ${contentLength}`);
          return contentLength;
        }
      }
      
      // 检查是否有大写或其他形式的 Content-Length
      const contentLengthKey = Object.keys(headers).find(
        key => key.toLowerCase() === 'content-length'
      );
      
      if (contentLengthKey && contentLengthKey !== 'content-length') {
        const contentLength = headers[contentLengthKey];
        logger.info(`!!!!! getContentLength: 找到 ${contentLengthKey} = "${contentLength}"`);
        
        if (typeof contentLength === 'string') {
          const size = parseInt(contentLength.trim(), 10);
          logger.info(`!!!!! getContentLength: 从 ${contentLengthKey} 解析的大小 = ${size}`);
          return isNaN(size) ? null : size;
        } else if (typeof contentLength === 'number') {
          return contentLength;
        }
      }
    } catch (error) {
      logger.error(`!!!!! getContentLength 解析错误: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    logger.warn('!!!!! getContentLength: 无法提取内容长度');
    return null;
  }

  // 添加此方法作为 getModelList 的别名
  public async getModels(ctx: Context): Promise<void> {
    const models = await this.getModelList();
    ctx.body = models;
  }

  // 根据模型名称推断模型类型
  private inferModelType(modelName: string): string {
    const lowerName = modelName.toLowerCase();
    
    if (lowerName.endsWith('.safetensors') || lowerName.endsWith('.ckpt')) {
      if (lowerName.includes('lora')) return 'lora';
      if (lowerName.includes('inpaint')) return 'inpaint';
      if (lowerName.includes('controlnet')) return 'controlnet';
      return 'checkpoint';
    } else if (lowerName.endsWith('.pth')) {
      if (lowerName.includes('upscale')) return 'upscaler';
      return 'vae';
    } else if (lowerName.endsWith('.pt')) {
      return 'embedding';
    }
    
    return 'checkpoint'; // 默认类型
  }
  
  // 根据模型类型获取保存目录
  private getModelSaveDir(modelType: string): string {
    switch (modelType) {
      case 'checkpoint': return 'models/checkpoints';
      case 'lora': return 'models/loras';
      case 'vae': return 'models/vae';
      case 'controlnet': return 'models/controlnet';
      case 'upscaler': return 'models/upscale_models';
      case 'embedding': return 'models/embeddings';
      case 'inpaint': return 'models/inpaint';
      default: return 'models/checkpoints';
    }
  }
} 