'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import BottomNav from '@/app/components/BottomNav';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';

interface EngineerWithStats {
  id: string;
  name: string;
  email: string;
  mobile_number: string;
  designation: string | null;
  is_active: boolean;
  assigned_calls: number;
  closed_calls: number;
  pending_calls: number;
}

export default function EngineersOverviewPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [engineers, setEngineers] = useState<EngineerWithStats[]>([])
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.email) {
      fetchEngineerStats();
    }
  }, [user?.email]);

  async function fetchEngineerStats() {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/engineers/stats?managerEmail=${encodeURIComponent(user?.email || '')}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch engineer stats: ${response.status}`);
      }
      
      const data = await response.json();
      setEngineers(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error fetching engineer stats:', errorMessage);
      setEngineers([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ProtectedRoute>
      <div className="bg-[#F8F9FB] text-slate-900 pt-[env(safe-area-inset-top,55px)] overflow-x-hidden relative min-h-screen pb-20">
        {/* Ambient Depth Elements */}
        <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none bg-noise mix-blend-multiply"></div>
        <div className="fixed top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-[80px] pointer-events-none z-0"></div>

        {/* App Header */}
        <header className="w-full px-6 pb-4 pt-4 flex justify-between items-center relative z-10">
          <button
            onClick={() => router.back()}
            className="w-11 h-11 bg-white rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-center justify-center border border-slate-100 active:scale-95 transition-transform"
          >
            <i className="ph-bold ph-caret-left text-[22px] text-slate-700"></i>
          </button>
          <div className="flex flex-col items-center">
            <h1 className="text-lg font-black tracking-tight text-slate-900 leading-none">Engineer Overview</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">View Only</p>
          </div>
          <button
            onClick={() => router.push('/settings')}
            className="w-11 h-11 bg-white rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-center justify-center border border-slate-100 active:scale-95 transition-transform"
          >
            <i className="ph-bold ph-gear text-[22px] text-slate-700"></i>
          </button>
        </header>

        {/* Main Content */}
        <main className="w-full px-6 mt-6 pb-[140px] space-y-5 relative z-10">
          
          {/* Engineers List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm font-bold text-slate-500">Loading engineers...</p>
            </div>
          ) : engineers.length === 0 ? (
            <div className="bg-white rounded-[32px] p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-slate-100 text-center">
              <div className="w-16 h-16 bg-green-50 rounded-[20px] flex items-center justify-center mx-auto mb-4">
                <i className="ph-fill ph-user-gear text-[32px] text-green-600"></i>
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">No Engineers</h3>
              <p className="text-sm font-bold text-slate-500">
                You don't have any engineers assigned yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {engineers.map((engineer) => (
                <div
                  key={engineer.id}
                  className="bg-white rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-slate-100"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-black text-slate-900">{engineer.name}</h3>
                        {!engineer.is_active && (
                          <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold rounded-full">
                            INACTIVE
                          </span>
                        )}
                        {engineer.is_active && (
                          <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[10px] font-bold rounded-full">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      {engineer.designation && (
                        <p className="text-xs font-medium text-slate-500 mb-2">{engineer.designation}</p>
                      )}
                      <p className="text-xs font-bold text-slate-600 mb-1">{engineer.email}</p>
                      <p className="text-xs font-bold text-slate-600">{engineer.mobile_number}</p>
                    </div>
                    <div className="w-10 h-10 bg-green-50 rounded-[14px] flex items-center justify-center flex-shrink-0">
                      <i className="ph-fill ph-user-gear text-lg text-green-600"></i>
                    </div>
                  </div>

                  {/* Call Statistics */}
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100">
                    <div className="text-center">
                      <p className="text-lg font-black text-blue-600">{engineer.assigned_calls}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Total Calls</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-black text-yellow-600">{engineer.pending_calls}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Pending</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-black text-green-600">{engineer.closed_calls}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Closed</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
