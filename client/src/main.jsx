import { createRoot } from 'react-dom/client';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { ConfigProvider, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App.jsx';
import './styles.css';

dayjs.locale('zh-cn');

createRoot(document.getElementById('root')).render(
  <ConfigProvider
    locale={zhCN}
    theme={{ token: { colorPrimary: '#4f46e5', borderRadius: 8 } }}
  >
    <AntApp>
      <App />
    </AntApp>
  </ConfigProvider>
);
