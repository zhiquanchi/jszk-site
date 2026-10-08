import { Alert, Space, Table, Tag, Typography } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import { PageHeader } from '../components.jsx';

export default function CodeChanges({ codeChanges }) {
  return (
    <div>
      <PageHeader
        title="代码变更追踪"
        desc="2024 版考试计划调整了部分课程代码，这里集中维护新旧映射"
      />

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="追踪机制"
        description={
          <>
            在「成绩记录」里按旧代码录入成绩（或上传含旧代码的成绩单）时，系统会
            <b>自动归一到现行代码</b>，并在记录上保留「原 xx」标记。映射关系维护在
            <Typography.Text code> data/codeChanges.json</Typography.Text>
            ，以后再有代码调整直接改这个文件即可；「考试计划」里受影响的课程也会显示「原 xx」标签。
          </>
        }
      />

      <Table
        rowKey="from"
        size="middle"
        pagination={false}
        scroll={{ x: 'max-content' }}
        dataSource={codeChanges}
        columns={[
          {
            title: '原课程',
            width: 280,
            render: (_, r) => (
              <Space size={6} wrap>
                <Typography.Text code delete>
                  {r.from}
                </Typography.Text>
                <span>{r.fromName}</span>
              </Space>
            ),
          },
          {
            title: '',
            width: 50,
            render: () => <ArrowRightOutlined style={{ color: '#999' }} />,
          },
          {
            title: '现行课程',
            render: (_, r) => (
              <Space size={6} wrap>
                <Typography.Text code>{r.to}</Typography.Text>
                <span>{r.toName}</span>
                <Tag color="magenta">★ 现行</Tag>
              </Space>
            ),
          },
          { title: '生效时间', dataIndex: 'effective', width: 110 },
          { title: '变更原因', dataIndex: 'reason' },
        ]}
      />
    </div>
  );
}
