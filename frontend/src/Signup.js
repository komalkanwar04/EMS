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
    <div style={{ border: "1px solid #ddd", padding: 16, margin: 8 }}>
      <h2>Signup</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Name</label>
          <br />
          <input name="name" value={form.name} onChange={handleChange} />
        </div>
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
          <button type="submit">Sign up</button>
        </div>
      </form>

      {status && status === "loading" && <div>Signing up…</div>}
      {status && status.ok === true && <div style={{ color: "green" }}>{status.message}</div>}
      {status && status.ok === false && <div style={{ color: "red" }}>{status.message}</div>}
    </div>
  );
}

export { Signup };
export default Signup;