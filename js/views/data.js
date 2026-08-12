// 关联内容标题：优先 contentId 精确匹配，兜底 platform+date 匹配
function findLinkedTitle(record, type) {
  if (record.contentId) {
    const c = contents.find(c => c.id == record.contentId || c.id == Number(record.contentId));
    if (c) return c.title;
  }
  const sameDay = contents.find(c => c.platform === record.platform && c.createdAt === record.date);
  if (sameDay) return sameDay.title;
  return null;
}

function renderData() {
  // 账号总数据已提升为独立 Tab「账号登记」，此处自愈历史遗留的 account 值
  if (dataSubTab === 'account') dataSubTab = 'video';
  let html = '';

  // Sub-tabs
  html += `<div class="sub-tab-bar">
    <div class="sub-tab ${dataSubTab==='video'?'active':''}" onclick="switchDataTab('video')">短视频数据</div>
    <div class="sub-tab ${dataSubTab==='article'?'active':''}" onclick="switchDataTab('article')">文书AI收录</div>
  </div>`;

  // 周期下拉（周数据与复盘 / 月数据与复盘，替代复盘登记里的周期选择）
  const curPeriod = getCurPeriod();
  html += `<div class="period-select-row">
    <select id="dataPeriodSelect" onchange="switchDataPeriod(this.value)" aria-label="数据复盘周期">
      <option value="week" ${curPeriod==='week'?'selected':''}>周数据与复盘</option>
      <option value="month" ${curPeriod==='month'?'selected':''}>月数据与复盘</option>
    </select>
  </div>`;

  // 左右两栏：左=统计图表，右=复盘登记
  html += '<div class="data-layout">';
  html += '<div class="data-left">';
  if (dataSubTab === 'video') {
    html += renderVideoData(curPeriod);
  } else {
    html += renderArticleData(curPeriod);
  }
  html += '</div>';
  html += '<div class="data-right">';
  html += renderReviewPanel(curPeriod);
  html += '</div>';
  html += '</div>';

  return html;
}

function switchDataTab(tab) { dataSubTab = tab; render(); }

// ===== 周期状态：视频/文书/账号各自记忆周/月选择 =====
let dataPeriod = { video: 'month', article: 'month', account: 'month' };
function getCurPeriod() { return dataPeriod[dataSubTab] || 'month'; }
function switchDataPeriod(p) { dataPeriod[dataSubTab] = p; render(); }

// ===== 账号登记（独立 Tab）：不定时快照登记，当天记录=最新总数据，与上次记录对比 =====
function renderAccountTab() {
  return renderAccountData();
}

// 当前周期范围 + 上一周期范围（用于双柱对比）
// 返回 { label, prevLabel, start, end, prevStart, prevEnd }
function getPeriodRanges(period) {
  const today = new Date();
  if (period === 'week') {
    // 本周：周一~周日；上周：前一周一~周日
    const dow = (today.getDay() + 6) % 7;
    const monday = new Date(today); monday.setDate(today.getDate() - dow);
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    const prevMonday = new Date(monday); prevMonday.setDate(monday.getDate() - 7);
    const prevSunday = new Date(prevMonday); prevSunday.setDate(prevMonday.getDate() + 6);
    return {
      label: '本周', prevLabel: '上周',
      start: getDayStr(monday), end: getDayStr(sunday),
      prevStart: getDayStr(prevMonday), prevEnd: getDayStr(prevSunday)
    };
  }
  // 月：本月；上月
  const y = today.getFullYear(), m = today.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const prevFirst = new Date(y, m - 1, 1);
  const prevLast = new Date(y, m, 0);
  return {
    label: '本月', prevLabel: '上月',
    start: getDayStr(first), end: getDayStr(last),
    prevStart: getDayStr(prevFirst), prevEnd: getDayStr(prevLast)
  };
}

// 复盘时间段标签：周→所在周周一~周日，月→当月1号~月末
function formatReviewRange(period, dateStr) {
  if (!dateStr) return period === 'month' ? '本月' : '本周';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return period === 'month' ? '本月' : '本周';
  if (period === 'month') {
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return '本月·' + getDayStr(start) + ' ~ ' + getDayStr(end);
  }
  // 周：所在周的周一到周日
  const diffToMon = (d.getDay() + 6) % 7;
  const start = new Date(d); start.setDate(d.getDate() - diffToMon);
  const end = new Date(start); end.setDate(start.getDate() + 6);
  return '本周·' + getDayStr(start) + ' ~ ' + getDayStr(end);
}

