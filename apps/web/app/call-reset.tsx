'use client';

import { useEffect } from 'react';

/**
 * Simple component that calls the reset endpoint on mount
 * This will trigger the password reset automatically
 */
export function CallReset() {
  useEffect(() => {
    // Call the reset endpoint
    fetch('/api/auto-reset')
      .then(r => r.json())
      .then(data => {
        console.log('[RESET CALLBACK]', data);
      })
      .catch(e => console.error('[RESET ERROR]', e));
  }, []);

  return null; // This component renders nothing
}
