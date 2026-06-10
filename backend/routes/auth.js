const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const pool = require("../db");
const crypto = require("crypto");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwtkey";

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
 * /api/auth/signup:
 *   post:
 *     summary: Register a new workspace user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 description: Candidate or admin full name
 *               email:
 *                 type: string
 *                 description: Unique email address
 *               password:
 *                 type: string
 *                 description: Secure password (min 6 characters)
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error or user already exists
 *       500:
 *         description: Server error
 */
router.post(
  "/signup",
  [
    body("name").trim().notEmpty().withMessage("Name is required").escape(),
    body("email").isEmail().withMessage("Invalid email address").normalizeEmail(),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
    handleValidationErrors
  ],
  async (req, res) => {
    try {
      const { name, email, password } = req.body;

      const existingUser = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({
          message: "User already exists"
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      // First user signing up becomes admin
      const insertResult = await pool.query(
        "INSERT INTO users(name,email,password,role) VALUES($1,$2,$3,$4) RETURNING id",
        [name, email, hashedPassword, "admin"]
      );

      const userId = insertResult.rows[0].id;
      const userPayload = {
        id: userId,
        name,
        email,
        role: "admin"
      };

      const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: "24h" });

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      res.status(201).json({
        message: "Signup Successful",
        user: userPayload
      });

    } catch (error) {
      console.error("[Auth Signup Error]", error);
      res.status(500).json({
        message: "Server Error"
      });
    }
  }
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Log in with credentials
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: User not found, invalid password, or validation error
 *       500:
 *         description: Server error
 */
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Invalid email address").normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required"),
    handleValidationErrors
  ],
  async (req, res) => {
    try {
      const { email, password } = req.body;

      const userResult = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
      );

      if (userResult.rows.length === 0) {
        return res.status(400).json({
          message: "User not found"
        });
      }

      const user = userResult.rows[0];
      const validPassword = await bcrypt.compare(
        password,
        user.password
      );

      if (!validPassword) {
        return res.status(400).json({
          message: "Invalid Password"
        });
      }

      const userPayload = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || "user"
      };

      const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: "24h" });

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 24 * 60 * 60 * 1000
      });

      res.status(200).json({
        message: "Login Successful",
        user: userPayload
      });

    } catch (error) {
      console.error("[Auth Login Error]", error);
      res.status(500).json({
        message: "Server Error"
      });
    }
  }
);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current logged-in user profile session
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Current session user returned
 *       401:
 *         description: Not authenticated or invalid token
 */
router.get("/me", (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.status(200).json({ user: decoded });
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Log out from session (clears token cookie)
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
  });
  res.status(200).json({ message: "Logout successful" });
});

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request a password reset OTP or link
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - method
 *             properties:
 *               email:
 *                 type: string
 *               method:
 *                 type: string
 *                 enum: [otp, link]
 *     responses:
 *       200:
 *         description: OTP or Link generated and sent successfully
 *       400:
 *         description: User not found or invalid method
 *       500:
 *         description: Server error
 */
