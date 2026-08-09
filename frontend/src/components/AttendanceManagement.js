import { useState, useEffect } from "react";
import axios from "axios";
import { FaFingerprint } from "react-icons/fa";
import { FiClock, FiCheckCircle, FiAlertCircle, FiPlus, FiEdit2, FiTrash2, FiCalendar, FiFilter, FiUser } from "react-icons/fi";

export default function AttendanceManagement({ user }) {
  const [logs, setLogs] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [punchLoading, setPunchLoading] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanState, setScanState] = useState("idle"); // idle, scanning, success, error
  const [message, setMessage] = useState(null);
  
  // Filtering states
  const [filterDept, setFilterDept] = useState("");
  const [filterName, setFilterName] = useState("");
  const [departments, setDepartments] = useState([]);

  // Manual Adjustments Modals & Form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLog, setEditingLog] = useState(null);

  const [form, setForm] = useState({
    employee_id: "",
    punch_date: "",
    punch_in: "",
    punch_out: "",
    status: "Present",
    notes: "",
  });

  const role = (user?.role || "").toLowerCase();
  const isPrivileged = role === "admin" || role === "hr" || role === "manager";
  const canModify = role === "admin" || role === "manager";

  // Biometrics enrollment & compatibility states
  const [isBiometricEnrolled, setIsBiometricEnrolled] = useState(false);
  const [checkingBiometrics, setCheckingBiometrics] = useState(true);
  const [deviceBiometricsSupported, setDeviceBiometricsSupported] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchLogs();
    checkBiometricStatus();
    if (isPrivileged) {
      fetchEmployees();
      fetchDepartments();
    }
  }, [user]);

  const checkBiometricStatus = async () => {
    const supported = !!window.PublicKeyCredential;
    setDeviceBiometricsSupported(supported);
    if (supported) {
      try {
        const res = await axios.get("/api/attendance/biometric-status");
        setIsBiometricEnrolled(res.data.enrolled);
      } catch (err) {
        console.error("Error checking biometric status:", err);
      }
    }
    setCheckingBiometrics(false);
  };

  // Convert ArrayBuffer to Base64URL string
  const bufferToBase64url = (buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  };

  // Convert Base64URL string to Uint8Array
  const base64urlToBuffer = (base64url) => {
    let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  };

  const handleEnrollBiometrics = async () => {
    try {
      setCheckingBiometrics(true);
      setMessage(null);

      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const userId = new Uint8Array(16);
      window.crypto.getRandomValues(userId);

      const createCredentialOptions = {
        challenge: challenge,
        rp: {
          name: "PeopleSync EMS",
          id: window.location.hostname,
        },
        user: {
          id: userId,
          name: user?.email || "",
          displayName: user?.name || "",
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },
          { alg: -257, type: "public-key" }
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "required",
          requireResidentKey: true,
        },
        timeout: 60000,
        attestation: "none"
      };

      const credential = await navigator.credentials.create({
        publicKey: createCredentialOptions
      });

      if (!credential) {
        throw new Error("Failed to create biometric credential.");
      }

      const credentialIdBase64 = bufferToBase64url(credential.rawId);
      await axios.post("/api/attendance/register-biometric", { credentialId: credentialIdBase64 });
      setIsBiometricEnrolled(true);
      setMessage({ ok: true, content: "Device biometrics enrolled successfully!" });
    } catch (err) {
      console.error("Biometric enrollment error:", err);
      setMessage({ ok: false, content: err.message || "Failed to enroll biometric device." });
    } finally {
      setCheckingBiometrics(false);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const endpoint = isPrivileged ? "/api/attendance/logs" : "/api/attendance/my-logs";
      const res = await axios.get(endpoint);
      setLogs(res.data.logs || []);
      setLeaves(res.data.leaves || []);
    } catch (err) {
      console.error("Error loading logs:", err);
      setMessage({ ok: false, content: "Failed to load attendance logs." });
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await axios.get("/api/employees/profiles");
      setEmployees(res.data.profiles || []);
    } catch (err) {
      console.error("Error loading profiles:", err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await axios.get("/api/employees/departments");
      setDepartments(res.data.departments || []);
    } catch (err) {
      console.error("Error loading departments:", err);
    }
  };

  // Run fingerprint scan simulation or WebAuthn assertion check
  const handleBiometricPunch = async () => {
    if (punchLoading) return;
    
    let credentialIdToSend = null;
    
    // 1. If device biometrics are supported and enrolled, trigger real WebAuthn get
    if (deviceBiometricsSupported && isBiometricEnrolled) {
      try {
        setPunchLoading(true);
        setScanState("scanning");
        setScanProgress(20);
        setMessage(null);

        const statusRes = await axios.get("/api/attendance/biometric-status");
        const registeredId = statusRes.data.credentialId;
        if (!registeredId) {
          throw new Error("No registered biometrics found on server. Please re-enroll.");
        }

        setScanProgress(50);

        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const assertionOptions = {
          challenge: challenge,
          rpId: window.location.hostname,
          allowCredentials: [{
            id: base64urlToBuffer(registeredId),
            type: "public-key"
          }],
          userVerification: "required"
        };

        const assertion = await navigator.credentials.get({
          publicKey: assertionOptions
        });

        if (!assertion) {
          throw new Error("Biometric verification canceled.");
        }

        credentialIdToSend = registeredId;
        setScanProgress(80);
      } catch (err) {
        console.error("Biometric verification error:", err);
        setScanState("error");
        setMessage({
          ok: false,
          content: err.message || "Biometric authentication failed. Please try again."
        });
        setPunchLoading(false);
        setTimeout(() => {
          setScanState("idle");
          setScanProgress(0);
        }, 3000);
        return;
      }
    } else {
      // 2. If supported but NOT enrolled, require enrollment first
      if (deviceBiometricsSupported && !isBiometricEnrolled) {
        setMessage({ ok: false, content: "Biometric authentication is not enrolled. Please enroll first." });
        return;
      }
      
      // 3. Fallback to simple simulated punch if browser has no WebAuthn hardware capabilities
      setPunchLoading(true);
      setScanState("scanning");
      setScanProgress(0);
      setMessage(null);

      const interval = setInterval(() => {
        setScanProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 20;
        });
      }, 100);

      await new Promise(resolve => setTimeout(resolve, 600));
      clearInterval(interval);
    }

    setPunchLoading(true);
    setScanState("scanning");
    setScanProgress(90);

    setTimeout(async () => {
      try {
        const res = await axios.post("/api/attendance/punch", { credentialId: credentialIdToSend });
        setScanProgress(100);
        setScanState("success");
        setMessage({ ok: true, content: res.data.message });
        fetchLogs();
      } catch (err) {
        setScanState("error");
        setMessage({
          ok: false,
          content: err.response?.data?.message || "Biometric authentication failed. Please try again.",
        });
      } finally {
        setPunchLoading(false);
        setTimeout(() => {
          setScanState("idle");
          setScanProgress(0);
        }, 3000);
      }
    }, 800);
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    try {
      const formattedForm = {
        ...form,
        punch_in: form.punch_in ? new Date(`${form.punch_date}T${form.punch_in}`).toISOString() : null,
        punch_out: form.punch_out ? new Date(`${form.punch_date}T${form.punch_out}`).toISOString() : null,
      };

      await axios.post("/api/attendance/manual", formattedForm);
      setMessage({ ok: true, content: "Manual attendance entry created successfully." });
      setShowAddModal(false);
      resetForm();
      fetchLogs();
    } catch (err) {
      setMessage({ ok: false, content: err.response?.data?.message || "Failed to create attendance log." });
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const formattedForm = {
        status: form.status,
        notes: form.notes,
        punch_in: form.punch_in ? new Date(`${form.punch_date}T${form.punch_in}`).toISOString() : null,
        punch_out: form.punch_out ? new Date(`${form.punch_date}T${form.punch_out}`).toISOString() : null,
      };

      await axios.put(`/api/attendance/${editingLog.id}`, formattedForm);
      setMessage({ ok: true, content: "Attendance record updated successfully." });
      setShowEditModal(false);
      resetForm();
      fetchLogs();
    } catch (err) {
      setMessage({ ok: false, content: err.response?.data?.message || "Failed to update attendance record." });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this attendance record?")) return;
    try {
      await axios.delete(`/api/attendance/${id}`);
      setMessage({ ok: true, content: "Attendance record deleted." });
      fetchLogs();
    } catch (err) {
      setMessage({ ok: false, content: "Failed to delete record." });
    }
  };

  const resetForm = () => {
    setForm({
      employee_id: "",
      punch_date: "",
      punch_in: "",
      punch_out: "",
      status: "Present",
      notes: "",
    });
    setEditingLog(null);
  };

  const openEdit = (log) => {
    setEditingLog(log);
    const inTime = log.punch_in ? new Date(log.punch_in).toTimeString().substring(0, 5) : "";
    const outTime = log.punch_out ? new Date(log.punch_out).toTimeString().substring(0, 5) : "";
    
    setForm({
      employee_id: log.employee_id,
      punch_date: log.punch_date,
      punch_in: inTime,
      punch_out: outTime,
      status: log.status,
      notes: log.notes || "",
    });
    setShowEditModal(true);
  };

  // Helper formatting functions
  const formatTime = (timeStr) => {
    if (!timeStr) return "—";
    const date = new Date(timeStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getStatusClass = (status) => {
    if (!status) return "";
    const lower = status.toLowerCase();
    if (lower === "present") return "success";
    if (lower === "absent") return "danger";
    if (lower === "on leave") return "info";
    if (lower === "half day") return "warning";
    return "";
  };

  // Compile virtual leave records + real attendance logs
  const getMergedLogs = () => {
    let merged = [...logs];

    // For each approved leave date, if no real attendance log exists, create a virtual record
    leaves.forEach((lv) => {
      const start = new Date(lv.start_date);
      const end = new Date(lv.end_date);
      
      // Loop over date range
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split("T")[0];
        
        // Check if employee already has attendance logged for this day
        const existing = merged.find(
          (m) => m.punch_date === dateStr && 
                 (isPrivileged ? m.employee_name === lv.employee_name : true)
        );

        if (!existing) {
          merged.push({
            id: `leave-${dateStr}-${lv.employee_name || "me"}`,
            employee_name: lv.employee_name || user?.name || "",
            punch_date: dateStr,
            punch_in: null,
            punch_out: null,
            status: "On Leave",
            notes: `Approved Leave: ${lv.leave_name}`,
            isVirtual: true
          });
        }
      }
    });

    // Sort by date descending
    return merged.sort((a, b) => b.punch_date.localeCompare(a.punch_date));
  };

  // Filter logs for admin/hr/managers
  const filteredLogs = getMergedLogs().filter((log) => {
    const nameMatch = filterName
      ? log.employee_name?.toLowerCase().includes(filterName.toLowerCase())
      : true;
    const deptMatch = filterDept
      ? log.department_name === filterDept
      : true;
    return nameMatch && deptMatch;
  });

  return (
    <div>
      {/* Title */}
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
          <FiClock style={{ color: "var(--accent)" }} /> Attendance Module
        </h2>
        <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "0.85rem" }}>
          Simulate fingerprint biometric scans to register punches, manage manual modifications, and track leave integration.
        </p>
      </div>

      {message && (
        <div className={`status-message ${message.ok ? "success" : "error"}`} style={{ marginBottom: "20px" }}>
          {message.content}
        </div>
      )}

      {/* Main Grid: Scanner Left, Logs Right */}
      <div style={{ display: "grid", gridTemplateColumns: isPrivileged ? "1fr" : "320px 1fr", gap: "24px", alignItems: "start" }}>
        
        {/* Biometric Scanner (Only show panel separately on employee layout, or top of Admin) */}
        {!isPrivileged && (
          <div className="auth-card" style={{ padding: "30px 20px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px" }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "1rem", fontWeight: "600" }}>Biometric Scanner</h3>
            <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "20px", lineHeight: "1.4" }}>
              {deviceBiometricsSupported 
                ? "Authenticate using your device Touch ID / Face ID sensor below to log your punch in or out."
                : "Biometric hardware is not detected. Click scanner button to run simulated scan."}
            </p>

            {/* Biometrics Status/Enroll Button */}
            {deviceBiometricsSupported ? (
              <div style={{ marginBottom: "24px" }}>
                {isBiometricEnrolled ? (
                  <span className="chip success" style={{ fontSize: "0.75rem", padding: "4px 10px" }}>
                    ✓ Device Biometrics Active
                  </span>
                ) : (
                  <button 
                    className="btn" 
                    onClick={handleEnrollBiometrics} 
                    disabled={checkingBiometrics}
                    style={{ fontSize: "0.8rem", padding: "6px 12px", height: "auto" }}
                  >
                    {checkingBiometrics ? "Checking..." : "Enroll Device Biometrics"}
                  </button>
                )}
              </div>
            ) : (
              <div style={{ marginBottom: "24px" }}>
                <span className="chip warning" style={{ fontSize: "0.75rem", padding: "4px 10px" }}>
                  ⚠ Simulation Mode
                </span>
              </div>
            )}

            {/* Fingerprint Scanner Interactive Widget */}
            <div 
              onClick={handleBiometricPunch}
              style={{
                position: "relative",
                width: "140px",
                height: "140px",
                borderRadius: "50%",
                background: scanState === "scanning" 
                  ? "radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0.02) 70%)"
                  : scanState === "success"
                  ? "radial-gradient(circle, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.02) 70%)"
                  : scanState === "error"
                  ? "radial-gradient(circle, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.02) 70%)"
                  : "var(--surface-alt)",
                border: `2px solid ${
                  scanState === "scanning" 
                    ? "var(--accent)" 
                    : scanState === "success"
                    ? "var(--success)"
                    : scanState === "error"
                    ? "var(--danger)"
                    : "var(--border)"
                }`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: punchLoading ? "default" : "pointer",
                boxShadow: scanState === "scanning" ? "0 0 20px var(--accent-soft)" : "none",
                transition: "all 0.3s ease",
                overflow: "hidden"
              }}
            >
              {/* Scanline line element for animation */}
              {scanState === "scanning" && (
                <div style={{
                  position: "absolute",
                  width: "100%",
                  height: "2px",
                  background: "var(--accent)",
                  boxShadow: "0 0 8px var(--accent)",
                  top: 0,
                  animation: "scanline 1.5s infinite ease-in-out"
                }} />
              )}

              <FaFingerprint 
                size={64} 
                color={
                  scanState === "scanning" 
                    ? "var(--accent)" 
                    : scanState === "success"
                    ? "var(--success)"
                    : scanState === "error"
                    ? "var(--danger)"
                    : "var(--muted)"
                } 
                style={{
                  animation: scanState === "scanning" ? "pulse 1.2s infinite ease-in-out" : "none",
                  transition: "color 0.3s ease"
                }}
              />
            </div>

            {/* Scanning Progress */}
            {scanState === "scanning" && (
              <div style={{ marginTop: "20px", width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--accent)", fontWeight: "600", marginBottom: "4px" }}>
                  <span>ANALYZING BIOMETRICS</span>
                  <span>{scanProgress}%</span>
                </div>
                <div style={{ height: "4px", background: "var(--border)", borderRadius: "2px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${scanProgress}%`, background: "var(--accent)", transition: "width 0.15s ease" }} />
                </div>
              </div>
            )}

            <p style={{ 
              marginTop: "20px", 
              fontSize: "0.8rem", 
              fontWeight: "600", 
              color: 
                scanState === "scanning" 
                  ? "var(--accent)" 
                  : scanState === "success"
                  ? "var(--success)"
                  : scanState === "error"
                  ? "var(--danger)"
                  : "var(--text)"
            }}>
              {scanState === "scanning" && "Scanning fingerprint..."}
              {scanState === "success" && "Access Granted!"}
              {scanState === "error" && "Scan Failed!"}
              {scanState === "idle" && "Press to Scan Fingerprint"}
            </p>
          </div>
        )}

        {/* Logs Listing Panel */}
        <div className="table-card" style={{ padding: "24px", flex: 1, minWidth: 0 }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "600" }}>
                {isPrivileged ? "Employee Attendance Logs" : "Your Attendance Logs"}
              </h3>
              <p style={{ margin: "2px 0 0", color: "var(--muted)", fontSize: "0.75rem" }}>
                Record of punches, virtual leave approvals, and shift hours.
              </p>
            </div>

            {/* Quick punch widget for admin if they want to punch themselves */}
            {isPrivileged && (
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                {deviceBiometricsSupported && !isBiometricEnrolled && (
                  <button 
                    className="btn secondary" 
                    onClick={handleEnrollBiometrics}
                    disabled={checkingBiometrics}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", height: "36px", borderColor: "var(--accent)", color: "var(--accent)" }}
                  >
                    {checkingBiometrics ? "Checking..." : "Enroll Biometrics"}
                  </button>
                )}
                {deviceBiometricsSupported && isBiometricEnrolled && (
                  <span className="chip success" style={{ fontSize: "0.75rem", padding: "4px 8px", display: "inline-flex", alignItems: "center", height: "26px" }}>
                    ✓ Biometrics Enrolled
                  </span>
                )}
                <button 
                  className="btn secondary" 
                  onClick={handleBiometricPunch} 
                  disabled={punchLoading} 
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", height: "36px" }}
                >
                  <FaFingerprint color={scanState === "scanning" ? "var(--accent)" : "inherit"} />
                  {punchLoading ? `Scanning (${scanProgress}%)` : "Biometric Punch"}
                </button>
                {canModify && (
                  <button 
                    className="btn" 
                    onClick={() => { resetForm(); setShowAddModal(true); }}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", height: "36px" }}
                  >
                    <FiPlus /> Add Manual Log
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Filtering row for Admins */}
          {isPrivileged && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", background: "var(--surface-alt)", padding: "12px", borderRadius: "6px", marginBottom: "20px", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", gridColumn: "1 / -1", fontSize: "0.8rem", fontWeight: "600", color: "var(--muted)", marginBottom: "4px" }}>
                <FiFilter /> Filter Logs
              </div>
              <div className="field-group">
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Search Employee..."
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  style={{ height: "36px", padding: "6px 12px", fontSize: "0.8rem" }}
                />
              </div>
              <div className="field-group">
                <select 
                  className="select-field"
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                  style={{ height: "36px", padding: "6px 12px", fontSize: "0.8rem" }}
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.department_name}>{d.department_name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {loading ? (
            <p style={{ color: "var(--muted)", padding: "20px" }}>Compiling logs...</p>
          ) : filteredLogs.length === 0 ? (
            <div className="empty-state" style={{ padding: "40px" }}>
              <div className="empty-illustration">📅</div>
              <h3>No logs recorded</h3>
              <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "4px" }}>
                No attendance or approved leaves registered in this query.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    {isPrivileged && <th>Employee</th>}
                    {isPrivileged && <th>Department</th>}
                    <th>Date</th>
                    <th>Punch In</th>
                    <th>Punch Out</th>
                    <th>Status</th>
                    <th>Notes</th>
                    {canModify && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id} style={log.isVirtual ? { background: "var(--accent-soft)", opacity: 0.85 } : {}}>
                      {isPrivileged && (
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--border)", display: "flex", alignItems: "center", justifyCenter: "center", fontSize: "0.7rem", fontWeight: "bold", color: "var(--muted)" }}>
                              {log.employee_name?.charAt(0)}
                            </div>
                            <strong>{log.employee_name}</strong>
                          </div>
                        </td>
                      )}
                      {isPrivileged && <td>{log.department_name || "—"}</td>}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: "monospace" }}>
                          <FiCalendar size={13} style={{ color: "var(--muted)" }} />
                          {log.punch_date}
                        </div>
                      </td>
                      <td>{formatTime(log.punch_in)}</td>
                      <td>{formatTime(log.punch_out)}</td>
                      <td>
                        <span className={`chip ${getStatusClass(log.status)}`}>
                          {log.status}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.8rem", color: log.isVirtual ? "var(--accent)" : "var(--muted)" }}>
                          {log.notes || "—"}
                        </span>
                      </td>
                      {canModify && (
                        <td>
                          {log.isVirtual ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontSize: "0.75rem", fontStyle: "italic", color: "var(--muted)" }}>On Leave</span>
                              <button 
                                className="action-btn edit" 
                                onClick={() => {
                                  const emp = employees.find(e => e.user_name === log.employee_name);
                                  setForm({
                                    employee_id: emp ? emp.id : "",
                                    punch_date: log.punch_date,
                                    punch_in: "09:00",
                                    punch_out: "17:00",
                                    status: "Present",
                                    notes: `Overriding approved leave: ${log.notes}`
                                  });
                                  setShowAddModal(true);
                                }}
                                title="Override Leave with Attendance"
                                style={{ padding: "4px", width: "26px", height: "26px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                              >
                                <FiPlus size={13} />
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button 
                                className="action-btn edit" 
                                onClick={() => openEdit(log)}
                                title="Edit Attendance"
                                style={{ padding: "4px", width: "26px", height: "26px" }}
                              >
                                <FiEdit2 size={13} />
                              </button>
                              <button 
                                className="action-btn delete" 
                                onClick={() => handleDelete(log.id)}
                                title="Delete Attendance"
                                style={{ padding: "4px", width: "26px", height: "26px" }}
                              >
                                <FiTrash2 size={13} />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Manual Modal */}
      {showAddModal && (
        <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="modal-content" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "24px", width: "450px", maxWidth: "90%" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "1.1rem", fontWeight: "600" }}>Manual Attendance log</h3>
            <form onSubmit={handleManualSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              
              <div className="field-group">
                <label>Select Employee</label>
                <select 
                  className="select-field" 
                  value={form.employee_id} 
                  onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                  required
                >
                  <option value="">Choose Employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.user_name} ({emp.department_name || "Unassigned"})</option>
                  ))}
                </select>
              </div>

              <div className="field-group">
                <label>Date</label>
                <input 
                  type="date" 
                  className="input-field" 
                  value={form.punch_date} 
                  onChange={(e) => setForm({ ...form, punch_date: e.target.value })}
                  required 
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="field-group">
                  <label>Punch In Time</label>
                  <input 
                    type="time" 
                    className="input-field" 
                    value={form.punch_in} 
                    onChange={(e) => setForm({ ...form, punch_in: e.target.value })} 
                  />
                </div>
                <div className="field-group">
                  <label>Punch Out Time</label>
                  <input 
                    type="time" 
                    className="input-field" 
                    value={form.punch_out} 
                    onChange={(e) => setForm({ ...form, punch_out: e.target.value })} 
                  />
                </div>
              </div>

              <div className="field-group">
                <label>Status</label>
                <select 
                  className="select-field" 
                  value={form.status} 
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  required
                >
                  <option value="Present">Present</option>
                  <option value="Half Day">Half Day</option>
                  <option value="Absent">Absent</option>
                  <option value="On Leave">On Leave</option>
                </select>
              </div>

              <div className="field-group">
                <label>Notes / Comments</label>
                <textarea 
                  className="input-field" 
                  rows={2}
                  value={form.notes} 
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} 
                  placeholder="e.g. Forgot to scan fingerprint card, manually adjusted."
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button type="button" className="btn secondary" onClick={() => { setShowAddModal(false); resetForm(); }}>Cancel</button>
                <button type="submit" className="btn">Create Log</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="modal-content" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "24px", width: "450px", maxWidth: "90%" }}>
            <h3 style={{ margin: "0 0 8px 0", fontSize: "1.1rem", fontWeight: "600" }}>Adjust Attendance Record</h3>
            <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "16px" }}>
              Modifying logs for: <strong style={{ color: "var(--text)" }}>{editingLog?.employee_name}</strong> on {editingLog?.punch_date}
            </p>
            <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="field-group">
                  <label>Punch In Time</label>
                  <input 
                    type="time" 
                    className="input-field" 
                    value={form.punch_in} 
                    onChange={(e) => setForm({ ...form, punch_in: e.target.value })} 
                  />
                </div>
                <div className="field-group">
                  <label>Punch Out Time</label>
                  <input 
                    type="time" 
                    className="input-field" 
                    value={form.punch_out} 
                    onChange={(e) => setForm({ ...form, punch_out: e.target.value })} 
                  />
                </div>
              </div>

              <div className="field-group">
                <label>Status</label>
                <select 
                  className="select-field" 
                  value={form.status} 
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  required
                >
                  <option value="Present">Present</option>
                  <option value="Half Day">Half Day</option>
                  <option value="Absent">Absent</option>
                  <option value="On Leave">On Leave</option>
                </select>
              </div>

              <div className="field-group">
                <label>Notes / Comments</label>
                <textarea 
                  className="input-field" 
                  rows={2}
                  value={form.notes} 
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} 
                  placeholder="Reason for adjustment"
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button type="button" className="btn secondary" onClick={() => { setShowEditModal(false); resetForm(); }}>Cancel</button>
                <button type="submit" className="btn">Save Adjustments</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global CSS simulation animations */}
      <style>{`
        @keyframes scanline {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.05); opacity: 1; filter: drop-shadow(0 0 10px rgba(59,130,246,0.6)); }
          100% { transform: scale(1); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
