import { Context } from 'koa';
import { spawn, ChildProcess, exec } from 'child_process';
import { config, cachePath, paths } from '../config';
import path from 'path';
import * as http from 'http';
import httpProxy from 'http-proxy';
import * as fs from 'fs';
import * as net from 'net';
import * as util from 'util';
import { logger } from '../utils/logger';

// 将exec转换为Promise
const execPromise = util.promisify(exec);

// 重置日志的保存路径
const RESET_LOG_PATH = path.join(process.cwd(), 'logs');
const RESET_LOG_FILE = path.join(RESET_LOG_PATH, 'comfyui-reset.log');

export class ComfyUIController {
  private comfyProcess: ChildProcess | null = null;
  private startTime: Date | null = null;
  // 追踪实际的ComfyUI进程ID
  private comfyPid: number | null = null;
  // 存储最近的ComfyUI日志
  private recentLogs: string[] = [];
  private maxLogEntries: number = 100; // 保留最近100条日志
  private resetLogs: string[] = []; // 存储最近一次重置操作的日志

  constructor() {
    // 绑定方法到实例
    this.getStatus = this.getStatus.bind(this);
    this.startComfyUI = this.startComfyUI.bind(this);
    this.stopComfyUI = this.stopComfyUI.bind(this);
    this.getLogs = this.getLogs.bind(this);
    this.resetComfyUI = this.resetComfyUI.bind(this);
    this.getResetLogs = this.getResetLogs.bind(this);
    
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

  // 添加一个专门记录重置日志的方法
  private addResetLog(message: string, isError: boolean = false): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${isError ? 'ERROR: ' : ''}${message}`;
    this.resetLogs.push(logEntry);
    
    // 同时记录到系统日志
    if (isError) {
      logger.error(message);
    } else {
      logger.info(message);
    }
    
    // 将日志写入文件
    this.writeResetLogToFile(logEntry);
  }
  
  // 将重置日志写入文件
  private writeResetLogToFile(logEntry: string): void {
    try {
      // 确保日志目录存在
      if (!fs.existsSync(RESET_LOG_PATH)) {
        fs.mkdirSync(RESET_LOG_PATH, { recursive: true });
      }
      
      // 追加写入日志
      fs.appendFileSync(RESET_LOG_FILE, logEntry + '\n');
    } catch (error) {
      logger.error(`写入重置日志文件失败: ${error instanceof Error ? error.message : String(error)}`);
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

  // 重置ComfyUI到初始状态
  async resetComfyUI(ctx: Context): Promise<void> {
    logger.info('[API] 收到重置ComfyUI请求');
    // 清空重置日志
    this.resetLogs = [];
    
    // 同时清空日志文件
    try {
      if (!fs.existsSync(RESET_LOG_PATH)) {
        fs.mkdirSync(RESET_LOG_PATH, { recursive: true });
      }
      fs.writeFileSync(RESET_LOG_FILE, ''); // 清空文件内容
    } catch (error) {
      logger.error(`清空重置日志文件失败: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    this.addResetLog('收到重置ComfyUI到初始状态的请求');
    this.addLog('收到重置ComfyUI到初始状态的请求');
    
    try {
      // 首先检查ComfyUI是否在运行，如果是则停止它
      const running = await isComfyUIRunning();
      if (running) {
        this.addResetLog('ComfyUI正在运行，将先停止服务');
        this.addLog('ComfyUI正在运行，将先停止服务');
        await this.killComfyUIGeneric();
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const stillRunning = await isComfyUIRunning();
        if (stillRunning) {
          this.addResetLog('无法停止ComfyUI，重置操作中止', true);
          ctx.status = 500;
          ctx.body = { success: false, message: '无法停止ComfyUI，重置操作中止' };
          return;
        }
        
        this.comfyPid = null;
        this.startTime = null;
      }
      
      // 开始重置操作
      this.addResetLog('开始重置ComfyUI到初始状态...');
      
      // 1. 清空cache路径
      if (cachePath && fs.existsSync(cachePath)) {
        this.addResetLog(`清空cache路径: ${cachePath}`);
        await this.clearDirectory(cachePath);
      } else {
        this.addResetLog(`cache路径不存在: ${cachePath}`, true);
      }
      
      // 2. 清空COMFYUI_PATH下除models外的所有内容
      const comfyuiPath = paths.comfyui;
      if (comfyuiPath && fs.existsSync(comfyuiPath)) {
        this.addResetLog(`清理ComfyUI路径(保留models和output): ${comfyuiPath}`);
        const entries = fs.readdirSync(comfyuiPath, { withFileTypes: true });
        
        for (const entry of entries) {
          // 跳过models和output目录
          if (entry.name === 'models' || entry.name === 'output') {
            this.addResetLog(`保留${entry.name}目录`);
            continue;
          }
          
          const fullPath = path.join(comfyuiPath, entry.name);
          if (entry.isDirectory()) {
            this.addResetLog(`删除目录: ${entry.name}`);
            await this.clearDirectory(fullPath, true); // 删除整个目录
          } else {
            this.addResetLog(`删除文件: ${entry.name}`);
            fs.unlinkSync(fullPath);
          }
        }
      } else {
        this.addResetLog(`ComfyUI路径不存在: ${comfyuiPath}`, true);
      }
      
      // 3. 执行恢复初始文件的命令 - 改为重启Pod
      try {
        this.addResetLog('准备重启POD以恢复初始状态...');
        
        // 检查是否在Kubernetes环境中
        const isInK8s = fs.existsSync('/var/run/secrets/kubernetes.io/serviceaccount');
        
        if (isInK8s) {
          // 在Kubernetes环境中，尝试触发Pod重启
          this.addResetLog('检测到Kubernetes环境，将尝试触发Pod重启');
          
          // 创建一个标记文件，表示需要重启 - 使用dataDir目录
          try {
            // 确保目录存在
            if (!fs.existsSync(config.dataDir)) {
              this.addResetLog(`创建数据目录: ${config.dataDir}`);
              fs.mkdirSync(config.dataDir, { recursive: true });
            }
            
            const restartFlagFile = path.join(config.dataDir, '.need_restart');
            fs.writeFileSync(restartFlagFile, new Date().toISOString());
            this.addResetLog('已创建重启标记文件');
            
            // 向主进程发送SIGTERM信号
            this.addResetLog('正在触发容器重启...');
            await execPromise('kill 1'); // 向PID 1发送信号，这通常是容器的主进程
          } catch (fileError) {
            // 如果写入标记文件失败，记录错误并尝试直接退出
            this.addResetLog(`无法创建重启标记文件: ${fileError instanceof Error ? fileError.message : String(fileError)}`, true);
            this.addResetLog('将直接尝试退出进程触发重启...');
            await execPromise('kill 1'); 
          }
          
        } else {
          // 不在Kubernetes环境中，执行原来的恢复命令
          this.addResetLog('未检测到Kubernetes环境，执行标准恢复脚本');
          await execPromise('chmod +x /runner-scripts/up-version-cp.sh');
          this.addResetLog('已赋予脚本执行权限');
          
          const { stdout: upVersionOutput } = await execPromise('sh /runner-scripts/up-version-cp.sh');
          this.addResetLog(`执行up-version-cp.sh脚本结果: ${upVersionOutput.trim() || '完成'}`);
          
          const { stdout: rsyncOutput } = await execPromise('rsync -av --update /runner-scripts/ /root/runner-scripts/');
          this.addResetLog(`同步runner-scripts目录结果: ${rsyncOutput.trim().split('\n')[0]}...`);
        }
      } catch (cmdError) {
        const errorMsg = cmdError instanceof Error ? cmdError.message : String(cmdError);
        this.addResetLog(`执行恢复/重启操作时出错: ${errorMsg}`, true);
        // 继续执行，不中断整个重置过程
      }
      
      this.addResetLog('ComfyUI重置完成');
      ctx.body = {
        success: true,
        message: 'ComfyUI已成功重置到初始状态'
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addResetLog(`重置ComfyUI时发生错误: ${errorMessage}`, true);
      logger.error(`[API] 重置ComfyUI时发生错误: ${errorMessage}`);
      
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `重置失败: ${errorMessage}`,
        logs: this.resetLogs
      };
    }
  }
  
