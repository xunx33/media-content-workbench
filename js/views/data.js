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
  const thisMonth = getToday().slice(0, 7);
  let html = '';

  // Sub-tabs
  html += `<div class="sub-tab-bar">
    <div class="sub-tab ${dataSubTab==='video'?'active':''}" onclick="switchDataTab('video')">短视频数据</div>
    <div class="sub-tab ${dataSubTab==='article'?'active':''}" onclick="switchDataTab('article')">文书AI收录</div>
  </div>`;

  // 左右两栏：左=统计图表，右=复盘登记
  html += '<div class="data-layout">';
  html += '<div class="data-left">';
  if (dataSubTab === 'video') {
    html += renderVideoData(thisMonth);
  } else {
    html += renderArticleData(thisMonth);
  }
  html += '</div>';
  html += '<div class="data-right">';
  html += renderReviewPanel();
  html += '</div>';
  html += '</div>';

  return html;
}

function switchDataTab(tab) { dataSubTab = tab; render(); }

// --- 复盘数据登记面板 ---
function renderReviewPanel() {
  // 跟随上方子Tab：短视频数据 ↔ 文书AI收录
  const type = dataSubTab; // 'video' | 'article'
  const isVideo = type === 'video';
  let html = `<div class="card"><div class="card-title">${isVideo ? '短视频' : '文书'}复盘登记</div>`;

  html += `<div class="form-group"><label>复盘周期</label><select id="reviewPeriod">
    <option value="week">本周复盘</option>
    <option value="month">本月复盘</option>
  </select></div>`;
  html += `<div class="form-group"><label>复盘日期</label><input type="date" id="reviewDate" value="${getToday()}"></div>`;
  html += `<div class="form-group"><label>亮点内容 / 做得好的</label><textarea id="reviewHighlights" placeholder="播放/互动表现好的内容、平台、选题…"></textarea></div>`;
  html += `<div class="form-group"><label>问题与不足</label><textarea id="reviewProblems" placeholder="数据不理想的地方、待改进项…"></textarea></div>`;
  // 按类型区分：短视频=数据表现小结，文书=AI收录筛查
  if (isVideo) {
    html += `<div class="form-group"><label>数据表现小结</label><textarea id="reviewMetrics" placeholder="播放量/完播率/互动情况总结…"></textarea></div>`;
  } else {
    html += `<div class="form-group"><label>AI收录筛查情况</label><textarea id="reviewAi" placeholder="DeepSeek/豆包/千问/文心/元宝/纳米 收录情况小结…"></textarea></div>`;
  }
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
          <span style="font-size:11px;color:var(--text3);">${r.date}</span>
        </div>
        ${r.highlights ? `<div class="review-item-line"><span style="color:var(--green);">亮点：</span>${r.highlights}</div>` : ''}
        ${r.metrics ? `<div class="review-item-line"><span style="color:var(--teal);">数据：</span>${r.metrics}</div>` : ''}
        ${r.ai ? `<div class="review-item-line"><span style="color:var(--accent);">AI收录：</span>${r.ai}</div>` : ''}
        ${r.problems ? `<div class="review-item-line"><span style="color:var(--red);">问题：</span>${r.problems}</div>` : ''}
        ${r.plans ? `<div class="review-item-line"><span style="color:var(--purple);">计划：</span>${r.plans}</div>` : ''}
        <div class="review-item-actions"><button class="btn-delete-mini" onclick="deleteReview('${r.id}')">删除</button></div>
      </div>`;
    });
  }
  html += '</div></div></div>';
  return html;
}

function saveReview() {
  const type = dataSubTab; // 跟随上方子Tab
  const period = document.getElementById('reviewPeriod').value;
  const date = document.getElementById('reviewDate').value || getToday();
  const highlights = document.getElementById('reviewHighlights').value.trim();
  const problems = document.getElementById('reviewProblems').value.trim();
  const aiEl = document.getElementById('reviewAi');
  const ai = aiEl ? aiEl.value.trim() : '';
  const metricsEl = document.getElementById('reviewMetrics');
  const metrics = metricsEl ? metricsEl.value.trim() : '';
  const plans = document.getElementById('reviewPlans').value.trim();
  if (!highlights && !problems && !ai && !metrics && !plans) { showToast('请至少填写一项内容'); return; }
  // 同日同周期同类型覆盖
  const existing = reviews.find(r => r.date === date && r.period === period && r.type === type);
  if (existing) { existing.highlights = highlights; existing.problems = problems; existing.ai = ai; existing.metrics = metrics; existing.plans = plans; }
  else reviews.push({ id: Date.now(), type, period, date, highlights, problems, ai, metrics, plans });
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

// 上月月份字符串 YYYY-MM（用于本月 vs 上月对比）
function getPrevMonthStr(monthStr) {
  const [y, m] = monthStr.split('-').map(Number);
  const prev = new Date(y, m - 2, 1);
  return prev.getFullYear() + '-' + String(prev.getMonth() + 1).padStart(2, '0');
}

// 双柱对比柱形图：本月实心柱 + 上月半透明柱
function renderDualBarChart(labels, currVals, prevVals, barClass, fmt) {
  const maxV = Math.max(...currVals, ...prevVals, 1);
  let html = '<div class="bar-chart">';
  labels.forEach((label, i) => {
    const v = currVals[i] || 0, pv = prevVals[i] || 0;
    const h = Math.max(Math.round(v / maxV * 100), 3);
    const ph = Math.max(Math.round(pv / maxV * 100), 3);
    html += `<div class="bar-col">
      <div class="bar-pair">
        <div class="bar-pair-item" title="本月 ${fmt(v)}">
          <div class="bar-value">${fmt(v)}</div>
          <div class="bar ${barClass}" style="height:${h}%"></div>
        </div>
        <div class="bar-pair-item" title="上月 ${fmt(pv)}">
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

// 本月 vs 上月图例
function renderChartLegend(barClass) {
  return `<div class="chart-legend">
    <span class="legend-item"><span class="legend-dot ${barClass}"></span>本月</span>
    <span class="legend-item"><span class="legend-dot ${barClass} prev"></span>上月</span>
  </div>`;
}

// --- Video data（仅统计展示）---
function renderVideoData(thisMonth) {
  const monthStats = stats.filter(s => s.date.startsWith(thisMonth) && isVideo(s.platform));
  const totalCount = monthStats.length;  // 总发布数（数据录入条数）
  const totalViews = monthStats.reduce((sum, s) => sum + (s.views || 0), 0);
  const totalLikes = monthStats.reduce((sum, s) => sum + (s.likes || 0), 0);
  const totalComments = monthStats.reduce((sum, s) => sum + (s.comments || 0), 0);
  const totalFavorites = monthStats.reduce((sum, s) => sum + (s.favorites || 0), 0);
  const totalFollowers = monthStats.reduce((sum, s) => sum + (s.followers || 0), 0);

  let html = `<div class="card"><div class="card-title">短视频平台本月数据</div>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value">${totalCount}</div><div class="stat-label">总发布数</div></div>
      <div class="stat-card"><div class="stat-value">${formatNum(totalViews)}</div><div class="stat-label">总播放量</div></div>
      <div class="stat-card"><div class="stat-value">${formatNum(totalLikes)}</div><div class="stat-label">总点赞</div></div>
      <div class="stat-card"><div class="stat-value">${formatNum(totalComments)}</div><div class="stat-label">总评论</div></div>
      <div class="stat-card"><div class="stat-value">${formatNum(totalFavorites)}</div><div class="stat-label">总收藏</div></div>
      <div class="stat-card"><div class="stat-value">${formatNum(totalFollowers)}</div><div class="stat-label">总涨粉</div></div>
    </div></div>`;

  // Bar chart（本月 vs 上月双柱对比）
  html += '<div class="card"><div class="card-title">各平台播放量对比 <span class="badge">本月 vs 上月</span></div>';
  const platformViews = {};
  const prevPlatformViews = {};
  VIDEO_PLATFORMS.forEach(p => { platformViews[p] = 0; prevPlatformViews[p] = 0; });
  monthStats.forEach(s => { if (platformViews[s.platform] !== undefined) platformViews[s.platform] += s.views; });
  const prevMonthVideoStats = stats.filter(s => s.date.startsWith(getPrevMonthStr(thisMonth)) && isVideo(s.platform));
  prevMonthVideoStats.forEach(s => { if (prevPlatformViews[s.platform] !== undefined) prevPlatformViews[s.platform] += s.views; });
  html += renderChartLegend('video');
  html += renderDualBarChart(VIDEO_PLATFORMS, VIDEO_PLATFORMS.map(p => platformViews[p]), VIDEO_PLATFORMS.map(p => prevPlatformViews[p]), 'video', formatNum);
  html += '</div>';

  // Table
  html += '<div class="card"><div class="card-title">详细数据</div>';
  const recentStats = [...monthStats].sort((a,b) => b.date.localeCompare(a.date));
  if (recentStats.length === 0) html += '<div class="empty-state"><p>暂无数据，请在内容登记页录入</p></div>';
  else {
    html += '<div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>日期</th><th>平台</th><th>标题</th><th>播放</th><th>完播/人均观看</th><th>点赞</th><th>评论</th><th>收藏/推荐</th><th>分享</th><th>涨粉</th></tr></thead><tbody>';
    recentStats.forEach(s => {
      // 标题三级回退：contentId → platform+date → platform → 未关联
      const linkedTitle = findLinkedTitle(s, 'video');
      const title = s.title || linkedTitle || '未关联';
      const titleShort = title.length > 12 ? title.slice(0,12) + '…' : title;
      const noLink = linkedTitle === null;
      // 完播率列：小红书显示人均观看时长，其他显示完播率
      let completionCell;
      if (s.platform === '小红书') {
        completionCell = s.avgWatch !== null && s.avgWatch !== undefined ? s.avgWatch + 's' : '-';
      } else {
        completionCell = s.completionRate !== null && s.completionRate !== undefined ? s.completionRate + '%' : '-';
      }
      // 收藏列：视频号显示推荐，其他显示收藏
      const favCell = s.platform === '视频号' ? formatNum(s.recommend) : formatNum(s.favorites);
      html += `<tr><td>${s.date}</td><td><span class="platform-tag video">${s.platform}</span></td><td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${noLink ? 'var(--orange)' : 'inherit'};" title="${title}">${titleShort}</td><td>${formatNum(s.views)}</td><td>${completionCell}</td><td>${formatNum(s.likes)}</td><td>${formatNum(s.comments)}</td><td>${favCell}</td><td>${formatNum(s.shares)}</td><td>${formatNum(s.followers)}</td></tr>`;
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

// 数据保存成功后，标记对应任务 recorded（链路第三环）
function markTaskRecorded(platform, date) {
  const t = tasks.find(x => x.date === date && x.platform === platform);
  if (t && t.done) { t.recorded = true; if (!t.linked) t.linked = true; saveData('tasks', tasks); }
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
function renderArticleData(thisMonth) {
  const monthAiStats = aiStats.filter(s => s.date.startsWith(thisMonth) && isArticle(s.platform));
  let html = `<div class="card"><div class="card-title">文书平台 AI 收录追踪</div>`;
  html += `<p style="font-size:12px;color:var(--text2);margin-bottom:12px;">统计6大AI引擎收录情况：${AI_ENGINES.join('、')}</p>`;

  // Summary（月为单位：总发布数 / AI收录数 / AI收录率）
  let totalChecked = 0, totalPossible = 0;
  monthAiStats.forEach(s => {
    AI_ENGINES.forEach(ai => { totalPossible++; if (s.ai && s.ai[ai]) totalChecked++; });
  });
  const rate = totalPossible > 0 ? Math.round(totalChecked / totalPossible * 100) : 0;
  html += `<div class="stats-grid">
    <div class="stat-card"><div class="stat-value">${monthAiStats.length}</div><div class="stat-label">总发布数</div></div>
    <div class="stat-card"><div class="stat-value">${totalChecked}/${totalPossible}</div><div class="stat-label">AI收录数</div></div>
    <div class="stat-card"><div class="stat-value" style="color:${rate>=50?'var(--green)':'var(--yellow)'};">${rate}%</div><div class="stat-label">AI收录率</div></div>
  </div></div>`;

  // AI引擎收录情况（引擎视角柱形图，本月 vs 上月）
  html += '<div class="card"><div class="card-title">AI引擎收录情况 <span class="badge">本月 vs 上月</span></div>';
  const aiCounts = {};
  const prevAiCounts = {};
  AI_ENGINES.forEach(ai => { aiCounts[ai] = 0; prevAiCounts[ai] = 0; });
  monthAiStats.forEach(s => { AI_ENGINES.forEach(ai => { if (s.ai && s.ai[ai]) aiCounts[ai]++; }); });
  const prevMonthAiStats = aiStats.filter(s => s.date.startsWith(getPrevMonthStr(thisMonth)));
  prevMonthAiStats.forEach(s => { AI_ENGINES.forEach(ai => { if (s.ai && s.ai[ai]) prevAiCounts[ai]++; }); });
  html += renderChartLegend('article');
  html += renderDualBarChart(AI_ENGINES, AI_ENGINES.map(ai => aiCounts[ai]), AI_ENGINES.map(ai => prevAiCounts[ai]), 'article', n => n);
  html += '</div>';

  // 文书平台被收录情况（平台视角柱形图，本月 vs 上月）
  html += '<div class="card"><div class="card-title">文书平台被收录情况 <span class="badge">本月 vs 上月</span></div>';
  const platformCounts = {};
  const prevPlatformCounts = {};
  ARTICLE_PLATFORMS.forEach(p => { platformCounts[p] = 0; prevPlatformCounts[p] = 0; });
  monthAiStats.forEach(s => {
    if (platformCounts[s.platform] !== undefined) {
      AI_ENGINES.forEach(ai => { if (s.ai && s.ai[ai]) platformCounts[s.platform]++; });
    }
  });
  prevMonthAiStats.forEach(s => {
    if (prevPlatformCounts[s.platform] !== undefined) {
      AI_ENGINES.forEach(ai => { if (s.ai && s.ai[ai]) prevPlatformCounts[s.platform]++; });
    }
  });
  html += renderChartLegend('article');
  html += renderDualBarChart(ARTICLE_PLATFORMS, ARTICLE_PLATFORMS.map(p => platformCounts[p]), ARTICLE_PLATFORMS.map(p => prevPlatformCounts[p]), 'article', n => n);
  html += '</div>';

  // Table
  html += '<div class="card"><div class="card-title">详细数据</div>';
  if (monthAiStats.length === 0) html += '<div class="empty-state"><p>暂无数据，请在内容登记页录入</p></div>';
  else {
    html += '<div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>日期</th><th>平台</th><th>内容标题</th>';
    AI_ENGINES.forEach(ai => html += `<th>${AI_ENGINES_SHORT[ai] || ai}</th>`);
    html += '</tr></thead><tbody>';
    [...monthAiStats].sort((a,b) => b.date.localeCompare(a.date)).forEach(s => {
      const linkedTitle = findLinkedTitle(s, 'article');
      const title = s.title || linkedTitle || '未关联';
      const titleShort = title.length > 12 ? title.slice(0,12) + '…' : title;
      const noLink = linkedTitle === null;
      html += `<tr><td>${s.date}</td><td><span class="platform-tag article">${s.platform}</span></td><td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${noLink ? 'var(--orange)' : 'inherit'};" title="${title}">${titleShort}</td>`;
      AI_ENGINES.forEach(ai => {
        const yes = s.ai && s.ai[ai];
        html += `<td><span class="ai-badge ${yes?'yes':'no'}">${yes?'Y':'-'}</span></td>`;
      });
      html += '</tr>';
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

