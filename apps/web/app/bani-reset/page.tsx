'use client';

import { useState } from 'react';

/**
 * STANDALONE PAGE TO RESET bani@bani.com PASSWORD
 * Visit this page and click the button to reset the manager password
 */

export default function BaniResetPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auto-reset');
      const data = await response.json();
      console.log('Reset result:', data);
      setResult(data);
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '40px 20px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        lineHeight: '1.6',
      }}
    >
      <h1 style={{ marginBottom: '30px' }}>🔐 Manager Password Reset</h1>

      <div
        style={{
          backgroundColor: '#f5f5f5',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '30px',
        }}
      >
        <h2 style={{ marginTop: 0 }}>Reset bani@bani.com</h2>
        <p>
          <strong>Email:</strong> bani@bani.com
        </p>
        <p>
          <strong>New Password:</strong> Test@12345
        </p>
        <button
          onClick={handleReset}
          disabled={loading}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? '⏳ Processing...' : '✓ Reset Password'}
        </button>
      </div>

      {result && (
        <div
          style={{
            backgroundColor: result.success ? '#e8f5e9' : '#ffebee',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '30px',
            border: `2px solid ${result.success ? '#4caf50' : '#f44336'}`,
          }}
        >
          <h3 style={{ margin: '0 0 10px 0' }}>
            {result.success ? '✅ SUCCESS' : '❌ FAILED'}
          </h3>
          {result.error && <p style={{ color: '#d32f2f' }}>{result.error}</p>}
          {result.success && (
            <>
              <p>✓ Password hashed successfully</p>
              <p>✓ Database updated</p>
              <p>✓ Password verification: {result.verifyPasswordResult ? 'PASSED' : 'FAILED'}</p>
            </>
          )}
        </div>
      )}

      {result && result.storedHash && (
        <div
          style={{
            backgroundColor: '#f9f9f9',
            padding: '15px',
            borderRadius: '4px',
            marginBottom: '30px',
            fontFamily: 'monospace',
            fontSize: '12px',
            overflow: 'auto',
            maxHeight: '200px',
          }}
        >
          <strong>Technical Details:</strong>
          <pre style={{ margin: '10px 0 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
{JSON.stringify(
  {
    email: result.email,
    userId: result.userId,
    accountId: result.accountId,
    newPassword: result.newPassword,
    storedHash: result.storedHash,
    verifyPasswordResult: result.verifyPasswordResult,
  },
  null,
  2
)}
          </pre>
        </div>
      )}

      <div
        style={{
          backgroundColor: '#fff3cd',
          padding: '20px',
          borderRadius: '4px',
          border: '1px solid #ffc107',
        }}
      >
        <h3 style={{ marginTop: 0 }}>📝 How This Works</h3>
        <ol>
          <li>Click the "Reset Password" button above</li>
          <li>The button calls /api/auto-reset endpoint</li>
          <li>The endpoint:
            <ul>
              <li>Finds the bani@bani.com user account</li>
              <li>Hashes the password "Test@12345" using PBKDF2</li>
              <li>Updates the account password hash in the database</li>
              <li>Verifies the new hash works</li>
            </ul>
          </li>
          <li>Once successful, you can login as:
            <ul>
              <li><strong>Email:</strong> bani@bani.com</li>
              <li><strong>Password:</strong> Test@12345</li>
            </ul>
          </li>
        </ol>
      </div>
    </div>
  );
}
