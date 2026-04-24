# 阶段 1: 构建前端
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
ARG VITE_STANDARD_MODE_DAYS=7
ENV VITE_STANDARD_MODE_DAYS=$VITE_STANDARD_MODE_DAYS
RUN npm run build

# 阶段 2: 构建后端并合并前端静态文件
FROM python:3.10-slim
WORKDIR /app

# 安装后端依赖
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制后端代码
COPY backend/ .

# 复制前端构建产物到后端 dist 目录
COPY --from=frontend-builder /app/frontend/dist ./dist

EXPOSE 8000

# 运行 FastAPI
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
