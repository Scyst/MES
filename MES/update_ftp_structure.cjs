const ftp = require('basic-ftp');
const fs = require('fs');
const path = require('path');

const FTP_CONFIG = {
    host: "10.0.0.2",
    user: "Naphat",
    password: "O@m11o1toolBox",
    secure: false
};

const OUTPUT_FILE = path.join('E:', 'MES', 'MES', 'MES', '.agents', 'ftp_structure.md');

async function updateFtpStructure() {
    console.log(`Starting FTP structure update...`);
    let client = new ftp.Client();
    
    async function connect() {
        if (!client.closed) client.close();
        client = new ftp.Client();
        await client.access(FTP_CONFIG);
    }
    
    try { 
        await connect(); 
    } catch (err) {
        console.error("FTP connection failed:", err);
        return;
    }

    const queue = [{ remotePath: '/', retries: 0 }];
    const tree = [];
    
    while (queue.length > 0) {
        const { remotePath, retries } = queue.shift();
        try {
            console.log(`[Scan] ${remotePath}`);
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
            console.error(`[Error] at ${remotePath}: ${err.message}`);
            if (retries < 3) {
                try { await connect(); } catch (e) {}
                queue.unshift({ remotePath, retries: retries + 1 });
            }
        }
    }
    
    if (!client.closed) client.close();
    
    // Sort tree alphabetically for better readability
    tree.sort();
    
    // Generate markdown
    const mdContent = `# FTP Directory Structure List (Total: ${tree.length} Directories)

*Last Updated: ${new Date().toLocaleString()}*

Here is the complete list of all directories on the FTP server.

\`\`\`text
${tree.join('\n')}
\`\`\`
`;
    
    fs.writeFileSync(OUTPUT_FILE, mdContent, 'utf8');
    console.log(`FTP Structure updated successfully at ${OUTPUT_FILE}`);
}

updateFtpStructure();
