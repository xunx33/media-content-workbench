function formatNum(n) {
  if (n >= 10000) return (n/10000).toFixed(1) + 'w';
  if (n >= 1000) return (n/1000).toFixed(1) + 'k';
  return n || 0;
}

// ===== MODAL =====
let pendingLinkTaskId = null;
function openAddModal(prefillPlatform, taskId, prefillDate) {
  editId = null;
  pendingLinkTaskId = taskId || null;
  const preP = prefillPlatform || VIDEO_PLATFORMS[0];
  const preD = prefillDate || getToday();
  document.getElementById('modalContent').innerHTML = `
    <h3>登记内容</h3>
    <div class="form-row">
      <div class="form-group"><label>平台</label>
        <select id="cPlatform">
          <optgroup label="短视频平台">
            ${VIDEO_PLATFORMS.map(p => `<option value="${p}" ${p===preP?'selected':''}>${p}</option>`).join('')}
          </optgroup>
          <optgroup label="文书平台">
            ${ARTICLE_PLATFORMS.map(p => `<option value="${p}" ${p===preP?'selected':''}>${p}</option>`).join('')}
          </optgroup>
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

function editContent(id) {
  const c = contents.find(x => x.id == id || x.id == Number(id));
  if (!c) return;
  editId = c.id;
  document.getElementById('modalContent').innerHTML = `
    <h3>编辑登记</h3>
    <div class="form-row">
      <div class="form-group"><label>平台</label>
        <select id="cPlatform">
          <optgroup label="短视频平台">
            ${VIDEO_PLATFORMS.map(p => `<option value="${p}" ${c.platform===p?'selected':''}>${p}</option>`).join('')}
          </optgroup>
          <optgroup label="文书平台">
            ${ARTICLE_PLATFORMS.map(p => `<option value="${p}" ${c.platform===p?'selected':''}>${p}</option>`).join('')}
          </optgroup>
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

function saveContent() {
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
      c.title = title; c.platform = platform; c.topic = topic; c.url = url; c.createdAt = date; savedId = c.id;
      // 同步统计表标题副本（避免导出/复盘读到旧标题）
      let statChanged = false;
      stats.forEach(s => {
        if (s.contentId == c.id || s.contentId == Number(c.id) || (s.platform === c.platform && s.date === c.createdAt)) { s.title = title; statChanged = true; }
      });
      aiStats.forEach(s => {
        if (s.contentId == c.id || s.contentId == Number(c.id) || (s.platform === c.platform && s.date === c.createdAt)) { s.title = title; statChanged = true; }
      });
      if (statChanged) { saveData('stats', stats); saveData('aiStats', aiStats); }
    }
  } else {
    savedId = Date.now();
    contents.push({ id: savedId, title, platform, topic, url, createdAt: date });
  }
  saveData('contents', contents); closeModal();
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
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentTab = tab.dataset.tab;
    if (currentTab === 'calendar' && !selectedDate) selectedDate = getToday();
    render();
  });
});

// ===== TOAST =====
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}
