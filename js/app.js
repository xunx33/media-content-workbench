function render() {
  ensureDailyTasks();
  const html = {
    today: renderToday,
    calendar: renderCalendar,
    overview: renderOverview,
    content: renderContent,
    data: renderData
  };
  document.getElementById('mainContent').innerHTML = html[currentTab]();
  applyContentFold();
}

function checkBackupReminder() {
  const total = tasks.length + contents.length + stats.length + aiStats.length;
  if (total >= 30 && !localStorage.getItem(STORAGE_KEY + 'backup_reminded')) {
    localStorage.setItem(STORAGE_KEY + 'backup_reminded', '1');
    showToast('数据已积累30条，建议导出备份');
  }
}

// ===== 每周数据登记复盘 + AI收录筛查提醒 =====
function checkWeeklyReminder() {
  const KEY = STORAGE_KEY + 'weekly_remind';
  const last = localStorage.getItem(KEY);
  const today = getToday();
  // 首次使用：记录今天，不打扰
  if (!last) {
    localStorage.setItem(KEY, today);
    return;
  }
  // 距离上次提醒 >= 7 天则提醒
  const lastDate = new Date(last);
  const diffDays = Math.floor((new Date(today + 'T00:00:00') - lastDate) / 86400000);
  if (diffDays >= 7) {
    // 检查本周有内容但未录入数据的条数（以登记为准）
    const weekAgo = new Date(Date.now() - 6 * 86400000);
    const weekAgoStr = getDayStr(weekAgo);
    const weekContents = contents.filter(c => c.createdAt >= weekAgoStr && c.createdAt <= today);
    const pendingCount = weekContents.filter(c => {
      if (isVideo(c.platform)) {
        return !stats.some(s => s.contentId == c.id || s.contentId == Number(c.id) || (s.platform === c.platform && s.date === c.createdAt));
      }
      return !aiStats.some(s => s.contentId == c.id || s.contentId == Number(c.id) || (s.platform === c.platform && s.date === c.createdAt));
    }).length;
    // 检查本周是否已有复盘记录
    const hasReview = reviews.some(r => r.date >= weekAgoStr && r.date <= today);
    let msg;
    if (pendingCount > 0) {
      msg = `📊 已到每周复盘时间，本周还有 ${pendingCount} 条内容未录入数据，建议补录后复盘`;
    } else if (!hasReview) {
      msg = `📊 已到每周复盘时间，记得进行一次数据登记复盘 + AI收录情况筛查`;
    } else {
      msg = `📊 已到每周复盘时间，本周复盘已完成，继续保持！`;
    }
    showToast(msg);
    localStorage.setItem(KEY, today);
  }
}

// 访客分享模式不先渲染本地数据（等云端），正常模式正常渲染
const _isShareMode = window.CloudBridge && window.CloudBridge.isShareMode && window.CloudBridge.isShareMode();
if (!_isShareMode) {
  render();
  checkBackupReminder();
  checkWeeklyReminder();
  checkSampleDataVersion();
}

// ===== 云接入启动（CloudBridge 由 cloud.js 定义） =====
function initCloudApp() {
  if (!window.CloudBridge) return;
  // 渲染云状态条
  const bar = document.getElementById('cloudBar');
  if (bar) bar.innerHTML = '';
  CloudBridge.onAuthChange(() => {
    if (window.CloudUI && window.CloudUI.renderBar) window.CloudUI.renderBar();
  });
  // 访客分享模式：只读，隐藏编辑入口，不先渲染本地数据
  if (CloudBridge.isShareMode()) {
    document.body.classList.add('share-mode');
    const fab = document.getElementById('fabBtn');
    if (fab) fab.style.display = 'none';
    const backup = document.querySelector('.backup-bar');
    if (backup) backup.style.display = 'none';
    const main = document.getElementById('mainContent');
    if (main) main.innerHTML = '<div class="card"><p style="font-size:13px;color:var(--text3);text-align:center;padding:30px;">正在加载分享数据...</p></div>';
    // 拉取分享数据后渲染
    CloudBridge.loadSharedData().then(ok => {
      if (ok) {
        render();
        if (window.CloudUI && window.CloudUI.renderBar) window.CloudUI.renderBar();
      } else {
        const m = document.getElementById('mainContent');
        if (m) m.innerHTML = '<div class="card"><p style="font-size:14px;color:var(--red);text-align:center;padding:30px;">分享链接无效或已关闭</p></div>';
      }
    });
    return;
  }
  // 正常模式：初始化云 SDK
  CloudBridge.initCloud();
  if (window.CloudUI && window.CloudUI.renderBar) window.CloudUI.renderBar();
}
initCloudApp();
