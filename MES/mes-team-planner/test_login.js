const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.goto('https://oem.sncformer.com/iot-toolbox/sandbox-b9/MES/MES/auth/login_form.php', { waitUntil: 'networkidle2' });
  
  // Fill login form
  await page.type('input[name="username"]', 'verymaron01');
  await page.type('input[name="password"]', 'numthong01');
  
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2' })
  ]);
  
  // Go to planner
  await page.goto('https://oem.sncformer.com/iot-toolbox/sandbox-b9/Toolbox/planner/index.html', { waitUntil: 'networkidle2' });
  
  await page.waitForTimeout(3000); // Wait for API calls
  
  // Dump state
  const html = await page.content();
  const fs = require('fs');
  fs.writeFileSync('page_dump.html', html);
  
  console.log("DUMP SAVED");
  await browser.close();
})();
