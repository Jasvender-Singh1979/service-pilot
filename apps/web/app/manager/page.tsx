'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import BottomNav from '@/app/components/BottomNav';
import ManagerLayout from '@/app/components/ManagerLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import TeamAttendanceWidget from '@/app/manager/components/TeamAttendanceWidget';

interface Stats {
  totalEngineers: number;
  totalActiveTasks: number;
}

interface CallCounts {
  unassigned: number;
  assigned: number;
  in_progress: number;
  pending_action_required: number;
  pending_under_services: number;
  closed: number;
  cancelled: number;
}

interface TodaysPerformance {
  callsCreatedToday: number;
  callsClosedToday: number;
  pendingCallsToday: number;
  callsCancelledToday: number;
}

interface CriticalAlerts {
  pendingMoreThan48Hours: number;
  pendingActionRequired: number;
  pendingUnderServices: number;
}

interface EngineerPerformance {
  engineerId: string;
  engineerName: string;
  totalAssigned: number;
  totalClosed: number;
  totalPending: number;
  efficiency: number;
}

interface CategoryPerformance {
  categoryId: string;
  categoryName: string;
  totalCalls: number;
  closedCalls: number;
  pendingCalls: number;
  cancelledCalls?: number;
}

interface SearchResult {
  id: string;
  call_id: string;
  customer_name: string;
  customer_phone: string;
  call_status: string;
  created_at: string;
}

