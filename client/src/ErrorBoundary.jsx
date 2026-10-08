import { Component } from 'react';
import { Alert, Button, Space } from 'antd';

// 单个视图崩溃不再拖垮整棵树（此前一个漏导入的组件让全站白屏）。
// App 里用 key={view} 挂载，切换页面即自动复位。
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[页面异常]', error, info);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <Alert
        type="error"
        showIcon
        message="这个页面出错了，其他页面不受影响"
        description={
          <Space direction="vertical" size={8}>
            <span style={{ wordBreak: 'break-all' }}>{String(error?.message || error)}</span>
            <Button size="small" onClick={() => this.setState({ error: null })}>
              重试
            </Button>
          </Space>
        }
      />
    );
  }
}