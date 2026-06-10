// check_employees.js
// Simple script to count employee records in the database.

require('dotenv').config();
const pool = require('../backend/db'); // adjust path if needed

(async () => {
  try {
    const res = await pool.query('SELECT COUNT(*) AS total FROM employee_profiles');
    console.log(`Total employee profiles: ${res.rows[0].total}`);
  } catch (err) {
    console.error('Error fetching employee count:', err);
  } finally {
    process.exit(0);
  }
})();
