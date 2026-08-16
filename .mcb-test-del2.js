const { chromium } = require('C:/Users/10739/.workbuddy/scripts/node_modules/playwright-core');
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Users/10739/AppData/Local/ms-playwright/chromium-1161/chrome-win/chrome.exe'
  });
  const page = await browser.newPage({ viewport: { width: 1100, height: 950 } });
  await page.goto('http://localhost:3179/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  // 处理示例数据弹窗（点确认重置为最新示例）
  await page.evaluate(() => {
    const okBtn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === '确认');
    if (okBtn) okBtn.click();
  });
  await page.waitForTimeout(900);

  const before = await page.evaluate(() => ({ stats: stats.length, contents: contents.length }));
  console.log('重置后 stats=', before.stats, 'contents=', before.contents);

  // 删除内容 id=3（小红书 08-14，stats 有 cid=3）
  await page.evaluate(() => { deleteContent(3); });
  await page.waitForTimeout(300);
  const btnExists = await page.evaluate(() => !!document.getElementById('confirmOkBtn'));
  console.log('确认按钮存在:', btnExists);
  await page.evaluate(() => { document.getElementById('confirmOkBtn').click(); });
  await page.waitForTimeout(700);

  const after = await page.evaluate(() => {
    const orphans = stats.filter(s => findLinkedTitle(s, 'video') === null);
    return { stats: stats.length, contents: contents.length, orphans: orphans.length, orphanIds: orphans.map(o => o.id) };
  });
  console.log('删除后 stats=', after.stats, 'contents=', after.contents, '未关联=', after.orphans, after.orphanIds);
  console.log(`\n预期: stats ${before.stats}→${before.stats-1}, contents ${before.contents}→${before.contents-1}, 未关联=0`);
  const pass = after.stats === before.stats - 1 && after.contents === before.contents - 1 && after.orphans === 0;
  console.log(pass ? '✅ PASS 级联删除正确' : '❌ FAIL');
  await browser.close();
})();
