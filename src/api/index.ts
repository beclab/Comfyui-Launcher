import superagent from 'superagent';

// 定义数据对象类型，替代 any
interface ApiData {
  [key: string]: unknown;
}

// 从配置中获取API地址
const getApiBaseUrl = () => {
  // 打印环境变量便于调试
  console.log('当前环境:', import.meta.env.DEV ? '开发环境' : '生产环境');
  
  // 使用动态配置或回退到默认值
  if (window.APP_CONFIG && window.APP_CONFIG.apiBaseUrl) {
    return `${window.APP_CONFIG.apiBaseUrl}/api`;
  }
  
  // 根据环境选择回退地址
  // 开发环境使用localhost
  if (import.meta.env.DEV) {
    return 'http://localhost:8000/api';
    // return 'http://localhost:3000/api';
  }
  
  // 生产环境使用当前网站地址
  return `${window.location.origin}/api`;
};

const API_BASE_URL = getApiBaseUrl();

// 添加请求拦截器
superagent.Request.prototype.use = function(fn) {
  fn(this);
  return this;
};

// 增强调试功能
const debug = (req: superagent.Request) => {
  const method = req.method || 'GET';
  const url = req.url || '';
  console.log(`[API] 发送请求: ${method} ${url}`);
  
  // 记录响应
  const originalEnd = req.end;
  req.end = function(fn) {
    return originalEnd.call(this, (err, res) => {
      if (err) {
        console.error(`[API] 请求失败: ${method} ${url}`, err);
      } else {
        console.log(`[API] 请求成功: ${method} ${url}`, 
          res.status, res.body && typeof res.body === 'object' ? '(对象)' : res.body);
      }
      fn && fn(err, res);
    });
  };
  
  return req;
};

// 封装SuperAgent响应为类似Axios的格式
const adaptResponse = async (request: superagent.Request) => {
  const response = await request;
  return {
    data: response.body,
    status: response.status,
    headers: response.headers
  };
};

// 模型类型定义
export interface Model {
  name: string;
  type: string;
  description?: string;
  installed?: boolean;
  // 其他模型属性...
}

// 模型数据获取模式
export type ModelFetchMode = 'cache' | 'local' | 'remote';

// 模型相关 API
export const modelsApi = {
  // 获取模型列表
  async getModels(mode: ModelFetchMode | { value: ModelFetchMode } = 'cache'): Promise<Model[]> {
    try {
      // 处理可能是对象的 mode 参数
      const modeValue = typeof mode === 'object' && mode !== null
        ? mode.value
        : mode;
      
      // 使用与 api 对象相同的 URL 构建方式
      const response = await superagent.get(`${API_BASE_URL}/models?mode=${modeValue}`).use(debug);
      return response.body;
    } catch (error) {
      console.error('获取模型失败:', error);
      return [];
    }
  },

  // 安装模型
  async installModel(modelName: string): Promise<boolean> {
    try {
      const encodedModelName = encodeURIComponent(modelName);
      const response = await api.post(`models/install/${encodedModelName}`);
      return response.data?.success === true;
    } catch (error) {
      console.error(`安装模型 ${modelName} 失败:`, error);
      throw error;
    }
  },

  // 取消下载
  async cancelDownload(modelName: string): Promise<boolean> {
    try {
      await superagent.post(`${API_BASE_URL}/models/cancel-download`).send({ modelName }).use(debug);
      return true;
    } catch (error) {
      console.error(`取消下载 ${modelName} 失败:`, error);
      throw error;
    }
  }
};

// 更新ApiResponse接口定义，使用unknown代替any
export interface ApiResponse<T = unknown> {
  data?: T;
  body?: T | ReadableStream<Uint8Array>;  // body可能是ReadableStream
  status?: number;
  headers?: { [key: string]: string };
}

// 使用正确的类型判断方式
export const isApiResponse = (response: unknown): response is ApiResponse => {
  if (!response || typeof response !== 'object') return false;
  return ('data' in response || 'body' in response || 'status' in response);
};

