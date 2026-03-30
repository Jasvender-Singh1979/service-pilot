'use client';

import { useEffect, useState } from 'react';

export default function TestPasswordReset() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [autoExecuted, setAutoExecuted] = useState(false);

  // Auto-execute reset on page load
  useEffect(() => {
    if (!autoExecuted) {
      setAutoExecuted(true);
      handleReset();
    }
  }, [autoExecuted]);

  const handleReset = async () => {
    setLoading(true);
    try {
      console.log('Calling reset endpoint...');
      const response = await fetch(
        '/api/debug/manager-password-reset?action=reset&email=bani@bani.com&newPassword=Test@12345'
      );
      const data = await response.json();
      console.log('Reset response:', data);
      setResult(data);
    } catch (error: any) {
      console.error('Reset error:', error);
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    try {
      console.log('Calling verify endpoint...');
      const response = await fetch(
        '/api/debug/manager-password-reset?action=verify&email=bani@bani.com&password=Test@12345'
      );
      const data = await response.json();
      console.log('Verify response:', data);
      setResult(data);
    } catch (error: any) {
      console.error('Verify error:', error);
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', fontSize: '12px' }}>
      <h1>Manager Password Reset Test</h1>
      <p>Auto-executing reset on load...</p>
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={handleReset}
          disabled={loading}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Loading...' : 'Reset Password'}
        </button>
        <button
          onClick={handleVerify}
          disabled={loading}
          style={{
            padding: '10px 20px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Loading...' : 'Verify Password'}
        </button>
      </div>
      {result && (
        <pre
          style={{
            backgroundColor: '#f0f0f0',
            padding: '15px',
            borderRadius: '4px',
            overflow: 'auto',
            maxHeight: '500px',
          }}
        >
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
