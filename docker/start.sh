#!/bin/bash

# 生成前端配置
echo "生成前端配置..."
bash /app/docker/generate-config.sh

# 检查dist目录 (可选，因为Dockerfile已经检查过)
if [ ! -d "/app/dist" ] || [ -z "$(ls -A /app/dist 2>/dev/null)" ]; then
  echo "警告: 容器启动时发现dist目录不存在或为空，这表明构建阶段可能失败"
  mkdir -p /app/dist
  echo "<html><body><h1>前端构建失败</h1><p>请检查构建日志，容器启动时检测到问题</p></body></html>" > /app/dist/index.html
fi

# 启动后端服务
node /app/server/dist/index.js > /app/logs/server.log 2>&1 &
BACKEND_PID=$!
echo "后端服务已启动，PID: $BACKEND_PID"

# 启动前端静态文件服务
serve -s /app/dist/spa -l 8080 > /app/logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "前端服务已启动，PID: $FRONTEND_PID"

# 输出前端目录内容以便调试
echo "前端dist目录内容:"
ls -la /app/dist

# 监控日志
echo "监控日志输出（CTRL+C 退出监控但不会停止服务）:"
tail -f /app/logs/server.log /app/logs/frontend.log

# 捕获SIGTERM信号
trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGTERM

# 等待子进程
wait
