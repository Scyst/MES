const ftp = require("basic-ftp");
const path = require("path");

async function deploy() {
    const client = new ftp.Client();
    client.ftp.verbose = true;
    try {
        await client.access({
            host: "10.0.0.2",
            user: "Naphat",
            password: "O@m11o1toolBox",
            secure: false
        });
        
        console.log("Connected to FTP. Starting upload...");
        
        const files = [
            "page/PE/peTechMobile.php",
            "page/PE/script/peTechModule.js",
            "page/PE/script/workOrderModule.js"
        ];
        
        for (const file of files) {
            const localPath = path.join("e:\\MES\\MES\\MES", file);
            const remotePath = "/MES/MES/" + file.replace(/\\/g, '/');
            console.log(`Uploading ${localPath} to ${remotePath}`);
            await client.uploadFrom(localPath, remotePath);
        }

        console.log("Upload completed successfully!");
    }
    catch(err) {
        console.error("FTP Error:", err);
    }
    client.close();
}

deploy();