// --- 复盘数据登记面板 ---
function renderReviewPanel(period) {
  // 跟随上方子Tab：短视频数据 ↔ 文书AI收录
  const type = dataSubTab; // 'video' | 'article'
  const isVideo = type === 'video';
  const curPeriod = period || getCurPeriod();
  const periodLabel = curPeriod === 'week' ? '本周复盘' : '本月复盘';
  const ranges = getPeriodRanges(curPeriod);
  let html = `<div class="card"><div class="card-title">${isVideo ? '短视频' : '文书'}复盘登记</div>`;

  html += `<div class="form-group"><label>复盘周期（跟随上方选项）</label><div style="font-size:13px;color:var(--accent);font-weight:600;padding:9px 13px;background:var(--bg-2);border:1px solid var(--border);border-radius:var(--radius-xs);">${periodLabel}·${ranges.start} ~ ${ranges.end}</div></div>`;
  html += `<div class="form-group"><label>复盘日期</label><input type="date" id="reviewDate" value="${getToday()}"></div>`;
  // 数据小结与亮点分析（视频=数据表现+亮点，文书=AI收录+亮点）
  html += `<div class="form-group"><label>数据小结与亮点分析</label><textarea id="reviewHighlights" placeholder="${isVideo ? '数据表现 + 亮点：播放/完播/互动表现好的内容、平台、选题…' : 'AI收录 + 亮点：收录情况小结、做得好的内容、平台、选题…'}"></textarea></div>`;
  html += `<div class="form-group"><label>问题与不足</label><textarea id="reviewProblems" placeholder="数据不理想的地方、待改进项…"></textarea></div>`;
  html += `<div class="form-group"><label>下期计划</label><textarea id="reviewPlans" placeholder="下周/月计划做什么…"></textarea></div>`;
  html += `<div class="toolbar" style="margin-top:8px;">
    <button class="btn-primary" onclick="saveReview()">保存复盘</button>
  </div>`;

  // 历史复盘列表（只显示当前类型的记录）
  const sortedReviews = [...reviews]
    .filter(r => (r.type || 'video') === type)
    .sort((a,b) => (b.date||'').localeCompare(a.date||''));
  html += '<div style="margin-top:16px;">';
  html += `<div class="review-history-box">
    <div class="review-history-title">📋 ${isVideo ? '短视频' : '文书'}复盘记录 <span class="badge">${sortedReviews.length}条</span></div>
    <div class="review-history-list">`;
  if (sortedReviews.length === 0) {
    html += '<p style="font-size:12px;color:var(--text3);padding:8px 0;">暂无复盘记录</p>';
  } else {
    sortedReviews.forEach(r => {
      const typeTag = isVideo ? 'video' : 'article';
      const typeLabel = isVideo ? '短视频' : '文书';
      html += `<div class="review-item">
        <div class="review-item-head">
          <span class="platform-tag ${typeTag}">${typeLabel}·${formatReviewRange(r.period, r.date)}</span>
          <button class="btn-delete-mini" onclick="deleteReview('${r.id}')" title="删除复盘">删除</button>
        </div>
        <div class="review-item-date">${r.date}</div>
        ${r.highlights ? `<div class="review-item-line"><span style="color:var(--green);">小结与亮点：</span>${r.highlights}</div>` : ''}
        ${r.problems ? `<div class="review-item-line"><span style="color:var(--red);">问题：</span>${r.problems}</div>` : ''}
        ${r.plans ? `<div class="review-item-line"><span style="color:var(--purple);">计划：</span>${r.plans}</div>` : ''}
      </div>`;
    });
  }
  html += '</div></div></div>';
  return html;
}

function saveReview() {
  const type = dataSubTab; // 跟随上方子Tab
  const period = getCurPeriod(); // 周期跟随页面顶部的周/月下拉
  const date = document.getElementById('reviewDate').value || getToday();
  const highlights = document.getElementById('reviewHighlights').value.trim();
  const problems = document.getElementById('reviewProblems').value.trim();
  const plans = document.getElementById('reviewPlans').value.trim();
  if (!highlights && !problems && !plans) { showToast('请至少填写一项内容'); return; }
  // 同日同周期同类型覆盖
  const existing = reviews.find(r => r.date === date && r.period === period && r.type === type);
  if (existing) { existing.highlights = highlights; existing.problems = problems; existing.plans = plans; }
  else reviews.push({ id: Date.now(), type, period, date, highlights, problems, plans });
  saveData('reviews', reviews); render(); showToast('复盘已保存');
}

function deleteReview(id) {
  showConfirm({
    title: '确认删除',
    desc: '确定删除这条复盘记录吗？',
    danger: true,
    onOk: () => {
      reviews = reviews.filter(r => r.id != id && r.id != Number(id));
      saveData('reviews', reviews); render(); showToast('已删除');
    }
  });
}

// 双柱对比柱形图：当前周期实心柱 + 上期半透明柱
// curLabel/prevLabel 跟随当前周期（本周/上周、本月/上月）
function renderDualBarChart(labels, currVals, prevVals, barClass, fmt, curLabel = '本期', prevLabel = '上期') {
  const maxV = Math.max(...currVals, ...prevVals, 1);
  let html = '<div class="bar-chart">';
  labels.forEach((label, i) => {
    const v = currVals[i] || 0, pv = prevVals[i] || 0;
    const h = Math.max(Math.round(v / maxV * 100), 3);
    const ph = Math.max(Math.round(pv / maxV * 100), 3);
    html += `<div class="bar-col">
      <div class="bar-pair">
        <div class="bar-pair-item" title="${curLabel} ${fmt(v)}">
          <div class="bar-value">${fmt(v)}</div>
          <div class="bar ${barClass}" style="height:${h}%"></div>
        </div>
        <div class="bar-pair-item" title="${prevLabel} ${fmt(pv)}">
          <div class="bar-value prev">${fmt(pv)}</div>
          <div class="bar ${barClass} prev" style="height:${ph}%"></div>
        </div>
      </div>
      <div class="bar-label">${label}</div>
    </div>`;
  });
  html += '</div>';
  return html;
}

