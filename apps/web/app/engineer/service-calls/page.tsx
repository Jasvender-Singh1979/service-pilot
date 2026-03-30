'use client';

import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import EngineerLayout from '@/app/components/EngineerLayout';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import BottomNav from '@/app/components/BottomNav';
import { Phone } from 'lucide-react';
import { toast } from '@/lib/toast';
import { CallListSkeleton } from '@/app/components/Skeletons';

interface ServiceCall {
  id: string;
  call_id: string;
  customer_name: string;
  customer_phone: string;
  phone_country_code: string;
  customer_whatsapp: string;
  whatsapp_country_code: string;
  category_name_snapshot: string;
  problem_reported: string;
  priority_level: string;
  call_status: string;
  created_at: string;
  charge_type: string;
  custom_amount: string | null;
  special_note_to_engineer: string | null;
}

function ServiceCallsContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get('status') || 'all';

  const [calls, setCalls] = useState<ServiceCall[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchCalls();
    }
  }, [user?.id, statusFilter]);

  const fetchCalls = async () => {
    try {
      setLoading(true);
      const baseUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/engineers/service-calls`;
      const queryString = statusFilter !== 'all' ? `?status=${encodeURIComponent(statusFilter)}` : '';
      const url = `${baseUrl}${queryString}`;

      const response = await fetch(url, {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch calls: ${response.status}`);
      }

      const data = await response.json();
      setCalls(Array.isArray(data) ? data : []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error fetching engineer calls:', errorMessage);
      toast.error('Failed to load calls');
      setCalls([]);
    } finally {
      setLoading(false);
    }
  };

  const navigateToActionScreen = (callId: string, action: string) => {
    // Navigate to the confirmation screen instead of updating directly
    router.push(`/engineer/service-calls/detail/actions/${action}?callId=${callId}&source=list&status=${statusFilter}`);
    toast.info(`Opening ${action.replace(/-/g, ' ')}...`);
  };

  const callCustomer = (phone: string, countryCode: string) => {
    if (!phone) {
      alert('Phone number not available');
      return;
    }
    const phoneNumber = `${countryCode}${phone}`.replace(/\D/g, '');
    window.location.href = `tel:${phoneNumber}`;
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
      default:
        return 'bg-gray-100 text-gray-700 border border-gray-200';
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
      default:
        return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical':
        return 'text-red-700 bg-red-50 border border-red-300 font-semibold';
      case 'high':
        return 'text-orange-700 bg-orange-50 border border-orange-300 font-semibold';
      case 'medium':
        return 'text-amber-700 bg-amber-50 border border-amber-300 font-semibold';
      case 'low':
        return 'text-green-700 bg-green-50 border border-green-300 font-semibold';
      default:
        return 'text-slate-600 bg-slate-50 border border-slate-200';
    }
  };

  const getPriorityLabel = (priority: string) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  const renderQuickActions = (call: ServiceCall) => {
    switch (call.call_status) {
      case 'assigned':
        return (
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => navigateToActionScreen(call.id, 'mark-in-progress')}
              className="flex-1 px-3 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold rounded-[12px] transition-colors active:scale-95"
            >
              ▶ In Progress
            </button>
            <button
              onClick={() => router.push(`/engineer/service-calls/detail?callId=${call.id}&source=list&status=${statusFilter}`)}
              className="flex-1 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-[12px] transition-colors active:scale-95"
            >
              Detail
            </button>
            <button
              onClick={() => callCustomer(call.customer_phone, call.phone_country_code)}
              className="flex-1 px-3 py-2.5 bg-green-500 hover:bg-green-600 text-white text-[11px] font-bold rounded-[12px] transition-colors active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5" /> Call
            </button>
          </div>
        );

      case 'in_progress':
        return (
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => navigateToActionScreen(call.id, 'mark-pending-action')}
              className="flex-1 px-3 py-2.5 bg-red-500 hover:bg-red-600 text-white text-[11px] font-bold rounded-[12px] transition-colors active:scale-95"
            >
              Pending Action
            </button>
            <button
              onClick={() => navigateToActionScreen(call.id, 'mark-pending-services')}
              className="flex-1 px-3 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-[11px] font-bold rounded-[12px] transition-colors active:scale-95"
            >
              Pending Services
            </button>
            <button
              onClick={() => router.push(`/engineer/service-calls/detail?callId=${call.id}&source=list&status=${statusFilter}`)}
              className="flex-1 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-[12px] transition-colors active:scale-95"
            >
              Detail
            </button>
          </div>
        );

      case 'pending_action_required':
      case 'pending_under_services':
        return (
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => router.push(`/engineer/service-calls/detail?callId=${call.id}&source=list&status=${statusFilter}`)}
              className="flex-1 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-[12px] transition-colors active:scale-95"
            >
              Detail
            </button>
            <button
              onClick={() => callCustomer(call.customer_phone, call.phone_country_code)}
              className="flex-1 px-3 py-2.5 bg-green-500 hover:bg-green-600 text-white text-[11px] font-bold rounded-[12px] transition-colors active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5" /> Call
            </button>
          </div>
        );

      case 'closed':
        return (
          <button
            onClick={() => router.push(`/engineer/service-calls/detail?callId=${call.id}&source=list&status=${statusFilter}`)}
            className="w-full mt-4 px-3 py-2.5 bg-green-100 hover:bg-green-200 text-green-700 text-[11px] font-bold rounded-[12px] transition-colors active:scale-95"
          >
            ✓ View Closed Call
          </button>
        );

      default:
        return (
          <button
            onClick={() => router.push(`/engineer/service-calls/detail?callId=${call.id}&source=list&status=${statusFilter}`)}
            className="w-full mt-4 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-[12px] transition-colors active:scale-95"
          >
            Open Call
          </button>
        );
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pt-[100px]">
      <div className="px-6 pt-6 pb-4 bg-white border-b border-slate-100">
        <h2 className="text-lg font-bold text-slate-900 mb-3">Service Calls</h2>
        <p className="text-slate-600 text-sm mb-4">
          {statusFilter === 'all'
            ? 'All my assigned calls'
            : `${getStatusLabel(statusFilter)} calls`}
        </p>

        {/* Status filter dropdown - centered */}
        <div className="flex justify-center">
          <select
            value={statusFilter}
            onChange={(e) => router.push(`/engineer/service-calls?status=${e.target.value}`)}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-[14px] font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-w-[200px] text-center appearance-none cursor-pointer bg-no-repeat"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%23374151' d='M1 1l5 5 5-5'/%3E%3C/svg%3E")`,
              backgroundPosition: 'right 12px center',
              paddingRight: '32px',
            }}
          >
            <option value="all">All Calls</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="pending_action_required">Pending Action</option>
            <option value="pending_under_services">Pending Service</option>
            <option value="cancelled">Cancelled</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      <div className="flex-1 p-4 pb-6">
        {loading ? (
          <CallListSkeleton />
        ) : calls.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-gray-500 text-center">
              <div className="text-4xl mb-2">📭</div>
              <div>No calls found</div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {calls.map((call) => (
              <div
                key={call.id}
                className="p-5 bg-white rounded-[22px] border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)] active:scale-95 transition-all"
              >
                {/* Header: Call ID and Status */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">CALL ID</p>
                    <h3 className="text-base font-black text-slate-900 mb-1">{call.call_id}</h3>
                    <p className="text-sm font-semibold text-slate-700">{call.customer_name}</p>
                  </div>
                  <span className={`px-3 py-1.5 rounded-[10px] text-[9px] font-bold uppercase tracking-wider whitespace-nowrap ${getStatusColor(call.call_status)}`}>
                    {getStatusLabel(call.call_status)}
                  </span>
                </div>

                {/* Category, Priority, and Contact */}
                <div className="space-y-3 text-xs mb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">CATEGORY</p>
                      <p className="font-semibold text-slate-900">{call.category_name_snapshot}</p>
                    </div>
                    <div className={`px-3 py-1.5 rounded-[10px] font-bold whitespace-nowrap text-[9px] uppercase tracking-wider ${getPriorityColor(call.priority_level)}`}>
                      {getPriorityLabel(call.priority_level)} Priority
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">PHONE</p>
                    <p className="text-slate-700 font-semibold">{call.customer_phone}</p>
                  </div>
                </div>

                {/* Special Note Indicator */}
                {call.special_note_to_engineer && (
                  <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-[14px] text-xs text-yellow-800">
                    <p className="font-semibold text-yellow-900 mb-1">📌 Manager's Note</p>
                    <p>{call.special_note_to_engineer.substring(0, 80)}{call.special_note_to_engineer.length > 80 ? '...' : ''}</p>
                  </div>
                )}

                {/* Created Time */}
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4 pt-3 border-t border-slate-100">
                  Created: {new Date(call.created_at).toLocaleDateString('en-IN', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>

                {/* Quick Actions */}
                {renderQuickActions(call)}
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

export default function ServiceCallsPage() {
  return (
    <ProtectedRoute allowedRoles={['engineer']}>
      <EngineerLayout showHeader={true}>
        <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
          <ServiceCallsContent />
        </Suspense>
      </EngineerLayout>
    </ProtectedRoute>
  );
}
