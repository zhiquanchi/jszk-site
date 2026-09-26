import { Alert, Card, Col, List, Row, Statistic, Tag, Typography } from 'antd';

export default function Overview({ meta, courses, degree, scores }) {
  const totalCredits = courses.reduce((s, c) => s + c.credits, 0);
  const degreeCount = courses.filter((c) => c.degree).length;
  const practiceCount = courses.filter((c) => c.practice).length;
  const recorded = new Set(scores.map((s) => s.code)).size;

  const stats = [
    { label: '课程总门数', value: courses.length, suffix: '门' },
    { label: '总学分', value: totalCredits, suffix: '分' },
    { label: '学位课程', value: degreeCount, suffix: '门' },
    { label: '实践课', value: practiceCount, suffix: '门' },
    { label: '已录成绩', value: recorded, suffix: `/${courses.length} 门` },
  ];

  const conclusions = [
    {
      tone: 'green',
      title: '✅ 可以放心免考（不影响学位）',
      items: [
        '三门政治课：15040 / 15043 / 15044（走学历免考）',
        '高等数学（工本）：数学类专科以上毕业可免',
        '非学位专业课：离散数学、高级语言程序设计、软件工程、互联网软件应用与开发、数据库系统原理、Java、计算机网络与信息安全 —— 须原学历同名课程成绩合格',
      ],
    },
    {
      tone: 'orange',
      title: '⚠️ 谨慎：英语（专升本）13000',
      items: [
        '默认别免 —— 实考冲 70 分以上',
        '唯一例外：有效期内 CET-4/6 可替代学位英语，「免考＋证书」组合先电话南航自考办确认',
        '用 PETS-3 免考 ＝ 学位英语断线，绝对别走',
      ],
    },
    {
      tone: 'red',
      title: '⛔ 不能免 / 免了丢学位',
      items: [
        '四门学位课程：13000 英语、13003 数据结构与算法、13015 计算机系统原理、13180 操作系统',
        `全部实践课 ${practiceCount} 门（须主考院校实做考核）`,
        '毕业设计 14976（成绩须良好以上）',
      ],
    },
  ];

  return (
    <div>
      <header className="page-head">
        <Typography.Title level={3} style={{ margin: 0 }}>
          总览
        </Typography.Title>
        <Typography.Text type="secondary">
          {meta.major} · {meta.degreeName} · 数据整理于 {meta.updated}
        </Typography.Text>
      </header>

      <Row gutter={[14, 14]}>
        {stats.map((s) => (
          <Col key={s.label} xs={12} sm={8} md={Math.floor(24 / stats.length)}>
            <Card size="small">
              <Statistic title={s.label} value={s.value} suffix={s.suffix} />
            </Card>
          </Col>
        ))}
      </Row>

      <Typography.Title level={4} className="section-title">
        🎯 南航学位申请硬指标
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
        🧭 免考决策速览（想拿学位怎么免）
      </Typography.Title>
      <Row gutter={[14, 14]}>
        {conclusions.map((c) => (
          <Col key={c.title} xs={24} lg={8}>
            <Card size="small" title={c.title}>
              <List
                size="small"
                dataSource={c.items}
                renderItem={(i) => (
                  <List.Item style={{ padding: '6px 0' }}>
                    <Typography.Text style={{ fontSize: 13 }}>{i}</Typography.Text>
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
      <Alert
        type="warning"
        showIcon
        description={
          <List
            size="small"
            dataSource={[
              {
                t: '2026 下半年免考窗口',
                d: '9 月前后（通告已于 8 月底发布）—— 立即核对是否截止；错过则等 2027 上半年（预计 3 月初）',
              },
              { t: '免考时限', d: '必须在申请毕业前至少半年办完' },
              { t: '学位申请时限', d: '取得毕业证书后一年内提交' },
            ]}
            renderItem={(i) => (
              <List.Item>
                <b>{i.t}</b>：{i.d}
              </List.Item>
            )}
          />
        }
      />
    </div>
  );
}
