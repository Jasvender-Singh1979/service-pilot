'use client';

import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import BottomNav from '@/app/components/BottomNav';
import { ChevronLeft } from 'lucide-react';

interface PreviousCall {
  id: string;
  call_id: string;
  created_at: string;
  category_name_snapshot: string;
  problem_reported: string;
  call_status: string;
  assigned_engineer_name: string | null;
  grand_total: number;
  paid_amount: number;
}

interface CustomerHistoryData {
  summary: {
    previous_calls: number;
    open_calls: number;
    closed_calls: number;
    cancelled_calls: number;
    last_call_date: string | null;
  };
  previous_calls: PreviousCall[];
}

function CustomerHistoryContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const countryCode = searchParams.get('countryCode') || '';
  const phoneNumber = searchParams.get('phoneNumber') || '';

  const [data, setData] = useState<CustomerHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (countryCode && phoneNumber) {
      fetchCustomerHistory();
    }
  }, [countryCode, phoneNumber]);

  const fetchCustomerHistory = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(
        `/api/service-calls/customer-history?countryCode=${encodeURIComponent(countryCode)}&phoneNumber=${encodeURIComponent(phoneNumber)}`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch customer history');
      }

      const resultData = await response.json();
      setData(resultData);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('Error fetching customer history:', errorMsg);
      setError(errorMsg);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned':
        return 'bg-blue-100 text-blue-700 border border-blue-200';
      case 'in_progress':
        return 'bg-amber-100 text-amber-700 border border-amber-200';
      case 'pending_action_required':
        return 'bg-red-100 text-red-700 border border-red-200';
      case 'pending_under_services':
        return 'bg-indigo-100 text-indigo-700 border border-indigo-200';
      case 'closed':
        return 'bg-green-100 text-green-700 border border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-700 border border-red-200';
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'assigned':
        return 'Assigned';
      case 'in_progress':
        return 'In Progress';
      case 'pending_action_required':
        return 'Pending Action';
      case 'pending_under_services':
        return 'Pending Services';
      case 'closed':
        return 'Closed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const formatCurrency = (value: any): string => {
    try {
      const num = typeof value === 'string' ? parseFloat(value) : typeof value === 'number' ? value : 0;
      if (isNaN(num)) return '0.00';
      return num.toFixed(2);
    } catch {
      return '0.00';
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const timeStr = date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return `${dateStr} at ${timeStr}`;
  };

  if (loading) {
    return (
      <div className="bg-[#F8F9FB] text-slate-900 pt-[55px] overflow-x-hidden relative min-h-screen pb-20">
        <header className="w-full px-6 pb-4 flex justify-between items-center relative z-10">
          <button
            onClick={() => router.push('/manager')}
            className="w-11 h-11 bg-white rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-center justify-center border border-slate-100 active:scale-95 transition-transform cursor-pointer"
            type="button"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5 text-slate-700" />
          </button>
          <div className="flex-1 ml-4">
            <h1 className="text-xl font-black tracking-tight text-slate-900 mb-1">Loading...</h1>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="bg-[#F8F9FB] text-slate-900 pt-[55px] overflow-x-hidden relative min-h-screen pb-20">
      <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none bg-noise mix-blend-multiply"></div>
      <div className="fixed top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none z-0"></div>

      <header className="w-full px-6 pb-4 flex justify-between items-center relative z-10">
        <button
          onClick={() => router.push('/manager')}
          className="w-11 h-11 bg-white rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-center justify-center border border-slate-100 active:scale-95 transition-transform cursor-pointer"
          type="button"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5 text-slate-700" />
        </button>
        <div className="flex-1 ml-4">
          <h1 className="text-xl font-black tracking-tight text-slate-900 mb-1">Customer History</h1>
          <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">
            {countryCode} {phoneNumber}
          </p>
        </div>
      </header>

      <main className="w-full px-6 mt-6 pb-[140px] space-y-5 relative z-10">
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-[16px] p-4 text-red-700 text-sm font-medium">
            Unable to load customer history
          </div>
        )}

        {!error && data && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-[16px] p-4 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">Previous Calls</p>
                <p className="text-3xl font-black text-slate-900">{data.summary.previous_calls}</p>
              </div>
              <div className="bg-white rounded-[16px] p-4 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">Open Calls</p>
                <p className="text-3xl font-black text-blue-600">{data.summary.open_calls}</p>
              </div>
              <div className="bg-white rounded-[16px] p-4 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">Closed Calls</p>
                <p className="text-3xl font-black text-green-600">{data.summary.closed_calls}</p>
              </div>
              <div className="bg-white rounded-[16px] p-4 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">Cancelled</p>
                <p className="text-3xl font-black text-red-600">{data.summary.cancelled_calls}</p>
              </div>
            </div>

            {/* Last Call Date */}
            {data.summary.last_call_date && (
              <div className="bg-white rounded-[16px] p-4 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">Last Call</p>
                <p className="text-base font-bold text-slate-900">{formatDateTime(data.summary.last_call_date)}</p>
              </div>
            )}

            {/* Previous Calls List */}
            {data.previous_calls && data.previous_calls.length > 0 ? (
              <div>
                <h2 className="text-base font-black text-slate-900 mb-3">Previous Calls</h2>
                <div className="space-y-3">
                  {data.previous_calls.map((call) => (
                    <div
                      key={call.id}
                      onClick={() => {
                        const params = new URLSearchParams();
                        params.set('id', call.id);
                        router.push(`/manager/service-calls?${params.toString()}`);
                      }}
                      className="bg-white rounded-[16px] p-4 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] cursor-pointer hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)] active:scale-95 transition-all"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          {call.call_id && (
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">CALL ID</p>
                          )}
                          <h3 className="text-base font-black text-slate-900">{call.call_id}</h3>
                          <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mt-2">
                            {formatDateTime(call.created_at)}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1.5 rounded-[10px] text-[9px] font-bold uppercase tracking-wider whitespace-nowrap ${getStatusColor(
                            call.call_status
                          )}`}
                        >
                          {getStatusLabel(call.call_status)}
                        </span>
                      </div>
                      <div className="space-y-2 pt-3 border-t border-slate-200">
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Category</p>
                          <p className="text-sm font-bold text-slate-900">{call.category_name_snapshot}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Issue</p>
                          <p className="text-xs text-slate-700">{call.problem_reported}</p>
                        </div>
                        {call.assigned_engineer_name && (
                          <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Engineer</p>
                            <p className="text-xs font-bold text-blue-600">{call.assigned_engineer_name}</p>
                          </div>
                        )}
                        {call.call_status === 'closed' && (
                          <div className="pt-2 border-t border-slate-200">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total</p>
                                <p className="text-sm font-bold text-slate-900">{formatCurrency(call.grand_total)}</p>
                              </div>
                              <div className="text-right">
                                {call.paid_amount > 0 && (
                                  <div className="mb-1">
                                    <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Paid</p>
                                    <p className="text-xs font-bold text-green-600">{formatCurrency(call.paid_amount)}</p>
                                  </div>
                                )}
                                {call.grand_total - call.paid_amount > 0 && (
                                  <div>
                                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Pending</p>
                                    <p className="text-xs font-bold text-red-600">
                                      {formatCurrency(call.grand_total - call.paid_amount)}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-[20px] p-8 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] text-center">
                <p className="text-slate-600 font-bold">No previous customer history found</p>
              </div>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

export default function CustomerHistoryPage() {
  return (
    <ProtectedRoute requiredRole="manager">
      <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
        <CustomerHistoryContent />
      </Suspense>
    </ProtectedRoute>
  );
}
