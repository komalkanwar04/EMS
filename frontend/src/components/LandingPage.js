import React, { useEffect, useState } from "react";
import axios from "axios";
import { FiBriefcase, FiLayers, FiCalendar, FiCheckSquare, FiArrowRight, FiUser, FiMail, FiPhone } from "react-icons/fi";

export default function LandingPage({ onSignInClick, onSignUpClick }) {
  const [departments, setDepartments] = useState([]);
  const [applyForm, setApplyForm] = useState({
    name: "",
    email: "",
    phone: "",
    type: "Job", // Job or Internship
    departmentId: "",
    designation: ""
  });
  const [applyStatus, setApplyStatus] = useState(null);

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await axios.get("/api/employees/departments");
        setDepartments(res.data.departments || []);
      } catch (err) {
        setDepartments([
          { id: 1, department_name: "Software Development" },
          { id: 2, department_name: "Quality Assurance" },
          { id: 3, department_name: "Human Resources" },
          { id: 4, department_name: "Finance" },
          { id: 5, department_name: "Digital Marketing" },
          { id: 6, department_name: "Sales" },
          { id: 7, department_name: "Operations" },
          { id: 8, department_name: "Technical Support" }
        ]);
      }
    };
    fetchDepts();
  }, []);

  const handleChange = (e) => {
    setApplyForm({ ...applyForm, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApplyStatus({ loading: true });
    try {
      await axios.post("/api/recruitment/apply", applyForm);
      setApplyStatus({ ok: true, message: "Application submitted successfully! Our HR team will review your profile shortly." });
      setApplyForm({
        name: "",
        email: "",
        phone: "",
        type: "Job",
        departmentId: "",
        designation: ""
      });
      setTimeout(() => setApplyStatus(null), 5000);
    } catch (err) {
      setApplyStatus({ ok: false, message: err?.response?.data?.message || "Failed to submit application. Please try again." });
    }
  };

  return (
    <div className="landing-wrapper" style={{ height: "calc(100vh - 48px)", overflowY: "auto", padding: "50px 20px", position: "relative" }}>
      
      {/* Decorative Blobs */}
      <div className="floating-blob blob-1" />
      <div className="floating-blob blob-2" />

      <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "60px", position: "relative", zIndex: 1 }}>
        
        {/* HERO SECTION: Title & Floating 3D Graphic */}
        <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: "40px", alignItems: "center" }} className="landing-animate-fade">
          
          {/* Hero Content */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <span className="hero-badge" style={{ width: "fit-content" }}>PeopleSync Operations HQ</span>
            
            <h1 style={{ 
              fontSize: "3.2rem", 
              lineHeight: "1.15", 
              fontWeight: "800",
              background: "linear-gradient(135deg, var(--text) 30%, var(--accent) 100%)", 
              WebkitBackgroundClip: "text", 
              WebkitTextFillColor: "transparent" 
            }}>
              Unified Employee Directory & Talent Pipeline
            </h1>
            
            <p style={{ fontSize: "1.1rem", color: "var(--text)", opacity: 0.8, lineHeight: "1.6" }}>
              Streamlining operations for i-SOFTZONE Technologies. Manage employee structures, coordinate leave applications with real-time balance offsets, and onboard job and internship applicants with one-click automation.
            </p>
            
            <div style={{ display: "flex", gap: "14px", marginTop: "10px" }}>
              <button className="btn" onClick={onSignInClick} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 24px", fontWeight: "600" }}>
                Admin & Staff Sign In <FiArrowRight />
              </button>
              <button className="btn secondary" onClick={onSignUpClick} style={{ padding: "12px 24px", fontWeight: "600" }}>
                Create Workspace
              </button>
            </div>
          </div>

          {/* Hero 3D Graphic Illustration */}
          <div style={{ display: "flex", justifyContent: "center" }} className="landing-animate-float">
            <div style={{
              padding: "16px",
              background: "rgba(255, 255, 255, 0.35)",
              backdropFilter: "blur(8px)",
              borderRadius: "24px",
              border: "1px solid rgba(255, 255, 255, 0.4)",
              boxShadow: "0 20px 50px rgba(99, 102, 241, 0.08)",
              overflow: "hidden"
            }}>
              <img 
                src="/hero_graphic.png" 
                alt="EMS Dashboard Graphic Illustration" 
                style={{ 
                  maxWidth: "100%", 
                  height: "auto", 
                  borderRadius: "16px",
                  display: "block",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.03)"
                }} 
              />
            </div>
          </div>

        </div>

        {/* SECTION 2: Platform Highlights */}
        <div className="landing-animate-fade" style={{ animationDelay: "0.2s" }}>
          <h3 style={{ 
            fontSize: "1rem", 
            textTransform: "uppercase", 
            letterSpacing: "1.5px", 
            color: "var(--muted)", 
            textAlign: "center", 
            marginBottom: "32px",
            fontWeight: "700" 
          }}>
            Explore Core Capabilities
          </h3>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px" }}>
            
            <div className="stat-card landing-card-hover" style={{ padding: "24px", flexDirection: "column", alignItems: "flex-start", gap: "16px", background: "rgba(255, 255, 255, 0.45)", border: "1px solid var(--border)" }}>
              <div className="capability-icon" style={{ padding: "10px", borderRadius: "8px", background: "rgba(139, 92, 246, 0.1)", color: "var(--accent)" }}>
                <FiLayers size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "6px" }}>Structured Directories</h4>
                <p style={{ fontSize: "0.85rem", color: "var(--text)", opacity: 0.7, lineHeight: "1.5" }}>
                  Manage complete details including department masters, salary records, contact cards, and documents.
                </p>
              </div>
            </div>

            <div className="stat-card landing-card-hover" style={{ padding: "24px", flexDirection: "column", alignItems: "flex-start", gap: "16px", background: "rgba(255, 255, 255, 0.45)", border: "1px solid var(--border)" }}>
              <div className="capability-icon" style={{ padding: "10px", borderRadius: "8px", background: "rgba(139, 92, 246, 0.1)", color: "var(--accent)" }}>
                <FiCalendar size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "6px" }}>Smart Leaves Approval</h4>
                <p style={{ fontSize: "0.85rem", color: "var(--text)", opacity: 0.7, lineHeight: "1.5" }}>
                  Multi-stage request validation (Manager -> HR final) with automated balance offsets and full timeline tracking.
                </p>
              </div>
            </div>

            <div className="stat-card landing-card-hover" style={{ padding: "24px", flexDirection: "column", alignItems: "flex-start", gap: "16px", background: "rgba(255, 255, 255, 0.45)", border: "1px solid var(--border)" }}>
              <div className="capability-icon" style={{ padding: "10px", borderRadius: "8px", background: "rgba(139, 92, 246, 0.1)", color: "var(--accent)" }}>
                <FiCheckSquare size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "6px" }}>Capabilities Mappings</h4>
                <p style={{ fontSize: "0.85rem", color: "var(--text)", opacity: 0.7, lineHeight: "1.5" }}>
                  Create and manage capabilities profiles to track employee competencies and allocate resources.
                </p>
              </div>
            </div>

            <div className="stat-card landing-card-hover" style={{ padding: "24px", flexDirection: "column", alignItems: "flex-start", gap: "16px", background: "rgba(255, 255, 255, 0.45)", border: "1px solid var(--border)" }}>
              <div className="capability-icon" style={{ padding: "10px", borderRadius: "8px", background: "rgba(139, 92, 246, 0.1)", color: "var(--accent)" }}>
                <FiBriefcase size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "6px" }}>Talent Recruitment</h4>
                <p style={{ fontSize: "0.85rem", color: "var(--text)", opacity: 0.7, lineHeight: "1.5" }}>
                  Seamless intake workflows for Jobs and Internships. Review applications and hire directly.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* SECTION 3: Recruitment Intake Form */}
        <div className="landing-animate-fade" style={{ animationDelay: "0.4s", maxWidth: "700px", margin: "0 auto", width: "100%" }}>
          <div className="form-card" style={{ 
            padding: "36px", 
            background: "var(--surface-strong)", 
            border: "1px solid var(--border)", 
            boxShadow: "var(--shadow)",
            borderRadius: "20px"
          }}>
            <h3 style={{ fontSize: "1.4rem", marginBottom: "6px", textAlign: "center", fontWeight: "700" }}>Join i-SOFTZONE Technologies</h3>
            <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "26px", textAlign: "center" }}>
              Ready to grow with us? Apply for our Job openings or Internship programs across domains.
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              
              <div className="field-group">
                <label htmlFor="landing-name">Full Name</label>
                <div style={{ position: "relative" }}>
                  <FiUser style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                  <input
                    id="landing-name"
                    type="text"
                    className="input-field"
                    style={{ paddingLeft: "38px" }}
                    name="name"
                    value={applyForm.name}
                    onChange={handleChange}
                    required
                    placeholder="e.g. Ishita Patel"
                  />
                </div>
              </div>

              <div className="field-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div className="field-group">
                  <label htmlFor="landing-email">Email Address</label>
                  <div style={{ position: "relative" }}>
                    <FiMail style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                    <input
                      id="landing-email"
                      type="email"
                      className="input-field"
                      style={{ paddingLeft: "38px" }}
                      name="email"
                      value={applyForm.email}
                      onChange={handleChange}
                      required
                      placeholder="candidate@gmail.com"
                    />
                  </div>
                </div>

                <div className="field-group">
                  <label htmlFor="landing-phone">Phone Number</label>
                  <div style={{ position: "relative" }}>
                    <FiPhone style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                    <input
                      id="landing-phone"
                      type="text"
                      className="input-field"
                      style={{ paddingLeft: "38px" }}
                      name="phone"
                      value={applyForm.phone}
                      onChange={handleChange}
                      placeholder="e.g. 9893012345"
                    />
                  </div>
                </div>
              </div>

              <div className="field-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div className="field-group">
                  <label htmlFor="landing-type">Application Type</label>
                  <select
                    id="landing-type"
                    className="select-field"
                    name="type"
                    value={applyForm.type}
                    onChange={handleChange}
                    required
                  >
                    <option value="Job">Job Opening</option>
                    <option value="Internship">Internship Program</option>
                  </select>
                </div>

                <div className="field-group">
                  <label htmlFor="landing-domain">Domain / Department</label>
                  <select
                    id="landing-domain"
                    className="select-field"
                    name="departmentId"
                    value={applyForm.departmentId}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Domain</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.department_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field-group">
                <label htmlFor="landing-designation">Applied Role / Designation</label>
                <input
                  id="landing-designation"
                  type="text"
                  className="input-field"
                  name="designation"
                  value={applyForm.designation}
                  onChange={handleChange}
                  required
                  placeholder="e.g. React Developer"
                />
              </div>

              <button className="btn" type="submit" disabled={applyStatus?.loading} style={{ marginTop: "12px", width: "100%", padding: "12px 0" }}>
                {applyStatus?.loading ? "Submitting Application…" : "Submit Application"}
              </button>
            </form>

            {applyStatus && (
              <div className={`status-message ${applyStatus.ok ? "success" : "error"}`} style={{ marginTop: "18px" }}>
                {applyStatus.message}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
