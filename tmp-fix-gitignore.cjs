const fs = require('fs');
const content = '__pycache__/\n*.log\nnode_modules/\n.DS_Store\nThumbs.db\n.playwright-mcp/\n';
fs.writeFileSync('.gitignore', content, 'utf8');
console.log('gitignore rewritten with LF');