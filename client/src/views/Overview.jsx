export default function Overview({ meta, courses, degree, scores }) {
  const totalCredits = courses.reduce((s, c) => s + c.credits, 0);
  const degreeCount = courses.filter((c) => c.degree).length;
  const practiceCount = courses.filter((c) => c.practice).length;
  const recorded = new Set(scores.map((s) => s.code)).size;

  const stats = [
    { label: '课程总门数', value: courses.length, unit: '门' },
    { label: '总学分', value: totalCredits, unit: '分' },
    { label: '学位课程', value: degreeCount, unit: '门' },
    { label: '实践课', value: practiceCount, unit: '门' },
    { label: '已录成绩', value: recorded, unit: `/${courses.length} 门` },
  ];

  const conclusions = [
    {
      tone: 'ok',
      title: '✅ 可以放心免考（不影响学位）',
      items: [
        '三门政治课：15040 / 15043 / 15044（走学历免考）',
        '高等数学（工本）：数学类专科以上毕业可免',
        '非学位专业课：离散数学、高级语言程序设计、软件工程、互联网软件应用与开发、数据库系统原理、Java、计算机网络与信息安全 —— 须原学历同名课程成绩合格',
      ],
    },
    {
      tone: 'caution',
      title: '⚠️ 谨慎：英语（专升本）13000',
      items: [
        '默认别免 —— 实考冲 70 分以上',
        '唯一例外：有效期内 CET-4/6 可替代学位英语，「免考＋证书」组合先电话南航自考办确认',
        '用 PETS-3 免考 ＝ 学位英语断线，绝对别走',
      ],
    },
    {
      tone: 'never',
      title: '⛔ 不能免 / 免了丢学位',
      items: [
        '四门学位课程：13000 英语、13003 数据结构与算法、13015 计算机系统原理、13180 操作系统',
        `全部实践课 ${practiceCount} 门（须主考院校实做考核）`,
        '毕业设计 14976（成绩须良好以上）',
      ],
    },
  ];

  const reminders = [
    {
      icon: '🗓️',
      t: '2026 下半年免考窗口',
      d: '9 月前后（通告已于 8 月底发布）—— 立即核对是否截止；错过则等 2027 上半年（预计 3 月初）',
    },
    { icon: '⏳', t: '免考时限', d: '必须在申请毕业前至少半年办完' },
    { icon: '🎓', t: '学位申请时限', d: '取得毕业证书后一年内提交' },
  ];

  return (
    <div>
      <header className="page-head">
        <h2>总览</h2>
        <p className="page-desc">
          {meta.major} · {meta.degreeName} · 数据整理于 {meta.updated}
        </p>
      </header>

      <section className="stat-grid">
        {stats.map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="stat-value">
              {s.value}
              <small>{s.unit}</small>
            </div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </section>

      <h3 className="section-title">🎯 南航学位申请硬指标</h3>
      <section className="req-grid">
        {degree.requirements.map((r) => (
          <div className="req-card" key={r.t}>
            <span className={`tag tag-${r.tag === '硬指标' ? 'must' : r.tag === '替代' ? 'alt' : 'time'}`}>
              {r.tag}
            </span>
            <h4>{r.t}</h4>
            <p>{r.d}</p>
          </div>
        ))}
      </section>

      <h3 className="section-title">🧭 免考决策速览（想拿学位怎么免）</h3>
      <section className="conclusion-grid">
        {conclusions.map((c) => (
          <div className={`card conclusion ${c.tone}`} key={c.title}>
            <h4>{c.title}</h4>
            <ul>
              {c.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <h3 className="section-title">⏰ 关键时间</h3>
      <section className="card">
        <ul className="plain-list">
          {reminders.map((r) => (
            <li key={r.t}>
              <b>
                {r.icon} {r.t}
              </b>
              ：{r.d}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
