import { Button, Card, Col, List, Progress, Row, Tag, Timeline, Typography } from 'antd';
import {
  BookOutlined,
  CheckCircleFilled,
  ExclamationCircleFilled,
  FormOutlined,
  RightOutlined,
  StopFilled,
  ToolOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { PageHeader } from '../components.jsx';

export default function Overview({ meta, courses, degree, scores }) {
  const totalCredits = courses.reduce((s, c) => s + c.credits, 0);
  const degreeCount = courses.filter((c) => c.degree).length;
  const practiceCount = courses.filter((c) => c.practice).length;
  // 只统计现行计划内的课程（旧计划代码如 04737、02197 不计入；已按映射归一的除外）
  const planCodes = new Set(courses.map((c) => c.code));
  const recorded = new Set(scores.filter((s) => planCodes.has(s.code)).map((s) => s.code)).size;

  const stats = [
    { icon: <BookOutlined />, color: '#1677ff', bg: '#e6f4ff', label: '课程总门数', value: courses.length, suffix: '门' },
    { icon: <FormOutlined />, color: '#fa8c16', bg: '#fff7e6', label: '总学分', value: totalCredits, suffix: '分' },
    { icon: <TrophyOutlined />, color: '#722ed1', bg: '#f9f0ff', label: '学位课程', value: degreeCount, suffix: '门 · 均分≥70' },
    { icon: <ToolOutlined />, color: '#13c2c2', bg: '#e6fffb', label: '实践课', value: practiceCount, suffix: '门 · 均须实做' },
  ];

  const countBy = (s) => courses.filter((c) => c.status === s).length;
  const conclusions = [
    {
      key: 'ok',
      icon: <CheckCircleFilled style={{ color: '#52c41a' }} />,
      title: '可以放心免考',
      count: countBy('exempt-ok'),
      bg: '#f6ffed',
      items: [
        '13013 高级语言程序设计（+实践 13014）：凭 NCRE 二级 C',
        '04747 Java（+实践 04748）：凭 NCRE 二级 Java',
        '四门均为非学位课，不影响学位',
      ],
    },
    {
      key: 'caution',
      icon: <ExclamationCircleFilled style={{ color: '#fa8c16' }} />,
      title: '有条件 / 需实考',
      count: countBy('exempt-caution'),
      bg: '#fff7e6',
      items: [
        '政治课与高数：官方口径门槛高，多数专科毕业生需实考',
        '英语 13000：学位课，实考目标 ≥ 70',
        '其余专业课：同层次「名称相同、要求相同」才可免',
      ],
    },
    {
      key: 'never',
      icon: <StopFilled style={{ color: '#ff4d4f' }} />,
      title: '不能免 / 免了丢学位',
      count: countBy('never-exempt'),
      bg: '#fff1f0',
      items: [
        '学位课 13003 / 13015 / 13180：免考即失去学位资格',
        `实践课 ${practiceCount} 门：须主考院校实做考核`,
        '毕业设计：须答辩且「良好」以上',
      ],
    },
  ];

  return (
    <div>
      <PageHeader
        title="总览"
        desc={`${meta.major} · ${meta.degreeName} · 主考 ${meta.school}`}
        extra={
          <Tag color="blue" style={{ marginInlineEnd: 0 }}>
            {meta.code}
          </Tag>
        }
      />

      {/* KPI 行：视觉层级最高，F/Z 型浏览的起点 */}
      <Row gutter={[14, 14]}>
        {stats.map((s) => (
          <Col key={s.label} xs={12} lg={5}>
            <Card size="small" className="stat-card">
              <div className="stat-ico" style={{ background: s.bg, color: s.color }}>
                {s.icon}
              </div>
              <div className="stat-meta">
                <div className="stat-value">
                  {s.value}
                  <small>{s.suffix}</small>
                </div>
                <div className="stat-label">{s.label}</div>
              </div>
            </Card>
          </Col>
        ))}
        <Col xs={24} lg={4}>
          <Card size="small" className="stat-card">
            <Progress
              type="circle"
              size={42}
              percent={Math.round((recorded / courses.length) * 100)}
              strokeColor="#52c41a"
            />
            <div className="stat-meta">
              <div className="stat-value">
                {recorded}
                <small>/{courses.length} 门</small>
              </div>
              <div className="stat-label">已录成绩</div>
            </div>
          </Card>
        </Col>
      </Row>

      <Typography.Title level={4} className="section-title">
        🎯 南航学位申请硬指标
      </Typography.Title>
      <Row gutter={[14, 14]}>
        {degree.requirements.map((r) => (
          <Col key={r.t} xs={24} sm={12} lg={6}>
            <Card size="small">
              <Tag color={r.tag === '硬指标' ? 'red' : r.tag === '替代' ? 'orange' : 'blue'}>
                {r.tag}
              </Tag>
              <div style={{ fontWeight: 600, margin: '8px 0 4px' }}>{r.t}</div>
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                {r.d}
              </Typography.Text>
            </Card>
          </Col>
        ))}
      </Row>

      <Typography.Title level={4} className="section-title">
        🧭 免考决策速览
        <Button
          type="link"
          size="small"
          onClick={() => (location.hash = '#/exemption')}
          style={{ padding: 0 }}
        >
          查看每门课的明细 <RightOutlined />
        </Button>
      </Typography.Title>
      <Row gutter={[14, 14]}>
        {conclusions.map((c) => (
          <Col key={c.key} xs={24} lg={8}>
            <Card size="small" style={{ background: c.bg }}>
              <div className="decision-head">
                {c.icon}
                <h4>{c.title}</h4>
                <Tag>{c.count} 门</Tag>
              </div>
              <List
                size="small"
                split={false}
                dataSource={c.items}
                renderItem={(i) => (
                  <List.Item style={{ padding: '3px 0' }}>
                    <Typography.Text style={{ fontSize: 13 }}>· {i}</Typography.Text>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Typography.Title level={4} className="section-title">
        ⏰ 关键时间
      </Typography.Title>
      <Card size="small">
        <Timeline
          items={[
            {
              color: 'orange',
              children: (
                <>
                  <b>2026 下半年免考窗口（9 月前后）</b>
                  <br />
                  <Typography.Text type="secondary">
                    通告已于 8 月底发布，立即核对是否截止；错过则等 2027 上半年（预计 3 月初）
                  </Typography.Text>
                </>
              ),
            },
            {
              children: (
                <>
                  <b>免考办理时限</b>
                  <br />
                  <Typography.Text type="secondary">须在申请毕业前至少半年办完</Typography.Text>
                </>
              ),
            },
            {
              children: (
                <>
                  <b>学位申请时限</b>
                  <br />
                  <Typography.Text type="secondary">取得毕业证书后一年内提交</Typography.Text>
                </>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
