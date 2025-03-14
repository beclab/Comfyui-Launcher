/**
 * 通用下载管理控制器
 */
import * as Koa from 'koa';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as loggerbox from '../utils/logger';
import { DownloadProgress, EssentialModel } from '../types/models.types';
import { createDownloadProgress, downloadFile } from '../utils/download.utils';

const logger = loggerbox.logger

export class DownloadController {
  // 受保护属性，供子类访问
  protected taskProgress = new Map<string, DownloadProgress>();
  
  // 存储模型名称到任务ID的映射
  protected modelDownloads = new Map<string, string>();
  
  // 通用方法：下载模型
  protected async downloadModelByName(
    modelName: string, 
    downloadUrl: string, 
    outputPath: string, 
    taskId: string
  ): Promise<void> {
    // 获取任务进度对象
    const progress = this.taskProgress.get(taskId);
    if (!progress) {
      throw new Error(`找不到任务 ${taskId} 的进度信息`);
    }
    
    // 初始化下载状态
    progress.status = 'downloading';
    progress.startTime = Date.now();
    progress.abortController = new AbortController();
    
    try {
      // 使用工具类下载文件
      await downloadFile(
        downloadUrl,
        outputPath,
        (percent, downloaded, total) => {
          progress.currentModelProgress = percent;
          progress.overallProgress = percent;
          progress.downloadedBytes = downloaded;
          progress.totalBytes = total;
          
          // 每200ms更新一次任务进度
          const now = Date.now();
          if (!progress.lastLogTime || now - progress.lastLogTime > 200) {
            this.updateTaskProgress(taskId, progress);
            progress.lastLogTime = now;
          }
        },
        { 
          abortController: progress.abortController || new AbortController(),
          onProgress: () => {} // 必需属性
        },
        progress
      );
      
      // 下载成功，更新状态
      progress.status = 'completed';
      progress.completed = true;
      progress.overallProgress = 100;
      progress.currentModelProgress = 100;
      this.updateTaskProgress(taskId, progress);
      
      logger.info(`模型 ${modelName} 下载完成`);
    } catch (error) {
      // 如果是取消导致的错误，维持canceled状态
      if (progress.canceled) {
        logger.info(`模型 ${modelName} 下载已取消`);
        return;
      }
      
      // 其他错误，记录并更新状态
      progress.status = 'error';
      progress.error = error instanceof Error ? error.message : String(error);
      this.updateTaskProgress(taskId, progress);
      
      logger.error(`模型 ${modelName} 下载失败: ${progress.error}`);
      throw error;
    }
  }
  
  // 获取下载进度
  public async getProgress(ctx: Koa.Context): Promise<void> {
    const { id } = ctx.params;
    logger.info(`获取进度请求: ${id}`);
    
    // 正确声明变量类型
    let progress: DownloadProgress | null = null;
    
    // 检查是否是模型名称下载
    if (this.modelDownloads.has(id)) {
      const taskId = this.modelDownloads.get(id);
      progress = taskId ? this.taskProgress.get(taskId) || null : null;
      logger.info(`从 modelDownloads 找到映射，任务ID: ${taskId}`);
    } else {
      // 检查是否是任务ID
      progress = this.taskProgress.get(id) || null;
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
  
  // 取消下载任务
  public async cancelDownload(ctx: Koa.Context) {
    // 使用类型断言指定正确的请求体类型
    const { taskId } = ctx.request.body as { taskId?: string };
    
    if (!taskId) {
      ctx.status = 400;
      ctx.body = { error: '缺少任务ID' };
      return;
    }
    
    if (!this.taskProgress.has(taskId)) {
      ctx.status = 404;
      ctx.body = { error: `未找到ID为 ${taskId} 的下载任务` };
      return;
    }
    
    // 实现取消逻辑
    try {
      await this.cancelDownloadById(taskId);
      
      logger.info(`成功取消下载任务: ${taskId}`);
      ctx.body = { 
        success: true, 
        message: `已取消任务 ${taskId}`, 
        taskId 
      };
    } catch (error) {
      logger.error(`取消任务 ${taskId} 时出错: ${error instanceof Error ? error.message : String(error)}`);
      ctx.status = 500;
      ctx.body = { 
        success: false, 
        error: `取消任务失败: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }
  
  // 创建新的下载任务
  protected createDownloadTask(): string {
    const taskId = uuidv4();
    this.taskProgress.set(taskId, createDownloadProgress());
    return taskId;
  }
  
  // 更新下载进度
  protected updateTaskProgress(taskId: string, update: Partial<DownloadProgress>) {
    if (!this.taskProgress.has(taskId)) return;
    
    const progress = this.taskProgress.get(taskId)!;
    this.taskProgress.set(taskId, { ...progress, ...update });
  }
  
  // 取消下载任务
  protected async cancelDownloadById(taskId: string): Promise<void> {
    if (!this.taskProgress.has(taskId)) return;
    
    const progress = this.taskProgress.get(taskId)!;
    progress.status = 'error';
    progress.error = '下载已取消';
    progress.canceled = true;
    
    if (progress.abortController) {
      progress.abortController.abort();
    }
    
    this.updateTaskProgress(taskId, progress);
    
    // 从模型到任务ID的映射中移除（如果存在）
    for (const [modelName, id] of this.modelDownloads.entries()) {
      if (id === taskId) {
        logger.info(`从模型映射中移除任务: ${modelName} -> ${taskId}`);
        break;
      }
    }
  }
} 