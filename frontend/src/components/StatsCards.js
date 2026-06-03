import React, { useEffect, useState } from "react";
import { FiUsers, FiLayers, FiBriefcase, FiDollarSign } from "react-icons/fi";

function Count({ value }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf;
    let start = null;
    const dur = 900;
    const step = (ts) => {
      if (!start) start = ts;
      const t = Math.min(1, (ts - start) / dur);
      setN(Math.floor(t * value));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span>{n}</span>;
}

export default function StatsCards({ stats = {} }) {
  const cards = [
    { key: "employees", label: "Total Employees", icon: <FiUsers /> , value: stats.employees || 0 },
    { key: "departments", label: "Departments", icon: <FiLayers /> , value: stats.departments || 0 },
    { key: "projects", label: "Active Projects", icon: <FiBriefcase /> , value: stats.projects || 0 },
    { key: "salary", label: "Average Salary", icon: <FiDollarSign /> , value: stats.avgSalary || 0 },
  ];

  return (
    <div className="stats-grid">
      {cards.map((c) => (
        <div key={c.key} className="stat-card">
          <div className="stat-icon">{c.icon}</div>
          <div className="stat-body">
            <div className="stat-value"><Count value={c.value} /></div>
            <div className="stat-label">{c.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
