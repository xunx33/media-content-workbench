function renderToday() {
  const today = getToday();
  const todayTasks = tasks.filter(t => t.date === today);
  const todayVideo = todayTasks.filter(t => t.type === 'video');
  const todayArticle = todayTasks.filter(t => t.type === 'article');

  let html = '<div class="today-section"><h3>今日待办</h3>';

  // Today - video
  html += '<div style="font-size:13px;color:#fdba74;margin-bottom:6px;font-weight:600;">短视频平台</div><ul class="today-list">';
  todayVideo.forEach(t => {
    const content = t.contentId ? contents.find(c => c.id === t.contentId) : null;
    html += `<li class="today-item ${content ? 'has-detail' : ''}">
      <div class="today-item-row">
        <span class="left">${renderChainDots(t)} <span class="platform-tag video">${t.platform}</span>${content ? ' ' + content.title : ''} ${renderChainHint(t)}${content ? `<span class="expand-toggle" onclick="toggleTaskDetail(this)">&#9660;</span>` : ''}</span>
        ${renderTaskButton(t)}
      </div>
      ${content ? renderTaskDetail(content, t) : ''}
    </li>`;
  });
  html += '</ul>';

  // Today - article
  html += '<div style="font-size:13px;color:#c4b5fd;margin:10px 0 6px;font-weight:600;">文书平台</div><ul class="today-list">';
  todayArticle.forEach(t => {
    const content = t.contentId ? contents.find(c => c.id === t.contentId) : null;
    html += `<li class="today-item ${content ? 'has-detail' : ''}">
      <div class="today-item-row">
        <span class="left">${renderChainDots(t)} <span class="platform-tag article">${t.platform}</span>${content ? ' ' + content.title : ''} ${renderChainHint(t)}${content ? `<span class="expand-toggle" onclick="toggleTaskDetail(this)">&#9660;</span>` : ''}</span>
        ${renderTaskButton(t)}
      </div>
      ${content ? renderTaskDetail(content, t) : ''}
    </li>`;
  });
  html += '</ul>';

  const doneCount = todayTasks.filter(t => t.done).length;
  if (doneCount === todayTasks.length && todayTasks.length > 0) {
    html += '<p style="color:var(--green);margin-top:10px;font-size:13px;">今日全部完成！</p>';
  } else {
    html += `<p style="color:var(--text2);margin-top:10px;font-size:12px;">已完成 ${doneCount}/${todayTasks.length}</p>`;
  }
  html += '</div>';

  // Daily overview
  html += '<div class="card"><div class="card-title">今日发布概览</div>';
  const tVideo = todayTasks.filter(t => t.type === 'video');
  const tArticle = todayTasks.filter(t => t.type === 'article');
  const vDone = tVideo.filter(t => t.done).length;
  const vTotal = tVideo.length;
  const aDone = tArticle.filter(t => t.done).length;
  const aTotal = tArticle.length;
  html += `<div class="stats-grid">
    <div class="stat-card"><div class="stat-value">${vDone}/${vTotal}</div><div class="stat-label">短视频</div></div>
    <div class="stat-card"><div class="stat-value">${aDone}/${aTotal}</div><div class="stat-label">文书</div></div>
    <div class="stat-card"><div class="stat-value">${doneCount}</div><div class="stat-label">今日完成</div></div>
    <div class="stat-card"><div class="stat-value">${todayTasks.length - doneCount}</div><div class="stat-label">今日待办</div></div>
  </div></div>`;

  return html;
}

// 任务展开详情：显示该平台对应登记的完整信息 + 数据摘要 + 操作入口
function renderTaskDetail(content, t) {
  let html = `<div class="task-detail">
    <div class="task-detail-row"><span class="detail-label">标题</span><span>${content.title}</span></div>
    ${content.topic ? `<div class="task-detail-row"><span class="detail-label">选题</span><span>${content.topic}</span></div>` : ''}
    ${content.url ? `<div class="task-detail-row"><span class="detail-label">链接</span><a href="${content.url}" target="_blank" style="color:#7da7ff;word-break:break-all;">${content.url}</a></div>` : ''}
    <div class="task-detail-row"><span class="detail-label">日期</span><span>${content.createdAt || ''}</span></div>`;

  // 数据摘要（视频 / AI收录，按平台动态显示）
  const type = isVideo(t.platform) ? 'video' : 'article';
  if (type === 'video') {
    const s = stats.find(x => x.contentId == content.id || x.contentId == Number(content.id));
    if (s) {
      const completion = s.completionRate !== null && s.completionRate !== undefined ? s.completionRate + '%' : '-';
      const avgWatch = s.avgWatch !== null && s.avgWatch !== undefined ? s.avgWatch + 's' : '-';
      // 第二项：小红书=人均观看，其他=完播率
      const secondItem = t.platform === '小红书' ? '人均观看' + avgWatch : '完播' + completion;
      // 收藏项：视频号=推荐，其他=收藏
      const favItem = t.platform === '视频号' ? '推荐' + formatNum(s.recommend) : '收藏' + formatNum(s.favorites);
      html += `<div class="task-detail-row"><span class="detail-label">数据</span><span>播放${formatNum(s.views)} · ${secondItem} · 点赞${formatNum(s.likes)} · 评论${formatNum(s.comments)} · ${favItem} · 分享${formatNum(s.shares)} · 涨粉${formatNum(s.followers)}</span></div>`;
    }
  } else {
    const s = aiStats.find(x => x.contentId == content.id || x.contentId == Number(content.id));
    if (s) {
      const yes = AI_ENGINES.filter(e => s.ai && s.ai[e]);
      html += `<div class="task-detail-row"><span class="detail-label">AI收录</span><span>${yes.length > 0 ? yes.join('、') : '暂无收录'}</span></div>`;
    }
  }

  // 操作入口：数据录入 / 编辑 / 删除
  html += `<div class="task-detail-actions">
    <button class="btn-publish" onclick="openDataModal('${content.id}')">数据录入</button>
    <button class="btn-edit" onclick="editContent('${content.id}')">编辑</button>
    <button class="btn-delete" onclick="deleteContent('${content.id}')">删除</button>
  </div>`;
  html += '</div>';
  return html;
}

// 展开/收起任务详情
function toggleTaskDetail(arrowEl) {
  // 兼容两种容器：今日待办 li.today-item / 日历 div.day-task
  const container = arrowEl.closest('.today-item') || arrowEl.closest('.day-task');
  if (!container) return;
  const detail = container.querySelector('.task-detail');
  if (!detail) return;
  const isOpen = detail.classList.contains('open');
  if (isOpen) {
    detail.classList.remove('open');
    arrowEl.style.transform = 'rotate(0deg)';
  } else {
    detail.classList.add('open');
    arrowEl.style.transform = 'rotate(180deg)';
  }
}

function markDone(id) {
  const t = tasks.find(x => x.id == id || x.id == Number(id));
  if (t) {
    t.done = !t.done;
    // 撤销完成不解除登记关系：只要还登记着内容，就不显示「登记链接」
    saveData('tasks', tasks); render();
    showToast(t.done ? '已标记完成' : '已撤销');
  }
}

// ===== 流程链路：发布 → 登记链接 =====
function renderChainDots(t) {
  const step1 = t.done;
  const step2 = t.done && t.linked;
  const dot = (active, color) => `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${active ? color : 'rgba(148,163,184,0.3)'};box-shadow:${active ? '0 0 4px ' + color : 'none'};"></span>`;
  return `<span class="chain-dots" title="完成/登记链接">${dot(step1, 'var(--green)')}${dot(step2, 'var(--accent)')}</span>`;
}

// 链路引导提示：已发布但未登记链接时显示轻量文字链接
function renderChainHint(t) {
  if (t.done && !t.linked) {
    return `<a class="chain-hint" onclick="goRegisterLink('${t.id}')">登记链接</a>`;
  }
  return '';
}

// 主按钮统一：未完成="完成"，已完成=绿色对勾（点击可撤销）
function renderTaskButton(t) {
  if (t.done) {
    return `<button class="btn-check-done" onclick="markDone('${t.id}')" title="点击取消">&#10003;</button>`;
  }
  return `<button class="btn-done" onclick="markDone('${t.id}')">完成</button>`;
}

function goRegisterLink(id) {
  const t = tasks.find(x => x.id == id || x.id == Number(id));
  if (t) openAddModal(t.platform, t.id);
}

function goRecordData(id) {
  const t = tasks.find(x => x.id == id || x.id == Number(id));
  if (!t) return;
  // 跳转到数据复盘页，并预填平台/日期
  currentTab = 'data';
  dataSubTab = isVideo(t.platform) ? 'video' : 'article';
  document.querySelectorAll('.nav-tab').forEach(n => n.classList.remove('active'));
  document.querySelector('.nav-tab[data-tab="data"]').classList.add('active');
  setTimeout(() => {
    const platformSel = document.getElementById(isVideo(t.platform) ? 'statPlatform' : 'aiPlatform');
    const dateSel = document.getElementById(isVideo(t.platform) ? 'statDate' : 'aiDate');
    if (platformSel) platformSel.value = t.platform;
    if (dateSel) dateSel.value = t.date;
    showToast('请为 ' + t.platform + ' 补录数据');
  }, 50);
  render();
}

// 登记内容成功后，对应任务自动完成并标记 linked（登记内容 = 该平台当日已发布）
function linkTaskToContent(platform, date, contentId) {
  const t = tasks.find(x => x.date === date && x.platform === platform);
  if (t) {
    if (!t.done) { t.done = true; }
    t.linked = true;
    if (contentId) t.contentId = contentId;
    saveData('tasks', tasks);
  }
}
