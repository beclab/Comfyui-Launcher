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
import { i18nLogger } from '../utils/logger';

// 将exec转换为Promise
const execPromise = util.promisify(exec);

// 重置日志的保存路径
const RESET_LOG_PATH = path.join(process.cwd(), 'logs');
const RESET_LOG_FILE = path.join(RESET_LOG_PATH, 'comfyui-reset.log');

// 程序版本号常量
const APP_VERSION = '0.1.0';

export class ComfyUIController {
  private comfyProcess: ChildProcess | null = null;
  private startTime: Date | null = null;
  // 追踪实际的ComfyUI进程ID
  private comfyPid: number | null = null;
  // 存储最近的ComfyUI日志
  private recentLogs: string[] = [];
  private maxLogEntries: number = 10000; // 保留最近100条日志
  private resetLogs: string[] = []; // 存储最近一次重置操作的日志
  // 缓存版本信息，避免频繁读取
  private versionCache: {
    comfyui?: string;
    frontend?: string;
    timestamp?: number;
  } = {};
  // 存储日志消息对应的参数
  private logParams: Record<string, Record<string, any>> = {};
  
  // 内部翻译数据
  private translations: {
    [key: string]: { [key: string]: string };
  } = {
    en: {
      'comfyui.logs.request_start': 'Received request to start ComfyUI',
      'comfyui.logs.already_running': 'ComfyUI is already running',
      'comfyui.logs.attempting_start': 'Attempting to start ComfyUI process...',
      'comfyui.logs.executing_command': 'Executing command: bash /runner-scripts/entrypoint.sh',
      'comfyui.logs.captured_pid': 'Captured real ComfyUI PID: {pid}',
      'comfyui.logs.process_exited': 'Startup script process exited, exit code: {code}, signal: {signal}',
      'comfyui.logs.process_error': 'Startup script process error: {message}',
      'comfyui.logs.waiting_startup': 'Waiting for ComfyUI to start, attempt {retry}/{maxRetries}'
    },
    zh: {
      'comfyui.logs.request_start': '收到启动ComfyUI请求',
      'comfyui.logs.already_running': 'ComfyUI已经在运行中',
      'comfyui.logs.attempting_start': '尝试启动ComfyUI进程...',
      'comfyui.logs.executing_command': '执行命令: bash /runner-scripts/entrypoint.sh',
      'comfyui.logs.captured_pid': '捕获到ComfyUI真实PID: {pid}',
      'comfyui.logs.process_exited': '启动脚本进程已退出，退出码: {code}, 信号: {signal}',
      'comfyui.logs.process_error': '启动脚本进程错误: {message}',
      'comfyui.logs.waiting_startup': '等待ComfyUI启动，尝试 {retry}/{maxRetries}'
    }
  };
  
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
    
