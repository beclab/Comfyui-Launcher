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

// 必要模型接口定义
interface EssentialModel {
  id: string;
  name: string;
  type: string;
  url: {
    hf: string;
    mirror: string;
  };
  dir: string;
  out: string;
  description?: string;
  size?: string;
  essential: boolean;
}

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

// 必要模型列表
const essentialModels: EssentialModel[] = [
  // 大模型（Checkpoints）
  {
    id: 'flux1-schnell-fp8',
    name: 'Flux1 Schnell FP8 (大模型Checkpoint)',
    type: 'checkpoint',
    essential: true,
    url: {
      mirror: 'https://hf-mirror.com/Comfy-Org/flux1-schnell/resolve/main/flux1-schnell-fp8.safetensors',
      hf: 'https://huggingface.co/Comfy-Org/flux1-schnell/resolve/main/flux1-schnell-fp8.safetensors'
    },
    dir: 'checkpoints',
    out: 'flux1-schnell-fp8.safetensors',
    description: '适用于多种图像生成任务的基础SD模型'
  },
  
  // VAE
  {
    id: 'vae-ft-mse',
    name: 'VAE FT MSE',
    type: 'vae',
    essential: true,
    url: {
      mirror: 'https://hf-mirror.com/stabilityai/sd-vae-ft-mse-original/resolve/main/vae-ft-mse-840000-ema-pruned.safetensors',
      hf: 'https://huggingface.co/stabilityai/sd-vae-ft-mse-original/resolve/main/vae-ft-mse-840000-ema-pruned.safetensors'
    },
    dir: 'vae',
    out: 'vae-ft-mse-840000-ema-pruned.safetensors',
    description: '用于高质量图像重建的VAE模型'
  },
  
  // TAESD（用于高质量预览）
  {
    id: 'taesd-decoder',
    name: 'TAESD 解码器',
    type: 'vae_approx',
    essential: true,
    url: {
      mirror: 'https://ghp.ci/https://raw.githubusercontent.com/madebyollin/taesd/main/taesd_decoder.pth',
      hf: 'https://raw.githubusercontent.com/madebyollin/taesd/main/taesd_decoder.pth'
    },
    dir: 'vae_approx',
    out: 'taesd_decoder.pth',
    description: '用于快速预览生成图像的轻量级解码器'
  },
  {
    id: 'taesdxl-decoder',
    name: 'TAESDXL 解码器',
    type: 'vae_approx',
    essential: true,
    url: {
      mirror: 'https://ghp.ci/https://raw.githubusercontent.com/madebyollin/taesd/main/taesdxl_decoder.pth',
      hf: 'https://raw.githubusercontent.com/madebyollin/taesd/main/taesdxl_decoder.pth'
    },
    dir: 'vae_approx',
    out: 'taesdxl_decoder.pth',
    description: '用于SDXL模型的轻量级预览解码器'
  },
  {
    id: 'taesd3-decoder',
    name: 'TAESD3 解码器',
    type: 'vae_approx',
    essential: true,
    url: {
      mirror: 'https://ghp.ci/https://raw.githubusercontent.com/madebyollin/taesd/main/taesd3_decoder.pth',
      hf: 'https://raw.githubusercontent.com/madebyollin/taesd/main/taesd3_decoder.pth'
    },
    dir: 'vae_approx',
    out: 'taesd3_decoder.pth',
    description: '用于SD3模型的轻量级预览解码器'
  },
  {
    id: 'taef1-decoder',
    name: 'TAEF1 解码器',
    type: 'vae_approx',
    essential: true,
    url: {
      mirror: 'https://ghp.ci/https://raw.githubusercontent.com/madebyollin/taesd/main/taef1_decoder.pth',
      hf: 'https://raw.githubusercontent.com/madebyollin/taesd/main/taef1_decoder.pth'
    },
    dir: 'vae_approx',
    out: 'taef1_decoder.pth',
    description: '用于Flux模型的轻量级预览解码器'
  },
  
  // 放大模型
  {
    id: 'siax-upscaler',
    name: '4x NMKD-Siax 放大模型',
    type: 'upscaler',
    essential: true,
    url: {
      mirror: 'https://hf-mirror.com/gemasai/4x_NMKD-Siax_200k/resolve/main/4x_NMKD-Siax_200k.pth',
      hf: 'https://huggingface.co/gemasai/4x_NMKD-Siax_200k/resolve/main/4x_NMKD-Siax_200k.pth'
    },
    dir: 'upscale_models',
    out: '4x_NMKD-Siax_200k.pth',
    description: '4倍高质量图像放大模型'
  },
  {
    id: 'remacri-upscaler',
    name: '4x Remacri 放大模型',
    type: 'upscaler',
    essential: true,
    url: {
      mirror: 'https://hf-mirror.com/uwg/upscaler/resolve/main/ESRGAN/4x_foolhardy_Remacri.pth',
      hf: 'https://huggingface.co/uwg/upscaler/resolve/main/ESRGAN/4x_foolhardy_Remacri.pth'
    },
    dir: 'upscale_models',
    out: '4x_foolhardy_Remacri.pth',
    description: '4倍细节增强型放大模型'
  },
  {
    id: 'nmkd-superscale',
    name: '8x NMKD-Superscale 放大模型',
    type: 'upscaler',
    essential: true,
    url: {
      mirror: 'https://hf-mirror.com/uwg/upscaler/resolve/main/ESRGAN/8x_NMKD-Superscale_150000_G.pth',
      hf: 'https://huggingface.co/uwg/upscaler/resolve/main/ESRGAN/8x_NMKD-Superscale_150000_G.pth'
    },
    dir: 'upscale_models',
    out: '8x_NMKD-Superscale_150000_G.pth',
    description: '8倍大幅放大模型'
  },
  
  // Embeddings
  {
    id: 'easynegative',
    name: 'EasyNegative 嵌入',
    type: 'embedding',
    essential: true,
    url: {
      mirror: 'https://hf-mirror.com/datasets/gsdf/EasyNegative/resolve/main/EasyNegative.safetensors',
      hf: 'https://huggingface.co/datasets/gsdf/EasyNegative/resolve/main/EasyNegative.safetensors'
    },
    dir: 'embeddings',
    out: 'easynegative.safetensors',
    description: '通用负面提示词嵌入，有助于减少常见生成缺陷'
  },
  {
    id: 'deepnegative',
    name: 'DeepNegative 嵌入',
    type: 'embedding',
    essential: true,
    url: {
      mirror: 'https://hf-mirror.com/lenML/DeepNegative/resolve/main/NG_DeepNegative_V1_75T.pt',
      hf: 'https://huggingface.co/lenML/DeepNegative/resolve/main/NG_DeepNegative_V1_75T.pt'
    },
    dir: 'embeddings',
    out: 'ng_deepnegative_v1_75t.pt',
    description: '深度学习优化的负面提示词，有助于提高画质'
  },
  
  // 用于 ImpactPack
  {
    id: 'mmdet-anime-face',
    name: 'MMDet 动漫人脸检测模型',
    type: 'detector',
    essential: true,
    url: {
      mirror: 'https://hf-mirror.com/dustysys/ddetailer/resolve/main/mmdet/bbox/mmdet_anime-face_yolov3.pth',
      hf: 'https://huggingface.co/dustysys/ddetailer/resolve/main/mmdet/bbox/mmdet_anime-face_yolov3.pth'
    },
    dir: 'mmdets/bbox',
    out: 'mmdet_anime-face_yolov3.pth',
    description: '用于检测动漫风格人脸的模型'
  },
  {
    id: 'mmdet-anime-face-config',
    name: 'MMDet 动漫人脸检测配置',
    type: 'config',
    essential: true,
    url: {
      mirror: 'https://ghp.ci/https://raw.githubusercontent.com/Bing-su/dddetailer/master/config/mmdet_anime-face_yolov3.py',
      hf: 'https://raw.githubusercontent.com/Bing-su/dddetailer/master/config/mmdet_anime-face_yolov3.py'
    },
    dir: 'mmdets/bbox',
    out: 'mmdet_anime-face_yolov3.py',
    description: '动漫人脸检测模型的配置文件'
  },
  {
    id: 'sam-vit-b',
    name: 'SAM ViT-B 分割模型',
    type: 'segmentation',
    essential: true,
    url: {
      mirror: 'https://hf-mirror.com/datasets/Gourieff/ReActor/resolve/main/models/sams/sam_vit_b_01ec64.pth',
      hf: 'https://huggingface.co/datasets/Gourieff/ReActor/resolve/main/models/sams/sam_vit_b_01ec64.pth'
    },
    dir: 'sams',
    out: 'sam_vit_b_01ec64.pth',
    description: '用于图像分割的Segment Anything模型'
  },
  {
    id: 'face-yolov8m',
    name: 'YOLOv8m 人脸检测模型',
    type: 'detector',
    essential: true,
    url: {
      mirror: 'https://hf-mirror.com/Bingsu/adetailer/resolve/main/face_yolov8m.pt',
      hf: 'https://huggingface.co/Bingsu/adetailer/resolve/main/face_yolov8m.pt'
    },
    dir: 'ultralytics/bbox',
    out: 'face_yolov8m.pt',
    description: '用于精确检测人脸的YOLOv8模型'
  },
  {
    id: 'hand-yolov8s',
    name: 'YOLOv8s 手部检测模型',
    type: 'detector',
    essential: true,
    url: {
      mirror: 'https://hf-mirror.com/Bingsu/adetailer/resolve/main/hand_yolov8s.pt',
      hf: 'https://huggingface.co/Bingsu/adetailer/resolve/main/hand_yolov8s.pt'
    },
    dir: 'ultralytics/bbox',
    out: 'hand_yolov8s.pt',
    description: '用于精确检测手部的YOLOv8模型'
  },
  {
    id: 'person-yolov8m-seg',
    name: 'YOLOv8m 人物分割模型',
    type: 'segmentation',
    essential: true,
    url: {
      mirror: 'https://hf-mirror.com/Bingsu/adetailer/resolve/main/person_yolov8m-seg.pt',
      hf: 'https://huggingface.co/Bingsu/adetailer/resolve/main/person_yolov8m-seg.pt'
    },
    dir: 'ultralytics/segm',
    out: 'person_yolov8m-seg.pt',
    description: '用于人物检测和分割的YOLOv8模型'
  },
  
  // 用于 ReActor
  {
    id: 'gfpgan-v1.3',
    name: 'GFPGANv1.3 人脸修复模型',
    type: 'facerestore',
    essential: true,
    url: {
      mirror: 'https://hf-mirror.com/datasets/Gourieff/ReActor/resolve/main/models/facerestore_models/GFPGANv1.3.pth',
      hf: 'https://huggingface.co/datasets/Gourieff/ReActor/resolve/main/models/facerestore_models/GFPGANv1.3.pth'
    },
    dir: 'facerestore_models',
    out: 'GFPGANv1.3.pth',
    description: '用于修复和增强人脸细节的模型'
  },
  {
    id: 'gfpgan-v1.4',
    name: 'GFPGANv1.4 人脸修复模型',
    type: 'facerestore',
    essential: true,
    url: {
      mirror: 'https://hf-mirror.com/datasets/Gourieff/ReActor/resolve/main/models/facerestore_models/GFPGANv1.4.pth',
      hf: 'https://huggingface.co/datasets/Gourieff/ReActor/resolve/main/models/facerestore_models/GFPGANv1.4.pth'
    },
    dir: 'facerestore_models',
    out: 'GFPGANv1.4.pth',
    description: 'GFPGANv1.3的升级版，提供更好的人脸修复效果'
  },
  {
    id: 'codeformer',
    name: 'CodeFormer 人脸修复模型',
    type: 'facerestore',
    essential: true,
    url: {
      mirror: 'https://hf-mirror.com/datasets/Gourieff/ReActor/resolve/main/models/facerestore_models/codeformer-v0.1.0.pth',
      hf: 'https://huggingface.co/datasets/Gourieff/ReActor/resolve/main/models/facerestore_models/codeformer-v0.1.0.pth'
    },
    dir: 'facerestore_models',
    out: 'codeformer-v0.1.0.pth',
    description: '具有身份保持能力的高质量人脸修复模型'
  },
  {
    id: 'gpen-bfr-512',
    name: 'GPEN-BFR-512 人脸修复模型',
    type: 'facerestore',
    essential: true,
    url: {
      mirror: 'https://hf-mirror.com/datasets/Gourieff/ReActor/resolve/main/models/facerestore_models/GPEN-BFR-512.onnx',
      hf: 'https://huggingface.co/datasets/Gourieff/ReActor/resolve/main/models/facerestore_models/GPEN-BFR-512.onnx'
    },
    dir: 'facerestore_models',
    out: 'GPEN-BFR-512.onnx',
    description: '中等分辨率的人脸修复模型(ONNX格式)'
  },
  {
    id: 'gpen-bfr-1024',
    name: 'GPEN-BFR-1024 人脸修复模型',
    type: 'facerestore',
    essential: true,
    url: {
      mirror: 'https://hf-mirror.com/datasets/Gourieff/ReActor/resolve/main/models/facerestore_models/GPEN-BFR-1024.onnx',
      hf: 'https://huggingface.co/datasets/Gourieff/ReActor/resolve/main/models/facerestore_models/GPEN-BFR-1024.onnx'
    },
    dir: 'facerestore_models',
    out: 'GPEN-BFR-1024.onnx',
    description: '高分辨率的人脸修复模型(ONNX格式)'
  },
  {
    id: 'gpen-bfr-2048',
    name: 'GPEN-BFR-2048 人脸修复模型',
    type: 'facerestore',
    essential: true,
    url: {
      mirror: 'https://hf-mirror.com/datasets/Gourieff/ReActor/resolve/main/models/facerestore_models/GPEN-BFR-2048.onnx',
      hf: 'https://huggingface.co/datasets/Gourieff/ReActor/resolve/main/models/facerestore_models/GPEN-BFR-2048.onnx'
    },
    dir: 'facerestore_models',
    out: 'GPEN-BFR-2048.onnx',
    description: '超高分辨率的人脸修复模型(ONNX格式)'
  },
  {
    id: 'inswapper',
    name: 'InsightFace Swapper 128',
    type: 'faceswap',
    essential: true,
    url: {
      mirror: 'https://hf-mirror.com/datasets/Gourieff/ReActor/resolve/main/models/inswapper_128.onnx',
      hf: 'https://huggingface.co/datasets/Gourieff/ReActor/resolve/main/models/inswapper_128.onnx'
    },
    dir: 'insightface',
    out: 'inswapper_128.onnx',
    description: '用于高质量人脸替换的模型'
  },
  {
    id: 'inswapper-fp16',
    name: 'InsightFace Swapper 128 FP16',
    type: 'faceswap',
    essential: true,
    url: {
      mirror: 'https://hf-mirror.com/datasets/Gourieff/ReActor/resolve/main/models/inswapper_128_fp16.onnx',
      hf: 'https://huggingface.co/datasets/Gourieff/ReActor/resolve/main/models/inswapper_128_fp16.onnx'
    },
    dir: 'insightface',
    out: 'inswapper_128_fp16.onnx',
    description: '用于高质量人脸替换的半精度模型，适合低显存设备'
  }
];

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

