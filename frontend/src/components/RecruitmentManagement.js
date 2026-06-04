import React, { useEffect, useState } from "react";
import axios from "axios";
import { FiBriefcase, FiUserPlus, FiCheck, FiFilter, FiUser, FiMail, FiPhone } from "react-icons/fi";

export default function RecruitmentManagement({ user }) {
  const [applications, setApplications] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [activeTab, setActiveTab] = useState("all"); // 'all', 'job', 'internship'
  const [domainFilter, setDomainFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modals / Dialogs States
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyForm, setApplyForm] = useState({
    name: "",
    email: "",
    phone: "",
    type: "Job", // Job or Internship
    departmentId: "",
    designation: ""
  });
  const [applyStatus, setApplyStatus] = useState(null);

  const [hiringTarget, setHiringTarget] = useState(null); // application object
  const [hireForm, setHireForm] = useState({
    salary: "45000",
    phone: ""
  });
  const [hireStatus, setHireStatus] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [appRes, deptRes] = await Promise.all([
        axios.get("/api/recruitment/applications"),
        axios.get("/api/employees/departments")
      ]);
      setApplications(appRes.data.applications || []);
      setDepartments(deptRes.data.departments || []);
    } catch (error) {
      console.error("Failed to load recruitment data:", error);
    } finally {
      setLoading(false);
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
      await axios.post("/api/recruitment/apply", applyForm);
      setApplyStatus({ ok: true, message: "Application submitted successfully." });
      setApplyForm({
        name: "",
        email: "",
        phone: "",
        type: "Job",
        departmentId: "",
        designation: ""
      });
      loadData();
      setTimeout(() => {
        setShowApplyModal(false);
        setApplyStatus(null);
      }, 1500);
    } catch (err) {
      setApplyStatus({ ok: false, message: err?.response?.data?.message || "Failed to submit application." });
    }
  };

  const handleStatusAction = async (id, status) => {
    try {
      await axios.post(`/api/recruitment/action/${id}`, { status });
      loadData();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to update candidate status.");
    }
  };

  const openHireDialog = (app) => {
    setHiringTarget(app);
    setHireForm({
      salary: "45000",
      phone: app.candidate_phone || ""
    });
    setHireStatus(null);
  };

  const handleHireSubmit = async (e) => {
    e.preventDefault();
    if (!hiringTarget) return;
    setHireStatus({ loading: true });
    try {
      const res = await axios.post(`/api/recruitment/hire/${hiringTarget.id}`, hireForm);
      setHireStatus({ ok: true, message: res.data.message });
      loadData();
      setTimeout(() => {
        setHiringTarget(null);
        setHireStatus(null);
      }, 4000);
    } catch (err) {
      setHireStatus({ ok: false, message: err?.response?.data?.message || "Failed to complete onboarding." });
    }
  };

  // Filter application list
  const filteredApplications = applications.filter((app) => {
    const matchesTab =
      activeTab === "all" || app.application_type.toLowerCase() === activeTab;
    const matchesDomain = !domainFilter || app.department_id === Number(domainFilter);
    const matchesStatus = !statusFilter || app.status === statusFilter;
    return matchesTab && matchesDomain && matchesStatus;
  });

  // Calculate statistics
  const totalApps = applications.length;
  const pendingApps = applications.filter((a) => a.status === "Pending Review").length;
  const shortlistedApps = applications.filter((a) => a.status === "Shortlisted").length;
  const hiredApps = applications.filter((a) => a.status === "Hired").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      
      {/* Upper Action Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0 }}>Job & Internship Recruitment Workspace</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "4px" }}>
            Track and process candidates, schedule interviews, and onboard them into active employee slots.
          </p>
        </div>
        <button className="btn" onClick={() => setShowApplyModal(true)}>
          <FiUserPlus /> Mock Candidate Apply
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(102, 110, 232, 0.15)", color: "var(--accent)" }}>
            <FiBriefcase />
          </div>
          <div className="stat-body">
            <div className="stat-value">{totalApps}</div>
            <div className="stat-label">Total Applicants</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(245, 158, 11, 0.15)", color: "var(--warning)" }}>
            <FiFilter />
          </div>
          <div className="stat-body">
            <div className="stat-value">{pendingApps}</div>
            <div className="stat-label">Pending Review</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(59, 130, 246, 0.15)", color: "var(--accent-light)" }}>
            <FiUser />
          </div>
          <div className="stat-body">
            <div className="stat-value">{shortlistedApps}</div>
            <div className="stat-label">Shortlisted</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: "rgba(16, 185, 129, 0.15)", color: "var(--success)" }}>
            <FiCheck />
          </div>
          <div className="stat-body">
            <div className="stat-value">{hiredApps}</div>
            <div className="stat-label">Hired & Onboarded</div>
          </div>
        </div>
      </div>

      {/* Filter and Tab Section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        
        {/* Navigation Tabs */}
        <div className="auth-tabs" style={{ maxWidth: "440px", margin: 0 }}>
          <button
            className={`auth-tab ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All Candidates
          </button>
          <button
            className={`auth-tab ${activeTab === "job" ? "active" : ""}`}
            onClick={() => setActiveTab("job")}
          >
            Jobs
          </button>
          <button
            className={`auth-tab ${activeTab === "internship" ? "active" : ""}`}
            onClick={() => setActiveTab("internship")}
          >
            Internships
          </button>
        </div>

        {/* Action Select Dropdowns */}
        <div style={{ display: "flex", gap: "10px" }}>
          
          {/* Domain Filter */}
          <select
            className="select-field"
            style={{ minWidth: "160px", padding: "6px 12px" }}
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
          >
            <option value="">All Domains</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.department_name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            className="select-field"
            style={{ minWidth: "140px", padding: "6px 12px" }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Pending Review">Pending Review</option>
            <option value="Shortlisted">Shortlisted</option>
            <option value="Rejected">Rejected</option>
            <option value="Hired">Hired</option>
          </select>
        </div>
      </div>

      {/* Candidates List Table */}
      <div className="table-card">
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Candidate Name</th>
                <th>Application Type</th>
                <th>Domain / Department</th>
                <th>Applied Role</th>
                <th>Applied Date</th>
                <th>Status</th>
                <th style={{ width: "240px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", color: "var(--muted)" }}>
                    Loading candidate records…
                  </td>
                </tr>
              ) : filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", color: "var(--muted)" }}>
                    No recruitment records match the filters.
                  </td>
                </tr>
              ) : (
                filteredApplications.map((app) => {
                  const statusClass =
                    app.status === "Hired"
                      ? "success"
                      : app.status === "Shortlisted"
                      ? "accent"
                      : app.status === "Rejected"
                      ? "danger"
                      : "";
                  
                  return (
                    <tr key={app.id}>
                      <td>
                        <strong>{app.candidate_name}</strong>
                        <div style={{ fontSize: "0.75rem", color: "var(--muted)", display: "flex", gap: "10px", marginTop: "2px" }}>
                          <span><FiMail /> {app.candidate_email}</span>
                          {app.candidate_phone && <span><FiPhone /> {app.candidate_phone}</span>}
                        </div>
                      </td>
                      <td>
                        <span className={`chip ${app.application_type === "Job" ? "success" : "accent"}`} style={{ background: "transparent", border: "1px solid currentColor" }}>
                          {app.application_type}
                        </span>
                      </td>
                      <td>{app.department_name || "Unassigned"}</td>
                      <td>{app.designation}</td>
                      <td>{new Date(app.applied_at).toLocaleDateString()}</td>
                      <td>
                        <span className={`chip ${statusClass}`}>{app.status}</span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                          {app.status === "Pending Review" && (
                            <>
                              <button
                                className="btn"
                                style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                                onClick={() => handleStatusAction(app.id, "Shortlisted")}
                              >
                                Shortlist
                              </button>
                              <button
                                className="btn danger"
                                style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                                onClick={() => handleStatusAction(app.id, "Rejected")}
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {app.status === "Shortlisted" && (
                            <>
                              <button
                                className="btn success"
                                style={{ padding: "4px 8px", fontSize: "0.75rem", background: "var(--success)" }}
                                onClick={() => openHireDialog(app)}
                              >
                                Hire & Onboard
                              </button>
                              <button
                                className="btn danger"
                                style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                                onClick={() => handleStatusAction(app.id, "Rejected")}
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {app.status === "Rejected" && (
                            <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontStyle: "italic", paddingRight: "10px" }}>
                              Archived
                            </span>
                          )}

                          {app.status === "Hired" && (
                            <span className="chip success" style={{ opacity: 0.8, fontSize: "0.7rem", padding: "2px 6px" }}>
                              Active Profile ✓
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: MOCK APPLY DIALOG */}
      {showApplyModal && (
        <div className="modal-overlay" onClick={() => setShowApplyModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "1.1rem", margin: 0 }}>Submit Mock Candidate Application</h3>
              <button
                className="action-btn delete"
                style={{ fontSize: "1.2rem", padding: "0 6px" }}
                onClick={() => setShowApplyModal(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleApplySubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="field-group">
                <label>Candidate Full Name</label>
                <input
                  type="text"
                  className="input-field"
                  name="name"
                  value={applyForm.name}
                  onChange={handleApplyChange}
                  required
                  placeholder="e.g. Ishita Patel"
                />
              </div>

              <div className="field-group">
                <label>Email Address</label>
                <input
                  type="email"
                  className="input-field"
                  name="email"
                  value={applyForm.email}
                  onChange={handleApplyChange}
                  required
                  placeholder="name@gmail.com"
                />
              </div>

              <div className="field-group">
                <label>Phone Number</label>
                <input
                  type="text"
                  className="input-field"
                  name="phone"
                  value={applyForm.phone}
                  onChange={handleApplyChange}
                  placeholder="e.g. 9893012345"
                />
              </div>

              <div className="field-group">
                <label>Application Category</label>
                <select
                  className="select-field"
                  name="type"
                  value={applyForm.type}
                  onChange={handleApplyChange}
                  required
                >
                  <option value="Job">Job Opening</option>
                  <option value="Internship">Internship Program</option>
                </select>
              </div>

              <div className="field-group">
                <label>Domain / Department</label>
                <select
                  className="select-field"
                  name="departmentId"
                  value={applyForm.departmentId}
                  onChange={handleApplyChange}
                  required
                >
                  <option value="">Select Domain</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.department_name}</option>
                  ))}
                </select>
              </div>

              <div className="field-group">
                <label>Applied Designation</label>
                <input
                  type="text"
                  className="input-field"
                  name="designation"
                  value={applyForm.designation}
                  onChange={handleApplyChange}
                  required
                  placeholder="e.g. Frontend Intern"
                />
              </div>

              <button className="btn" type="submit" disabled={applyStatus?.loading} style={{ marginTop: "10px" }}>
                {applyStatus?.loading ? "Submitting Application…" : "Submit Candidate Application"}
              </button>
            </form>

            {applyStatus && (
              <div className={`status-message ${applyStatus.ok ? "success" : "error"}`} style={{ marginTop: "12px" }}>
                {applyStatus.message}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: HIRE & ONBOARD FORM */}
      {hiringTarget && (
        <div className="modal-overlay" onClick={() => setHiringTarget(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "440px" }}>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "6px" }}>Hire & Onboard Candidate</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "16px" }}>
              onboard <strong>{hiringTarget.candidate_name}</strong> to the active employee registry as a <strong>{hiringTarget.designation}</strong> ({hiringTarget.department_name}).
            </p>

            <form onSubmit={handleHireSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="field-group">
                <label>Active Phone Number</label>
                <input
                  type="text"
                  className="input-field"
                  value={hireForm.phone}
                  onChange={(e) => setHireForm({ ...hireForm, phone: e.target.value })}
                  placeholder="Employee contact number"
                />
              </div>

              <div className="field-group">
                <label>Starting Salary (₹ / Month)</label>
                <input
                  type="number"
                  className="input-field"
                  value={hireForm.salary}
                  onChange={(e) => setHireForm({ ...hireForm, salary: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button type="button" className="btn secondary" onClick={() => setHiringTarget(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn success" style={{ background: "var(--success)" }} disabled={hireStatus?.loading}>
                  {hireStatus?.loading ? "Onboarding…" : "Confirm Hire & Onboard"}
                </button>
              </div>
            </form>

            {hireStatus && (
              <div className={`status-message ${hireStatus.ok ? "success" : "error"}`} style={{ marginTop: "14px", fontSize: "0.8rem", whiteSpace: "pre-line" }}>
                {hireStatus.message}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
