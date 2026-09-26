import { useEffect, useState } from 'react';
import { getData, getScores } from './api.js';
import Overview from './views/Overview.jsx';
import Plan from './views/Plan.jsx';
import Policy from './views/Policy.jsx';
import Degree from './views/Degree.jsx';
import Scores from './views/Scores.jsx';

const NAV = [
  { key: 'overview', icon: '📚', label: '总览' },
  { key: 'plan', icon: '📋', label: '考试计划' },
  { key: 'policy', icon: '🧾', label: '免考政策' },
  { key: 'degree', icon: '🎓', label: '学位攻略' },
  { key: 'scores', icon: '✏️', label: '成绩记录' },
];

const currentView = () => location.hash.replace('#/', '').split('?')[0] || 'overview';

export default function App() {
  const [view, setView] = useState(currentView);
  const [data, setData] = useState(null);
  const [scores, setScores] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const onHash = () => setView(currentView());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    Promise.all([getData(), getScores()])
      .then(([d, s]) => {
        setData(d);
        setScores(s);
      })
      .catch((e) => setError(String(e.message || e)));
  }, []);

  const refreshScores = () => getScores().then(setScores).catch(() => {});

  if (error) {
    return <div className="page-msg">加载失败：{error}（请确认 Express 后端已启动）</div>;
  }
  if (!data) {
    return <div className="page-msg">加载中…</div>;
  }

  const { meta, courses, policies, degree } = data;

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-badge">{meta.code}</div>
          <h1>
            江苏自考
            <br />
            计算机科学与技术
          </h1>
          <p className="brand-sub">
            专升本 · {meta.plan}
            <br />
            主考：{meta.school}
          </p>
        </div>
        <nav className="nav">
          {NAV.map((n) => (
            <a key={n.key} href={`#/${n.key}`} className={view === n.key ? 'active' : ''}>
              <span className="nav-ico">{n.icon}</span>
              {n.label}
            </a>
          ))}
        </nav>
        <div className="sidebar-foot">
          个人学习资料站
          <br />
          数据以省考试院最新公告为准
        </div>
      </aside>
      <main className="main">
        {view === 'overview' && (
          <Overview meta={meta} courses={courses} degree={degree} scores={scores} />
        )}
        {view === 'plan' && <Plan courses={courses} />}
        {view === 'policy' && <Policy policies={policies} />}
        {view === 'degree' && <Degree degree={degree} />}
        {view === 'scores' && (
          <Scores courses={courses} scores={scores} onRefresh={refreshScores} />
        )}
      </main>
    </div>
  );
}