// 解决未使用的get函数 - 两种方案:
// 方案1: 如果需要使用，确保导出它
export const get = async <T>(url: string): Promise<ApiResponse<T> | Response> => {
  try {
    // 直接实现和使用现有的api.get方法相同的逻辑
    const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
    const response = await superagent.get(`${API_BASE_URL}/${cleanUrl}`).use(debug);
    return {
      data: response.body as T,
      status: response.status,
      headers: response.headers
    };
  } catch (error) {
    // 如果出错，返回一个fetch API标准的Response对象
    return new Response(JSON.stringify({error: String(error)}), {
      status: 500,
      headers: {'Content-Type': 'application/json'}
    });
  }
};

// 统一API接口
const api = {
  // 通用HTTP方法
  get: (url: string) => {
    // 确保URL格式正确（不要包含前导斜杠），因为已经在 API_BASE_URL 中添加了
    const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
    console.log(`发送GET请求到: ${API_BASE_URL}/${cleanUrl}`);
    return adaptResponse(superagent.get(`${API_BASE_URL}/${cleanUrl}`).use(debug));
  },
  
  post: (url: string, data?: ApiData) => {
    const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
    console.log(`发送POST请求到: ${API_BASE_URL}/${cleanUrl}`);
    const req = superagent.post(`${API_BASE_URL}/${cleanUrl}`).use(debug);
    if (data) {
      req.send(data);
    }
    return adaptResponse(req);
  },
  
  // 原有API方法
  getStatus: () => 
    superagent.get(`${API_BASE_URL}/status`).use(debug),
  
  startComfyUI: () => 
    superagent.post(`${API_BASE_URL}/start`),
  
  stopComfyUI: () => 
    superagent.post(`${API_BASE_URL}/stop`),
  
  // 模型管理
  getModels: () => 
    superagent.get(`${API_BASE_URL}/models`),
  
  downloadModel: (modelId: string) => 
    superagent.post(`${API_BASE_URL}/models/download`).send({ modelId }),
  
  downloadAllModels: () => 
    superagent.post(`${API_BASE_URL}/models/download-all`),
  
  getModelProgress: (id: string) => 
    superagent.get(`${API_BASE_URL}/models/progress/${id}`),
  
  // 插件管理
  getPlugins: () => 
    superagent.get(`${API_BASE_URL}/plugins`),
  
  installPlugin: (pluginId: string, githubProxy?: string) => 
    superagent.post(`${API_BASE_URL}/plugins/install`).send({ pluginId, githubProxy }),
  
  uninstallPlugin: (pluginId: string) => 
    superagent.post(`${API_BASE_URL}/plugins/uninstall`).send({ pluginId }),
  
  getPluginProgress: (taskId: string) => 
    superagent.get(`${API_BASE_URL}/plugins/progress/${taskId}`),
  
  // 还原初始状态
  resetSystem: () => 
    superagent.post(`${API_BASE_URL}/reset`),
  
  getResetProgress: (taskId: string) => 
    superagent.get(`${API_BASE_URL}/reset/progress/${taskId}`),
  
  restartApp: () => 
    superagent.post(`${API_BASE_URL}/restart`),

  // 更新API调用，统一使用 /api 前缀
  getAllModels: () => 
    superagent.get(`${API_BASE_URL}/models`),
  
  downloadEssentialModels: (source: string) => 
    superagent.post(`${API_BASE_URL}/models/download-essential`).send({ source }).use(debug),
  
  cancelDownload: (taskId: string) => 
    superagent.post(`${API_BASE_URL}/models/cancel-download`).send({ taskId }),

  // 添加获取必要模型列表的API
  getEssentialModels: () => 
    superagent.get(`${API_BASE_URL}/models/essential`),

  // 添加模型安装API方法
  installModel: (modelName: string) => 
    superagent.post(`${API_BASE_URL}/models/install/${modelName}`).use(debug),

  // 添加获取日志的方法
  getLogs: () => 
    superagent.get(`${API_BASE_URL}/comfyui/logs`).use(debug),

  // 添加模型扫描API方法
  scanModels: () => 
    superagent.post(`${API_BASE_URL}/models/scan`).use(debug),

  // 禁用插件
  disablePlugin: (pluginId: string) => 
    superagent.post(`${API_BASE_URL}/plugins/disable`).send({ pluginId }).use(debug),

  // 启用插件
  enablePlugin: (pluginId: string) => 
    superagent.post(`${API_BASE_URL}/plugins/enable`).send({ pluginId }).use(debug),

  // 刷新已安装插件列表
  refreshInstalledPlugins: () => 
    superagent.get(`${API_BASE_URL}/plugins/refresh`).use(debug),

  // 获取操作历史记录
  getOperationHistory: () => 
    superagent.get(`${API_BASE_URL}/plugins/history`),

  // 获取特定操作的详细日志
  getOperationLogs: (taskId: string) => 
    superagent.get(`${API_BASE_URL}/plugins/logs/${taskId}`),

  // 清除操作历史记录
  clearOperationHistory: () => 
    superagent.post(`${API_BASE_URL}/plugins/history/clear`),

  // ComfyUI 重置相关 API
  resetComfyUI: (lang?: string) => 
    superagent.post(`${API_BASE_URL}/comfyui/reset`).send({ lang }).use(debug),
  
  getResetLogs: (lang?: string) => 
    superagent.get(`${API_BASE_URL}/comfyui/reset-logs`).query({ lang }).use(debug),

  // 获取下载历史记录
  getDownloadHistory: (lang?: string) => 
    superagent.get(`${API_BASE_URL}/models/download-history`).query({ lang }).use(debug),

  // 清空下载历史记录
  clearDownloadHistory: (lang?: string) => 
    superagent.post(`${API_BASE_URL}/models/download-history/clear`).query({ lang }).use(debug),

  // 删除单条下载历史记录
  deleteDownloadHistoryItem: (id: string, lang?: string) => 
    superagent.post(`${API_BASE_URL}/models/download-history/delete`).send({ id, lang }).use(debug),

  // 添加打开路径的API方法
  openPath: (path: string) => 
    superagent.get(`${API_BASE_URL}/system/open-path`).query({ path }).use(debug),

  // 添加网络配置相关API方法
  getNetworkConfig: () => 
    superagent.get(`${API_BASE_URL}/system/network-config`).use(debug),
  
  getNetworkStatus: () => 
    superagent.get(`${API_BASE_URL}/system/network-status`).use(debug),
  
  setGithubProxy: (githubProxy: string) => 
    superagent.post(`${API_BASE_URL}/system/github-proxy`).send({ githubProxy }).use(debug),
  
  setPipSource: (pipUrl: string) => 
    superagent.post(`${API_BASE_URL}/system/pip-source`).send({ pipUrl }).use(debug),
  
  setHuggingfaceEndpoint: (hfEndpoint: string) => 
    superagent.post(`${API_BASE_URL}/system/huggingface-endpoint`).send({ hfEndpoint }).use(debug),

  // 新增：资源包相关API
  resourcePacks: {
    // 获取所有资源包列表
    getAll: () => {
      return adaptResponse(
        superagent
          .get(`${API_BASE_URL}/resource-packs`)
          .use(debug)
      );
    },
    
    // 获取单个资源包详情
    getById: (packId: string) => {
      return adaptResponse(
        superagent
          .get(`${API_BASE_URL}/resource-packs/${packId}`)
          .use(debug)
      );
    },
    
    // 安装资源包 - 修正API路径
    install: (packId: string, options?: { downloadSource?: string }) => {
      return adaptResponse(
        superagent
          .post(`${API_BASE_URL}/resource-packs/install`)
          .send({ packId, ...options })
          .use(debug)
      );
    },
    
    // 获取安装进度
    getInstallProgress: (taskId: string) => {
      return adaptResponse(
        superagent
          .get(`${API_BASE_URL}/resource-packs/progress/${taskId}`)
          .use(debug)
      );
    },
    
    // 取消安装
    cancelInstallation: (taskId: string) => {
      return adaptResponse(
        superagent
          .post(`${API_BASE_URL}/resource-packs/cancel/${taskId}`)
          .use(debug)
      );
    }
  },
};

