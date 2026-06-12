const express = require('express');
const router = express.Router();
const payrollService = require('../services/payrollService');
const pool = require('../db');
const roleCheck = require('../middleware/roleCheck');
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';
const jwt = require('jsonwebtoken');

// JWT auth middleware (reuse pattern from report routes)
const requireAuth = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ message: 'Not authenticated' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

/**
 * POST /api/payroll/generate/:month
 * Generate payroll for all employees for the specified month (format YYYY-MM).
 * Only privileged roles can trigger.
 */
router.post('/generate/:month', requireAuth, roleCheck(['admin', 'hr', 'manager']), async (req, res) => {
  const { month } = req.params; // expect YYYY-MM
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ message: 'Month must be in YYYY-MM format' });
  }
  try {
    const result = await payrollService.generateMonthlyPayroll(month);
    res.json({ success: true, month: result.month });
  } catch (err) {
    console.error('Payroll generation error:', err);
    res.status(500).json({ message: 'Failed to generate payroll' });
  }
});

/**
 * GET /api/payroll/reports
 * Retrieve payroll records with optional filters.
 * Query params: month (YYYY-MM), city, department_id, working_mode, min_salary, max_salary
 */
router.get('/reports', requireAuth, roleCheck(['admin', 'hr', 'manager']), async (req, res) => {
  const { month, city, department_id, working_mode, min_salary, max_salary, search } = req.query;
  let query = `
    SELECT p.id, ep.id AS employee_id, u.name, u.email, d.department_name, ep.city, ep.working_mode,
           p.month, p.present_days, p.absent_days, p.gross_salary, p.tds, p.esic, p.pf, 
           p.total_deductions, p.net_salary, ep.salary
    FROM payroll p
    JOIN employee_profiles ep ON p.employee_id = ep.id
    JOIN users u ON ep.user_id = u.id
    LEFT JOIN departments d ON ep.department_id = d.id
    WHERE 1=1
  `;
  const params = [];
  let idx = 1;
  
  if (month) {
    const formattedMonth = month.includes('-01') ? month : `${month}-01`;
    query += ` AND p.month = $${idx}`;
    params.push(formattedMonth);
    idx++;
  }
  if (city) {
    query += ` AND ep.city ILIKE $${idx}`;
    params.push(`%${city}%`);
    idx++;
  }
  if (department_id) {
    query += ` AND ep.department_id = $${idx}`;
    params.push(parseInt(department_id, 10));
    idx++;
  }
  if (working_mode) {
    query += ` AND ep.working_mode ILIKE $${idx}`;
    params.push(`%${working_mode}%`);
    idx++;
  }
  if (min_salary) {
    query += ` AND ep.salary >= $${idx}`;
    params.push(parseFloat(min_salary));
    idx++;
  }
  if (max_salary) {
    query += ` AND ep.salary <= $${idx}`;
    params.push(parseFloat(max_salary));
    idx++;
  }
  if (search && search.trim() !== '') {
    query += ` AND (u.name ILIKE $${idx} OR u.email ILIKE $${idx})`;
    params.push(`%${search.trim()}%`);
    idx++;
  }
  
  query += ' ORDER BY p.month DESC, u.name ASC';
  try {
    const { rows } = await pool.query(query, params);
    res.json({ payroll: rows });
  } catch (err) {
    console.error('Error fetching payroll reports:', err);
    res.status(500).json({ message: 'Failed to fetch payroll reports' });
  }
});

module.exports = router;
