#!/usr/bin/env node
/*
 * 生成 docs/js/embedded-data.js —— 将 schools.json 与三份评分配置内嵌为全局变量
 *
 * 背景：直接双击打开 docs/index.html（file:// 协议）时，浏览器安全策略禁止
 * fetch 读取本地 JSON（报 "Failed to fetch"）。本脚本把数据编译成 JS 文件，
 * 由 index.html 以 <script> 标签加载，使零服务器双击直开可用。
 *
 * 用法：数据更新后执行  node scripts/gen-embedded-data.cjs  即可刷新内嵌数据。
 */
const fs = require('fs');
const path = require('path');

const docsDir = path.join(__dirname, '..', 'docs');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(docsDir, p), 'utf8'));

const data = {
  schools: readJson('data/schools.json'),
  scoringRules: readJson('data/scoring/scoring_rules.json'),
  schoolMajorLevels: readJson('data/scoring/school_major_levels.json'),
  majorRelations: readJson('data/scoring/major_relations.json')
};

// 转义 < 防止数据中出现 </script> 截断标签
const payload = JSON.stringify(data).replace(/</g, '\\u003c');

const banner =
  '/*\n' +
  ' * 自动生成，请勿手改 —— 由 scripts/gen-embedded-data.cjs 产出\n' +
  ' * 数据更新后执行 node scripts/gen-embedded-data.cjs 刷新\n' +
  ' * 用途：file:// 直开场景下为 database.js / scoring.js 提供内嵌数据源\n' +
  ' */\n';

const code = banner +
  '(function (g) { g.__BAOYAN_DATA__ = ' + payload + '; })(' +
  "typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));\n";

const outFile = path.join(docsDir, 'js', 'embedded-data.js');
fs.writeFileSync(outFile, code, 'utf8');

console.log('已生成 ' + outFile +
  '（学校 ' + data.schools.length + ' 所，评分规则 v' + (data.scoringRules.version || '?') + '，' +
  '专业关系 v' + (data.majorRelations.version || '?') + '，体积 ' +
  Math.round(fs.statSync(outFile).size / 1024) + ' KB）');