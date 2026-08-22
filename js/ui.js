function formatNum(n) {
  if (n >= 10000) return (n/10000).toFixed(1) + 'w';
  if (n >= 1000) return (n/1000).toFixed(1) + 'k';
  return n || 0;
}

// ===== MODAL =====
let pendingLinkTaskId = null;
// 登记弹窗平台下拉：按工作台分区只显示对应平台（短视频工作台 → 4 视频平台；文书工作台 → 6 文书平台）
function platformOptions(selected) {
  const list = workspace === 'video' ? VIDEO_PLATFORMS : ARTICLE_PLATFORMS;
  const label = workspace === 'video' ? '短视频平台' : '文书平台';
  const fallback = list.includes(selected) ? selected : list[0];
  return `<optgroup label="${label}">${list.map(p => `<option value="${p}" ${p === fallback ? 'selected' : ''}>${p}</option>`).join('')}</optgroup>`;
}

function openAddModal(prefillPlatform, taskId, prefillDate) {
  editId = null;
  pendingLinkTaskId = taskId || null;
  const preP = prefillPlatform || (workspace === 'video' ? VIDEO_PLATFORMS[0] : ARTICLE_PLATFORMS[0]);
  const preD = prefillDate || getToday();
  document.getElementById('modalContent').innerHTML = `
    <h3>登记内容</h3>
    <div class="form-row">
      <div class="form-group"><label>平台</label>
        <select id="cPlatform">
          ${platformOptions(preP)}
        </select>
      </div>
      <div class="form-group"><label>日期</label><input type="date" id="cDate" value="${preD}"></div>
    </div>
    <div class="form-group"><label>标题</label><input type="text" id="cTitle" placeholder="内容标题"></div>
    <div class="form-group"><label>选题</label><input type="text" id="cTopic" placeholder="内容选题/主题方向"></div>
    <div class="form-group"><label>链接</label><input type="url" id="cUrl" placeholder="https://... 发布链接"></div>
    <div class="modal-actions">
      <button class="btn-cancel" onclick="closeModal()">取消</button>
      <button class="btn-save" onclick="saveContent()">保存</button>
    </div>`;
  document.getElementById('modalOverlay').classList.add('active');
}

// 编辑登记弹窗：仅登记内容（数据录入保持独立按钮——必须先有登记内容才能录数据，二者不同时进行）
// 平台下拉按工作台分区只显示对应平台
function editContent(id) {
  const c = contents.find(x => x.id == id || x.id == Number(id));
  if (!c) return;
  editId = c.id;
  document.getElementById('modalContent').innerHTML = `
    <h3>编辑登记</h3>
    <div class="form-row">
      <div class="form-group"><label>平台</label>
        <select id="cPlatform">
          ${platformOptions(c.platform)}
        </select>
      </div>
      <div class="form-group"><label>日期</label><input type="date" id="cDate" value="${c.createdAt}"></div>
    </div>
    <div class="form-group"><label>标题</label><input type="text" id="cTitle" value="${escapeHtml(c.title)}"></div>
    <div class="form-group"><label>选题</label><input type="text" id="cTopic" value="${escapeHtml(c.topic||'')}"></div>
    <div class="form-group"><label>链接</label><input type="url" id="cUrl" value="${escapeHtml(c.url||'')}" placeholder="https://..."></div>
    <div class="modal-actions">
      <button class="btn-cancel" onclick="closeModal()">取消</button>
      <button class="btn-save" onclick="saveContent()">保存</button>
    </div>`;
  document.getElementById('modalOverlay').classList.add('active');
}

