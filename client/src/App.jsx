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
  DashboardOutlined,
} from '@ant-design/icons';
import { getData, getScores, getNcre } from './api.js';
import Overview from './views/Overview.jsx';
import Plan from './views/Plan.jsx';
import Exemption from './views/Exemption.jsx';
import Degree from './views/Degree.jsx';
import Scores from './views/Scores.jsx';
import CodeChanges from './views/CodeChanges.jsx';
import Ncre from './views/Ncre.jsx';
import StudyBoard from './views/StudyBoard.jsx';

const NAV = [
  { key: 'overview', icon: <AppstoreOutlined />, label: '总览' },
  { key: 'studyboard', icon: <DashboardOutlined />, label: '学习清单' },
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
      <Layout.Sider theme="dark" width={220} breakpoint="lg" collapsedWidth={64} className="sider">
        <div className="brand">
          <div className="brand-logo">考</div>
          <div className="brand-text">
            <div className="brand-title">自考资料站</div>
            <div className="brand-sub">计算机科学与技术 · 专升本</div>
          </div>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[view]}
          items={NAV}
          onClick={({ key }) => {
            location.hash = `#/${key}`;
            setView(key);
          }}
          style={{ borderInlineEnd: 'none' }}
        />
        <div className="sider-foot">
          {meta.code} · 主考：南京航空航天大学
        </div>
      </Layout.Sider>
      <Layout>
        <Layout.Content className="main">
          {view === 'overview' && (
            <Overview meta={meta} courses={courses} degree={degree} scores={scores} />
          )}
          {view === 'studyboard' && <StudyBoard courses={courses} scores={scores} />}
          {view === 'plan' && <Plan courses={courses} />}
          {view === 'exemption' && <Exemption courses={courses} policies={policies} />}
          {view === 'degree' && <Degree degree={degree} />}
          {view === 'scores' && <Scores courses={courses} scores={scores} onRefresh={refreshScores} />}
          {view === 'ncre' && ncre && <Ncre ncre={ncre} onRefresh={refreshNcre} />}
          {view === 'codechanges' && <CodeChanges codeChanges={codeChanges} />}
        </Layout.Content>
        <Layout.Footer className="foot">
          个人学习资料站 · 数据以江苏省教育考试院最新公告为准 · 整理于 {meta.updated}
        </Layout.Footer>
      </Layout>
    </Layout>
  );
}
