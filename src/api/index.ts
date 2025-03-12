import superagent from 'superagent';

// 定义数据对象类型，替代 any
interface ApiData {
  [key: string]: unknown;
}

// 从配置中获取API地址
const getApiBaseUrl = () => {
  // 使用动态配置或回退到默认值
  if (window.APP_CONFIG && window.APP_CONFIG.apiBaseUrl) {
    return `${window.APP_CONFIG.apiBaseUrl}/api`;
  }
  // 开发环境回退
  return 'http://localhost:3000/api';
};

const API_BASE_URL = getApiBaseUrl();

// 添加请求拦截器
superagent.Request.prototype.use = function(fn) {
  fn(this);
  return this;
};

// 在每个请求前添加调试
const debug = (req: superagent.Request) => console.log(`[前端] 发送请求: ${req.method} ${req.url}`);

// 封装SuperAgent响应为类似Axios的格式
const adaptResponse = async (request: superagent.Request) => {
  const response = await request;
  return {
    data: response.body,
    status: response.status,
    headers: response.headers
  };
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
  
  getModelProgress: (taskId: string) => 
    superagent.get(`${API_BASE_URL}/models/progress/${taskId}`),
  
  // 插件管理
  getPlugins: () => 
    superagent.get(`${API_BASE_URL}/plugins`),
  
  installPlugin: (pluginId: string) => 
    superagent.post(`${API_BASE_URL}/plugins/install`).send({ pluginId }),
  
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
    superagent.post(`${API_BASE_URL}/restart`)
};

export default api;  // 只有一个默认导出 