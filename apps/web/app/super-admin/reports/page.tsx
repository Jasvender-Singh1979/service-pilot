'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import BottomNav from '@/app/components/BottomNav';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { getTodayRangeIST, getThisWeekRangeIST, getThisMonthRangeIST } from '@/lib/dateUtils';
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

interface ManagerPerformance {
  manager_id: string;
  manager_name: string;
  created: number;
  cancelled: number;
  closed: number;
}

interface Trend {
  total_closed_calls: number;
  total_revenue_from_closed: number;
  total_payment_received: number;
  total_payment_pending: number;
}

type DateFilter = 'today' | 'week' | 'month' | 'custom';

type ReportMode = 'combined' | 'individual';

interface Manager {
  id: string;
  name: string;
}

export default function SuperAdminReports() {
  const router = useRouter();
  const { user } = useAuth();
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [reportMode, setReportMode] = useState<ReportMode>('combined');
  const [managerOptions, setManagers] = useState<Manager[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null);
  
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
  const [managerList, setManagersList] = useState<ManagerPerformance[]>([]);
  const [trend, setTrend] = useState<Trend>({
    total_closed_calls: 0,
    total_revenue_from_closed: 0,
    total_payment_received: 0,
    total_payment_pending: 0,
  });
  const [trendPeriodLabel, setTrendPeriodLabel] = useState('Today');
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Fetch business ID and managers on mount
  useEffect(() => {
    async function fetchBusinessIdAndManagers() {
      try {
        const response = await fetch(`/api/user/me`, {
          credentials: 'include',
        });
        if (!response.ok) {
          router.push('/login');
          return;
        }
        const userData = await response.json();
        setUser(userData);

        const managersResponse = await fetch(`/api/managers`, {
          credentials: 'include',
        });
        const managersData = await managersResponse.json();
        if (Array.isArray(managersData)) {
          setManagers(managersData.map((m: any) => ({ id: m.id, name: m.name })));
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    }
    fetchBusinessIdAndManagers();
  }, []);

  // Fetch reports when date filter, report mode, selected manager, or business ID changes
  useEffect(() => {
    if (!businessId) return;
    // Only refetch if we're not in custom mode, or if we're in custom mode with valid dates
    if (dateFilter !== "custom") {
      fetchReports();
    } else if (customStartDate && customEndDate && dateFilter === "custom") {
      fetchReports();
    }
  }, [dateFilter, reportMode, selectedManagerId, customStartDate, customEndDate, businessId]);

  function getDateRange(): { start: string; end: string; filterType: string } {
    if (dateFilter === 'custom') {
      return {
        start: customStartDate,
        end: customEndDate,
        filterType: 'custom',
      };
    }

    if (dateFilter === 'today') {
      // Use IST-aware "today" range
      const range = getTodayRangeIST();
      return {
        start: format(range.start, 'yyyy-MM-dd'),
        end: format(range.end, 'yyyy-MM-dd'),
        filterType: 'today',
      };
    }

    if (dateFilter === 'week') {
      // Use IST-aware "this week" range (last 7 days)
      const range = getThisWeekRangeIST();
      return {
        start: format(range.start, 'yyyy-MM-dd'),
        end: format(range.end, 'yyyy-MM-dd'),
        filterType: 'this_week',
      };
    }

    if (dateFilter === 'month') {
      // Use IST-aware "this month" range (last 30 days)
      const range = getThisMonthRangeIST();
      return {
        start: format(range.start, 'yyyy-MM-dd'),
        end: format(range.end, 'yyyy-MM-dd'),
        filterType: 'this_month',
      };
    }

    // Default to today
    const range = getTodayRangeIST();
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
      
      // Add manager ID if in individual mode
      if (reportMode === "individual" && selectedManagerId) {
        params.append("managerId", selectedManagerId);
      }
      
      const response = await fetch(
        `/api/reports?${params.toString()}`,
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
      setManagersList(data.managerPerformance || []);
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
      setDebugInfo(data.debug || {});
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
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Business Intelligence</span>
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
          
          {/* Report Mode Selector */}
          <section className="space-y-3">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest px-1">Report Mode</h2>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setReportMode('combined');
                  setSelectedManagerId(null);
                }}
                className={`flex-1 px-4 py-3 rounded-[16px] font-bold text-sm transition-all ${
                  reportMode === 'combined'
                    ? 'bg-blue-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)]'
                    : 'bg-white text-slate-700 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)]'
                }`}
              >
                Combined
              </button>
              <button
                onClick={() => setReportMode('individual')}
                className={`flex-1 px-4 py-3 rounded-[16px] font-bold text-sm transition-all ${
                  reportMode === 'individual'
                    ? 'bg-blue-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)]'
                    : 'bg-white text-slate-700 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)]'
                }`}
              >
                By Manager
              </button>
            </div>
            
            {/* Manager Selector */}
            {reportMode === 'individual' && (
              <div className="bg-white rounded-[20px] p-4 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Select Manager</label>
                <select
                  value={selectedManagerId || ''}
                  onChange={(e) => setSelectedManagerId(e.target.value || null)}
                  className="w-full px-3 py-2 rounded-[12px] border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Choose a manager --</option>
                  {managerOptions.map((mgr) => (
                    <option key={mgr.id} value={mgr.id}>
                      {mgr.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </section>
          
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
              <div className="bg-white rounded-[20px] p-4 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                <div className="w-8 h-8 bg-blue-100 rounded-[12px] flex items-center justify-center mb-3">
                  <i className="ph-fill ph-plus-circle text-lg text-blue-600"></i>
                </div>
                <h3 className="text-2xl font-black text-slate-900">{summary.created}</h3>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mt-1">Created</p>
              </div>

              {/* Cancelled - Event Count */}
              <div className="bg-white rounded-[20px] p-4 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                <div className="w-8 h-8 bg-red-100 rounded-[12px] flex items-center justify-center mb-3">
                  <i className="ph-fill ph-x-circle text-lg text-red-600"></i>
                </div>
                <h3 className="text-2xl font-black text-slate-900">{summary.cancelled}</h3>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mt-1">Cancelled</p>
              </div>

              {/* Unassigned - Snapshot */}
              <div className="bg-white rounded-[20px] p-4 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                <div className="w-8 h-8 bg-gray-100 rounded-[12px] flex items-center justify-center mb-3">
                  <i className="ph-fill ph-circle-dashed text-lg text-gray-600"></i>
                </div>
                <h3 className="text-2xl font-black text-slate-900">{summary.unassigned}</h3>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mt-1">Unassigned</p>
              </div>

              {/* Assigned - Snapshot */}
              <div className="bg-white rounded-[20px] p-4 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                <div className="w-8 h-8 bg-purple-100 rounded-[12px] flex items-center justify-center mb-3">
                  <i className="ph-fill ph-user-check text-lg text-purple-600"></i>
                </div>
                <h3 className="text-2xl font-black text-slate-900">{summary.assigned}</h3>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mt-1">Assigned</p>
              </div>

              {/* Closed - Event Count */}
              <div className="bg-white rounded-[20px] p-4 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                <div className="w-8 h-8 bg-green-100 rounded-[12px] flex items-center justify-center mb-3">
                  <i className="ph-fill ph-check-circle text-lg text-green-600"></i>
                </div>
                <h3 className="text-2xl font-black text-slate-900">{summary.closed}</h3>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mt-1">Closed</p>
              </div>

              {/* In Progress - Snapshot */}
              <div className="bg-white rounded-[20px] p-4 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                <div className="w-8 h-8 bg-orange-100 rounded-[12px] flex items-center justify-center mb-3">
                  <i className="ph-fill ph-spinner text-lg text-orange-600"></i>
                </div>
                <h3 className="text-2xl font-black text-slate-900">{summary.in_progress}</h3>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mt-1">In Progress</p>
              </div>

              {/* Action Required - Snapshot */}
              <div className="bg-white rounded-[20px] p-4 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                <div className="w-8 h-8 bg-yellow-100 rounded-[12px] flex items-center justify-center mb-3">
                  <i className="ph-fill ph-warning text-lg text-yellow-600"></i>
                </div>
                <h3 className="text-2xl font-black text-slate-900">{summary.action_required}</h3>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mt-1">Action Required</p>
              </div>

              {/* Under Services - Snapshot */}
              <div className="bg-white rounded-[20px] p-4 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                <div className="w-8 h-8 bg-indigo-100 rounded-[12px] flex items-center justify-center mb-3">
                  <i className="ph-fill ph-wrench text-lg text-indigo-600"></i>
                </div>
                <h3 className="text-2xl font-black text-slate-900">{summary.under_services}</h3>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mt-1">Under Services</p>
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
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest px-1">Revenue Breakdown</h2>
              <div className="bg-white rounded-[20px] p-5 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="font-bold text-slate-700">Service Charges</span>
                  <span className="font-black text-slate-900">{Math.round(revenue.total_service_charges).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="font-bold text-slate-700">Material Charges</span>
                  <span className="font-black text-slate-900">{Math.round(revenue.total_material_charges).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="font-bold text-slate-700">Discounts</span>
                  <span className="font-black text-red-600">-{Math.round(revenue.total_discounts).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between pt-2 pb-3 border-b border-slate-100 bg-blue-50 rounded-[12px] p-3 -m-3 px-3">
                  <span className="font-black text-blue-900">Net Revenue</span>
                  <span className="font-black text-blue-600 text-lg">{Math.round(revenue.net_revenue).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="font-bold text-slate-700">Payment Received</span>
                  <span className="font-black text-green-600">{Math.round(revenue.payment_received).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Payment Pending</span>
                  <span className="font-black text-orange-600">{Math.round(revenue.payment_pending).toLocaleString()}</span>
                </div>
              </div>
            </section>

          {/* Manager Performance (Super Admin Only) */}
          <section className="space-y-3">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest px-1">Manager Performance</h2>
            {managerList.length === 0 ? (
              <div className="bg-white rounded-[20px] p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] text-center">
                <p className="text-slate-500 text-sm font-semibold">No manager data for selected period</p>
              </div>
            ) : (
              <div className="space-y-3">
                {managerList.map((manager) => (
                  <div key={manager.manager_id} className="bg-white rounded-[20px] p-4 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                    <h3 className="font-bold text-slate-900 mb-3">{manager.manager_name}</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Created</p>
                        <p className="text-xl font-black text-slate-900">{manager.created}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Closed</p>
                        <p className="text-xl font-black text-green-600">{manager.closed}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Cancelled</p>
                        <p className="text-xl font-black text-red-600">{manager.cancelled}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Engineer Performance */}
          <section className="space-y-3">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest px-1">Engineer Performance</h2>
            {engineers.length === 0 ? (
              <div className="bg-white rounded-[20px] p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] text-center">
                <p className="text-slate-500 text-sm font-semibold">No engineer data for selected period</p>
              </div>
            ) : (
              <div className="space-y-3">
                {engineers.map((engineer) => (
                  <div key={engineer.engineer_id} className="bg-white rounded-[20px] p-4 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                    <h3 className="font-bold text-slate-900 mb-3">{engineer.engineer_name}</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Assigned</p>
                        <p className="text-xl font-black text-slate-900">{engineer.total_assigned}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Closed</p>
                        <p className="text-xl font-black text-green-600">{engineer.total_closed}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Pending</p>
                        <p className="text-xl font-black text-orange-600">{engineer.total_pending}</p>
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
              <div className="bg-white rounded-[20px] p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] text-center">
                <p className="text-slate-500 text-sm font-semibold">No category data for selected period</p>
              </div>
            ) : (
              <div className="space-y-3">
                {categories.map((category) => (
                  <div key={category.category_id} className="bg-white rounded-[20px] p-4 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                    <h3 className="font-bold text-slate-900 mb-3">{category.category_name}</h3>
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Total</p>
                        <p className="text-lg font-black text-slate-900">{category.total_calls}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Closed</p>
                        <p className="text-lg font-black text-green-600">{category.closed_calls}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Pending</p>
                        <p className="text-lg font-black text-orange-600">{category.pending_calls}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Cancelled</p>
                        <p className="text-lg font-black text-red-600">{category.cancelled_calls}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Trend Section (Period-based) */}
          <section className="space-y-3">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest px-1">{trendPeriodLabel}'s Trend</h2>
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-[24px] p-6 border border-slate-200 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-[20px] p-4 border border-slate-100 shadow-sm">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Closed Calls</p>
                  <p className="text-3xl font-black text-green-600">{trend.total_closed_calls}</p>
                </div>
                <div className="bg-white rounded-[20px] p-4 border border-slate-100 shadow-sm">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Revenue</p>
                  <p className="text-2xl font-black text-blue-600">{Math.round(trend.total_revenue_from_closed).toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-[20px] p-4 border border-slate-100 shadow-sm">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Paid</p>
                  <p className="text-2xl font-black text-green-600">{Math.round(trend.total_payment_received).toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-[20px] p-4 border border-slate-100 shadow-sm">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Pending</p>
                  <p className="text-2xl font-black text-orange-600">{Math.round(trend.total_payment_pending).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Temporary Debug Panel */}
          {debugInfo && (
            <section className="space-y-3 bg-slate-900 rounded-[20px] p-5 text-white border border-slate-700">
              <h2 className="text-sm font-black text-slate-300 uppercase tracking-widest px-1">🔍 Debug Info (Temporary)</h2>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Timezone:</span>
                  <span className="text-cyan-400">{debugInfo.timezone || 'unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Time:</span>
                  <span className="text-cyan-400">{debugInfo.current_time || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Role:</span>
                  <span className="text-blue-400">{debugInfo.role || 'unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Business ID:</span>
                  <span className="text-green-400">{debugInfo.business_id || 'none'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Manager ID:</span>
                  <span className="text-green-400">{debugInfo.manager_id || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Report Mode:</span>
                  <span className="text-yellow-400">{debugInfo.report_mode || 'unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Filter Type:</span>
                  <span className="text-yellow-400">{debugInfo.filter_type || 'unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Selected Filter:</span>
                  <span className="text-yellow-400">{debugInfo.selected_filter || 'unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Date Range:</span>
                  <span className="text-yellow-400">{debugInfo.start_date} to {debugInfo.end_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Filter Type:</span>
                  <span className="text-cyan-400">{debugInfo.selected_filter_type || 'unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Local Start:</span>
                  <span className="text-cyan-400" style={{fontSize: '10px'}}>{debugInfo.selected_local_start_datetime || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Local End (Excl):</span>
                  <span className="text-cyan-400" style={{fontSize: '10px'}}>{debugInfo.selected_local_end_exclusive_datetime || 'N/A'}</span>
                </div>
                <div className="border-t border-slate-700 my-2"></div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Created (Event):</span>
                  <span className="text-green-400">{debugInfo.created_event_count || debugInfo.created_count || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cancelled (Event):</span>
                  <span className="text-red-400">{debugInfo.cancelled_event_count || debugInfo.cancelled_count || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Closed (Event):</span>
                  <span className="text-green-400">{debugInfo.closed_event_count || debugInfo.closed_count || 0}</span>
                </div>
                <div className="flex justify-between" style={{fontSize: '9px'}}>
                  <span className="text-slate-400">💾 Snapshot Counts (as of range end):</span>
                  <span className="text-slate-300"></span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Unassigned Snapshot:</span>
                  <span className="text-gray-400">{debugInfo.unassigned_snapshot_count || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Assigned Snapshot:</span>
                  <span className="text-purple-400">{debugInfo.assigned_snapshot_count || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">In Progress Snapshot:</span>
                  <span className="text-orange-400">{debugInfo.in_progress_snapshot_count || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Action Required Snapshot:</span>
                  <span className="text-yellow-400">{debugInfo.action_required_snapshot_count || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Under Services Snapshot:</span>
                  <span className="text-indigo-400">{debugInfo.under_services_snapshot_count || 0}</span>
                </div>
                <div className="border-t border-slate-700 my-2"></div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Service Amount:</span>
                  <span className="text-orange-400">{Math.round(debugInfo.service_amount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Material Amount:</span>
                  <span className="text-orange-400">{Math.round(debugInfo.material_amount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Discounts:</span>
                  <span className="text-orange-400">{Math.round(debugInfo.total_discounts || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Payment Pending:</span>
                  <span className="text-orange-400">{Math.round(debugInfo.payment_pending || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Payment Received:</span>
                  <span className="text-green-400">{Math.round(debugInfo.payment_received || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Revenue:</span>
                  <span className="text-cyan-400">{Math.round(debugInfo.total_revenue || 0).toLocaleString()}</span>
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
