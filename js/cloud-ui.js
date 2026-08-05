// ===== 云接入 UI：登录状态条 + 登录弹窗 + 分享管理 =====
// 依赖：js/cloud.js（CloudBridge）+ js/ui.js（closeModal/showToast 等）

// 通用弹窗（兼容 ui.js 的 modal 结构）
function showCloudModal(html) {
  document.getElementById('modalContent').innerHTML = html;
  document.getElementById('modalOverlay').classList.add('active');
}

// 渲染顶部的云状态条（注入 topbar 下方）
function renderCloudBar() {
  const bar = document.getElementById('cloudBar');
  if (!bar) return;
  if (CloudBridge.isShareMode()) {
    bar.innerHTML = `<span style="font-size:12px;color:var(--purple);">🔗 访客分享模式 · 只读查看</span>`;
    return;
  }
  const logged = CloudBridge.isLoggedIn();
  const name = CloudBridge.getLoginUsername();
  bar.innerHTML = logged
    ? `<span style="font-size:12px;color:var(--green);">☁️ 已同步 · ${name}</span>
       <span class="cloud-actions">
         <button class="cloud-btn" onclick="CloudUI.openSharePanel()">分享管理</button>
         <button class="cloud-btn" onclick="CloudUI.logout()">退出登录</button>
       </span>`
    : `<span style="font-size:12px;color:var(--text2);">☁️ 未登录（仅本地存储）</span>
       <span class="cloud-actions">
         <button class="cloud-btn primary" onclick="CloudUI.openLogin()">登录</button>
         <button class="cloud-btn" onclick="CloudUI.openRegister()">注册</button>
       </span>`;
}

// 打开登录弹窗
function openLoginModal() {
  const html = `<div class="modal-title">登录云端账号</div>
    <div class="form-group"><label>账号</label><input type="text" id="cloudUsername" placeholder="输入账号"></div>
    <div class="form-group"><label>密码</label><input type="password" id="cloudPassword" placeholder="输入密码"></div>
    <div class="toolbar" style="margin-top:14px;justify-content:flex-end;">
      <button class="btn-edit" onclick="closeModal()">取消</button>
      <button class="btn-primary" onclick="CloudUI.doLogin()">登录</button>
    </div>`;
  showCloudModal(html);
}

function openRegisterModal() {
  const html = `<div class="modal-title">注册云端账号</div>
    <p style="font-size:12px;color:var(--text2);margin-bottom:10px;">首次注册者为管理员，可管理数据和分享。密码至少 6 位。</p>
    <div class="form-group"><label>账号</label><input type="text" id="cloudUsername" placeholder="设置账号"></div>
    <div class="form-group"><label>密码</label><input type="password" id="cloudPassword" placeholder="设置密码（≥6位）"></div>
    <div class="toolbar" style="margin-top:14px;justify-content:flex-end;">
      <button class="btn-edit" onclick="closeModal()">取消</button>
      <button class="btn-primary" onclick="CloudUI.doRegister()">注册</button>
    </div>`;
  showCloudModal(html);
}

// 分享管理面板
function openSharePanel() {
  const html = `<div class="modal-title">分享管理</div>
    <p style="font-size:12px;color:var(--text2);margin-bottom:10px;">开启后生成只读分享链接，发给特定的人即可查看你的数据。随时可关闭。</p>
    <div id="sharePanelBody" style="font-size:13px;color:var(--text2);">加载中...</div>
    <div class="toolbar" style="margin-top:14px;justify-content:flex-end;">
      <button class="btn-edit" onclick="closeModal()">关闭</button>
    </div>`;
  showCloudModal(html);
  refreshSharePanel();
}

