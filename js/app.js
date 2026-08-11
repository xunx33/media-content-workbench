// ===== 渲染入口 =====
function render() {
  ensureDailyTasks();
  const html = {
    today: renderToday,
    calendar: renderCalendar,
    overview: renderOverview,
    content: renderContent,
    data: renderData,
    account: renderAccountTab
  };
  document.getElementById('mainContent').innerHTML = html[currentTab]();
  applyContentFold();
  // 用户每次操作（点击/切换 tab）时主动 ping，关闭服务后立即检测到
  if (window.pingService) window.pingService(true);
}

// 数据积累 30 条时，温和提示导出备份
function checkBackupReminder() {
  const total = tasks.length + contents.length + stats.length + aiStats.length;
  if (total >= 30 && !localStorage.getItem(STORAGE_KEY + 'backup_reminded')) {
    localStorage.setItem(STORAGE_KEY + 'backup_reminded', '1');
    showToast('数据已积累30条，建议导出备份');
  }
}

// 每周数据登记复盘 + AI收录筛查提醒
function checkWeeklyReminder() {
  const KEY = STORAGE_KEY + 'weekly_remind';
  const last = localStorage.getItem(KEY);
  const today = getToday();
  if (!last) {
    localStorage.setItem(KEY, today);
    return;
  }
  const lastDate = new Date(last);
  const diffDays = Math.floor((new Date(today + 'T00:00:00') - lastDate) / 86400000);
  if (diffDays >= 7) {
    const weekAgo = new Date(Date.now() - 6 * 86400000);
    const weekAgoStr = getDayStr(weekAgo);
    const weekContents = contents.filter(c => c.createdAt >= weekAgoStr && c.createdAt <= today);
    const pendingCount = weekContents.filter(c => {
      if (isVideo(c.platform)) {
        return !stats.some(s => s.contentId == c.id || s.contentId == Number(c.id) || (s.platform === c.platform && s.date === c.createdAt));
      }
      return !aiStats.some(s => s.contentId == c.id || s.contentId == Number(c.id) || (s.platform === c.platform && s.date === c.createdAt));
    }).length;
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

// ===== 启动：等 store.js 数据加载完成再渲染 =====
(async () => {
  // 等待 store.js 的异步初始化（loadData + ensureDailyTasks + migrateStatsData）
  if (window.storeReady) {
    try { await window.storeReady; } catch (e) { console.error('store 初始化失败', e); }
  }
  render();
  checkBackupReminder();
  checkWeeklyReminder();
  checkSampleDataVersion();
})();

// ===== PWA：注册 Service Worker（本地 localhost 或 https 才支持安装）=====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(e => console.warn('[SW] 注册失败:', e));
  });
}