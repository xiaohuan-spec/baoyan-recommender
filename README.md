# 保研志愿智能推荐

填写个人情况（本科院校、专业排名、六级成绩、竞赛、科研、意向专业与地区），获取「冲 · 稳 · 保」院校推荐方案。

当前为框架阶段：表单、校验、结果展示与推荐管线已就绪；学校数据库与评分 / 匹配算法为占位模块，待后续填充（见下方目录说明）。

## 部署形态

推荐管线（校验 → 评分 → 学校库 → 稳冲保匹配）已改为**浏览器本地执行**，整个站点可作为纯静态页发布：

- **GitHub Pages（线上，推荐）**：静态文件在 `docs/` 目录，仓库推送后开启 Pages 即可访问，国内连通性好，免费且无需服务器
- **本地 Express（开发/调试）**：`npm start` 后 http://localhost:3000，同时提供 `POST /api/recommend` 后端接口（与浏览器本地管线同构），将来若切回后端部署（云托管 + 数据库）可直接复用

## 本地运行

```bash
npm install
npm start          # http://localhost:3000
npm run dev        # 文件变动自动重启
```

## 开启 GitHub Pages（一次性设置）

1. 打开仓库页面 → **Settings** → 左侧 **Pages**
2. **Source** 选 **Deploy from a traditional branch**
3. 分支选 **main**、目录选 **/docs** → **Save**
4. 等约 1-2 分钟，页面顶部出现 `https://xiaohuan-spec.github.io/baoyan-recommender/` 即上线

此后每次 `git push`，页面内容自动更新。

## 项目结构

```
docs/                    前端静态站（GitHub Pages 发布目录）
  index.html             表单页（含结果区）
  css/style.css          样式
  js/form.js             表单逻辑与本地推荐管线串联
  js/core.js             数据规范化 / 校验（与后端同构）
  js/database.js         学校库读取（占位，含实现契约注释）
  js/scoring.js          评分算法（占位，含实现契约注释）
  js/matching.js         稳冲保匹配算法（占位，含实现契约注释）
  data/schools.json      学校数据库（空，待填充）
server.js                本地 Express 入口（静态页 + API）
src/routes/api.js       POST /api/recommend 接口
src/services/           后端评分 / 数据库 / 匹配服务（与前端模块同构，含实现契约注释）
```

## 二期待办

1. 填充 `docs/data/schools.json` 学校 / 专业数据（数据结构契约见各模块注释）
2. 实现评分算法（`docs/js/scoring.js` 与 `src/services/scoring.js` 同步实现）
3. 实现稳冲保匹配（`docs/js/matching.js` 与 `src/services/matching.js` 同步实现）