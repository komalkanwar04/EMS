import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { FiSearch, FiEdit2, FiTrash2, FiEye, FiDownload, FiFileText } from "react-icons/fi";

const apiBase = process.env.REACT_APP_API_URL || "http://localhost:5001";

export default function EmployeeList({ onEdit, onRefresh }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [filter, setFilter] = useState("");
  const searchRef = useRef(null);

  const loadProfiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get("/api/employees/profiles");
      setProfiles(response.data.profiles || []);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Unable to load employee profiles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const performDelete = async (profile) => {
    try {
      await axios.delete(`/api/employees/profiles/${profile.id}`);
      setConfirmTarget(null);
      loadProfiles();
      onRefresh?.();
    } catch (err) {
      alert(err?.response?.data?.message || "Delete failed.");
    }
  };

  // Helper functions to get specific file types from images array
  const getProfileImage = (images) => {
    const found = images?.find((img) => img.file_type === "profile");
    if (!found) return null;
    return found.image_url.startsWith("http") ? found.image_url : `${apiBase}${found.image_url}`;
  };

  const getResumeFile = (images) => {
    return images?.find((img) => img.file_type === "resume");
  };

  const getAdditionalDocuments = (images) => {
    return images?.filter((img) => img.file_type === "document") || [];
  };

  if (loading) {
    return <div style={{ color: "var(--muted)", padding: "20px" }}>Loading employee list…</div>;
  }

  if (error) {
    return <div className="status-message error">{error}</div>;
  }

  if (profiles.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-illustration">👥</div>
        <h3>No Employees Registered</h3>
        <p style={{ color: "var(--muted)" }}>Click the Add Employee button to register your first record.</p>
      </div>
    );
  }

  // Filter logic
  const filteredProfiles = profiles.filter((p) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      String(p.user_name || "").toLowerCase().includes(q) ||
      String(p.user_email || "").toLowerCase().includes(q) ||
      String(p.department_name || "").toLowerCase().includes(q) ||
      String(p.designation || "").toLowerCase().includes(q) ||
      (p.skills || []).some((s) => String(s.skill_name || "").toLowerCase().includes(q))
    );
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
        <div className="search-wrap">
          <FiSearch />
          <input
            ref={searchRef}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search by name, email, department or skills..."
            aria-label="Filter list"
          />
          {filter && (
            <button
              className="action-btn delete"
              style={{ padding: "2px 6px" }}
              onClick={() => setFilter("")}
            >
              Clear
            </button>
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
              <th>Skills / Capabilities</th>
              <th>Salary</th>
              <th>Contact Details</th>
              <th>Attachments</th>
              <th style={{ width: "130px", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProfiles.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", color: "var(--muted)" }}>
                  No records match your search criteria.
                </td>
              </tr>
            ) : (
              filteredProfiles.map((profile) => {
                const resume = getResumeFile(profile.images);
                const docs = getAdditionalDocuments(profile.images);
                return (
                  <tr key={profile.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          className="image-preview"
                          style={{
                            background: "var(--accent-soft)",
                            color: "var(--accent)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "bold",
                          }}
                        >
                          {profile.user_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong style={{ display: "block" }}>{profile.user_name}</strong>
                          <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{profile.user_email}</span>
                        </div>
                      </div>
                    </td>
                    <td>{profile.department_name || <span style={{ color: "var(--muted)" }}>None</span>}</td>
                    <td>{profile.designation}</td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {profile.skills.length > 0 ? (
                          profile.skills.map((skill) => (
                            <span key={skill.id} className="chip">
                              {skill.skill_name}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>—</span>
                        )}
                      </div>
                    </td>
                    <td>{profile.salary != null ? `$${Number(profile.salary).toLocaleString()}` : "—"}</td>
                    <td>
                      <div style={{ fontSize: "0.8rem" }}>
                        <div>{profile.phone || "—"}</div>
                        <span style={{ color: "var(--muted)" }}>{profile.address || "No address"}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {resume && (
                          <span className="chip success" style={{ fontSize: "0.7rem", gap: "4px" }}>
                            <FiFileText size={10} /> CV
                          </span>
                        )}
                        {docs.length > 0 && (
                          <span className="chip" style={{ fontSize: "0.7rem" }}>
                            {docs.length} Doc(s)
                          </span>
                        )}
                        {!resume && docs.length === 0 && <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>—</span>}
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "4px", justifyContent: "flex-end" }}>
                        <button
                          className="action-btn view"
                          onClick={() => setSelected(profile)}
                          title="View Profile details"
                        >
                          <FiEye size={16} />
                        </button>
                        <button
                          className="action-btn edit"
                          onClick={() => onEdit(profile)}
                          title="Edit Profile"
                        >
                          <FiEdit2 size={15} />
                        </button>
                        <button
                          className="action-btn delete"
                          onClick={() => setConfirmTarget(profile)}
                          title="Delete Employee"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* DETAIL MODAL OVERLAY */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "680px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "1.3rem" }}>Employee Details</h3>
              <button
                className="action-btn delete"
                style={{ fontSize: "1.2rem", padding: "0 6px" }}
                onClick={() => setSelected(null)}
              >
                &times;
              </button>
            </div>

            <div className="employee-details-grid">
              <div style={{ textAlign: "center" }}>
                {getProfileImage(selected.images) ? (
                  <img
                    src={getProfileImage(selected.images)}
                    alt={selected.user_name}
                    className="avatar-large"
                  />
                ) : (
                  <div
                    className="avatar-large"
                    style={{
                      background: "var(--accent-soft)",
                      color: "var(--accent)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "3rem",
                      fontWeight: "bold"
                    }}
                  >
                    {selected.user_name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <span
                  className="chip"
                  style={{ marginTop: "12px", background: "var(--accent-soft)", color: "var(--accent)" }}
                >
                  {selected.designation}
                </span>
              </div>

              <div className="detail-info">
                <div className="detail-row">
                  <strong>Full Name</strong>
                  <span>{selected.user_name}</span>
                </div>
                <div className="detail-row">
                  <strong>Email</strong>
                  <span>{selected.user_email}</span>
                </div>
                <div className="detail-row">
                  <strong>Department</strong>
                  <span>{selected.department_name || "Unassigned"}</span>
                </div>
                <div className="detail-row">
                  <strong>Annual Salary</strong>
                  <span>{selected.salary != null ? `$${Number(selected.salary).toLocaleString()}` : "N/A"}</span>
                </div>
                <div className="detail-row">
                  <strong>Phone</strong>
                  <span>{selected.phone || "N/A"}</span>
                </div>
                <div className="detail-row">
                  <strong>Address</strong>
                  <span>{selected.address || "N/A"}</span>
                </div>
                
                {/* Skills Badges */}
                <div style={{ marginTop: "8px" }}>
                  <strong style={{ display: "block", fontSize: "0.85rem", color: "var(--muted)", marginBottom: "6px" }}>
                    Allocated Skills
                  </strong>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {selected.skills && selected.skills.length > 0 ? (
                      selected.skills.map((s) => (
                        <span key={s.id} className="chip">
                          {s.skill_name}
                        </span>
                      ))
                    ) : (
                      <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>No skills allocated.</span>
                    )}
                  </div>
                </div>

                {/* Resume Download */}
                {getResumeFile(selected.images) && (
                  <div style={{ marginTop: "14px" }}>
                    <a
                      href={getResumeFile(selected.images).image_url.startsWith("http") ? getResumeFile(selected.images).image_url : `${apiBase}${getResumeFile(selected.images).image_url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn secondary"
                      style={{ fontSize: "0.8rem", padding: "8px 14px", width: "100%", justifyContent: "center" }}
                    >
                      <FiDownload /> Download Resume ({getResumeFile(selected.images).file_name || "file"})
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Documents Grid */}
            {getAdditionalDocuments(selected.images).length > 0 && (
              <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
                <h4 style={{ fontSize: "0.9rem", marginBottom: "12px" }}>Other Documents</h4>
                <div className="documents-grid">
                  {getAdditionalDocuments(selected.images).map((doc) => {
                    const isImg = /\.(jpg|jpeg|png|webp|gif)$/i.test(doc.image_url);
                    const url = doc.image_url.startsWith("http") ? doc.image_url : `${apiBase}${doc.image_url}`;
                    return (
                      <a
                        key={doc.id}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="doc-card"
                        style={{ color: "inherit", textDecoration: "none" }}
                      >
                        {isImg ? (
                          <img src={url} alt={doc.file_name} className="doc-card-img" />
                        ) : (
                          <div
                            className="doc-card-img"
                            style={{
                              background: "var(--border)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}
                          >
                            <FiFileText size={20} style={{ color: "var(--muted)" }} />
                          </div>
                        )}
                        <span
                          style={{
                            display: "block",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            width: "90px"
                          }}
                        >
                          {doc.file_name || "Document"}
                        </span>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONFIRM DELETE DIALOG */}
      {confirmTarget && (
        <div className="modal-overlay" onClick={() => setConfirmTarget(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "400px" }}>
            <h3 style={{ fontSize: "1.2rem", marginBottom: "8px" }}>Remove Employee</h3>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "20px" }}>
              Are you sure you want to permanently delete <strong>{confirmTarget.user_name}</strong>? This action cannot
              be undone and all uploaded records will be deleted.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button className="btn secondary" onClick={() => setConfirmTarget(null)}>
                Cancel
              </button>
              <button className="btn danger" onClick={() => performDelete(confirmTarget)}>
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
