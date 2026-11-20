/*
 * 学校数据库模块（前端版）
 *
 * 数据源（按优先级）：
 *   1. 内嵌数据 window.__BAOYAN_DATA__.schools（docs/js/embedded-data.js，
 *      由 scripts/gen-embedded-data.cjs 生成）—— file:// 双击直开时唯一可用来源
 *   2. fetch data/schools.json —— http(s) 部署时的后备（与后端共用同一 JSON 文件）
 *
 * 数据结构契约见 src/services/database.js 顶部注释。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.LocalDatabase = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var schoolsCache = null;
  var DATA_URL = 'data/schools.json';

  function getEmbedded() {
    var g = typeof window !== 'undefined' ? window
      : (typeof self !== 'undefined' ? self : globalThis);
    return g && g.__BAOYAN_DATA__;
  }

  async function getSchools() {
    if (schoolsCache) return schoolsCache;
    var embedded = getEmbedded();
    if (embedded && Array.isArray(embedded.schools)) {
      schoolsCache = embedded.schools;
    } else {
      try {
        var res = await fetch(DATA_URL);
        schoolsCache = await res.json();
      } catch (e) {
        schoolsCache = [];
      }
    }
    if (!Array.isArray(schoolsCache)) schoolsCache = [];
    return schoolsCache;
  }

  function isDataReady() {
    return !!(schoolsCache && schoolsCache.length);
  }

  return { getSchools: getSchools, isDataReady: isDataReady };
});