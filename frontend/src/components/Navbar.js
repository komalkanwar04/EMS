import React from "react";
import { FiBell, FiSearch, FiMoon, FiSun } from "react-icons/fi";

export default function Navbar({ user, isDark, onToggleDark }) {
  return (
    <header className="top-navbar">
      <div className="nav-left">
        <div className="logo">
          <div className="logo-mark" />
          <div>
            <div className="logo-text">Komal HR</div>
            <div className="logo-subtitle">Modern employee HQ</div>
          </div>
        </div>
      </div>

      <div className="nav-center">
        <div className="search-wrap">
          <FiSearch />
          <input aria-label="Search" placeholder="Search employees, departments, skills..." />
        </div>
      </div>

      <div className="nav-right">
        <button className="icon-btn" aria-label="Notifications">
          <FiBell />
          <span className="badge-dot" />
        </button>
        <button className="icon-btn" onClick={onToggleDark} title="Toggle theme" aria-label="Toggle dark mode">
          {isDark ? <FiSun /> : <FiMoon />}
        </button>
        <div className="profile-pill">
          <span>{user?.name ? user.name.split(" ")[0] : "Guest"}</span>
        </div>
      </div>
    </header>
  );
}
