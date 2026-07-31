const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('CONSOLE ERROR:', msg.text());
    }
  });

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  
  // Click on "Engineers" space tab
  try {
    console.log('Clicking on Engineers space...');
    const engineerBtn = await page.$x("//button[contains(., 'Engineers')]");
    if (engineerBtn.length > 0) {
      await engineerBtn[0].click();
      await page.waitForTimeout(1000); // Wait for crash
    } else {
      console.log('Engineers button not found');
    }
  } catch (e) {
    console.error('Failed to click:', e);
  }

  await browser.close();
})();
