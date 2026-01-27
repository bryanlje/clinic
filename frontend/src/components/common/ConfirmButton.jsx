import { useState } from "react";

export default function ConfirmButton({ onConfirm, title = "Confirm Action", message = "Are you sure?", children, className, ...props }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = (e) => {
    e.preventDefault();
    const form = e.target.closest('form');
    
    if (form) {
      if (!form.reportValidity()) {
        return; 
      }
    }
    setIsOpen(true);
  };

  const handleConfirm = () => {
    setIsOpen(false);
    onConfirm(); 
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
            <div className="modal-actions">
              <button 
                className="btn-primary" 
                onClick={handleConfirm}
                autoFocus 
              >
                Yes, Proceed
              </button>
              <button 
                className="btn-secondary" 
                onClick={() => setIsOpen(false)}
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