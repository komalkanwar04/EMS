const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
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

// Helper middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }
  next();
};

/**
 * @swagger
 * /api/recruitment/applications:
 *   get:
 *     summary: Retrieve all job/internship applications (HR & Admin)
 *     tags: [Recruitment]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of candidate applications
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Unauthorized role
 *       500:
 *         description: Server error
 */
router.get("/applications", requireAuth, async (req, res) => {
  if (req.user.role !== "hr" && req.user.role !== "admin") {
    return res.status(403).json({ message: "Unauthorized to access recruitment records" });
  }

  try {
    const result = await pool.query(`
      SELECT 
        ra.id,
        ra.candidate_name,
        ra.candidate_email,
        ra.candidate_phone,
        ra.application_type,
        ra.department_id,
        d.department_name,
        ra.designation,
        ra.resume_url,
        ra.status,
        ra.applied_at
      FROM recruitment_applications ra
      LEFT JOIN departments d ON ra.department_id = d.id
      ORDER BY ra.applied_at DESC
    `);
    res.json({ applications: result.rows });
  } catch (error) {
    console.error("Error fetching recruitment applications:", error);
    res.status(500).json({ message: "Unable to load recruitment applications" });
  }
});

/**
 * @swagger
 * /api/recruitment/apply:
 *   post:
 *     summary: Submit a job/internship application (Public/Guest)
 *     tags: [Recruitment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - type
 *               - departmentId
 *               - designation
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [Job, Internship]
 *               departmentId:
 *                 type: integer
 *               designation:
 *                 type: string
 *     responses:
 *       201:
 *         description: Candidate application submitted successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
router.post(
  "/apply",
  [
    body("name").trim().notEmpty().withMessage("Full name is required").escape(),
    body("email").isEmail().withMessage("Invalid email address").normalizeEmail(),
    body("phone").optional({ checkFalsy: true }).trim().escape(),
    body("type").isIn(["Job", "Internship"]).withMessage("Application category must be Job or Internship"),
    body("departmentId").isInt().withMessage("Valid domain selection is required"),
    body("designation").trim().notEmpty().withMessage("Applied role/designation is required").escape(),
    handleValidationErrors
  ],
  async (req, res) => {
    const { name, email, phone, type, departmentId, designation } = req.body;

    try {
      const result = await pool.query(
        `INSERT INTO recruitment_applications (candidate_name, candidate_email, candidate_phone, application_type, department_id, designation, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'Pending Review')
         RETURNING *`,
        [name, email, phone || null, type, Number(departmentId), designation]
      );
      res.status(201).json({ message: "Application submitted successfully", application: result.rows[0] });
    } catch (error) {
      console.error("Error submitting application:", error);
      res.status(500).json({ message: "Unable to submit application" });
    }
  }
);

/**
 * @swagger
 * /api/recruitment/action/{id}:
 *   post:
 *     summary: Shortlist or Reject a candidate application (HR & Admin)
 *     tags: [Recruitment]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Shortlisted, Rejected]
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Invalid status value or validation error
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.post(
  "/action/:id",
  [
    requireAuth,
    body("status").isIn(["Shortlisted", "Rejected"]).withMessage("Status action must be Shortlisted or Rejected"),
    handleValidationErrors
  ],
  async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (req.user.role !== "hr" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized to update application status" });
    }

    try {
      const result = await pool.query(
        "UPDATE recruitment_applications SET status = $1 WHERE id = $2 RETURNING *",
        [status, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Application not found" });
      }

      res.json({ message: `Candidate application status set to ${status}`, application: result.rows[0] });
    } catch (error) {
      console.error("Error actioning application:", error);
      res.status(500).json({ message: "Unable to update application status" });
    }
  }
);

/**
 * @swagger
 * /api/recruitment/hire/{id}:
 *   post:
 *     summary: Hire a shortlisted candidate and onboard them as employee (HR & Admin)
 *     tags: [Recruitment]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - salary
 *             properties:
 *               salary:
 *                 type: number
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Candidate hired successfully; Employee profile and starting balances created
 *       400:
 *         description: Already hired, profile exists or validation error
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.post(
  "/hire/:id",
  [
    requireAuth,
    body("salary").isNumeric().withMessage("Starting salary must be a numeric value"),
    body("phone").optional({ checkFalsy: true }).trim().escape(),
    handleValidationErrors
  ],
  async (req, res) => {
    const { id } = req.params;
    const { salary, phone } = req.body;

    if (req.user.role !== "hr" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized to hire candidates" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Fetch applicant details
      const applicantRes = await client.query("SELECT * FROM recruitment_applications WHERE id = $1", [id]);
      if (applicantRes.rows.length === 0) {
        return res.status(404).json({ message: "Applicant record not found" });
      }

      const candidate = applicantRes.rows[0];
      if (candidate.status === "Hired") {
        return res.status(400).json({ message: "Candidate is already hired and onboarded" });
      }

      // Check if email already registered in users table
      const userCheck = await client.query("SELECT id FROM users WHERE email = $1", [candidate.candidate_email]);
      if (userCheck.rows.length > 0) {
        return res.status(400).json({ message: `User with email ${candidate.candidate_email} is already registered in PeopleSync.` });
      }

      // 1. Create a user account (Default role: employee)
      const defaultPassword = "Welcome@123";
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      const userInsert = await client.query(
        `INSERT INTO users (name, email, password, role) 
         VALUES ($1, $2, $3, 'employee') 
         RETURNING id`,
        [candidate.candidate_name, candidate.candidate_email, hashedPassword]
      );
      const newUserId = userInsert.rows[0].id;

      // 2. Create employee profile linked to user
      const profileInsert = await client.query(
        `INSERT INTO employee_profiles (user_id, department_id, phone, address, designation, salary)
         VALUES ($1, $2, $3, 'Onboarded from Recruitment Portal', $4, $5)
         RETURNING id`,
        [newUserId, candidate.department_id, phone || candidate.candidate_phone || null, candidate.designation, salary ? Number(salary) : 35000]
      );
      const newProfileId = profileInsert.rows[0].id;

      // 3. Add default profile avatar link
      const avatarUrl = `https://i.pravatar.cc/150?u=${encodeURIComponent(candidate.candidate_email)}`;
      await client.query(
        `INSERT INTO employee_images (employee_id, image_url, file_type, file_name)
         VALUES ($1, $2, 'profile', 'avatar.png')`,
        [newProfileId, avatarUrl]
      );

      // 4. Seed default leave balances
      const leaveTypes = [
        { id: 1, days: 12 },
        { id: 2, days: 10 },
        { id: 3, days: 15 },
        { id: 4, days: 90 }
      ];
      for (const lt of leaveTypes) {
        await client.query(
          `INSERT INTO leave_balances (employee_id, leave_type_id, available_days)
           VALUES ($1, $2, $3)`,
          [newProfileId, lt.id, lt.days]
        );
      }

      // 5. Update recruitment application status to Hired
      await client.query(
        "UPDATE recruitment_applications SET status = 'Hired' WHERE id = $1",
        [id]
      );

      await client.query("COMMIT");
      res.json({ 
        message: `${candidate.candidate_name} hired successfully! Employee profile created with password Welcome@123.`,
        employeeId: newProfileId
      });

    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error onboarding hired candidate:", error);
      res.status(500).json({ message: "Failed to complete onboarding for hired candidate" });
    } finally {
      client.release();
    }
  }
);

module.exports = router;
