/**
 * CRITICAL: Centralized date handling system using IST (Asia/Kolkata) timezone
 * 
 * Core Rules:
 * 1. All timestamps MUST be stored in UTC in the database
 * 2. All date calculations (today, start/end of day, filters) MUST use IST
 * 3. No component should independently calculate date boundaries
 * 4. This utility is the ONLY place where timezone conversion happens
 * 
 * USAGE EXAMPLE:
 *   const today = getStartOfTodayIST();  // Get start of today in IST (as UTC for DB)
 *   const range = getWeekRangeIST();     // Get week start and end (as UTC for DB)
 */

const TIMEZONE = 'Asia/Kolkata';

/**
 * Get current time as seen in IST timezone
 * Returns a Date object representing the current moment in IST
 * This is used internally for calculations - NOT for DB storage
 * 
 * Uses a safer approach: extract year, month, day, hour, minute, second separately
 * and construct a proper Date object without parsing locale strings
 */
function getNowIST(): Date {
  const utcDate = new Date();
  
  // Extract components using Intl.DateTimeFormat for reliable timezone conversion
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(utcDate);
  const values: { [key: string]: string } = {};
  
  parts.forEach(part => {
    if (part.type !== 'literal') {
      values[part.type] = part.value;
    }
  });
  
  const year = parseInt(values.year, 10);
  const month = parseInt(values.month, 10);
  const day = parseInt(values.day, 10);
  const hour = parseInt(values.hour, 10);
  const minute = parseInt(values.minute, 10);
  const second = parseInt(values.second, 10);
  
  // Validate all values are numbers
  if (
    isNaN(year) || isNaN(month) || isNaN(day) ||
    isNaN(hour) || isNaN(minute) || isNaN(second)
  ) {
    console.error('[getNowIST] Invalid date components:', { year, month, day, hour, minute, second });
    // Fallback: return current UTC date (this shouldn't happen but prevents NaN-NaN-NaN)
    return utcDate;
  }
  
  // Construct a Date in UTC that represents the IST time
  // This is a representation, not a direct UTC conversion
  const istDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  
  return istDate;
}

/**
 * Get today's date as YYYY-MM-DD string in IST timezone
 * Used for date range calculations
 * 
 * CRITICAL GUARD: Validates the result is never NaN-NaN-NaN
 */
function getTodayDateStringIST(): string {
  const now = getNowIST();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  const result = `${year}-${month}-${day}`;
  
  // Guard: Detect NaN-NaN-NaN pattern
  if (result === 'NaN-NaN-NaN' || isNaN(year) || isNaN(parseInt(month, 10)) || isNaN(parseInt(day, 10))) {
    console.error('[getTodayDateStringIST] CRITICAL: Date string construction failed', {
      year,
      month,
      day,
      result,
      now,
      nowString: now.toString(),
      nowISO: now.toISOString(),
    });
    // Fallback to UTC today (should never reach here with fixed getNowIST)
    const utcNow = new Date();
    const fallbackYear = utcNow.getUTCFullYear();
    const fallbackMonth = String(utcNow.getUTCMonth() + 1).padStart(2, '0');
    const fallbackDay = String(utcNow.getUTCDate()).padStart(2, '0');
    return `${fallbackYear}-${fallbackMonth}-${fallbackDay}`;
  }
  
  return result;
}

/**
 * Convert an IST date string (YYYY-MM-DD) to UTC timestamps for DB range queries
 * Returns { start, end } as UTC Date objects suitable for BETWEEN queries
 * 
 * CRITICAL: This function treats the input date as an IST calendar date.
 * Input "2026-04-02" means "Apr 2, 2026 in IST timezone" (00:00:00 to 23:59:59 IST)
 * Returns UTC timestamps that represent those IST moments.
 */
function istDateStringToUTCRange(dateString: string): { start: Date; end: Date } {
  const [year, month, day] = dateString.split('-').map(Number);
  
  // IST is UTC+5:30, so:
  // - IST 00:00:00 = UTC 18:30:00 (previous day)
  // - IST 23:59:59 = UTC 18:29:59 (same day)
  // Example: Apr 2 IST 00:00 = Apr 1 UTC 18:30
  
  // Create UTC dates that represent the IST moments
  // For start of IST day (00:00:00 IST):
  // We want UTC time that is 5:30 hours earlier
  // UTC = IST - 5:30 hours
  const startOfDayIST = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const istOffsetMs = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  const startUTC = new Date(startOfDayIST.getTime() - istOffsetMs);
  
  // For end of IST day (23:59:59 IST):
  const endOfDayIST = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));
  const endUTC = new Date(endOfDayIST.getTime() - istOffsetMs);
  
  return { start: startUTC, end: endUTC };
}

/**
 * Get start of today in IST, converted to UTC for database queries
 * Returns: UTC timestamp representing start of today IST (00:00:00)
 */
