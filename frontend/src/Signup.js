import { useState } from "react";
import axios from "axios";

console.log("Signup.js: module evaluated");

function Signup({ onSignup }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [status, setStatus] = useState(null);

  const apiBase = process.env.REACT_APP_API_URL || "http://localhost:5001";

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await axios.post(`${apiBase}/api/auth/signup`, form, {
        withCredentials: true,
      });
      setStatus({ ok: true, message: res.data?.message || "Signup successful" });
      onSignup?.(res.data.user);
    } catch (err) {
      const message = err?.response?.data?.message || err.message || "Signup failed";
      setStatus({ ok: false, message });
    }
  };

  return (
    <div className="auth-card">
      <h2>Signup</h2>
      <p style={{ color: "var(--muted)", marginTop: 6 }}>Create an account to start managing employee profiles.</p>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16, marginTop: 20 }}>
        <div className="field-group">
          <label>Name</label>
          <input className="input-field" name="name" value={form.name} onChange={handleChange} required />
        </div>
        <div className="field-group">
          <label>Email</label>
          <input className="input-field" name="email" value={form.email} onChange={handleChange} required />
        </div>
        <div className="field-group">
          <label>Password</label>
          <input className="input-field" name="password" type="password" value={form.password} onChange={handleChange} required />
        </div>
        <button className="btn" type="submit">Sign up</button>
      </form>

      {status && status === "loading" && <div className="status-message" style={{ marginTop: 16 }}>Signing up…</div>}
      {status && status.ok === true && <div className="status-message success" style={{ marginTop: 16 }}>{status.message}</div>}
      {status && status.ok === false && <div className="status-message error" style={{ marginTop: 16 }}>{status.message}</div>}
    </div>
  );
}

export { Signup };
export default Signup;