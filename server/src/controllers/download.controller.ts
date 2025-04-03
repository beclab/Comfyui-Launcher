/**
 * 通用下载管理控制器
 */
import * as Koa from 'koa';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import logger, { i18nLogger } from '../utils/logger';
import { DownloadProgress, EssentialModel, DownloadOptions } from '../types/models.types';
import { createDownloadProgress, downloadFile } from '../utils/download.utils';

// 添加下载历史记录接口
interface DownloadHistoryItem {
  id: string;            // 唯一标识符
  modelName: string;     // 模型名称
  status: 'success' | 'failed' | 'canceled' | 'downloading'; // 下载状态
  statusText?: string;   // 状态本地化文本
  startTime: number;     // 开始时间戳
  endTime?: number;      // 结束时间戳
  fileSize?: number;     // 文件大小(字节)
  downloadedSize?: number; // 实际下载大小(字节)
  error?: string;        // 错误信息(如果失败)
  source?: string;       // 下载源(如hf或mirror)
  speed?: number;        // 平均下载速度
  savePath?: string;     // 保存路径
  downloadUrl?: string;  // 下载URL
  taskId?: string;       // 关联的任务ID
}

export class DownloadController {
  // 受保护属性，供子类访问
  protected taskProgress = new Map<string, DownloadProgress>();
  
  // 存储模型名称到任务ID的映射
  protected modelDownloads = new Map<string, string>();
  
  // 添加下载历史记录数组
  protected downloadHistory: DownloadHistoryItem[] = [];
  private readonly HISTORY_FILE_PATH = path.join(process.env.DATA_DIR || './data', 'download-history.json');
  private readonly MAX_HISTORY_ITEMS = 100; // 最多保存100条历史记录
  
  constructor() {
    // 加载历史记录
    this.loadDownloadHistory();
  }
  
  // 加载下载历史记录
  private async loadDownloadHistory(): Promise<void> {
    try {
      // 检查文件是否存在
      const exists = await this.fileExists(this.HISTORY_FILE_PATH);
      if (exists) {
        const historyData = await this.readFile(this.HISTORY_FILE_PATH, 'utf8');
        this.downloadHistory = JSON.parse(historyData);
        logger.info(`已加载 ${this.downloadHistory.length} 条下载历史记录`);
      }
    } catch (error) {
      logger.error(`加载下载历史记录失败: ${error instanceof Error ? error.message : String(error)}`);
      // 如果加载失败，初始化为空数组
      this.downloadHistory = [];
    }
  }
  
