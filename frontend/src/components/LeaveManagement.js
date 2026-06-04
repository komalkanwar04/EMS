import React, { useEffect, useState } from "react";
import axios from "axios";
import { FiCalendar, FiPlus, FiClock } from "react-icons/fi";

export default function LeaveManagement({ user }) {
  const [activeTab, setActiveTab] = useState("my-leaves"); // 'my-leaves', 'manager-approvals', 'hr-approvals', 'all-leaves'
  const [balances, setBalances] = useState([]);
  const [types, setTypes] = useState([]);
  const [applications, setApplications] = useState([]);
  
  // History Audit log modal states
  const [historyModalApp, setHistoryModalApp] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Apply Form states
  const [applyForm, setApplyForm] = useState({
    leaveTypeId: "",
    startDate: "",
    endDate: "",
    reason: ""
  });
  const [applyStatus, setApplyStatus] = useState(null);

  // Approval / Rejection comment action states
  const [actionTarget, setActionTarget] = useState(null); // { app, action: 'approve' | 'reject' }
  const [actionComments, setActionComments] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch initial data
  const loadData = async () => {
    try {
      const [balancesRes, typesRes, appsRes] = await Promise.all([
        axios.get("/api/leaves/balances"),
        axios.get("/api/leaves/types"),
        axios.get("/api/leaves/applications")
      ]);
      setBalances(balancesRes.data.balances || []);
      setTypes(typesRes.data.types || []);
      setApplications(appsRes.data.applications || []);
    } catch (error) {
      console.error("Failed to load leaves data:", error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApplyChange = (e) => {
    setApplyForm({ ...applyForm, [e.target.name]: e.target.value });
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    setApplyStatus({ loading: true });
    try {
      await axios.post("/api/leaves/apply", applyForm);
      setApplyStatus({ ok: true, message: "Leave request submitted successfully." });
      setApplyForm({ leaveTypeId: "", startDate: "", endDate: "", reason: "" });
      loadData();
      setTimeout(() => setApplyStatus(null), 3000);
    } catch (err) {
      setApplyStatus({ ok: false, message: err?.response?.data?.message || "Failed to submit request." });
    }
  };

  // Open Approval History Logs Modal
  const handleViewHistory = async (app) => {
    setHistoryModalApp(app);
    setHistoryLoading(true);
    try {
      const res = await axios.get(`/api/leaves/history/${app.id}`);
      setHistoryLogs(res.data.history || []);
    } catch (error) {
      console.error("Failed to load audit history logs:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Submit Approval or Rejection
  const handleConfirmAction = async () => {
    if (!actionTarget) return;
    setActionLoading(true);
    const { app, action } = actionTarget;
    try {
      const endpoint = `/api/leaves/${action}/${app.id}`;
      await axios.post(endpoint, { comments: actionComments });
      setActionTarget(null);
      setActionComments("");
      loadData();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to process leave action.");
    } finally {
      setActionLoading(false);
    }
  };

  // Filter lists based on tab
  const getManagerApprovalsList = () => {
    return applications.filter((app) => app.status === "Pending Manager Approval");
  };

  const getHRApprovalsList = () => {
    return applications.filter((app) => app.status === "Pending HR Approval");
  };

  const showManagerTab = user.role === "manager" || user.role === "hr" || user.role === "admin";
  const showHRTab = user.role === "hr" || user.role === "admin";
  const showAllTab = user.role === "hr" || user.role === "admin";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      
      {/* Leaves Navigation Tabs */}
      <div className="auth-tabs" style={{ maxWidth: "560px", marginBottom: "10px" }}>
        <button
          className={`auth-tab ${activeTab === "my-leaves" ? "active" : ""}`}
          onClick={() => setActiveTab("my-leaves")}
        >
          My Leaves
        </button>
        {showManagerTab && (
          <button
            className={`auth-tab ${activeTab === "manager-approvals" ? "active" : ""}`}
            onClick={() => setActiveTab("manager-approvals")}
          >
            Manager Approvals ({getManagerApprovalsList().length})
          </button>
        )}
        {showHRTab && (
          <button
            className={`auth-tab ${activeTab === "hr-approvals" ? "active" : ""}`}
            onClick={() => setActiveTab("hr-approvals")}
          >
            HR Approvals ({getHRApprovalsList().length})
          </button>
        )}
        {showAllTab && (
          <button
            className={`auth-tab ${activeTab === "all-leaves" ? "active" : ""}`}
            onClick={() => setActiveTab("all-leaves")}
          >
            All Logs
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* VIEW: MY LEAVES */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "my-leaves" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "20px", alignItems: "start" }}>
          
          {/* Main: Balances & My Requests */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* Balances Card Grid */}
            <div>
              <h3 style={{ fontSize: "1rem", marginBottom: "12px", color: "var(--muted)", textTransform: "uppercase" }}>
                My Leave Balances
              </h3>
              <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                {balances.length === 0 ? (
                  <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>No balances loaded.</p>
                ) : (
                  balances.map((b) => (
                    <div key={b.id} className="stat-card" style={{ padding: "12px 16px" }}>
                      <div className="stat-icon" style={{ width: "32px", height: "32px", fontSize: "0.9rem" }}>
                        <FiCalendar />
                      </div>
                      <div className="stat-body">
                        <div className="stat-value" style={{ fontSize: "1.15rem" }}>
                          {b.available_days} <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: "normal" }}>/ {b.total_days}</span>
                        </div>
                        <div className="stat-label" style={{ fontSize: "0.7rem" }}>{b.leave_name}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* My Requests Table */}
            <div className="table-card">
              <div style={{ padding: "16px 14px", borderBottom: "1px solid var(--border)" }}>
                <h3 style={{ fontSize: "0.95rem", margin: 0 }}>My Leave Requests</h3>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Leave Type</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th style={{ width: "120px", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.filter((app) => app.employee_email?.toLowerCase() === user.email?.toLowerCase()).length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: "center", color: "var(--muted)" }}>
                          You have not submitted any leave requests yet.
                        </td>
                      </tr>
                    ) : (
                      applications
                        .filter((app) => app.employee_email?.toLowerCase() === user.email?.toLowerCase())
                        .map((app) => {
                          const statusClass =
                            app.status === "Approved"
                              ? "success"
                              : app.status.startsWith("Rejected")
                              ? "danger"
                              : "";
                          return (
                            <tr key={app.id}>
                              <td><strong>{app.leave_name}</strong></td>
                              <td>{app.start_date}</td>
                              <td>{app.end_date}</td>
                              <td>{app.reason}</td>
                              <td>
                                <span className={`chip ${statusClass}`}>{app.status}</span>
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <button
                                  className="action-btn view"
                                  onClick={() => handleViewHistory(app)}
                                  title="View audit logs"
                                >
                                  <FiClock size={16} /> History
                                </button>
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar: Apply Form */}
          <div className="form-card" style={{ padding: "20px" }}>
            <h3 style={{ fontSize: "1rem", marginBottom: "14px" }}>Request Leave</h3>
            <form onSubmit={handleApplySubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="field-group">
                <label htmlFor="leave-type">Leave Category</label>
                <select
                  id="leave-type"
                  className="select-field"
                  name="leaveTypeId"
                  value={applyForm.leaveTypeId}
                  onChange={handleApplyChange}
                  required
                >
                  <option value="">Select Category</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.leave_name} ({t.total_days} days allowance)
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-group">
                <label htmlFor="start-date">From Date</label>
                <input
                  id="start-date"
                  type="date"
                  className="input-field"
                  name="startDate"
                  value={applyForm.startDate}
                  onChange={handleApplyChange}
                  required
                />
              </div>

              <div className="field-group">
                <label htmlFor="end-date">To Date</label>
                <input
                  id="end-date"
                  type="date"
                  className="input-field"
                  name="endDate"
                  value={applyForm.endDate}
                  onChange={handleApplyChange}
                  required
                />
              </div>

              <div className="field-group">
                <label htmlFor="leave-reason">Reason</label>
                <textarea
                  id="leave-reason"
                  className="textarea-field"
                  name="reason"
                  rows={3}
                  value={applyForm.reason}
                  onChange={handleApplyChange}
                  placeholder="Provide context for approval..."
                  required
                />
              </div>

              <button className="btn" type="submit" disabled={applyStatus?.loading}>
                <FiPlus /> Submit Request
              </button>
            </form>

            {applyStatus && (
              <div className={`status-message ${applyStatus.ok ? "success" : "error"}`} style={{ marginTop: "14px" }}>
                {applyStatus.message}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW: MANAGER APPROVALS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "manager-approvals" && (
        <div className="table-card">
          <div style={{ padding: "16px 14px", borderBottom: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "0.95rem", margin: 0 }}>Requests Awaiting Manager Review</h3>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Leave Type</th>
                  <th>Date Range</th>
                  <th>Reason</th>
                  <th style={{ width: "240px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {getManagerApprovalsList().length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", color: "var(--muted)" }}>
                      No applications pending manager review.
                    </td>
                  </tr>
                ) : (
                  getManagerApprovalsList().map((app) => (
                    <tr key={app.id}>
                      <td>
                        <strong>{app.employee_name}</strong>
                        <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{app.employee_email}</div>
                      </td>
                      <td>{app.department_name}</td>
                      <td>{app.leave_name}</td>
                      <td>
                        <div style={{ fontSize: "0.85rem" }}>{app.start_date} to {app.end_date}</div>
                      </td>
                      <td>{app.reason}</td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                          <button
                            className="action-btn view"
                            onClick={() => handleViewHistory(app)}
                            title="Audit Log"
                          >
                            <FiClock /> History
                          </button>
                          <button
                            className="btn"
                            style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                            onClick={() => setActionTarget({ app, action: "approve" })}
                          >
                            Approve
                          </button>
                          <button
                            className="btn danger"
                            style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                            onClick={() => setActionTarget({ app, action: "reject" })}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW: HR APPROVALS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "hr-approvals" && (
        <div className="table-card">
          <div style={{ padding: "16px 14px", borderBottom: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "0.95rem", margin: 0 }}>Requests Awaiting Final HR Approval</h3>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Leave Type</th>
                  <th>Date Range</th>
                  <th>Approved By</th>
                  <th>Reason</th>
                  <th style={{ width: "240px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {getHRApprovalsList().length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center", color: "var(--muted)" }}>
                      No applications pending final HR review.
                    </td>
                  </tr>
                ) : (
                  getHRApprovalsList().map((app) => (
                    <tr key={app.id}>
                      <td>
                        <strong>{app.employee_name}</strong>
                        <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{app.employee_email}</div>
                      </td>
                      <td>{app.department_name}</td>
                      <td>{app.leave_name}</td>
                      <td>
                        <div style={{ fontSize: "0.85rem" }}>{app.start_date} to {app.end_date}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.8rem", color: "var(--success)" }}>
                          ✓ Manager {app.manager_name}
                        </span>
                      </td>
                      <td>{app.reason}</td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                          <button
                            className="action-btn view"
                            onClick={() => handleViewHistory(app)}
                            title="Audit Log"
                          >
                            <FiClock /> History
                          </button>
                          <button
                            className="btn"
                            style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                            onClick={() => setActionTarget({ app, action: "approve" })}
                          >
                            Sign Off
                          </button>
                          <button
                            className="btn danger"
                            style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                            onClick={() => setActionTarget({ app, action: "reject" })}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW: ALL LEAVES LOG */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "all-leaves" && (
        <div className="table-card">
          <div style={{ padding: "16px 14px", borderBottom: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "0.95rem", margin: 0 }}>Entire Leave Application Log</h3>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Leave Type</th>
                  <th>From/To</th>
                  <th>Reason</th>
                  <th>Approvers</th>
                  <th>Status</th>
                  <th style={{ width: "90px", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => {
                  const statusClass =
                    app.status === "Approved"
                      ? "success"
                      : app.status.startsWith("Rejected")
                      ? "danger"
                      : "";
                  return (
                    <tr key={app.id}>
                      <td>
                        <strong>{app.employee_name}</strong>
                        <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{app.employee_email}</div>
                      </td>
                      <td>{app.department_name}</td>
                      <td>{app.leave_name}</td>
                      <td>
                        <div style={{ fontSize: "0.8rem" }}>{app.start_date} to {app.end_date}</div>
                      </td>
                      <td>{app.reason}</td>
                      <td>
                        <div style={{ fontSize: "0.75rem" }}>
                          {app.manager_name && <div>Mgr: {app.manager_name}</div>}
                          {app.hr_name && <div>HR: {app.hr_name}</div>}
                          {!app.manager_name && !app.hr_name && <span style={{ color: "var(--muted)" }}>—</span>}
                        </div>
                      </td>
                      <td>
                        <span className={`chip ${statusClass}`}>{app.status}</span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          className="action-btn view"
                          onClick={() => handleViewHistory(app)}
                        >
                          <FiClock /> History
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* AUDIT LOG MODAL */}
      {/* ------------------------------------------------------------- */}
      {historyModalApp && (
        <div className="modal-overlay" onClick={() => setHistoryModalApp(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
            <div style={{ display: "flex", justifySpace: "space-between", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "1.1rem" }}>Approval History & Audit Trail</h3>
              <button
                className="action-btn delete"
                style={{ fontSize: "1.2rem", padding: "0 6px" }}
                onClick={() => setHistoryModalApp(null)}
              >
                &times;
              </button>
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "14px" }}>
              <strong>Application ID:</strong> #{historyModalApp.id} | <strong>Employee:</strong> {historyModalApp.employee_name}
            </p>

            {historyLoading ? (
              <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Fetching audit log timeline…</p>
            ) : historyLogs.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>No audit log events available.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "300px", overflowY: "auto", paddingRight: "6px" }}>
                {historyLogs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      padding: "10px",
                      background: "var(--surface-alt)",
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                      fontSize: "0.8rem"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <strong>{log.action}</strong>
                      <small style={{ color: "var(--muted)" }}>{new Date(log.action_date).toLocaleString()}</small>
                    </div>
                    <div>
                      By: <span style={{ color: "var(--muted)", fontWeight: "600" }}>{log.action_by_name} ({log.action_by_role})</span>
                    </div>
                    {log.comments && (
                      <div style={{ marginTop: "6px", fontStyle: "italic", borderLeft: "2px solid var(--accent)", paddingLeft: "6px" }}>
                        "{log.comments}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
              <button className="btn secondary" onClick={() => setHistoryModalApp(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* APPROVAL / REJECTION ACTION DIALOG */}
      {/* ------------------------------------------------------------- */}
      {actionTarget && (
        <div className="modal-overlay" onClick={() => setActionTarget(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "440px" }}>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "8px", textTransform: "capitalize" }}>
              Confirm {actionTarget.action} Request
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "16px" }}>
              Employee: <strong>{actionTarget.app.employee_name}</strong> | Leave: {actionTarget.app.leave_name}
            </p>

            <div className="field-group" style={{ marginBottom: "18px" }}>
              <label htmlFor="action-comment">Remarks / Comments</label>
              <textarea
                id="action-comment"
                className="textarea-field"
                rows={3}
                placeholder="Enter approval remarks or reason for rejection..."
                value={actionComments}
                onChange={(e) => setActionComments(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button className="btn secondary" onClick={() => setActionTarget(null)}>
                Cancel
              </button>
              <button
                className={`btn ${actionTarget.action === "reject" ? "danger" : ""}`}
                onClick={handleConfirmAction}
                disabled={actionLoading}
              >
                {actionLoading ? "Processing…" : actionTarget.action === "reject" ? "Reject Request" : "Approve Request"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
