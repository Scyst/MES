import * as ftp from "basic-ftp";

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
        console.log("Connected to FTP server.");
        
        await client.ensureDir("/Toolbox/Planner");
        await client.clearWorkingDir();
        console.log("Uploading files to /Toolbox/Planner...");
        
        await client.uploadFromDir("dist");
        
        console.log("Uploading backend files...");
        await client.ensureDir("api");
        await client.uploadFromDir("api");
        await client.cd("..");
        
        console.log("Deployment to Planner successful!");
    }
    catch(err) {
        console.error("Deployment failed:", err);
    }
    client.close();
}

deploy();
