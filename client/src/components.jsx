import { Alert, Descriptions, Space, Tag, Typography } from 'antd';

// 统一页面头：所有视图共用，保证标题层级与间距一致
export function PageHeader({ title, desc, extra }) {
  return (
    <header className="page-head">
      <div>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {title}
        </Typography.Title>
        {desc && (
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            {desc}
          </Typography.Text>
        )}
      </div>
      {extra}
    </header>
  );
}

export const STATUS_META = {
  'exempt-ok': { label: '✅ 可免考', color: 'green' },
  'exempt-caution': { label: '⚠️ 慎免考', color: 'orange' },
  'never-exempt': { label: '⛔ 勿免/不可免', color: 'red' },
};

const GROUP_COLOR = {
  公共课: 'default',
  专业基础课: 'cyan',
  专业课: 'blue',
  实践课: 'purple',
  '选考/替代': 'gold',
  毕业环节: 'red',
};

export function StatusTag({ status }) {
  const m = STATUS_META[status] || { label: status, color: 'default' };
  return <Tag color={m.color}>{m.label}</Tag>;
}

export function GroupTag({ group }) {
  return <Tag color={GROUP_COLOR[group] || 'default'}>{group}</Tag>;
}

// 课程名 + 学位/全栈/历史代码标记
export function CourseCell({ course, showName = true }) {
  return (
    <Space size={4} wrap>
      {course.degree && <Tag color="magenta">★ 学位课</Tag>}
      {showName && <span>{course.name}</span>}
      {course.stack && <Tag color="green">全栈</Tag>}
      {(course.formerCodes || []).map((fc) => (
        <Tag key={fc} color="default" title="2024 版计划前的旧代码">
          原 {fc}
        </Tag>
      ))}
    </Space>
  );
}

// 每门课的免考策略明细（表格展开行 / 免考中心复用）
export function ExemptionDetail({ course }) {
  const ex = course.exemption || {};
  return (
    <div style={{ padding: '4px 4px 8px' }}>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
        {ex.summary}
      </Typography.Paragraph>
      {(ex.paths || []).map((p, i) => (
        <Descriptions
          key={i}
          size="small"
          bordered
          column={1}
          style={{ marginBottom: 8 }}
          items={[
            { key: 'type', label: '免考路径', children: <Tag color="blue">{p.type}</Tag> },
            { key: 'cond', label: '所需条件', children: p.condition },
            { key: 'mat', label: '所需材料', children: p.materials || '—' },
            { key: 'deg', label: '对学位的影响', children: p.degreeImpact },
          ]}
        />
      ))}
      {!(ex.paths || []).length && (
        <Alert type="info" showIcon message="没有可用的免考路径" description={ex.summary} />
      )}
      {ex.risk && (
        <Alert type="error" showIcon message="风险提示" description={ex.risk} style={{ marginTop: 8 }} />
      )}
    </div>
  );
}
