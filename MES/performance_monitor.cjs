const { exec } = require('child_process');
const http = require('http');
const https = require('https');
const sql = require('mssql');

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

// Promise wrapper for ping
function measurePing(host) {
    return new Promise((resolve) => {
        const start = Date.now();
        // Use ping -n 1 for Windows
        exec(`ping -n 1 ${host}`, (error, stdout) => {
            const time = Date.now() - start;
            if (error) {
                resolve({ success: false, time: null, error: error.message });
            } else {
                // Parse the ms time from stdout
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
            res.resume(); // consume data
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
        
        // Use a simple query to measure query execution time since TOOLBOX user lacks VIEW SERVER STATE permissions
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

async function runMonitor() {
    console.log("=========================================");
    console.log("   SYSTEM PERFORMANCE MONITOR   ");
    console.log("=========================================\n");
    
    console.log("[1] Checking Web Server (Ping & HTTP)...");
    const pingResult = await measurePing(TARGET_HOST);
    const httpResult = await measureHttp(TARGET_URL);
    
    if (pingResult.success) {
        console.log(`    - Ping Latency:      ${pingResult.time} ms`);
    } else {
        console.log(`    - Ping Latency:      [FAILED]`);
    }
    
    if (httpResult.success) {
        console.log(`    - HTTP Response:     ${httpResult.time} ms (Status: ${httpResult.status})`);
    } else {
        console.log(`    - HTTP Response:     [FAILED] ${httpResult.error}`);
    }
    
    console.log("\n[2] Checking SQL Server Database...");
    const dbResult = await measureDatabase();
    
    if (dbResult.success) {
        console.log(`    - DB Connect Time:   ${dbResult.connectionTime} ms`);
        console.log(`    - DB Query Time:     ${dbResult.queryTime} ms`);
    } else {
        console.log(`    - DB Status:         [FAILED] ${dbResult.error}`);
    }
    
    console.log("\n=========================================");
    console.log(`Completed at: ${new Date().toLocaleString()}`);
    console.log("=========================================");
}

runMonitor();
