import { useState } from "react";
import axios from "axios";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function Login({ onLogin, onForgotPassword }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await axios.post("/api/auth/login", form);
      setStatus({ ok: true, message: res.data?.message || "Login successful" });
      onLogin(res.data.user);
    } catch (err) {
      const message = err?.response?.data?.message || err.message || "Login failed";
      setStatus({ ok: false, message });
    }
  };

  const handleQuickLogin = async (email, password) => {
    setStatus("loading");
    try {
      const res = await axios.post("/api/auth/login", { email, password });
      setStatus({ ok: true, message: res.data?.message || "Login successful" });
      onLogin(res.data.user);
    } catch (err) {
      const message = err?.response?.data?.message || err.message || "Login failed";
      setStatus({ ok: false, message });
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: "1.5rem", marginBottom: "6px" }}>Sign In</h2>
      <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "20px" }}>
        Enter your administrative credentials to manage employees.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div className="field-group">
          <label htmlFor="login-email">Email Address</label>
          <input
            id="login-email"
            className="input-field"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
            placeholder="name@company.com"
          />
        </div>

        <div className="field-group">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label htmlFor="login-password">Password</label>
            <button
              type="button"
              onClick={onForgotPassword}
              className="action-btn view"
              style={{ padding: 0, fontSize: "0.75rem", cursor: "pointer", background: "none", border: "none", height: "auto", textDecoration: "underline" }}
            >
              Forgot Password?
            </button>
          </div>
          <div style={{ position: "relative" }}>
            <input
              id="login-password"
              className="input-field"
              name="password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={handleChange}
              required
              placeholder="••••••••"
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
                padding: 0
              }}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
            </button>
          </div>
        </div>

        <button className="btn" type="submit" disabled={status === "loading"} style={{ marginTop: "8px" }}>
          {status === "loading" ? "Verifying Credentials…" : "Sign In"}
        </button>
      </form>

      {status && status !== "loading" && (
        <div className={`status-message ${status.ok ? "success" : "error"}`} style={{ marginTop: "16px" }}>
          {status.message}
        </div>
      )}

      {/* Quick Demo Login Panel */}
      <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--border)" }}>
        <p style={{ fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--muted)", marginBottom: "10px", textAlign: "center" }}>
          ⚡ Quick Demo Logins (1-Click)
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <button
            type="button"
            className="action-btn view"
            style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "8px", borderRadius: "6px", fontSize: "0.75rem", border: "1px solid var(--border)", background: "var(--surface-alt)", cursor: "pointer", height: "auto" }}
            onClick={() => handleQuickLogin("pranay@isoftzone.com", "123456")}
          >
            <strong>Admin</strong>
            <span style={{ fontSize: "0.65rem", color: "var(--muted)" }}>pranay@isoftzone.com</span>
          </button>
          <button
            type="button"
            className="action-btn view"
            style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "8px", borderRadius: "6px", fontSize: "0.75rem", border: "1px solid var(--border)", background: "var(--surface-alt)", cursor: "pointer", height: "auto" }}
            onClick={() => handleQuickLogin("rahul@isoftzone.com", "123456")}
          >
            <strong>Manager</strong>
            <span style={{ fontSize: "0.65rem", color: "var(--muted)" }}>rahul@isoftzone.com</span>
          </button>
          <button
            type="button"
            className="action-btn view"
            style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "8px", borderRadius: "6px", fontSize: "0.75rem", border: "1px solid var(--border)", background: "var(--surface-alt)", cursor: "pointer", height: "auto" }}
            onClick={() => handleQuickLogin("priya@isoftzone.com", "123456")}
          >
            <strong>HR Manager</strong>
            <span style={{ fontSize: "0.65rem", color: "var(--muted)" }}>priya@isoftzone.com</span>
          </button>
          <button
            type="button"
            className="action-btn view"
            style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "8px", borderRadius: "6px", fontSize: "0.75rem", border: "1px solid var(--border)", background: "var(--surface-alt)", cursor: "pointer", height: "auto" }}
            onClick={() => handleQuickLogin("amit@isoftzone.com", "123456")}
          >
            <strong>Employee</strong>
            <span style={{ fontSize: "0.65rem", color: "var(--muted)" }}>amit@isoftzone.com</span>
          </button>
        </div>
      </div>
    </div>
  );
}
