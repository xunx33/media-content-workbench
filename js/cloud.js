// ===== CloudBase 云接入核心模块 =====
// 依赖：js/cloud-config.js（环境配置）
// 职责：账号登录、数据云同步、分享模式
// 设计：无侵入 —— store.js 的 loadData/saveData 签名不变，登录后自动双写

// ===== 初始化 =====
let cloud = null;          // CloudBase 实例
let auth = null;           // 认证实例
let isCloudReady = false;  // SDK 是否就绪
let isLoggedIn = false;    // 是否已登录
let isShareMode = false;   // 是否访客只读模式
let shareToken = null;     // 分享令牌（URL ?view= 参数）
let syncPending = {};      // 待同步队列（离线时暂存）

// 登录态持久化 key（与 store.js 隔离）
const AUTH_KEY = 'wb_cloud_auth_v1';

// ===== 模块加载时立即检测分享模式（不依赖 initCloud）=====
(function() {
  const params = new URLSearchParams(location.search);
  const token = params.get('view');
  if (token) {
    shareToken = token;
    isShareMode = true;
  }
})();

// ===== 启动：检测分享模式 / 恢复登录态 =====
// 异步：动态加载 CloudBase SDK（ES Module 方式，兼容无打包器的纯静态部署）
async function initCloud() {
  // 分享模式：访客只读（已在模块加载时检测）
  if (isShareMode) {
    document.body.classList.add('share-mode');
    return;
  }

  // 非分享模式：动态加载 SDK 并恢复登录
  try {
    const mod = await import('https://cdn.jsdelivr.net/npm/@cloudbase/js-sdk@3.7.1/dist/index.esm.js');
    const cloudbase = (mod && (mod.default || mod.cloudbase)) || window.cloudbase;
    if (!cloudbase) throw new Error('SDK 加载后未找到 cloudbase 导出');
    window.cloudbase = cloudbase; // 暴露给其他可能的引用
    cloud = cloudbase.init({ env: CLOUD_CONFIG.envId });
    auth = cloud.auth({ persistence: 'local' });
    isCloudReady = true;
    // 恢复登录态
    auth.getLoginState().then(state => {
      if (state) {
        isLoggedIn = true;
        document.body.classList.add('cloud-logged-in');
        pullFromCloud(); // 登录后拉取云端数据
      }
      emitAuthChange();
    });
  } catch (e) {
    console.warn('[cloud] 初始化失败:', e);
    if (window.showToast) window.showToast('云端初始化失败：' + (e.message || '请检查网络'));
  }
}

// 注意：启动调用由 app.js 的 CloudBridge.initCloud() 统一触发，避免重复初始化

// ===== 登录 / 注册 =====
// 账号密码登录（云函数 login 校验并签发 ticket）
async function loginWithPassword(username, password) {
  if (!isCloudReady) throw new Error('云端未初始化');
  const res = await cloud.callFunction({
    name: 'login',
    data: { username: username.trim(), password }
  });
  if (!res || res.result === undefined) throw new Error('登录失败，请重试');
  const r = res.result;
  if (!r.ok) throw new Error(r.msg || '登录失败');
  // 用 ticket 完成登录
  await auth.signInWithTicket(r.ticket);
  isLoggedIn = true;
  document.body.classList.add('cloud-logged-in');
  localStorage.setItem(AUTH_KEY, username.trim());
  await pullFromCloud();
  emitAuthChange();
  return r.msg || '登录成功';
}

// 注册账号（云函数 register：首次设置账号密码）
async function registerWithPassword(username, password) {
  if (!isCloudReady) throw new Error('云端未初始化');
  const res = await cloud.callFunction({
    name: 'register',
    data: { username: username.trim(), password }
  });
  if (!res || res.result === undefined) throw new Error('注册失败');
  const r = res.result;
  if (!r.ok) throw new Error(r.msg || '注册失败');
  // 注册成功后自动登录
  return loginWithPassword(username, password);
}

// 登出
async function logoutCloud() {
  if (auth) { try { await auth.signOut(); } catch(e){} }
  isLoggedIn = false;
  document.body.classList.remove('cloud-logged-in');
  localStorage.removeItem(AUTH_KEY);
  emitAuthChange();
}

function getLoginUsername() {
  return localStorage.getItem(AUTH_KEY) || '';
}

// 登录态变化回调
let _authListeners = [];
function onAuthChange(fn) { _authListeners.push(fn); }
function emitAuthChange() { _authListeners.forEach(fn => { try { fn(); } catch(e){} }); }

// ===== 数据云同步（5 张表整体上传/拉取）=====
// 集合：contents / tasks / stats / aiStats / reviews（每张表一个文档，doc 存整个数组）
const CLOUD_COLLECTIONS = ['contents', 'tasks', 'stats', 'aiStats', 'reviews'];

