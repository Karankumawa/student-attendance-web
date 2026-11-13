/**
 * Parse standard 12-hour or 24-hour time string into minutes from midnight.
 * e.g. "09:00 AM" -> 540, "01:30 PM" -> 810, "13:30" -> 810
 */
const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const clean = timeStr.trim();
  const match = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?(?:\s*([AaPp][Mm]))?$/);
  if (!match) return 0;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const modifier = match[3] ? match[3].toUpperCase() : null;

  if (modifier === 'PM' && hours < 12) {
    hours += 12;
  } else if (modifier === 'AM' && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
};

/**
 * Sort an array of timetable class slots chronologically by startTime.
 */
const sortSlotsByTime = (slots) => {
  if (!Array.isArray(slots)) return [];
  return [...slots].sort((a, b) => {
    const timeA = parseTimeToMinutes(a.startTime);
    const timeB = parseTimeToMinutes(b.startTime);
    return timeA - timeB;
  });
};

/**
 * Get YYYY-MM-DD local date string avoiding UTC midnight shifting.
 */
const getLocalDateString = (d = new Date()) => {
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

module.exports = {
  parseTimeToMinutes,
  sortSlotsByTime,
  getLocalDateString,
};
