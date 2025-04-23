/**
 * Formats an array of values as a comma-separated string
 * @param {Array} values - Array of values to format
 * @returns {string} - Comma-separated string
 */
export function formatArrayToString(values) {
  if (!values || !Array.isArray(values)) return '';
  return values.join(', ');
}

/**
 * Parses a comma-separated string into an array
 * @param {string} str - Comma-separated string
 * @returns {Array} - Array of trimmed values
 */
export function parseStringToArray(str) {
  if (!str || typeof str !== 'string') return [];
  return str.split(',').map(item => item.trim()).filter(Boolean);
}

/**
 * Generates a unique filename for a resume PDF
 * @param {string} name - Name of the person
 * @returns {string} - Unique filename
 */
export function generateUniqueFilename(name) {
  const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const timestamp = Date.now();
  return `${sanitizedName}_${timestamp}.pdf`;
}

/**
 * Validates if the uploaded file is a valid PDF
 * @param {File} file - The file to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export function isValidPdf(file) {
  if (!file) return false;
  return file.type === 'application/pdf';
}

/**
 * Formats a graduation year for display
 * @param {string|number} year - The graduation year
 * @returns {string} - Formatted year string
 */
export function formatGraduationYear(year) {
  if (!year) return '';
  return `Class of ${year}`;
}

/**
 * Truncates a string to a specified length
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} - Truncated string with ellipsis if needed
 */
export function truncateString(str, maxLength = 100) {
  if (!str || str.length <= maxLength) return str;
  return `${str.substring(0, maxLength)}...`;
}

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Debounces a function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
} 