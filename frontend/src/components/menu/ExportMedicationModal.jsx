import { useState } from "react";
import axios from "axios";
import { API_URL } from "../../api/config";

export default function ExportMedicationModal({ onClose }) {
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState("pdf"); // Option to choose format

  const handleExport = async () => {
    setLoading(true);
    try {
      // Choose endpoint based on format
      const endpoint =
        format === "pdf"
          ? `${API_URL}/reports/dispensations/export-pdf`
          : `${API_URL}/reports/dispensations/export-csv`; // Original CSV endpoint

      const response = await axios.get(endpoint, {
        params: { start_date: startDate, end_date: endDate },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      // Determine extension
      const ext = format === "pdf" ? "pdf" : "csv";
      link.setAttribute(
        "download",
        `medication_log_${startDate}_to_${endDate}.${ext}`,
      );

      document.body.appendChild(link);
      link.click();
      link.remove();

      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to export report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div
        className="modal-box"
        style={{ textAlign: "left", minWidth: "350px" }}
      >
        <h3 style={{ marginTop: 0, marginBottom: "20px" }}>
          Export Medication Log
        </h3>

        <div className="form-grid">
          <div>
            <label>From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label>To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div style={{ marginTop: "15px" }}>
          <label>Format</label>
          <div style={{ display: "flex", gap: "15px", marginTop: "5px" }}>
            <label
              style={{
                fontWeight: "normal",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <input
                type="radio"
                name="format"
                value="pdf"
                checked={format === "pdf"}
                onChange={(e) => setFormat(e.target.value)}
                style={{ width: "auto", marginRight: "5px" }}
              />
              PDF (Printable)
            </label>
            <label
              style={{
                fontWeight: "normal",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <input
                type="radio"
                name="format"
                value="csv"
                checked={format === "csv"}
                onChange={(e) => setFormat(e.target.value)}
                style={{ width: "auto", marginRight: "5px" }}
              />
              CSV (Excel)
            </label>
          </div>
        </div>

        <div
          className="modal-actions"
          style={{ justifyContent: "flex-end", gap: "10px", marginTop: "25px" }}
        >
          <button
            className="btn-primary"
            onClick={handleExport}
            disabled={loading}
          >
            {loading ? "Generating..." : "Download"}
          </button>
          <button
            className="btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
