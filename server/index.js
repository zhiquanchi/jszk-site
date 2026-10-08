import express from 'express';
import compression from 'compression';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { startNcreJob, runNcreCheck, getJobMeta, readAnnouncements } from './ncreJob.js';
import { mailEnabled, sendMail } from './mailer.js';
import { readJson, writeJsonAtomic } from './store.js';
import { createAuth } from './auth.js';

// 根目录解析：Bun 单文件编译产物里 import.meta.url 指向虚拟文件系统（$bunfs），
// 此时以可执行文件所在目录为根；常规 node 运行则以源码上一级为根。可用 APP_ROOT 覆盖。
function resolveRoot() {
  if (import.meta.url.includes('$bunfs')) return path.dirname(process.execPath);
  return path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
}

const ROOT = process.env.APP_ROOT || resolveRoot();
const DATA_DIR = path.join(ROOT, 'data');
// 可变数据（成绩、通知、定时任务更新的 NCRE 信息）与静态数据分离：
// 容器里 STORE_DIR 单独挂卷，静态数据随镜像更新，不会卡在旧卷里
const STORE_DIR = process.env.STORE_DIR || DATA_DIR;
const SCORES_FILE = path.join(STORE_DIR, 'scores.json');
const CLIENT_DIST = path.join(ROOT, 'client', 'dist');
const PORT = process.env.PORT || 3001;

const app = express();
app.disable('x-powered-by');
// 前端是单文件大包（antd），gzip 后约为原始的 1/3
app.use(compression());
app.use(express.json({ limit: '2mb' }));

// ---- 写接口身份验证：TOTP 动态码（2FA 式）+ 会话票据 ----
// 站点公网可达，写接口（成绩 / NCRE / 通知）都要验证；验证器 App 的密钥放 TOTP_SECRET。
// 未配置时放行（本地开发零配置），启动时打印告警提醒生产环境务必设置。
const TOTP_SECRET = process.env.TOTP_SECRET || '';
const SESSION_TTL_HOURS = Number(process.env.SESSION_TTL_HOURS || 12);
const auth = TOTP_SECRET
  ? createAuth({ secret: TOTP_SECRET, ttlMs: SESSION_TTL_HOURS * 3600 * 1000 })
  : null;

// 6 位码只有 100 万种可能，必须限流：同一 IP 在窗口内失败到上限就临时封禁
const MAX_FAILS = Number(process.env.TOTP_MAX_FAILS || 8);
const FAIL_WINDOW_MS = 10 * 60 * 1000;
const authFails = new Map();

function blockRemainingMs(ip) {
  const rec = authFails.get(ip);
  if (!rec) return 0;
  const age = Date.now() - rec.firstAt;
  if (age > FAIL_WINDOW_MS) {
    authFails.delete(ip);
    return 0;
  }
  return rec.count >= MAX_FAILS ? FAIL_WINDOW_MS - age : 0;
}

function noteAuthFail(ip) {
  const now = Date.now();
  const rec = authFails.get(ip);
  if (!rec || now - rec.firstAt > FAIL_WINDOW_MS) authFails.set(ip, { count: 1, firstAt: now });
  else rec.count += 1;
}

function requireAuth(req, res, next) {
  if (!auth) return next();
  const session = auth.verifySession(req.get('x-auth-token'));
  // 也接受直接提交一次性动态码（脚本 / curl 不必先换票据）
  const codeOk = !session && auth.verifyCode(req.get('x-totp-code'));
  if (session || codeOk) return next();
  res.status(401).json({ error: '需要验证：请点左下角「写入验证」输入验证器 App 上的 6 位动态码' });
}

// 动态码 → 会话票据（默认 12 小时，避免每次写操作都去读验证器）
app.post('/api/auth/verify', (req, res) => {
  if (!auth) return res.status(400).json({ error: '服务端未配置 TOTP_SECRET' });
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const wait = blockRemainingMs(ip);
  if (wait > 0) {
    return res.status(429).json({ error: `动态码尝试次数过多，请 ${Math.ceil(wait / 60000)} 分钟后再试` });
  }
  const code = req.body?.code;
  if (!auth.verifyCode(code)) {
    noteAuthFail(ip);
    console.warn(`[验证失败] ${ip} 动态码不正确`);
    return res.status(401).json({ error: '动态码不正确或已过期，请重新读取验证器上的 6 位码' });
  }
  authFails.delete(ip);
  res.json(auth.issueSession());
});

const readJSON = (file) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
const courses = () => readJSON('courses.json');
const codeChanges = () => readJSON('codeChanges.json');

// 旧课程代码 → 现行代码
const buildCodeMap = () => Object.fromEntries(codeChanges().map((c) => [c.from, c.to]));

app.get('/api/data', (req, res) => {
  res.json({
    meta: readJSON('meta.json'),
    courses: courses(),
    policies: readJSON('policies.json'),
    degree: readJSON('degree.json'),
    codeChanges: codeChanges(),
  });
});

// ---- 成绩记录（持久化到 STORE_DIR/scores.json）----

