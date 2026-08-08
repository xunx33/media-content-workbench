function exportData() {
  const data = { version: 3, exportedAt: new Date().toISOString(), tasks, contents, stats, aiStats, reviews };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `新媒体工作台_${getToday()}.json`; a.click();
  URL.revokeObjectURL(url); showToast('已导出');
}

// ===== 导出 Excel（HTML 表格，Excel 双击可直接打开）=====
// 列名中英文映射（让 Excel 报表可读）
const COLUMN_LABELS = {
  id: '编号',
  date: '日期',
  platform: '平台',
  type: '类型',
  done: '已完成',
  linked: '已关联内容',
  contentId: '内容ID',
  target: '目标',
  recorded: '已登记数据',
  title: '标题',
  topic: '话题/分类',
  url: '链接',
  createdAt: '创建时间',
  views: '播放量',
  completionRate: '完播率(%)',
  avgWatch: '人均观看时长(秒)',
  likes: '点赞',
  comments: '评论',
  favorites: '收藏',
  shares: '分享',
  followers: '涨粉',
  period: '周期',
  periodRange: '周期范围',
  highlights: '亮点',
  problems: '问题',
  metrics: '关键指标',
  plans: '下期计划',
  // AI 引擎列（来自 aiStats.ai 展开）
  'DeepSeek': 'DeepSeek',
  '豆包': '豆包',
  '千问': '千问',
  '文心': '文心',
  '元宝': '元宝',
  '纳米': '纳米',
};

// 类型英文 → 中文
const TYPE_LABELS = { video: '视频', article: '文书' };

// 复盘周期计算（与 data.js 的 formatReviewRange 逻辑一致）
function formatReviewRange(period, dateStr) {
  if (!dateStr) return period === 'month' ? '本月' : '本周';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return period === 'month' ? '本月' : '本周';
  const m = (n) => (n.getMonth() + 1) + '/' + n.getDate();
  if (period === 'month') {
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return '本月·' + m(start) + ' ~ ' + m(end);
  }
  const diffToMon = (d.getDay() + 6) % 7;
  const start = new Date(d); start.setDate(d.getDate() - diffToMon);
  const end = new Date(start); end.setDate(start.getDate() + 6);
  return '本周·' + m(start) + ' ~ ' + m(end);
}

// 复盘条目：period 合并成 "week 本周·8/3 ~ 8/9"，type 中文化，删除多余 ai 字段
function enrichReview(r) {
  const result = Object.assign({}, r);
  // 合并周期：分类 + 实际范围（一列搞定）
  result.period = (r.period || '') + ' ' + formatReviewRange(r.period, r.date);
  if (r.type && TYPE_LABELS[r.type]) result.type = TYPE_LABELS[r.type];
  // 视图只存 6 字段，ai 是示例数据塞的多余字段
  delete result.ai;
  return result;
}

