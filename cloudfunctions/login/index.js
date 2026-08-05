// 云函数：login —— 账号密码登录，签发自定义登录 ticket
// 依赖：cloudbase-admin SDK（Node 环境自动注入）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const crypto = require('crypto');

// 密码哈希（加盐 SHA-256）
function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(salt + password).digest('hex');
}

exports.main = async (event) => {
  const { username, password } = event || {};
  if (!username || !password) return { ok: false, msg: '请输入账号和密码' };

  try {
    const res = await db.collection('users').where({ username }).get();
    const user = res.data && res.data[0];
    if (!user) return { ok: false, msg: '账号不存在，请先注册' };

    const salt = user.salt || 'default_salt';
    if (hashPassword(password, salt) !== user.passwordHash) {
      return { ok: false, msg: '密码错误' };
    }

    // 签发自定义登录 ticket（CloudBase 官方方法）
    const auth = cloud.auth();
    const ticket = auth.createTicket(user._id, {
      refresh: 60 * 60 * 24 * 30 // 30 天有效
    });
    return { ok: true, ticket, msg: '登录成功' };
  } catch (e) {
    console.error('[login]', e);
    return { ok: false, msg: '登录服务异常，请稍后重试' };
  }
};
