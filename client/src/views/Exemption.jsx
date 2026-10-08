import { useMemo, useState } from 'react';
import { Alert, Card, Descriptions, List, Segmented, Space, Table, Tabs, Tag, Typography } from 'antd';
import { ExemptionDetail, PageHeader, StatusTag } from '../components.jsx';

const EFFECT_TAG = {
  good: { label: '✅ 可免本专业课程', color: 'green' },
  bad: { label: '⛔ 学位风险', color: 'red' },
  special: { label: '⚡ 特殊路径', color: 'orange' },
  none: { label: '➖ 与本专业无关', color: 'default' },
  mid: { label: '• 视对应目录', color: 'green' },
};

function PerCourseStrategy({ courses }) {
  const [filter, setFilter] = useState('all');
  const countBy = (s) => courses.filter((c) => c.status === s).length;
  const statusFilters = [
    { label: `全部 ${courses.length}`, value: 'all' },
    { label: `✅ 可免 ${countBy('exempt-ok')}`, value: 'exempt-ok' },
    { label: `⚠️ 慎免 ${countBy('exempt-caution')}`, value: 'exempt-caution' },
    { label: `⛔ 勿免/不可免 ${countBy('never-exempt')}`, value: 'never-exempt' },
  ];
  const list = useMemo(
    () => courses.filter((c) => filter === 'all' || c.status === filter),
    [courses, filter]
  );

  const columns = [
    {
      title: '课程',
      width: 320,
      render: (_, r) => (
        <Space size={6} wrap>
          <Typography.Text code>{r.code}</Typography.Text>
          <span>{r.name}</span>
          {r.degree && <Tag color="magenta">★</Tag>}
          {(r.formerCodes || []).map((fc) => (
            <Tag key={fc}>原 {fc}</Tag>
          ))}
        </Space>
      ),
    },
    { title: '学分', dataIndex: 'credits', width: 70 },
    { title: '结论', dataIndex: 'status', width: 140, render: (s) => <StatusTag status={s} /> },
    {
      title: '免考路径',
      render: (_, r) => {
        const paths = r.exemption?.paths || [];
        return paths.length ? (
          <Space size={4} wrap>
            {[...new Set(paths.map((p) => p.type))].map((t) => (
              <Tag key={t} color="blue">
                {t}
              </Tag>
            ))}
          </Space>
        ) : (
          <Typography.Text type="secondary">无</Typography.Text>
        );
      },
    },
    { title: '说明', dataIndex: 'note', ellipsis: true },
  ];

  return (
    <>
      <Segmented options={statusFilters} value={filter} onChange={setFilter} style={{ marginBottom: 14 }} />
      <Table
        rowKey="code"
        size="middle"
        pagination={false}
        scroll={{ x: 'max-content' }}
        dataSource={list}
        columns={columns}
        expandable={{
          expandedRowRender: (r) => <ExemptionDetail course={r} />,
          rowExpandable: (r) => r.exemption != null,
        }}
      />
      <Typography.Paragraph type="secondary" style={{ marginTop: 10 }}>
        点击行首箭头查看每条免考路径的「条件 / 所需材料 / 对学位的影响」明细。
      </Typography.Paragraph>
    </>
  );
}

function CertPolicy({ policies }) {
  return (
    <Table
      rowKey="cert"
      size="middle"
      pagination={false}
      scroll={{ x: 'max-content' }}
      dataSource={policies.cert.rows}
      columns={[
        { title: '持有的证书', dataIndex: 'cert', width: 260 },
        { title: '可免课程', dataIndex: 'course', width: 240 },
        {
          title: '对学位的影响',
          render: (_, r) => {
            const t = EFFECT_TAG[r.effect] || { label: r.effect, color: 'default' };
            return (
              <>
                <div>
                  <Tag color={t.color}>{t.label}</Tag>
                </div>
                <Typography.Text type="secondary" style={{ fontSize: 12.5 }}>
                  {r.note}
                </Typography.Text>
              </>
            );
          },
        },
      ]}
    />
  );
}

export default function Exemption({ courses, policies }) {
  return (
    <div>
      <PageHeader
        title="免考中心"
        desc="每门课怎么免、要什么条件、对学位有什么影响 —— 以及全省统一的政策与办理窗口"
      />

      <Tabs
        defaultActiveKey="per-course"
        items={[
          {
            key: 'per-course',
            label: '📋 每门课的免考策略',
            children: <PerCourseStrategy courses={courses} />,
          },
          {
            key: 'cert',
            label: '🪪 证书类免考',
            children: <CertPolicy policies={policies} />,
          },
          {
            key: 'edu',
            label: '🎓 学历类免考',
            children: (
              <Card size="small">
                <List
                  dataSource={policies.edu.rules}
                  renderItem={(r) => (
                    <List.Item>
                      <Typography.Text>{r}</Typography.Text>
                    </List.Item>
                  )}
                />
              </Card>
            ),
          },
          {
            key: 'restrictions',
            label: '⚠️ 重要限制',
            children: (
              <Alert
                type="warning"
                showIcon
                description={
                  <List
                    size="small"
                    dataSource={policies.restrictions.items}
                    renderItem={(r) => <List.Item>{r}</List.Item>}
                  />
                }
              />
            ),
          },
          {
            key: 'process',
            label: '📥 办理流程',
            children: (
              <Descriptions
                bordered
                column={1}
                items={policies.process.items.map((p) => ({
                  key: p.k,
                  label: p.k,
                  children: p.v,
                }))}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
