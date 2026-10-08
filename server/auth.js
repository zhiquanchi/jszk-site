import crypto from 'node:crypto';

// 写入接口的身份验证：TOTP 动态码（RFC 6238，Google Authenticator 式 6 位码，每 30 秒一换）
// + 验证通过后颁发的会话票据（签名自带过期时间，避免每次写操作都去读验证器）。
// 零依赖：base32 解码、HOTP/TOTP、票据签名全部用 node:crypto 实现。
// 正确性由 auth.selftest.js 用 RFC 4226 / RFC 6238 官方向量校验。

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Decode(input) {
  const s = String(input || '')
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/=+$/, '');
  if (!s) throw new Error('空的 base32 密钥');
  let bits = 0;
  let value = 0;
  const out = [];
  for (const ch of s) {
    const idx = BASE32.indexOf(ch);
    if (idx < 0) throw new Error(`base32 密钥含非法字符：${ch}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function base32Encode(buf) {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

// 生成新的 base32 密钥（默认 20 字节 = 160 bit，与 Google 派系一致的强度）
export function generateSecret(bytes = 20) {
  return base32Encode(crypto.randomBytes(bytes));
}

// RFC 4226 HOTP
export function hotp(key, counter, digits = 6) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const mac = crypto.createHmac('sha1', key).update(msg).digest();
  const offset = mac[mac.length - 1] & 0x0f;
  const bin =
    ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  return String(bin % 10 ** digits).padStart(digits, '0');
}

// RFC 6238 TOTP：counter = floor(unix 秒 / step)
export function totp(secret, { at = Date.now(), step = 30, digits = 6 } = {}) {
  return hotp(base32Decode(secret), Math.floor(at / 1000 / step), digits);
}

function codeMatches(given, expected) {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// 校验动态码：允许前后各 window 个时间步（容忍手机与服务端的时钟偏移）
export function verifyCode(code, secret, { at = Date.now(), step = 30, digits = 6, window = 1 } = {}) {
  const given = String(code || '').replace(/\D/g, '');
  if (given.length !== digits) return false;
  const key = base32Decode(secret);
  const counter = Math.floor(at / 1000 / step);
  for (let i = -window; i <= window; i++) {
    if (codeMatches(given, hotp(key, counter + i, digits))) return true;
  }
  return false;
}

// 服务端用的封装：密钥解析、票据签发/校验只做一次
export function createAuth({ secret, step = 30, digits = 6, window = 1, ttlMs = 12 * 3600 * 1000 }) {
  const key = base32Decode(secret);
  // 票据签名密钥从 TOTP 密钥派生一层，不复用原始密钥本身
  const signKey = crypto.createHmac('sha256', key).update('jszk-session-v1').digest();
  const sign = (payload) => crypto.createHmac('sha256', signKey).update(payload).digest('base64url');

  return {
    digits,
    step,
    ttlMs,
    verifyCode: (code, at = Date.now()) => verifyCode(code, secret, { at, step, digits, window }),
    // 票据格式：<过期时间戳>.<HMAC>，无状态、服务端不存表
    issueSession: (now = Date.now()) => {
      const payload = String(now + ttlMs);
      return { token: `${payload}.${sign(payload)}`, expiresAt: Number(payload) };
    },
    verifySession: (token, now = Date.now()) => {
      const [payload, mac] = String(token || '').split('.');
      if (!payload || !mac) return null;
      if (!codeMatches(mac, sign(payload))) return null;
      const expiresAt = Number(payload);
      if (!Number.isFinite(expiresAt) || expiresAt <= now) return null;
      return { expiresAt };
    },
    // 供验证器 App 扫码/手动录入的地址
    otpauthUri: (account, issuer = 'jszk-site') =>
      `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}` +
      `?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${digits}&period=${step}`,
  };
}