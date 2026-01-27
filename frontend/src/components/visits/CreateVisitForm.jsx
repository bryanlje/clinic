import { useState } from "react";
import axios from "axios";
import { API_URL } from "../../api/config";

export default function CreateVisitForm({ patientId, onSuccess }) {
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
      const payload = {
        patient_id: patientId,
        date: formData.date,
        time: formData.time + ":00",
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