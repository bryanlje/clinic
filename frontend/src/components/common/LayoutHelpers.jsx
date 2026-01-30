export const Section = ({ title, children }) => (
  <div style={{ marginBottom: "10px" }}>
    <h4
      style={{
        borderBottom: "1px solid #eee",
        paddingBottom: "5px",
        color: "#004cd8",
        marginBottom: "10px",
      }}
    >
      {title}
    </h4>
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "5px" }}>
      {children}
    </div>
  </div>
);

export const Row = ({ label, value }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "100px 1fr",
      fontSize: "0.95rem",
    }}
  >
    <span style={{ fontWeight: "600", color: "#555" }}>{label}:</span>
    <span style={{ color: "#333" }}>{value}</span>
  </div>
);