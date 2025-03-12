# 基于openSUSE Tumbleweed的前后端应用
# FROM docker.io/opensuse/tumbleweed:latest

FROM kldtks/comfyui:v0.3.22-b1

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN zypper --non-interactive refresh && \
    zypper --non-interactive install \
    nodejs \
    npm \
    git \
    bash \
    curl \
    && zypper clean -a

# 安装全局工具
RUN npm install -g serve @quasar/cli

# 设置Node环境变量
ENV NODE_ENV=production

# 复制package.json文件
COPY package.json ./
COPY server/package.json ./server/

# 安装依赖
RUN npm install && \
    cd server && npm install && cd ..

# 复制应用代码
COPY . .

# 构建前端和后端
RUN npm run build && \
    cd server && npm run build && cd ..

# 创建启动脚本
RUN echo '#!/bin/bash\n\
# 启动后端服务\n\
node /app/server/dist/index.js > /app/server.log 2>&1 &\n\
BACKEND_PID=$!\n\
echo "后端服务已启动，PID: $BACKEND_PID"\n\
\n\
# 启动前端静态文件服务\n\
serve -s /app/dist -l 8080 > /app/frontend.log 2>&1 &\n\
FRONTEND_PID=$!\n\
echo "前端服务已启动，PID: $FRONTEND_PID"\n\
\n\
# 监控日志\n\
echo "监控日志输出（CTRL+C 退出监控但不会停止服务）:"\n\
tail -f /app/server.log /app/frontend.log\n\
\n\
# 捕获SIGTERM信号\n\
trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGTERM\n\
\n\
# 等待子进程\n\
wait' > /app/start.sh && \
    chmod +x /app/start.sh

# 暴露前端和后端端口
EXPOSE 8080 3000

# 启动应用
CMD ["/app/start.sh"]