// 云函数：register —— 用户名密码注册
// 第一个注册的用户自动成为管理员，后续为普通用户
const cloud = require('@cloudbase/node-sdk');
const app = cloud.init({ env: cloud.SYMBOL_CURRENT_ENV });
const db = app.database();
const crypto = require('crypto');

const SALT = 'media_workbench_2026_salt';

function hashPassword(pwd) {
  return crypto.createHash('sha256').update(pwd + SALT).digest('hex');
}

exports.main = async (event) => {
  const { username, password } = event || {};
  if (!username || !password) {
    return { ok: false, msg: '用户名和密码不能为空' };
  }
  if (username.length < 2 || password.length < 6) {
    return { ok: false, msg: '用户名至少 2 位，密码至少 6 位' };
  }

  try {
    const usersCol = db.collection('users');

    // 检查用户名是否已存在
    const exist = await usersCol.where({ username }).limit(1).get();
    if (exist.data && exist.data.length > 0) {
      return { ok: false, msg: '用户名已被占用' };
    }

    // 第一个用户为管理员
    const countRes = await usersCol.count();
    const role = (countRes.total === 0) ? 'admin' : 'user';

    // 写入用户
    await usersCol.add({
      data: {
        username,
        password: hashPassword(password),
        role,
        createdAt: Date.now()
      }
    });

    const tip = role === 'admin' ? '（您已成为首位管理员）' : '';
    return { ok: true, msg: '注册成功' + tip, role };
  } catch (e) {
    console.error('[register]', e);
    return { ok: false, msg: '注册失败：' + (e.message || '未知错误') };
  }
};
