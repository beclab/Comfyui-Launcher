/**
 * 下载相关工具函数
 */
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as https from 'https';
import * as logger from '../utils/logger';
import { DownloadProgress, ModelInfo, DownloadOptions } from '../types/models.types';

// 创建下载进度对象
export function createDownloadProgress(): DownloadProgress {
  return {
    currentModel: null,
    currentModelIndex: 0,
    overallProgress: 0,
    currentModelProgress: 0,
    completed: false,
    error: null,
    downloadedBytes: 0,
    totalBytes: 0,
    speed: 0,
    status: 'downloading'
  };
}

// 文件下载函数，支持断点续传
export async function downloadFile(
  url: string, 
  destPath: string, 
  onProgress: (progress: number, downloadedBytes: number, totalBytes: number) => void,
  options: DownloadOptions,
  progressTracker?: DownloadProgress
): Promise<void> {
  logger.logger.info(`开始下载文件: ${url} -> ${destPath}`);
  
  // 创建目标目录
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // 创建临时文件路径
  const tempPath = `${destPath}.download`;
  
  // 检查是否存在部分下载的文件
  let startBytes = 0;
  if (fs.existsSync(tempPath)) {
    const stat = fs.statSync(tempPath);
    if (stat.size > 0) {
      startBytes = stat.size;
      logger.logger.info(`发现已存在的部分下载，大小: ${startBytes} 字节`);
    }
  }
  
  // 初始化进度追踪器
  if (progressTracker) {
    progressTracker.startBytes = startBytes;
    progressTracker.downloadedBytes = startBytes;
    progressTracker.startTime = Date.now();
    progressTracker.lastUpdateTime = Date.now();
    progressTracker.lastBytes = startBytes;
  }
  
  const { abortController } = options;
  
  return new Promise((resolve, reject) => {
    const httpClient = url.startsWith('https:') ? https : http;
    const requestOptions: {
      method: string;
      headers: Record<string, string>;
      signal?: AbortSignal;
    } = {
      method: 'GET',
      headers: {},
      signal: abortController?.signal
    };
    
    // 添加Range头用于断点续传
    if (startBytes > 0) {
      requestOptions.headers!['Range'] = `bytes=${startBytes}-`;
      logger.logger.info(`设置断点续传: Range=${requestOptions.headers!['Range']}`);
    }
    
    logger.logger.info(`准备HTTP请求: ${url}`);
    
    const req = httpClient.request(url, requestOptions, (res) => {
      logger.logger.info(`收到响应：状态码=${res.statusCode}, 头=${JSON.stringify(res.headers)}`);
      
      // 处理重定向
      if (res.statusCode && (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 303 || res.statusCode === 307 || res.statusCode === 308)) {
        const location = res.headers.location;
        if (!location) {
          reject(new Error(`收到重定向状态码 ${res.statusCode} 但没有 location 头`));
          return;
        }
        
        // 记录日志
        logger.logger.info(`跟随重定向: ${location.substring(0, 100)}${location.length > 100 ? '...' : ''}`);
        
        // 释放当前响应
        res.resume();
        
        // 清理现有响应
        res.on('end', () => {
          try {
            // 递归调用 downloadFile 而不是内部的重定向函数，这样能正确传递 abortController
            downloadFile(location, destPath, onProgress, options, progressTracker)
              .then(resolve)
              .catch(reject);
          } catch (err) {
            reject(err);
          }
        });
        return;
      }
      
      // 处理其他错误状态码
      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
        const error = new Error(`HTTP 错误状态码: ${res.statusCode}`);
        reject(error);
        return;
      }
      
      // 提取总文件大小
      let totalBytes = progressTracker?.totalBytes || 0;
      
      // 处理Content-Length
      if (res.headers['content-length']) {
        const contentLength = parseInt(res.headers['content-length'] as string, 10);
        if (!isNaN(contentLength)) {
          if (startBytes > 0 && res.statusCode === 206) {
            totalBytes = startBytes + contentLength;
            logger.logger.info(`断点续传(206): 总大小=${totalBytes} (${startBytes} + ${contentLength})`);
          } else {
            totalBytes = contentLength;
            logger.logger.info(`常规下载: 总大小=${contentLength}`);
          }
          if (progressTracker) progressTracker.totalBytes = totalBytes;
        }
      }
      
      // 处理Content-Range
      const rangeHeader = res.headers['content-range'];
      if (typeof rangeHeader === 'string') {
        const match = rangeHeader.match(/bytes\s+\d+-\d+\/(\d+)/);
        if (match && match[1]) {
          totalBytes = parseInt(match[1], 10);
          if (progressTracker) progressTracker.totalBytes = totalBytes;
          logger.logger.info(`从Content-Range获取总大小: ${totalBytes}`);
        }
      }
      
      // 处理数据下载
      let downloadedBytes = startBytes;
      
      res.on('data', (chunk) => {
        // 更新下载统计
        downloadedBytes += chunk.length;
        if (progressTracker) progressTracker.downloadedBytes = downloadedBytes;
        
        // 计算进度
        const percent = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0;
        if (progressTracker) {
          progressTracker.currentModelProgress = percent;
          progressTracker.overallProgress = percent;
        }
        
        // 计算下载速度
        const now = Date.now();
        const timeDiff = (now - (progressTracker?.lastUpdateTime || progressTracker?.startTime || now)) / 1000;
        
        if (timeDiff >= 0.5 && progressTracker) {
          const bytesDiff = downloadedBytes - (progressTracker.lastBytes || startBytes);
          
          if (bytesDiff > 0 && timeDiff > 0) {
            progressTracker.speed = Math.round(bytesDiff / timeDiff);
            logger.logger.info(`下载进度: ${percent}%, 速度: ${progressTracker.speed} 字节/秒, 已下载: ${downloadedBytes}/${totalBytes}`);
          }
          
          progressTracker.lastUpdateTime = now;
          progressTracker.lastBytes = downloadedBytes;
        }
        
        // 调用进度回调
        onProgress(percent, downloadedBytes, totalBytes);
      });
      
      // 使用管道将数据写入文件
      res.pipe(fs.createWriteStream(tempPath, { flags: startBytes > 0 ? 'a' : 'w' }));
      
      // 处理下载完成
      res.on('end', () => {
        logger.logger.info(`下载完成: ${url}, 总大小: ${downloadedBytes} 字节`);
        resolve();
      });
    });
    
    // 添加中止处理
    if (abortController) {
      abortController.signal.addEventListener('abort', () => {
        req.destroy(new Error('下载已被用户取消'));
      });
    }
    
    req.on('error', (err) => {
      // 检查是否是中止导致的错误
      if (abortController?.signal.aborted) {
        logger.logger.info(`下载已被用户取消: ${url.substring(0, 100)}${url.length > 100 ? '...' : ''}`);
        reject(new Error('下载已被用户取消'));
      } else {
        logger.logger.error(`下载出错: ${err.message}`);
        reject(err);
      }
    });
    
    // 结束请求
    req.end();
  });
}

// 获取下载速度
export function calculateSpeed(bytesDownloaded: number, startTime: number): number {
  const elapsedSeconds = (Date.now() - startTime) / 1000;
  return elapsedSeconds > 0 ? bytesDownloaded / elapsedSeconds : 0;
}

// 格式化文件大小
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

// 这里需要实现一个队列取消机制，建议修改
export async function downloadModels(models: ModelInfo[], options: DownloadOptions): Promise<void> {
  let aborted = false;
  
  // 在downloadModels级别添加对中止信号的检查
  options.abortController.signal.addEventListener('abort', () => {
    aborted = true;
    logger.logger.info(`收到全局下载中止信号，停止所有后续模型下载`);
  });
  
  // 遍历模型列表
  for (let i = 0; i < models.length; i++) {
    // 每次循环开始时检查是否已中止
    if (aborted) {
      logger.logger.info(`下载已被终止，停止剩余${models.length - i}个模型的下载`);
      break; // 如果中止了，停止循环
    }
    
    const model = models[i];
    // ... 现有的下载单个模型的代码 ...
  }
} 