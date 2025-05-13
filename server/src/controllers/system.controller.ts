import { Context } from 'koa';
import superagent from 'superagent';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config';

// 定义认证相关常量
const AuthorizationTokenCookieKey = "auth_token";
const AuthorizationTokenKey = "X-Authorization";

// 环境变量配置文件路径
const ENV_CONFIG_FILE = path.join(config.dataDir, 'env-config.json');

// 环境变量接口
interface EnvironmentVariables {
  PIP_INDEX_URL?: string;
  HF_ENDPOINT?: string;
  GITHUB_PROXY?: string;
}

// 单个服务检查结果
interface ServiceCheckInfo {
  accessible: boolean;
  name: string;
  lastCheckTime: number;
  url?: string;
}

// 网络检查结果缓存接口
interface NetworkCheckCache {
  github: ServiceCheckInfo;
  pip: ServiceCheckInfo;
  huggingface: ServiceCheckInfo;
}

// 添加网络检查日志接口
interface NetworkCheckLog {
  id: string;
  status: 'in_progress' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
  logs: Array<{
    time: number;
    service?: string;
    message: string;
    type: 'info' | 'error' | 'success';
    lang?: string;  // 添加可选的语言属性
  }>;
  result?: any;
}

// 添加简单的多语言支持模块
interface I18nMessages {
  [key: string]: {
    [key: string]: string
  }
}

// 简单的日志消息翻译
const logMessages: I18nMessages = {
  'network.check.started': {
    'en': 'Network check started',
    'zh': '网络检查已启动'
  },
  'network.check.started.force': {
    'en': 'Network check started (force mode, cache will be ignored)',
    'zh': '开始执行网络检查（强制模式，将忽略缓存）'
  },
  'network.check.background': {
    'en': 'Network check started, running in background',
    'zh': '网络检查已启动，正在后台执行'
  },
  'network.check.background.force': {
    'en': 'Network check started (force mode), running in background',
    'zh': '网络检查已启动（强制模式），正在后台执行'
  },
  'network.proxy.detected': {
    'en': 'Detected GitHub proxy link: {0}',
    'zh': '检测到 GitHub 代理链接: {0}'
  },
  'network.proxy.check.part': {
    'en': 'Will only check proxy server part: {0}',
    'zh': '将只检查代理服务器部分: {0}'
  },
  'network.cache.used': {
    'en': 'Using cached check result, time since last check: {0}s',
    'zh': '使用缓存的检查结果，距上次检查：{0}秒'
  },
  'network.force.recheck': {
    'en': 'Force recheck',
    'zh': '强制重新检查'
  },
  'network.cache.expired': {
    'en': 'Cache expired',
    'zh': '缓存已过期'
  },
  'network.need.recheck': {
    'en': '{0}, need to check again',
    'zh': '{0}，需要重新检查'
  },
  'network.check.services': {
    'en': 'Starting to check {0} services',
    'zh': '开始检查 {0} 个服务'
  },
  'network.check.url': {
    'en': 'Starting to check {0}',
    'zh': '开始检查 {0}'
  },
  'network.accessibility.check': {
    'en': 'Accessibility check: {0}, status code: {1}',
    'zh': '可访问性检查: {0}, 状态码: {1}'
  },
  'network.check.failed': {
    'en': 'Check failed: {0}',
    'zh': '检查失败: {0}'
  },
  'network.all.checked': {
    'en': 'All services checked',
    'zh': '所有服务检查完成'
  },
  'network.all.cached': {
    'en': 'All services use cached results, no need to recheck',
    'zh': '所有服务使用缓存结果，无需重新检查'
  },
  'network.check.completed': {
    'en': 'Network check completed',
    'zh': '网络检查已完成'
  },
  'network.check.api.started': {
    'en': 'Network check started, please use the returned checkId to query results',
    'zh': '网络检查已启动，请使用返回的checkId查询结果'
  }
};

// 多语言字符串格式化辅助函数
function formatMessage(key: string, lang: string, ...args: any[]): string {
  // 默认为英文
  const defaultLang = 'en';
  // 如果没有指定语言，使用默认语言
  const targetLang = lang || defaultLang;
  // 如果找不到对应语言，回退到默认语言
  const message = logMessages[key]?.[targetLang] || logMessages[key]?.[defaultLang] || key;
  
  // 替换占位符 {0}, {1}, ...
  return message.replace(/{(\d+)}/g, (match, index) => {
    return typeof args[index] !== 'undefined' ? args[index] : match;
  });
}

