import { useMemo, useState } from 'react';
import { Input, Segmented, Space, Table, Typography } from 'antd';
import { CourseCell, ExemptionDetail, GroupTag, PageHeader, StatusTag } from '../components.jsx';

const GROUPS = ['全部', '公共课', '专业基础课', '专业课', '实践课', '选考/替代', '毕业环节', '⭐ 学位课'];

export default function Plan({ courses }) {
  const [group, setGroup] = useState('全部');
  const [q, setQ] = useState('');

  // 筛选项带计数，先看到分布再筛选（识别而非回忆）
  const counts = useMemo(() => {
    const m = { 全部: courses.length, '⭐ 学位课': courses.filter((c) => c.degree).length };
    for (const c of courses) m[c.group] = (m[c.group] || 0) + 1;
    return m;
  }, [courses]);

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
  ];

  return (
    <div>
      <PageHeader
        title="考试计划"
        desc={`共 ${courses.length} 门 · 点击行首箭头展开每门课的免考策略明细（条件 / 材料 / 学位影响）`}
      />

      <Space direction="vertical" size={12} style={{ width: '100%', margin: '14px 0' }}>
        <Segmented
          options={GROUPS.map((g) => ({ label: `${g} ${counts[g] ?? 0}`, value: g }))}
          value={group}
          onChange={setGroup}
        />
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
        rowClassName={(r) => (r.degree ? 'row-degree' : '')}
        expandable={{
          expandedRowRender: (r) => <ExemptionDetail course={r} />,
          rowExpandable: (r) => r.exemption != null,
        }}
      />
    </div>
  );
}
