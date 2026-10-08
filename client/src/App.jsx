import { lazy, Suspense, useEffect, useState } from 'react';
import { Button, Layout, Menu, App as AntApp } from 'antd';
import {
  AppstoreOutlined,
  ProfileOutlined,
  FileDoneOutlined,
  TrophyOutlined,
  FormOutlined,
  SwapOutlined,
  CalendarOutlined,
  DashboardOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import { getData, getScores, getNcre } from './api.js';
import { NEED_TOKEN_EVENT } from './auth.js';
import ErrorBoundary from './ErrorBoundary.jsx';

// 默认落地页（总览）静态引入，首屏无需再等一次异步请求；其余视图按需加载
import Overview from './views/Overview.jsx';

const StudyBoard = lazy(() => import('./views/StudyBoard.jsx'));
const Plan = lazy(() => import('./views/Plan.jsx'));
const Exemption = lazy(() => import('./views/Exemption.jsx'));
const Degree = lazy(() => import('./views/Degree.jsx'));
const Scores = lazy(() => import('./views/Scores.jsx'));
const Ncre = lazy(() => import('./views/Ncre.jsx'));
const CodeChanges = lazy(() => import('./views/CodeChanges.jsx'));
const TokenModal = lazy(() => import('./TokenModal.jsx'));

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
  const [tokenOpen, setTokenOpen] = useState(false);

  useEffect(() => {
    const onHash = () => setView(currentView());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // 写请求遇到 401 时 api.js 会广播，这里把密钥输入框弹出来
  useEffect(() => {
    const onNeedToken = () => setTokenOpen(true);
    window.addEventListener(NEED_TOKEN_EVENT, onNeedToken);
    return () => window.removeEventListener(NEED_TOKEN_EVENT, onNeedToken);
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
          <Button
            size="small"
            type="text"
            className="key-btn"
            icon={<KeyOutlined />}
            onClick={() => setTokenOpen(true)}
          >
            写入密钥
          </Button>
          <div>{meta.code} · 主考：南京航空航天大学</div>
        </div>
      </Layout.Sider>
      <Layout>
        <Layout.Content className="main">
          {/* key=view：切换页面自动复位错误状态，一个页面崩了不影响其他页面 */}
          <ErrorBoundary key={view}>
            <Suspense fallback={<div className="page-msg">加载中…</div>}>
              {view === 'overview' && (
                <Overview meta={meta} courses={courses} degree={degree} scores={scores} />
              )}
              {view === 'studyboard' && <StudyBoard courses={courses} scores={scores} />}
              {view === 'plan' && <Plan courses={courses} />}
              {view === 'exemption' && <Exemption courses={courses} policies={policies} />}
              {view === 'degree' && <Degree degree={degree} />}
              {view === 'scores' && (
                <Scores degree={degree} courses={courses} scores={scores} onRefresh={refreshScores} />
              )}
              {view === 'ncre' && ncre && <Ncre ncre={ncre} onRefresh={refreshNcre} />}
              {view === 'codechanges' && <CodeChanges codeChanges={codeChanges} />}
            </Suspense>
          </ErrorBoundary>
        </Layout.Content>
        <Layout.Footer className="foot">
          个人学习资料站 · 数据以江苏省教育考试院最新公告为准 · 整理于 {meta.updated}
        </Layout.Footer>
      </Layout>
      {tokenOpen && (
        <Suspense fallback={null}>
          <TokenModal open onClose={() => setTokenOpen(false)} />
        </Suspense>
      )}
    </Layout>
  );
}