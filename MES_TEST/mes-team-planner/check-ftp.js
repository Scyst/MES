import * as ftp from "basic-ftp";
import * as fs from "fs";

async function checkFile() {
    const client = new ftp.Client();
    try {
        await client.access({
            host: "10.0.0.2",
            user: "Naphat",
            password: "O@m11o1toolBox",
            secure: false
        });
        await client.downloadTo("remote_app.html", "/Toolbox2/app.html");
        console.log("Downloaded app.html successfully.");
        console.log(fs.readFileSync("remote_app.html", "utf-8"));
    }
    catch(err) {
        console.error("Failed:", err);
    }
    client.close();
}

checkFile();
