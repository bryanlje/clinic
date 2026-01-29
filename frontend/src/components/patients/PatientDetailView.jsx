import { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "../../api/config";
import { calculateAge } from "../../utils/helpers";
import ConfirmButton from "../common/ConfirmButton";
import { Section, Row } from "../common/LayoutHelpers";
import CreateVisitForm from "../visits/CreateVisitForm";
import VisitItem from "../visits/VisitItem";

export default function PatientDetailView({ patientId, onBack }) {
  const [patient, setPatient] = useState(null);
  const [showVisitForm, setShowVisitForm] = useState(false);
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

  const handleDeletePatient = async () => {
    try {
      await axios.delete(`${API_URL}/patients/${patientId}`);
      onBack(); 
    } catch (err) {
      console.error(err);
      alert("Failed to delete patient. Ensure all related visits are handled or check connection.");
    }
  };

  const handleEditChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  const handleEditLanguageChange = (e) => {
    const { value, checked } = e.target;
    const currentLanguages = editFormData.languages || [];
    if (checked) {
      setEditFormData({ ...editFormData, languages: [...currentLanguages, value] });
    } else {
      setEditFormData({ ...editFormData, languages: currentLanguages.filter((l) => l !== value) });
    }
  };

  const savePatientDetails = async () => {
    try {
      const payload = {
        ...editFormData,
        birth_weight_kg: editFormData.birth_weight_kg ? parseFloat(editFormData.birth_weight_kg) : null,
        birth_length_cm: editFormData.birth_length_cm ? parseFloat(editFormData.birth_length_cm) : null,
        birth_ofc_cm: editFormData.birth_ofc_cm ? parseInt(editFormData.birth_ofc_cm) : null,
        tsh_mlul: editFormData.tsh_mlul ? parseInt(editFormData.tsh_mlul) : null,
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

  if (!patient) return <div style={{ textAlign: "center", padding: "20px" }}>Loading Record...</div>;

  return (
    <div>
      <div className="patient-header">
        <div className="patient-title">
          <h1>{patient.name}</h1>
          <div className="patient-meta">
            <span className="badge">ID: {patient.display_id}</span>
            <span className="badge">Reg: {patient.date_registered}</span>
            <span className="badge">DOB: {patient.date_of_birth}</span>
            <span className="badge" style={{ background: "#e3f2fd", color: "#0d47a1" }}>Age: {calculateAge(patient.date_of_birth)}</span>
          </div>
        </div>
        <button
          className={isEditing ? "btn-secondary" : "btn-primary"}
          onClick={() => {
            if (isEditing) {
              setEditFormData(patient); 
              setIsEditing(false);
            } else {
              setIsEditing(true);
            }
          }}
        >
          {isEditing ? "Cancel Edit" : "Edit Details"}
        </button>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "5px" }}>
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
          <div>
            <div className="info-grid">
              <Section title="Contact Info">
                <Row label="Address" value={patient.address} />
                <Row label="Phone 1" value={patient.phone_number_primary} />
                <Row label="Phone 2" value={patient.phone_number_secondary || "-"} />
              </Section>
              <Section title="Parents">
                <Row label="Father" value={`${patient.father_name || "-"} (${patient.father_occupation || "-"})`} />
                <Row label="Mother" value={`${patient.mother_name || "-"} (${patient.mother_occupation || "-"})`} />
                <Row label="Para" value={patient.para || "-"} />
              </Section>
              <Section title="Birth Details">
                <Row label="Hospital" value={patient.hospital || "-"} />
                <Row label="Delivery" value={patient.delivery || "-"} />
                <Row label="Weight" value={patient.birth_weight_kg ? `${patient.birth_weight_kg} kg` : "-"} />
                <Row label="Length" value={patient.birth_length_cm ? `${patient.birth_length_cm} cm` : "-"} />
                <Row label="OFC" value={patient.birth_ofc_cm ? `${patient.birth_ofc_cm} cm` : "-"} />
              </Section>
              <Section title="Medical Profile">
                <Row label="G6PD" value={patient.g6pd || "-"} />
                <Row label="TSH" value={patient.tsh_mlul ? `${patient.tsh_mlul} mlU/L` : "-"} />
                <Row label="Feeding" value={patient.feeding || "-"} />
                <Row label="Allergies" value={patient.allergies || "None"} />
                <Row label="Languages" value={patient.languages?.join(", ") || "-"} />
              </Section>
            </div>
            <div style={{ marginTop: "10px", borderTop: "1px solid #eee", paddingTop: "10px" }}>
              <span style={{ fontWeight: "bold", color: "#555" }}>Vaccination History: </span>
              <span style={{ fontStyle: "italic", color: "#555" }}>{patient.vaccination_summary || "None."}</span>
            </div>
            <div style={{ paddingTop: "10px" }}>
              <span style={{ fontWeight: "bold", color: "#555" }}>Other Notes: </span>
              <span style={{ fontStyle: "italic", color: "#555" }}>{patient.other_notes || "No notes."}</span>
            </div>
          </div>
        ) : (
          <div className="info-grid">
            {/* ... EDIT FIELDS ... */}
            <div>
              <h4 style={{ color: "#004cd8" }}>Meta, Basic & Contact</h4>
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ flex: 1 }}>
                  <label className="edit-label">Patient ID</label>
                  <input className="edit-input" name="display_id" value={editFormData.display_id} onChange={handleEditChange} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="edit-label">Date Registered</label>
                  <input type="date" className="edit-input" name="date_registered" value={editFormData.date_registered} onChange={handleEditChange} />
                </div>
              </div>
              <label className="edit-label">Name</label>
              <input className="edit-input" name="name" value={editFormData.name} onChange={handleEditChange} />
              <label className="edit-label">DOB</label>
              <input type="date" className="edit-input" name="date_of_birth" value={editFormData.date_of_birth} onChange={handleEditChange} />
              <label className="edit-label">Address</label>
              <input className="edit-input" name="address" value={editFormData.address} onChange={handleEditChange} />
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ flex: 1 }}>
                  <label className="edit-label">Phone 1</label>
                  <input className="edit-input" name="phone_number_primary" value={editFormData.phone_number_primary} onChange={handleEditChange} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="edit-label">Phone 2</label>
                  <input className="edit-input" name="phone_number_secondary" value={editFormData.phone_number_secondary || ""} onChange={handleEditChange} />
                </div>
              </div>
            </div>

            <div>
              <h4 style={{ color: "#004cd8" }}>Parents</h4>
              <label className="edit-label">Father Name</label>
              <input className="edit-input" name="father_name" value={editFormData.father_name || ""} onChange={handleEditChange} />
              <label className="edit-label">Father Occupation</label>
              <input className="edit-input" name="father_occupation" value={editFormData.father_occupation || ""} onChange={handleEditChange} />
              <label className="edit-label">Mother Name</label>
              <input className="edit-input" name="mother_name" value={editFormData.mother_name || ""} onChange={handleEditChange} />
              <label className="edit-label">Mother Occupation</label>
              <input className="edit-input" name="mother_occupation" value={editFormData.mother_occupation || ""} onChange={handleEditChange} />
              <label className="edit-label">Para</label>
              <input className="edit-input" name="para" value={editFormData.para || ""} onChange={handleEditChange} />
            </div>

            <div>
              <h4 style={{ color: "#004cd8" }}>Birth Details</h4>
              <label className="edit-label">Hospital</label>
              <input className="edit-input" name="hospital" value={editFormData.hospital || ""} onChange={handleEditChange} />
              <label className="edit-label">Delivery</label>
              <select className="edit-input" name="delivery" value={editFormData.delivery || ""} onChange={handleEditChange}>
                <option value="">Select...</option>
                {["SVD", "LSCS", "Forceps", "Vac", "Breech"].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <div style={{ display: "flex", gap: "5px" }}>
                <div style={{ flex: 1 }}>
                  <label className="edit-label">Wt (kg)</label>
                  <input className="edit-input" name="birth_weight_kg" value={editFormData.birth_weight_kg || ""} onChange={handleEditChange} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="edit-label">Len (cm)</label>
                  <input className="edit-input" name="birth_length_cm" value={editFormData.birth_length_cm || ""} onChange={handleEditChange} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="edit-label">OFC (cm)</label>
                  <input className="edit-input" name="birth_ofc_cm" value={editFormData.birth_ofc_cm || ""} onChange={handleEditChange} />
                </div>
              </div>
            </div>

            <div>
              <h4 style={{ color: "#004cd8" }}>Medical Profile</h4>
              <label className="edit-label">G6PD</label>
              <select className="edit-input" name="g6pd" value={editFormData.g6pd || ""} onChange={handleEditChange}>
                <option value="">Unknown</option>
                <option value="Normal">Normal</option>
                <option value="Deficient">Deficient</option>
              </select>
              <label className="edit-label">Feeding</label>
              <input className="edit-input" name="feeding" value={editFormData.feeding || ""} onChange={handleEditChange} placeholder="Breast or Formula Name" />
              <label className="edit-label">Languages</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "10px" }}>
                {["English", "Mandarin", "Malay", "Cantonese", "Hokkien"].map((lang) => (
                  <label key={lang} style={{ fontSize: "0.8rem", display: "flex", gap: "4px" }}>
                    <input type="checkbox" value={lang} checked={editFormData.languages?.includes(lang)} onChange={handleEditLanguageChange} />
                    {lang}
                  </label>
                ))}
              </div>
              <label className="edit-label">Notes</label>
              <textarea className="edit-input" name="other_notes" value={editFormData.other_notes || ""} onChange={handleEditChange} rows={2} />
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="visit-header">
          <h3>Medical History</h3>
          <button className={showVisitForm ? "btn-secondary" : "btn-success"} onClick={() => setShowVisitForm(!showVisitForm)}>
            {showVisitForm ? "Cancel Entry" : "+ Add Visit"}
          </button>
        </div>

        {showVisitForm && (
          <div style={{ marginBottom: "20px", paddingBottom: "20px", borderBottom: "2px dashed #c9c9c9" }}>
            <CreateVisitForm patientId={patient.id} onSuccess={() => { setShowVisitForm(false); fetchPatient(); }} />
          </div>
        )}

        {(!patient.visits || patient.visits.length === 0) ? (
          <p style={{ color: '#999', fontStyle: 'italic' }}>No previous visits recorded.</p>
        ) : (
          <ul className="visit-list">
            {patient.visits.map(v => (
              <VisitItem key={v.visit_id} visit={v} patientId={patient.id} onUpdate={fetchPatient} />
            ))}
          </ul>
        )}
      </div>

      <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end', paddingBottom: '20px' }}>
        <ConfirmButton
          className="btn-danger"
          style={{ border: 'none', padding: '12px 24px', fontSize: '0.8rem' }}
          onConfirm={handleDeletePatient}
          title={`Delete ${patient.name} (${patient.id})?`}
          message="Are you sure you want to delete this ENTIRE patient file?
          All personal details, visit history, and associated attachments will be permanently lost."
        >
          Delete Patient File
        </ConfirmButton>
      </div>
    </div>
  );
}