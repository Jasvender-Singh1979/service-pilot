/**
 * Reusable formatting utilities
 * Safe defensive formatters for attendance data
 */

/**
 * Normalize coordinates to 2 decimal places for matching
 * Example: 29.950300 → 29.95, 77.546900 → 77.55
 * Used for friendly location matching to group nearby GPS readings
 * 
 * @param value - latitude or longitude (number, string, null, or undefined)
 * @returns normalized value to 2 decimals as string, or null if invalid
 */
export function normalizeCoordinate(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return num.toFixed(2);
}

/**
 * Get a normalized coordinate key for matching
 * Example: latitude=29.950300, longitude=77.546900 → "29.95,77.55"
 * 
 * @param lat - latitude (number, string, null, or undefined)
 * @param lng - longitude (number, string, null, or undefined)
 * @returns normalized key or null if either coordinate is invalid
 */
export function getCoordinateKey(lat: number | string | null | undefined, lng: number | string | null | undefined): string | null {
  const normalizedLat = normalizeCoordinate(lat);
  const normalizedLng = normalizeCoordinate(lng);
  if (normalizedLat === null || normalizedLng === null) return null;
  return `${normalizedLat},${normalizedLng}`;
}

/**
 * Format duration from minutes to human-readable format
 * Examples: 35 min → 00Hr:35Min, 65 min → 01Hr:05Min, 120 min → 02Hr:00Min
 * 
 * @param minutes - duration in minutes (number, null, or undefined)
 * @returns formatted duration string or '--' if invalid
 */
export function formatDuration(minutes: number | null | undefined): string {
  // Defensive: check if minutes is a valid finite number
  if (minutes === null || minutes === undefined) {
    return '--';
  }

  const minutesNum = Number(minutes);
  if (!Number.isFinite(minutesNum) || minutesNum < 0) {
    return '--';
  }

  const hours = Math.floor(minutesNum / 60);
  const mins = Math.round(minutesNum % 60);
  
  // Format with 2-digit padding
  const paddedHours = String(hours).padStart(2, '0');
  const paddedMins = String(mins).padStart(2, '0');
  
  return `${paddedHours}Hr:${paddedMins}Min`;
}

/**
 * Format location from latitude/longitude or address (synchronous, basic version)
 * Prefers address if available, falls back to coordinates
 * Does NOT check named locations (use the async version for that)
 * 
 * @param lat - latitude (number, string, null, or undefined)
 * @param lng - longitude (number, string, null, or undefined)
 * @param address - location address (string, null, or undefined)
 * @returns formatted location or 'N/A' if invalid
 */
export function formatLocation(
  lat: number | string | null | undefined,
  lng: number | string | null | undefined,
  address: string | null | undefined
): string {
  // If address exists, use it
  if (address && typeof address === 'string' && address.trim().length > 0) {
    return address;
  }

  // Try to format coordinates safely
  try {
    const latNum = Number(lat);
    const lngNum = Number(lng);

    // Both must be valid finite numbers
    if (Number.isFinite(latNum) && Number.isFinite(lngNum)) {
      const safeLat = latNum.toFixed(6);
      const safeLng = lngNum.toFixed(6);
      return `${safeLat}, ${safeLng}`;
    }
  } catch {
    // silently fail
  }

  return 'N/A';
}

/**
 * Async version: Format location with named location resolution
 * Checks if coordinates match a named location, otherwise uses address or coordinates
 * 
 * @param lat - latitude (number, null, or undefined)
 * @param lng - longitude (number, null, or undefined)
 * @param address - location address (string, null, or undefined)
 * @returns Promise<formatted location string>
 */
export async function formatLocationAsync(
  lat: number | null | undefined,
  lng: number | null | undefined,
  address: string | null | undefined
): Promise<string> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/attendance/resolve-location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ latitude: lat, longitude: lng, address }),
    });

    if (response.ok) {
      const result = await response.json();
      return result.value || 'N/A';
    }
  } catch (error) {
    console.warn('Error resolving location:', error);
  }

  // Fallback to synchronous version
  return formatLocation(lat, lng, address);
}
