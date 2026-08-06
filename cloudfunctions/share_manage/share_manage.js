// 云函数：share_manage —— 管理员管理分享令牌（启用/关闭/查询）
// 通过 username 验证身份（适配 CloudBase Web 端，不依赖微信 OPENID）
const cloud = require('@cloudbase/node-sdk');
const app = cloud.init({ env: cloud.SYMBOL_CURRENT_ENV });
const db = app.database();
const crypto = require('crypto');

function genToken() {
  return crypto.randomBytes(16).toString('hex'); // 32 位随机令牌
}

exports.main = async (event) => {
  const { action, username } = event || {};

  try {
    // 验证调用者是否为管理员
    if (!username) {
      return { ok: false, msg: '未提供用户名' };
    }
    const usersCol = db.collection('users');
    const userRes = await usersCol.where({ username }).limit(1).get();
    const caller = userRes.data && userRes.data[0];
    if (!caller) {
      return { ok: false, msg: '用户不存在' };
    }
    if (caller.role !== 'admin') {
      return { ok: false, msg: '无权限：仅管理员可管理分享' };
    }

    const shareCol = db.collection('share_config');
    const cur = await shareCol.doc('main').get().catch(() => null);
    const curData = (cur && cur.data) || {};

    if (action === 'enable') {
      const token = genToken();
      await shareCol.doc('main').set({
        data: { enabled: true, token, updatedAt: Date.now() }
      });
      return { ok: true, token, msg: '分享已开启' };
    }

    if (action === 'disable') {
      await shareCol.doc('main').set({
        data: { enabled: false, token: '', updatedAt: Date.now() }
      });
      return { ok: true, msg: '分享已关闭' };
    }

    // 查询状态
    return { ok: true, enabled: !!curData.enabled, token: curData.token || '' };
  } catch (e) {
    console.error('[share_manage]', e);
    return { ok: false, msg: '操作失败：' + (e.message || '未知错误') };
  }
};
