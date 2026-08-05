function exportData() {
  const data = { version: 3, exportedAt: new Date().toISOString(), tasks, contents, stats, aiStats, reviews };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `新媒体工作台_${getToday()}.json`; a.click();
  URL.revokeObjectURL(url); showToast('已导出');
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (data.tasks) { tasks = data.tasks; saveData('tasks', tasks); }
      if (data.contents) { contents = data.contents; saveData('contents', contents); }
      if (data.stats) { stats = data.stats; saveData('stats', stats); }
      if (data.aiStats) { aiStats = data.aiStats; saveData('aiStats', aiStats); }
      if (data.reviews) { reviews = data.reviews; saveData('reviews', reviews); }
      render(); showToast('导入成功');
    } catch(err) { showToast('导入失败：文件格式错误'); }
  };
  reader.readAsText(file); event.target.value = '';
}

function clearAllData() {
  document.getElementById('modalContent').innerHTML = `
    <h3>确认清空</h3>
    <p class="confirm-text">即将清空所有数据（发布任务、内容登记、视频数据、AI收录数据），此操作不可恢复！<br><br>建议先导出备份。</p>
    <div class="modal-actions">
      <button class="btn-cancel" onclick="closeModal()">取消</button>
      <button class="btn-save" style="background:linear-gradient(135deg,#f87171,#ef4444);" onclick="confirmClear()">确认清空</button>
    </div>`;
  document.getElementById('modalOverlay').classList.add('active');
}

function confirmClear() {
  tasks = []; contents = []; stats = []; aiStats = []; reviews = [];
  saveData('tasks', tasks); saveData('contents', contents); saveData('stats', stats); saveData('aiStats', aiStats); saveData('reviews', reviews);
  selectedDate = null; closeModal(); ensureDailyTasks(); render();
  showToast('已清空，已重置今日任务');
}

