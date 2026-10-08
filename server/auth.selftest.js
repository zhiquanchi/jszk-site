// TOTP 实现的自测：用 RFC 4226 / RFC 6238 官方向量校验，另测票据签发/篡改/过期。
// 运行：node server/auth.selftest.js
import assert from 'node:assert/strict';
import { base32Decode, base32Encode, createAuth, generateSecret, hotp, totp, verifyCode } from './auth.js';

// RFC 测试用的密钥是 ASCII "12345678901234567890"，其 base32 编码如下
const RFC_KEY_B32 = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

// base32 往返
assert.equal(base32Decode(RFC_KEY_B32).toString(), '12345678901234567890');
assert.equal(base32Encode(Buffer.from('12345678901234567890')), RFC_KEY_B32);

// RFC 4226 附录 D 的 HOTP 向量（counter 0–9）
const hotpVectors = [
  [0, '755224'], [1, '287082'], [2, '359152'], [3, '969429'], [4, '338314'],
  [5, '254676'], [6, '287922'], [7, '162583'], [8, '399871'], [9, '520489'],
];
const key = base32Decode(RFC_KEY_B32);
for (const [counter, expected] of hotpVectors) {
  assert.equal(hotp(key, counter), expected, `HOTP counter=${counter} 应为 ${expected}`);
}

// RFC 6238 附录 B 的 TOTP 向量（SHA-1，取 8 位结果的后 6 位即 6 位码）
const totpVectors = [
  [59, '94287082'], [1111111109, '07081804'], [1111111111, '14050471'],
  [1234567890, '89005924'], [2000000000, '69279037'], [20000000000, '65353130'],
];
for (const [t, eight] of totpVectors) {
  const at = t * 1000;
  assert.equal(totp(RFC_KEY_B32, { at, digits: 8 }), eight, `TOTP T=${t} 8 位应为 ${eight}`);
  assert.equal(totp(RFC_KEY_B32, { at }), eight.slice(-6), `TOTP T=${t} 6 位应为 ${eight.slice(-6)}`);
}

// 校验：本步通过、相邻一步（时钟偏移）通过、跨越窗口外失败、非数字/空值失败
const at = 1234567890 * 1000;
const step = 30;
assert.equal(verifyCode(totp(RFC_KEY_B32, { at }), RFC_KEY_B32, { at }), true);
assert.equal(verifyCode(totp(RFC_KEY_B32, { at: at + step * 1000 }), RFC_KEY_B32, { at }), true);
assert.equal(verifyCode(totp(RFC_KEY_B32, { at: at + step * 2000 }), RFC_KEY_B32, { at }), false);
assert.equal(verifyCode(totp(RFC_KEY_B32, { at: at - step * 2000 }), RFC_KEY_B32, { at }), false);
assert.equal(verifyCode('abcdef', RFC_KEY_B32, { at }), false);
assert.equal(verifyCode('', RFC_KEY_B32, { at }), false);
assert.equal(verifyCode('28708', RFC_KEY_B32, { at }), false, '位数不足应失败');

// 会话票据：签发可用、过期失效、篡改失效、换密钥失效
const auth = createAuth({ secret: generateSecret(), ttlMs: 60_000 });
const now = Date.now();
const session = auth.issueSession(now);
assert.ok(session.token.includes('.'), '票据应含签名段');
assert.equal(auth.verifySession(session.token, now + 1000)?.expiresAt, session.expiresAt);
assert.equal(auth.verifySession(session.token, session.expiresAt + 1), null, '过期票据应失效');
const [payload, mac] = session.token.split('.');
const flip = (s) => (s[0] === 'A' ? 'B' : 'A') + s.slice(1);
assert.equal(auth.verifySession(`${payload}.${flip(mac)}`, now), null, '篡改签名应失效');
assert.equal(auth.verifySession(`${Number(payload) + 1}.${mac}`, now), null, '篡改过期时间应失效');
assert.equal(auth.verifySession('abc.def', now), null);
assert.equal(auth.verifySession('', now), null);
const other = createAuth({ secret: generateSecret(), ttlMs: 60_000 });
assert.equal(other.verifySession(session.token, now), null, '换密钥后旧票据应失效');

// otpauth 地址形状
const uri = auth.otpauthUri('chase.zhi');
assert.match(uri, /^otpauth:\/\/totp\/jszk-site:chase\.zhi\?secret=[A-Z2-7]+&issuer=jszk-site&algorithm=SHA1&digits=6&period=30$/);

console.log('✓ auth.selftest 全部通过（RFC 4226 HOTP 向量、RFC 6238 TOTP 向量、窗口偏移、票据过期/篡改/换密钥）');