// 上传：将本地 5 张表整体写入云端（覆盖式，个人单设备适用）
async function pushToCloud() {
  if (!isLoggedIn || !isCloudReady) return false;
  const db = cloud.database();
  const data = {
    contents, tasks, stats, aiStats, reviews,
    _updatedAt: Date.now()
  };
  try {
    await db.collection('workbench_sync').doc('main').set({ data });
    return true;
  } catch (e) {
    console.warn('[cloud] 上传失败:', e);
    return false;
  }
}

// 拉取：从云端读取 5 张表覆盖本地（登录后 / 手动刷新）
async function pullFromCloud() {
  if (!isLoggedIn || !isCloudReady) return false;
  const db = cloud.database();
  try {
    const res = await db.collection('workbench_sync').doc('main').get();
    const d = res && res.data && res.data.data;
    if (!d) return false;
    if (Array.isArray(d.contents)) { contents = d.contents; saveData('contents', contents); }
    if (Array.isArray(d.tasks)) { tasks = d.tasks; saveData('tasks', tasks); }
    if (Array.isArray(d.stats)) { stats = d.stats; saveData('stats', stats); }
    if (Array.isArray(d.aiStats)) { aiStats = d.aiStats; saveData('aiStats', aiStats); }
    if (Array.isArray(d.reviews)) { reviews = d.reviews; saveData('reviews', reviews); }
    return true;
  } catch (e) {
    console.warn('[cloud] 拉取失败:', e);
    return false;
  }
}

// ===== 分享模式：访客只读拉取 =====
// 访客带 ?view=令牌 访问 → 云函数 share_get 校验令牌返回数据（只读）
async function loadSharedData() {
  if (!shareToken) return false;
  if (typeof cloudbase === 'undefined') {
    // 未部署时：分享模式仅读本地（开发调试用）
    return false;
  }
  try {
    cloud = cloudbase.init({ env: CLOUD_CONFIG.envId });
    const db = cloud.database({ usePrivateProtocol: false });
    const res = await cloud.callFunction({
      name: 'share_get',
      data: { token: shareToken }
    });
    const r = res && res.result;
    if (!r || !r.ok) return false;
    const d = r.data;
    if (Array.isArray(d.contents)) contents = d.contents;
    if (Array.isArray(d.tasks)) tasks = d.tasks;
    if (Array.isArray(d.stats)) stats = d.stats;
    if (Array.isArray(d.aiStats)) aiStats = d.aiStats;
    if (Array.isArray(d.reviews)) reviews = d.reviews;
    return true;
  } catch (e) {
    console.warn('[cloud] 分享数据拉取失败:', e);
    return false;
  }
}

// ===== 分享管理（主账号用）：生成/关闭分享令牌 =====
// 云函数 share_manage：生成新令牌 / 关闭分享 / 查询状态
async function generateShareToken() {
  if (!isLoggedIn || !isCloudReady) throw new Error('请先登录');
  const res = await cloud.callFunction({ name: 'share_manage', data: Object.assign({ username: getLoginUsername() || '' }, { action: 'enable' }) });
  const r = res && res.result;
  if (!r || !r.ok) throw new Error(r && r.msg || '生成失败');
  return r.token;
}

async function disableShare() {
  if (!isLoggedIn || !isCloudReady) return;
  await cloud.callFunction({ name: 'share_manage', data: Object.assign({ username: getLoginUsername() || '' }, { action: 'disable' }) });
}

// 组装分享链接
function buildShareUrl(token) {
  const base = location.origin + location.pathname;
  return base + '?view=' + token;
}

// 查询分享状态（主账号用）
async function queryShareStatus() {
  if (!isLoggedIn || !isCloudReady) return { enabled: false, token: '' };
  const res = await cloud.callFunction({ name: 'share_manage', data: Object.assign({ username: getLoginUsername() || '' }, { action: 'status' }) });
  const r = res && res.result;
  return r && r.ok ? { enabled: !!r.enabled, token: r.token || '' } : { enabled: false, token: '' };
}

// ===== 数据变更自动同步（store.js 调用）=====
// 在 saveData 写入本地后触发（防抖 1.5s，合并连续写入）
let _syncTimer = null;
function scheduleCloudSync() {
  if (!isLoggedIn || !isCloudReady) return;
  clearTimeout(_syncTimer);
  _syncTimer = setTimeout(() => { pushToCloud(); }, 1500);
}

// ===== 暴露给全局 =====
window.CloudBridge = {
  initCloud,
  loginWithPassword,
  registerWithPassword,
  logoutCloud,
  getLoginUsername,
  onAuthChange,
  isLoggedIn: () => isLoggedIn,
  isCloudReady: () => isCloudReady,
  isShareMode: () => isShareMode,
  getShareToken: () => shareToken,
  pushToCloud,
  pullFromCloud,
  generateShareToken,
  disableShare,
  queryShareStatus,
  buildShareUrl,
  scheduleCloudSync,
  loadSharedData
};
