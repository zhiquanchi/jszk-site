import { useState } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Col,
  Collapse,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  Upload,
} from 'antd';
import { DeleteOutlined, InboxOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { addScore, bulkAddScores, deleteScore, parseScore } from '../api.js';
import { DEGREE_LINE, bestScore } from '../scoring.js';
import { PageHeader } from '../components.jsx';

export default function Scores({ courses, degree, scores, onRefresh }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [parsed, setParsed] = useState(null); // { fileName, text }
  const [rows, setRows] = useState([]); // 解析候选（可编辑分数、勾选导入）
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const courseName = (code) => courses.find((c) => c.code === code)?.name || code;
  const best = (code) => bestScore(scores, code);

  // 学位课集合与「哪门是英语」都来自数据（courses.degree / degree.degreeCourses[].role），
  // 不再在代码里硬编码课程号
  const degreeCodeSet = new Set(courses.filter((c) => c.degree).map((c) => c.code));
  const degreeCardsData = degree?.degreeCourses || [];
  const engCourse = degreeCardsData.find((c) => c.role === 'english');
  const avgCourses = degreeCardsData.filter((c) => c.role !== 'english');

  const eng = engCourse ? best(engCourse.code) : null;
  const avgScores = avgCourses.map((c) => best(c.code));
  const avg =
    avgScores.length && avgScores.every((v) => v != null)
      ? Math.round((avgScores.reduce((a, b) => a + b, 0) / avgScores.length) * 10) / 10
      : null;

  // ---- 上传解析 ----
  const customRequest = async ({ file, onSuccess, onError }) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await parseScore(fd);
      setRows((res.candidates || []).map((c) => ({ ...c, include: true })));
      setParsed(res);
      onSuccess(res);
    } catch (e) {
      message.error(e.message || '解析失败');
      onError(e);
    } finally {
      setUploading(false);
    }
  };

  const confirmImport = async () => {
    const items = rows
      .filter((r) => r.include)
      .map((r) => ({
        code: r.code,
        score: r.score,
        category: '笔试',
        note: `成绩单导入：${parsed?.fileName || ''}`,
      }));
    if (!items.length) return message.warning('请先勾选要导入的成绩');
    setSubmitting(true);
    try {
      const res = await bulkAddScores(items);
      message.success(
        `已导入 ${res.added} 条成绩${res.skipped ? `，跳过重复 ${res.skipped} 条` : ''}`
      );
      setParsed(null);
      setRows([]);
      onRefresh();
    } catch (e) {
      message.error(e.message || '导入失败');
    } finally {
      setSubmitting(false);
    }
  };

  // ---- 手动录入 ----
  const submitManual = async (values) => {
    try {
      await addScore({
        code: values.code,
        score: values.score,
        category: values.category,
        date: values.date?.format('YYYY-MM-DD'),
        note: values.note,
      });
      message.success('已保存');
      form.setFieldsValue({ score: undefined, note: undefined });
      onRefresh();
    } catch (e) {
      message.error(e.message || '保存失败');
    }
  };

  const remove = async (id) => {
    try {
      await deleteScore(id);
      onRefresh();
    } catch (e) {
      message.error(e.message || '删除失败');
    }
  };

  const degreeCards = [
    engCourse && {
      title: `${engCourse.name} ${engCourse.code}（单科 ≥ ${DEGREE_LINE}）`,
      value: eng != null ? `${eng} 分` : '未录入',
      pass: eng != null ? eng >= DEGREE_LINE : null,
    },
    avgCourses.length > 0 && {
      title: `${avgCourses.length} 门学位课均分（≥ ${DEGREE_LINE}）`,
      value: avg !== null ? `${avg} 分` : '未录齐',
      pass: avg !== null ? avg >= DEGREE_LINE : null,
    },
  ].filter(Boolean);

  return (
    <div>
      <PageHeader
        title="成绩记录"
        desc={`已录 ${scores.length} 条 · 持久化在服务端，可上传成绩单自动识别`}
      />

      <Row gutter={[14, 14]}>
        {degreeCards.map((c) => (
          <Col key={c.title} xs={24} md={12}>
            <Card size="small">
              <Statistic
                title={c.title}
                value={c.value}
                suffix={
                  c.pass === true ? (
                    <Tag color="green">✓ 达标</Tag>
                  ) : c.pass === false ? (
                    <Tag color="orange">未达标</Tag>
                  ) : null
                }
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Typography.Title level={4} className="section-title">
        📤 上传成绩单自动解析
      </Typography.Title>
      <Card size="small">
        <Upload.Dragger
          accept="image/*,application/pdf"
          maxCount={1}
          showUploadList={false}
          customRequest={customRequest}
          disabled={uploading}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">
            {uploading ? '解析中…' : '成绩单解析（大模型通道）'}
          </p>
          <p className="ant-upload-hint">
            上传截图 / PDF 自动识别「课程代码 + 分数」，确认后批量导入；通道接入前请先用下方手动录入
          </p>
        </Upload.Dragger>
      </Card>

      <Typography.Title level={4} className="section-title">
        ➕ 手动录入
      </Typography.Title>
      <Card size="small">
        <Form
          form={form}
          layout="vertical"
          onFinish={submitManual}
          initialValues={{ category: '笔试', date: dayjs() }}
        >
          <Row gutter={12}>
            <Col xs={24} md={10}>
              <Form.Item
                name="code"
                label="课程"
                rules={[{ required: true, message: '请选择课程' }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder="选择课程（支持搜索）"
                  options={courses.map((c) => ({
                    value: c.code,
                    label: `${c.code} ${c.name}${c.degree ? ' ★学位课' : ''}`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={12} md={4}>
              <Form.Item
                name="score"
                label="分数"
                rules={[{ required: true, message: '必填' }]}
              >
                <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="0–100" />
              </Form.Item>
            </Col>
            <Col xs={12} md={4}>
              <Form.Item name="category" label="类型">
                <Select
                  options={[
                    { value: '笔试', label: '笔试' },
                    { value: '实践', label: '实践' },
                    { value: '论文', label: '论文' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item name="date" label="日期">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="note" label="备注">
                <Input placeholder="如：2026 年 4 月考期 / 主考院校实践考核" />
              </Form.Item>
            </Col>
            <Col>
              <Form.Item label=" ">
                <Button type="primary" htmlType="submit">
                  保存
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <Typography.Title level={4} className="section-title">
        💮 成绩列表
      </Typography.Title>
      <Table
        rowKey="id"
        size="middle"
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 10, hideOnSinglePage: true }}
        locale={{
          emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有成绩记录，考完一门就上来记一笔吧" />,
        }}
        dataSource={[...scores].reverse()}
        columns={[
          {
            title: '日期',
            dataIndex: 'date',
            width: 110,
            render: (d) => <Typography.Text code>{d}</Typography.Text>,
          },
          {
            title: '课程',
            render: (_, r) => (
              <Space size={6} wrap>
                <Typography.Text code>{r.code}</Typography.Text>
                <span>{courseName(r.code)}</span>
                {degreeCodeSet.has(r.code) && <Tag color="magenta">★</Tag>}
                {r.originalCode && <Tag color="default">原 {r.originalCode}</Tag>}
              </Space>
            ),
          },
          { title: '类型', dataIndex: 'category', width: 80 },
          {
            title: '分数',
            dataIndex: 'score',
            width: 150,
            render: (v, r) => (
              <Space size={4} wrap>
                <Tag color={v >= 60 ? 'green' : 'red'} style={{ fontSize: 13 }}>
                  {v}
                </Tag>
                <Tag color={v >= 60 ? 'green' : 'red'}>
                  {v >= 60 ? '合格' : '未通过'}
                </Tag>
                {degreeCodeSet.has(r.code) && r.category !== '论文' && v >= 60 && v < DEGREE_LINE && (
                  <Tag color="orange">学位线未达 {DEGREE_LINE}</Tag>
                )}
              </Space>
            ),
          },
          { title: '备注', dataIndex: 'note', ellipsis: true },
          {
            title: '',
            width: 80,
            render: (_, r) => (
              <Popconfirm title="删除这条成绩？" onConfirm={() => remove(r.id)}>
                <Button type="text" size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            ),
          },
        ]}
      />

      <Modal
        open={!!parsed}
        title={`解析结果：${parsed?.fileName || ''}`}
        width={760}
        onCancel={() => setParsed(null)}
        onOk={confirmImport}
        okText={`导入所选（${rows.filter((r) => r.include).length}）`}
        confirmLoading={submitting}
        okButtonProps={{ disabled: !rows.some((r) => r.include) }}
      >
        {rows.length ? (
          <Table
            rowKey="code"
            size="small"
            pagination={false}
            scroll={{ x: 'max-content' }}
            dataSource={rows}
            columns={[
              {
                title: '',
                width: 40,
                render: (_, r, idx) => (
                  <Checkbox
                    checked={r.include}
                    onChange={(e) =>
                      setRows((rs) => rs.map((x, i) => (i === idx ? { ...x, include: e.target.checked } : x)))
                    }
                  />
                ),
              },
              {
                title: '课程',
                render: (_, r) => (
                  <Space size={6} wrap>
                    <Typography.Text code>{r.code}</Typography.Text>
                    <span>{r.name}</span>
                    {degreeCodeSet.has(r.code) && <Tag color="magenta">★</Tag>}
                    {r.originalCode && <Tag>原 {r.originalCode}</Tag>}
                  </Space>
                ),
              },
              {
                title: '分数',
                width: 130,
                render: (_, r, idx) => (
                  <InputNumber
                    min={0}
                    max={100}
                    value={r.score}
                    onChange={(v) =>
                      setRows((rs) => rs.map((x, i) => (i === idx ? { ...x, score: v } : x)))
                    }
                  />
                ),
              },
            ]}
          />
        ) : (
          <Alert
            type="warning"
            showIcon
            message="没有解析出成绩"
            description="可在下方原始文本里核对识别效果；识别不到的部分请用「手动录入」补齐。"
          />
        )}
        {parsed?.text && (
          <Collapse
            style={{ marginTop: 12 }}
            items={[
              {
                key: 'raw',
                label: '原始识别文本',
                children: (
                  <pre style={{ maxHeight: 220, overflow: 'auto', fontSize: 12, whiteSpace: 'pre-wrap' }}>
                    {parsed.text}
                  </pre>
                ),
              },
            ]}
          />
        )}
      </Modal>
    </div>
  );
}