#!/bin/bash

# 接收环境变量或使用默认值
API_HOST="${API_HOST:-localhost}"
API_PORT="${API_PORT:-3000}"
API_PROTOCOL="${API_PROTOCOL:-http}"

# 生成配置文件
cat > /app/dist/config.js << EOF
window.APP_CONFIG = {
  apiBaseUrl: "${API_PROTOCOL}://${API_HOST}:${API_PORT}",
  buildTime: "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
};
console.log("加载配置:", window.APP_CONFIG);
EOF

echo "已生成前端配置文件：/app/dist/config.js"
echo "API地址: ${API_PROTOCOL}://${API_HOST}:${API_PORT}" 