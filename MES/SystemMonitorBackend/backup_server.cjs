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

function getLatestBackupFolder() {
    if (!fs.existsSync(BACKUP_ROOT)) return null;
    
    const folders = fs.readdirSync(BACKUP_ROOT)
        .filter(name => name.startsWith('FullServer_'))
        .map(name => path.join(BACKUP_ROOT, name))
        .filter(dir => fs.statSync(dir).isDirectory());
        
    if (folders.length === 0) return null;
    
    // Sort descending by name (since name has YYYYMMDD_HHMM)
    folders.sort((a, b) => b.localeCompare(a));
    return folders[0];
}

function cleanupOldBackups() {
    if (!fs.existsSync(BACKUP_ROOT)) return;
    
    const folders = fs.readdirSync(BACKUP_ROOT)
        .filter(name => name.startsWith('FullServer_'))
        .map(name => path.join(BACKUP_ROOT, name))
        .filter(dir => fs.statSync(dir).isDirectory());
        
    const now = Date.now();
    const maxAgeMs = RETENTION_DAYS * 24 * 60 * 60 * 1000;
    
    for (const folder of folders) {
        const stats = fs.statSync(folder);
        if (now - stats.mtimeMs > maxAgeMs) {
            console.log(`[Cleanup] Deleting old backup folder: ${folder}`);
            fs.rmSync(folder, { recursive: true, force: true });
        }
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
    const latestBackupDir = getLatestBackupFolder();
    
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
        return;
    }

    const queue = [{ remotePath: '/', retries: 0 }];
    let linkedFilesCount = 0;
    let downloadedFilesCount = 0;
    
    while (queue.length > 0) {
        const { remotePath, retries } = queue.shift();
        const relativePath = remotePath === '/' ? '' : remotePath;
        const localPath = path.join(localBackupDir, relativePath);
        
        if (!fs.existsSync(localPath)) {
            fs.mkdirSync(localPath, { recursive: true });
        }

        try {
            console.log(`[Process] Scanning directory: ${remotePath}`);
            const list = await client.list(remotePath);
            
            for (const item of list) {
                if (item.name === "." || item.name === "..") continue;
                
                const itemRelative = relativePath ? relativePath + '/' + item.name : item.name;
                const itemRemotePath = '/' + itemRelative;
                const itemLocalPath = path.join(localBackupDir, itemRelative);
                
                if (item.isDirectory) {
                    queue.push({ remotePath: itemRemotePath, retries: 0 });
                } else if (item.isFile) {
                    let fileReused = false;
                    
                    // Incremental Sync Logic
                    if (latestBackupDir) {
                        const previousLocalPath = path.join(latestBackupDir, itemRelative);
                        if (fs.existsSync(previousLocalPath)) {
                            const prevStats = fs.statSync(previousLocalPath);
                            // Compare file size (FTP returns size in item.size)
                            if (prevStats.size === item.size) {
                                try {
                                    // Create a hard link to save space and skip download
                                    fs.linkSync(previousLocalPath, itemLocalPath);
                                    console.log(`[Link] Reused file (Hard Link): ${itemRemotePath}`);
                                    linkedFilesCount++;
                                    fileReused = true;
                                } catch (e) {
                                    console.error(`[Error] Hard link failed for ${itemRemotePath}, falling back to download.`);
                                }
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
        } catch (err) {
            console.error(`[Error] Failed at ${remotePath}: ${err.message}`);
            
            if (retries < 3) {
                console.log(`[Retry] Reconnecting and retrying ${remotePath} (Attempt ${retries + 1}/3)...`);
                try {
                    await connect();
                } catch (connErr) {
                    console.error(`[Error] Reconnection failed: ${connErr.message}`);
                }
                queue.unshift({ remotePath, retries: retries + 1 });
            } else {
                console.error(`[Error] Skipping ${remotePath} after 3 failed attempts.`);
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

backupFtp();
