import { useState } from "react";
import axios from "axios";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function ForgotPassword({ onBackToLogin }) {
  const [email, setEmail] = useState("");
  const [method, setMethod] = useState("otp"); // 'otp' or 'link'
  const [step, setStep] = useState(1); // 1: request, 2: verify otp (if otp method)
  const [status, setStatus] = useState(null);

  // Form states for step 2 (OTP reset)
  const [otpForm, setOtpForm] = useState({ otp: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await axios.post("/api/auth/forgot-password", { email, method });
      setStatus({ ok: true, message: res.data.message });
      if (method === "otp") {
        setStep(2);
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Failed to send request";
      setStatus({ ok: false, message });
    }
  };

  const handleOtpResetSubmit = async (e) => {
    e.preventDefault();
    if (otpForm.password !== otpForm.confirmPassword) {
      setStatus({ ok: false, message: "Passwords do not match" });
      return;
    }
    setStatus("loading");
    try {
      const res = await axios.post("/api/auth/reset-password-otp", {
        email,
        otp: otpForm.otp,
        password: otpForm.password,
      });
      setStatus({ ok: true, message: res.data.message });
      setStep(3); // success state
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Reset failed";
      setStatus({ ok: false, message });
    }
  };

  const handleOtpChange = (e) => {
    setOtpForm({ ...otpForm, [e.target.name]: e.target.value });
  };

  return (
    <div>
      <h2 style={{ fontSize: "1.5rem", marginBottom: "6px" }}>Reset Password</h2>
      <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "20px" }}>
        {step === 1 && "Recover access to your administrative console profile."}
        {step === 2 && "Enter the 6-digit OTP code sent to your email to set a new password."}
        {step === 3 && "Your password has been updated successfully."}
      </p>

      {status && status !== "loading" && (
        <div className={`status-message ${status.ok ? "success" : "error"}`} style={{ marginBottom: "16px" }}>
          {status.message}
        </div>
      )}

      {step === 1 && (
        <form onSubmit={handleRequestSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="field-group">
            <label htmlFor="reset-email">Email Address</label>
            <input
              id="reset-email"
              className="input-field"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="name@company.com"
            />
          </div>

          <div className="field-group">
            <label>Reset Method</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "4px" }}>
              <button
                type="button"
                className={`action-btn view ${method === "otp" ? "active" : ""}`}
                style={{
                  padding: "10px",
                  borderRadius: "6px",
                  fontSize: "0.8rem",
                  border: `1px solid ${method === "otp" ? "var(--accent)" : "var(--border)"}`,
                  background: method === "otp" ? "var(--accent-soft)" : "transparent",
                  cursor: "pointer",
                  fontWeight: method === "otp" ? "600" : "400",
                }}
                onClick={() => setMethod("otp")}
              >
                🔢 via OTP Code
              </button>
              <button
                type="button"
                className={`action-btn view ${method === "link" ? "active" : ""}`}
                style={{
                  padding: "10px",
                  borderRadius: "6px",
                  fontSize: "0.8rem",
                  border: `1px solid ${method === "link" ? "var(--accent)" : "var(--border)"}`,
                  background: method === "link" ? "var(--accent-soft)" : "transparent",
                  cursor: "pointer",
                  fontWeight: method === "link" ? "600" : "400",
                }}
                onClick={() => setMethod("link")}
              >
                🔗 via Email Link
              </button>
            </div>
          </div>

          <button className="btn" type="submit" disabled={status === "loading"} style={{ marginTop: "8px" }}>
            {status === "loading" ? "Processing Request…" : "Send Recovery Request"}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleOtpResetSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="field-group">
            <label htmlFor="reset-otp">OTP Code</label>
            <input
              id="reset-otp"
              className="input-field"
              name="otp"
              type="text"
              value={otpForm.otp}
              onChange={handleOtpChange}
              required
              placeholder="123456"
            />
          </div>

          <div className="field-group">
            <label htmlFor="reset-new-password">New Password</label>
            <div style={{ position: "relative" }}>
              <input
                id="reset-new-password"
                className="input-field"
                name="password"
                type={showPassword ? "text" : "password"}
                value={otpForm.password}
                onChange={handleOtpChange}
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
            <label htmlFor="reset-confirm-password">Confirm New Password</label>
            <input
              id="reset-confirm-password"
              className="input-field"
              name="confirmPassword"
              type={showPassword ? "text" : "password"}
              value={otpForm.confirmPassword}
              onChange={handleOtpChange}
              required
              placeholder="••••••••"
            />
          </div>

          <button className="btn" type="submit" disabled={status === "loading"} style={{ marginTop: "8px" }}>
            {status === "loading" ? "Resetting Password…" : "Update Password"}
          </button>
        </form>
      )}

      {step === 3 && (
        <div style={{ textAlign: "center", marginTop: "16px" }}>
          <button className="btn" type="button" onClick={onBackToLogin}>
            Sign In Now
          </button>
        </div>
      )}

      {(step !== 3) && (
        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <button
            type="button"
            className="action-btn view"
            style={{ fontSize: "0.8rem", cursor: "pointer", textDecoration: "underline" }}
            onClick={onBackToLogin}
          >
            Back to Sign In
          </button>
        </div>
      )}
    </div>
  );
}
