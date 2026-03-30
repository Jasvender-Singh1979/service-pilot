'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Plus, AlertCircle, ChevronLeft, Edit2, Trash2, X, Send, Phone, MessageCircle } from 'lucide-react';
import BottomNav from '@/app/components/BottomNav';
import ManagerLayout from '@/app/components/ManagerLayout';

interface ServiceCall {
  id: string;
  call_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_whatsapp?: string;
  whatsapp_country_code?: string;
  phone_country_code?: string;
  category_name_snapshot: string;
  problem_reported: string;
  priority_level: string;
  call_status: string;
  created_at: string;
  assigned_engineer_name?: string;
  assigned_engineer_user_id?: string;
  assigned_engineer_phone?: string;
}

interface ServiceCallDetails extends ServiceCall {
  special_note_to_engineer?: string;
  special_note_updated_at?: string;
  service_image_url?: string;
  customer_address?: string;
  warranty_status?: string;
  purchase_date?: string;
  charge_type?: string;
  closure_note?: string | null;
  closure_timestamp?: string | null;
  closure_image_url?: string | null;
  service_charge_amount?: number | null;
  service_payment_status?: string | null;
  material_total?: number | null;
  material_payment_status?: string | null;
  grand_total?: number | null;
  quotation_document_data?: any | null;
}

interface HistoryEntry {
  id: string;
  event_type: string;
  note_text?: string;
  event_timestamp: string;
}

