import React, { useEffect, useState } from "react";
import axios from "axios";
import { FiPlus, FiEdit, FiTrash, FiCheck, FiX } from "react-icons/fi";

export default function SkillsMaster({ user, onRefresh }) {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [status, setStatus] = useState(null);

  const fetchSkills = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/employees/skills");
      setSkills(res.data.skills || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load skills.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setStatus({ loading: true });
    try {
      await axios.post("/api/employees/skills", { skill_name: newName });
      setNewName("");
      setStatus({ ok: true, message: "Skill added." });
      fetchSkills();
      onRefresh?.();
      setTimeout(() => setStatus(null), 2000);
    } catch (err) {
      setStatus({ ok: false, message: err?.response?.data?.message || "Failed to add." });
    }
  };

  const handleRename = async (id) => {
    if (!editName.trim()) return;
    try {
      await axios.put(`/api/employees/skills/${id}`, { skill_name: editName });
      setEditId(null);
      setEditName("");
      fetchSkills();
      onRefresh?.();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to rename.");
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete skill "${name}"? This skill association will be removed from all employees.`)) return;
    try {
      await axios.delete(`/api/employees/skills/${id}`);
      fetchSkills();
      onRefresh?.();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to delete.");
    }
  };

  return (
    <div className="table-card">
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ margin: 0 }}>Skills Master</h2>
        <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "0.85rem" }}>
          Create, edit, and manage skills in the database.
        </p>
      </div>

      {/* Add Skill Form */}
      {(user?.role || "").toLowerCase() !== "employee" && (
        <form onSubmit={handleAdd} style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
        <input
          type="text"
          className="input-field"
          placeholder="New Skill Name (e.g. Docker, Python, AWS)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          required
          style={{ flex: 1 }}
        />
        <button className="btn" type="submit">
          <FiPlus /> Add
        </button>
        </form>
      )}

      {status && (
        <div className={`status-message ${status.ok ? "success" : "error"}`} style={{ marginBottom: "16px" }}>
          {status.message}
        </div>
      )}

      {loading ? (
        <p style={{ color: "var(--muted)" }}>Loading skills list…</p>
      ) : error ? (
        <div className="status-message error">{error}</div>
      ) : skills.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>No skills configured. Add one above.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Skill Name</th>
                <th style={{ width: "160px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {skills.map((skill) => (
                <tr key={skill.id}>
                  <td>{skill.id}</td>
                  <td>
                    {editId === skill.id ? (
                      <input
                        className="input-field"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        required
                        style={{ padding: "6px 12px" }}
                      />
                    ) : (
                      <span className="chip">{skill.skill_name}</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {editId === skill.id ? (
                      <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                        <button
                          className="action-btn edit"
                          onClick={() => handleRename(skill.id)}
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
                      ((user?.role || "").toLowerCase() !== "employee" ? (
                        <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                          <button
                            className="action-btn edit"
                            onClick={() => {
                              setEditId(skill.id);
                              setEditName(skill.skill_name);
                            }}
                            title="Rename Skill"
                          >
                            <FiEdit size={16} />
                          </button>
                          <button
                            className="action-btn delete"
                            onClick={() => handleDelete(skill.id, skill.skill_name)}
                            title="Delete Skill"
                          >
                            <FiTrash size={16} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>View only</div>
                      ))
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
