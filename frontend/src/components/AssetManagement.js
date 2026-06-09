import React, { useEffect, useState } from "react";
import axios from "axios";
import { 
  FiPlus, FiEdit, FiTrash, FiActivity, FiTag, 
  FiHardDrive, FiClock, FiCheck, FiX, FiUser, 
  FiCalendar, FiDollarSign, FiSearch, FiInfo 
} from "react-icons/fi";

export default function AssetManagement({ user }) {
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modals & form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Selected asset for actions
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [assetHistory, setAssetHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Asset Form fields (Add / Edit)
  const [assetCode, setAssetCode] = useState("");
  const [assetName, setAssetName] = useState("");
  const [assetType, setAssetType] = useState("Laptop");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchaseCost, setPurchaseCost] = useState("");
  const [assetStatus, setAssetStatus] = useState("Available");

  // Allocation Form fields
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [allocationDate, setAllocationDate] = useState(new Date().toISOString().split("T")[0]);
  const [allocationRemarks, setAllocationRemarks] = useState("");

  // Return Form fields
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split("T")[0]);
  const [returnRemarks, setReturnRemarks] = useState("");
  const [returnTargetStatus, setReturnTargetStatus] = useState("Available");

  const [formStatus, setFormStatus] = useState(null);

  // Employee's own profile state (if they are a regular employee)
  const [myProfileId, setMyProfileId] = useState(null);

  const isAdminOrHrOrManager = user && (user.role === "admin" || user.role === "hr" || user.role === "manager");

  // Load assets
  const fetchAssets = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/assets", {
        params: {
          search: searchTerm,
          type: typeFilter,
          status: statusFilter
        }
      });
      setAssets(res.data.assets || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load assets.");
    } finally {
      setLoading(false);
    }
  };

  // Load employee profiles (for allocation dropdown)
  const fetchEmployees = async () => {
    try {
      const res = await axios.get("/api/employees/profiles");
      setEmployees(res.data.profiles || []);
    } catch (err) {
      console.error("Failed to load employee list", err);
    }
  };

  // Load current employee profile (to filter assets for normal employees)
  const fetchMyProfile = async () => {
    try {
      // Find my profile from all profiles matching user email or id
      const res = await axios.get("/api/employees/profiles");
      const list = res.data.profiles || [];
      const myProf = list.find(p => p.user_id === user.id);
      if (myProf) {
        setMyProfileId(myProf.id);
      }
    } catch (err) {
      console.error("Failed to fetch current user profile", err);
    }
  };

  useEffect(() => {
    fetchAssets();
    if (isAdminOrHrOrManager) {
      fetchEmployees();
    } else {
      fetchMyProfile();
    }
  }, [searchTerm, typeFilter, statusFilter]);

  // Asset Creation
  const handleAddAsset = async (e) => {
    e.preventDefault();
    setFormStatus({ loading: true });
    try {
      await axios.post("/api/assets", {
        asset_code: assetCode,
        asset_name: assetName,
        asset_type: assetType,
        purchase_date: purchaseDate || null,
        purchase_cost: purchaseCost ? parseFloat(purchaseCost) : null
      });
      setFormStatus({ ok: true, message: "Asset cataloged successfully!" });
      resetAssetForm();
      fetchAssets();
      setTimeout(() => {
        setShowAddModal(false);
        setFormStatus(null);
      }, 1500);
    } catch (err) {
      setFormStatus({ ok: false, message: err?.response?.data?.message || "Failed to add asset." });
    }
  };

  // Asset Editing
  const handleEditAsset = async (e) => {
    e.preventDefault();
    setFormStatus({ loading: true });
    try {
      await axios.put(`/api/assets/${selectedAsset.id}`, {
        asset_code: assetCode,
        asset_name: assetName,
        asset_type: assetType,
        purchase_date: purchaseDate || null,
        purchase_cost: purchaseCost ? parseFloat(purchaseCost) : null,
        status: assetStatus
      });
      setFormStatus({ ok: true, message: "Asset updated successfully!" });
      resetAssetForm();
      fetchAssets();
      setTimeout(() => {
        setShowEditModal(false);
        setFormStatus(null);
      }, 1500);
    } catch (err) {
      setFormStatus({ ok: false, message: err?.response?.data?.message || "Failed to update asset." });
    }
  };

  // Open Edit Modal with populated data
  const openEditModal = (asset) => {
    setSelectedAsset(asset);
    setAssetCode(asset.asset_code || "");
    setAssetName(asset.asset_name || "");
    setAssetType(asset.asset_type || "Laptop");
    setPurchaseDate(asset.purchase_date ? asset.purchase_date.split("T")[0] : "");
    setPurchaseCost(asset.purchase_cost || "");
    setAssetStatus(asset.status || "Available");
    setShowEditModal(true);
  };

  // Delete Asset
  const handleDeleteAsset = async (asset) => {
    if (!window.confirm(`Are you sure you want to permanently delete asset "${asset.asset_name}" (${asset.asset_code})?`)) {
      return;
    }
    try {
      await axios.delete(`/api/assets/${asset.id}`);
      fetchAssets();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to delete asset.");
    }
  };

  // Allocate Asset
  const handleAllocateAsset = async (e) => {
    e.preventDefault();
    if (!selectedEmployeeId) return;
    setFormStatus({ loading: true });
    try {
      await axios.post(`/api/assets/${selectedAsset.id}/allocate`, {
        employee_id: parseInt(selectedEmployeeId),
        allocated_date: allocationDate,
        remarks: allocationRemarks
      });
      setFormStatus({ ok: true, message: "Asset allocated successfully!" });
      setSelectedEmployeeId("");
      setAllocationRemarks("");
      fetchAssets();
      setTimeout(() => {
        setShowAllocateModal(false);
        setFormStatus(null);
      }, 1500);
    } catch (err) {
      setFormStatus({ ok: false, message: err?.response?.data?.message || "Failed to allocate asset." });
    }
  };

  // Return Asset
  const handleReturnAsset = async (e) => {
    e.preventDefault();
    setFormStatus({ loading: true });
    try {
      await axios.post(`/api/assets/${selectedAsset.id}/return`, {
        return_date: returnDate,
        remarks: returnRemarks,
        target_status: returnTargetStatus
      });
      setFormStatus({ ok: true, message: "Asset returned to catalog successfully!" });
      setReturnRemarks("");
      fetchAssets();
      setTimeout(() => {
        setShowReturnModal(false);
        setFormStatus(null);
      }, 1500);
    } catch (err) {
      setFormStatus({ ok: false, message: err?.response?.data?.message || "Failed to process asset return." });
    }
  };

  // Fetch Asset History Log
  const viewHistoryLog = async (asset) => {
    setSelectedAsset(asset);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    try {
      const res = await axios.get(`/api/assets/${asset.id}/history`);
      setAssetHistory(res.data.history || []);
    } catch (err) {
      console.error("Failed to load asset history logs", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const resetAssetForm = () => {
    setAssetCode("");
    setAssetName("");
    setAssetType("Laptop");
    setPurchaseDate("");
    setPurchaseCost("");
    setAssetStatus("Available");
    setSelectedAsset(null);
  };

  // Filter assets depending on role
  const displayedAssets = assets.filter((asset) => {
    if (isAdminOrHrOrManager) return true;
    // For regular employees, show assets assigned to them
    return asset.employee_id === myProfileId;
  });

  const getStatusChipClass = (status) => {
    switch (status) {
      case "Available": return "success";
      case "Allocated": return "";
      case "Under Repair": return "warning";
      case "Scrapped": return "danger";
      default: return "";
    }
  };

  const getAssetIcon = (type) => {
    return <FiHardDrive />;
  };

  return (
    <div className="table-card" style={{ padding: "24px" }}>
      
      {/* Upper Title Section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ margin: 0 }}>Asset Directory & Allocation</h2>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "0.85rem" }}>
            {isAdminOrHrOrManager 
              ? "Track, allocate, return and manage the company's hardware assets and licenses." 
              : "Review physical equipment and software licenses allocated to you."}
          </p>
        </div>
        {isAdminOrHrOrManager && (
          <button className="btn" onClick={() => { resetAssetForm(); setShowAddModal(true); }}>
            <FiPlus /> Catalog Asset
          </button>
        )}
      </div>

      {/* Stats row for quick preview */}
      {isAdminOrHrOrManager && (
        <div style={{ display: "flex", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "160px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "6px", padding: "12px 16px" }}>
            <small style={{ color: "var(--muted)", fontWeight: "600" }}>Total Inventory</small>
            <h3 style={{ fontSize: "1.6rem", margin: "4px 0 0" }}>{assets.length}</h3>
          </div>
          <div style={{ flex: 1, minWidth: "160px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "6px", padding: "12px 16px" }}>
            <small style={{ color: "var(--success)", fontWeight: "600" }}>Available</small>
            <h3 style={{ fontSize: "1.6rem", margin: "4px 0 0", color: "var(--success)" }}>
              {assets.filter(a => a.status === "Available").length}
            </h3>
          </div>
          <div style={{ flex: 1, minWidth: "160px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "6px", padding: "12px 16px" }}>
            <small style={{ color: "var(--accent)", fontWeight: "600" }}>Allocated</small>
            <h3 style={{ fontSize: "1.6rem", margin: "4px 0 0", color: "var(--accent)" }}>
              {assets.filter(a => a.status === "Allocated").length}
            </h3>
          </div>
          <div style={{ flex: 1, minWidth: "160px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "6px", padding: "12px 16px" }}>
            <small style={{ color: "#f59e0b", fontWeight: "600" }}>Under Repair</small>
            <h3 style={{ fontSize: "1.6rem", margin: "4px 0 0", color: "#f59e0b" }}>
              {assets.filter(a => a.status === "Under Repair").length}
            </h3>
          </div>
        </div>
      )}

      {/* Search & Filter Row */}
      {isAdminOrHrOrManager && (
        <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "240px", position: "relative" }}>
            <FiSearch style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
            <input 
              type="text" 
              className="input-field" 
              placeholder="Search by asset code or name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: "32px" }}
            />
          </div>
          <div style={{ minWidth: "160px" }}>
            <select className="select-field" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All Types</option>
              <option value="Laptop">Laptop</option>
              <option value="Mouse">Mouse</option>
              <option value="Monitor">Monitor</option>
              <option value="ID Card">ID Card</option>
              <option value="Access Card">Access Card</option>
              <option value="Software Licenses">Software Licenses</option>
            </select>
          </div>
          <div style={{ minWidth: "160px" }}>
            <select className="select-field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="Available">Available</option>
              <option value="Allocated">Allocated</option>
              <option value="Under Repair">Under Repair</option>
              <option value="Scrapped">Scrapped</option>
            </select>
          </div>
        </div>
      )}

      {/* Main Grid/Table view */}
      {loading ? (
        <p style={{ color: "var(--muted)", padding: "20px" }}>Loading catalog data…</p>
      ) : displayedAssets.length === 0 ? (
        <div className="empty-state" style={{ margin: "20px 0" }}>
          <div className="empty-illustration">🗄️</div>
          <h3>No assets found</h3>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "4px" }}>
            {isAdminOrHrOrManager 
              ? "Try adjusting your search filters or add a new asset to inventory." 
              : "No company assets are currently registered to your profile."}
          </p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Asset Code</th>
                <th>Asset Details</th>
                <th>Type</th>
                <th>Purchase Info</th>
                <th>Status</th>
                <th>Current Owner</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedAssets.map((asset) => (
                <tr key={asset.id}>
                  <td>
                    <span style={{ fontFamily: "monospace", fontWeight: "700", background: "var(--surface-alt)", padding: "4px 8px", borderRadius: "4px", border: "1px solid var(--border)" }}>
                      {asset.asset_code}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: "600" }}>{asset.asset_name}</div>
                  </td>
                  <td>{asset.asset_type}</td>
                  <td>
                    <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                      {asset.purchase_date ? asset.purchase_date.split("T")[0] : "N/A"}
                    </div>
                    {asset.purchase_cost && (
                      <div style={{ fontWeight: "600", color: "var(--text)", fontSize: "0.8rem", marginTop: "2px" }}>
                        ${parseFloat(asset.purchase_cost).toLocaleString()}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`chip ${getStatusChipClass(asset.status)}`} style={asset.status === "Under Repair" ? { background: "rgba(245, 158, 11, 0.15)", color: "#d97706" } : {}}>
                      {asset.status}
                    </span>
                  </td>
                  <td>
                    {asset.status === "Allocated" ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "600" }}>
                          <FiUser style={{ color: "var(--accent)" }} size={13} />
                          {asset.employee_name}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                          Assigned: {asset.allocated_date ? asset.allocated_date.split("T")[0] : "N/A"}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: "var(--muted)", fontStyle: "italic", fontSize: "0.8rem" }}>— Available —</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: "6px", justifyContent: "flex-end" }}>
                      
                      {/* Allocate / Return actions */}
                      {isAdminOrHrOrManager && asset.status === "Available" && (
                        <button 
                          className="btn" 
                          onClick={() => { setSelectedAsset(asset); setShowAllocateModal(true); }}
                          style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                        >
                          Allocate
                        </button>
                      )}
                      
                      {isAdminOrHrOrManager && asset.status === "Allocated" && (
                        <button 
                          className="btn secondary" 
                          onClick={() => { setSelectedAsset(asset); setShowReturnModal(true); }}
                          style={{ padding: "4px 10px", fontSize: "0.75rem", borderColor: "var(--border)" }}
                        >
                          Return Check-In
                        </button>
                      )}

                      {/* Audit History Timeline button */}
                      <button
                        className="action-btn view"
                        onClick={() => viewHistoryLog(asset)}
                        title="View Audit Logs"
                        style={{ padding: "6px" }}
                      >
                        <FiClock size={16} />
                      </button>

                      {/* Edit Details button */}
                      {isAdminOrHrOrManager && (
                        <button
                          className="action-btn edit"
                          onClick={() => openEditModal(asset)}
                          title="Edit Asset Details"
                          style={{ padding: "6px" }}
                        >
                          <FiEdit size={16} />
                        </button>
                      )}

                      {/* Delete button */}
                      {isAdminOrHrOrManager && (
                        <button
                          className="action-btn delete"
                          onClick={() => handleDeleteAsset(asset)}
                          title="Scrap/Delete Asset"
                          style={{ padding: "6px" }}
                        >
                          <FiTrash size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- MODAL 1: ADD ASSET --- */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0 }}>Catalog New Asset</h3>
              <button className="icon-btn" onClick={() => setShowAddModal(false)}><FiX size={20} /></button>
            </div>
            
            <form onSubmit={handleAddAsset} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-row">
                <div className="field-group">
                  <label>Asset Serial Code / Unique ID *</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="e.g. LAP-024"
                    value={assetCode} 
                    onChange={(e) => setAssetCode(e.target.value)} 
                    required 
                  />
                </div>
                <div className="field-group">
                  <label>Asset Category Type *</label>
                  <select 
                    className="select-field" 
                    value={assetType} 
                    onChange={(e) => setAssetType(e.target.value)}
                  >
                    <option value="Laptop">Laptop</option>
                    <option value="Mouse">Mouse</option>
                    <option value="Monitor">Monitor</option>
                    <option value="ID Card">ID Card</option>
                    <option value="Access Card">Access Card</option>
                    <option value="Software Licenses">Software Licenses</option>
                  </select>
                </div>
              </div>

              <div className="field-group">
                <label>Asset Name / Model Details *</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. ThinkPad X1 Carbon Gen 11" 
                  value={assetName} 
                  onChange={(e) => setAssetName(e.target.value)} 
                  required 
                />
              </div>

              <div className="form-row">
                <div className="field-group">
                  <label>Purchase Date</label>
                  <input 
                    type="date" 
                    className="input-field" 
                    value={purchaseDate} 
                    onChange={(e) => setPurchaseDate(e.target.value)} 
                  />
                </div>
                <div className="field-group">
                  <label>Purchase Cost ($ USD)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="input-field" 
                    placeholder="e.g. 1299.99"
                    value={purchaseCost} 
                    onChange={(e) => setPurchaseCost(e.target.value)} 
                  />
                </div>
              </div>

              {formStatus && (
                <div className={`status-message ${formStatus.ok ? "success" : "error"}`} style={{ margin: 0 }}>
                  {formStatus.message}
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
                <button type="button" className="btn secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn" disabled={formStatus?.loading}>
                  <FiCheck /> Catalog Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: EDIT ASSET --- */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0 }}>Edit Asset Details</h3>
              <button className="icon-btn" onClick={() => setShowEditModal(false)}><FiX size={20} /></button>
            </div>
            
            <form onSubmit={handleEditAsset} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-row">
                <div className="field-group">
                  <label>Asset Serial Code / Unique ID *</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={assetCode} 
                    onChange={(e) => setAssetCode(e.target.value)} 
                    required 
                  />
                </div>
                <div className="field-group">
                  <label>Asset Category Type *</label>
                  <select 
                    className="select-field" 
                    value={assetType} 
                    onChange={(e) => setAssetType(e.target.value)}
                  >
                    <option value="Laptop">Laptop</option>
                    <option value="Mouse">Mouse</option>
                    <option value="Monitor">Monitor</option>
                    <option value="ID Card">ID Card</option>
                    <option value="Access Card">Access Card</option>
                    <option value="Software Licenses">Software Licenses</option>
                  </select>
                </div>
              </div>

              <div className="field-group">
                <label>Asset Name / Model Details *</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={assetName} 
                  onChange={(e) => setAssetName(e.target.value)} 
                  required 
                />
              </div>

              <div className="form-row">
                <div className="field-group">
                  <label>Purchase Date</label>
                  <input 
                    type="date" 
                    className="input-field" 
                    value={purchaseDate} 
                    onChange={(e) => setPurchaseDate(e.target.value)} 
                  />
                </div>
                <div className="field-group">
                  <label>Purchase Cost ($ USD)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="input-field" 
                    value={purchaseCost} 
                    onChange={(e) => setPurchaseCost(e.target.value)} 
                  />
                </div>
              </div>

              <div className="field-group">
                <label>Inventory Status</label>
                <select 
                  className="select-field" 
                  value={assetStatus} 
                  onChange={(e) => setAssetStatus(e.target.value)}
                  disabled={selectedAsset?.status === "Allocated"}
                >
                  <option value="Available">Available</option>
                  <option value="Allocated" disabled>Allocated (Must allocate via workflow)</option>
                  <option value="Under Repair">Under Repair</option>
                  <option value="Scrapped">Scrapped</option>
                </select>
                {selectedAsset?.status === "Allocated" && (
                  <small style={{ color: "var(--muted)", fontStyle: "italic", marginTop: "2px" }}>
                    Cannot manually change status while allocated. Please return it first.
                  </small>
                )}
              </div>

              {formStatus && (
                <div className={`status-message ${formStatus.ok ? "success" : "error"}`} style={{ margin: 0 }}>
                  {formStatus.message}
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
                <button type="button" className="btn secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn" disabled={formStatus?.loading}>
                  <FiCheck /> Update Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: ALLOCATE ASSET --- */}
      {showAllocateModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0 }}>Handover & Allocate Asset</h3>
              <button className="icon-btn" onClick={() => setShowAllocateModal(false)}><FiX size={20} /></button>
            </div>
            
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "6px", padding: "12px 16px", marginBottom: "16px" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.02em" }}>Asset Selected</div>
              <div style={{ fontWeight: "700", marginTop: "2px" }}>{selectedAsset?.asset_name}</div>
              <div style={{ fontFamily: "monospace", fontSize: "0.8rem", marginTop: "2px", color: "var(--muted)" }}>{selectedAsset?.asset_code} • {selectedAsset?.asset_type}</div>
            </div>

            <form onSubmit={handleAllocateAsset} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="field-group">
                <label>Select Target Employee *</label>
                <select 
                  className="select-field" 
                  value={selectedEmployeeId} 
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Employee profile --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.user_name} ({emp.designation} - {emp.department_name || "No Dept"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-group">
                <label>Allocation Handover Date *</label>
                <input 
                  type="date" 
                  className="input-field" 
                  value={allocationDate} 
                  onChange={(e) => setAllocationDate(e.target.value)} 
                  required
                />
              </div>

              <div className="field-group">
                <label>Remarks / Assignment Details</label>
                <textarea 
                  className="input-field" 
                  style={{ height: "70px", resize: "none" }}
                  placeholder="e.g. Remote workstation provision. Serial check: OK."
                  value={allocationRemarks}
                  onChange={(e) => setAllocationRemarks(e.target.value)}
                />
              </div>

              {formStatus && (
                <div className={`status-message ${formStatus.ok ? "success" : "error"}`} style={{ margin: 0 }}>
                  {formStatus.message}
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
                <button type="button" className="btn secondary" onClick={() => setShowAllocateModal(false)}>Cancel</button>
                <button type="submit" className="btn" disabled={formStatus?.loading}>
                  <FiCheck /> Approve Handover
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 4: RETURN ASSET --- */}
      {showReturnModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0 }}>Return Asset Check-In</h3>
              <button className="icon-btn" onClick={() => setShowReturnModal(false)}><FiX size={20} /></button>
            </div>
            
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "6px", padding: "12px 16px", marginBottom: "16px" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.02em" }}>Asset to Return</div>
              <div style={{ fontWeight: "700", marginTop: "2px" }}>{selectedAsset?.asset_name}</div>
              <div style={{ fontFamily: "monospace", fontSize: "0.8rem", marginTop: "2px", color: "var(--muted)" }}>
                {selectedAsset?.asset_code} • Assigned to: {selectedAsset?.employee_name}
              </div>
            </div>

            <form onSubmit={handleReturnAsset} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-row">
                <div className="field-group">
                  <label>Return Date *</label>
                  <input 
                    type="date" 
                    className="input-field" 
                    value={returnDate} 
                    onChange={(e) => setReturnDate(e.target.value)} 
                    required
                  />
                </div>
                <div className="field-group">
                  <label>New Catalog Inventory Status *</label>
                  <select 
                    className="select-field" 
                    value={returnTargetStatus} 
                    onChange={(e) => setReturnTargetStatus(e.target.value)}
                    required
                  >
                    <option value="Available">Available (Ready to allocate)</option>
                    <option value="Under Repair">Under Repair (Requires service/inspection)</option>
                    <option value="Scrapped">Scrapped (Broken / Out of use)</option>
                  </select>
                </div>
              </div>

              <div className="field-group">
                <label>Inspection Notes / Return Remarks</label>
                <textarea 
                  className="input-field" 
                  style={{ height: "70px", resize: "none" }}
                  placeholder="e.g. Returned in good condition. Minor scratch on screen."
                  value={returnRemarks}
                  onChange={(e) => setReturnRemarks(e.target.value)}
                />
              </div>

              {formStatus && (
                <div className={`status-message ${formStatus.ok ? "success" : "error"}`} style={{ margin: 0 }}>
                  {formStatus.message}
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
                <button type="button" className="btn secondary" onClick={() => setShowReturnModal(false)}>Cancel</button>
                <button type="submit" className="btn" disabled={formStatus?.loading}>
                  <FiCheck /> Complete Return
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 5: AUDIT LOG TIMELINE HISTORY --- */}
      {showHistoryModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: "550px", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0 }}>Audit History Timeline</h3>
              <button className="icon-btn" onClick={() => { setShowHistoryModal(false); setAssetHistory([]); }}><FiX size={20} /></button>
            </div>
            
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "6px", padding: "12px 16px", marginBottom: "20px" }}>
              <small style={{ color: "var(--muted)", fontWeight: "600", textTransform: "uppercase" }}>Equipment Log</small>
              <h4 style={{ fontSize: "1rem", margin: "2px 0 0" }}>{selectedAsset?.asset_name}</h4>
              <div style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "var(--muted)", marginTop: "2px" }}>
                Code: {selectedAsset?.asset_code}
              </div>
            </div>

            {loadingHistory ? (
              <p style={{ color: "var(--muted)", textAlign: "center", padding: "20px" }}>Loading logs timeline…</p>
            ) : assetHistory.length === 0 ? (
              <p style={{ color: "var(--muted)", textAlign: "center", padding: "20px" }}>No activity logs recorded for this asset.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxHeight: "350px", overflowY: "auto", paddingRight: "8px", position: "relative" }}>
                {assetHistory.map((log, idx) => (
                  <div key={log.id} style={{ display: "flex", gap: "14px", position: "relative" }}>
                    
                    {/* Timeline line connector */}
                    {idx < assetHistory.length - 1 && (
                      <div style={{ 
                        position: "absolute", 
                        left: "14px", 
                        top: "28px", 
                        bottom: "-20px", 
                        width: "2px", 
                        background: "var(--border)" 
                      }} />
                    )}

                    {/* Timeline circle icon */}
                    <div style={{ 
                      width: "30px", 
                      height: "30px", 
                      borderRadius: "50%", 
                      background: log.action === "Created" ? "var(--success-bg)" : log.action === "Allocated" ? "var(--accent-soft)" : "var(--danger-bg)", 
                      color: log.action === "Created" ? "var(--success)" : log.action === "Allocated" ? "var(--accent)" : "var(--danger)",
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      flexShrink: 0,
                      border: "1px solid var(--border)"
                    }}>
                      <FiActivity size={14} />
                    </div>

                    {/* Content details */}
                    <div style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "6px", padding: "10px 12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "6px" }}>
                        <strong style={{ fontSize: "0.85rem", color: "var(--text)" }}>{log.action}</strong>
                        <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p style={{ fontSize: "0.8rem", color: "var(--text)", marginTop: "6px", lineHeight: "1.4" }}>{log.remarks}</p>
                      <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
                        <FiUser size={12} /> Logged by: {log.created_by_name || "System"}
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}
            
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
              <button className="btn" onClick={() => { setShowHistoryModal(false); setAssetHistory([]); }}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
