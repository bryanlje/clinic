import { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "../../api/config";

import { calculateVisitAge } from "../../utils/helpers";

export default function CreateVisitForm({ patientId, patientDOB, onSuccess }) {
  const now = new Date();
  const currentHours = String(now.getHours()).padStart(2, '0');
  const currentMinutes = String(now.getMinutes()).padStart(2, '0');
  const currentTime = `${currentHours}:${currentMinutes}`;
  const todayStr = now.toISOString().split("T")[0];

  const [selectedFile, setSelectedFile] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    date: todayStr,
    time: currentTime,
    weight: "",
    age_at_visit: calculateVisitAge(patientDOB, todayStr), // Calculated automatically
    doctor_notes: "",
    
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
            setFormData(prev => ({ ...prev, age_at_visit: ageStr }));
        }
    }
  }, [formData.date, patientDOB, formData.age_at_visit]);

  // --- MC Logic ---
  // 1. If Days or Start Date changes -> Calculate End Date
  const handleMCDaysChange = (days) => {
    const d = parseInt(days) || 0;
    if (d > 0 && formData.mc_start_date) {
        const start = new Date(formData.mc_start_date);
        start.setDate(start.getDate() + (d - 1)); // -1 because 1 day includes start date
        setFormData(prev => ({
            ...prev,
            mc_days: d,
            mc_end_date: start.toISOString().split('T')[0]
        }));
    } else {
        setFormData(prev => ({ ...prev, mc_days: d, mc_end_date: "" }));
    }
  };

  // 2. If End Date changes -> Calculate Days
  const handleMCEndDateChange = (endDate) => {
      if (endDate && formData.mc_start_date) {
          const start = new Date(formData.mc_start_date);
          const end = new Date(endDate);
          const diffTime = Math.abs(end - start);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
          setFormData(prev => ({
              ...prev,
              mc_end_date: endDate,
              mc_days: diffDays
          }));
      } else {
          setFormData(prev => ({ ...prev, mc_end_date: endDate }));
      }
  };

  // Dispensation State
  const [dispensations, setDispensations] = useState([]);
  const [medInput, setMedInput] = useState({ name: "", instructions: "", quantity: "", notes: "" });

  const addMedicine = () => {
    if (!medInput.name || !medInput.quantity) {
      alert("Medicine Name and Quantity are required");
      return;
    }
    setDispensations([...dispensations, { ...medInput, is_dispensed: true }]);
    setMedInput({ name: "", instructions: "", quantity: "", notes: "" }); // Reset inputs
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
        age_at_visit: formData.age_at_visit,
        doctor_notes: formData.doctor_notes,
        
        total_charge: parseFloat(formData.total_charge) || 0,
        payment_method: formData.payment_method,
        receipt_number: formData.receipt_number,
        mc_days: parseInt(formData.mc_days) || 0,
        mc_start_date: formData.mc_days > 0 ? formData.mc_start_date : null,
        mc_end_date: formData.mc_days > 0 ? formData.mc_end_date : null,

        dispensations: dispensations.map(d => ({
            medicine_name: d.name,
            instructions: d.instructions,
            quantity: d.quantity,
            notes: d.notes,
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

      {/* Top Row: Date & Time */}
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

      {/* File Upload */}
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
        />
      </div>

      {/* Medication Section */}
      <div className="section-container">
        <h5 className="section-header">Medication</h5>
        
        {dispensations.length > 0 && (
          <table className="medicine-table">
            <thead>
              <tr>
                <th style={{ width: '35%' }}>Item</th>
                <th style={{ width: '20%' }}>Instruction</th>
                <th style={{ width: '20%' }}>Quantity</th>
                <th style={{ width: '20%' }}>Notes</th>
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
                  <td>{med.notes}</td>
                  <td style={{textAlign: 'center'}}>
                    <button type="button" onClick={() => removeMedicine(idx)} className="btn-icon-danger">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="input-group-row">
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
          <textarea 
            style={{flex: 2}}
            placeholder="Notes" 
            value={medInput.notes} 
            onChange={e => setMedInput({...medInput, notes: e.target.value})}
            rows="1"
          />
          <button type="button" onClick={addMedicine} className="btn-secondary btn-add">✔</button>
        </div>
      </div>

      {/* Medical Certificate (MC) Section */}
      <div className="section-container">
        <h5 className="section-header">Medical Certificate (MC)</h5>
        <div className="input-row" style={{ alignItems: 'flex-end' }}>
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
                        // Resetting start date recalculates end date based on current "Days" value
                        setFormData({ ...formData, mc_start_date: e.target.value });
                        // Trigger recalculation if days exist
                        if(formData.mc_days > 0) {
                            const start = new Date(e.target.value);
                            start.setDate(start.getDate() + (formData.mc_days - 1));
                            setFormData(prev => ({ ...prev, mc_start_date: e.target.value, mc_end_date: start.toISOString().split('T')[0] }));
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
                    onChange={(e) => setFormData({ ...formData, total_charge: e.target.value })}
                />
            </div>
            <div style={{ flex: 1 }}>
                <label>Receipt No.</label>
                <input
                    type="text"
                    value={formData.receipt_number}
                    onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
                />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{display: 'block', marginBottom: '5px'}}>Payment Method</label>
              <div style={{ display: 'flex', gap: '20px', alignItems: "center" }}>
                  <label className="radio-label">
                      <input 
                          type="radio" 
                          name="payment" 
                          value="Cash"
                          checked={formData.payment_method === "Cash"}
                          onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })} 
                      /> Cash
                  </label>
                  <label className="radio-label">
                      <input 
                          type="radio" 
                          name="payment" 
                          value="TnG"
                          checked={formData.payment_method === "TnG"}
                          onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })} 
                      /> TnG
                  </label>
                  <label className="radio-label">
                      <input 
                          type="radio" 
                          name="payment" 
                          value="Online"
                          checked={formData.payment_method === "Online"}
                          onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })} 
                      /> Online
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