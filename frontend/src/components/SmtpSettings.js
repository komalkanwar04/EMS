import { useState, useEffect } from "react";
import axios from "axios";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { FiCheckCircle, FiAlertCircle, FiSend, FiSettings, FiToggleLeft, FiToggleRight } from "react-icons/fi";

export default function SmtpSettings({ user }) {
  const [settings, setSettings] = useState({
    host: "",
    port: 587,
    secure: false,
    username: "",
    password: "",
    from_email: "",
    is_enabled: false,
  });

  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  
  const [status, setStatus] = useState(null); // { ok: boolean, message: string }
  const [testStatus, setTestStatus] = useState(null); // { ok: boolean, message: string }
  const [testEmail, setTestEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchSmtpSettings();
  }, []);

  const fetchSmtpSettings = async () => {
    try {
      const res = await axios.get("/api/auth/smtp-settings");
      if (res.data && res.data.smtpSettings) {
        setSettings(res.data.smtpSettings);
      }
    } catch (err) {
      console.error("Error loading SMTP settings:", err);
      setStatus({
        ok: false,
        message: err.response?.data?.message || "Failed to load SMTP configuration from server.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleToggleEnable = () => {
    setSettings((prev) => ({
      ...prev,
      is_enabled: !prev.is_enabled,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    setStatus(null);
    try {
      const res = await axios.put("/api/auth/smtp-settings", settings);
      setStatus({ ok: true, message: res.data.message || "SMTP configuration saved successfully." });
      if (res.data.smtpSettings) {
        setSettings(res.data.smtpSettings);
      }
    } catch (err) {
      console.error("Error saving SMTP settings:", err);
      setStatus({
        ok: false,
        message: err.response?.data?.message || err.message || "Failed to save configuration.",
      });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSendTest = async (e) => {
    e.preventDefault();
    if (!testEmail) {
      setTestStatus({ ok: false, message: "Please specify a recipient email address." });
      return;
    }
    setTestLoading(true);
    setTestStatus(null);
    try {
      const res = await axios.post("/api/auth/test-smtp", { test_email: testEmail });
      setTestStatus({ ok: true, message: res.data.message || "Test email dispatched successfully!" });
    } catch (err) {
      console.error("Error sending test email:", err);
      setTestStatus({
        ok: false,
        message: err.response?.data?.message || err.message || "Test email dispatch failed.",
      });
    } finally {
      setTestLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
        <p>Loading SMTP configurations from registry...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
            <FiSettings style={{ color: "var(--accent)" }} /> System Configuration
          </h2>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "4px" }}>
            Manage manual mail delivery (SMTP) protocols for administrative password recoveries.
          </p>
        </div>

        <button
          type="button"
          onClick={handleToggleEnable}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "1.5rem",
            color: settings.is_enabled ? "var(--accent)" : "var(--muted)",
            transition: "color 0.2s ease",
            padding: 0,
          }}
          title={settings.is_enabled ? "Disable SMTP" : "Enable SMTP"}
        >
          {settings.is_enabled ? (
            <span style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", fontWeight: "600" }}>
              SMTP ENABLED <FiToggleRight size={38} color="var(--accent)" />
            </span>
          ) : (
            <span style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", fontWeight: "600", color: "var(--muted)" }}>
              SIMULATION MODE <FiToggleLeft size={38} color="var(--muted)" />
            </span>
          )}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "24px" }}>
        {/* Settings Form */}
        <div className="auth-card" style={{ padding: "24px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "1.05rem", fontWeight: "600" }}>SMTP Server Settings</h3>
          
          {status && (
            <div
              className={`status-message ${status.ok ? "success" : "error"}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 14px",
                borderRadius: "6px",
                marginBottom: "20px",
                fontSize: "0.85rem",
              }}
            >
              {status.ok ? <FiCheckCircle size={16} /> : <FiAlertCircle size={16} />}
              {status.message}
            </div>
          )}

          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: "12px" }}>
              <div className="field-group">
                <label htmlFor="smtp-host">SMTP Host</label>
                <input
                  id="smtp-host"
                  name="host"
                  className="input-field"
                  type="text"
                  value={settings.host || ""}
                  onChange={handleInputChange}
                  placeholder="smtp.gmail.com"
                  required
                />
              </div>

              <div className="field-group">
                <label htmlFor="smtp-port">Port</label>
                <input
                  id="smtp-port"
                  name="port"
                  className="input-field"
                  type="number"
                  value={settings.port || 587}
                  onChange={handleInputChange}
                  placeholder="587"
                  required
                />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                id="smtp-secure"
                name="secure"
                type="checkbox"
                checked={settings.secure || false}
                onChange={handleInputChange}
                style={{ cursor: "pointer", width: "16px", height: "16px" }}
              />
              <label htmlFor="smtp-secure" style={{ fontSize: "0.85rem", color: "var(--text)", cursor: "pointer", fontWeight: "normal", margin: 0 }}>
                Secure connection (SSL/TLS on Port 465)
              </label>
            </div>

            <div className="field-group">
              <label htmlFor="smtp-username">Username / Email</label>
              <input
                id="smtp-username"
                name="username"
                className="input-field"
                type="text"
                value={settings.username || ""}
                onChange={handleInputChange}
                placeholder="name@company.com"
                required
              />
            </div>

            <div className="field-group">
              <label htmlFor="smtp-password">Password / App Key</label>
              <div style={{ position: "relative" }}>
                <input
                  id="smtp-password"
                  name="password"
                  className="input-field"
                  type={showPassword ? "text" : "password"}
                  value={settings.password || ""}
                  onChange={handleInputChange}
                  placeholder="••••••••••••••••"
                  style={{ paddingRight: "40px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--muted)",
                    display: "flex",
                    alignItems: "center",
                    padding: 0,
                  }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                </button>
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="smtp-from">Sender Email ("From")</label>
              <input
                id="smtp-from"
                name="from_email"
                className="input-field"
                type="email"
                value={settings.from_email || ""}
                onChange={handleInputChange}
                placeholder="no-reply@company.com"
                required
              />
            </div>

            <button
              className="btn"
              type="submit"
              disabled={saveLoading}
              style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginTop: "8px" }}
            >
              {saveLoading ? "Saving Configurations..." : "Save SMTP Settings"}
            </button>
          </form>
        </div>

        {/* Diagnostics & Connection Test */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="auth-card" style={{ padding: "24px", background: "var(--surface-alt)", border: "1px solid var(--border)", borderRadius: "10px" }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "1rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}>
              <FiSend /> Mail Diagnostics
            </h3>
            <p style={{ color: "var(--muted)", fontSize: "0.8rem", marginBottom: "16px", lineHeight: "1.4" }}>
              Trigger a test transmission to confirm your SMTP authentication parameters and socket connections are fully operational.
            </p>

            {testStatus && (
              <div
                className={`status-message ${testStatus.ok ? "success" : "error"}`}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                  padding: "10px 12px",
                  borderRadius: "6px",
                  marginBottom: "16px",
                  fontSize: "0.8rem",
                  lineHeight: "1.3",
                }}
              >
                {testStatus.ok ? <FiCheckCircle size={16} style={{ flexShrink: 0, marginTop: "2px" }} /> : <FiAlertCircle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />}
                <span>{testStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleSendTest} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="field-group">
                <label htmlFor="test-recipient">Test Recipient Email</label>
                <input
                  id="test-recipient"
                  className="input-field"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="recipient@example.com"
                  required
                />
              </div>

              <button
                className="btn secondary"
                type="submit"
                disabled={testLoading || !settings.is_enabled}
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "8px",
                  opacity: settings.is_enabled ? 1 : 0.6,
                  cursor: settings.is_enabled ? "pointer" : "not-allowed",
                }}
              >
                {testLoading ? "Sending Test..." : "Send Test Email"}
              </button>

              {!settings.is_enabled && (
                <p style={{ fontSize: "0.75rem", color: "var(--muted)", textAlign: "center", margin: "4px 0 0 0" }}>
                  ⚠️ Enable SMTP to run diagnosis tests.
                </p>
              )}
            </form>
          </div>

          {/* Quick Guide */}
          <div style={{ padding: "20px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", fontSize: "0.8rem" }}>
            <h4 style={{ margin: "0 0 8px 0", fontSize: "0.85rem", fontWeight: "600" }}>SMTP Quick Guide</h4>
            <ul style={{ paddingLeft: "16px", margin: 0, color: "var(--muted)", display: "flex", flexDirection: "column", gap: "6px" }}>
              <li><strong>Gmail:</strong> Use Host: <code>smtp.gmail.com</code>, Port: <code>587</code> (STARTTLS) or <code>465</code> (SSL), and generate an <em>App Password</em> from your Google account.</li>
              <li><strong>Outlook/Office 365:</strong> Use Host: <code>smtp.office365.com</code>, Port: <code>587</code>.</li>
              <li><strong>Simulation Mode:</strong> When disabled, emails will print to the backend logs console rather than sending real mail.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
