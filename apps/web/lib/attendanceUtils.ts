/**
 * Shared attendance utility functions used by both manager dashboard and full attendance report.
 * Ensures consistent timeliness calculation across all endpoints.
 */

/**
 * Check if a check-in time is on time or late based on cutoff time in IST.
 * 
 * @param checkInISO - ISO string of check-in timestamp
 * @param cutoffTime - Cutoff time in HH:MM format (24-hour, IST timezone)
 * @returns "on_time", "late", or null if no cutoff configured
 */
export function checkTimeliness(checkInISO: string, cutoffTime: string | null): string | null {
  if (!cutoffTime) return null;

  try {
    // Parse check-in time to IST
    const checkInDate = new Date(checkInISO);
    const checkInHHMM = checkInDate.toLocaleTimeString('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    // Compare HH:MM strings (lexicographic works for 24-hour time)
    return checkInHHMM <= cutoffTime ? 'on_time' : 'late';
  } catch {
    return null;
  }
}
