/*
 * 学校数据库模块（前端版）—— 占位框架
 *
 * 数据源：public/data/schools.json（与本地 Express 版共用同一文件，
 * 后端 src/services/database.js 也读取该路径）。
 * 数据结构契约见 src/services/database.js 顶部注释。
 *
 * TODO: 二期填充数据后，本模块自动生效；如需按意向专业/地区
 *       过滤，在 getSchools 返回前实现（与后端保持同步）。
 */
(function () {

  var schoolsCache = null;
  var DATA_URL = 'data/schools.json';

  async function getSchools() {
    if (schoolsCache) return schoolsCache;
    try {
      var res = await fetch(DATA_URL);
      schoolsCache = await res.json();
      if (!Array.isArray(schoolsCache)) schoolsCache = [];
    } catch (e) {
      schoolsCache = [];
    }
    return schoolsCache;
  }

  function isDataReady() {
    return !!(schoolsCache && schoolsCache.length);
  }

  window.LocalDatabase = { getSchools: getSchools, isDataReady: isDataReady };
})();