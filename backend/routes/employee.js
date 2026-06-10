const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwtkey";
const uploadFolder = path.join(__dirname, "../uploads");
fs.mkdirSync(uploadFolder, { recursive: true });

// Multer storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadFolder),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

// Configure upload fields
const upload = multer({ storage }).fields([
  { name: "profileImage", maxCount: 1 },
  { name: "resume", maxCount: 1 },
  { name: "documents", maxCount: 10 }
]);

// JWT Authentication Middleware
const requireAuth = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Middleware to block edit actions for users with role 'employee'
const restrictEdit = (req, res, next) => {
  if (req.user && req.user.role && req.user.role.toLowerCase() === "employee") {
    return res.status(403).json({ message: "Employees are not authorized to modify this resource" });
  }
  next();
};

// Forbid plain 'employee' role from mutating masters or employee records
const forbidEmployee = (req, res, next) => {
  const role = (req.user?.role || "").toLowerCase();
  if (role === "employee") {
    return res.status(403).json({ message: "Access denied." });
  }
  return next();
};

const parseSkillIds = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((id) => Number(id)).filter(Boolean);
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((id) => Number(id)).filter(Boolean);
    }
  } catch (error) {
    // ignore
  }
  return value
    .toString()
    .split(",")
    .map((id) => Number(id.trim()))
    .filter(Boolean);
};

