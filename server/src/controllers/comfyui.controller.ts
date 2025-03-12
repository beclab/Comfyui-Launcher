import { Context } from 'koa';
import { spawn, ChildProcess } from 'child_process';
// import { config } from '../config';
import path from 'path';

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