import * as ftp from "basic-ftp";
import * as fs from "fs";

async function checkHtaccess() {
    const client = new ftp.Client();
    try {
        await client.access({
            host: "10.0.0.2",
            user: "Naphat",
            password: "O@m11o1toolBox",
            secure: false
        });
        await client.downloadTo("remote_htaccess.txt", "/.htaccess");
        console.log("Downloaded .htaccess successfully.");
    }
    catch(err) {
        console.error("Failed:", err);
    }
    client.close();
}

checkHtaccess();