  // 辅助方法：清空目录
  private async clearDirectory(dirPath: string, removeDir: boolean = false): Promise<void> {
    if (!fs.existsSync(dirPath)) {
      return;
    }
    
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        await this.clearDirectory(fullPath, true);
      } else {
        // 安全删除文件
        try {
          fs.unlinkSync(fullPath);
        } catch (error) {
          this.addResetLog(`无法删除文件 ${fullPath}: ${error instanceof Error ? error.message : String(error)}`, true);
        }
      }
    }
    
    // 如果需要，删除目录本身
    if (removeDir) {
      try {
        fs.rmdirSync(dirPath);
      } catch (error) {
        this.addResetLog(`无法删除目录 ${dirPath}: ${error instanceof Error ? error.message : String(error)}`, true);
      }
    }
  }

  // 添加获取重置日志的新API方法
  async getResetLogs(ctx: Context): Promise<void> {
    logger.info('[API] 收到获取ComfyUI重置日志请求');
    
    // 如果内存中没有日志，尝试从文件读取
    if (this.resetLogs.length === 0) {
      try {
        if (fs.existsSync(RESET_LOG_FILE)) {
          const fileContent = fs.readFileSync(RESET_LOG_FILE, 'utf8');
          if (fileContent.trim()) {
            this.resetLogs = fileContent.split('\n').filter(line => line.trim());
          }
        }
      } catch (error) {
        logger.error(`读取重置日志文件失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    ctx.body = {
      logs: this.resetLogs
    };
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