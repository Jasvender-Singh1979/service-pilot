'use client';

import { useEffect, useState } from 'react';

export default function PasswordResetActionPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const performReset = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/trigger-reset');
      const data = await response.json();
      console.log('[RESET RESULT]', data);
      setResult(data);
    } catch (error: any) {
      console.error('[RESET ERROR]', error);
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-trigger on load
    performReset();
  }, []);

  return (
    <div style={{ padding: '40px', fontFamily: 'monospace', fontSize: '13px', whiteSpace: 'pre-wrap' }}>
      <h1 style={{ marginBottom: '20px' }}>Manager Password Reset</h1>
      
      <div style={{ marginBottom: '20px' }}>
        {loading && <p>Processing... (auto-triggered on load)</p>}
        {result && (
          <>
            <div style={{ backgroundColor: result.success ? '#e8f5e9' : '#ffebee', padding: '15px', marginBottom: '20px', borderRadius: '4px' }}>
              {result.success ? '✓ SUCCESS' : '✗ FAILED'}{'\n'}
              {result.passwordVerifyResult ? 'Password verified ✓' : 'Password verification failed ✗'}
            </div>
            
            <div style={{ backgroundColor: '#f5f5f5', padding: '15px', marginBottom: '20px', borderRadius: '4px', overflow: 'auto' }}>
{JSON.stringify(result, null, 2)}
            </div>

            <button
              onClick={performReset}
              disabled={loading}
              style={{
                padding: '10px 20px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Resetting...' : 'Reset Again'}
            </button>
          </>
        )}
      </div>

      <div style={{ marginTop: '40px', backgroundColor: '#f0f0f0', padding: '15px', borderRadius: '4px' }}>
        <strong>Instructions:</strong>{'\n'}
        1. This page auto-triggers the reset when loaded{'\n'}
        2. The reset hashes "Test@12345" and stores it in the database{'\n'}
        3. Click "Reset Again" to manually repeat{'\n'}
        4. Check the result above to confirm success{'\n'}
        5. You can then login as bani@bani.com with password Test@12345
      </div>
    </div>
  );
}
