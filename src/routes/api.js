const express = require('express');
const scoringService = require('../services/scoring');
const databaseService = require('../services/database');
const matchingService = require('../services/matching');

const ENGLISH_SPECS = {
  CET4: { min: 0, max: 710, step: 1 },
  CET6: { min: 0, max: 710, step: 1 },
  IELTS: { min: 0, max: 9, step: 0.5 },
  TOEFL: { min: 0, max: 120, step: 1 }
};

function normalizeProfile(raw) {
  raw = raw || {};
  const toInt = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n) : NaN;
  };
  return {
    school: String(raw.school || '').trim(),
    major: String(raw.major || '').trim(),
    rank: toInt(raw.rank),
    totalStudents: toInt(raw.totalStudents),
    cet6: raw.cet6 === '' || raw.cet6 == null ? null : Number(raw.cet6),
    english: Array.isArray(raw.english)
      ? raw.english.map((e) => ({
          type: String((e && e.type) || '').trim().toUpperCase(),
          score: (e && e.score) === '' || (e && e.score) == null ? null : Number(e.score)
        })).filter((e) => e.type && e.score !== null)
      : [],
    competitions: Array.isArray(raw.competitions)
      ? raw.competitions.map((c) => ({
          name: String((c && c.name) || '').trim(),
          year: (c && c.year) === '' || (c && c.year) == null ? null : toInt(c.year),
          level: String((c && c.level) || '').trim(),
          award: String((c && c.award) || '').trim()
        })).filter((c) => c.name)
      : [],
    researches: Array.isArray(raw.researches)
      ? raw.researches.map((r) => ({
          type: String((r && r.type) || '').trim(),
          title: String((r && r.title) || '').trim(),
          status: String((r && r.status) || '').trim(),
          role: String((r && r.role) || '').trim(),
          field: String((r && r.field) || '').trim(),
          description: String((r && r.description) || '').trim()
        })).filter((r) => r.type || r.title || r.description)
      : [],
    intendedMajor: String(raw.intendedMajor || '').trim(),
    intendedRegions: Array.isArray(raw.intendedRegions)
      ? raw.intendedRegions.map((x) => String(x).trim()).filter(Boolean)
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
  if (p.cet6 !== null && (!Number.isFinite(p.cet6) || p.cet6 < 220 || p.cet6 > 710)) {
    return { ok: false, message: '英语六级成绩需在 220 - 710 分之间' };
  }
  for (const e of p.english) {
    const spec = ENGLISH_SPECS[e.type];
    if (!spec) return { ok: false, message: '英语考试类型需为 CET4 / CET6 / IELTS / TOEFL' };
    if (!Number.isFinite(e.score) || e.score < spec.min || e.score > spec.max) {
      return { ok: false, message: `${e.type} 成绩需在 ${spec.min} - ${spec.max} 分之间` };
    }
    if (Math.abs(e.score / spec.step - Math.round(e.score / spec.step)) > 1e-9) {
      return { ok: false, message: `${e.type} 成绩需按 ${spec.step} 分递增` };
    }
  }
  for (const c of p.competitions) {
    if (c.year !== null && (!Number.isInteger(c.year) || c.year < 1900 || c.year > 2100)) {
      return { ok: false, message: '竞赛年份需为 1900 - 2100 的整数' };
    }
  }
  if (!p.intendedMajor) return { ok: false, message: '请填写意向专业' };
  return { ok: true };
}

function registerApiRoutes(app) {
  const router = express.Router();

  router.get('/health', (req, res) => {
    res.json({ ok: true, service: 'baoyan-recommender', time: new Date().toISOString() });
  });

  // 核心推荐接口：表单数据 → 评分 → 学校库 → 稳冲保匹配
  router.post('/recommend', async (req, res) => {
    const profile = normalizeProfile(req.body);
    const check = validateProfile(profile);
    if (!check.ok) {
      return res.status(400).json({ ok: false, error: check.message });
    }
    try {
      const score = await scoringService.calculateScore(profile);
      const majorRelations = await scoringService.getMajorRelations();
      const schools = await databaseService.getSchools({
        intendedMajor: profile.intendedMajor,
        intendedRegions: profile.intendedRegions
      });
      const recommendations = await matchingService.matchSchools(score, schools, profile, majorRelations);
      const dataReady = databaseService.isDataReady();
      res.json({
        ok: true,
        profile,
        score,
        recommendations,
        meta: {
          dataReady,
          schoolCount: schools.length,
          message: recommendations.note || (dataReady ? '' : '学校数据库尚未填充')
        }
      });
    } catch (err) {
      console.error('[api] /recommend 失败:', err);
      res.status(500).json({ ok: false, error: '服务器内部错误' });
    }
  });

  app.use('/api', router);
}

module.exports = { registerApiRoutes };