export default api;  // 只有一个默认导出 

// Python依赖管理相关API
export const getPipSource = () => {
  return superagent.get(`${API_BASE_URL}/python/pip-source`).use(debug).then(res => res.body);
};

export const setPipSource = (source: string) => {
  return superagent.post(`${API_BASE_URL}/python/pip-source`).send({ source }).use(debug).then(res => res.body);
};

export const getInstalledPackages = () => {
  return superagent.get(`${API_BASE_URL}/python/packages`).use(debug).then(res => res.body);
};

export const installPackage = (packageSpec: string) => {
  return superagent.post(`${API_BASE_URL}/python/packages/install`).send({ package: packageSpec }).use(debug).then(res => res.body);
};

export const uninstallPackage = (packageName: string) => {
  return superagent.post(`${API_BASE_URL}/python/packages/uninstall`).send({ package: packageName }).use(debug).then(res => res.body);
};

export const analyzePluginDependencies = () => {
  return superagent.get(`${API_BASE_URL}/python/plugins/dependencies`).use(debug).then(res => res.body);
};

export const fixPluginDependencies = (pluginName: string) => {
  return superagent.post(`${API_BASE_URL}/python/plugins/fix-dependencies`).send({ plugin: pluginName }).use(debug).then(res => res.body);
};

