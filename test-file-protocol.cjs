/*
 * file:// 双击直开场景回归测试
 *
 * 验证不依赖任何服务器与网络 fetch（模拟直接双击打开 docs/index.html）时，
 * 整条推荐管线（校验 → 评分 → 匹配）仅靠内嵌数据 docs/js/embedded-data.js 跑通。
 *
 * 数据更新后请先执行 node scripts/gen-embedded-data.cjs 再跑本测试。
 */
require('./docs/js/embedded-data.js');

const database = require('./docs/js/database.js');
const scoring = require('./docs/js/scoring.js');
const matching = require('./docs/js/matching.js');
const core = require('./docs/js/core.js');
global.ScoringCore = require('./docs/js/scoring-core.js');

const origFetch = globalThis.fetch;
globalThis.fetch = () => Promise.reject(new Error('file:// 下 fetch 不可用'));

(async () => {
  const checks = [];
  const profile = core.normalizeProfile({
    school: '中北大学', major: '通信工程', rank: 10, totalStudents: 120,
    english: [{ type: 'CET6', score: 480 }],
    competitions: [{ name: '蓝桥杯', year: '2025', level: '省级', award: '一等奖' }],
    researches: [],
    intendedMajor: '信息与通信工程', intendedRegions: []
  });
  const check = core.validateProfile(profile);
  checks.push(['表单校验通过', check.ok]);

  const schools = await database.getSchools();
  checks.push(['内嵌学校库加载（50 所）', schools.length === 50]);

  const score = await scoring.calculateScore(profile);
  checks.push(['评分完成非 pending', score.total !== null && score.placeholder === false]);

  const majorRelations = await scoring.getMajorRelations();
  const rec = matching.matchSchools(score, schools, profile, majorRelations);
  const all = rec.reach.concat(rec.stable, rec.safety);
  checks.push(['稳冲保三档产出', rec.reach.length > 0 && rec.stable.length > 0 && rec.safety.length > 0]);
  checks.push(['本校固定保底 95%', !!(rec.safety[0] && rec.safety[0].isHome && rec.safety[0].probability === 95)]);
  const extRecs = all.filter(function (r) { return !r.isHome; });
  const fieldsOk = extRecs.every(function (r) { return !!(r.name && r.major && r.region); }) &&
    all.every(function (r) { return !!(r.name && r.major); });
  checks.push(['推荐条目字段完整（本校虚拟条目无 region 属预期）', fieldsOk]);

  globalThis.fetch = origFetch;
  let failed = 0;
  for (const item of checks) {
    console.log((item[1] ? 'PASS' : 'FAIL') + ' - ' + item[0]);
    if (!item[1]) failed++;
  }
  console.log(failed ? failed + ' 项失败' : 'file:// 双击直开场景：全部 ' + checks.length + ' 项检查通过');
  process.exit(failed ? 1 : 0);
})();