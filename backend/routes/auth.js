const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const pool = require("../db");

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

module.exports = router;