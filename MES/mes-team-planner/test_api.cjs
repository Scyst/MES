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
  
  const users = await page.evaluate(async () => {
    const res = await fetch('/iot-toolbox/sandbox-b9/Toolbox/planner/api/users.php');
    return await res.text(); // just return raw text
  });
  console.log("USERS:", users.substring(0, 500));
  
  await browser.close();
})();
