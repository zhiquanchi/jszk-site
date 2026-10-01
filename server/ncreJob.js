import fs from 'node:fs';
import path from 'node:path';
import cron from 'node-cron';

// NCRE 公告监控定时任务：每天定时拉取来源页，抓取标题含关键词的公告链接，
// 与上次快照对比，新公告通过回调触发通知。来源与关键词配置在 data/ncreSources.json。
const CRON = process.env.NCRE_CRON || '0 9 * * *';
const TIMEZONE = 'Asia/Shanghai';

let timer = null;
let lastRunAt = null;
let lastResult = null;

const snapshotFile = (storeDir) => path.join(storeDir, 'ncreJob.json');

function readSnapshot(storeDir) {
  const f = snapshotFile(storeDir);
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : { announcements: [] };
}

function writeSnapshot(storeDir, snap) {
  fs.mkdirSync(storeDir, { recursive: true });
  fs.writeFileSync(snapshotFile(storeDir), JSON.stringify(snap, null, 2));
}

export function readAnnouncements(storeDir) {
  return readSnapshot(storeDir).announcements || [];
}

export function getJobMeta() {
  return {
    enabled: !!timer,
    cron: CRON,
    timezone: TIMEZONE,
    lastRunAt,
    lastResult,
  };
}

function extractLinks(html, base, keyword) {
  const found = [];
  // 兼容单/双引号属性（neea 用单引号，shmeea 用双引号）
  const re = /<a[^>]+href=["']([^"']+)["'][^>]*>\s*([^<]{4,120}?)\s*<\/a>/g;
  let m;
  while ((m = re.exec(html))) {
    const title = m[2].replace(/\s+/g, '');
    if (!title.includes(keyword)) continue;
    let url;
    try {
      url = new URL(m[1], base).href;
    } catch {
      continue;
    }
    found.push({ title, url });
  }
  return found;
}

export async function runNcreCheck(dataDir, storeDir) {
  lastRunAt = new Date().toISOString();
  const cfg = JSON.parse(fs.readFileSync(path.join(dataDir, 'ncreSources.json'), 'utf8'));
  const prev = readSnapshot(storeDir);
  const known = new Set(prev.announcements.map((a) => a.url));

  const items = [];
  const errors = [];
  for (const src of cfg.sources) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch(src.url, {
        signal: ctrl.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; jszk-site-ncre-tracker)' },
      });
      clearTimeout(t);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      items.push(
        ...extractLinks(await res.text(), src.url, cfg.keyword).map((i) => ({
          ...i,
          source: src.name,
          foundAt: lastRunAt,
        }))
      );
    } catch (e) {
      errors.push(`${src.name}: ${e.message}`);
    }
  }

  // 去重（按 url），新公告排前，最多保留 20 条
  const merged = [];
  const seen = new Set();
  for (const i of [...items, ...prev.announcements]) {
    if (seen.has(i.url)) continue;
    seen.add(i.url);
    merged.push(i);
  }
  writeSnapshot(storeDir, { lastRunAt, announcements: merged.slice(0, 20) });

  const fresh = merged.filter((i) => !known.has(i.url) && i.foundAt === lastRunAt);
  lastResult = errors.length
    ? `检查完成（部分来源失败：${errors.join('；')}），相关公告 ${merged.length} 条，新增 ${fresh.length} 条`
    : `检查完成，相关公告 ${merged.length} 条，新增 ${fresh.length} 条`;
  return { fresh, result: lastResult };
}

export function startNcreJob(dataDir, storeDir, onFresh) {
  timer = cron.schedule(CRON, async () => {
    try {
      const { fresh } = await runNcreCheck(dataDir, storeDir);
      await Promise.all(fresh.map((f) => onFresh(f)));
    } catch (e) {
      lastResult = `任务异常：${e.message}`;
    }
  }, { timezone: TIMEZONE });
  console.log(`NCRE 公告监控已启动（${CRON} ${TIMEZONE}）`);
}
