import { Alert, Card, Table, Tag, Typography } from 'antd';

const STATUS_COLOR = {
  报名中: 'green',
  未发布: 'default',
  即将报名: 'orange',
  已截止: 'red',
  已结束: 'default',
};

export default function Ncre({ ncre }) {
  const sessions = ncre.sessions || [];
  const notifications = ncre.notifications || [];
  const next = sessions.find((s) => s.status === '报名中' || s.status === '未发布' || s.status === '即将报名');

  return (
    <div>
      <header className="page-head">
        <Typography.Title level={3} style={{ margin: 0 }}>
          NCRE 报名追踪
        </Typography.Title>
        <Typography.Text type="secondary">
          上海市 · 全国计算机等级考试 · 每日 9:00 自动查询更新（最近更新：{ncre.updatedAt || '—'}）
        </Typography.Text>
      </header>

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
