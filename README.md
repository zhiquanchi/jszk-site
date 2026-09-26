# 江苏自考 · 计算机科学与技术 个人资料站

专升本 X2080901 · 主考院校：南京航空航天大学 · 目标：工学学士学位

技术栈：React 18 + Vite 7 + antd 5（前端）/ Express（后端）/ JSON 文件持久化

## 本地开发

```bash
npm install                # 后端依赖
npm install --prefix client  # 前端依赖
npm run dev                # 同时启动 Express(3001) 与 Vite(5173)
```

打开 http://localhost:5173

## 生产部署（Docker）

```bash
docker build -t jszk-site .
docker run -d --name jszk-site -p 3001:3001 -v jszk-data:/app/data jszk-site
```

打开 http://localhost:3001（Express 直接托管前端构建产物）。

- 成绩数据持久化在 `jszk-data` 卷（容器内 `/app/data`）
- 备份成绩：`docker cp jszk-site:/app/data/scores.json ./scores.json`

不用 Docker 时也可以手动部署：

```bash
npm run build          # 构建前端到 client/dist
npm start              # Express 默认 3001 端口，自动托管 client/dist
```

## 目录结构

```
web/
├── client/          React + antd 前端
│   └── src/views/   总览 / 考试计划 / 免考中心 / 学位攻略 / 成绩记录 / 代码变更
├── server/          Express API
├── data/            数据层（改这里即可更新站点内容，不用动代码）
│   ├── courses.json      22 门课程 + 每门课的免考策略（路径/条件/材料/学位影响）
│   ├── policies.json     免考政策（证书类/学历类/限制/流程）
│   ├── degree.json       南航学位要求、红线、行动清单
│   ├── codeChanges.json  课程代码变更映射（2024 版计划调整）
│   └── scores.json       成绩记录（运行时生成，已挂卷持久化）
```

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/data` | 站点全部静态数据（课程/政策/学位/代码变更） |
| GET | `/api/scores` | 成绩列表 |
| POST | `/api/scores` | 新增成绩（旧课程代码自动归一为现行代码） |
| POST | `/api/scores/bulk` | 批量导入（成绩单解析确认后） |
| DELETE | `/api/scores/:id` | 删除成绩 |
| POST | `/api/scores/parse` | 上传成绩单（multipart 字段 `file`）。本地解析已移除，**统一预留大模型通道**——替换 `server/index.js` 的 `parseFile` 实现即可，接口形状不变 |

## 课程代码变更追踪

`data/codeChanges.json` 维护「旧代码 → 现行代码」映射（如 00015 英语(二) → 13000 英语(专升本)）。
按旧代码录入成绩或解析含旧代码的成绩单时，系统自动归一并保留「原 xx」标记；考试计划页对应课程也会显示旧代码标签。以后再有代码调整，改这个 JSON 即可。

## 数据来源

- 江苏省教育考试院 jseea.cn（免考实施细则、南航主考专业学士学位规定）
- 2024 版考试计划（X2080901）
