# ---------- 阶段 1：构建前端 ----------
FROM node:22-alpine AS client-build
WORKDIR /app
COPY client/package.json client/package-lock.json ./client/
RUN npm ci --prefix client --no-audit --no-fund
COPY client/ ./client/
RUN npm --prefix client run build

# ---------- 阶段 2：安装后端生产依赖 ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# ---------- 阶段 3：最小运行时 ----------
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3001

COPY package.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY server/ ./server/
COPY data/ ./data/
COPY --from=client-build /app/client/dist ./client/dist

# OCR 语言包（构建期下载，运行期离线可用）
RUN mkdir -p tessdata && \
    wget -q https://tessdata.projectnaptha.com/4.0.0/chi_sim.traineddata.gz -O tessdata/chi_sim.traineddata.gz && \
    wget -q https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz -O tessdata/eng.traineddata.gz

# 成绩数据持久化：挂载卷
VOLUME ["/app/data"]
EXPOSE 3001

CMD ["node", "server/index.js"]