const readScores = () => readJson(SCORES_FILE, []);
const writeScores = (scores) => writeJsonAtomic(SCORES_FILE, scores);

// 重复判定键：同一门课 + 同一类型 + 同分数视为同一条记录（重复导入同一张成绩单）
const dedupeKey = (r) => `${r.code}|${r.category}|${r.score}`;

// 录入时若用了旧课程代码，自动归一到现行代码并保留原代码痕迹
function normalizeCode(rawCode) {
  const map = buildCodeMap();
  return map[rawCode]
    ? { code: map[rawCode], originalCode: rawCode }
    : { code: rawCode, originalCode: undefined };
}

function makeRecord(body) {
  const { code: rawCode, score, category, date, note } = body ?? {};
  if (!rawCode || typeof score !== 'number' || Number.isNaN(score)) return null;
  if (score < 0 || score > 100) return null;
  const { code, originalCode } = normalizeCode(String(rawCode));
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    code,
    originalCode,
    score,
    category: category || '笔试',
    date: date || new Date().toISOString().slice(0, 10),
    note: note || '',
  };
}

app.get('/api/scores', (req, res) => {
  res.json(readScores());
});

app.post('/api/scores', requireAuth, (req, res) => {
  const record = makeRecord(req.body);
  if (!record) return res.status(400).json({ error: 'code 与 0–100 的数字型 score 为必填' });
  const scores = readScores();
  scores.push(record);
  writeScores(scores);
  res.status(201).json(record);
});

// 批量导入（成绩单解析确认后使用）：与已有记录重复的（同课+同类型+同分）跳过，
// 重复导入同一张成绩单不会产生双份记录；分数不同则视为重考新记录照常写入。
app.post('/api/scores/bulk', requireAuth, (req, res) => {
  const items = Array.isArray(req.body) ? req.body : req.body?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'body 需为非空数组' });
  }
  const records = items.map(makeRecord);
  if (records.some((r) => !r)) {
    return res.status(400).json({ error: '存在无效记录（code/score 缺失或非法）' });
  }
  const scores = readScores();
  const existing = new Set(scores.map(dedupeKey));
  const added = [];
  let skipped = 0;
  for (const r of records) {
    const key = dedupeKey(r);
    if (existing.has(key)) {
      skipped += 1;
      continue;
    }
    existing.add(key);
    added.push(r);
  }
  if (added.length) writeScores([...scores, ...added]);
  res.status(201).json({ added: added.length, skipped, records: added });
});

app.delete('/api/scores/:id', requireAuth, (req, res) => {
  writeScores(readScores().filter((s) => s.id !== req.params.id));
  res.json({ ok: true });
});

// ---- NCRE 报名信息（每日定时任务经 POST /api/ncre 更新）----

const readNcre = () => {
  // 优先卷里的运行时数据，其次镜像内的静态初始数据
  const storeFile = path.join(STORE_DIR, 'ncre.json');
  return readJson(storeFile, null) ?? readJson(path.join(DATA_DIR, 'ncre.json'));
};

app.get('/api/ncre', (req, res) => {
  res.json({
    ...readNcre(),
    announcements: readAnnouncements(STORE_DIR),
    job: getJobMeta(),
    notifications: readNotifications(),
  });
});

app.post('/api/ncre', requireAuth, (req, res) => {
  const { source, note, sessions } = req.body ?? {};
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return res.status(400).json({ error: 'body 需含非空 sessions 数组' });
  }
  const data = {
    updatedAt: new Date().toISOString().slice(0, 10),
    source: source || '上海市教育考试院（上海招考热线 shmeea.edu.cn）',
    note: note || '',
    sessions,
  };
  writeJsonAtomic(path.join(STORE_DIR, 'ncre.json'), data);
  res.json(data);
});

// ---- 通知接口：落盘 + 控制台日志；配置了 DirectMail 时叠加邮件推送 ----
// delivered 取值：emailed（已提交 DirectMail）/ logged（无邮件渠道，仅落盘）/ email_failed: 原因

const readNotifications = () => readJson(path.join(STORE_DIR, 'notifications.json'), []);

function writeNotifications(list) {
  writeJsonAtomic(path.join(STORE_DIR, 'notifications.json'), list);
}

// 邮件正文是 HTML：标题可能来自抓取的第三方页面，必须转义后再拼接，避免 HTML 注入
const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// 邮件主题是纯文本 header，去掉换行等控制字符
const sanitizeSubject = (s) => String(s).replace(/[\r\n\t]+/g, ' ').slice(0, 200);

async function pushNotification(event, title, message) {
  const record = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    event,
    title,
    message: message || '',
    delivered: 'logged',
    time: new Date().toISOString(),
  };
  console.log(`[通知] ${event}: ${title} ${message}`);

  if (mailEnabled()) {
    try {
      const extra = message
        ? `<p style="color:#666;word-break:break-all">${escapeHtml(message)}</p>`
        : '';
      const r = await sendMail(
        sanitizeSubject(title),
        `<h3>${escapeHtml(title)}</h3>${extra}<p style="color:#999;font-size:12px">jszk-site 自动通知 · ${record.time}</p>`
      );
      record.delivered = r.ok ? 'emailed' : 'logged';
    } catch (e) {
      record.delivered = `email_failed: ${e.message}`;
      console.error(`[通知] 邮件投递失败：${e.message}`);
    }
  }

  const list = readNotifications();
  list.push(record);
  writeNotifications(list);
  return record;
}

