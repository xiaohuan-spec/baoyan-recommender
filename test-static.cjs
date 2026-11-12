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
  const nationwide = matching.matchSchools(score, schools, { school: '示例211大学', intendedMajor: '计算机科学与技术', intendedRegions: [] }, majorRelations);
  const allRecs = nationwide.reach.concat(nationwide.stable, nationwide.safety);
  const extRecs = allRecs.filter((r) => !r.isHome);
  const inBucket = (list, lo, hi) => list.every((r) => r.difficulty >= lo && r.difficulty <= hi);
  checks.push(['匹配产出三档推荐', allRecs.length > 0 && nationwide.reach.length > 0 &&
    nationwide.stable.length > 0 && nationwide.safety.length > 0]);
  checks.push(['顶尖院校一律可冲（难度 90+ 进冲档）', nationwide.reach.some((r) => r.difficulty >= 90)]);
  checks.push(['分档阈值正确（85 分，冲档含 90+ 顶尖校）', inBucket(nationwide.reach, 90, 100) &&
    inBucket(nationwide.stable, 80, 89) && inBucket(nationwide.safety.filter((r) => !r.isHome), 0, 79)]);
  checks.push(['概率为 1-99 整数', extRecs.every((r) => Number.isInteger(r.probability) &&
    r.probability >= 1 && r.probability <= 99)]);
  checks.push(['推荐字段完整', extRecs.every((r) => r.name && r.region && r.major &&
    typeof r.difficulty === 'number' && typeof r.remark === 'string')]);
  checks.push(['每档最多 2 条（保档另含本校至多 3 条）', nationwide.reach.length <= 2 &&
    nationwide.stable.length <= 2 && nationwide.safety.length <= 3]);
  const homeEntry = nationwide.safety.find((r) => r.isHome);
  checks.push(['本校固定保底在保档首位', nationwide.safety[0] && nationwide.safety[0].isHome &&
    nationwide.safety[0].name === '示例211大学' && nationwide.safety[0].probability === 95]);
  checks.push(['本校条目含保底说明', homeEntry && homeEntry.remark.indexOf('本校') >= 0]);

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

  const gdSchools = matching.matchSchools(score, schools, { school: '示例211大学', intendedMajor: '计算机科学与技术', intendedRegions: ['广东'] }, majorRelations);
  checks.push(['本校保底不受意向地区过滤', gdSchools.safety[0] && gdSchools.safety[0].isHome &&
    gdSchools.safety.every((r) => r.isHome || r.region === '广东')]);

  const backendMatch = await backendMatching.matchSchools(score, schools, { school: '示例211大学', intendedMajor: '计算机科学与技术', intendedRegions: [] }, majorRelations);
  checks.push(['前后端匹配输出一致', JSON.stringify(backendMatch) === JSON.stringify(nationwide)]);

  const llmScore = await backendScoring.calculateScore(core.normalizeProfile({
    school: '示例211大学', major: '计算机科学与技术', rank: 5, totalStudents: 120,
    english: [], competitions: [],
    researches: [{ type: '期刊论文', title: '大模型论文', status: '已发表', role: '第一作者', field: '大模型' }],
    intendedMajor: '计算机科学与技术'
  }));
  checks.push(['研究方向「大模型」计分不卡 pending', llmScore.total !== null && llmScore.breakdown.research === 6]);

  const modScore = await backendScoring.calculateScore(core.normalizeProfile({
    school: '示例211大学', major: '计算机科学与技术', rank: 5, totalStudents: 120,
    english: [], competitions: [],
    researches: [{ type: '期刊论文', title: '调制识别论文', status: '已发表', role: '第一作者', field: '通信信号调制识别' }],
    intendedMajor: '信息与通信工程'
  }));
  checks.push(['研究方向「通信信号调制识别」信通方向计 6 分', modScore.total !== null && modScore.breakdown.research === 6]);

  const weirdScore = await backendScoring.calculateScore(core.normalizeProfile({
    school: '示例211大学', major: '计算机科学与技术', rank: 5, totalStudents: 120,
    english: [], competitions: [],
    researches: [{ type: '期刊论文', title: '奇怪方向', status: '已发表', role: '第一作者', field: '完全不认识的方向xyz' }],
    intendedMajor: '计算机科学与技术'
  }));
  checks.push(['未识别方向按无关计分兜底（总分不卡 pending）', weirdScore.total !== null && weirdScore.breakdown.research === 1.2]);

  const xdMatch = matching.matchSchools({ total: 78 }, schools, { school: '西安电子科技大学', intendedMajor: '信息与通信工程', intendedRegions: [] }, majorRelations);
  const xdAll = xdMatch.reach.concat(xdMatch.stable, xdMatch.safety);
  checks.push(['层次约束：西电学生推荐不含双非医科三校', xdAll.every((r) => r.isHome ||
    ['首都医科大学', '南京医科大学', '南方医科大学'].indexOf(r.name) < 0)]);
  checks.push(['层次约束提示出现在 note', xdMatch.note.indexOf('限制院校层次') >= 0]);

  const hskMatch = matching.matchSchools({ total: 66 }, schools, { school: '华中科技大学', intendedMajor: '计算机科学与技术', intendedRegions: [] }, majorRelations);
  const hskAll = hskMatch.reach.concat(hskMatch.stable, hskMatch.safety);
  const lowTierBlacklist = ['东北大学', '西安电子科技大学', '北京邮电大学', '上海财经大学', '中央财经大学',
    '北京交通大学', '北京科技大学', '华东理工大学', '南京航空航天大学', '南京理工大学', '苏州大学',
    '南方科技大学', '上海科技大学', '中国科学院大学', '北京协和医学院',
    '首都医科大学', '南京医科大学', '南方医科大学'];
  checks.push(['层次约束：华科学生推荐只含 985（tier<=3）', hskAll.every((r) => r.isHome ||
    lowTierBlacklist.indexOf(r.name) < 0)]);

  let failed = 0;
  for (const item of checks) {
    console.log((item[1] ? 'PASS' : 'FAIL') + ' - ' + item[0]);
    if (!item[1]) failed++;
  }
  console.log(failed ? (failed + ' 项检查失败') : '全部 ' + checks.length + ' 项检查通过');
  process.exit(failed ? 1 : 0);
})();