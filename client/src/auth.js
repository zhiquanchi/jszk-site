// 写入密钥：用户从服务端 ADMIN_TOKEN 抄来，存在浏览器本地，
// 只在写请求（POST/DELETE）里以 X-Auth-Token 头发给服务端，不进代码仓库、不进构建产物。
const KEY = 'jszk-write-token';

export function getToken() {
  try {
    return localStorage.getItem(KEY) || '';
  } catch {
    return '';
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(KEY, token);
    else localStorage.removeItem(KEY);
  } catch {
    /* 隐私模式下 localStorage 不可用，忽略 */
  }
}

// 服务端返回 401 时广播，由 App 弹出密钥输入框
export const NEED_TOKEN_EVENT = 'jszk:need-token';
export const requestToken = () => window.dispatchEvent(new CustomEvent(NEED_TOKEN_EVENT));