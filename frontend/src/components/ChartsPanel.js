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
  CartesianGrid,
  Legend
} from "recharts";

const COLORS = ["#8b5cf6", "#ec4899", "#10b981", "#3b82f6", "#f59e0b", "#6366f1", "#a855f7", "#ec4899"];

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
          fontSize: "0.8rem",
          color: "var(--text)"
        }}
      >
        <p style={{ fontWeight: "700", marginBottom: "6px" }}>{label || payload[0].name}</p>
        {payload.map((item, idx) => (
          <p key={idx} style={{ color: item.color || item.fill, margin: "2px 0" }}>
            {item.name}: <span style={{ fontWeight: "bold" }}>${item.value?.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Count-only tooltip for count graphs
const CountTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: "var(--surface-strong)",
          border: "1px solid var(--border)",
          padding: "10px 14px",
          borderRadius: "8px",
          boxShadow: "var(--shadow)",
          fontSize: "0.8rem",
          color: "var(--text)"
        }}
      >
        <p style={{ fontWeight: "700", marginBottom: "6px" }}>{label || payload[0].name}</p>
        {payload.map((item, idx) => (
          <p key={idx} style={{ color: item.color || item.fill, margin: "2px 0" }}>
            {item.name}: <span style={{ fontWeight: "bold" }}>{item.value} headcount</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function ChartsPanel({ data = {}, user }) {
  // Mapping incoming API statistics
  const deptData = data.deptDistribution || [];
  const salaryData = data.salaryAnalytics || [];
  const hireTrend = data.hiringTrend || [];
  const workingModeData = data.workingModeDistribution || [];
  const locationData = data.locationDistribution || [];
  const payrollCostData = data.payrollCostAnalysis || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      
      {/* Chart Dashboard Title Block */}
      <div style={{ marginTop: "16px", marginBottom: "8px" }}>
        <h3 style={{ margin: "0 0 4px 0", fontSize: "1.35rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px", color: "var(--chart-text)" }}>
          📊 Operations & Payroll Insights
        </h3>
        <p style={{ color: "var(--muted)", fontSize: "0.95rem", margin: 0 }}>
          Review employee distributions, location summaries, working modes, and monthly payroll budget allocations.
        </p>
      </div>

      {/* Grid of 6 Charts */}
      <div className="charts-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(460px, 1fr))", gap: "20px" }}>
        
        {/* 1. Department Distribution (Pie Chart with Left/Right Legends) */}
        <div className="chart-card">
          <h4 style={{ color: "var(--chart-text)", fontSize: "1.15rem", fontWeight: "700", textTransform: "none", marginBottom: "16px" }}>
            Department Distribution
          </h4>
          {deptData.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 180, color: "var(--chart-text)", fontSize: "0.95rem" }}>
              No department data available.
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", minHeight: "200px" }}>
              
              {/* Left Column Description */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px", color: "var(--chart-text)", fontWeight: "600", width: "30%", textAlign: "left" }}>
                {deptData.slice(0, Math.ceil(deptData.length / 2)).map((entry, index) => (
                  <div key={index} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ display: "inline-block", width: "10px", height: "10px", backgroundColor: COLORS[index % COLORS.length], borderRadius: "50%", flexShrink: 0 }}></span>
                    <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }} title={entry.name}>
                      {entry.name}: {entry.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Pie Chart Center */}
              <div style={{ width: "40%", height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deptData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      animationDuration={800}
                    >
                      {deptData.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} stroke="var(--surface-strong)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip content={<CountTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Right Column Description */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px", color: "var(--chart-text)", fontWeight: "600", width: "30%", textAlign: "left" }}>
                {deptData.slice(Math.ceil(deptData.length / 2)).map((entry, index) => {
                  const actualIdx = Math.ceil(deptData.length / 2) + index;
                  return (
                    <div key={index} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ display: "inline-block", width: "10px", height: "10px", backgroundColor: COLORS[actualIdx % COLORS.length], borderRadius: "50%", flexShrink: 0 }}></span>
                      <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }} title={entry.name}>
                        {entry.name}: {entry.value}
                      </span>
                    </div>
                  );
                })}
              </div>

            </div>
          )}
        </div>

        {/* 2. City-wise Employee Headcount (Bar Chart) */}
        <div className="chart-card">
          <h4 style={{ color: "var(--chart-text)", fontSize: "1.15rem", fontWeight: "700", textTransform: "none", marginBottom: "16px" }}>
            Location Breakdown (Top Cities)
          </h4>
          {locationData.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "var(--chart-text)", fontSize: "0.95rem" }}>
              No location data available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={locationData} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--chart-text)" tick={{ fill: "var(--chart-text)", fontSize: 11, fontWeight: "600" }} tickLine={false} interval={0} angle={-25} textAnchor="end" height={60} />
                <YAxis stroke="var(--chart-text)" tick={{ fill: "var(--chart-text)", fontSize: 12, fontWeight: "600" }} tickLine={false} axisLine={false} />
                <Tooltip content={<CountTooltip />} cursor={{ fill: "var(--accent-soft)" }} />
                <Bar dataKey="value" name="Headcount" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 3. Working Mode Distribution (Donut Chart) */}
        <div className="chart-card">
          <h4 style={{ color: "var(--chart-text)", fontSize: "1.15rem", fontWeight: "700", textTransform: "none", marginBottom: "16px" }}>
            Working Mode Distribution
          </h4>
          {workingModeData.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "var(--chart-text)", fontSize: "0.95rem" }}>
              No working mode data available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={workingModeData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={0}
                  outerRadius={80}
                  paddingAngle={2}
                  animationDuration={800}
                >
                  {workingModeData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[(idx + 3) % COLORS.length]} stroke="var(--surface-strong)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<CountTooltip />} />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  iconSize={10}
                  wrapperStyle={{ fontSize: "13px" }}
                  formatter={(value) => <span style={{ color: "var(--chart-text)", fontWeight: "600" }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 4. Hiring Growth Trend (Line Chart) */}
        <div className="chart-card">
          <h4 style={{ color: "var(--chart-text)", fontSize: "1.15rem", fontWeight: "700", textTransform: "none", marginBottom: "16px" }}>
            Hiring Growth Trend
          </h4>
          {hireTrend.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "var(--chart-text)", fontSize: "0.95rem" }}>
              No hiring trend data available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={hireTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--chart-text)" tick={{ fill: "var(--chart-text)", fontSize: 12, fontWeight: "600" }} tickLine={false} />
                <YAxis stroke="var(--chart-text)" tick={{ fill: "var(--chart-text)", fontSize: 12, fontWeight: "600" }} tickLine={false} axisLine={false} />
                <Tooltip content={<CountTooltip />} />
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

        {/* 5. Average Salary by Department (Bar Chart) */}
        <div className="chart-card">
          <h4 style={{ color: "var(--chart-text)", fontSize: "1.15rem", fontWeight: "700", textTransform: "none", marginBottom: "16px" }}>
            Average Salary by Department ($)
          </h4>
          {salaryData.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "var(--chart-text)", fontSize: "0.95rem" }}>
              No salary data available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={salaryData} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--chart-text)" tick={{ fill: "var(--chart-text)", fontSize: 11, fontWeight: "600" }} tickLine={false} interval={0} angle={-25} textAnchor="end" height={60} />
                <YAxis stroke="var(--chart-text)" tick={{ fill: "var(--chart-text)", fontSize: 12, fontWeight: "600" }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--accent-soft)" }} />
                <Bar dataKey="avg" name="Avg Salary" fill="#ec4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 6. Payroll Budget Breakdown (Stacked Bar Chart) */}
        <div className="chart-card">
          <h4 style={{ color: "var(--chart-text)", fontSize: "1.15rem", fontWeight: "700", textTransform: "none", marginBottom: "16px" }}>
            Payroll Cost Analysis by Department ($)
          </h4>
          {payrollCostData.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "var(--chart-text)", fontSize: "0.95rem" }}>
              No payroll cost data available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={payrollCostData} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--chart-text)" tick={{ fill: "var(--chart-text)", fontSize: 11, fontWeight: "600" }} tickLine={false} interval={0} angle={-25} textAnchor="end" height={60} />
                <YAxis stroke="var(--chart-text)" tick={{ fill: "var(--chart-text)", fontSize: 12, fontWeight: "600" }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--accent-soft)" }} />
                <Bar dataKey="net" name="Net Salary" stackId="a" fill="#a78bfa" />
                <Bar dataKey="deductions" name="Deductions" stackId="a" fill="#f472b6" radius={[4, 4, 0, 0]} />
                <Legend
                  iconSize={10}
                  wrapperStyle={{ fontSize: "13px" }}
                  formatter={(value) => <span style={{ color: "var(--chart-text)", fontWeight: "600" }}>{value}</span>}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>
    </div>
  );
}
