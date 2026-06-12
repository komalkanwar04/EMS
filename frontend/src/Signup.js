import { useState } from "react";
import axios from "axios";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function Signup({ onSignup }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setStatus({ ok: false, message: "Passwords do not match" });
      return;
    }
    setStatus("loading");
    try {
      const res = await axios.post("/api/auth/signup", {
        name: form.name,
        email: form.email,
        password: form.password
      });
      setStatus({ ok: true, message: res.data?.message || "Account registered successfully" });
      onSignup?.(res.data.user);
    } catch (err) {
      const message = err?.response?.data?.message || err.message || "Registration failed";
      setStatus({ ok: false, message });
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: "1.5rem", marginBottom: "6px" }}>Register Account</h2>
      <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "20px" }}>
        Create an administrator profile to begin organizing directories.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div className="field-group">
          <label htmlFor="signup-name">Full Name</label>
          <input
            id="signup-name"
            className="input-field"
            name="name"
            type="text"
            value={form.name}
            onChange={handleChange}
            required
            placeholder="John Doe"
          />
        </div>

        <div className="field-group">
          <label htmlFor="signup-email">Email Address</label>
          <input
            id="signup-email"
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
          <label htmlFor="signup-password">Secure Password</label>
          <div style={{ position: "relative" }}>
            <input
              id="signup-password"
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

        <div className="field-group">
          <label htmlFor="signup-confirm-password">Confirm Password</label>
          <div style={{ position: "relative" }}>
            <input
              id="signup-confirm-password"
              className="input-field"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={form.confirmPassword}
              onChange={handleChange}
              required
              placeholder="••••••••"
              style={{ paddingRight: "40px" }}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
            >
              {showConfirmPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
            </button>
          </div>
        </div>

        <button className="btn" type="submit" disabled={status === "loading"} style={{ marginTop: "8px" }}>
          {status === "loading" ? "Initializing Workspace…" : "Create Workspace"}
        </button>
      </form>

      {status && status !== "loading" && (
        <div className={`status-message ${status.ok ? "success" : "error"}`} style={{ marginTop: "16px" }}>
          {status.message}
        </div>
      )}
    </div>
  );
}