// 近 N 天趋势折线图（纯 SVG 自绘，零依赖）
// points: [{date:'YYYY-MM-DD', value:number}] 按日期升序
// 返回 SVG 折线 + 结束值标注；数据不足 2 天时返回空；onClick=全局函数名（点击数据点跳转，如跳发布日历）
function renderTrendLine(points, { color = 'var(--accent)', fmt = formatNum, height = 160, onClick = null } = {}) {
  const data = points.filter(p => p && p.value !== undefined && p.value !== null);
  if (data.length < 2) {
    if (data.length === 1) {
      return `<div class="trend-box"><div class="trend-single">近30天共 <b style="color:${color};">${fmt(data[0].value)}</b></div></div>`;
    }
    return '';
  }
  // viewBox 用合理宽高比（约 4:1），让 SVG 拉伸后比例变形可控
  const VBW = 800, VBH = 200;
  const padL = 60, padR = 50, padT = 30, padB = 36;  // 给两端点和日期标签留空间
  const maxV = Math.max(...data.map(d => d.value), 1);
  const minV = Math.min(...data.map(d => d.value), 0);
  const span = (maxV - minV) || 1;
  const stepX = (VBW - padL - padR) / (data.length - 1);
  const pts = data.map((d, i) => {
    const x = padL + i * stepX;
    const y = padT + (VBH - padT - padB) * (1 - (d.value - minV) / span);
    return { x, y, ...d };
  });
  const path = pts.map((p, i) => (i === 0 ? `M${p.x.toFixed(1)},${p.y.toFixed(1)}` : `L${p.x.toFixed(1)},${p.y.toFixed(1)}`)).join(' ');
  const area = path + ` L${pts[pts.length-1].x.toFixed(1)},${(VBH-padB).toFixed(1)} L${pts[0].x.toFixed(1)},${(VBH-padB).toFixed(1)} Z`;
  // 日期标签：数据 ≤ 7 天全部显示（周模式友好），>7 天均匀抽 5 个（月模式不挤）
  const labelCount = data.length <= 7 ? data.length : Math.min(5, data.length);
  const labelIdxs = [];
  for (let i = 0; i < labelCount; i++) {
    labelIdxs.push(Math.round(i * (data.length - 1) / (labelCount - 1)));
  }
  const labels = labelIdxs.map(i => pts[i]);
  const last = pts[pts.length-1];
  const first = pts[0];
  const rise = last.value - first.value;
  const risePct = first.value > 0 ? Math.round(rise / first.value * 100) : 0;
  const trendBadge = rise > 0
    ? `<span class="trend-up">▲ ${fmt(Math.abs(rise))} (+${risePct}%)</span>`
    : rise < 0
      ? `<span class="trend-down">▼ ${fmt(Math.abs(rise))} (${risePct}%)</span>`
      : `<span class="trend-flat">— 持平</span>`;
  // 数值标注：局部峰值点（比左右都高）+ 最后一点；峰值过多时取最高的 5 个
  const peakIdxs = [];
  for (let i = 1; i < data.length - 1; i++) {
    if (data[i].value > data[i-1].value && data[i].value >= data[i+1].value) peakIdxs.push(i);
  }
  if (peakIdxs.length > 5) {
    peakIdxs.sort((a, b) => data[b].value - data[a].value);
    peakIdxs.length = 5;
  }
  const labeledIdxs = new Set(peakIdxs);
  labeledIdxs.add(data.length - 1); // 最后一点始终标注
  const valLabels = [...labeledIdxs].sort((a, b) => a - b).map(i => pts[i]);

  return `<div class="trend-box">
    <div class="trend-head"><span class="trend-label">${first.date} ~ ${last.date}</span>${trendBadge}</div>
    <svg viewBox="0 0 ${VBW} ${VBH}" preserveAspectRatio="xMidYMid meet" class="trend-svg">
      <defs>
        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.32"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0.02"/>
        </linearGradient>
      </defs>
      <path d="${area}" fill="url(#trendFill)"/>
      <path d="${path}" fill="none" stroke="${color}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>
      ${pts.map(p => {
        const click = onClick ? ` onclick="${onClick}('${p.date}')"` : '';
        return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="${color}"${click}><title>${p.date} · 总播放 ${fmt(p.value)}</title></circle>`;
      }).join('')}
      ${valLabels.map(p => `<text x="${p.x.toFixed(1)}" y="${(p.y - 9).toFixed(1)}" text-anchor="middle" font-size="18" font-weight="700" fill="${color}" style="paint-order:stroke;stroke:var(--bg);stroke-width:4px;">${fmt(p.value)}</text>`).join('')}
      ${labels.map(l => `<text x="${l.x.toFixed(1)}" y="${(VBH - 10).toFixed(1)}" text-anchor="middle" font-size="18" fill="var(--text3)">${l.date.slice(5)}</text>`).join('')}
    </svg>
  </div>`;
}

// 近 30 天按天汇总：records 数组 → [{date, value}]
function aggregateDaily(records, getVal, days = 30, endDate) {
  const map = {};
  records.forEach(r => { const d = r.date; if (d) map[d] = (map[d] || 0) + getVal(r); });
  const out = [];
  const end = endDate || new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end); d.setDate(end.getDate() - i);
    const key = getDayStr(d);
    out.push({ date: key, value: map[key] || 0 });
  }
  return out;
}

// 本月 vs 上月图例（支持自定义周期标签）
function renderChartLegend(barClass, curLabel, prevLabel) {
  return `<div class="chart-legend">
    <span class="legend-item"><span class="legend-dot ${barClass}"></span>${curLabel || '当前'}</span>
    <span class="legend-item"><span class="legend-dot ${barClass} prev"></span>${prevLabel || '上期'}</span>
  </div>`;
}

// --- Video data（仅统计展示）---
function renderVideoData(period) {
  const ranges = getPeriodRanges(period || 'month');
  const currStats = stats.filter(s => isVideo(s.platform) && s.date >= ranges.start && s.date <= ranges.end);
  const prevStats = stats.filter(s => isVideo(s.platform) && s.date >= ranges.prevStart && s.date <= ranges.prevEnd);
  const totalCount = currStats.length;  // 总发布数（数据录入条数）
  const totalViews = currStats.reduce((sum, s) => sum + (s.views || 0), 0);
  const totalLikes = currStats.reduce((sum, s) => sum + (s.likes || 0), 0);
  const totalComments = currStats.reduce((sum, s) => sum + (s.comments || 0), 0);
  const totalFavorites = currStats.reduce((sum, s) => sum + (s.favorites || 0), 0);
  const totalFollowers = currStats.reduce((sum, s) => sum + (s.followers || 0), 0);

  let html = `<div class="card"><div class="card-title">短视频平台${ranges.label}数据 <span class="badge">${ranges.start} ~ ${ranges.end}</span></div>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value">${totalCount}</div><div class="stat-label">总发布数</div></div>
      <div class="stat-card"><div class="stat-value">${formatNum(totalViews)}</div><div class="stat-label">总播放量</div></div>
      <div class="stat-card"><div class="stat-value">${formatNum(totalLikes)}</div><div class="stat-label">总点赞</div></div>
      <div class="stat-card"><div class="stat-value">${formatNum(totalComments)}</div><div class="stat-label">总评论</div></div>
      <div class="stat-card"><div class="stat-value">${formatNum(totalFavorites)}</div><div class="stat-label">总收藏</div></div>
      <div class="stat-card"><div class="stat-value">${formatNum(totalFollowers)}</div><div class="stat-label">总涨粉</div></div>
    </div></div>`;

  // Bar chart（当前周期 vs 上期双柱对比）
  html += `<div class="card"><div class="card-title">各平台播放量对比 <span class="badge">${ranges.label} vs ${ranges.prevLabel}</span></div>`;
  const platformViews = {};
  const prevPlatformViews = {};
  VIDEO_PLATFORMS.forEach(p => { platformViews[p] = 0; prevPlatformViews[p] = 0; });
  currStats.forEach(s => { if (platformViews[s.platform] !== undefined) platformViews[s.platform] += s.views; });
  prevStats.forEach(s => { if (prevPlatformViews[s.platform] !== undefined) prevPlatformViews[s.platform] += s.views; });
  html += renderChartLegend('video', ranges.label, ranges.prevLabel);
  html += renderDualBarChart(VIDEO_PLATFORMS, VIDEO_PLATFORMS.map(p => platformViews[p]), VIDEO_PLATFORMS.map(p => prevPlatformViews[p]), 'video', formatNum, ranges.label, ranges.prevLabel);
  html += '</div>';

  // 播放量趋势折线图（跟随周期：周=本周一~今天，月=近30天）
  const isWeek = (period || 'month') === 'week';
  const trendDays = isWeek ? ((new Date().getDay() + 6) % 7) + 1 : 30;
  const trendTitle = isWeek ? '本周播放量趋势' : '近30天播放量趋势';
  // 周模式窗口=本周一~今天（与周期范围一致，不含上周数据）；月模式近30天
  const trendPts = aggregateDaily(stats.filter(s => isVideo(s.platform)), s => s.views || 0, trendDays, new Date());
  html += `<div class="card"><div class="card-title">${trendTitle} <span class="badge">${isWeek ? '本周' : '近30天'} · 4平台合计 · 点击数据点跳转当日</span></div>${renderTrendLine(trendPts, { color: 'var(--orange)', onClick: 'goCalendarDate' })}</div>`;

  // 未关联记录（录了数据但找不到对应内容）— 折叠面板
  const orphanStats = [...currStats].filter(s => findLinkedTitle(s, 'video') === null).sort((a,b) => b.date.localeCompare(a.date));
  html += `<div class="card"><div class="card-title">未关联记录 <span class="badge">${orphanStats.length}</span></div>`;
  if (orphanStats.length === 0) {
    html += '<p style="font-size:12px;color:var(--text2);padding:6px 0;">当前周期无未关联记录</p>';
  } else {
    html += '<p style="font-size:12px;color:var(--orange);margin-bottom:8px;">以下数据未找到对应登记内容（已失效或被删除），可删除或补录内容</p>';
    html += '<div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>日期</th><th>平台</th><th>播放</th><th>点赞</th><th>操作</th></tr></thead><tbody>';
    orphanStats.forEach(s => {
      html += `<tr><td>${s.date}</td><td><span class="platform-tag video">${s.platform}</span></td><td>${formatNum(s.views)}</td><td>${formatNum(s.likes)}</td><td><button style="background:none;border:none;color:var(--red);cursor:pointer;font-size:12px;" onclick="deleteStat('${s.id}')">删除</button></td></tr>`;
    });
    html += '</tbody></table></div>';
  }
  html += '</div>';
  return html;
}

function saveStat() {
  const platform = document.getElementById('statPlatform').value;
  const date = document.getElementById('statDate').value;
  const views = parseInt(document.getElementById('statViews').value) || 0;
  const likes = parseInt(document.getElementById('statLikes').value) || 0;
  const shares = parseInt(document.getElementById('statShares').value) || 0;
  const comments = parseInt(document.getElementById('statComments').value) || 0;
  if (!date) { showToast('请选择日期'); return; }
  const existing = stats.find(s => s.platform === platform && s.date === date);
  if (existing) { existing.views = views; existing.likes = likes; existing.shares = shares; existing.comments = comments; }
  else stats.push({ id: Date.now(), platform, date, views, likes, shares, comments });
  saveData('stats', stats);
  markTaskRecorded(platform, date);
  render(); showToast(platform + ' 数据已保存，链路进度已更新');
}

// 数据保存成功后，确保任务链路完整（recorded 改为计算属性，不再存储）
function markTaskRecorded(platform, date) {
  const t = tasks.find(x => x.date === date && x.platform === platform);
  if (t) {
    if (!t.linked) { t.linked = true; saveData('tasks', tasks); }
  }
}

function deleteStat(id) {
  showConfirm({
    title: '确认删除',
    desc: '将删除这条视频数据记录（播放/点赞/评论等），内容登记本身不受影响，统计数字会随之更新。',
    danger: true,
    onOk: () => {
      stats = stats.filter(s => s.id != id && s.id != Number(id));
      saveData('stats', stats); render(); showToast('已删除');
    }
  });
}

// --- Article AI data ---
function renderArticleData(period) {
  const ranges = getPeriodRanges(period || 'month');
  const currAiStats = aiStats.filter(s => isArticle(s.platform) && s.date >= ranges.start && s.date <= ranges.end);
  const prevAiStats = aiStats.filter(s => isArticle(s.platform) && s.date >= ranges.prevStart && s.date <= ranges.prevEnd);
  let html = `<div class="card"><div class="card-title">文书平台 AI 收录追踪 <span class="badge">${ranges.start} ~ ${ranges.end}</span></div>`;
  html += `<p style="font-size:12px;color:var(--text2);margin-bottom:12px;">统计6大AI引擎收录情况：${AI_ENGINES.join('、')}</p>`;

  // Summary（当前周期：总发布数 / AI收录数 / AI收录率）
  let totalChecked = 0, totalPossible = 0;
  currAiStats.forEach(s => {
    AI_ENGINES.forEach(ai => { totalPossible++; if (s.ai && s.ai[ai]) totalChecked++; });
  });
  const rate = totalPossible > 0 ? Math.round(totalChecked / totalPossible * 100) : 0;
  html += `<div class="stats-grid">
    <div class="stat-card"><div class="stat-value">${currAiStats.length}</div><div class="stat-label">总发布数</div></div>
    <div class="stat-card"><div class="stat-value">${totalChecked}/${totalPossible}</div><div class="stat-label">AI收录数</div></div>
    <div class="stat-card"><div class="stat-value" style="color:${rate>=50?'var(--green)':'var(--yellow)'};">${rate}%</div><div class="stat-label">AI收录率</div></div>
  </div></div>`;

  // AI引擎收录情况（引擎视角柱形图，当前周期 vs 上期）
  html += `<div class="card"><div class="card-title">AI引擎收录情况 <span class="badge">${ranges.label} vs ${ranges.prevLabel}</span></div>`;
  const aiCounts = {};
  const prevAiCounts = {};
  AI_ENGINES.forEach(ai => { aiCounts[ai] = 0; prevAiCounts[ai] = 0; });
  currAiStats.forEach(s => { AI_ENGINES.forEach(ai => { if (s.ai && s.ai[ai]) aiCounts[ai]++; }); });
  prevAiStats.forEach(s => { AI_ENGINES.forEach(ai => { if (s.ai && s.ai[ai]) prevAiCounts[ai]++; }); });
  html += renderChartLegend('article', ranges.label, ranges.prevLabel);
  html += renderDualBarChart(AI_ENGINES, AI_ENGINES.map(ai => aiCounts[ai]), AI_ENGINES.map(ai => prevAiCounts[ai]), 'article', n => n, ranges.label, ranges.prevLabel);
  html += '</div>';

  // 文书平台被收录情况（平台视角柱形图，当前周期 vs 上期）
  html += `<div class="card"><div class="card-title">文书平台被收录情况 <span class="badge">${ranges.label} vs ${ranges.prevLabel}</span></div>`;
  const platformCounts = {};
  const prevPlatformCounts = {};
  ARTICLE_PLATFORMS.forEach(p => { platformCounts[p] = 0; prevPlatformCounts[p] = 0; });
  currAiStats.forEach(s => {
    if (platformCounts[s.platform] !== undefined) {
      AI_ENGINES.forEach(ai => { if (s.ai && s.ai[ai]) platformCounts[s.platform]++; });
    }
  });
  prevAiStats.forEach(s => {
    if (prevPlatformCounts[s.platform] !== undefined) {
      AI_ENGINES.forEach(ai => { if (s.ai && s.ai[ai]) prevPlatformCounts[s.platform]++; });
    }
  });
  html += renderChartLegend('article', ranges.label, ranges.prevLabel);
  html += renderDualBarChart(ARTICLE_PLATFORMS, ARTICLE_PLATFORMS.map(p => platformCounts[p]), ARTICLE_PLATFORMS.map(p => prevPlatformCounts[p]), 'article', n => n, ranges.label, ranges.prevLabel);
  html += '</div>';

  // AI 收录数趋势折线图（跟随周期：周=本周一~今天，月=近30天）
  const aiIsWeek = (period || 'month') === 'week';
  const aiTrendDays = aiIsWeek ? ((new Date().getDay() + 6) % 7) + 1 : 30;
  const aiTrendPts = aggregateDaily(aiStats.filter(s => isArticle(s.platform)), s => {
    let n = 0;
    AI_ENGINES.forEach(ai => { if (s.ai && s.ai[ai]) n++; });
    return n;
  }, aiTrendDays, new Date());
  const aiTrendTitle = aiIsWeek ? '本周 AI 收录数趋势' : '近30天 AI 收录数趋势';
  html += `<div class="card"><div class="card-title">${aiTrendTitle} <span class="badge">${aiIsWeek ? '本周' : '近30天'}</span></div>${renderTrendLine(aiTrendPts, { color: 'var(--purple)', fmt: n => n })}</div>`;

  // 未关联记录（AI收录但找不到对应内容）
  const orphanAi = [...currAiStats].filter(s => findLinkedTitle(s, 'article') === null).sort((a,b) => b.date.localeCompare(a.date));
  html += `<div class="card"><div class="card-title">未关联记录 <span class="badge">${orphanAi.length}</span></div>`;
  if (orphanAi.length === 0) {
    html += '<p style="font-size:12px;color:var(--text2);padding:6px 0;">当前周期无未关联记录</p>';
  } else {
    html += '<p style="font-size:12px;color:var(--orange);margin-bottom:8px;">以下 AI 收录未找到对应登记内容（已失效或被删除），可删除或补录内容</p>';
    html += '<div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>日期</th><th>平台</th><th>收录数</th><th>操作</th></tr></thead><tbody>';
    orphanAi.forEach(s => {
      let n = 0;
      AI_ENGINES.forEach(ai => { if (s.ai && s.ai[ai]) n++; });
      html += `<tr><td>${s.date}</td><td><span class="platform-tag article">${s.platform}</span></td><td>${n}/${AI_ENGINES.length}</td><td><button style="background:none;border:none;color:var(--red);cursor:pointer;font-size:12px;" onclick="deleteAiStat('${s.id}')">删除</button></td></tr>`;
    });
    html += '</tbody></table></div>';
  }
  html += '</div>';
  return html;
}

function toggleAiCheck(el) {
  el.classList.toggle('checked');
  if (el.classList.contains('checked')) el.querySelector('.check-box').innerHTML = '&#10003;';
  else el.querySelector('.check-box').innerHTML = '';
}

function saveAiStat() {
  const platform = document.getElementById('aiPlatform').value;
  const date = document.getElementById('aiDate').value;
  const title = document.getElementById('aiTitle').value.trim();
  if (!date) { showToast('请选择日期'); return; }
  const ai = {};
  document.querySelectorAll('#aiChecks .ai-check-item').forEach(el => {
    ai[el.dataset.ai] = el.classList.contains('checked');
  });
  const existing = aiStats.find(s => s.platform === platform && s.date === date);
  if (existing) { existing.ai = ai; existing.title = title || existing.title; }
  else aiStats.push({ id: Date.now(), platform, date, title, ai });
  saveData('aiStats', aiStats);
  markTaskRecorded(platform, date);
  render(); showToast(platform + ' AI收录数据已保存，链路进度已更新');
}

function deleteAiStat(id) {
  showConfirm({
    title: '确认删除',
    desc: '将删除这条AI收录数据记录，内容登记本身不受影响，收录统计会随之更新。',
    danger: true,
    onOk: () => {
      aiStats = aiStats.filter(s => s.id != id && s.id != Number(id));
      saveData('aiStats', aiStats); render(); showToast('已删除');
    }
  });
}


// ===== 账号总数据（视频平台账号级快照）=====
// 快照式：每平台按日期记一条累计数据（日期以当天为准）
const ACCOUNT_FIELDS = [
  { key: 'posts', label: '发布量', ph: '累计发布数' },
  { key: 'followers', label: '粉丝量', ph: '粉丝总数' },
  { key: 'views', label: '总播放量', ph: '累计播放量' },
  { key: 'likes', label: '总点赞量', ph: '累计点赞量' },
  { key: 'comments', label: '总评论量', ph: '累计评论量' },
  { key: 'shares', label: '总转发/分享', ph: '累计转发/分享' }
];

let accSelectedPlatform = '抖音'; // 记录表单当前选中的平台（标题右侧按钮切换）

function selectAccountPlatform(p) { accSelectedPlatform = p; render(); }

function renderAccountData() {
  let html = '';

  // 1. 记录表单（日期固定为今天=最新总数据快照；平台在标题右侧按钮选择；账号ID/备注随平台联动）
  html += '<div class="card"><div class="card-title">记录账号数据 <span class="badge">今日 ' + getToday() + ' · 最新总数据</span>';
  html += '<span class="platform-pill">' + VIDEO_PLATFORMS.map(function(p){ return '<button class="pill' + (p === accSelectedPlatform ? ' active' : '') + '" onclick="selectAccountPlatform(\'' + p + '\')">' + p + '</button>'; }).join('') + '</span>';
  html += '</div>';
  // 账号ID + 备注（输入框始终为空，避免预填导致保存后内容"看着没清"；已保存内容见下方表格）
  html += '<div class="form-row" style="display:grid;grid-template-columns:1fr 1fr auto;gap:10px;">';
  html += '<div class="form-group" style="margin-bottom:0;"><label>' + accSelectedPlatform + ' 账号ID</label><input type="text" id="accAccountId" placeholder="未设置"></div>';
  html += '<div class="form-group" style="margin-bottom:0;"><label>备注</label><input type="text" id="accAccountNote" placeholder="昵称/主页链接等（可选）"></div>';
  html += '<div style="align-self:end;display:flex;justify-content:flex-end;">';
  // 保存 — 主题主色；padding/font 与 input 同高（约 43px），贴齐 input 底边
  html += '<button onclick="saveAccountIdOnly()" style="padding:11px 18px;background:linear-gradient(135deg, var(--accent), var(--accent-2));color:#fff;border:none;border-radius:var(--radius-xs);font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 2px 8px rgba(91,140,255,0.3);">保存</button>';
  html += '</div></div>';
  // 已保存的账号ID（始终渲染表格，避免空/非空切换时跳动；每行带删除按钮）
  var savedIds = accountIds.filter(function(r){ return (r.accountId && r.accountId.trim()) || (r.note && r.note.trim()); });
  html += '<div style="margin:10px 0 2px;"><div style="font-size:12px;color:var(--text3);margin-bottom:4px;">已保存的账号ID（' + savedIds.length + '条）</div>';
  html += '<table class="data-table"><thead><tr><th style="width:90px;">平台</th><th>账号ID</th><th>备注</th><th style="width:56px;"></th></tr></thead><tbody>';
  if (savedIds.length === 0) {
    html += '<tr><td colspan="4" style="text-align:center;color:var(--text3);padding:14px 0;">暂无，保存后显示在此处</td></tr>';
  } else {
    // 按平台顺序（同平台多条按保存先后）展示所有记录
    savedIds.slice().sort(function(a,b){
      var ia = VIDEO_PLATFORMS.indexOf(a.platform), ib = VIDEO_PLATFORMS.indexOf(b.platform);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.id - b.id;
    }).forEach(function(sr) {
      html += '<tr><td><span class="platform-tag video">' + escapeHtml(sr.platform) + '</span></td><td>' + escapeHtml(sr.accountId || '') + '</td><td>' + escapeHtml(sr.note || '') + '</td>';
      html += '<td><button class="btn-delete-mini" onclick="deleteAccountId(\'' + sr.id + '\')">删除</button></td></tr>';
    });
  }
  html += '</tbody></table></div>';
  // 分割线：账号ID区 与 指标登记区 分隔
  html += '<div style="border-top:1px dashed var(--border);margin:12px 0;"></div>';
  // 账号选择（该平台已登记的账号；无账号时仅「未指定账号」）
  var accRecs = accountIds.filter(function(x){ return x.platform === accSelectedPlatform; });
  html += '<div class="form-row">';
  html += '<div class="form-group"><label>账号</label><select id="accAccountRef"><option value="">未指定账号</option>';
  accRecs.forEach(function(rec) {
    html += '<option value="' + rec.id + '">' + escapeHtml(rec.accountId || '') + (rec.note ? '（' + escapeHtml(rec.note) + '）' : '') + '</option>';
  });
  html += '</select></div></div>';
  html += '<div class="form-row">' + ACCOUNT_FIELDS.map(function(f){ return '<div class="form-group"><label>' + f.label + '</label><input type="number" id="acc_' + f.key + '" min="0" placeholder="' + f.ph + '"></div>'; }).join('') + '</div>';
  html += '<div class="toolbar" style="margin-top:8px;"><button class="btn-primary" onclick="saveAccountSnapshot()">保存账号数据（' + accSelectedPlatform + '）</button></div>';
  html += '</div>';

  // 2. 各平台最新快照汇总（按「平台+账号」每行，取该账号最新一次记录）
  html += '<div class="card"><div class="card-title">各平台最新账号数据 <span class="badge">按账号最新快照</span></div>';
  html += '<table class="data-table"><thead><tr><th>平台</th><th>账号</th><th>记录日期</th><th>发布量</th><th>粉丝量</th><th>总播放量</th><th>总点赞量</th><th>总评论量</th><th>总转发/分享</th></tr></thead><tbody>';
  VIDEO_PLATFORMS.forEach(function(p) {
    var recs = accountIds.filter(function(x){ return x.platform === p; });
    var any = false;
    if (recs.length > 0) {
      recs.forEach(function(rec) {
        var r = latestAccountSnapshot(p, rec.id);
        any = true;
        html += '<tr><td><span class="platform-tag video">' + p + '</span></td><td>' + escapeHtml(rec.accountId || '') + '</td>';
        if (r) {
          html += '<td>' + escapeHtml(r.date) + '</td><td>' + formatNum(r.posts) + '</td><td>' + formatNum(r.followers) + '</td><td>' + formatNum(r.views) + '</td>';
          html += '<td>' + formatNum(r.likes) + '</td><td>' + formatNum(r.comments) + '</td><td>' + formatNum(r.shares) + '</td></tr>';
        } else {
          html += '<td colspan="7" style="color:var(--text3);">暂无数据</td></tr>';
        }
      });
    }
    // 未指定账号的快照单独一行（旧数据或没选账号记录的）
    var orphan = latestUnspecifiedAccount(p);
    if (orphan) {
      any = true;
      html += '<tr><td><span class="platform-tag video">' + p + '</span></td><td style="color:var(--text3);">未指定账号</td><td>' + escapeHtml(orphan.date) + '</td>';
      html += '<td>' + formatNum(orphan.posts) + '</td><td>' + formatNum(orphan.followers) + '</td><td>' + formatNum(orphan.views) + '</td>';
      html += '<td>' + formatNum(orphan.likes) + '</td><td>' + formatNum(orphan.comments) + '</td><td>' + formatNum(orphan.shares) + '</td></tr>';
    }
    if (!any) {
      html += '<tr><td><span class="platform-tag video">' + p + '</span></td><td colspan="8" style="color:var(--text3);">暂无数据</td></tr>';
    }
  });
  html += '</tbody></table></div>';

  // 3. 粉丝量趋势（按账号分组：每账号一条折线，2 列网格）
  html += '<div class="card"><div class="card-title">粉丝量趋势 <span class="badge">按账号快照</span></div>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">';
  var trendGroups = [];
  VIDEO_PLATFORMS.forEach(function(p) {
    var recs = accountIds.filter(function(x){ return x.platform === p; });
    recs.forEach(function(rec) {
      trendGroups.push({ platform: p, label: rec.accountId || ('账号#' + rec.id), ref: rec.id });
    });
    if (latestUnspecifiedAccount(p)) trendGroups.push({ platform: p, label: '未指定账号', ref: null });
  });
  trendGroups.forEach(function(g) {
    var pts = accountStats
      .filter(function(s){ return s.platform === g.platform && String(s.accountRef || '') === String(g.ref || '') && s.followers !== undefined && s.followers !== null; })
      .sort(function(a,b){ return (a.date || '').localeCompare(b.date || ''); })
      .map(function(s){ return { date: s.date, value: Number(s.followers) || 0 }; });
    html += '<div>';
    html += '<div style="font-size:13px;font-weight:600;margin-bottom:4px;">' + escapeHtml(g.platform) + ' · ' + escapeHtml(g.label) + '</div>';
    if (pts.length >= 2) {
      html += renderTrendLine(pts, { color: '#2563eb' });
    } else if (pts.length === 1) {
      html += '<div class="trend-box"><div class="trend-single">共 <b style="color:var(--accent);">' + formatNum(pts[0].value) + '</b></div></div>';
    } else {
      html += '<div class="trend-box"><div class="trend-single" style="color:var(--text3);">暂无数据</div></div>';
    }
    html += '</div>';
  });
  html += '</div></div>';

  // 4. 历史记录（全部快照，含与上次记录对比）
  var sorted = accountStats.slice().sort(function(a,b){ return (b.date || '').localeCompare(a.date || ''); });
  html += '<div class="card"><div class="card-title">历史记录 <span class="badge">' + sorted.length + '条</span></div>';
  if (sorted.length === 0) {
    html += '<p style="font-size:12px;color:var(--text3);padding:8px 0;">暂无账号数据记录，从上方表单开始记录</p>';
  } else {
    html += '<table class="data-table"><thead><tr><th>日期</th><th>平台</th><th>账号</th><th>发布</th><th>粉丝</th><th>播放</th><th>点赞</th><th>评论</th><th>转发/分享</th><th>较上次记录</th><th></th></tr></thead><tbody>';
    sorted.forEach(function(r) {
      html += '<tr><td>' + escapeHtml(r.date) + '</td><td><span class="platform-tag video">' + escapeHtml(r.platform) + '</span></td>';
      html += '<td style="font-size:12px;">' + escapeHtml(accountLabel(r.accountRef)) + '</td>';
      html += '<td>' + formatNum(r.posts) + '</td><td>' + formatNum(r.followers) + '</td><td>' + formatNum(r.views) + '</td>';
      html += '<td>' + formatNum(r.likes) + '</td><td>' + formatNum(r.comments) + '</td><td>' + formatNum(r.shares) + '</td>';
      html += '<td style="font-size:12px;">' + accountDeltaStr(r) + '</td>';
      html += '<td><button class="btn-delete-mini" onclick="deleteAccountSnapshot(\'' + r.id + '\')">删除</button></td></tr>';
    });
    html += '</tbody></table>';
  }
  html += '</div>';

  return html;
}

// 与上次记录对比：同平台同账号早于当前记录且日期最近的一条，逐项计算差值
function accountDeltaStr(r) {
  var prev = null;
  accountStats.forEach(function(s) {
    if (s.platform === r.platform && String(s.accountRef || '') === String(r.accountRef || '') && (s.date || '') < (r.date || '') && (!prev || (s.date || '') > (prev.date || ''))) prev = s;
  });
  if (!prev) return '<span style="color:var(--text3);">首条记录</span>';
  var parts = [];
  var pairs = [['posts','发布'],['followers','粉丝'],['views','播放'],['likes','点赞'],['comments','评论'],['shares','转发']];
  pairs.forEach(function(pair) {
    var d = (Number(r[pair[0]]) || 0) - (Number(prev[pair[0]]) || 0);
    if (d !== 0) {
      var color = d > 0 ? 'var(--green)' : 'var(--red)';
      parts.push('<span style="color:' + color + ';">' + pair[1] + (d > 0 ? '+' : '') + formatNum(d) + '</span>');
    }
  });
  if (parts.length === 0) return '<span style="color:var(--text3);">持平</span>';
  return parts.join(' · ');
}

// 某平台（可选绑定账号 ref）最近一条快照；ref 不传 = 不限账号取最新
function latestAccountSnapshot(platform, ref, list) {
  var arr = list || accountStats;
  var best = null;
  arr.forEach(function(s) {
    var refOk = (ref === undefined || ref === null || ref === '') ? true : String(s.accountRef || '') === String(ref);
    if (s.platform === platform && refOk && (!best || (s.date || '') > (best.date || ''))) best = s;
  });
  return best;
}

// 该平台「未指定账号」快照（accountRef 为空，或指向不存在的账号记录）
function latestUnspecifiedAccount(platform) {
  var refs = accountIds.filter(function(x){ return x.platform === platform; }).map(function(x){ return String(x.id); });
  var best = null;
  accountStats.forEach(function(s) {
    if (s.platform !== platform) return;
    var refStr = String(s.accountRef || '');
    if (refStr && refs.indexOf(refStr) >= 0) return; // 已归属某账号
    if (!best || (s.date || '') > (best.date || '')) best = s;
  });
  return best;
}

// 账号显示名：未指定/无记录 → 「未指定账号」
function accountLabel(ref) {
  if (ref === undefined || ref === null || ref === '') return '未指定账号';
  var rec = accountIds.find(function(x){ return String(x.id) === String(ref); });
  return rec && rec.accountId ? rec.accountId : '未指定账号';
}

// 保存：日期=当天，平台=标题右侧按钮选中的平台，账号=表单下拉选中的账号；
// 同日同平台同账号覆盖，否则新增（账号ID由独立按钮保存）
function saveAccountSnapshot() {
  var date = getToday();
  var platform = accSelectedPlatform;
  var accountRef = (document.getElementById('accAccountRef').value || '').trim() || null;
  var vals = {};
  ACCOUNT_FIELDS.forEach(function(f) { vals[f.key] = Math.max(0, parseInt(document.getElementById('acc_' + f.key).value, 10) || 0); });
  if (ACCOUNT_FIELDS.every(function(f){ return vals[f.key] === 0; })) { showToast('请至少填写一项指标数据'); return; }
  // 记录时间（导出时标注数据时效）
  var now = new Date();
  var recordedAt = date + ' ' + String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
  var existing = accountStats.find(function(s){ return s.platform === platform && s.date === date && String(s.accountRef || '') === String(accountRef || ''); });
  if (existing) { Object.assign(existing, vals); existing.recordedAt = recordedAt; }
  else { accountStats.push(Object.assign({ id: Date.now(), date: date, platform: platform, accountRef: accountRef, recordedAt: recordedAt }, vals)); }
  saveData('accountStats', accountStats); render(); showToast('账号数据已保存');
}

// 单独保存当前平台的账号ID/备注（两字段都空则删除该平台记录）
// 保存账号ID：每次新增一条记录（一个平台可登记多个账号，不覆盖已有记录）
function saveAccountIdOnly() {
  var platform = accSelectedPlatform;
  var accountId = (document.getElementById('accAccountId').value || '').trim();
  var note = (document.getElementById('accAccountNote').value || '').trim();
  if (!accountId && !note) { showToast('请填写账号ID或备注'); return; }
  accountIds.push({ id: Date.now() + Math.random(), platform: platform, accountId: accountId, note: note });
  saveData('accountIds', accountIds); render(); showToast(platform + '账号ID已保存');
}

// 删除单条账号ID记录（按记录 id）
function deleteAccountId(id) {
  var rec = accountIds.find(function(x){ return String(x.id) === String(id); });
  if (!rec) { showToast('该记录不存在'); return; }
  showConfirm({
    title: '确认删除',
    desc: '确定删除' + rec.platform + '的这条账号ID记录吗？',
    danger: true,
    onOk: function() {
      accountIds = accountIds.filter(function(r){ return String(r.id) !== String(id); });
      saveData('accountIds', accountIds); render(); showToast(rec.platform + '账号ID已删除');
    }
  });
}

function deleteAccountSnapshot(id) {
  showConfirm({
    title: '确认删除',
    desc: '确定删除这条账号数据记录吗？',
    danger: true,
    onOk: function() {
      accountStats = accountStats.filter(function(s){ return s.id != id && s.id != Number(id); });
      saveData('accountStats', accountStats); render(); showToast('已删除');
    }
  });
}
