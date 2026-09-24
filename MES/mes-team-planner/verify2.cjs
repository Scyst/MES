const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('https://oem.sncformer.com/iot-toolbox/sandbox-b9/MES/MES/auth/login_form.php', { waitUntil: 'networkidle2' });
  
  const usernameInput = await page.$('input[name="username"]') || await page.$('input[type="text"]');
  if (usernameInput) await usernameInput.type('verymaron01');
  const passwordInput = await page.$('input[name="password"]') || await page.$('input[type="password"]');
  if (passwordInput) await passwordInput.type('numthong01');
  const submitBtn = await page.$('button[type="submit"]') || await page.$('input[type="submit"]') || await page.$('button');
  if (submitBtn) {
     await Promise.all([ submitBtn.click(), page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}) ]);
  }
  
  await page.goto('https://oem.sncformer.com/iot-toolbox/sandbox-b9/Toolbox/planner/index.html', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 4000));
  
  const innerHTML = await page.evaluate(() => document.body.innerHTML);
  const fs = require('fs');
  fs.writeFileSync('page_dump2.html', innerHTML);
  await browser.close();
})();
