function exportData() {
  const data = { version: 3, exportedAt: new Date().toISOString(), tasks, contents, stats, aiStats, reviews, accountStats, accountIds };
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

// 各视频平台「适用」的指标：不适用的指标在报表中留白，而非显示 0；有数据时（含 0）照实输出
// （完播率：抖音/快手/视频号；均播时长(秒)：抖音/小红书/视频号；收藏：抖音/快手/小红书；推荐：视频号）
const VIDEO_METRIC_APPLY = {
  '抖音':   { completionRate: true,  avgWatch: true,  favorites: true,  recommend: false },
  '快手':   { completionRate: true,  avgWatch: false, favorites: true,  recommend: false },
  '小红书': { completionRate: false, avgWatch: true,  favorites: true,  recommend: false },
  '视频号': { completionRate: true,  avgWatch: true,  favorites: false, recommend: true },
};
// 视频指标：平台不适用该项时留白（例如快手不记均播、小红书不记完播率）；适用时 cellNum 输出——0 显示 0、无值留空
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
    ['日期', '平台', '标题', '播放量', '完播率(%)', '均播时长(秒)', '点赞', '评论', '收藏', '推荐', '分享', '涨粉'],
    groups,
    '完播率：抖音/快手/视频号；均播时长(秒)：抖音/小红书/视频号（小红书「人均观看时长」同义，有数据记 0、无数据留空）；收藏：抖音/快手/小红书；视频号看「推荐」、不记收藏');
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

// 视频平台账号数据（仅导出各平台最新一次记录，标注记录日期/时间；未登记账号ID时留空）
function buildAccountSheet(ds) {
  const list = ds.accountStats || [];
  const accIds = ds.accountIds || [];
  // 各平台最新一次记录
  const latestOf = (p) => {
    let best = null;
    list.forEach(s => { if (s.platform === p && (!best || (s.date || '') > (best.date || ''))) best = s; });
    return best;
  };
  let html = '<h2>视频平台账号数据</h2>';
  html += '<p style="color:#9ca3af;font-size:12px;margin:2px 0 8px;">仅导出各平台最新一次数据记录（当天记录=最新总数据，不定时记录）；标注记录日期便于追溯数据时效；未登记账号ID时该栏留空</p>';
  html += '<table><thead><tr><th>平台</th><th>账号ID</th><th>备注</th><th>记录日期</th><th>发布量</th><th>粉丝量</th><th>总播放量</th><th>总点赞量</th><th>总评论量</th><th>总转发/分享</th></tr></thead><tbody>';
  VIDEO_PLATFORMS.forEach(p => {
    const idr = accIds.find(x => x.platform === p);
    const r = latestOf(p);
    html += `<tr>
      <td>${escapeHtml(p)}</td>
      <td>${escapeHtml(idr && idr.accountId || '')}</td>
      <td>${escapeHtml(idr && idr.note || '')}</td>
      <td>${r ? escapeHtml(r.date) : ''}</td>
      <td>${r ? cellNum(r.posts) : ''}</td>
      <td>${r ? cellNum(r.followers) : ''}</td>
      <td>${r ? cellNum(r.views) : ''}</td>
      <td>${r ? cellNum(r.likes) : ''}</td>
      <td>${r ? cellNum(r.comments) : ''}</td>
      <td>${r ? cellNum(r.shares) : ''}</td>
    </tr>`;
  });
  html += '</tbody></table>';
  return html;
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
    accountStats: accountStats.filter(s => inRange(s.date || '')),
    accountIds: accountIds, // 账号ID为静态信息，不按日期过滤
  };

  const sections = [
    buildOverviewSheet(ds),
    buildContentRegSheet(ds),
    buildVideoSheet(ds),
    buildAccountSheet(ds),
    buildAiSheet(ds),   // 文书收录数据放最下方
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
<p class="meta">导出时间：${new Date().toLocaleString('zh-CN')}　|　报表含：数据概览 · 内容登记 · 视频数据 · 视频平台账号数据 · 文书收录数据（按日期与平台分组，同一日期合并显示）</p>
${sections}
</body></html>`;

  const blob = new Blob(['﻿' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `新媒体工作台_${scopeLabel}_${getToday()}.xls`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`已导出${scopeLabel}Excel 报表（数据概览/内容登记/视频数据/视频平台账号数据/文书收录数据）`);
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
      if (data.accountStats) { accountStats = data.accountStats; saveData('accountStats', accountStats); }
      if (data.accountIds) { accountIds = data.accountIds; saveData('accountIds', accountIds); }
      render(); showToast('导入成功');
    } catch(err) { showToast('导入失败：文件格式错误'); }
  };
  reader.readAsText(file); event.target.value = '';
}

function clearAllData() {
  document.getElementById('modalContent').innerHTML = `
    <h3>确认清空</h3>
    <p class="confirm-text">即将清空所有数据（发布任务、内容登记、视频数据、AI收录数据、账号总数据），此操作不可恢复！<br><br>建议先导出备份。</p>
    <div class="modal-actions">
      <button class="btn-cancel" onclick="closeModal()">取消</button>
      <button class="btn-save" style="background:linear-gradient(135deg,#f87171,#ef4444);" onclick="confirmClear()">确认清空</button>
    </div>`;
  document.getElementById('modalOverlay').classList.add('active');
}

function confirmClear() {
  tasks = []; contents = []; stats = []; aiStats = []; reviews = []; accountStats = []; accountIds = [];
  saveData('tasks', tasks); saveData('contents', contents); saveData('stats', stats); saveData('aiStats', aiStats); saveData('reviews', reviews); saveData('accountStats', accountStats); saveData('accountIds', accountIds);
  selectedDate = null; closeModal(); ensureDailyTasks(); render();
  showToast('已清空，已重置今日任务');
}

function fillSampleData() {
  showConfirm({
    title: '重置示例数据',
    desc: '将重置为示例数据（最近3天，覆盖全部登记 + 账号总数据），当前数据会被覆盖。是否继续？',
    danger: true,
    onOk: () => {
      const s = buildSampleData(getToday());
      tasks = s.tasks; contents = s.contents; stats = s.stats; aiStats = s.aiStats; reviews = s.reviews; accountStats = s.accountStats; accountIds = s.accountIds;
      saveData('tasks', tasks); saveData('contents', contents); saveData('stats', stats); saveData('aiStats', aiStats); saveData('reviews', reviews); saveData('accountStats', accountStats); saveData('accountIds', accountIds);
      render(); showToast('已重置示例数据（最近3天）');
    }
  });
}
