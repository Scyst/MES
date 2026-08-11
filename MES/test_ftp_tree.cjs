const ftp = require('basic-ftp');

const FTP_CONFIG = {
    host: "10.0.0.2",
    user: "Naphat",
    password: "O@m11o1toolBox",
    secure: false
};

async function listFtpTree() {
    console.log(`Starting FTP tree traversal test...`);
    
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
    const tree = [];
    
    while (queue.length > 0) {
        const { remotePath, retries } = queue.shift();
        
        try {
            console.log(`[Scan] Scanning directory: ${remotePath}`);
            tree.push(remotePath);
            const list = await client.list(remotePath);
            
            for (const item of list) {
                if (item.name === "." || item.name === "..") continue;
                
                const itemRemotePath = remotePath.endsWith('/') ? remotePath + item.name : remotePath + '/' + item.name;
                
                if (item.isDirectory) {
                    queue.push({ remotePath: itemRemotePath, retries: 0 });
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
    
    console.log(`\n--- FTP Traversal Completed ---`);
    console.log(`Total directories found: ${tree.length}`);
}

listFtpTree();
