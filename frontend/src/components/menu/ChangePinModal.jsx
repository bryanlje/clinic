import { useState } from "react";
import axios from "axios";
import { API_URL } from "../../api/config";

export default function ChangePinModal({ isOpen, onClose }) {
  const [step, setStep] = useState(1); // 1 = Form, 2 = Success
  const [formData, setFormData] = useState({
    current_pin: "",
    new_pin: "",
    confirm_pin: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    if (formData.new_pin.length < 4) {
        setError("New PIN must be at least 4 digits");
        return;
    }
    if (formData.new_pin !== formData.confirm_pin) {
        setError("New PINs do not match");
        return;
    }
    if (formData.new_pin === formData.current_pin) {
        setError("New PIN cannot be the same as the old one");
        return;
    }

    setLoading(true);

    try {
      // API Call
      await axios.put(`${API_URL}/admin/change-pin`, {
        current_pin: formData.current_pin,
        new_pin: formData.new_pin
      });
      
      setStep(2); // Show Success Message
    } catch (err) {
      // Handle "Incorrect Current PIN" or generic errors
      const msg = err.response?.data?.detail || "Failed to update PIN";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset state when closing
    setStep(1);
    setFormData({ current_pin: "", new_pin: "", confirm_pin: "" });
    setError("");
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: '350px' }}>
        
        {step === 1 ? (
          /* --- STEP 1: CHANGE PIN FORM --- */
          <form onSubmit={handleSubmit}>
            <div className="modal-title" style={{paddingBottom: "10px"}}>Change Admin PIN</div>
            
            <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '0.85rem', color: '#666' }}>Current PIN</label>
                <input 
                    type="password" name="current_pin"
                    className="form-control" autoFocus
                    value={formData.current_pin} onChange={handleChange}
                    style={{ letterSpacing: '3px', textAlign: 'center' }}
                    required
                />
            </div>

            <div style={{ borderTop: '1px dashed #ddd', margin: '15px 0' }}></div>

            <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '0.85rem', color: '#666' }}>New PIN</label>
                <input 
                    type="password" name="new_pin"
                    className="form-control"
                    value={formData.new_pin} onChange={handleChange}
                    style={{ letterSpacing: '3px', textAlign: 'center' }}
                    required
                />
            </div>
            <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '0.85rem', color: '#666' }}>Confirm New PIN</label>
                <input 
                    type="password" name="confirm_pin"
                    className="form-control"
                    value={formData.confirm_pin} onChange={handleChange}
                    style={{ letterSpacing: '3px', textAlign: 'center' }}
                    required
                />
            </div>

            {error && <div style={{ color: 'red', fontSize: '0.9rem', marginBottom: '15px', textAlign: 'center' }}>{error}</div>}

            <div className="modal-actions" style={{paddingTop: "10px"}}>
                <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? "Updating..." : "Update PIN"}
                </button>
                <button type="button" className="btn-secondary" onClick={handleClose}>
                    Cancel
                </button>
            </div>
          </form>
        ) : (
          /* --- STEP 2: SUCCESS MESSAGE --- */
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>✅</div>
            <h4>Success!</h4>
            <p>Your Admin PIN has been updated.</p>
            <button className="btn-primary" onClick={handleClose} style={{ marginTop: '15px', width: '100%' }}>
                Close
            </button>
          </div>
        )}

      </div>
    </div>
  );
}