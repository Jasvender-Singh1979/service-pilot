/**
 * IST Date Helpers - Shared logic for IST business date calculations
 * 
 * Core principle: IST is UTC+5:30 (fixed offset)
 * We convert UTC timestamps to IST using explicit offset math (no toLocaleString)
 * This ensures consistency across all platforms and timezones.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // IST = UTC + 5:30 hours

/**
 * Get the calendar date in IST for a given UTC timestamp
 * Returns YYYY-MM-DD format representing the IST calendar date
 * 
 * @param utcDate - Date object in UTC (e.g., new Date() which is UTC)
 * @returns YYYY-MM-DD string representing the IST calendar date
 */
export function getCalendarDateIST(utcDate: Date): string {
  const istTime = utcDate.getTime() + IST_OFFSET_MS;
  const istDate = new Date(istTime);
  
  const year = istDate.getUTCFullYear();
  const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(istDate.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Get IST time components (hours, minutes, seconds) for a given UTC timestamp
 * Uses explicit offset math instead of toLocaleString
 * 
 * @param utcDate - Date object in UTC
 * @returns { hours, minutes, seconds } in IST
 */
export function getTimeComponentsIST(utcDate: Date): {
  hours: string;
  minutes: string;
  seconds: string;
} {
  const istTime = utcDate.getTime() + IST_OFFSET_MS;
  const istDate = new Date(istTime);
  
  const hours = String(istDate.getUTCHours()).padStart(2, '0');
  const minutes = String(istDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(istDate.getUTCSeconds()).padStart(2, '0');
  
  return { hours, minutes, seconds };
}

/**
 * Format a UTC timestamp as HH:MM:SS in IST
 * 
 * @param utcDate - Date object in UTC
 * @returns Time string in HH:MM:SS format representing IST time
 */
export function formatTimeIST(utcDate: Date): string {
  const { hours, minutes, seconds } = getTimeComponentsIST(utcDate);
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Format a UTC timestamp as YYYY-MM-DD HH:MM:SS in IST
 * 
 * @param utcDate - Date object in UTC
 * @returns DateTime string in YYYY-MM-DD HH:MM:SS format representing IST
 */
export function formatDateTimeIST(utcDate: Date): string {
  const date = getCalendarDateIST(utcDate);
  const time = formatTimeIST(utcDate);
  return `${date} ${time}`;
}

/**
 * Check if a check-in time (UTC ISO string) is on time or late based on cutoff (HH:MM in IST)
 * 
 * @param checkInUTCISO - ISO string of check-in timestamp (UTC)
 * @param cutoffTimeIST - Cutoff time in HH:MM format (24-hour, IST timezone)
 * @returns "on_time", "late", or null if no cutoff configured
 */
export function checkTimeliness(
  checkInUTCISO: string,
  cutoffTimeIST: string | null
): string | null {
  if (!cutoffTimeIST) return null;

  try {
    const checkInDate = new Date(checkInUTCISO);
    const { hours, minutes } = getTimeComponentsIST(checkInDate);
    const checkInTimeIST = `${hours}:${minutes}`;

    // String comparison works for HH:MM in 24-hour format
    // "09:30" <= "10:00" → true (on time)
    // "10:15" <= "10:00" → false (late)
    return checkInTimeIST <= cutoffTimeIST ? 'on_time' : 'late';
  } catch (error) {
    console.error('[checkTimeliness] Error:', error);
    return null;
  }
}

/**
 * Compare two dates to see if they fall on the same IST calendar day
 * Used for same-day check-in/check-out validation
 * 
 * @param utcDate1 - First Date object in UTC
 * @param utcDate2 - Second Date object in UTC
 * @returns true if both dates are on the same IST calendar day
 */
export function isSameDayIST(utcDate1: Date, utcDate2: Date): boolean {
  const date1 = getCalendarDateIST(utcDate1);
  const date2 = getCalendarDateIST(utcDate2);
  return date1 === date2;
}

/**
 * Get the date range (start and end dates) in IST format for reporting
 * Ensures consistent date range calculations across different timezones
 * 
 * @param startDateIST - Start date in YYYY-MM-DD format (IST calendar date)
 * @param endDateIST - End date in YYYY-MM-DD format (IST calendar date)
 * @returns { startDate, endDate, totalDays }
 */
export function getDateRangeIST(startDateIST: string, endDateIST: string): {
  startDate: string;
  endDate: string;
  totalDays: number;
} {
  const startParts = startDateIST.split('-').map(Number);
  const endParts = endDateIST.split('-').map(Number);
  
  // Create dates at midnight IST (which is -5:30 from UTC midnight)
  // We need UTC dates: IST midnight = UTC 18:30 previous day
  const startUTC = new Date(
    Date.UTC(startParts[0], startParts[1] - 1, startParts[2], 0, 0, 0) - IST_OFFSET_MS
  );
  const endUTC = new Date(
    Date.UTC(endParts[0], endParts[1] - 1, endParts[2], 0, 0, 0) - IST_OFFSET_MS
  );
  
  const dayDiffTime = Math.abs(endUTC.getTime() - startUTC.getTime());
  const totalDays = Math.floor(dayDiffTime / (1000 * 60 * 60 * 24)) + 1;
  
  return {
    startDate: startDateIST,
    endDate: endDateIST,
    totalDays,
  };
}