async function saveContent() {
  const title = document.getElementById('cTitle').value.trim();
  const platform = document.getElementById('cPlatform').value;
  const date = document.getElementById('cDate').value || getToday();
  const topic = document.getElementById('cTopic').value.trim();
  const url = document.getElementById('cUrl').value.trim();
  if (!title) { showToast('请输入标题'); return; }
  if (url && !/^https?:\/\//i.test(url)) { showToast('链接格式错误：需以 http:// 或 https:// 开头'); return; }
  let savedId = null;
  if (editId) {
    const c = contents.find(x => x.id == editId || x.id == Number(editId));
    if (c) {
      const oldPlatform = c.platform, oldDate = c.createdAt;
      // 先判断旧「平台+日期」是否唯一（必须在 c 更新前计算，否则过滤结果失真）
      const oldKeyOnly = contents.filter(x => x.platform === oldPlatform && x.createdAt === oldDate).length === 1;
      c.title = title; c.platform = platform; c.topic = topic; c.url = url; c.createdAt = date; savedId = c.id;
      // 同步关联统计表副本（标题/平台/日期跟随内容变更，避免导出/复盘读到旧平台旧日期）
      // contentId 精确关联必跟随；旧「平台+日期」兜底关联：仅当该旧键唯一时可归属（防止误改同键其他内容的记录）
      let statChanged = false;
      const follow = s => {
        const byContentId = s.contentId == c.id || s.contentId == Number(c.id);
        const byOldKey = s.platform === oldPlatform && s.date === oldDate;
        if (!byContentId && !byOldKey) return;
        // 旧键不唯一时无法确认归属，跳过该记录（其属于另一条内容，标题/平台/日期都不应被改动）
        if (!byContentId && !oldKeyOnly) return;
        s.title = title;
        s.platform = platform; s.date = date;
        statChanged = true;
      };
      stats.forEach(follow);
      aiStats.forEach(follow);
      if (statChanged) { await saveData('stats', stats); await saveData('aiStats', aiStats); }
    }
  } else {
    savedId = Date.now() + Math.random();
    contents.push({ id: savedId, title, platform, topic, url, createdAt: date });
  }
  await saveData('contents', contents); closeModal();
  pendingLinkTaskId = null;
  render();
  showToast(editId ? '已更新' : '已登记');
}

// ===== UNIFIED CONFIRM =====
function showConfirm({ title, desc, danger = false, okText, onOk }) {
  document.getElementById('modalContent').innerHTML = `
    <h3>${title}</h3>
    <p class="confirm-text">${desc}</p>
    <div class="modal-actions">
      <button class="btn-cancel" onclick="closeModal()">取消</button>
      <button class="btn-save ${danger ? 'btn-danger' : ''}" id="confirmOkBtn">${okText || (danger ? '确认删除' : '确认')}</button>
    </div>`;
  document.getElementById('modalOverlay').classList.add('active');
  document.getElementById('confirmOkBtn').onclick = () => {
    closeModal();
    if (onOk) onOk();
  };
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
  pendingLinkTaskId = null;
}
// 弹窗退出方式：仅「取消」按钮或键盘ESC；点击空白处不关闭
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeModal();
});

// ===== NAV =====
document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    // 从「AI 配置与功能」页点导航：先切回之前的视频/文书分区再进对应页
    if (workspace === 'llm') {
      const prev = localStorage.getItem(STORAGE_KEY + 'prev_workspace');
      switchWorkspace(prev === 'article' ? 'article' : 'video');
    }
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentTab = tab.dataset.tab;
    // 数据复盘子 tab 跟随分区（video→短视频数据 / article→文书AI收录）
    if (currentTab === 'data') dataSubTab = workspace;
    if (currentTab === 'calendar' && !selectedDate) selectedDate = getToday();
    // 切换 tab 时重置 AI busy 标志（避免切回来后按钮点不动）
    resetAiBusyFlags();
    render();
  });
});

// ===== WORKSPACE 分区同步 =====
function syncWorkspaceUI() {
  const sel = document.getElementById('wsSelect');
  if (sel) sel.value = workspace;
  // 「账号登记」tab 视频/文书分区均可用（文书为精简版）
}

// ===== TOAST =====
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}
