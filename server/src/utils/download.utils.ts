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
  onProgress: (progress: number, downloadedBytes: number, totalBytes: number) => boolean | void,
  options: DownloadOptions,
  progressTracker?: DownloadProgress
): Promise<boolean> {
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
  
  // 添加中止信号处理 - 检查是否在开始下载前已经取消
  if (abortController?.signal.aborted) {
    logger.logger.info(`下载已在开始前被取消: ${url}`);
    return false;
  }
  
  return new Promise((resolve, reject) => {
    // 在promise内部添加中止事件监听器
    const abortListener = () => {
      logger.logger.info(`下载被用户取消: ${url}`);
      reject(new Error('下载已被用户取消'));
    };
    
    if (abortController) {
      abortController.signal.addEventListener('abort', abortListener);
    }
    
    // 先发送HEAD请求获取文件大小
    const httpClient = url.startsWith('https:') ? https : http;
    const headOptions = {
      method: 'HEAD',
      headers: {},
      signal: abortController?.signal
    };
    
    logger.logger.info(`发送HEAD请求获取文件信息: ${url}`);
    
    const headReq = httpClient.request(url, headOptions, (headRes) => {
      // 从HEAD响应中获取文件大小
      let totalBytes = 0;
      
      // 处理重定向
      if (headRes.statusCode && (headRes.statusCode === 301 || headRes.statusCode === 302 || headRes.statusCode === 303 || headRes.statusCode === 307 || headRes.statusCode === 308)) {
        const location = headRes.headers.location;
        if (!location) {
          reject(new Error(`收到重定向状态码 ${headRes.statusCode} 但没有 location 头`));
          return;
        }
        
        // 记录日志
        logger.logger.info(`HEAD请求被重定向: ${location}`);
        
        // 释放当前响应
        headRes.resume();
        
        // 对重定向地址发送新的HEAD请求
        headRes.on('end', () => {
          try {
            // 创建针对重定向地址的新HEAD请求
            const redirectHeadReq = httpClient.request(location, headOptions, (redirectHeadRes) => {
              let redirectTotalBytes = 0;
              
              // 处理重定向响应
              if (redirectHeadRes.headers['content-length']) {
                redirectTotalBytes = parseInt(redirectHeadRes.headers['content-length'] as string, 10);
                logger.logger.info(`获取到重定向文件总大小: ${redirectTotalBytes} 字节`);
                
                // 更新总字节数
                totalBytes = redirectTotalBytes;
                if (progressTracker) progressTracker.totalBytes = totalBytes;
                
                // 断点续传逻辑：比较实际下载的字节与文件总大小
                continueFetchFile(totalBytes);
              } else {
                // 如果没有content-length，可能无法确定文件大小，默认继续下载
                logger.logger.warn(`无法从重定向获取文件大小，将继续下载`);
                continueFetchFile(0);
              }
            });
            
            redirectHeadReq.on('error', (err) => {
              logger.logger.error(`重定向HEAD请求错误: ${err.message}`);
              // 出错时仍尝试下载文件
              continueFetchFile(0);
            });
            
            redirectHeadReq.end();
          } catch (err) {
            logger.logger.error(`处理重定向错误: ${err instanceof Error ? err.message : String(err)}`);
            // 发生错误时，尝试继续下载
            continueFetchFile(0);
          }
        });
        return;
      }
      
      if (headRes.headers['content-length']) {
        totalBytes = parseInt(headRes.headers['content-length'] as string, 10);
        logger.logger.info(`获取到文件总大小: ${totalBytes} 字节`);
        if (progressTracker) progressTracker.totalBytes = totalBytes;
      }
      
      // 必须消费响应数据以触发'end'事件
      headRes.resume();
      
      // 在响应结束时调用继续下载逻辑，而不是立即调用
      headRes.on('end', () => {
        // 调用统一的继续下载逻辑
        continueFetchFile(totalBytes);
      });
    });
    
    // 添加HEAD请求错误处理，避免请求挂起
    headReq.on('error', (err) => {
      logger.logger.error(`HEAD请求错误: ${err.message}`);
      // 出错时仍尝试下载文件
      continueFetchFile(0);
    });
    
    // 确保HEAD请求结束
    headReq.end();
    
    // 统一处理是继续下载还是跳过的逻辑
    function continueFetchFile(totalBytes: number) {
      // 只有在以下情况下才跳过下载：
      // 1. 有明确的文件大小（totalBytes > 0）
      // 2. 已下载的部分(startBytes)等于或超过总大小
      // 3. 总大小不是太小（避免比较无效的重定向响应大小）
      if (totalBytes > 1000000 && startBytes >= totalBytes) {  // 至少1MB才可信
        logger.logger.info(`文件已完全下载，跳过下载过程: ${startBytes}/${totalBytes} 字节`);
        
        // 重命名临时文件为最终文件
        if (fs.existsSync(tempPath)) {
          fs.renameSync(tempPath, destPath);
          logger.logger.info(`已将文件 ${tempPath} 重命名为 ${destPath}`);
        }
        
        // 设置进度为100%并完成
        if (progressTracker) {
          progressTracker.currentModelProgress = 100;
          progressTracker.overallProgress = 100;
          progressTracker.totalBytes = totalBytes;
          progressTracker.downloadedBytes = totalBytes;
          progressTracker.completed = true;
        }
        
        onProgress(100, totalBytes, totalBytes);
        resolve(true);
        return;
      }
      
      // 如果文件大小不明确或部分下载未完成，继续下载过程
      logger.logger.info(`将继续下载文件: 已下载 ${startBytes} 字节，总大小 ${totalBytes || '未知'} 字节`);
      
      // 继续常规下载过程
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
        
        // 处理416错误 - 表示已经下载完全
        if (res.statusCode === 416) {
          logger.logger.info(`收到416错误，表明请求范围超出文件大小，文件可能已完全下载`);
          
          // 重命名临时文件为最终文件
          if (fs.existsSync(tempPath)) {
            fs.renameSync(tempPath, destPath);
            logger.logger.info(`已将文件 ${tempPath} 重命名为 ${destPath}`);
          }
          
          // 设置进度为100%并完成
          if (progressTracker) {
            progressTracker.currentModelProgress = 100;
            progressTracker.overallProgress = 100;
            progressTracker.totalBytes = startBytes;
            progressTracker.downloadedBytes = startBytes;
            progressTracker.completed = true;
          }
          
          onProgress(100, startBytes, startBytes);
          resolve(true);
          return;
        }
        
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
        let fileStream: fs.WriteStream | null = null;
        
        try {
          // 创建文件写入流
          fileStream = fs.createWriteStream(tempPath, { flags: startBytes > 0 ? 'a' : 'w' });
          
          // 关闭请求和文件流的辅助函数
          const cleanup = () => {
            if (fileStream) {
              fileStream.end();
              fileStream = null;
            }
            // 移除中止事件监听器
            if (abortController) {
              abortController.signal.removeEventListener('abort', abortListener);
            }
          };
          
          res.on('data', (chunk) => {
            // 先检查是否已中止
            if (abortController?.signal.aborted) {
              logger.logger.info(`下载过程中检测到中止信号: ${url}`);
              cleanup();
              reject(new Error('下载已被用户取消'));
              return;
            }
            
            // 写入数据到文件
            if (fileStream) {
              fileStream.write(chunk);
            }
            
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
            const shouldContinue = onProgress(percent, downloadedBytes, totalBytes);
            if (shouldContinue === false) {
              // 如果回调返回false，则停止下载
              logger.logger.info(`下载已通过回调函数取消: ${url}`);
              req.destroy();  // 主动销毁请求
              cleanup();
              reject(new Error('下载已被用户取消'));
              return;
            }
          });
          
          // 不再使用pipe，而是手动管理流
          res.on('end', () => {
            if (abortController?.signal.aborted) {
              logger.logger.info(`下载结束时检测到中止信号: ${url}`);
              cleanup();
              reject(new Error('下载已被用户取消'));
              return;
            }
            
            logger.logger.info(`下载完成: ${url}, 总大小: ${downloadedBytes} 字节`);
            
            // 添加此处：重命名临时文件为最终文件
            if (fs.existsSync(tempPath)) {
              try {
                fs.renameSync(tempPath, destPath);
                logger.logger.info(`已将文件 ${tempPath} 重命名为 ${destPath}`);
              } catch (err) {
                logger.logger.error(`重命名文件失败: ${err instanceof Error ? err.message : String(err)}`);
              }
            }
            
            cleanup();
            resolve(true);
          });
          
          res.on('error', (err) => {
            logger.logger.error(`响应流错误: ${err.message}`);
            cleanup();
            reject(err);
          });
          
        } catch (err) {
          logger.logger.error(`文件处理错误: ${err instanceof Error ? err.message : String(err)}`);
          if (fileStream) {
            fileStream.end();
          }
          reject(err);
        }
      });
      
      // 请求错误处理
      req.on('error', (err) => {
        // 检查是否是中止导致的错误
        if (abortController?.signal.aborted) {
          logger.logger.info(`GET请求被取消: ${url.substring(0, 100)}${url.length > 100 ? '...' : ''}`);
          reject(new Error('下载已被用户取消'));
        } else {
          logger.logger.error(`GET请求错误: ${err.message}`);
          reject(err);
        }
      });
      
      // 结束请求
      req.end();
    }
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

// 实现下载模型队列取消机制
export async function downloadModels(models: ModelInfo[], options: DownloadOptions): Promise<void> {
  let aborted = false;
  
  // 在downloadModels级别添加对中止信号的检查
  const abortHandler = () => {
    aborted = true;
    logger.logger.info(`收到全局下载中止信号，停止所有后续模型下载`);
  };
  
  // 添加中止事件监听器
  options.abortController.signal.addEventListener('abort', abortHandler);
  
  try {
    // 遍历模型列表
    for (let i = 0; i < models.length; i++) {
      // 每次循环开始时检查是否已中止
      if (aborted || options.abortController.signal.aborted) {
        logger.logger.info(`下载已被终止，停止剩余${models.length - i}个模型的下载`);
        break; // 如果中止了，停止循环
      }
      
      const model = models[i];
      // ... 现有的下载单个模型的代码 ...
    }
  } finally {
    // 清理：移除事件监听器
    options.abortController.signal.removeEventListener('abort', abortHandler);
  }
} 