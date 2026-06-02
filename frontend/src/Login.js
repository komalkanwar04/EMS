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
    <div style={{ border: "1px solid #ddd", padding: 16, margin: 8 }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email</label>
          <br />
          <input name="email" value={form.email} onChange={handleChange} />
        </div>
        <div>
          <label>Password</label>
          <br />
          <input name="password" type="password" value={form.password} onChange={handleChange} />
        </div>
        <div style={{ marginTop: 8 }}>
          <button type="submit">Log in</button>
        </div>
      </form>

      {status && status === "loading" && <div>Logging in…</div>}
      {status && status.ok === true && <div style={{ color: "green" }}>{status.message}</div>}
      {status && status.ok === false && <div style={{ color: "red" }}>{status.message}</div>}
    </div>
  );
}
