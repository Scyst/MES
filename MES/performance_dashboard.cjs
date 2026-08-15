const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'performance_data.sqlite');

app.use(express.static(path.join(__dirname, 'public')));

// Allow CORS for Tauri frontend
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

app.get('/api/data', (req, res) => {
    const range = req.query.range || '4h';
    
    if (!fs.existsSync(DB_FILE)) {
        return res.json({ success: false, error: "No database file found. Ensure performance_logger.cjs is running." });
    }

    const localDb = new sqlite3.Database(DB_FILE, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
            return res.json({ success: false, error: "Cannot open database" });
        }
    });

    let sql = `SELECT * FROM metrics ORDER BY id DESC LIMIT 1440`; // 4 hours (at 10s intervals)

    if (range === '24h') {
        // Downsample to 1-minute averages (approx 1440 points)
        sql = `
            SELECT 
                MIN(timestamp) as timestamp, 
                AVG(ping_ms) as ping_ms, 
                AVG(http_ms) as http_ms, 
                AVG(db_connect_ms) as db_connect_ms, 
                AVG(db_query_ms) as db_query_ms,
                AVG(ftp_ms) as ftp_ms,
                AVG(nodered_ms) as nodered_ms,
                AVG(ram_percent) as ram_percent,
                MAX(error) as error
            FROM metrics 
            WHERE timestamp >= datetime('now', '-24 hours')
            GROUP BY strftime('%Y-%m-%d %H:%M', timestamp)
            ORDER BY timestamp DESC
        `;
    } else if (range === '7d') {
        // Downsample to 10-minute averages (approx 1000 points)
        sql = `
            SELECT 
                MIN(timestamp) as timestamp, 
                AVG(ping_ms) as ping_ms, 
                AVG(http_ms) as http_ms, 
                AVG(db_connect_ms) as db_connect_ms, 
                AVG(db_query_ms) as db_query_ms,
                AVG(ftp_ms) as ftp_ms,
                AVG(nodered_ms) as nodered_ms,
                AVG(ram_percent) as ram_percent,
                MAX(error) as error
            FROM metrics 
            WHERE timestamp >= datetime('now', '-7 days')
            GROUP BY strftime('%Y-%m-%d %H:', timestamp), substr(strftime('%M', timestamp), 1, 1)
            ORDER BY timestamp DESC
        `;
    } else if (range === '30d') {
        // Downsample to 1-hour averages (approx 720 points)
        sql = `
            SELECT 
                MIN(timestamp) as timestamp, 
                AVG(ping_ms) as ping_ms, 
                AVG(http_ms) as http_ms, 
                AVG(db_connect_ms) as db_connect_ms, 
                AVG(db_query_ms) as db_query_ms,
                AVG(ftp_ms) as ftp_ms,
                AVG(nodered_ms) as nodered_ms,
                AVG(ram_percent) as ram_percent,
                MAX(error) as error
            FROM metrics 
            WHERE timestamp >= datetime('now', '-30 days')
            GROUP BY strftime('%Y-%m-%d %H', timestamp)
            ORDER BY timestamp DESC
        `;
    }

    localDb.all(sql, [], (err, rows) => {
        localDb.close();
        if (err) {
            return res.json({ success: false, error: err.message });
        }
        
        // Rows are ordered DESC, reverse to make chronological
        const sortedRows = rows.reverse();
        
        const data = sortedRows.map(row => ({
            timestamp: row.timestamp,
            ping: row.ping_ms ? Math.round(row.ping_ms) : null,
            http: row.http_ms ? Math.round(row.http_ms) : null,
            dbConnect: row.db_connect_ms ? Math.round(row.db_connect_ms) : null,
            dbQuery: row.db_query_ms ? Math.round(row.db_query_ms) : null,
            ftp: row.ftp_ms ? Math.round(row.ftp_ms) : null,
            nodered: row.nodered_ms ? Math.round(row.nodered_ms) : null,
            ram: row.ram_percent ? Math.round(row.ram_percent) : null,
            error: row.error
        }));

        res.json({ success: true, data });
    });
});

app.listen(PORT, () => {
    console.log(`MES Performance Dashboard running at http://localhost:${PORT}`);
});