app.post('/api/notify', requireAuth, async (req, res) => {
  const { event, title, message } = req.body ?? {};
  if (!event || !title) return res.status(400).json({ error: 'event 与 title 为必填' });
  res.status(201).json(await pushNotification(event, title, message));
});

// 手动触发一次 NCRE 公告检查（定时任务之外）
app.post('/api/ncre/run', requireAuth, async (req, res) => {
  try {
    const { fresh, result } = await runNcreCheck(DATA_DIR, STORE_DIR);
    await Promise.all(
      fresh.map((f) => pushNotification('ncre_announcement', `NCRE公告：${f.title}`, f.url))
    );
    res.json({ result, freshCount: fresh.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 每日 NCRE 公告监控（node-cron，Asia/Shanghai；NCRE_CRON 可覆盖 schedule）
startNcreJob(DATA_DIR, STORE_DIR, (f) =>
  pushNotification('ncre_announcement', `NCRE公告：${f.title}`, f.url)
);

// ---- 成绩单解析 ----
// 本地 OCR 已移除：解析统一预留为大模型通道。
// 接入时替换 parseFile 的实现（调大模型 API 识别成绩），返回 { text, candidates } 即可，
// /api/scores/parse 接口形状不变（multipart 字段 file）。

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

async function parseFile(file) {
  throw Object.assign(
    new Error('成绩单解析将接入大模型通道，接入前请使用「手动录入」'),
    { status: 400 }
  );
}

// 从识别文本中抽取「课程代码 + 分数」候选（大模型通道返回文本后由其兜底抽取）
function parseCandidates(text) {
  const list = courses(); // 一次性读盘：循环里不要再碰磁盘
  const names = new Map(list.map((c) => [c.code, c.name]));
  const map = buildCodeMap();
  const found = new Map();

  for (const raw of String(text || '').split(/\r?\n/)) {
    // 全角数字转半角
    const line = raw.replace(/[０-９]/g, (d) =>
      String.fromCharCode(d.charCodeAt(0) - 0xfee0)
    );
    const m = line.match(/(\d{5})\D{0,30}?(\d{1,3})(?!\d)/);
    if (!m) continue;
    const score = parseInt(m[2], 10);
    if (score < 0 || score > 100) continue;
    const rawCode = m[1];
    const mapped = map[rawCode] || rawCode;
    if (!names.has(mapped)) continue;
    const prev = found.get(mapped);
    if (!prev || score > prev.score) {
      found.set(mapped, {
        code: mapped,
        originalCode: map[rawCode] ? rawCode : undefined,
        name: names.get(mapped),
        score,
      });
    }
  }
  return [...found.values()];
}

app.post('/api/scores/parse', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '未收到文件' });
  try {
    const parsed = await parseFile(req.file);
    const text = parsed?.text || '';
    // 大模型只回文本时，用本地规则兜底抽取候选
    const candidates = parsed?.candidates?.length ? parsed.candidates : parseCandidates(text);
    res.json({ fileName: req.file.originalname, text, candidates });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || '解析失败' });
  }
});

// 生产模式：存在 client/dist 时直接托管前端产物
const ASSETS_DIR = path.join(CLIENT_DIST, 'assets');
if (fs.existsSync(CLIENT_DIST)) {
  app.use(
    express.static(CLIENT_DIST, {
      setHeaders(res, filePath) {
        // assets/ 下文件名带内容哈希 → 可以永久缓存；index.html 必须每次回源校验
        res.setHeader(
          'Cache-Control',
          filePath.startsWith(ASSETS_DIR) ? 'public, max-age=31536000, immutable' : 'no-cache'
        );
      },
    })
  );
  // SPA 兜底：只回前端路由，/assets/ 下不存在的文件照常 404
  app.get(/^\/(?!api\/|assets\/).*/, (req, res) =>
    res.sendFile(path.join(CLIENT_DIST, 'index.html'))
  );
}

app.listen(PORT, () => {
  console.log(`API 服务已启动 → http://localhost:${PORT}`);
  console.log(
    fs.existsSync(CLIENT_DIST)
      ? '生产模式：已托管前端产物'
      : '开发模式：前端请走 Vite dev server（http://localhost:5173）'
  );
  if (!auth) {
    console.warn('[安全] 未配置 TOTP_SECRET：写接口（成绩/NCRE/通知）当前无验证，公网部署请务必设置');
  } else {
    console.log(`写接口验证已开启：TOTP ${auth.digits} 位动态码 / 票据有效期 ${SESSION_TTL_HOURS} 小时`);
    if (process.env.TOTP_PRINT_URI === '1') {
      console.log(`验证器录入地址：${auth.otpauthUri(process.env.TOTP_ACCOUNT || 'owner')}`);
    }
  }
});
