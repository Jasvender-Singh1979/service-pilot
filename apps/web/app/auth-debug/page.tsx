'use client';

import { useState, useEffect } from 'react';

export default function AuthDebugPage() {
  const [superAdminLog, setSuperAdminLog] = useState<any[]>([]);
  const [managerLog, setManagerLog] = useState<any[]>([]);
  const [isTestingSuper, setIsTestingSuper] = useState(false);
  const [isTestingManager, setIsTestingManager] = useState(false);

  // Intercept fetch to log all requests
  useEffect(() => {
    const originalFetch = window.fetch;

    (window as any).fetch = function (...args: any[]) {
      const [resource, config] = args;
      const timestamp = new Date().toISOString();

      console.log('[NETWORK] Fetch called:', {
        timestamp,
        resource,
        method: config?.method || 'GET',
        body: config?.body,
      });

      return originalFetch.apply(this, args).then((response) => {
        const clonedResponse = response.clone();
        clonedResponse.text().then((text) => {
          console.log('[NETWORK] Response:', {
            timestamp,
            resource,
            status: response.status,
            body: text,
          });
        });
        return response;
      });
    };
  }, []);

  const testSuperAdminLogin = async () => {
    setIsTestingSuper(true);
    setSuperAdminLog([]);
    console.clear();
    console.log('[TEST] Starting super_admin login...');

    try {
      const response = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'super@admin.com',
          password: 'Admin@12345',
        }),
      });

      console.log('[TEST] Super Admin Response Status:', response.status);
      const data = await response.json();
      console.log('[TEST] Super Admin Response Body:', data);

      setSuperAdminLog([
        {
          endpoint: '/api/auth/sign-in',
          method: 'POST',
          payload: { email: 'super@admin.com', password: '***' },
          status: response.status,
          response: data,
        },
      ]);
    } catch (error) {
      console.error('[TEST] Super Admin Error:', error);
      setSuperAdminLog([{ error: String(error) }]);
    } finally {
      setIsTestingSuper(false);
    }
  };

  const testManagerLogin = async () => {
    setIsTestingManager(true);
    setManagerLog([]);
    console.clear();
    console.log('[TEST] Starting manager login...');

    try {
      const response = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'bani@bani.com',
          password: 'Test@12345',
        }),
      });

      console.log('[TEST] Manager Response Status:', response.status);
      const data = await response.json();
      console.log('[TEST] Manager Response Body:', data);

      setManagerLog([
        {
          endpoint: '/api/auth/sign-in',
          method: 'POST',
          payload: { email: 'bani@bani.com', password: '***' },
          status: response.status,
          response: data,
        },
      ]);
    } catch (error) {
      console.error('[TEST] Manager Error:', error);
      setManagerLog([{ error: String(error) }]);
    } finally {
      setIsTestingManager(false);
    }
  };

  const testBetterAuthEndpoint = async () => {
    console.log('[TEST] Testing Better Auth endpoint directly...');

    try {
      const response = await fetch('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'bani@bani.com',
          password: 'Test@12345',
        }),
      });

      console.log('[TEST] Better Auth Response Status:', response.status);
      const data = await response.json();
      console.log('[TEST] Better Auth Response:', data);
    } catch (error) {
      console.error('[TEST] Better Auth Error:', error);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto pb-32">
      <h1 className="text-2xl font-bold mb-6">Authentication Debug</h1>

      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-bold mb-4">Test Login Endpoints</h2>

          <button
            onClick={testSuperAdminLogin}
            disabled={isTestingSuper}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg mb-3 disabled:opacity-50"
          >
            {isTestingSuper ? 'Testing super_admin...' : 'Test super_admin Login'}
          </button>

          <button
            onClick={testManagerLogin}
            disabled={isTestingManager}
            className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg mb-3 disabled:opacity-50"
          >
            {isTestingManager ? 'Testing manager...' : 'Test Manager Login (bani@bani.com)'}
          </button>

          <button
            onClick={testBetterAuthEndpoint}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg"
          >
            Test Better Auth /api/auth/sign-in/email
          </button>
        </div>

        {superAdminLog.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-lg font-bold mb-4">Super Admin Login Log</h2>
            <pre className="bg-white p-4 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(superAdminLog, null, 2)}
            </pre>
          </div>
        )}

        {managerLog.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
            <h2 className="text-lg font-bold mb-4">Manager Login Log</h2>
            <pre className="bg-white p-4 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(managerLog, null, 2)}
            </pre>
          </div>
        )}

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-bold mb-4">Browser Console</h2>
          <p className="text-sm text-gray-600 mb-4">
            Open browser DevTools (F12) and go to Console tab to see all network and auth logs.
          </p>
        </div>
      </div>
    </div>
  );
}
