function renderOverview() {
  const year = overviewMonth.getFullYear();
  const month = overviewMonth.getMonth() + 1;
  const monthStr = `${year}-${String(month).padStart(2,'0')}`;

  let html = `<div class="card"><div class="calendar-header"><div class="calendar-nav">
    <button onclick="changeOverviewMonth(-1)">&#8249;</button>
    <span class="calendar-month">${year}年${month}月</span>
    <button onclick="changeOverviewMonth(1)">&#8250;</button>
  </div><button class="btn-today" onclick="goOverviewThisMonth()">本月</button></div>`;

  // 总览统计（以登记为准，条数累计制）
  const monthContents = contents.filter(c => c.createdAt.startsWith(monthStr));
  const vDone = monthContents.filter(c => isVideo(c.platform)).length;
  const aDone = monthContents.filter(c => isArticle(c.platform)).length;

  // 视频平台数据汇总（播放/点赞/评论/涨粉）
  const monthVideoStats = stats.filter(s => s.date.startsWith(monthStr) && isVideo(s.platform));
  const monthViews = monthVideoStats.reduce((sum, s) => sum + (s.views || 0), 0);
  const monthLikes = monthVideoStats.reduce((sum, s) => sum + (s.likes || 0), 0);
  const monthComments = monthVideoStats.reduce((sum, s) => sum + (s.comments || 0), 0);
  const monthFollowers = monthVideoStats.reduce((sum, s) => sum + (s.followers || 0), 0);
  // 文书平台数据汇总（AI收录）
  const monthAiStats = aiStats.filter(s => s.date.startsWith(monthStr));
  let aiTotal = 0;
  monthAiStats.forEach(s => { AI_ENGINES.forEach(ai => { if (s.ai && s.ai[ai]) aiTotal++; }); });

  html += `<div class="card"><div class="card-title">本月数据总览</div>
    <div class="section-label"><span style="color:var(--video-orange-light);">视频平台数据</span><span class="count">${vDone} 条</span></div>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value">${vDone}</div><div class="stat-label">本月总发布</div></div>
      <div class="stat-card"><div class="stat-value">${formatNum(monthViews)}</div><div class="stat-label">本月总播放</div></div>
      <div class="stat-card"><div class="stat-value">${formatNum(monthLikes)}</div><div class="stat-label">本月总点赞</div></div>
      <div class="stat-card"><div class="stat-value">${formatNum(monthComments)}</div><div class="stat-label">本月总评论</div></div>
      <div class="stat-card"><div class="stat-value">${formatNum(monthFollowers)}</div><div class="stat-label">本月总涨粉</div></div>
    </div>
    <div class="section-label" style="margin-top:10px;"><span style="color:var(--article-purple-light);">文书平台数据</span><span class="count">${aDone} 条</span></div>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value">${aDone}</div><div class="stat-label">本月总发布</div></div>
      <div class="stat-card"><div class="stat-value">${aiTotal}</div><div class="stat-label">本月总收录</div></div>
    </div>
  </div>`;

  // 各平台明细 + 进度条（条数 / 当月天数）
  const daysInMonth = new Date(year, month, 0).getDate();
  const platformCounts = {};
  ALL_PLATFORMS.forEach(p => platformCounts[p] = { done: 0, total: daysInMonth });
  monthContents.forEach(c => {
    if (platformCounts[c.platform]) platformCounts[c.platform].done += 1;
  });
  html += '<div class="card"><div class="card-title">各平台发布明细</div>';
  html += '<div class="section-label"><span style="color:var(--video-orange-light);">短视频平台</span><span class="count">' + VIDEO_PLATFORMS.length + '</span></div>';
  html += '<div class="platform-rows">';
  VIDEO_PLATFORMS.forEach(p => {
    const c = platformCounts[p];
    const pct = Math.min(100, Math.round(c.done / c.total * 100));
    html += `<div class="platform-row video">
      <div class="platform-row-icon video">${PLATFORM_SHORT[p]}</div>
      <div class="platform-row-info">
        <div class="platform-row-name">${p}</div>
        <div class="platform-row-stat">${c.done} 条 / ${c.total} 天 · ${pct}%</div>
        <div style="height:5px;background:var(--border);border-radius:3px;margin-top:6px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--video-orange),var(--video-orange-light));transition:width 0.5s var(--ease);border-radius:3px;"></div>
        </div>
      </div>
    </div>`;
  });
  html += '</div>';
  html += '<div class="section-label"><span style="color:var(--article-purple-light);">文书平台</span><span class="count">' + ARTICLE_PLATFORMS.length + '</span></div>';
  html += '<div class="platform-rows">';
  ARTICLE_PLATFORMS.forEach(p => {
    const c = platformCounts[p];
    const pct = Math.min(100, Math.round(c.done / c.total * 100));
    html += `<div class="platform-row article">
      <div class="platform-row-icon article">${PLATFORM_SHORT[p]}</div>
      <div class="platform-row-info">
        <div class="platform-row-name">${p}</div>
        <div class="platform-row-stat">${c.done} 条 / ${c.total} 天 · ${pct}%</div>
        <div style="height:5px;background:var(--border);border-radius:3px;margin-top:6px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--article-purple),var(--article-purple-light));transition:width 0.5s var(--ease);border-radius:3px;"></div>
        </div>
      </div>
    </div>`;
  });
  html += '</div></div>';

  return html;
}

function changeOverviewMonth(delta) { overviewMonth.setMonth(overviewMonth.getMonth() + delta); render(); }
function goOverviewThisMonth() { overviewMonth = new Date(); render(); }
