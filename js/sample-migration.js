function checkSampleDataVersion() {
  // 判断依据：示例数据特征（内容登记不足 10 条 或 stats 无 contentId）
  const hasOldSample = contents.length < 10 && contents.length > 0 && stats.length > 0;
  const statsMissingContentId = stats.length > 0 && stats.every(s => s.contentId === undefined);
  const versionKey = STORAGE_KEY + 'sample_v';
  const currentVersion = '7';
  if (localStorage.getItem(versionKey) === currentVersion) return;
  if (hasOldSample || statsMissingContentId) {
    showConfirm({
      title: '检测到旧版示例数据',
      desc: '示例数据已更新为完整版（最近3天 + 4平台 + 账号总数据）。是否重置为最新示例？<br><br><span style="color:var(--text3);">如果你的内容是真实数据，请选择「取消」；只有测试/示例数据需要重置。</span>',
      danger: false,
      onOk: () => {
        fillSampleDataSilent();
        localStorage.setItem(versionKey, currentVersion);
      }
    });
  } else {
    localStorage.setItem(versionKey, currentVersion);
  }
}

// ===== 示例数据构造（最近 3 天）=====
// 覆盖：单条登记（contents/stats）+ 账号总数据（accountStats），日期跨 今天/昨天/前天
function buildSampleData(today) {
  const dayN = (n) => { const x = new Date(Date.now() - n * 86400000); return x.getFullYear() + '-' + String(x.getMonth()+1).padStart(2,'0') + '-' + String(x.getDate()).padStart(2,'0'); };
  const D0 = today, D1 = dayN(1), D2 = dayN(2);
  const dates = [D2, D1, D0]; // 下标 0=前天 1=昨天 2=今天
  const DAY_LABEL = ['前天', '昨天', '今天'];
  const platformOrder = VIDEO_PLATFORMS; // 4 视频平台

  // 每天 4 平台各 1 条内容标题（顺序与 platformOrder 一致）
  const titleSets = [
    ['健身晨练打卡vlog', '宠物日常：橘猫的一天', '城市徒步路线分享', '节气养生小课堂'],
    ['夏日清凉穿搭挑战', '农村生活记录·收稻谷', '秋冬护肤指南·干皮救星', '父母必看：儿童安全座椅选购'],
    ['新品开箱vlog：夏日防晒好物推荐', '街头美食探店EP38', '618购物清单｜闭眼入的5件数码好物', '职场高效办公技巧合集'],
  ];

  // --- 单条登记：contents ---
  let cid = 1;
  const contents = [];
  dates.forEach((date, di) => {
    platformOrder.forEach((p, pi) => {
      contents.push({ id: cid, title: titleSets[di][pi], platform: p, topic: '示例选题 · ' + DAY_LABEL[di], url: 'https://example.com/' + p + '/' + cid, createdAt: date });
      cid++;
    });
  });
  // 某天某平台的内容 id（di=0/1/2 前天/昨天/今天，pi=平台下标 0..3）
  const contentIdOf = (di, pi) => di * 4 + pi + 1;

  // --- 单条视频数据 stats（每平台每天 1 条；小红书 avgWatch、视频号 recommend）---
  const vBase = {
    '抖音':   { views:[7200, 9800, 12500], likes:[520, 700, 890], comments:[130, 180, 230], fav:[90, 120, 156], shares:[70, 95, 120], comp:[28.1, 30.2, 32.5], avgWatch:[12.5, 14.2, 16.8], recommend:[null,null,null], followers:[16, 25, 35] },
    '快手':   { views:[5400, 7600, 9800], likes:[410, 550, 670], comments:[95, 125, 156], fav:[55, 75, 98], shares:[38, 50, 67], comp:[25.4, 26.8, 28.1], avgWatch:[null,null,null], recommend:[null,null,null], followers:[12, 16, 21] },
    '小红书': { views:[4800, 6500, 8200], likes:[680, 920, 1200], comments:[90, 130, 175], fav:[180, 260, 342], shares:[45, 65, 89], comp:[null,null,null], avgWatch:[15.2, 16.8, 18.5], recommend:[null,null,null], followers:[30, 44, 58] },
    '视频号': { views:[3100, 4300, 5600], likes:[210, 275, 340], comments:[52, 70, 89], fav:[0,0,0], shares:[26, 35, 45], comp:[21.8, 23.1, 24.3], avgWatch:[8.6, 9.4, 11.2], recommend:[38, 45, 52], followers:[7, 9, 12] },
  };
  const stats = [];
  VIDEO_PLATFORMS.forEach((p, vi) => {
    const b = vBase[p];
    dates.forEach((date, di) => {
      stats.push({
        id: 100 + vi * 10 + di, platform: p, date: date,
        contentId: contentIdOf(di, vi), title: titleSets[di][vi],
        views: b.views[di], completionRate: b.comp[di], avgWatch: b.avgWatch[di],
        likes: b.likes[di], comments: b.comments[di], favorites: b.fav[di],
        shares: b.shares[di], recommend: b.recommend[di], followers: b.followers[di],
      });
    });
  });

  // --- 账号总数据 accountStats（累计值随日期递增，3 天各一条）---
  const accBase = {
    '抖音':   { posts:[110,119,128], followers:[47000,49800,52600], views:[11000000,11900000,12800000], likes:[360000,386000,412000], comments:[72000,79000,86000], shares:[43000,47000,53000] },
    '快手':   { posts:[84,90,96], followers:[27800,29800,31800], views:[6300000,6900000,7600000], likes:[198000,214000,231000], comments:[34000,38000,42000], shares:[24000,26000,28600] },
    '小红书': { posts:[62,68,74], followers:[16800,18600,20500], views:[3500000,3900000,4300000], likes:[138000,152000,168000], comments:[15000,18000,21000], shares:[15000,17000,19600] },
    '视频号': { posts:[42,47,52], followers:[7800,8800,9800], views:[1600000,1800000,2100000], likes:[56000,64000,74000], comments:[6800,8200,9800], shares:[6400,7500,8800] },
  };
  let aid = 1;
  const accountStats = [];
  const ACC_REF = { '抖音': 501, '快手': 502, '小红书': 503, '视频号': 504 }; // 关联下方账号ID示例记录
  VIDEO_PLATFORMS.forEach((p) => {
    const b = accBase[p];
    dates.forEach((date, di) => {
      accountStats.push({ id: aid++, date: date, recordedAt: date + ' 10:00', platform: p, accountRef: ACC_REF[p], posts: b.posts[di], followers: b.followers[di], views: b.views[di], likes: b.likes[di], comments: b.comments[di], shares: b.shares[di] });
    });
  });

  // --- 视频平台账号ID（静态信息）---
  const accountIds = [
    { id: 501, platform: '抖音', accountId: 'dy_123456789', note: '主账号' },
    { id: 502, platform: '快手', accountId: 'kuaishou_98765', note: '主账号' },
    { id: 503, platform: '小红书', accountId: 'xhs_556677', note: '主账号' },
    { id: 504, platform: '视频号', accountId: 'wxid_abcd1234', note: '主账号' },
  ];

  // --- 复盘记录 ---
  const reviews = [
    { id: 302, type: 'video', period: 'week', date: D0, highlights: '抖音防晒选题播放量破万，粉丝量稳步上升', problems: '小红书完播率偏低', plans: '尝试竖版封面+前3秒钩子' },
  ];

  return { contents, stats, reviews, accountStats, accountIds };
}

// 静默重置示例（不弹确认框，供版本迁移用）
async function fillSampleDataSilent() {
  const s = buildSampleData(getToday());
  contents = s.contents; stats = s.stats; reviews = s.reviews; accountStats = s.accountStats; accountIds = s.accountIds;
  await saveDataBatch([
    { key: 'contents', val: contents },
    { key: 'stats', val: stats },
    { key: 'reviews', val: reviews },
    { key: 'accountStats', val: accountStats },
    { key: 'accountIds', val: accountIds }
  ]);
  render(); showToast('已重置为最新示例数据');
}
