import { useState } from "react";
import axios from "axios";
import { API_URL } from "../../api/config";

export default function ConfirmButton({
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure?",
  requiresPin = false,
  children,
  className,
  ...props
}) {
  const [isOpen, setIsOpen] = useState(false);

  // PIN State
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleClick = (e) => {
    e.preventDefault();

    // Check form validity first (if inside a form)
    const form = e.target.closest("form");
    if (form && !form.reportValidity()) {
      return;
    }

    // Reset state and open modal
    setPin("");
    setError("");
    setLoading(false);
    setIsOpen(true);
  };

  const handleConfirm = async () => {
    // 1. Standard Mode (No PIN)
    if (!requiresPin) {
      setIsOpen(false);
      onConfirm();
      return;
    }

    // 2. Security Mode (Verify PIN)
    if (!pin) {
      setError("Please enter PIN");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await axios.post(`${API_URL}/admin/verify-pin`, { pin });
      // If successful:
      setIsOpen(false);
      onConfirm();
    } catch (err) {
      setError("Incorrect PIN");
      setLoading(false);
    }
  };

  return (
    <>
      <button onClick={handleClick} className={className} {...props}>
        {children}
      </button>

      {isOpen && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-title">{title}</div>
            <p>{message}</p>

            {/* PIN Input Section */}
            {requiresPin && (
              <div style={{ marginBottom: "20px" }}>
                <input
                  type="password"
                  autoFocus
                  placeholder="Enter Admin PIN"
                  className="form-control"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  style={{
                    width: "70%",
                    textAlign: "center",
                    fontSize: "1rem",
                    padding: "10px",
                    border: error ? "1px solid red" : "1px solid #ccc",
                    borderRadius: "4px",
                  }}
                />
                {error && (
                  <div
                    style={{
                      color: "red",
                      fontSize: "0.9rem",
                      marginTop: "5px",
                    }}
                  >
                    {error}
                  </div>
                )}
              </div>
            )}

            <div className="modal-actions">
              <button
                className={requiresPin ? "btn-danger" : "btn-primary"}
                onClick={handleConfirm}
                disabled={loading}
                // Only autofocus if NO pin required (otherwise input has focus)
                autoFocus={!requiresPin}
              >
                {loading
                  ? "Verifying..."
                  : requiresPin
                    ? "Verify & Proceed"
                    : "Yes, Proceed"}
              </button>
              <button
                className="btn-secondary"
                onClick={() => setIsOpen(false)}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
