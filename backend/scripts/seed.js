require("dotenv").config();
const { Pool } = require("pg");
const bcrypt = require("bcrypt");

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT) || 5432,
});

async function runSeed() {
  const client = await pool.connect();
  try {
    console.log("Starting Database Seeding...");
    await client.query("BEGIN");

    // 1. Create tables if not exist (ensuring sync with schema.sql)
    console.log("Creating new tables...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS leave_types (
        id SERIAL PRIMARY KEY,
        leave_name VARCHAR(50) UNIQUE NOT NULL,
        total_days INT NOT NULL
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS leave_balances (
        id SERIAL PRIMARY KEY,
        employee_id INT REFERENCES employee_profiles(id) ON DELETE CASCADE,
        leave_type_id INT REFERENCES leave_types(id) ON DELETE CASCADE,
        available_days INT NOT NULL,
        UNIQUE(employee_id, leave_type_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS leave_applications (
        id SERIAL PRIMARY KEY,
        employee_id INT REFERENCES employee_profiles(id) ON DELETE CASCADE,
        leave_type_id INT REFERENCES leave_types(id) ON DELETE CASCADE,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason TEXT,
        status VARCHAR(50) DEFAULT 'Pending Manager Approval',
        manager_id INT REFERENCES users(id) ON DELETE SET NULL,
        hr_id INT REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS approval_history (
        id SERIAL PRIMARY KEY,
        leave_id INT REFERENCES leave_applications(id) ON DELETE CASCADE,
        approved_by INT REFERENCES users(id) ON DELETE CASCADE,
        action VARCHAR(50) NOT NULL,
        remarks TEXT,
        action_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS recruitment_applications (
        id SERIAL PRIMARY KEY,
        candidate_name VARCHAR(100) NOT NULL,
        candidate_email VARCHAR(100) NOT NULL,
        candidate_phone VARCHAR(20),
        application_type VARCHAR(20) NOT NULL, -- 'Job' or 'Internship'
        department_id INT REFERENCES departments(id) ON DELETE SET NULL,
        designation VARCHAR(100) NOT NULL,
        resume_url TEXT,
        status VARCHAR(50) DEFAULT 'Pending Review',
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS assets (
        id SERIAL PRIMARY KEY,
        asset_code VARCHAR(50) UNIQUE NOT NULL,
        asset_name VARCHAR(200) NOT NULL,
        asset_type VARCHAR(100) NOT NULL,
        purchase_date DATE,
        purchase_cost NUMERIC(12,2),
        status VARCHAR(50) DEFAULT 'Available',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS asset_allocations (
        id SERIAL PRIMARY KEY,
        asset_id INT REFERENCES assets(id) ON DELETE CASCADE,
        employee_id INT REFERENCES employee_profiles(id) ON DELETE CASCADE,
        allocated_by INT REFERENCES users(id) ON DELETE SET NULL,
        allocated_date DATE NOT NULL DEFAULT CURRENT_DATE,
        return_date DATE,
        status VARCHAR(50) DEFAULT 'Active',
        remarks TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS asset_history (
        id SERIAL PRIMARY KEY,
        asset_id INT REFERENCES assets(id) ON DELETE CASCADE,
        action VARCHAR(100) NOT NULL,
        remarks TEXT,
        created_by INT REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Clear all tables to insert fresh dataset in sequence
    console.log("Truncating existing tables...");
    await client.query(`
      TRUNCATE TABLE 
        users, 
        departments, 
        employee_profiles, 
        employee_images, 
        skills, 
        employee_skills, 
        leave_types, 
        leave_balances, 
        leave_applications, 
        approval_history,
        recruitment_applications,
        assets,
        asset_allocations,
        asset_history
      RESTART IDENTITY CASCADE
    `);

    // 3. Insert Departments
    console.log("Seeding departments...");
    const depts = [
      "Software Development",
      "Quality Assurance",
      "Human Resources",
      "Finance",
      "Digital Marketing",
      "Sales",
      "Operations",
      "Technical Support"
    ];
    for (const d of depts) {
      await client.query("INSERT INTO departments(department_name) VALUES($1)", [d]);
    }

    // 4. Insert Users
    console.log("Seeding users...");
    const defaultPasswordHash = await bcrypt.hash("123456", 10);
    const users = [
      // 10 Seeded Users from i-SOFTZONE Technologies Pvt Ltd
      { name: "Pranay Gupta", email: "pranay@isoftzone.com", passwordHash: defaultPasswordHash, role: "admin" },
      { name: "Rahul Sharma", email: "rahul@isoftzone.com", passwordHash: defaultPasswordHash, role: "manager" },
      { name: "Priya Verma", email: "priya@isoftzone.com", passwordHash: defaultPasswordHash, role: "hr" },
      { name: "Amit Patel", email: "amit@isoftzone.com", passwordHash: defaultPasswordHash, role: "employee" },
      { name: "Neha Jain", email: "neha@isoftzone.com", passwordHash: defaultPasswordHash, role: "employee" },
      { name: "Rohit Singh", email: "rohit@isoftzone.com", passwordHash: defaultPasswordHash, role: "employee" },
      { name: "Anjali Gupta", email: "anjali@isoftzone.com", passwordHash: defaultPasswordHash, role: "employee" },
      { name: "Vikas Mehta", email: "vikas@isoftzone.com", passwordHash: defaultPasswordHash, role: "employee" },
      { name: "Pooja Shah", email: "pooja@isoftzone.com", passwordHash: defaultPasswordHash, role: "employee" },
      { name: "Sandeep Kumar", email: "sandeep@isoftzone.com", passwordHash: defaultPasswordHash, role: "employee" },
      
      // 6 Original Users (Komal Kanwar and earlier employees)
      { name: "Komal Kanwar", email: "komal@gmail.com", passwordHash: "$2b$10$RtE84KZ70ONmj2/uaACZt./Tkwlo2awgivqcdwZckL6WCJ5189W/.", role: "admin" },
      { name: "Alice Johnson", email: "alice.johnson@example.com", passwordHash: await bcrypt.hash("secret1", 10), role: "employee" },
      { name: "Bob Smith", email: "bob.smith@example.com", passwordHash: await bcrypt.hash("secret2", 10), role: "manager" },
      { name: "Carol Lee", email: "carol.lee@example.com", passwordHash: await bcrypt.hash("secret3", 10), role: "employee" },
      { name: "David Patel", email: "david.patel@example.com", passwordHash: await bcrypt.hash("secret4", 10), role: "employee" },
      { name: "Eve Martin", email: "eve.martin@example.com", passwordHash: await bcrypt.hash("secret5", 10), role: "employee" }
    ];
    for (const u of users) {
      await client.query(
        "INSERT INTO users(name, email, password, role) VALUES($1, $2, $3, $4)",
        [u.name, u.email, u.passwordHash, u.role]
      );
    }

    // 5. Insert Employee Profiles
    console.log("Seeding employee profiles...");
    const profiles = [
      // 10 Seeded Employees
      { userId: 1, deptId: 1, phone: "9876543210", address: "Indore", designation: "Director", salary: 150000 },
      { userId: 2, deptId: 1, phone: "9876543211", address: "Indore", designation: "Project Manager", salary: 85000 },
      { userId: 3, deptId: 3, phone: "9876543212", address: "Indore", designation: "HR Manager", salary: 70000 },
      { userId: 4, deptId: 1, phone: "9876543213", address: "Indore", designation: "React Developer", salary: 45000 },
      { userId: 5, deptId: 1, phone: "9876543214", address: "Indore", designation: "Node Developer", salary: 50000 },
      { userId: 6, deptId: 2, phone: "9876543215", address: "Indore", designation: "QA Engineer", salary: 40000 },
      { userId: 7, deptId: 5, phone: "9876543216", address: "Indore", designation: "Marketing Executive", salary: 35000 },
      { userId: 8, deptId: 6, phone: "9876543217", address: "Indore", designation: "Sales Executive", salary: 38000 },
      { userId: 9, deptId: 8, phone: "9876543218", address: "Indore", designation: "Support Engineer", salary: 32000 },
      { userId: 10, deptId: 4, phone: "9876543219", address: "Indore", designation: "Accountant", salary: 42000 },
      
      // 6 Original Employees
      { userId: 11, deptId: 1, phone: "9876543200", address: "Indore", designation: "HR Director", salary: 120000 },
      { userId: 12, deptId: 1, phone: "9876543201", address: "Indore", designation: "Frontend Engineer", salary: 65000 },
      { userId: 13, deptId: 3, phone: "9876543202", address: "Indore", designation: "HR Manager", salary: 75000 },
      { userId: 14, deptId: 4, phone: "9876543203", address: "Indore", designation: "Accountant", salary: 58000 },
      { userId: 15, deptId: 5, phone: "9876543204", address: "Indore", designation: "Marketing Lead", salary: 60000 },
      { userId: 16, deptId: 1, phone: "9876543205", address: "Indore", designation: "Fullstack Engineer", salary: 80000 }
    ];
    for (const p of profiles) {
      await client.query(
        `INSERT INTO employee_profiles(user_id, department_id, phone, address, designation, salary)
         VALUES($1, $2, $3, $4, $5, $6)`,
        [p.userId, p.deptId, p.phone, p.address, p.designation, p.salary]
      );
    }

    // 6. Seed employee mock avatars and attachments
    console.log("Seeding mock profile image placeholders and attachments...");
    const avatars = [
      // 10 Seeded Employees
      { empId: 1, url: "https://i.pravatar.cc/150?u=pranay@isoftzone.com", type: "profile", name: "avatar.png" },
      { empId: 2, url: "https://i.pravatar.cc/150?u=rahul@isoftzone.com", type: "profile", name: "avatar.png" },
      { empId: 3, url: "https://i.pravatar.cc/150?u=priya@isoftzone.com", type: "profile", name: "avatar.png" },
      { empId: 4, url: "https://i.pravatar.cc/150?u=amit@isoftzone.com", type: "profile", name: "avatar.png" },
      { empId: 5, url: "https://i.pravatar.cc/150?u=neha@isoftzone.com", type: "profile", name: "avatar.png" },
      { empId: 6, url: "https://i.pravatar.cc/150?u=rohit@isoftzone.com", type: "profile", name: "avatar.png" },
      { empId: 7, url: "https://i.pravatar.cc/150?u=anjali@isoftzone.com", type: "profile", name: "avatar.png" },
      { empId: 8, url: "https://i.pravatar.cc/150?u=vikas@isoftzone.com", type: "profile", name: "avatar.png" },
      { empId: 9, url: "https://i.pravatar.cc/150?u=pooja@isoftzone.com", type: "profile", name: "avatar.png" },
      { empId: 10, url: "https://i.pravatar.cc/150?u=sandeep@isoftzone.com", type: "profile", name: "avatar.png" },
      
      // Komal Kanwar (Profile 11) - Restore physical uploads
      { empId: 11, url: "/uploads/1780553156500-WhatsApp_Image_2026-02-11_at_17.50.26.jpeg", type: "profile", name: "avatar.jpeg" },
      { empId: 11, url: "/uploads/1780553156504-KomalKanwarResume.pdf", type: "resume", name: "KomalKanwarResume.pdf" },
      { empId: 11, url: "/uploads/1780553135771-KomalKanwarResume.pdf", type: "document", name: "KomalKanwarResume_v1.pdf" },
      
      // 5 Original Employees
      { empId: 12, url: "https://i.pravatar.cc/150?u=alice.johnson@example.com", type: "profile", name: "avatar.png" },
      { empId: 13, url: "https://i.pravatar.cc/150?u=bob.smith@example.com", type: "profile", name: "avatar.png" },
      { empId: 14, url: "https://i.pravatar.cc/150?u=carol.lee@example.com", type: "profile", name: "avatar.png" },
      { empId: 15, url: "https://i.pravatar.cc/150?u=david.patel@example.com", type: "profile", name: "avatar.png" },
      { empId: 16, url: "https://i.pravatar.cc/150?u=eve.martin@example.com", type: "profile", name: "avatar.png" }
    ];
    for (const av of avatars) {
      await client.query(
        "INSERT INTO employee_images(employee_id, image_url, file_type, file_name) VALUES($1, $2, $3, $4)",
        [av.empId, av.url, av.type, av.name]
      );
    }

    // 7. Seed Skills
    console.log("Seeding skills...");
    const skills = [
      "React",
      "NodeJS",
      "PostgreSQL",
      "JavaScript",
      "HTML",
      "CSS",
      "MongoDB",
      "Python",
      "Testing",
      "Salesforce"
    ];
    for (const sk of skills) {
      await client.query("INSERT INTO skills(skill_name) VALUES($1)", [sk]);
    }

    // 8. Seed Employee Skills Mapping
    console.log("Seeding employee skills mappings...");
    const empSkills = [
      // 10 Seeded Employees
      { empId: 4, skillId: 1 },
      { empId: 4, skillId: 4 },
      { empId: 4, skillId: 5 },
      
      { empId: 5, skillId: 2 },
      { empId: 5, skillId: 3 },
      { empId: 5, skillId: 4 },
      
      { empId: 6, skillId: 9 },
      
      { empId: 7, skillId: 4 },
      
      { empId: 8, skillId: 10 },
      
      { empId: 9, skillId: 2 },
      { empId: 9, skillId: 3 },
      
      { empId: 10, skillId: 8 },

      // Komal Kanwar
      { empId: 11, skillId: 1 },
      { empId: 11, skillId: 2 },
      { empId: 11, skillId: 4 },
      { empId: 11, skillId: 5 },
      { empId: 11, skillId: 6 },
      
      // Alice Johnson
      { empId: 12, skillId: 1 },
      { empId: 12, skillId: 4 },
      { empId: 12, skillId: 5 },
      { empId: 12, skillId: 6 },
      
      // Bob Smith
      { empId: 13, skillId: 4 },
      { empId: 13, skillId: 5 },
      
      // Carol Lee
      { empId: 14, skillId: 8 },
      { empId: 14, skillId: 9 },
      
      // David Patel
      { empId: 15, skillId: 10 },
      
      // Eve Martin
      { empId: 16, skillId: 1 },
      { empId: 16, skillId: 2 },
      { empId: 16, skillId: 3 },
      { empId: 16, skillId: 4 }
    ];
    for (const es of empSkills) {
      await client.query("INSERT INTO employee_skills(employee_id, skill_id) VALUES($1, $2)", [es.empId, es.skillId]);
    }

    // 9. Seed Leave Types
    console.log("Seeding leave types...");
    const leaveTypes = [
      { name: "Casual Leave", days: 12 },
      { name: "Sick Leave", days: 10 },
      { name: "Earned Leave", days: 15 },
      { name: "Maternity Leave", days: 90 }
    ];
    for (const lt of leaveTypes) {
      await client.query("INSERT INTO leave_types(leave_name, total_days) VALUES($1, $2)", [lt.name, lt.days]);
    }

    // 10. Seed Leave Balances
    console.log("Seeding leave balances...");
    const balances = [
      { empId: 4, typeId: 1, days: 10 },
      { empId: 4, typeId: 2, days: 8 },
      { empId: 5, typeId: 1, days: 12 },
      { empId: 5, typeId: 2, days: 10 },
      { empId: 6, typeId: 1, days: 8 },
      { empId: 6, typeId: 2, days: 6 },
      { empId: 7, typeId: 1, days: 10 },
      { empId: 7, typeId: 2, days: 7 },
      { empId: 8, typeId: 1, days: 12 },
      { empId: 8, typeId: 2, days: 10 }
    ];

    const mappedKeys = new Set();
    for (const b of balances) {
      await client.query(
        "INSERT INTO leave_balances(employee_id, leave_type_id, available_days) VALUES($1, $2, $3)",
        [b.empId, b.typeId, b.days]
      );
      mappedKeys.add(`${b.empId}-${b.typeId}`);
    }

    const allLeaveTypes = [1, 2, 3, 4];
    const defaultDays = { 1: 12, 2: 10, 3: 15, 4: 90 };
    for (let empId = 1; empId <= 16; empId++) {
      for (const typeId of allLeaveTypes) {
        const key = `${empId}-${typeId}`;
        if (!mappedKeys.has(key)) {
          await client.query(
            "INSERT INTO leave_balances(employee_id, leave_type_id, available_days) VALUES($1, $2, $3)",
            [empId, typeId, defaultDays[typeId]]
          );
        }
      }
    }

    // 11. Seed Leave Applications (To match approval history test cases)
    console.log("Seeding leave applications...");
    const leaveApps = [
      // id 1: Amit Patel (empId 4) - Approved
      { empId: 4, typeId: 1, start: "2026-06-10", end: "2026-06-12", reason: "Family event", status: "Approved", mgrId: 2, hrId: 3 },
      // id 2: Neha Jain (empId 5) - Pending Manager Approval
      { empId: 5, typeId: 2, start: "2026-06-15", end: "2026-06-16", reason: "Sick leave", status: "Pending Manager Approval", mgrId: null, hrId: null },
      // id 3: Rohit Singh (empId 6) - Approved
      { empId: 6, typeId: 1, start: "2026-06-20", end: "2026-06-21", reason: "Personal work", status: "Approved", mgrId: 2, hrId: 3 },
      // id 4: Anjali Gupta (empId 7) - Pending HR Approval
      { empId: 7, typeId: 2, start: "2026-06-25", end: "2026-06-26", reason: "Health checkup", status: "Pending HR Approval", mgrId: 2, hrId: null },
      // id 5: Vikas Mehta (empId 8) - Rejected by Manager
      { empId: 8, typeId: 3, start: "2026-07-01", end: "2026-07-05", reason: "Vacation", status: "Rejected by Manager", mgrId: 2, hrId: null }
    ];

    for (const app of leaveApps) {
      await client.query(
        `INSERT INTO leave_applications (employee_id, leave_type_id, start_date, end_date, reason, status, manager_id, hr_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [app.empId, app.typeId, app.start, app.end, app.reason, app.status, app.mgrId, app.hrId]
      );
    }

    // 12. Seed Approval History (Matching user's slide specification)
    console.log("Seeding approval history logs...");
    const approvalLogs = [
      { leaveId: 1, approvedBy: 2, action: "Approved", remarks: "Manager Approved" },
      { leaveId: 1, approvedBy: 3, action: "Approved", remarks: "HR Approved" },
      { leaveId: 3, approvedBy: 2, action: "Approved", remarks: "Manager Approved" },
      { leaveId: 3, approvedBy: 3, action: "Approved", remarks: "HR Approved" },
      { leaveId: 5, approvedBy: 2, action: "Rejected", remarks: "Insufficient Reason" }
    ];

    for (const log of approvalLogs) {
      await client.query(
        `INSERT INTO approval_history (leave_id, approved_by, action, remarks)
         VALUES ($1, $2, $3, $4)`,
        [log.leaveId, log.approvedBy, log.action, log.remarks]
      );
    }

    // 13. Seed Recruitment Applications
    console.log("Seeding job and internship applications...");
    const recruitments = [
      { name: "Aarav Mehta", email: "aarav.mehta@gmail.com", phone: "9876543230", type: "Job", deptId: 1, designation: "React Developer", status: "Pending Review", resume: "/uploads/aarav_resume.pdf" },
      { name: "Ishaan Sharma", email: "ishaan.sharma@gmail.com", phone: "9876543231", type: "Job", deptId: 1, designation: "Node Developer", status: "Shortlisted", resume: "/uploads/ishaan_resume.pdf" },
      { name: "Ananya Sen", email: "ananya.sen@gmail.com", phone: "9876543232", type: "Internship", deptId: 5, designation: "SEO Intern", status: "Pending Review", resume: "/uploads/ananya_resume.pdf" },
      { name: "Kabir Malhotra", email: "kabir.malhotra@gmail.com", phone: "9876543233", type: "Internship", deptId: 2, designation: "QA Intern", status: "Rejected", resume: "/uploads/kabir_resume.pdf" },
      { name: "Meera Nair", email: "meera.nair@gmail.com", phone: "9876543234", type: "Job", deptId: 3, designation: "HR Recruiter", status: "Hired", resume: "/uploads/meera_resume.pdf" }
    ];

    for (const r of recruitments) {
      await client.query(
        `INSERT INTO recruitment_applications (candidate_name, candidate_email, candidate_phone, application_type, department_id, designation, resume_url, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [r.name, r.email, r.phone, r.type, r.deptId, r.designation, r.resume, r.status]
      );
    }

    // 14. Seed Assets & Asset Allocations/History
    console.log("Seeding assets...");
    const assetsSeed = [
      { code: "LAP-001", name: "MacBook Pro M3 Max", type: "Laptop", purchase_date: "2025-01-15", cost: 2499.00, status: "Allocated" },
      { code: "LAP-002", name: "Dell XPS 15", type: "Laptop", purchase_date: "2025-03-10", cost: 1899.00, status: "Available" },
      { code: "MOU-001", name: "Logitech MX Master 3S", type: "Mouse", purchase_date: "2025-01-20", cost: 99.00, status: "Allocated" },
      { code: "MON-001", name: "LG UltraFine 27\" 4K", type: "Monitor", purchase_date: "2024-11-05", cost: 499.00, status: "Available" },
      { code: "IDC-001", name: "Employee ID Card", type: "ID Card", purchase_date: "2026-06-01", cost: 15.00, status: "Available" },
      { code: "ACC-001", name: "High-Security Access Badge", type: "Access Card", purchase_date: "2026-06-01", cost: 25.00, status: "Allocated" },
      { code: "LIC-001", name: "Adobe Creative Cloud Annual", type: "Software Licenses", purchase_date: "2026-01-10", cost: 599.00, status: "Allocated" }
    ];

    const insertedAssets = [];
    for (const asset of assetsSeed) {
      const res = await client.query(
        `INSERT INTO assets (asset_code, asset_name, asset_type, purchase_date, purchase_cost, status)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [asset.code, asset.name, asset.type, asset.purchase_date, asset.cost, asset.status]
      );
      insertedAssets.push({ id: res.rows[0].id, ...asset });
    }

    // Seed allocations for some of them
    console.log("Seeding asset allocations & history...");
    
    // Allocate LAP-001 to Vikas Mehta (employee_profiles id = 8, matching userId = 8)
    // allocated_by = 1 (Pranay Gupta, admin user)
    const laptopId = insertedAssets.find(a => a.code === "LAP-001").id;
    await client.query(
      `INSERT INTO asset_allocations (asset_id, employee_id, allocated_by, allocated_date, status, remarks)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [laptopId, 8, 1, "2026-06-02", "Active", "Assigned for remote development role"]
    );
    await client.query(
      `INSERT INTO asset_history (asset_id, action, remarks, created_by)
       VALUES ($1, $2, $3, $4)`,
      [laptopId, "Created", "Asset added to inventory during seeding", 1]
    );
    await client.query(
      `INSERT INTO asset_history (asset_id, action, remarks, created_by)
       VALUES ($1, $2, $3, $4)`,
      [laptopId, "Allocated", "Allocated to Vikas Mehta", 1]
    );

    // Allocate MOU-001 to Vikas Mehta
    const mouseId = insertedAssets.find(a => a.code === "MOU-001").id;
    await client.query(
      `INSERT INTO asset_allocations (asset_id, employee_id, allocated_by, allocated_date, status, remarks)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [mouseId, 8, 1, "2026-06-02", "Active", "Logitech Mouse assigned"]
    );
    await client.query(
      `INSERT INTO asset_history (asset_id, action, remarks, created_by)
       VALUES ($1, $2, $3, $4)`,
      [mouseId, "Created", "Asset added to inventory during seeding", 1]
    );
    await client.query(
      `INSERT INTO asset_history (asset_id, action, remarks, created_by)
       VALUES ($1, $2, $3, $4)`,
      [mouseId, "Allocated", "Allocated to Vikas Mehta", 1]
    );

    // Allocate ACC-001 to Amit Patel (employee_id = 4)
    const cardId = insertedAssets.find(a => a.code === "ACC-001").id;
    await client.query(
      `INSERT INTO asset_allocations (asset_id, employee_id, allocated_by, allocated_date, status, remarks)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [cardId, 4, 1, "2026-06-05", "Active", "Office access card"]
    );
    await client.query(
      `INSERT INTO asset_history (asset_id, action, remarks, created_by)
       VALUES ($1, $2, $3, $4)`,
      [cardId, "Created", "Asset added to inventory during seeding", 1]
    );
    await client.query(
      `INSERT INTO asset_history (asset_id, action, remarks, created_by)
       VALUES ($1, $2, $3, $4)`,
      [cardId, "Allocated", "Allocated to Amit Patel", 1]
    );

    // Allocate LIC-001 to Amit Patel
    const licenseId = insertedAssets.find(a => a.code === "LIC-001").id;
    await client.query(
      `INSERT INTO asset_allocations (asset_id, employee_id, allocated_by, allocated_date, status, remarks)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [licenseId, 4, 1, "2026-06-06", "Active", "Creative cloud license"]
    );
    await client.query(
      `INSERT INTO asset_history (asset_id, action, remarks, created_by)
       VALUES ($1, $2, $3, $4)`,
      [licenseId, "Created", "Asset added to inventory during seeding", 1]
    );
    await client.query(
      `INSERT INTO asset_history (asset_id, action, remarks, created_by)
       VALUES ($1, $2, $3, $4)`,
      [licenseId, "Allocated", "Allocated to Amit Patel", 1]
    );

    // Add history for other non-allocated assets
    for (const a of insertedAssets) {
      if (a.status === "Available") {
        await client.query(
          `INSERT INTO asset_history (asset_id, action, remarks, created_by)
           VALUES ($1, $2, $3, $4)`,
          [a.id, "Created", "Asset added to inventory during seeding", 1]
        );
      }
    }

    await client.query("COMMIT");
    console.log("Database Seeding Completed Successfully!");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Database Seeding Failed:", error);
  } finally {
    client.release();
    pool.end();
  }
}

runSeed();
