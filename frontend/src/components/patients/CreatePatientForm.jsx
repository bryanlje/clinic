import { useState } from "react";
import axios from "axios";
import { API_URL } from "../../api/config";
import ConfirmButton from "../common/ConfirmButton";
import SiblingSearchModal from "./SiblingSearchModal";

export default function CreatePatientForm({ onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    display_id: "",
    date_registered: new Date().toISOString().split("T")[0],
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
    languages_parents: [],
    languages_children: [],
    hospital: "",
    delivery: "",
    birth_weight_kg: "",
    birth_length_cm: "",
    birth_ofc_cm: "",
    g6pd: "",
    tsh_mlul: "",
    feeding: "",
    allergies: "",
    vaccination_summary: "",
    other_notes: "",
  });

  const [siblings, setSiblings] = useState([]);
  const [showSiblingModal, setShowSiblingModal] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Trigger suggestion logic only for ID field
    if (name === "display_id") {
      checkIdSuggestion(value);
    }
  };

  const handleLanguageChange = (e, fieldName) => {
    const { value, checked } = e.target;
    const currentLanguages = formData[fieldName] || [];

    if (checked) {
      setFormData({ ...formData, [fieldName]: [...currentLanguages, value] });
    } else {
      setFormData({
        ...formData,
        [fieldName]: currentLanguages.filter((lang) => lang !== value),
      });
    }
  };

  const handleSubmit = async (shouldOpen) => {
    try {
      const payload = {
        ...formData,
        phone_number_secondary: formData.phone_number_secondary || null,
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
        sibling_ids: siblings.map((s) => s.id),
      };

      // Capture the response
      const res = await axios.post(`${API_URL}/patients/`, payload);
      // alert("Patient Record Created Successfully");

      // Pass the created patient object (res.data) to onSuccess
      // This allows the parent component to know WHO was created
      onSuccess(res.data, shouldOpen);
    } catch (err) {
      console.error(err);
      alert("Error creating patient. Check console for details.");
    }
  };

  const [idSuggestion, setIdSuggestion] = useState(null);

  const checkIdSuggestion = async (inputVal) => {
    // Only check if input is 1 or 2 letters (e.g. "B" or "AB")
    // and contains no numbers yet
    if (/^[a-zA-Z]{1,2}$/.test(inputVal)) {
      try {
        const res = await axios.get(`${API_URL}/patients/next-id/${inputVal}`);
        setIdSuggestion(res.data);
      } catch (err) {
        console.error("Failed to fetch ID suggestion");
      }
    } else {
      setIdSuggestion(null); // Hide suggestion if they started typing numbers
    }
  };

  const applySuggestion = () => {
    if (idSuggestion?.next_suggestion) {
      setFormData({ ...formData, display_id: idSuggestion.next_suggestion });
      setIdSuggestion(null); // Hide after applying
    }
  };

  return (
    <div>
      <form>
        {/* ... Card 1: Basic Details ... */}
        <div className="card">
          <h2>Register New Patient</h2>
          <div className="form-grid" style={{ marginTop: "15px" }}>
            <div>
              <label>Patient ID</label>
              <div style={{ position: "relative" }}>
                <input
                  name="display_id"
                  onChange={handleChange}
                  value={formData.display_id}
                  required
                  placeholder="e.g. type 'A' to see last used"
                  autoComplete="off"
                />

                {/* THE SUGGESTION BOX */}
                {idSuggestion && (
                  <div
                    style={{
                      marginTop: "5px",
                      fontSize: "0.9rem",
                      color: "#666",
                      background: "#f8f9fa",
                      paddingLeft: "10px",
                      borderRadius: "4px",
                      border: "1px solid #eee",
                    }}
                  >
                    {idSuggestion.last_id ? (
                      <span>
                        Last used: <strong>{idSuggestion.last_id}</strong>.{" "}
                      </span>
                    ) : (
                      <span>No records for '{formData.display_id}'. </span>
                    )}

                    <button
                      type="button"
                      onClick={applySuggestion}
                      style={{
                        marginLeft: "10px",
                        cursor: "pointer",
                        color: "#0948bd",
                        border: "none",
                        background: "none",
                        fontWeight: "bold",
                        textDecoration: "underline",
                      }}
                    >
                      Use Next: {idSuggestion.next_suggestion}
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label>Date Registered</label>
              <input
                type="date"
                name="date_registered"
                onChange={handleChange}
                value={formData.date_registered}
                required
              />
            </div>
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
            <textarea
              name="address"
              onChange={handleChange}
              value={formData.address}
              required
              rows={2}
              style={{ width: "100%", padding: "8px", resize: "vertical" }}
            />
          </div>
        </div>

        {/* ... Card 2: Family Details ... */}
        <div className="card">
          <h3>Family Info</h3>
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
          <div style={{ marginTop: "20px" }}>
            <label style={{ display: "block", marginBottom: "10px" }}>
              Siblings (Optional)
            </label>

            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
                marginBottom: "10px",
              }}
            >
              {siblings.map((sib) => (
                <div
                  key={sib.id}
                  style={{
                    background: "#e3f2fd",
                    padding: "5px 12px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "0.8rem",
                    border: "1px solid #90caf9",
                  }}
                >
                  <span style={{ fontWeight: "bold", color: "#1565c0" }}>
                    {sib.name}
                  </span>
                  <span style={{ color: "#555" }}>({sib.display_id})</span>
                  <button
                    type="button"
                    onClick={() =>
                      setSiblings(siblings.filter((s) => s.id !== sib.id))
                    }
                    style={{
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      color: "#d32f2f",
                      fontWeight: "bold",
                      fontSize: "1.5rem",
                      lineHeight: "1",
                      padding: "2px 5px",
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}

              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowSiblingModal(true)}
                style={{ fontSize: "0.8rem", padding: "10px 15px" }}
              >
                + Add Sibling Link
              </button>
            </div>
          </div>
        </div>

        {/* ... Card 3: Birth Details ... */}
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

        {/* ... Card 4: Medical History & Actions ... */}
        <div className="card">
          <h3>Others</h3>
          <div>
            <label style={{ display: "block", marginTop: "10px" }}>
              Languages (Parents)
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "25px" }}>
              {["English", "Mandarin", "Malay", "Cantonese"].map((lang) => (
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
                    checked={formData.languages_parents?.includes(lang)}
                    onChange={(e) =>
                      handleLanguageChange(e, "languages_parents")
                    }
                  />
                  {lang}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: "block", marginTop: "15px" }}>
              Languages (Children)
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "25px" }}>
              {["English", "Mandarin", "Malay", "Cantonese"].map((lang) => (
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
                    checked={formData.languages_children?.includes(lang)}
                    onChange={(e) =>
                      handleLanguageChange(e, "languages_children")
                    }
                  />
                  {lang}
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginTop: "15px" }}>
            <label>Allergies</label>
            <textarea
              name="allergies"
              onChange={handleChange}
              value={formData.allergies}
              placeholder="Optional"
              rows={1}
              style={{ resize: "vertical" }}
            />
          </div>
          <div style={{ marginTop: "15px" }}>
            <label>Vaccination Summary</label>
            <textarea
              name="vaccination_summary"
              onChange={handleChange}
              value={formData.vaccination_summary}
              placeholder="Optional"
              rows={1}
              style={{ resize: "vertical" }}
            />
          </div>
          <div style={{ marginTop: "15px" }}>
            <label>Other Notes</label>
            <textarea
              name="other_notes"
              onChange={handleChange}
              value={formData.other_notes}
              placeholder="Optional"
              rows={2}
              style={{ resize: "vertical" }}
            />
          </div>

          {/* FINAL SUBMIT BUTTON */}
          <div
            className="form-actions"
            style={{ marginTop: "30px", display: "flex", gap: "10px" }}
          >
            <ConfirmButton
              className="btn-primary"
              onConfirm={handleSubmit}
              title="Create Patient?"
              message="Please ensure all details are correct before creating this record."
              optionLabel="Open Patient Details & Add Visit Immediately"
              defaultOptionState={true}
            >
              Save Patient
            </ConfirmButton>

            <button type="button" onClick={onCancel} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      </form>

      {/* SIBLING MODAL */}
      <SiblingSearchModal
        isOpen={showSiblingModal}
        onClose={() => setShowSiblingModal(false)}
        onSelect={(newSib) => {
          if (!siblings.find((s) => s.id === newSib.id)) {
            setSiblings([...siblings, newSib]);
          }
        }}
      />
    </div>
  );
}
