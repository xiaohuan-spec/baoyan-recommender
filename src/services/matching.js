/*
 * 匹配服务 —— 占位框架（TODO：实现稳冲保匹配算法）
 *
 * 输入参数：
 *   - score:   scoring.calculateScore 的返回值（total + breakdown，占位阶段 total 为 null）
 *   - schools: database.getSchools 的返回值（已按意向专业/地区过滤，结构见 src/data/schools.json）
 *   - profile: 规范化后的用户信息
 *
 * 输出 recommendations 结构（前端 public/js/result.js 按此渲染）：
 *   {
 *     reach:  [recommendation],  // 冲 —— 难度高于个人水平，值得一试
 *     stable: [recommendation],  // 稳 —— 与个人水平匹配，把握较大
 *     safety: [recommendation]   // 保 —— 难度低于个人水平，保底选择
 *   }
 *
 * 每条 recommendation 结构：
 *   {
 *     name: '学校名称',
 *     region: '所在地区',
 *     major: '推荐专业',
 *     probability: number | null,  // 预估录取概率 0-100，无法估计时为 null
 *     remark: '匹配依据 / 推荐理由'
 *   }
 *
 * TODO 建议实现思路：
 *   1. 用 score.total 与各学校专业的 difficulty（录取难度系数，见 schools.json）做比较
 *   2. 按分差归档：难度明显高于个人得分的 → reach；基本持平 → stable；明显低于 → safety
 *   3. 可结合 intendedRegions（地区偏好）、竞赛/科研加分对归档与排序做微调
 *   4. 计算每条的 probability 并生成 remark 推荐理由
 */
async function matchSchools(score, schools, profile) {
  // TODO: 实现真实匹配算法，当前占位返回三个空列表
  return { reach: [], stable: [], safety: [] };
}

module.exports = { matchSchools };