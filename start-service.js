// start-service.js — 工作台后台启动器
// 作用：检测端口 → 空闲则启动 server.js 为独立进程 → 等待就绪
// 用法：node start-service.js（由 start.bat 调用）
const { spawn } = require('child_process');
const net = require('net');
const path = require('path');

const PORT = parseInt(process.env.PORT) || 3000;
const ROOT = __dirname;

// 主动连接测试端口是否被占用（不占用端口，只是测试能否连上）
function isPortBusy(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' });
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => { socket.destroy(); resolve(false); });
    setTimeout(() => { socket.destroy(); resolve(false); }, 300);
  });
}

// 等待端口 busy（说明 server.js 起来了）
async function waitPortBusy(port, maxMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (await isPortBusy(port)) return true;
    await new Promise(r => setTimeout(r, 200));
  }
  return false;
}

(async () => {
  if (await isPortBusy(PORT)) {
    console.log(`  [跳过] 端口 ${PORT} 已被占用，服务可能已在运行`);
    process.exit(0);
  }

  const serverPath = path.join(ROOT, 'server.js');
  const child = spawn(process.execPath, [serverPath], {
    detached: true,
    stdio: 'ignore',
    cwd: ROOT,
  });
  child.unref();

  const ok = await waitPortBusy(PORT, 8000);
  if (ok) {
    console.log(`  [OK] 服务已在后台运行（PID: ${child.pid}，端口: ${PORT}）`);
    process.exit(0);
  } else {
    console.log(`  [失败] 服务启动超时（${PORT} 端口未就绪）`);
    console.log(`         排查：手动运行 node server.js 查看错误`);
    try { process.kill(child.pid); } catch (e) {}
    process.exit(1);
  }
})();
