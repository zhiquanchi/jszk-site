# ---------- 阶段 1：构建前端 ----------
FROM node:22-alpine AS client-build
WORKDIR /app
COPY client/package.json client/package-lock.json ./client/
RUN npm ci --prefix client --no-audit --no-fund
COPY client/ ./client/
RUN npm --prefix client run build

# ---------- 阶段 2：后端编译为单文件可执行（Bun） ----------
FROM oven/bun:1-alpine AS server-build
WORKDIR /app
COPY package.json ./
RUN bun install
COPY server/ ./server/
RUN mkdir -p /target && bun build --compile --minify server/index.js --outfile /target/jszk-server

# ---------- 阶段 3：最小运行时（alpine：带 shell 便于排查） ----------
FROM alpine:3.20
RUN apk add --no-cache libstdc++ libgcc
WORKDIR /app
ENV NODE_ENV=production PORT=3001

COPY --from=server-build /target/jszk-server ./jszk-server
COPY data/ ./data/
COPY --from=client-build /app/client/dist ./client/dist

# 成绩数据持久化：挂载卷
VOLUME ["/app/data"]
EXPOSE 3001

CMD ["/app/jszk-server"]
