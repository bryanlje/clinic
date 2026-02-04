import { Routes, Route, useNavigate, useLocation } from "react-router-dom"; // Import Router hooks
import "./App.css";

// Components
import Dashboard from "./components/dashboard/Dashboard";
import CreatePatientForm from "./components/patients/CreatePatientForm";
import PatientDetailView from "./components/patients/PatientDetailView";
import { addRecentPatient } from "./utils/recentPatients";

function App() {
  const navigate = useNavigate(); // Used to change URL programmatically
  const location = useLocation(); // Used to know where we are

  // Helper to go home (replaces your old goHome function)
  const goHome = () => navigate("/");

  return (
    <div className="container">
      {/* --- 1. GLOBAL HEADER --- */}
      <header className="header">
        <h1>Leong Baby & Child Clinic</h1>
      </header>

      {/* --- 2. CONTEXT NAVIGATION --- */}
      {/* Show Back button if NOT on the home page */}
      {location.pathname !== "/" && (
        <nav className="breadcrumb-bar">
          <button onClick={goHome} className="btn-link">
            &larr; Back to Dashboard
          </button>
        </nav>
      )}

      {/* --- 3. MAIN CONTENT (ROUTER) --- */}
      <main className="main-content">
        <Routes>
          {/* HOME PAGE */}
          <Route
            path="/"
            element={
              <Dashboard
                onNavigateCreate={() => navigate("/create")}
                onSelectPatient={(patient) => {
                  addRecentPatient(patient);
                  navigate(`/patient/${patient.id}`); // URL Change!
                }}
              />
            }
          />

          {/* CREATE PATIENT PAGE */}
          <Route
            path="/create"
            element={<CreatePatientForm onSuccess={goHome} onCancel={goHome} />}
          />

          {/* PATIENT DETAIL PAGE (Dynamic ID) */}
          <Route
            path="/patient/:id"
            element={<PatientDetailWrapper onBack={goHome} />}
          />
        </Routes>
      </main>
    </div>
  );
}

// --- HELPER COMPONENT ---
// We need this wrapper to extract the 'id' from the URL
// and pass it to PatientDetailView
import { useParams } from "react-router-dom";

function PatientDetailWrapper({ onBack }) {
  const { id } = useParams(); // Read ID from URL (e.g. /patient/123)
  const navigate = useNavigate();

  return (
    <PatientDetailView
      patientId={id}
      onBack={onBack}
      // When clicking a sibling, we just navigate to the new URL
      onSelectPatient={(p) => navigate(`/patient/${p.id}`)}
    />
  );
}

export default App;
