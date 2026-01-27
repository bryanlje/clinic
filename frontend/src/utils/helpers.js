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