import React from "react";
import { FiHome, FiUsers, FiPlusCircle, FiLayers, FiDollarSign, FiBarChart2, FiFileText, FiSettings, FiChevronLeft } from "react-icons/fi";

export default function Sidebar({ active = "dashboard", onNavigate = () => {}, collapsed = false, onToggleCollapse = () => {} }) {
  const items = [
    { key: "dashboard", label: "Dashboard", icon: <FiHome /> },
    { key: "employees", label: "Employees", icon: <FiUsers /> },
    { key: "departments", label: "Departments", icon: <FiLayers /> },
    { key: "payroll", label: "Payroll", icon: <FiDollarSign /> },
    { key: "analytics", label: "Analytics", icon: <FiBarChart2 /> },
    { key: "reports", label: "Reports", icon: <FiFileText /> },
    { key: "settings", label: "Settings", icon: <FiSettings /> },
  ];

  return (
    <aside className={`app-sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-top">
        <div className="sidebar-brand">
          <span className="sidebar-logo">K</span>
          {!collapsed && (
            <div>
              <h3>Komal HR</h3>
              <p>People operations</p>
            </div>
          )}
        </div>
        <button className="collapse-toggle" onClick={onToggleCollapse} aria-label="Toggle sidebar">
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
            <p>Employee HQ</p>
            <small>Control and collaboration</small>
          </div>
        </div>
      )}
    </aside>
  );
}
