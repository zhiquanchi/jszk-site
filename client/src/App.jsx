import { useEffect, useState } from 'react';
import { Layout, Menu, App as AntApp } from 'antd';
import {
  AppstoreOutlined,
  ProfileOutlined,
  FileDoneOutlined,
  TrophyOutlined,
  FormOutlined,
  SwapOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { getData, getScores, getNcre } from './api.js';
import Overview from './views/Overview.jsx';
import Plan from './views/Plan.jsx';
import Exemption from './views/Exemption.jsx';
import Degree from './views/Degree.jsx';
import Scores from './views/Scores.jsx';
import CodeChanges from './views/CodeChanges.jsx';
import Ncre from './views/Ncre.jsx';

const NAV = [
  { key: 'overview', icon: <AppstoreOutlined />, label: '总览' },
  { key: 'plan', icon: <ProfileOutlined />, label: '考试计划' },
  { key: 'exemption', icon: <FileDoneOutlined />, label: '免考中心' },
  { key: 'degree', icon: <TrophyOutlined />, label: '学位攻略' },
  { key: 'scores', icon: <FormOutlined />, label: '成绩记录' },
  { key: 'ncre', icon: <CalendarOutlined />, label: 'NCRE 报名' },
  { key: 'codechanges', icon: <SwapOutlined />, label: '代码变更' },
];

const currentView = () => location.hash.replace('#/', '').split('?')[0] || 'overview';

export default function App() {
  const { message } = AntApp.useApp();
  const [view, setView] = useState(currentView);
  const [data, setData] = useState(null);
  const [scores, setScores] = useState([]);
  const [ncre, setNcre] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const onHash = () => setView(currentView());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    Promise.all([getData(), getScores(), getNcre()])
      .then(([d, s, n]) => {
        setData(d);
        setScores(s);
        setNcre(n);
      })
      .catch((e) => setError(String(e.message || e)));
  }, []);

  const refreshScores = () =>
    getScores()
      .then(setScores)
      .catch(() => message.error('刷新成绩失败'));

  const refreshNcre = () =>
    getNcre()
      .then(setNcre)
      .catch(() => {});

  if (error) return <div className="page-msg">加载失败：{error}（请确认 Express 后端已启动）</div>;
  if (!data) return <div className="page-msg">加载中…</div>;

  const { meta, courses, policies, degree, codeChanges } = data;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout.Sider width={232} theme="light" className="sider">
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
        <Menu
          mode="inline"
          items={NAV}
          selectedKeys={[view]}
          onClick={({ key }) => {
            location.hash = `#/${key}`;
            setView(key);
          }}
          style={{ borderInlineEnd: 'none' }}
        />
        <div className="sidebar-foot">
          个人学习资料站
          <br />
          数据以省考试院最新公告为准
        </div>
      </Layout.Sider>
      <Layout.Content className="main">
        {view === 'overview' && (
          <Overview meta={meta} courses={courses} degree={degree} scores={scores} />
        )}
        {view === 'plan' && <Plan courses={courses} />}
        {view === 'exemption' && <Exemption courses={courses} policies={policies} />}
        {view === 'degree' && <Degree degree={degree} />}
        {view === 'scores' && <Scores courses={courses} scores={scores} onRefresh={refreshScores} />}
        {view === 'ncre' && ncre && <Ncre ncre={ncre} onRefresh={refreshNcre} />}
        {view === 'codechanges' && <CodeChanges codeChanges={codeChanges} />}
      </Layout.Content>
    </Layout>
  );
}