function ServiceCallsContent() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('id');
  const sourceContext = searchParams.get('source_context') || 'all_calls';
  const fromSearch = searchParams.get('fromSearch') === 'true';
  const [calls, setCalls] = useState<ServiceCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCall, setSelectedCall] = useState<ServiceCallDetails | null>(null);
  const [callHistory, setCallHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [sentTemplateIds, setSentTemplateIds] = useState<string[]>([]);
  const [showRecipientSelection, setShowRecipientSelection] = useState(false);
  const [recipientType, setRecipientType] = useState<'customer' | 'engineer' | 'manual' | null>(null);
  const [pendingTemplate, setPendingTemplate] = useState<string | null>(null);
  const [pendingCustomMessage, setPendingCustomMessage] = useState<string>('');

  useEffect(() => {
    if (isAuthenticated && user && !authLoading) {
      fetchCalls();
    }
  }, [isAuthenticated, user?.id, authLoading]);

  useEffect(() => {
    if (selectedId && calls.length > 0) {
      const call = calls.find((c) => c.id === selectedId);
      if (call) {
        setSelectedCall(call as ServiceCallDetails);
        setNoteText(call.special_note_to_engineer || '');
        fetchCallHistory(call.id);
        fetchTemplates();
        fetchSentTemplates(call.id);
      } else {
        setSelectedCall(null);
      }
    }
  }, [selectedId, calls]);

  const fetchCalls = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(
        `/api/service-calls`
      );
      if (!response.ok) throw new Error('Failed to load service calls');
      const data = await response.json();
      setCalls(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading service calls:', err);
      setError('Failed to load service calls');
      setCalls([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCallHistory = async (callId: string) => {
    try {
      setHistoryLoading(true);
      const response = await fetch(
        `/api/service-calls/${callId}/history`
      );
      if (response.ok) {
        const data = await response.json();
        setCallHistory(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error loading call history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      setTemplatesLoading(true);
      const response = await fetch(
        `/api/whatsapp-templates`
      );
      if (response.ok) {
        const data = await response.json();
        setTemplates(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error loading templates:', err);
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const fetchSentTemplates = async (callId: string) => {
    try {
      const response = await fetch(
        `/api/service-calls/${callId}/template-send`
      );
      if (response.ok) {
        const data = await response.json();
        setSentTemplateIds(Array.isArray(data.sentTemplates) ? data.sentTemplates : []);
      }
    } catch (err) {
      console.error('Error loading sent templates:', err);
      setSentTemplateIds([]);
    }
  };

  const handleSaveNote = async () => {
    if (!selectedCall) return;
    setNoteSaving(true);
    try {
      const response = await fetch(
        `/api/service-calls/${selectedCall.id}/note`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ special_note_to_engineer: noteText }),
        }
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save note');
      }
      const updated = await response.json();
      setSelectedCall({
        ...selectedCall,
        special_note_to_engineer: updated.special_note_to_engineer,
        special_note_updated_at: updated.special_note_updated_at,
      });
      setShowNoteModal(false);
      // Refresh history
      fetchCallHistory(selectedCall.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note');
    } finally {
      setNoteSaving(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'bg-red-100 text-red-800';
      case 'High':
        return 'bg-orange-100 text-orange-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'Low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned':
        return 'bg-blue-100 text-blue-700 border border-blue-200';
      case 'unassigned':
        return 'bg-purple-100 text-purple-700 border border-purple-200';
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

  const handleDelete = async () => {
    if (!selectedCall) return;
    setActionLoading(true);
    try {
      const response = await fetch(
        `/api/service-calls/${selectedCall.id}`,
        { method: 'DELETE' }
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete');
      }
      setCalls(calls.filter(c => c.id !== selectedCall.id));
      setSelectedCall(null);
      setDeleteConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete service call');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedCall || !cancellationReason.trim()) return;
    setActionLoading(true);
    try {
      const response = await fetch(
        `/api/service-calls/${selectedCall.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cancellation_reason: cancellationReason }),
        }
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to cancel');
      }
      const updated = await response.json();
      setCalls(calls.map(c => c.id === selectedCall.id ? { ...c, call_status: 'cancelled' } : c));
      setSelectedCall({ ...selectedCall, call_status: 'cancelled' });
      setShowCancelModal(false);
      setCancellationReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel service call');
    } finally {
      setActionLoading(false);
    }
  };

  const generateTemplate1Message = (): string => {
    if (!selectedCall) return '';
    return `Hi, ${selectedCall.customer_name}\nWe have registered your service call for ${selectedCall.category_name_snapshot}. The Call ID is ${selectedCall.call_id || selectedCall.id}. We have our working hours from 11:00 AM - 7:00 PM Mon-Sat. This call will be attended by our engineer in the next 24 - 72 hours, and the engineer will call you before attending the call. Our service charges are Rs 500/- per visit plus any expenses which will be notified to you according to the work.`;
  };

  const generateTemplate2Message = (): string => {
    if (!selectedCall) return '';
    return `Hi, ${selectedCall.customer_name}\nWe have registered your service call for ${selectedCall.category_name_snapshot}. The Call ID is ${selectedCall.call_id || selectedCall.id}. We have our working hours from 11:00 AM - 7:00 PM Mon-Sat. This call will be attended by our engineer in the next 24 - 72 hours, and the engineer will call you before attending the call. Our service charges are Rs 500/- per visit plus any expenses which will be notified to you according to the work.\nAs a gesture to you, as you are our honorable and valued customer, we will provide you 30% discount on service charges and 15% discount on any material used while servicing.`;
  };

  const openWhatsApp = (message: string, recipient?: 'customer' | 'engineer' | 'manual') => {
    if (!selectedCall) return;
    
    let whatsappNumber = '';
    let countryCode = '';

    if (recipient === 'engineer') {
      // Engineer recipient
      whatsappNumber = selectedCall.assigned_engineer_phone || '';
      if (!whatsappNumber) {
        setError('Engineer WhatsApp number is not available');
        return;
      }
      // Use country code +91 as default for engineer
      countryCode = '+91';
    } else if (recipient === 'manual') {
      // Manual selection - open WhatsApp without pre-filling number
      const encodedMessage = encodeURIComponent(message);
      try {
        window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
        setShowMessageModal(false);
        setSelectedTemplate(null);
        setCustomMessage('');
        setShowRecipientSelection(false);
        setRecipientType(null);
      } catch (err) {
        setError('Failed to open WhatsApp. Please check your connection.');
      }
      return;
    } else {
      // Customer recipient (default)
      whatsappNumber = selectedCall.customer_whatsapp;
      countryCode = selectedCall.whatsapp_country_code || '';
      if (!whatsappNumber) {
        setError('WhatsApp number is not available for this customer');
        return;
      }
    }

    const countryCodeDigits = countryCode.replace(/\\D/g, '');
    const numberDigits = whatsappNumber.replace(/\\D/g, '');
    
    if (!countryCodeDigits || !numberDigits) {
      setError('WhatsApp number format is invalid');
      return;
    }
    
    const finalNumber = countryCodeDigits + numberDigits;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${finalNumber}?text=${encodedMessage}`;
    
    try {
      window.open(whatsappUrl, '_blank');
      setShowMessageModal(false);
      setSelectedTemplate(null);
      setCustomMessage('');
      setShowRecipientSelection(false);
      setRecipientType(null);
    } catch (err) {
      setError('Failed to open WhatsApp. Please check your connection.');
    }
  };


  
  const getStatusFromContext = (context: string): string | null => {
    if (context === 'dashboard_pending_48h') {
      // This is a special context for calls needing immediate action
      return 'pending_48h';
    }
    if (context.startsWith('dashboard_')) {
      return context.replace('dashboard_', '');
    }
    return null;
  };

  const handleBackFromDetail = () => {
    setSelectedCall(null);
    // If navigated from search, go back to dashboard
    if (fromSearch) {
      router.push('/manager');
    } else if (sourceContext === 'all_calls') {
      router.push('/manager/all-calls');
    } else if (sourceContext.startsWith('dashboard_')) {
      router.push(`/manager/service-calls?source_context=${sourceContext}`);
    } else {
      router.push('/manager/service-calls');
    }
  };

  // Show detail view if a call is selected
  if (selectedCall) {
    const handleBackClick = handleBackFromDetail;

    const handleEditClick = () => {
      const params = new URLSearchParams();
      params.set('id', selectedCall.id);
      params.set('source_context', sourceContext);
      router.push(`/manager/service-calls/edit?${params.toString()}`);
    };

    return (
      <ManagerLayout showHeader={false}>
        <div className="bg-[#F8F9FB] text-slate-900 overflow-x-hidden relative min-h-screen pb-20">
          <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none bg-noise mix-blend-multiply"></div>
          <div className="fixed top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none z-0"></div>

          {/* Header */}
          <header className="w-full px-6 pb-4 flex justify-between items-center relative z-10">
            <button
              onClick={handleBackClick}
              className="w-11 h-11 bg-white rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-center justify-center border border-slate-100 active:scale-95 transition-transform cursor-pointer"
              type="button"
              aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5 text-slate-700" />
            </button>
            <div className="flex-1 ml-4">
              <h1 className="text-xl font-black tracking-tight text-slate-900 mb-1">
                {selectedCall.customer_name}
              </h1>
              <div className="flex items-center gap-2">
                {selectedCall.call_id && (
                  <p className="text-[12px] font-bold text-blue-600 uppercase tracking-wider">ID: {selectedCall.call_id}</p>
                )}
                <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Service Call Details</p>
              </div>
            </div>
            <button
              onClick={handleEditClick}
              className="w-11 h-11 bg-white rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-center justify-center border border-slate-100 active:scale-95 transition-transform cursor-pointer"
              type="button"
              aria-label="Edit"
            >
              <Edit2 className="w-5 h-5 text-slate-700" />
            </button>
          </header>

          {/* Content */}
          <main className="w-full px-6 mt-6 pb-[140px] space-y-5 relative z-10">
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-[16px] p-4 text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          <div className="bg-white rounded-[20px] p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
            {/* Customer Info */}
            <div>
              <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">Customer</p>
              <p className="text-lg font-bold text-slate-900">{selectedCall.customer_name}</p>
              <div className="mt-3 space-y-2">
                {selectedCall.customer_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-500" />
                    <p className="text-sm text-slate-600">{selectedCall.customer_phone}</p>
                  </div>
                )}
                {selectedCall.customer_whatsapp && (
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-green-600" />
                    <p className="text-sm text-slate-600">{selectedCall.customer_whatsapp}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="flex gap-3 pt-3 border-t border-slate-200">
              <div>
                <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">Priority</p>
                <span className={`inline-block px-3 py-1.5 rounded-[12px] text-xs font-bold uppercase tracking-widest ${getPriorityColor(selectedCall.priority_level)}`}>
                  {selectedCall.priority_level}
                </span>
              </div>
              <div>
                <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">Status</p>
                <span className={`inline-block px-3 py-1.5 rounded-[12px] text-xs font-bold uppercase tracking-widest ${getStatusColor(selectedCall.call_status)}`}>
                  {selectedCall.call_status === 'unassigned' ? 'Unassigned' :
                   selectedCall.call_status === 'assigned' ? 'Assigned' :
                   selectedCall.call_status === 'in_progress' ? 'In Progress' :
                   selectedCall.call_status === 'pending_action_required' ? 'Pending Action' :
                   selectedCall.call_status === 'pending_under_services' ? 'Pending Services' :
                   selectedCall.call_status === 'closed' ? 'Closed' :
                   selectedCall.call_status === 'cancelled' ? 'Cancelled' : selectedCall.call_status}
                </span>
              </div>
            </div>
          </div>

          {/* Customer History CTA */}
          <button
            onClick={() => {
              router.push(
                `/manager/customer-history?countryCode=${encodeURIComponent(selectedCall.phone_country_code || '')}&phoneNumber=${encodeURIComponent(selectedCall.customer_phone)}`
              );
            }}
            className="w-full px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-[16px] font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            📋 Customer History
          </button>

          {/* Category & Issue */}
          <div className="bg-white rounded-[20px] p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
            <div className="pt-3 border-t border-slate-200 space-y-4">
              <div>
                <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">Category</p>
                <p className="text-base font-bold text-slate-900">{selectedCall.category_name_snapshot}</p>
              </div>
              <div>
                <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">Problem Reported</p>
                <p className="text-sm text-slate-700">{selectedCall.problem_reported}</p>
              </div>
            </div>

            {/* Engineer Assignment */}
            {selectedCall.assigned_engineer_name && (
              <div className="pt-3 border-t border-slate-200">
                <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">Assigned Engineer</p>
                <p className="text-base font-bold text-slate-900">{selectedCall.assigned_engineer_name}</p>
              </div>
            )}

            {/* Created Date & Time */}
            <div className="pt-3 border-t border-slate-200">
              <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">Created</p>
              <p className="text-sm text-slate-700">{formatDateTime(selectedCall.created_at)}</p>
            </div>
          </div>

          {/* View Quotation Button (if closed) */}
          {selectedCall.call_status === 'closed' && (
            <button
              onClick={() => router.push(`/manager/service-calls/detail/quotation?callId=${selectedCall.id}`)}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-[16px] font-bold text-sm transition-colors"
            >
              📄 View Quotation / PDF
            </button>
          )}

          {/* Closure Information (if closed) */}
          {selectedCall.call_status === 'closed' && (
            <div className="bg-green-50 border border-green-200 rounded-[16px] p-6 space-y-4">
              <h3 className="text-base font-black text-green-900">✓ Call Closed</h3>
              <div className="space-y-3">
                {selectedCall.closure_timestamp && (
                  <div>
                    <p className="text-[12px] font-bold text-green-700 uppercase tracking-wider mb-1">CLOSED DATE & TIME</p>
                    <p className="text-sm text-green-900">{formatDateTime(selectedCall.closure_timestamp)}</p>
                  </div>
                )}
                {selectedCall.closure_note && (
                  <div>
                    <p className="text-[12px] font-bold text-green-700 uppercase tracking-wider mb-1">CLOSURE NOTE</p>
                    <p className="text-sm text-green-900 whitespace-pre-wrap">{selectedCall.closure_note}</p>
                  </div>
                )}
                {selectedCall.closure_image_url && (
                  <div>
                    <p className="text-[12px] font-bold text-green-700 uppercase tracking-wider mb-2">CLOSURE IMAGE</p>
                    <img src={selectedCall.closure_image_url} alt="Closure" className="w-full rounded-lg" />
                  </div>
                )}
              </div>
            </div>
          )}



          {/* Special Note to Engineer */}
          <div className="bg-white rounded-[20px] p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">Special Note to Engineer</h3>
              {selectedCall.call_status !== 'closed' && selectedCall.call_status !== 'cancelled' && (
                <button
                  onClick={() => {
                    setNoteText(selectedCall.special_note_to_engineer || '');
                    setShowNoteModal(true);
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider"
                >
                  {selectedCall.special_note_to_engineer ? 'Edit' : 'Add'}
                </button>
              )}
            </div>
            {selectedCall.special_note_to_engineer ? (
              <div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedCall.special_note_to_engineer}</p>
                {selectedCall.special_note_updated_at && (
                  <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-200">
                    Last updated: {formatDateTime(selectedCall.special_note_updated_at)}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">No special note added yet</p>
            )}
          </div>

          {/* Service Call History */}
          {callHistory.length > 0 && (
            <div className="bg-white rounded-[20px] p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
              <h3 className="text-base font-black text-slate-900">Call Timeline</h3>
              <div className="space-y-3">
                {historyLoading ? (
                  <p className="text-sm text-slate-500">Loading timeline...</p>
                ) : (
                  callHistory.map((entry) => (
                    <div key={entry.id} className="flex gap-3 pb-3 border-b border-slate-200 last:border-b-0">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2 mb-1">
                          <p className="text-sm font-bold text-slate-900">
                            {entry.event_type.replace(/_/g, ' ').toUpperCase()}
                          </p>
                          <p className="text-xs text-slate-500">{formatDateTime(entry.event_timestamp)}</p>
                        </div>
                        {entry.note_text && (
                          <p className="text-xs text-slate-600 mt-1">{entry.note_text}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Actions Card */}
          <div className="bg-white rounded-[20px] p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-2">
            <div className="pt-4 space-y-2">
              <button
                onClick={() => setShowMessageModal(true)}
                className="w-full px-4 py-2.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Message Templets
              </button>
              
              {selectedCall.call_status !== 'cancelled' && selectedCall.call_status !== 'completed' && (
                <div className="flex gap-2">
                  {!selectedCall.assigned_engineer_name && (
                    <button
                      onClick={() => setDeleteConfirm(true)}
                      className="flex-1 px-4 py-2.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 font-medium text-sm transition-colors"
                    >
                      <Trash2 className="w-4 h-4 inline mr-2" />
                      Delete
                    </button>
                  )}
                  {selectedCall.assigned_engineer_name && (
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="flex-1 px-4 py-2.5 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 font-medium text-sm transition-colors"
                    >
                      <X className="w-4 h-4 inline mr-2" />
                      Cancel Call
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Special Note Modal */}
        {showNoteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[20px] p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Special Note to Engineer</h2>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Enter a special note for the engineer..."
                rows={6}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowNoteModal(false)}
                  disabled={noteSaving}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNote}
                  disabled={noteSaving || !noteText.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  {noteSaving ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recipient Selection Modal */}
        {showRecipientSelection && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[20px] p-6 max-w-sm w-full">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Select Recipient</h2>
              
              <div className="space-y-3">
                {/* Customer Option */}
                <button
                  onClick={async () => {
                    setRecipientType('customer');
                    
                    // Log the template send if it's a template (not custom)
                    if (selectedCall && pendingTemplate && pendingTemplate !== 'custom') {
                      try {
                        await fetch(
                          `/api/service-calls/${selectedCall.id}/template-send`,
                          {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ templateId: pendingTemplate, sentTo: 'customer' }),
                          }
                        );
                        // Refresh sent templates list
                        await fetchSentTemplates(selectedCall.id);
                      } catch (err) {
                        console.warn('Failed to log template send:', err);
                      }
                    }
                    
                    openWhatsApp(pendingCustomMessage, 'customer');
                  }}
                  disabled={!selectedCall?.customer_whatsapp}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                    !selectedCall?.customer_whatsapp
                      ? 'border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed'
                      : 'border-blue-200 bg-blue-50 hover:bg-blue-100'
                  }`}
                >
                  <p className="font-bold text-slate-900">👤 Customer</p>
                  <p className="text-sm text-slate-600 mt-1">
                    {selectedCall?.customer_whatsapp || 'No WhatsApp number'}
                  </p>
                </button>

                {/* Engineer Option */}
                <button
                  onClick={async () => {
                    setRecipientType('engineer');
                    
                    // Log the template send if it's a template (not custom)
                    if (selectedCall && pendingTemplate && pendingTemplate !== 'custom') {
                      try {
                        await fetch(
                          `/api/service-calls/${selectedCall.id}/template-send`,
                          {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ templateId: pendingTemplate, sentTo: 'engineer' }),
                          }
                        );
                        // Refresh sent templates list
                        await fetchSentTemplates(selectedCall.id);
                      } catch (err) {
                        console.warn('Failed to log template send:', err);
                      }
                    }
                    
                    openWhatsApp(pendingCustomMessage, 'engineer');
                  }}
                  disabled={!selectedCall?.assigned_engineer_phone}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                    !selectedCall?.assigned_engineer_phone
                      ? 'border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed'
                      : 'border-green-200 bg-green-50 hover:bg-green-100'
                  }`}
                >
                  <p className="font-bold text-slate-900">👨‍🔧 Engineer</p>
                  <p className="text-sm text-slate-600 mt-1">
                    {selectedCall?.assigned_engineer_name || 'Not assigned'}
                    {selectedCall?.assigned_engineer_phone ? ` (${selectedCall.assigned_engineer_phone})` : ''}
                  </p>
                </button>

                {/* Manual Selection Option */}
                <button
                  onClick={async () => {
                    setRecipientType('manual');
                    
                    // Log the template send if it's a template (not custom)
                    if (selectedCall && pendingTemplate && pendingTemplate !== 'custom') {
                      try {
                        await fetch(
                          `/api/service-calls/${selectedCall.id}/template-send`,
                          {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ templateId: pendingTemplate, sentTo: 'manual' }),
                          }
                        );
                        // Refresh sent templates list
                        await fetchSentTemplates(selectedCall.id);
                      } catch (err) {
                        console.warn('Failed to log template send:', err);
                      }
                    }
                    
                    openWhatsApp(pendingCustomMessage, 'manual');
                  }}
                  className="w-full p-4 rounded-lg border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 text-left transition-colors"
                >
                  <p className="font-bold text-slate-900">📋 Choose WhatsApp No</p>
                  <p className="text-sm text-slate-600 mt-1">Select number manually in WhatsApp</p>
                </button>
              </div>

              {/* Cancel Button */}
              <button
                onClick={() => {
                  setShowRecipientSelection(false);
                  setRecipientType(null);
                  setPendingTemplate(null);
                  setPendingCustomMessage('');
                }}
                className="w-full mt-4 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Message Templets Modal - Lower z-index when recipient modal is shown to allow it to float above */}
        {showMessageModal && !showRecipientSelection && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-40 p-4">
            <div className="bg-white rounded-[20px] p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Message Templets</h2>
              
              <div className="space-y-4">
                {/* Template Selection */}
                <div className="space-y-3">
                  {templatesLoading ? (
                    <p className="text-sm text-slate-500 text-center py-4">Loading templates...</p>
                  ) : templates.length === 0 ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
                      No templates created yet. Go to WhatsApp Templates to create one.
                    </div>
                  ) : (
                    templates.map((template) => {
                      const isSent = sentTemplateIds.includes(template.id);
                      return (
                        <label
                          key={template.id}
                          className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
                        >
                          <input
                            type="radio"
                            name="message_template"
                            checked={selectedTemplate === template.id}
                            onChange={() => {
                              setSelectedTemplate(template.id);
                              setCustomMessage('');
                            }}
                            className="w-4 h-4 mt-0.5"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-slate-900 flex items-center gap-2">
                              {isSent && <span className="text-green-600">✓</span>}
                              {template.template_name}
                            </p>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{template.template_message}</p>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>

                {/* Custom Message Option */}
                <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="radio"
                    name="message_template"
                    checked={selectedTemplate === 'custom'}
                    onChange={() => setSelectedTemplate('custom')}
                    className="w-4 h-4 mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">Custom Message</p>
                    <p className="text-xs text-slate-500 mt-1">Type your own message</p>
                  </div>
                </label>

                {/* Custom Message Input */}
                {selectedTemplate === 'custom' && (
                  <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Type your custom message here..."
                    rows={5}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                )}

                {/* Template Preview */}
                {selectedTemplate && selectedTemplate !== 'custom' && (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <p className="text-xs font-medium text-slate-700 mb-2">Message Preview (Rendered):</p>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap">
                      {(() => {
                        const template = templates.find((t) => t.id === selectedTemplate);
                        let preview = template?.template_message || '';
                        
                        // Render with actual call data
                        if (selectedCall) {
                          // Helper function to convert warranty_status to readable label
                          const getWarrantyLabel = (status: string | null | undefined): string => {
                            if (!status) return '-';
                            switch (status) {
                              case 'in_warranty': return 'In Warranty';
                              case 'out_warranty': return 'Out of Warranty';
                              case 'unknown': return 'Unknown Warranty Status';
                              default: return status;
                            }
                          };

                          // Helper function to convert purchase_source to readable label
                          const getPurchaseSourceLabel = (source: string | null | undefined): string => {
                            if (!source) return '-';
                            switch (source) {
                              case 'own_business': return 'Purchased from Business';
                              case 'not_purchased': return 'Not Purchased from Business';
                              case 'other': return 'Purchased from Other';
                              default: return source;
                            }
                          };

                          // Helper function to format charge_type with custom amount if applicable
                          const getChargeTypeLabel = (chargeType: string | null | undefined, customAmount: string | number | null | undefined): string => {
                            if (!chargeType) return '-';
                            if (chargeType === 'custom' && customAmount) {
                              const amount = typeof customAmount === 'string' ? parseFloat(customAmount) : customAmount;
                              if (isNaN(amount)) return 'Custom Amount - Invalid';
                              return `Custom Amount - Rs ${amount.toFixed(2)}`;
                            }
                            return chargeType;
                          };

                          // Helper function to format timestamp in IST format
                          const formatIST = (dateString: string | null | undefined): string => {
                            if (!dateString) return '-';
                            try {
                              const date = new Date(dateString);
                              return date.toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              }) + ', ' + date.toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                              });
                            } catch (e) {
                              return '-';
                            }
                          };

                          const variables: Record<string, string> = {
                            customer_name: selectedCall.customer_name || '-',
                            engineer_name: selectedCall.assigned_engineer_name || '-',
                            call_id: selectedCall.call_id || selectedCall.id || '-',
                            mobile: selectedCall.customer_phone || '-',
                            whatsapp_no: selectedCall.customer_whatsapp || '-',
                            priority: selectedCall.priority_level || '-',
                            warranty_status: getWarrantyLabel(selectedCall.warranty_status),
                            purchase_source: getPurchaseSourceLabel(selectedCall.purchase_source),
                            charge_type: getChargeTypeLabel(selectedCall.charge_type, selectedCall.custom_amount),
                            time_stamp_call_creation: formatIST(selectedCall.created_at),
                            category: selectedCall.category_name_snapshot || '-',
                            issue: selectedCall.problem_reported || '-',
                          };
                          
                          Object.entries(variables).forEach(([key, value]) => {
                            const regex = new RegExp(`{${key}}`, 'g');
                            preview = preview.replace(regex, value);
                          });
                        }
                        
                        return preview;
                      })()}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => {
                      setShowMessageModal(false);
                      setSelectedTemplate(null);
                      setCustomMessage('');
                    }}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      let message = '';
                      
                      if (selectedTemplate && selectedTemplate !== 'custom') {
                        const template = templates.find((t) => t.id === selectedTemplate);
                        const templateMessage = template?.template_message || '';
                        
                        // Render template with actual call data
                        if (selectedCall) {
                          // Helper function to convert warranty_status to readable label
                          const getWarrantyLabel = (status: string | null | undefined): string => {
                            if (!status) return '-';
                            switch (status) {
                              case 'in_warranty': return 'In Warranty';
                              case 'out_warranty': return 'Out of Warranty';
                              case 'unknown': return 'Unknown Warranty Status';
                              default: return status;
                            }
                          };

                          // Helper function to convert purchase_source to readable label
                          const getPurchaseSourceLabel = (source: string | null | undefined): string => {
                            if (!source) return '-';
                            switch (source) {
                              case 'own_business': return 'Purchased from Business';
                              case 'not_purchased': return 'Not Purchased from Business';
                              case 'other': return 'Purchased from Other';
                              default: return source;
                            }
                          };

                          // Helper function to format charge_type with custom amount if applicable
                          const getChargeTypeLabel = (chargeType: string | null | undefined, customAmount: string | number | null | undefined): string => {
                            if (!chargeType) return '-';
                            if (chargeType === 'custom' && customAmount) {
                              const amount = typeof customAmount === 'string' ? parseFloat(customAmount) : customAmount;
                              if (isNaN(amount)) return 'Custom Amount - Invalid';
                              return `Custom Amount - Rs ${amount.toFixed(2)}`;
                            }
                            return chargeType;
                          };

                          // Helper function to format timestamp in IST format
                          const formatIST = (dateString: string | null | undefined): string => {
                            if (!dateString) return '-';
                            try {
                              const date = new Date(dateString);
                              return date.toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              }) + ', ' + date.toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                              });
                            } catch (e) {
                              return '-';
                            }
                          };

                          const variables: Record<string, string> = {
                            customer_name: selectedCall.customer_name || '-',
                            engineer_name: selectedCall.assigned_engineer_name || '-',
                            call_id: selectedCall.call_id || selectedCall.id || '-',
                            mobile: selectedCall.customer_phone || '-',
                            whatsapp_no: selectedCall.customer_whatsapp || '-',
                            priority: selectedCall.priority_level || '-',
                            warranty_status: getWarrantyLabel(selectedCall.warranty_status),
                            purchase_source: getPurchaseSourceLabel(selectedCall.purchase_source),
                            charge_type: getChargeTypeLabel(selectedCall.charge_type, selectedCall.custom_amount),
                            time_stamp_call_creation: formatIST(selectedCall.created_at),
                            category: selectedCall.category_name_snapshot || '-',
                            issue: selectedCall.problem_reported || '-',
                          };
                          
                          // Replace all {variable} placeholders
                          message = templateMessage;
                          Object.entries(variables).forEach(([key, value]) => {
                            const regex = new RegExp(`{${key}}`, 'g');
                            message = message.replace(regex, value);
                          });
                        } else {
                          message = templateMessage;
                        }
                      } else if (selectedTemplate === 'custom') {
                        message = customMessage;
                      }

                      if (!message.trim()) {
                        setError('Please select or enter a message');
                        return;
                      }

                      // Store pending template and message, show recipient selection
                      setPendingTemplate(selectedTemplate || null);
                      setPendingCustomMessage(message);
                      setShowRecipientSelection(true);
                    }}
                    disabled={!selectedTemplate || (selectedTemplate === 'custom' && !customMessage.trim())}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Send via WhatsApp
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-[20px] p-6 max-w-xs mx-4">
              <p className="text-lg font-bold text-slate-900 mb-4">Delete Service Call?</p>
              <p className="text-sm text-slate-600 mb-6">This action cannot be undone. The service call will be permanently removed.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(false)}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                >
                  {actionLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-[20px] p-6 max-w-sm mx-4">
              <p className="text-lg font-bold text-slate-900 mb-4">Cancel Service Call</p>
              <label className="block text-sm font-medium text-slate-700 mb-2">Reason for Cancellation *</label>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Enter reason for cancellation"
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancellationReason('');
                  }}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleCancel}
                  disabled={!cancellationReason.trim() || actionLoading}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 font-medium"
                >
                  {actionLoading ? 'Cancelling...' : 'Confirm Cancel'}
                </button>
              </div>
            </div>
          </div>
        )}

          <BottomNav />
        </div>
      </ManagerLayout>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-500">Loading service calls...</p>
      </div>
    );
  }

  return (
    <ManagerLayout>
      <div className="bg-[#F8F9FB] text-slate-900 overflow-x-hidden relative min-h-screen pb-20">
        {/* Ambient Depth Elements */}
        <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none bg-noise mix-blend-multiply"></div>
        <div className="fixed top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none z-0"></div>

        {/* Main Content */}
        <main className="w-full px-6 pb-[140px] space-y-5 relative z-10">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-[20px] p-4 text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Service Calls List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-[20px] p-5 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] animate-pulse"
              >
                <div className="h-5 bg-slate-200 rounded w-1/3 mb-3"></div>
                <div className="h-3 bg-slate-100 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : (() => {
          const statusFromContext = getStatusFromContext(sourceContext);
          let filteredCalls: ServiceCall[] = [];
          
          if (statusFromContext === 'pending_48h') {
            // Filter for calls needing immediate action (>48 hrs)
            const now = new Date();
            const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
            const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            
            filteredCalls = calls.filter(call => {
              if (call.call_status === 'closed' || call.call_status === 'cancelled') return false;
              
              const createdAt = new Date(call.created_at);
              
              // A. unassigned calls older than 48 hours
              if (!call.assigned_engineer_name && createdAt < fortyEightHoursAgo) return true;
              
              // B. assigned calls that have NOT moved to in_progress and are older than 48 hours
              if (call.assigned_engineer_name && call.call_status === 'assigned' && createdAt < fortyEightHoursAgo) return true;
              
              // C. in_progress calls with no further action for more than 24 hours (client-side approximation)
              if (call.call_status === 'in_progress' && createdAt < twentyFourHoursAgo) return true;
              
              return false;
            });
          } else if (statusFromContext) {
            filteredCalls = calls.filter(c => c.call_status === statusFromContext);
          } else {
            filteredCalls = calls;
          }
          
          return filteredCalls.length === 0 ? (
            <div className="bg-white rounded-[28px] p-8 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-[16px] flex items-center justify-center mx-auto mb-4">
                <i className="ph-fill ph-phone text-[32px] text-slate-400"></i>
              </div>
              <p className="text-slate-600 font-bold mb-2">No service calls found</p>
              <p className="text-slate-500 text-sm">
                {statusFromContext ? `No calls with status "${statusFromContext.replace(/_/g, ' ')}"` : 'Create your first service call to get started'}
              </p>
            </div>
          ) : (
              <div className="space-y-3">
              {filteredCalls.map((call) => (
              <div
                key={call.id}
                onClick={() => {
                  const params = new URLSearchParams();
                  params.set('id', call.id);
                  params.set('source_context', sourceContext);
                  router.push(`/manager/service-calls?${params.toString()}`);
                }}
                className="bg-white rounded-[22px] p-5 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] cursor-pointer hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)] active:scale-95 transition-all"
              >
                {/* Header: Call ID, Customer, and Status Pills */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex-1 min-w-0">
                    {call.call_id && (
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">CALL ID</p>
                    )}
                    <h3 className="text-base font-black text-slate-900 break-words mb-2">
                      {call.customer_name}
                    </h3>
                    {call.call_id && (
                      <p className="text-[11px] font-bold text-blue-600 mb-2">{call.call_id}</p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
                    <span
                      className={`px-3 py-1.5 rounded-[10px] text-[9px] font-bold uppercase tracking-wider whitespace-nowrap ${getPriorityColor(
                        call.priority_level
                      )}`}
                    >
                      {call.priority_level}
                    </span>
                    <span
                      className={`px-3 py-1.5 rounded-[10px] text-[9px] font-bold uppercase tracking-wider whitespace-nowrap ${getStatusColor(
                        call.call_status
                      )}`}
                    >
                      {call.call_status === 'unassigned' ? 'Unassigned' :
                       call.call_status === 'assigned' ? 'Assigned' :
                       call.call_status === 'in_progress' ? 'In Progress' :
                       call.call_status === 'pending_action_required' ? 'Pending Action' :
                       call.call_status === 'pending_under_services' ? 'Pending Services' :
                       call.call_status === 'closed' ? 'Closed' :
                       call.call_status === 'cancelled' ? 'Cancelled' : call.call_status}
                    </span>
                  </div>
                </div>

                {/* Service Details */}
                <div className="space-y-3 text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">CATEGORY</p>
                      <p className="text-slate-900 font-semibold">{call.category_name_snapshot}</p>
                    </div>
                    {call.assigned_engineer_name && (
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">ENGINEER</p>
                        <p className="text-blue-600 font-semibold text-[11px]">{call.assigned_engineer_name}</p>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">ISSUE</p>
                    <p className="text-slate-700">
                      {call.problem_reported.substring(0, 60)}
                      {call.problem_reported.length > 60 ? '...' : ''}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {formatDateTime(call.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            </div>
          );
        })()}
      </main>

      {/* Fixed Add Button */}
      <div className="fixed bottom-24 right-6 z-40">
        <button
          onClick={() => router.push('/manager/service-calls/add')}
          className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform font-bold"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

        <BottomNav />
      </div>
    </ManagerLayout>
  );
}

export default function ServiceCallsPage() {
  return (
    <ProtectedRoute requiredRole="manager">
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
        <ServiceCallsContent />
      </Suspense>
    </ProtectedRoute>
  );
}
