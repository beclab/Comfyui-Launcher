# 第一阶段：构建
FROM node:22 AS builder

# 设置工作目录
WORKDIR /app

# 复制package.json文件
COPY package.json ./
COPY server/package.json ./server/

# 安装依赖
RUN npm install && \
    cd server && npm install && cd ..

# 复制所有源代码
COPY . .

# 创建构建脚本
RUN echo '#!/bin/bash' > /app/build.sh && \
    echo 'set -e  # 任何命令失败时立即退出脚本' >> /app/build.sh && \
    echo 'cd /app' >> /app/build.sh && \
    echo 'echo "构建前端应用..."' >> /app/build.sh && \
    echo 'if [ -f ./node_modules/.bin/quasar ]; then' >> /app/build.sh && \
    echo '  ./node_modules/.bin/quasar build' >> /app/build.sh && \
    echo 'else' >> /app/build.sh && \
    echo '  echo "找不到本地quasar，尝试使用package.json中的build脚本"' >> /app/build.sh && \
    echo '  npm run build' >> /app/build.sh && \
    echo 'fi' >> /app/build.sh && \
    echo '' >> /app/build.sh && \
    echo '# 检查前端构建结果' >> /app/build.sh && \
    echo 'if [ ! -d "/app/dist" ] || [ -z "$(ls -A /app/dist 2>/dev/null)" ]; then' >> /app/build.sh && \
    echo '  echo "错误: 前端构建失败 - dist目录不存在或为空"' >> /app/build.sh && \
    echo '  exit 1' >> /app/build.sh && \
    echo 'fi' >> /app/build.sh && \
    echo '' >> /app/build.sh && \
    echo 'echo "构建后端应用..."' >> /app/build.sh && \
    echo 'cd server' >> /app/build.sh && \
    echo 'npm run build' >> /app/build.sh && \
    echo '' >> /app/build.sh && \
    echo '# 检查后端构建结果' >> /app/build.sh && \
    echo 'if [ ! -d "dist" ] || [ -z "$(ls -A dist 2>/dev/null)" ]; then' >> /app/build.sh && \
    echo '  echo "错误: 后端构建失败 - dist目录不存在或为空"' >> /app/build.sh && \
    echo '  exit 1' >> /app/build.sh && \
    echo 'fi' >> /app/build.sh && \
    echo 'cd ..' >> /app/build.sh && \
    echo 'echo "构建成功完成！"' >> /app/build.sh && \
    chmod +x /app/build.sh

# 执行构建
RUN /app/build.sh

# 第二阶段：运行
# FROM docker.io/opensuse/tumbleweed:latest
FROM kldtks/comfyui:v0.3.22-b1

# 设置工作目录
WORKDIR /app

# 安装运行时依赖
RUN zypper --non-interactive refresh && \
    zypper --non-interactive install \
    nodejs \
    npm \
    git \
    bash \
    curl \
    && zypper clean -a

# 安装全局工具 - 仅保留运行时需要的工具
RUN npm install -g serve

# 设置Node环境变量
ENV NODE_ENV=production

# 创建日志目录并赋予权限
RUN mkdir -p /app/logs && \
    chmod 777 /app/logs

# 从构建阶段复制构建产物
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/server/dist /app/server/dist

# 复制运行所需的所有package和依赖文件
COPY --from=builder /app/server/package.json /app/server/
COPY --from=builder /app/server/package-lock.json /app/server/

# 复制配置脚本
COPY --from=builder /app/docker/generate-config.sh /app/docker/
RUN chmod +x /app/docker/generate-config.sh

# 设置前端目录权限，确保start.sh可以写入配置文件和修改index.html
RUN chmod -R 777 /app/dist

# 在运行环境中安装所有依赖，包括开发依赖，确保superagent可用
WORKDIR /app/server
RUN npm install && \
    npm install superagent --save && \
    npm install fs-extra && \
    npm install winston

    
# 回到应用根目录
WORKDIR /app

# 复制启动脚本
COPY docker/start.sh /app/start.sh
RUN chmod +x /app/start.sh

# 暴露前端和后端端口
EXPOSE 8080 3000

COPY ./entrypoint.sh /runner-scripts/entrypoint.sh
RUN mkdir /newversion/ComfyUI/launchercache

# 修改目录所有权为用户ID 1000（非root用户）
RUN chown -R 1000:1000 /runner-scripts /newversion && \
    chmod -R 755 /runner-scripts /newversion

# 启动应用
CMD ["/app/start.sh"]