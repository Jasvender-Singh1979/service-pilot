'use client';

import { useState, useRef, useEffect } from 'react';
import { authClient } from '@/lib/auth-client';

export default function DebugLoginPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const logsRef = useRef<string[]>([]);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${msg}`;
    logsRef.current.push(logEntry);
    setLogs([...logsRef.current]);
    console.log(logEntry);
  };

  // Intercept fetch to log requests
  useEffect(() => {
    addLog('🔍 Network interceptor activated');

    const originalFetch = window.fetch;

    (window as any).fetch = function (...args: any[]) {
      const [resource, config] = args;

      addLog(`📤 FETCH: ${config?.method || 'GET'} ${resource}`);
      if (config?.body) {
        try {
          const body = JSON.parse(config.body);
          if (body.password) body.password = '***';
          addLog(`📦 Request body: ${JSON.stringify(body)}`);
        } catch (e) {
          addLog(`📦 Request body (raw): ${String(config.body).substring(0, 100)}`);
        }
      }

      return originalFetch.apply(this, args).then((response) => {
        const clonedResponse = response.clone();
        addLog(`📥 Response: ${response.status} ${response.statusText}`);

        clonedResponse.json()
          .then((data) => {
            if (data.error) {
              addLog(`❌ Error response: ${data.error}`);
            } else if (data.user) {
              addLog(`✅ User response: ${data.user.email}`);
            } else {
              addLog(`📋 Response (partial): ${JSON.stringify(data).substring(0, 100)}`);
            }
          })
          .catch(() => {
            addLog(`📋 Response (non-JSON)`);
          });

        return response;
      });
    };

    return () => {
      // Can't fully restore fetch, but this is for debugging
    };
  }, []);

  const testSuperAdminLogin = async () => {
    addLog('\n=== TESTING SUPER_ADMIN LOGIN ===');
    addLog('Email: super@admin.com');
    addLog('Password: Admin@12345');

    try {
      addLog('Calling authClient.signIn.email()...');
      const result = await authClient.signIn.email({
        email: 'super@admin.com',
        password: 'Admin@12345',
      });

      if (result.error) {
        addLog(`❌ Auth error: ${result.error.message}`);
      } else {
        addLog(`✅ Auth success: ${result.data?.user?.email}`);
      }
    } catch (error) {
      addLog(`⚠️  Exception: ${String(error)}`);
    }
  };

  const testManagerLogin = async () => {
    addLog('\n=== TESTING MANAGER LOGIN ===');
    addLog('Email: bani@bani.com');
    addLog('Password: Test@12345');

    try {
      addLog('Calling authClient.signIn.email()...');
      const result = await authClient.signIn.email({
        email: 'bani@bani.com',
        password: 'Test@12345',
      });

      if (result.error) {
        addLog(`❌ Auth error: ${result.error.message}`);
      } else {
        addLog(`✅ Auth success: ${result.data?.user?.email}`);
      }
    } catch (error) {
      addLog(`⚠️  Exception: ${String(error)}`);
    }
  };

  const testRawFetch = async () => {
    addLog('\n=== TESTING RAW FETCH ===');
    addLog('Testing what happens with a raw POST to /api/auth/...');

    try {
      const response = await fetch('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'bani@bani.com',
          password: 'Test@12345',
        }),
      });

      addLog(`Raw fetch response status: ${response.status}`);
      const data = await response.json();
      addLog(`Raw fetch response body: ${JSON.stringify(data).substring(0, 150)}`);
    } catch (error) {
      addLog(`Raw fetch error: ${String(error)}`);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto pb-32">
      <h1 className="text-2xl font-bold mb-6">🔐 Debug Login Flow</h1>

      <div className="grid grid-cols-1 gap-4 mb-6">
        <button
          onClick={testSuperAdminLogin}
          className="px-4 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700"
        >
          Test super_admin Login (super@admin.com)
        </button>

        <button
          onClick={testManagerLogin}
          className="px-4 py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700"
        >
          Test Manager Login (bani@bani.com)
        </button>

        <button
          onClick={testRawFetch}
          className="px-4 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700"
        >
          Test Raw Fetch to /api/auth/sign-in/email
        </button>
      </div>

      <div className="bg-gray-900 text-green-400 font-mono text-xs rounded-lg p-4 h-96 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="text-gray-500">Click a button above to see logs...</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="whitespace-pre-wrap break-words">
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
