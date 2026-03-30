'use client';

import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import EngineerLayout from '@/app/components/EngineerLayout';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import BottomNav from '@/app/components/BottomNav';
import { toast } from '@/lib/toast';
import { DetailPageSkeleton } from '@/app/components/Skeletons';

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
        `${process.env.NEXT_PUBLIC_API_URL}/api/service-calls/customer-history?countryCode=${encodeURIComponent(countryCode)}&phoneNumber=${encodeURIComponent(phoneNumber)}`,
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
      toast.error('Failed to load customer history');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-orange-100 text-orange-800';
      case 'pending_action_required':
        return 'bg-red-100 text-red-800';
      case 'pending_under_services':
        return 'bg-yellow-100 text-yellow-800';
      case 'closed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  if (loading) {
    return (
      <EngineerLayout showHeader={true}>
        <DetailPageSkeleton />
      </EngineerLayout>
    );
  }

  return (
    <EngineerLayout showHeader={true}>
      <div className="px-6 pt-6 pb-4 bg-white border-b border-slate-100">
        <h2 className="text-lg font-bold text-slate-900 mb-1">Customer History</h2>
        <p className="text-slate-600 text-sm">
          {countryCode} {phoneNumber}
        </p>
      </div>

      <div className="flex-1 p-4 pb-24">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-red-700 text-sm">
            Unable to load customer history
          </div>
        )}

        {!error && data && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-white rounded-lg p-4 border">
                <div className="text-xs text-gray-500 font-semibold mb-1">PREVIOUS CALLS</div>
                <div className="text-2xl font-bold text-gray-900">{data.summary.previous_calls}</div>
              </div>
              <div className="bg-white rounded-lg p-4 border">
                <div className="text-xs text-gray-500 font-semibold mb-1">OPEN CALLS</div>
                <div className="text-2xl font-bold text-blue-600">{data.summary.open_calls}</div>
              </div>
              <div className="bg-white rounded-lg p-4 border">
                <div className="text-xs text-gray-500 font-semibold mb-1">CLOSED CALLS</div>
                <div className="text-2xl font-bold text-green-600">{data.summary.closed_calls}</div>
              </div>
              <div className="bg-white rounded-lg p-4 border">
                <div className="text-xs text-gray-500 font-semibold mb-1">CANCELLED</div>
                <div className="text-2xl font-bold text-red-600">{data.summary.cancelled_calls}</div>
              </div>
            </div>

            {/* Last Call Date */}
            {data.summary.last_call_date && (
              <div className="bg-white rounded-lg p-4 mb-4 border">
                <div className="text-xs text-gray-500 font-semibold mb-1">LAST CALL</div>
                <div className="text-gray-900 font-medium">
                  {new Date(data.summary.last_call_date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            )}

            {/* Previous Calls List */}
            {data.previous_calls && data.previous_calls.length > 0 ? (
              <div className="space-y-3">
                <h2 className="font-bold text-gray-900 mb-3">Previous Calls</h2>
                {data.previous_calls.map((call) => (
                  <div
                    key={call.id}
                    onClick={() => {
                      router.push(`/engineer/service-calls/detail?callId=${call.id}`);
                      toast.info('Opening call details...');
                    }}
                    className="bg-white rounded-lg p-4 border cursor-pointer hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-sm font-bold text-gray-900">{call.call_id}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(call.created_at).toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                          call.call_status
                        )}`}
                      >
                        {getStatusLabel(call.call_status)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 mb-2">
                      <div className="font-semibold text-gray-700 mb-1">{call.category_name_snapshot}</div>
                      <div>{call.problem_reported}</div>
                    </div>
                    {call.assigned_engineer_name && (
                      <div className="text-xs text-blue-600 font-semibold mb-2">Engineer: {call.assigned_engineer_name}</div>
                    )}
                    {call.call_status === 'closed' && (
                      <div className="text-xs text-gray-600 pt-2 border-t">
                        <div className="font-semibold text-gray-700">Total: {formatCurrency(call.grand_total)}</div>
                        {call.paid_amount > 0 && (
                          <div className="text-green-600">Paid: {formatCurrency(call.paid_amount)}</div>
                        )}
                        {call.grand_total - call.paid_amount > 0 && (
                          <div className="text-red-600">
                            Pending: {formatCurrency(call.grand_total - call.paid_amount)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg p-6 border text-center">
                <p className="text-gray-500 font-medium">No previous customer history found</p>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </EngineerLayout>
  );
}

export default function CustomerHistoryPage() {
  return (
    <ProtectedRoute allowedRoles={['engineer']}>
      <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
        <CustomerHistoryContent />
      </Suspense>
    </ProtectedRoute>
  );
}
