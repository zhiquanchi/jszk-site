import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const SCORES_FILE = path.join(DATA_DIR, 'scores.json');
const CLIENT_DIST = path.join(ROOT, 'client', 'dist');
const PORT = process.env.PORT || 3001;

const app = express();
app.use(express.json());

const readJSON = (file) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));

// 站点静态数据：科目计划、免考政策、学位要求
app.get('/api/data', (req, res) => {
  res.json({
    meta: readJSON('meta.json'),
    courses: readJSON('courses.json'),
    policies: readJSON('policies.json'),
    degree: readJSON('degree.json'),
  });
});

// ---- 成绩记录（持久化到 data/scores.json）----

const readScores = () =>
  fs.existsSync(SCORES_FILE) ? JSON.parse(fs.readFileSync(SCORES_FILE, 'utf8')) : [];
const writeScores = (scores) => fs.writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2));

app.get('/api/scores', (req, res) => {
  res.json(readScores());
});

app.post('/api/scores', (req, res) => {
  const { code, score, category, date, note } = req.body ?? {};
  if (!code || typeof score !== 'number' || Number.isNaN(score)) {
    return res.status(400).json({ error: 'code 与数字型 score 为必填' });
  }
  const scores = readScores();
  const record = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    code,
    score,
    category: category || '笔试',
    date: date || new Date().toISOString().slice(0, 10),
    note: note || '',
  };
  scores.push(record);
  writeScores(scores);
  res.status(201).json(record);
});

app.delete('/api/scores/:id', (req, res) => {
  writeScores(readScores().filter((s) => s.id !== req.params.id));
  res.json({ ok: true });
});

// 生产模式：存在 client/dist 时直接托管前端产物
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`API 服务已启动 → http://localhost:${PORT}`);
  console.log(fs.existsSync(CLIENT_DIST)
    ? `生产模式：已托管前端产物 → http://localhost:${PORT}`
    : '开发模式：前端请走 Vite dev server（http://localhost:5173）');
});
