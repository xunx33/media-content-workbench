function renderToday() {
  const today = getToday();
  const counts = getDayCounts(today);

  let html = '<div class="today-section"><h3>今日待办</h3>';

  // 按工作台分区只渲染对应平台（短视频工作台 / 文书工作台）
  if (workspace === 'video') {
    html += '<div style="font-size:13px;color:var(--video-orange-light);margin-bottom:6px;font-weight:600;">短视频平台</div><ul class="today-list">';
    VIDEO_PLATFORMS.forEach(p => html += renderPlatformTodayItem(p, counts[p], today, 'video'));
    html += '</ul>';
  } else {
    html += '<div style="font-size:13px;color:var(--article-purple-light);margin-bottom:6px;font-weight:600;">文书平台</div><ul class="today-list">';
    ARTICLE_PLATFORMS.forEach(p => html += renderPlatformTodayItem(p, counts[p], today, 'article'));
    html += '</ul>';
  }

  html += '</div>';

  // 今日发布概览（按分区只显示对应类型；「今日总登记」始终为当日全部）
  const todayContents = contents.filter(c => c.createdAt === today);
  const vTotal = todayContents.filter(c => isVideo(c.platform)).length;
  const aTotal = todayContents.filter(c => isArticle(c.platform)).length;
  const videoDone = VIDEO_PLATFORMS.filter(p => todayContents.some(c => c.platform === p)).length;
  const articleDone = ARTICLE_PLATFORMS.filter(p => todayContents.some(c => c.platform === p)).length;
  html += `<div class="card"><div class="card-title">今日发布概览</div>
    <div class="stats-grid">`;
  if (workspace === 'video') {
    html += `
      <div class="stat-card"><div class="stat-value">${vTotal}</div><div class="stat-label">短视频条数</div></div>
      <div class="stat-card"><div class="stat-value">${videoDone}/${VIDEO_PLATFORMS.length}</div><div class="stat-label">视频平台覆盖</div></div>
      <div class="stat-card"><div class="stat-value">${todayContents.length}</div><div class="stat-label">今日总登记</div></div>`;
  } else {
    html += `
      <div class="stat-card"><div class="stat-value">${aTotal}</div><div class="stat-label">文书条数</div></div>
      <div class="stat-card"><div class="stat-value">${articleDone}/${ARTICLE_PLATFORMS.length}</div><div class="stat-label">文书平台覆盖</div></div>
      <div class="stat-card"><div class="stat-value">${todayContents.length}</div><div class="stat-label">今日总登记</div></div>`;
  }
  html += `</div></div>`;

  // 解析数据表格模块（原在内容登记页，移至今日待办页底部）
  html += renderTableParser();

  return html;
}

