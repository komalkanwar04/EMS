import React, { useEffect, useState } from "react";
import axios from "axios";
import { 
  FiFileText, FiUsers, FiCalendar, FiHardDrive, 
  FiSearch, FiFilter, FiDollarSign, FiClock, FiUser,
  FiDownload, FiSettings, FiActivity
} from "react-icons/fi";

export default function ReportingManagement({ user }) {
  const [activeTab, setActiveTab] = useState("employees"); // employees, leaves, assets, payroll
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Metadata dropdowns
  const [departments, setDepartments] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);

  // Employee Filter States
  const [empDept, setEmpDept] = useState("");
  const [empDesignation, setEmpDesignation] = useState("");

  // Leave Filter States
  const [leaveStatus, setLeaveStatus] = useState("");
  const [leaveType, setLeaveType] = useState("");
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");

  // Asset Filter States
  const [assetType, setAssetType] = useState("");
  const [assetStatus, setAssetStatus] = useState("");
  const [assetMinCost, setAssetMinCost] = useState("");
  const [assetMaxCost, setAssetMaxCost] = useState("");

  // Payroll Filter States
  const [payMonth, setPayMonth] = useState("2026-06");
  const [payCity, setPayCity] = useState("");
  const [payDept, setPayDept] = useState("");
  const [payWorkingMode, setPayWorkingMode] = useState("");
  const [payMinSalary, setPayMinSalary] = useState("");
  const [payMaxSalary, setPayMaxSalary] = useState("");
  const [paySearch, setPaySearch] = useState("");

  // Payroll Generation States
  const [generationMonth, setGenerationMonth] = useState("2026-06");
  const [generating, setGenerating] = useState(false);
  const [generateStatus, setGenerateStatus] = useState(null);

  // Fetch dropdown metadata
  const fetchMetadata = async () => {
    try {
      const deptsRes = await axios.get("/api/employees/departments");
      setDepartments(deptsRes.data.departments || []);
      
      const leaveTypesRes = await axios.get("/api/leaves/types");
      setLeaveTypes(leaveTypesRes.data.leaveTypes || []);
    } catch (err) {
      console.error("Failed to load reporting filters metadata", err);
    }
  };

  // Fetch reports based on selected tab and filters
  const fetchReportData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === "employees") {
        const res = await axios.get("/api/reports/employees", {
          params: {
            department_id: empDept,
            designation: empDesignation
          }
        });
        setData(res.data.employees || []);
      } else if (activeTab === "leaves") {
        const res = await axios.get("/api/reports/leaves", {
          params: {
            status: leaveStatus,
            leave_type_id: leaveType,
            start_date: leaveStart,
            end_date: leaveEnd
          }
        });
        setData(res.data.leaves || []);
      } else if (activeTab === "assets") {
        const res = await axios.get("/api/reports/assets", {
          params: {
            asset_type: assetType,
            status: assetStatus,
            min_cost: assetMinCost,
            max_cost: assetMaxCost
          }
        });
        setData(res.data.assets || []);
      } else if (activeTab === "payroll") {
        const res = await axios.get("/api/payroll/reports", {
          params: {
            month: payMonth,
            city: payCity,
            department_id: payDept,
            working_mode: payWorkingMode,
            min_salary: payMinSalary,
            max_salary: payMaxSalary,
            search: paySearch
          }
        });
        setData(res.data.payroll || []);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to retrieve report statistics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [
    activeTab,
    empDept, empDesignation,
    leaveStatus, leaveType, leaveStart, leaveEnd,
    assetType, assetStatus, assetMinCost, assetMaxCost,
    payMonth, payCity, payDept, payWorkingMode, payMinSalary, payMaxSalary, paySearch
  ]);

  const handleResetFilters = () => {
    setEmpDept("");
    setEmpDesignation("");
    setLeaveStatus("");
    setLeaveType("");
    setLeaveStart("");
    setLeaveEnd("");
    setAssetType("");
    setAssetStatus("");
    setAssetMinCost("");
    setAssetMaxCost("");
    setPayMonth("2026-06");
    setPayCity("");
    setPayDept("");
    setPayWorkingMode("");
    setPayMinSalary("");
    setPayMaxSalary("");
    setPaySearch("");
  };

  const handleGeneratePayroll = async () => {
    if (!generationMonth) return;
    setGenerating(true);
    setGenerateStatus({ type: "info", message: "Calculating payroll components..." });
    try {
      await axios.post(`/api/payroll/generate/${generationMonth}`);
      setGenerateStatus({ type: "success", message: `Payroll generated successfully for ${generationMonth}.` });
      if (payMonth === generationMonth) {
        fetchReportData();
      }
    } catch (err) {
      setGenerateStatus({ type: "danger", message: err?.response?.data?.message || "Failed to generate payroll." });
    } finally {
      setGenerating(false);
      setTimeout(() => setGenerateStatus(null), 5000);
    }
  };

  const handleExportCSV = () => {
    if (!data || data.length === 0) return;

    let headers = [];
    let rows = [];

    if (activeTab === "employees") {
      headers = ["Name", "Email", "Phone", "Department", "Designation", "Salary", "Skills", "Join Date"];
      rows = data.map((emp) => [
        `"${(emp.name || "").replace(/"/g, '""')}"`,
        `"${(emp.email || "").replace(/"/g, '""')}"`,
        `"${(emp.phone || "").replace(/"/g, '""')}"`,
        `"${(emp.department_name || "Unassigned").replace(/"/g, '""')}"`,
        `"${(emp.designation || "").replace(/"/g, '""')}"`,
        emp.salary ? parseFloat(emp.salary) : 0,
        `"${(Array.isArray(emp.skills) ? emp.skills.join(", ") : "").replace(/"/g, '""')}"`,
        `"${(emp.created_at ? emp.created_at.split("T")[0] : "").replace(/"/g, '""')}"`
      ]);
    } else if (activeTab === "leaves") {
      headers = ["Employee Name", "Leave Type", "Start Date", "End Date", "Reason", "Status", "Manager Approver", "HR Approver", "Request Date"];
      rows = data.map((leave) => [
        `"${(leave.employee_name || "").replace(/"/g, '""')}"`,
        `"${(leave.leave_name || "").replace(/"/g, '""')}"`,
        `"${(leave.start_date ? leave.start_date.split("T")[0] : "").replace(/"/g, '""')}"`,
        `"${(leave.end_date ? leave.end_date.split("T")[0] : "").replace(/"/g, '""')}"`,
        `"${(leave.reason || "").replace(/"/g, '""')}"`,
        `"${(leave.status || "").replace(/"/g, '""')}"`,
        `"${(leave.manager_name || "Pending").replace(/"/g, '""')}"`,
        `"${(leave.hr_name || "Pending").replace(/"/g, '""')}"`,
        `"${(leave.created_at ? leave.created_at.split("T")[0] : "").replace(/"/g, '""')}"`
      ]);
    } else if (activeTab === "assets") {
      headers = ["Asset Code", "Asset Name", "Type", "Purchase Date", "Purchase Cost", "Status", "Current Owner"];
      rows = data.map((asset) => [
        `"${(asset.asset_code || "").replace(/"/g, '""')}"`,
        `"${(asset.asset_name || "").replace(/"/g, '""')}"`,
        `"${(asset.asset_type || "").replace(/"/g, '""')}"`,
        `"${(asset.purchase_date ? asset.purchase_date.split("T")[0] : "").replace(/"/g, '""')}"`,
        asset.purchase_cost ? parseFloat(asset.purchase_cost) : 0,
        `"${(asset.status || "").replace(/"/g, '""')}"`,
        `"${(asset.status === "Allocated" ? asset.current_owner : "— Available —").replace(/"/g, '""')}"`
      ]);
    } else if (activeTab === "payroll") {
      headers = ["Employee Name", "Email", "Department", "City", "Working Mode", "Month", "Present Days", "Absent Days", "Gross Salary", "TDS", "ESIC", "PF", "Total Deductions", "Net Salary"];
      rows = data.map((p) => [
        `"${(p.name || "").replace(/"/g, '""')}"`,
        `"${(p.email || "").replace(/"/g, '""')}"`,
        `"${(p.department_name || "Unassigned").replace(/"/g, '""')}"`,
        `"${(p.city || "").replace(/"/g, '""')}"`,
        `"${(p.working_mode || "").replace(/"/g, '""')}"`,
        `"${(p.month ? p.month.split("T")[0].substring(0, 7) : "").replace(/"/g, '""')}"`,
        p.present_days || 0,
        p.absent_days || 0,
        p.gross_salary ? parseFloat(p.gross_salary) : 0,
        p.tds ? parseFloat(p.tds) : 0,
        p.esic ? parseFloat(p.esic) : 0,
        p.pf ? parseFloat(p.pf) : 0,
        p.total_deductions ? parseFloat(p.total_deductions) : 0,
        p.net_salary ? parseFloat(p.net_salary) : 0
      ]);
    }

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${activeTab}_report_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    if (!data || data.length === 0) return;
    
    let tableHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">`;
    tableHtml += `<head><meta charset="utf-8"/><style>table { border-collapse: collapse; } th, td { border: 0.5pt solid #cccccc; padding: 5px; font-family: Segoe UI, sans-serif; font-size: 10pt; }</style></head><body>`;
    tableHtml += `<table border="1"><thead><tr style="background-color: #f3f4f6; font-weight: bold;">`;
    
    let headers = [];
    if (activeTab === "employees") headers = ["Name", "Email", "Phone", "Department", "Designation", "Salary", "Skills", "Join Date"];
    else if (activeTab === "leaves") headers = ["Employee Name", "Leave Type", "Start Date", "End Date", "Reason", "Status", "Request Date"];
    else if (activeTab === "assets") headers = ["Asset Code", "Asset Name", "Type", "Purchase Date", "Purchase Cost", "Status", "Current Owner"];
    else if (activeTab === "payroll") headers = ["Employee Name", "Email", "Department", "City", "Working Mode", "Month", "Present Days", "Absent Days", "Gross Salary", "TDS", "ESIC", "PF", "Total Deductions", "Net Salary"];

    headers.forEach(h => { tableHtml += `<th>${h}</th>`; });
    tableHtml += `</tr></thead><tbody>`;

    data.forEach(row => {
      tableHtml += `<tr>`;
      if (activeTab === "payroll") {
        tableHtml += `<td>${row.name || ""}</td>`;
        tableHtml += `<td>${row.email || ""}</td>`;
        tableHtml += `<td>${row.department_name || "Unassigned"}</td>`;
        tableHtml += `<td>${row.city || ""}</td>`;
        tableHtml += `<td>${row.working_mode || ""}</td>`;
        tableHtml += `<td>${row.month ? row.month.substring(0, 7) : ""}</td>`;
        tableHtml += `<td>${row.present_days || 0}</td>`;
        tableHtml += `<td>${row.absent_days || 0}</td>`;
        tableHtml += `<td>${row.gross_salary || 0}</td>`;
        tableHtml += `<td>${row.tds || 0}</td>`;
        tableHtml += `<td>${row.esic || 0}</td>`;
        tableHtml += `<td>${row.pf || 0}</td>`;
        tableHtml += `<td>${row.total_deductions || 0}</td>`;
        tableHtml += `<td>${row.net_salary || 0}</td>`;
      } else if (activeTab === "employees") {
        tableHtml += `<td>${row.name || ""}</td><td>${row.email || ""}</td><td>${row.phone || ""}</td><td>${row.department_name || ""}</td><td>${row.designation || ""}</td><td>${row.salary || ""}</td><td>${Array.isArray(row.skills) ? row.skills.join(", ") : ""}</td><td>${row.created_at || ""}</td>`;
      } else if (activeTab === "leaves") {
        tableHtml += `<td>${row.employee_name || ""}</td><td>${row.leave_name || ""}</td><td>${row.start_date || ""}</td><td>${row.end_date || ""}</td><td>${row.reason || ""}</td><td>${row.status || ""}</td><td>${row.created_at || ""}</td>`;
      } else if (activeTab === "assets") {
        tableHtml += `<td>${row.asset_code || ""}</td><td>${row.asset_name || ""}</td><td>${row.asset_type || ""}</td><td>${row.purchase_date || ""}</td><td>${row.purchase_cost || ""}</td><td>${row.status || ""}</td><td>${row.current_owner || ""}</td>`;
      }
      tableHtml += `</tr>`;
    });
    tableHtml += `</tbody></table></body></html>`;

    const blob = new Blob([tableHtml], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${activeTab}_sheet_${new Date().toISOString().split("T")[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    if (!data || data.length === 0) return;

    const printWindow = window.open("", "_blank");
    let printContent = `
      <html>
      <head>
        <title>PeopleSync EMS - Printable Report</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1e1b4b; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #8b5cf6; padding-bottom: 15px; margin-bottom: 20px; }
          .title h1 { margin: 0; font-size: 24px; color: #1e1b4b; }
          .title p { margin: 5px 0 0; color: #6366f1; font-size: 14px; }
          .meta-info { font-size: 11px; text-align: right; line-height: 1.5; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
          th, td { border: 1px solid #e5e7eb; padding: 8px 10px; text-align: left; }
          th { background-color: #f3f4f6; color: #1e1b4b; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9fafb; }
          .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 15px; }
          .total-row { font-weight: bold; background-color: #f3e8ff !important; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">
            <h1>PeopleSync EMS</h1>
            <p>${activeTab.toUpperCase()} Report Details</p>
          </div>
          <div class="meta-info">
            <strong>Exported On:</strong> ${new Date().toLocaleString()}<br>
            <strong>Role:</strong> ${user?.role || "Manager"}<br>
            <strong>Status:</strong> Classified
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
    `;

    let headers = [];
    if (activeTab === "employees") headers = ["Name", "Email", "Phone", "Department", "Designation", "Salary", "Join Date"];
    else if (activeTab === "leaves") headers = ["Employee Name", "Leave Type", "Start Date", "End Date", "Reason", "Status", "Request Date"];
    else if (activeTab === "assets") headers = ["Asset Code", "Asset Name", "Type", "Purchase Date", "Cost", "Status", "Owner"];
    else if (activeTab === "payroll") headers = ["Employee", "Department", "City", "Mode", "Month", "Present", "Absent", "Gross Sal", "TDS (10%)", "ESIC (1.75%)", "PF (12%)", "Deductions", "Net Salary"];

    headers.forEach(h => { printContent += `<th>${h}</th>`; });
    printContent += `</tr></thead><tbody>`;

    let grandTotalGross = 0;
    let grandTotalDeductions = 0;
    let grandTotalNet = 0;

    data.forEach(row => {
      printContent += `<tr>`;
      if (activeTab === "payroll") {
        const gross = parseFloat(row.gross_salary || 0);
        const tds = parseFloat(row.tds || 0);
        const esic = parseFloat(row.esic || 0);
        const pf = parseFloat(row.pf || 0);
        const ded = parseFloat(row.total_deductions || 0);
        const net = parseFloat(row.net_salary || 0);

        grandTotalGross += gross;
        grandTotalDeductions += ded;
        grandTotalNet += net;

        printContent += `
          <td><strong>${row.name || ""}</strong><br/><small>${row.email || ""}</small></td>
          <td>${row.department_name || "Unassigned"}</td>
          <td>${row.city || ""}</td>
          <td>${row.working_mode || ""}</td>
          <td>${row.month ? row.month.substring(0, 7) : ""}</td>
          <td>${row.present_days || 0}</td>
          <td>${row.absent_days || 0}</td>
          <td>$${gross.toFixed(2)}</td>
          <td>$${tds.toFixed(2)}</td>
          <td>$${esic.toFixed(2)}</td>
          <td>$${pf.toFixed(2)}</td>
          <td>$${ded.toFixed(2)}</td>
          <td><strong>$${net.toFixed(2)}</strong></td>
        `;
      } else if (activeTab === "employees") {
        printContent += `<td>${row.name || ""}</td><td>${row.email || ""}</td><td>${row.phone || "N/A"}</td><td>${row.department_name || "Unassigned"}</td><td>${row.designation || ""}</td><td>$${parseFloat(row.salary || 0).toLocaleString()}</td><td>${row.created_at ? row.created_at.split("T")[0] : ""}</td>`;
      } else if (activeTab === "leaves") {
        printContent += `<td>${row.employee_name || ""}</td><td>${row.leave_name || ""}</td><td>${row.start_date ? row.start_date.split("T")[0] : ""}</td><td>${row.end_date ? row.end_date.split("T")[0] : ""}</td><td>${row.reason || ""}</td><td>${row.status || ""}</td><td>${row.created_at ? row.created_at.split("T")[0] : ""}</td>`;
      } else if (activeTab === "assets") {
        printContent += `<td>${row.asset_code || ""}</td><td>${row.asset_name || ""}</td><td>${row.asset_type || ""}</td><td>${row.purchase_date ? row.purchase_date.split("T")[0] : ""}</td><td>$${parseFloat(row.purchase_cost || 0).toLocaleString()}</td><td>${row.status || ""}</td><td>${row.current_owner || "—"}</td>`;
      }
      printContent += `</tr>`;
    });

    if (activeTab === "payroll") {
      printContent += `
        <tr class="total-row">
          <td colspan="7" style="text-align: right;"><strong>Grand Total:</strong></td>
          <td>$${grandTotalGross.toFixed(2)}</td>
          <td colspan="3"></td>
          <td>$${grandTotalDeductions.toFixed(2)}</td>
          <td>$${grandTotalNet.toFixed(2)}</td>
        </tr>
      `;
    }

    printContent += `
          </tbody>
        </table>
        <div class="footer">
          PeopleSync EMS Corporate Headquarters • Internal Security Protected Report
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const getStatusChipClass = (status) => {
    if (!status) return "";
    const lower = status.toLowerCase();
    if (lower.includes("approved") || lower === "active" || lower === "available") return "success";
    if (lower.includes("reject") || lower === "scrapped") return "danger";
    if (lower.includes("pending") || lower === "under repair") return "warning";
    return "";
  };

  return (
    <div className="table-card" style={{ padding: "24px" }}>
      
      {/* Title */}
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ margin: 0 }}>Reporting Module</h2>
        <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "0.85rem" }}>
          Analyze company operational metrics across directories, logs, and catalogs.
        </p>
      </div>

      {/* Tabs Row */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "24px", borderBottom: "1px solid var(--border)", paddingBottom: "10px", flexWrap: "wrap" }}>
        <button 
          className={`auth-tab ${activeTab === "employees" ? "active" : ""}`}
          onClick={() => { setActiveTab("employees"); setData([]); }}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "transparent", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "0.9rem" }}
        >
          <FiUsers /> Employee Reports
        </button>
        <button 
          className={`auth-tab ${activeTab === "leaves" ? "active" : ""}`}
          onClick={() => { setActiveTab("leaves"); setData([]); }}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "transparent", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "0.9rem" }}
        >
          <FiCalendar /> Leave Reports
        </button>
        {(user?.role || "").toLowerCase() !== "hr" && (
          <button 
            className={`auth-tab ${activeTab === "assets" ? "active" : ""}`}
            onClick={() => { setActiveTab("assets"); setData([]); }}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "transparent", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "0.9rem" }}
          >
            <FiHardDrive /> Asset Reports
          </button>
        )}
        <button 
          className={`auth-tab ${activeTab === "payroll" ? "active" : ""}`}
          onClick={() => { setActiveTab("payroll"); setData([]); }}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "transparent", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "0.9rem" }}
        >
          <FiDollarSign /> Payroll & Salary Sheets
        </button>
      </div>

      {/* Payroll Calculations / Actions Panel */}
      {activeTab === "payroll" && (user?.role || "").toLowerCase() !== "employee" && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "6px", padding: "16px", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", fontWeight: "600", fontSize: "0.85rem" }}>
            <FiSettings style={{ color: "var(--accent)" }} /> Payroll Computation Panel
          </div>
          
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div className="field-group" style={{ minWidth: "150px" }}>
              <label style={{ fontSize: "0.75rem" }}>Target Generation Month</label>
              <input 
                type="month" 
                className="input-field"
                value={generationMonth} 
                onChange={(e) => setGenerationMonth(e.target.value)} 
              />
            </div>
            
            <button 
              className="btn" 
              onClick={handleGeneratePayroll}
              disabled={generating}
              style={{ height: "36px", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <FiActivity /> {generating ? "Generating..." : "Generate/Recalculate Payroll"}
            </button>
          </div>

          {generateStatus && (
            <div className={`status-message ${generateStatus.type}`} style={{ marginTop: "12px", marginBottom: 0 }}>
              {generateStatus.message}
            </div>
          )}
        </div>
      )}

      {/* Filter Panels */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "6px", padding: "16px", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", fontWeight: "600", fontSize: "0.85rem" }}>
          <FiFilter style={{ color: "var(--accent)" }} /> Filter Records
        </div>

        {/* 1. Employee filters */}
        {activeTab === "employees" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
            <div className="field-group">
              <label style={{ fontSize: "0.75rem" }}>Department</label>
              <select className="select-field" value={empDept} onChange={(e) => setEmpDept(e.target.value)}>
                <option value="">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.department_name}</option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label style={{ fontSize: "0.75rem" }}>Designation</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g. Developer"
                value={empDesignation} 
                onChange={(e) => setEmpDesignation(e.target.value)} 
              />
            </div>
          </div>
        )}

        {/* 2. Leave filters */}
        {activeTab === "leaves" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
            <div className="field-group">
              <label style={{ fontSize: "0.75rem" }}>Approval Status</label>
              <select className="select-field" value={leaveStatus} onChange={(e) => setLeaveStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="Pending Manager Approval">Pending Manager Approval</option>
                <option value="Pending HR Approval">Pending HR Approval</option>
                <option value="Approved">Approved</option>
                <option value="Rejected by Manager">Rejected by Manager</option>
                <option value="Rejected by HR">Rejected by HR</option>
              </select>
            </div>
            <div className="field-group">
              <label style={{ fontSize: "0.75rem" }}>Leave Category</label>
              <select className="select-field" value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
                <option value="">All Leave Types</option>
                {leaveTypes.map(lt => (
                  <option key={lt.id} value={lt.id}>{lt.leave_name}</option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label style={{ fontSize: "0.75rem" }}>From Date</label>
              <input 
                type="date" 
                className="input-field" 
                value={leaveStart} 
                onChange={(e) => setLeaveStart(e.target.value)} 
              />
            </div>
            <div className="field-group">
              <label style={{ fontSize: "0.75rem" }}>To Date</label>
              <input 
                type="date" 
                className="input-field" 
                value={leaveEnd} 
                onChange={(e) => setLeaveEnd(e.target.value)} 
              />
            </div>
          </div>
        )}

        {/* 3. Asset filters */}
        {activeTab === "assets" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
            <div className="field-group">
              <label style={{ fontSize: "0.75rem" }}>Asset Category</label>
              <select className="select-field" value={assetType} onChange={(e) => setAssetType(e.target.value)}>
                <option value="">All Types</option>
                <option value="Laptop">Laptop</option>
                <option value="Mouse">Mouse</option>
                <option value="Monitor">Monitor</option>
                <option value="ID Card">ID Card</option>
                <option value="Access Card">Access Card</option>
                <option value="Software Licenses">Software Licenses</option>
              </select>
            </div>
            <div className="field-group">
              <label style={{ fontSize: "0.75rem" }}>Status</label>
              <select className="select-field" value={assetStatus} onChange={(e) => setAssetStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="Available">Available</option>
                <option value="Allocated">Allocated</option>
                <option value="Under Repair">Under Repair</option>
                <option value="Scrapped">Scrapped</option>
              </select>
            </div>
            <div className="field-group">
              <label style={{ fontSize: "0.75rem" }}>Min Cost</label>
              <input 
                type="number" 
                className="input-field" 
                placeholder="e.g. 50"
                value={assetMinCost} 
                onChange={(e) => setAssetMinCost(e.target.value)} 
              />
            </div>
            <div className="field-group">
              <label style={{ fontSize: "0.75rem" }}>Max Cost</label>
              <input 
                type="number" 
                className="input-field" 
                placeholder="e.g. 2000"
                value={assetMaxCost} 
                onChange={(e) => setAssetMaxCost(e.target.value)} 
              />
            </div>
          </div>
        )}

        {/* 4. Payroll filters */}
        {activeTab === "payroll" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            
            {/* Search and Month Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
              <div className="field-group">
                <label style={{ fontSize: "0.75rem" }}>Search Employee</label>
                <div style={{ position: "relative" }}>
                  <FiSearch style={{ position: "absolute", left: "10px", top: "10px", color: "var(--muted)" }} />
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="Search by name or email..."
                    value={paySearch} 
                    onChange={(e) => setPaySearch(e.target.value)} 
                    style={{ paddingLeft: "32px" }}
                  />
                </div>
              </div>
              <div className="field-group">
                <label style={{ fontSize: "0.75rem" }}>Selected Payroll Month</label>
                <input 
                  type="month" 
                  className="input-field" 
                  value={payMonth} 
                  onChange={(e) => setPayMonth(e.target.value)} 
                />
              </div>
            </div>

            {/* City, Department, Mode, and Salary Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
              <div className="field-group">
                <label style={{ fontSize: "0.75rem" }}>City</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. Indore"
                  value={payCity} 
                  onChange={(e) => setPayCity(e.target.value)} 
                />
              </div>
              <div className="field-group">
                <label style={{ fontSize: "0.75rem" }}>Domain (Department)</label>
                <select className="select-field" value={payDept} onChange={(e) => setPayDept(e.target.value)}>
                  <option value="">All Departments</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.department_name}</option>
                  ))}
                </select>
              </div>
              <div className="field-group">
                <label style={{ fontSize: "0.75rem" }}>Working Mode</label>
                <select className="select-field" value={payWorkingMode} onChange={(e) => setPayWorkingMode(e.target.value)}>
                  <option value="">All Modes</option>
                  <option value="Onsite">Onsite</option>
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>
              <div className="field-group">
                <label style={{ fontSize: "0.75rem" }}>Min Gross Salary ($)</label>
                <input 
                  type="number" 
                  className="input-field" 
                  placeholder="Min"
                  value={payMinSalary} 
                  onChange={(e) => setPayMinSalary(e.target.value)} 
                />
              </div>
              <div className="field-group">
                <label style={{ fontSize: "0.75rem" }}>Max Gross Salary ($)</label>
                <input 
                  type="number" 
                  className="input-field" 
                  placeholder="Max"
                  value={payMaxSalary} 
                  onChange={(e) => setPayMaxSalary(e.target.value)} 
                />
              </div>
            </div>

          </div>
        )}

        {/* Action Buttons Row */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px", flexWrap: "wrap" }}>
          <button className="btn secondary" onClick={handleResetFilters} style={{ padding: "6px 14px", fontSize: "0.8rem", borderColor: "var(--border)" }}>
            Reset Filters
          </button>
          
          <div style={{ display: "flex", gap: "6px" }}>
            <button className="btn secondary" onClick={handleExportCSV} style={{ padding: "6px 14px", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <FiDownload size={13} /> Export CSV
            </button>
            {activeTab !== "payroll" && (
              <button className="btn secondary" onClick={handleExportExcel} style={{ padding: "6px 14px", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <FiDownload size={13} /> Export Excel
              </button>
            )}
            <button className="btn" onClick={handleExportPDF} style={{ padding: "6px 14px", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "6px" }}>
              📥 PDF Printable
            </button>
          </div>
        </div>
      </div>

      {/* Grid Content */}
      {loading ? (
        <p style={{ color: "var(--muted)", padding: "20px" }}>Compiling reports data…</p>
      ) : error ? (
        <div className="status-message error">{error}</div>
      ) : data.length === 0 ? (
        <div className="empty-state">
          <div className="empty-illustration">📊</div>
          <h3>No records found</h3>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "4px" }}>
            No records matched the selected query parameters. Try widening your filters.
          </p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          
          {/* Employee table */}
          {activeTab === "employees" && (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Salary</th>
                  <th>Skills Capability</th>
                  <th>Join Date</th>
                </tr>
              </thead>
              <tbody>
                {data.map((emp) => (
                  <tr key={emp.id}>
                    <td><strong>{emp.name}</strong></td>
                    <td>{emp.email}</td>
                    <td>{emp.phone || "N/A"}</td>
                    <td>{emp.department_name || "Unassigned"}</td>
                    <td>{emp.designation}</td>
                    <td>{emp.salary ? `$${parseFloat(emp.salary).toLocaleString()}` : "N/A"}</td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {Array.isArray(emp.skills) && emp.skills.length > 0 ? (
                          emp.skills.map((skill, i) => (
                             <span key={i} className="chip" style={{ fontSize: "0.7rem", padding: "1px 6px" }}>{skill}</span>
                          ))
                        ) : (
                          <span style={{ fontStyle: "italic", fontSize: "0.8rem", color: "var(--muted)" }}>None</span>
                        )}
                      </div>
                    </td>
                    <td>{emp.created_at ? emp.created_at.split("T")[0] : "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Leave table */}
          {activeTab === "leaves" && (
            <table>
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Leave Type</th>
                  <th>Period</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Manager Action</th>
                  <th>HR Action</th>
                  <th>Request Date</th>
                </tr>
              </thead>
              <tbody>
                {data.map((leave) => (
                  <tr key={leave.id}>
                    <td><strong>{leave.employee_name}</strong></td>
                    <td>{leave.leave_name}</td>
                    <td>
                      <div style={{ fontSize: "0.8rem" }}>
                        {leave.start_date ? leave.start_date.split("T")[0] : ""} to {leave.end_date ? leave.end_date.split("T")[0] : ""}
                      </div>
                    </td>
                    <td>{leave.reason || "N/A"}</td>
                    <td>
                      <span className={`chip ${getStatusChipClass(leave.status)}`}>
                        {leave.status}
                      </span>
                    </td>
                    <td>{leave.manager_name || <span style={{ fontStyle: "italic", color: "var(--muted)" }}>Pending</span>}</td>
                    <td>{leave.hr_name || <span style={{ fontStyle: "italic", color: "var(--muted)" }}>Pending</span>}</td>
                    <td>{leave.created_at ? leave.created_at.split("T")[0] : "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Asset table */}
          {activeTab === "assets" && (
            <table>
              <thead>
                <tr>
                  <th>Asset Code</th>
                  <th>Asset Name</th>
                  <th>Type</th>
                  <th>Purchase Date</th>
                  <th>Purchase Cost</th>
                  <th>Status</th>
                  <th>Current Owner</th>
                </tr>
              </thead>
              <tbody>
                {data.map((asset) => (
                  <tr key={asset.id}>
                    <td>
                      <span style={{ fontFamily: "monospace", fontWeight: "700", background: "var(--surface-alt)", padding: "4px 8px", borderRadius: "4px", border: "1px solid var(--border)" }}>
                        {asset.asset_code}
                      </span>
                    </td>
                    <td><strong>{asset.asset_name}</strong></td>
                    <td>{asset.asset_type}</td>
                    <td>{asset.purchase_date ? asset.purchase_date.split("T")[0] : "N/A"}</td>
                    <td>{asset.purchase_cost ? `$${parseFloat(asset.purchase_cost).toLocaleString()}` : "N/A"}</td>
                    <td>
                      <span className={`chip ${getStatusChipClass(asset.status)}`} style={asset.status === "Under Repair" ? { background: "rgba(245, 158, 11, 0.15)", color: "#d97706" } : {}}>
                        {asset.status}
                      </span>
                    </td>
                    <td>
                      {asset.status === "Allocated" ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <FiUser style={{ color: "var(--accent)" }} size={13} />
                          {asset.current_owner}
                        </div>
                      ) : (
                        <span style={{ color: "var(--muted)", fontStyle: "italic", fontSize: "0.8rem" }}>— Available —</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Payroll Salary Sheet table */}
          {activeTab === "payroll" && (
            <table>
              <thead>
                <tr style={{ background: "var(--surface-alt)" }}>
                  <th>Employee Name</th>
                  <th>Domain (Dept)</th>
                  <th>City</th>
                  <th>Working Mode</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Gross Salary</th>
                  <th>TDS (10%)</th>
                  <th>ESIC (1.75%)</th>
                  <th>PF (12%)</th>
                  <th>Total Deductions</th>
                  <th>Net Salary</th>
                </tr>
              </thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div>
                        <strong>{p.name}</strong>
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{p.email}</div>
                    </td>
                    <td>{p.department_name || "Unassigned"}</td>
                    <td>{p.city || "—"}</td>
                    <td>
                      <span className="chip" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                        {p.working_mode || "—"}
                      </span>
                    </td>
                    <td>
                      <strong>{p.present_days || 0} days</strong>
                    </td>
                    <td style={{ color: (p.absent_days || 0) > 0 ? "var(--danger)" : "inherit" }}>
                      {p.absent_days || 0} days
                    </td>
                    <td>${parseFloat(p.gross_salary || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td>${parseFloat(p.tds || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td>${parseFloat(p.esic || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td>${parseFloat(p.pf || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td style={{ color: "var(--danger)", fontWeight: "600" }}>
                      -${parseFloat(p.total_deductions || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </td>
                    <td>
                      <strong style={{ color: "var(--success)", fontSize: "0.9rem" }}>
                        ${parseFloat(p.net_salary || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

        </div>
      )}

    </div>
  );
}
