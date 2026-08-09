function exportData() {
  const data = { version: 3, exportedAt: new Date().toISOString(), tasks, contents, stats, aiStats, reviews };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `新媒体工作台_${getToday()}.json`; a.click();
  URL.revokeObjectURL(url); showToast('已导出');
}

// ===== 导出 Excel（HTML 表格，Excel 双击可直接打开）=====
// 四张表：数据概览 / 内容登记 / 视频数据 / 文书收录数据
// 整体按「日期 + 平台」分组，同一日期的单元格纵向合并；只显示登记条数，不显示任务完成
// 支持导出范围：全部 / 本周（周一~周日）/ 本月（日历月），区间复用数据复盘页的 getPeriodRanges

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// 数字单元格：数字原样输出（含 0），null/undefined/空 → 空字符串
function cellNum(v) {
  if (typeof v === 'number') return v;
  if (v === null || v === undefined || v === '') return '';
  const n = Number(v);
  return isNaN(n) ? v : n;
}

// 各视频平台「适用」的指标：不适用的指标在报表中留白，而非显示 0
// （抖音/快手看完播率+收藏；小红书看人均观看+收藏；视频号看完成率+推荐，不记收藏）
const VIDEO_METRIC_APPLY = {
  '抖音':   { completionRate: true,  avgWatch: false, favorites: true,  recommend: false },
  '快手':   { completionRate: true,  avgWatch: false, favorites: true,  recommend: false },
  '小红书': { completionRate: false, avgWatch: true,  favorites: true,  recommend: false },
  '视频号': { completionRate: true,  avgWatch: false, favorites: false, recommend: true },
};
// 视频指标：平台不适用该项时留白（例如视频号不记收藏、小红书不记完播率）
function videoMetric(s, key) {
  const apply = VIDEO_METRIC_APPLY[s.platform];
  if (apply && apply[key] === false) return '';
  return cellNum(s[key]);
}

// AI 收录引擎 → ✓（绿）= 已收录；未收录则留白（不显示叉叉）
function aiCell(ok) {
  return ok ? '<span style="color:#059669;font-weight:700;">✓</span>' : '';
}

// 通用「日期合并」表格：groups = [{ date, rows: [[cellHtml,...], ...] }]
function buildMergedTable(title, colHeaders, groups, note) {
  const total = groups.reduce((n, g) => n + g.rows.length, 0);
  if (total === 0) return `<h2>${escapeHtml(title)}（0 条）</h2><p style="color:#999">（暂无数据）</p>`;
  let html = `<h2>${escapeHtml(title)}（${total} 条）</h2>`;
  if (note) html += `<p style="color:#9ca3af;font-size:12px;margin:2px 0 8px;">${escapeHtml(note)}</p>`;
  html += '<table><thead><tr>' + colHeaders.map(h => `<th>${escapeHtml(h)}</th>`).join('') + '</tr></thead><tbody>';
  groups.forEach(g => {
    g.rows.forEach((cells, i) => {
      html += '<tr>';
      // 同日期首行写入日期格并纵向合并后续行
      if (i === 0) {
        html += `<td rowspan="${g.rows.length}" style="vertical-align:middle;font-weight:600;background:#f0f7ff;white-space:nowrap;">${escapeHtml(g.date)}</td>`;
      }
      html += cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
    });
  });
  html += '</tbody></table>';
  return html;
}

