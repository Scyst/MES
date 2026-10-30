const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  if (process.env.TEST_USER && process.env.TEST_PASS) {
    await page.authenticate({ username: process.env.TEST_USER, password: process.env.TEST_PASS });
  }
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => {
    console.log('REQUEST FAILED:', request.url(), request.failure().errorText);
  });
  page.on('response', response => {
    if(!response.ok()) {
      console.log('BAD RESPONSE:', response.url(), response.status());
    }
  });

  try {
    await page.goto('https://oem.sncformer.com/iot-toolbox/sandbox-b9/Toolbox/', { waitUntil: 'networkidle0', timeout: 15000 });
    console.log('Page loaded successfully');
    await page.screenshot({ path: 'test_screenshot.png' });
    console.log('Screenshot saved to test_screenshot.png');
  } catch (err) {
    console.log('Error navigating:', err);
  }
  
  await browser.close();
})();
