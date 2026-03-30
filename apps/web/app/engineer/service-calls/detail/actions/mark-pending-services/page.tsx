'use client';

import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { ChevronLeft } from 'lucide-react';

interface ServiceCall {
  id: string;
  call_id: string;
  customer_name: string;
  call_status: string;
}

function MarkPendingServicesContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callId = searchParams.get('callId');
  const source = searchParams.get('source') || 'list';
  const status = searchParams.get('status') || 'all';

  const [call, setCall] = useState<ServiceCall | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (callId) {
      fetchCallDetail();
    }
  }, [callId]);

  const fetchCallDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/engineers/service-calls/detail?callId=${callId}`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch call detail');
      }

      const data = await response.json();
      setCall(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error fetching call detail:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!callId) return;

    // Validate note
    if (!note.trim()) {
      setError('Please provide a reason/note for this action');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const response = await fetch(
        `/api/engineers/service-calls/${callId}/update-status`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            newStatus: 'pending_under_services',
            note: note.trim(),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update status');
      }

      // Success - navigate back to detail page
      router.push(
        `/engineer/service-calls/detail?callId=${callId}&source=${source}&status=${status}`
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error updating status:', errorMessage);
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push(
      `/engineer/service-calls/detail?callId=${callId}&source=${source}&status=${status}`
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!call) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
        <p className="text-red-600">Call not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={handleCancel}
            className="w-11 h-11 bg-slate-100 rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors active:scale-95"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5 text-slate-700" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Pending Under Services</h1>
            <p className="text-sm text-slate-500 mt-1">Call ID: {call.call_id}</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm">
          <div className="space-y-6">
            {/* Info Section */}
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">Customer</h2>
              <p className="text-slate-700">{call.customer_name}</p>
            </div>

            {/* Description */}
            <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4">
              <p className="text-sm text-yellow-900">
                Mark this call as pending under services. This indicates the service is waiting for replacement parts, service-center processing, or similar service-related actions. You must provide details about what services are pending.
              </p>
            </div>

            {/* Note Field */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">
                Service Details / Note <span className="text-red-500">*</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Describe what services are pending (e.g., parts on order, sent to service center, replacement in progress, etc.)"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={5}
              />
              <div className="text-xs text-slate-500 mt-2">
                {note.trim().length} characters
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            {/* Buttons - Fixed at bottom */}
            <div className="flex gap-3 pt-6 border-t border-slate-200">
              <button
                onClick={handleCancel}
                disabled={submitting}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-200 text-slate-900 font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !note.trim()}
                className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors"
              >
                {submitting ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function MarkPendingServicesPage() {
  return (
    <ProtectedRoute allowedRoles={['engineer']}>
      <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
        <MarkPendingServicesContent />
      </Suspense>
    </ProtectedRoute>
  );
}
