import React, { useEffect, useState } from "react";
import axios from "axios";
import { 
  FiFileText, FiUsers, FiCalendar, FiHardDrive, 
  FiSearch, FiFilter, FiDollarSign, FiClock, FiUser 
} from "react-icons/fi";

export default function ReportingManagement({ user }) {
  const [activeTab, setActiveTab] = useState("employees"); // employees, leaves, assets
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Metadata dropdowns
  const [departments, setDepartments] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);

  // Employee Filter States
  const [empDept, setEmpDept] = useState("");
  const [empDesignation, setEmpDesignation] = useState("");

  // Leave Filter States
  const [leaveStatus, setLeaveStatus] = useState("");
  const [leaveType, setLeaveType] = useState("");
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");

  // Asset Filter States
  const [assetType, setAssetType] = useState("");
  const [assetStatus, setAssetStatus] = useState("");
  const [assetMinCost, setAssetMinCost] = useState("");
  const [assetMaxCost, setAssetMaxCost] = useState("");

  // Fetch dropdown metadata
  const fetchMetadata = async () => {
    try {
      const deptsRes = await axios.get("/api/employees/departments");
      setDepartments(deptsRes.data.departments || []);
      
      const leaveTypesRes = await axios.get("/api/leaves/types");
      setLeaveTypes(leaveTypesRes.data.leaveTypes || []);
    } catch (err) {
      console.error("Failed to load reporting filters metadata", err);
    }
  };

  // Fetch reports based on selected tab and filters
  const fetchReportData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === "employees") {
        const res = await axios.get("/api/reports/employees", {
          params: {
            department_id: empDept,
            designation: empDesignation
          }
        });
        setData(res.data.employees || []);
      } else if (activeTab === "leaves") {
        const res = await axios.get("/api/reports/leaves", {
          params: {
            status: leaveStatus,
            leave_type_id: leaveType,
            start_date: leaveStart,
            end_date: leaveEnd
          }
        });
        setData(res.data.leaves || []);
      } else if (activeTab === "assets") {
        const res = await axios.get("/api/reports/assets", {
          params: {
            asset_type: assetType,
            status: assetStatus,
            min_cost: assetMinCost,
            max_cost: assetMaxCost
          }
        });
        setData(res.data.assets || []);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to retrieve report statistics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [
    activeTab,
    empDept, empDesignation,
    leaveStatus, leaveType, leaveStart, leaveEnd,
    assetType, assetStatus, assetMinCost, assetMaxCost
  ]);

  const handleResetFilters = () => {
    setEmpDept("");
    setEmpDesignation("");
    setLeaveStatus("");
    setLeaveType("");
    setLeaveStart("");
    setLeaveEnd("");
    setAssetType("");
    setAssetStatus("");
    setAssetMinCost("");
    setAssetMaxCost("");
  };

  const getStatusChipClass = (status) => {
    if (!status) return "";
    const lower = status.toLowerCase();
    if (lower.includes("approved") || lower === "active" || lower === "available") return "success";
    if (lower.includes("reject") || lower === "scrapped") return "danger";
    if (lower.includes("pending") || lower === "under repair") return "warning";
    return "";
  };

  return (
    <div className="table-card" style={{ padding: "24px" }}>
      
      {/* Title */}
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ margin: 0 }}>Reporting Module</h2>
        <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "0.85rem" }}>
          Analyze company operational metrics across directories, logs, and catalogs.
        </p>
      </div>

      {/* Tabs Row */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "24px", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
        <button 
          className={`auth-tab ${activeTab === "employees" ? "active" : ""}`}
          onClick={() => { setActiveTab("employees"); setData([]); }}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "transparent", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "0.9rem" }}
        >
          <FiUsers /> Employee Reports
        </button>
        <button 
          className={`auth-tab ${activeTab === "leaves" ? "active" : ""}`}
          onClick={() => { setActiveTab("leaves"); setData([]); }}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "transparent", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "0.9rem" }}
        >
          <FiCalendar /> Leave Reports
        </button>
        <button 
          className={`auth-tab ${activeTab === "assets" ? "active" : ""}`}
          onClick={() => { setActiveTab("assets"); setData([]); }}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "transparent", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "0.9rem" }}
        >
          <FiHardDrive /> Asset Reports
        </button>
      </div>

      {/* Filter Panels */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "6px", padding: "16px", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", fontWeight: "600", fontSize: "0.85rem" }}>
          <FiFilter style={{ color: "var(--accent)" }} /> Filter Records
        </div>

        {/* 1. Employee filters */}
        {activeTab === "employees" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
            <div className="field-group">
              <label style={{ fontSize: "0.75rem" }}>Department</label>
              <select className="select-field" value={empDept} onChange={(e) => setEmpDept(e.target.value)}>
                <option value="">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.department_name}</option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label style={{ fontSize: "0.75rem" }}>Designation</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g. Developer"
                value={empDesignation} 
                onChange={(e) => setEmpDesignation(e.target.value)} 
              />
            </div>
          </div>
        )}

        {/* 2. Leave filters */}
        {activeTab === "leaves" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
            <div className="field-group">
              <label style={{ fontSize: "0.75rem" }}>Approval Status</label>
              <select className="select-field" value={leaveStatus} onChange={(e) => setLeaveStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="Pending Manager Approval">Pending Manager Approval</option>
                <option value="Pending HR Approval">Pending HR Approval</option>
                <option value="Approved">Approved</option>
                <option value="Rejected by Manager">Rejected by Manager</option>
                <option value="Rejected by HR">Rejected by HR</option>
              </select>
            </div>
            <div className="field-group">
              <label style={{ fontSize: "0.75rem" }}>Leave Category</label>
              <select className="select-field" value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
                <option value="">All Leave Types</option>
                {leaveTypes.map(lt => (
                  <option key={lt.id} value={lt.id}>{lt.leave_name}</option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label style={{ fontSize: "0.75rem" }}>From Date</label>
              <input 
                type="date" 
                className="input-field" 
                value={leaveStart} 
                onChange={(e) => setLeaveStart(e.target.value)} 
              />
            </div>
            <div className="field-group">
              <label style={{ fontSize: "0.75rem" }}>To Date</label>
              <input 
                type="date" 
                className="input-field" 
                value={leaveEnd} 
                onChange={(e) => setLeaveEnd(e.target.value)} 
              />
            </div>
          </div>
        )}

        {/* 3. Asset filters */}
        {activeTab === "assets" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
            <div className="field-group">
              <label style={{ fontSize: "0.75rem" }}>Asset Category</label>
              <select className="select-field" value={assetType} onChange={(e) => setAssetType(e.target.value)}>
                <option value="">All Types</option>
                <option value="Laptop">Laptop</option>
                <option value="Mouse">Mouse</option>
                <option value="Monitor">Monitor</option>
                <option value="ID Card">ID Card</option>
                <option value="Access Card">Access Card</option>
                <option value="Software Licenses">Software Licenses</option>
              </select>
            </div>
            <div className="field-group">
              <label style={{ fontSize: "0.75rem" }}>Status</label>
              <select className="select-field" value={assetStatus} onChange={(e) => setAssetStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="Available">Available</option>
                <option value="Allocated">Allocated</option>
                <option value="Under Repair">Under Repair</option>
                <option value="Scrapped">Scrapped</option>
              </select>
            </div>
            <div className="field-group">
              <label style={{ fontSize: "0.75rem" }}>Min Cost</label>
              <input 
                type="number" 
                className="input-field" 
                placeholder="e.g. 50"
                value={assetMinCost} 
                onChange={(e) => setAssetMinCost(e.target.value)} 
              />
            </div>
            <div className="field-group">
              <label style={{ fontSize: "0.75rem" }}>Max Cost</label>
              <input 
                type="number" 
                className="input-field" 
                placeholder="e.g. 2000"
                value={assetMaxCost} 
                onChange={(e) => setAssetMaxCost(e.target.value)} 
              />
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
          <button className="btn secondary" onClick={handleResetFilters} style={{ padding: "4px 12px", fontSize: "0.8rem", borderColor: "var(--border)" }}>
            Reset Filters
          </button>
        </div>
      </div>

      {/* Grid Content */}
      {loading ? (
        <p style={{ color: "var(--muted)", padding: "20px" }}>Compiling reports data…</p>
      ) : error ? (
        <div className="status-message error">{error}</div>
      ) : data.length === 0 ? (
        <div className="empty-state">
          <div className="empty-illustration">📊</div>
          <h3>No records found</h3>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "4px" }}>
            No records matched the selected query parameters. Try widening your filters.
          </p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          
          {/* Employee table */}
          {activeTab === "employees" && (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Salary</th>
                  <th>Skills Capability</th>
                  <th>Join Date</th>
                </tr>
              </thead>
              <tbody>
                {data.map((emp) => (
                  <tr key={emp.id}>
                    <td><strong>{emp.name}</strong></td>
                    <td>{emp.email}</td>
                    <td>{emp.phone || "N/A"}</td>
                    <td>{emp.department_name || "Unassigned"}</td>
                    <td>{emp.designation}</td>
                    <td>{emp.salary ? `$${parseFloat(emp.salary).toLocaleString()}` : "N/A"}</td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {Array.isArray(emp.skills) && emp.skills.length > 0 ? (
                          emp.skills.map((skill, i) => (
                            <span key={i} className="chip" style={{ fontSize: "0.7rem", padding: "1px 6px" }}>{skill}</span>
                          ))
                        ) : (
                          <span style={{ fontStyle: "italic", fontSize: "0.8rem", color: "var(--muted)" }}>None</span>
                        )}
                      </div>
                    </td>
                    <td>{emp.created_at ? emp.created_at.split("T")[0] : "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Leave table */}
          {activeTab === "leaves" && (
            <table>
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Leave Type</th>
                  <th>Period</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Manager Action</th>
                  <th>HR Action</th>
                  <th>Request Date</th>
                </tr>
              </thead>
              <tbody>
                {data.map((leave) => (
                  <tr key={leave.id}>
                    <td><strong>{leave.employee_name}</strong></td>
                    <td>{leave.leave_name}</td>
                    <td>
                      <div style={{ fontSize: "0.8rem" }}>
                        {leave.start_date ? leave.start_date.split("T")[0] : ""} to {leave.end_date ? leave.end_date.split("T")[0] : ""}
                      </div>
                    </td>
                    <td>{leave.reason || "N/A"}</td>
                    <td>
                      <span className={`chip ${getStatusChipClass(leave.status)}`}>
                        {leave.status}
                      </span>
                    </td>
                    <td>{leave.manager_name || <span style={{ fontStyle: "italic", color: "var(--muted)" }}>Pending</span>}</td>
                    <td>{leave.hr_name || <span style={{ fontStyle: "italic", color: "var(--muted)" }}>Pending</span>}</td>
                    <td>{leave.created_at ? leave.created_at.split("T")[0] : "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Asset table */}
          {activeTab === "assets" && (
            <table>
              <thead>
                <tr>
                  <th>Asset Code</th>
                  <th>Asset Name</th>
                  <th>Type</th>
                  <th>Purchase Date</th>
                  <th>Purchase Cost</th>
                  <th>Status</th>
                  <th>Current Owner</th>
                </tr>
              </thead>
              <tbody>
                {data.map((asset) => (
                  <tr key={asset.id}>
                    <td>
                      <span style={{ fontFamily: "monospace", fontWeight: "700", background: "var(--surface-alt)", padding: "4px 8px", borderRadius: "4px", border: "1px solid var(--border)" }}>
                        {asset.asset_code}
                      </span>
                    </td>
                    <td><strong>{asset.asset_name}</strong></td>
                    <td>{asset.asset_type}</td>
                    <td>{asset.purchase_date ? asset.purchase_date.split("T")[0] : "N/A"}</td>
                    <td>{asset.purchase_cost ? `$${parseFloat(asset.purchase_cost).toLocaleString()}` : "N/A"}</td>
                    <td>
                      <span className={`chip ${getStatusChipClass(asset.status)}`} style={asset.status === "Under Repair" ? { background: "rgba(245, 158, 11, 0.15)", color: "#d97706" } : {}}>
                        {asset.status}
                      </span>
                    </td>
                    <td>
                      {asset.status === "Allocated" ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <FiUser style={{ color: "var(--accent)" }} size={13} />
                          {asset.current_owner}
                        </div>
                      ) : (
                        <span style={{ color: "var(--muted)", fontStyle: "italic", fontSize: "0.8rem" }}>— Available —</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

        </div>
      )}

    </div>
  );
}
