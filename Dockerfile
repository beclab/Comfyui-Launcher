# 基于openSUSE Tumbleweed的前后端应用
FROM docker.io/opensuse/tumbleweed:latest

# FROM kldtks/comfyui:v0.3.22-b1

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
RUN npm install -g serve

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

# 创建构建脚本
RUN echo '#!/bin/bash\n\
cd /app\n\
echo "构建前端应用..."\n\
if [ -f ./node_modules/.bin/quasar ]; then\n\
  ./node_modules/.bin/quasar build\n\
else\n\
  echo "找不到本地quasar，尝试使用package.json中的build脚本"\n\
  npm run build\n\
fi\n\
\n\
echo "构建后端应用..."\n\
cd server\n\
npm run build\n\
cd ..' > /app/build.sh && \
    chmod +x /app/build.sh

# 执行构建
RUN /app/build.sh

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