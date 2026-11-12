/*
 * 评分模块（前端版）—— 已接入用户自研评分算法（baoyan_score）
 *
 * 算法实现在 scoring-core.js（浏览器 / Node 单份同构），本模块只负责：
 *   1. fetch 加载 docs/data/scoring/ 下三份配置（规则 / 学校档次 / 专业关系）
 *   2. 调用 ScoringCore 完成评分并适配为展示契约
 *
 * 输出：{ total, breakdown: { school, ranking, english, competition, research },
 *        placeholder: false, detail: <算法完整输出，含 pending_reasons / notices> }
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.LocalScoring = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CONFIG_FILES = [
    'data/scoring/scoring_rules.json',
    'data/scoring/school_major_levels.json',
    'data/scoring/major_relations.json'
  ];
  var configCache = null;

  function fetchJson(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error(url + ' 加载失败（' + res.status + '）');
      return res.json();
    });
  }

  function loadConfig() {
    if (configCache) return Promise.resolve(configCache);
    return Promise.all(CONFIG_FILES.map(fetchJson)).then(function (configs) {
      configCache = { rules: configs[0], schools: configs[1], majors: configs[2] };
      return configCache;
    });
  }

  async function calculateScore(profile) {
    var empty = {
      total: null,
      breakdown: { school: null, ranking: null, english: null, competition: null, research: null },
      placeholder: false,
      detail: { status: 'error', pending_reasons: [] }
    };
    try {
      var cfg = await loadConfig();
      var student = ScoringCore.buildStudent(profile);
      var result = ScoringCore.calculateTotal(student, cfg.rules, cfg.schools, cfg.majors);
      return ScoringCore.adaptResult(result);
    } catch (err) {
      empty.detail.pending_reasons = ['评分配置加载失败：' + ((err && err.message) || err)];
      return empty;
    }
  }

  async function getMajorRelations() {
    var cfg = await loadConfig();
    return cfg.majors;
  }

  return { calculateScore: calculateScore, getMajorRelations: getMajorRelations };
});