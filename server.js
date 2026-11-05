const path = require('path');
const express = require('express');
const { registerApiRoutes } = require('./src/routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'docs')));

registerApiRoutes(app);

app.use('/api', (req, res) => {
  res.status(404).json({ ok: false, error: '接口不存在' });

});

app.listen(PORT, () => {
  console.log(`[server] 保研志愿推荐服务已启动: http://localhost:${PORT}`);
});