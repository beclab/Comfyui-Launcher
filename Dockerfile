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
RUN echo '#!/bin/bash' > /app/build.sh && \
    echo 'cd /app' >> /app/build.sh && \
    echo 'echo "构建前端应用..."' >> /app/build.sh && \
    echo 'if [ -f ./node_modules/.bin/quasar ]; then' >> /app/build.sh && \
    echo '  ./node_modules/.bin/quasar build' >> /app/build.sh && \
    echo 'else' >> /app/build.sh && \
    echo '  echo "找不到本地quasar，尝试使用package.json中的build脚本"' >> /app/build.sh && \
    echo '  npm run build' >> /app/build.sh && \
    echo 'fi' >> /app/build.sh && \
    echo '' >> /app/build.sh && \
    echo 'echo "构建后端应用..."' >> /app/build.sh && \
    echo 'cd server' >> /app/build.sh && \
    echo 'npm run build' >> /app/build.sh && \
    echo 'cd ..' >> /app/build.sh && \
    chmod +x /app/build.sh && \
    cat /app/build.sh  # 显示脚本内容以便调试

# 执行构建
RUN /app/build.sh

# 创建启动脚本
COPY docker/start.sh /app/start.sh
RUN chmod +x /app/start.sh

# 暴露前端和后端端口
EXPOSE 8080 3000

# 启动应用
CMD ["/app/start.sh"]