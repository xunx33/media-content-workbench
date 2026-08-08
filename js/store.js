// ===== CONFIG =====
const VIDEO_PLATFORMS = ['抖音', '快手', '小红书', '视频号'];
const ARTICLE_PLATFORMS = ['百家号', '公众号', '知乎', '企鹅号', '搜狐号', '官网'];
const ALL_PLATFORMS = [...VIDEO_PLATFORMS, ...ARTICLE_PLATFORMS];
const PLATFORM_SHORT = { '抖音':'抖','快手':'快','小红书':'红','视频号':'视','百家号':'百','公众号':'公','知乎':'知','企鹅号':'企','搜狐号':'搜','官网':'官' };
const AI_ENGINES = ['DeepSeek', '豆包', '千问', '文心', '元宝', '纳米'];
const AI_ENGINES_SHORT = { 'DeepSeek': 'DS', '豆包': '豆包', '千问': '千问', '文心': '文心', '元宝': '元宝', '纳米': '纳米' };
const DAILY_TARGET = 1;

// ===== 数据读写（异步 fetch） =====
// API：GET/POST /api/data/{key}  →  server.js 服务
// 失败时返回空数组（与原 localStorage 行为一致）
async function loadData(key) {
  try {
    const res = await fetch('/api/data/' + key);
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.warn('[loadData] ' + key + ' 失败:', e);
    return [];
  }
}

// 串行化同 key 的保存请求（防竞态：先发的请求先到后到达会被覆盖）
const _inflightSaves = {};
async function saveData(key, val) {
  // 等待同一 key 的上一次保存完成
  if (_inflightSaves[key]) {
    try { await _inflightSaves[key]; } catch (e) {}
  }
  const p = fetch('/api/data/' + key, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(val)
  }).catch(e => console.warn('[saveData] ' + key + ' 失败:', e));
  _inflightSaves[key] = p;
  try { await p; } catch (e) {}
  delete _inflightSaves[key];
}

// ===== STATE（异步初始化） =====
let tasks = [];
let contents = [];
let stats = [];       // video stats: views/likes/shares/comments
let aiStats = [];     // article AI inclusion stats
let reviews = [];     // 周/月复盘记录

// 备份提醒标记（用 localStorage 即可，无需走 server）
const STORAGE_KEY = 'wb_content_workbench_v2_';

function getToday() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function isVideo(p) { return VIDEO_PLATFORMS.includes(p); }
function isArticle(p) { return ARTICLE_PLATFORMS.includes(p); }

// ===== 完成判定（以登记为准，条数累计制）=====
function getPlatformContents(date, platform) {
  return contents.filter(c => c.platform === platform && c.createdAt === date);
}
function getDayCounts(date) {
  const counts = {};
  ALL_PLATFORMS.forEach(p => { counts[p] = getPlatformContents(date, p).length; });
  return counts;
}
function isDayComplete(date) {
  const counts = getDayCounts(date);
  const videoOk = VIDEO_PLATFORMS.every(p => counts[p] > 0);
  const articleOk = ARTICLE_PLATFORMS.filter(p => counts[p] > 0).length >= 3;
  return videoOk && articleOk;
}

// ===== 任务生成 + 数据迁移（异步） =====
function getDayStr(d) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

// 每日任务生成：每月 1 号 → 今天，所有平台自动建任务
async function ensureDailyTasks() {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  let changed = false;

  for (let d = new Date(monthStart); d <= today; d.setDate(d.getDate() + 1)) {
    const dateStr = getDayStr(d);
    ALL_PLATFORMS.forEach(p => {
      if (!tasks.find(t => t.date === dateStr && t.platform === p)) {
        tasks.push({
          id: Date.now() + Math.random(),
          date: dateStr,
          platform: p,
          type: isVideo(p) ? 'video' : 'article',
          done: false,
          linked: false,
          recorded: false,
          contentId: null,
          target: DAILY_TARGET
        });
        changed = true;
      }
    });
  }

  // 兼容旧数据：补字段
  let migrated = false;
  tasks.forEach(t => {
    if (t.linked === undefined) { t.linked = t.done || false; migrated = true; }
    if (t.recorded === undefined) { t.recorded = false; migrated = true; }
    if (t.contentId === undefined) { t.contentId = null; migrated = true; }
  });
  if (changed || migrated) await saveData('tasks', tasks);
}

// 数据自动迁移：给旧版 stats/aiStats 补 contentId + title
async function migrateStatsData() {
  let migrated = false;
  stats.forEach(s => {
    if (s.contentId === undefined || s.title === undefined) {
      const c = contents.find(x => x.platform === s.platform && x.createdAt === s.date);
      if (c) {
        if (s.contentId === undefined) s.contentId = c.id;
        if (s.title === undefined) s.title = c.title;
        migrated = true;
      }
    }
    if (s.completionRate === undefined) { s.completionRate = null; migrated = true; }
    if (s.favorites === undefined) { s.favorites = 0; migrated = true; }
  });
  aiStats.forEach(s => {
    if (s.contentId === undefined || s.title === undefined) {
      const c = contents.find(x => x.platform === s.platform && x.createdAt === s.date);
      if (c) {
        if (s.contentId === undefined) s.contentId = c.id;
        if (s.title === undefined) s.title = c.title;
        migrated = true;
      }
    }
  });
  if (migrated) {
    await saveData('stats', stats);
    await saveData('aiStats', aiStats);
  }
}

// ===== 异步初始化（暴露 storeReady 给 app.js 等待） =====
// storeReady：数据加载 + 任务生成 + 数据迁移全部完成后 resolve
window.storeReady = (async () => {
  try {
    // 并行加载 5 个数据文件
    [tasks, contents, stats, aiStats, reviews] = await Promise.all([
      loadData('tasks'),
      loadData('contents'),
      loadData('stats'),
      loadData('aiStats'),
      loadData('reviews')
    ]);
    // 任务生成 + 数据迁移
    await ensureDailyTasks();
    await migrateStatsData();
    console.log('[store] 初始化完成', {
      tasks: tasks.length, contents: contents.length,
      stats: stats.length, aiStats: aiStats.length, reviews: reviews.length
    });
  } catch (e) {
    console.error('[store] 初始化失败:', e);
  }
})();

// ===== UI 状态 =====
let currentTab = 'today';
let currentMonth = new Date();
let selectedDate = null;
let dataSubTab = 'video';
let editId = null;
let overviewMonth = new Date();
let searchKeyword = '';
let contentFilterType = '';
let contentSortByViews = '';
let contentFoldOpen = true;

// ===== 心跳检测：每 30 秒 ping 服务，断开时显示横幅 =====
function showServiceDeadBanner() {
  if (document.getElementById('service-dead-banner')) return;
  const div = document.createElement('div');
  div.id = 'service-dead-banner';
  div.innerHTML = '⚠️ 后台服务已断开，请重新启动 <b>start.bat</b>';
  div.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#e53e3e;color:#fff;text-align:center;padding:10px;z-index:99999;font-size:14px;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,0.3)';
  document.body.appendChild(div);
}
function hideServiceDeadBanner() {
  document.getElementById('service-dead-banner')?.remove();
}

let __serviceAlive = true;
setInterval(async () => {
  try {
    const res = await fetch('/api/data/contents?ping=1', { cache: 'no-store' });
    if (!res.ok) throw new Error('not ok');
    if (!__serviceAlive) { __serviceAlive = true; hideServiceDeadBanner(); }
  } catch (e) {
    if (__serviceAlive) { __serviceAlive = false; showServiceDeadBanner(); }
  }
}, 30000);