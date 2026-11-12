const core = require('./docs/js/core.js');
const scoringCore = require('./docs/js/scoring-core.js');
const backendScoring = require('./src/services/scoring');
const backendDatabase = require('./src/services/database');
const backendMatching = require('./src/services/matching');
const matching = require('./docs/js/matching.js');

const baseInput = {
  school: '示例211大学',
  major: '计算机科学与技术',
  rank: '5',
  totalStudents: '120',
  english: [{ type: 'CET6', score: 560 }],
  competitions: [{ name: '数学建模', year: '2025', level: '国家级', award: '一等奖' }, { name: '' }],
  researches: [{ type: '科研项目', title: '示例项目', status: '已结题', role: '负责人', field: '机器学习' }],
  intendedMajor: '计算机科学与技术',
  intendedRegions: ['湖北']
};

const p = core.normalizeProfile(baseInput);

const checks = [
  ['rank 数字规范化', p.rank === 5],
  ['english 数组规范化', p.english.length === 1 && p.english[0].type === 'CET6' && p.english[0].score === 560],
  ['cet6 旧字段兼容转 null', core.normalizeProfile({ cet6: '' }).cet6 === null],
  ['空名竞赛被过滤', p.competitions.length === 1 && p.competitions[0].year === 2025],
  ['校验通过', core.validateProfile(p).ok === true],
  ['缺院校被拦截', core.validateProfile(core.normalizeProfile({ major: 'x', rank: 1, totalStudents: 10, intendedMajor: 'y' })).ok === false],
  ['位次大于总数被拦截', core.validateProfile(core.normalizeProfile({ school: 'a', major: 'b', rank: 11, totalStudents: 10, intendedMajor: 'c' })).ok === false],
  ['IELTS 步长校验', core.validateProfile(core.normalizeProfile({ school: 'a', major: 'b', rank: 1, totalStudents: 10, english: [{ type: 'IELTS', score: 6.3 }], intendedMajor: 'c' })).ok === false]
];

(async () => {
  const score = await backendScoring.calculateScore(p);
  checks.push(['评分真实计算（总分 85）', score.total === 85 && score.placeholder === false]);
  checks.push(['五维明细正确', score.breakdown.school === 16 && score.breakdown.ranking === 39 &&
    score.breakdown.english === 17 && score.breakdown.competition === 10 && score.breakdown.research === 3]);
  checks.push(['detail 含版本与 notices', score.detail.status === 'ok' && score.detail.notices.length === 4]);

  const unknown = await backendScoring.calculateScore(core.normalizeProfile({
    school: '不存在的大学', major: '计算机科学与技术', rank: 1, totalStudents: 100,
    english: [], competitions: [], researches: [], intendedMajor: '计算机科学与技术'
  }));
  checks.push(['未配置学校进入 pending', unknown.total === null && unknown.breakdown.school === null &&
    unknown.detail.pending_reasons.length > 0]);

  const schools = await backendDatabase.getSchools();
  const majorRelations = await backendScoring.getMajorRelations();
  const nationwide = matching.matchSchools(score, schools, { intendedMajor: '计算机科学与技术', intendedRegions: [] }, majorRelations);
  const allRecs = nationwide.reach.concat(nationwide.stable, nationwide.safety);
  const inBucket = (list, lo, hi) => list.every((r) => r.difficulty >= lo && r.difficulty <= hi);
  checks.push(['匹配产出三档推荐', allRecs.length > 0 && nationwide.reach.length > 0 &&
    nationwide.stable.length > 0 && nationwide.safety.length > 0]);
  checks.push(['分档阈值正确（85 分）', inBucket(nationwide.reach, 91, 100) &&
    inBucket(nationwide.stable, 80, 90) && inBucket(nationwide.safety, 0, 79)]);
  checks.push(['概率为 1-99 整数', allRecs.every((r) => Number.isInteger(r.probability) &&
    r.probability >= 1 && r.probability <= 99)]);
  checks.push(['推荐字段完整', allRecs.every((r) => r.name && r.region && r.major &&
    typeof r.difficulty === 'number' && typeof r.remark === 'string')]);
  checks.push(['每档最多 2 条', [nationwide.reach, nationwide.stable, nationwide.safety]
    .every((list) => list.length <= 2)]);

  const commMatch = matching.matchSchools(score, schools, { intendedMajor: '信息与通信工程', intendedRegions: [] }, majorRelations);
  const commAll = commMatch.reach.concat(commMatch.stable, commMatch.safety);
  checks.push(['意向专业关联扩展（信通可命中电子信息专硕）', commAll.length > 0 &&
    commAll.every((r) => ['信息与通信工程', '电子信息', '通信与信息系统', '电子科学与技术', '计算机科学与技术', '人工智能', '软件工程'].indexOf(r.major) >= 0)]);

  const hubei = matching.matchSchools(score, schools, { intendedMajor: '计算机科学与技术', intendedRegions: ['湖北'] }, majorRelations);
  const hubeiAll = hubei.reach.concat(hubei.stable, hubei.safety);
  checks.push(['地区过滤只留湖北', hubeiAll.length > 0 && hubeiAll.every((r) => r.region === '湖北')]);

  const pendingMatch = matching.matchSchools(unknown, schools, { intendedMajor: '计算机科学与技术', intendedRegions: [] }, majorRelations);
  checks.push(['评分待确认时返回空三档+提示', pendingMatch.reach.length === 0 &&
    pendingMatch.stable.length === 0 && pendingMatch.safety.length === 0 && pendingMatch.note.length > 0]);

  const backendMatch = await backendMatching.matchSchools(score, schools, { intendedMajor: '计算机科学与技术', intendedRegions: [] }, majorRelations);
  checks.push(['前后端匹配输出一致', JSON.stringify(backendMatch) === JSON.stringify(nationwide)]);

  let failed = 0;
  for (const item of checks) {
    console.log((item[1] ? 'PASS' : 'FAIL') + ' - ' + item[0]);
    if (!item[1]) failed++;
  }
  console.log(failed ? (failed + ' 项检查失败') : '全部 ' + checks.length + ' 项检查通过');
  process.exit(failed ? 1 : 0);
})();