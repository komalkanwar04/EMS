import { useState, useEffect } from "react";
import axios from "axios";
import EmployeeForm from "./EmployeeForm";
import EmployeeList from "./EmployeeList";
import Sidebar from "./components/Sidebar";
import StatsCards from "./components/StatsCards";
import ChartsPanel from "./components/ChartsPanel";
import DepartmentMaster from "./components/DepartmentMaster";
import SkillsMaster from "./components/SkillsMaster";
import LeaveManagement from "./components/LeaveManagement";
import RecruitmentManagement from "./components/RecruitmentManagement";
import AssetManagement from "./components/AssetManagement";
import ReportingManagement from "./components/ReportingManagement";

export default function EmployeeDashboard({ user, onLogout }) {
  const [view, setView] = useState("dashboard"); // dashboard, employees, departments, skills, create-employee, edit-employee
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState({
    employeesCount: 0,
    departmentsCount: 0,
    skillsCount: 0,
    avgSalary: 0,
    deptDistribution: [],
    skillsDistribution: [],
    salaryAnalytics: [],
    hiringTrend: []
  });

  // Fetch JOIN SQL aggregated dashboard statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get("/api/employees/dashboard-stats");
        setStats(res.data);
      } catch (error) {
        console.error("Error loading dashboard stats:", error);
      }
    };
    fetchStats();
  }, [refreshKey, view]);

  const handleCreatedOrUpdated = () => {
    setEditingEmployee(null);
    setView("employees");
    setRefreshKey((current) => current + 1);
  };

  const handleEditTrigger = (employee) => {
    setEditingEmployee(employee);
    setView("edit-employee");
  };

  // Map view to active sidebar link
  const getActiveSidebarKey = () => {
    if (view === "employees" || view === "create-employee" || view === "edit-employee") {
      return "employees";
    }
    return view;
  };

  return (
    <section className={`dashboard-app ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <Sidebar
        user={user}
        active={getActiveSidebarKey()}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((current) => !current)}
        onNavigate={(targetView) => {
          setEditingEmployee(null);
          setView(targetView);
        }}
      />

      <div className="dashboard-content">
        <div className="dashboard-hero">
          <div className="hero-badge">Operations Central</div>
          <h1>👋 Welcome Back, {user?.name || "Komal"}</h1>
          <p>Organize employee directories, department masters, capabilities list, payroll and analytics in a secure workspace.</p>
          <button
            className="btn secondary"
            onClick={onLogout}
            style={{ position: "absolute", right: "30px", bottom: "30px" }}
          >
            Log Out
          </button>
        </div>

        {view === "dashboard" && (
          <>
            <StatsCards
              stats={{
                employees: stats.employeesCount,
                departments: stats.departmentsCount,
                projects: stats.skillsCount, // Representing unique capabilities/skills count in workspace
                avgSalary: stats.avgSalary
              }}
            />

            <ChartsPanel
              data={{
                deptDistribution: stats.deptDistribution,
                skillsDistribution: stats.skillsDistribution,
                salaryAnalytics: stats.salaryAnalytics,
                hiringTrend: stats.hiringTrend
              }}
            />
          </>
        )}

        {view === "employees" && (
          <div className="panel-card visible">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h2 style={{ margin: 0 }}>Employee Directory</h2>
                <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "4px" }}>
                  Manage employee details, department allocations, and resumes.
                </p>
              </div>
              <button className="btn" onClick={() => setView("create-employee")}>
                Add Employee
              </button>
            </div>
            <EmployeeList
              key={refreshKey}
              onEdit={handleEditTrigger}
              onRefresh={() => setRefreshKey((k) => k + 1)}
            />
          </div>
        )}

        {view === "create-employee" && (
          <div className="panel-card visible">
            <EmployeeForm
              onCreated={handleCreatedOrUpdated}
              onCancel={() => setView("employees")}
            />
          </div>
        )}

        {view === "edit-employee" && (
          <div className="panel-card visible">
            <EmployeeForm
              employee={editingEmployee}
              onCreated={handleCreatedOrUpdated}
              onCancel={() => {
                setEditingEmployee(null);
                setView("employees");
              }}
            />
          </div>
        )}

        {view === "departments" && (
          <div className="panel-card visible">
            <DepartmentMaster onRefresh={() => setRefreshKey((k) => k + 1)} />
          </div>
        )}

        {view === "skills" && (
          <div className="panel-card visible">
            <SkillsMaster onRefresh={() => setRefreshKey((k) => k + 1)} />
          </div>
        )}

        {view === "leaves" && (
          <div className="panel-card visible">
            <LeaveManagement user={user} />
          </div>
        )}

        {view === "recruitment" && (
          <div className="panel-card visible">
            <RecruitmentManagement user={user} />
          </div>
        )}

        {view === "assets" && (
          <div className="panel-card visible">
            <AssetManagement user={user} />
          </div>
        )}

        {view === "reports" && (
          <div className="panel-card visible">
            <ReportingManagement user={user} />
          </div>
        )}
      </div>
    </section>
  );
}
