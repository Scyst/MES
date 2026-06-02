const sql = require('mssql');

const config = {
  user: 'TOOLBOX',
  password: 'I1o1@T@#1boX',
  server: '10.1.1.31',
  database: 'IIOT_TOOLBOX',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function test() {
  try {
    console.log('Connecting with user:', config.user, 'server:', config.server);
    const pool = await sql.connect(config);
    console.log('Success!');
    process.exit(0);
  } catch (err) {
    console.error('Failed:', err.message);
    process.exit(1);
  }
}
test();
