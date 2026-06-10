const express = require("express");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const pool = require("../db");

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

// Check for Admin or Manager role (case-insensitive)
const requireAdminOrManager = (req, res, next) => {
  const role = (req.user?.role || "").toLowerCase();
  if (role === "admin" || role === "manager") {
    return next();
  }
  return res.status(403).json({ message: "Access denied. Action restricted to Admins and Managers only." });
};

// Helper middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }
  next();
};

// Helper function to resolve employee_profile ID from user ID
const getEmployeeId = async (userId) => {
  const result = await pool.query("SELECT id FROM employee_profiles WHERE user_id = $1", [userId]);
  return result.rows[0]?.id || null;
};

/**
 * GET /api/attendance/biometric-status
 * Retrieve user's biometric registration status
 */
router.get("/biometric-status", requireAuth, async (req, res) => {
  try {
    const result = await pool.query("SELECT biometric_credential_id FROM users WHERE id = $1", [req.user.id]);
    const credentialId = result.rows[0]?.biometric_credential_id;
    res.json({ enrolled: !!credentialId, credentialId: credentialId || null });
  } catch (error) {
    console.error("Error checking biometric status:", error);
    res.status(500).json({ message: "Server error." });
  }
});

/**
 * POST /api/attendance/register-biometric
 * Register a WebAuthn biometric credential ID for the logged-in user
 */
router.post("/register-biometric", requireAuth, async (req, res) => {
  try {
    const { credentialId } = req.body;
    if (!credentialId) {
      return res.status(400).json({ message: "Credential ID is required." });
    }
    await pool.query("UPDATE users SET biometric_credential_id = $1 WHERE id = $2", [credentialId, req.user.id]);
    res.json({ message: "Biometric device registered successfully." });
  } catch (error) {
    console.error("Error registering biometric:", error);
    res.status(500).json({ message: "Server error." });
  }
});

/**
 * POST /api/attendance/punch
 * Punch in or punch out for the logged-in employee
 */
