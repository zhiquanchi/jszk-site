import { useState } from 'react';
import { Alert, App, Button, Form, Input, Modal, Space, Typography } from 'antd';
import { getToken, setToken } from './auth.js';

// 写入密钥设置面板：服务端配了 ADMIN_TOKEN 后，改成绩/改 NCRE/发通知都要带这个密钥。
export default function TokenModal({ open, onClose }) {
  const { message } = App.useApp();
  const [value, setValue] = useState('');
  const current = getToken();

  return (
    <Modal
      open={open}
      title="写入密钥"
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      afterOpenChange={(o) => o && setValue('')}
    >
      <Alert
        type={current ? 'success' : 'warning'}
        showIcon
        style={{ marginBottom: 14 }}
        message={current ? '已设置写入密钥' : '尚未设置写入密钥'}
        description={
          current
            ? '保存成绩、删除记录、更新 NCRE 批次时会自动带上它。'
            : '服务端配置了 ADMIN_TOKEN 时，写操作会被拒绝（401）；把那个密钥填进来保存一次即可，本机浏览器长期有效。'
        }
      />
      <Form
        layout="vertical"
        onFinish={() => {
          setToken(value.trim());
          message.success(value.trim() ? '写入密钥已保存' : '写入密钥已清除');
          onClose();
        }}
      >
        <Form.Item label="密钥（对应服务端 ADMIN_TOKEN）">
          <Input.Password
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={current ? '已设置，可粘贴新密钥覆盖' : '粘贴 ADMIN_TOKEN'}
            autoComplete="off"
          />
        </Form.Item>
        <Space>
          <Button type="primary" htmlType="submit">
            保存
          </Button>
          {current && (
            <Button
              danger
              onClick={() => {
                setToken('');
                message.success('写入密钥已清除');
                onClose();
              }}
            >
              清除
            </Button>
          )}
        </Space>
        <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 12, marginBottom: 0 }}>
          密钥只存在本机 localStorage，不会写进仓库或前端产物；服务端未配置 ADMIN_TOKEN 时不校验（本地开发可留空）。
        </Typography.Paragraph>
      </Form>
    </Modal>
  );
}