// 更新 DownloadProgress 接口定义
interface DownloadProgress {
  downloadedBytes: number;
  totalBytes: number;
  speed: number;
  status: 'downloading' | 'completed' | 'error'; // 添加 'error' 类型
  error: string | null; // 允许 string 类型
  overallProgress: number; 
  currentModelIndex: number;
  currentModelProgress: number;
  currentModel: EssentialModel | null;
  completed: boolean;
  canceled: boolean;  // 添加此属性
  lastUpdateTime?: number; 
  lastBytes?: number;  // 添加此属性
  lastLogTime?: number;  // 添加此属性
  startTime?: number;  // 添加此属性
  startBytes?: number;  // 开始下载前已存在的字节数
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

export class ModelsController {
  private modelCache: ModelInfo[] = [];
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 1天的缓存时间
  private readonly MODEL_LIST_URL = 'https://raw.githubusercontent.com/ltdrdata/ComfyUI-Manager/main/model-list.json';
  private readonly LOCAL_CACHE_PATH = path.join(config.dataDir, 'model-cache.json');
  private comfyuiPath: string;
  private modelsDir: string;
  private modelDownloads: Map<string, DownloadProgress> = new Map();
  private taskProgress: Map<string, DownloadProgress> = new Map();
  
  // 增加全局计数器跟踪进度事件
  private progressEventCounter = 0;
  
