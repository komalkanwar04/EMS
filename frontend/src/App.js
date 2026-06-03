import { useEffect, useState } from "react";
import axios from "axios";
import Signup from "./Signup";
import Login from "./Login";
import EmployeeDashboard from "./EmployeeDashboard";
import Navbar from "./components/Navbar";

const apiBase = process.env.REACT_APP_API_URL || "http://localhost:5001";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark-theme", isDarkMode);
  }, [isDarkMode]);

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
    return <div className="page-card" style={{ margin: 24 }}>Loading authentication state…</div>;
  }

  return (
    <main>
      <Navbar user={user} isDark={isDarkMode} onToggleDark={() => setIsDarkMode((c) => !c)} />

      {message && <div className="status-message success">{message}</div>}

      {user ? (
        <EmployeeDashboard user={user} onLogout={handleLogout} />
      ) : (
        <div className="grid-two" style={{ gap: 20 }}>
          <Signup onSignup={setUser} />
          <Login onLogin={setUser} />
        </div>
      )}
    </main>
  );
}