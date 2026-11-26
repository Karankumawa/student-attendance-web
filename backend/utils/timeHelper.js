/**
 * Validate standard 12-hour (e.g. "09:00 AM") or 24-hour (e.g. "13:30") time string.
 */
const isValidTimeFormat = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return false;
  const clean = timeStr.trim();
  const match = clean.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([AaPp][Mm]))?$/);
  if (!match) return false;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = match[3] ? parseInt(match[3], 10) : 0;
  const modifier = match[4] ? match[4].toUpperCase() : null;

  if (minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) return false;
  if (modifier) {
    return hours >= 1 && hours <= 12;
  }
  return hours >= 0 && hours <= 23;
};

/**
 * Validate YYYY-MM-DD date string.
 */
const isValidDateFormat = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  const dateObj = new Date(year, month - 1, day);
  return (
    dateObj.getFullYear() === year &&
    dateObj.getMonth() === month - 1 &&
    dateObj.getDate() === day
  );
};

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
  isValidTimeFormat,
  isValidDateFormat,
  parseTimeToMinutes,
  sortSlotsByTime,
  getLocalDateString,
};
