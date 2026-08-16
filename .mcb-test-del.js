const { chromium } = require('C:/Users/10739/.workbuddy/scripts/node_modules/playwright-core');
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Users/10739/AppData/Local/ms-playwright/chromium-1161/chrome-win/chrome.exe'
  });
  const page = await browser.newPage({ viewport: { width: 1100, height: 950 } });
  await page.goto('http://localhost:3179/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.classList.remove('active');
    const okBtn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === '确认');
    if (okBtn) okBtn.click();
  });
  await page.waitForTimeout(500);

  const results = [];
  const check = (name, ok, extra='') => { results.push({name, ok}); console.log(`${ok?'✅':'❌'} ${name}${extra?' | '+extra:''}`); };

  // ===== 删除前：数据复盘条数 =====
  await page.click('.nav-tab[data-tab="data"]');
  await page.waitForTimeout(400);
  const before = await page.evaluate(() => ({
    statsCount: stats.length,
    statTotal: document.querySelector('.stat-card .stat-value')?.textContent.trim()
  }));
  console.log('删除前 stats=', before.statsCount, '总发布=', before.statTotal);

  // ===== 删除 contentId 关联的内容（抖音 健身晨练 id=1）=====
  await page.evaluate(() => { switchWorkspace('video'); });
  await page.waitForTimeout(300);
  await page.click('.nav-tab[data-tab="content"]');
  await page.waitForTimeout(400);
  await page.evaluate(() => { deleteContent(1); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { document.getElementById('confirmOkBtn').click(); });
  await page.waitForTimeout(500);

  const after1 = await page.evaluate(() => ({
    statsCount: stats.length,
    contentsCount: contents.length,
    orphanCount: stats.filter(s => findLinkedTitle(s, 'video') === null).length
  }));
  check('删除 contentId 关联内容后 stats 同步清除(2→1)', after1.statsCount === 1, `stats=${after1.statsCount}`);
  check('未关联记录=0', after1.orphanCount === 0, `orphan=${after1.orphanCount}`);

  // ===== 删除 platform+date 关联的内容（快手 宠物日常 id=2，无 contentId 数据）=====
  await page.evaluate(() => { deleteContent(2); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { document.getElementById('confirmOkBtn').click(); });
  await page.waitForTimeout(500);

  const after2 = await page.evaluate(() => ({
    statsCount: stats.length,
    contentsCount: contents.length,
    orphanCount: stats.filter(s => findLinkedTitle(s, 'video') === null).length
  }));
  check('删除 platform+date 关联内容后 stats 也清除(1→0)', after2.statsCount === 0, `stats=${after2.statsCount}`);
  check('未关联记录=0', after2.orphanCount === 0, `orphan=${after2.orphanCount}`);

  // ===== 数据复盘页条数应归零 =====
  await page.click('.nav-tab[data-tab="data"]');
  await page.waitForTimeout(400);
  const after3 = await page.evaluate(() => document.querySelector('.stat-card .stat-value')?.textContent.trim());
  check('数据复盘总发布归零', after3 === '0', after3);

  await browser.close();

  const failed = results.filter(r => !r.ok);
  console.log(`\n===== 汇总: ${results.length - failed.length}/${results.length} 通过 =====`);
  if (failed.length) failed.forEach(f => console.log('  FAIL:', f.name));
})();
