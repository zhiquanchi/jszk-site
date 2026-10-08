import { useMemo, useState } from 'react';
import {
  Alert,
  Card,
  Col,
  Collapse,
  Empty,
  Input,
  Row,
  Segmented,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import { CourseCell, ExemptionDetail, GroupTag, PageHeader, StatusTag } from '../components.jsx';
import { PASS_LINE, bestScore } from '../scoring.js';

const VIEWS = [
  { key: 'all', label: '全部计划' },
  { key: 'todo', label: '未考' },
  { key: 'failed', label: '未通过' },
  { key: 'passed', label: '已通过' },
  { key: 'exempt', label: '未通过但可免考' },
];

export default function StudyBoard({ courses, scores }) {
  const [view, setView] = useState('all');
  const [query, setQuery] = useState('');

  const rows = useMemo(
    () =>
      courses.map((course) => {
        const score = bestScore(scores, course.code);
        const state = score == null ? 'todo' : score >= PASS_LINE ? 'passed' : 'failed';
        const canExempt = state !== 'passed' && course.status !== 'never-exempt' && (course.exemption?.paths || []).length > 0;
        return { ...course, score, state, canExempt };
      }),
    [courses, scores]
  );

  const counts = useMemo(
    () => ({
      all: rows.length,
      todo: rows.filter((r) => r.state === 'todo').length,
      failed: rows.filter((r) => r.state === 'failed').length,
      passed: rows.filter((r) => r.state === 'passed').length,
      exempt: rows.filter((r) => r.canExempt).length,
    }),
    [rows]
  );

  const list = rows.filter((r) => {
    const matchesView = view === 'all' || (view === 'exempt' ? r.canExempt : r.state === view);
    const matchesQuery = !query || r.code.includes(query) || r.name.includes(query);
    return matchesView && matchesQuery;
  });

  const columns = [
    {
      title: '课程',
      render: (_, r) => (
        <Space direction="vertical" size={2}>
          <Space size={6} wrap>
            <Typography.Text code>{r.code}</Typography.Text>
            <CourseCell course={r} />
          </Space>
          {r.formerCodes?.length > 0 && <Typography.Text type="secondary">旧代码：{r.formerCodes.join('、')}</Typography.Text>}
        </Space>
      ),
    },
    { title: '学分', dataIndex: 'credits', width: 70 },
    { title: '类别', dataIndex: 'group', width: 110, render: (v) => <GroupTag group={v} /> },
    {
      title: '我的成绩',
      width: 110,
      render: (_, r) =>
        r.score == null ? <Tag>未录入</Tag> : <Tag color={r.score >= PASS_LINE ? 'green' : 'red'}>{r.score} · {r.score >= PASS_LINE ? '合格' : '未通过'}</Tag>,
    },
    {
      title: '当前处理',
      width: 150,
      render: (_, r) => {
        if (r.state === 'passed') return <Tag color="green">已通过</Tag>;
        if (r.canExempt) return <Tag color="orange">可研究免考</Tag>;
        if (r.state === 'failed') return <Tag color="red">需要重考</Tag>;
        return <Tag color="blue">需要考试</Tag>;
      },
    },
    { title: '免考结论', dataIndex: 'status', width: 130, render: (s) => <StatusTag status={s} /> },
  ];

  return (
    <div>
      <PageHeader
        title="学习清单"
        desc="把2024版考试计划和你的成绩合并，直接看到下一步要做什么"
        extra={<Tag color="blue">{PASS_LINE}分合格 · 学位课另看70分</Tag>}
      />

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {[
          ['计划课程', counts.all, '全部课程'],
          ['已通过', counts.passed, `成绩 ≥ ${PASS_LINE}`],
          ['未通过', counts.failed, '需要重考'],
          ['未考', counts.todo, '还没有成绩'],
          ['可免考路径', counts.exempt, '未通过/未考且存在条件'],
        ].map(([title, value, hint]) => (
          <Col xs={12} sm={8} lg={24 / 5} key={title}>
            <Card size="small"><Statistic title={title} value={value} suffix={<Typography.Text type="secondary" style={{ fontSize: 12 }}>{hint}</Typography.Text>} /></Card>
          </Col>
        ))}
      </Row>

      <Alert
        type="info"
        showIcon
        message="使用方法"
        description="“未考”和“未通过”按你的成绩记录实时计算；“未通过但可免考”会展开对应的官方免考条件。实践课仍需按主考学校安排完成考核，免考资格最终以江苏省教育考试院审核为准。"
        style={{ marginBottom: 14 }}
      />

      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Segmented
          block
          options={VIEWS.map((v) => ({ label: `${v.label} ${counts[v.key]}`, value: v.key }))}
          value={view}
          onChange={setView}
        />
        <Input.Search allowClear placeholder="搜索课程代码或名称" value={query} onChange={(e) => setQuery(e.target.value)} style={{ maxWidth: 360 }} />
      </Space>

      <Table
        style={{ marginTop: 14 }}
        rowKey="code"
        size="middle"
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 12, hideOnSinglePage: true }}
        dataSource={list}
        columns={columns}
        locale={{ emptyText: <Empty description="当前分类没有课程" /> }}
        rowClassName={(r) => (r.degree ? 'row-degree' : '')}
        expandable={{
          expandedRowRender: (r) => (
            <Collapse ghost items={[{ key: 'exemption', label: '查看免考条件、材料和学位影响', children: <ExemptionDetail course={r} /> }]} />
          ),
          rowExpandable: (r) => Boolean(r.exemption),
        }}
      />
    </div>
  );
}
