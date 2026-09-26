import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 下载 tesseract.js OCR 语言包（简体中文 + 英文）到 web/tessdata/
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'tessdata');
fs.mkdirSync(dir, { recursive: true });

for (const lang of ['chi_sim', 'eng']) {
  const dest = path.join(dir, `${lang}.traineddata.gz`);
  if (fs.existsSync(dest)) {
    console.log(`已存在：${dest}`);
    continue;
  }
  const url = `https://tessdata.projectnaptha.com/4.0.0/${lang}.traineddata.gz`;
  console.log(`下载 ${url} …`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`下载失败：HTTP ${res.status}（${url}）`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  console.log(`完成：${dest}`);
}
console.log('OCR 语言包就绪。');
