import { useState } from "react";
import axios from "axios";
import { API_URL } from "../../api/config";
import ConfirmButton from "../common/ConfirmButton";

export default function CreatePatientForm({ onSuccess, onCancel }) {
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
    feeding: "Breast",
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
    try {
      const payload = {
        ...formData,
        phone_number_secondary: formData.phone_number_secondary || null,
        birth_weight_kg: formData.birth_weight_kg ? parseFloat(formData.birth_weight_kg) : null,
        birth_length_cm: formData.birth_length_cm ? parseFloat(formData.birth_length_cm) : null,
        birth_ofc_cm: formData.birth_ofc_cm ? parseInt(formData.birth_ofc_cm) : null,
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
      <form>
        {/* ... Card 1: Basic Details ... */}
        <div className="card">
          <h2>Register New Patient</h2>
          <div style={{ marginTop: "15px" }}>
            <label>Patient ID</label>
            <input name="id" onChange={handleChange} value={formData.id} required />
          </div>
          <div style={{ marginTop: "15px" }}>
            <label>Full Name</label>
            <input name="name" onChange={handleChange} value={formData.name} required />
          </div>
          <div style={{ marginTop: "15px" }}>
            <label>Date of Birth</label>
            <input type="date" name="date_of_birth" onChange={handleChange} value={formData.date_of_birth} required />
          </div>
          <div className="form-grid" style={{ marginTop: "15px" }}>
            <div>
              <label>Phone Number 1</label>
              <input name="phone_number_primary" onChange={handleChange} value={formData.phone_number_primary} required />
            </div>
            <div>
              <label>Phone Number 2</label>
              <input name="phone_number_secondary" onChange={handleChange} value={formData.phone_number_secondary} placeholder="Optional" />
            </div>
          </div>
          <div style={{ marginTop: "15px" }}>
            <label>Address</label>
            <input name="address" onChange={handleChange} value={formData.address} required />
          </div>
        </div>

        {/* ... Card 2: Parent Details ... */}
        <div className="card">
          <h3>Parents Info</h3>
          <div className="form-grid">
            <div>
              <label>Father's Name</label>
              <input name="father_name" onChange={handleChange} value={formData.father_name} required />
            </div>
            <div>
              <label>Father's Occupation</label>
              <input name="father_occupation" onChange={handleChange} value={formData.father_occupation} required />
            </div>
          </div>
          <div className="form-grid" style={{ marginTop: "15px" }}>
            <div>
              <label>Mother's Name</label>
              <input name="mother_name" onChange={handleChange} value={formData.mother_name} required />
            </div>
            <div>
              <label>Mother's Occupation</label>
              <input name="mother_occupation" onChange={handleChange} value={formData.mother_occupation} required />
            </div>
          </div>
          <div style={{ marginTop: "15px" }}>
            <label>Para</label>
            <input name="para" onChange={handleChange} value={formData.para} placeholder="Optional" />
          </div>
        </div>

        {/* ... Card 3: Birth Details ... */}
        <div className="card">
          <h3>Birth Details</h3>
          <div className="form-grid" style={{ gridTemplateColumns: "0.7fr 1fr" }}>
            <div>
              <label>Hospital</label>
              <input name="hospital" onChange={handleChange} value={formData.hospital} placeholder="Optional" />
            </div>

            <div>
              <label style={{ marginBottom: "10px", display: "block" }}>Delivery Method</label>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap" }}>
                {["SVD", "LSCS", "Forceps", "Vac", "Breech"].map((method) => (
                  <label key={method} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                    <input type="radio" name="delivery" value={method} onChange={handleChange} checked={formData.delivery === method} />
                    {method}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", marginTop: "15px" }}>
            <div>
              <label>Birth Weight (kg)</label>
              <input type="number" step="0.01" name="birth_weight_kg" onChange={handleChange} value={formData.birth_weight_kg} placeholder="Optional" />
            </div>
            <div>
              <label>Length (cm)</label>
              <input type="number" step="0.1" name="birth_length_cm" onChange={handleChange} value={formData.birth_length_cm} placeholder="Optional" />
            </div>
            <div>
              <label>OFC (cm)</label>
              <input type="number" name="birth_ofc_cm" onChange={handleChange} value={formData.birth_ofc_cm} placeholder="Optional" />
            </div>
          </div>

          <div className="form-grid" style={{ gridTemplateColumns: "0.7fr 1fr", marginTop: "15px" }}>
            <div>
              <label style={{ marginBottom: "10px", display: "block" }}>G6PD</label>
              <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                {["Normal", "Deficient"].map((status) => (
                  <label key={status} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                    <input type="radio" name="g6pd" value={status} onChange={handleChange} checked={formData.g6pd === status} />
                    {status}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label>TSH (mlU/L)</label>
              <input type="number" name="tsh_mlul" onChange={handleChange} value={formData.tsh_mlul} placeholder="Optional" />
            </div>
          </div>

          <div style={{ marginTop: "15px" }}>
            <label style={{ display: "block", marginBottom: "8px" }}>Feeding</label>
            <div style={{ display: "flex", alignItems: "center", gap: "30px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                <input type="radio" name="feeding_mode" checked={formData.feeding === "Breast"} onChange={() => setFormData({ ...formData, feeding: "Breast" })} />
                Breast
              </label>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                  <input type="radio" name="feeding_mode" checked={formData.feeding !== "Breast" && formData.feeding !== ""} onChange={() => setFormData({ ...formData, feeding: "" })} />
                  Formula:
                </label>
                {formData.feeding !== "Breast" && (
                  <input name="feeding" value={formData.feeding} onChange={handleChange} style={{ width: "200px", padding: "6px" }} placeholder="Enter Formula Name" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ... Card 4: Medical History & Actions ... */}
        <div className="card">
          <h3>Others</h3>
          <div>
            <label style={{ display: "block", marginBottom: "10px" }}>Languages</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "25px" }}>
              {["English", "Mandarin", "Malay", "Cantonese", "Hokkien"].map((lang) => (
                <label key={lang} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                  <input type="checkbox" value={lang} checked={formData.languages?.includes(lang)} onChange={handleLanguageChange} />
                  {lang}
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginTop: "15px" }}>
            <label>Allergies</label>
            <input name="allergies" onChange={handleChange} value={formData.allergies} placeholder="Optional" />
          </div>
          <div style={{ marginTop: "15px" }}>
            <label>Vaccination Summary</label>
            <input name="vaccination_summary" onChange={handleChange} value={formData.vaccination_summary} placeholder="Optional" />
          </div>
          <div style={{ marginTop: "15px" }}>
            <label>Other Notes</label>
            <input name="other_notes" onChange={handleChange} value={formData.other_notes} placeholder="Optional" />
          </div>

          {/* FINAL SUBMIT BUTTON */}
          <div className="form-actions" style={{ marginTop: "30px", display: "flex", gap: "10px" }}>
            <ConfirmButton 
              className="btn-primary" 
              onConfirm={handleSubmit}
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