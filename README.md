# 保研志愿智能推荐

填写个人情况（本科院校、专业排名、六级成绩、竞赛、科研、意向专业与地区），获取「冲 · 稳 · 保」院校推荐方案。

当前为框架阶段：表单、校验、结果展示与后端接口已就绪；学校数据库与评分 / 匹配算法为占位模块，待后续填充（见 `src/services/` 各文件内的实现契约）。

## 本地运行

```bash
npm install
npm start          # http://localhost:3000
npm run dev        # 文件变动自动重启
```

## 部署到 Render（免费，推荐）

1. 注册 [GitHub](https://github.com) 与 [Render](https://render.com) 账号
2. 将本仓库推送到 GitHub（首次推送见下方命令）
3. Render 控制台 → **New** → **Blueprint** → 选择该仓库 → **Apply**
   - `render.yaml` 会自动完成全部配置（Node 运行时、免费套餐、启动命令）
   - 或手动 **New → Web Service**，Build Command 填 `npm install`，Start Command 填 `npm start`
4. 部署完成后 Render 会分配一个公网地址，任何人可访问

注意：Render 免费套餐在 15 分钟无访问后会休眠，再次访问需等待约 30-60 秒冷启动。

## 部署到 Railway（备选）

推送仓库后 Railway 会自动检测 Node 项目，根目录的 `Procfile` 会指定启动命令，无需额外配置。

## 首次推送仓库命令

```bash
git remote add origin <你的GitHub仓库地址>
git push -u origin main
```

## 项目结构

```
server.js               服务入口（静态页面 + API）
src/routes/api.js       POST /api/recommend 接口
src/services/scoring.js   评分算法（占位，含实现契约注释）
src/services/database.js  学校数据库（占位，数据在 src/data/schools.json）
src/services/matching.js  稳冲保匹配算法（占位，含实现契约注释）
public/                 前端页面 / 样式 / 逻辑
```