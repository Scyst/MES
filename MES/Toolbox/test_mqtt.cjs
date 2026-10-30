// ============================================================
// test_mqtt.cjs — MQTT Connection Test for B9 Topics
// Server: 10.1.68.100:1883
// ============================================================

const mqtt = require('mqtt');

const BROKER_URL = 'mqtt://10.1.68.100:1883';

const TOPICS = [
  '/B9/ECMDB',
  '/B9/DB_PAINT',
  '/B9/DB_SPOTWELDING',
  '/B9/DB_LP1',
  '/B9/DB_LP2',
  '/B9/DB_TEMPORARY',
  '/B9/DB1',
  '/B9/DB_AIRCOM',
  '/B9/DB_LPCN',
  '/B9/DB_ROLLFORMING1',
  '/B9/DB_ROLLFORMING2',
  '/B9/DB_HM_1003_3',
  '/B9/DB_HM_1003_4',
  '/B9/DB_HM_1003_7',
];

const CREDENTIALS = [
  { username: null, password: null },          // anonymous (Node-RED Telemetry/Auth broker)
  { username: 'snc-mqtt', password: '__PWRD__' },
  { username: 'admin',    password: 'oem2022'  },
];

// Track message count per topic
const msgCount = {};
TOPICS.forEach((t) => (msgCount[t] = 0));

let credIndex = 0;
let client;

// ─── Create & Connect ─────────────────────────────────────────
function connect() {
  const cred = CREDENTIALS[credIndex];
  console.log('='.repeat(60));
  console.log(`🔌 Connecting to: ${BROKER_URL}`);
  console.log(`🔑 Credentials [${credIndex + 1}/${CREDENTIALS.length}]: username="${cred.username}"`);
  console.log('='.repeat(60));

  client = mqtt.connect(BROKER_URL, {
    clientId: `mes_test_${Math.random().toString(16).slice(2, 8)}`,
    clean: true,
    connectTimeout: 10000,
    reconnectPeriod: 0,
    username: cred.username,
    password: cred.password,
  });

  attachHandlers();
}

// ─── Attach Event Handlers ────────────────────────────────────
function attachHandlers() {
  client.on('connect', onConnect);
  client.on('message', onMessage);
  client.on('error',   onError);
  client.on('offline', () => console.warn('\n⚠️  Client went offline'));
  client.on('close',   onClose);
}

function onConnect() {
  const cred = CREDENTIALS[credIndex];
  console.log(`\n✅ Connected! (username: "${cred.username}")`);
  console.log(`\n📡 Subscribing to ${TOPICS.length} topics...\n`);

  client.subscribe(TOPICS, { qos: 0 }, (err, granted) => {
    if (err) {
      console.error('❌ Subscribe error:', err.message);
      client.end();
      return;
    }
    granted.forEach(({ topic, qos }) => {
      console.log(`  ✓ ${topic}  (QoS ${qos})`);
    });
    console.log('\n🎧 Listening for messages... (Press Ctrl+C to stop)\n');
    console.log('-'.repeat(60));
  });
}

function onMessage(topic, payload) {
  msgCount[topic] = (msgCount[topic] || 0) + 1;

  let parsed;
  try {
    parsed = JSON.parse(payload.toString());
  } catch {
    parsed = payload.toString();
  }

  const timestamp = new Date().toLocaleTimeString('th-TH', { hour12: false });
  console.log(`[${timestamp}] 📨 ${topic}  (msg #${msgCount[topic]})`);
  console.log(`  Payload: ${JSON.stringify(parsed).slice(0, 300)}`);
  console.log();
}

function onError(err) {
  console.error(`\n❌ Error: ${err.message}`);

  // Auth failed → try next credentials
  if (err.message.includes('Bad username or password') && credIndex < CREDENTIALS.length - 1) {
    credIndex++;
    console.log('🔄 Trying next credentials...');
    client.end(true, () => connect());
  } else if (credIndex >= CREDENTIALS.length - 1 && err.message.includes('Bad username')) {
    console.error('❌ All credentials failed. Exiting.');
    process.exit(1);
  }
}

function onClose() {
  // Only print summary if we've exhausted retries or connected successfully
  if (credIndex >= CREDENTIALS.length - 1 || Object.values(msgCount).some((v) => v > 0)) {
    console.log('\n🔌 Connection closed');
    printSummary();
  }
}

// ─── Graceful Shutdown ────────────────────────────────────────
process.on('SIGINT', () => {
  console.log('\n\n⏹  Stopping...');
  client.end(true, () => {
    printSummary();
    process.exit(0);
  });
});

// ─── Summary ──────────────────────────────────────────────────
function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 Message Summary:');
  console.log('='.repeat(60));
  const total = Object.values(msgCount).reduce((a, b) => a + b, 0);
  TOPICS.forEach((t) => {
    const count = msgCount[t] || 0;
    const bar = '█'.repeat(Math.min(count, 20));
    console.log(`  ${t.padEnd(30)} ${String(count).padStart(4)} msgs  ${bar}`);
  });
  console.log('-'.repeat(60));
  console.log(`  Total: ${total} messages received`);
  console.log('='.repeat(60));
}

// ─── Start ────────────────────────────────────────────────────
connect();
