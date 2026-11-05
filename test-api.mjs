const payload = {
  school: '华中科技大学',
  major: '计算机科学与技术',
  rank: 5,
  totalStudents: 120,
  cet6: 560,
  competitions: [{ name: '全国大学生数学建模竞赛', level: '国家级', award: '一等奖' }],
  researches: [{ type: '大创项目', description: '国家级大创负责人' }],
  intendedMajor: '计算机技术',
  intendedRegions: ['湖北', '广东']
};

const res = await fetch('http://localhost:3000/api/recommend', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});
const data = await res.json();
console.log('HTTP', res.status);
console.log(JSON.stringify(data, null, 2));