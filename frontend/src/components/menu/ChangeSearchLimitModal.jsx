import { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "../../api/config";

export default function ChangeSearchLimitModal({
  isOpen,
  onClose,
  currentLimit,
  onSave,
}) {
  const [limit, setLimit] = useState(currentLimit);
  const [loading, setLoading] = useState(false);

  // Sync internal state if prop changes
  useEffect(() => {
    setLimit(currentLimit);
  }, [currentLimit]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Save to backend
      await axios.put(`${API_URL}/config/search_limit`, {
        value: String(limit),
      });

      // Update parent state
      onSave(parseInt(limit));
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to update limit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: "300px" }}>
        <div className="modal-title">Search Results Limit</div>
        <p style={{ paddingBottom: "10px" }}>
          Set the maximum number of patients to display per search.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "30px", textAlign: "center" }}>
            <input
              type="number"
              min="1"
              max="200"
              value={limit}
              autoFocus
              onChange={(e) => setLimit(e.target.value)}
              className="form-control"
              style={{
                textAlign: "center",
                fontSize: "1.2rem",
                width: "100px",
                padding: "10px",
              }}
            />
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Saving..." : "Save"}
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
