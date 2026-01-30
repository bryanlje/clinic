import { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "../../api/config";
import ConfirmButton from "../common/ConfirmButton";

export default function VisitItem({ visit, patientId, onUpdate }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(visit);
  const [newFile, setNewFile] = useState(null);
  const [medInput, setMedInput] = useState({
    medicine_name: "",
    instructions: "",
    quantity: "",
    notes: ""
  });

  useEffect(() => {
    setEditData(visit);
    setNewFile(null);
  }, [visit]);

  const getFileUrl = (path) => {
    if (!path) return "";
    if (path.startsWith("http")) return path; // GCP/Cloud URL
    // Local URL: Remove '/api' from base URL if path is relative
    const baseUrl = API_URL.replace("/api", "");
    return `${baseUrl}${path}`;
  };

  const handleSave = async () => {
    try {
      const payload = {
        date: editData.date,
        time:
          editData.time.length === 5 ? editData.time + ":00" : editData.time,
        weight: Math.round(parseFloat(editData.weight) * 100) / 100 || 0,
        total_charge: Math.round(parseFloat(editData.total_charge) * 100) / 100 || 0,
        doctor_notes: editData.doctor_notes || "",
        dispensations: editData.dispensations.map((d) => ({
          medicine_name: d.medicine_name,
          instructions: d.instructions,
          quantity: d.quantity,
          notes: d.notes,
          is_dispensed: true,
        })),
      };

      await axios.put(`${API_URL}/visits/${visit.visit_id}`, payload);

      if (newFile) {
        const formData = new FormData();
        formData.append("file", newFile);
        await axios.post(
          `${API_URL}/visits/${visit.visit_id}/upload`,
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );
      }

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

  const handleDeleteAttachment = async (attachmentId) => {
    if (!window.confirm("Remove this attachment? This cannot be undone."))
      return;

    try {
      await axios.delete(`${API_URL}/attachments/${attachmentId}`);

      // Update local state immediately to remove it from UI
      const updatedAttachments = editData.attachments.filter(
        (a) => a.id !== attachmentId,
      );
      setEditData({ ...editData, attachments: updatedAttachments });

      // Trigger parent update (optional, but good for consistency)
      onUpdate();
    } catch (err) {
      console.error(err);
      alert("Failed to delete attachment");
    }
  };

  const addMedicine = () => {
    if (!medInput.medicine_name || !medInput.quantity) return;
    const newMed = { ...medInput, is_dispensed: true };
    setEditData({
      ...editData,
      dispensations: [...(editData.dispensations || []), newMed],
    });
    setMedInput({ medicine_name: "", instructions: "", quantity: "", notes: "" });
  };

  const removeMedicine = (index) => {
    const updated = [...editData.dispensations];
    updated.splice(index, 1);
    setEditData({ ...editData, dispensations: updated });
  };

  return (
    <li className="visit-item-container">
      <div
        className="visit-header-row"
        onClick={() => !isEditing && setIsExpanded(!isExpanded)}
        style={{ cursor: isEditing ? "default" : "pointer" }}
      >
        <span className="visit-date">{visit.date}</span>
        <span className="visit-preview">
          {isExpanded
            ? ""
            : visit.doctor_notes
              ? visit.doctor_notes.substring(0, 60) + "..."
              : "No notes"}
        </span>
        <span className="visit-charge">RM {visit.total_charge}</span>
        <span style={{ fontSize: "0.8rem", color: "#999" }}>
          {isExpanded ? "▼" : "▶"}
        </span>
      </div>

      {isExpanded && (
        <div className="visit-details-body">
          {!isEditing ? (
            <>
              <div className="detail-row">
                <strong>Time:</strong> {visit.time.slice(0, 5)} |{" "}
                <strong>Weight:</strong> {visit.weight} kg
              </div>

              {visit.attachments && visit.attachments.length > 0 && (
                <div style={{ marginTop: "15px" }}>
                  <strong>Attachments:</strong>
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      marginTop: "5px",
                      flexWrap: "wrap",
                    }}
                  >
                    {visit.attachments.map((att) => (
                      <a
                        key={att.id}
                        href={getFileUrl(att.file_path)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary"
                        style={{
                          textDecoration: "none",
                          fontSize: "0.85rem",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        📄 {att.original_filename}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="detail-row" style={{ marginTop: "15px" }}>
                <strong>Doctor's Notes:</strong>
                <p
                  style={{
                    whiteSpace: "pre-wrap",
                    marginTop: "5px",
                    color: "#333",
                  }}
                >
                  {visit.doctor_notes || "No notes recorded."}
                </p>
              </div>

              {visit.dispensations && visit.dispensations.length > 0 && (
                <div style={{ marginTop: "15px" }}>
                  <strong>Medication:</strong>
                  <ul className="medicine-display-list">
                    {visit.dispensations.map((med, i) => (
                      <li key={i}>
                        {med.medicine_name} {med.instructions} ({med.quantity}) - {med.notes}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div
                style={{
                  marginTop: "15px",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                }}
              >
                <ConfirmButton
                  className="btn-danger"
                  style={{ border: "none" }}
                  onConfirm={handleDelete}
                  title="Delete Record?"
                  message="Are you sure you want to delete this visit? This cannot be undone."
                >
                  Delete Record
                </ConfirmButton>

                <button
                  className="btn-secondary"
                  onClick={() => setIsEditing(true)}
                >
                  Edit Record
                </button>
              </div>
            </>
          ) : (
            <div className="visit-edit-form">
              <div className="form-grid">
                <div>
                  <label>Date</label>
                  <input
                    type="date"
                    value={editData.date}
                    onChange={(e) =>
                      setEditData({ ...editData, date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label>Time</label>
                  <input
                    type="time"
                    value={editData.time}
                    onChange={(e) =>
                      setEditData({ ...editData, time: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="form-grid" style={{ marginTop: "10px" }}>
                <div>
                  <label>Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editData.weight}
                    onChange={(e) =>
                      setEditData({ ...editData, weight: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label>Charge (RM)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editData.total_charge}
                    onChange={(e) =>
                      setEditData({ ...editData, total_charge: e.target.value })
                    }
                    onBlur={(e) => {
                      const rawValue = parseFloat(e.target.value);
                      if (!isNaN(rawValue)) {
                        // Rounding to exactly 2 decimal places fixes the .99 issue
                        const fixedValue = (Math.round(rawValue * 100) / 100).toFixed(2);
                        setEditData({ ...editData, total_charge: fixedValue });
                      }
                    }}
                  />
                </div>
              </div>
              <div style={{ marginTop: "15px" }}>
                <label>Attachments</label>

                {editData.attachments && editData.attachments.length > 0 && (
                  <ul
                    style={{ listStyle: "none", padding: 0, marginTop: "5px" }}
                  >
                    {editData.attachments.map((att) => (
                      <li
                        key={att.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          background: "#f1f1f1",
                          padding: "0px 10px",
                          marginBottom: "5px",
                          borderRadius: "6px",
                        }}
                      >
                        <span style={{ fontSize: "0.9rem" }}>
                          📄 {att.original_filename}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteAttachment(att.id)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#d9534f",
                            cursor: "pointer",
                            fontWeight: "bold",
                          }}
                          title="Remove attachment"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* 2. Add New Attachment */}
                <label
                  style={{
                    fontSize: "0.85rem",
                    color: "#666",
                    marginTop: "15px",
                  }}
                >
                  Add New:
                </label>
                <input
                  type="file"
                  onChange={(e) => setNewFile(e.target.files[0])}
                  style={{ display: "block", marginTop: "2px" }}
                />
              </div>

              <div style={{ marginTop: "10px" }}>
                <label>Notes</label>
                <textarea
                  rows="4"
                  value={editData.doctor_notes || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, doctor_notes: e.target.value })
                  }
                />
              </div>

              <div className="medicine-section">
                <h5 className="medicine-header">Medication</h5>
                <ul className="medicine-edit-list">
                  {(editData.dispensations || []).map((med, idx) => (
                    <li key={idx} className="medicine-edit-item">
                      <span>
                        {med.medicine_name} {med.instructions} ({med.quantity}) - {med.notes}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeMedicine(idx)}
                        className="btn-icon-danger"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>

                <div className="medicine-input-group">
                  <input
                    style={{ flex: 2 }}
                    placeholder="Item"
                    value={medInput.medicine_name}
                    onChange={(e) =>
                      setMedInput({
                        ...medInput,
                        medicine_name: e.target.value,
                      })
                    }
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
                  <input
                    style={{ flex: 1 }}
                    placeholder="Notes"
                    value={medInput.notes}
                    onChange={(e) =>
                      setMedInput({ ...medInput, notes: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    onClick={addMedicine}
                    className="btn-secondary btn-add"
                  >
                    ✔
                  </button>
                </div>
              </div>

              <div
                className="form-actions"
                style={{
                  marginTop: "15px",
                  display: "flex",
                  gap: "10px",
                  justifyContent: "flex-end",
                }}
              >
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
                  onClick={() => {
                    setIsEditing(false);
                    setEditData(visit);
                  }}
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