export function getStartOfTodayIST(): Date {
  const todayString = getTodayDateStringIST();
  return istDateStringToUTCRange(todayString).start;
}

/**
 * Get end of today in IST, converted to UTC for database queries
 * Returns: UTC timestamp representing end of today IST (23:59:59)
 */
export function getEndOfTodayIST(): Date {
  const todayString = getTodayDateStringIST();
  return istDateStringToUTCRange(todayString).end;
}

/**
 * Get today's date range (start and end of day) in IST, converted to UTC
 * Returns: { start, end } as UTC timestamps for database BETWEEN queries
 */
export function getTodayRangeIST(): { start: Date; end: Date } {
  const todayString = getTodayDateStringIST();
  return istDateStringToUTCRange(todayString);
}

/**
 * Get this week's date range (last 7 calendar days) in IST, converted to UTC
 * Returns: { start, end } where start is 6 days ago (7 days inclusive) and end is today
 */
export function getThisWeekRangeIST(): { start: Date; end: Date } {
  const nowIST = getNowIST();
  
  // Calculate 6 days ago
  const sixDaysAgo = new Date(nowIST);
  sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
  
  // Format as date strings
  const startString = `${sixDaysAgo.getFullYear()}-${String(sixDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(sixDaysAgo.getDate()).padStart(2, '0')}`;
  const endString = getTodayDateStringIST();
  
  // Get UTC range for start date
  const startRange = istDateStringToUTCRange(startString);
  // Get UTC range for end date
  const endRange = istDateStringToUTCRange(endString);
  
  return {
    start: startRange.start,
    end: endRange.end
  };
}

/**
 * Alias for getThisWeekRangeIST() for backwards compatibility
 */
export function getWeekRangeIST(): { start: Date; end: Date } {
  const nowIST = getNowIST();
  
  // Calculate 6 days ago
  const sixDaysAgo = new Date(nowIST);
  sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
  
  // Format as date strings
  const startString = `${sixDaysAgo.getFullYear()}-${String(sixDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(sixDaysAgo.getDate()).padStart(2, '0')}`;
  const endString = getTodayDateStringIST();
  
  // Get UTC range for start date
  const startRange = istDateStringToUTCRange(startString);
  // Get UTC range for end date
  const endRange = istDateStringToUTCRange(endString);
  
  return {
    start: startRange.start,
    end: endRange.end
  };
}

/**
 * Get this month's date range (last 30 calendar days) in IST, converted to UTC
 * Returns: { start, end } where start is 29 days ago (30 days inclusive) and end is today
 */
export function getThisMonthRangeIST(): { start: Date; end: Date } {
  const nowIST = getNowIST();
  
  // Calculate 29 days ago
  const twentyNineDaysAgo = new Date(nowIST);
  twentyNineDaysAgo.setDate(twentyNineDaysAgo.getDate() - 29);
  
  // Format as date strings
  const startString = `${twentyNineDaysAgo.getFullYear()}-${String(twentyNineDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(twentyNineDaysAgo.getDate()).padStart(2, '0')}`;
  const endString = getTodayDateStringIST();
  
  // Get UTC range for start date
  const startRange = istDateStringToUTCRange(startString);
  // Get UTC range for end date
  const endRange = istDateStringToUTCRange(endString);
  
  return {
    start: startRange.start,
    end: endRange.end
  };
}

/**
 * Alias for getThisMonthRangeIST() for backwards compatibility
 */
export function getMonthRangeIST(): { start: Date; end: Date } {
  const nowIST = getNowIST();
  
  // Calculate 29 days ago
  const twentyNineDaysAgo = new Date(nowIST);
  twentyNineDaysAgo.setDate(twentyNineDaysAgo.getDate() - 29);
  
  // Format as date strings
  const startString = `${twentyNineDaysAgo.getFullYear()}-${String(twentyNineDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(twentyNineDaysAgo.getDate()).padStart(2, '0')}`;
  const endString = getTodayDateStringIST();
  
  // Get UTC range for start date
  const startRange = istDateStringToUTCRange(startString);
  // Get UTC range for end date
  const endRange = istDateStringToUTCRange(endString);
  
  return {
    start: startRange.start,
    end: endRange.end
  };
}

/**
 * Get custom date range in IST, converted to UTC
 * Parses user-provided start/end dates (YYYY-MM-DD format) and returns UTC timestamps
 * 
 * @param startDate - Start date as YYYY-MM-DD string
 * @param endDate - End date as YYYY-MM-DD string
 * @returns { start, end } as UTC timestamps for database BETWEEN queries
 */
export function getCustomRangeIST(startDate: string, endDate: string): { start: Date; end: Date } {
  const startRange = istDateStringToUTCRange(startDate);
  const endRange = istDateStringToUTCRange(endDate);
  
  return {
    start: startRange.start,
    end: endRange.end
  };
}

