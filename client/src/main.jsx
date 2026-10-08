import { createRoot } from 'react-dom/client';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { ConfigProvider, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App.jsx';
import './styles.css';

dayjs.locale('zh-cn');

// 视图按需分包后，「部署了新版本、但浏览器里还开着旧版本页面」的情况下，
// 旧页面里记着的 chunk 文件名在新版本里已不存在，切换视图会加载失败。
// Vite 会为此派发 vite:preloadError，这里刷新一次取回新版本（带防循环保护）。
const RELOAD_GUARD = 'jszk-preload-reloaded';
window.addEventListener('vite:preloadError', () => {
  if (sessionStorage.getItem(RELOAD_GUARD)) return;
  sessionStorage.setItem(RELOAD_GUARD, String(Date.now()));
  window.location.reload();
});

createRoot(document.getElementById('root')).render(
  <ConfigProvider
    locale={zhCN}
    theme={{ token: { colorPrimary: '#1677ff', borderRadius: 8 } }}
  >
    <AntApp>
      <App />
    </AntApp>
  </ConfigProvider>
);

// 本次加载成功（入口脚本已执行），解除刷新保护，下次版本更新还能再刷一次
sessionStorage.removeItem(RELOAD_GUARD);
