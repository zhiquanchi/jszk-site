async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const getData = () => fetchJSON('/api/data');
export const getScores = () => fetchJSON('/api/scores');
export const addScore = (record) =>
  fetchJSON('/api/scores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  });
export const deleteScore = (id) => fetchJSON(`/api/scores/${id}`, { method: 'DELETE' });
