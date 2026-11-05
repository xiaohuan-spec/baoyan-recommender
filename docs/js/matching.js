/*
 * 匹配模块（前端版）—— 占位框架（TODO：实现稳冲保匹配算法）
 *
 * 与后端 src/services/matching.js 保持同构。输出：
 *   { reach: [], stable: [], safety: [] }
 * 每条：{ name, region, major, probability: number|null, remark }
 *
 * TODO 实现思路（与后端文件一致）：
 *   1. 用 score.total 与 schools.json 各专业的 difficulty 比较分差
 *   2. 难度明显高于个人得分 → reach；持平 → stable；明显低于 → safety
 *   3. 结合 intendedRegions 与竞赛/科研加分微调归档与排序
 *   4. 计算概率并生成推荐理由
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.LocalMatching = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {

  function matchSchools(score, schools, profile) {
    return { reach: [], stable: [], safety: [] };
  }

  return { matchSchools: matchSchools };
});