import { useMemo, useState } from 'react';

const GROUPS = ['全部', '公共课', '专业基础课', '专业课', '实践课', '选考/替代', '毕业环节', '⭐ 学位课'];

export const STATUS = {
  'exempt-ok': { label: '✅ 可免', cls: 'chip ok' },
  'exempt-caution': { label: '⚠️ 慎免', cls: 'chip caution' },
  'never-exempt': { label: '⛔ 勿免', cls: 'chip never' },
};

export function StatusChip({ status }) {
  const s = STATUS[status] || { label: status, cls: 'chip' };
  return <span className={s.cls}>{s.label}</span>;
}

export function GroupBadge({ group }) {
  const cls = {
    公共课: 'g-public',
    专业基础课: 'g-basic',
    专业课: 'g-major',
    实践课: 'g-practice',
    '选考/替代': 'g-elective',
    毕业环节: 'g-thesis',
  }[group] || 'g-public';
  return <span className={`badge ${cls}`}>{group}</span>;
}

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

  return (
    <div>
      <header className="page-head">
        <h2>考试计划</h2>
        <p className="page-desc">
          共 {courses.length} 门 · 图例：
          <span className="chip ok">✅ 可免</span>
          <span className="chip caution">⚠️ 慎免</span>
          <span className="chip never">⛔ 勿免/不可免</span>
          <span className="badge g-degree">★ 学位课</span>
          <span className="badge g-stack">★ 全栈相关</span>
        </p>
      </header>

      <div className="toolbar">
        <div className="filter-chips">
          {GROUPS.map((g) => (
            <button
              key={g}
              className={`fchip ${group === g ? 'active' : ''}`}
              onClick={() => setGroup(g)}
            >
              {g}
            </button>
          ))}
        </div>
        <input
          className="search"
          placeholder="搜索课程名 / 代码…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>代码</th>
              <th>课程名称</th>
              <th>学分</th>
              <th>类型</th>
              <th>免考结论</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.code} className={c.degree ? 'row-degree' : ''}>
                <td className="mono">{c.code}</td>
                <td>
                  {c.degree && <span className="badge g-degree">★</span>} {c.name}
                  {c.stack && <span className="badge g-stack">全栈</span>}
                </td>
                <td>{c.credits}</td>
                <td>
                  <GroupBadge group={c.group} />
                </td>
                <td>
                  <StatusChip status={c.status} />
                </td>
                <td className="note-cell">{c.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <div className="empty">没有匹配的课程</div>}
      </div>
    </div>
  );
}
