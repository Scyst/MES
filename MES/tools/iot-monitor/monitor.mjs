import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import sql from 'mssql';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env configuration
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

/**
 * 1. Check TCP Port Connection & Latency
 */
function checkTcpPort(host, port, timeoutMs = 3000) {
  return new Promise(resolve => {
    const start = Date.now();
    const socket = new net.Socket();

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      const latency = Date.now() - start;
      socket.destroy();
      resolve({ host, port, ok: true, latency });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ host, port, ok: false, error: 'TIMEOUT' });
    });

    socket.on('error', err => {
      socket.destroy();
      resolve({ host, port, ok: false, error: err.message });
    });

    socket.connect(port, host);
  });
}

/**
 * 2. Check Node-RED HTTP API Status
 */
async function checkNodeRed(baseUrl) {
  const start = Date.now();
  const url = `${baseUrl.replace(/\/+$/, '')}/settings`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    const latency = Date.now() - start;
    return {
      url,
      ok: res.ok || res.status === 401, // 401 means server is alive with auth
      status: res.status,
      latency
    };
  } catch (err) {
    return {
      url,
      ok: false,
      error: err.message
    };
  }
}

/**
 * 3. Check Live Telemetry Heartbeat from SQL Server
 */
async function checkTelemetryHeartbeat() {
  if (!env.DB_SERVER || !env.DB_DATABASE || !env.DB_USER || !env.DB_PASSWORD) {
    return {
      ok: false,
      error: 'Missing DB_SERVER, DB_DATABASE, DB_USER, or DB_PASSWORD in MES/.env'
    };
  }

  const dbConfig = {
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    server: env.DB_SERVER,
    database: env.DB_DATABASE,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      connectTimeout: 5000
    }
  };

  let pool;
  try {
    pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT 
        COUNT(*) as total_machines,
        SUM(CASE WHEN DATEDIFF(second, last_updated, GETDATE()) <= 60 THEN 1 ELSE 0 END) as active_last_60s,
        MIN(DATEDIFF(second, last_updated, GETDATE())) as freshest_seconds_ago,
        MAX(last_updated) as latest_update
      FROM PE_IIOT_TELEMETRY (NOLOCK);

      SELECT TOP 5 
        machine_code, live_status, live_counter, last_updated,
        DATEDIFF(second, last_updated, GETDATE()) as seconds_ago
      FROM PE_IIOT_TELEMETRY (NOLOCK)
      ORDER BY last_updated DESC;
    `);

    const summary = result.recordsets[0][0];
    const recent = result.recordsets[1];

    return {
      ok: true,
      summary: {
        totalMachines: summary.total_machines,
        activeLast60s: summary.active_last_60s,
        freshestSecondsAgo: summary.freshest_seconds_ago,
        latestUpdate: summary.latest_update
      },
      recentMachines: recent
    };
  } catch (err) {
    return {
      ok: false,
      error: err.message
    };
  } finally {
    if (pool) await pool.close();
  }
}

export async function runDiagnostics() {
  const nodeRedUrl = env.NODE_RED_URL || '';
  const mqttHost = env.MQTT_HOST || (nodeRedUrl ? new URL(nodeRedUrl).hostname : '');

  const missingHostError = { host: 'unconfigured', ok: false, error: 'Missing NODE_RED_URL or MQTT_HOST in MES/.env' };
  const missingNodeRedError = { url: 'unconfigured', ok: false, error: 'Missing NODE_RED_URL in MES/.env' };

  // Run all diagnostics in parallel
  const [broker1883, broker1884, nodeRed, dbHeartbeat] = await Promise.all([
    mqttHost ? checkTcpPort(mqttHost, 1883) : Promise.resolve({ ...missingHostError, port: 1883 }),
    mqttHost ? checkTcpPort(mqttHost, 1884) : Promise.resolve({ ...missingHostError, port: 1884 }),
    nodeRedUrl ? checkNodeRed(nodeRedUrl) : Promise.resolve(missingNodeRedError),
    checkTelemetryHeartbeat()
  ]);

  return {
    timestamp: new Date().toISOString(),
    mqttBrokers: [
      { name: 'MQTT Auth Broker (Port 1883)', ...broker1883 },
      { name: 'SNC Utility Broker (Port 1884)', ...broker1884 }
    ],
    nodeRed,
    dbHeartbeat
  };
}

function printReport(data) {
  console.clear();
  console.log('========================================================================');
  console.log('📊 MES IoT Watchdog: Node-RED & MQTT Real-time Diagnostics');
  console.log(`🕒 เวลาตรวจสอบ: ${new Date().toLocaleTimeString('th-TH')} (${new Date().toLocaleDateString('th-TH')})`);
  console.log('========================================================================');

  // 1. MQTT Brokers
  console.log('📡 1. MQTT Broker Socket Status:');
  for (const b of data.mqttBrokers) {
    const icon = b.ok ? '🟢 ONLINE' : '🔴 OFFLINE';
    const detail = b.ok ? `${b.latency}ms` : `ERROR: ${b.error}`;
    console.log(`   ${icon.padEnd(10)} ${b.name.padEnd(30)} [${b.host}:${b.port}] (${detail})`);
  }

  // 2. Node-RED Server
  console.log('\n⚙️ 2. Node-RED Server Health:');
  const nr = data.nodeRed;
  if (nr.ok) {
    console.log(`   🟢 ONLINE   Node-RED Gateway (${nr.url}) - ตอบสนองใน ${nr.latency}ms [HTTP ${nr.status}]`);
  } else {
    console.log(`   🔴 CRITICAL Node-RED ไม่ตอบสนอง (${nr.url}) - ${nr.error}`);
  }

  // 3. Data Heartbeat (Telemetry Ingestion)
  console.log('\n💓 3. MQTT Data Heartbeat (กระแสข้อมูลเครื่องจักรไหลเข้า DB):');
  const db = data.dbHeartbeat;
  if (db.ok) {
    const s = db.summary;
    const diff = s.freshestSecondsAgo;

    let flowBadge = '🟢 ปกติ (ACTIVE)';
    let flowColorDesc = 'ข้อมูลไหลเข้าอย่างต่อเนื่อง';
    if (diff > 120) {
      flowBadge = '🔴 หยุดชะงัก (STALLED/FROZEN)';
      flowColorDesc = `ไม่มีข้อมูลเข้าเกิน ${diff} วินาที! (MQTT หรือ Node-RED อาจค้าง)`;
    } else if (diff > 45) {
      flowBadge = '🟡 ล่าช้า (LAGGING)';
      flowColorDesc = `ข้อมูลล่าสุดเข้าเมื่อ ${diff} วินาทีที่แล้ว`;
    }

    console.log(`   สถานะการรับข้อมูล: ${flowBadge}`);
    console.log(`   คำอธิบาย:         ${flowColorDesc}`);
    console.log(`   อัปเดตล่าสุด:     ${diff} วินาทีที่แล้ว (เวลาเซิร์ฟเวอร์: ${new Date(s.latestUpdate).toLocaleTimeString('th-TH')})`);
    console.log(`   เครื่องจักรส่งข้อมูล: ${s.activeLast60s}/${s.totalMachines} เครื่อง (ในรอบ 60 วินาทีที่ผ่านมา)`);

    console.log('\n   📋 ตัวอย่างเครื่องจักรที่ส่งข้อมูลล่าสุด 5 เครื่อง:');
    for (const m of db.recentMachines) {
      console.log(`      • [${m.machine_code.padEnd(10)}] สถานะ: ${m.live_status.padEnd(8)} ยอดนับ: ${String(m.live_counter).padEnd(8)} (อัปเดตเมื่อ ${m.seconds_ago}s ที่แล้ว)`);
    }
  } else {
    console.log(`   🔴 DATABASE ERROR: ไม่สามารถเช็ค Heartbeat ในฐานข้อมูลได้ (${db.error})`);
  }

  console.log('========================================================================');
}

async function main() {
  const isWatch = process.argv.includes('--watch');

  if (isWatch) {
    console.log('🚀 เริ่มโหมด Real-time Watchdog (อัปเดตทุก 5 วินาที กด Ctrl+C เพื่อหยุด)...');
    setInterval(async () => {
      try {
        const report = await runDiagnostics();
        printReport(report);
      } catch (e) {
        console.error('Watchdog loop error:', e.message);
      }
    }, 5000);
    // Initial run
    const initial = await runDiagnostics();
    printReport(initial);
  } else {
    const report = await runDiagnostics();
    printReport(report);
    console.log('💡 เคล็ดลับ: พิมพ์ "node tools/iot-monitor/monitor.mjs --watch" เพื่อเปิดแดชบอร์ดเฝ้าระวังแบบ Real-time ตลอดเวลา');
  }
}

main();
