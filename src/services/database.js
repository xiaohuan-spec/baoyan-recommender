const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'docs', 'data', 'schools.json');

/*
 * 学校数据库服务 —— 占位框架（TODO：填充数据或升级为真实数据库）
 *
 * 数据文件与前端共用：docs/data/schools.json
 * （浏览器端由 docs/js/database.js fetch 同一文件，保证静态 / 后端两种部署形态数据一致）
 *
 * 每条数据结构（后续填充时遵循）：
 *   {
 *     "name": "学校名称",
 *     "region": "所在地区（如：北京）",
 *     "majors": [
 *       { "name": "专业名称", "difficulty": 85, "remark": "备注（可选）" }
 *     ]
 *   }
 *   difficulty 为 0-100 的录取难度系数，供匹配算法使用。
 *
 * TODO: 填充真实学校/专业数据；如需升级为 SQLite/MySQL 等数据库，
 *       仅需替换本文件内部实现，getSchools / isDataReady 接口签名保持不变。
 */
function readRawSchools() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

async function getSchools(filters = {}) {
  const schools = readRawSchools();
  // TODO: 按 filters.intendedMajor（意向专业）与 filters.intendedRegions（意向地区）过滤
  return schools;
}

function isDataReady() {
  // TODO: 数据填充后此判断自动生效（也可按需改为更严格的校验）
  return readRawSchools().length > 0;
}

module.exports = { getSchools, isDataReady };