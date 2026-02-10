import { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "../../api/config";

import ConfirmButton from "../common/ConfirmButton";
import { calculateVisitAge } from "../../utils/helpers";
import InputSuggestion from "../common/InputSuggestion";
import { FOLLOW_UP_OPTIONS } from "../../utils/constants";

export default function VisitItem({ visit, patientId, patientDOB, onUpdate }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(visit);
  const [newFile, setNewFile] = useState(null);
  const [isManualMC, setIsManualMC] = useState(false);

  // Medication Input State
  const [medInput, setMedInput] = useState({
    medicine_name: "",
    instructions: "",
    quantity: "",
    notes: "",
  });

  const [medEditIndex, setMedEditIndex] = useState(-1);

  // Sync state when prop updates
  useEffect(() => {
    setEditData(visit);
    setNewFile(null);
  }, [visit]);

  // Recalculate Age if Visit Date changes in Edit Mode
  useEffect(() => {
    if (isEditing && patientDOB && editData.date) {
      const newAge = calculateVisitAge(patientDOB, editData.date);
      if (newAge !== editData.age_at_visit) {
        setEditData((prev) => ({ ...prev, age_at_visit: newAge }));
      }
    }
  }, [editData.date, patientDOB, isEditing]);

  // Check if MC days calculation is manual mode
  useEffect(() => {
    setEditData(visit);
    setNewFile(null);

    // Check if current data implies a manual override (Logic: Days != DateRange)
    if (visit.mc_start_date && visit.mc_end_date && visit.mc_days) {
      const start = new Date(visit.mc_start_date);
      const end = new Date(visit.mc_end_date);
      const diffTime = Math.abs(end - start);
      const calculatedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      // If saved days differ from calculated days, enable manual mode automatically
      if (visit.mc_days !== calculatedDays) {
        setIsManualMC(true);
      } else {
        setIsManualMC(false);
      }
    }
  }, [visit]);

  const getFileUrl = (path) => {
    if (!path) return "";
    if (path.startsWith("http")) return path; // GCP/Cloud URL
    // Local URL: Remove '/api' from base URL if path is relative
    const baseUrl = API_URL.replace("/api", "");
    return `${baseUrl}${path}`;
  };

  // --- Helper: MC Logic for Edit Mode ---
  const handleMCDaysChange = (days) => {
    const d = parseInt(days) || 0;

    // Always update the 'days' field
    setEditData((prev) => ({ ...prev, mc_days: d }));

    // Only auto-calculate End Date if NOT in manual mode
    if (!isManualMC) {
      const currentStartDate = editData.mc_start_date || editData.date;
      if (d > 0 && currentStartDate) {
        const start = new Date(currentStartDate);
        start.setDate(start.getDate() + (d - 1));
        setEditData((prev) => ({
          ...prev,
          mc_days: d,
          mc_start_date: currentStartDate,
          mc_end_date: start.toISOString().split("T")[0],
        }));
      } else {
        setEditData((prev) => ({ ...prev, mc_end_date: "" }));
      }
    }
  };

  const handleMCEndDateChange = (endDate) => {
    // Always update the 'end_date' field
    setEditData((prev) => ({ ...prev, mc_end_date: endDate }));

    // Only auto-calculate Days if NOT in manual mode
    if (!isManualMC && endDate && editData.mc_start_date) {
      const start = new Date(editData.mc_start_date);
      const end = new Date(endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setEditData((prev) => ({ ...prev, mc_days: diffDays }));
    }
  };

  const toggleManualMC = (e) => {
    const isChecked = e.target.checked;
    setIsManualMC(isChecked);

    // Optional: If unchecking (going back to auto), force a recalculation immediately?
    // Usually safer to just leave values as-is until user touches them.
  };

  const handleSave = async () => {
    try {
      const payload = {
        patient_id: patientId,
        date: editData.date,
        time:
          editData.time.length === 5 ? editData.time + ":00" : editData.time,
        weight: Math.round(parseFloat(editData.weight) * 100) / 100 || 0,
        age_at_visit: editData.age_at_visit, // Preserving the snapshot string
        doctor_notes: editData.doctor_notes || "",
        follow_up: editData.follow_up || "",

        // Financials
        total_charge:
          Math.round(parseFloat(editData.total_charge) * 100) / 100 || 0,
        payment_method: editData.payment_method,
        receipt_number: editData.receipt_number,

        // MC
        mc_days: parseInt(editData.mc_days) || 0,
        mc_start_date:
          parseInt(editData.mc_days) > 0 && editData.mc_start_date
            ? editData.mc_start_date
            : null,
        mc_end_date:
          parseInt(editData.mc_days) > 0 && editData.mc_end_date
            ? editData.mc_end_date
            : null,

        // Medicines
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
          { headers: { "Content-Type": "multipart/form-data" } },
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

  // --- MEDICATION HANDLERS ---
  const handleSaveMedicine = () => {
    if (!medInput.medicine_name || !medInput.quantity) return;

    if (medEditIndex >= 0) {
      // UPDATE Existing
      const updatedList = [...(editData.dispensations || [])];
      updatedList[medEditIndex] = { ...medInput, is_dispensed: true };
      setEditData({ ...editData, dispensations: updatedList });
      setMedEditIndex(-1);
    } else {
      // ADD New
      const newMed = { ...medInput, is_dispensed: true };
      setEditData({
        ...editData,
        dispensations: [...(editData.dispensations || []), newMed],
      });
    }
    setMedInput({
      medicine_name: "",
      instructions: "",
      quantity: "",
      notes: "",
    });
  };

  const handleEditMedicine = (index) => {
    const item = editData.dispensations[index];
    setMedInput({
      medicine_name: item.medicine_name,
      instructions: item.instructions || "",
      quantity: item.quantity,
      notes: item.notes || "",
    });
    setMedEditIndex(index);
  };

  const removeMedicine = (index) => {
    const updated = [...(editData.dispensations || [])];
    updated.splice(index, 1);
    setEditData({ ...editData, dispensations: updated });
    // If editing this item, cancel edit
    if (index === medEditIndex) {
      setMedEditIndex(-1);
      setMedInput({
        medicine_name: "",
        instructions: "",
        quantity: "",
        notes: "",
      });
    }
  };

  const handleCancelMedEdit = () => {
    setMedEditIndex(-1);
    setMedInput({
      medicine_name: "",
      instructions: "",
      quantity: "",
      notes: "",
    });
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
            /* ================= VIEW MODE ================= */
            <>
              {/* Clinical Summary */}
              <div className="detail-row">
                <strong>Time:</strong> {visit.time.slice(0, 5)} &nbsp;|&nbsp;{" "}
                <strong>Weight:</strong> {visit.weight} kg &nbsp;|&nbsp;{" "}
                <strong>Age:</strong> {visit.age_at_visit || "N/A"}
              </div>

              {/* Attachments */}
              {visit.attachments && visit.attachments.length > 0 && (
                <div
                  style={{
                    marginTop: "10px",
                    paddingTop: "10px",
                    borderTop: "1px dashed #ccc",
                  }}
                >
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

              {/* Doctor Notes */}
              <div
                className="detail-row"
                style={{
                  marginTop: "10px",
                  paddingTop: "10px",
                  borderTop: "1px dashed #ccc",
                }}
              >
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
                <p
                  style={{
                    whiteSpace: "pre-wrap",
                    marginTop: "10px",
                    color: "#333",
                  }}
                >
                  {visit.follow_up || ""}
                </p>
              </div>

              {/* Medicines */}
              {visit.dispensations && visit.dispensations.length > 0 && (
                <div
                  style={{
                    marginTop: "10px",
                    paddingTop: "10px",
                    borderTop: "1px dashed #ccc",
                  }}
                >
                  <strong>Medication:</strong>
                  <ul className="medicine-display-list">
                    {visit.dispensations.map((med, i) => (
                      <li key={i}>
                        {med.medicine_name} {med.instructions} ({med.quantity})
                        {med.notes ? ` - ${med.notes}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* MC Section */}
              {visit.mc_days > 0 && (
                <div
                  style={{
                    marginTop: "10px",
                    paddingTop: "10px",
                    borderTop: "1px dashed #ccc",
                  }}
                >
                  <strong>MC: </strong>
                  {visit.mc_days} days ({visit.mc_start_date} to{" "}
                  {visit.mc_end_date})
                </div>
              )}

              {/* Financial Section */}
              <div
                style={{
                  marginTop: "10px",
                  paddingTop: "10px",
                  borderTop: "1px dashed #ccc",
                }}
              >
                <strong>Total Charge:</strong> RM{" "}
                {visit.total_charge?.toFixed(2)} &nbsp;|&nbsp;{" "}
                <strong>Receipt No.:</strong> {visit.receipt_number || "NA"}{" "}
                &nbsp;|&nbsp; <strong>Payment Method:</strong>{" "}
                {visit.payment_method || "NA"}
              </div>

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
                  requiresPin={true}
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
            /* ================= EDIT MODE ================= */
            <div className="visit-edit-form">
              {/* Date / Time / Weight / Age Row */}
              <div className="section-container" style={{ marginTop: "0px" }}>
                <div className="input-row">
                  <div style={{ flex: 1 }}>
                    <label>Date</label>
                    <input
                      type="date"
                      value={editData.date}
                      onChange={(e) =>
                        setEditData({ ...editData, date: e.target.value })
                      }
                    />
                  </div>
                  <div style={{ flex: 1 }}>
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
                <div className="input-row">
                  <div style={{ flex: 1 }}>
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
                  <div style={{ flex: 1 }}>
                    <label>Age (Snapshot)</label>
                    <input
                      type="text"
                      value={editData.age_at_visit}
                      readOnly
                      style={{ backgroundColor: "#f0f0f0", color: "#666" }}
                    />
                  </div>
                </div>
              </div>

              {/* Attachments Section */}
              <div className="section-container">
                <div>
                  <label>Attachments</label>
                  {editData.attachments && editData.attachments.length > 0 && (
                    <ul
                      style={{
                        listStyle: "none",
                        padding: 0,
                        marginTop: "5px",
                      }}
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
                      marginTop: "10px",
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
                  <label>Doctor's Notes</label>
                  <textarea
                    rows="8"
                    value={editData.doctor_notes || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, doctor_notes: e.target.value })
                    }
                    style={{ resize: "vertical" }}
                  />
                </div>
                <div style={{ marginTop: "10px", marginBottom: "5px" }}>
                  {/* <label>Follow-up</label> */}
                  <InputSuggestion
                    name="follow_up"
                    value={editData.follow_up || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, follow_up: e.target.value })
                    }
                    options={FOLLOW_UP_OPTIONS}
                    placeholder="Select or type..."
                    num_rows="2"
                  />
                </div>
              </div>

              {/* Medication Section */}
              <div className="section-container">
                <h5 className="section-header">Medication</h5>
                <ul className="medicine-edit-list">
                  {(editData.dispensations || []).map((med, idx) => (
                    <li
                      key={idx}
                      className="medicine-edit-item"
                      style={
                        medEditIndex === idx
                          ? { backgroundColor: "#ebf7ff" }
                          : {}
                      }
                    >
                      <span>
                        {med.medicine_name} {med.instructions} ({med.quantity})
                        {med.notes ? ` - ${med.notes}` : ""}
                      </span>
                      <div style={{ display: "flex", gap: "5px" }}>
                        <button
                          type="button"
                          onClick={() => handleEditMedicine(idx)}
                          className="btn-icon-edit"
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          onClick={() => removeMedicine(idx)}
                          className="btn-icon-danger"
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="input-group-row">
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
                  <textarea
                    style={{ flex: 1, resize: "vertical" }}
                    placeholder="Notes"
                    value={medInput.notes}
                    onChange={(e) =>
                      setMedInput({ ...medInput, notes: e.target.value })
                    }
                    rows={"1"}
                  />
                  {medEditIndex >= 0 ? (
                    <>
                      <button
                        type="button"
                        onClick={handleSaveMedicine}
                        className="btn-primary btn-add"
                        title="Update"
                      >
                        ✔
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelMedEdit}
                        className="btn-secondary"
                        title="Cancel"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSaveMedicine}
                      className="btn-secondary btn-add"
                      title="Add"
                    >
                      ✔
                    </button>
                  )}
                </div>
              </div>

              {/* MC Section */}
              <div className="section-container">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "5px",
                  }}
                >
                  <h5
                    className="section-header"
                    style={{ margin: 0, border: "none" }}
                  >
                    Medical Certificate (MC)
                  </h5>

                  {/* MANUAL OVERRIDE CHECKBOX */}
                  <label
                    style={{
                      fontSize: "0.8rem",
                      display: "flex",
                      alignItems: "center",
                      marginBottom: "0px",
                      gap: "5px",
                      whiteSpace: "nowrap",
                      fontWeight: "normal",
                      cursor: "pointer",
                      color: "#555",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isManualMC}
                      onChange={toggleManualMC}
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
                      value={editData.mc_days || 0}
                      onChange={(e) => handleMCDaysChange(e.target.value)}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label>Start Date</label>
                    <input
                      type="date"
                      value={editData.mc_start_date || ""}
                      onChange={(e) => {
                        // If Manual, just update Start Date. If Auto, update Start + Recalc End Date
                        const newStart = e.target.value;
                        if (isManualMC) {
                          setEditData((prev) => ({
                            ...prev,
                            mc_start_date: newStart,
                          }));
                        } else {
                          setEditData((prev) => {
                            const newState = {
                              ...prev,
                              mc_start_date: newStart,
                            };
                            // Trigger recalculation logic manually or reuse logic
                            if (prev.mc_days > 0 && newStart) {
                              const start = new Date(newStart);
                              start.setDate(
                                start.getDate() + (prev.mc_days - 1),
                              );
                              newState.mc_end_date = start
                                .toISOString()
                                .split("T")[0];
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
                      value={editData.mc_end_date || ""}
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
                      value={editData.total_charge}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          total_charge: e.target.value,
                        })
                      }
                      onBlur={(e) => {
                        const raw = parseFloat(e.target.value);
                        if (!isNaN(raw))
                          setEditData({
                            ...editData,
                            total_charge: (Math.round(raw * 100) / 100).toFixed(
                              2,
                            ),
                          });
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label>Receipt No.</label>
                    <input
                      type="text"
                      value={editData.receipt_number || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          receipt_number: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block" }}>Payment Method</label>
                    <div
                      style={{ display: "flex", gap: "20px", marginTop: "5px" }}
                    >
                      {["Cash", "TnG", "Online"].map((method) => (
                        <label key={method} className="radio-label">
                          <input
                            type="radio"
                            name={`payment-${visit.visit_id}`} // Unique name per visit item
                            value={method}
                            checked={editData.payment_method === method}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                payment_method: e.target.value,
                              })
                            }
                          />{" "}
                          {method}
                        </label>
                      ))}
                    </div>
                  </div>
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
