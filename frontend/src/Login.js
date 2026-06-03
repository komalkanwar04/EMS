import { useState } from "react";
import axios from "axios";

export default function Login({ onLogin }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [status, setStatus] = useState(null);
  const apiBase = process.env.REACT_APP_API_URL || "http://localhost:5001";

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await axios.post(`${apiBase}/api/auth/login`, form, {
        withCredentials: true,
      });
      setStatus({ ok: true, message: res.data?.message || "Login successful" });
      onLogin(res.data.user);
    } catch (err) {
      const message = err?.response?.data?.message || err.message || "Login failed";
      setStatus({ ok: false, message });
    }
  };

  return (
    <div className="auth-card">
      <h2>Login</h2>
      <p style={{ color: "var(--muted)", marginTop: 6 }}>Enter your credentials to access the employee dashboard.</p>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16, marginTop: 20 }}>
        <div className="field-group">
          <label>Email</label>
          <input className="input-field" name="email" value={form.email} onChange={handleChange} required />
        </div>
        <div className="field-group">
          <label>Password</label>
          <input className="input-field" name="password" type="password" value={form.password} onChange={handleChange} required />
        </div>
        <button className="btn" type="submit">Log in</button>
      </form>

      {status && status === "loading" && <div className="status-message" style={{ marginTop: 16 }}>Logging in…</div>}
      {status && status.ok === true && <div className="status-message success" style={{ marginTop: 16 }}>{status.message}</div>}
      {status && status.ok === false && <div className="status-message error" style={{ marginTop: 16 }}>{status.message}</div>}
    </div>
  );
}
