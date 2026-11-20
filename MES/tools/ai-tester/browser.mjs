import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CDP_URL = process.env.CHROME_CDP_URL || 'http://localhost:9222';

/**
 * List all open tabs in Chrome with index, title, and URL
 */
export async function listAllTabs(browser) {
  const contexts = browser.contexts();
  if (!contexts.length) return [];
  const pages = contexts[0].pages();
  const tabs = [];

  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const url = p.url();
    // Filter out internal background pages if not needed, but keep tabs visible
    const isInternal = url.startsWith('chrome-extension://') || url.startsWith('chrome://');
    let title = 'Untitled';
    try {
      title = await p.title();
    } catch {
      title = 'Loading...';
    }

    tabs.push({
      index: i,
      title: title || '(No Title)',
      url: url,
      isInternal,
      page: p
    });
  }
  return tabs;
}

/**
 * Connect to Chrome with intelligent tab targeting (by index or keyword)
 * Ensures parallel multitasking without touching the wrong tab!
 */
export async function connectToChrome(options = {}) {
  try {
    const browser = await chromium.connectOverCDP(CDP_URL);
    const tabs = await listAllTabs(browser);

    if (!tabs.length) {
      throw new Error('No open pages/tabs found in Chrome');
    }

    let selectedTab = null;

    // 1. Target by specific tab index
    if (typeof options.tabIndex === 'number' && tabs[options.tabIndex]) {
      selectedTab = tabs[options.tabIndex];
    }
    // 2. Target by keyword match in title or URL (case-insensitive)
    else if (options.target) {
      const keyword = String(options.target).toLowerCase();
      selectedTab = tabs.find(
        t => !t.isInternal && (t.title.toLowerCase().includes(keyword) || t.url.toLowerCase().includes(keyword))
      );
      if (!selectedTab) {
        // Fallback: search even in internal if specified
        selectedTab = tabs.find(
          t => t.title.toLowerCase().includes(keyword) || t.url.toLowerCase().includes(keyword)
        );
      }
      if (!selectedTab) {
        const available = tabs.filter(t => !t.isInternal).map(t => `[${t.index}] "${t.title}" (${t.url})`).join('\n');
        throw new Error(`Tab matching target "${options.target}" not found.\nAvailable tabs:\n${available}`);
      }
    }
    // 3. Default: Pick the latest non-internal tab
    else {
      for (let i = tabs.length - 1; i >= 0; i--) {
        if (!tabs[i].isInternal) {
          selectedTab = tabs[i];
          break;
        }
      }
      if (!selectedTab) {
        selectedTab = tabs[tabs.length - 1];
      }
    }

    return {
      browser,
      page: selectedTab.page,
      tabInfo: {
        index: selectedTab.index,
        title: selectedTab.title,
        url: selectedTab.url
      },
      allTabs: tabs
    };
  } catch (err) {
    if (err.message && err.message.includes('ECONNREFUSED')) {
      throw new Error(
        `Cannot connect to Chrome at ${CDP_URL}. Make sure Chrome was started with --remote-debugging-port=9222`
      );
    }
    throw err;
  }
}

export async function capturePageContext(page, options = {}) {
  const reportsDir = path.join(__dirname, 'reports');
  const screensDir = path.join(reportsDir, 'screenshots');
  if (!fs.existsSync(screensDir)) {
    fs.mkdirSync(screensDir, { recursive: true });
  }

  const title = await page.title();
  const url = page.url();
  
  // ARIA Snapshot for high-accuracy semantic element mapping
  let ariaSnapshot = '';
  try {
    ariaSnapshot = await page.locator(':root').ariaSnapshot();
  } catch (e) {
    ariaSnapshot = `Aria snapshot unavailable: ${e.message}`;
  }

  // Visual Screenshot
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const screenshotFilename = `snap-${timestamp}.png`;
  const screenshotPath = path.join(screensDir, screenshotFilename);
  await page.screenshot({ path: screenshotPath, fullPage: false });

  return {
    title,
    url,
    ariaSnapshot,
    screenshotPath: path.resolve(screenshotPath),
    timestamp: new Date().toISOString()
  };
}

/**
 * Capture Responsive Matrix: 3 Viewports (Mobile, Tablet, Factory Terminal)
 */
export async function captureResponsiveMatrix(page) {
  const reportsDir = path.join(__dirname, 'reports');
  const matrixDir = path.join(reportsDir, 'matrix');
  if (!fs.existsSync(matrixDir)) {
    fs.mkdirSync(matrixDir, { recursive: true });
  }

  const originalViewport = page.viewportSize() || { width: 1280, height: 720 };
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  const viewports = [
    { name: 'mobile', width: 375, height: 667, desc: 'Smartphone (375x667)' },
    { name: 'tablet', width: 768, height: 1024, desc: 'Factory Tablet (768x1024)' },
    { name: 'factory_terminal', width: 1920, height: 1080, desc: 'Industrial Touch Display (1920x1080)' }
  ];

  const results = [];
  try {
    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(600); // Allow responsive redraw
      const filename = `matrix-${vp.name}-${timestamp}.png`;
      const filePath = path.join(matrixDir, filename);
      await page.screenshot({ path: filePath, fullPage: false });
      results.push({
        name: vp.name,
        desc: vp.desc,
        width: vp.width,
        height: vp.height,
        path: path.resolve(filePath)
      });
    }
  } finally {
    // Restore original viewport
    await page.setViewportSize(originalViewport);
  }

  return results;
}

/**
 * Emulate Industrial Barcode Scanner (Keystroke wedge + suffix)
 */
