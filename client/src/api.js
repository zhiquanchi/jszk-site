import { getToken, requestToken } from './auth.js';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

async function fetchJSON(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token && WRITE_METHODS.has(method)) headers['X-Auth-Token'] = token;

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    requestToken(); // 让 App 弹出「写入密钥」输入框
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || '需要写入密钥');
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