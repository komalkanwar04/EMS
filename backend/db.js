const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT) || 5432,
  max: 100 // increased for large seed operations
});

// Run simple database check/migration
const runMigration = async () => {
  try {
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp VARCHAR(10);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp_expiry TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS biometric_credential_id TEXT;

      CREATE TABLE IF NOT EXISTS smtp_settings (
        id INT PRIMARY KEY DEFAULT 1,
        host VARCHAR(255),
        port INT,
        secure BOOLEAN DEFAULT FALSE,
        username VARCHAR(255),
        password VARCHAR(255),
        from_email VARCHAR(255),
        is_enabled BOOLEAN DEFAULT FALSE,
        CONSTRAINT check_id CHECK (id = 1)
      );

      INSERT INTO smtp_settings (id, host, port, secure, username, password, from_email, is_enabled)
      VALUES (1, '', 587, false, '', '', '', false)
      ON CONFLICT DO NOTHING;

      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        employee_id INT REFERENCES employee_profiles(id) ON DELETE CASCADE,
        punch_date DATE NOT NULL,
        punch_in TIMESTAMP,
        punch_out TIMESTAMP,
        status VARCHAR(50) DEFAULT 'Present',
        notes TEXT,
        UNIQUE(employee_id, punch_date)
      );
    `);
    console.log("[Database] Schema recovery columns, SMTP & Attendance tables verified successfully");
  } catch (error) {
    console.error("[Database] Error running migration queries:", error.message);
  }
};

runMigration();

// Do not attempt an eager connect here — keep the pool lazy so the server
// can start even if the database credentials are misconfigured during dev.
module.exports = pool;