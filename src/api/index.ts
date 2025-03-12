import superagent from 'superagent';

const API_BASE_URL = 'http://localhost:3000/api';

// 添加请求拦截器
superagent.Request.prototype.use = function(fn) {
  fn(this);
  return this;
};

// 在每个请求前添加调试
const debug = (req: superagent.Request) => console.log(`[前端] 发送请求: ${req.method} ${req.url}`);

export default {
  // ComfyUI状态
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