// 数据概览：总体指标 + 各平台分布 + 每日分布
function buildOverviewSheet(ds) {
  const contents = ds.contents;
  const videoCount = contents.filter(c => isVideo(c.platform)).length;
  const articleCount = contents.filter(c => isArticle(c.platform)).length;
  const platformCounts = {};
  ALL_PLATFORMS.forEach(p => { platformCounts[p] = contents.filter(c => c.platform === p).length; });
  const dateCounts = {};
  contents.forEach(c => { const d = c.createdAt || '未注明日期'; dateCounts[d] = (dateCounts[d] || 0) + 1; });
  const dates = Object.keys(dateCounts).sort();
  const dateRange = dates.length ? `${dates[0]} ~ ${dates[dates.length - 1]}` : '-';
  const activePlatforms = ALL_PLATFORMS.filter(p => platformCounts[p] > 0).length;

  let html = `<h2>数据概览</h2>`;
  html += '<table style="width:auto;min-width:440px;margin-bottom:18px;"><tbody>';
  html += `<tr><th>内容登记总数</th><td>${contents.length} 条</td><th>覆盖平台</th><td>${activePlatforms}/${ALL_PLATFORMS.length} 个</td></tr>`;
  html += `<tr><th>视频内容</th><td>${videoCount} 条</td><th>文书内容</th><td>${articleCount} 条</td></tr>`;
  html += `<tr><th>日期范围</th><td colspan="3">${escapeHtml(dateRange)}</td></tr>`;
  html += '</tbody></table>';

  html += '<h3 style="margin:14px 0 6px;color:#374151;">各平台登记分布</h3>';
  html += '<table style="width:auto;min-width:440px;margin-bottom:18px;"><thead><tr><th>平台</th><th>类型</th><th>登记条数</th></tr></thead><tbody>';
  ALL_PLATFORMS.forEach(p => {
    html += `<tr><td>${escapeHtml(p)}</td><td>${isVideo(p) ? '视频' : '文书'}</td><td style="text-align:center;">${platformCounts[p]}</td></tr>`;
  });
  html += '</tbody></table>';

  html += '<h3 style="margin:14px 0 6px;color:#374151;">每日登记分布</h3>';
  html += '<table style="width:auto;min-width:440px;"><thead><tr><th>日期</th><th>登记条数</th></tr></thead><tbody>';
  if (dates.length === 0) html += '<tr><td colspan="2" style="color:#999;">（暂无数据）</td></tr>';
  else dates.forEach(d => { html += `<tr><td>${escapeHtml(d)}</td><td style="text-align:center;">${dateCounts[d]}</td></tr>`; });
  html += '</tbody></table>';
  return html;
}

// 内容登记：日期 + 平台 + 登记条数（仅显示有登记内容的平台）
function buildContentRegSheet(ds) {
  const contents = ds.contents;
  const map = {};
  contents.forEach(c => {
    const d = c.createdAt || '未注明日期';
    (map[d] = map[d] || {});
    map[d][c.platform] = (map[d][c.platform] || 0) + 1;
  });
  const dates = Object.keys(map).sort();
  const groups = dates.map(d => ({
    date: d,
    rows: ALL_PLATFORMS
      .filter(p => map[d][p] > 0)
      .map(p => [escapeHtml(p), String(map[d][p])])
  }));
  return buildMergedTable('内容登记', ['日期', '平台', '登记条数'], groups,
    '按日期分组（同日期合并）；仅列出当天有登记内容的平台，只显示登记条数');
}

// 视频数据：来自 stats
function buildVideoSheet(ds) {
  const stats = ds.stats;
  const map = {};
  stats.forEach(s => {
    const d = s.date || '未注明日期';
    (map[d] = map[d] || []).push(s);
  });
  const dates = Object.keys(map).sort();
  const groups = dates.map(d => ({
    date: d,
    rows: map[d]
      .slice()
      .sort((a, b) => VIDEO_PLATFORMS.indexOf(a.platform) - VIDEO_PLATFORMS.indexOf(b.platform))
      .map(s => [
        escapeHtml(s.platform),
        escapeHtml(s.title || ''),
        cellNum(s.views),
        videoMetric(s, 'completionRate'),
        videoMetric(s, 'avgWatch'),
        cellNum(s.likes),
        cellNum(s.comments),
        videoMetric(s, 'favorites'),
        videoMetric(s, 'recommend'),
        cellNum(s.shares),
        cellNum(s.followers),
      ])
  }));
  return buildMergedTable('视频数据',
    ['日期', '平台', '标题', '播放量', '完播率(%)', '人均观看(秒)', '点赞', '评论', '收藏', '推荐', '分享', '涨粉'],
    groups,
    '抖音/快手/视频号看「完播率」，小红书看「人均观看」；视频号看「推荐」、不记收藏');
}

