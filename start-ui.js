// start-ui.js — 启动器 UI（Node 版，彻底告别 bat 中文回显问题）
const { spawn, exec } = require('child_process');
const net = require('net');
const path = require('path');
const readline = require('readline');

const PORT = parseInt(process.env.PORT) || 3000;
const ROOT = __dirname;

// ANSI 颜色（cmd 10周年更新后支持，但部分老版本不显示颜色；不影响可读性）
const c = {
  reset: '\x1b[0m', bold: '\x1b[1m',
  green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', cyan: '\x1b[36m', gray: '\x1b[90m',
};

function line(icon, color, text) {
  console.log(`  ${color}${icon}${c.reset} ${text}`);
}

// 检测端口是否被占用（主动连接，不占用端口）
function isPortBusy(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' });
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => { socket.destroy(); resolve(false); });
    setTimeout(() => { socket.destroy(); resolve(false); }, 300);
  });
}

// 等待端口就绪（最多 maxMs 毫秒）
async function waitPortBusy(port, maxMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (await isPortBusy(port)) return true;
    await new Promise(r => setTimeout(r, 200));
  }
  return false;
}

// 按回车继续（替代 cmd pause，中文版）
function pressEnter() {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) { resolve(); return; }  // 双击时非 TTY
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    process.stdout.write(`  ${c.gray}按回车键关闭窗口...${c.reset}`);
    rl.once('line', () => { rl.close(); resolve(); });
  });
}

(async () => {
  console.log('');
  console.log(`  ${c.bold}${c.cyan}新媒体内容发布工作台${c.reset}`);
  console.log(`  ${c.gray}================================${c.reset}`);
  console.log('');

  // 1. 端口检测
  if (await isPortBusy(PORT)) {
    line('⏭ ', c.yellow, `端口 ${PORT} 已被占用，服务可能已在运行`);
  } else {
    // 2. 启动 server.js 为独立后台进程
    line('▶ ', c.cyan, '正在启动 Node.js 服务...');
    const child = spawn(process.execPath, [path.join(ROOT, 'server.js')], {
      detached: true,
      stdio: 'ignore',
      cwd: ROOT,
    });
    child.unref();

    // 3. 等待就绪
    const ok = await waitPortBusy(PORT, 8000);
    if (ok) {
      line('✓', c.green, `服务已在后台运行  PID: ${child.pid}  端口: ${PORT}`);
    } else {
      line('✗', c.red, '服务启动超时（端口未就绪）');
      line(' ', c.gray, '排查：手动运行 node server.js 查看错误');
      console.log('');
      await pressEnter();
      process.exit(1);
    }
  }

  // 4. 打开浏览器
  console.log('');
  line('🌐', c.cyan, '打开浏览器...');
  exec(`start "" "http://localhost:${PORT}"`);

  // 5. 成功提示
  console.log('');
  console.log(`  ${c.bold}${c.green}工作台已就绪！${c.reset}`);
  console.log(`  ${c.gray}服务在后台独立运行，可以直接关闭此窗口${c.reset}`);
  console.log(`  ${c.gray}停止服务：任务管理器 → 结束 node.exe 进程${c.reset}`);
  console.log('');

  await pressEnter();
  process.exit(0);
})();