const express = require("express");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const rateLimit = require("express-rate-limit");
const pool = require("../db");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwtkey";

// Rate limiter for leave applications (throttles brute-force submission spam)
const leaveApplyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // limit each IP to 15 leave applications per windowMs
  message: { message: "Too many leave requests submitted from this IP. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

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

// Helper middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }
  next();
};

// -------------------------------------------------------------
// LEAVE ENDPOINTS
// -------------------------------------------------------------

/**
 * @swagger
 * /api/leaves/types:
 *   get:
 *     summary: Retrieve all leave types
 *     tags: [Leaves]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of leave types (Casual, Sick, Earned, etc.)
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.get("/types", requireAuth, async (req, res) => {
  try {
    const result = await pool.query("SELECT id, leave_name, total_days FROM leave_types ORDER BY id ASC");
    res.json({ types: result.rows });
  } catch (error) {
    console.error("Error loading leave types:", error);
    res.status(500).json({ message: "Unable to load leave types" });
  }
});

/**
 * @swagger
 * /api/leaves/balances:
 *   get:
 *     summary: Get leave balances for the logged-in user
 *     tags: [Leaves]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Employee's custom leave balances list
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.get("/balances", requireAuth, async (req, res) => {
  try {
    const profileRes = await pool.query("SELECT id FROM employee_profiles WHERE user_id = $1", [req.user.id]);
    if (profileRes.rows.length === 0) {
      return res.json({ balances: [] });
    }
    const employeeId = profileRes.rows[0].id;

    const result = await pool.query(
      `SELECT lb.id, lt.id AS leave_type_id, lt.leave_name, lb.available_days, lt.total_days 
       FROM leave_balances lb 
       JOIN leave_types lt ON lb.leave_type_id = lt.id 
       WHERE lb.employee_id = $1 
       ORDER BY lt.id ASC`,
      [employeeId]
    );
    res.json({ balances: result.rows });
  } catch (error) {
    console.error("Error loading leave balances:", error);
    res.status(500).json({ message: "Unable to load leave balances" });
  }
});

/**
 * @swagger
 * /api/leaves/applications:
 *   get:
 *     summary: Get leave applications (filtered for employee, or all for Manager/HR/Admin)
 *     tags: [Leaves]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of leave applications
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.get("/applications", requireAuth, async (req, res) => {
  try {
    const profileRes = await pool.query("SELECT id FROM employee_profiles WHERE user_id = $1", [req.user.id]);
    const employeeId = profileRes.rows[0]?.id;

    let queryStr = `
      SELECT 
        la.id,
        u.name AS employee_name,
        u.email AS employee_email,
        d.department_name,
        lt.leave_name,
        la.start_date::text,
        la.end_date::text,
        la.reason,
        la.status,
        la.created_at,
        la.employee_id,
        m.name AS manager_name,
        hr.name AS hr_name
      FROM leave_applications la
      JOIN employee_profiles ep ON la.employee_id = ep.id
      JOIN users u ON ep.user_id = u.id
      LEFT JOIN departments d ON ep.department_id = d.id
      JOIN leave_types lt ON la.leave_type_id = lt.id
      LEFT JOIN users m ON la.manager_id = m.id
      LEFT JOIN users hr ON la.hr_id = hr.id
    `;
    const params = [];

    if (req.user.role === "employee" && employeeId) {
      queryStr += " WHERE la.employee_id = $1";
      params.push(employeeId);
    }
    
    queryStr += " ORDER BY la.created_at DESC";

    const result = await pool.query(queryStr, params);
    res.json({ applications: result.rows });
  } catch (error) {
    console.error("Error loading leave applications:", error);
    res.status(500).json({ message: "Unable to load leave applications" });
  }
});

/**
 * @swagger
 * /api/leaves/apply:
 *   post:
 *     summary: Submit a new leave application
 *     tags: [Leaves]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - leaveTypeId
 *               - startDate
 *               - endDate
 *               - reason
 *             properties:
 *               leaveTypeId:
 *                 type: integer
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               reason:
 *                 type: string
 *     responses:
 *       201:
 *         description: Leave submitted successfully
 *       400:
 *         description: Validation error or insufficient balance
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.post(
  "/apply",
  [
    requireAuth,
    leaveApplyLimiter,
    body("leaveTypeId").isInt().withMessage("Leave category is required"),
    body("startDate").isISO8601().withMessage("Valid start date is required"),
    body("endDate").isISO8601().withMessage("Valid end date is required"),
    body("reason").trim().notEmpty().withMessage("Reason for leave is required").escape(),
    handleValidationErrors
  ],
  async (req, res) => {
    const { leaveTypeId, startDate, endDate, reason } = req.body;

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      return res.status(400).json({ message: "End date cannot be prior to start date" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Get employee profile ID
      const profileRes = await client.query("SELECT id FROM employee_profiles WHERE user_id = $1", [req.user.id]);
      if (profileRes.rows.length === 0) {
        return res.status(400).json({ message: "Employee profile not found" });
      }
      const employeeId = profileRes.rows[0].id;

      // Cross-reference: Prevent leave submission if they already punched in (Present) on any requested dates
      const overlapAttendance = await client.query(
        `SELECT punch_date::text FROM attendance 
         WHERE employee_id = $1 
           AND punch_date BETWEEN $2 AND $3
           AND status = 'Present'`,
        [employeeId, startDate, endDate]
      );

      if (overlapAttendance.rows.length > 0) {
        const dates = overlapAttendance.rows.map(r => r.punch_date).join(", ");
        return res.status(400).json({ 
          message: `You cannot apply for leave on these dates because you have already registered attendance (punched in) on: ${dates}.` 
        });
      }

      // Calculate days requested
      const requestedDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;

      // Check available days
      const balanceRes = await client.query(
        "SELECT available_days FROM leave_balances WHERE employee_id = $1 AND leave_type_id = $2",
        [employeeId, leaveTypeId]
      );

      if (balanceRes.rows.length === 0) {
        return res.status(400).json({ message: "Leave type balance not configured for employee" });
      }

      const availableDays = balanceRes.rows[0].available_days;
      if (requestedDays > availableDays) {
        return res.status(400).json({ message: `Insufficient leave balance. Requested: ${requestedDays} days, Available: ${availableDays} days.` });
      }

      // Insert Leave application
      const appResult = await client.query(
        `INSERT INTO leave_applications (employee_id, leave_type_id, start_date, end_date, reason, status)
         VALUES ($1, $2, $3, $4, $5, 'Pending Manager Approval')
         RETURNING id`,
        [employeeId, leaveTypeId, startDate, endDate, reason]
      );
      const applicationId = appResult.rows[0].id;

      // Insert Audit History Log
      await client.query(
        `INSERT INTO approval_history (leave_id, approved_by, action, remarks)
         VALUES ($1, $2, 'Submitted', $3)`,
        [applicationId, req.user.id, `Applied for ${requestedDays} day(s) of leave.`]
      );

      await client.query("COMMIT");
      res.status(201).json({ message: "Leave application submitted successfully.", applicationId });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Apply leave error:", error);
      res.status(500).json({ message: "Unable to submit leave request" });
    } finally {
      client.release();
    }
  }
);

/**
 * @swagger
 * /api/leaves/approve/{id}:
 *   post:
 *     summary: Approve a leave application (Manager or HR stage)
 *     tags: [Leaves]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comments:
 *                 type: string
 *     responses:
 *       200:
 *         description: Leave approved successfully
 *       400:
 *         description: Action not allowed or balance issue
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.post(
  "/approve/:id",
  [
    requireAuth,
    body("comments").trim().escape(),
    handleValidationErrors
  ],
  async (req, res) => {
    const { id } = req.params;
    const { comments } = req.body;

    const role = (req.user.role || "").toLowerCase();
    if (role === "employee") {
      return res.status(403).json({ message: "Unauthorized to approve leaves" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Fetch leave application details
      const appRes = await client.query("SELECT * FROM leave_applications WHERE id = $1", [id]);
      if (appRes.rows.length === 0) {
        return res.status(404).json({ message: "Leave application not found" });
      }
      const app = appRes.rows[0];

      if (app.status === "Approved") {
        return res.status(400).json({ message: "Application is already approved" });
      }
      if (app.status.startsWith("Rejected")) {
        return res.status(400).json({ message: "Application is already rejected" });
      }

      let nextStatus = "Approved";
      let updateFields = "";
      const params = [id, req.user.id];

      if (role === "manager") {
        updateFields = ", status = $3, manager_id = $2";
        params.push(nextStatus);
      } else if (role === "hr" || role === "admin") {
        updateFields = ", status = $3, hr_id = $2";
        params.push(nextStatus);
      } else {
        return res.status(403).json({ message: "Unauthorized role for leave approval" });
      }

      // Deduct leave balance on final approval
      const start = new Date(app.start_date);
      const end = new Date(app.end_date);
      const days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;

      const updateBalanceRes = await client.query(
        `UPDATE leave_balances 
         SET available_days = available_days - $1 
         WHERE employee_id = $2 AND leave_type_id = $3 AND available_days >= $1
         RETURNING available_days`,
        [days, app.employee_id, app.leave_type_id]
      );

      if (updateBalanceRes.rows.length === 0) {
        return res.status(400).json({ message: "Insufficient leave balance for final approval" });
      }

      // Update application
      await client.query(
        `UPDATE leave_applications 
         SET created_at = created_at ${updateFields} 
         WHERE id = $1`,
        params
      );

      // Insert Audit History
      const actionLabel = role === "manager" ? "Manager Approved" : "HR Approved";
      await client.query(
        `INSERT INTO approval_history (leave_id, approved_by, action, remarks)
         VALUES ($1, $2, $3, $4)`,
        [id, req.user.id, actionLabel, comments || "Approved successfully."]
      );

      await client.query("COMMIT");
      res.json({ message: "Leave approved successfully", status: nextStatus });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Approve leave error:", error);
      res.status(500).json({ message: "Unable to process leave approval" });
    } finally {
      client.release();
    }
  }
);

/**
 * @swagger
 * /api/leaves/reject/{id}:
 *   post:
 *     summary: Reject a leave application (Manager or HR stage)
 *     tags: [Leaves]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comments:
 *                 type: string
 *     responses:
 *       200:
 *         description: Leave request rejected successfully
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.post(
  "/reject/:id",
  [
    requireAuth,
    body("comments").trim().escape(),
    handleValidationErrors
  ],
  async (req, res) => {
    const { id } = req.params;
    const { comments } = req.body;

    const role = (req.user.role || "").toLowerCase();
    if (role === "employee") {
      return res.status(403).json({ message: "Unauthorized to reject leaves" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const appRes = await client.query("SELECT * FROM leave_applications WHERE id = $1", [id]);
      if (appRes.rows.length === 0) {
        return res.status(404).json({ message: "Leave application not found" });
      }
      const app = appRes.rows[0];

      if (app.status === "Approved") {
        return res.status(400).json({ message: "Application is already approved" });
      }
      if (app.status.startsWith("Rejected")) {
        return res.status(400).json({ message: "Application is already rejected" });
      }

      let nextStatus = "";
      let updateFields = "";
      const params = [id, req.user.id];

      if (role === "manager") {
        nextStatus = "Rejected by Manager";
        updateFields = ", status = $3, manager_id = $2";
        params.push(nextStatus);
      } else if (role === "hr" || role === "admin") {
        nextStatus = "Rejected by HR";
        updateFields = ", status = $3, hr_id = $2";
        params.push(nextStatus);
      } else {
        return res.status(403).json({ message: "Unauthorized role for leave rejection" });
      }

      // Update application
      await client.query(
        `UPDATE leave_applications 
         SET created_at = created_at ${updateFields} 
         WHERE id = $1`,
        params
      );

      // Insert Audit History
      const actionLabel = role === "manager" ? "Manager Rejected" : "HR Rejected";
      await client.query(
        `INSERT INTO approval_history (leave_id, approved_by, action, remarks)
         VALUES ($1, $2, $3, $4)`,
        [id, req.user.id, actionLabel, comments || "Rejected."]
      );

      await client.query("COMMIT");
      res.json({ message: "Leave request rejected", status: nextStatus });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Reject leave error:", error);
      res.status(500).json({ message: "Unable to process leave rejection" });
    } finally {
      client.release();
    }
  }
);

/**
 * @swagger
 * /api/leaves/history/{id}:
 *   get:
 *     summary: Fetch leave approval history / audit logs
 *     tags: [Leaves]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Audit log history timeline
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.get("/history/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT 
         ah.id,
         u.name AS action_by_name,
         u.role AS action_by_role,
         ah.action,
         ah.remarks AS comments,
         ah.action_date
       FROM approval_history ah
       JOIN users u ON ah.approved_by = u.id
       WHERE ah.leave_id = $1
       ORDER BY ah.action_date ASC`,
      [id]
    );
    res.json({ history: result.rows });
  } catch (error) {
    console.error("Error loading leave history:", error);
    res.status(500).json({ message: "Unable to load leave history log" });
  }
});

module.exports = router;
