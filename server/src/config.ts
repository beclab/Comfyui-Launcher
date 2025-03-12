export const config = {
  port: process.env.PORT || 3000,
  comfyui: {
    execPath: process.env.COMFYUI_PATH || '/runner-scripts/entrypoint.sh',
    modelPath: process.env.MODEL_PATH || './models',
    pluginPath: process.env.PLUGIN_PATH || './custom_nodes',
    startTimeout: 30000, // 启动超时时间（毫秒）
    stopTimeout: 5000    // 停止超时时间（毫秒）
  }
}; 