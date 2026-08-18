const { exec } = require('child_process');
const http = require('http');
const https = require('https');
const sql = require('mssql');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');
const net = require('net');

const DB_CONFIG = {
    user: 'TOOLBOX',
    password: 'I1o1@T@#1boX',
    server: '10.1.1.31',
    database: 'IIOT_TOOLBOX',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        connectTimeout: 5000,
        requestTimeout: 5000
    }
};

const TARGET_HOST = '10.0.0.2';
const TARGET_URL = 'http://10.0.0.2/';
const DB_FILE = path.join(__dirname, 'performance_data.sqlite');

// Initialize SQLite
const localDb = new sqlite3.Database(DB_FILE, (err) => {
    if (err) {
        console.error("Error opening local database", err.message);
    } else {
        localDb.run(`CREATE TABLE IF NOT EXISTS metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            ping_ms INTEGER,
            http_ms INTEGER,
            db_connect_ms INTEGER,
            db_query_ms INTEGER,
            error TEXT
        )`, () => {
            // Alter table to add new columns if they don't exist
            localDb.run(`ALTER TABLE metrics ADD COLUMN ftp_ms INTEGER`, () => {});
            localDb.run(`ALTER TABLE metrics ADD COLUMN nodered_ms INTEGER`, () => {});
            localDb.run(`ALTER TABLE metrics ADD COLUMN ram_percent INTEGER`, () => {});
        });
    }
});

// Promise wrapper for ping
function measurePing(host) {
    return new Promise((resolve) => {
        const start = Date.now();
        exec(`ping -n 1 ${host}`, (error, stdout) => {
            const time = Date.now() - start;
            if (error) {
                resolve({ success: false, time: null, error: 'Ping failed' });
            } else {
                const match = stdout.match(/time[=<](\d+)ms/i) || stdout.match(/เวลา[=<](\d+)ms/i);
                const pingTime = match ? parseInt(match[1]) : time;
                resolve({ success: true, time: pingTime });
            }
        });
    });
}

// Promise wrapper for HTTP request
function measureHttp(url) {
    return new Promise((resolve) => {
        const start = Date.now();
        const client = url.startsWith('https') ? https : http;
        
        const req = client.get(url, (res) => {
            const time = Date.now() - start;
            resolve({ success: true, time, status: res.statusCode });
            res.resume(); 
        }).on('error', (err) => {
            resolve({ success: false, time: null, error: err.message });
        });
        
        req.setTimeout(5000, () => {
            req.abort();
            resolve({ success: false, time: null, error: 'Timeout' });
        });
    });
}

// Measure SQL Database
async function measureDatabase() {
    let pool;
    const start = Date.now();
    try {
        pool = await sql.connect(DB_CONFIG);
        const connectionTime = Date.now() - start;
        
        const queryStart = Date.now();
        await pool.request().query('SELECT 1 AS Test');
        const queryTime = Date.now() - queryStart;
        
        await pool.close();
        return { success: true, connectionTime, queryTime };
    } catch (err) {
        if (pool) pool.close();
        return { success: false, error: err.message };
    }
}

// Measure TCP Port (for FTP)
function measureTcp(host, port) {
    return new Promise((resolve) => {
        const start = Date.now();
        const socket = new net.Socket();
        
        socket.setTimeout(5000);
        
        socket.on('connect', () => {
            const time = Date.now() - start;
            socket.destroy();
            resolve({ success: true, time });
        });
        
        socket.on('timeout', () => {
            socket.destroy();
            resolve({ success: false, error: 'Timeout' });
        });
        
        socket.on('error', (err) => {
            socket.destroy();
            resolve({ success: false, error: err.message });
        });
        
        socket.connect(port, host);
    });
}

// Tracking variables for Scheduler
let lastFtpUpdateHour = null;

async function runLogger() {
    const timestamp = new Date().toISOString();
    // -----------------------------------------
    // INTERNAL SCHEDULER (Cron-like behavior)
    // -----------------------------------------
    const now = new Date();
    const currentHour = now.getHours();

    // 2. FTP Structure Update (Run every 6 hours: 0, 6, 12, 18)
    if (currentHour % 6 === 0 && lastFtpUpdateHour !== currentHour) {
        lastFtpUpdateHour = currentHour;
        console.log(`[${timestamp}] ⏰ Scheduled Task Triggered: FTP Structure Update`);
        exec('node update_ftp_structure.cjs > ftp_update.log 2>&1', { cwd: __dirname }, (err) => {
            if (err) console.error(`[${timestamp}] FTP Update Error:`, err);
            else console.log(`[${timestamp}] FTP Update completed successfully (see ftp_update.log)`);
        });
    }
    // -----------------------------------------

    // Run checks in parallel
    const [pingResult, httpResult, dbResult, ftpResult, noderedResult] = await Promise.all([
        measurePing(TARGET_HOST),
        measureHttp(TARGET_URL),
        measureDatabase(),
        measureTcp('10.0.0.2', 21), // FTP Check
        measureHttp('http://10.1.68.100:1886') // Node-RED Check
    ]);
    
    const ramPercent = Math.round(100 - (os.freemem() / os.totalmem() * 100));
    
    const pingMs = pingResult.success ? pingResult.time : null;
    const httpMs = httpResult.success ? httpResult.time : null;
    const dbConnMs = dbResult.success ? dbResult.connectionTime : null;
    const dbQueryMs = dbResult.success ? dbResult.queryTime : null;
    const ftpMs = ftpResult.success ? ftpResult.time : null;
    const noderedMs = noderedResult.success ? noderedResult.time : null;
    
    // Extract any errors
    let errorMsg = [];
    if (!pingResult.success) errorMsg.push(`Ping: ${pingResult.error}`);
    if (!httpResult.success) errorMsg.push(`HTTP: ${httpResult.error}`);
    if (!dbResult.success) errorMsg.push(`DB: ${dbResult.error}`);
    if (!ftpResult.success) errorMsg.push(`FTP: ${ftpResult.error}`);
    if (!noderedResult.success) errorMsg.push(`NodeRED: ${noderedResult.error}`);
    
    const errorStr = errorMsg.length > 0 ? errorMsg.join(' | ') : null;
    
    // Insert into SQLite
    localDb.run(
        `INSERT INTO metrics (timestamp, ping_ms, http_ms, db_connect_ms, db_query_ms, ftp_ms, nodered_ms, ram_percent, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [timestamp, pingMs, httpMs, dbConnMs, dbQueryMs, ftpMs, noderedMs, ramPercent, errorStr],
        function(err) {
            if (err) {
                console.error(`[${timestamp}] Failed to log to SQLite:`, err.message);
            } else {
                console.log(`[${timestamp}] Logged metrics to SQLite.`);
            }
        }
    );
}

// Run immediately, then every 10 seconds
runLogger();
setInterval(runLogger, 10000);

console.log("Performance Logger is running. Writing to SQLite database every 10 seconds.");
