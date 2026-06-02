import sql from 'mssql';

const sqlConfig = {
  user: process.env.MSSQL_USER || '',
  password: process.env.MSSQL_PASSWORD || '',
  database: process.env.MSSQL_DATABASE || '',
  server: process.env.MSSQL_SERVER || 'localhost',
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  options: {
    encrypt: false, // for local dev / unencrypted SSMS
    trustServerCertificate: true // change to false for prod if you have valid certs
  }
};

let poolPromise: Promise<sql.ConnectionPool>;

if (typeof window === 'undefined') {
  // Ensure we only create the pool once in development (hot reload)
  const globalAny: any = global;
  if (!globalAny.__dbPoolPromise) {
    globalAny.__dbPoolPromise = new sql.ConnectionPool(sqlConfig)
      .connect()
      .then(pool => {
        console.log('Connected to MSSQL');
        return pool;
      })
      .catch(err => {
        console.error('Database Connection Failed! Bad Config: ', err);
        throw err;
      });
  }
  poolPromise = globalAny.__dbPoolPromise;
} else {
  // Dummy promise for client side just in case (should not be called on client)
  poolPromise = Promise.reject('Cannot connect to DB from client side');
}

export async function getDbConnection() {
  return await poolPromise;
}
