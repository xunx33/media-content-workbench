// 云函数：register —— 首次注册账号（第一个注册者成为管理员）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const crypto = require('crypto');

function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(salt + password).digest('hex');
}

exports.main = async (event) => {
  const { username, password } = event || {};
  if (!username || !password) return { ok: false, msg: '请输入账号和密码' };
  if (password.length < 6) return { ok: false, msg: '密码至少 6 位' };

  try {
    // 已有账号则禁止重复注册（个人应用：第一个账号即管理员）
    const exist = await db.collection('users').limit(1).get();
    if (exist.data && exist.data.length > 0) {
      return { ok: false, msg: '已存在管理员账号，如需新账号请联系管理员' };
    }

    const salt = crypto.randomBytes(8).toString('hex');
    await db.collection('users').add({
      data: {
        username: username.trim(),
        passwordHash: hashPassword(password, salt),
        salt,
        role: 'admin',
        createdAt: Date.now()
      }
    });
    return { ok: true, msg: '注册成功，请登录' };
  } catch (e) {
    console.error('[register]', e);
    return { ok: false, msg: '注册失败，请稍后重试' };
  }
};
