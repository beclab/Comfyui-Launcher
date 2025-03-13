import { Context } from 'koa';
import fs from 'fs-extra';
import path from 'path';
import { promisify } from 'util';
import stream from 'stream';
import { logger } from '../utils/logger';
import superagent from 'superagent';  // 假设使用 superagent 作为 HTTP 客户端

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
}

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

export class ModelsController {
  // 添加comfyuiPath属性
  private comfyuiPath: string;
  
  constructor() {
    // 初始化ComfyUI路径，使用环境变量或默认路径
    this.comfyuiPath = process.env.COMFYUI_PATH || path.join(__dirname, '../../comfyui');
    logger.info(`ModelsController: 使用ComfyUI路径 ${this.comfyuiPath}`);
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

  // 获取下载进度
  async getModelProgress(ctx: Context): Promise<void> {
    const { taskId } = ctx.params;
    
    if (!taskId || !downloadTasks.has(taskId)) {
      ctx.status = 404;
      ctx.body = { error: '找不到指定的下载任务' };
      return;
    }
    
    const task = downloadTasks.get(taskId)!;
    
    // 计算下载速度 - 确保无速度时返回0，而不是undefined
    ctx.body = {
      taskId,
      progress: task.overallProgress,
      currentIndex: task.currentModelIndex,
      currentProgress: task.currentModelProgress,
      currentModel: task.currentModel,
      completed: task.completed,
      error: task.error,
      canceled: task.canceled,
      // 添加下载详情，确保所有值都有默认值
      totalBytes: task.totalBytes || 0,
      downloadedBytes: task.downloadedBytes || 0,
      speed: task.speed || 0
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
      taskId = Date.now().toString();
      
      // 创建新的下载任务
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
        // 初始化速度计算相关字段
        startTime: Date.now(),
        lastUpdateTime: Date.now(),
        lastBytes: 0
      });
    } else {
      // 继续之前的任务
      logger.info(`继续之前的下载任务: ${taskId}，从索引 ${existingTask!.currentModelIndex} 开始`);
      existingTask!.canceled = false;
      existingTask!.temporaryCanceled = false;
      existingTask!.error = null;
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
      }
    });
    
    // 返回任务ID
    ctx.body = { taskId };
  }
  
  // 获取下载进度
  async getDownloadProgress(ctx: Context): Promise<void> {
    const { taskId } = ctx.params;
    
    // 获取任务状态
    const task = downloadTasks.get(taskId);
    if (!task) {
      ctx.status = 404;
      ctx.body = { error: '任务不存在' };
      return;
    }
    
    // 返回当前状态
    ctx.body = task;
  }
  
  // 取消下载
  async cancelDownload(ctx: Context): Promise<void> {
    // 从请求体中获取taskId
    const { taskId } = ctx.request.body as { taskId: string };
    
    if (!taskId) {
      ctx.status = 400;
      ctx.body = { error: '缺少taskId参数' };
      return;
    }
    
    // 获取任务状态
    const task = downloadTasks.get(taskId);
    if (!task) {
      ctx.status = 404;
      ctx.body = { error: '任务不存在' };
      return;
    }
    
    // 标记为取消并记录到日志
    task.canceled = true;
    // 添加标记表示这是临时取消，不是彻底放弃
    task.temporaryCanceled = true; 
    logger.info(`任务 ${taskId} 已被用户取消，临时文件保留以便后续续传`);
    
    ctx.body = { success: true };
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
          logger.info('下载任务已取消');
          return;
        }
        
        const model = essentialModels[i];
        task.currentModelIndex = i;
        task.currentModel = model;
        task.currentModelProgress = 0;
        
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
          // 处理单个模型下载失败，但继续下载其他模型
          logger.error(`下载模型 ${model.name} 失败: ${error instanceof Error ? error.message : String(error)}`);
          
          // 继续下载其他模型，而不是中断整个过程
          continue;
        }
      }
      
      // 所有模型下载完成
      task.overallProgress = 100;
      task.completed = true;
      logger.info('所有必要模型下载完成');
    } catch (error) {
      // 处理总体错误
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`下载过程发生错误: ${errorMessage}`);
      
      const task = downloadTasks.get(taskId);
      if (task) {
        task.error = errorMessage;
        task.completed = true;
      }
    }
  }
  
  // 下载单个文件（支持断点续传）
  private async downloadFile(
    url: string, 
    outputPath: string, 
    onProgress: (progress: number, downloadedBytes: number, totalBytes: number) => void, 
    task: DownloadTask,
    retryCount: number = 3
  ): Promise<string> {
    // 确保目录存在
    await fs.ensureDir(path.dirname(outputPath));
    
    // 检查是否有临时文件存在（用于断点续传）
    const tempFilePath = `${outputPath}.tmp`;
    let existingSize = 0;
    
    try {
      // 检查临时文件是否存在
      if (await fs.pathExists(tempFilePath)) {
        const stats = await fs.stat(tempFilePath);
        existingSize = stats.size;
        logger.info(`找到已下载的临时文件: ${tempFilePath}, 大小: ${existingSize} 字节, 将从断点继续下载`);
      }
    } catch (err) {
      logger.warn(`检查临时文件时出错: ${err instanceof Error ? err.message : String(err)}`);
      existingSize = 0;
    }
    
    // 初始化或恢复下载统计
    if (!task.lastUpdateTime || !task.startTime) {
      task.lastUpdateTime = Date.now();
      task.startTime = Date.now();
    }
    if (task.lastBytes === undefined) {
      task.lastBytes = existingSize;
    }
    if (existingSize > 0) {
      task.downloadedBytes = existingSize;
    }
    
    for (let attempt = 1; attempt <= retryCount; attempt++) {
      if (task.canceled) throw new Error('下载已被用户取消');
      
      logger.info(`下载文件: ${url} (尝试 ${attempt}/${retryCount}${existingSize > 0 ? `, 从 ${existingSize} 字节继续` : ''})`);
      
      let fileStream: fs.WriteStream | null = null;
      let httpRequest: any = null;
      let downloadedBytes = existingSize;
      let totalBytes = 0;
      
      try {
        await new Promise<void>((resolve, reject) => {
          const httpModule = url.startsWith('https:') ? require('https') : require('http');
          
          // 创建追加模式的写入流，用于断点续传
          fileStream = fs.createWriteStream(tempFilePath, { 
            flags: existingSize > 0 ? 'a' : 'w' 
          });
          
          // 设置请求头
          const headers: Record<string, string> = {
            'User-Agent': 'Mozilla/5.0 (Node.js) ComfyUI-Downloader/1.0'
          };
          
          // 添加Range头以实现断点续传
          if (existingSize > 0) {
            headers['Range'] = `bytes=${existingSize}-`;
          }
          
          // 设置检查取消的定时器
          const cancelInterval = setInterval(() => {
            if (task.canceled) {
              clearInterval(cancelInterval);
              if (httpRequest) httpRequest.abort();
              fileStream?.close();
              reject(new Error('下载已被用户取消'));
            }
          }, 500);
          
          // 发起HTTP请求
          httpRequest = httpModule.get(url, {
            headers,
            timeout: 30000
          }, (response: any) => {
            // 处理重定向
            if (response.statusCode === 301 || response.statusCode === 302) {
              clearInterval(cancelInterval);
              fileStream?.close();
              
              const redirectUrl = response.headers.location;
              if (!redirectUrl) {
                reject(new Error('重定向未提供目标URL'));
                return;
              }
              
              const newUrl = redirectUrl.startsWith('http') 
                ? redirectUrl 
                : new URL(redirectUrl, url).toString();
              
              logger.info(`重定向至: ${newUrl}`);
              
              // 保持已下载大小，递归调用
              this.downloadFile(newUrl, outputPath, onProgress, task, retryCount - attempt + 1)
                .then(() => resolve())
                .catch(err => reject(err));
              return;
            }
            
            // 检查Range响应状态码（206 部分内容）
            if (existingSize > 0 && response.statusCode !== 206) {
              clearInterval(cancelInterval);
              fileStream?.close();
              
              // 如果服务器不支持断点续传，则删除临时文件并从头开始下载
              logger.warn(`服务器不支持断点续传(状态码: ${response.statusCode})，将重新开始下载`);
              fs.unlink(tempFilePath)
                .then(() => {
                  existingSize = 0;
                  this.downloadFile(url, outputPath, onProgress, task, retryCount - attempt + 1)
                    .then(() => resolve())
                    .catch(err => reject(err));
                })
                .catch(err => reject(err));
              return;
            } else if (response.statusCode !== 200 && response.statusCode !== 206) {
              clearInterval(cancelInterval);
              reject(new Error(`HTTP错误: ${response.statusCode}`));
              return;
            }
            
            // 确定文件总大小（考虑断点续传情况）
            if (response.statusCode === 206) {
              // 从Content-Range头获取总大小: "bytes 1000-5000/10000"
              const rangeHeader = response.headers['content-range'];
              if (rangeHeader) {
                const match = /bytes \d+-\d+\/(\d+)/.exec(rangeHeader);
                if (match && match[1]) {
                  totalBytes = parseInt(match[1], 10);
                }
              }
            } else {
              totalBytes = parseInt(response.headers['content-length'] || '0', 10) + existingSize;
            }
            
            // 更新任务中的总字节数
            task.totalBytes = totalBytes;
            
            // 处理数据
            response.on('data', (chunk: Buffer) => {
              if (task.canceled) {
                response.destroy();
                return;
              }
              
              downloadedBytes += chunk.length;
              
              // 更新任务中的字节计数
              task.downloadedBytes = downloadedBytes;
              
              // 计算下载速度
              const now = Date.now();
              const timeDiff = (now - (task.lastUpdateTime || now)) / 1000;
              
              if (timeDiff >= 0.5) {
                const bytesDiff = downloadedBytes - (task.lastBytes || 0);
                
                if (timeDiff > 0) {
                  const instantSpeed = bytesDiff / timeDiff;
                  task.speed = task.speed ? (0.7 * instantSpeed + 0.3 * task.speed) : instantSpeed;
                  
                  logger.debug(`下载速度: ${(task.speed / 1024 / 1024).toFixed(2)} MB/s (${bytesDiff / 1024 / 1024} MB in ${timeDiff.toFixed(2)}s)`);
                }
                
                task.lastUpdateTime = now;
                task.lastBytes = downloadedBytes;
                
                // 估算剩余时间
                if (task.speed > 0 && totalBytes > 0) {
                  const remainingBytes = totalBytes - downloadedBytes;
                  const remainingSeconds = remainingBytes / task.speed;
                  logger.debug(`估计剩余时间: ${(remainingSeconds / 60).toFixed(1)} 分钟`);
                }
              }
              
              // 更新进度
              if (totalBytes > 0) {
                const progress = Math.min(Math.round((downloadedBytes / totalBytes) * 100), 100);
                onProgress(progress, downloadedBytes, totalBytes);
              }
            });
            
            // 流式传输到文件
            response.pipe(fileStream);
            
            // 处理响应错误
            response.on('error', (err: Error) => {
              clearInterval(cancelInterval);
              reject(err);
            });
            
            // 处理下载完成
            if (fileStream) {
              fileStream.on('finish', () => {
                clearInterval(cancelInterval);
                (fileStream as fs.WriteStream).close(() => resolve());
              });
            }
            
            // 处理写入错误
            if (fileStream) {
              fileStream.on('error', (err: Error) => {
                clearInterval(cancelInterval);
                response.destroy();
                reject(err);
              });
            }
          });
          
          // 处理请求错误和超时
          httpRequest.on('error', (err: Error) => {
            clearInterval(cancelInterval);
            reject(err);
          });
          
          httpRequest.setTimeout(600000, () => {
            clearInterval(cancelInterval);
            httpRequest.abort();
            reject(new Error('请求超时'));
          });
        });
        
        // 检查下载是否完成
        const stats = await fs.stat(tempFilePath);
        if (stats.size === 0) {
          throw new Error('下载的文件为空');
        }
        
        // 如果下载了全部内容，则重命名临时文件
        if (totalBytes === 0 || downloadedBytes >= totalBytes) {
          await fs.rename(tempFilePath, outputPath);
          logger.info(`文件下载完成: ${outputPath} (总大小: ${(downloadedBytes / 1024 / 1024).toFixed(2)} MB)`);
        } else {
          // 下载未完成，但当前尝试成功，保留临时文件以便下次续传
          logger.info(`部分下载完成: ${tempFilePath} (${downloadedBytes}/${totalBytes} 字节)`);
        }
        
        onProgress(100, downloadedBytes, totalBytes);
        return outputPath;
        
      } catch (error) {
        if (fileStream) {
          (fileStream as fs.WriteStream).close();
        }
        
        // 如果是取消操作，保留临时文件
        if (task.canceled) {
          logger.info(`下载已取消: ${url}，临时文件 ${tempFilePath} 已保留用于未来断点续传`);
          throw new Error('下载已被用户取消');
        }
        
        // 遇到错误但不是最后一次尝试，等待后重试
        if (attempt < retryCount) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.warn(`下载失败，准备重试 (${attempt}/${retryCount}): ${errorMessage}`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        } else {
          throw error;
        }
      }
    }
    
    throw new Error('下载失败，达到最大重试次数');
  }

  // 添加一个新的API端点获取必要模型列表
  async getEssentialModels(ctx: Context): Promise<void> {
    ctx.body = {
      models: essentialModels
    };
  }
} 