// 云函数：share_manage —— 主账号管理分享令牌（启用/关闭/查询）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const crypto = require('crypto');

function genToken() {
  return crypto.randomBytes(16).toString('hex'); // 32 位随机令牌
}

exports.main = async (event) => {
  const { action } = event || {};
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    // 管理员校验：只有 users 集合中的管理员可操作
    const adminRes = await db.collection('users').where({ role: 'admin' }).limit(1).get();
    const admin = adminRes.data && adminRes.data[0];
    if (!admin || admin._id !== openid) {
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
    return { ok: false, msg: '操作失败，请稍后重试' };
  }
};
