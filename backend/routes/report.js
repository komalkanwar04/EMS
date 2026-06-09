const express = require("express");
const pool = require("../db");
const jwt = require("jsonwebtoken");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwtkey";

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

// Role authorization for admin/hr/manager
const requirePrivileged = (req, res, next) => {
  if (req.user.role === "admin" || req.user.role === "hr" || req.user.role === "manager") {
    return next();
  }
  return res.status(403).json({ message: "Access denied. Reports are restricted to managers, HR, and admins." });
};

// -------------------------------------------------------------
// GET /api/reports/employees - Detailed employee list
// -------------------------------------------------------------
router.get("/employees", requireAuth, requirePrivileged, async (req, res) => {
  try {
    const { department_id, designation } = req.query;
    
    let queryText = `
      SELECT ep.id, u.name, u.email, d.id AS department_id, d.department_name, ep.designation, ep.salary, ep.phone, ep.address,
             COALESCE(JSON_AGG(DISTINCT s.skill_name) FILTER (WHERE s.skill_name IS NOT NULL), '[]') AS skills, ep.created_at
      FROM employee_profiles ep
      JOIN users u ON ep.user_id = u.id
      LEFT JOIN departments d ON ep.department_id = d.id
      LEFT JOIN employee_skills es ON ep.id = es.employee_id
      LEFT JOIN skills s ON es.skill_id = s.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramIdx = 1;

    if (department_id) {
      queryText += ` AND ep.department_id = $${paramIdx}`;
      queryParams.push(parseInt(department_id));
      paramIdx++;
    }

    if (designation && designation.trim() !== "") {
      queryText += ` AND ep.designation ILIKE $${paramIdx}`;
      queryParams.push(`%${designation.trim()}%`);
      paramIdx++;
    }

    queryText += `
      GROUP BY ep.id, u.name, u.email, d.id, d.department_name, ep.designation, ep.salary, ep.phone, ep.address, ep.created_at
      ORDER BY u.name ASC
    `;

    const result = await pool.query(queryText, queryParams);
    res.json({ employees: result.rows });
  } catch (error) {
    console.error("Error loading employee reports:", error);
    res.status(500).json({ message: "Unable to load employee report data" });
  }
});

// -------------------------------------------------------------
// GET /api/reports/leaves - Leave applications audit list
// -------------------------------------------------------------
router.get("/leaves", requireAuth, requirePrivileged, async (req, res) => {
  try {
    const { status, leave_type_id, start_date, end_date } = req.query;

    let queryText = `
      SELECT la.id, u.name AS employee_name, lt.id AS leave_type_id, lt.leave_name, la.start_date, la.end_date, la.status, la.reason, la.created_at,
             m.name AS manager_name, hr.name AS hr_name
      FROM leave_applications la
      JOIN employee_profiles ep ON la.employee_id = ep.id
      JOIN users u ON ep.user_id = u.id
      JOIN leave_types lt ON la.leave_type_id = lt.id
      LEFT JOIN users m ON la.manager_id = m.id
      LEFT JOIN users hr ON la.hr_id = hr.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramIdx = 1;

    if (status && status.trim() !== "") {
      queryText += ` AND la.status = $${paramIdx}`;
      queryParams.push(status.trim());
      paramIdx++;
    }

    if (leave_type_id) {
      queryText += ` AND la.leave_type_id = $${paramIdx}`;
      queryParams.push(parseInt(leave_type_id));
      paramIdx++;
    }

    if (start_date) {
      queryText += ` AND la.start_date >= $${paramIdx}`;
      queryParams.push(start_date);
      paramIdx++;
    }

    if (end_date) {
      queryText += ` AND la.end_date <= $${paramIdx}`;
      queryParams.push(end_date);
      paramIdx++;
    }

    queryText += ` ORDER BY la.created_at DESC`;

    const result = await pool.query(queryText, queryParams);
    res.json({ leaves: result.rows });
  } catch (error) {
    console.error("Error loading leave reports:", error);
    res.status(500).json({ message: "Unable to load leave report data" });
  }
});

// -------------------------------------------------------------
// GET /api/reports/assets - Inventory allocations list
// -------------------------------------------------------------
router.get("/assets", requireAuth, requirePrivileged, async (req, res) => {
  try {
    const { asset_type, status, min_cost, max_cost } = req.query;

    let queryText = `
      SELECT a.id, a.asset_code, a.asset_name, a.asset_type, a.purchase_date, a.purchase_cost, a.status,
             u.name AS current_owner
      FROM assets a
      LEFT JOIN asset_allocations aa ON a.id = aa.asset_id AND aa.status = 'Active'
      LEFT JOIN employee_profiles ep ON aa.employee_id = ep.id
      LEFT JOIN users u ON ep.user_id = u.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramIdx = 1;

    if (asset_type && asset_type.trim() !== "") {
      queryText += ` AND a.asset_type = $${paramIdx}`;
      queryParams.push(asset_type.trim());
      paramIdx++;
    }

    if (status && status.trim() !== "") {
      queryText += ` AND a.status = $${paramIdx}`;
      queryParams.push(status.trim());
      paramIdx++;
    }

    if (min_cost) {
      queryText += ` AND a.purchase_cost >= $${paramIdx}`;
      queryParams.push(parseFloat(min_cost));
      paramIdx++;
    }

    if (max_cost) {
      queryText += ` AND a.purchase_cost <= $${paramIdx}`;
      queryParams.push(parseFloat(max_cost));
      paramIdx++;
    }

    queryText += ` ORDER BY a.asset_code ASC`;

    const result = await pool.query(queryText, queryParams);
    res.json({ assets: result.rows });
  } catch (error) {
    console.error("Error loading asset reports:", error);
    res.status(500).json({ message: "Unable to load asset report data" });
  }
});

module.exports = router;