  // 封装文件存在检查，便于测试和扩展
  protected async fileExists(filePath: string): Promise<boolean> {
    try {
      await require('fs').promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  // 封装文件读取，便于测试和扩展
  protected async readFile(filePath: string, encoding: string): Promise<string> {
    return await require('fs').promises.readFile(filePath, encoding);
  }
  
  // 保存下载历史记录
  protected async saveDownloadHistory(): Promise<void> {
    try {
      // 确保目录存在
      const dirPath = path.dirname(this.HISTORY_FILE_PATH);
      await require('fs').promises.mkdir(dirPath, { recursive: true });
      
      // 限制历史记录数量
      if (this.downloadHistory.length > this.MAX_HISTORY_ITEMS) {
        this.downloadHistory = this.downloadHistory.slice(-this.MAX_HISTORY_ITEMS);
      }
      
      // 保存到文件
      await require('fs').promises.writeFile(
        this.HISTORY_FILE_PATH, 
        JSON.stringify(this.downloadHistory)
      );
    } catch (error) {
      logger.error(`保存下载历史记录失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // 添加一条下载历史记录
  protected addDownloadHistory(item: DownloadHistoryItem): void {
    // 检查是否存在相同ID的记录
    const existingIndex = this.downloadHistory.findIndex(record => record.id === item.id);
    
    if (existingIndex >= 0) {
      // 更新现有记录
      this.downloadHistory[existingIndex] = { ...this.downloadHistory[existingIndex], ...item };
    } else {
      // 添加新记录
      this.downloadHistory.push(item);
    }
    
    // 异步保存
    this.saveDownloadHistory().catch(err => {
      logger.error(`保存下载历史记录失败: ${err instanceof Error ? err.message : String(err)}`);
    });
  }
  
  // 更新下载历史记录
  protected updateDownloadHistory(id: string, updates: Partial<DownloadHistoryItem>): boolean {
    const index = this.downloadHistory.findIndex(item => item.id === id);
    if (index !== -1) {
      this.downloadHistory[index] = { ...this.downloadHistory[index], ...updates };
      this.saveDownloadHistory().catch(err => {
        logger.error(`更新并保存下载历史记录失败: ${err instanceof Error ? err.message : String(err)}`);
      });
      return true;
    }
    return false;
  }
  
  // 获取下载历史记录API
  public async getDownloadHistory(ctx: Koa.Context): Promise<void> {
    try {
      // 获取客户端首选语言 - 优先从查询参数获取
      const locale = ctx.query.lang as string || this.getClientLocale(ctx) || i18nLogger.getLocale();
      
      logger.info(`Getting download history with locale: ${locale}`);
      
      // 本地化历史记录
      const localizedHistory = this.downloadHistory.map(item => {
        // 复制原始记录
        const localizedItem = { ...item };
        
        // 翻译状态文本
        localizedItem.statusText = this.translateStatus(item.status, locale);
        
        // 如果有错误信息，尝试翻译
        if (item.error) {
          // 尝试找到通用错误消息
          localizedItem.error = this.translateError(item.error, locale);
        }
        
        return localizedItem;
      });
      
      ctx.body = {
        success: true,
        count: localizedHistory.length,
        history: localizedHistory
      };
    } catch (error) {
      logger.error(`Failed to get download history: ${error instanceof Error ? error.message : String(error)}`);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: i18nLogger.translate('download.history.error', { lng: this.getClientLocale(ctx) })
      };
    }
  }
  
  // 清除下载历史记录
  public async clearDownloadHistory(ctx: Koa.Context): Promise<void> {
    try {
      // 正确进行类型断言
      const body = ctx.request.body as { lang?: string };
      const locale = body.lang || this.getClientLocale(ctx) || i18nLogger.getLocale();
      
      this.downloadHistory = [];
      await this.saveDownloadHistory();
      
      ctx.body = {
        success: true,
        message: i18nLogger.translate('download.history.cleared', { lng: locale })
      };
    } catch (error) {
      logger.error(`Failed to clear download history: ${error instanceof Error ? error.message : String(error)}`);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: i18nLogger.translate('download.history.clear_error', { lng: this.getClientLocale(ctx) })
      };
    }
  }
  
  // 删除特定的下载历史记录项
  public async deleteDownloadHistoryItem(ctx: Koa.Context): Promise<void> {
    // 获取请求中的ID，正确进行类型断言
    const body = ctx.request.body as { id?: string, lang?: string };
    const { id, lang } = body;
    const locale = lang || this.getClientLocale(ctx) || i18nLogger.getLocale();
    
    if (!id) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: i18nLogger.translate('download.history.id_required', { lng: locale })
      };
      return;
    }
    
    try {
      // 查找并删除记录
      const index = this.downloadHistory.findIndex(item => item.id === id);
      if (index !== -1) {
        const deletedItem = this.downloadHistory[index];
        this.downloadHistory.splice(index, 1);
        await this.saveDownloadHistory();
        
        ctx.body = {
          success: true,
          message: i18nLogger.translate('download.history.item_deleted', { 
            lng: locale,
            name: deletedItem.modelName
          })
        };
      } else {
        ctx.status = 404;
        ctx.body = {
          success: false,
          message: i18nLogger.translate('download.history.item_not_found', { 
            lng: locale,
            id 
          })
        };
      }
    } catch (error) {
      logger.error(`Failed to delete download history item: ${error instanceof Error ? error.message : String(error)}`);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: i18nLogger.translate('download.history.delete_error', { lng: locale })
      };
    }
  }
  
  // 获取客户端首选语言
  private getClientLocale(ctx: Koa.Context): string | undefined {
    // 从查询参数获取
    if (ctx.query.lang && typeof ctx.query.lang === 'string') {
      return ctx.query.lang;
    }
    
    // 从Accept-Language头获取
    const acceptLanguage = ctx.get('Accept-Language');
    if (acceptLanguage) {
      const lang = acceptLanguage.split(',')[0].split(';')[0].split('-')[0];
      return lang;
    }
    
    return undefined;
  }
  
  // 翻译下载状态
  private translateStatus(status: string, locale: string): string {
    // 正确的翻译键路径，确保与logs.json中的结构一致
    const keyMap: Record<string, string> = {
      'success': 'download.status.success',
      'failed': 'download.status.failed',
      'canceled': 'download.status.canceled',
      'downloading': 'download.status.downloading',
      'unknown': 'download.status.unknown'
    };
    
    const key = keyMap[status] || 'download.status.unknown';
    const translated = i18nLogger.translate(key, { lng: locale });
    
    // 检查是否返回了键名本身，这表示未找到翻译
    if (translated === key) {
      logger.warn(`Missing translation for key ${key} in locale ${locale}`);
      
      // 返回本地定义的备用文本
      const fallbackMap: Record<string, Record<string, string>> = {
        'zh': {
          'success': '成功',
          'failed': '失败',
          'canceled': '已取消',
          'downloading': '下载中',
          'unknown': '未知'
        },
        'en': {
          'success': 'Success',
          'failed': 'Failed',
          'canceled': 'Canceled',
          'downloading': 'Downloading',
          'unknown': 'Unknown'
        }
      };
      
      // 返回对应语言的备用文本或默认英文
      return (fallbackMap[locale] && fallbackMap[locale][status]) || 
             (fallbackMap['en'] && fallbackMap['en'][status]) || 
             status;
    }
    
    return translated;
  }
  
  // 翻译错误消息
  private translateError(error: string, locale: string): string {
    // 错误消息匹配逻辑
    let translationKey = 'download.error_types.unknown';
    
    if (error.includes('下载已取消') || error.includes('canceled')) {
      translationKey = 'download.error_types.canceled';
    } else if (error.includes('not found') || error.includes('找不到')) {
      translationKey = 'download.error_types.not_found';
    } else if (error.includes('network') || error.includes('网络')) {
      translationKey = 'download.error_types.network';
    } else if (error.includes('permission') || error.includes('权限')) {
      translationKey = 'download.error_types.permission';
    }
    
    const translated = i18nLogger.translate(translationKey, { lng: locale });
    
    // 检查是否返回了键名本身，这表示未找到翻译
    if (translated === translationKey) {
      logger.warn(`Missing translation for error key ${translationKey} in locale ${locale}`);
      return error; // 如果没有找到翻译，返回原始错误
    }
    
    return translated;
  }
  
  // 通用方法：下载模型 - 修改现有方法支持历史记录
  protected async downloadModelByName(
    modelName: string, 
    downloadUrl: string, 
    outputPath: string, 
    taskId: string,
    source?: string
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
    
    // 创建并添加历史记录
    const historyId = uuidv4();
    const historyItem: DownloadHistoryItem = {
      id: historyId,
      modelName: modelName,
      status: 'downloading',
      startTime: Date.now(),
      source: source,
      savePath: outputPath,
      downloadUrl: downloadUrl,
      taskId: taskId
    };
    this.addDownloadHistory(historyItem);
    
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
      
      // 更新历史记录
      this.updateDownloadHistory(historyId, {
        status: 'success',
        endTime: Date.now(),
        fileSize: progress.totalBytes,
        downloadedSize: progress.downloadedBytes,
        speed: progress.speed
      });
      
      logger.info(`模型 ${modelName} 下载完成`);
    } catch (error) {
      // 如果是取消导致的错误，维持canceled状态
      if (progress.canceled) {
        logger.info(`模型 ${modelName} 下载已取消`);
        
        // 更新历史记录为取消状态
        this.updateDownloadHistory(historyId, {
          status: 'canceled',
          endTime: Date.now(),
          downloadedSize: progress.downloadedBytes,
          fileSize: progress.totalBytes,
          speed: progress.speed
        });
        
        return;
      }
      
      // 其他错误，记录并更新状态
      progress.status = 'error';
      progress.error = error instanceof Error ? error.message : String(error);
      this.updateTaskProgress(taskId, progress);
      
      // 更新历史记录为失败状态
      this.updateDownloadHistory(historyId, {
        status: 'failed',
        endTime: Date.now(),
        error: progress.error,
        downloadedSize: progress.downloadedBytes,
        fileSize: progress.totalBytes,
        speed: progress.speed
      });
      
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
  
  // 重写取消下载方法，更新历史记录
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
    
    // 查找相关的历史记录并更新状态
    const historyItem = this.downloadHistory.find(item => item.taskId === taskId);
    if (historyItem) {
      this.updateDownloadHistory(historyItem.id, {
        status: 'canceled',
        endTime: Date.now(),
        downloadedSize: progress.downloadedBytes,
        fileSize: progress.totalBytes,
        speed: progress.speed
      });
    }
    
    // 从模型到任务ID的映射中移除（如果存在）
    for (const [modelName, id] of this.modelDownloads.entries()) {
      if (id === taskId) {
        logger.info(`从模型映射中移除任务: ${modelName} -> ${taskId}`);
        break;
      }
    }
  }
} 