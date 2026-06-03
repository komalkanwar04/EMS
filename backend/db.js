const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT) || 5432,
});

// Do not attempt an eager connect here — keep the pool lazy so the server
// can start even if the database credentials are misconfigured during dev.
module.exports = pool;