import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid
} from "recharts";

const COLORS = ["#4f46e5", "#ec4899", "#10b981", "#f59e0b", "#6366f1", "#8b5cf6", "#a855f7"];

// Custom Tooltip for charts to match premium glassmorphism
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: "var(--surface-strong)",
          border: "1px solid var(--border)",
          padding: "10px 14px",
          borderRadius: "8px",
          boxShadow: "var(--shadow)",
          fontSize: "0.8rem"
        }}
      >
        <p style={{ fontWeight: "700", marginBottom: "4px" }}>{label || payload[0].name}</p>
        {payload.map((item, idx) => (
          <p key={idx} style={{ color: item.color || item.fill }}>
            {item.name}: <span style={{ fontWeight: "bold" }}>{item.value?.toLocaleString()}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function ChartsPanel({ data = {}, user }) {
  const role = (user?.role || "").toLowerCase();
  // Department Distribution (Pie)
  const deptData = data.deptDistribution?.length
    ? data.deptDistribution
    : [
        { name: "Engineering", value: 4 },
        { name: "Marketing", value: 2 },
        { name: "Finance", value: 1 },
        { name: "Human Resources", value: 1 }
      ];

  // Skills Distribution (Bar)
  const skillsData = data.skillsDistribution?.length
    ? data.skillsDistribution
    : [
        { name: "React", value: 3 },
        { name: "NodeJS", value: 2 },
        { name: "PostgreSQL", value: 2 },
        { name: "Python", value: 1 }
      ];

  // Salary per Department (Bar)
  const salaryData = data.salaryAnalytics?.length
    ? data.salaryAnalytics
    : [
        { name: "Engineering", avg: 85000 },
        { name: "Finance", avg: 72000 },
        { name: "Marketing", avg: 60000 },
        { name: "HR", avg: 55000 }
      ];

  // Hiring trend over time (Line)
  const hireTrend = data.hiringTrend?.length
    ? data.hiringTrend
    : [
        { name: "Q1", hires: 1 },
        { name: "Q2", hires: 2 },
        { name: "Q3", hires: 1 },
        { name: "Q4", hires: 2 }
      ];

  // Asset Status Distribution
  const assetStatusData = data.assetsStatusDistribution?.length
    ? data.assetsStatusDistribution
    : [
        { name: "Available", value: 5 },
        { name: "Allocated", value: 12 },
        { name: "Under Repair", value: 2 },
        { name: "Scrapped", value: 1 }
      ];

  // Asset Allocations by Department
  const assetDeptData = data.assetsAllocationByDept?.length
    ? data.assetsAllocationByDept
    : [
        { name: "Engineering", value: 8 },
        { name: "Marketing", value: 2 },
        { name: "Finance", value: 1 },
        { name: "HR", value: 1 }
      ];

  return (
    <div>
      <div className="charts-grid" style={{ marginBottom: "32px" }}>
        {/* 1. Department Size Distribution */}
      <div className="chart-card">
        <h4>Department Distribution</h4>
        {deptData.length === 0 || (deptData.length === 1 && deptData[0].value === 0) ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 180, color: "var(--muted)", fontSize: "0.85rem" }}>
            No department data available.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={deptData}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                animationDuration={800}
              >
                {deptData.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} stroke="var(--surface-strong)" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 2. Top Skills Breakdown */}
      <div className="chart-card">
        <h4>Top Skills Frequency</h4>
        {skillsData.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 180, color: "var(--muted)", fontSize: "0.85rem" }}>
            No skills data available.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={skillsData} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--muted)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--muted)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--accent-soft)" }} />
              <Bar dataKey="value" name="Frequency" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 3. Salary Range per Department */}
      <div className="chart-card">
        <h4>Average Department Salary ($)</h4>
        {salaryData.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 180, color: "var(--muted)", fontSize: "0.85rem" }}>
            No salary data available.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={salaryData} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--muted)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--muted)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--accent-soft)" }} />
              <Bar dataKey="avg" name="Avg Salary ($)" fill="#ec4899" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 4. Monthly Hiring Trend */}
      <div className="chart-card">
        <h4>Hiring Growth Trend</h4>
        {hireTrend.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 180, color: "var(--muted)", fontSize: "0.85rem" }}>
            No hiring trend data available.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={hireTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--muted)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="hires"
                name="New Hires"
                stroke="var(--success)"
                strokeWidth={3}
                dot={{ r: 4, fill: "var(--success)", strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>

    {role !== "hr" && (
      <>
        <div style={{ marginBottom: "20px", marginTop: "40px" }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: "1.2rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}>
            📦 Asset Allocation Reports
          </h3>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", margin: 0 }}>
            Overview of physical inventory assets allocation and current operational statuses.
          </p>
        </div>

        <div className="charts-grid">
          {/* 5. Asset Status Distribution */}
          <div className="chart-card">
            <h4>Asset Status Distribution</h4>
            {assetStatusData.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 180, color: "var(--muted)", fontSize: "0.85rem" }}>
                No asset status data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={assetStatusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    animationDuration={800}
                  >
                    {assetStatusData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[(idx + 2) % COLORS.length]} stroke="var(--surface-strong)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* 6. Asset Allocations by Department */}
          <div className="chart-card">
            <h4>Asset Allocations by Department</h4>
            {assetDeptData.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 180, color: "var(--muted)", fontSize: "0.85rem" }}>
                No department allocation data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={assetDeptData} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--muted)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--accent-soft)" }} />
                  <Bar dataKey="value" name="Active Allocations" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </>
    )}
  </div>
  );
}
