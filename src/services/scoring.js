/*
 * 评分服务 —— 占位框架（TODO：实现真实评分算法）
 *
 * 输入 profile（已在 routes/api.js 规范化）：
 *   {
 *     school, major, rank, totalStudents, cet6,
 *     competitions: [{ name, level, award }],
 *     researches: [{ type, description }],
 *     intendedMajor, intendedRegions
 *   }
 *
 * 输出 score 结构（前端 public/js/result.js 按此渲染）：
 *   {
 *     total: number | null,
 *     breakdown: {
 *       school: number | null,      // 院校背景
 *       ranking: number | null,     // 专业排名（可由 rank / totalStudents 计算百分比）
 *       english: number | null,     // 六级成绩
 *       competition: number | null, // 竞赛加分
 *       research: number | null     // 科研加分
 *     }
 *   }
 *
 * TODO 建议实现思路：
 *   1. 院校背景：按 985 / 211 / 双一流 / 普通本科 分档赋分
 *   2. 专业排名：rank / totalStudents 得百分比，越小分越高
 *   3. 英语能力：六级分档（如 425 / 500 / 560 / 600+）
 *   4. 竞赛：按 level（国际级/国家级/省级/校级）与 award（特等/一等/二等/三等）加权
 *   5. 科研：按 type（论文/专利/科研项目等）与参与深度加权
 *   6. 各维度加权汇总得到 total
 */
async function calculateScore(profile) {
  const breakdown = {
    school: null,
    ranking: null,
    english: null,
    competition: null,
    research: null
  };
  return { total: null, breakdown, placeholder: true };
}

module.exports = { calculateScore };