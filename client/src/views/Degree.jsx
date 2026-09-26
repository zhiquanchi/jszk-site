import { useEffect, useState } from 'react';

const STORE_KEY = 'jszk-degree-actions-v1';

export default function Degree({ degree }) {
  const [done, setDone] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(STORE_KEY, JSON.stringify(done));
  }, [done]);

  const doneCount = degree.actions.filter((_, i) => done[i]).length;

  return (
    <div>
      <header className="page-head">
        <h2>学位攻略</h2>
        <p className="page-desc">主考院校：{degree.school} · 目标：工学学士学位</p>
      </header>

      <h3 className="section-title">📏 申请条件</h3>
      <section className="req-grid">
        {degree.requirements.map((r) => (
          <div className="req-card" key={r.t}>
            <span
              className={`tag tag-${r.tag === '硬指标' ? 'must' : r.tag === '替代' ? 'alt' : 'time'}`}
            >
              {r.tag}
            </span>
            <h4>{r.t}</h4>
            <p>{r.d}</p>
          </div>
        ))}
      </section>

      <h3 className="section-title">📖 必须实考的学位课程</h3>
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>代码</th>
              <th>课程</th>
              <th>学分</th>
              <th>分数目标</th>
            </tr>
          </thead>
          <tbody>
            {degree.degreeCourses.map((c) => (
              <tr key={c.code}>
                <td className="mono">{c.code}</td>
                <td>{c.name}</td>
                <td>{c.credits}</td>
                <td>
                  <b>{c.target}</b>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card strategy">
        <h4>🇬🇧 英语策略</h4>
        <p>{degree.englishStrategy}</p>
      </div>

      <h3 className="section-title">🚫 红线（碰了就没学位）</h3>
      <div className="card warn">
        <ul className="plain-list">
          {degree.redLines.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>

      <h3 className="section-title">
        ✅ 行动清单<span className="section-sub">{doneCount}/{degree.actions.length} 已完成</span>
      </h3>
      <div className="card">
        <ul className="check-list">
          {degree.actions.map((a, i) => (
            <li key={a} className={done[i] ? 'done' : ''}>
              <label>
                <input
                  type="checkbox"
                  checked={!!done[i]}
                  onChange={() => setDone((d) => ({ ...d, [i]: !d[i] }))}
                />
                <span>{a}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
