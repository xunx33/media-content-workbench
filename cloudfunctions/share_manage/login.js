// 云函数：login —— 用户名密码登录校验
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

  try {
    const usersCol = db.collection('users');
    const res = await usersCol.where({ username }).limit(1).get();
    const user = res.data && res.data[0];
    if (!user) {
      return { ok: false, msg: '用户名或密码错误' };
    }

    const hash = hashPassword(password);
    if (user.password !== hash) {
      return { ok: false, msg: '用户名或密码错误' };
    }

    return {
      ok: true,
      msg: '登录成功',
      user: { username: user.username, role: user.role }
    };
  } catch (e) {
    console.error('[login]', e);
    return { ok: false, msg: '登录失败：' + (e.message || '未知错误') };
  }
};
