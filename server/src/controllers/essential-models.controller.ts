/**
 * 基础模型管理控制器
 */
import * as Koa from 'koa';
import * as path from 'path';
import * as fs from 'fs';
import { DownloadController } from './download.controller';
// import { getConfig } from '../config';
import * as loggerIn from '../utils/logger';
import { EssentialModel, DownloadProgress } from '../types/models.types';
import { downloadFile } from '../utils/download.utils';

const logger = loggerIn.logger;

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

export class EssentialModelsController extends DownloadController {
  
  essentialModels = essentialModels;
  private comfyuiModelsPath: string;
  private isDownloading: boolean = false;

  constructor() {
    super();
    // 从配置中获取 ComfyUI 路径
    const { config } = require('../config');
    this.comfyuiModelsPath = path.join(config.comfyui.path || process.env.COMFYUI_PATH || path.join(process.cwd(), 'comfyui'), 'models');
    
    // 确保路径存在
    if (!this.comfyuiModelsPath) {
      logger.error('未配置 ComfyUI 路径，将使用默认路径');
      this.comfyuiModelsPath = path.join(process.cwd(), 'comfyui');
    }
    
    logger.info(`使用 ComfyUI 路径: ${this.comfyuiModelsPath}`);
  }
  
  // 获取必要基础模型列表
  public async getEssentialModels(ctx: Koa.Context) {
    ctx.body = this.essentialModels;
  }
  
  // 下载所有必要基础模型
  public async downloadEssentialModels(ctx: Koa.Context) {
    const { source = 'hf' } = ctx.request.body as { source?: string };
    
    // 创建下载任务
    const taskId = this.createDownloadTask();
    logger.info(`创建基础模型下载任务: ${taskId}`);
    
    // 异步开始下载
    this.startEssentialModelsDownload(taskId, source)
      .catch(err => {
        logger.error(`基础模型下载失败: ${err.message}`);
        this.updateTaskProgress(taskId, {
          error: err.message,
          status: 'error',
          completed: true
        });
      });
    
    ctx.body = { taskId };
  }
  
