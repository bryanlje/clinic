export function calculateAge(dobString) {
  if (!dobString) return "";
  
  const dob = new Date(dobString);
  const today = new Date();
  
  let years = today.getFullYear() - dob.getFullYear();
  let months = today.getMonth() - dob.getMonth();

  // If the current month is before the birth month, subtract a year
  // and add 12 months to the difference
  if (months < 0 || (months === 0 && today.getDate() < dob.getDate())) {
    years--;
    months += 12;
  }
  
  // Adjust if we are in the same month but the day hasn't passed yet
  if (today.getDate() < dob.getDate()) {
    months--;
  }

  return `${years}Y ${months}M`;
}

// Helper to calculate Age String (e.g., "10Y 5M")
export function calculateVisitAge(dobString, visitDateString) {
  if (!dobString || !visitDateString) return "";
  const dob = new Date(dobString);
  const visit = new Date(visitDateString);
  
  let years = visit.getFullYear() - dob.getFullYear();
  let months = visit.getMonth() - dob.getMonth();
  
  if (months < 0 || (months === 0 && visit.getDate() < dob.getDate())) {
    years--;
    months += 12;
  }
  // Adjust months if days are effectively negative in the partial month
  if (visit.getDate() < dob.getDate()) {
     months--;
  }
  // normalize
  if (months < 0) {
      months += 12;
      years--; 
  }
  
  return `${years}Y ${months}M`;
};