// 单平台今日行：平台标签 + 已发条数/未登记 + [+1] 按钮 + 内容展开
function renderPlatformTodayItem(platform, count, date, type) {
  const list = getPlatformContents(date, platform);
  const taskKey = platform + '|' + date;   // 展开状态 key（保存重绘后据此恢复展开）
  const isOpen = expandedTaskKeys.has(taskKey);
  let html = `<li class="today-item ${count > 0 ? 'has-detail' : ''}">
    <div class="today-item-row">
      <span class="left">
        <span class="platform-initial ${type}">${PLATFORM_SHORT[platform] || (platform ? platform.charAt(0) : '')}</span><span class="platform-tag ${type}">${platform}</span>
        ${count > 0
          ? `<span style="color:var(--green);font-size:12px;font-weight:600;">已发 ${count} 条</span><span class="expand-toggle ${isOpen ? 'open' : ''}" onclick="toggleTaskDetail(this, '${taskKey}')">&#9660;</span>`
          : `<span style="color:var(--text3);font-size:12px;">未登记</span>`}
      </span>
      <span class="status-dot ${count > 0 ? 'done' : 'pending'}" title="${count > 0 ? '已登记' : '未登记'}"></span>
      <button class="btn-done" onclick="openAddModal('${platform}', null, '${date}')">+1</button>
    </div>`;
  if (count > 0) {
    html += `<div class="task-detail ${isOpen ? 'open' : ''}">`;
    list.forEach(c => html += renderContentDetail(c));
    html += `</div>`;
  }
  html += '</li>';
  return html;
}

// 单条内容详情：标题/链接/日期+选题 + 数据摘要 + 操作（数据录入/编辑/删除）
// 布局：左侧信息列（flex:1）+ 右侧竖排操作按钮，避免按钮挤压内容列宽度
function renderContentDetail(content) {
  const type = isVideo(content.platform) ? 'video' : 'article';
  const safeLink = safeUrl(content.url);
  let html = `<div class="content-detail-item">
    <div class="task-detail-info">
    <div class="task-detail-row"><span class="detail-label">标题</span><span>${escapeHtml(content.title)}</span></div>
    ${safeLink ? `<div class="task-detail-row"><span class="detail-label">链接</span><a href="${escapeHtml(safeLink)}" target="_blank" rel="noopener noreferrer" style="color:var(--link-blue);word-break:break-all;">${escapeHtml(content.url)}</a></div>` : ''}
    <div class="task-detail-row"><span class="detail-label">日期</span><span>${content.createdAt || ''}${content.topic ? ' · 选题：' + escapeHtml(content.topic) : ''}</span></div>`;

  // 数据摘要（视频 / AI收录，按平台动态显示）
  if (type === 'video') {
    const s = stats.find(x => x.contentId == content.id || x.contentId == Number(content.id));
    if (s) {
      // 摘要为单行文本，未录入用「-」占位保持可读（与数据栏网格逻辑不同）
      const fmtSum = v => (v === null || v === undefined || v === '') ? '-' : formatNum(v);
      const completion = s.completionRate !== null && s.completionRate !== undefined ? s.completionRate + '%' : '-';
      const avgWatch = s.avgWatch !== null && s.avgWatch !== undefined ? s.avgWatch + 's' : '-';
      const secondItem = content.platform === '小红书'
        ? '均播' + avgWatch
        : (content.platform === '视频号' || content.platform === '抖音')
          ? '完播' + completion + '·均播' + avgWatch
          : '完播' + completion;
      const favItem = content.platform === '视频号' ? '推荐' + fmtSum(s.recommend) : '收藏' + fmtSum(s.favorites);
      html += `<div class="task-detail-row"><span class="detail-label">数据</span><span>播放${fmtSum(s.views)} · ${secondItem} · 点赞${fmtSum(s.likes)} · 评论${fmtSum(s.comments)} · ${favItem} · 分享${fmtSum(s.shares)} · 涨粉${fmtSum(s.followers)}</span></div>`;
    }
  } else {
    const s = aiStats.find(x => x.contentId == content.id || x.contentId == Number(content.id));
    if (s) {
      const yes = AI_ENGINES.filter(e => s.ai && s.ai[e]);
      html += `<div class="task-detail-row"><span class="detail-label">AI收录</span><span>${yes.length > 0 ? yes.join('、') : '暂无收录'}</span></div>`;
    }
  }
  html += '</div>';

  // 操作入口：数据录入 / 编辑 / 删除（右侧竖排）
  html += `<div class="task-detail-actions">
    <button class="btn-data-entry" onclick="openDataModal('${content.id}')">数据录入</button>
    <button class="btn-edit" onclick="editContent('${content.id}')">编辑</button>
    <button class="btn-delete" onclick="deleteContent('${content.id}')">删除</button>
  </div>`;
  html += '</div>';
  return html;
}

// 展开/收起任务详情（记录到 expandedTaskKeys，保存重绘后保持展开）
function toggleTaskDetail(arrowEl, taskKey) {
  // 兼容两种容器：今日待办 li.today-item / 日历 div.day-task
  const container = arrowEl.closest('.today-item') || arrowEl.closest('.day-task');
  if (!container) return;
  const detail = container.querySelector('.task-detail');
  if (!detail) return;
  const isOpen = detail.classList.contains('open');
  if (isOpen) {
    detail.classList.remove('open');
    arrowEl.classList.remove('open');
    if (taskKey) expandedTaskKeys.delete(taskKey);
  } else {
    detail.classList.add('open');
    arrowEl.classList.add('open');
    if (taskKey) expandedTaskKeys.add(taskKey);
  }
}
