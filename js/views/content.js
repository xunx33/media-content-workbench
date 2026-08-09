function renderContent() {
  const filtered = getFilteredContents();
  let html = `<div class="card"><div class="card-title">内容登记 <span class="badge" id="contentCount">${filtered.length}条</span></div>`;
  html += `<div class="search-box">
    <span class="search-icon">&#128269;</span>
    <input type="text" id="searchInput" placeholder="搜索标题/选题/平台/链接..." value="${searchKeyword}" oninput="handleSearch(this.value)">
    ${searchKeyword ? `<button class="search-clear" onclick="clearSearch()">清除</button>` : ''}
  </div>`;
  html += `<div class="filter-pills">
    <span class="filter-pill ${!contentFilterType ? 'active' : ''}" onclick="filterContent('all',this)">全部</span>
    <span class="filter-pill ${contentFilterType === 'today' ? 'active' : ''}" onclick="filterContent('today',this)">今日</span>
    ${VIDEO_PLATFORMS.map(p => `<span class="filter-pill ${contentFilterType === p ? 'active' : ''}" onclick="filterContent('${p}',this)">${p}</span>`).join('')}
    ${ARTICLE_PLATFORMS.map(p => `<span class="filter-pill ${contentFilterType === p ? 'active' : ''}" onclick="filterContent('${p}',this)">${p}</span>`).join('')}
    <span class="filter-pill sort-views ${contentSortByViews === 'desc' ? 'active-desc' : contentSortByViews === 'asc' ? 'active-asc' : ''}" onclick="toggleSortViews()">${contentSortByViews === 'desc' ? '播放量 ↓' : contentSortByViews === 'asc' ? '播放量 ↑' : '播放量'}</span>
  </div>`;

  // 列表折叠区（可收起/展开）
  html += `<div class="content-fold" id="contentFold">
    <div class="content-fold-header" onclick="toggleContentFold()">
      <span class="content-fold-title">📋 登记列表 <span class="badge">${filtered.length}条</span></span>
      <span class="content-fold-arrow" id="foldArrow">&#9650;</span>
    </div>
    <div id="contentList" class="content-fold-body">`;
  if (filtered.length === 0) html += `<div class="empty-state"><div class="empty-icon">${searchKeyword ? '&#128270;' : '+'}</div><p>${searchKeyword ? '未找到匹配内容' : '暂无登记记录，点击右下角 + 号登记'}</p></div>`;
  else filtered.forEach(c => html += renderContentItem(c));
  html += '</div></div></div>';

  // 解析表格模块：解析平台导出的数据表，并入登记内容数据
  html += renderTableParser();

  return html;
}

function openDataModal(contentId) {
  const c = contents.find(x => x.id == contentId || x.id == Number(contentId));
  if (!c) return;
  const type = isVideo(c.platform) ? 'video' : 'article';
  pendingDataContentId = c.id;
  document.getElementById('modalContent').innerHTML = type === 'video'
    ? renderVideoDataModal(c)
    : renderAiDataModal(c);
  document.getElementById('modalOverlay').classList.add('active');
}