export class SystemController {
  public envConfig: EnvironmentVariables = {};
  private readonly CACHE_VALIDITY_PERIOD = 10 * 60 * 1000; // 10分钟的缓存有效期（毫秒）
  
  // 网络检查缓存，每项单独记录检查时间
  private networkCheckCache: NetworkCheckCache = {
    github: {
      accessible: false,
      name: 'GitHub',
      lastCheckTime: 0
    },
    pip: {
      accessible: false,
      name: 'PIP源',
      lastCheckTime: 0
    },
    huggingface: {
      accessible: false,
      name: 'Hugging Face',
      lastCheckTime: 0
    }
  };
  
  // 检查日志存储，键为检查ID
  private networkCheckLogs: Map<string, NetworkCheckLog> = new Map();
  // 保留最近10次检查的日志
  private readonly MAX_LOG_ENTRIES = 10;

  constructor() {
    // 确保目录存在
    if (!fs.existsSync(config.dataDir)) {
      fs.mkdirSync(config.dataDir, { recursive: true });
    }
    
    // 加载已保存的环境变量
    this.loadEnvironmentVariables();
  }

  /**
   * 加载已保存的环境变量
   */
  private loadEnvironmentVariables(): void {
    try {
      if (fs.existsSync(ENV_CONFIG_FILE)) {
        const configData = fs.readFileSync(ENV_CONFIG_FILE, 'utf8');
        this.envConfig = JSON.parse(configData);
        
        // 应用已保存的环境变量到当前进程
        Object.entries(this.envConfig).forEach(([key, value]) => {
          if (value) {
            process.env[key] = value;
            console.log(`已加载环境变量 ${key}: ${value}`);
          }
        });
      }
    } catch (error) {
      console.error('加载环境变量配置失败:', error);
    }
  }

  /**
   * 保存环境变量到配置文件
   */
  private saveEnvironmentVariables(): void {
    try {
      fs.writeFileSync(ENV_CONFIG_FILE, JSON.stringify(this.envConfig, null, 2), 'utf8');
      console.log('环境变量配置已保存到:', ENV_CONFIG_FILE);
    } catch (error) {
      console.error('保存环境变量配置失败:', error);
    }
  }

  /**
   * 使指定服务的网络检查缓存失效
   * @param service 服务名称，不传则使所有缓存失效
   */
  private invalidateNetworkCheckCache(service?: 'github' | 'pip' | 'huggingface'): void {
    const now = 0; // 将时间戳重置为0表示缓存失效
    
    if (service) {
      // 使指定服务的缓存失效
      this.networkCheckCache[service].lastCheckTime = now;
      console.log(`${this.networkCheckCache[service].name}网络检查缓存已失效`);
    } else {
      // 使所有服务的缓存失效
      Object.keys(this.networkCheckCache).forEach(key => {
        const svcKey = key as keyof NetworkCheckCache;
        this.networkCheckCache[svcKey].lastCheckTime = now;
      });
      console.log('所有网络检查缓存已失效');
    }
  }

