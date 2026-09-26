import { useState } from 'react';
import { addScore, deleteScore } from '../api.js';

const DEGREE_CODES = ['13000', '13003', '13015', '13180'];
const threeBestAvg = (scores) => {
  const best = (code) =>
    Math.max(
      -1,
      ...scores.filter((s) => s.code === code && s.category === '笔试').map((s) => s.score)
    );
  const eng = best('13000');
  const bests = ['13003', '13015', '13180'].map(best);
  const avg = bests.every((v) => v >= 0)
    ? Math.round((bests.reduce((a, b) => a + b, 0) / 3) * 10) / 10
    : null;
  return { eng, avg };
};

export default function Scores({ courses, scores, onRefresh }) {
  const [form, setForm] = useState({
    code: '',
    score: '',
    category: '笔试',
    date: new Date().toISOString().slice(0, 10),
    note: '',
  });
  const [msg, setMsg] = useState('');

  const courseName = (code) => courses.find((c) => c.code === code)?.name || code;
  const { eng, avg } = threeBestAvg(scores);

  const submit = async (e) => {
    e.preventDefault();
    const score = Number(form.score);
    if (!form.code) return setMsg('请选择课程');
    if (!form.score || Number.isNaN(score) || score < 0 || score > 100)
      return setMsg('请输入 0–100 的分数');
    setMsg('');
    try {
      await addScore({ ...form, score: Math.round(score) });
      setForm((f) => ({ ...f, score: '', note: '' }));
      onRefresh();
    } catch (err) {
      setMsg(`提交失败：${err.message}`);
    }
  };

  const remove = async (id) => {
    await deleteScore(id);
    onRefresh();
  };

  const degCard = (title, value, pass) => ({
    title,
    value,
    pass,
  });
  const degreeCards = [
    degCard('英语 13000', eng >= 0 ? `${eng} 分` : '未录入', eng >= 70),
    degCard('三门学位课均分', avg !== null ? `${avg} 分` : '未录齐', avg !== null && avg >= 70),
  ];

  return (
    <div>
      <header className="page-head">
        <h2>成绩记录</h2>
        <p className="page-desc">已录 {scores.length} 条 · 数据保存在服务端 data/scores.json</p>
      </header>

      <h3 className="section-title">🎯 学位课程进度</h3>
      <section className="stat-grid two">
        {degreeCards.map((c) => (
          <div className={`stat-card ${c.pass === true ? 'pass' : c.pass === false ? 'fail' : ''}`} key={c.title}>
            <div className="stat-value">
              {c.value}
              {c.pass !== null && <small>{c.pass ? ' ✓ 达标' : ' 未达标'}</small>}
            </div>
            <div className="stat-label">{c.title}</div>
          </div>
        ))}
      </section>

      <h3 className="section-title">➕ 录入成绩</h3>
      <form className="card form-grid" onSubmit={submit}>
        <label>
          课程
          <select value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}>
            <option value="">— 选择课程 —</option>
            {courses.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} {c.name}
                {c.degree ? ' ★' : ''}
              </option>
            ))}
          </select>
        </label>
        <label>
          分数
          <input
            type="number"
            min="0"
            max="100"
            value={form.score}
            onChange={(e) => setForm({ ...form, score: e.target.value })}
            placeholder="0–100"
          />
        </label>
        <label>
          类型
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option>笔试</option>
            <option>实践</option>
            <option>论文</option>
          </select>
        </label>
        <label>
          日期
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </label>
        <label className="span2">
          备注
          <input
            type="text"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="如：2026 年 4 月考期 / 主考院校实践考核"
          />
        </label>
        <button className="btn" type="submit">
          保存
        </button>
        {msg && <div className="form-msg span2">{msg}</div>}
      </form>

      <h3 className="section-title">📒 成绩列表</h3>
      <div className="card table-wrap">
        {scores.length === 0 ? (
          <div className="empty">还没有成绩记录，考完一门就上来记一笔吧</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>日期</th>
                <th>课程</th>
                <th>类型</th>
                <th>分数</th>
                <th>备注</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...scores].reverse().map((s) => (
                <tr key={s.id}>
                  <td className="mono">{s.date}</td>
                  <td>
                    <span className="mono">{s.code}</span> {courseName(s.code)}
                    {DEGREE_CODES.includes(s.code) && <span className="badge g-degree">★</span>}
                  </td>
                  <td>{s.category}</td>
                  <td>
                    <b className={s.score >= 70 ? 'score-pass' : 'score-low'}>{s.score}</b>
                  </td>
                  <td className="note-cell">{s.note}</td>
                  <td>
                    <button className="btn-link" onClick={() => remove(s.id)}>
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
