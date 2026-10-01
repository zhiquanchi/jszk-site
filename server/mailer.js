import crypto from 'node:crypto';

// 邮件推送：直接调用阿里云 DirectMail API（SingleSendMail，RPC 签名 HMAC-SHA1，无 SDK 依赖）。
// SMTP 通道实测 535（API 创建的发信地址控制台外设密码未生效），API 通道稳定可用。
// DM_ACCESS_KEY_ID / DM_ACCESS_KEY_SECRET / DM_SENDER / DM_TO 任一缺省即视为未配置邮件渠道，
// 通知退回只落盘 + 日志的旧行为，本地开发无需任何凭证。
const API_ENDPOINT = process.env.DM_ENDPOINT || 'https://dm.aliyuncs.com';
const ACCESS_KEY_ID = process.env.DM_ACCESS_KEY_ID;
const ACCESS_KEY_SECRET = process.env.DM_ACCESS_KEY_SECRET;
const SENDER = process.env.DM_SENDER; // 发信地址，如 noreply@mail.zhiquanchi.xyz
const FROM_ALIAS = process.env.DM_FROM_ALIAS || '自考站监控';
const MAIL_TO = process.env.DM_TO; // 通知收件人，多个用英文逗号分隔

export function mailEnabled() {
  return !!(ACCESS_KEY_ID && ACCESS_KEY_SECRET && SENDER && MAIL_TO);
}

// 阿里云 RPC 签名：参数按 key 排序拼接后整体做一次 percentEncode，HMAC-SHA1(key secret + '&')
function signParams(params) {
  const enc = (s) =>
    encodeURIComponent(String(s)).replace(/\+/g, '%20').replace(/\*/g, '%2A').replace(/%7E/g, '~');
  const canonical = Object.keys(params)
    .sort()
    .map((k) => `${enc(k)}=${enc(params[k])}`)
    .join('&');
  return crypto.createHmac('sha1', `${ACCESS_KEY_SECRET}&`).update(`POST&%2F&${enc(canonical)}`).digest('base64');
}

// 发送一封通知邮件；失败抛错由调用方决定如何记录，不影响通知落盘
export async function sendMail(subject, html) {
  if (!mailEnabled()) return { ok: false, skipped: '邮件渠道未配置' };
  const params = {
    Format: 'JSON',
    Version: '2015-11-23',
    AccessKeyId: ACCESS_KEY_ID,
    SignatureMethod: 'HMAC-SHA1',
    SignatureVersion: '1.0',
    SignatureNonce: crypto.randomUUID(),
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    Action: 'SingleSendMail',
    AccountName: SENDER,
    FromAlias: FROM_ALIAS,
    AddressType: '1', // 1 = 发信地址（而非随机帐号）
    ReplyToAddress: 'true',
    ToAddress: MAIL_TO,
    Subject: subject,
    HtmlBody: html,
  };
  const res = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...params, Signature: signParams(params) }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json();
  if (!res.ok || data.Code) {
    throw new Error(`DirectMail ${data.Code || res.status}: ${data.Message || '调用失败'}`);
  }
  return { ok: true, envId: data.EnvId };
}
