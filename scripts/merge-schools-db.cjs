/*
 * merge-schools-db.cjs —— 采集数据库合并器
 *
 * 将 scripts/baoyan-crawler/baoyan_db/ 下的 50 份学校 JSON
 * 合并为单一数组，写入 docs/data/schools.json（前后端共用的唯一数据源）。
 *
 * 用法：重新跑 generate_db.py 更新 baoyan_db 后，执行
 *   node scripts/merge-schools-db.cjs
 * 即可刷新网页端数据。
 */
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'baoyan-crawler', 'baoyan_db');
const OUT_FILE = path.join(__dirname, '..', 'docs', 'data', 'schools.json');

function validateSchool(school, fileName, problems) {
  const where = fileName || school.name || '(unknown)';
  if (!school || typeof school !== 'object') {
    problems.push(`${where}: 不是 JSON 对象`);
    return false;
  }
  if (typeof school.name !== 'string' || !school.name.trim()) {
    problems.push(`${where}: 缺少 name`);
    return false;
  }
  if (typeof school.region !== 'string' || !school.region.trim()) {
    problems.push(`${where}: 缺少 region`);
    return false;
  }
  if (!Array.isArray(school.majors) || school.majors.length === 0) {
    problems.push(`${school.name}: majors 为空`);
    return false;
  }
  for (const m of school.majors) {
    if (typeof m.name !== 'string' || !m.name.trim()) {
      problems.push(`${school.name}: 存在无名专业`);
      return false;
    }
    if (typeof m.difficulty !== 'number' || m.difficulty < 0 || m.difficulty > 100) {
      problems.push(`${school.name} / ${m.name}: difficulty 非法 (${m.difficulty})`);
      return false;
    }
  }
  return true;
}

function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error('找不到源目录: ' + SRC_DIR);
    process.exit(1);
  }
  const files = fs.readdirSync(SRC_DIR)
    .filter(f => f.endsWith('.json'))
    .sort();

  const schools = [];
  const problems = [];
  for (const f of files) {
    let school;
    try {
      school = JSON.parse(fs.readFileSync(path.join(SRC_DIR, f), 'utf-8'));
    } catch (e) {
      problems.push(`${f}: JSON 解析失败 (${e.message})`);
      continue;
    }
    if (validateSchool(school, f, problems)) {
      schools.push({
        name: school.name,
        region: school.region,
        majors: school.majors.map(m => ({
          name: m.name,
          difficulty: m.difficulty,
          ...(m.remark ? { remark: m.remark } : {})
        }))
      });
    }
  }

  if (problems.length) {
    console.error('发现问题，未写入文件：');
    problems.forEach(p => console.error('  - ' + p));
    process.exit(1);
  }

  const totalMajors = schools.reduce((s, x) => s + x.majors.length, 0);
  fs.writeFileSync(OUT_FILE, JSON.stringify(schools, null, 2) + '\n', 'utf-8');
  console.log(`已写入 ${OUT_FILE}`);
  console.log(`学校数: ${schools.length}，专业总数: ${totalMajors}`);
}

main();