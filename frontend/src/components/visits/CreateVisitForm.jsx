import { useState } from "react";
import axios from "axios";
import { API_URL } from "../../api/config";

export default function CreateVisitForm({ patientId, onSuccess }) {
  const now = new Date();
  const currentHours = String(now.getHours()).padStart(2, '0');
  const currentMinutes = String(now.getMinutes()).padStart(2, '0');
  const currentTime = `${currentHours}:${currentMinutes}`;

  const [selectedFile, setSelectedFile] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    time: currentTime,
    weight: "",
    doctor_notes: "",
    total_charge: "",
  });

  // Dispensation State
  const [dispensations, setDispensations] = useState([]);
  const [medInput, setMedInput] = useState({ name: "", instructions: "", quantity: "" });

  const addMedicine = () => {
    if (!medInput.name || !medInput.quantity) {
      alert("Medicine Name and Quantity are required");
      return;
    }
    setDispensations([...dispensations, { ...medInput, is_dispensed: true }]);
    setMedInput({ name: "", instructions: "", quantity: "" }); // Reset inputs
  };

  const removeMedicine = (index) => {
    setDispensations(dispensations.filter((_, i) => i !== index));
  };

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
        dispensations: dispensations.map(d => ({
            medicine_name: d.name,
            instructions: d.instructions,
            quantity: d.quantity,
            is_dispensed: true
        }))
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
        <label>Attachment (Optional)</label>
        <input 
            type="file" 
            accept="image/*,.pdf"
            onChange={(e) => setSelectedFile(e.target.files[0])}
            style={{ display: 'block', marginTop: '5px' }}
        />
        <small style={{color: '#666'}}>Max 1 file (JPG/PNG/PDF)</small>
      </div>
      
      <div style={{ marginTop: "20px" }}>
        <label>Doctor's Notes</label>
        <textarea
          rows="6"
          placeholder="Enter here..."
          value={formData.doctor_notes}
          onChange={(e) =>
            setFormData({ ...formData, doctor_notes: e.target.value })
          }
        />
      </div>

      <div className="medicine-section">
        <h5 className="medicine-header">Medication</h5>
        
        {dispensations.length > 0 && (
          <table className="medicine-table">
            <thead>
              <tr>
                <th style={{ width: '45%' }}>Item</th>
                <th style={{ width: '25%' }}>Instruction</th>
                <th style={{ width: '20%' }}>Quantity</th>
                {/* <th style={{ width: '20%' }}></th> */}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {dispensations.map((med, idx) => (
                <tr key={idx}>
                  <td>{med.name}</td>
                  <td>{med.instructions}</td>
                  <td>{med.quantity}</td>
                  <td style={{textAlign: 'center'}}>
                    <button type="button" onClick={() => removeMedicine(idx)} className="btn-icon-danger">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="medicine-input-group">
          <input 
            style={{flex: 2}}
            placeholder="Item" 
            value={medInput.name} 
            onChange={e => setMedInput({...medInput, name: e.target.value})}
          />
          <input 
            style={{flex: 1}}
            placeholder="Instruction" 
            value={medInput.instructions} 
            onChange={e => setMedInput({...medInput, instructions: e.target.value})}
          />
          <input 
            style={{flex: 1}}
            placeholder="Quantity" 
            value={medInput.quantity} 
            onChange={e => setMedInput({...medInput, quantity: e.target.value})}
          />
          <button type="button" onClick={addMedicine} className="btn-secondary btn-add">✔</button>
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