export async function simulateBarcodeScan(page, { code, target, suffix = 'Enter' }) {
  if (target) {
    let locator;
    if (target.startsWith('#') || target.startsWith('.') || target.includes('>')) {
      locator = page.locator(target).first();
    } else {
      locator = page
        .getByPlaceholder(target)
        .or(page.getByLabel(target))
        .or(page.getByRole('textbox', { name: target }))
        .first();
    }
    await locator.waitFor({ state: 'visible', timeout: 3000 });
    await locator.focus();
    await locator.fill(''); // Clear previous text
  }

  // Type characters with rapid scanner-like intervals (~15ms)
  await page.keyboard.type(code, { delay: 15 });

  // Send scanner suffix (Enter or Tab)
  if (suffix) {
    await page.keyboard.press(suffix);
  }

  return {
    code,
    suffix,
    target: target || 'active_focus'
  };
}

/**
 * Emulate Network Conditions via CDP (Offline, Slow 3G, Fast 3G, Online)
 */
export async function setNetworkConditions(page, mode = 'online') {
  const cdp = await page.context().newCDPSession(page);
  const normalized = mode.toLowerCase();

  const presets = {
    offline: { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 },
    slow3g: { offline: false, latency: 400, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8 },
    fast3g: { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 },
    online: { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }
  };

  const condition = presets[normalized] || presets.online;
  await cdp.send('Network.emulateNetworkConditions', condition);

  return {
    mode: normalized,
    applied: condition
  };
}

export async function executeStep(page, step) {
  const result = {
    step,
    status: 'PENDING',
    detail: '',
    error: null
  };

  try {
    const action = (step.action || '').toLowerCase();
    const target = step.target || '';
    const value = step.value ?? '';

    switch (action) {
      case 'click': {
        let locator;
        if (target.startsWith('#') || target.startsWith('.') || target.includes('>')) {
          locator = page.locator(target).first();
        } else {
          locator = page
            .getByRole('button', { name: target })
            .or(page.getByRole('link', { name: target }))
            .or(page.getByRole('tab', { name: target }))
            .or(page.getByRole('menuitem', { name: target }))
            .or(page.getByText(target, { exact: false }))
            .first();
        }

        await locator.waitFor({ state: 'visible', timeout: 5000 });
        await locator.click();
        result.status = 'PASS';
        result.detail = `Clicked on "${target}" successfully`;
        break;
      }

      case 'fill':
      case 'type': {
        let locator;
        if (target.startsWith('#') || target.startsWith('.') || target.includes('>')) {
          locator = page.locator(target).first();
        } else {
          locator = page
            .getByPlaceholder(target)
            .or(page.getByLabel(target))
            .or(page.getByRole('textbox', { name: target }))
            .first();
        }

        await locator.waitFor({ state: 'visible', timeout: 5000 });
        await locator.fill(String(value));
        result.status = 'PASS';
        result.detail = `Filled "${target}" with "${value}"`;
        break;
      }

      case 'barcode': {
        const code = String(value || target);
        const suffix = step.suffix || 'Enter';
        await simulateBarcodeScan(page, { code, target: step.input || null, suffix });
        result.status = 'PASS';
        result.detail = `Simulated Barcode Scan: "${code}" [Suffix: ${suffix}]`;
        break;
      }

      case 'network': {
        const mode = String(value || target || 'online').toLowerCase();
        await setNetworkConditions(page, mode);
        result.status = 'PASS';
        result.detail = `Emulated Network condition: ${mode.toUpperCase()}`;
        break;
      }

      case 'matrix':
      case 'responsive_matrix': {
        const matrixResults = await captureResponsiveMatrix(page);
        result.status = 'PASS';
        result.detail = `Captured Responsive Matrix (${matrixResults.map(m => m.name).join(', ')})`;
        result.matrix = matrixResults;
        break;
      }

      case 'press': {
        await page.keyboard.press(target || value || 'Enter');
        result.status = 'PASS';
        result.detail = `Pressed key: ${target || value}`;
        break;
      }

      case 'wait': {
        const ms = parseInt(value || target, 10) || 1000;
        await page.waitForTimeout(ms);
        result.status = 'PASS';
        result.detail = `Waited for ${ms}ms`;
        break;
      }

      case 'assert':
      case 'verify': {
        const expected = step.expected !== false;
        let isMatch = false;

        try {
          if (target.startsWith('#') || target.startsWith('.') || target.includes('>')) {
            isMatch = await page.locator(target).first().isVisible({ timeout: 2000 });
          } else {
            const loc = page
              .getByRole('button', { name: target })
              .or(page.getByRole('link', { name: target }))
              .or(page.getByRole('heading', { name: target }))
              .or(page.getByLabel(target))
              .or(page.getByText(target, { exact: false }))
              .first();
            isMatch = await loc.isVisible({ timeout: 2000 });
          }
        } catch {
          isMatch = false;
        }

        if (isMatch === expected) {
          result.status = 'PASS';
          result.detail = `Assertion PASSED: "${target}" is ${expected ? 'visible' : 'hidden'}`;
        } else {
          result.status = 'FAIL';
          result.detail = `Assertion FAILED: Expected "${target}" to be ${expected ? 'visible' : 'hidden'}, but got ${isMatch ? 'visible' : 'hidden'}`;
        }
        break;
      }

      case 'evaluate': {
        const evalResult = await page.evaluate(target || value);
        result.status = 'PASS';
        result.detail = `JS Evaluated: ${JSON.stringify(evalResult)}`;
        break;
      }

      default:
        result.status = 'ERROR';
        result.detail = `Unknown action: ${action}`;
    }
  } catch (err) {
    result.status = 'FAIL';
    result.error = err.message;
    result.detail = `Execution error: ${err.message}`;
  }

  return result;
}
