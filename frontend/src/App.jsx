import { useState } from "react";
import "./App.css";

// Components
import Dashboard from "./components/dashboard/Dashboard";
import CreatePatientForm from "./components/patients/CreatePatientForm";
import PatientDetailView from "./components/patients/PatientDetailView";
import { addRecentPatient } from "./utils/recentPatients";

function App() {
  const [view, setView] = useState("home");
  const [selectedPatient, setSelectedPatient] = useState(null);

  const goHome = () => {
    setView("home");
    setSelectedPatient(null);
  };

  return (
    <div className="container">
      {/* --- 1. GLOBAL HEADER (Branding only) --- */}
      <header className="header">
        <h1>Leong Baby & Child Clinic</h1>
      </header>

      {/* --- 2. CONTEXT NAVIGATION (Breadcrumbs/Back) --- */}
      {view !== "home" && (
        <nav className="breadcrumb-bar">
          <button onClick={goHome} className="btn-link">
            &larr; Back to Dashboard
          </button>
          {/* You could add more breadcrumbs here later, e.g. " > Patient Details" */}
        </nav>
      )}

      {/* --- 3. MAIN CONTENT --- */}
      <main className="main-content">
        {view === "home" && (
          <Dashboard
            onNavigateCreate={() => setView("createPatient")}
            onSelectPatient={(patient) => {
              addRecentPatient(patient)
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
            onSelectPatient={(patient) => setSelectedPatient(patient)}
          />
        )}
      </main>
    </div>
  );
}

export default App;