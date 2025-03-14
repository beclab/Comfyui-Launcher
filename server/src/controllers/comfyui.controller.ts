import { Context } from 'koa';
import { spawn, ChildProcess, exec } from 'child_process';
import { config } from '../config';
import path from 'path';
import * as http from 'http';
import httpProxy from 'http-proxy';
import * as fs from 'fs';
import * as net from 'net';
import * as util from 'util';
import { logger } from '../utils/logger';

// 将exec转换为Promise
const execPromise = util.promisify(exec);

export class ComfyUIController {
  private comfyProcess: ChildProcess | null = null;
  private startTime: Date | null = null;
  // 追踪实际的ComfyUI进程ID
  private comfyPid: number | null = null;
  // 存储最近的ComfyUI日志
  private recentLogs: string[] = [];
  private maxLogEntries: number = 100; // 保留最近100条日志

  constructor() {
    // 绑定方法到实例
    this.getStatus = this.getStatus.bind(this);
    this.startComfyUI = this.startComfyUI.bind(this);
    this.stopComfyUI = this.stopComfyUI.bind(this);
    this.getLogs = this.getLogs.bind(this);
    
    // 初始化时检查ComfyUI是否已经运行
    this.checkIfComfyUIRunning();
  }

  // 初始化时检查ComfyUI是否已经运行
  private async checkIfComfyUIRunning(): Promise<void> {
    try {
      const running = await isComfyUIRunning();
      if (running) {
        // 如果ComfyUI已经在运行，找出它的进程ID
        exec("ps aux | grep '[p]ython.*comfyui' | awk '{print $2}'", (error, stdout) => {
          if (!error && stdout.trim()) {
            const pid = parseInt(stdout.trim(), 10);
            if (!isNaN(pid)) {
              this.comfyPid = pid;
              this.startTime = new Date(); // 假设刚刚启动
              logger.info(`[API] 检测到ComfyUI已在运行，PID: ${pid}`);
            }
          }
        });
      }
    } catch (error) {
      logger.error(`[API] 检查ComfyUI状态时出错: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 获取ComfyUI状态
  async getStatus(ctx: Context): Promise<void> {
    logger.info('[API] 接收到状态请求，时间:' + new Date().toISOString());
    
    logger.info('[API] 获取ComfyUI状态请求');
    
    // 通过网络端口检查是否运行
    const running = await isComfyUIRunning();
    const uptime = this.startTime ? this.getUptime() : null;
    
    logger.info(`[API] ComfyUI当前状态: ${running ? '运行中' : '已停止'}`);
    if (running) {
      logger.info(`[API] 已运行时间: ${uptime}`);
    }
    
    ctx.body = {
      running,
      pid: this.comfyPid,
      uptime
    };
  }

  // 添加新方法: 获取ComfyUI日志
  async getLogs(ctx: Context): Promise<void> {
    logger.info('[API] 收到获取ComfyUI日志请求');
    ctx.body = {
      logs: this.recentLogs
    };
  }

  // 记录日志的辅助方法
  private addLog(message: string, isError: boolean = false): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${isError ? 'ERROR: ' : ''}${message}`;
    
    // 添加到日志数组并保持大小限制
    this.recentLogs.push(logEntry);
    if (this.recentLogs.length > this.maxLogEntries) {
      this.recentLogs.shift(); // 移除最旧的日志
    }
    
    // 同时记录到系统日志
    if (isError) {
      logger.error(message);
    } else {
      logger.info(message);
    }
  }

  // 启动ComfyUI - 更新记录日志的部分
  async startComfyUI(ctx: Context): Promise<void> {
    logger.info('[API] 收到启动ComfyUI请求');
    this.recentLogs = []; // 清除之前的日志
    this.addLog('收到启动ComfyUI请求');
    
    // 首先检查是否已经在运行
    const running = await isComfyUIRunning();
    if (running) {
      this.addLog('ComfyUI已经在运行中');
      ctx.body = {
        success: false,
        message: 'ComfyUI已经在运行中',
        pid: this.comfyPid
      };
      return;
    }
    
    try {
      // 启动ComfyUI进程
      this.addLog('尝试启动ComfyUI进程...');
      this.addLog(`执行命令: bash ${path.resolve('/runner-scripts/entrypoint.sh')}`);
      
      this.comfyProcess = spawn('bash', ['/runner-scripts/entrypoint.sh'], {
        detached: false, // 进程不分离，随主进程退出而退出
        stdio: ['ignore', 'pipe', 'pipe'] // 忽略stdin，捕获stdout和stderr
      });
      
      this.startTime = new Date();
      
      // 捕获输出
      if (this.comfyProcess.stdout) {
        this.comfyProcess.stdout.on('data', (data) => {
          const output = data.toString().trim();
          this.addLog(`[ComfyUI] ${output}`);
          
          // 尝试从输出中捕获实际的ComfyUI进程ID
          const match = output.match(/ComfyUI.*启动.*pid[:\s]+(\d+)/i);
          if (match && match[1]) {
            this.comfyPid = parseInt(match[1], 10);
            this.addLog(`捕获到ComfyUI真实PID: ${this.comfyPid}`);
          }
        });
      }
      
      if (this.comfyProcess.stderr) {
        this.comfyProcess.stderr.on('data', (data) => {
          const errorMsg = data.toString().trim();
          this.addLog(`[ComfyUI-Error] ${errorMsg}`, true);
        });
      }
      
      // 监听进程退出
      this.comfyProcess.on('exit', (code, signal) => {
        this.addLog(`启动脚本进程已退出，退出码: ${code}, 信号: ${signal}`);
        this.comfyProcess = null;
        
        // 检查ComfyUI是否仍在运行
        this.checkIfComfyUIRunning().then(async () => {
          const stillRunning = await isComfyUIRunning();
          if (!stillRunning) {
            this.comfyPid = null;
            this.startTime = null;
          }
        });
      });
      
      // 监听错误
      this.comfyProcess.on('error', (err) => {
        this.addLog(`启动脚本进程错误: ${err.message}`, true);
        this.comfyProcess = null;
      });
      
      // 等待一段时间确保进程启动成功
      let retries = 0;
      const maxRetries = 10;
      let comfyStarted = false;
      
      while (retries < maxRetries && !comfyStarted) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        comfyStarted = await isComfyUIRunning();
        
        if (comfyStarted) {
          // 获取真正的ComfyUI进程ID
          if (!this.comfyPid) {
            exec("ps aux | grep '[p]ython.*comfyui' | awk '{print $2}'", (error, stdout) => {
              if (!error && stdout.trim()) {
                this.comfyPid = parseInt(stdout.trim(), 10);
                this.addLog(`找到ComfyUI PID: ${this.comfyPid}`);
              }
            });
          }
          break;
        }
        
        retries++;
        this.addLog(`等待ComfyUI启动，尝试 ${retries}/${maxRetries}`);
      }
      
      if (comfyStarted) {
        this.addLog('ComfyUI启动成功');
        ctx.body = {
          success: true,
          message: 'ComfyUI已启动',
          pid: this.comfyPid
        };
      } else {
        this.addLog('ComfyUI启动失败或超时', true);
        ctx.status = 500;
        ctx.body = {
          success: false,
          message: 'ComfyUI启动失败或超时',
          logs: this.recentLogs // 返回日志信息
        };
        
        // 尝试清理启动脚本进程
        if (this.comfyProcess && this.comfyProcess.kill) {
          this.comfyProcess.kill();
          this.comfyProcess = null;
        }
        this.startTime = null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addLog(`ComfyUI启动失败: ${errorMessage}`, true);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `启动失败: ${errorMessage}`,
        logs: this.recentLogs // 返回日志信息
      };
    }
  }

  // 停止ComfyUI
  async stopComfyUI(ctx: Context): Promise<void> {
    logger.info('[API] 收到停止ComfyUI请求');
    
    try {
      // 首先检查是否真的在运行
      const running = await isComfyUIRunning();
      if (!running) {
        logger.info('[API] ComfyUI已经停止，无需操作');
        this.comfyPid = null;
        this.startTime = null;
        ctx.body = { success: true, message: 'ComfyUI已经停止' };
        return;
      }
      
      logger.info('[API] 尝试停止ComfyUI进程...');
      
      // 优先使用通用方法终止
      await this.killComfyUIGeneric();
      
      // 等待足够时间让进程完全终止
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 最终检查
      const finalCheck = await isComfyUIRunning();
      if (!finalCheck) {
        logger.info('[API] ComfyUI已成功停止');
        this.comfyPid = null;
        this.startTime = null;
        ctx.body = { success: true, message: 'ComfyUI停止成功' };
      } else {
        // 如果第一次尝试没有成功，再次尝试更强力的方法
        logger.warn('[API] 首次尝试未能完全停止ComfyUI，使用强制终止');
        await execPromise('pkill -9 -f python').catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const lastCheck = await isComfyUIRunning();
        if (!lastCheck) {
          logger.info('[API] ComfyUI在强制终止后已停止');
          this.comfyPid = null;
          this.startTime = null;
          ctx.body = { success: true, message: 'ComfyUI停止成功（强制）' };
        } else {
          logger.error('[API] 无法停止ComfyUI，即使在强制终止后');
          ctx.status = 500;
          ctx.body = { success: false, error: '无法停止ComfyUI' };
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`[API] 停止ComfyUI时发生错误: ${errorMessage}`);
      ctx.status = 500;
      ctx.body = { success: false, error: '停止ComfyUI时发生错误' };
    }
  }
  
  // 使用通用方法终止ComfyUI
  private async killComfyUIGeneric(): Promise<void> {
    try {
      // 首先找出大型Python进程（可能是ComfyUI）
      const { stdout } = await execPromise("ps aux | grep python | grep -v grep | awk '{if($6>100000) print $2}'");
      const pids = stdout.trim().split('\n').filter((pid: string) => pid);
      
      if (pids.length > 0) {
        logger.info(`[API] 找到可能的ComfyUI进程: ${pids.join(', ')}`);
        
        // 逐个终止找到的进程
        for (const pid of pids) {
          try {
            await execPromise(`kill -9 ${pid}`);
            logger.info(`[API] 已终止进程 ${pid}`);
          } catch (e: unknown) {
            logger.warn(`[API] 终止进程 ${pid} 失败: ${e}`);
          }
        }
        return;
      }
    } catch (e: unknown) {
      logger.error(`[API] 查找ComfyUI进程失败: ${e}`);
    }
    
    // 后备方案：使用通用命令
    const cmd = 'pkill -9 -f "python"';
    logger.info(`[API] 使用后备终止命令: ${cmd}`);
    await execPromise(cmd).catch((e: unknown) => logger.warn(`[API] 后备终止失败: ${e}`));
  }
  
  // 获取运行时间
  private getUptime(): string {
    if (!this.startTime) return '0秒';
    
    const now = new Date();
    const diffMs = now.getTime() - this.startTime.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    
    if (diffSecs < 60) {
      return `${diffSecs}秒`;
    } else if (diffSecs < 3600) {
      const mins = Math.floor(diffSecs / 60);
      const secs = diffSecs % 60;
      return `${mins}分${secs}秒`;
    } else {
      const hours = Math.floor(diffSecs / 3600);
      const mins = Math.floor((diffSecs % 3600) / 60);
      return `${hours}小时${mins}分钟`;
    }
  }
}

// 检查ComfyUI是否运行
export const isComfyUIRunning = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = 1000;
    
    socket.setTimeout(timeout);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.connect(config.comfyui.port, 'localhost');
  });
};