/**
 * Get today's date as YYYY-MM-DD string in IST
 * Useful for comparing with created_at dates in database queries
 */
export function getTodayIST(): string {
  return getTodayDateStringIST();
}

/**
 * Get current datetime in IST timezone (for logging/debugging)
 * Returns ISO-like string showing IST time
 */
export function getNowAsIST(): string {
  const now = getNowIST();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} IST`;
}

/**
 * Helper: Convert a browser LOCAL date picker value to IST calendar date string
 * 
 * Browser <input type="date"> returns a YYYY-MM-DD string that represents
 * the user's LOCAL interpretation of that date. We need to convert it to IST.
 * 
 * CRITICAL: This accounts for timezone differences between browser and IST.
 * If browser is in UTC and user selects "Apr 2", the ISO string is "2026-04-02",
 * but it represents Apr 2 UTC, not Apr 2 IST.
 * 
 * Example:
 *   - Browser in UTC: user selects Apr 2 → dateString = "2026-04-02" (represents Apr 2 UTC)
 *   - IST date: Apr 2 UTC 00:00 = Apr 2 IST 05:30, so it's still Apr 2 IST
 *   - Result: "2026-04-02" is correct
 *   
 *   But if:
 *   - Browser in UTC-5: user selects Apr 2 → dateString = "2026-04-02" (represents Apr 2 UTC-5)
 *   - UTC equivalent: Apr 2 UTC-5 00:00 = Apr 2 UTC 05:00
 *   - IST equivalent: Apr 2 UTC 05:00 = Apr 2 IST 10:30
 *   - Result: "2026-04-02" is still correct
 *   
 * The key insight: HTML5 date input returns the LOCAL date as YYYY-MM-DD,
 * regardless of timezone. When converted to UTC, it matches the date at UTC 00:00.
 * Since IST is UTC+5:30, Apr 2 UTC maps to Apr 2 IST 05:30-23:59 on that date.
 * So the result is always the IST date that corresponds to the browser's local date.
 * 
 * However, there's a subtle issue if the browser is WEST of IST:
 * - Browser in UTC: Apr 2 local = Apr 2 UTC = Apr 2 IST 05:30 ✓
 * - Browser in UTC+8 (ahead): Apr 2 local = Apr 1 UTC 16:00 = Apr 2 IST 21:30 ✓
 * - Browser in UTC-5 (behind): Apr 2 local = Apr 2 UTC 05:00 = Apr 2 IST 10:30 ✓
 * 
 * All correct! The browser's local date representation maps consistently to an IST date.
 * So we can use the browser date string directly as an IST date.
 */
export function browserDateToISTDate(browserDateString: string): string {
  // The browser date string is already in the correct format.
  // No conversion needed - it naturally maps to the IST calendar date.
  // Example: "2026-04-02" from browser = April 2 IST for database storage
  return browserDateString;
}

/**
 * Check if two UTC timestamps represent the same calendar day in IST
 * Used for validating same-day check-in/check-out
 */
export function isSameDayIST(date1: Date, date2: Date): boolean {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const date1Parts = formatter.format(date1);
  const date2Parts = formatter.format(date2);
  
  return date1Parts === date2Parts;
}

/**
 * Get today's date as YYYY-MM-DD string in IST (alias for getTodayDateStringIST)
 */
export function getTodayISTDateString(): string {
  return getTodayDateStringIST();
}

/**
 * Get today's date range (start and end of day) in IST, converted to UTC (alias)
 */
export function getTodayRangeISTFormatted(): { startDate: string; endDate: string } {
  const range = getTodayRangeIST();
  return {
    startDate: range.start.toISOString(),
    endDate: range.end.toISOString()
  };
}

/**
 * Get this week's date range formatted as ISO strings (alias)
 */
export function getThisWeekRangeISTFormatted(): { startDate: string; endDate: string } {
  const range = getThisWeekRangeIST();
  return {
    startDate: range.start.toISOString(),
    endDate: range.end.toISOString()
  };
}

/**
 * Get this month's date range formatted as ISO strings (alias)
 */
export function getThisMonthRangeISTFormatted(): { startDate: string; endDate: string } {
  const range = getThisMonthRangeIST();
  return {
    startDate: range.start.toISOString(),
    endDate: range.end.toISOString()
  };
}

/**
 * Debug info - shows timezone information for troubleshooting
 */
export function getTimezoneDebugInfo() {
  return {
    timezone: TIMEZONE,
    nowUTC: new Date().toISOString(),
    nowIST: getNowAsIST(),
    todayIST: getTodayIST(),
    todayRange: getTodayRangeIST(),
    weekRange: getThisWeekRangeIST(),
    monthRange: getThisMonthRangeIST()
  };
}
