// 云函数：share_get —— 访客通过分享令牌拉取数据（只读）
const cloud = require('@cloudbase/node-sdk');
const app = cloud.init({ env: cloud.SYMBOL_CURRENT_ENV });
const db = app.database();

exports.main = async (event) => {
  const { token } = event || {};
  if (!token) {
    return { ok: false, msg: '缺少 token' };
  }

  try {
    // 校验分享令牌
    const cfgCol = db.collection('share_config');
    const cfg = await cfgCol.doc('main').get().catch(() => null);
    if (!cfg || !cfg.data || !cfg.data.enabled || cfg.data.token !== token) {
      return { ok: false, msg: '分享链接无效或已关闭' };
    }

    // 拉取数据
    const syncRes = await db.collection('workbench_sync').doc('main').get().catch(() => null);
    const d = (syncRes && syncRes.data && syncRes.data.data) || {};

    return {
      ok: true,
      data: {
        contents: Array.isArray(d.contents) ? d.contents : [],
        tasks: Array.isArray(d.tasks) ? d.tasks : [],
        stats: Array.isArray(d.stats) ? d.stats : [],
        aiStats: Array.isArray(d.aiStats) ? d.aiStats : [],
        reviews: Array.isArray(d.reviews) ? d.reviews : []
      }
    };
  } catch (e) {
    console.error('[share_get]', e);
    return { ok: false, msg: '拉取失败：' + (e.message || '未知错误') };
  }
};
