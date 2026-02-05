import { useState } from "react";
import axios from "axios";
import { API_URL } from "../../api/config";

export default function SiblingSearchModal({ isOpen, onClose, onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      // Use existing search endpoint
      const res = await axios.get(`${API_URL}/patients/search/?query=${query}&limit=5`);
      setResults(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: '400px', minHeight: '400px', display: "flex", flexDirection: "column" }}>
        <div className="modal-title">Find Sibling</div>
        
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', padding: '10px 0px' }}>
            <input 
                className="form-control" 
                placeholder="Search Name or ID..." 
                value={query} onChange={e => setQuery(e.target.value)}
                autoFocus
            />
            <button type="submit" className="btn-primary" disabled={loading}>Search</button>
        </form>

        <div style={{ maxHeight: '450px', overflowY: 'auto' }}>
            {results.map(p => (
                <div key={p.id} style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 0px', borderBottom: '1px solid #eee'
                }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', overflow: "hidden", flex: 1 }}>
                        {/* Name: Truncates if too long */}
                        <div style={{ 
                            fontSize: "1rem",
                            fontWeight: 'bold', 
                            whiteSpace: 'nowrap', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis' 
                        }}>
                            {p.name}
                        </div>
                        
                        {/* ID: Never shrinks */}
                        <div style={{ 
                            fontSize: '1rem', 
                            color: '#666', 
                            whiteSpace: 'nowrap', 
                            flexShrink: 0 
                        }}>
                            ({p.display_id})
                        </div>
                    </div>
                    <button className="btn-secondary" onClick={() => { onSelect(p); onClose(); }} style={{ flexShrink: 0, marginLeft: '15px' }}>
                        Select
                    </button>
                </div>
            ))}
            {results.length === 0 && query && !loading && (
                <p style={{textAlign: 'center', color: '#888', marginTop: '20px'}}>No patients found</p>
            )}
        </div>

        <div className="modal-actions" style={{marginTop: 'auto'}}>
            <button className="btn-secondary" onClick={onClose} style={{width: '100%', marginTop: '20px'}}>Cancel</button>
        </div>
      </div>
    </div>
  );
}