// -------------------------------------------------------------
// DEPARTMENT CRUD ENDPOINTS
// -------------------------------------------------------------
router.get("/departments", requireAuth, async (req, res) => {
  try {
    const result = await pool.query("SELECT id, department_name FROM departments ORDER BY id ASC");
    res.json({ departments: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load departments" });
  }
});

router.post("/departments", requireAuth, restrictEdit, async (req, res) => {
  try {
    const { department_name } = req.body;
    if (!department_name || !department_name.trim()) {
      return res.status(400).json({ message: "Department name is required" });
    }
    const checkExist = await pool.query("SELECT * FROM departments WHERE department_name = $1", [department_name.trim()]);
    if (checkExist.rows.length > 0) {
      return res.status(400).json({ message: "Department already exists" });
    }
    const result = await pool.query("INSERT INTO departments(department_name) VALUES($1) RETURNING *", [department_name.trim()]);
    res.status(201).json({ message: "Department created", department: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to create department" });
  }
});

router.put("/departments/:id", requireAuth, restrictEdit, async (req, res) => {
  try {
    const { department_name } = req.body;
    const { id } = req.params;
    if (!department_name || !department_name.trim()) {
      return res.status(400).json({ message: "Department name is required" });
    }
    const result = await pool.query("UPDATE departments SET department_name = $1 WHERE id = $2 RETURNING *", [department_name.trim(), id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Department not found" });
    }
    res.json({ message: "Department updated", department: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to update department" });
  }
});

router.delete("/departments/:id", requireAuth, restrictEdit, async (req, res) => {
  try {
    const { id } = req.params;
    // Set all employees under this department to NULL department first
    await pool.query("UPDATE employee_profiles SET department_id = NULL WHERE department_id = $1", [id]);
    const result = await pool.query("DELETE FROM departments WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Department not found" });
    }
    res.json({ message: "Department deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to delete department" });
  }
});

// -------------------------------------------------------------
// SKILLS CRUD ENDPOINTS
// -------------------------------------------------------------
router.get("/skills", requireAuth, async (req, res) => {
  try {
    const result = await pool.query("SELECT id, skill_name FROM skills ORDER BY id ASC");
    res.json({ skills: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load skills" });
  }
});

router.post("/skills", requireAuth, restrictEdit, async (req, res) => {
  try {
    const { skill_name } = req.body;
    if (!skill_name || !skill_name.trim()) {
      return res.status(400).json({ message: "Skill name is required" });
    }
    const checkExist = await pool.query("SELECT * FROM skills WHERE skill_name = $1", [skill_name.trim()]);
    if (checkExist.rows.length > 0) {
      return res.status(400).json({ message: "Skill already exists" });
    }
    const result = await pool.query("INSERT INTO skills(skill_name) VALUES($1) RETURNING *", [skill_name.trim()]);
    res.status(201).json({ message: "Skill created", skill: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to create skill" });
  }
});

router.put("/skills/:id", requireAuth, restrictEdit, async (req, res) => {
  try {
    const { skill_name } = req.body;
    const { id } = req.params;
    if (!skill_name || !skill_name.trim()) {
      return res.status(400).json({ message: "Skill name is required" });
    }
    const result = await pool.query("UPDATE skills SET skill_name = $1 WHERE id = $2 RETURNING *", [skill_name.trim(), id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Skill not found" });
    }
    res.json({ message: "Skill updated", skill: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to update skill" });
  }
});

router.delete("/skills/:id", requireAuth, restrictEdit, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM skills WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Skill not found" });
    }
    res.json({ message: "Skill deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to delete skill" });
  }
});

// -------------------------------------------------------------
// EMPLOYEE CRUD OPERATIONS
// -------------------------------------------------------------

// Helper to remove physical files
const deletePhysicalFiles = (imageUrls) => {
  imageUrls.forEach((url) => {
    if (url && url.startsWith("/uploads/")) {
      const fileName = url.replace("/uploads/", "");
      const fullPath = path.join(uploadFolder, fileName);
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
        } catch (e) {
          console.error("Error deleting file", fullPath, e.message);
        }
      }
    }
  });
};

// CREATE Employee
router.post("/profiles", requireAuth, restrictEdit, (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error(err);
      return res.status(400).json({ message: err.message || "File upload failed" });
    }

    const { name, email, password, departmentId, phone, address, designation, salary, skillIds } = req.body;
    const department_id = Number(departmentId) || null;
    const skills = parseSkillIds(skillIds);

    if (!name || !email || !designation || !department_id) {
      return res.status(400).json({ message: "Name, email, department and designation are required" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Check if user already exists
      const userCheck = await client.query("SELECT id FROM users WHERE email = $1", [email]);
      let userId;

      if (userCheck.rows.length > 0) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      // Create new user for the employee
      const defaultPass = password || "Welcome@123";
      const hashedPassword = await bcrypt.hash(defaultPass, 10);
      const userResult = await client.query(
        "INSERT INTO users(name, email, password, role) VALUES($1, $2, $3, $4) RETURNING id",
        [name, email, hashedPassword, "employee"]
      );
      userId = userResult.rows[0].id;

      // Create employee profile
      const profileResult = await client.query(
        `INSERT INTO employee_profiles(user_id, department_id, phone, address, designation, salary)
         VALUES($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [userId, department_id, phone || null, address || null, designation, salary || null]
      );
      const employeeId = profileResult.rows[0].id;

      // Insert file uploads categorized
      const insertImagePromise = (file, type) => {
        const url = `/uploads/${file.filename}`;
        return client.query(
          "INSERT INTO employee_images(employee_id, image_url, file_type, file_name) VALUES($1, $2, $3, $4)",
          [employeeId, url, type, file.originalname]
        );
      };

      if (req.files) {
        const promises = [];
        if (req.files.profileImage && req.files.profileImage.length > 0) {
          promises.push(insertImagePromise(req.files.profileImage[0], "profile"));
        }
        if (req.files.resume && req.files.resume.length > 0) {
          promises.push(insertImagePromise(req.files.resume[0], "resume"));
        }
        if (req.files.documents && req.files.documents.length > 0) {
          req.files.documents.forEach((file) => {
            promises.push(insertImagePromise(file, "document"));
          });
        }
        await Promise.all(promises);
      }

      // Insert skills mapping
      if (skills.length > 0) {
        const uniqueSkillIds = [...new Set(skills)];
        const skillPromises = uniqueSkillIds.map((skillId) =>
          client.query(
            "INSERT INTO employee_skills(employee_id, skill_id) VALUES($1, $2)",
            [employeeId, skillId]
          )
        );
        await Promise.all(skillPromises);
      }

      await client.query("COMMIT");
      res.status(201).json({ message: "Employee profile created", profileId: employeeId });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error(error);
      res.status(500).json({ message: "Unable to create employee profile" });
    } finally {
      client.release();
    }
  });
});

// GET all profiles (with full user JOINs and categorization)
router.get("/profiles", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         ep.id,
         u.id AS user_id,
         u.name AS user_name,
         u.email AS user_email,
         d.id AS department_id,
         d.department_name,
         ep.phone,
         ep.address,
         ep.designation,
         ep.salary,
         ep.created_at,
         COALESCE(JSON_AGG(DISTINCT JSONB_BUILD_OBJECT('id', s.id, 'skill_name', s.skill_name)) FILTER (WHERE s.id IS NOT NULL), '[]') AS skills,
         COALESCE(JSON_AGG(DISTINCT JSONB_BUILD_OBJECT('id', ei.id, 'image_url', ei.image_url, 'file_type', ei.file_type, 'file_name', ei.file_name)) FILTER (WHERE ei.id IS NOT NULL), '[]') AS images
       FROM employee_profiles ep
       JOIN users u ON ep.user_id = u.id
       LEFT JOIN departments d ON ep.department_id = d.id
       LEFT JOIN employee_skills esk ON ep.id = esk.employee_id
       LEFT JOIN skills s ON esk.skill_id = s.id
       LEFT JOIN employee_images ei ON ep.id = ei.employee_id
       GROUP BY ep.id, u.id, d.id, d.department_name
       ORDER BY ep.created_at DESC`
    );
    res.json({ profiles: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load employee profiles" });
  }
});

// Alias endpoint for employee list (legacy support)
router.get("/list", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         ep.id,
         u.id AS user_id,
         u.name AS user_name,
         u.email AS user_email,
         d.id AS department_id,
         d.department_name,
         ep.phone,
         ep.address,
         ep.designation,
         ep.salary,
         ep.created_at,
         COALESCE(JSON_AGG(DISTINCT JSONB_BUILD_OBJECT('id', s.id, 'skill_name', s.skill_name)) FILTER (WHERE s.id IS NOT NULL), '[]') AS skills,
         COALESCE(JSON_AGG(DISTINCT JSONB_BUILD_OBJECT('id', ei.id, 'image_url', ei.image_url, 'file_type', ei.file_type, 'file_name', ei.file_name)) FILTER (WHERE ei.id IS NOT NULL), '[]') AS images
       FROM employee_profiles ep
       JOIN users u ON ep.user_id = u.id
       LEFT JOIN departments d ON ep.department_id = d.id
       LEFT JOIN employee_skills esk ON ep.id = esk.employee_id
       LEFT JOIN skills s ON esk.skill_id = s.id
       LEFT JOIN employee_images ei ON ep.id = ei.employee_id
       GROUP BY ep.id, u.id, d.id, d.department_name
       ORDER BY ep.created_at DESC`
    );
    res.json({ profiles: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load employee profiles" });
  }
});

// Public endpoint for employee list (no auth, for debugging)
router.get("/list-public", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         ep.id,
         u.id AS user_id,
         u.name AS user_name,
         u.email AS user_email,
         d.id AS department_id,
         d.department_name,
         ep.phone,
         ep.address,
         ep.designation,
         ep.salary,
         ep.created_at,
         COALESCE(JSON_AGG(DISTINCT JSONB_BUILD_OBJECT('id', s.id, 'skill_name', s.skill_name)) FILTER (WHERE s.id IS NOT NULL), '[]') AS skills,
         COALESCE(JSON_AGG(DISTINCT JSONB_BUILD_OBJECT('id', ei.id, 'image_url', ei.image_url, 'file_type', ei.file_type, 'file_name', ei.file_name)) FILTER (WHERE ei.id IS NOT NULL), '[]') AS images
       FROM employee_profiles ep
       JOIN users u ON ep.user_id = u.id
       LEFT JOIN departments d ON ep.department_id = d.id
       LEFT JOIN employee_skills esk ON ep.id = esk.employee_id
       LEFT JOIN skills s ON esk.skill_id = s.id
       LEFT JOIN employee_images ei ON ep.id = ei.employee_id
       GROUP BY ep.id, u.id, d.id, d.department_name
       ORDER BY ep.created_at DESC`
    );
    res.json({ profiles: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load employee profiles" });
  }
});

// UPDATE Employee
router.put("/profiles/:id", requireAuth, async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error(err);
      return res.status(400).json({ message: err.message || "File upload failed" });
    }

    const { id } = req.params;
    const { name, email, departmentId, phone, address, designation, salary, skillIds, deleteImageIds } = req.body;
    const department_id = Number(departmentId) || null;
    const skills = parseSkillIds(skillIds);

    if (!name || !email || !designation || !department_id) {
      return res.status(400).json({ message: "Name, email, department and designation are required" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Verify profile and get user_id
      const currentProfile = await client.query("SELECT user_id FROM employee_profiles WHERE id = $1", [id]);
      if (currentProfile.rows.length === 0) {
        return res.status(404).json({ message: "Employee profile not found" });
      }
      const userId = currentProfile.rows[0].user_id;

      // Employees can only edit their own profile
      if ((req.user?.role || "").toLowerCase() === "employee" && Number(req.user.id) !== Number(userId)) {
        return res.status(403).json({ message: "Employees can only edit their own profile" });
      }

      // Update User table name and email
      await client.query("UPDATE users SET name = $1, email = $2 WHERE id = $3", [name, email, userId]);

      // Update Profile table
      await client.query(
        `UPDATE employee_profiles
         SET department_id = $1, phone = $2, address = $3, designation = $4, salary = $5
         WHERE id = $6`,
        [department_id, phone || null, address || null, designation, salary || null, id]
      );

      // Handle file deletions if requested
      if (deleteImageIds) {
        const toDeleteIds = parseSkillIds(deleteImageIds); // reuse simple array parser
        if (toDeleteIds.length > 0) {
          const filesResult = await client.query("SELECT image_url FROM employee_images WHERE id = ANY($1)", [toDeleteIds]);
          const urls = filesResult.rows.map((r) => r.image_url);
          deletePhysicalFiles(urls);
          await client.query("DELETE FROM employee_images WHERE id = ANY($1)", [toDeleteIds]);
        }
      }

      // Handle specific file replacement deletes (Profile, Resume replace)
      const handleReplacementDelete = async (type) => {
        const existing = await client.query(
          "SELECT id, image_url FROM employee_images WHERE employee_id = $1 AND file_type = $2",
          [id, type]
        );
        if (existing.rows.length > 0) {
          deletePhysicalFiles(existing.rows.map((r) => r.image_url));
          await client.query("DELETE FROM employee_images WHERE employee_id = $1 AND file_type = $2", [id, type]);
        }
      };

      // Add new files
      const insertImagePromise = (file, type) => {
        const url = `/uploads/${file.filename}`;
        return client.query(
          "INSERT INTO employee_images(employee_id, image_url, file_type, file_name) VALUES($1, $2, $3, $4)",
          [id, url, type, file.originalname]
        );
      };

      if (req.files) {
        const filePromises = [];
        if (req.files.profileImage && req.files.profileImage.length > 0) {
          await handleReplacementDelete("profile");
          filePromises.push(insertImagePromise(req.files.profileImage[0], "profile"));
        }
        if (req.files.resume && req.files.resume.length > 0) {
          await handleReplacementDelete("resume");
          filePromises.push(insertImagePromise(req.files.resume[0], "resume"));
        }
        if (req.files.documents && req.files.documents.length > 0) {
          req.files.documents.forEach((file) => {
            filePromises.push(insertImagePromise(file, "document"));
          });
        }
        await Promise.all(filePromises);
      }

      // Update skills association (Delete existing, write new)
      await client.query("DELETE FROM employee_skills WHERE employee_id = $1", [id]);
      if (skills.length > 0) {
        const uniqueSkillIds = [...new Set(skills)];
        const skillPromises = uniqueSkillIds.map((skillId) =>
          client.query(
            "INSERT INTO employee_skills(employee_id, skill_id) VALUES($1, $2)",
            [id, skillId]
          )
        );
        await Promise.all(skillPromises);
      }

      await client.query("COMMIT");
      res.json({ message: "Employee profile updated successfully" });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error(error);
      res.status(500).json({ message: "Unable to update employee profile" });
    } finally {
      client.release();
    }
  });
});

// DELETE Employee
router.delete("/profiles/:id", requireAuth, restrictEdit, async (req, res) => {
  const { id } = req.params;
  try {
    const profile = await pool.query("SELECT user_id FROM employee_profiles WHERE id = $1", [id]);
    if (profile.rows.length === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const userId = profile.rows[0].user_id;

    // Retrieve file URLs before deletion
    const files = await pool.query("SELECT image_url FROM employee_images WHERE employee_id = $1", [id]);
    const urls = files.rows.map((r) => r.image_url);

    // Delete user from users table (cascades to profile, images, skills)
    await pool.query("DELETE FROM users WHERE id = $1", [userId]);

    // Physically delete files from uploads folder
    deletePhysicalFiles(urls);

    res.json({ message: "Employee deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to delete employee" });
  }
});

// -------------------------------------------------------------
// SQL JOIN DASHBOARD STATS
// -------------------------------------------------------------
router.get("/dashboard-stats", requireAuth, async (req, res) => {
  try {
    // 1. Total Employees
    const totalEmpRes = await pool.query("SELECT COUNT(*)::int AS count FROM employee_profiles");
    const employeesCount = totalEmpRes.rows[0].count;

    // 2. Total Departments
    const totalDeptRes = await pool.query("SELECT COUNT(*)::int AS count FROM departments");
    const departmentsCount = totalDeptRes.rows[0].count;

    // 3. Total Skills
    const totalSkillsRes = await pool.query("SELECT COUNT(*)::int AS count FROM skills");
    const skillsCount = totalSkillsRes.rows[0].count;

    // 4. Average Salary
    const avgSalaryRes = await pool.query("SELECT ROUND(AVG(salary), 2)::float AS avg FROM employee_profiles");
    const avgSalary = avgSalaryRes.rows[0].avg || 0;

    // 5. Department Distribution (Pie Chart)
    const deptDistRes = await pool.query(
      `SELECT d.department_name AS name, COUNT(ep.id)::int AS value
       FROM departments d
       LEFT JOIN employee_profiles ep ON d.id = ep.department_id
       GROUP BY d.id, d.department_name
       ORDER BY value DESC`
    );
    const deptDistribution = deptDistRes.rows;

    // 6. Skills Frequencies (Bar Chart)
    const skillsDistRes = await pool.query(
      `SELECT s.skill_name AS name, COUNT(esk.id)::int AS value
       FROM skills s
       LEFT JOIN employee_skills esk ON s.id = esk.skill_id
       GROUP BY s.id, s.skill_name
       ORDER BY value DESC
       LIMIT 10`
    );
    const skillsDistribution = skillsDistRes.rows;

    // 7. Salary Analytics per Department (Bar Chart)
    const salaryAnalRes = await pool.query(
      `SELECT d.department_name AS name, ROUND(AVG(ep.salary), 2)::float AS avg
       FROM departments d
       JOIN employee_profiles ep ON d.id = ep.department_id
       GROUP BY d.id, d.department_name
       ORDER BY avg DESC`
    );
    const salaryAnalytics = salaryAnalRes.rows;

    // 8. Monthly Hiring Trend (Line Chart)
    const hiringTrendRes = await pool.query(
      `SELECT TO_CHAR(ep.created_at, 'YYYY-MM') AS name, COUNT(ep.id)::int AS hires
       FROM employee_profiles ep
       WHERE ep.created_at >= NOW() - INTERVAL '1 year'
       GROUP BY TO_CHAR(ep.created_at, 'YYYY-MM')
       ORDER BY name`
    );
    const hiringTrend = hiringTrendRes.rows;

    const isHR = (req.user?.role || "").toLowerCase() === "hr";

    // 9. Assets Status Distribution (Pie/Donut Chart)
    let assetsStatusDistribution = [];
    if (!isHR) {
      const assetStatusRes = await pool.query(
        `SELECT status AS name, COUNT(*)::int AS value
         FROM assets
         GROUP BY status
         ORDER BY value DESC`
      );
      assetsStatusDistribution = assetStatusRes.rows;
    }

    // 10. Assets Allocated per Department (Bar Chart)
    let assetsAllocationByDept = [];
    if (!isHR) {
      const assetDeptRes = await pool.query(
        `SELECT d.department_name AS name, COUNT(aa.id)::int AS value
         FROM departments d
         JOIN employee_profiles ep ON d.id = ep.department_id
         JOIN asset_allocations aa ON ep.id = aa.employee_id AND aa.status = 'Active'
         GROUP BY d.id, d.department_name
         ORDER BY value DESC`
      );
      assetsAllocationByDept = assetDeptRes.rows;
    }

    res.json({
      employeesCount,
      departmentsCount,
      skillsCount,
      avgSalary,
      deptDistribution,
      skillsDistribution,
      salaryAnalytics,
      hiringTrend,
      assetsStatusDistribution,
      assetsAllocationByDept
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ message: "Unable to load dashboard statistics" });
  }
});

// Dev-only public endpoint to inspect profiles without authentication
if (process.env.NODE_ENV !== "production") {
  router.get("/profiles-public", async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT
           ep.id,
           u.id AS user_id,
           u.name AS user_name,
           u.email AS user_email,
           d.department_name,
           ep.phone,
           ep.address,
           ep.designation,
           ep.salary,
           ep.created_at,
           COALESCE(JSON_AGG(DISTINCT JSONB_BUILD_OBJECT('id', s.id, 'skill_name', s.skill_name)) FILTER (WHERE s.id IS NOT NULL), '[]') AS skills,
           COALESCE(JSON_AGG(DISTINCT JSONB_BUILD_OBJECT('id', ei.id, 'image_url', ei.image_url, 'file_type', ei.file_type, 'file_name', ei.file_name)) FILTER (WHERE ei.id IS NOT NULL), '[]') AS images
         FROM employee_profiles ep
         JOIN users u ON ep.user_id = u.id
         LEFT JOIN departments d ON ep.department_id = d.id
         LEFT JOIN employee_skills esk ON ep.id = esk.employee_id
         LEFT JOIN skills s ON esk.skill_id = s.id
         LEFT JOIN employee_images ei ON ep.id = ei.employee_id
         GROUP BY ep.id, u.id, d.department_name
         ORDER BY ep.created_at DESC`
      );
      return res.json({ profiles: result.rows });
    } catch (error) {
      console.error("profiles-public error:", error.message || error);
      const sample = [
        {
          id: 1,
          user_id: 1,
          user_name: "Demo User",
          user_email: "demo@example.com",
          department_name: "IT",
          phone: "555-0100",
          address: "123 Demo Lane",
          designation: "Software Engineer",
          salary: 75000,
          created_at: new Date().toISOString(),
          skills: [{ id: 1, skill_name: "React" }],
          images: [],
        },
      ];
      return res.json({ profiles: sample });
    }
  });
}

module.exports = router;
