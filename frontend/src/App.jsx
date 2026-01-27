import { useState } from "react";
import "./App.css";

// Components
import Dashboard from "./components/dashboard/Dashboard";
import CreatePatientForm from "./components/patients/CreatePatientForm";
import PatientDetailView from "./components/patients/PatientDetailView";

function App() {
  const [view, setView] = useState("home");
  const [selectedPatient, setSelectedPatient] = useState(null);

  const goHome = () => {
    setView("home");
    setSelectedPatient(null);
  };

  return (
    <div className="container">
      <header className="header">
        <h1 style={{ marginRight: "25px" }}>🏥 Leong Baby & Child Clinic</h1>
        {view !== "home" && (
          <button onClick={goHome} className="nav-btn">
            ← Back to Dashboard
          </button>
        )}
      </header>

      {view === "home" && (
        <Dashboard
          onNavigateCreate={() => setView("createPatient")}
          onSelectPatient={(patient) => {
            setSelectedPatient(patient);
            setView("patientDetails");
          }}
        />
      )}

      {view === "createPatient" && (
        <CreatePatientForm onSuccess={goHome} onCancel={goHome} />
      )}

      {view === "patientDetails" && selectedPatient && (
        <PatientDetailView 
          patientId={selectedPatient.id} 
          onBack={goHome} 
        />
      )}
    </div>
  );
}

export default App;