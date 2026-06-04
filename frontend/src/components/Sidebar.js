import React from "react";
import { FiHome, FiUsers, FiLayers, FiCheckSquare, FiCalendar, FiChevronLeft, FiBriefcase } from "react-icons/fi";

export default function Sidebar({
  active = "dashboard",
  onNavigate = () => {},
  collapsed = false,
  onToggleCollapse = () => {},
  user
}) {
  const items = [
    { key: "dashboard", label: "Dashboard", icon: <FiHome /> },
    { key: "employees", label: "Employees", icon: <FiUsers /> },
    { key: "departments", label: "Departments", icon: <FiLayers /> },
    { key: "skills", label: "Skills Master", icon: <FiCheckSquare /> },
    { key: "leaves", label: "Leave System", icon: <FiCalendar /> },
  ];

  if (user && (user.role === "admin" || user.role === "hr")) {
    items.push({ key: "recruitment", label: "Recruitment", icon: <FiBriefcase /> });
  }

  return (
    <aside className={`app-sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-top">
        <div className="sidebar-brand">
          <span className="sidebar-logo">P</span>
          {!collapsed && (
            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: "700" }}>PeopleSync EMS</h3>
              <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Operations HQ</p>
            </div>
          )}
        </div>
        <button
          className="collapse-toggle"
          onClick={onToggleCollapse}
          aria-label="Toggle sidebar"
        >
          <FiChevronLeft />
        </button>
      </div>

      <nav className="sidebar-nav">
        {items.map((item) => (
          <button
            key={item.key}
            className={`side-item ${active === item.key ? "active" : ""}`}
            onClick={() => onNavigate(item.key)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {!collapsed && (
        <div className="sidebar-footer">
          <div>
            <p style={{ fontWeight: "600" }}>Employee Portal</p>
            <small style={{ color: "var(--muted)" }}>v1.2.0 • Secured</small>
          </div>
        </div>
      )}
    </aside>
  );
}
