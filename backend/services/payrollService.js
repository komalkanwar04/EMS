const pool = require('../db');
const { format } = require('date-fns');

/**
 * Calculate payroll details for an employee for a given month.
 * @param {Object} employee - employee profile record.
 * @param {Array} attendanceRecords - array of {punch_in, punch_out, punch_date}.
 * @returns {Object} payroll calculation.
 */
function calculatePayroll(employee, attendanceRecords, totalDays) {
  const salary = Number(employee.salary) || 0;
  
  // Count present days
  const presentDaysCount = attendanceRecords.filter(rec => rec.status === 'Present').length;
  const absentDaysCount = Math.max(0, totalDays - presentDaysCount);
  
  const grossSalary = salary;
  
  // Tax & deduction rates
  const TDS_RATE = 0.10; // 10%
  const ESIC_RATE = 0.0175; // 1.75%
  const PF_RATE = 0.12; // 12%
  
  const tds = grossSalary * TDS_RATE;
  const esic = grossSalary * ESIC_RATE;
  const pf = grossSalary * PF_RATE;
  const totalDeductions = tds + esic + pf;
  const netSalary = grossSalary - totalDeductions;
  
  return {
    presentDays: presentDaysCount,
    absentDays: absentDaysCount,
    grossSalary,
    tds,
    esic,
    pf,
    totalDeductions,
    netSalary,
  };
}

/**
 * Generate payroll records for all employees for a month and store them.
 * @param {string} month - format YYYY-MM (e.g., 2026-05)
 */
async function generateMonthlyPayroll(month) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Parse year and month to determine exact days in the month
    const parts = month.split('-');
    const year = parseInt(parts[0], 10);
    const monthNum = parseInt(parts[1], 10);
    const totalDays = new Date(year, monthNum, 0).getDate();
    
    const dbMonth = `${month}-01`; // Store as first day of month
    
    const empRes = await client.query('SELECT * FROM employee_profiles');
    for (const emp of empRes.rows) {
      // Query using punch_date and correct quote escaping
      const attRes = await client.query(
        "SELECT * FROM attendance WHERE employee_id = $1 AND to_char(punch_date, 'YYYY-MM') = $2",
        [emp.id, month]
      );
      
      const payroll = calculatePayroll(emp, attRes.rows, totalDays);
      
      await client.query(
        `INSERT INTO payroll (employee_id, month, present_days, absent_days, gross_salary, tds, esic, pf, total_deductions, net_salary)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (employee_id, month) DO UPDATE SET
           present_days = EXCLUDED.present_days,
           absent_days = EXCLUDED.absent_days,
           gross_salary = EXCLUDED.gross_salary,
           tds = EXCLUDED.tds,
           esic = EXCLUDED.esic,
           pf = EXCLUDED.pf,
           total_deductions = EXCLUDED.total_deductions,
           net_salary = EXCLUDED.net_salary;`,
        [
          emp.id, 
          dbMonth, 
          payroll.presentDays, 
          payroll.absentDays, 
          payroll.grossSalary, 
          payroll.tds, 
          payroll.esic, 
          payroll.pf, 
          payroll.totalDeductions, 
          payroll.netSalary
        ]
      );
    }
    
    await client.query('COMMIT');
    return { success: true, month: dbMonth };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Payroll generation error:', err);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { generateMonthlyPayroll, calculatePayroll };