router.post(
  "/forgot-password",
  [
    body("email").isEmail().withMessage("Invalid email address").normalizeEmail(),
    body("method").isIn(["otp", "link"]).withMessage("Method must be 'otp' or 'link'"),
    handleValidationErrors
  ],
  async (req, res) => {
    try {
      const { email, method } = req.body;

      const userResult = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
      );

      if (userResult.rows.length === 0) {
        return res.status(400).json({ message: "User not found" });
      }

      const { sendEmail } = require("../utils/email");

      if (method === "otp") {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await pool.query(
          "UPDATE users SET reset_otp = $1, reset_otp_expiry = $2 WHERE email = $3",
          [otp, expiry, email]
        );

        const emailResult = await sendEmail({
          to: email,
          subject: "PeopleSync EMS - Password Reset OTP",
          text: `Dear User,\n\nWe received a request to reset your password.\nIf you did not request this reset, please ignore this email. If you suspect unauthorized access to your account, change your password immediately.\n\nBelow is the OTP:\n${otp}\n\nThis OTP is valid for 10 minutes.\n\nRegards,`,
          html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<p>Dear User,</p>
<p>We received a request to reset your password.</p>
<p>If you did not request this reset, please ignore this email. If you suspect unauthorized access to your account, change your password immediately.</p>
<p style="margin: 20px 0; color: #555;"><strong>Below is the OTP:</strong></p>
<div style="background-color: #f3f4f6; border: 1px solid #e5e7eb; padding: 15px; text-align: center; border-radius: 6px; margin: 15px 0; width: fit-content; min-width: 150px;">
  <strong style="font-size: 1.5rem; letter-spacing: 2px; color: #3b82f6;">${otp}</strong>
</div>
<p style="font-size: 0.85rem; color: #6b7280;">This OTP is valid for 10 minutes.</p>
<br>
<p>Regards,</p>
</div>`
        });

        const statusMsg = emailResult.simulated
          ? "OTP sent to your email. (Please check backend console logs for simulation)"
          : "OTP successfully sent to your email.";

        return res.status(200).json({ message: statusMsg });
      } else {
        const token = crypto.randomBytes(32).toString("hex");
        const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        await pool.query(
          "UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE email = $3",
          [token, expiry, email]
        );

        const resetLink = `${process.env.FRONTEND_URL || "http://localhost:3000"}/?action=reset-password&token=${token}&email=${encodeURIComponent(email)}`;

        const emailResult = await sendEmail({
          to: email,
          subject: "PeopleSync EMS - Password Reset Link",
          text: `Dear User,\n\nWe received a request to reset your password.\nIf you did not request this reset, please ignore this email. If you suspect unauthorized access to your account, change your password immediately.\n\nClick the link below to reset the password:\n${resetLink}\n\nThis link is valid for 15 minutes.\n\nRegards,`,
          html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<p>Dear User,</p>
<p>We received a request to reset your password.</p>
<p>If you did not request this reset, please ignore this email. If you suspect unauthorized access to your account, change your password immediately.</p>
<p style="margin: 20px 0; color: #555;"><strong>Click the link below to reset the password:</strong></p>
<p style="margin: 20px 0;">
  <a href="${resetLink}" style="padding: 10px 18px; color: #fff; background-color: #3b82f6; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Reset Password</a>
</p>
<p style="color: #6b7280; font-size: 0.85rem; word-break: break-all;">Alternatively, copy and paste this link in your browser:<br>${resetLink}</p>
<p style="font-size: 0.85rem; color: #6b7280; margin-top: 10px;">This link is valid for 15 minutes.</p>
<br>
<p>Regards,</p>
</div>`
        });

        const statusMsg = emailResult.simulated
          ? "Reset link sent to your email. (Please check backend console logs for simulation)"
          : "Reset link successfully sent to your email.";

        return res.status(200).json({ message: statusMsg });
      }
    } catch (error) {
      console.error("[Auth Forgot-Password Error]", error);
      res.status(500).json({ message: "Server Error" });
    }
  }
);

/**
 * @swagger
 * /api/auth/reset-password-otp:
 *   post:
 *     summary: Reset password using OTP
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       400:
 *         description: Invalid/expired OTP or validation failure
 */
router.post(
  "/reset-password-otp",
  [
    body("email").isEmail().withMessage("Invalid email address").normalizeEmail(),
    body("otp").notEmpty().withMessage("OTP is required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
    handleValidationErrors
  ],
  async (req, res) => {
    try {
      const { email, otp, password } = req.body;

      const userResult = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
      );

      if (userResult.rows.length === 0) {
        return res.status(400).json({ message: "User not found" });
      }

      const user = userResult.rows[0];

      if (!user.reset_otp || user.reset_otp !== otp || new Date() > new Date(user.reset_otp_expiry)) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      await pool.query(
        "UPDATE users SET password = $1, reset_otp = NULL, reset_otp_expiry = NULL WHERE email = $2",
        [hashedPassword, email]
      );

      res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("[Auth Reset-Password-OTP Error]", error);
      res.status(500).json({ message: "Server Error" });
    }
  }
);

/**
 * @swagger
 * /api/auth/reset-password-link:
 *   post:
 *     summary: Reset password using reset link token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - token
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       400:
 *         description: Invalid/expired token or validation failure
 */
router.post(
  "/reset-password-link",
  [
    body("email").isEmail().withMessage("Invalid email address").normalizeEmail(),
    body("token").notEmpty().withMessage("Token is required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
    handleValidationErrors
  ],
  async (req, res) => {
    try {
      const { email, token, password } = req.body;

      const userResult = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
      );

      if (userResult.rows.length === 0) {
        return res.status(400).json({ message: "User not found" });
      }

      const user = userResult.rows[0];

      if (!user.reset_token || user.reset_token !== token || new Date() > new Date(user.reset_token_expiry)) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      await pool.query(
        "UPDATE users SET password = $1, reset_token = NULL, reset_token_expiry = NULL WHERE email = $2",
        [hashedPassword, email]
      );

      res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("[Auth Reset-Password-Link Error]", error);
      res.status(500).json({ message: "Server Error" });
    }
  }
);

// Middleware to require auth and admin role
const requireAdmin = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

