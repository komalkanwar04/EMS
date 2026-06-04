import React, { useEffect, useState } from "react";
import axios from "axios";
import { FiPlus, FiEdit, FiTrash, FiCheck, FiX } from "react-icons/fi";

export default function DepartmentMaster({ onRefresh }) {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Forms states
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [status, setStatus] = useState(null);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/employees/departments");
      setDepartments(res.data.departments || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load departments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setStatus({ loading: true });
    try {
      await axios.post("/api/employees/departments", { department_name: newName });
      setNewName("");
      setStatus({ ok: true, message: "Department added." });
      fetchDepartments();
      onRefresh?.();
      setTimeout(() => setStatus(null), 2000);
    } catch (err) {
      setStatus({ ok: false, message: err?.response?.data?.message || "Failed to add." });
    }
  };

  const handleRename = async (id) => {
    if (!editName.trim()) return;
    try {
      await axios.put(`/api/employees/departments/${id}`, { department_name: editName });
      setEditId(null);
      setEditName("");
      fetchDepartments();
      onRefresh?.();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to rename.");
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete department "${name}"? Employees in this department will have their department reset.`)) return;
    try {
      await axios.delete(`/api/employees/departments/${id}`);
      fetchDepartments();
      onRefresh?.();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to delete.");
    }
  };

  return (
    <div className="table-card">
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ margin: 0 }}>Department Master</h2>
        <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "0.85rem" }}>
          Create, edit and manage company departments.
        </p>
      </div>

      {/* Add Department Form */}
      <form onSubmit={handleAdd} style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
        <input
          type="text"
          className="input-field"
          placeholder="New Department Name (e.g. Sales, Quality Assurance)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          required
          style={{ flex: 1 }}
        />
        <button className="btn" type="submit">
          <FiPlus /> Add
        </button>
      </form>

      {status && (
        <div className={`status-message ${status.ok ? "success" : "error"}`} style={{ marginBottom: "16px" }}>
          {status.message}
        </div>
      )}

      {loading ? (
        <p style={{ color: "var(--muted)" }}>Loading departments list…</p>
      ) : error ? (
        <div className="status-message error">{error}</div>
      ) : departments.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>No departments configured. Add one above.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Department Name</th>
                <th style={{ width: "160px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept) => (
                <tr key={dept.id}>
                  <td>{dept.id}</td>
                  <td>
                    {editId === dept.id ? (
                      <input
                        className="input-field"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        required
                        style={{ padding: "6px 12px" }}
                      />
                    ) : (
                      <strong>{dept.department_name}</strong>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {editId === dept.id ? (
                      <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                        <button
                          className="action-btn edit"
                          onClick={() => handleRename(dept.id)}
                          title="Save Changes"
                        >
                          <FiCheck size={16} />
                        </button>
                        <button
                          className="action-btn delete"
                          onClick={() => setEditId(null)}
                          title="Cancel"
                        >
                          <FiX size={16} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                        <button
                          className="action-btn edit"
                          onClick={() => {
                            setEditId(dept.id);
                            setEditName(dept.department_name);
                          }}
                          title="Rename Department"
                        >
                          <FiEdit size={16} />
                        </button>
                        <button
                          className="action-btn delete"
                          onClick={() => handleDelete(dept.id, dept.department_name)}
                          title="Delete Department"
                        >
                          <FiTrash size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