// 文书收录数据：来自 aiStats
function buildAiSheet(ds) {
  const aiStats = ds.aiStats;
  const map = {};
  aiStats.forEach(s => {
    const d = s.date || '未注明日期';
    (map[d] = map[d] || []).push(s);
  });
  const dates = Object.keys(map).sort();
  const groups = dates.map(d => ({
    date: d,
    rows: map[d]
      .slice()
      .sort((a, b) => ARTICLE_PLATFORMS.indexOf(a.platform) - ARTICLE_PLATFORMS.indexOf(b.platform))
      .map(s => {
        const ai = (s.ai && typeof s.ai === 'object') ? s.ai : {};
        const engineCells = AI_ENGINES.map(eng => aiCell(ai[eng]));
        return [escapeHtml(s.platform), escapeHtml(s.title || ''), ...engineCells];
      })
  }));
  return buildMergedTable('文书收录数据', ['日期', '平台', '标题', ...AI_ENGINES], groups,
    '✓ = 该平台内容已被对应 AI 引擎收录；空白 = 未收录');
}

// ===== 导出下拉菜单控制 =====
function toggleExportMenu(e) {
  if (e) e.stopPropagation();
  const m = document.getElementById('exportMenu');
  if (m) m.classList.toggle('open');
}
function doExport(scope) {
  const m = document.getElementById('exportMenu');
  if (m) m.classList.remove('open');
  exportExcel(scope);
}
// 点击页面其他地方自动收起下拉
document.addEventListener('click', function() {
  const m = document.getElementById('exportMenu');
  if (m) m.classList.remove('open');
});

