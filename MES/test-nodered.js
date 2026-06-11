const http = require('http');

const options = {
  hostname: '10.1.68.100',
  port: 1886,
  path: '/flows',
  method: 'GET',
  headers: {
    // If auth is required, we need a token.
    // The user provided admin:oem2022. I might need to hit /auth/token first.
  }
};

const req = http.request(options, res => {
  console.log(`STATUS: ${res.statusCode}`);
  res.on('data', d => process.stdout.write(d));
});

req.on('error', error => {
  console.error(error);
});

req.end();
