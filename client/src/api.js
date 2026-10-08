import { clearSession, getToken, requestAuth } from './auth.js';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

async function fetchJSON(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token && WRITE_METHODS.has(method)) headers['X-Auth-Token'] = token;

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401 || res.status === 429) {
    // 票据失效/被限流：清掉本地票据并让 App 弹出验证面板（429 时面板会显示原因）
    if (res.status === 401) clearSession();
    if (url !== '/api/auth/verify') requestAuth();
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || '需要验证');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const getData = () => fetchJSON('/api/data');
export const getScores = () => fetchJSON('/api/scores');
export const getNcre = () => fetchJSON('/api/ncre');
// 用验证器 App 的 6 位动态码换会话票据
export const verifyCode = (code) =>
  fetchJSON('/api/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
export const runNcreCheck = () => fetchJSON('/api/ncre/run', { method: 'POST' });
export const addScore = (record) =>
  fetchJSON('/api/scores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  });
export const bulkAddScores = (items) =>
  fetchJSON('/api/scores/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(items),
  });
export const deleteScore = (id) => fetchJSON(`/api/scores/${id}`, { method: 'DELETE' });
export const parseScore = (formData) =>
  fetchJSON('/api/scores/parse', { method: 'POST', body: formData });