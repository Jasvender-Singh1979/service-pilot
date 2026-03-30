'use client';

import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import EngineerLayout from '@/app/components/EngineerLayout';
import AttendanceCard from '@/app/engineer/components/AttendanceCard';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from '@/lib/toast';
import { StatsGridSkeleton } from '@/app/components/Skeletons';

interface DashboardStats {
  filter: string;
  assignedCount: number;
  inProgressCount: number;
  pendingActionCount: number;
  pendingUnderServicesCount: number;
  closedCount: number;
  cancelledCount: number;
  allTimeAssignedCount: number;
  dailySummary?: {
    totalAssigned: number;
    completedToday: number;
    pendingToday: number;
  };
  engineerPerformance?: {
    assigned: number;
    closed: number;
    pending: number;
    percentage: number;
  };
}

interface SearchResult {
  id: string;
  call_id: string;
  customer_name: string;
  customer_phone: string;
  call_status: string;
  priority_level: string;
  created_at: string;
}

function EngineerDashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    filter: 'today',
    assignedCount: 0,
    inProgressCount: 0,
    pendingActionCount: 0,
    pendingUnderServicesCount: 0,
    closedCount: 0,
    cancelledCount: 0,
    allTimeAssignedCount: 0,
    dailySummary: {
      totalAssigned: 0,
      completedToday: 0,
      pendingToday: 0,
    },
    engineerPerformance: {
      assigned: 0,
      closed: 0,
      pending: 0,
      percentage: 0,
    },
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchStats();
    }
  }, [user?.id, filter]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/engineers/dashboard?filter=${filter}`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch stats: ${response.status}`);
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error fetching engineer dashboard stats:', errorMessage);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getFilterLabel = () => {
    const labels: { [key: string]: string } = {
      'today': 'Today',
      'this_week': 'This Week',
      'this_month': 'This Month',
    };
    if (filter.startsWith('custom|') && customStartDate && customEndDate) {
      return `${customStartDate} to ${customEndDate}`;
    }
    return labels[filter] || 'Today';
  };

  const applyCustomDateRange = () => {
    if (customStartDate && customEndDate) {
      const customFilterValue = `custom|${customStartDate}|${customEndDate}`;
      setFilter(customFilterValue);
      setShowCustomDatePicker(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length === 0) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/engineers/service-calls/search?q=${encodeURIComponent(query)}`,
        {
          credentials: 'include',
        }
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
  };

  const handleResultClick = (call: SearchResult) => {
    setSearchQuery('');
    setShowSearchResults(false);
    router.push(`/engineer/service-calls/detail?callId=${encodeURIComponent(call.id)}&fromSearch=true`);
  };

  const getPriorityColor = (priority: string | undefined) => {
    if (!priority) return 'text-slate-600';
    switch (priority.toLowerCase()) {
      case 'critical':
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      case 'medium':
        return 'text-amber-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-slate-600';
    }
  };

  const StatCard = (
    props: {
      label: string;
      count: number;
      bgColor: string;
      icon: string;
      onClick: () => void;
    }
  ) => (
    <button
      onClick={props.onClick}
      className={`flex flex-col items-center justify-center p-4 rounded-[22px] text-white font-semibold cursor-pointer transition-all active:scale-95 shadow-md hover:shadow-lg relative overflow-hidden group ${props.bgColor}`}
    >
      <div className="absolute -top-8 -right-8 w-20 h-20 bg-white/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <i className={`ph-fill ${props.icon} text-2.5xl mb-2 relative z-10`}></i>
      <div className="text-2.5xl font-black mb-0.5 relative z-10 tracking-tighter">{props.count}</div>
      <div className="text-[11px] font-bold opacity-90 relative z-10 uppercase tracking-wider">{props.label}</div>
    </button>
  );

  return (
    <div className="flex-1 pb-8 relative z-10">
      {loading ? (
        <>
          <div className="px-6 pt-6 mb-8">
            <div className="w-full bg-gray-200 rounded-[24px] h-12 animate-pulse"></div>
          </div>
          <div className="px-6 mb-8">
            <div className="h-40 bg-gradient-to-br from-blue-200 to-blue-300 rounded-[24px] animate-pulse"></div>
          </div>
          <div className="px-6 mb-8">
            <div className="h-12 bg-gray-200 rounded-[14px] w-32 animate-pulse mb-4"></div>
            <StatsGridSkeleton />
          </div>
        </>
      ) : (
        <>
          {/* Inline Search Bar - At Top */}
          <div className="px-6 pt-6 mb-8 relative">
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
              <div className="absolute top-full left-0 right-0 mt-2 mx-6 bg-white rounded-[20px] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.08)] z-50">
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
                      <span className={`text-xs font-bold whitespace-nowrap capitalize ${result.priority_level ? getPriorityColor(result.priority_level) : 'text-slate-400'}`}>
                        {result.priority_level || 'No Priority'}
                      </span>
                      <span className="text-xs font-bold text-slate-400 whitespace-nowrap capitalize">{result.call_status.replace(/_/g, ' ')}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* No Results Message */}
            {showSearchResults && searchResults.length === 0 && searchQuery.trim().length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 mx-6 bg-white rounded-[20px] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.08)] z-50 p-4 text-center">
                <p className="text-sm text-slate-600">No calls found matching "<span className="font-semibold">{searchQuery}</span>"</p>
              </div>
            )}
          </div>

          {/* Today's Summary */}
          <div className="px-6 mb-8">
            <div className="mb-3 p-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-[24px] text-white shadow-[0_8px_28px_rgba(37,99,235,0.25)] border border-blue-500 relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
              <h2 className="text-[11px] font-black mb-4 opacity-95 uppercase tracking-wider relative z-10">Today&apos;s Summary</h2>
              <div className="grid grid-cols-3 gap-3 relative z-10">
                <div className="text-center">
                  <div className="text-3xl font-black mb-1 tracking-tighter">{stats.dailySummary?.totalAssigned || 0}</div>
                  <div className="text-[11px] font-bold opacity-90 uppercase tracking-wider">Assigned Today</div>
                </div>
                <div className="text-center border-l border-r border-white border-opacity-20">
                  <div className="text-3xl font-black mb-1 tracking-tighter">{stats.dailySummary?.completedToday || 0}</div>
                  <div className="text-[11px] font-bold opacity-90 uppercase tracking-wider">Completed Today</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-black mb-1 tracking-tighter">{stats.dailySummary?.pendingToday || 0}</div>
                  <div className="text-[11px] font-bold opacity-90 uppercase tracking-wider">Pending Today</div>
                </div>
              </div>
            </div>
          </div>

          {/* Attendance Card */}
          <AttendanceCard />

          {/* Dashboard Filter Controls */}
          <div className="px-6 mb-8">
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setFilter('today')}
                className={`px-4 py-2 rounded-[14px] text-sm font-bold whitespace-nowrap transition-all ${
                  filter === 'today'
                    ? 'bg-blue-500 text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)]'
                    : 'bg-white text-slate-700 border border-slate-100 hover:border-slate-200'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setFilter('this_week')}
                className={`px-4 py-2 rounded-[14px] text-sm font-bold whitespace-nowrap transition-all ${
                  filter === 'this_week'
                    ? 'bg-blue-500 text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)]'
                    : 'bg-white text-slate-700 border border-slate-100 hover:border-slate-200'
                }`}
              >
                This Week
              </button>
              <button
                onClick={() => setFilter('this_month')}
                className={`px-4 py-2 rounded-[14px] text-sm font-bold whitespace-nowrap transition-all ${
                  filter === 'this_month'
                    ? 'bg-blue-500 text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)]'
                    : 'bg-white text-slate-700 border border-slate-100 hover:border-slate-200'
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => setShowCustomDatePicker(!showCustomDatePicker)}
                className={`px-4 py-2 rounded-[14px] text-sm font-bold whitespace-nowrap transition-all ${
                  filter.startsWith('custom')
                    ? 'bg-blue-500 text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)]'
                    : 'bg-white text-slate-700 border border-slate-100 hover:border-slate-200'
                }`}
              >
                Custom
              </button>
            </div>

            {/* Custom Date Picker */}
            {showCustomDatePicker && (
              <div className="mt-4 p-4 bg-white border border-slate-200 rounded-[16px] shadow-lg">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">Start Date</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-[12px] text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">End Date</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-[12px] text-sm"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={applyCustomDateRange}
                      className="flex-1 px-3 py-2 bg-blue-500 text-white text-sm font-bold rounded-[12px] transition-all active:scale-95"
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => setShowCustomDatePicker(false)}
                      className="flex-1 px-3 py-2 bg-slate-100 text-slate-700 text-sm font-bold rounded-[12px] transition-all active:scale-95"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mt-4">
              Showing: {getFilterLabel()}
            </div>
          </div>

          {/* Dashboard Widgets */}
          <div className="px-6 mb-8">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-4">Status Overview</h3>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Assigned"
                count={stats.assignedCount}
                bgColor="bg-gradient-to-br from-blue-500 to-blue-600"
                icon="ph-briefcase"
                onClick={() => router.push('/engineer/service-calls?status=assigned')}
              />
              <StatCard
                label="In Progress"
                count={stats.inProgressCount}
                bgColor="bg-gradient-to-br from-amber-500 to-amber-600"
                icon="ph-hourglass"
                onClick={() => router.push('/engineer/service-calls?status=in_progress')}
              />
              <StatCard
                label="Pending Action"
                count={stats.pendingActionCount}
                bgColor="bg-gradient-to-br from-red-500 to-red-600"
                icon="ph-warning"
                onClick={() => router.push('/engineer/service-calls?status=pending_action_required')}
              />
              <StatCard
                label="Under Services"
                count={stats.pendingUnderServicesCount}
                bgColor="bg-gradient-to-br from-indigo-500 to-indigo-600"
                icon="ph-wrench"
                onClick={() => router.push('/engineer/service-calls?status=pending_under_services')}
              />
              <StatCard
                label="Closed"
                count={stats.closedCount}
                bgColor="bg-gradient-to-br from-green-500 to-green-600"
                icon="ph-check-circle"
                onClick={() => router.push('/engineer/service-calls?status=closed')}
              />
              <StatCard
                label="Cancelled"
                count={stats.cancelledCount}
                bgColor="bg-gradient-to-br from-slate-500 to-slate-600"
                icon="ph-prohibit"
                onClick={() => router.push('/engineer/service-calls?status=cancelled')}
              />
            </div>
          </div>

          {/* Engineer Performance */}
          {stats.engineerPerformance && (
            <div className="px-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Engineer Performance</h3>
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Efficiency</div>
                  <div className="text-2xl font-black text-blue-600">{stats.engineerPerformance.percentage}%</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 bg-white rounded-[24px] border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Assigned</div>
                  <div className="text-2xl font-black text-blue-600">{stats.engineerPerformance.assigned}</div>
                </div>
                <div className="p-4 bg-white rounded-[24px] border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Closed</div>
                  <div className="text-2xl font-black text-green-600">{stats.engineerPerformance.closed}</div>
                </div>
                <div className="p-4 bg-white rounded-[24px] border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Pending</div>
                  <div className="text-2xl font-black text-orange-600">{stats.engineerPerformance.pending}</div>
                </div>
              </div>
            </div>
          )}

          {/* All My Calls Card */}
          <div className="px-6">
            <Link
              href="/engineer/service-calls?status=all"
              className="flex items-center justify-between p-5 bg-white rounded-[24px] border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)] transition-all active:scale-95 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-[14px] bg-purple-500/15 flex items-center justify-center text-purple-600 group-hover:bg-purple-500/20 transition-colors">
                  <i className="ph-fill ph-list text-lg"></i>
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm">All My Calls</div>
                  <div className="text-xs text-slate-600 mt-0.5">{stats.allTimeAssignedCount} total assigned</div>
                </div>
              </div>
              <i className="ph-bold ph-caret-right text-slate-400 group-hover:text-slate-500 transition-colors"></i>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default function EngineerDashboard() {
  return (
    <ProtectedRoute allowedRoles={['engineer']}>
      <EngineerLayout>
        <EngineerDashboardContent />
      </EngineerLayout>
    </ProtectedRoute>
  );
}
