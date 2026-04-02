/**
 * Re-export shared IST date helpers for backwards compatibility
 * The actual implementations are in lib/istDateHelper.ts
 */

export { checkTimeliness, formatTimeIST as formatTimestampAsIST, formatDateTimeIST as formatDateTimeAsIST } from './istDateHelper';
