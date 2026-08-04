function renderOverview() {
  const year = overviewMonth.getFullYear();
  const month = overviewMonth.getMonth() + 1;
  const monthStr = `${year}-${String(month).padStart(2,'0')}`;
  const monthTasks = tasks.filter(t => t.date.startsWith(monthStr));

  let html = `<div class="card"><div class="calendar-header"><div class="calendar-nav">
    <button onclick="changeOverviewMonth(-1)">&#8249;</button>
    <span class="calendar-month">${year}年${month}月</span>
    <button onclick="changeOverviewMonth(1)">&#8250;</button>
  </div><button class="btn-today" onclick="goOverviewThisMonth()">本月</button></div>`;

  // 总览统计
  const videoTasks = monthTasks.filter(t => t.type === 'video');
  const articleTasks = monthTasks.filter(t => t.type === 'article');
  const vDone = videoTasks.filter(t => t.done).length;
  const aDone = articleTasks.filter(t => t.done).length;
  const totalDone = vDone + aDone;

  // 月视频总播放（当月所有视频数据播放量之和）
  const monthVideoStats = stats.filter(s => s.date.startsWith(monthStr) && isVideo(s.platform));
  const monthViews = monthVideoStats.reduce((sum, s) => sum + (s.views || 0), 0);
  // 月AI总收录数（当月所有文书AI收录为"是"的引擎数之和）
  const monthAiStats = aiStats.filter(s => s.date.startsWith(monthStr));
  let aiTotal = 0;
  monthAiStats.forEach(s => { AI_ENGINES.forEach(ai => { if (s.ai && s.ai[ai]) aiTotal++; }); });

  html += `<div class="stats-grid">
    <div class="stat-card"><div class="stat-value">${totalDone}</div><div class="stat-label">本月已发布</div></div>
    <div class="stat-card"><div class="stat-value">${vDone}</div><div class="stat-label">短视频条数</div></div>
    <div class="stat-card"><div class="stat-value">${aDone}</div><div class="stat-label">文书条数</div></div>
    <div class="stat-card"><div class="stat-value">${formatNum(monthViews)}</div><div class="stat-label">月视频总播放</div></div>
    <div class="stat-card"><div class="stat-value">${aiTotal}</div><div class="stat-label">AI总收录数</div></div>
  </div></div>`;

  // 各平台对比柱状图
  html += '<div class="card"><div class="card-title">各平台本月发布条数对比</div>';
  const platformCounts = {};
  ALL_PLATFORMS.forEach(p => platformCounts[p] = { done: 0, total: 0 });
  monthTasks.forEach(t => {
    if (platformCounts[t.platform]) {
      platformCounts[t.platform].done += t.done ? 1 : 0;
      platformCounts[t.platform].total += 1;
    }
  });
  const maxCount = Math.max(...Object.values(platformCounts).map(c => c.done), 1);
  html += '<div class="bar-chart">';
  ALL_PLATFORMS.forEach(p => {
    const v = platformCounts[p].done;
    const h = Math.round(v / maxCount * 100);
    const barClass = isVideo(p) ? 'video' : 'article';
    html += `<div class="bar-col"><div class="bar-value">${v}</div><div class="bar ${barClass}" style="height:${Math.max(h,4)}%"></div><div class="bar-label">${p}</div></div>`;
  });
  html += '</div></div>';

  // 各平台明细 + 进度条
  html += '<div class="card"><div class="card-title">各平台发布明细</div>';
  html += '<div class="section-label"><span style="color:#fdba74;">短视频平台</span><span class="count">' + VIDEO_PLATFORMS.length + '</span></div>';
  html += '<div class="platform-rows">';
  VIDEO_PLATFORMS.forEach(p => {
    const c = platformCounts[p];
    const pct = c.total > 0 ? Math.round(c.done/c.total*100) : 0;
    html += `<div class="platform-row video">
      <div class="platform-row-icon video">${PLATFORM_SHORT[p]}</div>
      <div class="platform-row-info">
        <div class="platform-row-name">${p}</div>
        <div class="platform-row-stat">${c.done}/${c.total} 已发布 · ${pct}%</div>
        <div style="height:5px;background:var(--border);border-radius:3px;margin-top:6px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#fb923c,#fdba74);transition:width 0.5s var(--ease);border-radius:3px;"></div>
        </div>
      </div>
    </div>`;
  });
  html += '</div>';
  html += '<div class="section-label"><span style="color:#c4b5fd;">文书平台</span><span class="count">' + ARTICLE_PLATFORMS.length + '</span></div>';
  html += '<div class="platform-rows">';
  ARTICLE_PLATFORMS.forEach(p => {
    const c = platformCounts[p];
    const pct = c.total > 0 ? Math.round(c.done/c.total*100) : 0;
    html += `<div class="platform-row article">
      <div class="platform-row-icon article">${PLATFORM_SHORT[p]}</div>
      <div class="platform-row-info">
        <div class="platform-row-name">${p}</div>
        <div class="platform-row-stat">${c.done}/${c.total} 已发布 · ${pct}%</div>
        <div style="height:5px;background:var(--border);border-radius:3px;margin-top:6px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#8b5cf6,#c4b5fd);transition:width 0.5s var(--ease);border-radius:3px;"></div>
        </div>
      </div>
    </div>`;
  });
  html += '</div></div>';

  return html;
}

function changeOverviewMonth(delta) { overviewMonth.setMonth(overviewMonth.getMonth() + delta); render(); }
function goOverviewThisMonth() { overviewMonth = new Date(); render(); }
