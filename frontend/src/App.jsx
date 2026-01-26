import { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

const API_URL = import.meta.env.DEV ? "http://localhost:8000/api" : "/api";

function App() {
  const [view, setView] = useState("home");
  const [selectedPatient, setSelectedPatient] = useState(null);

  const goHome = () => {
    setView("home");
    setSelectedPatient(null);
  };

  return (
    <div className="container">
      <header className="header">
        <h1 style={{ marginRight: "25px" }}>🏥 Leong Baby & Child Clinic</h1>
        {view !== "home" && (
          <button onClick={goHome} className="nav-btn">
            ← Back to Dashboard
          </button>
        )}
      </header>

      {view === "home" && (
        <Dashboard
          onNavigateCreate={() => setView("createPatient")}
          onSelectPatient={(patient) => {
            setSelectedPatient(patient);
            setView("patientDetails");
          }}
        />
      )}

      {view === "createPatient" && (
        <CreatePatientForm onSuccess={goHome} onCancel={goHome} />
      )}

      {view === "patientDetails" && selectedPatient && (
        <PatientDetailView patientId={selectedPatient.id} />
      )}
    </div>
  );
}

// --- SUB-COMPONENTS ---

function Dashboard({ onNavigateCreate, onSelectPatient }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Auto-search logic can be added here, but manual is fine for now
  const handleSearch = async (e) => {
    e.preventDefault(); // Prevent form submit refresh
    if (!searchTerm) return;

    setLoading(true);
    try {
      const res = await axios.get(
        `${API_URL}/patients/search/?name=${searchTerm}`,
      );
      setResults(res.data);
    } catch (err) {
      alert("Error searching patients");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="card">
        <h2>Find Patient</h2>
        <form onSubmit={handleSearch} className="input-group">
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Enter patient name or ID..."
            autoFocus
          />
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </button>
        </form>
      </div>

      <div className="card">
        <h3>Results</h3>
        {results.length === 0 ? (
          <p style={{ color: "#888", fontStyle: "italic" }}>
            No patients found or no search performed.
          </p>
        ) : (
          <ul className="list">
            {results.map((p) => (
              <li key={p.id} className="list-item">
                <div>
                  <div style={{ fontWeight: "bold", fontSize: "1.1rem" }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: "0.9rem", color: "#666" }}>
                    ID: {p.id} | DOB: {p.date_of_birth}
                  </div>
                </div>
                <button
                  className="btn-secondary"
                  onClick={() => onSelectPatient(p)}
                >
                  Open File
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button onClick={onNavigateCreate} className="fab">
        + New Patient
      </button>
    </div>
  );
}

function CreatePatientForm({ onSuccess, onCancel }) {
  // 1. Initialize ALL fields from your Pydantic Schema
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    date_of_birth: "",
    address: "",
    phone_number_primary: "",
    phone_number_secondary: "",
    father_name: "",
    father_occupation: "",
    mother_name: "",
    mother_occupation: "",
    para: "",
    languages: [],
    hospital: "",
    delivery: "",
    birth_weight_kg: "",
    birth_length_cm: "",
    birth_ofc_cm: "",
    g6pd: "",
    tsh_mlul: "",
    feeding: "Breast", // Default
    allergies: "",
    vaccination_summary: "",
    other_notes: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLanguageChange = (e) => {
    const { value, checked } = e.target;
    const currentLanguages = formData.languages || [];

    if (checked) {
      setFormData({ ...formData, languages: [...currentLanguages, value] });
    } else {
      setFormData({
        ...formData,
        languages: currentLanguages.filter((lang) => lang !== value),
      });
    }
  };

  const handleSubmit = async (e) => {
    // e.preventDefault();
    try {
      // 2. Data Cleaning: Convert strings to Numbers/Null for the API
      const payload = {
        ...formData,
        // Convert empty strings to null for optional text fields
        phone_number_secondary: formData.phone_number_secondary || null,

        // Convert numbers (handle empty string case to avoid NaN)
        birth_weight_kg: formData.birth_weight_kg
          ? parseFloat(formData.birth_weight_kg)
          : null,
        birth_length_cm: formData.birth_length_cm
          ? parseFloat(formData.birth_length_cm)
          : null,
        birth_ofc_cm: formData.birth_ofc_cm
          ? parseInt(formData.birth_ofc_cm)
          : null,
        tsh_mlul: formData.tsh_mlul ? parseInt(formData.tsh_mlul) : null,
      };

      await axios.post(`${API_URL}/patients/`, payload);
      alert("Patient Record Created Successfully");
      onSuccess();
    } catch (err) {
      console.error(err);
      alert("Error creating patient. Check console for details.");
    }
  };

  return (
    <div>
      {/* 3. SINGLE Form Element wrapping EVERYTHING */}
      <form>
        {/* --- Card 1: Basic Details --- */}
        <div className="card">
          <h2>Register New Patient</h2>
          <div style={{ marginTop: "15px" }}>
            <label>Patient ID</label>
            <input
              name="id"
              onChange={handleChange}
              value={formData.id}
              required
            />
          </div>
          <div style={{ marginTop: "15px" }}>
            <label>Full Name</label>
            <input
              name="name"
              onChange={handleChange}
              value={formData.name}
              required
            />
          </div>
          <div style={{ marginTop: "15px" }}>
            <label>Date of Birth</label>
            <input
              type="date"
              name="date_of_birth"
              onChange={handleChange}
              value={formData.date_of_birth}
              required
            />
          </div>
          <div className="form-grid" style={{ marginTop: "15px" }}>
            <div>
              <label>Phone Number 1</label>
              <input
                name="phone_number_primary"
                onChange={handleChange}
                value={formData.phone_number_primary}
                required
              />
            </div>
            <div>
              <label>Phone Number 2</label>
              <input
                name="phone_number_secondary"
                onChange={handleChange}
                value={formData.phone_number_secondary}
                placeholder="Optional"
              />
            </div>
          </div>
          <div style={{ marginTop: "15px" }}>
            <label>Address</label>
            <input
              name="address"
              onChange={handleChange}
              value={formData.address}
              required
            />
          </div>
        </div>

        {/* --- Card 2: Parent Details --- */}
        <div className="card">
          <h3>Parents Info</h3>
          <div className="form-grid">
            <div>
              <label>Father's Name</label>
              <input
                name="father_name"
                onChange={handleChange}
                value={formData.father_name}
                required
              />
            </div>
            <div>
              <label>Father's Occupation</label>
              <input
                name="father_occupation"
                onChange={handleChange}
                value={formData.father_occupation}
                required
              />
            </div>
          </div>
          <div className="form-grid" style={{ marginTop: "15px" }}>
            <div>
              <label>Mother's Name</label>
              <input
                name="mother_name"
                onChange={handleChange}
                value={formData.mother_name}
                required
              />
            </div>
            <div>
              <label>Mother's Occupation</label>
              <input
                name="mother_occupation"
                onChange={handleChange}
                value={formData.mother_occupation}
                required
              />
            </div>
          </div>
          <div style={{ marginTop: "15px" }}>
            <label>Para</label>
            <input
              name="para"
              onChange={handleChange}
              value={formData.para}
              placeholder="Optional"
            />
          </div>
        </div>

        {/* --- Card 3: Birth Details --- */}
        <div className="card">
          <h3>Birth Details</h3>
          <div
            className="form-grid"
            style={{ gridTemplateColumns: "0.7fr 1fr" }}
          >
            <div>
              <label>Hospital</label>
              <input
                name="hospital"
                onChange={handleChange}
                value={formData.hospital}
                placeholder="Optional"
              />
            </div>

            <div>
              <label style={{ marginBottom: "10px", display: "block" }}>
                Delivery Method
              </label>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                }}
              >
                {["SVD", "LSCS", "Forceps", "Vac", "Breech"].map((method) => (
                  <label
                    key={method}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="delivery"
                      value={method}
                      onChange={handleChange}
                      checked={formData.delivery === method}
                    />
                    {method}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div
            className="form-grid"
            style={{ gridTemplateColumns: "1fr 1fr 1fr", marginTop: "15px" }}
          >
            <div>
              <label>Birth Weight (kg)</label>
              <input
                type="number"
                step="0.01"
                name="birth_weight_kg"
                onChange={handleChange}
                value={formData.birth_weight_kg}
                placeholder="Optional"
              />
            </div>
            <div>
              <label>Length (cm)</label>
              <input
                type="number"
                step="0.1"
                name="birth_length_cm"
                onChange={handleChange}
                value={formData.birth_length_cm}
                placeholder="Optional"
              />
            </div>
            <div>
              <label>OFC (cm)</label>
              <input
                type="number"
                name="birth_ofc_cm"
                onChange={handleChange}
                value={formData.birth_ofc_cm}
                placeholder="Optional"
              />
            </div>
          </div>

          <div
            className="form-grid"
            style={{ gridTemplateColumns: "0.7fr 1fr", marginTop: "15px" }}
          >
            <div>
              <label style={{ marginBottom: "10px", display: "block" }}>
                G6PD
              </label>
              <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                {["Normal", "Deficient"].map((status) => (
                  <label
                    key={status}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="g6pd"
                      value={status}
                      onChange={handleChange}
                      checked={formData.g6pd === status}
                    />
                    {status}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label>TSH (mlU/L)</label>
              <input
                type="number"
                name="tsh_mlul"
                onChange={handleChange}
                value={formData.tsh_mlul}
                placeholder="Optional"
              />
            </div>
          </div>

          <div style={{ marginTop: "15px" }}>
            <label style={{ display: "block", marginBottom: "8px" }}>
              Feeding
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "30px" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="feeding_mode"
                  checked={formData.feeding === "Breast"}
                  onChange={() =>
                    setFormData({ ...formData, feeding: "Breast" })
                  }
                />
                Breast
              </label>

              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="feeding_mode"
                    checked={
                      formData.feeding !== "Breast" && formData.feeding !== ""
                    }
                    onChange={() => setFormData({ ...formData, feeding: "" })}
                  />
                  Formula:
                </label>
                {formData.feeding !== "Breast" && (
                  <input
                    name="feeding"
                    value={formData.feeding}
                    onChange={handleChange}
                    style={{ width: "200px", padding: "6px" }}
                    placeholder="Enter Formula Name"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* --- Card 4: Medical History & Actions --- */}
        <div className="card">
          <h3>Others</h3>
          <div>
            <label style={{ display: "block", marginBottom: "10px" }}>
              Languages
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "25px" }}>
              {["English", "Mandarin", "Malay", "Cantonese", "Hokkien"].map(
                (lang) => (
                  <label
                    key={lang}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      value={lang}
                      checked={formData.languages?.includes(lang)}
                      onChange={handleLanguageChange}
                    />
                    {lang}
                  </label>
                ),
              )}
            </div>
          </div>

          <div style={{ marginTop: "15px" }}>
            <label>Allergies</label>
            <input
              name="allergies"
              onChange={handleChange}
              value={formData.allergies}
              placeholder="Optional"
            />
          </div>
          <div style={{ marginTop: "15px" }}>
            <label>Vaccination Summary</label>
            <input
              name="vaccination_summary"
              onChange={handleChange}
              value={formData.vaccination_summary}
              placeholder="Optional"
            />
          </div>
          <div style={{ marginTop: "15px" }}>
            <label>Other Notes</label>
            <input
              name="other_notes"
              onChange={handleChange}
              value={formData.other_notes}
              placeholder="Optional"
            />
          </div>

          {/* FINAL SUBMIT BUTTON */}
          <div
            className="form-actions"
            style={{ marginTop: "30px", display: "flex", gap: "10px" }}
          >
            <ConfirmButton 
              className="btn-primary" 
              onConfirm={handleSubmit} // Pass the submit function here
              title="Create Patient?"
              message="Please ensure all details are correct before creating this record."
            >
              Save Patient
            </ConfirmButton>
            
            <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </form>
    </div>
  );
}

function PatientDetailView({ patientId }) {
  const [patient, setPatient] = useState(null);
  const [showVisitForm, setShowVisitForm] = useState(false);

  // --- EDIT MODE STATES ---
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});

  useEffect(() => {
    fetchPatient();
  }, [patientId]);

  const fetchPatient = async () => {
    try {
      const res = await axios.get(`${API_URL}/patients/${patientId}`);
      setPatient(res.data);
      setEditFormData(res.data);
    } catch (err) {
      alert("Error loading patient details");
    }
  };

  // --- EDIT HANDLERS ---
  const handleEditChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  const handleEditLanguageChange = (e) => {
    const { value, checked } = e.target;
    const currentLanguages = editFormData.languages || [];
    if (checked) {
      setEditFormData({
        ...editFormData,
        languages: [...currentLanguages, value],
      });
    } else {
      setEditFormData({
        ...editFormData,
        languages: currentLanguages.filter((l) => l !== value),
      });
    }
  };

  const savePatientDetails = async () => {
    try {
      const payload = {
        ...editFormData,
        birth_weight_kg: editFormData.birth_weight_kg
          ? parseFloat(editFormData.birth_weight_kg)
          : null,
        birth_length_cm: editFormData.birth_length_cm
          ? parseFloat(editFormData.birth_length_cm)
          : null,
        birth_ofc_cm: editFormData.birth_ofc_cm
          ? parseInt(editFormData.birth_ofc_cm)
          : null,
        tsh_mlul: editFormData.tsh_mlul
          ? parseInt(editFormData.tsh_mlul)
          : null,
      };

      const res = await axios.put(`${API_URL}/patients/${patient.id}`, payload);
      setPatient(res.data);
      setIsEditing(false);
      alert("Patient details updated!");
    } catch (err) {
      console.error(err);
      alert("Failed to update patient.");
    }
  };

  if (!patient)
    return (
      <div style={{ textAlign: "center", padding: "20px" }}>
        Loading Record...
      </div>
    );

  return (
    <div>
      {/* --- TOP HEADER --- */}
      <div className="patient-header">
        <div className="patient-title">
          <h1>{patient.name}</h1>
          <div className="patient-meta">
            <span className="badge">ID: {patient.id}</span>
            <span className="badge">DOB: {patient.date_of_birth}</span>
            <span
              className="badge"
              style={{ background: "#e3f2fd", color: "#0d47a1" }}
            >
              Age: {calculateAge(patient.date_of_birth)}
            </span>
          </div>
        </div>
        <button
          className={isEditing ? "btn-secondary" : "btn-primary"}
          onClick={() => {
            if (isEditing) {
              setEditFormData(patient); // Reset logic
              setIsEditing(false);
            } else {
              setIsEditing(true);
            }
          }}
        >
          {isEditing ? "Cancel Edit" : "Edit Details"}
        </button>
      </div>

      {/* --- CARD 1: PATIENT INFORMATION (Full Width, Split Internally) --- */}
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            paddingBottom: "5px",
          }}
        >
          <h3>Patient Information</h3>
          {isEditing && (
            <ConfirmButton
              className="btn-success"
              onConfirm={savePatientDetails}
              title="Save Changes?"
              message="This will permenantly update the patient's record in the database."
            >
              Save Changes
            </ConfirmButton>
          )}
        </div>

        {!isEditing ? (
          /* --- READ ONLY VIEW --- */
          <div>
            <div className="info-grid">
              {/* Top Left: Contact */}
              <Section title="Contact Info">
                <Row label="Address" value={patient.address} />
                <Row label="Phone 1" value={patient.phone_number_primary} />
                <Row
                  label="Phone 2"
                  value={patient.phone_number_secondary || "-"}
                />
              </Section>

              {/* Top Right: Parents */}
              <Section title="Parents">
                <Row
                  label="Father"
                  value={`${patient.father_name || "-"} (${patient.father_occupation || "-"})`}
                />
                <Row
                  label="Mother"
                  value={`${patient.mother_name || "-"} (${patient.mother_occupation || "-"})`}
                />
                <Row label="Para" value={patient.para || "-"} />
              </Section>

              {/* Bottom Left: Birth */}
              <Section title="Birth Details">
                <Row label="Hospital" value={patient.hospital || "-"} />
                <Row label="Delivery" value={patient.delivery || "-"} />
                <Row
                  label="Weight"
                  value={
                    patient.birth_weight_kg
                      ? `${patient.birth_weight_kg} kg`
                      : "-"
                  }
                />
                <Row
                  label="Length"
                  value={
                    patient.birth_length_cm
                      ? `${patient.birth_length_cm} cm`
                      : "-"
                  }
                />
                <Row
                  label="OFC"
                  value={
                    patient.birth_ofc_cm ? `${patient.birth_ofc_cm} cm` : "-"
                  }
                />
              </Section>

              {/* Bottom Right: Medical */}
              <Section title="Medical Profile">
                <Row label="G6PD" value={patient.g6pd || "-"} />
                <Row
                  label="TSH"
                  value={patient.tsh_mlul ? `${patient.tsh_mlul} mlU/L` : "-"}
                />
                <Row label="Feeding" value={patient.feeding || "-"} />
                <Row label="Allergies" value={patient.allergies || "None"} />
                <Row
                  label="Languages"
                  value={patient.languages?.join(", ") || "-"}
                />
              </Section>
            </div>

            {/* Full Width Footer for Notes */}
            <div
              style={{
                marginTop: "10px",
                borderTop: "1px solid #eee",
                paddingTop: "10px",
              }}
            >
              <span style={{ fontWeight: "bold", color: "#555" }}>
                Vaccination History:{" "}
              </span>
              <span style={{ fontStyle: "italic", color: "#555" }}>
                {patient.vaccination_summary || "None."}
              </span>
            </div>
            <div style={{ paddingTop: "10px" }}>
              <span style={{ fontWeight: "bold", color: "#555" }}>
                Other Notes:{" "}
              </span>
              <span style={{ fontStyle: "italic", color: "#555" }}>
                {patient.other_notes || "No notes."}
              </span>
            </div>
          </div>
        ) : (
          /* --- EDIT MODE (Also using Grid for layout) --- */
          <div className="info-grid">
            {/* Top Left: Basic Edit */}
            <div>
              <h4 style={{ color: "#004cd8" }}>Basic & Contact</h4>
              <label className="edit-label">Name</label>
              <input
                className="edit-input"
                name="name"
                value={editFormData.name}
                onChange={handleEditChange}
              />
              <label className="edit-label">DOB</label>
              <input
                type="date"
                className="edit-input"
                name="date_of_birth"
                value={editFormData.date_of_birth}
                onChange={handleEditChange}
              />
              <label className="edit-label">Address</label>
              <input
                className="edit-input"
                name="address"
                value={editFormData.address}
                onChange={handleEditChange}
              />
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ flex: 1 }}>
                  <label className="edit-label">Phone 1</label>
                  <input
                    className="edit-input"
                    name="phone_number_primary"
                    value={editFormData.phone_number_primary}
                    onChange={handleEditChange}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="edit-label">Phone 2</label>
                  <input
                    className="edit-input"
                    name="phone_number_secondary"
                    value={editFormData.phone_number_secondary || ""}
                    onChange={handleEditChange}
                  />
                </div>
              </div>
            </div>

            {/* Top Right: Parents Edit */}
            <div>
              <h4 style={{ color: "#004cd8" }}>Parents</h4>
              <label className="edit-label">Father Name</label>
              <input
                className="edit-input"
                name="father_name"
                value={editFormData.father_name || ""}
                onChange={handleEditChange}
              />
              <label className="edit-label">Father Occupation</label>
              <input
                className="edit-input"
                name="father_occupation"
                value={editFormData.father_occupation || ""}
                onChange={handleEditChange}
              />
              <label className="edit-label">Mother Name</label>
              <input
                className="edit-input"
                name="mother_name"
                value={editFormData.mother_name || ""}
                onChange={handleEditChange}
              />
              <label className="edit-label">Mother Occupation</label>
              <input
                className="edit-input"
                name="mother_occupation"
                value={editFormData.mother_occupation || ""}
                onChange={handleEditChange}
              />
              <label className="edit-label">Para</label>
              <input
                className="edit-input"
                name="para"
                value={editFormData.para || ""}
                onChange={handleEditChange}
              />
            </div>

            {/* Bottom Left: Birth Edit */}
            <div>
              <h4 style={{ color: "#004cd8" }}>Birth Details</h4>
              <label className="edit-label">Hospital</label>
              <input
                className="edit-input"
                name="hospital"
                value={editFormData.hospital || ""}
                onChange={handleEditChange}
              />
              <label className="edit-label">Delivery</label>
              <select
                className="edit-input"
                name="delivery"
                value={editFormData.delivery || ""}
                onChange={handleEditChange}
              >
                <option value="">Select...</option>
                {["SVD", "LSCS", "Forceps", "Vac", "Breech"].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <div style={{ display: "flex", gap: "5px" }}>
                <div style={{ flex: 1 }}>
                  <label className="edit-label">Wt (kg)</label>
                  <input
                    className="edit-input"
                    name="birth_weight_kg"
                    value={editFormData.birth_weight_kg || ""}
                    onChange={handleEditChange}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="edit-label">Len (cm)</label>
                  <input
                    className="edit-input"
                    name="birth_length_cm"
                    value={editFormData.birth_length_cm || ""}
                    onChange={handleEditChange}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="edit-label">OFC (cm)</label>
                  <input
                    className="edit-input"
                    name="birth_ofc_cm"
                    value={editFormData.birth_ofc_cm || ""}
                    onChange={handleEditChange}
                  />
                </div>
              </div>
            </div>

            {/* Bottom Right: Medical Edit */}
            <div>
              <h4 style={{ color: "#004cd8" }}>Medical Profile</h4>
              <label className="edit-label">G6PD</label>
              <select
                className="edit-input"
                name="g6pd"
                value={editFormData.g6pd || ""}
                onChange={handleEditChange}
              >
                <option value="">Unknown</option>
                <option value="Normal">Normal</option>
                <option value="Deficient">Deficient</option>
              </select>

              <label className="edit-label">Feeding</label>
              <input
                className="edit-input"
                name="feeding"
                value={editFormData.feeding || ""}
                onChange={handleEditChange}
                placeholder="Breast or Formula Name"
              />

              <label className="edit-label">Languages</label>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "10px",
                  marginBottom: "10px",
                }}
              >
                {["English", "Mandarin", "Malay", "Cantonese", "Hokkien"].map(
                  (lang) => (
                    <label
                      key={lang}
                      style={{
                        fontSize: "0.8rem",
                        display: "flex",
                        gap: "4px",
                      }}
                    >
                      <input
                        type="checkbox"
                        value={lang}
                        checked={editFormData.languages?.includes(lang)}
                        onChange={handleEditLanguageChange}
                      />
                      {lang}
                    </label>
                  ),
                )}
              </div>

              <label className="edit-label">Notes</label>
              <textarea
                className="edit-input"
                name="other_notes"
                value={editFormData.other_notes || ""}
                onChange={handleEditChange}
                rows={2}
              />
            </div>
          </div>
        )}
      </div>

      {/* --- CARD 2: MEDICAL HISTORY (Stacked Below) --- */}
      <div className="card">
        <div className="visit-header">
          <h3>Medical History</h3>
          <button
            className={showVisitForm ? "btn-secondary" : "btn-success"}
            onClick={() => setShowVisitForm(!showVisitForm)}
          >
            {showVisitForm ? "Cancel Entry" : "+ Add Visit"}
          </button>
        </div>

        {showVisitForm && (
          <div
            style={{
              marginBottom: "20px",
              paddingBottom: "20px",
              borderBottom: "2px dashed #eee",
            }}
          >
            <CreateVisitForm
              patientId={patient.id}
              onSuccess={() => {
                setShowVisitForm(false);
                fetchPatient();
              }}
            />
          </div>
        )}

        {(!patient.visits || patient.visits.length === 0) ? (
          <p style={{color: '#999', fontStyle:'italic'}}>No previous visits recorded.</p>
        ) : (
          <ul className="visit-list">
            {patient.visits.map(v => (
              <VisitItem 
                key={v.visit_id} 
                visit={v} 
                patientId={patient.id} 
                onUpdate={fetchPatient} // Refresh parent data after edit
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// --- HELPER COMPONENTS FOR CLEANER LAYOUT ---
const Section = ({ title, children }) => (
  <div style={{ marginBottom: "10px" }}>
    <h4
      style={{
        borderBottom: "1px solid #eee",
        paddingBottom: "5px",
        color: "#004cd8",
        marginBottom: "10px",
      }}
    >
      {title}
    </h4>
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "5px" }}>
      {children}
    </div>
  </div>
);

const Row = ({ label, value }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "110px 1fr",
      fontSize: "0.95rem",
    }}
  >
    <span style={{ fontWeight: "600", color: "#555" }}>{label}:</span>
    <span style={{ color: "#333" }}>{value}</span>
  </div>
);

function CreateVisitForm({ patientId, onSuccess }) {
  const now = new Date();
  const currentHours = String(now.getHours()).padStart(2, '0');
  const currentMinutes = String(now.getMinutes()).padStart(2, '0');
  const currentTime = `${currentHours}:${currentMinutes}`;

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    time: currentTime,
    weight: "",
    doctor_notes: "",
    total_charge: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Ensure numbers are numbers, not strings
      const payload = {
        patient_id: patientId,
        date: formData.date,
        time: formData.time + ":00", // Add seconds for standard Time format
        weight: parseFloat(formData.weight) || 0,
        total_charge: parseFloat(formData.total_charge) || 0,
        doctor_notes: formData.doctor_notes,
      };

      await axios.post(`${API_URL}/visits/`, payload);
      onSuccess();
    } catch (err) {
      console.error(err);
      alert("Error saving visit");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h4>New Consultation Entry</h4>
      <div className="input-row">
        <div style={{ flex: 1 }}>
          <label>Date</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
        </div>
        <div style={{ flex: 1 }}>
          <label>Time</label>
          <input
            type="time"
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
            required
          />
        </div>
      </div>
      <div className="input-row">
        <div style={{ flex: 1 }}>
          <label>Weight (kg)</label>
          <input
            type="number"
            step="0.1"
            value={formData.weight}
            onChange={(e) =>
              setFormData({ ...formData, weight: e.target.value })
            }
            required
          />
        </div>
        <div style={{ flex: 1 }}>
          <label>Charge (RM)</label>
          <input
            type="number"
            step="0.01"
            value={formData.total_charge}
            onChange={(e) =>
              setFormData({ ...formData, total_charge: e.target.value })
            }
          />
        </div>
      </div>
      <div style={{ marginTop: "10px" }}>
        <label>Doctor's Notes</label>
        <textarea
          rows="3"
          placeholder="Diagnosis, treatment details..."
          value={formData.doctor_notes}
          onChange={(e) =>
            setFormData({ ...formData, doctor_notes: e.target.value })
          }
        />
      </div>
      <button
        type="submit"
        className="btn-primary"
        style={{ marginTop: "10px", width: "100%" }}
      >
        Save Record
      </button>
    </form>
  );
}

function ConfirmButton({ onConfirm, title = "Confirm Action", message = "Are you sure?", children, className, ...props }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = (e) => {
    e.preventDefault(); // 1. Always stop the immediate click

    // 2. Check if this button is inside a form
    const form = e.target.closest('form');
    
    // 3. If in a form, check if the data is valid
    if (form) {
      // reportValidity() returns true if valid, false if invalid.
      // It also automatically shows the "Please fill out this field" bubbles.
      if (!form.reportValidity()) {
        return; // Stop here. Do not open the modal.
      }
    }

    // 4. If valid (or not in a form), open the modal
    setIsOpen(true);
  };

  const handleConfirm = () => {
    setIsOpen(false);
    onConfirm(); // Run the actual save function
  };

  return (
    <>
      <button onClick={handleClick} className={className} {...props}>
        {children}
      </button>

      {isOpen && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-title">{title}</div>
            <p>{message}</p>
            <div className="modal-actions">
              <button 
                className="btn-primary" 
                onClick={handleConfirm}
                autoFocus 
              >
                Yes, Proceed
              </button>
              <button 
                className="btn-secondary" 
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function calculateAge(dobString) {
  if (!dobString) return "";
  
  const dob = new Date(dobString);
  const today = new Date();
  
  let years = today.getFullYear() - dob.getFullYear();
  let months = today.getMonth() - dob.getMonth();

  // If the current month is before the birth month, subtract a year
  // and add 12 months to the difference
  if (months < 0 || (months === 0 && today.getDate() < dob.getDate())) {
    years--;
    months += 12;
  }
  
  // Adjust if we are in the same month but the day hasn't passed yet
  if (today.getDate() < dob.getDate()) {
    months--;
  }

  return `${years}Y ${months}M`;
}

function VisitItem({ visit, patientId, onUpdate }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(visit);

  // Reset form data if the prop changes
  useEffect(() => {
    setEditData(visit);
  }, [visit]);

  const handleSave = async () => {
    try {
      const payload = {
        date: editData.date,
        // Fix Time: Ensure it has seconds (HH:MM -> HH:MM:SS)
        time: editData.time.length === 5 ? editData.time + ":00" : editData.time,
        // Fix Numbers: Default to 0 if empty/invalid so we don't send null
        weight: parseFloat(editData.weight) || 0,
        total_charge: parseFloat(editData.total_charge) || 0,
        doctor_notes: editData.doctor_notes || ""
      };

      console.log("Sending Payload:", payload); // Debugging line

      await axios.put(`${API_URL}/visits/${visit.visit_id}`, payload);
      alert("Visit updated successfully!");
      setIsEditing(false);
      onUpdate(); // Tell parent to refresh the list
    } catch (err) {
      console.error(err);
      alert(`Failed to update: ${err.response?.data?.detail || err.message}`);
    }
  };

  return (
    <li className="visit-item-container">
      {/* HEADER: Always visible, clickable to toggle expand */}
      <div 
        className="visit-header-row" 
        onClick={() => !isEditing && setIsExpanded(!isExpanded)}
        style={{ cursor: isEditing ? 'default' : 'pointer' }}
      >
        <span className="visit-date">{visit.date}</span>
        {/* Show truncated note if collapsed */}
        <span className="visit-preview">
            {isExpanded ? "" : (visit.doctor_notes ? visit.doctor_notes.substring(0, 60) + "..." : "No notes")}
        </span>
        <span className="visit-charge">RM {visit.total_charge}</span>
        <span style={{fontSize: '0.8rem', color: '#999'}}>
            {isExpanded ? "▼" : "▶"}
        </span>
      </div>

      {/* BODY: Visible only when expanded */}
      {isExpanded && (
        <div className="visit-details-body">
          {!isEditing ? (
            /* --- READ ONLY VIEW --- */
            <>
              <div className="detail-row">
                <strong>Time:</strong> {visit.time.slice(0, 5)} | <strong>Weight:</strong> {visit.weight} kg
              </div>
              <div className="detail-row" style={{marginTop: '10px'}}>
                <strong>Doctor's Notes:</strong>
                <p style={{whiteSpace: 'pre-wrap', marginTop: '5px', color: '#333'}}>
                    {visit.doctor_notes || "No notes recorded."}
                </p>
              </div>
              <div style={{marginTop: '15px', textAlign: 'right'}}>
                <button className="btn-secondary" onClick={() => setIsEditing(true)}>
                    Edit Record
                </button>
              </div>
            </>
          ) : (
            /* --- EDIT MODE --- */
            <div className="visit-edit-form">
               <div className="form-grid">
                  <div>
                    <label>Date</label>
                    <input type="date" value={editData.date} onChange={e => setEditData({...editData, date: e.target.value})} />
                  </div>
                  <div>
                    <label>Time</label>
                    <input type="time" value={editData.time} onChange={e => setEditData({...editData, time: e.target.value})} />
                  </div>
               </div>
               <div className="form-grid" style={{marginTop: '10px'}}>
                  <div>
                    <label>Weight (kg)</label>
                    <input type="number" step="0.1" value={editData.weight} onChange={e => setEditData({...editData, weight: e.target.value})} />
                  </div>
                  <div>
                    <label>Charge (RM)</label>
                    <input type="number" step="0.01" value={editData.total_charge} onChange={e => setEditData({...editData, total_charge: e.target.value})} />
                  </div>
               </div>
               <div style={{marginTop: '10px'}}>
                  <label>Notes</label>
                  <textarea 
                    rows="4" 
                    value={editData.doctor_notes || ''} 
                    onChange={e => setEditData({...editData, doctor_notes: e.target.value})} 
                  />
               </div>
               
               <div className="form-actions" style={{marginTop: '15px', display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
                 <ConfirmButton 
                    className="btn-success" 
                    onConfirm={handleSave}
                    title="Save Changes?"
                    message="Update this medical record?"
                 >
                    Save
                 </ConfirmButton>
                 <button 
                    className="btn-secondary" 
                    onClick={() => { setIsEditing(false); setEditData(visit); }}
                 >
                    Cancel
                 </button>
               </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export default App;