    // 在初始化时清理重复的禁用插件
    this.cleanupDisabledPlugins();
  }

  // 清理被禁用但仍存在于插件目录中的插件
  private async cleanupDisabledPlugins(): Promise<void> {
    try {
      const comfyuiPath = paths.comfyui;
      if (!comfyuiPath || !fs.existsSync(comfyuiPath)) {
        logger.warn('[Plugin Cleanup] ComfyUI路径不存在，跳过插件清理');
        return;
      }

      // 定义插件目录和禁用目录路径
      const pluginsDir = path.join(comfyuiPath, 'custom_nodes');
      const disabledDir = path.join(pluginsDir, '.disabled');

      // 检查目录是否存在
      if (!fs.existsSync(pluginsDir)) {
        logger.warn('[Plugin Cleanup] 插件目录不存在，跳过插件清理');
        return;
      }

      if (!fs.existsSync(disabledDir)) {
        logger.info('[Plugin Cleanup] 禁用插件目录不存在，无需清理');
        return;
      }

      logger.info('[Plugin Cleanup] 开始检查插件目录状态...');

      // 获取禁用目录中的所有插件
      const disabledPlugins = fs.readdirSync(disabledDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      if (disabledPlugins.length === 0) {
        logger.info('[Plugin Cleanup] 未发现被禁用的插件，无需清理');
        return;
      }

      logger.info(`[Plugin Cleanup] 发现 ${disabledPlugins.length} 个被禁用的插件`);

      // 检查插件目录是否包含任何被禁用的插件
      let cleanupCount = 0;
      for (const plugin of disabledPlugins) {
        const pluginPath = path.join(pluginsDir, plugin);
        
        if (fs.existsSync(pluginPath)) {
          logger.warn(`[Plugin Cleanup] 发现被禁用的插件 "${plugin}" 存在于插件目录中，正在删除...`);
          
          try {
            // 递归删除插件目录
            await this.clearDirectory(pluginPath, true);
            cleanupCount++;
            logger.info(`[Plugin Cleanup] 成功删除被禁用的插件: ${plugin}`);
          } catch (error) {
            logger.error(`[Plugin Cleanup] 删除插件 "${plugin}" 失败: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }

      if (cleanupCount > 0) {
        logger.info(`[Plugin Cleanup] 清理完成，共删除 ${cleanupCount} 个重复的被禁用插件`);
      } else {
        logger.info('[Plugin Cleanup] 未发现需要清理的插件，插件目录状态良好');
      }
    } catch (error) {
      logger.error(`[Plugin Cleanup] 清理插件时发生错误: ${error instanceof Error ? error.message : String(error)}`);
    }
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
    
    // 获取版本信息
    const versions = await this.getVersionInfo();
    
    // 获取GPU模式
    const gpuMode = this.getGPUMode();
    
    ctx.body = {
      running,
      pid: this.comfyPid,
      uptime,
      // 新增返回数据
      versions: {
        comfyui: versions.comfyui || 'unknown',
        frontend: versions.frontend || 'unknown',
        app: APP_VERSION
      },
      gpuMode
    };
  }

  // 获取ComfyUI和前端版本信息
  private async getVersionInfo(): Promise<{ comfyui?: string; frontend?: string }> {
    // 如果缓存存在且未过期（10分钟内），直接返回缓存
    const now = Date.now();
    if (this.versionCache.timestamp && (now - this.versionCache.timestamp < 600000)) {
      return {
        comfyui: this.versionCache.comfyui,
        frontend: this.versionCache.frontend
      };
    }
    
    const result: { comfyui?: string; frontend?: string } = {};
    
    try {
      // 获取ComfyUI版本 - 首先尝试从comfyui_version.py文件获取
      const comfyuiPath = paths.comfyui;
      if (comfyuiPath && fs.existsSync(comfyuiPath)) {
        // 尝试从comfyui_version.py文件获取
        const versionFilePath = path.join(comfyuiPath, 'comfyui_version.py');
        if (fs.existsSync(versionFilePath)) {
          const versionFileContent = fs.readFileSync(versionFilePath, 'utf8');
          // 使用正则表达式从文件内容中提取版本号
          const versionMatch = versionFileContent.match(/__version__\s*=\s*["']([^"']+)["']/);
          if (versionMatch && versionMatch[1]) {
            result.comfyui = versionMatch[1];
            logger.info(`[API] 从comfyui_version.py文件获取到ComfyUI版本: ${result.comfyui}`);
          }
        }
        
        // 如果从comfyui_version.py获取失败，尝试从version文件获取
        if (!result.comfyui) {
          const legacyVersionFilePath = path.join(comfyuiPath, 'version');
          if (fs.existsSync(legacyVersionFilePath)) {
            result.comfyui = fs.readFileSync(legacyVersionFilePath, 'utf8').trim();
            logger.info(`[API] 从version文件获取到ComfyUI版本: ${result.comfyui}`);
          } else {
            // 尝试从git获取
            try {
              const { stdout } = await execPromise('git describe --tags', { cwd: comfyuiPath });
              if (stdout.trim()) {
                result.comfyui = stdout.trim();
                logger.info(`[API] 从git标签获取到ComfyUI版本: ${result.comfyui}`);
              }
            } catch (gitError) {
              // 如果git命令失败，尝试从package.json获取
              const packageJsonPath = path.join(comfyuiPath, 'package.json');
              if (fs.existsSync(packageJsonPath)) {
                try {
                  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                  if (packageJson.version) {
                    result.comfyui = packageJson.version;
                    logger.info(`[API] 从package.json获取到ComfyUI版本: ${result.comfyui}`);
                  }
                } catch (e) {
                  logger.warn(`[API] 无法从package.json解析ComfyUI版本: ${e}`);
                }
              }
            }
          }
        }
      }
      
      // 获取前端版本 - 首先尝试从环境变量CLI_ARGS中获取
      const cliArgs = process.env.CLI_ARGS;
      if (cliArgs) {
        // 尝试从CLI_ARGS中提取前端版本
        // 格式例如: --normalvram --disable-smart-memory --front-end-version Comfy-Org/ComfyUI_frontend@v1.12.6
        const frontendVersionMatch = cliArgs.match(/--front-end-version\s+[^@]+@(v[\d.]+)/);
        if (frontendVersionMatch && frontendVersionMatch[1]) {
          result.frontend = frontendVersionMatch[1];
          logger.info(`[API] 从环境变量CLI_ARGS获取到前端版本: ${result.frontend}`);
        }
      }
      
      // 如果从环境变量获取失败，尝试从web/index.html或web/scripts/app.js中查找
      if (!result.frontend && comfyuiPath && fs.existsSync(comfyuiPath)) {
        const indexHtmlPath = path.join(comfyuiPath, 'web', 'index.html');
        if (fs.existsSync(indexHtmlPath)) {
          const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
          // 尝试从HTML中查找版本信息
          const versionMatch = indexHtml.match(/ComfyUI\s+v([\d.]+)/i) || 
                              indexHtml.match(/version:\s*["']([\d.]+)["']/i);
          if (versionMatch && versionMatch[1]) {
            result.frontend = versionMatch[1];
          } else {
            // 尝试从app.js中查找
            const appJsPath = path.join(comfyuiPath, 'web', 'scripts', 'app.js');
            if (fs.existsSync(appJsPath)) {
              const appJs = fs.readFileSync(appJsPath, 'utf8');
              const jsVersionMatch = appJs.match(/version:\s*["']([\d.]+)["']/i) ||
                                    appJs.match(/APP_VERSION\s*=\s*["']([\d.]+)["']/i);
              if (jsVersionMatch && jsVersionMatch[1]) {
                result.frontend = jsVersionMatch[1];
              }
            }
          }
        }
      }
      
      // 更新缓存
      this.versionCache = {
        ...result,
        timestamp: now
      };
      
    } catch (error) {
      logger.error(`[API] 获取版本信息时出错: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    return result;
  }
  
  // 获取GPU模式
  private getGPUMode(): string {
    // 检查环境变量NVSHARE_MANAGED_MEMORY
    const nvshareMode = process.env.NVSHARE_MANAGED_MEMORY;
    
    if (nvshareMode === '0') {
      return 'independent';
    } else if (nvshareMode === '1'){
      return 'shared';
    } else {
      return 'shared';
    }
  }

  // 添加本地翻译方法，增强并添加调试
  private translateMessage(key: string, lang: string, params?: Record<string, any> | null): string {
    // 获取翻译文本
    const langData = this.translations[lang] || this.translations.en; // 默认回退到英文
    let text = langData[key] || key; // 找不到翻译时返回原始键
    
    console.log(`[翻译] 键: ${key}, 语言: ${lang}, 原文: ${text}`);
    console.log(`[翻译] 参数:`, params);
    
    // 如果有参数，替换参数
    if (params && Object.keys(params).length > 0) {
      // 先将所有参数转为字符串
      const stringParams = Object.entries(params).reduce((acc, [k, v]) => {
        acc[k] = String(v);
        return acc;
      }, {} as Record<string, string>);
      
      // 替换 {param} 格式的占位符
      text = text.replace(/\{(\w+)\}/g, (match, paramKey) => {
        console.log(`[翻译] 替换占位符 ${match}, 参数键: ${paramKey}, 参数值: ${stringParams[paramKey]}`);
        return stringParams[paramKey] !== undefined ? stringParams[paramKey] : match;
      });
      
      console.log(`[翻译] 替换后: ${text}`);
    }
    
    return text;
  }

  // 添加新方法: 获取ComfyUI日志
  async getLogs(ctx: Context): Promise<void> {
    const lang = (ctx.query.lang as string) || this.getClientLocale(ctx) || 'zh';
    const simpleLang = lang.split('-')[0]; // 处理如 'en-US' 格式，转换为 'en'
    
    logger.info(`[API] Received get ComfyUI logs request (language: ${lang})`);
    
    // 本地化日志条目
    const localizedLogs = this.recentLogs.map(logEntry => {
      // 处理包含标准前缀的日志条目
      const matches = logEntry.match(/^\[(.*?)\]\s*(ERROR:\s*)?(.*)$/);
      if (matches) {
        const timestamp = matches[1];
        const isError = !!matches[2];
        let message = matches[3];
        
        console.log(`[日志本地化] 原始消息: ${message}`);
        
        // 检查消息是否是翻译键
        if (message.match(/^comfyui\.logs\.[a-z_]+$/)) {
          const key = message; // 保存原始键名
          console.log(`[日志本地化] 找到翻译键: ${key}`);
          
          // 查找存储的参数
          const params = this.logParams[key];
          console.log(`[日志本地化] 从 logParams 获取的参数:`, params);
          
          if (params) {
            message = this.translateMessage(key, simpleLang, params);
          } else {
            // 尝试直接翻译，如果有未替换的占位符再尝试提取参数
            message = this.translateMessage(key, simpleLang, undefined);
            
            // 如果翻译后还有未替换的占位符，尝试从原始日志条目中提取参数
            if (message.match(/\{(\w+)\}/)) {
              console.log(`[日志本地化] 翻译后仍有占位符，尝试从完整日志条目中提取参数`);
              const extractedParams = this.findLogParams(logEntry);
              if (extractedParams) {
                console.log(`[日志本地化] 成功提取参数:`, extractedParams);
                message = this.translateMessage(key, simpleLang, extractedParams);
              } else {
                console.log(`[日志本地化] 无法提取参数，保留占位符`);
              }
            }
          }
        }
        
        // 重新构建日志条目
        return `[${timestamp}] ${isError ? 'ERROR: ' : ''}${message}`;
      }
      return logEntry;
    });
    
    ctx.body = {
      logs: localizedLogs
    };
  }

  // 修改 findLogParams 方法以支持多语言格式
  private findLogParams(logEntry: string): Record<string, any> | null {
    console.log(`[findLogParams] 尝试从日志中提取参数: ${logEntry}`);
    
    // 首先尝试从日志条目中提取实际消息部分（去除时间戳和错误标记）
    const messageMatch = logEntry.match(/^\[(.*?)\]\s*(ERROR:\s*)?(.*)$/);
    const actualMessage = messageMatch ? messageMatch[3] : logEntry;
    
    console.log(`[findLogParams] 提取的实际消息: ${actualMessage}`);
    
    // 然后使用与之前相同的逻辑提取参数
    // process_exited - 匹配中英文两种格式
    const exitMatchZh = actualMessage.match(/退出码:\s*(\S+),\s*信号:\s*(\S+)/);
    const exitMatchEn = actualMessage.match(/exit code:\s*(\S+),\s*signal:\s*(\S+)/i);
    if (exitMatchZh || exitMatchEn) {
      const match = exitMatchZh || exitMatchEn;
      return { 
        code: match![1], 
        signal: match![2] 
      };
    }
    
    // waiting_startup - 匹配中英文两种格式
    const waitingMatchZh = actualMessage.match(/尝试\s+(\d+)\/(\d+)/);
    const waitingMatchEn = actualMessage.match(/attempt\s+(\d+)\/(\d+)/i);
    if (waitingMatchZh || waitingMatchEn) {
      const match = waitingMatchZh || waitingMatchEn;
      return { 
        retry: match![1], 
        maxRetries: match![2] 
      };
    }
    
    // captured_pid - 匹配中英文两种格式
    const pidMatchZh = actualMessage.match(/PID:\s*(\d+)/i);
    const pidMatchEn = actualMessage.match(/PID:\s*(\d+)/i); // 相同格式
    if (pidMatchZh || pidMatchEn) {
      const match = pidMatchZh || pidMatchEn;
      return { pid: match![1] };
    }
    
    // process_error - 匹配中英文两种格式
    const errorMatchZh = actualMessage.match(/进程错误:\s*(.*?)$/);
    const errorMatchEn = actualMessage.match(/process error:\s*(.*?)$/i);
    if (errorMatchZh || errorMatchEn) {
      const match = errorMatchZh || errorMatchEn;
      return { message: match![1] };
    }
    
    console.log(`[findLogParams] 无法从日志中提取参数: ${actualMessage}`);
    return null;
  }

  // 修改记录日志的辅助方法
  private addLog(message: string, isError: boolean = false, translationKey?: string, params?: Record<string, any>): void {
    const timestamp = new Date().toISOString();
    
    // 如果提供了翻译键和参数，构建一个特殊格式，便于后续解析
    let logMessage = message;
    if (translationKey) {
      logMessage = translationKey;
      // 如果有参数，存储到 logParams
      if (params && Object.keys(params).length > 0) {
        console.log(`[addLog] 存储参数, 键: ${translationKey}, 参数:`, params);
        
        // 将参数存储为内部属性
        this.logParams = this.logParams || {};
        this.logParams[translationKey] = params;
      }
    }
    
    const logEntry = `[${timestamp}] ${isError ? 'ERROR: ' : ''}${logMessage}`;
    
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
  private addResetLog(message: string, isError: boolean = false, lang?: string): void {
    const timestamp = new Date().toISOString();
    let logMessage = message;
    
    // 如果消息看起来像是翻译键（包含点号但没有空格），尝试翻译它
    if (message.includes('.') && !message.includes(' ')) {
      // 使用提供的语言或默认语言
      const useLang = lang || i18nLogger.getLocale();
      logMessage = i18nLogger.translate(message, { lng: useLang });
    }
    
    // 创建日志条目
    const logEntry = `[${timestamp}] ${isError ? 'ERROR: ' : ''}${logMessage}`;
    this.resetLogs.push(logEntry);
    
    // 同时记录到系统日志
    if (isError) {
      logger.error(logMessage);
    } else {
      logger.info(logMessage);
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
    this.addLog('收到启动ComfyUI请求', false, 'comfyui.logs.request_start');
    
    // 首先检查是否已经在运行
    const running = await isComfyUIRunning();
    if (running) {
      this.addLog('ComfyUI已经在运行中', false, 'comfyui.logs.already_running');
      ctx.body = {
        success: false,
        message: 'ComfyUI已经在运行中',
        pid: this.comfyPid
      };
      return;
    }
    
    try {
      // 启动ComfyUI进程
      this.addLog('尝试启动ComfyUI进程...', false, 'comfyui.logs.attempting_start');
      this.addLog(`执行命令: bash ${path.resolve('/runner-scripts/entrypoint.sh')}`, false, 'comfyui.logs.executing_command');
      
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
            this.addLog(`捕获到ComfyUI真实PID: ${this.comfyPid}`, false, 'comfyui.logs.captured_pid', { 
              pid: this.comfyPid 
            });
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
        this.addLog(`启动脚本进程已退出，退出码: ${code}, 信号: ${signal}`, false, 'comfyui.logs.process_exited', {
          code: code,
          signal: signal
        });
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
        this.addLog(`启动脚本进程错误: ${err.message}`, true, 'comfyui.logs.process_error', {
          message: err.message
        });
        this.comfyProcess = null;
      });
      
      // 等待一段时间确保进程启动成功
      let retries = 0;
      const maxRetries = 120;
      let comfyStarted = false;
      
      while (retries < maxRetries && !comfyStarted) {
        await new Promise(resolve => setTimeout(resolve, 5000));
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
        this.addLog(`等待ComfyUI启动，尝试 ${retries}/${maxRetries}`, false, 'comfyui.logs.waiting_startup', { 
          retry: retries, 
          maxRetries: maxRetries 
        });
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
    // 从请求体中获取语言参数
    const requestBody = ctx.request.body as { lang?: string; mode?: string };
    const lang = requestBody?.lang || this.getClientLocale(ctx) || i18nLogger.getLocale();
    // 获取重置模式：normal(普通) 或 hard(强力)
    const resetMode = requestBody?.mode === 'hard' ? 'hard' : 'normal';
    
    logger.info(`[API] Received reset ComfyUI request (language: ${lang}, mode: ${resetMode})`);
    
    // 清空重置日志
    this.resetLogs = [];
    
    // 同时清空日志文件
    try {
      if (!fs.existsSync(RESET_LOG_PATH)) {
        fs.mkdirSync(RESET_LOG_PATH, { recursive: true });
      }
      fs.writeFileSync(RESET_LOG_FILE, ''); // 清空文件内容
    } catch (error) {
      logger.error(`Failed to clear reset log file: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // 使用i18n添加日志
    const startMessage = i18nLogger.translate('comfyui.reset.started', { lng: lang });
    this.addResetLog('comfyui.reset.started', false, lang);
    this.addLog(startMessage);
    
    // 记录重置模式
    const modeMessage = resetMode === 'hard' 
      ? i18nLogger.translate('comfyui.reset.mode_hard', { lng: lang }) || '使用强力重置模式'
      : i18nLogger.translate('comfyui.reset.mode_normal', { lng: lang }) || '使用普通重置模式';
    this.addResetLog(modeMessage);
    
    try {
      // 首先检查ComfyUI是否在运行，如果是则停止它
      const running = await isComfyUIRunning();
      if (running) {
        const stoppingMessage = i18nLogger.translate('comfyui.reset.stopping', { lng: lang });
        this.addResetLog(stoppingMessage);
        this.addLog(stoppingMessage);
        await this.killComfyUIGeneric();
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const stillRunning = await isComfyUIRunning();
        if (stillRunning) {
          const stopFailedMessage = i18nLogger.translate('comfyui.reset.stop_failed', { lng: lang });
          this.addResetLog(stopFailedMessage, true);
          ctx.status = 500;
          ctx.body = { success: false, message: stopFailedMessage };
          return;
        }
        
        this.comfyPid = null;
        this.startTime = null;
      }
      
      // 开始重置操作
      this.addResetLog(i18nLogger.translate('comfyui.reset.started', { lng: lang }));
      
      // 1. 清空cache路径
      if (cachePath && fs.existsSync(cachePath)) {
        const cleaningCacheMessage = i18nLogger.translate('comfyui.reset.cleaning_cache', { path: cachePath, lng: lang });
        this.addResetLog(cleaningCacheMessage);
        await this.clearDirectory(cachePath);
      } else {
        const cacheNotExistMessage = i18nLogger.translate('comfyui.reset.cache_not_exist', { path: cachePath, lng: lang });
        this.addResetLog(cacheNotExistMessage, true);
      }
      
      // 2. 清空COMFYUI_PATH下的内容，根据重置模式保留不同的目录
      const comfyuiPath = paths.comfyui;
      if (comfyuiPath && fs.existsSync(comfyuiPath)) {
        const cleaningPathMessage = i18nLogger.translate('comfyui.reset.cleaning_path', { path: comfyuiPath, lng: lang });
        this.addResetLog(cleaningPathMessage);
        
        // 确定要保留的目录列表
        const preservedDirs = ['models', 'output', 'input']; // 默认保留的目录
        
        // 根据重置模式添加额外保留的目录
        if (resetMode === 'normal') {
          preservedDirs.push('user', 'custom_nodes');
          this.addResetLog(i18nLogger.translate('comfyui.reset.preserving_normal_dirs', { lng: lang }) || '普通模式：保留 user、models、custom_nodes 目录');
        } else {
          this.addResetLog(i18nLogger.translate('comfyui.reset.preserving_hard_dirs', { lng: lang }) || '强力模式：仅保留 models 目录');
        }
        
        // 检查数据目录是否在comfyuiPath内
        const dataDir = config.dataDir;
        const dataDirRelative = dataDir && path.relative(comfyuiPath, dataDir);
        const isDataDirInComfyUI = dataDirRelative && !dataDirRelative.startsWith('..') && !path.isAbsolute(dataDirRelative);
        
        if (isDataDirInComfyUI) {
          this.addResetLog(`数据目录(${dataDir})位于ComfyUI目录内，将保留此目录`);
          preservedDirs.push(path.basename(dataDir));
        }
        
        const entries = fs.readdirSync(comfyuiPath, { withFileTypes: true });
        
        for (const entry of entries) {
          // 检查是否为需要保留的目录
          if (preservedDirs.includes(entry.name)) {
            const keepingDirMessage = i18nLogger.translate('comfyui.reset.keeping_dir', { name: entry.name, lng: lang });
            this.addResetLog(keepingDirMessage);
            continue;
          }
          
          const fullPath = path.join(comfyuiPath, entry.name);
          if (entry.isDirectory()) {
            const deletingDirMessage = i18nLogger.translate('comfyui.reset.deleting_dir', { name: entry.name, lng: lang });
            this.addResetLog(deletingDirMessage);
            await this.clearDirectory(fullPath, true); // 删除整个目录
          } else {
            const deletingFileMessage = i18nLogger.translate('comfyui.reset.deleting_file', { name: entry.name, lng: lang });
            this.addResetLog(deletingFileMessage);
            fs.unlinkSync(fullPath);
          }
        }
      } else {
        const pathNotExistMessage = i18nLogger.translate('comfyui.reset.path_not_exist', { path: comfyuiPath, lng: lang });
        this.addResetLog(pathNotExistMessage, true);
      }
      
      // 3. 尝试执行恢复脚本，仅在失败时才重启Pod
      try {
        const recoveryStartedMessage = i18nLogger.translate('comfyui.reset.recovery_started', { lng: lang });
        this.addResetLog(recoveryStartedMessage);
        
        // 首先尝试执行恢复脚本
        try {
          await execPromise('chmod +x /runner-scripts/up-version-cp.sh');
          this.addResetLog('已赋予脚本执行权限');
          
          const { stdout: upVersionOutput } = await execPromise('sh /runner-scripts/up-version-cp.sh');
          this.addResetLog(`执行up-version-cp.sh脚本结果: ${upVersionOutput.trim() || '完成'}`);
          
          const { stdout: rsyncOutput } = await execPromise('rsync -av --update /runner-scripts/ /root/runner-scripts/');
          this.addResetLog(`同步runner-scripts目录结果: ${rsyncOutput.trim().split('\n')[0]}...`);
          
          const recoveryCompletedMessage = i18nLogger.translate('comfyui.reset.recovery_completed', { lng: lang });
          this.addResetLog(recoveryCompletedMessage);
          
        } catch (scriptError) {
          // 恢复脚本执行失败，尝试重启Pod
          const errorMsg = scriptError instanceof Error ? scriptError.message : String(scriptError);
          const recoveryFailedMessage = i18nLogger.translate('comfyui.reset.recovery_failed', { message: errorMsg, lng: lang });
          this.addResetLog(recoveryFailedMessage, true);
        }
      } catch (cmdError) {
        const errorMsg = cmdError instanceof Error ? cmdError.message : String(cmdError);
        this.addResetLog(`执行恢复/重启操作时出错: ${errorMsg}`, true);
        // 继续执行，不中断整个重置过程
      }
      
      const resetCompletedMessage = i18nLogger.translate('comfyui.reset.reset_completed', { lng: lang });
      this.addResetLog(resetCompletedMessage);
      
      // 返回成功响应
      const successMessage = i18nLogger.translate('comfyui.reset.completed', { lng: lang });
      ctx.body = {
        success: true,
        message: successMessage
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const failedMessage = i18nLogger.translate('comfyui.reset.failed', { message: errorMessage, lng: lang });
      this.addResetLog(`重置ComfyUI时发生错误: ${errorMessage}`, true);
      logger.error(`[API] 重置ComfyUI时发生错误: ${errorMessage}`);
      
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: failedMessage,
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

  // 添加获取重置日志的新API方法 - 添加i18n支持
  async getResetLogs(ctx: Context): Promise<void> {
    // 从查询参数中获取语言
    const lang = ctx.query.lang as string || this.getClientLocale(ctx) || i18nLogger.getLocale();
    logger.info(`[API] Received get ComfyUI reset logs request (language: ${lang})`);
    
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
        logger.error(`Failed to read reset log file: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // 翻译日志内容
    const translatedLogs = this.resetLogs.map(log => {
      try {
        // 尝试提取时间戳和消息部分
        const matches = log.match(/^\[(.*?)\]\s*(ERROR:\s*)?(.*)$/);
        if (matches) {
          const timestamp = matches[1];
          const isError = !!matches[2];
          let message = matches[3];
          
          // 检查消息是否是翻译键（通常包含点号分隔）
          if (message.includes('.') && !message.includes(' ')) {
            // 直接使用i18nLogger.translate进行翻译
            const translatedMessage = i18nLogger.translate(message, { lng: lang });
            
            // 如果翻译结果与原始键相同（可能没有找到翻译），使用基本翻译表
            if (translatedMessage === message) {
              // 为各种语言提供基本翻译
              const basicTranslations: { [key: string]: { [key: string]: string } } = {
                'en': {
                  'comfyui.reset.started': 'ComfyUI reset process started',
                  'comfyui.reset.stopping': 'Stopping running ComfyUI process',
                  'comfyui.reset.completed': 'ComfyUI has been reset successfully',
                  'comfyui.reset.stop_failed': 'Failed to stop ComfyUI process',
                  'comfyui.reset.cleaning_cache': 'Cleaning cache directory',
                  'comfyui.reset.cache_not_exist': 'Cache directory does not exist',
                  'comfyui.reset.cleaning_path': 'Cleaning ComfyUI directory',
                  'comfyui.reset.keeping_dir': 'Keeping directory',
                  'comfyui.reset.deleting_dir': 'Deleting directory',
                  'comfyui.reset.deleting_file': 'Deleting file',
                  'comfyui.reset.path_not_exist': 'ComfyUI path does not exist',
                  'comfyui.reset.recovery_started': 'Starting recovery process',
                  'comfyui.reset.recovery_completed': 'Recovery process completed successfully',
                  'comfyui.reset.recovery_failed': 'Recovery process failed',
                  'comfyui.reset.reset_completed': 'ComfyUI reset completed successfully',
                  'comfyui.reset.failed': 'Failed to reset ComfyUI',
                  'comfyui.reset.no_logs': 'No reset logs found',
                  'comfyui.reset.logs_retrieved': 'Retrieved reset log entries',
                  'comfyui.reset.mode_normal': 'Using normal reset mode: preserving user, models, and custom_nodes directories',
                  'comfyui.reset.mode_hard': 'Using hard reset mode: preserving only models directory',
                  'comfyui.reset.preserving_normal_dirs': 'Normal mode: preserving user, models, and custom_nodes directories',
                  'comfyui.reset.preserving_hard_dirs': 'Hard mode: preserving only models directory'
                },
                'zh': {
                  'comfyui.reset.started': 'ComfyUI重置过程已启动',
                  'comfyui.reset.stopping': '正在停止运行中的ComfyUI进程',
                  'comfyui.reset.completed': 'ComfyUI已成功重置',
                  'comfyui.reset.stop_failed': '无法停止ComfyUI进程',
                  'comfyui.reset.cleaning_cache': '正在清理缓存目录',
                  'comfyui.reset.cache_not_exist': '缓存目录不存在',
                  'comfyui.reset.cleaning_path': '正在清理ComfyUI目录',
                  'comfyui.reset.keeping_dir': '保留目录',
                  'comfyui.reset.deleting_dir': '删除目录',
                  'comfyui.reset.deleting_file': '删除文件',
                  'comfyui.reset.path_not_exist': 'ComfyUI路径不存在',
                  'comfyui.reset.recovery_started': '开始恢复进程',
                  'comfyui.reset.recovery_completed': '恢复进程成功完成',
                  'comfyui.reset.recovery_failed': '恢复进程失败',
                  'comfyui.reset.reset_completed': 'ComfyUI重置成功完成',
                  'comfyui.reset.failed': '重置ComfyUI失败',
                  'comfyui.reset.no_logs': '未找到重置日志',
                  'comfyui.reset.logs_retrieved': '已检索重置日志条目',
                  'comfyui.reset.mode_normal': '使用普通重置模式：保留user、models和custom_nodes目录',
                  'comfyui.reset.mode_hard': '使用强力重置模式：仅保留models目录',
                  'comfyui.reset.preserving_normal_dirs': '普通模式：保留user、models和custom_nodes目录',
                  'comfyui.reset.preserving_hard_dirs': '强力模式：仅保留models目录'
                }
              };
              
              // 获取当前语言的翻译，如果不存在则使用英文
              const langTranslations = basicTranslations[lang] || basicTranslations['en'];
              message = langTranslations[message] || message;
            } else {
              message = translatedMessage;
            }
          }
          
          // 重新构建完整日志条目
          return `[${timestamp}] ${isError ? 'ERROR: ' : ''}${message}`;
        }
        // 如果不匹配格式，保持原样
        return log;
      } catch (e) {
        // 如果处理过程中发生任何错误，返回原始日志
        return log;
      }
    });
    
    // 返回本地化消息
    let message = '';
    if (translatedLogs.length === 0) {
      message = i18nLogger.translate('comfyui.reset.no_logs', { lng: lang });
      // 如果仍然是翻译键，使用硬编码的消息
      if (message === 'comfyui.reset.no_logs') {
        message = lang === 'zh' ? '未找到重置日志' : 'No reset logs found';
      }
    } else {
      message = i18nLogger.translate('comfyui.reset.logs_retrieved', { count: translatedLogs.length, lng: lang });
      // 如果仍然是翻译键，使用硬编码的消息
      if (message === 'comfyui.reset.logs_retrieved') {
        message = lang === 'zh' ? `已检索到 ${translatedLogs.length} 条重置日志` : `Retrieved ${translatedLogs.length} reset log entries`;
      }
    }
    
    ctx.body = {
      logs: translatedLogs,
      success: true,
      message: message
    };
  }

  // 辅助方法：获取客户端语言
  private getClientLocale(ctx: Context): string | undefined {
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

// Create HTML page for when ComfyUI is not running
const getNotRunningHtml = () => {
  // 获取环境变量，用于前端判断
  const adminComfyDomain = process.env.DOMAIN_COMFYUI_FOR_ADMIN || '';
  const adminLauncherDomain = process.env.DOMAIN_LAUNCHER_FOR_ADMIN || '';

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <title>ComfyUI 不可用 | ComfyUI Unavailable</title>
    <meta charset="utf-8">
    <style>
      body {
        font-family: Arial, sans-serif;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        margin: 0;
        background-color: white;
      }
      .container {
        text-align: center;
        padding: 2rem;
        max-width: 500px;
      }
      h1 {
        color: #333;
        font-size: 24px;
        margin-bottom: 10px;
      }
      p {
        margin: 8px 0 20px;
        color: #666;
        font-size: 14px;
      }
      .retry-btn {
        background-color: #4a76fd;
        color: white;
        border: none;
        padding: 8px 30px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
        font-weight: 500;
      }
      .retry-btn:hover {
        background-color: #3a66ed;
      }
      .launcher-btn {
        background-color: #28a745;
        color: white;
        border: none;
        padding: 8px 30px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
        font-weight: 500;
        margin-left: 10px;
      }
      .launcher-btn:hover {
        background-color: #218838;
      }
      .en, .zh {
        display: none;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="zh">
        <h1>ComfyUI 无法使用</h1>
        <p>ComfyUl 服务目前未启动或无法访问。请联系您的 Olares 管理员。</p>
        <div id="button-container-zh">
          <!-- 重试按钮将在脚本中动态添加 -->
        </div>
      </div>
      
      <div class="en">
        <h1>ComfyUI Unavailable</h1>
        <p>The ComfyUI service is currently not running or inaccessible. Please contact your Olares administrator.</p>
        <div id="button-container-en">
          <!-- 重试按钮将在脚本中动态添加 -->
        </div>
      </div>
    </div>
    
    <script>
      // 从服务器端获取环境变量值
      const ADMIN_COMFY_DOMAIN = "${adminComfyDomain}";
      const ADMIN_LAUNCHER_DOMAIN = "${adminLauncherDomain}";

      // 检测浏览器语言并显示相应内容
      (function() {
        // 获取浏览器语言
        const userLang = navigator.language || navigator.userLanguage || '';
        // 默认显示英文，如果是中文环境则显示中文
        const lang = userLang.toLowerCase().startsWith('zh') ? 'zh' : 'en';
        
        // 显示对应语言内容
        document.querySelectorAll('.' + lang).forEach(el => {
          el.style.display = 'block';
        });

        // 检查当前域名是否为管理员域名
        const currentHostname = window.location.hostname;
        console.log("Current hostname:", currentHostname);
        console.log("Admin ComfyUI domain:", ADMIN_COMFY_DOMAIN);
        
        const containerZh = document.getElementById('button-container-zh');
        const containerEn = document.getElementById('button-container-en');
        
        // 判断是否显示启动器按钮
        const showLauncherButton = ADMIN_COMFY_DOMAIN && currentHostname === ADMIN_COMFY_DOMAIN && ADMIN_LAUNCHER_DOMAIN;
        
        if (showLauncherButton) {
          // 显示启动器按钮，不显示重试按钮
          
          // 为中文界面添加启动器按钮
          if (containerZh) {
            const launcherBtn = document.createElement('button');
            launcherBtn.className = 'launcher-btn';
            launcherBtn.textContent = 'ComfyUI 启动器';
            launcherBtn.onclick = function() {
              window.location.href = ADMIN_LAUNCHER_DOMAIN.startsWith('http') 
                ? ADMIN_LAUNCHER_DOMAIN 
                : 'https://' + ADMIN_LAUNCHER_DOMAIN;
            };
            containerZh.appendChild(launcherBtn);
          }
          
          // 为英文界面添加启动器按钮
          if (containerEn) {
            const launcherBtn = document.createElement('button');
            launcherBtn.className = 'launcher-btn';
            launcherBtn.textContent = 'ComfyUI Launcher';
            launcherBtn.onclick = function() {
              window.location.href = ADMIN_LAUNCHER_DOMAIN.startsWith('http') 
                ? ADMIN_LAUNCHER_DOMAIN 
                : 'https://' + ADMIN_LAUNCHER_DOMAIN;
            };
            containerEn.appendChild(launcherBtn);
          }
        } else {
          // 不显示启动器按钮，显示重试按钮
          
          // 为中文界面添加重试按钮
          if (containerZh) {
            const retryBtn = document.createElement('button');
            retryBtn.className = 'retry-btn';
            retryBtn.textContent = '重试';
            retryBtn.onclick = function() {
              window.location.reload();
            };
            containerZh.appendChild(retryBtn);
          }
          
          // 为英文界面添加重试按钮
          if (containerEn) {
            const retryBtn = document.createElement('button');
            retryBtn.className = 'retry-btn';
            retryBtn.textContent = 'Retry';
            retryBtn.onclick = function() {
              window.location.reload();
            };
            containerEn.appendChild(retryBtn);
          }
        }
      })();
    </script>
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