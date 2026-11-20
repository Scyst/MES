import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  connectToChrome,
  listAllTabs,
  capturePageContext,
  captureResponsiveMatrix,
  simulateBarcodeScan,
  setNetworkConditions,
  executeStep
} from './browser.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseCliArgs(args) {
  const options = {
    command: args[0] || 'inspect',
    params: []
  };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--target=')) {
      options.target = arg.split('=')[1];
    } else if (arg.startsWith('--tab=')) {
      options.tabIndex = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--suffix=')) {
      options.suffix = arg.split('=')[1];
    } else {
      options.params.push(arg);
    }
  }
  return options;
}

function generateHtmlReport(testName, initialContext, afterContext, steps, summary) {
  const reportsDir = path.join(__dirname, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const initialImgRel = initialContext.screenshotPath 
    ? path.relative(reportsDir, initialContext.screenshotPath).replace(/\\/g, '/') 
    : '';
  const afterImgRel = afterContext.screenshotPath 
    ? path.relative(reportsDir, afterContext.screenshotPath).replace(/\\/g, '/') 
    : '';

  const statusColor = summary.failed > 0 ? '#ef4444' : '#10b981';
  const statusText = summary.failed > 0 ? 'FAILED' : 'PASSED';

  const stepsHtml = steps.map((s, idx) => `
    <tr style="border-bottom: 1px solid #334155;">
      <td style="padding: 10px; font-weight: 600; color: #94a3b8;">#${idx + 1}</td>
      <td style="padding: 10px;"><span style="background: #1e293b; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-family: monospace; color: #38bdf8;">${s.step.action.toUpperCase()}</span></td>
      <td style="padding: 10px; font-weight: 500;">${s.step.target || '-'}</td>
      <td style="padding: 10px; color: #cbd5e1; font-family: monospace;">${s.step.value || '-'}</td>
      <td style="padding: 10px;">
        <span style="background: ${s.status === 'PASS' ? '#065f46' : '#7f1d1d'}; color: ${s.status === 'PASS' ? '#34d399' : '#f87171'}; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: bold;">
          ${s.status}
        </span>
      </td>
      <td style="padding: 10px; color: #94a3b8; font-size: 13px;">${s.detail}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>MES AI Test Report - ${testName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
    .card { background: #1e293b; border-radius: 12px; border: 1px solid #334155; padding: 20px; margin-bottom: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3); }
    .badge { display: inline-block; padding: 6px 14px; border-radius: 9999px; font-weight: bold; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { padding: 12px 10px; color: #94a3b8; border-bottom: 2px solid #475569; font-size: 13px; text-transform: uppercase; }
    .preview-box { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .preview-img { width: 100%; border-radius: 8px; border: 1px solid #475569; }
  </style>
</head>
<body>
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
    <div>
      <h1 style="margin: 0 0 6px 0; font-size: 24px;">🧪 MES AI Active Browser Test Report</h1>
      <div style="color: #94a3b8; font-size: 14px;">เป้าหมายการทดสอบ: <strong>${testName}</strong></div>
      <div style="color: #64748b; font-size: 12px; margin-top: 4px;">หน้าเว็บ: <a href="${initialContext.url}" target="_blank" style="color: #38bdf8;">${initialContext.title}</a> (${new Date().toLocaleString('th-TH')})</div>
    </div>
    <div>
      <span class="badge" style="background: ${statusColor}22; color: ${statusColor}; border: 1px solid ${statusColor}; font-size: 18px;">
        ${statusText} (${summary.passed}/${summary.total} Steps)
      </span>
    </div>
  </div>

  <div class="card">
    <h3 style="margin-top: 0; color: #38bdf8;">📋 รายละเอียดการทดสอบ (Execution Steps)</h3>
    <table>
      <thead>
        <tr>
          <th>ลำดับ</th>
          <th>Action</th>
          <th>Target</th>
          <th>Value</th>
          <th>ผลลัพธ์</th>
          <th>คำอธิบาย</th>
        </tr>
      </thead>
      <tbody>
        ${stepsHtml}
      </tbody>
    </table>
  </div>

  <div class="card">
    <h3 style="margin-top: 0; color: #38bdf8;">📸 การเปรียบเทียบหน้าจอ Visual (Before vs After)</h3>
    <div class="preview-box">
      <div>
        <h4 style="color: #94a3b8; margin: 0 0 8px 0;">ก่อนเริ่มทดสอบ (Initial State)</h4>
        ${initialImgRel ? `<img class="preview-img" src="${initialImgRel}" alt="Before Test" />` : '<p style="color:#64748b;">ไม่มีรูปภาพ</p>'}
      </div>
      <div>
        <h4 style="color: #94a3b8; margin: 0 0 8px 0;">หลังการทดสอบ (After State)</h4>
        ${afterImgRel ? `<img class="preview-img" src="${afterImgRel}" alt="After Test" />` : '<p style="color:#64748b;">ไม่มีรูปภาพ</p>'}
      </div>
    </div>
  </div>
</body>
</html>`;

  const reportPath = path.join(reportsDir, 'latest-report.html');
  fs.writeFileSync(reportPath, html, 'utf8');
  return path.resolve(reportPath);
}

async function runCli() {
  const args = process.argv.slice(2);
  const options = parseCliArgs(args);
  const command = options.command.toLowerCase();

  let client;
  try {
    // Special command: List all tabs without needing to lock a specific page
    if (command === 'tabs') {
      const { browser } = await connectToChrome();
      const tabs = await listAllTabs(browser);
      console.log('====================================================');
      console.log(`🌐 รายการแท็บ Chrome ที่เปิดอยู่ทั้งหมด (${tabs.length} แท็บ):`);
      console.log('====================================================');
      for (const t of tabs) {
        if (!t.isInternal) {
          console.log(`📌 [${t.index}] "${t.title}"`);
          console.log(`   🔗 URL: ${t.url}`);
        }
      }
      console.log('----------------------------------------------------');
      console.log('💡 เคล็ดลับ: คุณสามารถสั่งงานเจาะจงแท็บได้ เช่น:');
      console.log('   node tester.mjs inspect --tab=0');
      console.log('   node tester.mjs inspect --target="store"');
      console.log('====================================================');
      await browser.close();
      return;
    }

    // Connect with tab targeting
    client = await connectToChrome({
      target: options.target,
      tabIndex: options.tabIndex
    });
    const { browser, page, tabInfo } = client;

    console.log(`🎯 กำลังทำงานบนแท็บ [${tabInfo.index}]: "${tabInfo.title}"`);
    console.log(`🔗 URL: ${tabInfo.url}`);

    switch (command) {
      case 'inspect': {
        const ctx = await capturePageContext(page);
        console.log('----------------------------------------------------');
        console.log(`📸 บันทึกภาพที่: ${ctx.screenshotPath}`);
        console.log('----------------------------------------------------');
        console.log('📝 โครงสร้างหน้าจอ (ARIA Snapshot บางส่วน):');
        const lines = ctx.ariaSnapshot.split('\n').slice(0, 30);
        console.log(lines.join('\n'));
        if (ctx.ariaSnapshot.split('\n').length > 30) {
          console.log('... (และอื่นๆ)');
        }
        console.log('----------------------------------------------------');
        break;
      }

      case 'barcode': {
        const code = options.params[0] || 'TEST-BARCODE-1234';
        const suffix = options.suffix || 'Enter';
        console.log(`⚡ จำลองการยิงบาร์โค้ด: "${code}" (Suffix: ${suffix})...`);
        const result = await simulateBarcodeScan(page, { code, suffix });
        console.log(`✅ ยิงบาร์โค้ดเข้าหน้าจอสำเร็จ!`);
        break;
      }

      case 'network': {
        const mode = options.params[0] || 'offline';
        console.log(`📶 กำลังปรับสภาพเครือข่ายเป็น: ${mode.toUpperCase()}...`);
        await setNetworkConditions(page, mode);
        console.log(`✅ ปรับสถานะเครือข่ายเป็น "${mode}" เรียบร้อย!`);
        break;
      }

      case 'matrix': {
        console.log('📐 กำลังบันทึกภาพหน้าจอ 3 ขนาด (Mobile, Tablet, Factory Display)...');
        const matrix = await captureResponsiveMatrix(page);
        console.log('✅ บันทึกครบทั้ง 3 ขนาด:');
        for (const m of matrix) {
          console.log(`   📱 ${m.desc}: ${m.path}`);
        }
        break;
      }

      case 'run': {
        const planFile = options.params[0];
        if (!planFile) {
          console.log('วิธีใช้: node tester.mjs run <path_to_plan.json>');
          return;
        }

        const planData = JSON.parse(fs.readFileSync(planFile, 'utf8'));
        const testName = planData.name || 'Automated Test';
        const steps = planData.steps || [];

        console.log(`🚀 เริ่มการทดสอบ: "${testName}" (${steps.length} ขั้นตอน)`);
        const initialCtx = await capturePageContext(page);

        const results = [];
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          console.log(`▶️ [Step ${i + 1}/${steps.length}] ${step.action.toUpperCase()} -> ${step.target || ''} ${step.value ? `("${step.value}")` : ''}`);
          const res = await executeStep(page, step);
          results.push(res);
          console.log(`   ${res.status === 'PASS' ? '✅' : '❌'} ${res.detail}`);
          if (res.status === 'FAIL' && step.abortOnFail !== false) {
            console.log('⛔ หยุดการทดสอบเนื่องจากพบข้อผิดพลาด');
            break;
          }
        }

        const afterCtx = await capturePageContext(page);
        const summary = {
          total: steps.length,
          passed: results.filter(r => r.status === 'PASS').length,
          failed: results.filter(r => r.status === 'FAIL').length
        };

        const reportPath = generateHtmlReport(testName, initialCtx, afterCtx, results, summary);
        console.log('----------------------------------------------------');
        console.log(`🎉 การทดสอบเสร็จสิ้น: ผ่าน ${summary.passed}/${summary.total} ขั้นตอน`);
        console.log(`📄 เปิดดูรายงานผลการทดสอบ HTML ได้ที่:`);
        console.log(`👉 file:///${reportPath.replace(/\\/g, '/')}`);
        console.log('----------------------------------------------------');
        break;
      }

      default:
        console.log(`คำสั่งที่ไม่รู้จัก: "${command}"`);
        console.log('คำสั่งที่รองรับ: tabs, inspect, barcode, network, matrix, run');
    }
  } catch (err) {
    console.error(`❌ เกิดข้อผิดพลาด: ${err.message}`);
  } finally {
    if (client && client.browser) {
      await client.browser.close();
    }
  }
}

runCli();
