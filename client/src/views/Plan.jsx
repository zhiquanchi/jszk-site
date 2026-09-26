import { useMemo, useState } from 'react';
import { Input, Segmented, Space, Table, Typography } from 'antd';
import { CourseCell, ExemptionDetail, GroupTag, StatusTag } from '../components.jsx';

const FILTERS = ['全部', '公共课', '专业基础课', '专业课', '实践课', '选考/替代', '毕业环节', '⭐ 学位课'];

export default function Plan({ courses }) {
  const [group, setGroup] = useState('全部');
  const [q, setQ] = useState('');

  const list = useMemo(
    () =>
      courses.filter((c) => {
        const inGroup =
          group === '全部' || (group === '⭐ 学位课' ? c.degree : c.group === group);
        const hit = !q || c.name.includes(q) || c.code.includes(q);
        return inGroup && hit;
      }),
    [courses, group, q]
  );

  const columns = [
    {
      title: '代码',
      dataIndex: 'code',
      width: 90,
      render: (c) => <Typography.Text code>{c}</Typography.Text>,
    },
    {
      title: '课程名称',
      dataIndex: 'name',
      render: (v, r) => (
        <Space size={6} wrap>
          <span>{v}</span>
          <CourseCell course={{ ...r, name: '' }} />
        </Space>
      ),
    },
    { title: '学分', dataIndex: 'credits', width: 70 },
    { title: '类型', dataIndex: 'group', width: 110, render: (g) => <GroupTag group={g} /> },
    {
      title: '免考结论',
      dataIndex: 'status',
      width: 130,
      render: (s) => <StatusTag status={s} />,
    },
    { title: '说明', dataIndex: 'note', ellipsis: true },
    {
      title: '免考策略',
      width: 90,
      render: () => <Typography.Text type="secondary">展开行 ⇲</Typography.Text>,
    },
  ];

  return (
    <div>
      <header className="page-head">
        <Typography.Title level={3} style={{ margin: 0 }}>
          考试计划
        </Typography.Title>
        <Typography.Text type="secondary">
          共 {courses.length} 门 · 点击行首箭头展开每门课的免考策略明细（条件 / 材料 / 学位影响）
        </Typography.Text>
      </header>

      <Space direction="vertical" size={12} style={{ width: '100%', margin: '14px 0' }}>
        <Segmented options={FILTERS} value={group} onChange={setGroup} />
        <Input.Search
          placeholder="搜索课程名 / 代码…"
          allowClear
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ maxWidth: 320 }}
        />
      </Space>

      <Table
        rowKey="code"
        size="middle"
        pagination={false}
        dataSource={list}
        columns={columns}
        expandable={{
          expandedRowRender: (r) => <ExemptionDetail course={r} />,
          rowExpandable: (r) => r.exemption != null,
        }}
      />
    </div>
  );
}
