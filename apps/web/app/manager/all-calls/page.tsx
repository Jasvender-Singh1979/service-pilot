'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import BottomNav from '@/app/components/BottomNav';
import ManagerLayout from '@/app/components/ManagerLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';

interface ServiceCall {
  id: string;
  call_id: string;
  customer_name: string;
  customer_phone: string;
  category_name_snapshot: string;
  call_status: string;
  created_at: string;
  assigned_engineer_user_id?: string;
}

function AllCallsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  const [calls, setCalls] = useState<ServiceCall[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [showMonthFilter, setShowMonthFilter] = useState(false);
  const [showDateRangeFilter, setShowDateRangeFilter] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'month' | 'date_range'>('all');
  
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [fromDate, setFromDate] = useState<string>(() => {
    const today = new Date();
    today.setDate(1);
    return today.toISOString().split('T')[0];
  });
  
  const [toDate, setToDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  useEffect(() => {
    if (user?.id) {
      fetchCalls();
    }
  }, [user?.id, activeFilter, selectedMonth, fromDate, toDate]);

  async function fetchCalls() {
    try {
      setLoading(true);
      let queryParams = new URLSearchParams();

      if (activeFilter === 'month') {
        queryParams.append('month', selectedMonth);
      } else if (activeFilter === 'date_range') {
        queryParams.append('fromDate', fromDate);
        queryParams.append('toDate', toDate);
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/service-calls?${queryParams.toString()}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to fetch calls: ${response.status}`);
      }

      const data = await response.json();
      // Already sorted by created_at DESC in API, but ensure it here
      const sorted = Array.isArray(data) ? data.sort((a: ServiceCall, b: ServiceCall) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }) : [];
      setCalls(sorted);
      setTotalCount(sorted.length);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error fetching calls:', errorMessage);
      setCalls([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'unassigned': 'bg-purple-50 text-purple-600 border-purple-200',
      'assigned': 'bg-blue-50 text-blue-600 border-blue-200',
      'in_progress': 'bg-yellow-50 text-yellow-600 border-yellow-200',
      'pending_action_required': 'bg-orange-50 text-orange-600 border-orange-200',
      'pending_under_services': 'bg-indigo-50 text-indigo-600 border-indigo-200',
      'closed': 'bg-green-50 text-green-600 border-green-200',
      'cancelled': 'bg-red-50 text-red-600 border-red-200',
    };
    return colors[status] || 'bg-slate-50 text-slate-600 border-slate-200';
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function getFilterLabel(): string {
    if (activeFilter === 'month') {
      const date = new Date(`${selectedMonth}-01`);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    if (activeFilter === 'date_range') {
      return `${fromDate} to ${toDate}`;
    }
    return 'All Calls';
  }

  return (
    <ManagerLayout>
      <div className="bg-[#F8F9FB] text-slate-900 overflow-x-hidden relative min-h-screen pb-20">
        {/* Ambient Depth Elements */}
        <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none bg-noise mix-blend-multiply"></div>
        <div className="fixed top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none z-0"></div>

        {/* Filters */}
        <div className="w-full px-6 pt-6 relative z-10">
        <div className="flex gap-2 pb-4 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => {
              setActiveFilter('all');
              setShowMonthFilter(false);
              setShowDateRangeFilter(false);
            }}
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-colors ${
              activeFilter === 'all'
                ? 'bg-blue-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)]'
                : 'bg-white text-slate-700 border border-slate-100'
            }`}
          >
            All Calls
          </button>
          <button
            onClick={() => {
              setActiveFilter('month');
              setShowDateRangeFilter(false);
              setShowMonthFilter(!showMonthFilter);
            }}
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-colors ${
              activeFilter === 'month'
                ? 'bg-blue-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)]'
                : 'bg-white text-slate-700 border border-slate-100'
            }`}
          >
            Month Filter
          </button>
          <button
            onClick={() => {
              setActiveFilter('date_range');
              setShowMonthFilter(false);
              setShowDateRangeFilter(!showDateRangeFilter);
            }}
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-colors ${
              activeFilter === 'date_range'
                ? 'bg-blue-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)]'
                : 'bg-white text-slate-700 border border-slate-100'
            }`}
          >
            Date Range
          </button>
        </div>

        {/* Month Filter Picker */}
        {showMonthFilter && (
          <div className="bg-white rounded-[24px] p-5 mb-4 shadow-[0_4px_24px_rgba(0,0,0,0.08)] border border-slate-100">
            <label className="text-xs font-bold text-slate-700 mb-2 block">Select Month</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full h-12 bg-slate-50 border border-slate-200 rounded-[16px] px-4 text-sm font-medium text-slate-900 outline-none focus:border-blue-500"
            />
          </div>
        )}

        {/* Date Range Filter Picker */}
        {showDateRangeFilter && (
          <div className="bg-white rounded-[24px] p-5 mb-4 shadow-[0_4px_24px_rgba(0,0,0,0.08)] border border-slate-100 space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-2 block">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full h-12 bg-slate-50 border border-slate-200 rounded-[16px] px-4 text-sm font-medium text-slate-900 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 mb-2 block">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full h-12 bg-slate-50 border border-slate-200 rounded-[16px] px-4 text-sm font-medium text-slate-900 outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}
      </div>

        {/* Main Content */}
        <main className="w-full px-6 mt-6 pb-[140px] space-y-3 relative z-10">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm font-bold text-slate-500">Loading calls...</p>
          </div>
        ) : calls.length === 0 ? (
          <div className="bg-white rounded-[32px] p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-slate-100 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-[20px] flex items-center justify-center mx-auto mb-4">
              <i className="ph-fill ph-phone text-[32px] text-blue-600"></i>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">No Calls Found</h3>
            <p className="text-sm font-bold text-slate-500">
              No service calls match your filter criteria.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {calls.map((call) => (
              <button
                key={call.id}
                onClick={() => router.push(`/manager/service-calls?id=${call.id}&source_context=all_calls`)}
                className="w-full bg-white rounded-[24px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-slate-100 text-left active:scale-[0.98] transition-transform"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-black text-slate-900">{call.call_id}</h3>
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border ${getStatusColor(call.call_status)}`}>
                        {call.call_status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-700 mb-1">{call.customer_name}</p>
                    <p className="text-xs font-medium text-slate-500">{call.category_name_snapshot}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-500">{call.customer_phone}</p>
                  <p className="text-xs font-medium text-slate-400">{formatDate(call.created_at)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

        <BottomNav />
      </div>
    </ManagerLayout>
  );
}

export default function AllCallsPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
        <AllCallsContent />
      </Suspense>
    </ProtectedRoute>
  );
}
