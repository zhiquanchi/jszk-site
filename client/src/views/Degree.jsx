import { useEffect, useState } from 'react';
import { Alert, Card, Checkbox, Col, List, Progress, Row, Table, Tag, Typography } from 'antd';
import { PageHeader } from '../components.jsx';

const STORE_KEY = 'jszk-degree-actions-v1';

// 勾选状态按「行动内容」存，不按数组下标存 —— degree.json 的 actions 一旦增删或换序，
// 下标会整体错位（勾选跑到别的条目上），内容做 key 则永远跟着那条行动走。
// 旧版本存的是 {0:true,1:true} 形式的下标键，读取时按当前顺序迁移一次。
function loadDone(actions) {
  let raw = {};
  try {
    raw = JSON.parse(localStorage.getItem(STORE_KEY)) || {};
  } catch {
    raw = {};
  }
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!value) continue;
    if (/^\d+$/.test(key)) {
      const action = actions[Number(key)];
      if (action) out[action] = true;
    } else {
      out[key] = true;
    }
  }
  return out;
}

export default function Degree({ degree }) {
  const [done, setDone] = useState(() => loadDone(degree.actions));

  useEffect(() => {
    localStorage.setItem(STORE_KEY, JSON.stringify(done));
  }, [done]);

  const doneCount = degree.actions.filter((a) => done[a]).length;

  return (
    <div>
      <PageHeader
        title="学位攻略"
        desc={`主考院校：${degree.school} · 目标：工学学士学位`}
      />

      <Typography.Title level={4} className="section-title">
        📏 申请条件
      </Typography.Title>
      <Row gutter={[14, 14]}>
        {degree.requirements.map((r) => (
          <Col key={r.t} xs={24} sm={12} lg={8}>
            <Card size="small" title={r.t}>
              <Tag
                color={r.tag === '硬指标' ? 'red' : r.tag === '替代' ? 'orange' : 'blue'}
                style={{ marginBottom: 8 }}
              >
                {r.tag}
              </Tag>
              <br />
              <Typography.Text type="secondary">{r.d}</Typography.Text>
            </Card>
          </Col>
        ))}
      </Row>

      <Typography.Title level={4} className="section-title">
        📖 必须实考的学位课程
      </Typography.Title>
      <Table
        rowKey="code"
        size="middle"
        pagination={false}
        scroll={{ x: 'max-content' }}
        dataSource={degree.degreeCourses}
        columns={[
          {
            title: '代码',
            dataIndex: 'code',
            width: 100,
            render: (c) => <Typography.Text code>{c}</Typography.Text>,
          },
          { title: '课程', dataIndex: 'name' },
          { title: '学分', dataIndex: 'credits', width: 80 },
          {
            title: '分数目标',
            dataIndex: 'target',
            render: (t) => <b>{t}</b>,
          },
        ]}
      />

      <Alert
        type="info"
        showIcon
        style={{ marginTop: 14 }}
        message="🇬🇧 英语策略"
        description={degree.englishStrategy}
      />

      <Typography.Title level={4} className="section-title">
        🚫 红线（碰了就没学位）
      </Typography.Title>
      <Alert
        type="error"
        showIcon
        description={
          <List
            size="small"
            dataSource={degree.redLines}
            renderItem={(r) => <List.Item>{r}</List.Item>}
          />
        }
      />

      <Typography.Title level={4} className="section-title">
        ✅ 行动清单
        <Tag style={{ marginLeft: 8 }}>
          {doneCount}/{degree.actions.length} 已完成
        </Tag>
      </Typography.Title>
      <Card size="small">
        <Progress
          percent={Math.round((doneCount / degree.actions.length) * 100)}
          size="small"
          strokeColor={doneCount === degree.actions.length ? '#52c41a' : '#1677ff'}
        />
        <List
          dataSource={degree.actions}
          renderItem={(a) => (
            <List.Item
              style={{ padding: '8px 0', borderBottom: '1px dashed #f0f0f0' }}
            >
              <Checkbox
                checked={!!done[a]}
                onChange={() => setDone((d) => ({ ...d, [a]: !d[a] }))}
              >
                <span style={done[a] ? { color: '#999', textDecoration: 'line-through' } : {}}>
                  {a}
                </span>
              </Checkbox>
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
}
