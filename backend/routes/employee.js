const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pool = require("../db");

const router = express.Router();
const uploadFolder = path.join(__dirname, "../uploads");
fs.mkdirSync(uploadFolder, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadFolder),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  },
});
const upload = multer({ storage });

const requireAuth = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  return res.status(401).json({ message: "Not authenticated" });
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

router.get("/departments", requireAuth, async (req, res) => {
  try {
    const result = await pool.query("SELECT id, department_name FROM departments ORDER BY department_name");
    res.json({ departments: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load departments" });
  }
});

router.get("/skills", requireAuth, async (req, res) => {
  try {
    const result = await pool.query("SELECT id, skill_name FROM skills ORDER BY skill_name");
    res.json({ skills: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load skills" });
  }
});

router.post("/profiles", requireAuth, upload.array("images", 10), async (req, res) => {
  const { departmentId, phone, address, designation, salary, skillIds } = req.body;
  const department_id = Number(departmentId) || null;
  const skills = parseSkillIds(skillIds);
  const imageFiles = req.files || [];

  if (!designation || !department_id) {
    return res.status(400).json({ message: "Department and designation are required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const profileResult = await client.query(
      `INSERT INTO employee_profiles(user_id, department_id, phone, address, designation, salary)
       VALUES($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [req.session.user.id, department_id, phone || null, address || null, designation, salary || null]
    );

    const employeeId = profileResult.rows[0].id;

    if (imageFiles.length > 0) {
      const imagePromises = imageFiles.map((file) => {
        const imageUrl = `/uploads/${file.filename}`;
        return client.query(
          "INSERT INTO employee_images(employee_id, image_url) VALUES($1, $2)",
          [employeeId, imageUrl]
        );
      });
      await Promise.all(imagePromises);
    }

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

router.get("/profiles", requireAuth, async (req, res) => {
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
         COALESCE(JSON_AGG(DISTINCT JSONB_BUILD_OBJECT('id', ei.id, 'image_url', ei.image_url)) FILTER (WHERE ei.id IS NOT NULL), '[]') AS images
       FROM employee_profiles ep
       JOIN users u ON ep.user_id = u.id
       LEFT JOIN departments d ON ep.department_id = d.id
       LEFT JOIN employee_skills esk ON ep.id = esk.employee_id
       LEFT JOIN skills s ON esk.skill_id = s.id
       LEFT JOIN employee_images ei ON ep.id = ei.employee_id
       GROUP BY ep.id, u.id, d.department_name
       ORDER BY ep.created_at DESC`
    );
    res.json({ profiles: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load employee profiles" });
  }
});

// Dev-only public endpoint to inspect profiles without authentication
// Only enabled when NODE_ENV !== 'production'
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
           COALESCE(JSON_AGG(DISTINCT JSONB_BUILD_OBJECT('id', ei.id, 'image_url', ei.image_url)) FILTER (WHERE ei.id IS NOT NULL), '[]') AS images
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
      // Fallback sample data for dev UX when DB isn't available or schema missing
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
