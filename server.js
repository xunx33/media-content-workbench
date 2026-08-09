// ===== 本地数据服务 =====
// 功能：静态文件服务 + JSON 数据读写 API（替代 localStorage 和 CloudBase）
// 端口：3000（可用环境变量 PORT 覆盖）
// 存储：./data/*.json（每个 key 一个文件）
// 依赖：仅 Node.js 内置模块（http/fs/path）

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');

// 首次启动自动创建数据目录
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.md': 'text/markdown; charset=utf-8',
  '.webmanifest': 'application/manifest+json'
};

const server = http.createServer(async (req, res) => {
  try {
    const url = req.url.split('?')[0]; // 去掉 query string

    // API：GET /api/data/{key} → 读取
    if (req.method === 'GET' && url.startsWith('/api/data/')) {
      const key = url.replace('/api/data/', '').replace(/[^a-zA-Z0-9_]/g, '');
      const filePath = path.join(DATA_DIR, key + '.json');
      if (fs.existsSync(filePath)) {
        res.writeHead(200, { 'Content-Type': MIME['.json'] });
        res.end(fs.readFileSync(filePath, 'utf-8'));
      } else {
        // 文件不存在 → 返回空数组
        res.writeHead(200, { 'Content-Type': MIME['.json'] });
        res.end('[]');
      }
      return;
    }

    // API：POST /api/data/{key} → 写入（原子写：先写临时文件再 rename 替换）
    if (req.method === 'POST' && url.startsWith('/api/data/')) {
      const key = url.replace('/api/data/', '').replace(/[^a-zA-Z0-9_]/g, '');
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try { JSON.parse(body); } catch (e) {
          res.writeHead(400); res.end('Invalid JSON'); return;
        }
        const target = path.join(DATA_DIR, key + '.json');
        const tmp = target + '.tmp';
        try {
          fs.writeFileSync(tmp, body);
          fs.renameSync(tmp, target); // 原子替换，中途关窗不会留半截文件
          res.writeHead(200); res.end('OK');
        } catch (e) {
          res.writeHead(500); res.end('Write failed');
        }
      });
      return;
    }

    // 静态文件服务
    let filePath = path.join(__dirname, url === '/' ? 'index.html' : url);
    const ext = path.extname(filePath);

    // 安全：禁止通过网址直接访问数据目录（data/ 只允许走 /api/data 接口）
    if (filePath.startsWith(DATA_DIR)) {
      res.writeHead(403); res.end('Forbidden'); return;
    }

    // 安全：禁止路径穿越（防止访问项目外的文件）
    if (!filePath.startsWith(__dirname)) {
      res.writeHead(403); res.end('Forbidden'); return;
    }

    if (!fs.existsSync(filePath)) {
      res.writeHead(404); res.end('Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(fs.readFileSync(filePath));
  } catch (err) {
    res.writeHead(500); res.end('Server Error: ' + err.message);
  }
});

server.listen(PORT, () => {
  console.log('==============================================');
  console.log(`✓ 工作台服务已启动`);
  console.log(`✓ 访问地址: http://localhost:${PORT}`);
  console.log(`✓ 数据存储: ${DATA_DIR}`);
  console.log(`✓ 关闭服务: Ctrl+C`);
  console.log('==============================================');
});