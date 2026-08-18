const ftp = require('basic-ftp');
const path = require('path');
const fs = require('fs');

const FTP_CONFIG = {
    host: "10.0.0.2",
    user: "Naphat",
    password: "O@m11o1toolBox",
    secure: false
};
const BACKUP_ROOT = path.join('E:', 'MES', 'Backups');
const RETENTION_DAYS = 7;

function getLatestBackupFolder(excludeDir = null) {
    if (!fs.existsSync(BACKUP_ROOT)) return null;
    
    try {
        const resolvedExclude = excludeDir ? path.resolve(excludeDir) : null;
        const folders = fs.readdirSync(BACKUP_ROOT)
            .filter(name => name.startsWith('FullServer_'))
            .map(name => path.join(BACKUP_ROOT, name))
            .filter(dir => {
                if (resolvedExclude && path.resolve(dir) === resolvedExclude) return false;
                try {
                    return fs.statSync(dir).isDirectory();
                } catch (e) {
                    return false;
                }
            });
            
        if (folders.length === 0) return null;
        
        // Sort descending by name (since name has YYYYMMDD_HHMM)
        folders.sort((a, b) => b.localeCompare(a));
        return folders[0];
    } catch (err) {
        console.error('[Error] Failed to get latest backup folder:', err.message);
        return null;
    }
}

function cleanupOldBackups() {
    if (!fs.existsSync(BACKUP_ROOT)) return;
    
    try {
        const folders = fs.readdirSync(BACKUP_ROOT)
            .filter(name => name.startsWith('FullServer_'))
            .map(name => path.join(BACKUP_ROOT, name))
            .filter(dir => {
                try {
                    return fs.statSync(dir).isDirectory();
                } catch (e) {
                    return false;
                }
            });
            
        const now = Date.now();
        const maxAgeMs = RETENTION_DAYS * 24 * 60 * 60 * 1000;
        
        for (const folder of folders) {
            try {
                let folderAgeMs = null;
                const folderName = path.basename(folder);
                const match = folderName.match(/^FullServer_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})/);
                if (match) {
                    const [_, y, m, d, hh, mm] = match;
                    const folderTime = new Date(
                        parseInt(y, 10),
                        parseInt(m, 10) - 1,
                        parseInt(d, 10),
                        parseInt(hh, 10),
                        parseInt(mm, 10)
                    ).getTime();
                    if (!isNaN(folderTime)) {
                        folderAgeMs = now - folderTime;
                    }
                }
                
                if (folderAgeMs === null) {
                    const stats = fs.statSync(folder);
                    folderAgeMs = now - stats.mtimeMs;
                }

                if (folderAgeMs > maxAgeMs) {
                    console.log(`[Cleanup] Deleting old backup folder: ${folder}`);
                    fs.rmSync(folder, { recursive: true, force: true });
                }
            } catch (err) {
                console.error(`[Cleanup] Error cleaning up ${folder}:`, err.message);
            }
        }
    } catch (err) {
        console.error('[Cleanup] Error listing backup folders for cleanup:', err.message);
    }
}

async function backupFtp() {
    const now = new Date();
    const timestamp = now.getFullYear() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0') + '_' +
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0');
        
    const localBackupDir = path.join(BACKUP_ROOT, `FullServer_${timestamp}`);
    const latestBackupDir = getLatestBackupFolder(localBackupDir);
    
    if (latestBackupDir) {
        console.log(`[Info] Found previous backup at ${latestBackupDir}. Will use hard links for unchanged files.`);
    } else {
        console.log(`[Info] No previous backup found. Full download will be performed.`);
    }
    
    if (!fs.existsSync(localBackupDir)) {
        fs.mkdirSync(localBackupDir, { recursive: true });
    }

    console.log(`Starting deep sequential backup to ${localBackupDir}`);
    
    let client = new ftp.Client();
    
    async function connect() {
        if (!client.closed) {
            client.close();
        }
        client = new ftp.Client();
        await client.access(FTP_CONFIG);
    }
    
    try {
        await connect();
    } catch (err) {
        console.error("Initial FTP connection failed:", err);
        if (!client.closed) client.close();
        return;
    }

    const queue = [{ remotePath: '/', retries: 0 }];
    let linkedFilesCount = 0;
    let downloadedFilesCount = 0;
    
    while (queue.length > 0) {
        const { remotePath, retries } = queue.shift();
        const cleanRemotePath = remotePath === '/' ? '/' : remotePath.replace(/\/+/g, '/').replace(/\/$/, '');
        const relativePath = cleanRemotePath === '/' ? '' : cleanRemotePath.replace(/^\/+/, '');
        const localPath = relativePath ? path.join(localBackupDir, ...relativePath.split('/')) : localBackupDir;
        
        if (!fs.existsSync(localPath)) {
            fs.mkdirSync(localPath, { recursive: true });
        }

        try {
            console.log(`[Process] Scanning directory: ${cleanRemotePath}`);
            const list = await client.list(cleanRemotePath);
            
            const subdirs = [];
            for (const item of list) {
                if (item.name === "." || item.name === "..") continue;
                
                const itemRemotePath = cleanRemotePath === '/' ? `/${item.name}` : `${cleanRemotePath}/${item.name}`;
                const itemRelative = itemRemotePath.replace(/^\/+/, '');
                const itemLocalPath = path.join(localBackupDir, ...itemRelative.split('/'));
                
                if (item.isDirectory) {
                    subdirs.push({ remotePath: itemRemotePath, retries: 0 });
                } else if (item.isFile) {
                    let fileReused = false;
                    
                    // Incremental Sync Logic
                    if (latestBackupDir) {
                        const previousLocalPath = path.join(latestBackupDir, ...itemRelative.split('/'));
                        if (fs.existsSync(previousLocalPath)) {
                            try {
                                const prevStats = fs.statSync(previousLocalPath);
                                // Compare file size (FTP returns size in item.size)
                                if (prevStats.size === item.size) {
                                    if (fs.existsSync(itemLocalPath)) {
                                        fs.unlinkSync(itemLocalPath);
                                    }
                                    fs.linkSync(previousLocalPath, itemLocalPath);
                                    console.log(`[Link] Reused file (Hard Link): ${itemRemotePath}`);
                                    linkedFilesCount++;
                                    fileReused = true;
                                }
                            } catch (e) {
                                console.error(`[Error] Hard link failed for ${itemRemotePath}, falling back to download:`, e.message);
                            }
                        }
                    }
                    
                    if (!fileReused) {
                        console.log(`[Backup] Downloading new/changed file: ${itemRemotePath}`);
                        await client.downloadTo(itemLocalPath, itemRemotePath);
                        downloadedFilesCount++;
                    }
                }
            }

            // Only enqueue subdirectories after current directory processing succeeds
            for (const subdir of subdirs) {
                queue.push(subdir);
            }
        } catch (err) {
            console.error(`[Error] Failed at ${cleanRemotePath}: ${err.message}`);
            
            if (retries < 3) {
                console.log(`[Retry] Reconnecting and retrying ${cleanRemotePath} (Attempt ${retries + 1}/3)...`);
                try {
                    await connect();
                } catch (connErr) {
                    console.error(`[Error] Reconnection failed: ${connErr.message}`);
                }
                queue.unshift({ remotePath: cleanRemotePath, retries: retries + 1 });
            } else {
                console.error(`[Error] Skipping ${cleanRemotePath} after 3 failed attempts.`);
            }
        }
    }
    
    if (!client.closed) {
        client.close();
    }
    
    console.log(`\nFTP Backup completed to ${localBackupDir}`);
    console.log(`Summary: ${downloadedFilesCount} downloaded, ${linkedFilesCount} hard linked.`);
    
    // Auto-cleanup
    try {
        console.log(`\nRunning cleanup for backups older than ${RETENTION_DAYS} days...`);
        cleanupOldBackups();
    } catch (err) {
        console.error(`[Error] Cleanup failed: ${err.message}`);
    }
}