// ===== 导出 Excel（按范围筛选）=====
function exportExcel(scope) {
  scope = scope || 'all';
  const scopeLabel = { all: '全量', week: '本周', month: '本月' }[scope] || '全量';

  // 周/月区间复用数据复盘页的 getPeriodRanges（本周=周一~周日；本月=自然月）
  let range = null;
  if (scope === 'week' || scope === 'month') {
    range = getPeriodRanges(scope);
  }
  const inRange = d => !range || (d >= range.start && d <= range.end);

  const ds = {
    contents: contents.filter(c => inRange(c.createdAt || '')),
    stats: stats.filter(s => inRange(s.date || '')),
    aiStats: aiStats.filter(s => inRange(s.date || '')),
  };

  const sections = [
    buildOverviewSheet(ds),
    buildContentRegSheet(ds),
    buildVideoSheet(ds),
    buildAiSheet(ds),
  ].join('');

  const rangeText = range ? `（${range.start} ~ ${range.end}）` : '';
  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>新媒体工作台数据报表_${scopeLabel}_${getToday()}</title>
<style>
body { font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif; margin: 20px; color: #1f2937; line-height: 1.5; }
h1 { color: #1f2937; border-bottom: 3px solid #2563eb; padding-bottom: 10px; }
h2 { color: #2563eb; border-bottom: 2px solid #93c5fd; padding-bottom: 5px; margin-top: 30px; }
h3 { color: #374151; }
table { border-collapse: collapse; width: 100%; margin: 10px 0 20px; font-size: 13px; }
th, td { border: 1px solid #d1d5db; padding: 7px 11px; text-align: left; }
th { background: #f3f4f6; font-weight: 600; color: #374151; }
tr:nth-child(even) td { background: #f9fafb; }
.meta { color: #6b7280; font-size: 14px; margin: 5px 0; }
</style>
</head><body>
<h1>📊 新媒体工作台数据报表（${scopeLabel}${rangeText}）</h1>
<p class="meta">导出时间：${new Date().toLocaleString('zh-CN')}　|　报表含：数据概览 · 内容登记 · 视频数据 · 文书收录数据（按日期与平台分组，同一日期合并显示）</p>
${sections}
</body></html>`;

  const blob = new Blob(['﻿' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `新媒体工作台_${scopeLabel}_${getToday()}.xls`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`已导出${scopeLabel}Excel 报表（数据概览/内容登记/视频数据/文书收录数据）`);
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
    // 示例中 10 个平台都登记了内容，linked=true 表示已关联内容（当前逻辑不存 contentId/done）
    tasks.push({ id: Date.now() + i, date: today, platform: p, type: isVideo(p) ? 'video' : 'article', done: false, linked: true, contentId: null, target: DAILY_TARGET });
  });
  tasks.push({ id: Date.now() + 100, date: yest, platform: '快手', type: 'video', done: false, linked: false, contentId: null, target: DAILY_TARGET });

  contents = [
    // 短视频 4 个
    { id: 1, title: '新品开箱vlog：夏日防晒好物推荐', platform: '抖音', topic: '好物推荐/防晒', url: 'https://www.douyin.com/video/7234567890', createdAt: today },
    { id: 2, title: '街头美食探店EP38', platform: '快手', topic: '探店/美食', url: 'https://www.kuaishou.com/short-video/3x9f2a', createdAt: today },
    { id: 3, title: '618购物清单｜闭眼入的5件数码好物', platform: '小红书', topic: '数码好物/购物清单', url: 'https://www.xiaohongshu.com/explore/abc123', createdAt: today },
    { id: 4, title: '职场高效办公技巧合集', platform: '视频号', topic: '职场技能/效率', url: 'https://channels.weixin.qq.com/p/8888', createdAt: today },
    // 文书 6 个
    { id: 5, title: 'Python自动化脚本：批量处理Excel报表', platform: '知乎', topic: 'Python/自动化/教程', url: 'https://zhuanlan.zhihu.com/p/123456', createdAt: today },
    { id: 6, title: '如何用AI提升10倍工作效率', platform: '公众号', topic: 'AI工具/效率提升', url: 'https://mp.weixin.qq.com/s/xxxxx', createdAt: today },
    { id: 7, title: '2024年AI工具大盘点', platform: '百家号', topic: 'AI工具/盘点', url: 'https://baijiahao.baidu.com/s?id=777', createdAt: today },
    { id: 8, title: '新媒体运营入门指南', platform: '企鹅号', topic: '运营技巧/入门', url: 'https://om.qq.com/article/555', createdAt: today },
    { id: 9, title: '内容创作者必备的5个习惯', platform: '搜狐号', topic: '创作者/习惯', url: 'https://www.sohu.com/a/666', createdAt: today },
    { id: 10, title: '官网技术博客：API 性能优化实战', platform: '官网', topic: '技术博客/性能优化', url: 'https://example.com/blog/api-perf', createdAt: today },
  ];

  // 视频数据：4 个短视频平台各 1 条，contentId 对齐内容登记，日期对齐
  // 小红书官方指标是"人均观看时长"，故用 avgWatch 字段、completionRate 留空；
  // 视频号无"收藏"、改用"推荐"数（recommend 字段），favorites 记 0
  stats = [
    { id: 101, platform: '抖音', date: today, contentId: 1, title: '新品开箱vlog：夏日防晒好物推荐', views: 12500, completionRate: 32.5, likes: 890, comments: 230, favorites: 156, shares: 120, followers: 35 },
    { id: 102, platform: '快手', date: today, contentId: 2, title: '街头美食探店EP38', views: 9800, completionRate: 28.1, likes: 670, comments: 156, favorites: 98, shares: 67, followers: 21 },
    { id: 103, platform: '小红书', date: today, contentId: 3, title: '618购物清单｜闭眼入的5件数码好物', views: 8200, completionRate: null, avgWatch: 18.5, likes: 1200, comments: 175, favorites: 342, shares: 89, followers: 58 },
    { id: 104, platform: '视频号', date: today, contentId: 4, title: '职场高效办公技巧合集', views: 5600, completionRate: 24.3, recommend: 52, likes: 340, comments: 89, favorites: 0, shares: 45, followers: 12 },
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
    { id: 302, type: 'video', period: 'week', date: today, highlights: '抖音防晒选题播放量破万', problems: '小红书完播率偏低', plans: '尝试竖版封面+前3秒钩子' },
  ];

  saveData('tasks', tasks); saveData('contents', contents); saveData('stats', stats); saveData('aiStats', aiStats); saveData('reviews', reviews);
  render(); showToast('已重置示例数据');
    }
  });
}