export default function ManagerDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalEngineers: 0,
    totalActiveTasks: 0,
  });
  const [callCounts, setCallCounts] = useState<CallCounts>({
    unassigned: 0,
    assigned: 0,
    in_progress: 0,
    pending_action_required: 0,
    pending_under_services: 0,
    closed: 0,
    cancelled: 0,
  });
  const [todaysPerformance, setTodaysPerformance] = useState<TodaysPerformance>({
    callsCreatedToday: 0,
    callsClosedToday: 0,
    pendingCallsToday: 0,
    callsCancelledToday: 0,
  });
  const [criticalAlerts, setCriticalAlerts] = useState<CriticalAlerts>({
    pendingMoreThan48Hours: 0,
    pendingActionRequired: 0,
    pendingUnderServices: 0,
  });
  const [engineerPerformance, setEngineerPerformance] = useState<EngineerPerformance[]>([]);
  const [categoryPerformance, setCategoryPerformance] = useState<CategoryPerformance[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUserId, setLastUserId] = useState<string | null>(null);

  // Only fetch when user ID actually changes, not when user object reference changes
  useEffect(() => {
    if (user?.id && user.id !== lastUserId) {
      setLastUserId(user.id);
      fetchStats();
      fetchCallCounts();
      fetchPerformanceData();
    }
  }, [user?.id, lastUserId]);

  async function fetchStats() {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/stats?managerEmail=${encodeURIComponent(user?.email || '')}`
      );
      if (!response.ok) {
        throw new Error(`Stats API returned ${response.status}`);
      }
      const data = await response.json();
      setStats(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error fetching stats:', errorMessage);
    }
  }

  async function fetchCallCounts() {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/service-calls/counts`
      );
      if (!response.ok) {
        throw new Error(`Call counts API returned ${response.status}`);
      }
      const data = await response.json();
      setCallCounts(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error fetching call counts:', errorMessage);
    }
  }

  async function fetchPerformanceData() {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/performance`
      );
      if (!response.ok) {
        throw new Error(`Performance API returned ${response.status}`);
      }
      const data = await response.json();
      setTodaysPerformance(data.todaysPerformance);
      setCriticalAlerts(data.criticalAlerts);
      setEngineerPerformance(data.engineerPerformance);
      setCategoryPerformance(data.categoryPerformance);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error fetching performance data:', errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(query: string) {
    setSearchQuery(query);
    if (query.trim().length === 0) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/search?q=${encodeURIComponent(query)}`
      );
      if (!response.ok) {
        throw new Error(`Search API returned ${response.status}`);
      }
      const data = await response.json();
      setSearchResults(data);
      setShowSearchResults(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error searching:', errorMessage);
      setSearchResults([]);
    }
  }

  function handleResultClick(call: SearchResult) {
    setSearchQuery('');
    setShowSearchResults(false);
    // Navigate to the service calls page with the specific call selected and from search flag
    router.push(`/manager/service-calls?id=${encodeURIComponent(call.id)}&fromSearch=true`);
  }

  return (
    <ProtectedRoute>
      <ManagerLayout>
        <div className="bg-[#F8F9FB] text-slate-900 overflow-x-hidden relative min-h-screen pb-20">
          {/* Ambient Depth Elements */}
          <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none bg-noise mix-blend-multiply"></div>
          <div className="fixed top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none z-0"></div>

          {/* Main Content */}
          <main className="w-full px-6 pt-4 pb-[140px] space-y-6 relative z-10">
          
          {/* Global Search */}
          <section className="relative">
            <div className="relative">
              <div className="w-full bg-white rounded-[24px] border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex items-center px-5 py-3 gap-3">
                <i className="ph ph-magnifying-glass text-[20px] text-slate-400"></i>
                <input
                  type="text"
                  placeholder="Search by Call ID, Customer Name, or Phone..."
                  className="flex-1 bg-transparent outline-none text-sm text-slate-900 placeholder-slate-400"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={() => handleSearch('')}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <i className="ph-fill ph-x text-[18px]"></i>
                  </button>
                )}
              </div>

              {/* Search Results Dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-[20px] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.08)] z-50">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleResultClick(result)}
                      className="w-full px-5 py-3 flex items-start gap-3 border-b border-slate-100 last:border-b-0 active:bg-slate-50 transition-colors text-left hover:bg-slate-50"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 text-sm truncate">Call {result.call_id}</h4>
                        <p className="text-xs text-slate-600 truncate">{result.customer_name}</p>
                        <p className="text-xs text-slate-500 mt-1">{result.customer_phone}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="text-xs font-bold text-slate-400 whitespace-nowrap capitalize">{result.call_status.replace(/_/g, ' ')}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* No Results Message */}
              {showSearchResults && searchResults.length === 0 && searchQuery.trim().length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-[20px] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.08)] z-50 p-4 text-center">
                  <p className="text-sm text-slate-600">No calls found matching "<span className="font-semibold">{searchQuery}</span>"</p>
                </div>
              )}
            </div>
          </section>

          {/* Quick Stats */}
          <section className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => router.push('/manager/all-calls')}
              className="bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-[24px] border border-blue-500 shadow-[0_8px_28px_rgba(37,99,235,0.25)] hover:shadow-[0_12px_36px_rgba(37,99,235,0.35)] relative overflow-hidden flex flex-col justify-between h-[130px] active:scale-95 transition-all text-left group"
            >
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
              <div className="w-10 h-10 bg-white/25 text-white rounded-[14px] flex items-center justify-center relative z-10">
                <i className="ph-fill ph-lightning text-lg"></i>
              </div>
              <div className="relative z-10">
                <h2 className="text-[34px] font-black text-white tracking-tighter leading-none mb-1">
                  {loading ? '...' : stats.totalActiveTasks}
                </h2>
                <p className="text-[11px] font-bold text-blue-100 tracking-widest uppercase">All Calls</p>
              </div>
            </button>
            
            <button 
              onClick={() => router.push('/manager/engineers-overview')}
              className="bg-gradient-to-br from-green-500 to-green-600 p-5 rounded-[24px] border border-green-500 shadow-[0_8px_28px_rgba(34,197,94,0.25)] hover:shadow-[0_12px_36px_rgba(34,197,94,0.35)] relative overflow-hidden flex flex-col justify-between h-[130px] active:scale-95 transition-all text-left group"
            >
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
              <div className="w-10 h-10 bg-white/25 text-white rounded-[14px] flex items-center justify-center relative z-10">
                <i className="ph-fill ph-user-gear text-lg"></i>
              </div>
              <div className="relative z-10">
                <h2 className="text-[34px] font-black text-white tracking-tighter leading-none mb-1">
                  {loading ? '...' : stats.totalEngineers}
                </h2>
                <p className="text-[11px] font-bold text-green-100 tracking-widest uppercase">Engineers</p>
              </div>
            </button>
          </section>

          {/* Reports Button */}
          <section>
            <button 
              onClick={() => router.push('/manager/reports')}
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

          {/* Today's Performance Section */}
          <section className="space-y-4">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.15em] px-1 pt-2">Today's Performance</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-[24px] p-5 shadow-[0_4px_16px_rgba(37,99,235,0.08)] border border-blue-200/60 flex flex-col gap-2 relative overflow-hidden">
                <div className="absolute -top-8 -right-8 w-20 h-20 bg-blue-400/10 rounded-full blur-xl"></div>
                <div className="w-9 h-9 bg-blue-500/15 rounded-[12px] flex items-center justify-center relative z-10">
                  <i className="ph-fill ph-plus text-lg text-blue-600"></i>
                </div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter mt-1">{loading ? '...' : todaysPerformance.callsCreatedToday}</h3>
                <p className="text-[9px] font-bold text-blue-700 uppercase tracking-wider">Created</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-[24px] p-5 shadow-[0_4px_16px_rgba(34,197,94,0.08)] border border-green-200/60 flex flex-col gap-2 relative overflow-hidden">
                <div className="absolute -top-8 -right-8 w-20 h-20 bg-green-400/10 rounded-full blur-xl"></div>
                <div className="w-9 h-9 bg-green-500/15 rounded-[12px] flex items-center justify-center relative z-10">
                  <i className="ph-fill ph-check text-lg text-green-600"></i>
                </div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter mt-1">{loading ? '...' : todaysPerformance.callsClosedToday}</h3>
                <p className="text-[9px] font-bold text-green-700 uppercase tracking-wider">Closed</p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-[24px] p-5 shadow-[0_4px_16px_rgba(249,115,22,0.08)] border border-orange-200/60 flex flex-col gap-2 relative overflow-hidden">
                <div className="absolute -top-8 -right-8 w-20 h-20 bg-orange-400/10 rounded-full blur-xl"></div>
                <div className="w-9 h-9 bg-orange-500/15 rounded-[12px] flex items-center justify-center relative z-10">
                  <i className="ph-fill ph-hourglass text-lg text-orange-600"></i>
                </div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter mt-1">{loading ? '...' : todaysPerformance.pendingCallsToday}</h3>
                <p className="text-[9px] font-bold text-orange-700 uppercase tracking-wider">Pending</p>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-red-100/50 rounded-[24px] p-5 shadow-[0_4px_16px_rgba(239,68,68,0.08)] border border-red-200/60 flex flex-col gap-2 relative overflow-hidden">
                <div className="absolute -top-8 -right-8 w-20 h-20 bg-red-400/10 rounded-full blur-xl"></div>
                <div className="w-9 h-9 bg-red-500/15 rounded-[12px] flex items-center justify-center relative z-10">
                  <i className="ph-fill ph-x text-lg text-red-600"></i>
                </div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter mt-1">{loading ? '...' : todaysPerformance.callsCancelledToday}</h3>
                <p className="text-[9px] font-bold text-red-700 uppercase tracking-wider">Cancelled</p>
              </div>
            </div>
          </section>

          {/* Team Attendance Widget */}
          <TeamAttendanceWidget />

          {/* Critical Alerts Section */}
          <section className="space-y-4">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.15em] px-1 pt-2">Critical Alerts</h2>
            <div className="grid grid-cols-1 gap-3">
              {criticalAlerts.pendingMoreThan48Hours > 0 && (
                <button
                  onClick={() => router.push('/manager/service-calls?source_context=dashboard_pending_48h')}
                  className="bg-red-50 rounded-[20px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-red-100 flex items-center gap-3 active:scale-[0.98] transition-transform text-left"
                >
                  <div className="w-10 h-10 bg-red-100 rounded-[14px] flex items-center justify-center flex-shrink-0">
                    <i className="ph-fill ph-warning text-lg text-red-600"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm">Pending More Than 48 Hours</h3>
                    <p className="text-xs text-slate-600 mt-0.5">{criticalAlerts.pendingMoreThan48Hours} calls need immediate attention</p>
                  </div>
                  <i className="ph-bold ph-caret-right text-slate-400"></i>
                </button>
              )}

              {criticalAlerts.pendingActionRequired > 0 && (
                <button
                  onClick={() => router.push('/manager/service-calls?source_context=dashboard_pending_action_required')}
                  className="bg-orange-50 rounded-[20px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-orange-100 flex items-center gap-3 active:scale-[0.98] transition-transform text-left"
                >
                  <div className="w-10 h-10 bg-orange-100 rounded-[14px] flex items-center justify-center flex-shrink-0">
                    <i className="ph-fill ph-warning text-lg text-orange-600"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm">Action Required</h3>
                    <p className="text-xs text-slate-600 mt-0.5">{criticalAlerts.pendingActionRequired} calls awaiting action</p>
                  </div>
                  <i className="ph-bold ph-caret-right text-slate-400"></i>
                </button>
              )}

              {criticalAlerts.pendingUnderServices > 0 && (
                <button
                  onClick={() => router.push('/manager/service-calls?source_context=dashboard_pending_under_services')}
                  className="bg-indigo-50 rounded-[20px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-indigo-100 flex items-center gap-3 active:scale-[0.98] transition-transform text-left"
                >
                  <div className="w-10 h-10 bg-indigo-100 rounded-[14px] flex items-center justify-center flex-shrink-0">
                    <i className="ph-fill ph-wrench text-lg text-indigo-600"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm">Under Services</h3>
                    <p className="text-xs text-slate-600 mt-0.5">{criticalAlerts.pendingUnderServices} calls in progress</p>
                  </div>
                  <i className="ph-bold ph-caret-right text-slate-400"></i>
                </button>
              )}

              {criticalAlerts.pendingMoreThan48Hours === 0 && criticalAlerts.pendingActionRequired === 0 && criticalAlerts.pendingUnderServices === 0 && (
                <div className="bg-green-50 rounded-[20px] p-4 border border-green-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-[14px] flex items-center justify-center">
                    <i className="ph-fill ph-check-circle text-lg text-green-600"></i>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">All Clear</h3>
                    <p className="text-xs text-slate-600 mt-0.5">No critical alerts at this time</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Service Call Status Buckets */}
          <section className="space-y-4">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.15em] px-1 pt-2">Service Call Status</h2>
            <div className="grid grid-cols-2 gap-3">
              {/* Unassigned */}
              <button 
                onClick={() => router.push('/manager/service-calls?source_context=dashboard_unassigned')}
                className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-[24px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-purple-200/60 flex flex-col gap-2 active:scale-[0.98] transition-transform text-left hover:shadow-[0_4px_16px_rgba(168,85,247,0.08)]">
                <div className="w-8 h-8 bg-purple-500/15 rounded-[12px] flex items-center justify-center">
                  <i className="ph-fill ph-hourglass text-lg text-purple-600"></i>
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{loading ? '...' : callCounts.unassigned}</h3>
                <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Unassigned</p>
              </button>

              {/* Assigned */}
              <button 
                onClick={() => router.push('/manager/service-calls?source_context=dashboard_assigned')}
                className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-[24px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-blue-200/60 flex flex-col gap-2 active:scale-[0.98] transition-transform text-left hover:shadow-[0_4px_16px_rgba(37,99,235,0.08)]">
                <div className="w-8 h-8 bg-blue-500/15 rounded-[12px] flex items-center justify-center">
                  <i className="ph-fill ph-check-circle text-lg text-blue-600"></i>
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{loading ? '...' : callCounts.assigned}</h3>
                <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Assigned</p>
              </button>

              {/* In Progress */}
              <button 
                onClick={() => router.push('/manager/service-calls?source_context=dashboard_in_progress')}
                className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-[24px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-amber-200/60 flex flex-col gap-2 active:scale-[0.98] transition-transform text-left hover:shadow-[0_4px_16px_rgba(217,119,6,0.08)]">
                <div className="w-8 h-8 bg-amber-500/15 rounded-[12px] flex items-center justify-center">
                  <i className="ph-fill ph-pulse text-lg text-amber-600"></i>
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{loading ? '...' : callCounts.in_progress}</h3>
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">In Progress</p>
              </button>

              {/* Pending Action */}
              <button 
                onClick={() => router.push('/manager/service-calls?source_context=dashboard_pending_action_required')}
                className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-[24px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-orange-200/60 flex flex-col gap-2 active:scale-[0.98] transition-transform text-left hover:shadow-[0_4px_16px_rgba(249,115,22,0.08)]">
                <div className="w-8 h-8 bg-orange-500/15 rounded-[12px] flex items-center justify-center">
                  <i className="ph-fill ph-warning text-lg text-orange-600"></i>
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{loading ? '...' : callCounts.pending_action_required}</h3>
                <p className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">Action Required</p>
              </button>

              {/* Pending Services */}
              <button 
                onClick={() => router.push('/manager/service-calls?source_context=dashboard_pending_under_services')}
                className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-[24px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-indigo-200/60 flex flex-col gap-2 active:scale-[0.98] transition-transform text-left hover:shadow-[0_4px_16px_rgba(99,102,241,0.08)]">
                <div className="w-8 h-8 bg-indigo-500/15 rounded-[12px] flex items-center justify-center">
                  <i className="ph-fill ph-wrench text-lg text-indigo-600"></i>
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{loading ? '...' : callCounts.pending_under_services}</h3>
                <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Under Services</p>
              </button>

              {/* Closed */}
              <button 
                onClick={() => router.push('/manager/service-calls?source_context=dashboard_closed')}
                className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-[24px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-green-200/60 flex flex-col gap-2 active:scale-[0.98] transition-transform text-left hover:shadow-[0_4px_16px_rgba(34,197,94,0.08)]">
                <div className="w-8 h-8 bg-green-500/15 rounded-[12px] flex items-center justify-center">
                  <i className="ph-fill ph-check-circle text-lg text-green-600"></i>
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{loading ? '...' : callCounts.closed}</h3>
                <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Closed</p>
              </button>

              {/* Cancelled */}
              <button 
                onClick={() => router.push('/manager/service-calls?source_context=dashboard_cancelled')}
                className="bg-gradient-to-br from-red-50 to-red-100/50 rounded-[24px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-red-200/60 flex flex-col gap-2 active:scale-[0.98] transition-transform text-left hover:shadow-[0_4px_16px_rgba(239,68,68,0.08)]">
                <div className="w-8 h-8 bg-red-500/15 rounded-[12px] flex items-center justify-center">
                  <i className="ph-fill ph-x-circle text-lg text-red-600"></i>
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{loading ? '...' : callCounts.cancelled}</h3>
                <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Cancelled</p>
              </button>
            </div>
          </section>

          {/* Engineer Performance Section */}
          {engineerPerformance.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.15em] px-1 pt-2">Engineer Performance</h2>
              <div className="space-y-2">
                {engineerPerformance.map((engineer) => (
                  <div
                    key={engineer.engineerId}
                    className="bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-[24px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-slate-200/60"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 text-sm truncate">{engineer.engineerName}</h3>
                      </div>
                      <span className="text-lg font-black text-blue-600 whitespace-nowrap">{engineer.efficiency}%</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="flex flex-col">
                        <span className="text-slate-500 font-medium">Assigned</span>
                        <span className="font-bold text-slate-900 mt-1">{engineer.totalAssigned}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-slate-500 font-medium">Closed</span>
                        <span className="font-bold text-green-600 mt-1">{engineer.totalClosed}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-slate-500 font-medium">Pending</span>
                        <span className="font-bold text-orange-600 mt-1">{engineer.totalPending}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Category Performance Section */}
          {categoryPerformance.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.15em] px-1 pt-2">Category Performance</h2>
              <div className="space-y-2">
                {categoryPerformance.map((category) => (
                  <div
                    key={category.categoryId}
                    className="bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-[24px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-slate-200/60"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 text-sm truncate">{category.categoryName}</h3>
                      </div>
                      <span className="text-lg font-black text-slate-900 whitespace-nowrap">{category.totalCalls}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="flex flex-col">
                        <span className="text-slate-500 font-medium">Closed</span>
                        <span className="font-bold text-green-600 mt-1">{category.closedCalls}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-slate-500 font-medium">Pending</span>
                        <span className="font-bold text-orange-600 mt-1">{category.pendingCalls}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-slate-500 font-medium">Cancelled</span>
                        <span className="font-bold text-red-600 mt-1">{category.cancelledCalls || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Management Actions */}
          <section className="space-y-3 pt-2">
            <button 
              onClick={() => router.push('/manager/service-calls')}
              className="w-full bg-gradient-to-r from-blue-500/5 to-blue-600/5 rounded-[24px] p-5 shadow-[0_4px_16px_rgba(37,99,235,0.08)] border border-blue-200/40 flex items-center gap-4 active:scale-95 transition-all hover:shadow-[0_6px_20px_rgba(37,99,235,0.12)] group"
            >
              <div className="w-12 h-12 bg-blue-500/15 rounded-[16px] flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                <i className="ph-fill ph-phone text-[24px] text-blue-600"></i>
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-base font-black text-slate-900">Service Calls</h3>
                <p className="text-xs font-medium text-slate-600 mt-1">Create and manage service calls</p>
              </div>
              <i className="ph-bold ph-caret-right text-lg text-slate-400 group-hover:text-slate-500 transition-colors"></i>
            </button>

            <button 
              onClick={() => router.push('/manager/engineers')}
              className="w-full bg-gradient-to-r from-green-500/5 to-green-600/5 rounded-[24px] p-5 shadow-[0_4px_16px_rgba(34,197,94,0.08)] border border-green-200/40 flex items-center gap-4 active:scale-95 transition-all hover:shadow-[0_6px_20px_rgba(34,197,94,0.12)] group"
            >
              <div className="w-12 h-12 bg-green-500/15 rounded-[16px] flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                <i className="ph-fill ph-user-gear text-[24px] text-green-600"></i>
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-base font-black text-slate-900">Manage Engineers</h3>
                <p className="text-xs font-medium text-slate-600 mt-1">Add and manage field team</p>
              </div>
              <i className="ph-bold ph-caret-right text-lg text-slate-400 group-hover:text-slate-500 transition-colors"></i>
            </button>

            <button 
              onClick={() => router.push('/manager/categories')}
              className="w-full bg-gradient-to-r from-purple-500/5 to-purple-600/5 rounded-[24px] p-5 shadow-[0_4px_16px_rgba(147,51,234,0.08)] border border-purple-200/40 flex items-center gap-4 active:scale-95 transition-all hover:shadow-[0_6px_20px_rgba(147,51,234,0.12)] group"
            >
              <div className="w-12 h-12 bg-purple-500/15 rounded-[16px] flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                <i className="ph-fill ph-list text-[24px] text-purple-600"></i>
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-base font-black text-slate-900">Manage Service Categories</h3>
                <p className="text-xs font-medium text-slate-600 mt-1">Create and organize service types</p>
              </div>
              <i className="ph-bold ph-caret-right text-lg text-slate-400 group-hover:text-slate-500 transition-colors"></i>
            </button>

            <button 
              onClick={() => router.push('/manager/whatsapp-templates')}
              className="w-full bg-gradient-to-r from-teal-500/5 to-teal-600/5 rounded-[24px] p-5 shadow-[0_4px_16px_rgba(20,184,166,0.08)] border border-teal-200/40 flex items-center gap-4 active:scale-95 transition-all hover:shadow-[0_6px_20px_rgba(20,184,166,0.12)] group"
            >
              <div className="w-12 h-12 bg-teal-500/15 rounded-[16px] flex items-center justify-center group-hover:bg-teal-500/20 transition-colors">
                <i className="ph-fill ph-chat-circle-text text-[24px] text-teal-600"></i>
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-base font-black text-slate-900">WhatsApp Templates</h3>
                <p className="text-xs font-medium text-slate-600 mt-1">Create and manage message templates</p>
              </div>
              <i className="ph-bold ph-caret-right text-lg text-slate-400 group-hover:text-slate-500 transition-colors"></i>
            </button>
          </section>

          </main>

          <BottomNav />
        </div>
      </ManagerLayout>
    </ProtectedRoute>
  );
}
