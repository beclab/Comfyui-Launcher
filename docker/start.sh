#!/bin/bash

# 启动后端服务
node /app/server/dist/index.js > /app/logs/server.log 2>&1 &
BACKEND_PID=$!
echo "后端服务已启动，PID: $BACKEND_PID"

# 启动前端静态文件服务
serve -s /app/dist -l 8080 > /app/logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "前端服务已启动，PID: $FRONTEND_PID"

# 监控日志
echo "监控日志输出（CTRL+C 退出监控但不会停止服务）:"
tail -f /app/logs/server.log /app/logs/frontend.log

# 捕获SIGTERM信号
trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGTERM

# 等待子进程
wait
