import { Context } from 'koa';
import { spawn, ChildProcess, exec } from 'child_process';
import { config } from '../config';
import path from 'path';
import * as http from 'http';
import httpProxy from 'http-proxy';
import * as fs from 'fs';
import * as net from 'net';
import { logger } from '../utils/logger';

export class ComfyUIController {
  private comfyProcess: ChildProcess | null = null;
  private startTime: Date | null = null;
  // 追踪实际的ComfyUI进程ID
  private comfyPid: number | null = null;

  constructor() {
    // 绑定方法到实例
    this.getStatus = this.getStatus.bind(this);
    this.startComfyUI = this.startComfyUI.bind(this);
    this.stopComfyUI = this.stopComfyUI.bind(this);
    
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

  // 启动ComfyUI
  async startComfyUI(ctx: Context): Promise<void> {
    logger.info('[API] 收到启动ComfyUI请求');
    
    // 首先检查是否已经在运行
    const running = await isComfyUIRunning();
    if (running) {
      logger.info('[API] ComfyUI已经在运行中');
      ctx.body = {
        success: false,
        message: 'ComfyUI已经在运行中',
        pid: this.comfyPid
      };
      return;
    }
    
    try {
      // 启动ComfyUI进程
      logger.info('[API] 尝试启动ComfyUI进程...');
      logger.info(`[API] 执行命令: bash ${path.resolve('/runner-scripts/entrypoint.sh')}`);
      
      this.comfyProcess = spawn('bash', ['/runner-scripts/entrypoint.sh'], {
        detached: false, // 进程不分离，随主进程退出而退出
        stdio: ['ignore', 'pipe', 'pipe'] // 忽略stdin，捕获stdout和stderr
      });
      
      this.startTime = new Date();
      
      // 捕获输出
      if (this.comfyProcess.stdout) {
        this.comfyProcess.stdout.on('data', (data) => {
          const output = data.toString().trim();
          logger.info(`[ComfyUI] ${output}`);
          
          // 尝试从输出中捕获实际的ComfyUI进程ID
          const match = output.match(/ComfyUI.*启动.*pid[:\s]+(\d+)/i);
          if (match && match[1]) {
            this.comfyPid = parseInt(match[1], 10);
            logger.info(`[API] 捕获到ComfyUI真实PID: ${this.comfyPid}`);
          }
        });
      }
      
      if (this.comfyProcess.stderr) {
        this.comfyProcess.stderr.on('data', (data) => {
          logger.error(`[ComfyUI-Error] ${data.toString().trim()}`);
        });
      }
      
      // 监听进程退出
      this.comfyProcess.on('exit', (code, signal) => {
        logger.info(`[API] 启动脚本进程已退出，退出码: ${code}, 信号: ${signal}`);
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
        logger.error('[API] 启动脚本进程错误:', err);
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
                logger.info(`[API] 找到ComfyUI PID: ${this.comfyPid}`);
              }
            });
          }
          break;
        }
        