router.post("/punch", requireAuth, async (req, res) => {
  try {
    const employeeId = await getEmployeeId(req.user.id);
    if (!employeeId) {
      return res.status(400).json({ message: "No employee profile associated with this user account." });
    }

    // Check if user has biometrics enrolled in database
    const userRes = await pool.query("SELECT biometric_credential_id FROM users WHERE id = $1", [req.user.id]);
    const registeredId = userRes.rows[0]?.biometric_credential_id;

    // If enrolled, require biometric credential ID payload
    if (registeredId) {
      const { credentialId } = req.body;
      if (!credentialId) {
        return res.status(400).json({ message: "Biometric authentication is required to punch." });
      }
      if (credentialId !== registeredId) {
        return res.status(401).json({ message: "Invalid biometric credential assertion." });
      }
    }

    // 1. Cross-reference: Check if there is an approved leave today
    const leaveCheck = await pool.query(
      `SELECT id FROM leave_applications 
       WHERE employee_id = $1 
         AND status = 'Approved' 
         AND CURRENT_DATE BETWEEN start_date AND end_date`,
      [employeeId]
    );

    if (leaveCheck.rows.length > 0) {
      return res.status(400).json({ message: "You are currently on approved leave today and cannot punch in." });
    }

    // 2. Fetch today's record
    const todayRes = await pool.query(
      "SELECT * FROM attendance WHERE employee_id = $1 AND punch_date = CURRENT_DATE",
      [employeeId]
    );

    if (todayRes.rows.length === 0) {
      // Punch-in
      const result = await pool.query(
        `INSERT INTO attendance (employee_id, punch_date, punch_in, status)
         VALUES ($1, CURRENT_DATE, CURRENT_TIMESTAMP, 'Present')
         RETURNING *`,
        [employeeId]
      );
      return res.status(201).json({
        message: "Punched in successfully via biometric authentication.",
        record: result.rows[0],
        action: "in"
      });
    } else {
      const record = todayRes.rows[0];
      if (record.punch_out) {
        return res.status(400).json({ message: "You have already completed your shift today (punched out)." });
      }

      // Punch-out
      const result = await pool.query(
        `UPDATE attendance
         SET punch_out = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [record.id]
      );
      return res.status(200).json({
        message: "Punched out successfully. Shift completed.",
        record: result.rows[0],
        action: "out"
      });
    }
  } catch (error) {
    console.error("Punch error:", error);
    res.status(500).json({ message: "Biometric authentication failed. Server error." });
  }
});

/**
 * GET /api/attendance/my-logs
 * Retrieve the active employee's attendance history
 */
router.get("/my-logs", requireAuth, async (req, res) => {
  try {
    const employeeId = await getEmployeeId(req.user.id);
    if (!employeeId) {
      return res.json({ logs: [] });
    }

    // 1. Fetch attendance records
    const attendanceRes = await pool.query(
      `SELECT id, punch_date::text, punch_in::text, punch_out::text, status, notes
       FROM attendance
       WHERE employee_id = $1
       ORDER BY punch_date DESC`,
      [employeeId]
    );

    // 2. Fetch approved leaves to merge dynamically
    const leavesRes = await pool.query(
      `SELECT start_date::text, end_date::text, lt.leave_name
       FROM leave_applications la
       JOIN leave_types lt ON la.leave_type_id = lt.id
       WHERE la.employee_id = $1 AND la.status = 'Approved'`,
      [employeeId]
    );

    const attendanceLogs = attendanceRes.rows;
    const approvedLeaves = leavesRes.rows;

    res.json({ logs: attendanceLogs, leaves: approvedLeaves });
  } catch (error) {
    console.error("My logs loading error:", error);
    res.status(500).json({ message: "Unable to load attendance logs." });
  }
});

/**
 * GET /api/attendance/logs
 * Retrieve all logs (privileged admin/hr/manager only)
 */
router.get("/logs", requireAuth, async (req, res) => {
  try {
    const role = (req.user?.role || "").toLowerCase();
    if (role === "employee") {
      return res.status(403).json({ message: "Access denied." });
    }

    // 1. Fetch all attendance logs with employee details
    const attendanceRes = await pool.query(
      `SELECT a.id, a.employee_id, u.name AS employee_name, d.department_name, ep.designation,
              a.punch_date::text, a.punch_in::text, a.punch_out::text, a.status, a.notes
       FROM attendance a
       JOIN employee_profiles ep ON a.employee_id = ep.id
       JOIN users u ON ep.user_id = u.id
       LEFT JOIN departments d ON ep.department_id = d.id
       ORDER BY a.punch_date DESC, u.name ASC`
    );

    // 2. Fetch all approved leaves to cross-reference
    const leavesRes = await pool.query(
      `SELECT la.employee_id, u.name AS employee_name, la.start_date::text, la.end_date::text, lt.leave_name
       FROM leave_applications la
       JOIN employee_profiles ep ON la.employee_id = ep.id
       JOIN users u ON ep.user_id = u.id
       JOIN leave_types lt ON la.leave_type_id = lt.id
       WHERE la.status = 'Approved'`
    );

    res.json({ logs: attendanceRes.rows, leaves: leavesRes.rows });
  } catch (error) {
    console.error("All logs loading error:", error);
    res.status(500).json({ message: "Unable to load attendance logs." });
  }
});

/**
 * POST /api/attendance/manual
 * Manually add an attendance record (Admin/HR only)
 */
router.post(
  "/manual",
  [
    requireAuth,
    requireAdminOrManager,
    body("employee_id").isInt().withMessage("Employee is required"),
    body("punch_date").isISO8601().withMessage("Valid date is required"),
    body("punch_in").optional({ checkFalsy: true }).isISO8601().withMessage("Invalid punch-in timestamp"),
    body("punch_out").optional({ checkFalsy: true }).isISO8601().withMessage("Invalid punch-out timestamp"),
    body("status").isIn(["Present", "Absent", "On Leave", "Half Day"]).withMessage("Invalid status"),
    body("notes").optional().trim().escape(),
    handleValidationErrors
  ],
  async (req, res) => {
    try {
      const { employee_id, punch_date, punch_in, punch_out, status, notes } = req.body;

      // Check for conflict
      const existRes = await pool.query(
        "SELECT id FROM attendance WHERE employee_id = $1 AND punch_date = $2",
        [employee_id, punch_date]
      );
      if (existRes.rows.length > 0) {
        return res.status(400).json({ message: "An attendance record already exists for this employee on this date." });
      }

      const result = await pool.query(
        `INSERT INTO attendance (employee_id, punch_date, punch_in, punch_out, status, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          employee_id,
          punch_date,
          punch_in || null,
          punch_out || null,
          status,
          notes || null
        ]
      );

      res.status(201).json({ message: "Attendance log manually created.", log: result.rows[0] });
    } catch (error) {
      console.error("Manual log creation error:", error);
      res.status(500).json({ message: "Server error creating attendance record." });
    }
  }
);

/**
 * PUT /api/attendance/:id
 * Edit attendance record (Admin/HR only)
 */
router.put(
  "/:id",
  [
    requireAuth,
    requireAdminOrManager,
    body("punch_in").optional({ checkFalsy: true }).isISO8601().withMessage("Invalid punch-in timestamp"),
    body("punch_out").optional({ checkFalsy: true }).isISO8601().withMessage("Invalid punch-out timestamp"),
    body("status").isIn(["Present", "Absent", "On Leave", "Half Day"]).withMessage("Invalid status"),
    body("notes").optional().trim().escape(),
    handleValidationErrors
  ],
  async (req, res) => {
    const { id } = req.params;
    try {
      const { punch_in, punch_out, status, notes } = req.body;

      const existRes = await pool.query("SELECT id FROM attendance WHERE id = $1", [id]);
      if (existRes.rows.length === 0) {
        return res.status(404).json({ message: "Attendance record not found." });
      }

      const result = await pool.query(
        `UPDATE attendance
         SET punch_in = $1, punch_out = $2, status = $3, notes = $4
         WHERE id = $5
         RETURNING *`,
        [
          punch_in || null,
          punch_out || null,
          status,
          notes || null,
          id
        ]
      );

      res.json({ message: "Attendance record updated successfully.", log: result.rows[0] });
    } catch (error) {
      console.error("Manual update error:", error);
      res.status(500).json({ message: "Server error updating attendance record." });
    }
  }
);

/**
 * DELETE /api/attendance/:id
 * Delete attendance record (Admin/HR only)
 */
router.delete("/:id", requireAuth, requireAdminOrManager, async (req, res) => {
  const { id } = req.params;
  try {
    const existRes = await pool.query("SELECT id FROM attendance WHERE id = $1", [id]);
    if (existRes.rows.length === 0) {
      return res.status(404).json({ message: "Attendance record not found." });
    }

    await pool.query("DELETE FROM attendance WHERE id = $1", [id]);
    res.json({ message: "Attendance record deleted successfully." });
  } catch (error) {
    console.error("Manual delete error:", error);
    res.status(500).json({ message: "Server error deleting attendance record." });
  }
});

module.exports = router;
