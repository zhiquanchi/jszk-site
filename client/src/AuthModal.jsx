import { useState, useSyncExternalStore } from 'react';
import { Alert, App, Button, Input, Modal, Space, Typography } from 'antd';
import { LockOutlined, SafetyOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { clearSession, getSession, setSession, subscribe } from './auth.js';
import { verifyCode } from './api.js';

// 写入验证面板：输入验证器 App（TOTP）上的 6 位动态码，换取一段时间的写入许可。
export default function AuthModal({ open, onClose }) {
  const { message } = App.useApp();
  const session = useSyncExternalStore(subscribe, getSession);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (value = code) => {
    const digits = String(value).replace(/\D/g, '');
    if (digits.length !== 6 || busy) return;
    setBusy(true);
    try {
      const s = await verifyCode(digits);
      setSession(s);
      setCode('');
      message.success(`验证通过，写入已解锁（有效至 ${dayjs(s.expiresAt).format('MM-DD HH:mm')}）`);
      onClose();
    } catch (e) {
      setCode('');
      message.error(e.message || '验证失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} title="写入验证" onCancel={onClose} footer={null} destroyOnHidden>
      {session ? (
        <>
          <Alert
            type="success"
            showIcon
            message="已通过动态码验证"
            description={`本机写入许可有效至 ${dayjs(session.expiresAt).format('YYYY-MM-DD HH:mm')}，期间保存成绩、更新 NCRE 无需再次输码。`}
          />
          <Space style={{ marginTop: 14 }}>
            <Button
              danger
              icon={<LockOutlined />}
              onClick={() => {
                clearSession();
                message.success('已锁定，下次写入需重新验证');
                onClose();
              }}
            >
              立即锁定
            </Button>
          </Space>
        </>
      ) : (
        <Alert
          type="warning"
          showIcon
          icon={<SafetyOutlined />}
          message="输入验证器上的 6 位动态码"
          description={
            <>
              <Typography.Paragraph style={{ margin: '4px 0 10px' }}>
                打开你添加了本站密钥的验证器 App（Google / 微软 Authenticator、1Password 等），
                读取当前 6 位码。
              </Typography.Paragraph>
              <Space direction="vertical" size={10}>
                <Input.OTP
                  length={6}
                  value={code}
                  onChange={(v) => {
                    setCode(v);
                    if (v.length === 6) submit(v);
                  }}
                  disabled={busy}
                  autoFocus
                  style={{ letterSpacing: 4 }}
                />
                <Button type="primary" loading={busy} onClick={() => submit()} disabled={code.length !== 6}>
                  验证
                </Button>
              </Space>
              <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 10, marginBottom: 0 }}>
                动态码每 30 秒刷新；验证通过后本机 12 小时内免输（服务端 TOTP_SECRET 与 SESSION_TTL_HOURS 可调）。
                连错多次会被临时限制。
              </Typography.Paragraph>
            </>
          }
        />
      )}
    </Modal>
  );
}