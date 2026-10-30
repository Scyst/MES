const ftp = require('basic-ftp');
const path = require('path');

async function uploadDir() {
    const client = new ftp.Client();
    client.ftp.verbose = true;
    try {
        await client.access({
            host: process.env.FTP_HOST || "",
            user: process.env.FTP_USER || "",
            password: process.env.FTP_PASS || "",
            secure: false
        });
        
        console.log("Connected to FTP");
        const localDir = path.join(__dirname, 'dist');
        const remoteDir = '/Toolbox'; 
        
        await client.ensureDir(remoteDir);
        await client.uploadFromDir(localDir, remoteDir);
        console.log("Upload completed");
    } catch(err) {
        console.error(err);
    }
    client.close();
}

uploadDir();
