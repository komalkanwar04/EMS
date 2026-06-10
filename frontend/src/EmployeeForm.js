import { useEffect, useState } from "react";
import axios from "axios";
import { FiSave, FiXCircle, FiPaperclip, FiImage, FiFileText } from "react-icons/fi";

export default function EmployeeForm({ employee = null, onCreated, onCancel, user }) {
  const isEditMode = !!employee;
  const [departments, setDepartments] = useState([]);
  const [skills, setSkills] = useState([]);
  const [status, setStatus] = useState(null);

  // Form inputs state
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    departmentId: "",
    phone: "",
    address: "",
    designation: "",
    salary: "",
    skillIds: [],
  });

  // Specialized file upload states
  const [profileImage, setProfileImage] = useState(null);
  const [resume, setResume] = useState(null);
  const [documents, setDocuments] = useState([]);

  // Existing files & deletion states (for Edit Mode)
  const [existingImages, setExistingImages] = useState([]);
  const [deleteImageIds, setDeleteImageIds] = useState([]);

  // Populate data on load
  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        const [deptRes, skillsRes] = await Promise.all([
          axios.get("/api/employees/departments"),
          axios.get("/api/employees/skills"),
        ]);
        setDepartments(deptRes.data.departments || []);
        setSkills(skillsRes.data.skills || []);
      } catch (error) {
        console.error("Failed to load options", error);
      }
    };
    loadDropdownData();

    if (employee) {
      setForm({
        name: employee.user_name || "",
        email: employee.user_email || "",
        password: "", // Leave blank in edit mode
        departmentId: employee.department_id || "",
        phone: employee.phone || "",
        address: employee.address || "",
        designation: employee.designation || "",
        salary: employee.salary || "",
        skillIds: employee.skills ? employee.skills.map((s) => s.id) : [],
      });
      setExistingImages(employee.images || []);
    } else {
      setForm({
        name: "",
        email: "",
        password: "",
        departmentId: "",
        phone: "",
        address: "",
        designation: "",
        salary: "",
        skillIds: [],
      });
      setExistingImages([]);
    }
    setDeleteImageIds([]);
  }, [employee]);

  if ((user?.role || "").toLowerCase() === "employee") {
    return (
      <div className="status-message" style={{ maxWidth: "600px", margin: "40px auto" }}>
        Access denied. Employees have view-only access and cannot create or edit employee records.
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "skillIds") {
      const id = Number(value);
      setForm((current) => {
        const skillIds = current.skillIds.includes(id)
          ? current.skillIds.filter((sid) => sid !== id)
          : [...current.skillIds, id];
        return { ...current, skillIds };
      });
      return;
    }
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleProfileImageChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setProfileImage(e.target.files[0]);
    }
  };

  const handleResumeChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setResume(e.target.files[0]);
    }
  };

  const handleDocumentsChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setDocuments(Array.from(e.target.files));
    }
  };

  // Flag existing file for deletion on submit
  const toggleDeleteExistingImage = (id) => {
    setDeleteImageIds((prev) =>
      prev.includes(id) ? prev.filter((dId) => dId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true });

    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("email", form.email);
      formData.append("designation", form.designation);
      formData.append("departmentId", form.departmentId);
      formData.append("phone", form.phone || "");
      formData.append("address", form.address || "");
      formData.append("salary", form.salary || "");
      formData.append("skillIds", JSON.stringify(form.skillIds));

      if (!isEditMode) {
        formData.append("password", form.password || "Welcome@123");
      }

      // Append specialized files
      if (profileImage) {
        formData.append("profileImage", profileImage);
      }
      if (resume) {
        formData.append("resume", resume);
      }
      if (documents.length > 0) {
        documents.forEach((file) => formData.append("documents", file));
      }

      // For edits, send flagged deletions
      if (isEditMode && deleteImageIds.length > 0) {
        formData.append("deleteImageIds", JSON.stringify(deleteImageIds));
      }

      if (isEditMode) {
        await axios.put(`/api/employees/profiles/${employee.id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setStatus({ ok: true, message: "Profile updated successfully." });
      } else {
        await axios.post("/api/employees/profiles", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setStatus({ ok: true, message: "Profile created successfully." });
      }

      setTimeout(() => {
        setStatus(null);
        onCreated?.();
      }, 1500);
    } catch (error) {
      console.error(error);
      const msg = error?.response?.data?.message || "Operation failed.";
      setStatus({ ok: false, message: msg });
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 style={{ margin: 0 }}>{isEditMode ? "Edit Employee Profile" : "Create Employee Profile"}</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "4px" }}>
            {isEditMode ? "Modify details and manage documents." : "Add a new employee record to the directory."}
          </p>
        </div>
        <button className="btn secondary" onClick={onCancel}>
          <FiXCircle /> Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Row 1: Basic Info */}
        <div className="form-row">
          <div className="field-group">
            <label htmlFor="emp-name">Employee Full Name</label>
            <input
              id="emp-name"
              className="input-field"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="e.g. Alice Johnson"
            />
          </div>
          <div className="field-group">
            <label htmlFor="emp-email">Email Address</label>
            <input
              id="emp-email"
              className="input-field"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="e.g. alice@company.com"
            />
          </div>
        </div>

        {/* Row 1b: Password (Only in create mode) */}
        {!isEditMode && (
          <div className="field-group">
            <label htmlFor="emp-password">Temporary Account Password</label>
            <input
              id="emp-password"
              className="input-field"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Defaults to Welcome@123 if blank"
            />
          </div>
        )}

        {/* Row 2: Department and Designation */}
        <div className="form-row">
          <div className="field-group">
            <label htmlFor="emp-dept">Department</label>
            <select
              id="emp-dept"
              className="select-field"
              name="departmentId"
              value={form.departmentId}
              onChange={handleChange}
              required
            >
              <option value="">Select department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.department_name}
                </option>
              ))}
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="emp-desig">Designation</label>
            <input
              id="emp-desig"
              className="input-field"
              name="designation"
              value={form.designation}
              onChange={handleChange}
              required
              placeholder="e.g. Backend Developer"
            />
          </div>
        </div>

        {/* Row 3: Salary and Phone */}
        <div className="form-row">
          <div className="field-group">
            <label htmlFor="emp-salary">Annual Salary ($)</label>
            <input
              id="emp-salary"
              className="input-field"
              name="salary"
              type="number"
              step="0.01"
              value={form.salary}
              onChange={handleChange}
              placeholder="e.g. 75000"
            />
          </div>
          <div className="field-group">
            <label htmlFor="emp-phone">Phone Number</label>
            <input
              id="emp-phone"
              className="input-field"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              placeholder="e.g. +1 (555) 019-2834"
            />
          </div>
        </div>

        {/* Text Area: Address */}
        <div className="field-group">
          <label htmlFor="emp-addr">Residential Address</label>
          <textarea
            id="emp-addr"
            className="textarea-field"
            name="address"
            rows={3}
            value={form.address}
            onChange={handleChange}
            placeholder="e.g. 102 California St, Suite 400..."
          />
        </div>

        {/* Image & File upload categories */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
          <div className="file-upload-container">
            <div className="file-upload-label">
              <FiImage /> Profile Image
            </div>
            <input type="file" accept="image/*" onChange={handleProfileImageChange} style={{ fontSize: "0.75rem", width: "100%" }} />
            {profileImage && <small style={{ color: "var(--success)" }}>Selected: {profileImage.name}</small>}
          </div>

          <div className="file-upload-container">
            <div className="file-upload-label">
              <FiFileText /> Resume File
            </div>
            <input type="file" accept=".pdf,.doc,.docx,image/*" onChange={handleResumeChange} style={{ fontSize: "0.75rem", width: "100%" }} />
            {resume && <small style={{ color: "var(--success)" }}>Selected: {resume.name}</small>}
          </div>

          <div className="file-upload-container">
            <div className="file-upload-label">
              <FiPaperclip /> Documents (Multi)
            </div>
            <input type="file" multiple accept="image/*,.pdf,.doc,.docx" onChange={handleDocumentsChange} style={{ fontSize: "0.75rem", width: "100%" }} />
            {documents.length > 0 && <small style={{ color: "var(--success)" }}>{documents.length} file(s) chosen</small>}
          </div>
        </div>

        {/* Existing Files Manage (only in Edit mode) */}
        {isEditMode && existingImages.length > 0 && (
          <div style={{ marginTop: "10px", padding: "14px", background: "var(--surface-alt)", borderRadius: "10px" }}>
            <h4 style={{ fontSize: "0.85rem", marginBottom: "8px" }}>Manage Attached Files</h4>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {existingImages.map((img) => {
                const isDeleted = deleteImageIds.includes(img.id);
                return (
                  <div
                    key={img.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "6px 12px",
                      borderRadius: "20px",
                      border: "1px solid var(--border)",
                      background: isDeleted ? "var(--danger-bg)" : "var(--surface-strong)",
                      fontSize: "0.75rem"
                    }}
                  >
                    <span>
                      [{img.file_type}] {img.file_name || "Attachment"}
                    </span>
                    <button
                      type="button"
                      style={{
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        color: isDeleted ? "var(--accent)" : "var(--danger)",
                        fontWeight: "bold"
                      }}
                      onClick={() => toggleDeleteExistingImage(img.id)}
                    >
                      {isDeleted ? "Undo Delete" : "Delete"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Skills Selection Grid */}
        <div className="field-group">
          <label>Skills / Capabilities Allocation</label>
          {skills.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>No skills found. Manage them in Skills Master.</p>
          ) : (
            <div className="checkbox-grid">
              {skills.map((skill) => (
                <label key={skill.id} className="checkbox-card">
                  <input
                    type="checkbox"
                    name="skillIds"
                    value={skill.id}
                    checked={form.skillIds.includes(skill.id)}
                    onChange={handleChange}
                  />
                  <span>{skill.skill_name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
          <button className="btn" type="submit" disabled={status?.loading} style={{ flex: 1 }}>
            <FiSave /> {isEditMode ? "Save Profile Changes" : "Create Employee Record"}
          </button>
          <button className="btn secondary" type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>

      {status?.loading && <div className="status-message" style={{ marginTop: "16px" }}>Processing request…</div>}
      {status?.ok === true && <div className="status-message success" style={{ marginTop: "16px" }}>{status.message}</div>}
      {status?.ok === false && <div className="status-message error" style={{ marginTop: "16px" }}>{status.message}</div>}
    </div>
  );
}
