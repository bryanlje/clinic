import { useState } from "react";
import axios from "axios";
import { API_URL } from "../../api/config";

export default function BackupDatabaseModal({ isOpen, onClose }) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleDownload = async (e) => {
    e.preventDefault();
    if (!pin) {
      setError("Please enter the PIN");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await axios.get(`${API_URL}/system/backup`, {
        responseType: "blob", // IMPORTANT: Tell Axios this is a file
        params: { pin: pin }, // Send PIN to backend
      });

      // --- Success: Trigger Download ---
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;

      // Generate filename
      const date = new Date().toISOString().slice(0, 10);
      link.setAttribute("download", `clinic_backup_${date}.sql`);

      document.body.appendChild(link);
      link.click();
      link.remove();

      onClose(); // Close modal on success
      alert("Backup downloaded successfully!");
    } catch (err) {
      console.error(err);
      
      // Handle Blob Error (Hidden JSON)
      if (err.response && err.response.data instanceof Blob) {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const errorData = JSON.parse(reader.result);
                // If backend returns 401/403 for wrong PIN
                setError(errorData.detail || "Invalid PIN or Server Error");
            } catch (e) {
                setError("Failed to download backup.");
            }
        };
        reader.readAsText(err.response.data);
      } else {
        setError("Network error or server down.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: "350px" }}>
        <div className="modal-title">Admin Access Required</div>
        <p style={{ paddingBottom: "15px", color: "#666" }}>
          Please enter the Admin PIN to authorise the database backup download.
        </p>

        <form onSubmit={handleDownload}>
          <div style={{ marginBottom: "20px", textAlign: "center" }}>
            <input
              type="password"
              value={pin}
              autoFocus
              onChange={(e) => {
                setPin(e.target.value);
                setError(""); // Clear error on type
              }}
              placeholder="Enter PIN"
              className="form-control"
              style={{
                textAlign: "center",
                fontSize: "1rem",
                width: "180px",
                padding: "10px",
              }}
              maxLength={6}
            />
            {error && (
              <div style={{ color: "#d32f2f", marginTop: "10px", fontWeight: "bold" }}>
                {error}
              </div>
            )}
          </div>

          <div className="modal-actions" style={{ paddingTop: "20px" }}>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Downloading..." : "Confirm & Download"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}