function fillSampleData() {
  showConfirm({
    title: '重置示例数据',
    desc: '将重置为示例数据，当前数据会被覆盖。是否继续？',
    danger: true,
    onOk: () => {
      const today = getToday();
      const yestDate = new Date(Date.now() - 86400000);
      const yest = yestDate.getFullYear() + '-' + String(yestDate.getMonth()+1).padStart(2,'0') + '-' + String(yestDate.getDate()).padStart(2,'0');

      tasks = [];
  ALL_PLATFORMS.forEach((p, i) => {
    // 示例中 9 个平台都登记了内容，任务全部完成（contentId 对齐 1-9）
    tasks.push({ id: Date.now() + i, date: today, platform: p, type: isVideo(p) ? 'video' : 'article', done: true, linked: true, contentId: i + 1, target: DAILY_TARGET });
  });
  tasks.push({ id: Date.now() + 100, date: yest, platform: '快手', type: 'video', done: false, linked: false, contentId: null, target: DAILY_TARGET });

  contents = [
    // 短视频 4 个
    { id: 1, title: '新品开箱vlog：夏日防晒好物推荐', platform: '抖音', topic: '好物推荐/防晒', url: 'https://www.douyin.com/video/7234567890', createdAt: today },
    { id: 2, title: '街头美食探店EP38', platform: '快手', topic: '探店/美食', url: 'https://www.kuaishou.com/short-video/3x9f2a', createdAt: today },
    { id: 3, title: '618购物清单｜闭眼入的5件数码好物', platform: '小红书', topic: '数码好物/购物清单', url: 'https://www.xiaohongshu.com/explore/abc123', createdAt: today },
    { id: 4, title: '职场高效办公技巧合集', platform: '视频号', topic: '职场技能/效率', url: 'https://channels.weixin.qq.com/p/8888', createdAt: today },
    // 文书 5 个
    { id: 5, title: 'Python自动化脚本：批量处理Excel报表', platform: '知乎', topic: 'Python/自动化/教程', url: 'https://zhuanlan.zhihu.com/p/123456', createdAt: today },
    { id: 6, title: '如何用AI提升10倍工作效率', platform: '公众号', topic: 'AI工具/效率提升', url: 'https://mp.weixin.qq.com/s/xxxxx', createdAt: today },
    { id: 7, title: '2024年AI工具大盘点', platform: '百家号', topic: 'AI工具/盘点', url: 'https://baijiahao.baidu.com/s?id=777', createdAt: today },
    { id: 8, title: '新媒体运营入门指南', platform: '企鹅号', topic: '运营技巧/入门', url: 'https://om.qq.com/article/555', createdAt: today },
    { id: 9, title: '内容创作者必备的5个习惯', platform: '搜狐号', topic: '创作者/习惯', url: 'https://www.sohu.com/a/666', createdAt: today },
  ];

  // 视频数据：4 个短视频平台各 1 条，contentId 对齐内容登记，日期对齐
  stats = [
    { id: 101, platform: '抖音', date: today, contentId: 1, title: '新品开箱vlog：夏日防晒好物推荐', views: 12500, completionRate: 32.5, likes: 890, comments: 230, favorites: 156, shares: 120, followers: 35 },
    { id: 102, platform: '快手', date: today, contentId: 2, title: '街头美食探店EP38', views: 9800, completionRate: 28.1, likes: 670, comments: 156, favorites: 98, shares: 67, followers: 21 },
    { id: 103, platform: '小红书', date: today, contentId: 3, title: '618购物清单｜闭眼入的5件数码好物', views: 8200, completionRate: 35.8, likes: 1200, comments: 175, favorites: 342, shares: 89, followers: 58 },
    { id: 104, platform: '视频号', date: today, contentId: 4, title: '职场高效办公技巧合集', views: 5600, completionRate: 24.3, likes: 340, comments: 89, favorites: 76, shares: 45, followers: 12 },
  ];

  // AI 收录：5 个文书平台各 1 条，contentId 对齐内容登记
  aiStats = [
    { id: 201, platform: '知乎', date: today, contentId: 5, title: 'Python自动化脚本：批量处理Excel报表', ai: { 'DeepSeek': true, '豆包': true, '千问': false, '文心': true, '元宝': false, '纳米': false } },
    { id: 202, platform: '公众号', date: today, contentId: 6, title: '如何用AI提升10倍工作效率', ai: { 'DeepSeek': true, '豆包': false, '千问': true, '文心': true, '元宝': true, '纳米': false } },
    { id: 203, platform: '百家号', date: today, contentId: 7, title: '2024年AI工具大盘点', ai: { 'DeepSeek': false, '豆包': true, '千问': true, '文心': false, '元宝': false, '纳米': false } },
    { id: 204, platform: '企鹅号', date: today, contentId: 8, title: '新媒体运营入门指南', ai: { 'DeepSeek': true, '豆包': false, '千问': false, '文心': false, '元宝': false, '纳米': true } },
    { id: 205, platform: '搜狐号', date: today, contentId: 9, title: '内容创作者必备的5个习惯', ai: { 'DeepSeek': false, '豆包': false, '千问': false, '文心': false, '元宝': false, '纳米': false } },
  ];

  reviews = [
    { id: 301, type: 'article', period: 'week', date: today, highlights: '知乎技术文收录情况良好', problems: '公众号阅读量偏低，需要优化标题', ai: 'DeepSeek、豆包收录正常，千问收录率待提升', plans: '下周重点优化公众号选题，尝试AI工具方向' },
    { id: 302, type: 'video', period: 'week', date: today, highlights: '抖音防晒选题播放量破万', problems: '小红书完播率偏低', metrics: '总播放约3.6w，完播率均值28%', plans: '尝试竖版封面+前3秒钩子' },
  ];

  saveData('tasks', tasks); saveData('contents', contents); saveData('stats', stats); saveData('aiStats', aiStats); saveData('reviews', reviews);
  render(); showToast('已重置示例数据');
    }
  });
}