        retries++;
      }
      
      if (comfyStarted) {
        logger.info('[API] ComfyUI启动成功');
        ctx.body = {
          success: true,
          message: 'ComfyUI已启动',
          pid: this.comfyPid
        };
      } else {
        logger.error('[API] ComfyUI启动失败或超时');
        ctx.status = 500;
        ctx.body = {
          success: false,
          message: 'ComfyUI启动失败或超时'
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
      logger.error('[API] ComfyUI启动失败:', errorMessage);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `启动失败: ${errorMessage}`
      };
    }
  }

  // 停止ComfyUI
  async stopComfyUI(ctx: Context): Promise<void> {
    try {
      logger.info('[API] 收到停止ComfyUI请求');
      
      // 首先检查ComfyUI是否在运行
      const running = await isComfyUIRunning();
      if (!running) {
        logger.info('[API] ComfyUI未运行');
        ctx.body = { success: true, message: 'ComfyUI未运行' };
        return;
      }
      
      logger.info('[API] 尝试停止ComfyUI进程...');
      
      // 使用找到的实际ComfyUI PID或通过查询获取
      if (!this.comfyPid) {
        await new Promise<void>((resolve) => {
          exec("ps aux | grep '[p]ython.*comfyui' | awk '{print $2}'", (error, stdout) => {
            if (!error && stdout.trim()) {
              this.comfyPid = parseInt(stdout.trim(), 10);
              logger.info(`[API] 找到ComfyUI PID: ${this.comfyPid}`);
            }
            resolve();
          });
        });
      }
      
      if (!this.comfyPid) {
        logger.warn('[API] 无法确定ComfyUI进程ID，将尝试通用方法停止');
        // 使用通用方法终止
        await this.killComfyUIGeneric();
        
        // 验证是否已停止
        const stillRunning = await isComfyUIRunning();
        if (!stillRunning) {
          logger.info('[API] ComfyUI已成功停止');
          this.comfyPid = null;
          this.startTime = null;
          ctx.body = { success: true, message: 'ComfyUI停止成功' };
        } else {
          logger.error('[API] 无法停止ComfyUI');
          ctx.status = 500;
          ctx.body = { success: false, error: '无法停止ComfyUI' };
        }
        return;
      }
      
      // 使用确定的PID停止进程
      logger.info(`[API] 停止ComfyUI进程，PID: ${this.comfyPid}`);
      
      // 在Unix系统上终止进程及其子进程
      if (process.platform === 'win32') {
        // Windows平台
        exec(`taskkill /pid ${this.comfyPid} /T /F`, (error) => {
          if (error) {
            logger.error(`[API] 停止ComfyUI失败: ${error.message}`);
          }
        });
      } else {
        // Unix平台
        try {
          // 先发送SIGTERM
          process.kill(this.comfyPid, 'SIGTERM');
          
          // 等待一段时间，如果进程还在运行则发送SIGKILL
          setTimeout(async () => {
            try {
              // 检查进程是否仍在运行
              process.kill(this.comfyPid as number, 0);  // 信号0用于检查进程是否存在
              logger.warn('[API] ComfyUI未能通过SIGTERM优雅退出，尝试SIGKILL');
              process.kill(this.comfyPid as number, 'SIGKILL');
            } catch (e) {
              // 如果这里抛出异常，可能是因为进程已经不存在了，这是我们想要的结果
              logger.info('[API] ComfyUI进程已经终止');
            }
          }, 5000);
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          logger.error(`[API] 发送信号失败: ${errorMessage}`);
          // 尝试使用其他方法
          await this.killComfyUIGeneric();
        }
      }
      
      // 等待确认进程已终止
      let retries = 0;
      const maxRetries = 10;
      while (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const stillRunning = await isComfyUIRunning();
        if (!stillRunning) {
          logger.info('[API] ComfyUI已成功停止');
          this.comfyPid = null;
          this.startTime = null;
          ctx.body = { success: true, message: 'ComfyUI停止成功' };
          return;
        }
        retries++;
      }
      
      // 如果仍然在运行，尝试强制终止
      logger.warn('[API] ComfyUI未能在超时时间内停止，尝试强制终止');
      await this.killComfyUIGeneric();
      
      // 最后检查
      const finalCheck = await isComfyUIRunning();
      if (!finalCheck) {
        logger.info('[API] ComfyUI已成功停止');
        this.comfyPid = null;
        this.startTime = null;
        ctx.body = { success: true, message: 'ComfyUI停止成功' };
      } else {
        logger.error('[API] 无法停止ComfyUI，即使在强制终止后');
        ctx.status = 500;
        ctx.body = { success: false, error: '无法停止ComfyUI' };
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
    return new Promise<void>((resolve) => {
      // 尝试更通用的方法终止ComfyUI
      const cmd = process.platform === 'win32'
        ? 'taskkill /F /IM python.exe /T'
        : 'pkill -9 -f "python.*comfyui"';
        
      exec(cmd, (error) => {
        if (error) {
          logger.error(`[API] 通用终止ComfyUI失败: ${error.message}`);
        } else {
          logger.info('[API] 通用终止命令执行成功');
        }
        resolve();
      });
    });
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