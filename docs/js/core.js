/*
 * 核心模块：表单数据的规范化与校验（浏览器 / Node 双端同构）
 *
 * 与后端 src/routes/api.js 中的 normalizeProfile / validateProfile 逻辑保持一致，
 * 静态部署（GitHub Pages）时由浏览器本地执行；Node 端可通过 require 单测。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.LocalCore = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {

  function toInt(v) {
    if (v === null || v === undefined || v === '') return null;
    var n = Number(v);
    return isFinite(n) ? Math.round(n) : NaN;
  }

  var ENGLISH_SPECS = {
    CET4: { min: 0, max: 710, step: 1 },
    CET6: { min: 0, max: 710, step: 1 },
    IELTS: { min: 0, max: 9, step: 0.5 },
    TOEFL: { min: 0, max: 120, step: 1 }
  };

  function normalizeProfile(raw) {
    raw = raw || {};
    return {
      school: String(raw.school || '').trim(),
      major: String(raw.major || '').trim(),
      rank: toInt(raw.rank),
      totalStudents: toInt(raw.totalStudents),
      cet6: raw.cet6 === '' || raw.cet6 == null ? null : Number(raw.cet6),
      english: Array.isArray(raw.english)
        ? raw.english.map(function (e) {
            return {
              type: String((e && e.type) || '').trim().toUpperCase(),
              score: (e && e.score) === '' || (e && e.score) == null ? null : Number(e.score)
            };
          }).filter(function (e) { return e.type && e.score !== null; })
        : [],
      competitions: Array.isArray(raw.competitions)
        ? raw.competitions.map(function (c) {
            return {
              name: String((c && c.name) || '').trim(),
              year: (c && c.year) === '' || (c && c.year) == null ? null : toInt(c.year),
              level: String((c && c.level) || '').trim(),
              award: String((c && c.award) || '').trim()
            };
          }).filter(function (c) { return c.name; })
        : [],
      researches: Array.isArray(raw.researches)
        ? raw.researches.map(function (r) {
            return {
              type: String((r && r.type) || '').trim(),
              title: String((r && r.title) || '').trim(),
              status: String((r && r.status) || '').trim(),
              role: String((r && r.role) || '').trim(),
              field: String((r && r.field) || '').trim(),
              description: String((r && r.description) || '').trim()
            };
          }).filter(function (r) { return r.type || r.title || r.description; })
        : [],
      intendedMajor: String(raw.intendedMajor || '').trim(),
      intendedRegions: Array.isArray(raw.intendedRegions)
        ? raw.intendedRegions.map(function (x) { return String(x).trim(); }).filter(Boolean)
        : []
    };
  }

  function validateProfile(p) {
    if (!p.school) return { ok: false, message: '请填写本科院校' };
    if (!p.major) return { ok: false, message: '请填写本科专业' };
    if (p.rank === null) return { ok: false, message: '请填写专业排名位次' };
    if (!Number.isInteger(p.rank) || p.rank < 1) return { ok: false, message: '专业排名位次需为不小于 1 的整数' };
    if (p.totalStudents === null) return { ok: false, message: '请填写专业总人数' };
    if (!Number.isInteger(p.totalStudents) || p.totalStudents < 1) return { ok: false, message: '专业总人数需为不小于 1 的整数' };
    if (p.totalStudents < p.rank) return { ok: false, message: '专业总人数不能小于排名位次' };
    if (p.cet6 !== null && (!isFinite(p.cet6) || p.cet6 < 220 || p.cet6 > 710)) {
      return { ok: false, message: '英语六级成绩需在 220 - 710 分之间' };
    }
    for (var i = 0; i < p.english.length; i++) {
      var e = p.english[i];
      var spec = ENGLISH_SPECS[e.type];
      if (!spec) return { ok: false, message: '英语考试类型需为 CET4 / CET6 / IELTS / TOEFL' };
      if (!isFinite(e.score) || e.score < spec.min || e.score > spec.max) {
        return { ok: false, message: e.type + ' 成绩需在 ' + spec.min + ' - ' + spec.max + ' 分之间' };
      }
      if (Math.abs(e.score / spec.step - Math.round(e.score / spec.step)) > 1e-9) {
        return { ok: false, message: e.type + ' 成绩需按 ' + spec.step + ' 分递增' };
      }
    }
    for (var j = 0; j < p.competitions.length; j++) {
      var c = p.competitions[j];
      if (c.year !== null && (!Number.isInteger(c.year) || c.year < 1900 || c.year > 2100)) {
        return { ok: false, message: '竞赛年份需为 1900 - 2100 的整数' };
      }
    }
    if (!p.intendedMajor) return { ok: false, message: '请填写意向专业' };
    return { ok: true };
  }

  return { normalizeProfile: normalizeProfile, validateProfile: validateProfile };
});