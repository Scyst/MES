import { chromium } from 'playwright-core';

async function testConnection() {
  console.log('Connecting to existing Chrome on port 9222...');
  let browser;
  try {
    browser = await chromium.connectOverCDP('http://localhost:9222');
    console.log('Connected successfully!');
    
    const context = browser.contexts()[0];
    const pages = context.pages();
    const activePage = pages[pages.length - 1];
    
    if (activePage) {
      console.log(`Active Page: "${await activePage.title()}"`);
      console.log(`URL: ${activePage.url()}`);
      
      // Test ariaSnapshot
      if (typeof activePage.locator(':root').ariaSnapshot === 'function') {
        const aria = await activePage.locator(':root').ariaSnapshot();
        console.log('Aria Snapshot sample (first 300 chars):');
        console.log(aria.substring(0, 300) + '...');
      } else {
        console.log('ariaSnapshot is not available on this version, using title/url');
      }
    }
  } catch (err) {
    console.error('Error connecting to Chrome:', err);
  } finally {
    if (browser) {
      await browser.close();
      console.log('Disconnected safely.');
    }
  }
}

testConnection();
