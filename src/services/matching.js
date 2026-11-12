/*
 * 匹配服务（后端版）—— 稳冲保分档算法
 *
 * 算法实现在 docs/js/matching.js（与前端共用同一份代码，天然同构），
 * 本模块只做 async 包装，保持既有接口签名。
 *
 * 输出：{ reach, stable, safety, note }
 * 每条：{ name, region, major, probability, remark, difficulty, gap }
 */
const matchingCore = require('../../docs/js/matching.js');

async function matchSchools(score, schools, profile, majorRelations) {
  return matchingCore.matchSchools(score, schools, profile, majorRelations);
}

module.exports = { matchSchools };