async function refreshSharePanel() {
  const body = document.getElementById('sharePanelBody');
  if (!body) return;
  try {
    const res = await CloudBridge.pushToCloud(); // 先确保最新数据已上传
    if (!res) { body.innerHTML = '<span style="color:var(--red);">数据上传失败，请检查网络后重试</span>'; return; }
    // 查询当前分享状态
    const cur = await window.CloudBridge.queryShareStatus();
    if (cur.enabled) {
      const url = CloudBridge.buildShareUrl(cur.token);
      body.innerHTML = `<div style="display:flex;flex-direction:column;gap:10px;align-items:flex-start;">
        <span style="color:var(--green);font-size:12px;">✅ 分享已开启，链接：</span>
        <code style="font-size:11px;word-break:break-all;background:var(--bg-2);padding:8px;border-radius:6px;display:block;width:100%;">${url}</code>
        <button class="btn-primary" style="font-size:12px;padding:6px 12px;" onclick="CloudUI.copyUrl('${url}')">复制链接</button>
        <button class="btn-delete" style="font-size:12px;padding:6px 12px;" onclick="CloudUI.disableShare()">关闭分享</button>
      </div>`;
    } else {
      body.innerHTML = `<div style="display:flex;flex-direction:column;gap:10px;">
        <span style="font-size:12px;color:var(--text2);">当前未开启分享</span>
        <button class="btn-primary" onclick="CloudUI.enableShare()">开启分享</button>
      </div>`;
    }
  } catch (e) {
    body.innerHTML = '<span style="color:var(--red);">加载失败：' + e.message + '</span>';
  }
}

async function enableShare() {
  const body = document.getElementById('sharePanelBody');
  if (!body) return;
  body.innerHTML = '生成中...';
  try {
    const token = await CloudBridge.generateShareToken();
    const url = CloudBridge.buildShareUrl(token);
    body.innerHTML = `<div style="display:flex;flex-direction:column;gap:10px;align-items:flex-start;">
      <span style="color:var(--green);font-size:12px;">✅ 分享已开启，复制以下链接发给对方：</span>
      <code style="font-size:11px;word-break:break-all;background:var(--bg-2);padding:8px;border-radius:6px;display:block;width:100%;">${url}</code>
      <button class="btn-primary" style="font-size:12px;padding:6px 12px;" onclick="CloudUI.copyUrl('${url}')">复制链接</button>
      <button class="btn-delete" style="font-size:12px;padding:6px 12px;" onclick="CloudUI.disableShare()">关闭分享</button>
    </div>`;
  } catch (e) {
    body.innerHTML = '<span style="color:var(--red);">' + e.message + '</span>';
  }
}

async function disableShare() {
  const body = document.getElementById('sharePanelBody');
  if (!body) return;
  body.innerHTML = '关闭中...';
  await CloudBridge.disableShare();
  body.innerHTML = '<span style="color:var(--text2);font-size:13px;">✅ 分享已关闭，之前的链接已失效</span>';
}

function copyUrl(url) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => showToast('链接已复制'));
  } else {
    const ta = document.createElement('textarea');
    ta.value = url; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove();
    showToast('链接已复制');
  }
}

// 动作封装
async function doLogin() {
  const u = document.getElementById('cloudUsername').value.trim();
  const p = document.getElementById('cloudPassword').value;
  if (!u || !p) { showToast('请输入账号和密码'); return; }
  try {
    const msg = await CloudBridge.loginWithPassword(u, p);
    closeModal();
    showToast(msg || '登录成功');
  } catch (e) {
    showToast(e.message || '登录失败');
  }
}

async function doRegister() {
  const u = document.getElementById('cloudUsername').value.trim();
  const p = document.getElementById('cloudPassword').value;
  if (!u || !p) { showToast('请输入账号和密码'); return; }
  try {
    const msg = await CloudBridge.registerWithPassword(u, p);
    closeModal();
    showToast(msg || '注册成功');
  } catch (e) {
    showToast(e.message || '注册失败');
  }
}

async function logout() {
  await CloudBridge.logoutCloud();
  showToast('已退出登录');
}

// 导出
window.CloudUI = {
  openLogin: openLoginModal,
  openRegister: openRegisterModal,
  doLogin, doRegister, logout,
  openSharePanel, enableShare, disableShare, copyUrl,
  renderBar: renderCloudBar
};

// 登录态变化时刷新状态条
CloudBridge.onAuthChange(() => renderCloudBar());
