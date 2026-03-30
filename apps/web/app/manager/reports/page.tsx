'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import BottomNav from '@/app/components/BottomNav';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { getTodayRange, getThisWeekRange, getThisMonthRange, getTimezoneInfo } from '@/lib/timezone';
import { format } from 'date-fns';
import { formatDateMedium } from '@/lib/date-format';

interface SummaryMetrics {
  created: number;
  cancelled: number;
  closed: number;
  unassigned: number;
  assigned: number;
  in_progress: number;
  action_required: number;
  under_services: number;
  total_revenue: number;
}

interface EngineerPerformance {
  engineer_id: string;
  engineer_name: string;
  total_assigned: number;
  total_closed: number;
  total_pending: number;
}

interface CategoryPerformance {
  category_id: string;
  category_name: string;
  total_calls: number;
  closed_calls: number;
  pending_calls: number;
  cancelled_calls: number;
}

interface RevenueBreakdown {
  total_service_charges: number;
  total_material_charges: number;
  total_discounts: number;
  payment_pending: number;
  payment_received: number;
  net_revenue: number;
}

interface MonthlyTrend {
  month: string;
  total_calls: number;
  total_revenue: number;
}

interface Trend {
  total_closed_calls: number;
  total_revenue_from_closed: number;
  total_payment_received: number;
  total_payment_pending: number;
}

type DateFilter = 'today' | 'week' | 'month' | 'custom';

