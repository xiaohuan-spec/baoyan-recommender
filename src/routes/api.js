const express = require('express');
const scoringService = require('../services/scoring');
const databaseService = require('../services/database');
const matchingService = require('../services/matching');

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
    competitions: Array.isArray(raw.competitions)
      ? raw.competitions.map((c) => ({
          name: String((c && c.name) || '').trim(),
          level: String((c && c.level) || '').trim(),
          award: String((c && c.award) || '').trim()
        })).filter((c) => c.name)
      : [],
    researches: Array.isArray(raw.researches)
      ? raw.researches.map((r) => ({
          type: String((r && r.type) || '').trim(),
          description: String((r && r.description) || '').trim()
        })).filter((r) => r.type || r.description)
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
      const schools = await databaseService.getSchools({
        intendedMajor: profile.intendedMajor,
        intendedRegions: profile.intendedRegions
      });
      const recommendations = await matchingService.matchSchools(score, schools, profile);
      const dataReady = databaseService.isDataReady();
      res.json({
        ok: true,
        profile,
        score,
        recommendations,
        meta: {
          dataReady,
          schoolCount: schools.length,
          message: dataReady ? '' : '学校数据库与评分/匹配算法尚未填充（当前为占位框架）'
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