// 写入验证状态：验证器 App（TOTP）动态码在服务端换取「会话票据」后存在这里。
// 票据是服务端签名、自带过期时间的字符串（不是密钥本身），随写请求以 X-Auth-Token 头发送。
// 旧的静态写入密钥（ADMIN_TOKEN）已废弃，这里会主动清掉遗留值。
const SESSION_KEY = 'jszk-session-v1';
const LEGACY_KEY = 'jszk-write-token';

let current = null;
const listeners = new Set();

function parse(raw) {
  try {
    const v = JSON.parse(raw || 'null');
    if (v?.token && Number.isFinite(v.expiresAt) && v.expiresAt > Date.now()) return v;
  } catch {
    /* 坏数据当未登录 */
  }
  return null;
}

try {
  localStorage.removeItem(LEGACY_KEY);
} catch {
  /* 隐私模式下 localStorage 不可用 */
}

current = (() => {
  try {
    return parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
})();

function emit() {
  for (const fn of listeners) fn();
}

// 票据过期即视为未登录（返回稳定引用，供 useSyncExternalStore 使用）
export function getSession() {
  return current && current.expiresAt > Date.now() ? current : null;
}

export const getToken = () => getSession()?.token || '';

export function setSession(session) {
  current = session;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* 忽略写入失败，内存态仍可用 */
  }
  emit();
}

export function clearSession() {
  current = null;
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* 忽略 */
  }
  emit();
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// 票据到期时让界面自己回到「未解锁」（App 里每分钟调一次）
export function refreshSession() {
  const next = getSession();
  if (!!next !== !!current) {
    current = next;
    emit();
  }
}

// 写请求被拒（401）时广播，由 App 弹出验证面板
export const NEED_AUTH_EVENT = 'jszk:need-auth';
export const requestAuth = () => window.dispatchEvent(new CustomEvent(NEED_AUTH_EVENT));