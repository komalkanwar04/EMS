// seed_employees.js
// Script to generate 500 employee users and profiles for testing purposes.
// Run with: node scripts/seed_employees.js

require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../backend/db'); // adjust path if needed
const { faker } = require('@faker-js/faker'); // updated faker import

const TOTAL = 100; // adjusted to 100 employees for now
const DEFAULT_PASSWORD = 'Welcome@123';

async function createEmployee(i, client) {
  const name = faker.person.fullName();
  const email = faker.internet.email({ firstName: name.split(' ')[0], lastName: name.split(' ')[1] });
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const role = 'employee';

  // Insert into users table
  const userRes = await client.query(`INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id`,
    [name, email, passwordHash, role]
  );
  const userId = userRes.rows[0].id;

  // Randomly assign a department (assumes departments table already has data)
  const deptRes = await client.query('SELECT id FROM departments ORDER BY random() LIMIT 1');
  const departmentId = deptRes.rows[0].id;

  const phone = faker.phone.number().replace(/\D/g, '').slice(0,20);
  const address = faker.location.streetAddress();
  const designation = faker.person.jobTitle();
  const salary = Math.floor(Math.random() * 40000) + 30000; // 30k-70k

  // Insert employee profile
  const profileRes = await client.query(`INSERT INTO employee_profiles (user_id, department_id, phone, address, designation, salary) 
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [userId, departmentId, phone, address, designation, salary]
  );
  const profileId = profileRes.rows[0].id;

  // Insert a default avatar image (using a placeholder service)
  const avatarUrl = `https://i.pravatar.cc/150?u=${encodeURIComponent(email)}`;
  await client.query(`INSERT INTO employee_images (employee_id, image_url, file_type, file_name) VALUES ($1, $2, $3, $4)`,
    [profileId, avatarUrl, 'profile', 'avatar.png']
  );

  // Insert default leave balances for each leave type (assumes leave_types table exists with ids 1-4)
  const leaveTypes = [1, 2, 3, 4];
  const leaveDays = { 1: 12, 2: 10, 3: 15, 4: 90 };
  for (const lt of leaveTypes) {
    await client.query(`INSERT INTO leave_balances (employee_id, leave_type_id, available_days) VALUES ($1, $2, $3)`,
      [profileId, lt, leaveDays[lt]]
    );
  }

  console.log(`Created employee ${i + 1}/${TOTAL}: ${name} <${email}>`);
}

async function main() {
  const BATCH_SIZE = 100;
  console.log('Seeding', TOTAL, 'employees in batches of', BATCH_SIZE, '...');
  for (let offset = 0; offset < TOTAL; offset += BATCH_SIZE) {
    const batchEnd = Math.min(offset + BATCH_SIZE, TOTAL);
    const client = await pool.connect();
    try {
      // Ensure required leave types exist
      await client.query(`
        INSERT INTO leave_types (leave_name, total_days) VALUES
          ('Annual', 12),
          ('Sick', 10),
          ('Casual', 15),
          ('Maternity', 90)
        ON CONFLICT (leave_name) DO NOTHING;
      `);
      for (let i = offset; i < batchEnd; i++) {
        try {
          await createEmployee(i, client);
        } catch (err) {
          console.error('Error creating employee', i + 1, err);
        }
      }
    } finally {
      client.release();
    }
  }
  console.log('Seeding complete.');
  process.exit(0);
}

main();
