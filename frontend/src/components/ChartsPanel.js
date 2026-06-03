import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from "recharts";

const COLORS = ["#7C8CFF", "#FFB6C1", "#7BDCB5", "#F6E7FF", "#E8F8FF"];

export default function ChartsPanel({ data = {} }) {
  const deptData = (data.deptDistribution && data.deptDistribution.length) ? data.deptDistribution : [
    { name: "Engineering", value: 12 },
    { name: "Design", value: 6 },
    { name: "HR", value: 3 },
  ];

  const salaryData = (data.salaryAnalytics && data.salaryAnalytics.length) ? data.salaryAnalytics : [
    { name: "Jan", avg: 60000 }, { name: "Feb", avg: 61000 }, { name: "Mar", avg: 62000 },
  ];

  const hireTrend = (data.hiringTrend && data.hiringTrend.length) ? data.hiringTrend : [
    { name: "Q1", hires: 4 }, { name: "Q2", hires: 6 }, { name: "Q3", hires: 3 }, { name: "Q4", hires: 5 },
  ];

  return (
    <div className="charts-grid">
      <div className="chart-card">
        <h4>Department Distribution</h4>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={deptData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={4}>
              {deptData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card">
        <h4>Salary Analytics</h4>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={salaryData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="avg" fill="#7C8CFF" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card" style={{ gridColumn: "span 2" }}>
        <h4>Hiring Trend</h4>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={hireTrend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="hires" stroke="#ffb6c1" strokeWidth={3} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