export default function ManagerReports() {
  const router = useRouter();
  const { user } = useAuth();
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  const [summary, setSummary] = useState<SummaryMetrics>({
    created: 0,
    cancelled: 0,
    closed: 0,
    unassigned: 0,
    assigned: 0,
    in_progress: 0,
    action_required: 0,
    under_services: 0,
    total_revenue: 0,
  });
  const [engineers, setEngineers] = useState<EngineerPerformance[]>([]);
  const [categories, setCategories] = useState<CategoryPerformance[]>([]);
  const [revenue, setRevenue] = useState<RevenueBreakdown>({
    total_service_charges: 0,
    total_material_charges: 0,
    total_discounts: 0,
    net_revenue: 0,
  });
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrend[]>([]);
  const [trend, setTrend] = useState<Trend>({
    total_closed_calls: 0,
    total_revenue_from_closed: 0,
    total_payment_received: 0,
    total_payment_pending: 0,
  });
  const [trendPeriodLabel, setTrendPeriodLabel] = useState('Today');
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);

  // Fetch business ID on mount
  useEffect(() => {
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
        console.error('Error fetching business ID:', error);
      }
    }
    fetchBusinessId();
  }, []);

  // Fetch reports when date filter, custom dates, or business ID changes
  useEffect(() => {
    if (!businessId) return;
    // Only refetch if we're not in custom mode, or if we're in custom mode with valid dates
    if (dateFilter !== "custom") {
      fetchReports();
    } else if (customStartDate && customEndDate && dateFilter === "custom") {
      fetchReports();
    }
  }, [dateFilter, customStartDate, customEndDate, businessId]);

  function getDateRange(): { start: string; end: string; filterType: string } {
    if (dateFilter === 'custom') {
      return {
        start: customStartDate,
        end: customEndDate,
        filterType: 'custom',
      };
    }

    if (dateFilter === 'today') {
      // Use timezone-aware "today" range
      const range = getTodayRange();
      return {
        start: format(range.start, 'yyyy-MM-dd'),
        end: format(range.end, 'yyyy-MM-dd'),
        filterType: 'today',
      };
    }

    if (dateFilter === 'week') {
      // Use timezone-aware "this week" range (last 7 days)
      const range = getThisWeekRange();
      return {
        start: format(range.start, 'yyyy-MM-dd'),
        end: format(range.end, 'yyyy-MM-dd'),
        filterType: 'this_week',
      };
    }

    if (dateFilter === 'month') {
      // Use timezone-aware "this month" range (last 30 days)
      const range = getThisMonthRange();
      return {
        start: format(range.start, 'yyyy-MM-dd'),
        end: format(range.end, 'yyyy-MM-dd'),
        filterType: 'this_month',
      };
    }

    // Default to today
    const range = getTodayRange();
    return {
      start: format(range.start, 'yyyy-MM-dd'),
      end: format(range.end, 'yyyy-MM-dd'),
      filterType: 'today',
    };
  }

  async function fetchReports() {
    try {
      setLoading(true);
      const { start, end, filterType } = getDateRange();
      const params = new URLSearchParams();
      params.append("filter", filterType);
      params.append("startDate", start);
      params.append("endDate", end);
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/reports?${params.toString()}`,
        {
          credentials: 'include',
        }
      );
      
      if (!response.ok) {
        throw new Error(`Reports API returned ${response.status}`);
      }

      const data = await response.json();
      setSummary(data.summary || {
        created: 0,
        cancelled: 0,
        closed: 0,
        unassigned: 0,
        assigned: 0,
        in_progress: 0,
        action_required: 0,
        under_services: 0,
        total_revenue: 0,
      });
      setEngineers(data.engineerPerformance || []);
      setCategories(data.categoryPerformance || []);
      setRevenue(data.revenueBreakdown || {
        total_service_charges: 0,
        total_material_charges: 0,
        total_discounts: 0,
        payment_pending: 0,
        payment_received: 0,
        net_revenue: 0,
      });
      setTrend(data.trend || {
        total_closed_calls: 0,
        total_revenue_from_closed: 0,
        total_payment_received: 0,
        total_payment_pending: 0,
      });
      setTrendPeriodLabel(data.trendPeriodLabel || 'Today');
      setMonthlyTrend(data.monthlyTrend || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error fetching reports:', errorMessage);
    } finally {
      setLoading(false);
    }
  }

  function formatDateDisplay(dateString: string) {
    return formatDateMedium(dateString);
  }

  function handleCustomDateApply() {
    if (customStartDate && customEndDate) {
      fetchReports();
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
              Reports
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Analytics</span>
            </div>
          </div>
          <button
            className="w-11 h-11 bg-white rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-center justify-center border border-slate-100 active:scale-95 transition-transform"
            onClick={() => router.back()}
          >
            <i className="ph-bold ph-x text-[22px] text-slate-700"></i>
          </button>
        </header>

        {/* Main Content */}
        <main className="w-full px-6 mt-6 pb-[140px] space-y-6 relative z-10">
          
          {/* Date Filter */}
          <section className="space-y-3">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest px-1">Period</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setDateFilter('today')}
                className={`px-4 py-3 rounded-[16px] font-bold text-sm transition-all ${
                  dateFilter === 'today'
                    ? 'bg-blue-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)]'
                    : 'bg-white text-slate-700 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)]'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setDateFilter('week')}
                className={`px-4 py-3 rounded-[16px] font-bold text-sm transition-all ${
                  dateFilter === 'week'
                    ? 'bg-blue-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)]'
                    : 'bg-white text-slate-700 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)]'
                }`}
              >
                This Week
              </button>
              <button
                onClick={() => setDateFilter('month')}
                className={`px-4 py-3 rounded-[16px] font-bold text-sm transition-all ${
                  dateFilter === 'month'
                    ? 'bg-blue-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)]'
                    : 'bg-white text-slate-700 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)]'
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => setDateFilter('custom')}
                className={`px-4 py-3 rounded-[16px] font-bold text-sm transition-all ${
                  dateFilter === 'custom'
                    ? 'bg-blue-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)]'
                    : 'bg-white text-slate-700 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)]'
                }`}
              >
                Custom
              </button>
            </div>

            {/* Custom Date Range */}
            {dateFilter === 'custom' && (
              <div className="bg-white rounded-[20px] p-4 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-[12px] border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-[12px] border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={handleCustomDateApply}
                  className="w-full bg-blue-600 text-white py-2 rounded-[12px] font-bold text-sm active:scale-95 transition-transform"
                >
                  Apply Filter
                </button>
              </div>
            )}
          </section>

          {/* Summary Metrics - NEW 8 CARD LAYOUT */}
          <section className="space-y-3">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest px-1">Summary</h2>
            <div className="grid grid-cols-2 gap-3">
              {/* Created - Event Count */}
              <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] transition-shadow">
                <div className="w-10 h-10 bg-blue-100 rounded-[14px] flex items-center justify-center mb-3">
                  <i className="ph-fill ph-plus-circle text-xl text-blue-600"></i>
                </div>
                <h3 className="text-3xl font-black text-slate-900">{summary.created}</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Created</p>
              </div>

              {/* Cancelled - Event Count */}
              <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] transition-shadow">
                <div className="w-10 h-10 bg-red-100 rounded-[14px] flex items-center justify-center mb-3">
                  <i className="ph-fill ph-x-circle text-xl text-red-600"></i>
                </div>
                <h3 className="text-3xl font-black text-slate-900">{summary.cancelled}</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Cancelled</p>
              </div>

              {/* Unassigned - Snapshot */}
              <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] transition-shadow">
                <div className="w-10 h-10 bg-slate-100 rounded-[14px] flex items-center justify-center mb-3">
                  <i className="ph-fill ph-circle-dashed text-xl text-slate-600"></i>
                </div>
                <h3 className="text-3xl font-black text-slate-900">{summary.unassigned}</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Unassigned</p>
              </div>

              {/* Assigned - Snapshot */}
              <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] transition-shadow">
                <div className="w-10 h-10 bg-purple-100 rounded-[14px] flex items-center justify-center mb-3">
                  <i className="ph-fill ph-user-check text-xl text-purple-600"></i>
                </div>
                <h3 className="text-3xl font-black text-slate-900">{summary.assigned}</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Assigned</p>
              </div>

              {/* Closed - Event Count */}
              <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] transition-shadow">
                <div className="w-10 h-10 bg-green-100 rounded-[14px] flex items-center justify-center mb-3">
                  <i className="ph-fill ph-check-circle text-xl text-green-600"></i>
                </div>
                <h3 className="text-3xl font-black text-slate-900">{summary.closed}</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Closed</p>
              </div>

              {/* In Progress - Snapshot */}
              <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] transition-shadow">
                <div className="w-10 h-10 bg-amber-100 rounded-[14px] flex items-center justify-center mb-3">
                  <i className="ph-fill ph-spinner text-xl text-amber-600"></i>
                </div>
                <h3 className="text-3xl font-black text-slate-900">{summary.in_progress}</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">In Progress</p>
              </div>

              {/* Action Required - Snapshot */}
              <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] transition-shadow">
                <div className="w-10 h-10 bg-red-100 rounded-[14px] flex items-center justify-center mb-3">
                  <i className="ph-fill ph-warning text-xl text-red-600"></i>
                </div>
                <h3 className="text-3xl font-black text-slate-900">{summary.action_required}</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Action Required</p>
              </div>

              {/* Under Services - Snapshot */}
              <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] transition-shadow">
                <div className="w-10 h-10 bg-indigo-100 rounded-[14px] flex items-center justify-center mb-3">
                  <i className="ph-fill ph-wrench text-xl text-indigo-600"></i>
                </div>
                <h3 className="text-3xl font-black text-slate-900">{summary.under_services}</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Under Services</p>
              </div>
            </div>
          </section>

          {/* Total Revenue */}
          <section className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-[24px] p-6 shadow-[0_4px_20px_rgba(37,99,235,0.3)] border border-blue-600">
              <h2 className="text-[11px] font-bold text-blue-100 uppercase tracking-wide mb-2">Total Revenue</h2>
              <h3 className="text-4xl font-black text-white">{Math.round(summary.total_revenue).toLocaleString()}</h3>
              <p className="text-blue-100 text-xs mt-2">From closed service calls</p>
            </section>

          {/* Revenue Breakdown */}
          <section className="space-y-3">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest px-1">Revenue Details</h2>
              <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-[12px] flex items-center justify-center">
                      <i className="ph-fill ph-handshake text-lg text-orange-600"></i>
                    </div>
                    <span className="font-bold text-slate-700">Service Charges</span>
                  </div>
                  <span className="font-black text-slate-900 text-lg">{Math.round(revenue.total_service_charges).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-[12px] flex items-center justify-center">
                      <i className="ph-fill ph-package text-lg text-blue-600"></i>
                    </div>
                    <span className="font-bold text-slate-700">Material Charges</span>
                  </div>
                  <span className="font-black text-slate-900 text-lg">{Math.round(revenue.total_material_charges).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-[12px] flex items-center justify-center">
                      <i className="ph-fill ph-minus-circle text-lg text-red-600"></i>
                    </div>
                    <span className="font-bold text-slate-700">Discounts</span>
                  </div>
                  <span className="font-black text-red-600 text-lg">-{Math.round(revenue.total_discounts).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between pt-4 pb-4 px-4 -mx-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-[16px] border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-[12px] flex items-center justify-center">
                      <i className="ph-fill ph-money text-lg text-white"></i>
                    </div>
                    <span className="font-black text-blue-900 text-lg">Net Revenue</span>
                  </div>
                  <span className="font-black text-blue-600 text-2xl">{Math.round(revenue.net_revenue).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-[12px] flex items-center justify-center">
                      <i className="ph-fill ph-check-circle text-lg text-green-600"></i>
                    </div>
                    <span className="font-bold text-slate-700">Payment Received</span>
                  </div>
                  <span className="font-black text-green-600 text-lg">{Math.round(revenue.payment_received).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-[12px] flex items-center justify-center">
                      <i className="ph-fill ph-hourglass text-lg text-orange-600"></i>
                    </div>
                    <span className="font-bold text-slate-700">Payment Pending</span>
                  </div>
                  <span className="font-black text-orange-600 text-lg">{Math.round(revenue.payment_pending).toLocaleString()}</span>
                </div>
              </div>
            </section>

          {/* Engineer Performance */}
          <section className="space-y-3">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest px-1">Engineer Performance</h2>
            {engineers.length === 0 ? (
              <div className="bg-white rounded-[24px] p-8 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] text-center">
                <div className="w-14 h-14 bg-slate-100 rounded-[14px] flex items-center justify-center mx-auto mb-3">
                  <i className="ph-fill ph-user-check text-[28px] text-slate-400"></i>
                </div>
                <p className="text-slate-500 text-sm font-semibold">No engineer data for selected period</p>
              </div>
            ) : (
              <div className="space-y-3">
                {engineers.map((engineer) => (
                  <div key={engineer.engineer_id} className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] transition-shadow">
                    <h3 className="font-black text-slate-900 mb-4 text-base">{engineer.engineer_name}</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-slate-50 rounded-[16px] p-4 text-center border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">Assigned</p>
                        <p className="text-2xl font-black text-slate-900">{engineer.total_assigned}</p>
                      </div>
                      <div className="bg-green-50 rounded-[16px] p-4 text-center border border-green-200">
                        <p className="text-[10px] font-bold text-green-700 uppercase tracking-widest mb-2">Closed</p>
                        <p className="text-2xl font-black text-green-600">{engineer.total_closed}</p>
                      </div>
                      <div className="bg-amber-50 rounded-[16px] p-4 text-center border border-amber-200">
                        <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-2">Pending</p>
                        <p className="text-2xl font-black text-amber-600">{engineer.total_pending}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Category Performance */}
          <section className="space-y-3">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest px-1">Category Performance</h2>
            {categories.length === 0 ? (
              <div className="bg-white rounded-[24px] p-8 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] text-center">
                <div className="w-14 h-14 bg-slate-100 rounded-[14px] flex items-center justify-center mx-auto mb-3">
                  <i className="ph-fill ph-tag text-[28px] text-slate-400"></i>
                </div>
                <p className="text-slate-500 text-sm font-semibold">No category data for selected period</p>
              </div>
            ) : (
              <div className="space-y-3">
                {categories.map((category) => (
                  <div key={category.category_id} className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] transition-shadow">
                    <h3 className="font-black text-slate-900 mb-4 text-base">{category.category_name}</h3>
                    <div className="grid grid-cols-4 gap-2.5">
                      <div className="bg-slate-50 rounded-[14px] p-3 text-center border border-slate-100">
                        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">Total</p>
                        <p className="text-xl font-black text-slate-900">{category.total_calls}</p>
                      </div>
                      <div className="bg-green-50 rounded-[14px] p-3 text-center border border-green-200">
                        <p className="text-[9px] font-bold text-green-700 uppercase tracking-widest mb-1.5">Closed</p>
                        <p className="text-xl font-black text-green-600">{category.closed_calls}</p>
                      </div>
                      <div className="bg-amber-50 rounded-[14px] p-3 text-center border border-amber-200">
                        <p className="text-[9px] font-bold text-amber-700 uppercase tracking-widest mb-1.5">Pending</p>
                        <p className="text-xl font-black text-amber-600">{category.pending_calls}</p>
                      </div>
                      <div className="bg-red-50 rounded-[14px] p-3 text-center border border-red-200">
                        <p className="text-[9px] font-bold text-red-700 uppercase tracking-widest mb-1.5">Cancelled</p>
                        <p className="text-xl font-black text-red-600">{category.cancelled_calls}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Trend Section (Period-based) */}
          <section className="space-y-3">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest px-1">{trendPeriodLabel}'s Performance</h2>
            <div className="space-y-3">
              <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-[18px] p-5 border border-green-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-green-600 rounded-[10px] flex items-center justify-center">
                        <i className="ph-fill ph-check-circle text-white"></i>
                      </div>
                      <p className="text-[10px] font-bold text-green-700 uppercase tracking-widest">Closed Calls</p>
                    </div>
                    <p className="text-3xl font-black text-green-700">{trend.total_closed_calls}</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-[18px] p-5 border border-blue-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-[10px] flex items-center justify-center">
                        <i className="ph-fill ph-money text-white"></i>
                      </div>
                      <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">Revenue</p>
                    </div>
                    <p className="text-2xl font-black text-blue-700">{Math.round(trend.total_revenue_from_closed).toLocaleString()}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-[18px] p-5 border border-green-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-green-600 rounded-[10px] flex items-center justify-center">
                        <i className="ph-fill ph-check-square text-white"></i>
                      </div>
                      <p className="text-[10px] font-bold text-green-700 uppercase tracking-widest">Paid</p>
                    </div>
                    <p className="text-2xl font-black text-green-700">{Math.round(trend.total_payment_received).toLocaleString()}</p>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-[18px] p-5 border border-amber-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-amber-600 rounded-[10px] flex items-center justify-center">
                        <i className="ph-fill ph-hourglass text-white"></i>
                      </div>
                      <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Pending</p>
                    </div>
                    <p className="text-2xl font-black text-amber-700">{Math.round(trend.total_payment_pending).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

        </main>

        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
