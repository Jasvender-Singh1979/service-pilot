'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

interface PreviousCall {
  id: string;
  call_id: string;
  created_at: string;
  category_name: string;
  problem_reported: string;
  status: string;
  assigned_engineer_name?: string;
  closure_timestamp?: string;
  grand_total?: number;
  paid_amount?: number;
  service_payment_status?: string;
  material_payment_status?: string;
}

interface CustomerHistorySummary {
  previousCalls: number;
  openCalls: number;
  closedCalls: number;
  cancelledCalls: number;
  lastCallDate: string | null;
}

interface CustomerHistoryProps {
  countryCode: string;
  phoneNumber: string;
  businessId: string;
  currentCallId: string;
  onCallClick: (callId: string) => void;
}

export default function CustomerHistory({
  countryCode,
  phoneNumber,
  businessId,
  currentCallId,
  onCallClick,
}: CustomerHistoryProps) {
  const [summary, setSummary] = useState<CustomerHistorySummary | null>(null);
  const [previousCalls, setPreviousCalls] = useState<PreviousCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchCustomerHistory = async () => {
      try {
        setLoading(true);
        setError('');

        const params = new URLSearchParams();
        params.set('countryCode', countryCode);
        params.set('phoneNumber', phoneNumber);
        params.set('businessId', businessId);
        params.set('currentCallId', currentCallId);

        const response = await fetch(
          `/api/service-calls/customer-history?${params}`,
          {
            credentials: 'include',
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch customer history');
        }

        const data = await response.json();
        setSummary(data.summary);
        setPreviousCalls(data.previousCalls || []);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load customer history';
        setError(errorMessage);
        console.error('Error fetching customer history:', err);
        // Set empty state on error
        setSummary({
          previousCalls: 0,
          openCalls: 0,
          closedCalls: 0,
          cancelledCalls: 0,
          lastCallDate: null,
        });
      } finally {
        setLoading(false);
      }
    };

    if (phoneNumber && businessId && currentCallId) {
      fetchCustomerHistory();
    }
  }, [phoneNumber, businessId, currentCallId, countryCode]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned':
        return 'bg-blue-100 text-blue-700';
      case 'in_progress':
        return 'bg-orange-100 text-orange-700';
      case 'pending_action_required':
        return 'bg-red-100 text-red-700';
      case 'pending_under_services':
        return 'bg-yellow-100 text-yellow-700';
      case 'closed':
        return 'bg-green-100 text-green-700';
      case 'cancelled':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-slate-100 text-slate-700';
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
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
      <div className="bg-white rounded-[20px] p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
        <h2 className="font-bold text-gray-900 mb-3">Customer History</h2>
        <p className="text-sm text-gray-500">Loading customer history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-[20px] p-6 border border-red-200">
        <h2 className="font-bold text-red-900 mb-2">Customer History</h2>
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (!summary || summary.previousCalls === 0) {
    return (
      <div className="bg-white rounded-[20px] p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
        <h2 className="font-bold text-gray-900 mb-3">Customer History</h2>
        <p className="text-sm text-gray-500 italic">No previous customer history found</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-[20px] p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
        <h2 className="font-bold text-gray-900 mb-4">Customer History</h2>

        {/* Summary Cards - Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="text-2xl font-bold text-blue-700">{summary.previousCalls}</div>
            <div className="text-xs text-blue-600 font-medium mt-1">Previous Calls</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
            <div className="text-2xl font-bold text-green-700">{summary.closedCalls}</div>
            <div className="text-xs text-green-600 font-medium mt-1">Closed</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
            <div className="text-2xl font-bold text-orange-700">{summary.openCalls}</div>
            <div className="text-xs text-orange-600 font-medium mt-1">Open</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4 border border-red-100">
            <div className="text-2xl font-bold text-red-700">{summary.cancelledCalls}</div>
            <div className="text-xs text-red-600 font-medium mt-1">Cancelled</div>
          </div>
        </div>

        {/* Last Call Date */}
        {summary.lastCallDate && (
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <p className="text-xs text-slate-600 font-medium mb-1">LAST CALL DATE</p>
            <p className="text-sm text-slate-900 font-semibold">{formatDate(summary.lastCallDate)}</p>
          </div>
        )}

        {/* CTA Button */}
        <button
          onClick={() => setShowModal(true)}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-[16px] transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <span>View Customer History</span>
          <i className="ph-bold ph-arrow-right text-lg"></i>
        </button>
      </div>

      {/* Full History Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center">
          <div className="bg-white w-full sm:max-w-2xl rounded-t-[28px] sm:rounded-[28px] shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="font-bold text-lg text-gray-900">Customer History</h2>
              <button
                onClick={() => setShowModal(false)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-slate-700" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-2">
                {previousCalls.map((call) => (
                  <button
                    key={call.id}
                    onClick={() => {
                      setShowModal(false);
                      onCallClick(call.id);
                    }}
                    className="w-full text-left bg-slate-50 rounded-lg p-4 border border-slate-200 cursor-pointer hover:bg-slate-100 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        {call.call_id && (
                          <p className="text-[11px] font-bold text-blue-600 mb-1">{call.call_id}</p>
                        )}
                        <p className="text-xs font-semibold text-gray-900">{call.category_name}</p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap ${getStatusColor(
                          call.status
                        )}`}
                      >
                        {getStatusLabel(call.status)}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">{call.problem_reported}</p>

                    <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                      <span>{formatDate(call.created_at)}</span>
                      {call.assigned_engineer_name && (
                        <span className="text-blue-600 font-medium">
                          👨‍🔧 {call.assigned_engineer_name}
                        </span>
                      )}
                    </div>

                    {/* Billing Info if closed */}
                    {call.status === 'closed' && (call.grand_total || call.paid_amount) && (
                      <div className="mt-2 pt-2 border-t border-slate-300 text-[10px]">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total:</span>
                          <span className="font-semibold text-gray-900">
                            ₹{parseFloat(String(call.grand_total || 0)).toFixed(2)}
                          </span>
                        </div>
                        {call.grand_total && call.paid_amount && (
                          call.grand_total > call.paid_amount ? (
                            <div className="flex justify-between text-red-600 font-medium">
                              <span>Pending:</span>
                              <span>₹{(call.grand_total - call.paid_amount).toFixed(2)}</span>
                            </div>
                          ) : (
                            <div className="flex justify-between text-green-600 font-medium">
                              <span>Paid:</span>
                              <span>✓</span>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 p-4 flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold py-3 rounded-[16px] transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