// 创建未启动状态页面的HTML
const getNotRunningHtml = () => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <title>ComfyUI 未启动</title>
    <meta charset="utf-8">
    <style>
      body {
        font-family: Arial, sans-serif;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        margin: 0;
        background-color: #f5f5f5;
      }
      .container {
        text-align: center;
        padding: 2rem;
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      }
      h1 {
        color: #e74c3c;
      }
      p {
        margin: 1rem 0;
      }
      .retry-btn {
        background-color: #3498db;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
        margin-top: 1rem;
      }
      .retry-btn:hover {
        background-color: #2980b9;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>ComfyUI 未启动</h1>
      <p>ComfyUI 服务目前未运行或无法访问。</p>
      <p>请确保 ComfyUI 服务已启动并正在监听端口 ${config.comfyui.port}。</p>
      <button class="retry-btn" onclick="window.location.reload()">重试</button>
    </div>
  </body>
  </html>
  `;
};

// 创建代理服务器
export const createComfyUIProxy = () => {
  const proxy = httpProxy.createProxyServer({
    target: `http://localhost:${config.comfyui.port}`,
    ws: true,
  });
  
  // 添加错误处理
  proxy.on('error', (err, req, res) => {
    console.error('代理请求出错:', err);
    if (res && 'writeHead' in res) {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('代理请求出错');
    }
  });
  
  const server = http.createServer(async (req, res) => {
    const comfyRunning = await isComfyUIRunning();
    
    if (comfyRunning) {
      proxy.web(req, res);
    } else {
      res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(getNotRunningHtml());
    }
  });
  
  // 处理WebSocket连接
  server.on('upgrade', async (req, socket, head) => {
    const comfyRunning = await isComfyUIRunning();
    
    if (comfyRunning) {
      proxy.ws(req, socket, head);
    } else {
      socket.end('HTTP/1.1 503 Service Unavailable\r\n\r\n');
    }
  });
  
  return server;
}; 