async function triggerBackup(reason = 'Scheduled') {
    if (isBackingUp) {
        console.log(`[${new Date().toISOString()}] [Backup Daemon] Backup is already running. Skipping trigger (${reason}).`);
        return;
    }

    isBackingUp = true;
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] 🚀 [Backup Daemon] Triggering ${reason} backup cycle...`);

    try {
        await backupFtp();
        const durationSec = Math.round((Date.now() - startTime) / 1000);
        console.log(`[${new Date().toISOString()}] ✅ [Backup Daemon] Backup cycle finished in ${durationSec}s.`);
    } catch (err) {
        console.error(`[${new Date().toISOString()}] ❌ [Backup Daemon] Backup cycle error:`, err);
    } finally {
        isBackingUp = false;
    }
}

// Daily schedule: 00:00 (Midnight)
const BACKUP_SCHEDULE_HOUR = 0;
const CHECK_INTERVAL_MS = 30000; // Check every 30 seconds

let isBackingUp = false;

// Initialize lastBackupDate from the most recent backup folder on disk if one exists from today
function getInitialBackupDate() {
    const latest = getLatestBackupFolder();
    if (latest) {
        const folderName = path.basename(latest);
        const match = folderName.match(/^FullServer_(\d{4})(\d{2})(\d{2})_/);
        if (match) {
            const [_, y, m, d] = match;
            const backupDate = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
            return backupDate.toDateString();
        }
    }
    return null;
}

let lastBackupDate = getInitialBackupDate();

function checkSchedule() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDate = now.toDateString();

    // Trigger daily backup at designated hour (00:xx midnight hour) once per calendar day
    if (currentHour === BACKUP_SCHEDULE_HOUR && lastBackupDate !== currentDate) {
        lastBackupDate = currentDate;
        triggerBackup(`Daily @ ${String(BACKUP_SCHEDULE_HOUR).padStart(2, '0')}:00`);
    }
}

// Global process error handlers to guarantee daemon longevity
process.on('uncaughtException', (err) => {
    console.error(`[${new Date().toISOString()}] [Backup Daemon] Uncaught Exception:`, err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(`[${new Date().toISOString()}] [Backup Daemon] Unhandled Rejection at:`, promise, 'reason:', reason);
});

process.on('SIGINT', () => {
    console.log(`[${new Date().toISOString()}] [Backup Daemon] Received SIGINT. Shutting down gracefully.`);
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log(`[${new Date().toISOString()}] [Backup Daemon] Received SIGTERM. Shutting down gracefully.`);
    process.exit(0);
});

// Check if immediate run was requested via CLI
if (process.argv.includes('--run-now')) {
    lastBackupDate = new Date().toDateString();
    triggerBackup('CLI --run-now');
} else {
    // Run initial schedule check
    checkSchedule();
}

// Start scheduler loop to keep daemon alive
setInterval(checkSchedule, CHECK_INTERVAL_MS);

console.log(`====================================================`);
console.log(`  MES Backup Server Daemon Started`);
console.log(`  PID: ${process.pid}`);
console.log(`  Schedule: Daily at ${String(BACKUP_SCHEDULE_HOUR).padStart(2, '0')}:00`);
console.log(`  Last Backup Date: ${lastBackupDate || 'None'}`);
console.log(`  Backup Root: ${BACKUP_ROOT}`);
console.log(`  Retention: ${RETENTION_DAYS} days`);
console.log(`====================================================`);
