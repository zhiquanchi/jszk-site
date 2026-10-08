import fs from 'node:fs';
import path from 'node:path';

// 可变数据（成绩/通知/NCRE）的读写。
// 写入一律「临时文件 + rename」：rename 在同一文件系统内是原子的，
// 进程若在写一半时被杀（容器重启、OOM），旧文件仍完整，不会留下截断的 JSON。

export function readJson(file, fallback = null) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function writeJsonAtomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

// 读-改-写一次的便捷封装
export function updateJson(file, fallback, updater) {
  const next = updater(readJson(file, fallback));
  writeJsonAtomic(file, next);
  return next;
}