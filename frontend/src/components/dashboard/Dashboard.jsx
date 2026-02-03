import { useState } from "react";
import axios from "axios";
import { API_URL } from "../../api/config";

import ExportMedicationModal from "../menu/ExportMedicationModal";
import ChangePinModal from "../menu/ChangePinModal";

export default function Dashboard({ onNavigateCreate, onSelectPatient }) {
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [basicQuery, setBasicQuery] = useState("");
  const [advParams, setAdvParams] = useState({
    name: "",
    display_id: "",
    address: "",
    date_registered_start: "",
    date_registered_end: "",
    visit_start: "",
    visit_end: "",
    dob_start: "",
    dob_end: "",
  });
  const [showMenu, setShowMenu] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);

  const toggleMenu = () => setShowMenu(!showMenu);

  const SEARCH_LIMIT = 25;

  const handleBasicSearch = async (e) => {
    e.preventDefault();
    if (!basicQuery.trim()) return;
    executeSearch({ query: basicQuery });
  };

  const handleAdvancedSearch = async (e) => {
    e.preventDefault();
    const activeParams = {};
    Object.keys(advParams).forEach((key) => {
      if (advParams[key]) activeParams[key] = advParams[key];
    });
    executeSearch(activeParams);
  };

  const executeSearch = async (paramsObj) => {
    setLoading(true);
    setHasSearched(true);
    try {
      const queryParams = new URLSearchParams(paramsObj);

      // Append the SEARCH_LIMIT param
      queryParams.append("limit", SEARCH_LIMIT + 1);

      const res = await axios.get(
        `${API_URL}/patients/search/?${queryParams.toString()}`,
      );
      setResults(res.data);
    } catch (err) {
      console.error(err);
      alert("Search failed");
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setBasicQuery("");
    setAdvParams({
      name: "",
      display_id: "",
      address: "",
      date_registered_start: "",
      date_registered_end: "",
      visit_start: "",
      visit_end: "",
      dob_start: "",
      dob_end: "",
    });
    setResults([]);
    setHasSearched(false);
  };

  const getLastVisitDate = (visits) => {
    if (!visits || visits.length === 0) return "N/A";

    // 1. Sort visits by date (descending: newest first)
    // 2. Pick the first one
    const sortedVisits = [...visits].sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });

    return sortedVisits[0].date;
  };

  const searchLimitReached = results.length > SEARCH_LIMIT;
  const visibleSearchResults = results.slice(0, SEARCH_LIMIT);

  return (
    <div>
      {showExportModal && (
        <ExportMedicationModal onClose={() => setShowExportModal(false)} />
      )}
      {showPinModal && (
        <ChangePinModal isOpen={true} onClose={() => setShowPinModal(false)} />
      )}
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h2>Find Patient</h2>

          {/* Grouped Right Actions */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              className="btn-secondary"
              style={{ padding: "10px 20px" }}
              onClick={() => {
                setIsAdvanced(!isAdvanced);
                setResults([]);
                setHasSearched(false);
              }}
            >
              {isAdvanced ? "Basic Search" : "Advanced Search"}
            </button>

            <div style={{ position: "relative" }}>
              <button
                className="btn-secondary"
                onClick={toggleMenu}
                style={{ padding: "10px 15px", fontWeight: "bold" }}
              >
                ☰ Menu
              </button>

              {showMenu && (
                <div className="dropdown-menu">
                  <button
                    className="menu-item"
                    onClick={() => {
                      setShowExportModal(true);
                      setShowMenu(false);
                    }}
                  >
                    📋 Export Medication Log
                  </button>

                  <button
                    className="menu-item"
                    onClick={() => {
                      setShowPinModal(true);
                      setShowMenu(false);
                    }}
                    style={{ marginTop: "auto" }} // Pushes it to bottom of sidebar often
                  >
                    🔒 Change Admin PIN
                  </button>
                  {/* Add more <button className="menu-item"> here later */}
                </div>
              )}
            </div>
          </div>
        </div>

        {!isAdvanced && (
          <form onSubmit={handleBasicSearch} className="input-group">
            <input
              value={basicQuery}
              onChange={(e) => setBasicQuery(e.target.value)}
              placeholder="Enter Name or ID..."
              autoFocus
            />
            <button type="submit" className="btn-primary" disabled={loading}>
              Search
            </button>
          </form>
        )}

        {isAdvanced && (
          <form
            onSubmit={handleAdvancedSearch}
            style={{ display: "flex", flexDirection: "column", gap: "15px" }}
          >
            <div className="input-row">
              <div style={{ flex: 2 }}>
                <label className="label-small">Name</label>
                <input
                  value={advParams.name}
                  onChange={(e) =>
                    setAdvParams({ ...advParams, name: e.target.value })
                  }
                  placeholder="Contains..."
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="label-small">Patient ID</label>
                <input
                  value={advParams.display_id}
                  onChange={(e) =>
                    setAdvParams({ ...advParams, display_id: e.target.value })
                  }
                  placeholder="Contains..."
                />
              </div>
            </div>

            <div className="input-row">
              <div style={{ flex: 1 }}>
                <label className="label-small">Address</label>
                <input
                  value={advParams.address}
                  onChange={(e) =>
                    setAdvParams({ ...advParams, address: e.target.value })
                  }
                  placeholder="Contains..."
                />
              </div>
            </div>

            <div className="input-row">
              <div
                style={{
                  flex: 1,
                  border: "1px solid #eee",
                  padding: "10px",
                  borderRadius: "8px",
                }}
              >
                <div
                  className="label-small"
                  style={{ fontWeight: "bold", marginBottom: "5px" }}
                >
                  Date of Birth
                </div>
                <div>
                  <div style={{ flex: 1 }}>
                    <label className="label-small">From</label>
                    <input
                      type="date"
                      value={advParams.dob_start}
                      onChange={(e) =>
                        setAdvParams({
                          ...advParams,
                          dob_start: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label
                      className="label-small"
                      style={{ paddingTop: "5px" }}
                    >
                      To
                    </label>
                    <input
                      type="date"
                      value={advParams.dob_end}
                      onChange={(e) =>
                        setAdvParams({ ...advParams, dob_end: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  border: "1px solid #eee",
                  padding: "10px",
                  borderRadius: "8px",
                }}
              >
                <div
                  className="label-small"
                  style={{ fontWeight: "bold", marginBottom: "5px" }}
                >
                  Visit Date
                </div>
                <div>
                  <div style={{ flex: 1 }}>
                    <label className="label-small">From</label>
                    <input
                      type="date"
                      value={advParams.visit_start}
                      onChange={(e) =>
                        setAdvParams({
                          ...advParams,
                          visit_start: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label
                      className="label-small"
                      style={{ paddingTop: "5px" }}
                    >
                      To
                    </label>
                    <input
                      type="date"
                      value={advParams.visit_end}
                      onChange={(e) =>
                        setAdvParams({
                          ...advParams,
                          visit_end: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  border: "1px solid #eee",
                  padding: "10px",
                  borderRadius: "8px",
                }}
              >
                <div
                  className="label-small"
                  style={{ fontWeight: "bold", marginBottom: "5px" }}
                >
                  Date Registered
                </div>
                <div>
                  <div style={{ flex: 1 }}>
                    <label className="label-small">From</label>
                    <input
                      type="date"
                      value={advParams.date_registered_start}
                      onChange={(e) =>
                        setAdvParams({
                          ...advParams,
                          date_registered_start: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label
                      className="label-small"
                      style={{ paddingTop: "5px" }}
                    >
                      To
                    </label>
                    <input
                      type="date"
                      value={advParams.date_registered_end}
                      onChange={(e) =>
                        setAdvParams({
                          ...advParams,
                          date_registered_end: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="input-row">
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  gap: "10px",
                  alignItems: "flex-start",
                }}
              >
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 3 }}
                  disabled={loading}
                >
                  {loading ? "Searching..." : "Apply Filters"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1 }}
                  onClick={clearAll}
                >
                  Clear
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3>
            Results{" "}
            {hasSearched &&
              (searchLimitReached
                ? `(${SEARCH_LIMIT}+)`
                : `(${results.length})`)}
          </h3>

          {/* WARNING MESSAGE if limit is hit */}
          {searchLimitReached && (
            <span
              style={{
                color: "#d9534f",
                fontSize: "0.9rem",
                fontWeight: "bold",
              }}
            >
              ⚠️ More than {SEARCH_LIMIT} results found. Please be more
              specific.
            </span>
          )}
        </div>

        {!loading && results.length === 0 && hasSearched && (
          <p style={{ color: "#888", fontStyle: "italic" }}>
            No patients found.
          </p>
        )}

        <ul className="list">
          {visibleSearchResults.map((p) => (
            <li key={p.id} className="list-item">
              <div>
                <div style={{ fontWeight: "bold", paddingBottom: "5px" }}>
                  {p.name}
                </div>
                <div style={{ fontSize: "0.9rem", color: "#666" }}>
                  ID: {p.display_id} | DOB: {p.date_of_birth} | Last Visit:{" "}
                  {getLastVisitDate(p.visits)}
                </div>
              </div>
              <button
                className="btn-secondary"
                onClick={() => onSelectPatient(p)}
              >
                Open
              </button>
            </li>
          ))}
        </ul>
      </div>

      <button onClick={onNavigateCreate} className="fab">
        + New Patient
      </button>
    </div>
  );
}
