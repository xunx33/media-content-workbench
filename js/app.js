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

render();
checkBackupReminder();
checkWeeklyReminder();
checkSampleDataVersion();
