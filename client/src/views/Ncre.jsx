import { useState } from 'react';
import { Alert, App, Button, Card, Table, Tag, Typography } from 'antd';
import { runNcreCheck } from '../api.js';
import { PageHeader } from '../components.jsx';

const STATUS_COLOR = {
  报名中: 'green',
  未发布: 'default',
  即将报名: 'orange',
  已截止: 'red',
  已结束: 'default',
};

export default function Ncre({ ncre, onRefresh }) {
  const { message } = App.useApp();
  const [checking, setChecking] = useState(false);
  const sessions = ncre.sessions || [];
  const notifications = ncre.notifications || [];
  const announcements = ncre.announcements || [];
  const job = ncre.job || {};
  const next = sessions.find((s) => s.status === '报名中' || s.status === '未发布' || s.status === '即将报名');

  const checkNow = async () => {
    setChecking(true);
    try {
      const r = await runNcreCheck();
      message.success(r.result);
      onRefresh?.();
    } catch (e) {
      message.error(e.message || '检查失败');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="NCRE 报名追踪"
        desc={`上海市 · 全国计算机等级考试 · 每日 9:00 自动查询更新（最近更新：${ncre.updatedAt || '—'}）`}
      />

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="为什么关注 NCRE"
        description={
          <>
            免考细则附件 3：NCRE <b>二级 C语言程序设计</b> 可免 13013 高级语言程序设计 + 13014（实践）；
            <b>二级 Java</b> 可免 04747 + 04748（实践）。四门均非学位课，免考不影响学位。
            报名入口：上海招考热线（shmeea.edu.cn）/ 全国统一报名系统 ncre-bm.neea.edu.cn。
          </>
        }
      />

      {next && (
        <Card size="small" style={{ marginBottom: 16 }} title={`下一次关注：${next.session}`}>
          <Typography.Text>
            报名：{next.regStart || '待公布'}
            {next.regEnd ? ` ~ ${next.regEnd}` : ''} · 考试：{next.examDate || '待公布'} ·{' '}
            <Tag color={STATUS_COLOR[next.status] || 'default'}>{next.status}</Tag>
          </Typography.Text>
        </Card>
      )}

      <Table
        rowKey="session"
        size="middle"
        pagination={false}
        dataSource={sessions}
        columns={[
          { title: '批次', dataIndex: 'session', width: 200 },
          {
            title: '报名时间',
            render: (_, r) => (r.regStart ? `${r.regStart}${r.regEnd ? ` ~ ${r.regEnd}` : ' 起'}` : '—'),
          },
          { title: '考试时间', dataIndex: 'examDate', render: (v) => v || '—' },
          {
            title: '状态',
            dataIndex: 'status',
            width: 110,
            render: (s) => <Tag color={STATUS_COLOR[s] || 'default'}>{s}</Tag>,
          },
          {
            title: '来源',
            dataIndex: 'sourceUrl',
            render: (v) =>
              v ? (
                <a href={v} target="_blank" rel="noreferrer">
                  查看公告
                </a>
              ) : (
                '—'
              ),
          },
        ]}
      />

      {ncre.note && (
        <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
          {ncre.note}
        </Typography.Paragraph>
      )}

      <Typography.Title level={4} className="section-title">
        🤖 每日公告监控（服务内 node-cron）
      </Typography.Title>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Typography.Paragraph style={{ marginBottom: 8 }}>
          <Tag color={job.enabled ? 'green' : 'red'}>{job.enabled ? '运行中' : '未运行'}</Tag>
          计划：<Typography.Text code>{job.cron}</Typography.Text>（{job.timezone}）
          <Button size="small" style={{ marginLeft: 12 }} loading={checking} onClick={checkNow}>
            立即检查
          </Button>
        </Typography.Paragraph>
        <Typography.Text type="secondary">
          上次检查：{job.lastRunAt || '—'} · 结果：{job.lastResult || '—'}
        </Typography.Text>
        <br />
        <Typography.Text type="secondary">
          每日自动拉取来源页抓取 NCRE 公告，新公告触发通知接口；来源配置在{' '}
          <Typography.Text code>data/ncreSources.json</Typography.Text>
        </Typography.Text>
      </Card>

      {announcements.length > 0 && (
        <>
          <Typography.Title level={4} className="section-title">
            📰 抓取到的相关公告
          </Typography.Title>
          <Table
            rowKey="url"
            size="small"
            pagination={{ pageSize: 5, hideOnSinglePage: true }}
            style={{ marginBottom: 16 }}
            dataSource={announcements}
            columns={[
              {
                title: '标题',
                dataIndex: 'title',
                render: (t, r) => (
                  <a href={r.url} target="_blank" rel="noreferrer">
                    {t}
                  </a>
                ),
              },
              { title: '来源', dataIndex: 'source', width: 170 },
              {
                title: '发现时间',
                dataIndex: 'foundAt',
                width: 190,
                render: (t) => <Typography.Text code>{t}</Typography.Text>,
              },
            ]}
          />
        </>
      )}

      <Typography.Title level={4} className="section-title">
        🔔 通知接口（预留）
      </Typography.Title>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Typography.Paragraph>
          POST <Typography.Text code>/api/notify</Typography.Text>，body：
          <Typography.Text code>{' { event, title, message }'}</Typography.Text>
          。定时任务在「报名窗口开放 / 时间变动」时调用。当前为落盘占位，后续可接入邮件、webhook
          等渠道（在 <Typography.Text code>server/index.js</Typography.Text> 的 notify 处理器里分发）。
        </Typography.Paragraph>
      </Card>

      <Typography.Title level={4} className="section-title">
        📜 通知记录
      </Typography.Title>
      {notifications.length === 0 ? (
        <Card size="small">
          <Typography.Text type="secondary">暂无通知记录</Typography.Text>
        </Card>
      ) : (
        <Table
          rowKey="id"
          size="small"
          pagination={{ pageSize: 8, hideOnSinglePage: true }}
          dataSource={[...notifications].reverse()}
          columns={[
            { title: '时间', dataIndex: 'time', width: 190, render: (t) => <Typography.Text code>{t}</Typography.Text> },
            { title: '事件', dataIndex: 'event', width: 160 },
            { title: '标题', dataIndex: 'title', width: 180 },
            { title: '内容', dataIndex: 'message' },
          ]}
        />
      )}
    </div>
  );
}
