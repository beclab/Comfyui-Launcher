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
import { essentialModels } from './essential-models.controller';
import { SystemController } from './system.controller';  // 导入SystemController

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
  fileStatus?: 'complete' | 'incomplete' | 'corrupted' | 'unknown';
  fileSize?: number;
  size?: string;  // 模型列表中提供的大小信息（字符串格式）
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
  private readonly LOCAL_DEFAULT_LIST_PATH = path.join(__dirname, '../model-list.json');
  private comfyuiPath: string;
  private modelsDir: string;
  private systemController: SystemController;  // 添加SystemController实例
  
  // 增加全局计数器跟踪进度事件
  private progressEventCounter = 0;
  
  constructor() {
    super(); // 调用父类构造函数
    
    // 初始化系统控制器
    this.systemController = new SystemController();
    
    // 初始化路径
    this.comfyuiPath = process.env.COMFYUI_PATH || 
      (isDev ? path.join(process.cwd(), 'comfyui') : '/root/ComfyUI');
    this.modelsDir = config.modelsDir;
    
    // 确保模型目录存在
    fs.ensureDirSync(this.modelsDir);

    // 启动时自动进行一次模型扫描
    this.initScan();
  }

  /**
   * 获取Hugging Face端点配置
   * 从系统控制器获取
   */
  private getHuggingFaceEndpoint(): string | undefined {
    // 优先使用环境变量
    if (process.env.HF_ENDPOINT) {
      return process.env.HF_ENDPOINT;
    }
    
    // 尝试从系统控制器的配置中获取
    if (this.systemController && this.systemController.envConfig) {
      return this.systemController.envConfig.HF_ENDPOINT;
    }
    
    return undefined;
  }

  // 初始化扫描方法
  private async initScan() {
    try {
      logger.info('应用启动，开始初始扫描已安装模型...');
      
      // 延迟几秒后执行，以免影响应用启动速度
      setTimeout(async () => {
        // 刷新模型安装状态
        const updatedModels = await this.refreshInstalledStatus();
        
        // 更新本地缓存
        this.modelCache = updatedModels;
        this.cacheTimestamp = Date.now();
        
        // 保存到本地缓存
        this.ensureCacheDirectory();
        await fs.writeFile(this.LOCAL_CACHE_PATH, JSON.stringify({
          models: updatedModels,
          timestamp: this.cacheTimestamp
        }));
        
        logger.info(`初始扫描完成，找到 ${updatedModels.filter(m => m.installed).length} 个已安装模型`);
      }, 5000); // 延迟5秒执行，以免影响应用启动
    } catch (error) {
      logger.error(`初始模型扫描失败: ${error instanceof Error ? error.message : String(error)}`);
    }
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
      // 合并常规模型和基础模型列表
      const regularModels = await this.getRegularModelList(mode);
      const essentialModelsList = this.convertEssentialModelsToModelInfo(essentialModels);
      
      // 使用Map进行去重，基础模型优先
      const modelMap = new Map<string, ModelInfo>();
      
      // 先添加常规模型
      regularModels.forEach(model => {
        const key = model.filename || model.name || model.save_path;
        if (key) {
          modelMap.set(key, model);
        }
      });
      
      // 再添加基础模型（会覆盖同名的常规模型）
      essentialModelsList.forEach(model => {
        const key = model.filename || model.name || model.save_path;
        if (key) {
          modelMap.set(key, model);
        }
      });
      
      // 返回去重后的列表
      return Array.from(modelMap.values());
    } catch (error) {
      logger.error(`获取模型列表出错: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  // 原来的获取模型列表逻辑移到这个方法中
  private async getRegularModelList(mode: 'cache' | 'local' | 'remote' = 'cache'): Promise<ModelInfo[]> {
    try {
      // 优先使用内存缓存(当mode为cache时)
      if (mode === 'cache' && this.modelCache && this.cacheTimestamp && 
          Date.now() - this.cacheTimestamp < this.CACHE_DURATION) {
        logger.info('使用缓存的模型列表');
        return this.modelCache;
      }

      // 如果请求远程数据，直接获取
      if (mode === 'remote') {
        return await this.getRemoteModels();
      }

      // 如果请求本地数据，尝试读取本地缓存
      if (mode === 'local') {
        return await this.getLocalModels();
      }

      // 默认情况下按顺序尝试：缓存文件 -> 远程API -> 本地默认列表
      // 尝试读取本地缓存文件
      try {
        if (await fs.pathExists(this.LOCAL_CACHE_PATH)) {
          const cacheData = await fs.readFile(this.LOCAL_CACHE_PATH, 'utf8');
          const cacheJson = JSON.parse(cacheData);
          
          if (cacheJson.models && Array.isArray(cacheJson.models) && 
              cacheJson.timestamp && 
              Date.now() - cacheJson.timestamp < this.CACHE_DURATION) {
            logger.info('使用本地缓存文件的模型列表');
            this.modelCache = cacheJson.models;
            this.cacheTimestamp = cacheJson.timestamp;
            return this.modelCache;
          }
        }
      } catch (cacheError) {
        logger.warn(`读取本地缓存文件失败: ${cacheError instanceof Error ? cacheError.message : String(cacheError)}`);
      }
      
      // 尝试从远程API获取
      try {
        logger.info('从远程API获取模型列表...');
        const models = await this.getRemoteModels();
        
        // 更新缓存
        this.modelCache = models;
        this.cacheTimestamp = Date.now();
        
        // 保存到本地缓存
        this.ensureCacheDirectory();
        await fs.writeFile(this.LOCAL_CACHE_PATH, JSON.stringify({
          models,
          timestamp: this.cacheTimestamp
        }));
        
        logger.info(`成功从API获取到 ${models.length} 个模型`);
        return models;
      } catch (apiError) {
        logger.error(`从API获取模型列表失败: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
        
        // 使用本地默认模型列表
        try {
          logger.info('使用本地默认模型列表...');
          if (await fs.pathExists(this.LOCAL_DEFAULT_LIST_PATH)) {
            const defaultData = await fs.readFile(this.LOCAL_DEFAULT_LIST_PATH, 'utf8');
            const defaultJson = JSON.parse(defaultData);
            
            if (defaultJson.models && Array.isArray(defaultJson.models)) {
              logger.info(`从本地默认列表加载了 ${defaultJson.models.length} 个模型`);
              return defaultJson.models;
            }
          }
        } catch (defaultError) {
          logger.error(`读取本地默认模型列表失败: ${defaultError instanceof Error ? defaultError.message : String(defaultError)}`);
        }
      }
      
      // 所有方法都失败，返回空列表
      logger.warn('无法获取模型列表，返回空列表');
      return [];
    } catch (error) {
      logger.error(`获取常规模型列表出错: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  // 添加将基础模型转换为ModelInfo格式的方法
  private convertEssentialModelsToModelInfo(essentialModels: EssentialModel[]): ModelInfo[] {
    try {
      return essentialModels.map(model => {
        // 创建路径字符串
        const savePath = `models/${model.dir}/${model.out}`;
        
        // 检查模型是否已安装
        const fullPath = path.join(this.comfyuiPath, savePath);
        const isInstalled = fs.existsSync(fullPath);
        let fileSize = 0;
        let fileStatus: 'complete' | 'incomplete' | 'corrupted' | 'unknown' = 'unknown';
        
        if (isInstalled) {
          try {
            const stat = fs.statSync(fullPath);
            fileSize = stat.size;
            fileStatus = fileSize > 0 ? 'complete' : 'incomplete';
          } catch (error) {
            logger.error(`检查基础模型文件 ${fullPath} 时出错: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
        
        // 创建与ModelInfo接口兼容的对象
        return {
          name: model.name,              // 使用基础模型的名称
          type: model.type,              // 模型类型
          base_url: '',                  // 基础模型没有base_url
          save_path: savePath,           // 保存路径
          description: model.description,// 描述
          filename: model.out,           // 文件名
          installed: isInstalled && fileSize > 0, // 是否已安装
          essential: true,               // 标记为基础模型
          fileStatus: fileStatus,        // 文件状态
          fileSize: fileSize,            // 文件大小
          url: model.url.mirror || model.url.hf  // 使用其中一个URL作为字符串值
        } as unknown as ModelInfo;       // 使用双重类型断言
      });
    } catch (error) {
      logger.error(`转换基础模型列表出错: ${error instanceof Error ? error.message : String(error)}`);
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
      
      // 6. 检查HF_ENDPOINT配置，如果有则替换huggingface.co
      const hfEndpoint = this.getHuggingFaceEndpoint();
      if (hfEndpoint && downloadUrl.includes('huggingface.co')) {
        logger.info(`使用配置的HF端点 ${hfEndpoint} 替换 huggingface.co`);
        downloadUrl = downloadUrl.replace('huggingface.co/', hfEndpoint.replace(/^https?:\/\//, ''));
      }
      
      logger.info(`即将从 ${downloadUrl} 下载模型到 ${outputPath}`);
      
      // 7. 异步启动下载过程
      this.downloadModelByName(modelName, downloadUrl, outputPath, taskId, source).catch(err => {
        logger.error(`下载模型 ${modelName} 失败: ${err instanceof Error ? err.message : String(err)}`);
      });
      
      // 8. 立即返回成功响应，让前端开始轮询
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
    
    try {
      // 获取模型信息
      const models = await this.getModelList();
      const modelInfo = models.find(model => 
        model.name === modelName || model.filename === modelName
      );
      
      if (!modelInfo) {
        logger.warn(`Delete model: Model not found: ${modelName}`);
        ctx.status = 404;
        ctx.body = { error: `找不到模型: ${modelName}` };
        return;
      }
      
      if (!modelInfo.installed) {
        logger.warn(`Delete model: Model not installed: ${modelName}`);
        ctx.status = 400;
        ctx.body = { error: `模型未安装: ${modelName}` };
        return;
      }
      
      // 构建模型文件的完整路径
      const modelPath = modelInfo.save_path 
        ? path.join(this.comfyuiPath, modelInfo.save_path)
        : path.join(
            this.comfyuiPath, 
            this.getModelSaveDir(modelInfo.type), 
            modelInfo.filename || modelName
          );
      
      logger.info(`Attempting to delete model: ${modelName} at path: ${modelPath}`);
      
      // 检查文件是否存在
      if (!await fs.pathExists(modelPath)) {
        logger.warn(`Delete model: File not found at path: ${modelPath}`);
        ctx.status = 404;
        ctx.body = { error: `找不到模型文件: ${modelPath}` };
        return;
      }
      
      // 删除文件
      await fs.remove(modelPath);
      logger.info(`Model deleted successfully: ${modelName}`);
      
      // 更新模型缓存状态
      if (this.modelCache && this.modelCache.length > 0) {
        const modelIndex = this.modelCache.findIndex(model => 
          model.name === modelName || model.filename === modelName
        );
        
        if (modelIndex !== -1) {
          this.modelCache[modelIndex].installed = false;
          this.modelCache[modelIndex].fileStatus = undefined;
          this.modelCache[modelIndex].fileSize = undefined;
        }
      }
      
      ctx.body = { 
        success: true,
        message: `模型 ${modelName} 已成功删除`
      };
    } catch (error) {
      logger.error(`Delete model error: ${error instanceof Error ? error.message : String(error)}`);
      ctx.status = 500;
      ctx.body = { 
        error: `删除模型时出错: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }
  
  // // 获取已安装模型列表
  // public async getInstalledModels(ctx: Context) {
  //   // 获取已安装模型列表逻辑
  //   // ...
    
  //   ctx.body = [];
  // }

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

  // 添加一个新方法用于扫描模型目录下所有已安装的模型
  private async scanInstalledModels(): Promise<Map<string, any>> {
    const installedModels = new Map<string, any>();
    
    try {
      // 获取所有可能的模型目录
      const modelDirs = [
        path.join(this.comfyuiPath, 'models/checkpoints'),
        path.join(this.comfyuiPath, 'models/loras'), 
        path.join(this.comfyuiPath, 'models/vae'),
        path.join(this.comfyuiPath, 'models/controlnet'),
        path.join(this.comfyuiPath, 'models/upscale_models'),
        path.join(this.comfyuiPath, 'models/embeddings'),
        path.join(this.comfyuiPath, 'models/inpaint')
      ];
      
      // 确保所有目录存在
      for (const dir of modelDirs) {
        await fs.ensureDir(dir);
      }
      
      // 递归扫描所有目录
      for (const dir of modelDirs) {
        await this.scanDirectory(dir, installedModels);
      }
      
      logger.info(`扫描完成，找到 ${installedModels.size} 个已安装模型`);
      return installedModels;
    } catch (error) {
      logger.error(`扫描模型目录时出错: ${error instanceof Error ? error.message : String(error)}`);
      return installedModels;
    }
  }
  
  // 递归扫描目录获取所有模型文件
  private async scanDirectory(dir: string, result: Map<string, any>): Promise<void> {
    try {
      const files = await fs.readdir(dir);
      
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          // 递归扫描子目录
          await this.scanDirectory(fullPath, result);
        } else {
          // 检查是否是模型文件
          const ext = path.extname(file).toLowerCase();
          if (['.safetensors', '.ckpt', '.pth', '.pt', '.bin'].includes(ext)) {
            // 检查文件完整性
            const fileInfo = await this.checkFileBasicIntegrity(fullPath, file, stat.size);
            
            // 使用文件名作为键，文件信息作为值
            const relativePath = path.relative(this.comfyuiPath, fullPath);
            result.set(file, {
              path: relativePath,
              size: stat.size,
              status: fileInfo.status,
              type: this.inferModelTypeFromPath(relativePath)
            });
            
            // 记录文件状态信息到日志
            logger.info(`模型文件: ${file}, 路径: ${relativePath}, 状态: ${fileInfo.status}, 大小: ${this.formatFileSize(stat.size)}`);
          }
        }
      }
    } catch (error) {
      logger.error(`扫描目录 ${dir} 时出错: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 简化版的文件完整性检查
  private async checkFileBasicIntegrity(filePath: string, fileName: string, fileSize: number): Promise<{status: 'complete' | 'incomplete' | 'corrupted', message?: string}> {
    try {
      // 1. 基本检查：文件是否为空
      if (fileSize === 0) {
        return { status: 'incomplete', message: '文件大小为0' };
      }
      
      // 2. 尝试读取文件的前几个字节，检查是否可以访问
      try {
        // 使用 fs.promises.open 代替 fs.open
        const fileHandle = await fs.promises.open(filePath, 'r');
        const buffer = Buffer.alloc(1024); // 读取前1KB进行测试
        
        try {
          const { bytesRead } = await fileHandle.read(buffer, 0, 1024, 0);
          await fileHandle.close();
          
          if (bytesRead <= 0) {
            return { status: 'corrupted', message: '文件无法读取' };
          }
        } catch (error) {
          await fileHandle.close();
          throw error;
        }
      } catch (error) {
        logger.error(`读取文件 ${fileName} 时出错: ${error instanceof Error ? error.message : String(error)}`);
        return { status: 'corrupted', message: '文件无法访问' };
      }
      
      // 通过所有检查，文件被认为是完整的
      return { status: 'complete' };
    } catch (error) {
      logger.error(`检查文件 ${fileName} 完整性时出错: ${error instanceof Error ? error.message : String(error)}`);
      return { status: 'corrupted', message: '检查过程中出错' };
    }
  }

  // 格式化文件大小为可读形式
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  // 从路径推断模型类型
  private inferModelTypeFromPath(relativePath: string): string {
    const lowercasePath = relativePath.toLowerCase();
    if (lowercasePath.includes('checkpoints')) return 'checkpoint';
    if (lowercasePath.includes('loras')) return 'lora';
    if (lowercasePath.includes('vae')) return 'vae';
    if (lowercasePath.includes('controlnet')) return 'controlnet';
    if (lowercasePath.includes('upscale')) return 'upscaler';
    if (lowercasePath.includes('embeddings')) return 'embedding';
    if (lowercasePath.includes('inpaint')) return 'inpaint';
    return 'unknown';
  }

  // 解析大小字符串为字节数
  private parseSizeString(sizeStr: string): number | null {
    try {
      if (!sizeStr) return null;
      
      const match = sizeStr.match(/^([\d.]+)\s*([KMGT]B?)?$/i);
      if (!match) return null;
      
      const value = parseFloat(match[1]);
      const unit = match[2]?.toUpperCase() || '';
      
      if (isNaN(value)) return null;
      
      switch (unit) {
        case 'KB':
        case 'K':
          return value * 1024;
        case 'MB':
        case 'M':
          return value * 1024 * 1024;
        case 'GB':
        case 'G':
          return value * 1024 * 1024 * 1024;
        case 'TB':
        case 'T':
          return value * 1024 * 1024 * 1024 * 1024;
        default:
          return value;
      }
    } catch (error) {
      return null;
    }
  }

  // 刷新模型列表的安装状态并检查完整性
  public async refreshInstalledStatus(): Promise<ModelInfo[]> {
    try {
      // 先获取模型列表
      const models = await this.getModelList();
      
      // 扫描已安装的模型
      const installedModels = await this.scanInstalledModels();
      
      // 跟踪已处理的模型文件，避免重复添加
      const processedFiles = new Set<string>();
      
      // 更新每个模型的安装状态和文件状态
      const updatedModels = await Promise.all(models.map(async model => {
        // 检查模型文件名是否在已安装列表中
        if (model.filename && installedModels.has(model.filename)) {
          processedFiles.add(model.filename); // 标记此文件已处理
          const fileInfo = installedModels.get(model.filename);
          model.installed = true;
          model.fileStatus = fileInfo.status;
          model.fileSize = fileInfo.size;
          model.save_path = fileInfo.path;
          
          // 如果模型有预期大小，检查是否匹配
          if (model.size) {
            const expectedSize = this.parseSizeString(model.size);
            if (expectedSize && Math.abs(fileInfo.size - expectedSize) / expectedSize > 0.1) {
              model.fileStatus = 'incomplete';
              logger.warn(`模型 ${model.filename} 大小不匹配：预期 ${model.size}，实际 ${this.formatFileSize(fileInfo.size)}`);
            }
          }
        } else {
          // 也检查模型名称是否匹配
          const possibleMatches = Array.from(installedModels.keys()).filter(
            filename => filename.includes(model.name) || (model.name && filename.includes(model.name))
          );
          
          if (possibleMatches.length > 0) {
            processedFiles.add(possibleMatches[0]); // 标记此文件已处理
            const fileInfo = installedModels.get(possibleMatches[0]);
            model.installed = true;
            model.filename = possibleMatches[0];
            model.fileStatus = fileInfo.status;
            model.fileSize = fileInfo.size;
            model.save_path = fileInfo.path;
            
            // 与预期大小比较
            if (model.size) {
              const expectedSize = this.parseSizeString(model.size);
              if (expectedSize && Math.abs(fileInfo.size - expectedSize) / expectedSize > 0.1) {
                model.fileStatus = 'incomplete';
                logger.warn(`模型 ${model.filename} 大小不匹配：预期 ${model.size}，实际 ${this.formatFileSize(fileInfo.size)}`);
              }
            }
          } else {
            model.installed = false;
            model.fileStatus = undefined;
          }
        }
        
        return model;
      }));
      
      // 添加已安装但未在列表中的模型文件
      const unknownModels: ModelInfo[] = [];
      
      for (const [filename, fileInfo] of installedModels.entries()) {
        if (!processedFiles.has(filename)) {
          logger.info(`发现本地未知模型: ${filename}, 路径: ${fileInfo.path}`);
          
          // 创建新的模型信息对象
          const newModel: ModelInfo = {
            name: filename, // 使用文件名作为模型名
            type: fileInfo.type || this.inferModelTypeFromPath(fileInfo.path),
            base_url: '',
            save_path: fileInfo.path,
            description: '本地发现的模型，未在官方列表中',
            filename: filename,
            installed: true,
            fileStatus: 'unknown', // 特殊状态表示"未知模型,无法确认完整性"
            fileSize: fileInfo.size
          };
          
          unknownModels.push(newModel);
        }
      }
      
      // 如果有未知模型，添加到结果列表中
      if (unknownModels.length > 0) {
        logger.info(`添加了 ${unknownModels.length} 个本地未知模型到列表中`);
        return [...updatedModels, ...unknownModels];
      }
      
      return updatedModels;
    } catch (error) {
      logger.error(`刷新模型安装状态时出错: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  // API路由处理程序：扫描并更新模型安装状态
  public async scanModels(ctx: Context): Promise<void> {
    try {
      logger.info('开始扫描已安装模型...');
      
      // 刷新模型安装状态
      const updatedModels = await this.refreshInstalledStatus();
      
      // 更新本地缓存
      this.modelCache = updatedModels;
      this.cacheTimestamp = Date.now();
      
      // 保存到本地缓存
      this.ensureCacheDirectory();
      await fs.writeFile(this.LOCAL_CACHE_PATH, JSON.stringify({
        models: updatedModels,
        timestamp: this.cacheTimestamp
      }));
      
      ctx.body = {
        success: true,
        count: updatedModels.filter(m => m.installed).length,
        models: updatedModels
      };
    } catch (error) {
      logger.error(`扫描模型失败: ${error instanceof Error ? error.message : String(error)}`);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `扫描模型失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // 添加对未知模型状态的处理
  private getStatusLabel(status?: string): string {
    switch (status) {
      case 'complete': return '完整';
      case 'incomplete': return '不完整';
      case 'corrupted': return '已损坏';
      case 'unknown': return '未知模型,无法确认完整性';
      default: return '未知';
    }
  }
} 