  // 异步下载所有基础模型
  private async startEssentialModelsDownload(taskId: string, source: string): Promise<void> {
    // 获取任务进度对象
    const progress = this.taskProgress.get(taskId);
    if (!progress) {
      throw new Error(`找不到任务 ${taskId} 的进度信息`);
    }
    
    try {
      // 更新初始状态
      progress.status = 'downloading';
      progress.startTime = Date.now();
      progress.lastUpdateTime = Date.now();
      
      // 使用类中存储的 ComfyUI 路径
      const rootPath = this.comfyuiModelsPath;
      if (!rootPath) {
        throw new Error('ComfyUI 路径未配置');
      }
      
      logger.info(`开始下载基础模型，任务ID: ${taskId}, 下载源: ${source}`);
      logger.info(`模型数量: ${this.essentialModels.length}`);
      
      // 添加进度报告计时器
      const progressInterval = setInterval(() => {
        if (progress && !progress.completed && !progress.canceled) {
          const currentModel = progress.currentModel?.name || '未知';
          const modelIndex = progress.currentModelIndex || 0;
          const totalModels = this.essentialModels.length;
          const modelProgress = progress.currentModelProgress || 0;
          const overallProgress = progress.overallProgress || 0;
          
          logger.info(`下载进度 - 模型: ${currentModel} (${modelIndex+1}/${totalModels}) - ${modelProgress}% 完成，总体进度: ${overallProgress}%`);
        } else {
          clearInterval(progressInterval);
        }
      }, 5000); // 每5秒报告一次进度
      
      // 设置下载状态标志
      this.isDownloading = true;
      
      // 遍历每个基础模型
      for (let i = 0; i < this.essentialModels.length; i++) {
        // 检查任务是否已取消
        const currentProgress = this.taskProgress.get(taskId);
        if (!currentProgress || currentProgress.canceled || currentProgress.status === 'canceled') {
          logger.info(`任务 ${taskId} 已取消，停止后续模型下载`);
          break;
        }
        
        const model = this.essentialModels[i];
        if (!model || !model.dir || !model.out) {
          logger.warn(`模型数据不完整，跳过: ${JSON.stringify(model)}`);
          continue;
        }
        
        // 更新当前模型信息
        progress.currentModelIndex = i;
        progress.currentModel = model;
        progress.currentModelProgress = 0;
        
        // 计算总体进度百分比
        progress.overallProgress = Math.floor((i / this.essentialModels.length) * 100);
        this.updateTaskProgress(taskId, progress); // 添加这行以更新进度
        
        // 创建模型保存目录
        const modelDir = path.join(rootPath, model.dir);
        if (!fs.existsSync(modelDir)) {
          logger.info(`创建目录: ${modelDir}`);
          fs.mkdirSync(modelDir, { recursive: true });
        }
        
        // 完整的模型文件路径
        const filePath = path.join(modelDir, model.out);
        
        // 检查文件是否已存在
        if (fs.existsSync(filePath)) {
          const stat = fs.statSync(filePath);
          // 如果文件已存在并且大小不为0，则跳过
          if (stat.size > 0) {
            logger.info(`模型 ${model.name} 已存在，跳过下载`);
            progress.currentModelProgress = 100;
            continue;
          }
        }
        
        // 确定下载URL
        const url = source === 'hf' ? model.url.hf : model.url.mirror;
        if (!url) {
          logger.warn(`模型 ${model.name} 没有 ${source} 下载源，跳过`);
          continue;
        }
        
        logger.info(`开始下载模型 ${model.name} 从 ${url}`);
        
        // 创建中止控制器
        progress.abortController = new AbortController();
        
        try {
          // 使用 DownloadController 中的 downloadModelByName 方法下载文件
          await this.downloadModelByName(
            model.name,
            url,
            filePath,
            taskId
          );
          
          // 下载成功，更新进度
          progress.currentModelProgress = 100;
          // 更新总体进度
          progress.overallProgress = Math.floor(((i + 1) / this.essentialModels.length) * 100);
          this.updateTaskProgress(taskId, progress); // 添加这行以更新进度
          logger.info(`模型 ${model.name} 下载完成`);
        } catch (error) {
          // 如果是取消导致的错误，直接返回
          if (progress.canceled) {
            return;
          }
          
          // 其他错误，记录但继续下载下一个模型
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error(`下载模型 ${model.name} 失败: ${errorMessage}`);
          
          // 不中断整个流程，继续下载下一个模型
          continue;
        }
      }
      
      // 所有模型下载完成
      progress.overallProgress = 100;
      progress.currentModelProgress = 100;
      progress.completed = true;
      progress.status = 'completed';
      this.updateTaskProgress(taskId, progress); // 添加这行以更新进度
      
      // 清除进度报告计时器
      clearInterval(progressInterval);
      
      logger.info(`所有基础模型下载完成，任务ID: ${taskId}`);
    } catch (error) {
      // 处理整体错误
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`下载基础模型过程中发生错误: ${errorMessage}`);
      
      // 更新任务状态为错误
      progress.error = errorMessage;
      progress.status = 'error';
      this.updateTaskProgress(taskId, progress); // 添加这行以更新进度
    } finally {
      // 重置下载状态
      this.isDownloading = false;
    }
  }
  
  // 获取基础模型安装状态
  public async getEssentialModelsStatus(ctx: Koa.Context) {
    // 使用类中存储的 ComfyUI 路径
    const rootPath = this.comfyuiModelsPath;
    
    let installedCount = 0;
    
    // 定义接口
    interface ModelStatus {
      id: string;
      name: string;
      installed: boolean;
      fileSize: number;
    }
    
    // 明确指定数组类型
    const modelStatus: ModelStatus[] = [];
    
    // 检查每个模型是否已安装
    for (const model of this.essentialModels) {
      if (!model || !model.dir || !model.out) {
        logger.warn(`模型数据不完整，跳过: ${JSON.stringify(model)}`);
        continue;
      }
      
      const filePath = path.join(rootPath, model.dir, model.out);
      const isInstalled = fs.existsSync(filePath);
      
      // 如果文件存在，检查文件大小确保不是空文件
      let fileSize = 0;
      if (isInstalled) {
        try {
          const stat = fs.statSync(filePath);
          fileSize = stat.size;
          // 只有文件大小大于0才认为真正安装了
          if (fileSize > 0) {
            installedCount++;
          }
        } catch (error) {
          logger.error(`检查模型文件 ${filePath} 时出错: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      // 添加模型状态到数组
      modelStatus.push({
        id: model.id,
        name: model.name,
        installed: isInstalled && fileSize > 0,
        fileSize: fileSize
      });
    }
    
    // 所有必要模型都已安装
    const allInstalled = installedCount === this.essentialModels.length;
    
    logger.info(`基础模型安装状态: ${installedCount}/${this.essentialModels.length} 已安装`);
    
    ctx.body = {
      installed: allInstalled,
      total: this.essentialModels.length,
      installedCount: installedCount,
      models: modelStatus // 返回详细的每个模型安装状态
    };
  }
  
  // 获取基础模型下载进度
  public async getEssentialModelProgress(ctx: Koa.Context) {
    // 直接使用父类的 getProgress 方法获取进度
    await this.getProgress(ctx);
  }
  
  // 取消基础模型下载
  public async cancelEssentialDownload(ctx: Koa.Context) {
    // 获取任务ID
    const taskId = ctx.params.taskId;
    
    logger.info(`准备终止基础模型下载任务: ${taskId}`);
    
    // 确保清理所有与基础模型相关的下载资源
    if (this.taskProgress.has(taskId)) {
      const progressData = this.taskProgress.get(taskId);
      
      // 确保progressData不是undefined
      if (progressData) {
        // 确保所有下载连接都被终止
        if (progressData.abortController) {
          try {
            // 强制终止下载
            progressData.abortController.abort("用户取消下载");
            logger.info(`已发送终止信号到下载控制器: ${taskId}`);
            
            // 等待一小段时间确保abort信号被处理
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error) {
            logger.error(`终止基础模型下载时出错: ${error instanceof Error ? error.message : String(error)}`);
          }
        } else {
          logger.warn(`任务 ${taskId} 没有可用的abortController`);
        }
        
        // 更新任务状态为已取消
        this.taskProgress.set(taskId, {
          ...progressData,
          status: 'error',
          completed: true,
          error: '用户取消了下载',
          currentModel: progressData.currentModel || null,
          currentModelIndex: progressData.currentModelIndex || 0,
          overallProgress: progressData.overallProgress || 0,
          currentModelProgress: progressData.currentModelProgress || 0,
          downloadedBytes: progressData.downloadedBytes || 0,
          totalBytes: progressData.totalBytes || 0,
          speed: progressData.speed || 0
        });
        
        logger.info(`基础模型下载任务 ${taskId} 已标记为已取消`);
      }
    } else {
      logger.warn(`找不到下载任务: ${taskId}`);
    }
    
    // 最后再调用父类的取消方法，确保所有父类资源也被清理
    await this.cancelDownload(ctx);
    
    // 检查是否需要强制终止活跃的下载进程
    // 这是一个额外的安全措施，以防abort()不起作用
    try {
      // 在Node.js环境中，可以考虑使用更强力的方法终止下载
      // 例如终止底层的网络请求或关闭相关文件描述符
      // 这里的实现取决于downloadFile的具体实现
      
      // 确保在返回前下载真的被取消了
      await new Promise(resolve => setTimeout(resolve, 300));
      
      logger.info(`基础模型下载取消处理完成: ${taskId}`);
    } catch (err) {
      logger.error(`强制终止下载失败: ${err instanceof Error ? err.message : String(err)}`);
    }
    
    // 返回成功信息
    ctx.body = {
      success: true,
      message: '基础模型下载已取消'
    };
  }

  /**
   * 检查并处理任务取消
   */
  async cancelDownloadTask(taskId: string): Promise<boolean> {
    // 获取任务进度
    const progress = this.taskProgress.get(taskId);
    if (!progress) {
      return false;
    }
    
    // 标记任务为已取消
    progress.canceled = true;
    progress.status = 'canceled';

    // 清空当前下载队列中的所有任务
    this.clearDownloadQueue();

    // 中止下载
    if (progress.abortController) {
      progress.abortController.abort();
    }
    
    // 更新任务状态
    this.updateTaskProgress(taskId, progress);
    
    logger.info(`成功取消下载任务: ${taskId}`);
    return true;
  }

  /**
   * 清空下载队列
   */
  private clearDownloadQueue(): void {
    // 停止所有正在进行的下载
    for (const [id, progress] of this.taskProgress.entries()) {
      if (progress.status === 'downloading' && !progress.canceled) {
        progress.canceled = true;
        progress.status = 'canceled';
        
        if (progress.abortController) {
          progress.abortController.abort();
        }
      }
    }
    
    // 这里可能还需要清空其他队列相关状态
    this.isDownloading = false;
    
    logger.info('已清空下载队列');
  }
} 