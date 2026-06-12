const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const fs = require("fs");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT) || 5432,
});

// State-machine CSV parser
function parseCSV(text) {
  const result = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i+1];
    
    if (inQuotes) {
      if (c === '"') {
        if (next === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(field);
        field = "";
      } else if (c === "\n" || c === "\r") {
        row.push(field);
        field = "";
        if (row.length > 1 || (row.length === 1 && row[0] !== "")) {
          result.push(row);
        }
        row = [];
        if (c === "\r" && next === "\n") {
          i++;
        }
      } else {
        field += c;
      }
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    result.push(row);
  }
  return result;
}

function getDepartmentId(pref) {
  const p = (pref || "").toLowerCase();
  if (p.includes("web") || p.includes("react") || p.includes("node") || p.includes("full stack") || p.includes("fullstack")) {
    return 1; // Software Development
  } else if (p.includes("ai") || p.includes("ml") || p.includes("python")) {
    return 1; // Software Development
  } else if (p.includes("qa") || p.includes("test")) {
    return 2; // Quality Assurance
  } else if (p.includes("marketing") || p.includes("seo")) {
    return 5; // Digital Marketing
  } else if (p.includes("sales") || p.includes("business development")) {
    return 6; // Sales
  }
  return 1; // default to Software Development
}

function getWorkingMode(mode) {
  const m = (mode || "").toLowerCase();
  if (m.includes("online") || m.includes("remote")) {
    return "Remote";
  } else if (m.includes("hybrid")) {
    return "Hybrid";
  } else if (m.includes("offline") || m.includes("onsite")) {
    return "Onsite";
  }
  return "Remote";
}

async function runImport() {
  const csvPath = "/Users/komalkanwar/.gemini/antigravity-ide/brain/7544d1c6-54d5-4397-bfd6-c7ef8c14dd33/.system_generated/steps/903/content.md";
  if (!fs.existsSync(csvPath)) {
    console.error("CSV file not found at:", csvPath);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(csvPath, "utf-8");
  
  // Strip metadata lines added by the system to reveal raw CSV starting with headers
  const csvStartIndex = fileContent.indexOf("chat,Full Name");
  if (csvStartIndex === -1) {
    console.error("Invalid CSV structure.");
    process.exit(1);
  }
  const rawCSV = fileContent.substring(csvStartIndex);
  const rows = parseCSV(rawCSV);
  
  if (rows.length < 2) {
    console.log("No data rows found.");
    process.exit(0);
  }

  // Remove header row
  const headers = rows.shift();
  console.log(`Parsed ${rows.length} rows from the sheet.`);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    const defaultPasswordHash = await bcrypt.hash("123456", 10);
    let insertedCount = 0;
    
    for (const row of rows) {
      if (row.length < 4) continue;
      
      const name = (row[1] || "").trim();
      const phone = (row[2] || "").trim();
      const email = (row[3] || "").trim().toLowerCase();
      const domainPref = (row[5] || "").trim();
      const modePref = (row[7] || "").trim();
      let city = (row[8] || "").trim();
      
      if (!name || !email) continue;
      
      // Clean city name (e.g. "Dewas, MP" -> "Dewas")
      if (city.includes(",")) {
        city = city.split(",")[0].trim();
      }
      city = city.replace(/[\r\n\t]/g, "").trim();
      
      // 1. Check if user already exists
      let userRes = await client.query("SELECT id FROM users WHERE email = $1", [email]);
      let userId;
      
      if (userRes.rows.length === 0) {
        const insertUser = await client.query(
          "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id",
          [name, email, defaultPasswordHash, "employee"]
        );
        userId = insertUser.rows[0].id;
      } else {
        userId = userRes.rows[0].id;
      }
      
      // 2. Check if profile already exists
      let profileRes = await client.query("SELECT id FROM employee_profiles WHERE user_id = $1", [userId]);
      let profileId;
      const deptId = getDepartmentId(domainPref);
      const workingMode = getWorkingMode(modePref);
      const designation = domainPref.substring(0, 100);
      const salary = 25000; // default intern stipend/salary
      
      if (profileRes.rows.length === 0) {
        const insertProfile = await client.query(
          `INSERT INTO employee_profiles (user_id, department_id, phone, address, designation, salary, city, working_mode)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
          [userId, deptId, phone, city, designation, salary, city, workingMode]
        );
        profileId = insertProfile.rows[0].id;
      } else {
        profileId = profileRes.rows[0].id;
        // Update contact number, city, and domain for existing employee
        await client.query(
          `UPDATE employee_profiles 
           SET department_id = $1, phone = $2, designation = $3, city = $4, working_mode = $5
           WHERE id = $6`,
          [deptId, phone, designation, city, workingMode, profileId]
        );
      }
      
      // 3. Process attendance columns (02/06/2026, 03/06/2026, 04/06/2026, 05/06/2026, 06/06/2026, 09/06/2026)
      const attDates = [
        { date: "2026-06-02", val: row[10] },
        { date: "2026-06-03", val: row[11] },
        { date: "2026-06-04", val: row[12] },
        { date: "2026-06-05", val: row[14] },
        { date: "2026-06-06", val: row[16] },
        { date: "2026-06-09", val: row[18] }
      ];
      
      for (const att of attDates) {
        if (!att.val) continue;
        const v = att.val.trim().toLowerCase();
        if (v === "p" || v === "present") {
          await client.query(
            `INSERT INTO attendance (employee_id, punch_date, punch_in, punch_out, status, notes)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (employee_id, punch_date) DO UPDATE SET status = 'Present'`,
            [profileId, att.date, `${att.date} 09:00:00`, `${att.date} 18:00:00`, "Present", "Imported from spreadsheet"]
          );
        } else if (v === "a" || v === "absent") {
          await client.query(
            `INSERT INTO attendance (employee_id, punch_date, punch_in, punch_out, status, notes)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (employee_id, punch_date) DO UPDATE SET status = 'Absent'`,
            [profileId, att.date, null, null, "Absent", "Imported from spreadsheet"]
          );
        }
      }
      
      insertedCount++;
    }
    
    await client.query("COMMIT");
    console.log(`Successfully imported and merged ${insertedCount} employee records and attendance details from sheet!`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Seeding/Import from sheet failed:", error);
  } finally {
    client.release();
    pool.end();
  }
}

runImport();
