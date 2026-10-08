// 成绩判读的唯一口径：总览 KPI、学习清单、成绩记录三处共用，避免同一份数据得出不同结论。
export const PASS_LINE = 60;
export const DEGREE_LINE = 70;

// 「论文」类不计入课程口径：毕业设计（14976）的合格线是「良好」而非 60 分，
// 按 60 分线判读会把它误报成已通过。
export const isPaperCategory = (category) => category === '论文';

// 某门课的最好成绩（笔试/实践），无记录返回 null
export function bestScore(scores, code) {
  const values = (scores || [])
    .filter((s) => s.code === code && !isPaperCategory(s.category))
    .map((s) => s.score);
  return values.length ? Math.max(...values) : null;
}

export const isPassed = (score) => score != null && score >= PASS_LINE;