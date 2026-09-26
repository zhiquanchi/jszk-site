export default function Policy({ policies }) {
  const effectChip = {
    bad: { label: '⛔ 学位风险', cls: 'chip never' },
    special: { label: '⚡ 特殊路径', cls: 'chip caution' },
    none: { label: '➖ 与本专业无关', cls: 'chip' },
    mid: { label: '• 视对应目录', cls: 'chip ok' },
  };

  return (
    <div>
      <header className="page-head">
        <h2>免考政策</h2>
        <p className="page-desc">江苏省教育考试院免考实施细则 · 2026 年现行口径</p>
      </header>

      <h3 className="section-title">{policies.cert.title}</h3>
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>持有的证书</th>
              <th>可免课程</th>
              <th>对学位的影响</th>
            </tr>
          </thead>
          <tbody>
            {policies.cert.rows.map((r) => (
              <tr key={r.cert}>
                <td>{r.cert}</td>
                <td className="mono">{r.course}</td>
                <td>
                  <div>
                    <span className={effectChip[r.effect].cls}>{effectChip[r.effect].label}</span>
                  </div>
                  <div className="note-cell">{r.note}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="section-title">{policies.edu.title}</h3>
      <div className="card">
        <ul className="plain-list">
          {policies.edu.rules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>

      <h3 className="section-title">⚠️ {policies.restrictions.title}</h3>
      <div className="card warn">
        <ul className="plain-list">
          {policies.restrictions.items.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>

      <h3 className="section-title">📥 {policies.process.title}</h3>
      <section className="req-grid">
        {policies.process.items.map((p) => (
          <div className="req-card" key={p.k}>
            <h4>{p.k}</h4>
            <p>{p.v}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