  constructor() {
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

  // 修改 installModel 方法，改为异步模式并返回taskId
  async installModel(ctx: Context): Promise<void> {
    const { modelName } = ctx.params;
    
    logger.info(`请求安装模型: ${modelName}`);
    
    try {
      // 创建任务ID用于跟踪进度
      const taskId = modelName; // 使用模型名称作为任务ID
      
      // 异步启动下载
      this.downloadModelByName(modelName, taskId).catch(err => {
        logger.error(`下载模型 ${modelName} 失败: ${err instanceof Error ? err.message : String(err)}`);
        // 错误处理在 downloadModelByName 中完成
      });
      
      // 返回任务ID用于前端轮询
      ctx.body = {
        success: true,
        message: `已开始下载模型 ${modelName}`,
        taskId: taskId
      };
    } catch (error) {
      logger.error(`安装模型 ${modelName} 失败: ${error instanceof Error ? error.message : String(error)}`);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `安装模型失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // 添加一个新的API端点来处理模型名称下载请求
  async downloadModelByNameApi(ctx: Context): Promise<void> {
    const { modelName } = ctx.params;
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
      // 1. 创建任务ID (使用模型名作为任务ID以便于跟踪)
      const taskId = modelName;
      
      // 2. 异步启动下载过程
      this.downloadModelByName(modelName, taskId).catch(err => {
        logger.error(`下载模型 ${modelName} 失败: ${err instanceof Error ? err.message : String(err)}`);
        // 错误处理已在downloadModelByName方法中完成
      });
      
      // 3. 立即返回成功响应，让前端开始轮询
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

  // 添加一个新方法来处理直接通过名称下载模型
  private async downloadModelByName(modelName: string, taskId: string): Promise<void> {
    // 从缓存的模型列表中查找模型信息
    const models = await this.getModelList('cache');
    const model = models.find(m => 
      // 可以根据名称、ID或其他标识符匹配
      m.name === modelName || 
      (m.url && m.url.includes(modelName)) || 
      `${m.base_url}/${m.filename}`.includes(modelName)
    );
    
    // 如果在模型列表中找到了匹配的模型
    if (model) {
      const downloadUrl = model.url || `${model.base_url}/${model.filename}`;
      const saveDir = model.save_path || this.getModelSaveDir(model.type);
      const fileName = model.filename || path.basename(downloadUrl);
      
      // 确保目录存在
      const outputDir = path.join(this.comfyuiPath, saveDir);
      await fs.ensureDir(outputDir);
      
      const outputPath = path.join(outputDir, fileName);
      
      // 检查是否有部分下载的文件
      const tempPath = `${outputPath}.part`;
      let startBytes = 0;
      
      if (fs.existsSync(tempPath)) {
        const stats = fs.statSync(tempPath);
        startBytes = stats.size;
        logger.info(`发现部分下载的文件: ${tempPath}, 大小: ${startBytes}字节`);
      }
      
      // 创建一个下载任务
      const progress: DownloadProgress = {
        overallProgress: 0,
        currentModelIndex: 0,
        currentModelProgress: 0,
        currentModel: {
          id: modelName,
          name: modelName,
          type: path.basename(saveDir) || 'unknown',
          url: { hf: downloadUrl, mirror: downloadUrl },
          dir: saveDir,
          out: path.basename(outputPath),
          essential: false
        },
        completed: false,
        error: null,
        canceled: false,
        totalBytes: 0,       // 确保初始化
        downloadedBytes: startBytes,  // 初始化为已下载的部分
        speed: 0,            // 确保初始化
        status: 'downloading',
        startTime: Date.now(),
        lastUpdateTime: Date.now(),
        lastBytes: 0,
        lastLogTime: Date.now(),
        startBytes: startBytes
      };
      
      // 存储进度状态
      this.modelDownloads.set(modelName, progress);
      
      try {
        // 尝试获取文件大小
        try {
          const headResponse = await superagent.head(downloadUrl);
          const contentLength = this.getContentLength(headResponse.headers);
          if (contentLength) {
            progress.totalBytes = contentLength;
            logger.info(`预先获取文件大小: ${progress.totalBytes} 字节`);
          }
        } catch (err: unknown) {
          // 安全地访问 err.message
          const errorMessage = err instanceof Error ? err.message : String(err);
          logger.warn(`无法预先获取文件大小: ${errorMessage}`);
        }
        
        // 开始下载
        await this.downloadFile(
          downloadUrl,
          outputPath,
          (percent, downloaded, total) => {
            progress.currentModelProgress = percent;
            progress.overallProgress = percent;
            progress.downloadedBytes = downloaded;
            progress.totalBytes = total;
          },
          progress
        );
        
        // 下载成功完成
        progress.status = 'completed';
        progress.completed = true;
        progress.overallProgress = 100;
        progress.currentModelProgress = 100;
        this.modelDownloads.set(modelName, { ...progress });
        
        logger.info(`模型 ${modelName} 下载完成`);
      } catch (error) {
        // 下载失败
        progress.status = 'error';
        progress.completed = false;
        // 类型断言处理 error
        progress.error = error instanceof Error ? error.message : String(error);
        this.modelDownloads.set(modelName, { ...progress });
        
        logger.error(`模型 ${modelName} 下载失败: ${error instanceof Error ? error.message : String(error)}`);
        throw error; // 可选：向上层抛出错误以便进一步处理
      }
      return;
    }
    
    // 如果在模型列表中找不到模型，尝试解析URL
    const parts = modelName.split('/');
    let downloadUrl;
    let fileName;
    
    if (parts.length >= 3) {
      // 假设是Hugging Face格式: owner/repo/filename
      const owner = parts[0];
      const repo = parts[1];
      fileName = parts.slice(2).join('/');
      downloadUrl = `https://hf-mirror.com/${owner}/${repo}/resolve/main/${fileName}`;
    } else if (parts.length === 2) {
      // 可能是 owner/repo 格式
      throw new Error(`模型 "${modelName}" 需要完整路径，请指定文件名，例如: ${modelName}/model.safetensors`);
    } else {
      // 无法识别的格式
      throw new Error(`无法识别的模型格式: ${modelName}，请使用 owner/repo/filename 格式`);
    }
    
    // 推断模型类型
    const modelType = this.inferModelType(fileName);
    const saveDir = this.getModelSaveDir(modelType);
    
    // 确保目录存在
    const outputDir = path.join(this.comfyuiPath, saveDir);
    await fs.ensureDir(outputDir);
    
    const outputPath = path.join(outputDir, fileName);
    
    // 检查是否有部分下载的文件
    const tempPath = `${outputPath}.part`;
    let startBytes = 0;
    
    if (fs.existsSync(tempPath)) {
      const stats = fs.statSync(tempPath);
      startBytes = stats.size;
      logger.info(`发现部分下载的文件: ${tempPath}, 大小: ${startBytes}字节`);
    }
    
    // 创建一个下载任务
    const progress: DownloadProgress = {
      overallProgress: 0,
      currentModelIndex: 0,
      currentModelProgress: 0,
      currentModel: {
        id: modelName,
        name: modelName,
        type: path.basename(saveDir) || 'unknown',
        url: { hf: downloadUrl, mirror: downloadUrl },
        dir: saveDir,
        out: path.basename(outputPath),
        essential: false
      },
      completed: false,
      error: null,
      canceled: false,
      totalBytes: 0,       // 确保初始化
      downloadedBytes: startBytes,  // 初始化为已下载的部分
      speed: 0,            // 确保初始化
      status: 'downloading',
      startTime: Date.now(),
      lastUpdateTime: Date.now(),
      lastBytes: 0,
      lastLogTime: Date.now(),
      startBytes: startBytes
    };
    
    // 存储进度状态
    this.modelDownloads.set(modelName, progress);
    
    // 开始下载
    try {
      await this.downloadFile(
        downloadUrl,
        outputPath,
        (percent, downloaded, total) => {
          progress.currentModelProgress = percent;
          progress.overallProgress = percent;
          progress.downloadedBytes = downloaded;
          progress.totalBytes = total;
        },
        progress
      );
      
      // 下载成功完成
      progress.status = 'completed';
      progress.completed = true;
      progress.overallProgress = 100;
      progress.currentModelProgress = 100;
      this.modelDownloads.set(modelName, { ...progress });
      
      logger.info(`模型 ${modelName} 下载完成`);
    } catch (error) {
      // 下载失败
      progress.status = 'error';
      progress.completed = false;
      // 类型断言处理 error
      progress.error = error instanceof Error ? error.message : String(error);
      this.modelDownloads.set(modelName, { ...progress });
      
      logger.error(`模型 ${modelName} 下载失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error; // 可选：向上层抛出错误以便进一步处理
    }
  }

  // 推断模型类型
  private inferModelType(modelName: string): string {
    const lowerName = modelName.toLowerCase();
    
    if (lowerName.includes('checkpoint') || lowerName.endsWith('.safetensors') || lowerName.endsWith('.ckpt')) {
      return 'checkpoint';
    } else if (lowerName.includes('lora')) {
      return 'lora';
    } else if (lowerName.includes('controlnet')) {
      return 'controlnet';
    } else if (lowerName.includes('vae')) {
      return 'vae';
    } else if (lowerName.includes('upscaler')) {
      return 'upscaler';
    }
    
    // 默认为检查点
    return 'checkpoint';
  }

  // 根据模型类型获取保存目录
  private getModelSaveDir(modelType: string): string {
    switch (modelType) {
      case 'checkpoint': return 'checkpoints';
      case 'lora': return 'loras';
      case 'controlnet': return 'controlnet';
      case 'vae': return 'vae';
      case 'upscaler': return 'upscale_models';
      default: return 'checkpoints';
    }
  }

  // 修复不能跟随重定向的问题
  private async downloadFile(
    url: string,
    outputPath: string,
    onProgress: (progress: number, downloadedBytes: number, totalBytes: number) => void,
    progressTracker: DownloadTask | DownloadProgress
  ): Promise<void> {
    logger.info(`开始下载文件: ${url} -> ${outputPath}`);
    
    // 检查和创建临时文件
    const tempPath = `${outputPath}.part`;
    let startBytes = 0;
    
    if (fs.existsSync(tempPath)) {
      const stats = fs.statSync(tempPath);
      startBytes = stats.size;
      logger.info(`发现已存在的部分下载，大小: ${startBytes} 字节`);
    }
    
    progressTracker.startBytes = startBytes;
    progressTracker.downloadedBytes = startBytes;
    progressTracker.startTime = Date.now();
    progressTracker.lastUpdateTime = Date.now();
    progressTracker.lastBytes = startBytes;
    
    return new Promise((resolve, reject) => {
      // 创建文件写入流
      const fileStream = fs.createWriteStream(tempPath, { 
        flags: startBytes > 0 ? 'a' : 'w' 
      });
      
      // 定义一个函数来处理下载（支持重定向）
      const downloadWithRedirects = (currentUrl: string, redirectCount = 0) => {
        // 限制重定向次数，避免无限循环
        if (redirectCount > 5) {
          const error = new Error('超过最大重定向次数（5次）');
          fileStream.close();
          return reject(error);
        }
        
        // 解析URL
        const parsedUrl = new URL(currentUrl);
        
        // 准备请求选项
        const protocol = parsedUrl.protocol === 'https:' ? https : http;
        const options: http.RequestOptions = {
          hostname: parsedUrl.hostname,
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'GET',
          headers: {}
        };
        
        // 添加Range头用于断点续传
        if (startBytes > 0) {
          options.headers!['Range'] = `bytes=${startBytes}-`;
          logger.info(`设置断点续传: Range=${options.headers!['Range']}`);
        }
        
        logger.info(`准备HTTP请求 (重定向#${redirectCount}): ${currentUrl}`);
        
        // 发起请求
        const req = protocol.request(options, (res) => {
          logger.info(`收到响应：状态码=${res.statusCode}, 头=${JSON.stringify(res.headers)}`);
          
          // 处理重定向
          if (res.statusCode && (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 303 || res.statusCode === 307 || res.statusCode === 308)) {
            const location = res.headers.location;
            if (!location) {
              const error = new Error(`收到重定向状态码 ${res.statusCode} 但没有 location 头`);
              fileStream.close();
              return reject(error);
            }
            
            // 构建完整的重定向URL
            let redirectUrl = location;
            if (!location.startsWith('http')) {
              // 处理相对URL
              redirectUrl = new URL(location, currentUrl).toString();
            }
            
            logger.info(`跟随重定向: ${redirectUrl}`);
            
            // 消费并丢弃当前响应的数据，避免内存泄漏
            res.on('data', () => {});
            res.on('end', () => {
              // 递归调用以跟随重定向
              downloadWithRedirects(redirectUrl, redirectCount + 1);
            });
            return;
          }
          
          // 处理其他错误状态码
          if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
            const error = new Error(`HTTP 错误状态码: ${res.statusCode}`);
            fileStream.close();
            return reject(error);
          }
          
          // 提取总文件大小
          let totalBytes = progressTracker.totalBytes || 0;
          
          // 处理Content-Length
          if (res.headers['content-length']) {
            const contentLength = parseInt(res.headers['content-length'] as string, 10);
            if (!isNaN(contentLength)) {
              if (startBytes > 0 && res.statusCode === 206) {
                totalBytes = startBytes + contentLength;
                logger.info(`断点续传(206): 总大小=${totalBytes} (${startBytes} + ${contentLength})`);
              } else {
                totalBytes = contentLength;
                logger.info(`常规下载: 总大小=${contentLength}`);
              }
              progressTracker.totalBytes = totalBytes;
            }
          }
          
          // 处理Content-Range
          const rangeHeader = res.headers['content-range'];
          if (typeof rangeHeader === 'string') {
            const match = rangeHeader.match(/bytes\s+\d+-\d+\/(\d+)/);
            if (match && match[1]) {
              totalBytes = parseInt(match[1], 10);
              progressTracker.totalBytes = totalBytes;
              logger.info(`从Content-Range获取总大小: ${totalBytes}`);
            }
          }
          
          // 处理数据下载
          let downloadedBytes = startBytes;
          
          res.on('data', (chunk) => {
            // 更新下载统计
            downloadedBytes += chunk.length;
            progressTracker.downloadedBytes = downloadedBytes;
            
            // 计算进度
            const percent = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0;
            progressTracker.currentModelProgress = percent;
            progressTracker.overallProgress = percent;
            
            // 计算下载速度
            const now = Date.now();
            const timeDiff = (now - (progressTracker.lastUpdateTime || progressTracker.startTime || now)) / 1000;
            
            if (timeDiff >= 0.5) {
              const bytesDiff = downloadedBytes - (progressTracker.lastBytes || startBytes);
              
              if (bytesDiff > 0 && timeDiff > 0) {
                progressTracker.speed = Math.round(bytesDiff / timeDiff);
                logger.info(`下载进度: ${percent}%, 速度: ${progressTracker.speed} 字节/秒, 已下载: ${downloadedBytes}/${totalBytes}`);
              }
              
              progressTracker.lastUpdateTime = now;
              progressTracker.lastBytes = downloadedBytes;
            }
            
            // 调用进度回调
            onProgress(percent, downloadedBytes, totalBytes);
          });
          
          // 使用管道将数据写入文件
          res.pipe(fileStream);
          
          // 处理下载完成
          res.on('end', () => {
            logger.info(`下载完成: ${currentUrl}, 总大小: ${downloadedBytes} 字节`);
          });
        });
        
        // 错误处理
        req.on('error', (err) => {
          logger.error(`下载请求错误: ${err.message}`);
          fileStream.close();
          reject(err);
        });
        
        // 结束请求
        req.end();
      };
      
      // 文件流完成事件
      fileStream.on('finish', () => {
        fileStream.close(() => {
          // 下载完成后重命名文件
          fs.rename(tempPath, outputPath, (err) => {
            if (err) {
              logger.error(`重命名文件失败: ${err.message}`);
              reject(err);
            } else {
              logger.info(`文件已保存到: ${outputPath}`);
              resolve();
            }
          });
        });
      });
      
      // 文件流错误事件
      fileStream.on('error', (err) => {
        logger.error(`文件写入错误: ${err.message}`);
        fileStream.close();
        reject(err);
      });
      
      // 开始下载（支持重定向）
      downloadWithRedirects(url);
    });
  }

