import { useEffect, useState } from "react";
import axios from "axios";

const apiBase = process.env.REACT_APP_API_URL || "http://localhost:5001";

export default function EmployeeForm({ onCreated }) {
  const [departments, setDepartments] = useState([]);
  const [skills, setSkills] = useState([]);
  const [status, setStatus] = useState(null);
  const [form, setForm] = useState({
    departmentId: "",
    phone: "",
    address: "",
    designation: "",
    salary: "",
    skillIds: [],
  });
  const [images, setImages] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [departmentRes, skillsRes] = await Promise.all([
          axios.get(`${apiBase}/api/employees/departments`, { withCredentials: true }),
          axios.get(`${apiBase}/api/employees/skills`, { withCredentials: true }),
        ]);
        setDepartments(departmentRes.data.departments || []);
        setSkills(skillsRes.data.skills || []);
      } catch (error) {
        console.error(error);
      }
    };
    loadData();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === "skillIds") {
      const id = Number(value);
      setForm((current) => {
        const skillIds = current.skillIds.includes(id)
          ? current.skillIds.filter((skillId) => skillId !== id)
          : [...current.skillIds, id];
        return { ...current, skillIds };
      });
      return;
    }

    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    setImages(files);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ loading: true });

    try {
      const formData = new FormData();
      formData.append("departmentId", form.departmentId);
      formData.append("phone", form.phone);
      formData.append("address", form.address);
      formData.append("designation", form.designation);
      formData.append("salary", form.salary);
      formData.append("skillIds", JSON.stringify(form.skillIds));

      images.forEach((file) => formData.append("images", file));

      await axios.post(`${apiBase}/api/employees/profiles`, formData, {
        withCredentials: true,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setStatus({ ok: true, message: "Employee profile created successfully." });
      setForm({ departmentId: "", phone: "", address: "", designation: "", salary: "", skillIds: [] });
      setImages([]);
      onCreated?.();
    } catch (error) {
      const message = error?.response?.data?.message || error.message || "Unable to create profile.";
      setStatus({ ok: false, message });
    }
  };

  return (
    <div className="form-card">
      <h2>Create Employee Profile</h2>
      <p style={{ color: "var(--muted)", marginTop: 6 }}>
        Complete the fields below to add a new employee and assign departments, skills, and images.
      </p>
      <form onSubmit={handleSubmit} style={{ marginTop: 22, display: "grid", gap: 20 }}>
        <div className="field-group">
          <label>Department</label>
          <select className="select-field" name="departmentId" value={form.departmentId} onChange={handleChange} required>
            <option value="">Select department</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.department_name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <div className="field-group">
            <label>Designation</label>
            <input className="input-field" name="designation" value={form.designation} onChange={handleChange} required />
          </div>
          <div className="field-group">
            <label>Phone</label>
            <input className="input-field" name="phone" value={form.phone} onChange={handleChange} />
          </div>
        </div>

        <div className="field-group">
          <label>Address</label>
          <textarea className="textarea-field" name="address" value={form.address} onChange={handleChange} rows={4} />
        </div>

        <div className="form-row">
          <div className="field-group">
            <label>Salary</label>
            <input className="input-field" name="salary" type="number" step="0.01" value={form.salary} onChange={handleChange} />
          </div>
          <div className="field-group">
            <label>Upload Images</label>
            <input type="file" name="images" multiple accept="image/*" onChange={handleFileChange} />
            {images.length > 0 && <span style={{ marginTop: 8, color: "var(--muted)" }}>{images.length} file(s) selected</span>}
          </div>
        </div>

        <div className="field-group">
          <label>Skills</label>
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
                {skill.skill_name}
              </label>
            ))}
          </div>
        </div>

        <button className="btn" type="submit">Save Employee Profile</button>
      </form>

      {status?.loading && <div className="status-message" style={{ marginTop: 18 }}>Saving profile…</div>}
      {status?.ok === true && <div className="status-message success" style={{ marginTop: 18 }}>{status.message}</div>}
      {status?.ok === false && <div className="status-message error" style={{ marginTop: 18 }}>{status.message}</div>}
    </div>
  );
}
