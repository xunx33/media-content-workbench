// start-service.js — 工作台后台启动器
// 作用：检测 3000 端口 → 空闲则启动 server.js 为独立进程 → 等待就绪
// 用法：node start-service.js（由 start.bat 调用）
const { spawn } = require('child_process');
const net = require('net');
const path = require('path');

const PORT = 3000;
const ROOT = __dirname;

// 主动连接测试：能连上 → 端口在 LISTEN（busy）；连不上 → 端口空闲（free）
// 关键：不占用端口！避免和 server.js 抢 3000
function isPortBusy(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' });
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => { socket.destroy(); resolve(false); });
    setTimeout(() => { socket.destroy(); resolve(false); }, 300);
  });
}

// 等待端口变为 busy（说明服务起来了）
async function waitPortBusy(port, maxMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (await isPortBusy(port)) return true;
    await new Promise(r => setTimeout(r, 200));
  }
  return false;
}

(async () => {
  // 1. 端口检测
  if (await isPortBusy(PORT)) {
    console.log('  [跳过] 3000 端口已被占用，服务可能已在运行');
    console.log('  提示：浏览器直接访问 http://localhost:' + PORT);
    process.exit(0);
  }

  // 2. 启动 server.js 为独立后台进程
  console.log('  [启动] 正在启动 Node.js 服务（后台模式）...');
  const serverPath = path.join(ROOT, 'server.js');
  const child = spawn(process.execPath, [serverPath], {
    detached: true,
    stdio: 'ignore',
    cwd: ROOT,
  });
  child.unref();

  // 3. 等待端口就绪
  const ok = await waitPortBusy(PORT, 8000);
  if (ok) {
    console.log('  [OK] 服务已在后台运行（PID: ' + child.pid + '）');
    process.exit(0);
  } else {
    console.log('  [警告] 服务启动超时，请检查 Node.js 是否安装');
    console.log('  查看错误：手动运行 node server.js');
    try { process.kill(child.pid); } catch (e) {}
    process.exit(1);
  }
})();
