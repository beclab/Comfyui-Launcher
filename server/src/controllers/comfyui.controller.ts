import { Context } from 'koa';
import { spawn, ChildProcess } from 'child_process';
import { config } from '../config';
import path from 'path';
import * as http from 'http';
import httpProxy from 'http-proxy';
import * as fs from 'fs';
import * as net from 'net';

export class ComfyUIController {
  private comfyProcess: ChildProcess | null = null;
  private startTime: Date | null = null;

  constructor() {
    // 绑定方法到实例
    this.getStatus = this.getStatus.bind(this);
    this.startComfyUI = this.startComfyUI.bind(this);
    this.stopComfyUI = this.stopComfyUI.bind(this);
  }

  // 获取ComfyUI状态
  async getStatus(ctx: Context): Promise<void> {
    console.log('[API] 获取ComfyUI状态请求');
    
    const running = this.comfyProcess !== null && this.comfyProcess.exitCode === null;
    const uptime = this.startTime ? this.getUptime() : null;
    
    console.log(`[API] ComfyUI当前状态: ${running ? '运行中' : '已停止'}`);
    if (running) {
      console.log(`[API] 已运行时间: ${uptime}`);
    }
    
    ctx.body = {
      running,
      pid: running && this.comfyProcess ? this.comfyProcess.pid : null,
      uptime
    };
  }

  // 启动ComfyUI
  async startComfyUI(ctx: Context): Promise<void> {
    console.log('[API] 收到启动ComfyUI请求');
    
    // 检查是否已经在运行
    if (this.comfyProcess !== null && this.comfyProcess.exitCode === null) {
      console.log('[API] ComfyUI已经在运行中');
      ctx.body = {
        success: false,
        message: 'ComfyUI已经在运行中',
        pid: this.comfyProcess.pid
      };
      return;
    }
    
    try {
      // 启动ComfyUI进程
      console.log('[API] 尝试启动ComfyUI进程...');
      console.log(`[API] 执行命令: bash ${path.resolve('/runner-scripts/entrypoint.sh')}`);
      
      this.comfyProcess = spawn('bash', ['/runner-scripts/entrypoint.sh'], {
        detached: false, // 进程不分离，随主进程退出而退出
        stdio: ['ignore', 'pipe', 'pipe'] // 忽略stdin，捕获stdout和stderr
      });
      
      this.startTime = new Date();
      
      // 捕获输出
      if (this.comfyProcess.stdout) {
        this.comfyProcess.stdout.on('data', (data) => {
          console.log(`[ComfyUI] ${data.toString().trim()}`);
        });
      }
      
      if (this.comfyProcess.stderr) {
        this.comfyProcess.stderr.on('data', (data) => {
          console.error(`[ComfyUI-Error] ${data.toString().trim()}`);
        });
      }
      
      // 监听进程退出
      this.comfyProcess.on('exit', (code, signal) => {
        console.log(`[API] ComfyUI进程已退出，退出码: ${code}, 信号: ${signal}`);
        this.comfyProcess = null;
        this.startTime = null;
      });
      
      // 监听错误
      this.comfyProcess.on('error', (err) => {
        console.error('[API] ComfyUI进程启动错误:', err);
        this.comfyProcess = null;
        this.startTime = null;
      });
      
      // 等待一段时间确保进程启动成功
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (this.comfyProcess && this.comfyProcess.exitCode === null) {
        console.log('[API] ComfyUI启动成功');
        ctx.body = {
          success: true,
          message: 'ComfyUI已启动',
          pid: this.comfyProcess.pid
        };
      } else {
        console.error('[API] ComfyUI启动失败');
        ctx.status = 500;
        ctx.body = {
          success: false,
          message: 'ComfyUI启动失败'
        };
      }
    } catch (error) {
      console.error('[API] ComfyUI启动失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `启动失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }

  // 停止ComfyUI
  async stopComfyUI(ctx: Context): Promise<void> {
    console.log('[API] 收到停止ComfyUI请求');
    
    if (!this.comfyProcess || this.comfyProcess.exitCode !== null) {
      console.log('[API] ComfyUI已经停止');
      ctx.body = {
        success: false,
        message: 'ComfyUI已经停止'
      };
      return;
    }
    
    try {
      // 停止ComfyUI进程
      console.log('[API] 尝试停止ComfyUI进程...');
      
      // 首先尝试正常关闭
      this.comfyProcess.kill('SIGTERM');
      
      // 等待进程退出
      const exitPromise = new Promise<void>((resolve) => {
        if (this.comfyProcess) {
          this.comfyProcess.once('exit', () => {
            resolve();
          });
        } else {
          resolve();
        }
      });
      
      // 设置超时，如果进程没有在规定时间内退出，则强制终止
      const timeoutPromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          if (this.comfyProcess && this.comfyProcess.exitCode === null) {
            console.log('[API] ComfyUI进程未响应SIGTERM，尝试SIGKILL...');
            this.comfyProcess.kill('SIGKILL');
          }
          resolve();
        }, 5000); // 等待5秒
      });
      
      // 等待进程退出或超时
      await Promise.race([exitPromise, timeoutPromise]);
      
      // 再次检查进程状态
      if (this.comfyProcess && this.comfyProcess.exitCode === null) {
        console.error('[API] 无法停止ComfyUI进程');
        ctx.status = 500;
        ctx.body = {
          success: false,
          message: '无法停止ComfyUI进程'
        };
      } else {
        this.comfyProcess = null;
        this.startTime = null;
        console.log('[API] ComfyUI停止成功');
        ctx.body = {
          success: true,
          message: 'ComfyUI已停止'
        };
      }
    } catch (error) {
      console.error('[API] ComfyUI停止失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `停止失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
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