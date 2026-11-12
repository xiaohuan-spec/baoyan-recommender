/*
 * 评分服务（后端版）—— 已接入用户自研评分算法（baoyan_score）
 *
 * 算法实现在 docs/js/scoring-core.js（与前端共用同一份代码，天然同构），
 * 本模块只负责用 fs 读取 docs/data/scoring/ 下三份配置后调用它。
 * 配置目录与前端 fetch 的 URL 指向同一位置，保证两种部署形态数据一致。
 *
 * 输出与前端 docs/js/scoring.js 完全一致：
 *   { total, breakdown: { school, ranking, english, competition, research },
 *     placeholder: false, detail: <算法完整输出> }
 */
const fs = require('fs');
const path = require('path');
const ScoringCore = require('../../docs/js/scoring-core.js');

const CONFIG_DIR = path.join(__dirname, '..', '..', 'docs', 'data', 'scoring');
let configCache = null;

function loadConfig() {
  if (configCache) return configCache;
  const read = (name) => JSON.parse(fs.readFileSync(path.join(CONFIG_DIR, name), 'utf-8'));
  configCache = {
    rules: read('scoring_rules.json'),
    schools: read('school_major_levels.json'),
    majors: read('major_relations.json')
  };
  return configCache;
}

async function calculateScore(profile) {
  const empty = {
    total: null,
    breakdown: { school: null, ranking: null, english: null, competition: null, research: null },
    placeholder: false,
    detail: { status: 'error', pending_reasons: [] }
  };
  try {
    const cfg = loadConfig();
    const student = ScoringCore.buildStudent(profile);
    const result = ScoringCore.calculateTotal(student, cfg.rules, cfg.schools, cfg.majors);
    return ScoringCore.adaptResult(result);
  } catch (err) {
    empty.detail.pending_reasons = ['评分配置加载失败：' + ((err && err.message) || err)];
    return empty;
  }
}

async function getMajorRelations() {
  return loadConfig().majors;
}

module.exports = { calculateScore, getMajorRelations };