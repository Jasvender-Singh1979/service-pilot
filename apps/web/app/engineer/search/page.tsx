'use client';

import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import EngineerLayout from '@/app/components/EngineerLayout';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Search, ChevronLeft, Phone } from 'lucide-react';
import BottomNav from '@/app/components/BottomNav';
import { toast } from '@/lib/toast';

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

function EngineerSearchContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [calls, setCalls] = useState<ServiceCall[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(initialQuery !== '');

  useEffect(() => {
    if (initialQuery) {
      searchCalls(initialQuery);
    }
  }, []);

  const searchCalls = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setCalls([]);
      setSearched(false);
      return;
    }

    try {
      setLoading(true);
      setSearched(true);
      const response = await fetch(
        `/api/engineers/service-calls/search?q=${encodeURIComponent(searchQuery)}`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setCalls(Array.isArray(data) ? data : []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error searching calls:', errorMessage);
      toast.error('Search failed');
      setCalls([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setQuery(value);
    if (value.trim()) {
      searchCalls(value);
    } else {
      setCalls([]);
      setSearched(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      searchCalls(query);
    }
  };

  const callCustomer = (phone: string, countryCode: string) => {
    if (!phone) {
      alert('Phone number not available');
      return;
    }
    const phoneNumber = `${countryCode}${phone}`.replace(/\\D/g, '');
    window.location.href = `tel:${phoneNumber}`;
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
      default:
        return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical':
        return 'text-red-700 bg-red-50 border border-red-200 font-semibold';
      case 'high':
        return 'text-orange-700 bg-orange-50 border border-orange-200 font-semibold';
      case 'medium':
        return 'text-amber-700 bg-amber-50 border border-amber-200 font-semibold';
      case 'low':
        return 'text-green-700 bg-green-50 border border-green-200 font-semibold';
      default:
        return 'text-slate-600 bg-slate-50 border border-slate-200';
    }
  };

  const getPriorityLabel = (priority: string) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  return (
    <EngineerLayout showHeader={true}>
      {/* Search Bar */}
      <div className="px-6 pt-6 pb-4 bg-white border-b border-slate-100">
        <form onSubmit={handleSearchSubmit}>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by Call ID, Name, or Phone"
              className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-[16px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium placeholder-slate-500"
            />
          </div>
        </form>
      </div>

      {/* Results */}
      <div className="flex-1 p-4 pb-32">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-gray-500 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <div>Searching...</div>
            </div>
          </div>
        ) : !searched ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-gray-500 text-center">
              <div className="text-4xl mb-2">🔍</div>
              <div>Start typing to search for calls</div>
            </div>
          </div>
        ) : calls.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-gray-500 text-center">
              <div className="text-4xl mb-2">📭</div>
              <div>No calls found matching "{query}"</div>
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

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      router.push(`/engineer/service-calls/detail?callId=${call.id}&source=search&status=all`);
                      toast.info('Opening call details...');
                    }}
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
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </EngineerLayout>
  );
}

export default function EngineerSearchPage() {
  return (
    <ProtectedRoute allowedRoles={['engineer']}>
      <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
        <EngineerSearchContent />
      </Suspense>
    </ProtectedRoute>
  );
}
