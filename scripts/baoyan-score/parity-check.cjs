/* JS 移植与 Python 原版的一致性回归检查。
 *
 * 用法：
 *   1. python scripts/baoyan-score/run-baseline.py   # 生成基准输出
 *   2. node scripts/baoyan-score/parity-check.cjs    # 深度对比
 * 两侧统一使用 docs/data/scoring/ 配置，输出应完全一致。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const ScoringCore = require(path.join(ROOT, 'docs', 'js', 'scoring-core.js'));

const CONFIG_DIR = path.join(ROOT, 'docs', 'data', 'scoring');
const BASELINE_DIR = path.join(__dirname, 'results', 'parity');
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf-8'));

const rules = readJson(path.join(CONFIG_DIR, 'scoring_rules.json'));
const schools = readJson(path.join(CONFIG_DIR, 'school_major_levels.json'));
const majors = readJson(path.join(CONFIG_DIR, 'major_relations.json'));

const diffs = [];

function deepCompare(a, b, p) {
  if (typeof a === 'number' && typeof b === 'number') {
    if (Math.abs(a - b) > 1e-9) diffs.push(p + ': ' + a + ' != ' + b);
    return;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) { diffs.push(p + ': 数组长度 ' + a.length + ' != ' + b.length); return; }
    a.forEach((v, i) => deepCompare(v, b[i], p + '[' + i + ']'));
    return;
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      if (!(k in a)) { diffs.push(p + '.' + k + ': 仅 JS 侧存在'); continue; }
      if (!(k in b)) { diffs.push(p + '.' + k + ': 仅 Python 侧存在'); continue; }
      deepCompare(a[k], b[k], p + '.' + k);
    }
    return;
  }
  if (a !== b) diffs.push(p + ': ' + JSON.stringify(a) + ' != ' + JSON.stringify(b));
}

let failed = 0;
for (let i = 1; i <= 6; i++) {
  const student = readJson(path.join(__dirname, 'stu_mes', 'stu' + i + '.json'));
  const py = readJson(path.join(BASELINE_DIR, 'py_stu' + i + '.json'));
  const js = ScoringCore.calculateTotal(student, rules, schools, majors);
  diffs.length = 0;
  deepCompare(js, py, 'stu' + i);
  if (diffs.length) {
    failed++;
    console.log('FAIL - stu' + i + '（总分 JS=' + js.total_score + ' / PY=' + py.total_score + '）');
    diffs.slice(0, 10).forEach((d) => console.log('    ' + d));
  } else {
    console.log('PASS - stu' + i + '（总分 ' + py.total_score + '，五维输出与 Python 完全一致）');
  }
}

console.log(failed ? ('对比失败 ' + failed + ' 个样例') : '全部 6 个样例输出与 Python 原版完全一致');
process.exit(failed ? 1 : 0);