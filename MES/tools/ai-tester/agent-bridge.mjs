import { connectToChrome, capturePageContext, executeStep } from './browser.mjs';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';

  let client;
  try {
    client = await connectToChrome();
    const { browser, page } = client;

    if (command === 'status' || command === 'inspect') {
      const context = await capturePageContext(page);
      console.log(JSON.stringify({ success: true, data: context }, null, 2));
    } else if (command === 'execute') {
      const stepsRaw = args[1];
      if (!stepsRaw) {
        throw new Error('Missing steps argument. Usage: node agent-bridge.mjs execute \'[{"action":"click","target":"..."}]\'');
      }

      const steps = JSON.parse(stepsRaw);
      const results = [];
      for (const step of steps) {
        const res = await executeStep(page, step);
        results.push(res);
        if (res.status === 'FAIL' && step.abortOnFail !== false) {
          break;
        }
      }

      // Capture after state
      const afterContext = await capturePageContext(page);
      console.log(JSON.stringify({
        success: true,
        summary: {
          total: steps.length,
          executed: results.length,
          passed: results.filter(r => r.status === 'PASS').length,
          failed: results.filter(r => r.status === 'FAIL').length
        },
        steps: results,
        afterState: afterContext
      }, null, 2));
    } else {
      throw new Error(`Unknown command "${command}". Available commands: status, execute`);
    }
  } catch (err) {
    console.error(JSON.stringify({ success: false, error: err.message }, null, 2));
    process.exit(1);
  } finally {
    if (client && client.browser) {
      await client.browser.close(); // Disconnects without closing user's Chrome
    }
  }
}

main();
