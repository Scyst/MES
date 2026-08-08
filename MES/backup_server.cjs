const ftp = require('basic-ftp');
const path = require('path');
const fs = require('fs');

async function backupFtp() {
    const client = new ftp.Client();
    
    // Create timestamped backup folder
    const now = new Date();
    // Use local time for timestamp formatting
    const timestamp = now.getFullYear() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0') + '_' +
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0');
        
    const localBackupDir = path.join('E:', 'MES', 'Backups', `FullServer_${timestamp}`);
    
    if (!fs.existsSync(localBackupDir)) {
        fs.mkdirSync(localBackupDir, { recursive: true });
    }

    try {
        console.log(`Connecting to FTP 10.0.0.2...`);
        await client.access({
            host: "10.0.0.2",
            user: "Naphat",
            password: "O@m11o1toolBox",
            secure: false
        });
        
        console.log(`Connected. Starting backup of ALL modules (/) to ${localBackupDir}`);
        await client.downloadToDir(localBackupDir, '/');
        console.log(`FTP Backup completed successfully to ${localBackupDir}`);
    } catch(err) {
        console.error("FTP Backup failed:", err);
    }
    client.close();
}

backupFtp();
