import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = import.meta.env.DEV ? "http://localhost:8000/api" : "/api";

function App() {
  const [view, setView] = useState('home'); 
  const [selectedPatient, setSelectedPatient] = useState(null);

  const goHome = () => {
    setView('home');
    setSelectedPatient(null);
  };

  return (
    <div className="container">
      <header className="header">
        <h1 style={{marginRight: '25px'}}>🏥 Leong Baby & Child Clinic</h1>
        {view !== 'home' && (
          <button onClick={goHome} className="nav-btn">← Back to Dashboard</button>
        )}
      </header>

      {view === 'home' && (
        <Dashboard 
          onNavigateCreate={() => setView('createPatient')}
          onSelectPatient={(patient) => {
            setSelectedPatient(patient);
            setView('patientDetails');
          }}
        />
      )}

      {view === 'createPatient' && (
        <CreatePatientForm onSuccess={goHome} onCancel={goHome} />
      )}

      {view === 'patientDetails' && selectedPatient && (
        <PatientDetailView patientId={selectedPatient.id} />
      )}
    </div>
  );
}

// --- SUB-COMPONENTS ---

function Dashboard({ onNavigateCreate, onSelectPatient }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Auto-search logic can be added here, but manual is fine for now
  const handleSearch = async (e) => {
    e.preventDefault(); // Prevent form submit refresh
    if (!searchTerm) return;
    
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/patients/search/?name=${searchTerm}`);
      setResults(res.data);
    } catch (err) {
      alert("Error searching patients");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="card">
        <h2>Find Patient</h2>
        <form onSubmit={handleSearch} className="input-group">
          <input 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            placeholder="Enter patient name or ID..."
            autoFocus
          />
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      <div className="card">
        <h3>Results</h3>
        {results.length === 0 ? (
          <p style={{color: '#888', fontStyle: 'italic'}}>No patients found or no search performed.</p>
        ) : (
          <ul className="list">
            {results.map(p => (
              <li key={p.id} className="list-item">
                <div>
                  <div style={{fontWeight: 'bold', fontSize: '1.1rem'}}>{p.name}</div>
                  <div style={{fontSize: '0.9rem', color: '#666'}}>ID: {p.id} | DOB: {p.date_of_birth}</div>
                </div>
                <button className="btn-secondary" onClick={() => onSelectPatient(p)}>Open File</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button onClick={onNavigateCreate} className="fab">+ New Patient</button>
    </div>
  );
}

function CreatePatientForm({ onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    id: '', name: '', date_of_birth: '', address: '', phone_number_primary: '', phone_number_secondary: '',
  });

  const handleChange = (e) => {
    setFormData({...formData, [e.target.name]: e.target.value});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // API expects languages as a list
      const payload = { ...formData, languages: ["English"] };
      await axios.post(`${API_URL}/patients/`, payload);
      alert("Patient Record Created Successfully");
      onSuccess();
    } catch (err) {
      console.error(err);
      alert("Error creating patient. Ensure ID is unique.");
    }
  };

  const handleLanguageChange = (e) => {
  const { value, checked } = e.target;
  const currentLanguages = formData.languages || [];

  if (checked) {
    // User checked the box: Add it to the array
    setFormData({ 
      ...formData, 
      languages: [...currentLanguages, value] 
    });
  } else {
    // User unchecked the box: Remove it from the array
    setFormData({ 
      ...formData, 
      languages: currentLanguages.filter((lang) => lang !== value) 
    });
  }
};

  return (
    <div>
      <div className="card">
        <h2>Register New Patient</h2>
        <form onSubmit={handleSubmit}>
          <div style={{marginTop: '15px'}}>
            <label>Patient ID</label>
            <input name="id" onChange={handleChange} required />
          </div>
          <div style={{marginTop: '15px'}}>
            <label>Full Name</label>
            <input name="name" onChange={handleChange} required />
          </div>
          <div style={{marginTop: '15px'}}>
            <label>Date of Birth</label>
            <input type="date" name="date_of_birth" onChange={handleChange} required />
          </div>
          <div className="form-grid" style={{marginTop: '15px'}}>
            <div>
              <label>Phone Number 1</label>
              <input name="phone_number_primary" onChange={handleChange} required />
            </div>
            <div>
              <label>Phone Number 2</label>
              <input name="phone_number_secondary" onChange={handleChange} placeholder='Optional'/>
            </div>
          </div>
      
          <div style={{marginTop: '15px'}}>
            <label>Address</label>
            <input name="address" onChange={handleChange} required />
          </div>
      
          {/* <div className="form-actions" style={{marginTop: '20px', display: 'flex', gap: '10px'}}>
            <button type="submit" className="btn-primary">Save Patient</button>
            <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
          </div> */}
        </form>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-grid" >
            <div>
              <label>Father's Name</label>
              <input name="father_name" onChange={handleChange} required />
            </div>
            <div>
              <label>Father's Occupation</label>
              <input name="father_occupation" onChange={handleChange} required />
            </div>
          </div>
      
          <div className="form-grid" style={{marginTop: '15px'}}>
            <div>
              <label>Mothers's Name</label>
              <input name="mother_name" onChange={handleChange} required />
            </div>
            <div>
              <label>Mother's Occupation</label>
              <input name="mother_occupation" onChange={handleChange} required />
            </div>
          </div>

          <div style={{marginTop: '15px'}}>
            <label>Para</label>
            <input name="para" onChange={handleChange} placeholder='Optional'/>
          </div>
      
          {/* <div className="form-actions" style={{marginTop: '20px', display: 'flex', gap: '10px'}}>
            <button type="submit" className="btn-primary">Save Patient</button>
            <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
          </div> */}
        </form>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-grid" style={{gridTemplateColumns: '0.7fr 1fr'}}>
            <div>
              <label>Hospital</label>
              <input name="hospital" onChange={handleChange} placeholder='Optional'/>
            </div>

            <div>
              <label style={{ marginBottom: '10px', display: 'block' }}>Delivery Method</label>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                {["SVD", "LSCS", "Forceps", "Vac", "Breech"].map((method) => (
                  <label key={method} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="delivery"
                      value={method}
                      onChange={handleChange}
                      // If want a default selected, check logic here:
                      // checked={formData.delivery === method}
                    />
                    {method}
                  </label>
                ))}
              </div>
            </div>
            
          </div>

          <div className="form-grid" style={{gridTemplateColumns: '1fr 1fr 1fr', marginTop: '15px'}}>
            <div>
              <label>Birth Weight (kg)</label>
              <input name="birth_weight_kg" onChange={handleChange} placeholder='Optional' />
            </div>
            <div>
              <label>Length (cm)</label>
              <input name="birth_length_cm" onChange={handleChange} placeholder='Optional' />
            </div>
            <div>
              <label>OFC (cm)</label>
              <input name="birth_ofc_cm" onChange={handleChange} placeholder='Optional' />
            </div>
          </div>

          <div className="form-grid" style={{gridTemplateColumns: '0.7fr 1fr', marginTop: '15px'}}>
            <div>
              <label style={{ marginBottom: '10px', display: 'block' }}>G6PD</label>
              <div style={{ display: 'flex', gap: '50px', flexWrap: 'wrap' }}>
                {["Normal", "Deficient"].map((method) => (
                  <label key={method} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="g6pd"
                      value={method}
                      onChange={handleChange}
                      // If want a default selected, check logic here:
                      // checked={formData.delivery === method}
                    />
                    {method}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label>TSH (mlU/L)</label>
              <input name="tsh_mlul" onChange={handleChange} placeholder='Optional' />
            </div>
            
          </div>

          <div style={{ marginTop: '10px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>Feeding</label>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '50px' }}>
              
              {/* Option A: Breast */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="feeding_mode" // Just for UI grouping
                  checked={formData.feeding === 'Breast'} 
                  onChange={() => setFormData({ ...formData, feeding: 'Breast' })}
                />
                Breast
              </label>

              {/* Option B: Formula + Text Input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="feeding_mode"
                    // Checked if it's NOT Breast (and optionally ensure it's not null)
                    checked={formData.feeding !== 'Breast'} 
                    onChange={() => setFormData({ ...formData, feeding: '' })} 
                  />
                  Formula:
                </label>

                {/* The Text Input */}
                {formData.feeding !== 'Breast' && (
                  <input 
                    name="feeding"
                    value={formData.feeding}
                    onChange={handleChange}
                    placeholder=""
                    style={{ width: '180px', padding: '6px' }}
                    required // Forces them to type something if "Formula" is selected
                  />
                )}
              </div>

            </div>
          </div>
      
          {/* <div className="form-actions" style={{marginTop: '20px', display: 'flex', gap: '10px'}}>
            <button type="submit" className="btn-primary">Save Patient</button>
            <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
          </div> */}
        </form>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div>
            <label style={{ display: 'block', marginBottom: '10px' }}>Languages</label>            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'space-between' }}>
              {["English", "Mandarin", "Malay", "Cantonese", "Hokkien"].map((lang) => (
                <label key={lang} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    value={lang}
                    // Check if this language is currently in the array
                    checked={formData.languages?.includes(lang)}
                    onChange={handleLanguageChange}
                  />
                  {lang}
                </label>
              ))}
            </div>
          </div>

          <div style={{marginTop: '15px'}}>
            <label>Allergies</label>
            <input name="allergies" onChange={handleChange} placeholder='Optional'/>
          </div>

          <div style={{marginTop: '15px'}}>
            <label>Vaccination Summary</label>
            <input name="vaccination_summary" onChange={handleChange} placeholder='Optional'/>
          </div>

          <div style={{marginTop: '15px'}}>
            <label>Other Notes</label>
            <input name="other_notes" onChange={handleChange} placeholder='Optional'/>
          </div>
      
          <div className="form-actions" style={{marginTop: '30px', display: 'flex', gap: '10px'}}>
            <button type="submit" className="btn-primary">Save Patient</button>
            <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PatientDetailView({ patientId }) {
  const [patient, setPatient] = useState(null);
  const [showVisitForm, setShowVisitForm] = useState(false);

  const fetchPatient = async () => {
    try {
      const res = await axios.get(`${API_URL}/patients/${patientId}`);
      setPatient(res.data);
    } catch (err) {
      alert("Error loading patient details");
    }
  };

  useEffect(() => {
    fetchPatient();
  }, [patientId]);

  if (!patient) return <div style={{textAlign: 'center', padding: '20px'}}>Loading Record...</div>;

  return (
    <div>
      <div className="detail-grid">
        {/* Left Column: Personal Info */}
        <div>
          <div className="card">
            <h3>{patient.name}</h3>
            <p><strong>ID:</strong> {patient.id}</p>
            <p><strong>DOB:</strong> {patient.date_of_birth}</p>
            <p><strong>Phone:</strong> {patient.phone_number_primary}</p>
            <p><strong>Address:</strong><br/>{patient.address}</p>
          </div>
        </div>
        
        {/* Right Column: Visits */}
        <div className="card">
          <div className="visit-header">
            <h3>Medical History</h3>
            <button 
              className={showVisitForm ? "btn-secondary" : "btn-success"}
              onClick={() => setShowVisitForm(!showVisitForm)}
            >
              {showVisitForm ? "Cancel Entry" : "+ Add Visit"}
            </button>
          </div>
          
          {showVisitForm && (
            <div style={{marginBottom: '20px', paddingBottom: '20px', borderBottom: '2px dashed #eee'}}>
              <CreateVisitForm 
                patientId={patient.id} 
                onSuccess={() => {
                  setShowVisitForm(false);
                  fetchPatient(); 
                }} 
              />
            </div>
          )}

          {(!patient.visits || patient.visits.length === 0) ? (
            <p>No previous visits recorded.</p>
          ) : (
            <ul className="visit-list">
              {patient.visits.map(v => (
                <li key={v.visit_id} className="visit-item">
                  <span className="visit-date">{v.date}</span>
                  <span className="visit-note">{v.doctor_notes || "No notes entered"}</span>
                  <span className="visit-charge">RM {v.total_charge}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateVisitForm({ patientId, onSuccess }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    weight: '',
    doctor_notes: '',
    total_charge: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Ensure numbers are numbers, not strings
      const payload = {
        patient_id: patientId,
        date: formData.date,
        time: formData.time + ":00", // Add seconds for standard Time format
        weight: parseFloat(formData.weight) || 0,
        total_charge: parseFloat(formData.total_charge) || 0,
        doctor_notes: formData.doctor_notes
      };

      await axios.post(`${API_URL}/visits/`, payload);
      onSuccess();
    } catch (err) {
      console.error(err);
      alert("Error saving visit");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h4>New Consultation Entry</h4>
      <div className="input-row">
        <div style={{flex: 1}}>
            <label>Date</label>
            <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
        </div>
        <div style={{flex: 1}}>
            <label>Time</label>
            <input type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} required />
        </div>
      </div>
      <div className="input-row">
        <div style={{flex: 1}}>
            <label>Weight (kg)</label>
            <input type="number" step="0.1" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} required />
        </div>
        <div style={{flex: 1}}>
            <label>Charge (RM)</label>
            <input type="number" step="0.01" value={formData.total_charge} onChange={e => setFormData({...formData, total_charge: e.target.value})} />
        </div>
      </div>
      <div style={{marginTop: '10px'}}>
        <label>Doctor's Notes</label>
        <textarea 
            rows="3"
            placeholder="Diagnosis, treatment details..." 
            value={formData.doctor_notes}
            onChange={e => setFormData({...formData, doctor_notes: e.target.value})}
        />
      </div>
      <button type="submit" className="btn-primary" style={{marginTop: '10px', width: '100%'}}>Save Record</button>
    </form>
  );
}

export default App;