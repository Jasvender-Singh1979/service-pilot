/**
 * Re-export shared IST date helpers for backwards compatibility
 * The actual implementations are in lib/dateUtils.ts and lib/istDateHelper.ts
 */

export { getTodayIST, isSameDayIST, getTodayRangeIST, getThisWeekRangeIST, getThisMonthRangeIST } from './dateUtils';
