import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env safely without third-party dependencies
function loadEnv() {
  const envPath = path.join(__dirname, '../../.env');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        env[trimmed.substring(0, idx).trim()] = trimmed.substring(idx + 1).trim();
      }
    }
  });
  return env;
}

const env = loadEnv();
const NODE_RED_URL = env.NODE_RED_URL || 'http://localhost:1880';

export async function sendTelemetry(endpoint, payload) {
  const url = `${NODE_RED_URL.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return {
      success: res.ok,
      status: res.status,
      url,
      payload
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      url,
      payload
    };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const machine = args[0] || 'PRESS_01';
  const state = args[1] || 'RUNNING'; // RUNNING, ALARM, STOPPED

  const presets = {
    RUNNING: {
      machineId: machine,
      status: 'RUNNING',
      pressure_ton: 150.5,
      cycle_time_sec: 4.2,
      counter_good: 1240,
      counter_ng: 8,
      temperature_c: 42.1,
      timestamp: new Date().toISOString()
    },
    ALARM: {
      machineId: machine,
      status: 'ALARM',
      alarm_code: 'ERR_OVERPRESSURE_TON_HIGH',
      pressure_ton: 210.8, // Exceeded safe boundary
      temperature_c: 88.5,
      timestamp: new Date().toISOString()
    },
    STOPPED: {
      machineId: machine,
      status: 'STOPPED',
      downtime_reason: 'MOLD_CHANGE',
      timestamp: new Date().toISOString()
    }
  };

  const payload = presets[state.toUpperCase()] || presets.RUNNING;
  console.log('====================================================');
  console.log(`📡 MES Node-RED Machine Telemetry Simulator`);
  console.log(`🎯 เครื่องจักร: ${machine} | สถานะจำลอง: ${state.toUpperCase()}`);
  console.log(`🌐 ปลายทาง Node-RED: ${NODE_RED_URL}/api/telemetry/${machine}`);
  console.log('----------------------------------------------------');
  console.log('📦 Data Payload:\n', JSON.stringify(payload, null, 2));

  const result = await sendTelemetry(`api/telemetry/${machine}`, payload);
  if (result.success) {
    console.log('✅ ส่งข้อมูลเข้า Node-RED สำเร็จ (HTTP Status: ' + result.status + ')');
  } else {
    console.log('⚠️ ไม่สามารถส่งตรงเข้า Node-RED (HTTP: ' + (result.status || result.error) + ')');
    console.log('💡 หมายเหตุ: หาก Node-RED ยังไม่ได้เปิด endpoint HTTP-in คุณสามารถนำ payload นี้ไปตั้งค่าใน Node-RED flow ได้ทันที');
  }
  console.log('====================================================');
}

main();
