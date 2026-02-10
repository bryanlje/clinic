import { useState, useRef, useEffect } from "react";

export default function InputSuggestion({
  name,
  value,
  onChange,
  options = [],
  placeholder = "Type or select...",
  num_rows = "1"
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);

  // Close dropdown if clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const handleSelect = (text) => {
    // 1. Send the text to the parent form
    onChange({ target: { name, value: text } });

    // 2. Close the list
    setShowSuggestions(false);
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        onFocus={() => setShowSuggestions(true)}
        autoComplete="off"
        className="input"
        placeholder={placeholder}
        style={{ width: "100%", resize: "vertical" }}
        rows={num_rows}
      />

      {showSuggestions && options.length > 0 && (
        <ul
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            border: "1px solid #ccc",
            borderTop: "none",
            backgroundColor: "white",
            zIndex: 1000,
            listStyle: "none",
            padding: 0,
            margin: 0,
            maxHeight: "150px",
            overflowY: "auto",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            borderRadius: "6px",
          }}
        >
          {options.map((opt, index) => (
            <li
              key={index}
              onClick={() => handleSelect(opt)}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                borderBottom:
                  index === options.length - 1 ? "none" : "1px solid #eee",
                fontSize: "0.9rem",
                color: "#333",
              }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#f0f0f0")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "white")}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
