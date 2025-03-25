import * as path from 'path';

// 环境判断
export const isDev = process.env.NODE_ENV !== 'production';

// 路径配置
export const paths = {
  comfyui: process.env.COMFYUI_PATH || 
    (isDev ? path.join(process.cwd(), 'comfyui') : '/root/ComfyUI'),
  // ...其他路径配置
};

export const config = {
  port: process.env.PORT || 3000,
  comfyui: {
    execPath: '/runner-scripts/entrypoint.sh',
    modelPath: process.env.MODELS_DIR || './models',
    pluginPath: process.env.PLUGIN_PATH || './custom_nodes',
    startTimeout: 30000, // 启动超时时间（毫秒）
    stopTimeout: 5000,    // 停止超时时间（毫秒）
    port: 8188,
    proxyPort: 8190
  },
  // 模型存储目录
  modelsDir: process.env.MODELS_DIR || path.join(process.cwd(), 'models'),
  
  // 数据目录（用于缓存等）
  dataDir: process.env.DATA_DIR || path.join(process.cwd(), 'data'),
  
  // 配置模型获取通道
  modelChannels: {
    default: 'https://raw.githubusercontent.com/ltdrdata/ComfyUI-Manager/main/model-list.json',
    // 可以添加其他通道...
  },
  
  // 网络模式: 'public' | 'private' | 'offline'
  networkMode: process.env.NETWORK_MODE || 'public',
};

// Python路径配置
export const pythonPath = process.env.PYTHON_PATH || 'python3'; 

export const cachePath = process.env.CACHE_DIR;