import { useEffect, useState, useRef } from "react";
import axios from "axios";

const apiBase = process.env.REACT_APP_API_URL || "http://localhost:5001";

export default function EmployeeList() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [, setActionStatus] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [filter, setFilter] = useState("");
  const searchRef = useRef(null);

  const performDelete = async (profile) => {
    setActionStatus({ loading: true, id: profile.id });
    const prev = profiles;
    setProfiles((cur) => cur.filter((p) => p.id !== profile.id));
    try {
      await axios.delete(`${apiBase}/api/employees/profiles/${profile.id}`, { withCredentials: true });
      setActionStatus({ ok: true, message: "Deleted" });
    } catch (err) {
      setProfiles(prev);
      setActionStatus({ ok: false, message: err?.response?.data?.message || err.message });
    } finally {
      setConfirmTarget(null);
      setTimeout(() => setActionStatus(null), 1800);
    }
  };

  useEffect(() => {
    const loadProfiles = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${apiBase}/api/employees/profiles`, { withCredentials: true });
        setProfiles(response.data.profiles || []);
      } catch (err) {
        // If authenticated endpoint fails (likely 401 during dev), try public dev endpoint
        const fallbackMsg = err?.response?.data?.message || err.message || "Unable to load profiles.";
        try {
          const publicRes = await axios.get(`${apiBase}/api/employees/profiles-public`);
          setProfiles(publicRes.data.profiles || []);
          setError(null);
        } catch (publicErr) {
          setError(fallbackMsg);
        }
      } finally {
        setLoading(false);
      }
    };

    loadProfiles();

    const onFocus = (e) => {
      const name = e?.detail?.name || "";
      if (name) {
        setFilter(name);
      }
      setTimeout(() => searchRef.current?.focus(), 50);
    };
    window.addEventListener("focusEmployeeSearch", onFocus);
    return () => window.removeEventListener("focusEmployeeSearch", onFocus);
  }, []);

  if (loading) {
    return <div className="page-card">Loading employee list…</div>;
  }

  if (error) {
    return <div className="status-message error">{error}</div>;
  }

  if (profiles.length === 0) {
    return <div className="status-message" style={{ marginTop: 16 }}>No employee profiles found. Create one to get started.</div>;
  }

  return (
    <div className="table-card">
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0 }}>Employee Directory</h2>
          <p style={{ margin: "8px 0 0", color: "var(--muted)" }}>
            Browse employee profiles and review department, skills, salary, and more.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            ref={searchRef}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search by name, email, department or skill"
            className="input-field"
            style={{ width: 300 }}
          />
          {filter && (
            <button className="btn secondary" onClick={() => setFilter("")}>Clear</button>
          )}
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Designation</th>
              <th>Skills</th>
              <th>Salary</th>
              <th>Contact</th>
              <th>Created</th>
              <th>Images</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {profiles
              .filter((p) => {
                if (!filter) return true;
                const q = filter.toLowerCase();
                return (
                  String(p.user_name || "").toLowerCase().includes(q) ||
                  String(p.user_email || "").toLowerCase().includes(q) ||
                  String(p.department_name || "").toLowerCase().includes(q) ||
                  String(p.designation || "").toLowerCase().includes(q) ||
                  (p.skills || []).some((s) => String(s.skill_name || "").toLowerCase().includes(q))
                );
              })
              .map((profile) => (
              <tr key={profile.id} className="row-animate">
                <td>
                  <div style={{ display: "grid", gap: 4 }}>
                    <strong>{profile.user_name}</strong>
                    <span style={{ color: "var(--muted)", fontSize: "0.95rem" }}>{profile.user_email}</span>
                  </div>
                </td>
                <td>{profile.department_name || "N/A"}</td>
                <td>{profile.designation || "N/A"}</td>
                <td>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {profile.skills.length > 0 ? (
                      profile.skills.map((skill) => (
                        <span key={skill.id} className="chip">{skill.skill_name}</span>
                      ))
                    ) : (
                      <span className="chip">No skills</span>
                    )}
                  </div>
                </td>
                <td>{profile.salary != null ? `$${profile.salary}` : "N/A"}</td>
                <td>
                  <div style={{ display: "grid", gap: 4 }}>
                    <span>{profile.phone || "—"}</span>
                    <span style={{ color: "var(--muted)", fontSize: "0.95rem" }}>{profile.address || "No address"}</span>
                  </div>
                </td>
                <td style={{ whiteSpace: "nowrap" }}>{profile.created_at ? new Date(profile.created_at).toLocaleDateString() : "-"}</td>
                <td>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {profile.images.length > 0 ? (
                      profile.images.map((image) => {
                        const src = String(image.image_url || "");
                        const url = src.startsWith("http") ? src : `${apiBase}${src}`;
                        return <img key={image.id} src={url} alt="Employee" className="image-preview" />;
                      })
                    ) : (
                      <span className="chip">No images</span>
                    )}
                  </div>
                </td>
                <td>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="action-btn view" onClick={() => setSelected(profile)}>View</button>
                    <button
                      className="action-btn delete"
                      onClick={() => setConfirmTarget(profile)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{selected.user_name}</h3>
            <p style={{ color: "var(--muted)", marginTop: 6 }}>{selected.user_email}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, marginTop: 12 }}>
              <div>
                {selected.images && selected.images.length > 0 ? (
                  selected.images.map((img) => (
                    <img key={img.id} src={`${apiBase}${img.image_url}`} alt="profile" style={{ width: 96, height: 96, borderRadius: 12, objectFit: "cover", marginBottom: 8 }} />
                  ))
                ) : (
                  <div className="image-preview" style={{ width: 96, height: 96, display: "flex", alignItems: "center", justifyContent: "center" }}>No image</div>
                )}
              </div>
              <div>
                <p><strong>Department:</strong> {selected.department_name || "-"}</p>
                <p><strong>Designation:</strong> {selected.designation || "-"}</p>
                <p><strong>Phone:</strong> {selected.phone || "-"}</p>
                <p><strong>Salary:</strong> {selected.salary != null ? `$${selected.salary}` : "-"}</p>
                <p style={{ marginTop: 8 }}><strong>Skills:</strong></p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  {selected.skills && selected.skills.length > 0 ? (
                    selected.skills.map((s) => <span key={s.id} className="chip">{s.skill_name}</span>)
                  ) : (
                    <span className="chip">No skills</span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button className="btn secondary" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {confirmTarget && (
        <div className="modal-overlay" onClick={() => setConfirmTarget(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Confirm delete</h3>
            <p style={{ color: "var(--muted)", marginTop: 6 }}>Are you sure you want to delete <strong>{confirmTarget.user_name}</strong>?</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button className="btn secondary" onClick={() => setConfirmTarget(null)}>Cancel</button>
              <button className="btn" onClick={() => performDelete(confirmTarget)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
