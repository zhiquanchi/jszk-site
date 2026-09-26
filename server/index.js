import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';

// 根目录解析：Bun 单文件编译产物里 import.meta.url 指向虚拟文件系统（$bunfs），
// 此时以可执行文件所在目录为根；常规 node 运行则以源码上一级为根。可用 APP_ROOT 覆盖。
function resolveRoot() {
  if (import.meta.url.includes('$bunfs')) return path.dirname(process.execPath);
  return path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
}

const ROOT = process.env.APP_ROOT || resolveRoot();
const DATA_DIR = path.join(ROOT, 'data');
const SCORES_FILE = path.join(DATA_DIR, 'scores.json');
const CLIENT_DIST = path.join(ROOT, 'client', 'dist');
const PORT = process.env.PORT || 3001;

const app = express();
app.use(express.json({ limit: '2mb' }));

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

// ---- 成绩记录（持久化到 data/scores.json）----

const readScores = () =>
  fs.existsSync(SCORES_FILE) ? JSON.parse(fs.readFileSync(SCORES_FILE, 'utf8')) : [];
const writeScores = (scores) => fs.writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2));

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

app.post('/api/scores', (req, res) => {
  const record = makeRecord(req.body);
  if (!record) return res.status(400).json({ error: 'code 与数字型 score 为必填' });
  const scores = readScores();
  scores.push(record);
  writeScores(scores);
  res.status(201).json(record);
});

// 批量导入（成绩单解析确认后使用）
app.post('/api/scores/bulk', (req, res) => {
  const items = Array.isArray(req.body) ? req.body : req.body?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'body 需为非空数组' });
  }
  const records = items.map(makeRecord);
  if (records.some((r) => !r)) {
    return res.status(400).json({ error: '存在无效记录（code/score 缺失或非法）' });
  }
  const scores = readScores();
  scores.push(...records);
  writeScores(scores);
  res.status(201).json({ added: records.length, records });
});

app.delete('/api/scores/:id', (req, res) => {
  writeScores(readScores().filter((s) => s.id !== req.params.id));
  res.json({ ok: true });
});

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

// 从文本中抽取「课程代码 + 分数」候选
function parseCandidates(text) {
  const knownCodes = new Set(courses().map((c) => c.code));
  const map = buildCodeMap();
  const found = new Map();

  for (const raw of text.split(/\r?\n/)) {
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
    if (!knownCodes.has(mapped)) continue;
    const prev = found.get(mapped);
    if (!prev || score > prev.score) {
      found.set(mapped, {
        code: mapped,
        originalCode: map[rawCode] ? rawCode : undefined,
        name: courses().find((c) => c.code === mapped)?.name || mapped,
        score,
      });
    }
  }
  return [...found.values()];
}

app.post('/api/scores/parse', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '未收到文件' });
  try {
    const { text, candidates } = await parseFile(req.file);
    res.json({ fileName: req.file.originalname, text, candidates });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || '解析失败' });
  }
});

// 生产模式：存在 client/dist 时直接托管前端产物
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`API 服务已启动 → http://localhost:${PORT}`);
  console.log(
    fs.existsSync(CLIENT_DIST)
      ? '生产模式：已托管前端产物'
      : '开发模式：前端请走 Vite dev server（http://localhost:5173）'
  );
});
