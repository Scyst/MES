const ftp = require('basic-ftp');
const path = require('path');

async function uploadDir() {
    const client = new ftp.Client();
    client.ftp.verbose = true;
    try {
        await client.access({
            host: "10.0.0.2",
            user: "Naphat",
            password: "O@m11o1toolBox",
            secure: false
        });
        
        console.log("Connected to FTP");
        const localDir = path.join('E:', 'MES', 'MES', 'MES', 'mes-v2', 'dist');
        const remoteDir = '/Toolbox2'; 
        
        await client.ensureDir(remoteDir);
        await client.uploadFromDir(localDir, remoteDir);
        console.log("Upload completed");
    } catch(err) {
        console.error(err);
    }
    client.close();
}

uploadDir();