function renderVideoDataModal(c) {
  const s = stats.find(x => x.contentId == c.id || x.contentId == Number(c.id) || (x.platform === c.platform && x.date === c.createdAt));
  const pf = c.platform;
  // 按平台动态选择第二行字段：抖音/快手/视频号=完播率，小红书=人均观看时长
  const secondField = pf === '小红书'
    ? `<div class="form-group"><label>人均观看时长(秒)</label><input type="number" id="statAvgWatch" value="${s && s.avgWatch !== null && s.avgWatch !== undefined ? s.avgWatch : ''}" min="0" step="0.1"></div>`
    : `<div class="form-group"><label>完播率(%)</label><input type="number" id="statCompletion" value="${s && s.completionRate !== null && s.completionRate !== undefined ? s.completionRate : ''}" min="0" max="100" step="0.1"></div>`;
  // 第三行：视频号显示「推荐」替代「收藏」
  const thirdRow = pf === '视频号'
    ? `<div class="form-row">
        <div class="form-group"><label>推荐</label><input type="number" id="statRecommend" value="${s ? s.recommend : ''}" min="0"></div>
        <div class="form-group"><label>分享</label><input type="number" id="statShares" value="${s ? s.shares : ''}" min="0"></div>
      </div>`
    : `<div class="form-row">
        <div class="form-group"><label>收藏</label><input type="number" id="statFavorites" value="${s ? s.favorites : ''}" min="0"></div>
        <div class="form-group"><label>分享</label><input type="number" id="statShares" value="${s ? s.shares : ''}" min="0"></div>
      </div>`;
  return `<h3>${pf}数据录入</h3>
    <p style="font-size:13px;color:var(--text2);margin-bottom:14px;"><span class="platform-tag video">${pf}</span> ${c.title}<br><span style="font-size:12px;color:var(--text3);">日期：${c.createdAt}</span></p>
    <div class="form-group"><label>作品标题/描述（可选）</label><input type="text" id="statTitle" value="${s && s.title ? s.title : ''}" placeholder="与登记内容一致时留空即可"></div>
    <div class="form-row">
      <div class="form-group"><label>播放量</label><input type="number" id="statViews" value="${s ? s.views : ''}" min="0"></div>
      ${secondField}
    </div>
    <div class="form-row">
      <div class="form-group"><label>点赞</label><input type="number" id="statLikes" value="${s ? s.likes : ''}" min="0"></div>
      <div class="form-group"><label>评论</label><input type="number" id="statComments" value="${s ? s.comments : ''}" min="0"></div>
    </div>
    ${thirdRow}
    <div class="form-row">
      <div class="form-group"><label>涨粉</label><input type="number" id="statFollowers" value="${s ? s.followers : ''}" min="0"></div>
    </div>
    <div class="modal-actions">
      <button class="btn-cancel" onclick="closeModal()">取消</button>
      <button class="btn-save btn-danger" style="flex:0.6;" onclick="clearContentData()">清空</button>
      <button class="btn-save" onclick="saveContentData()">保存数据</button>
    </div>`;
}

function renderAiDataModal(c) {
  const s = aiStats.find(x => x.contentId == c.id || x.contentId == Number(c.id) || (x.platform === c.platform && x.date === c.createdAt));
  const savedAi = (s && s.ai) || {};
  return `<h3>文书AI收录录入</h3>
    <p style="font-size:13px;color:var(--text2);margin-bottom:14px;"><span class="platform-tag article">${c.platform}</span> ${c.title}<br><span style="font-size:12px;color:var(--text3);">日期：${c.createdAt}</span></p>
    <div class="form-group"><label>AI 收录情况（勾选已收录）</label>
      <div class="ai-checks" id="aiChecks">
        ${AI_ENGINES.map(eng => `<div class="ai-check-item ${savedAi[eng] ? 'checked' : ''}" data-ai="${eng}" onclick="toggleAiCheck(this)"><div class="check-box">${savedAi[eng] ? '&#10003;' : ''}</div><span>${eng}</span></div>`).join('')}
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn-cancel" onclick="closeModal()">取消</button>
      <button class="btn-save btn-danger" style="flex:0.6;" onclick="clearContentData()">清空</button>
      <button class="btn-save" onclick="saveContentData()">保存数据</button>
    </div>`;
}

let pendingDataContentId = null;