// 添加Civitai API相关
export const civitaiApi = {
  // 获取最新模型
  getLatestModels: async (page = 1, limit = 24, cursor?: string) => {
    let url = `${API_BASE_URL}/civitai/models/latest?limit=${limit}`;
    
    // 如果有游标，优先使用游标分页
    if (cursor) {
      url += `&cursor=${encodeURIComponent(cursor)}`;
    } else if (page > 1) {
      // 否则使用页码分页
      url += `&page=${page}`;
    }
    
    const response = await superagent.get(url).use(debug);
    return response.body;
  },
  
  // 获取热门模型
  getHotModels: (page = 1, limit = 24) => {
    return superagent
      .get(`${API_BASE_URL}/civitai/models/hot`)
      .query({ page, limit })
      .use(debug)
      .then(res => res.body);
  },
  
  // 获取模型详情
  getModelDetails: (modelId: string) => {
    return superagent
      .get(`${API_BASE_URL}/civitai/models/${modelId}`)
      .use(debug)
      .then(res => res.body);
  },
  
  // 下载模型
  downloadModel: (versionId: string) => {
    // 创建下载链接
    return `${API_BASE_URL}/civitai/download/models/${versionId}`;
  },

  // 获取最新模型（使用完整URL）
  getLatestModelsWithUrl: async (fullUrl: string) => {
    // 修正: 使用我们的后端API代理请求
    const response = await superagent
      .get(`${API_BASE_URL}/civitai/models/by-url`)
      .query({ url: fullUrl })
      .use(debug);
    return response.body;
  },

  // 获取最新工作流
  getLatestWorkflows: async (page = 1, limit = 24, cursor?: string) => {
    const url = `${API_BASE_URL}/civitai/latest-workflows`;
    const queryParams: Record<string, string | number> = { limit };
    
    if (cursor) {
      queryParams.cursor = encodeURIComponent(cursor);
    } else if (page > 1) {
      queryParams.page = page;
    }
    
    const response = await superagent
      .get(url)
      .query(queryParams)
      .use(debug);
    return response.body;
  },

  // 获取热门工作流
  getHotWorkflows: async (page = 1, limit = 24, cursor?: string) => {
    const url = `${API_BASE_URL}/civitai/hot-workflows`;
    const queryParams: Record<string, string | number> = { limit };
    
    if (cursor) {
      queryParams.cursor = encodeURIComponent(cursor);
    } else if (page > 1) {
      queryParams.page = page;
    }
    
    const response = await superagent
      .get(url)
      .query(queryParams)
      .use(debug);
    return response.body;
  },
}; 

// 导出资源包API供单独使用
export const resourcePacksApi = api.resourcePacks; 