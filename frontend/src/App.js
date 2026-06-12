import { useEffect, useState } from "react";
import axios from "axios";
import Signup from "./Signup";
import Login from "./Login";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";
import EmployeeDashboard from "./EmployeeDashboard";
import Navbar from "./components/Navbar";
import LandingPage from "./components/LandingPage";

const apiBase = process.env.REACT_APP_API_URL || "http://localhost:5001";

// Global axios defaults
axios.defaults.baseURL = apiBase;
axios.defaults.withCredentials = true;

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [authTab, setAuthTab] = useState("login");
  const [showAuth, setShowAuth] = useState(false);
  const [resetTokenData, setResetTokenData] = useState({ token: "", email: "" });

  // Detect URL search parameters for link-based password reset
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get("action");
    const token = params.get("token");
    const email = params.get("email");

    if (action === "reset-password" && token && email) {
      setResetTokenData({ token, email });
      setAuthTab("reset-link");
      setShowAuth(true);
    }
  }, []);

  // Toggle Dark Mode Theme
  useEffect(() => {
    document.documentElement.classList.toggle("dark-theme", isDarkMode);
  }, [isDarkMode]);

  // Intercept 401 Unauthorized globally
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          setUser(null);
        }
        return Promise.reject(error);
      }
    );
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  // Fetch session on load
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get("/api/auth/me");
        setUser(res.data.user);
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  // Inactivity Auto-Logout (10 seconds)
  useEffect(() => {
    if (!user) return;

    let timeoutId;
    let lastX = null;
    let lastY = null;
    let lastActiveTime = Date.now();
    const TIMEOUT_IN_MS = 10000; // 10 seconds

    const handleInactivity = () => {
      axios.post("/api/auth/logout", {}).catch(() => {});
      setUser(null);
      setMessage("Logged out due to inactivity");
      setTimeout(() => setMessage(null), 5000);
    };

    const resetTimer = (e) => {
      if (e && e.type === "mousemove") {
        const threshold = 15; // ignore minor cursor jitter
        if (lastX !== null && lastY !== null) {
          const deltaX = Math.abs(e.clientX - lastX);
          const deltaY = Math.abs(e.clientY - lastY);
          if (deltaX < threshold && deltaY < threshold) {
            return; // skip timer reset for tiny pointer movements
          }
        }
        lastX = e.clientX;
        lastY = e.clientY;
      }

      lastActiveTime = Date.now();
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(handleInactivity, TIMEOUT_IN_MS);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const timeElapsed = Date.now() - lastActiveTime;
        if (timeElapsed >= TIMEOUT_IN_MS) {
          handleInactivity();
        } else {
          resetTimer();
        }
      }
    };

    const activityEvents = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];

    // Initialize timer
    resetTimer();

    // Attach listeners
    activityEvents.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user]);

  const handleLogout = async () => {
    try {
      await axios.post("/api/auth/logout", {});
      setUser(null);
      setMessage("Logged out successfully");
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage("Logout failed");
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="status-message" style={{ margin: "100px auto", maxWidth: "400px", textAlign: "center" }}>
        Checking session status…
      </div>
    );
  }

  return (
    <main>
      <Navbar user={user} isDark={isDarkMode} onToggleDark={() => setIsDarkMode((c) => !c)} />

      {message && <div className="status-message success" style={{ maxWidth: "400px", margin: "20px auto 0" }}>{message}</div>}

      {user ? (
        <EmployeeDashboard user={user} onLogout={handleLogout} />
      ) : showAuth ? (
        <div className="auth-container">
          <div className="auth-box auth-card" style={{ display: "flex", flexDirection: "column" }}>
            <button
              type="button"
              className="action-btn view"
              style={{ alignSelf: "flex-start", marginBottom: "16px", fontSize: "0.85rem", cursor: "pointer", border: "1px solid var(--border)", background: "transparent", padding: "4px 10px", width: "auto", height: "auto" }}
              onClick={() => setShowAuth(false)}
            >
              ← Back to Portal
            </button>
            {authTab !== "forgot" && authTab !== "reset-link" && (
              <div className="auth-tabs">
                <button
                  className={`auth-tab ${authTab === "login" ? "active" : ""}`}
                  onClick={() => setAuthTab("login")}
                >
                  Sign In
                </button>
                <button
                  className={`auth-tab ${authTab === "signup" ? "active" : ""}`}
                  onClick={() => setAuthTab("signup")}
                >
                  Sign Up
                </button>
              </div>
            )}
            {authTab === "login" && (
              <Login 
                onLogin={(u) => { setUser(u); setShowAuth(false); }} 
                onForgotPassword={() => setAuthTab("forgot")}
              />
            )}
            {authTab === "signup" && (
              <Signup onSignup={(u) => { setUser(u); setShowAuth(false); }} />
            )}
            {authTab === "forgot" && (
              <ForgotPassword onBackToLogin={() => setAuthTab("login")} />
            )}
            {authTab === "reset-link" && (
              <ResetPassword 
                email={resetTokenData.email} 
                token={resetTokenData.token} 
                onBackToLogin={() => {
                  setAuthTab("login");
                  window.history.replaceState({}, document.title, window.location.pathname);
                }} 
              />
            )}
          </div>
        </div>
      ) : (
        <LandingPage 
          onSignInClick={() => { setAuthTab("login"); setShowAuth(true); }}
          onSignUpClick={() => { setAuthTab("signup"); setShowAuth(true); }}
        />
      )}
    </main>
  );
}