// 任务条目：type 中文化
function enrichTask(t) {
  const result = Object.assign({}, t);
  if (t.type && TYPE_LABELS[t.type]) result.type = TYPE_LABELS[t.type];
  return result;
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// 把 aiStats 的 ai:{DeepSeek:true,...} 展开成多列
function flattenItem(item) {
  const result = Object.assign({}, item);
  if (item.ai && typeof item.ai === 'object') {
    Object.entries(item.ai).forEach(([engine, ok]) => {
      result[engine] = ok;
    });
    delete result.ai;
  }
  return result;
}

// 布尔值 → ✓/✗
function fmtCell(v) {
  if (v === true) return '✓';
  if (v === false) return '✗';
  return v;
}

// 通用表格生成：支持自定义 enricher（注入额外列 / 转中文）
function buildTable(items, title, enricher) {
  if (items.length === 0) return `<h2>${escapeHtml(title)}（0 条）</h2><p style="color:#999">（暂无数据）</p>`;

  // 先 enrich（如 reviews 加 periodRange），再 flatten（如 aiStats 展开 ai 字段）
  const enriched = enricher ? items.map(enricher) : items;
  const flat = enriched.map(flattenItem);
  const cols = [];
  const seen = new Set();
  flat.forEach(item => Object.keys(item).forEach(k => { if (!seen.has(k)) { seen.add(k); cols.push(k); } }));

  let html = `<h2>${escapeHtml(title)}（${items.length} 条）</h2><table>`;
  html += '<thead><tr>' + cols.map(c => `<th>${escapeHtml(COLUMN_LABELS[c] || c)}</th>`).join('') + '</tr></thead><tbody>';
  flat.forEach(item => {
    html += '<tr>' + cols.map(c => {
      const v = fmtCell(item[c]);
      const cell = v === undefined || v === null ? '' :
                   typeof v === 'object' ? JSON.stringify(v) : escapeHtml(v);
      // AI 引擎列 + 布尔值列加颜色
      let style = '';
      const isAiCol = ['DeepSeek', '豆包', '千问', '文心', '元宝', '纳米'].includes(c);
      const isBoolCol = ['done', 'linked', 'recorded'].includes(c);
      if (isAiCol || isBoolCol) {
        style = v === '✓' ? 'background:#d1fae5;color:#059669;font-weight:600;text-align:center;' :
                v === '✗' ? 'color:#9ca3af;text-align:center;' : '';
      }
      return `<td style="${style}">${cell}</td>`;
    }).join('') + '</tr>';
  });
  html += '</tbody></table>';
  return html;
}

function exportExcel() {
  // 每张表可指定 enricher：注入额外列 / 字段中文化
  const tables = [
    { name: '📋 任务清单 (tasks)', items: tasks, enricher: enrichTask },
    { name: '📝 内容登记 (contents)', items: contents },
    { name: '📊 视频数据 (stats)', items: stats },
    { name: '🤖 AI 收录 (aiStats)', items: aiStats },
    { name: '💭 复盘记录 (reviews)', items: reviews, enricher: enrichReview },
  ];

  let body = '';
  for (const t of tables) {
    body += buildTable(t.items, t.name, t.enricher);
  }

  // 数据统计概览
  const monthPrefix = getToday().substring(0, 7);
  const summary = `
<div class="summary">
  <h2>📈 数据概览</h2>
  <table style="width:auto;min-width:400px;">
    <tr><th>任务清单</th><td>${tasks.length} 条</td><th>本月已完成</th><td>${tasks.filter(t => t.date && t.date.startsWith(monthPrefix) && t.done).length} 条</td></tr>
    <tr><th>内容登记</th><td>${contents.length} 条</td><th>本月已登记</th><td>${contents.filter(c => c.createdAt && c.createdAt.startsWith(monthPrefix)).length} 条</td></tr>
    <tr><th>视频数据</th><td>${stats.length} 条</td><th>AI 收录</th><td>${aiStats.length} 条</td></tr>
    <tr><th>复盘记录</th><td>${reviews.length} 条</td><th>导出时间</th><td>${new Date().toLocaleString('zh-CN')}</td></tr>
  </table>
</div>`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>新媒体工作台数据报表_${getToday()}</title>
<style>
body { font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif; margin: 20px; color: #1f2937; line-height: 1.5; }
h1 { color: #1f2937; border-bottom: 3px solid #2563eb; padding-bottom: 10px; }
h2 { color: #2563eb; border-bottom: 2px solid #93c5fd; padding-bottom: 5px; margin-top: 30px; }
.summary { background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0; }
.summary table { background: white; }
table { border-collapse: collapse; width: 100%; margin: 10px 0 20px; font-size: 13px; }
th, td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; }
th { background: #f3f4f6; font-weight: 600; color: #374151; }
tr:nth-child(even) td { background: #f9fafb; }
tr:hover td { background: #eff6ff; }
.meta { color: #6b7280; font-size: 14px; margin: 5px 0; }
</style>
</head><body>
<h1>📊 新媒体工作台数据报表</h1>
<p class="meta">导出时间：${new Date().toLocaleString('zh-CN')}　|　<span style="color:#9ca3af;font-size:12px;">注：完播率适用于抖音/快手/视频号；小红书为人均观看时长 ｜ 类型「视频」=抖音/快手/小红书/视频号；类型「文书」=百家号/公众号/知乎/企鹅号/搜狐号/官网 ｜ 复盘记录的"周期"=周/月分类，"周期范围"=实际时间段</span></p>
${summary}
${body}
</body></html>`;

  const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `新媒体工作台_${getToday()}.xls`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('已导出 Excel 报表（中文列名 + AI 多列）');
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
    // 示例中 10 个平台都登记了内容，任务全部完成（contentId 对齐 1-10）
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
    { id: 10, title: '官网技术博客：API 性能优化实战', platform: '官网', topic: '技术博客/性能优化', url: 'https://example.com/blog/api-perf', createdAt: today },
  ];

  // 视频数据：4 个短视频平台各 1 条，contentId 对齐内容登记，日期对齐
  // 注意：小红书的"完播率"字段（35.8）是旧示例的硬编码占位值，
  //       小红书的官方指标是"人均观看时长"，所以用 avgWatch 字段、completionRate 留空
  stats = [
    { id: 101, platform: '抖音', date: today, contentId: 1, title: '新品开箱vlog：夏日防晒好物推荐', views: 12500, completionRate: 32.5, likes: 890, comments: 230, favorites: 156, shares: 120, followers: 35 },
    { id: 102, platform: '快手', date: today, contentId: 2, title: '街头美食探店EP38', views: 9800, completionRate: 28.1, likes: 670, comments: 156, favorites: 98, shares: 67, followers: 21 },
    { id: 103, platform: '小红书', date: today, contentId: 3, title: '618购物清单｜闭眼入的5件数码好物', views: 8200, completionRate: null, avgWatch: 18.5, likes: 1200, comments: 175, favorites: 342, shares: 89, followers: 58 },
    { id: 104, platform: '视频号', date: today, contentId: 4, title: '职场高效办公技巧合集', views: 5600, completionRate: 24.3, likes: 340, comments: 89, favorites: 76, shares: 45, followers: 12 },
  ];

  // AI 收录：6 个文书平台各 1 条，contentId 对齐内容登记
  aiStats = [
    { id: 201, platform: '知乎', date: today, contentId: 5, title: 'Python自动化脚本：批量处理Excel报表', ai: { 'DeepSeek': true, '豆包': true, '千问': false, '文心': true, '元宝': false, '纳米': false } },
    { id: 202, platform: '公众号', date: today, contentId: 6, title: '如何用AI提升10倍工作效率', ai: { 'DeepSeek': true, '豆包': false, '千问': true, '文心': true, '元宝': true, '纳米': false } },
    { id: 203, platform: '百家号', date: today, contentId: 7, title: '2024年AI工具大盘点', ai: { 'DeepSeek': false, '豆包': true, '千问': true, '文心': false, '元宝': false, '纳米': false } },
    { id: 204, platform: '企鹅号', date: today, contentId: 8, title: '新媒体运营入门指南', ai: { 'DeepSeek': true, '豆包': false, '千问': false, '文心': false, '元宝': false, '纳米': true } },
    { id: 205, platform: '搜狐号', date: today, contentId: 9, title: '内容创作者必备的5个习惯', ai: { 'DeepSeek': false, '豆包': false, '千问': false, '文心': false, '元宝': false, '纳米': false } },
    { id: 206, platform: '官网', date: today, contentId: 10, title: '官网技术博客：API 性能优化实战', ai: { 'DeepSeek': true, '豆包': true, '千问': true, '文心': false, '元宝': false, '纳米': false } },
  ];

  reviews = [
    { id: 301, type: 'article', period: 'week', date: today, highlights: '知乎技术文收录情况良好', problems: '公众号阅读量偏低，需要优化标题', plans: '下周重点优化公众号选题，尝试AI工具方向' },
    { id: 302, type: 'video', period: 'week', date: today, highlights: '抖音防晒选题播放量破万', problems: '小红书完播率偏低', metrics: '总播放约3.6w，完播率均值28%', plans: '尝试竖版封面+前3秒钩子' },
  ];

  saveData('tasks', tasks); saveData('contents', contents); saveData('stats', stats); saveData('aiStats', aiStats); saveData('reviews', reviews);
  render(); showToast('已重置示例数据');
    }
  });
}