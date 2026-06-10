import { useState } from "react";
import axios from "axios";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function ResetPassword({ email, token, onBackToLogin }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setStatus({ ok: false, message: "Passwords do not match" });
      return;
    }
    setStatus("loading");
    try {
      const res = await axios.post("/api/auth/reset-password-link", {
        email,
        token,
        password,
      });
      setStatus({ ok: true, message: res.data.message });
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Failed to reset password";
      setStatus({ ok: false, message });
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: "1.5rem", marginBottom: "6px" }}>Create New Password</h2>
      <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "20px" }}>
        Enter a secure new password for profile: <strong style={{ color: "var(--text)" }}>{email}</strong>
      </p>

      {status && status !== "loading" && (
        <div className={`status-message ${status.ok ? "success" : "error"}`} style={{ marginBottom: "16px" }}>
          {status.message}
        </div>
      )}

      {status?.ok ? (
        <div style={{ textAlign: "center", marginTop: "16px" }}>
          <button className="btn" type="button" onClick={onBackToLogin}>
            Sign In Now
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="field-group">
            <label htmlFor="link-new-password">New Password</label>
            <div style={{ position: "relative" }}>
              <input
                id="link-new-password"
                className="input-field"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                  padding: 0,
                }}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
              </button>
            </div>
          </div>

          <div className="field-group">
            <label htmlFor="link-confirm-password">Confirm New Password</label>
            <input
              id="link-confirm-password"
              className="input-field"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          <button className="btn" type="submit" disabled={status === "loading"} style={{ marginTop: "8px" }}>
            {status === "loading" ? "Updating password…" : "Update Password"}
          </button>
        </form>
      )}

      {!status?.ok && (
        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <button
            type="button"
            className="action-btn view"
            style={{ fontSize: "0.8rem", cursor: "pointer", textDecoration: "underline" }}
            onClick={onBackToLogin}
          >
            Cancel and Return
          </button>
        </div>
      )}
    </div>
  );
}
