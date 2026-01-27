import { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "../../api/config";
import ConfirmButton from "../common/ConfirmButton";

export default function VisitItem({ visit, patientId, onUpdate }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(visit);

  useEffect(() => {
    setEditData(visit);
  }, [visit]);

  const handleSave = async () => {
    try {
      const payload = {
        date: editData.date,
        time: editData.time.length === 5 ? editData.time + ":00" : editData.time,
        weight: parseFloat(editData.weight) || 0,
        total_charge: parseFloat(editData.total_charge) || 0,
        doctor_notes: editData.doctor_notes || ""
      };

      await axios.put(`${API_URL}/visits/${visit.visit_id}`, payload);
      alert("Visit updated successfully!");
      setIsEditing(false);
      onUpdate(); 
    } catch (err) {
      console.error(err);
      alert(`Failed to update: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API_URL}/visits/${visit.visit_id}`);
      onUpdate(); 
    } catch (err) {
      console.error(err);
      alert("Failed to delete visit.");
    }
  };

  return (
    <li className="visit-item-container">
      <div 
        className="visit-header-row" 
        onClick={() => !isEditing && setIsExpanded(!isExpanded)}
        style={{ cursor: isEditing ? 'default' : 'pointer' }}
      >
        <span className="visit-date">{visit.date}</span>
        <span className="visit-preview">
            {isExpanded ? "" : (visit.doctor_notes ? visit.doctor_notes.substring(0, 60) + "..." : "No notes")}
        </span>
        <span className="visit-charge">RM {visit.total_charge}</span>
        <span style={{fontSize: '0.8rem', color: '#999'}}>
            {isExpanded ? "▼" : "▶"}
        </span>
      </div>

      {isExpanded && (
        <div className="visit-details-body">
          {!isEditing ? (
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
              <div style={{marginTop: '15px', display: 'flex', justifyContent: 'flex-end', gap: '10px'}}>
                <ConfirmButton
                  className="btn-danger"
                  style={{ border: 'none' }}
                  onConfirm={handleDelete}
                  title="Delete Record?"
                  message="Are you sure you want to delete this visit? This cannot be undone."
                >
                  Delete Record
                </ConfirmButton>

                <button className="btn-secondary" onClick={() => setIsEditing(true)}>
                    Edit Record
                </button>
              </div>
            </>
          ) : (
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