// 清空当前弹窗的数据录入内容（不保存）
function clearContentData() {
  const c = contents.find(x => x.id == pendingDataContentId || x.id == Number(pendingDataContentId));
  if (!c) return;
  const type = isVideo(c.platform) ? 'video' : 'article';
  if (type === 'video') {
    ['statTitle', 'statViews', 'statCompletion', 'statAvgWatch', 'statLikes', 'statComments', 'statFavorites', 'statRecommend', 'statShares', 'statFollowers'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  } else {
    document.querySelectorAll('#aiChecks .ai-check-item').forEach(el => {
      el.classList.remove('checked');
      el.querySelector('.check-box').innerHTML = '';
    });
  }
  showToast('已清空，点击保存后生效');
}

function saveContentData() {
  const c = contents.find(x => x.id == pendingDataContentId || x.id == Number(pendingDataContentId));
  if (!c) { showToast('内容不存在'); return; }
  const type = isVideo(c.platform) ? 'video' : 'article';
  if (type === 'video') {
    // 安全读取：弹窗按平台只渲染部分输入框（小红书无完播率、视频号无收藏），
    // 缺失的输入框直接返回空串，避免 null.value 抛异常导致保存失败
    const gv = id => { const el = document.getElementById(id); return el ? el.value : ''; };
    const title = (gv('statTitle').trim()) || c.title;
    const views = parseInt(gv('statViews')) || 0;
    const completionInput = gv('statCompletion');
    const completionRate = completionInput !== '' ? parseFloat(completionInput) : null;
    const avgWatchInput = gv('statAvgWatch');
    const avgWatch = avgWatchInput !== '' ? parseFloat(avgWatchInput) : null;
    const recommend = parseInt(gv('statRecommend')) || 0;
    const likes = parseInt(gv('statLikes')) || 0;
    const comments = parseInt(gv('statComments')) || 0;
    const favorites = parseInt(gv('statFavorites')) || 0;
    const shares = parseInt(gv('statShares')) || 0;
    const followers = parseInt(gv('statFollowers')) || 0;
    const existing = stats.find(x => x.contentId == c.id || x.contentId == Number(c.id) || (x.platform === c.platform && x.date === c.createdAt));
    const statData = { platform: c.platform, date: c.createdAt, title, views, completionRate, avgWatch, recommend, likes, comments, favorites, shares, followers, contentId: c.id };
    if (existing) Object.assign(existing, statData);
    else stats.push({ id: Date.now() + Math.random(), ...statData });
    saveData('stats', stats);
    markTaskRecorded(c.platform, c.createdAt);
  } else {
    const ai = {};
    document.querySelectorAll('#aiChecks .ai-check-item').forEach(el => {
      ai[el.dataset.ai] = el.classList.contains('checked');
    });
    const existing = aiStats.find(x => x.contentId == c.id || x.contentId == Number(c.id) || (x.platform === c.platform && x.date === c.createdAt));
    if (existing) { existing.ai = ai; existing.contentId = c.id; }
    else aiStats.push({ id: Date.now() + Math.random(), platform: c.platform, date: c.createdAt, title: c.title, ai, contentId: c.id });
    saveData('aiStats', aiStats);
    markTaskRecorded(c.platform, c.createdAt);
  }
  pendingDataContentId = null;
  closeModal(); render();
  showToast('数据已保存');
}

function filterContent(filter, el) {
  contentFilterType = filter === 'all' ? '' : filter;
  render();
}

// 播放量排序：默认(日期) → 降序 → 升序 → 默认 循环
function toggleSortViews() {
  contentSortByViews = contentSortByViews === 'desc' ? 'asc' : contentSortByViews === 'asc' ? '' : 'desc';
  render();
}

function deleteContent(id) {
  showConfirm({
    title: '确认删除',
    desc: '确定删除这条记录吗？删除后不可恢复。<br><br><span style="color:var(--text3);">关联的发布任务将回到「未登记」状态，可重新登记。</span>',
    danger: true,
    onOk: () => {
      const numId = Number(id);
      contents = contents.filter(c => c.id != id && c.id != numId);
      // 解除任务关联：linked 重置，contentId 清空（任务保留完成状态，重新显示「登记链接」）
      let taskChanged = false;
      tasks.forEach(t => {
        if (t.contentId !== null && t.contentId !== undefined && (t.contentId == id || t.contentId == numId)) {
          t.contentId = null;
          t.linked = false;
          taskChanged = true;
        }
      });
      if (taskChanged) saveData('tasks', tasks);
      // 同步清理关联的视频数据 / AI收录数据
      stats = stats.filter(s => !(s.contentId == id || s.contentId == numId));
      aiStats = aiStats.filter(s => !(s.contentId == id || s.contentId == numId));
      saveData('stats', stats); saveData('aiStats', aiStats);
      saveData('contents', contents); render(); showToast('已删除，任务已回到未登记状态');
    }
  });
}
