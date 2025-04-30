// utils/projectNumber.js

/**
 * Returns a string like "PROJ-20250429-4F7Q"
 *  - date in YYYYMMDD
 *  - 4-char uppercase alphanumeric suffix
 */

export function generateProjectNumber() {
    // Date part YYYYMMDD
    const datePart = new Date().toISOString().slice(0,10).replace(/-/g, '');
  
    // Random 4 characters (A–Z0–9)
    const suffix = Array(4)
      .fill(0)
      .map(() => Math.random().toString(36).charAt(2).toUpperCase())
      .join('');
  
    return `PROJ-${datePart}-${suffix}`;
  }
  