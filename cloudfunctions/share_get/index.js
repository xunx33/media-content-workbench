// 云函数：share_get —— 访客只读拉取数据（校验分享令牌）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event) => {
  const { token } = event || {};
  if (!token) return { ok: false, msg: '缺少分享令牌' };

  try {
    // 校验令牌
    const cfg = await db.collection('share_config').doc('main').get().catch(() => null);
    const d = (cfg && cfg.data) || {};
    if (!d.enabled || !d.token || d.token !== token) {
      return { ok: false, msg: '分享链接无效或已关闭' };
    }

    // 读取数据（只读）
    const sync = await db.collection('workbench_sync').doc('main').get().catch(() => null);
    const data = (sync && sync.data && sync.data.data) || {};
    return {
      ok: true,
      data: {
        contents: data.contents || [],
        tasks: data.tasks || [],
        stats: data.stats || [],
        aiStats: data.aiStats || [],
        reviews: data.reviews || []
      }
    };
  } catch (e) {
    console.error('[share_get]', e);
    return { ok: false, msg: '读取失败' };
  }
};
