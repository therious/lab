/**
 * Convert an ISO date string (UTC) to local time string in yyyy-mm-dd HH:MM:SS format
 * 
 * @param dateStr - ISO date string (e.g., "2026-01-08T14:56:49.754Z")
 * @returns Local time string in format "yyyy-mm-dd HH:MM:SS"
 */
export function dateTimeToLocal(dateStr: string): string {
  const date = new Date(dateStr);
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

