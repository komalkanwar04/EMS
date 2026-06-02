import { useEffect, useState } from "react";
import axios from "axios";
import Signup from "./Signup";
import Login from "./Login";

const apiBase = process.env.REACT_APP_API_URL || "http://localhost:5001";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get(`${apiBase}/api/auth/me`, {
          withCredentials: true,
        });
        setUser(res.data.user);
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      await axios.post(`${apiBase}/api/auth/logout`, {}, { withCredentials: true });
      setUser(null);
      setMessage("Logged out successfully");
    } catch (err) {
      setMessage("Logout failed");
    }
  };

  if (loading) {
    return <div>Loading authentication state…</div>;
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Login / Signup App</h1>

      {message && <div style={{ marginBottom: 16, color: "green" }}>{message}</div>}

      {user ? (
        <div style={{ border: "1px solid #ddd", padding: 16, margin: 8 }}>
          <h2>Welcome back, {user.name || user.email}</h2>
          <p>Email: {user.email}</p>
          <button onClick={handleLogout}>Logout</button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Signup onSignup={setUser} />
          <Login onLogin={setUser} />
        </div>
      )}
    </div>
  );
}