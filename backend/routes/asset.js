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

// -------------------------------------------------------------
// GET /api/assets - List assets with filters
// -------------------------------------------------------------
router.get("/", requireAuth, async (req, res) => {
  try {
    const { search, type, status } = req.query;
    let queryText = `
      SELECT a.*, 
             aa.id AS allocation_id, 
             aa.employee_id, 
             u.name AS employee_name, 
             u.email AS employee_email, 
             aa.allocated_date,
             aa.allocated_by,
             ab.name AS allocated_by_name
      FROM assets a
      LEFT JOIN asset_allocations aa ON a.id = aa.asset_id AND aa.status = 'Active'
      LEFT JOIN employee_profiles ep ON aa.employee_id = ep.id
      LEFT JOIN users u ON ep.user_id = u.id
      LEFT JOIN users ab ON aa.allocated_by = ab.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramIndex = 1;

    if (search && search.trim() !== "") {
      queryText += ` AND (a.asset_code ILIKE $${paramIndex} OR a.asset_name ILIKE $${paramIndex})`;
      queryParams.push(`%${search.trim()}%`);
      paramIndex++;
    }

    if (type && type.trim() !== "") {
      queryText += ` AND a.asset_type = $${paramIndex}`;
      queryParams.push(type.trim());
      paramIndex++;
    }

    if (status && status.trim() !== "") {
      queryText += ` AND a.status = $${paramIndex}`;
      queryParams.push(status.trim());
      paramIndex++;
    }

    queryText += ` ORDER BY a.created_at DESC`;

    const result = await pool.query(queryText, queryParams);
    res.json({ assets: result.rows });
  } catch (error) {
    console.error("Error loading assets:", error);
    res.status(500).json({ message: "Unable to load assets" });
  }
});

// -------------------------------------------------------------
// POST /api/assets - Create new asset
// -------------------------------------------------------------
router.post("/", requireAuth, async (req, res) => {
  const { asset_code, asset_name, asset_type, purchase_date, purchase_cost } = req.body;

  if (!asset_code || !asset_code.trim()) {
    return res.status(400).json({ message: "Asset code is required" });
  }
  if (!asset_name || !asset_name.trim()) {
    return res.status(400).json({ message: "Asset name is required" });
  }
  if (!asset_type || !asset_type.trim()) {
    return res.status(400).json({ message: "Asset type is required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check code uniqueness
    const checkExist = await client.query("SELECT id FROM assets WHERE asset_code = $1", [asset_code.trim()]);
    if (checkExist.rows.length > 0) {
      return res.status(400).json({ message: `Asset code '${asset_code.trim()}' is already in use` });
    }

    const result = await client.query(
      `INSERT INTO assets (asset_code, asset_name, asset_type, purchase_date, purchase_cost, status)
       VALUES ($1, $2, $3, $4, $5, 'Available')
       RETURNING *`,
      [
        asset_code.trim(),
        asset_name.trim(),
        asset_type.trim(),
        purchase_date || null,
        purchase_cost || null
      ]
    );

    const newAsset = result.rows[0];

    // Log in history
    await client.query(
      `INSERT INTO asset_history (asset_id, action, remarks, created_by)
       VALUES ($1, 'Created', $2, $3)`,
      [newAsset.id, `Asset cataloged with cost: ${purchase_cost || "N/A"}`, req.user.id]
    );

    await client.query("COMMIT");
    res.status(201).json({ message: "Asset cataloged successfully", asset: newAsset });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating asset:", error);
    res.status(500).json({ message: "Unable to create asset" });
  } finally {
    client.release();
  }
});

// -------------------------------------------------------------
// PUT /api/assets/:id - Update asset
// -------------------------------------------------------------
router.put("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { asset_code, asset_name, asset_type, purchase_date, purchase_cost, status } = req.body;

  if (!asset_code || !asset_code.trim()) {
    return res.status(400).json({ message: "Asset code is required" });
  }
  if (!asset_name || !asset_name.trim()) {
    return res.status(400).json({ message: "Asset name is required" });
  }
  if (!asset_type || !asset_type.trim()) {
    return res.status(400).json({ message: "Asset type is required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check asset exists
    const currentAssetRes = await client.query("SELECT * FROM assets WHERE id = $1", [id]);
    if (currentAssetRes.rows.length === 0) {
      return res.status(404).json({ message: "Asset not found" });
    }
    const currentAsset = currentAssetRes.rows[0];

    // Check code uniqueness excluding itself
    const checkExist = await client.query("SELECT id FROM assets WHERE asset_code = $1 AND id <> $2", [asset_code.trim(), id]);
    if (checkExist.rows.length > 0) {
      return res.status(400).json({ message: `Asset code '${asset_code.trim()}' is already in use` });
    }

    const proposedStatus = status || currentAsset.status;

    // Handle allocation release if status changes to Scrapped or Under Repair from Allocated
    if (currentAsset.status === "Allocated" && proposedStatus !== "Allocated") {
      // Find active allocation
      const activeAlloc = await client.query(
        "SELECT id FROM asset_allocations WHERE asset_id = $1 AND status = 'Active'",
        [id]
      );
      if (activeAlloc.rows.length > 0) {
        // Automatically release/return allocation
        await client.query(
          `UPDATE asset_allocations 
           SET status = 'Returned', return_date = CURRENT_DATE, remarks = COALESCE(remarks, '') || ' (Auto-returned due to asset status change to ' || $1 || ')'
           WHERE id = $2`,
          [proposedStatus, activeAlloc.rows[0].id]
        );
        await client.query(
          `INSERT INTO asset_history (asset_id, action, remarks, created_by)
           VALUES ($1, 'Returned', $2, $3)`,
          [id, `Auto-returned active assignment due to asset state change to ${proposedStatus}`, req.user.id]
        );
      }
    }

    // Update asset details
    const result = await client.query(
      `UPDATE assets 
       SET asset_code = $1, asset_name = $2, asset_type = $3, purchase_date = $4, purchase_cost = $5, status = $6
       WHERE id = $7
       RETURNING *`,
      [
        asset_code.trim(),
        asset_name.trim(),
        asset_type.trim(),
        purchase_date || null,
        purchase_cost || null,
        proposedStatus,
        id
      ]
    );

    const updatedAsset = result.rows[0];

    // Write audit details if status changed or name/code changed
    let logRemarks = "Asset details updated.";
    if (currentAsset.status !== proposedStatus) {
      logRemarks += ` Status changed from '${currentAsset.status}' to '${proposedStatus}'.`;
    }
    await client.query(
      `INSERT INTO asset_history (asset_id, action, remarks, created_by)
       VALUES ($1, 'Status Changed', $2, $3)`,
      [id, logRemarks, req.user.id]
    );

    await client.query("COMMIT");
    res.json({ message: "Asset updated successfully", asset: updatedAsset });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating asset:", error);
    res.status(500).json({ message: "Unable to update asset" });
  } finally {
    client.release();
  }
});

// -------------------------------------------------------------
// DELETE /api/assets/:id - Delete asset
// -------------------------------------------------------------
router.delete("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("DELETE FROM assets WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Asset not found" });
    }
    res.json({ message: "Asset deleted successfully" });
  } catch (error) {
    console.error("Error deleting asset:", error);
    res.status(500).json({ message: "Unable to delete asset" });
  }
});

// -------------------------------------------------------------
// POST /api/assets/:id/allocate - Allocate an asset to employee
// -------------------------------------------------------------
router.post("/:id/allocate", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { employee_id, allocated_date, remarks } = req.body;

  if (!employee_id) {
    return res.status(400).json({ message: "Employee is required for allocation" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Fetch asset details & lock row for update to prevent concurrent double bookings
    const assetRes = await client.query("SELECT * FROM assets WHERE id = $1 FOR UPDATE", [id]);
    if (assetRes.rows.length === 0) {
      return res.status(404).json({ message: "Asset not found" });
    }
    const asset = assetRes.rows[0];

    // 2. Validate asset is available
    if (asset.status !== "Available") {
      return res.status(400).json({ 
        message: `Asset is not available for allocation. Current status: ${asset.status}` 
      });
    }

    // 3. Verify target employee exists
    const empRes = await client.query(
      `SELECT ep.id, u.name 
       FROM employee_profiles ep 
       JOIN users u ON ep.user_id = u.id 
       WHERE ep.id = $1`,
      [employee_id]
    );
    if (empRes.rows.length === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }
    const employee = empRes.rows[0];

    // 4. Update asset status to 'Allocated'
    await client.query("UPDATE assets SET status = 'Allocated' WHERE id = $1", [id]);

    // 5. Create active allocation entry
    const allocDate = allocated_date || new Date().toISOString().split("T")[0];
    const allocRes = await client.query(
      `INSERT INTO asset_allocations (asset_id, employee_id, allocated_by, allocated_date, status, remarks)
       VALUES ($1, $2, $3, $4, 'Active', $5)
       RETURNING *`,
      [id, employee_id, req.user.id, allocDate, remarks || null]
    );

    // 6. Write to asset history log
    const historyRemarks = `Allocated to ${employee.name}. Remarks: ${remarks || "None"}`;
    await client.query(
      `INSERT INTO asset_history (asset_id, action, remarks, created_by)
       VALUES ($1, 'Allocated', $2, $3)`,
      [id, historyRemarks, req.user.id]
    );

    await client.query("COMMIT");
    res.json({ 
      message: `Asset allocated to ${employee.name} successfully`,
      allocation: allocRes.rows[0]
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error allocating asset:", error);
    res.status(500).json({ message: "Unable to allocate asset" });
  } finally {
    client.release();
  }
});

// -------------------------------------------------------------
// POST /api/assets/:id/return - Return an allocated asset
// -------------------------------------------------------------
router.post("/:id/return", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { return_date, remarks, target_status } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Fetch asset details & check status
    const assetRes = await client.query("SELECT * FROM assets WHERE id = $1 FOR UPDATE", [id]);
    if (assetRes.rows.length === 0) {
      return res.status(404).json({ message: "Asset not found" });
    }
    const asset = assetRes.rows[0];

    if (asset.status !== "Allocated") {
      return res.status(400).json({ message: "Asset is not currently allocated" });
    }

    // 2. Find active allocation
    const allocRes = await client.query(
      `SELECT aa.*, u.name AS employee_name 
       FROM asset_allocations aa
       JOIN employee_profiles ep ON aa.employee_id = ep.id
       JOIN users u ON ep.user_id = u.id
       WHERE aa.asset_id = $1 AND aa.status = 'Active'`,
      [id]
    );
    if (allocRes.rows.length === 0) {
      return res.status(400).json({ message: "No active allocation records found for this asset" });
    }
    const activeAlloc = allocRes.rows[0];

    // 3. Mark allocation as returned
    const retDate = return_date || new Date().toISOString().split("T")[0];
    await client.query(
      `UPDATE asset_allocations 
       SET status = 'Returned', return_date = $1, remarks = COALESCE(remarks, '') || ' | Returned: ' || $2
       WHERE id = $3`,
      [retDate, remarks || "No return notes", activeAlloc.id]
    );

    // 4. Update asset status (default back to 'Available' unless user specified e.g., 'Under Repair')
    const finalStatus = target_status || "Available";
    await client.query("UPDATE assets SET status = $1 WHERE id = $2", [finalStatus, id]);

    // 5. Write to history
    const historyRemarks = `Returned by ${activeAlloc.employee_name}. Handover Status: ${finalStatus}. Notes: ${remarks || "None"}`;
    await client.query(
      `INSERT INTO asset_history (asset_id, action, remarks, created_by)
       VALUES ($1, 'Returned', $2, $3)`,
      [id, historyRemarks, req.user.id]
    );

    await client.query("COMMIT");
    res.json({ message: "Asset marked as returned successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error returning asset:", error);
    res.status(500).json({ message: "Unable to return asset" });
  } finally {
    client.release();
  }
});

// -------------------------------------------------------------
// GET /api/assets/:id/history - Get transaction logs
// -------------------------------------------------------------
router.get("/:id/history", requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    // Verify asset exists
    const checkAsset = await pool.query("SELECT id FROM assets WHERE id = $1", [id]);
    if (checkAsset.rows.length === 0) {
      return res.status(404).json({ message: "Asset not found" });
    }

    const result = await pool.query(
      `SELECT h.*, u.name AS created_by_name 
       FROM asset_history h
       LEFT JOIN users u ON h.created_by = u.id
       WHERE h.asset_id = $1
       ORDER BY h.created_at DESC`,
      [id]
    );
    res.json({ history: result.rows });
  } catch (error) {
    console.error("Error loading asset history:", error);
    res.status(500).json({ message: "Unable to load asset history logs" });
  }
});

module.exports = router;
