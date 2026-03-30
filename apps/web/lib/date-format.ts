import { format, parse } from 'date-fns';

/**
 * Format date as DD/MM/YYYY (e.g., 25/03/2026)
 */
export function formatDateShort(date: Date | string): string {
  try {
    const dateObj = typeof date === 'string' ? parse(date, 'yyyy-MM-dd', new Date()) : date;
    return format(dateObj, 'dd/MM/yyyy');
  } catch {
    return '';
  }
}

/**
 * Format date as "25th March 2026" (e.g., 25th March 2026)
 */
export function formatDateLong(date: Date | string): string {
  try {
    const dateObj = typeof date === 'string' ? parse(date, 'yyyy-MM-dd', new Date()) : date;
    return format(dateObj, 'do MMMM yyyy');
  } catch {
    return '';
  }
}

/**
 * Format date as "25 Mar 2026" (e.g., 25 Mar 2026)
 */
export function formatDateMedium(date: Date | string): string {
  try {
    const dateObj = typeof date === 'string' ? parse(date, 'yyyy-MM-dd', new Date()) : date;
    return format(dateObj, 'd MMM yyyy');
  } catch {
    return '';
  }
}

/**
 * Format datetime as "25 Mar 2026, 12:34 PM" (e.g., 25 Mar 2026, 12:34 PM)
 */
export function formatDateTime(date: Date | string): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'd MMM yyyy, h:mm a');
  } catch {
    return '';
  }
}

/**
 * Format date as "Mar 25" (e.g., Mar 25)
 */
export function formatDateCompact(date: Date | string): string {
  try {
    const dateObj = typeof date === 'string' ? parse(date, 'yyyy-MM-dd', new Date()) : date;
    return format(dateObj, 'MMM d');
  } catch {
    return '';
  }
}
