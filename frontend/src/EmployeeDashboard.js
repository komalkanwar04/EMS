import { useState, useEffect } from "react";
import EmployeeForm from "./EmployeeForm";
import EmployeeList from "./EmployeeList";
import Sidebar from "./components/Sidebar";
import StatsCards from "./components/StatsCards";
import ChartsPanel from "./components/ChartsPanel";
import EmptyState from "./components/EmptyState";

export default function EmployeeDashboard({ user, onLogout }) {
  const [view, setView] = useState("list");
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState({ employees: 0, departments: 0, projects: 0, avgSalary: 0 });

  const handleCreated = () => {
    setView("list");
    setRefreshKey((current) => current + 1);
  };

  useEffect(() => {
    // lightweight stats: derive from the public endpoint (best-effort)
    const load = async () => {
      try {
        const res = await fetch((process.env.REACT_APP_API_URL || "http://localhost:5001") + "/api/employees/profiles-public");
        const json = await res.json();
        const profiles = json.profiles || [];
        const departments = new Set(profiles.map((p) => p.department_name).filter(Boolean)).size;
        const avgSalary = Math.round((profiles.reduce((s, p) => s + (p.salary || 0), 0) / Math.max(1, profiles.length)) || 0);
        setStats({ employees: profiles.length, departments, projects: Math.max(3, Math.floor(profiles.length / 2)), avgSalary });
      } catch (e) {
        // ignore
      }
    };
    load();
  }, [refreshKey]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <section className={`dashboard-app ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <Sidebar
        active={view === "create" ? "add" : view === "list" ? "employees" : "dashboard"}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((current) => !current)}
        onNavigate={(v) => setView(v === "add" ? "create" : v === "employees" ? "list" : "dashboard")}
      />

      <div className="dashboard-content">
        <div className="dashboard-hero page-card">
          <div className="hero-badge">Employee Operations</div>
          <h1>👋 Welcome Back, Komal</h1>
          <p>Manage employee records, departments, skills, payroll and analytics from one place.</p>
        </div>

        <StatsCards stats={{ employees: stats.employees, departments: stats.departments, projects: stats.projects, avgSalary: stats.avgSalary }} />

        <ChartsPanel />

        <div className="page-card dashboard-panel">
          {view === "create" ? (
            <EmployeeForm onCreated={handleCreated} />
          ) : (
            <EmployeeList key={refreshKey} />
          )}
        </div>

        {stats.employees === 0 && (
          <div style={{ marginTop: 18 }}>
            <EmptyState />
          </div>
        )}
      </div>
    </section>
  );
}
