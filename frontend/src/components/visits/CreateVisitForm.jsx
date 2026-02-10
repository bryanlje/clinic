import { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "../../api/config";

import { calculateVisitAge } from "../../utils/helpers";
import InputSuggestion from "../common/InputSuggestion";

const FOLLOW_UP_OPTIONS = [
  "1 week",
  "3 days",
  "1 month",
  "PRN (As needed)",
  "Referral to Specialist",
];

export default function CreateVisitForm({ patientId, patientDOB, onSuccess }) {
  const now = new Date();
  const currentHours = String(now.getHours()).padStart(2, "0");
  const currentMinutes = String(now.getMinutes()).padStart(2, "0");
  const currentTime = `${currentHours}:${currentMinutes}`;
  const todayStr = now.toISOString().split("T")[0];
  const [isManualMC, setIsManualMC] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    date: todayStr,
    time: currentTime,
    weight: "",
    age_at_visit: calculateVisitAge(patientDOB, todayStr), // Calculated automatically
    doctor_notes: "",
    follow_up: "",

    // Charge Section
    total_charge: "",
    payment_method: "Cash", // Default
    receipt_number: "",

    // MC Section
    mc_days: 0,
    mc_start_date: todayStr,
    mc_end_date: "",
  });

  // Calculate Age whenever Date or PatientDOB changes
  useEffect(() => {
    if (patientDOB) {
      const ageStr = calculateVisitAge(patientDOB, formData.date);
      // Only update if it's different to avoid loops
      if (ageStr !== formData.age_at_visit) {
        setFormData((prev) => ({ ...prev, age_at_visit: ageStr }));
      }
    }
  }, [formData.date, patientDOB, formData.age_at_visit]);

  // --- MC Logic ---
  // 1. If Days or Start Date changes -> Calculate End Date
  const handleMCDaysChange = (days) => {
    const d = parseInt(days) || 0;

    // Always update days
    setFormData((prev) => ({ ...prev, mc_days: d }));

    // Only auto-calc End Date if NOT manual
    if (!isManualMC) {
      if (d > 0 && formData.mc_start_date) {
        const start = new Date(formData.mc_start_date);
        start.setDate(start.getDate() + (d - 1));
        setFormData((prev) => ({
          ...prev,
          mc_days: d,
          mc_end_date: start.toISOString().split("T")[0],
        }));
      } else {
        setFormData((prev) => ({ ...prev, mc_days: d, mc_end_date: "" }));
      }
    }
  };

  // 2. If End Date changes -> Calculate Days
  const handleMCEndDateChange = (endDate) => {
    // Always update End Date
    setFormData((prev) => ({ ...prev, mc_end_date: endDate }));

    // Only auto-calc Days if NOT manual
    if (!isManualMC && endDate && formData.mc_start_date) {
      const start = new Date(formData.mc_start_date);
      const end = new Date(endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setFormData((prev) => ({
        ...prev,
        mc_end_date: endDate,
        mc_days: diffDays,
      }));
    }
  };

  // Dispensation State
  const [dispensations, setDispensations] = useState([]);
  const [medInput, setMedInput] = useState({
    name: "",
    instructions: "",
    quantity: "",
    notes: "",
  });
  // Track which index is being edited (-1 means no edit)
  const [editIndex, setEditIndex] = useState(-1);

  // Save (Add or Update) Medicine
  const handleSaveMedicine = () => {
    if (!medInput.name || !medInput.quantity) {
      alert("Medicine Name and Quantity are required");
      return;
    }

    if (editIndex >= 0) {
      // UPDATE Existing
      const updatedList = [...dispensations];
      updatedList[editIndex] = { ...medInput, is_dispensed: true };
      setDispensations(updatedList);
      setEditIndex(-1); // Exit edit mode
    } else {
      // ADD New
      setDispensations([...dispensations, { ...medInput, is_dispensed: true }]);
    }

    // Clear inputs
    setMedInput({ name: "", instructions: "", quantity: "", notes: "" });
  };

  // Load Medicine into Inputs
  const handleEditMedicine = (index) => {
    const item = dispensations[index];
    setMedInput({
      name: item.name,
      instructions: item.instructions,
      quantity: item.quantity,
      notes: item.notes,
    });
    setEditIndex(index);
  };

  // Remove Medicine
  const removeMedicine = (index) => {
    setDispensations(dispensations.filter((_, i) => i !== index));
    // If we were editing this specific item, cancel edit mode
    if (index === editIndex) {
      setEditIndex(-1);
      setMedInput({ name: "", instructions: "", quantity: "", notes: "" });
    }
  };

  // Cancel Edit Mode
  const handleCancelEdit = () => {
    setEditIndex(-1);
    setMedInput({ name: "", instructions: "", quantity: "", notes: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        patient_id: patientId,
        date: formData.date,
        time: formData.time + ":00",
        weight: parseFloat(formData.weight) || 0,
        age_at_visit: formData.age_at_visit,
        doctor_notes: formData.doctor_notes,
        follow_up: formData.follow_up,

        total_charge: parseFloat(formData.total_charge) || 0,
        payment_method: formData.payment_method,
        receipt_number: formData.receipt_number,
        mc_days: parseInt(formData.mc_days) || 0,
        mc_start_date: formData.mc_days > 0 ? formData.mc_start_date : null,
        mc_end_date: formData.mc_days > 0 ? formData.mc_end_date : null,

        dispensations: dispensations.map((d) => ({
          medicine_name: d.name,
          instructions: d.instructions,
          quantity: d.quantity,
          notes: d.notes,
          is_dispensed: true,
        })),
      };

      // 2. Step 1: Create the Visit Record
      const response = await axios.post(`${API_URL}/visits/`, payload);

      // CRITICAL: Ensure your Backend POST returns the new ID (e.g. { visit_id: 123, ... })
      const newVisitId = response.data.visit_id;

      // 3. Step 2: Upload File (if selected)
      if (selectedFile && newVisitId) {
        const fileData = new FormData();
        fileData.append("file", selectedFile);

        await axios.post(`${API_URL}/visits/${newVisitId}/upload`, fileData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      onSuccess();
    } catch (err) {
      console.error(err);
      alert("Error saving visit or uploading file");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h4>New Medical Record</h4>

      <div className="section-container">
        {/* Top Row: Date & Time */}
        <div className="input-row">
          <div style={{ flex: 1 }}>
            <label>Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              required
            />
          </div>
          <div style={{ flex: 1 }}>
            <label>Time</label>
            <input
              type="time"
              value={formData.time}
              onChange={(e) =>
                setFormData({ ...formData, time: e.target.value })
              }
              required
            />
          </div>
        </div>
        {/* Second Row: Weight & Age */}
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
            <label>Age at Visit</label>
            <input
              type="text"
              value={formData.age_at_visit}
              readOnly
              style={{ backgroundColor: "#f9f9f9", color: "#555" }}
              placeholder="Calculated from DOB"
            />
          </div>
        </div>
      </div>

      {/* File Upload */}
      <div className="section-container">
        <div>
          <label>Attachment (Optional)</label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setSelectedFile(e.target.files[0])}
            style={{ display: "block", marginTop: "5px" }}
          />
          <small style={{ color: "#666" }}>Max 1 file (JPG/PNG/PDF)</small>
        </div>

        {/* Doctor Notes */}
        <div style={{ marginTop: "20px" }}>
          <label>Doctor's Notes</label>
          <textarea
            rows="8"
            placeholder="Enter here..."
            value={formData.doctor_notes}
            onChange={(e) =>
              setFormData({ ...formData, doctor_notes: e.target.value })
            }
            style={{ resize: "vertical" }}
          />
        </div>

        {/* Follow-up Dropdown */}
        <div style={{ marginTop: "10px", marginBottom: "5px" }}>
          {/* <label>Follow-up</label> */}
          <InputSuggestion
            name="follow_up"
            value={formData.follow_up}
            onChange={(e) =>
              setFormData({ ...formData, follow_up: e.target.value })
            }
            options={FOLLOW_UP_OPTIONS}
            placeholder="Select or type..."
          />
        </div>
      </div>

      {/* Medication Section */}
      <div className="section-container">
        <h5 className="section-header">Medication</h5>

        {dispensations.length > 0 && (
          <table className="medicine-table">
            <thead>
              <tr>
                <th style={{ width: "25%" }}>Item</th>
                <th style={{ width: "20%" }}>Instruction</th>
                <th style={{ width: "20%" }}>Quantity</th>
                <th style={{ width: "20%" }}>Notes</th>
                {/* <th style={{ width: '20%' }}></th> */}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {dispensations.map((med, idx) => (
                <tr
                  key={idx}
                  style={
                    editIndex === idx ? { backgroundColor: "#ebf7ff" } : {}
                  }
                >
                  <td>{med.name}</td>
                  <td>{med.instructions}</td>
                  <td>{med.quantity}</td>
                  <td>{med.notes}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {/* EDIT Button */}
                    <button
                      type="button"
                      onClick={() => handleEditMedicine(idx)}
                      className="btn-icon-edit"
                      style={{ marginRight: "8px" }}
                    >
                      ✎
                    </button>
                    {/* DELETE Button */}
                    <button
                      type="button"
                      onClick={() => removeMedicine(idx)}
                      className="btn-icon-danger"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="input-group-row">
          <input
            style={{ flex: 2 }}
            placeholder="Item"
            value={medInput.name}
            onChange={(e) => setMedInput({ ...medInput, name: e.target.value })}
          />
          <input
            style={{ flex: 1 }}
            placeholder="Instruction"
            value={medInput.instructions}
            onChange={(e) =>
              setMedInput({ ...medInput, instructions: e.target.value })
            }
          />
          <input
            style={{ flex: 1 }}
            placeholder="Quantity"
            value={medInput.quantity}
            onChange={(e) =>
              setMedInput({ ...medInput, quantity: e.target.value })
            }
          />
          <textarea
            style={{ flex: 2, resize: "vertical" }}
            placeholder="Notes"
            value={medInput.notes}
            onChange={(e) =>
              setMedInput({ ...medInput, notes: e.target.value })
            }
            rows="1"
          />
          {/* Dynamic Action Buttons */}
          {editIndex >= 0 ? (
            <>
              <button
                type="button"
                onClick={handleSaveMedicine}
                className="btn-primary btn-add"
                title="Update Entry"
              >
                ✔
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="btn-secondary"
                title="Cancel Edit"
              >
                ✕
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleSaveMedicine}
              className="btn-secondary btn-add"
              title="Add Entry"
            >
              ✔
            </button>
          )}
        </div>
      </div>

      {/* Medical Certificate (MC) Section */}
      <div className="section-container">
        {/* Header with Manual Override Checkbox */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "5px",
          }}
        >
          <h5 className="section-header" style={{ margin: 0, border: "none" }}>
            Medical Certificate (MC)
          </h5>

          <label
            style={{
              fontSize: "0.8rem",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              cursor: "pointer",
              color: "#555",
              whiteSpace: "nowrap",
              fontWeight: "normal",
            }}
          >
            <input
              type="checkbox"
              checked={isManualMC}
              onChange={(e) => setIsManualMC(e.target.checked)}
              style={{ margin: 0, width: "auto" }}
            />
            Manual Entry
          </label>
        </div>

        <div className="input-row" style={{ alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label>Days</label>
            <input
              type="number"
              min="0"
              value={formData.mc_days}
              onChange={(e) => handleMCDaysChange(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label>Start Date</label>
            <input
              type="date"
              value={formData.mc_start_date}
              onChange={(e) => {
                const newStart = e.target.value;
                if (isManualMC) {
                  // Manual: Just update Start Date
                  setFormData({ ...formData, mc_start_date: newStart });
                } else {
                  // Auto: Update Start Date AND Recalc End Date
                  setFormData((prev) => {
                    const newState = { ...prev, mc_start_date: newStart };
                    if (prev.mc_days > 0 && newStart) {
                      const start = new Date(newStart);
                      start.setDate(start.getDate() + (prev.mc_days - 1));
                      newState.mc_end_date = start.toISOString().split("T")[0];
                    }
                    return newState;
                  });
                }
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label>End Date</label>
            <input
              type="date"
              value={formData.mc_end_date}
              onChange={(e) => handleMCEndDateChange(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Charge Section */}
      <div className="section-container">
        <h5 className="section-header">Charge</h5>
        <div className="input-row">
          <div style={{ flex: 1 }}>
            <label>Total Charge (RM)</label>
            <input
              type="number"
              step="0.01"
              value={formData.total_charge}
              onChange={(e) =>
                setFormData({ ...formData, total_charge: e.target.value })
              }
            />
          </div>
          <div style={{ flex: 1 }}>
            <label>Receipt No.</label>
            <input
              type="text"
              value={formData.receipt_number}
              onChange={(e) =>
                setFormData({ ...formData, receipt_number: e.target.value })
              }
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", marginBottom: "5px" }}>
              Payment Method
            </label>
            <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
              <label className="radio-label">
                <input
                  type="radio"
                  name="payment"
                  value="Cash"
                  checked={formData.payment_method === "Cash"}
                  onChange={(e) =>
                    setFormData({ ...formData, payment_method: e.target.value })
                  }
                />{" "}
                Cash
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="payment"
                  value="TnG"
                  checked={formData.payment_method === "TnG"}
                  onChange={(e) =>
                    setFormData({ ...formData, payment_method: e.target.value })
                  }
                />{" "}
                TnG
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="payment"
                  value="Online"
                  checked={formData.payment_method === "Online"}
                  onChange={(e) =>
                    setFormData({ ...formData, payment_method: e.target.value })
                  }
                />{" "}
                Online
              </label>
            </div>
          </div>
        </div>
      </div>

      <button
        type="submit"
        className="btn-primary"
        style={{ marginTop: "20px", width: "100%" }}
      >
        Save Record
      </button>
    </form>
  );
}
