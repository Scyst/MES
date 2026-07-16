import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  
  try {
    const engineerBtn = await page.$x("//button[contains(., 'Engineers')]");
    if (engineerBtn.length > 0) {
      await engineerBtn[0].click();
      await page.waitForTimeout(500); 
      // Click details
      const details = await page.$('details');
      if (details) await details.click();
      await page.waitForTimeout(100);
      
      const text = await page.evaluate(() => document.body.innerText);
      console.log('--- ERROR LOG ---');
      console.log(text);
    }
  } catch (e) {
    console.error(e);
  }

  await browser.close();
})();
