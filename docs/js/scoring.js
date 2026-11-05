/*
 * 评分模块（前端版）—— 占位框架（TODO：实现真实评分算法）
 *
 * 与后端 src/services/scoring.js 保持同构：二期实现算法时两边同步修改，
 * 或在数据量增长后统一切回后端部署（仓库保留了完整 Express 后端）。
 *
 * 输入 profile（LocalCore.normalizeProfile 的输出），输出：
 *   {
 *     total: number | null,
 *     breakdown: { school, ranking, english, competition, research }  // 各 number | null
 *   }
 *
 * TODO 实现思路（与后端文件一致）：
 *   1. 院校背景按 985 / 211 / 双一流 / 普通本科分档赋分
 *   2. rank / totalStudents 得百分比，越小分越高
 *   3. 六级分档（425 / 500 / 560 / 600+）
 *   4. 竞赛按 level 与 award 加权；5. 科研按 type 加权；6. 加权汇总
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.LocalScoring = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {

  function calculateScore(profile) {
    var breakdown = {
      school: null,
      ranking: null,
      english: null,
      competition: null,
      research: null
    };
    return { total: null, breakdown: breakdown, placeholder: true };
  }

  return { calculateScore: calculateScore };
});