  // 获取下载进度
  getDownloadProgress(modelName: string): DownloadProgress | null {
    return this.modelDownloads.get(modelName) || null;
  }

  // 取消下载
  async cancelDownload(modelName: string): Promise<void> {
    const progress = this.modelDownloads.get(modelName);
    if (!progress) {
      return;
    }

    progress.status = 'error';
    progress.error = '下载已取消';
    this.modelDownloads.set(modelName, progress);

    // 保留部分下载的文件，以支持断点续传
    logger.info(`模型 ${modelName} 下载已取消，保留部分下载文件以支持断点续传`);
  }

  // 在路由处理中添加获取下载进度的端点
  async getModelProgress(ctx: Context): Promise<void> {
    const { id } = ctx.params;
    logger.info(`获取进度请求: ${id}`);
    
    let progress = null;
    
    // 检查是否是模型名称下载
    if (this.modelDownloads.has(id)) {
      progress = this.modelDownloads.get(id);
      logger.info(`从 modelDownloads 找到进度数据`);
    } else {
      // 检查是否是任务ID
      progress = this.taskProgress.get(id);
      logger.info(`从 taskProgress 找到进度数据`);
    }
    
    if (!progress) {
      ctx.status = 404;
      ctx.body = { error: `未找到ID为 ${id} 的进度数据` };
      logger.warn(`未找到ID为 ${id} 的进度数据`);
      return;
    }
    
    // 记录找到的原始进度数据，帮助调试
    logger.info(`原始进度数据: ${JSON.stringify(progress)}`);
    
    // 使用深拷贝确保不影响原始对象
    ctx.body = {
      overallProgress: progress.overallProgress || 0,
      currentModelIndex: progress.currentModelIndex || 0,
      currentModelProgress: progress.currentModelProgress || 0,
      currentModel: progress.currentModel ? { ...progress.currentModel } : null,
      completed: progress.completed || false,
      error: progress.error || null,
      totalBytes: progress.totalBytes || 0,
      downloadedBytes: progress.downloadedBytes || 0,
      speed: progress.speed || 0,
      status: progress.status || 'downloading'
    };
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

  // 下载单个模型
  async downloadModel(ctx: Context): Promise<void> {
    const { modelId } = ctx.request.body as { modelId: string };
    
    // 实际实现：启动模型下载进程
    ctx.body = {
      success: true,
      message: `开始下载模型 ${modelId}`,
      taskId: `download-${modelId}-${Date.now()}`
    };
  }

  // 下载所有模型
  async downloadAllModels(ctx: Context): Promise<void> {
    // 实际实现：启动批量下载进程
    ctx.body = {
      success: true,
      message: '开始下载所有模型',
      taskId: `download-all-${Date.now()}`
    };
  }

  // 下载所有必要模型
  async downloadEssentialModels(ctx: Context): Promise<void> {
    const { source = 'mirror' } = ctx.request.body as { source?: string };
    
    // 生成任务ID前，先查找是否有之前取消的任务可以继续
    let taskId: string | null = null;
    let existingTask: DownloadTask | null = null;
    
    // 查找之前被临时取消的任务
    for (const [id, task] of downloadTasks.entries()) {
      if (task.temporaryCanceled && !task.completed && !task.error) {
        taskId = id;
        existingTask = task;
        break;
      }
    }
    
    // 如果没有找到可继续的任务，则创建新任务
    if (!taskId) {
      taskId = uuidv4();
      
      // 创建新的下载任务，确保 error 属性初始化为 null
      downloadTasks.set(taskId, {
        overallProgress: 0,
        currentModelIndex: 0,
        currentModelProgress: 0,
        currentModel: null,
        completed: false,
        error: null,
        canceled: false,
        temporaryCanceled: false,
        totalBytes: 0,
        downloadedBytes: 0,
        speed: 0,
        status: 'downloading',
        startTime: Date.now(),
        lastUpdateTime: Date.now(),
        lastBytes: 0,
        startBytes: 0
      });
    } else {
      // 继续之前的任务
      logger.info(`继续之前的下载任务: ${taskId}，从索引 ${existingTask!.currentModelIndex} 开始`);
      existingTask!.canceled = false;
      existingTask!.temporaryCanceled = false;
      existingTask!.error = null;
      existingTask!.status = 'downloading';  // 重置状态
      existingTask!.startTime = Date.now();
      existingTask!.lastUpdateTime = Date.now();
    }
    
    // 启动下载任务（异步）
    this.startEssentialDownload(taskId, source).catch((err: unknown) => {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error(`下载必要模型失败: ${errorMessage}`);
      const task = downloadTasks.get(taskId);
      if (task) {
        task.error = errorMessage;
        task.completed = true;
        task.status = 'error';  // 设置错误状态
      }
    });
    
    // 返回任务ID
    ctx.body = { taskId };
  }
  
  // 启动必要模型下载任务
  private async startEssentialDownload(taskId: string, source: string = 'mirror'): Promise<void> {
    try {
      const task = downloadTasks.get(taskId);
      if (!task) {
        throw new Error('任务不存在');
      }
      
      // 创建必要目录
      await this.ensureDirectories(essentialModels);
      
      // 遍历并下载每个模型
      for (let i = 0; i < essentialModels.length; i++) {
        // 检查任务是否被取消
        if (task.canceled) {
          task.status = 'error';  // 设置状态
          logger.info('下载任务已取消');
          return;
        }
        
        const model = essentialModels[i];
        task.currentModelIndex = i;
        task.currentModel = model;
        task.currentModelProgress = 0;
        task.status = 'downloading';  // 设置状态
        
        try {
          // 文件保存路径
          const outputPath = path.join(this.comfyuiPath, model.dir, model.out);
          
          // 检查文件是否已存在
          if (await fs.pathExists(outputPath)) {
            logger.info(`模型已存在，跳过下载: ${model.name}`);
            task.currentModelProgress = 100;
            task.overallProgress = Math.round(((i + 1) / essentialModels.length) * 100);
            continue;
          }
          
          // 下载文件
          const sourceUrl = source === 'mirror' ? model.url.mirror : model.url.hf;
          await this.downloadFile(
            sourceUrl,
            outputPath,
            (progress, downloadedBytes, totalBytes) => {
              task.currentModelProgress = progress;
              // 更新总体进度
              const modelWeight = 1 / essentialModels.length;
              const modelProgress = i * modelWeight + (progress / 100) * modelWeight;
              task.overallProgress = Math.round(modelProgress * 100);
              task.downloadedBytes = downloadedBytes;
              task.totalBytes = totalBytes;
            },
            task
          );
        } catch (error) {
          task.status = 'error';  // 设置错误状态
          logger.error(`下载模型 ${model.name} 失败: ${error instanceof Error ? error.message : String(error)}`);
          continue;
        }
      }
      
      // 所有模型下载完成
      task.overallProgress = 100;
      task.completed = true;
      task.status = 'completed';  // 设置完成状态
      logger.info('所有必要模型下载完成');
    } catch (error) {
      // 处理总体错误
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`下载过程发生错误: ${errorMessage}`);
      
      const task = downloadTasks.get(taskId);
      if (task) {
        task.error = errorMessage;
        task.completed = true;
        task.status = 'error';  // 设置错误状态
      }
    }
  }

  // 添加一个新的API端点获取必要模型列表
  async getEssentialModels(ctx: Context): Promise<void> {
    ctx.body = {
      models: essentialModels
    };
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
} 