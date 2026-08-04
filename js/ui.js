function formatNum(n) {
  if (n >= 10000) return (n/10000).toFixed(1) + 'w';
  if (n >= 1000) return (n/1000).toFixed(1) + 'k';
  return n || 0;
}

// ===== MODAL =====
let pendingLinkTaskId = null;
function openAddModal(prefillPlatform, taskId) {
  editId = null;
  pendingLinkTaskId = taskId || null;
  const preP = prefillPlatform || VIDEO_PLATFORMS[0];
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
      <div class="form-group"><label>日期</label><input type="date" id="cDate" value="${getToday()}"></div>
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
    <div class="form-group"><label>标题</label><input type="text" id="cTitle" value="${c.title}"></div>
    <div class="form-group"><label>选题</label><input type="text" id="cTopic" value="${c.topic||''}"></div>
    <div class="form-group"><label>链接</label><input type="url" id="cUrl" value="${c.url||''}" placeholder="https://..."></div>
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
  let savedId = null;
  if (editId) {
    const c = contents.find(x => x.id == editId || x.id == Number(editId));
    if (c) { c.title = title; c.platform = platform; c.topic = topic; c.url = url; c.createdAt = date; savedId = c.id; }
  } else {
    savedId = Date.now();
    contents.push({ id: savedId, title, platform, topic, url, createdAt: date });
  }
  saveData('contents', contents); closeModal();
  // 打通链路：登记内容成功后，对应任务自动完成 + 标记 linked
  if (pendingLinkTaskId) {
    const t = tasks.find(x => x.id == pendingLinkTaskId || x.id == Number(pendingLinkTaskId));
    if (t) {
      if (!t.done) { t.done = true; }
      t.linked = true;
      t.contentId = savedId;
      saveData('tasks', tasks);
    }
  } else {
    linkTaskToContent(platform, date, savedId);
  }
  pendingLinkTaskId = null;
  render();
  showToast(editId ? '已更新' : '已登记，链路进度已更新');
}

// ===== UNIFIED CONFIRM =====
function showConfirm({ title, desc, danger = false, onOk }) {
  document.getElementById('modalContent').innerHTML = `
    <h3>${title}</h3>
    <p class="confirm-text">${desc}</p>
    <div class="modal-actions">
      <button class="btn-cancel" onclick="closeModal()">取消</button>
      <button class="btn-save ${danger ? 'btn-danger' : ''}" id="confirmOkBtn">${danger ? '确认删除' : '确认'}</button>
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
document.getElementById('modalOverlay').addEventListener('click', function(e) { if (e.target === this) closeModal(); });

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