  /**
   * 打开目录
   * @param ctx Koa上下文
   */
  public async openPath(ctx: Context): Promise<void> {
    const token = this.getToken(ctx);
    if (!token) {
      ctx.status = 401;
      ctx.body = {
        code: 401,
        message: '未找到访问令牌',
        data: null
      };
      return;
    }

    const osSystemServer = process.env.OS_SYSTEM_SERVER;
    if (!osSystemServer) {
      console.log('需要设置环境变量 OS_SYSTEM_SERVER');
      ctx.status = 500;
      ctx.body = {
        code: 500,
        message: '服务器配置错误',
        data: null
      };
      return;
    }

    const httpPostUrl = `http://${osSystemServer}/legacy/v1alpha1/api.intent/v1/server/intent/send`;
    console.log('HTTP JSON POST URL:', httpPostUrl);

    const path = ctx.query.path as string;
    console.log('path:', path);

    const jsonData = {
      action: 'view',
      category: 'default',
      data: {
        path: path
      }
    };

    try {
      const response = await superagent
        .post(httpPostUrl)
        .set('Content-Type', 'application/json; charset=UTF-8')
        .send(jsonData);

      console.log('响应状态:', response.status);
      console.log('响应头:', response.header);
      console.log('响应体:', response.body);

      ctx.status = 200;
      ctx.body = {
        code: 200,
        message: '成功',
        data: null
      };
    } catch (error) {
      console.error('打开应用程序时出错:', error);
      ctx.status = 500;
      ctx.body = {
        code: 500,
        message: '服务器内部错误',
        data: null
      };
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substring(2, 10);
  }
  
  /**
   * 添加检查日志
   */
  private addNetworkCheckLog(log: NetworkCheckLog): void {
    this.networkCheckLogs.set(log.id, log);
    
    // 如果日志条目超过最大限制，删除最旧的
    if (this.networkCheckLogs.size > this.MAX_LOG_ENTRIES) {
      const oldestKey = Array.from(this.networkCheckLogs.keys())[0];
      this.networkCheckLogs.delete(oldestKey);
    }
  }
  
  /**
   * 添加日志条目，支持多语言
   */
  private logNetworkCheck(
    id: string, 
    message: string, 
    type: 'info' | 'error' | 'success' = 'info', 
    service?: string,
    lang?: string
  ): void {
    const log = this.networkCheckLogs.get(id);
    if (log) {
      // 存储原始消息，不做语言处理，前端将根据当前语言显示
      log.logs.push({
        time: Date.now(),
        message,
        type,
        service,
        lang // 可选记录当前语言
      });
      console.log(`[Network Check ${id}] ${service ? `[${service}] ` : ''}${message}`);
    }
  }

  /**
   * 检查网络状态
   * @param ctx Koa上下文
   */
  public async checkNetworkStatus(ctx: Context): Promise<void> {
    const checkId = this.generateId();
    
    // 获取强制检查参数和语言参数
    const forceCheck = ctx.query.force === 'true' || (ctx.request.body as any)?.force === true;
    const lang = ctx.query.lang as string || (ctx.request.body as any)?.lang || 'en';
    
    // 创建新的检查日志
    const checkLog: NetworkCheckLog = {
      id: checkId,
      status: 'in_progress',
      startTime: Date.now(),
      logs: []
    };
    this.addNetworkCheckLog(checkLog);
    
    // 使用多语言支持记录日志
    this.logNetworkCheck(
      checkId, 
      formatMessage(
        forceCheck ? 'network.check.background.force' : 'network.check.background', 
        lang
      ),
      'info',
      undefined,
      lang
    );
    
    // 立即返回checkId
    ctx.status = 200;
    ctx.body = {
      code: 200,
      message: formatMessage('network.check.api.started', lang),
      data: {
        checkId: checkId,
        status: 'in_progress',
        forceCheck: forceCheck
      }
    };
    
    // 异步执行网络检查，不等待它完成
    this.performNetworkCheck(checkId, forceCheck, lang).catch(error => {
      console.error('执行网络检查时发生错误:', error);
      const log = this.networkCheckLogs.get(checkId);
      if (log) {
        log.status = 'failed';
        log.endTime = Date.now();
        this.logNetworkCheck(
          checkId, 
          `${formatMessage('network.check.failed', lang)}: ${error.message}`, 
          'error',
          undefined,
          lang
        );
      }
    });
  }
  
  /**
   * 执行网络检查（内部方法），支持多语言
   * @param checkId 检查ID
   * @param forceCheck 是否强制检查（忽略缓存）
   * @param lang 语言
   */
  private async performNetworkCheck(
    checkId: string, 
    forceCheck: boolean = false,
    lang: string = 'en'
  ): Promise<void> {
    const now = Date.now();
    
    this.logNetworkCheck(
      checkId, 
      formatMessage(
        forceCheck ? 'network.check.started.force' : 'network.check.started', 
        lang
      ),
      'info',
      undefined,
      lang
    );
    
    // 定义需要检查的网站，优先使用环境变量中配置的代理地址
    const sitesToCheck = [
      { 
        name: 'github' as const, 
        url: this.envConfig.GITHUB_PROXY || 'https://github.com/', 
        type: 'GitHub'
      },
      { 
        name: 'pip' as const, 
        url: this.envConfig.PIP_INDEX_URL || 'https://pypi.org/simple/', 
        type: 'PIP源'
      },
      { 
        name: 'huggingface' as const, 
        url: this.envConfig.HF_ENDPOINT || 'https://huggingface.co/', 
        type: 'Hugging Face'
      }
    ];
    
    // 处理 GitHub 代理的特殊情况
    if (sitesToCheck[0].url && sitesToCheck[0].url.includes('gh-proxy.com')) {
      const proxyUrlMatch = sitesToCheck[0].url.match(/(https?:\/\/gh-proxy\.com)/);
      if (proxyUrlMatch && proxyUrlMatch[1]) {
        this.logNetworkCheck(
          checkId, 
          formatMessage('network.proxy.detected', lang, sitesToCheck[0].url), 
          'info', 
          'github',
          lang
        );
        this.logNetworkCheck(
          checkId, 
          formatMessage('network.proxy.check.part', lang, proxyUrlMatch[1]), 
          'info', 
          'github',
          lang
        );
        sitesToCheck[0].url = proxyUrlMatch[1];
      }
    }
    
    // 筛选出缓存过期的网站进行检查
    const sitesNeedCheck = sitesToCheck.filter(site => {
      const cached = this.networkCheckCache[site.name];
      const isCacheValid = !forceCheck && (now - cached.lastCheckTime < this.CACHE_VALIDITY_PERIOD);
      
      if (isCacheValid) {
        this.logNetworkCheck(
          checkId, 
          formatMessage('network.cache.used', lang, (now - cached.lastCheckTime) / 1000), 
          'info', 
          site.name,
          lang
        );
        // 更新URL（可能配置已变更）
        cached.url = site.url;
      } else {
        const reason = forceCheck ? formatMessage('network.force.recheck', lang) : formatMessage('network.cache.expired', lang);
        this.logNetworkCheck(
          checkId, 
          formatMessage('network.need.recheck', lang, site.name, reason), 
          'info', 
          site.name,
          lang
        );
      }
      
      return !isCacheValid;
    });
    
    // 如果有网站需要检查，则进行检查
    if (sitesNeedCheck.length > 0) {
      this.logNetworkCheck(
        checkId, 
        formatMessage('network.check.services', lang, sitesNeedCheck.length), 
        'info', 
        undefined,
        lang
      );
      
      // 并行检查所有需要检查的网站
      await Promise.all(sitesNeedCheck.map(async (site) => {
        try {
          this.logNetworkCheck(
            checkId, 
            formatMessage('network.check.url', lang, site.url), 
            'info', 
            site.name,
            lang
          );
          const response = await superagent
            .get(site.url)
            .timeout({
              response: 5000,  // 等待响应最多5秒
              deadline: 10000  // 总请求时间最多10秒
            });
          
          // 更新检查结果
          this.networkCheckCache[site.name].accessible = response.status >= 200 && response.status < 300;
          this.networkCheckCache[site.name].lastCheckTime = now;
          this.networkCheckCache[site.name].url = site.url;
          
          const resultMessage = formatMessage('network.accessibility.check', lang, this.networkCheckCache[site.name].accessible, response.status);
          this.logNetworkCheck(
            checkId, 
            resultMessage, 
            this.networkCheckCache[site.name].accessible ? 'success' : 'error',
            site.name,
            lang
          );
        } catch (error) {
          this.networkCheckCache[site.name].accessible = false;
          this.networkCheckCache[site.name].lastCheckTime = now;
          this.networkCheckCache[site.name].url = site.url;
          
          this.logNetworkCheck(
            checkId, 
            formatMessage('network.check.failed', lang, error instanceof Error ? error.message : String(error)), 
            'error', 
            site.name,
            lang
          );
        }
      }));
      
      this.logNetworkCheck(
        checkId, 
        formatMessage('network.all.checked', lang), 
        'success', 
        undefined,
        lang
      );
    } else {
      this.logNetworkCheck(
        checkId, 
        formatMessage('network.all.cached', lang), 
        'info', 
        undefined,
        lang
      );
    }
    
    // 构建响应结果
    const checkResult = {
      github: {
        accessible: this.networkCheckCache.github.accessible,
        name: this.networkCheckCache.github.name,
        url: this.networkCheckCache.github.url
      },
      pip: {
        accessible: this.networkCheckCache.pip.accessible,
        name: this.networkCheckCache.pip.name,
        url: this.networkCheckCache.pip.url
      },
      huggingface: {
        accessible: this.networkCheckCache.huggingface.accessible,
        name: this.networkCheckCache.huggingface.name,
        url: this.networkCheckCache.huggingface.url
      }
    };

    // 更新检查日志的状态和结果
    const log = this.networkCheckLogs.get(checkId);
    if (log) {
      log.status = 'completed';
      log.endTime = Date.now();
      log.result = checkResult;
      this.logNetworkCheck(
        checkId, 
        formatMessage('network.check.completed', lang), 
        'success',
        undefined,
        lang
      );
    }
  }
  
  /**
   * 获取网络检查日志
   * @param ctx Koa上下文
   */
  public async getNetworkCheckLog(ctx: Context): Promise<void> {
    const checkId = ctx.params.id || ctx.query.id as string;
    // 获取语言参数
    const lang = ctx.query.lang as string || 'en';
    
    if (!checkId) {
      ctx.status = 400;
      ctx.body = {
        code: 400,
        message: lang === 'zh' ? '缺少检查ID参数' : 'Missing check ID parameter',
        data: null
      };
      return;
    }
    
    const log = this.networkCheckLogs.get(checkId);
    
    if (!log) {
      ctx.status = 404;
      ctx.body = {
        code: 404,
        message: '未找到指定的检查日志',
        data: null
      };
      return;
    }
    
    // 构建当前的网络检查结果，确保始终返回最新状态
    const currentNetworkStatus = {
      github: {
        accessible: this.networkCheckCache.github.accessible,
        name: this.networkCheckCache.github.name,
        url: this.networkCheckCache.github.url
      },
      pip: {
        accessible: this.networkCheckCache.pip.accessible,
        name: this.networkCheckCache.pip.name,
        url: this.networkCheckCache.pip.url
      },
      huggingface: {
        accessible: this.networkCheckCache.huggingface.accessible,
        name: this.networkCheckCache.huggingface.name,
        url: this.networkCheckCache.huggingface.url
      }
    };
    
    ctx.status = 200;
    ctx.body = {
      code: 200,
      message: '获取网络检查日志成功',
      data: {
        log: log,
        currentNetworkStatus: currentNetworkStatus
      }
    };
  }

  /**
   * 配置PIP源
   * @param ctx Koa上下文
   */
  public async configurePipSource(ctx: Context): Promise<void> {
    try {
      // 从请求体中获取PIP源URL
      const { pipUrl } = ctx.request.body as { pipUrl: string };
      
      if (!pipUrl) {
        ctx.status = 400;
        ctx.body = {
          code: 400,
          message: '缺少必需的参数pipUrl',
          data: null
        };
        return;
      }
      
      // 验证URL格式
      const urlPattern = /^https?:\/\/.+/i;
      if (!urlPattern.test(pipUrl)) {
        ctx.status = 400;
        ctx.body = {
          code: 400,
          message: 'PIP源URL格式无效',
          data: null
        };
        return;
      }
      
      // 设置环境变量
      process.env.PIP_INDEX_URL = pipUrl;
      this.envConfig.PIP_INDEX_URL = pipUrl;
      this.saveEnvironmentVariables();
      
      // 只使PIP源相关的缓存失效
      this.invalidateNetworkCheckCache('pip');
      
      console.log(`已设置PIP_INDEX_URL为: ${pipUrl}`);
      
      ctx.status = 200;
      ctx.body = {
        code: 200,
        message: 'PIP源配置成功',
        data: {
          pipUrl: pipUrl
        }
      };
    } catch (error) {
      console.error('配置PIP源时出错:', error);
      ctx.status = 500;
      ctx.body = {
        code: 500,
        message: '服务器内部错误',
        data: null
      };
    }
  }

  /**
   * 配置Hugging Face端点
   * @param ctx Koa上下文
   */
  public async configureHuggingFaceEndpoint(ctx: Context): Promise<void> {
    try {
      // 从请求体中获取HF端点URL
      const { hfEndpoint } = ctx.request.body as { hfEndpoint: string };
      
      if (!hfEndpoint) {
        ctx.status = 400;
        ctx.body = {
          code: 400,
          message: '缺少必需的参数hfEndpoint',
          data: null
        };
        return;
      }
      
      // 验证URL格式
      const urlPattern = /^https?:\/\/.+/i;
      if (!urlPattern.test(hfEndpoint)) {
        ctx.status = 400;
        ctx.body = {
          code: 400,
          message: 'Hugging Face端点URL格式无效',
          data: null
        };
        return;
      }
      
      // 设置环境变量
      process.env.HF_ENDPOINT = hfEndpoint;
      this.envConfig.HF_ENDPOINT = hfEndpoint;
      this.saveEnvironmentVariables();
      
      // 只使Hugging Face相关的缓存失效
      this.invalidateNetworkCheckCache('huggingface');
      
      console.log(`已设置HF_ENDPOINT为: ${hfEndpoint}`);
      
      ctx.status = 200;
      ctx.body = {
        code: 200,
        message: 'Hugging Face端点配置成功',
        data: {
          hfEndpoint: hfEndpoint
        }
      };
    } catch (error) {
      console.error('配置Hugging Face端点时出错:', error);
      ctx.status = 500;
      ctx.body = {
        code: 500,
        message: '服务器内部错误',
        data: null
      };
    }
  }

  /**
   * 配置GitHub代理站点地址
   * @param ctx Koa上下文
   */
  public async configureGithubProxy(ctx: Context): Promise<void> {
    try {
      // 从请求体中获取GitHub代理URL
      const { githubProxy } = ctx.request.body as { githubProxy: string };
      
      if (!githubProxy) {
        ctx.status = 400;
        ctx.body = {
          code: 400,
          message: '缺少必需的参数githubProxy',
          data: null
        };
        return;
      }
      
      // 验证URL格式
      const urlPattern = /^https?:\/\/.+/i;
      if (!urlPattern.test(githubProxy)) {
        ctx.status = 400;
        ctx.body = {
          code: 400,
          message: 'GitHub代理URL格式无效',
          data: null
        };
        return;
      }
      
      // 设置环境变量
      process.env.GITHUB_PROXY = githubProxy;
      this.envConfig.GITHUB_PROXY = githubProxy;
      this.saveEnvironmentVariables();
      
      // 只使GitHub相关的缓存失效
      this.invalidateNetworkCheckCache('github');
      
      console.log(`已设置GITHUB_PROXY为: ${githubProxy}`);
      
      ctx.status = 200;
      ctx.body = {
        code: 200,
        message: 'GitHub代理配置成功',
        data: {
          githubProxy: githubProxy
        }
      };
    } catch (error) {
      console.error('配置GitHub代理时出错:', error);
      ctx.status = 500;
      ctx.body = {
        code: 500,
        message: '服务器内部错误',
        data: null
      };
    }
  }

  /**
   * 从请求中获取令牌
   * @param ctx Koa上下文
   * @returns 令牌字符串或空字符串
   */
  private getToken(ctx: Context): string {
    // 尝试从 Cookie 中获取令牌
    const cookieToken = ctx.cookies.get(AuthorizationTokenCookieKey);
    if (cookieToken) {
      return cookieToken;
    }

    // 尝试从 X-Authorization 头获取令牌
    const xAuthToken = ctx.headers[AuthorizationTokenKey.toLowerCase()];
    if (xAuthToken) {
      return Array.isArray(xAuthToken) ? xAuthToken[0] : xAuthToken;
    }

    // 尝试从 Authorization 头获取 Bearer 令牌
    const authHeader = ctx.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // 如果都没有找到，返回空字符串
    return '';
  }

  /**
   * 获取当前网络配置
   * @param ctx Koa上下文
   */
  public async getNetworkConfig(ctx: Context): Promise<void> {
    try {
      // 从环境变量或已保存的配置中获取网络配置
      const networkConfig = {
        github: {
          url: this.envConfig.GITHUB_PROXY || process.env.GITHUB_PROXY || 'https://github.com/',
          accessible: this.networkCheckCache.github.accessible
        },
        pip: {
          url: this.envConfig.PIP_INDEX_URL || process.env.PIP_INDEX_URL || 'https://pypi.org/simple/',
          accessible: this.networkCheckCache.pip.accessible
        },
        huggingface: {
          url: this.envConfig.HF_ENDPOINT || process.env.HF_ENDPOINT || 'https://huggingface.co/',
          accessible: this.networkCheckCache.huggingface.accessible
        }
      };

      ctx.status = 200;
      ctx.body = {
        code: 200,
        message: '获取网络配置成功',
        data: networkConfig
      };
    } catch (error) {
      console.error('获取网络配置时出错:', error);
      ctx.status = 500;
      ctx.body = {
        code: 500,
        message: '服务器内部错误',
        data: null
      };
    }
  }
} 