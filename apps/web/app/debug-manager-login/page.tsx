'use client';

import { useEffect, useState } from 'react';

export default function DebugManagerLogin() {
  const [comparison, setComparison] = useState(null);
  const [loginAttempt, setLoginAttempt] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComparison();
  }, []);

  const fetchComparison = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/debug/compare-accounts`);
      const data = await res.json();
      setComparison(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch comparison:', error);
      setLoading(false);
    }
  };

  const testManagerLogin = async () => {
    if (!comparison) return;

    const email = comparison.manager.user.email;
    const password = 'ravi@123'; // Need to know what password was set

    setLoginAttempt({ status: 'testing', email, message: 'Attempting login...' });

    try {
      // Call the comparison endpoint to see what happened
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/debug/trace-manager-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = await res.json();
      setLoginAttempt(result);
    } catch (error) {
      setLoginAttempt({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (!comparison) return <div className="p-4">Failed to load comparison</div>;

  return (
    <div className="p-4 pb-20 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Manager Login Debug</h1>

      {/* SUPER ADMIN DATA */}
      <div className="bg-green-50 p-4 rounded-lg mb-6 border-2 border-green-200">
        <h2 className="text-xl font-bold text-green-900 mb-3">✅ WORKING: Super Admin Account</h2>

        <div className="space-y-2 text-sm">
          <div>
            <strong>Email:</strong> {comparison.superAdmin.user.email}
          </div>
          <div>
            <strong>User ID:</strong> {comparison.superAdmin.user.id}
          </div>
          <div>
            <strong>Email Verified:</strong> {String(comparison.superAdmin.user.emailVerified)}
          </div>
          <div>
            <strong>Role:</strong> {comparison.superAdmin.user.role}
          </div>
          <div>
            <strong>Created At:</strong> {comparison.superAdmin.user.createdAt}
          </div>

          <hr className="my-2" />

          <div>
            <strong>Account ID:</strong> {comparison.superAdmin.account.id}
          </div>
          <div>
            <strong>User ID (account):</strong> {comparison.superAdmin.account.userId}
          </div>
          <div>
            <strong>Account ID (account):</strong> {comparison.superAdmin.account.accountId}
          </div>
          <div>
            <strong>Provider ID:</strong> {comparison.superAdmin.account.providerId}
          </div>
          <div>
            <strong>Password Format:</strong> {comparison.superAdmin.passwordAnalysis.saltBytes} byte salt +
            {comparison.superAdmin.passwordAnalysis.hashBytes} byte hash
          </div>
          <div className="text-xs bg-white p-2 rounded overflow-auto">
            <strong>Full Password Hash:</strong> {comparison.superAdmin.passwordAnalysis.full}
          </div>
        </div>
      </div>

      {/* MANAGER DATA */}
      <div className="bg-red-50 p-4 rounded-lg mb-6 border-2 border-red-200">
        <h2 className="text-xl font-bold text-red-900 mb-3">❌ FAILING: Manager Account</h2>

        <div className="space-y-2 text-sm">
          <div>
            <strong>Email:</strong> {comparison.manager.user.email}
          </div>
          <div>
            <strong>User ID:</strong> {comparison.manager.user.id}
          </div>
          <div>
            <strong>Email Verified:</strong> {String(comparison.manager.user.emailVerified)}
          </div>
          <div>
            <strong>Role:</strong> {comparison.manager.user.role}
          </div>
          <div>
            <strong>Created At:</strong> {comparison.manager.user.createdAt}
          </div>

          <hr className="my-2" />

          <div>
            <strong>Account ID:</strong> {comparison.manager.account.id}
          </div>
          <div>
            <strong>User ID (account):</strong> {comparison.manager.account.userId}
          </div>
          <div>
            <strong>Account ID (account):</strong> {comparison.manager.account.accountId}
          </div>
          <div>
            <strong>Provider ID:</strong> {comparison.manager.account.providerId}
          </div>
          <div>
            <strong>Password Format:</strong> {comparison.manager.passwordAnalysis.saltBytes} byte salt +
            {comparison.manager.passwordAnalysis.hashBytes} byte hash
          </div>
          <div className="text-xs bg-white p-2 rounded overflow-auto">
            <strong>Full Password Hash:</strong> {comparison.manager.passwordAnalysis.full}
          </div>
        </div>
      </div>

      {/* FIELD COMPARISON */}
      <div className="bg-blue-50 p-4 rounded-lg mb-6 border-2 border-blue-200">
        <h2 className="text-xl font-bold text-blue-900 mb-3">🔍 Field Comparison</h2>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>User Table:</strong>
            <ul className="list-disc list-inside mt-2">
              {Object.entries(comparison.fieldComparison.user).map(([key, value]) => (
                <li
                  key={key}
                  className={value === 'MATCH' ? 'text-green-600' : value === 'DIFFERENT' ? 'text-red-600' : ''}
                >
                  {key}: {String(value)}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <strong>Account Table:</strong>
            <ul className="list-disc list-inside mt-2">
              {Object.entries(comparison.fieldComparison.account).map(([key, value]) => (
                <li
                  key={key}
                  className={value === 'MATCH' ? 'text-green-600' : value === 'DIFFERENT' ? 'text-red-600' : ''}
                >
                  {key}: {String(value)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* DIFFERENCES */}
      {comparison.differences.critical.length > 0 && (
        <div className="bg-yellow-50 p-4 rounded-lg mb-6 border-2 border-yellow-200">
          <h2 className="text-xl font-bold text-yellow-900 mb-3">⚠️ CRITICAL DIFFERENCES</h2>

          <ul className="list-disc list-inside space-y-1 text-sm">
            {comparison.differences.critical.map((diff, i) => (
              <li key={i} className="text-red-700 font-semibold">
                {diff}
              </li>
            ))}
          </ul>

          {comparison.differences.userTable.length > 0 && (
            <div className="mt-3">
              <strong>User Table Differences:</strong>
              <ul className="list-disc list-inside ml-2 text-sm">
                {comparison.differences.userTable.map((diff, i) => (
                  <li key={i}>{diff}</li>
                ))}
              </ul>
            </div>
          )}

          {comparison.differences.accountTable.length > 0 && (
            <div className="mt-3">
              <strong>Account Table Differences:</strong>
              <ul className="list-disc list-inside ml-2 text-sm">
                {comparison.differences.accountTable.map((diff, i) => (
                  <li key={i}>{diff}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* LOGIN TEST */}
      <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
        <h2 className="text-xl font-bold mb-3">🔐 Login Test</h2>

        <button
          onClick={testManagerLogin}
          disabled={!comparison}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          Test Manager Login
        </button>

        {loginAttempt && (
          <div className="mt-4 bg-white p-3 rounded text-sm border">
            <pre>{JSON.stringify(loginAttempt, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
