const http = require('http');
const https = require('https');
const qs = require('querystring');

// Target URLs
const loginUrl = 'https://oem.sncformer.com/iot-toolbox/sandbox-b9/MES/MES/auth/login.php';
const dataUrl = 'https://oem.sncformer.com/iot-toolbox/sandbox-b9/MES/MES/page/QMS/api/qms_data.php?action=list';

async function testBackend() {
    console.log("1. Starting Backend QA Test...");
    
    // Step 1: Login
    const postData = JSON.stringify({
        username: 'verymaron01',
        password: 'numthong01'
    });

    const loginOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const cookie = await new Promise((resolve, reject) => {
        const req = https.request(loginUrl, loginOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const cookies = res.headers['set-cookie'];
                console.log("Login Response Body:", data);
                if (cookies && cookies.length > 0) {
                    const sessionCookie = cookies.find(c => c.startsWith('PHPSESSID='));
                    resolve(sessionCookie ? sessionCookie.split(';')[0] : null);
                } else {
                    console.log("No cookie returned.");
                    resolve(null);
                }
            });
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
    });

    if (!cookie) {
        console.error("Failed to retrieve session cookie.");
        return;
    }
    console.log("2. Login successful. Acquired Cookie:", cookie);

    // Step 2: Fetch QMS Data
    console.log("3. Fetching QMS Data...");
    const dataOptions = {
        method: 'GET',
        headers: {
            'Cookie': cookie
        }
    };

    await new Promise((resolve, reject) => {
        const req = https.request(dataUrl, dataOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`4. API Response Status: ${res.statusCode}`);
                if (res.statusCode === 200) {
                    try {
                        const json = JSON.parse(data);
                        console.log("5. JSON Parsed Successfully.");
                        console.log(`   - Success: ${json.success}`);
                        console.log(`   - Message: ${json.message}`);
                        console.log(`   - Data List Count: ${json.data && json.data.list ? json.data.list.length : 0}`);
                        if (json.data && json.data.stats) {
                            console.log(`   - Stats Total: ${json.data.stats.total}`);
                        }
                    } catch (e) {
                        console.log("Failed to parse JSON. Raw Data:", data.substring(0, 200) + '...');
                    }
                } else {
                    console.log("API returned error:", data);
                }
                resolve();
            });
        });
        req.on('error', reject);
        req.end();
    });
}

testBackend().catch(console.error);
