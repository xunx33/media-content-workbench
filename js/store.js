// ===== CONFIG =====
const VIDEO_PLATFORMS = ['抖音', '快手', '小红书', '视频号'];
const ARTICLE_PLATFORMS = ['百家号', '公众号', '知乎', '企鹅号', '搜狐号'];
const ALL_PLATFORMS = [...VIDEO_PLATFORMS, ...ARTICLE_PLATFORMS];
const PLATFORM_SHORT = { '抖音':'抖','快手':'快','小红书':'红','视频号':'视','百家号':'百','公众号':'公','知乎':'知','企鹅号':'企','搜狐号':'搜' };
const AI_ENGINES = ['DeepSeek', '豆包', '千问', '文心', '元宝', '纳米'];
const AI_ENGINES_SHORT = { 'DeepSeek': 'DS', '豆包': '豆包', '千问': '千问', '文心': '文心', '元宝': '元宝', '纳米': '纳米' };
const DAILY_TARGET = 1;

const STORAGE_KEY = 'wb_content_workbench_v2_';

function loadData(key) { try { return JSON.parse(localStorage.getItem(STORAGE_KEY + key)) || []; } catch(e){ return []; } }
function saveData(key, val) { localStorage.setItem(STORAGE_KEY + key, JSON.stringify(val)); }

let tasks = loadData('tasks');
let contents = loadData('contents');
let stats = loadData('stats');       // video stats: views/likes/shares/comments
let aiStats = loadData('aiStats');   // article AI inclusion stats
let reviews = loadData('reviews');   // 周/月复盘记录

function getToday() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function isVideo(p) { return VIDEO_PLATFORMS.includes(p); }
function isArticle(p) { return ARTICLE_PLATFORMS.includes(p); }

// Ensure daily tasks: each platform 1 task per day.
// Also backfill all days from start of current month up to today so monthly stats are meaningful.
function ensureDailyTasks() {
  const today = new Date();
  const todayStr = getToday();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  let changed = false;

  // Backfill: month start → today (so 月总量 reflects actual month progress)
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

  // 兼容旧数据：旧版 done=true 的任务，自动补上 linked/recorded 字段
  let migrated = false;
  tasks.forEach(t => {
    if (t.linked === undefined) { t.linked = t.done || false; migrated = true; }
    if (t.recorded === undefined) { t.recorded = false; migrated = true; }
    if (t.contentId === undefined) { t.contentId = null; migrated = true; }
  });
  if (changed || migrated) saveData('tasks', tasks);
}

function getDayStr(d) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

// 数据自动迁移：给旧版 stats/aiStats 补 contentId + title，避免「未关联」
function migrateStatsData() {
  let migrated = false;
  // stats：按 platform+date 匹配内容，补 contentId/title/completionRate/favorites
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
  // aiStats：按 platform+date 匹配内容，补 contentId
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
    saveData('stats', stats);
    saveData('aiStats', aiStats);
  }
}

ensureDailyTasks();
migrateStatsData();

// ===== STATE =====
let currentTab = 'today';
let currentMonth = new Date();
let selectedDate = null;
let dataSubTab = 'video'; // 'video' or 'article'
let editId = null;
let overviewMonth = new Date();
let searchKeyword = '';
let contentFilterType = '';   // '' | 'today' | 'video' | 'article'
let contentFoldOpen = true;   // 内容登记列表折叠状态
