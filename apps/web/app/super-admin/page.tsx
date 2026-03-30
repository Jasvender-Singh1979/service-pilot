'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import BottomNav from '@/app/components/BottomNav';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';

interface Stats {
  totalUsers: number;
  totalManagers: number;
  totalEngineers: number;
  totalServiceCalls: number;
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalManagers: 0,
    totalEngineers: 0,
    totalServiceCalls: 0,
  });
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [lastUserId, setLastUserId] = useState<string | null>(null);

  // Only fetch when user ID actually changes, not when user object reference changes
  useEffect(() => {
    if (user?.id && user.id !== lastUserId) {
      setLastUserId(user.id);
      fetchBusinessId();
    }
  }, [user?.id, lastUserId]);

  useEffect(() => {
    if (businessId) {
      fetchStats();
    }
  }, [businessId]);

  async function fetchBusinessId() {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/me`, {
        credentials: 'include',
      });
      const userData = await response.json();
      if (userData.business_id) {
        setBusinessId(userData.business_id);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }

  async function fetchStats() {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stats?businessId=${businessId}`, {
        credentials: 'include',
      });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ProtectedRoute>
      <div className="bg-[#F8F9FB] text-slate-900 pt-[55px] overflow-x-hidden relative min-h-screen pb-20">
        {/* Ambient Depth Elements */}
        <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none bg-noise mix-blend-multiply"></div>
        <div className="fixed top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none z-0"></div>

        {/* App Header */}
        <header className="w-full px-6 pb-4 flex justify-between items-center relative z-10">
          <div className="flex flex-col justify-center">
            <h1 className="text-xl font-black tracking-tight text-slate-900 leading-none mb-1">
              Hi, {user?.name || 'Super Admin'}
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Super Admin</span>
            </div>
          </div>
          <button className="w-11 h-11 bg-white rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-center justify-center border border-slate-100 active:scale-95 transition-transform" onClick={() => router.push('/settings')}>
            <i className="ph-bold ph-gear text-[22px] text-slate-700"></i>
          </button>
        </header>

        {/* Main Content */}
        <main className="w-full px-6 mt-6 pb-[140px] space-y-7 relative z-10">
          
          {/* Quick Stats */}
          <section className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-5 rounded-[26px] border border-blue-200/60 shadow-[0_4px_16px_rgba(37,99,235,0.08)] relative overflow-hidden flex flex-col justify-between h-[130px]">
              <div className="absolute -top-8 -right-8 w-24 h-24 bg-blue-400/10 rounded-full blur-xl"></div>
              <div className="w-10 h-10 bg-blue-500/15 rounded-[14px] flex items-center justify-center relative z-10">
                <i className="ph-fill ph-users-three text-lg text-blue-600"></i>
              </div>
              <div className="relative z-10">
                <h2 className="text-[34px] font-black text-slate-900 tracking-tighter leading-none mb-1">
                  {loading ? '...' : stats.totalManagers}
                </h2>
                <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Managers</p>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100/50 p-5 rounded-[26px] border border-green-200/60 shadow-[0_4px_16px_rgba(34,197,94,0.08)] relative overflow-hidden flex flex-col justify-between h-[130px]">
              <div className="absolute -top-8 -right-8 w-24 h-24 bg-green-400/10 rounded-full blur-xl"></div>
              <div className="w-10 h-10 bg-green-500/15 rounded-[14px] flex items-center justify-center relative z-10">
                <i className="ph-fill ph-user-gear text-lg text-green-600"></i>
              </div>
              <div className="relative z-10">
                <h2 className="text-[34px] font-black text-slate-900 tracking-tighter leading-none mb-1">
                  {loading ? '...' : stats.totalEngineers}
                </h2>
                <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Engineers</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 p-5 rounded-[26px] border border-amber-200/60 shadow-[0_4px_16px_rgba(217,119,6,0.08)] relative overflow-hidden flex flex-col justify-between h-[130px]">
              <div className="absolute -top-8 -right-8 w-24 h-24 bg-amber-400/10 rounded-full blur-xl"></div>
              <div className="w-10 h-10 bg-amber-500/15 rounded-[14px] flex items-center justify-center relative z-10">
                <i className="ph-fill ph-phone text-lg text-amber-600"></i>
              </div>
              <div className="relative z-10">
                <h2 className="text-[34px] font-black text-slate-900 tracking-tighter leading-none mb-1">
                  {loading ? '...' : stats.totalServiceCalls}
                </h2>
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Service Calls</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-[26px] shadow-[0_8px_28px_rgba(15,23,42,0.3)] relative overflow-hidden flex flex-col justify-between h-[130px] border border-slate-700/50">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none"></div>
              <div className="w-10 h-10 bg-white/10 text-white rounded-[14px] flex items-center justify-center backdrop-blur-md border border-white/10 relative z-10">
                <i className="ph-fill ph-users text-lg"></i>
              </div>
              <div className="relative z-10">
                <h2 className="text-[34px] font-black text-white tracking-tighter leading-none mb-1">
                  {loading ? '...' : stats.totalUsers}
                </h2>
                <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Total Users</p>
              </div>
            </div>
          </section>

          {/* Management Actions */}
          <section className="space-y-3 pt-2">
            <button 
              onClick={() => router.push('/super-admin/managers')}
              className="w-full bg-gradient-to-r from-blue-500/5 to-blue-600/5 rounded-[24px] p-5 shadow-[0_4px_16px_rgba(37,99,235,0.08)] border border-blue-200/40 flex items-center gap-4 active:scale-95 transition-all hover:shadow-[0_6px_20px_rgba(37,99,235,0.12)] group"
            >
              <div className="w-12 h-12 bg-blue-500/15 rounded-[16px] flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                <i className="ph-fill ph-users-three text-[24px] text-blue-600"></i>
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-base font-black text-slate-900">Manage Managers</h3>
                <p className="text-xs font-medium text-slate-600 mt-1">Add and manage manager accounts</p>
              </div>
              <i className="ph-bold ph-caret-right text-lg text-slate-400 group-hover:text-slate-500 transition-colors"></i>
            </button>

            <button 
              onClick={() => router.push('/super-admin/reports')}
              className="w-full bg-gradient-to-r from-purple-500/5 to-purple-600/5 rounded-[24px] p-5 shadow-[0_4px_16px_rgba(147,51,234,0.08)] border border-purple-200/40 flex items-center gap-4 active:scale-95 transition-all hover:shadow-[0_6px_20px_rgba(147,51,234,0.12)] group"
            >
              <div className="w-12 h-12 bg-purple-500/15 rounded-[16px] flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                <i className="ph-fill ph-chart-line text-[24px] text-purple-600"></i>
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-base font-black text-slate-900">Reports</h3>
                <p className="text-xs font-medium text-slate-600 mt-1">View analytics and business intelligence</p>
              </div>
              <i className="ph-bold ph-caret-right text-lg text-slate-400 group-hover:text-slate-500 transition-colors"></i>
            </button>
          </section>

          {/* Empty State Guide */}
          {!loading && stats.totalManagers === 0 && stats.totalEngineers === 0 && (
            <section className="pt-4">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-[24px] p-6 border border-blue-200/60 shadow-[0_4px_16px_rgba(37,99,235,0.08)]">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-[14px] flex items-center justify-center flex-shrink-0 shadow-md">
                    <i className="ph-fill ph-info text-xl text-white"></i>
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 mb-1">Getting Started</h3>
                    <p className="text-xs font-medium text-slate-700 leading-relaxed">
                      Start by adding managers and engineers to your business using the management buttons above.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

        </main>

        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
