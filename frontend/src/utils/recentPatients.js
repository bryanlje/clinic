const STORAGE_KEY = "clinic_recent_patients";
const MAX_RECENTS = 5;

export const getRecentPatients = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error reading recent patients", error);
    return [];
  }
};

export const addRecentPatient = (patient) => {
  try {
    let recents = getRecentPatients();

    // 1. Remove if already exists (to move it to the top)
    recents = recents.filter((p) => p.id !== patient.id);

    // 2. Add to the beginning of the array
    // We only save necessary fields to keep storage small
    recents.unshift({
      id: patient.id,
      name: patient.name,
      display_id: patient.display_id,
      date_of_birth: patient.date_of_birth // Optional: helpful context
    });

    // 3. Trim to max size
    if (recents.length > MAX_RECENTS) {
      recents = recents.slice(0, MAX_RECENTS);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(recents));
  } catch (error) {
    console.error("Error saving recent patient", error);
  }
};