// ===== 安全工具（防 XSS）=====
// 转义 HTML 特殊字符：把 < > & 变成无害文本，防止用户输入被当代码执行
function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
// 链接安全校验：只允许 http/https 开头，其余一律当作纯文本（防 javascript: 等注入）
function safeUrl(url) {
  if (!url) return '';
  const u = String(url).trim();
  if (/^https?:\/\//i.test(u)) return u;
  return '';
}

// ===== 乱码检测（导入/解析后校验，防止非 UTF-8 源数据混入）=====
// 文本是否含 U+FFFD 替换符（非 UTF-8 编码按 UTF-8 解码损坏的典型特征）
function hasCorruptChar(text) {
  if (text === undefined || text === null) return false;
  return String(text).indexOf('\uFFFD') >= 0;
}
// 统计数组中含乱码文本字段的记录数；platform 不在合法平台列表也视为异常
function countCorruptRecords(list, fields) {
  let n = 0;
  (list || []).forEach(r => {
    if (!r || typeof r !== 'object') return;
    let bad = false;
    fields.forEach(f => {
      if (bad) return;
      const v = r[f];
      if (f === 'platform' && v && ALL_PLATFORMS.indexOf(v) === -1) { bad = true; return; }
      if (hasCorruptChar(v)) bad = true;
    });
    if (bad) n++;
  });
  return n;
}

// ===== CONFIG =====
const VIDEO_PLATFORMS = ['抖音', '快手', '小红书', '视频号'];
const ARTICLE_PLATFORMS = ['百家号', '公众号', '知乎', '企鹅号', '搜狐号', '官网'];
const ALL_PLATFORMS = [...VIDEO_PLATFORMS, ...ARTICLE_PLATFORMS];
const PLATFORM_SHORT = { '抖音':'抖','快手':'快','小红书':'红','视频号':'视','百家号':'百','公众号':'公','知乎':'知','企鹅号':'企','搜狐号':'搜','官网':'官' };
const AI_ENGINES = ['DeepSeek', '豆包', '千问', '文心', '元宝', '纳米'];
const AI_ENGINES_SHORT = { 'DeepSeek': 'DS', '豆包': '豆包', '千问': '千问', '文心': '文心', '元宝': '元宝', '纳米': '纳米' };

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

// 批量保存（跨文件原子：后端先写全部 tmp，再全部 rename，失败自动回滚）
// updates: [{ key, val }, ...]
async function saveDataBatch(updates) {
  // 等待所有 key 的未完成保存
  for (const { key } of updates) {
    if (_inflightSaves[key]) {
      try { await _inflightSaves[key]; } catch (e) {}
    }
  }
  const p = fetch('/api/data/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  }).catch(e => console.warn('[saveDataBatch] 失败:', e));
  // 标记所有 key 为进行中
  updates.forEach(({ key }) => { _inflightSaves[key] = p; });
  try { await p; } catch (e) {}
  // 清除标记
  updates.forEach(({ key }) => { delete _inflightSaves[key]; });
}

// ===== STATE（异步初始化） =====
let contents = [];
let stats = [];       // video stats: views/likes/shares/comments
let aiStats = [];     // article AI inclusion stats
let reviews = [];     // 周/月复盘记录
let accountStats = []; // 视频平台账号总数据快照（投稿/粉丝/播放/点赞/评论/互动）
let accountIds = [];   // 视频平台账号ID（平台 → 账号ID + 备注，静态信息）

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

function getDayStr(d) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
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
    // 小红书数据语义迁移：旧示例数据的 completionRate → avgWatch（小红书官方字段是"人均观看时长"）
    if (s.platform === '小红书' && s.completionRate !== null && s.completionRate !== undefined && s.avgWatch === undefined) {
      s.avgWatch = s.completionRate;
      s.completionRate = null;
      migrated = true;
    }
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

// 复盘记录迁移：清理示例数据塞的多余字段
async function migrateReviews() {
  let migrated = false;
  reviews.forEach(r => {
    // 视图只存 6 字段：type/period/date/highlights/problems/plans/metrics
    // 旧示例数据塞了 ai 字段，删除
    if (r.ai !== undefined) { delete r.ai; migrated = true; }
  });
  if (migrated) await saveData('reviews', reviews);
}

// 账号数据迁移：旧字段 interactions → shares（互动量改名为总转发/分享）
async function migrateAccountStats() {
  let migrated = false;
  accountStats.forEach(s => {
    if (s.shares === undefined && s.interactions !== undefined) {
      s.shares = s.interactions;
      delete s.interactions;
      migrated = true;
    }
  });
  if (migrated) await saveData('accountStats', accountStats);
}

// ===== 异步初始化（暴露 storeReady 给 app.js 等待） =====
// storeReady：数据加载 + 任务生成 + 数据迁移全部完成后 resolve
window.storeReady = (async () => {
  try {
    // 并行加载 6 个数据文件
    [contents, stats, aiStats, reviews, accountStats, accountIds] = await Promise.all([
      loadData('contents'),
      loadData('stats'),
      loadData('aiStats'),
      loadData('reviews'),
      loadData('accountStats'),
      loadData('accountIds')
    ]);
    // 数据迁移
    await migrateStatsData();
    await migrateReviews();
    await migrateAccountStats();
    console.log('[store] 初始化完成', {
      contents: contents.length,
      stats: stats.length, aiStats: aiStats.length, reviews: reviews.length,
      accountStats: accountStats.length, accountIds: accountIds.length
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
let contentDateFilter = '';   // 内容登记日期筛选：''=全部 | today | yesterday | week | month
let contentSortByViews = '';
let contentFoldOpen = true;

// ===== 心跳检测：服务断开时显示横幅 =====
// 策略：每 5 秒定时 ping + 页面切回前台时立即 ping + render 时主动 ping
// 用户每次操作（点击/切换 tab）必然触发 render → 主动检测服务
let __serviceAlive = true;
let __lastPingTime = 0;

async function pingService(force) {
  const now = Date.now();
  if (!force && now - __lastPingTime < 2000) return;  // 2 秒内已 ping 过则跳过
  __lastPingTime = now;
  try {
    const res = await fetch('/api/data/contents?ping=1', { cache: 'no-store', signal: AbortSignal.timeout(2000) });
    if (!res.ok) throw new Error('not ok');
    if (!__serviceAlive) { __serviceAlive = true; hideServiceDeadBanner(); }
  } catch (e) {
    if (__serviceAlive) { __serviceAlive = false; showServiceDeadBanner(); }
  }
}

setInterval(() => pingService(true), 5000);

// 页面切回前台时立即 ping（visibilitychange）
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) pingService(true);
});

function showServiceDeadBanner() {
  if (document.getElementById('service-dead-banner')) return;
  const div = document.createElement('div');
  div.id = 'service-dead-banner';
  div.innerHTML = '⚠️ 后台服务已断开，请重新启动 <b>ViewStart.bat</b>（数据可能不完整）';
  div.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#e53e3e;color:#fff;text-align:center;padding:10px;z-index:99999;font-size:14px;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,0.3)';
  document.body.appendChild(div);
}
function hideServiceDeadBanner() {
  document.getElementById('service-dead-banner')?.remove();
}

// 暴露给 render 使用：用户每次操作时主动 ping
window.pingService = pingService;