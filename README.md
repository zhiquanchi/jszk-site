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
docker run -d --name jszk-site -p 3001:3001 -v jszk-store:/app/store jszk-site
```

打开 http://localhost:3001（后端经 Bun 编译为单文件可执行程序，镜像 ~130MB，Express 托管前端产物）。

生产模式下前端产物由 Express 直接托管：响应默认 gzip 压缩，`/assets/` 下带内容哈希的文件发 `immutable` 长缓存，`index.html` 每次回源校验（`no-cache`）。前端按视图分包：首屏只加载「总览」相关 chunk（约 270 KB gzip），其余页面切到时再取。

### 写入鉴权（ADMIN_TOKEN）

站点公网可达，写接口（成绩增删、NCRE 批次、通知）凭 `ADMIN_TOKEN` 校验：

| 变量 | 说明 |
|------|------|
| `ADMIN_TOKEN` | 写接口密钥。**未配置时不校验**（本地开发零配置），公网部署务必设置 |

设置后在页面左下角「🔑 写入密钥」粘贴一次即可（存浏览器 localStorage，随写请求以 `X-Auth-Token` 头发送，不进仓库与构建产物）。未填或填错时写操作返回 401 并自动弹出输入框。

```bash
# 生成一个密钥
openssl rand -hex 24
# 服务器上写进环境文件（与 DM_* 同一个 --env-file）
echo 'ADMIN_TOKEN=生成的密钥' >> /root/jszk-mail.env
```

### 邮件推送（阿里云 DirectMail）

通知接口（NCRE 新公告等）在以下环境变量齐备时自动叠加邮件推送，缺省则只落盘+日志（本地开发零配置）：

| 变量 | 说明 |
|------|------|
| `DM_ACCESS_KEY_ID` / `DM_ACCESS_KEY_SECRET` | 有 DirectMail 权限的 RAM 用户 AK |
| `DM_SENDER` | 发信地址（如 `noreply@mail.zhiquanchi.xyz`） |
| `DM_TO` | 收件邮箱，多个用英文逗号分隔 |
| `DM_FROM_ALIAS` | 发件人昵称（默认「自考站监控」） |
| `DM_ENDPOINT` | 默认 `https://dm.aliyuncs.com` |

凭证文件 `.env.mail`（gitignore）本地留存，服务器上放 `/root/jszk-mail.env`（chmod 600），`docker run --env-file` 注入。投递结果记录在 `notifications.json` 的 `delivered` 字段：`emailed` / `logged` / `email_failed: 原因`，在「NCRE 报名」页的「通知记录」表格「投递」列可直接看到。

> 注意：API 创建的发信地址用 `ModifyPWByDomain` 设的 SMTP 密码实测不生效（535），故走 SingleSendMail API 而非 SMTP。

> 开发与 `npm start` 仍走 Node，无需安装 Bun；只有 Docker 构建阶段使用 Bun。

- 可变数据（成绩 / 通知 / NCRE 追踪）持久化在 `jszk-store` 卷（容器内 `/app/store`），静态数据随镜像更新
- 备份成绩：`docker cp jszk-site:/app/store/scores.json ./scores.json`

不用 Docker 时也可以手动部署：

```bash
npm run build          # 构建前端到 client/dist
npm start              # Express 默认 3001 端口，自动托管 client/dist
```

## 目录结构

```
web/
├── client/          React + antd 前端（视图按需分包加载）
│   └── src/
│       ├── views/   总览 / 学习清单 / 考试计划 / 免考中心 / 学位攻略 / 成绩记录 / NCRE 报名 / 代码变更
│       ├── scoring.js    成绩判读唯一口径（60 分合格线、学位 70 分线、论文类不计入课程口径）
│       └── auth.js       写入密钥（localStorage ↔ X-Auth-Token）
├── server/          Express API（store.js 负责可变数据的原子读写）
├── data/            数据层（改这里即可更新站点内容，不用动代码）
│   ├── courses.json      22 门课程 + 每门课的免考策略（路径/条件/材料/学位影响）
│   ├── policies.json     免考政策（证书类/学历类/限制/流程）
│   ├── degree.json       南航学位要求、红线、行动清单；degreeCourses[].role = english/average 决定成绩页的达标卡
│   ├── codeChanges.json  课程代码变更映射（2024 版计划调整）
│   └── scores.json       成绩记录（随 git 跟踪的副本；运行时的可变数据写在 STORE_DIR）
```

运行时的可变数据（成绩 / 通知 / NCRE 批次与快照）统一走 `STORE_DIR`（默认 `data/`，容器内为挂载卷 `/app/store`），写入采用「临时文件 + rename」，避免写到一半被杀留下截断的 JSON。

## API

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/data` | — | 站点全部静态数据（课程/政策/学位/代码变更） |
| GET | `/api/scores` | — | 成绩列表 |
| POST | `/api/scores` | 🔑 | 新增成绩（旧课程代码自动归一为现行代码） |
| POST | `/api/scores/bulk` | 🔑 | 批量导入（成绩单解析确认后）；与已有记录同课同类型同分数的条目自动跳过，返回 `{added, skipped}` |
| DELETE | `/api/scores/:id` | 🔑 | 删除成绩 |
| POST | `/api/scores/parse` | 🔑 | 上传成绩单（multipart 字段 `file`）。本地解析已移除，**统一预留大模型通道**——替换 `server/index.js` 的 `parseFile` 实现即可；只回文本时用本地规则兜底抽取候选 |
| GET | `/api/ncre` | — | 上海 NCRE 报名/考试时间追踪 + 通知记录 |
| POST | `/api/ncre` | 🔑 | 更新 NCRE 批次数据（sessions） |
| POST | `/api/ncre/run` | 🔑 | 手动触发一次 NCRE 公告抓取检查（与定时任务互斥，不并发） |
| POST | `/api/notify` | 🔑 | 通知接口：`{event, title, message}`，落盘+日志；配置 DirectMail 环境变量后自动叠加邮件推送 |

🔑 = 需请求头 `X-Auth-Token`（服务端配置了 `ADMIN_TOKEN` 时才校验）。

## NCRE 报名追踪（服务内每日定时任务）

站点「NCRE 报名」页展示上海市 NCRE（全国计算机等级考试）各批次报名/考试时间。定时任务**跑在应用内**（`server/ncreJob.js`，node-cron，默认每天 9:00 Asia/Shanghai，环境变量 `NCRE_CRON` 可改）：拉取 `data/ncreSources.json` 配置的来源页 → 抓取标题含「计算机等级考试」的公告链接 → 与上次快照对比 → 新公告写入「抓取到的相关公告」并触发 `/api/notify`（配置邮件渠道后新公告同步推送到邮箱）。页面上可「立即检查」手动触发（`POST /api/ncre/run`）。批次报名/考试时间（`sessions`）仍由 `POST /api/ncre` 维护。关注科目：二级 C（免 13013/13014）、二级 Java（免 04747/04748）。

## 课程代码变更追踪

`data/codeChanges.json` 维护「旧代码 → 现行代码」映射（如 00015 英语(二) → 13000 英语(专升本)）。
按旧代码录入成绩或解析含旧代码的成绩单时，系统自动归一并保留「原 xx」标记；考试计划页对应课程也会显示旧代码标签。以后再有代码调整，改这个 JSON 即可。

## 数据来源

- 江苏省教育考试院 jseea.cn（免考实施细则、南航主考专业学士学位规定）
- 2024 版考试计划（X2080901）
