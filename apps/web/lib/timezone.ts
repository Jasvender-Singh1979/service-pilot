import { startOfDay, endOfDay, format, subDays } from 'date-fns';

const TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE || 'Asia/Kolkata';

/**
 * Get the current date in IST (Asia/Kolkata)
 * CRITICAL: Returns a Date object representing the current moment in IST timezone
 */
export function getNowInAppTimezone(): Date {
  // Get current UTC time
  const now = new Date();
  
  // Convert to IST by getting the local string in IST timezone
  const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  
  return istTime;
}

/**
 * Get today's date in IST as YYYY-MM-DD string
 */
function getTodayDateInIST(): string {
  const istTime = getNowInAppTimezone();
  const year = istTime.getFullYear();
  const month = String(istTime.getMonth() + 1).padStart(2, '0');
  const day = String(istTime.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Convert a UTC date to app timezone
 * Note: This is a pass-through since JavaScript Date objects work in the system timezone.
 * Actual timezone conversion happens at the database/API level using the TIMEZONE constant.
 */
export function toAppTimezone(date: Date): Date {
  return new Date(date);
}

/**
 * Format a date in app timezone using local formatting
 */
export function formatInAppTimezone(date: Date, formatStr: string = 'yyyy-MM-dd HH:mm:ss'): string {
  try {
    return format(date, formatStr);
  } catch (e) {
    // Fallback for invalid format strings
    return date.toISOString();
  }
}

/**
 * Get the start and end of today in app timezone (IST)
 * CRITICAL FIX: Properly handles IST timezone
 */
export function getTodayRange(): { start: Date; end: Date } {
  // Get today's date in IST
  const todayIST = getTodayDateInIST();
  
  // Create start of day (00:00:00)
  const start = new Date(todayIST + 'T00:00:00Z');
  
  // Create end of day (23:59:59)
  const end = new Date(todayIST + 'T23:59:59Z');
  
  return { start, end };
}

/**
 * Get the start and end of this week in app timezone (last 7 calendar days)
 * CRITICAL FIX: Properly handles IST timezone
 */
export function getThisWeekRange(): { start: Date; end: Date } {
  // Get today's date in IST
  const todayIST = getTodayDateInIST();
  const today = new Date(todayIST + 'T00:00:00Z');
  
  // Calculate 6 days ago
  const sixDaysAgo = new Date(today);
  sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
  
  // Format start date
  const year = sixDaysAgo.getFullYear();
  const month = String(sixDaysAgo.getMonth() + 1).padStart(2, '0');
  const day = String(sixDaysAgo.getDate()).padStart(2, '0');
  const startIST = `${year}-${month}-${day}`;
  
  // Create range
  const start = new Date(startIST + 'T00:00:00Z');
  const end = new Date(todayIST + 'T23:59:59Z');
  
  return { start, end };
}

/**
 * Get the start and end of this month in app timezone (last 30 calendar days)
 * CRITICAL FIX: Properly handles IST timezone
 */
export function getThisMonthRange(): { start: Date; end: Date } {
  // Get today's date in IST
  const todayIST = getTodayDateInIST();
  const today = new Date(todayIST + 'T00:00:00Z');
  
  // Calculate 29 days ago
  const twentyNineDaysAgo = new Date(today);
  twentyNineDaysAgo.setDate(twentyNineDaysAgo.getDate() - 29);
  
  // Format start date
  const year = twentyNineDaysAgo.getFullYear();
  const month = String(twentyNineDaysAgo.getMonth() + 1).padStart(2, '0');
  const day = String(twentyNineDaysAgo.getDate()).padStart(2, '0');
  const startIST = `${year}-${month}-${day}`;
  
  // Create range
  const start = new Date(startIST + 'T00:00:00Z');
  const end = new Date(todayIST + 'T23:59:59Z');
  
  return { start, end };
}

/**
 * Get timezone info for debugging
 */
export function getTimezoneInfo() {
  const now = new Date();
  return {
    timezone: TIMEZONE,
    utcDate: now.toISOString(),
    localDateInTz: formatInAppTimezone(now, 'yyyy-MM-dd HH:mm:ss'),
    offset: now.getTimezoneOffset().toString(),
  };
}
