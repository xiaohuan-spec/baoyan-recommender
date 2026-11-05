const core = require('./docs/js/core.js');
const scoring = require('./docs/js/scoring.js');
const matching = require('./docs/js/matching.js');

const p = core.normalizeProfile({
  school: '华中科技大学',
  major: '计算机科学与技术',
  rank: '5',
  totalStudents: '120',
  cet6: '',
  competitions: [{ name: '数学建模', level: '国家级', award: '一等奖' }, { name: '' }],
  researches: [],
  intendedMajor: '计算机技术',
  intendedRegions: ['湖北']
});

const checks = [
  ['rank 数字规范化', p.rank === 5],
  ['cet6 空串转 null', p.cet6 === null],
  ['空名竞赛被过滤', p.competitions.length === 1],
  ['校验通过', core.validateProfile(p).ok === true],
  ['缺院校被拦截', core.validateProfile(core.normalizeProfile({ major: 'x', rank: 1, totalStudents: 10, intendedMajor: 'y' })).ok === false],
  ['位次大于总数被拦截', core.validateProfile(core.normalizeProfile({ school: 'a', major: 'b', rank: 11, totalStudents: 10, intendedMajor: 'c' })).ok === false],
  ['评分占位结构', JSON.stringify(scoring.calculateScore(p).breakdown) === JSON.stringify({ school: null, ranking: null, english: null, competition: null, research: null })],
  ['匹配占位结构', JSON.stringify(matching.matchSchools(null, [], p)) === JSON.stringify({ reach: [], stable: [], safety: [] })]
];

let failed = 0;
for (const item of checks) {
  console.log((item[1] ? 'PASS' : 'FAIL') + ' - ' + item[0]);
  if (!item[1]) failed++;
}
process.exit(failed ? 1 : 0);