/**
 * @swagger
 * /api/auth/smtp-settings:
 *   get:
 *     summary: Get SMTP configuration settings
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: SMTP settings returned
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.get("/smtp-settings", requireAdmin, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM smtp_settings WHERE id = 1");
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "SMTP settings not found" });
    }
    const settings = result.rows[0];
    // Obfuscate the password field before sending to client
    if (settings.password) {
      settings.password = "********";
    }
    res.json({ smtpSettings: settings });
  } catch (error) {
    console.error("[GET SMTP Settings Error]", error);
    res.status(500).json({ message: "Server Error" });
  }
});

/**
 * @swagger
 * /api/auth/smtp-settings:
 *   put:
 *     summary: Update SMTP configuration settings
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               host:
 *                 type: string
 *               port:
 *                 type: integer
 *               secure:
 *                 type: boolean
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               from_email:
 *                 type: string
 *               is_enabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: SMTP settings updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.put(
  "/smtp-settings",
  requireAdmin,
  [
    body("host").trim().notEmpty().withMessage("SMTP Host is required"),
    body("port").isInt({ min: 1, max: 65535 }).withMessage("Port must be between 1 and 65535"),
    body("secure").isBoolean().withMessage("Secure must be a boolean"),
    body("username").trim().notEmpty().withMessage("Username is required"),
    body("from_email").isEmail().withMessage("Invalid Sender Email format"),
    body("is_enabled").isBoolean().withMessage("is_enabled must be a boolean"),
    handleValidationErrors
  ],
  async (req, res) => {
    try {
      const { host, port, secure, username, password, from_email, is_enabled } = req.body;

      // Handle password updates: if it is "********", don't change it. Otherwise, update it.
      let updateQuery;
      let queryParams;

      if (password === "********" || !password) {
        updateQuery = `
          UPDATE smtp_settings
          SET host = $1, port = $2, secure = $3, username = $4, from_email = $5, is_enabled = $6
          WHERE id = 1
          RETURNING *`;
        queryParams = [host, Number(port), secure, username, from_email, is_enabled];
      } else {
        updateQuery = `
          UPDATE smtp_settings
          SET host = $1, port = $2, secure = $3, username = $4, password = $5, from_email = $6, is_enabled = $7
          WHERE id = 1
          RETURNING *`;
        queryParams = [host, Number(port), secure, username, password, from_email, is_enabled];
      }

      const result = await pool.query(updateQuery, queryParams);
      const settings = result.rows[0];
      if (settings.password) {
        settings.password = "********";
      }

      res.json({ message: "SMTP configuration updated successfully", smtpSettings: settings });
    } catch (error) {
      console.error("[PUT SMTP Settings Error]", error);
      res.status(500).json({ message: "Server Error" });
    }
  }
);

/**
 * @swagger
 * /api/auth/test-smtp:
 *   post:
 *     summary: Send a test email to verify SMTP configuration
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - test_email
 *             properties:
 *               test_email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Test email sent successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Forbidden
 *       500:
 *         description: SMTP verification failure
 */
router.post(
  "/test-smtp",
  requireAdmin,
  [
    body("test_email").isEmail().withMessage("Invalid test recipient email address"),
    handleValidationErrors
  ],
  async (req, res) => {
    const { test_email } = req.body;
    try {
      const { sendEmail } = require("../utils/email");

      // Verify SMTP settings are active
      const smtpRes = await pool.query("SELECT * FROM smtp_settings WHERE id = 1");
      const settings = smtpRes.rows[0];
      
      if (!settings || !settings.is_enabled) {
        return res.status(400).json({ message: "Please enable SMTP and save configurations before running a connection test." });
      }

      await sendEmail({
        to: test_email,
        subject: "PeopleSync EMS - SMTP Connection Test",
        text: `Congratulations! Your SMTP settings have been configured correctly.
Timestamp: ${new Date().toLocaleString()}
Secure: ${settings.secure}
Port: ${settings.port}
Host: ${settings.host}`,
        html: `<h3>PeopleSync EMS - SMTP Connection Test</h3>
<p>Congratulations! Your SMTP settings have been configured correctly.</p>
<ul>
  <li><strong>Timestamp:</strong> ${new Date().toLocaleString()}</li>
  <li><strong>SMTP Host:</strong> ${settings.host}</li>
  <li><strong>Port:</strong> ${settings.port}</li>
  <li><strong>Secure Mode:</strong> ${settings.secure ? "SSL/TLS (Port 465)" : "Standard/STARTTLS (Port 587)"}</li>
</ul>
<p>This is a system-generated message to verify your mail connection. Please do not reply.</p>`
      });

      res.status(200).json({ message: `Test email successfully dispatched to ${test_email}. Please check your inbox!` });
    } catch (error) {
      console.error("[SMTP Connection Test Error]", error);
      res.status(500).json({ message: `SMTP connection check failed: ${error.message || error}` });
    }
  }
);

module.exports = router;