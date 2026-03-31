'use client';

import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import EngineerLayout from '@/app/components/EngineerLayout';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import BottomNav from '@/app/components/BottomNav';
import ConfirmDialog from '@/app/components/ConfirmDialog';
import { toast } from '@/lib/toast';
import { DetailPageSkeleton } from '@/app/components/Skeletons';
import {
  formatPhoneForWhatsApp,
  generateWhatsAppLink,
  generateWhatsAppShareLink,
  generateInvoiceToCustomerMessage,
  generateInvoiceToAccountantMessage,
  generateClosureMessageToCustomer,
} from '@/lib/whatsapp-utils';

// Safe number formatting utility
const formatCurrency = (value: any): string => {
  try {
    // Convert to number if it's a string
    const num = typeof value === 'string' ? parseFloat(value) : typeof value === 'number' ? value : 0;
    // Check if it's a valid number
    if (isNaN(num)) {
      return '0.00';
    }
    return num.toFixed(2);
  } catch (error) {
    return '0.00';
  }
};

interface ServiceCall {
  id: string;
  call_id: string;
  customer_name: string;
  customer_address: string;
  phone_country_code: string;
  customer_phone: string;
  whatsapp_country_code: string;
  customer_whatsapp: string;
  whatsapp_same_as_phone: boolean;
  category_name_snapshot: string;
  problem_reported: string;
  priority_level: string;
  call_status: string;
  created_at: string;
  charge_type: string;
  custom_amount: string | null;
  special_note_to_engineer: string | null;
  service_image_url: string | null;
  purchase_source?: string | null;
  seller_name_if_other?: string | null;
  warranty_status?: string | null;
  purchase_date?: string | null;
  closure_note?: string | null;
  closure_timestamp?: string | null;
  closure_image_url?: string | null;
  service_charge_amount?: number | null;
  service_discount_amount?: number | null;
  service_payment_status?: string | null;
  material_total?: number | null;
  material_discount_amount?: number | null;
  material_payment_status?: string | null;
  grand_total?: number | null;
  paid_amount?: number | null;
  quotation_document_data?: any | null;
  invoice_sent_to_customer?: boolean;
  invoice_sent_to_accountant?: boolean;
  closure_message_sent_to_customer?: boolean;
}

interface HistoryEntry {
  id: string;
  event_type: string;
  actor_role: string;
  note_text: string | null;
  event_timestamp: string;
}

function ServiceCallDetailContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callId = searchParams.get('callId');
  const source = searchParams.get('source') || 'list';
  const status = searchParams.get('status') || 'all';

  const [call, setCall] = useState<ServiceCall | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [whatsappError, setWhatsappError] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    isDangerous: boolean;
    action: (() => void) | null;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    isDangerous: false,
    action: null,
  });

  useEffect(() => {
    if (callId) {
      fetchCallDetail();
      fetchHistory();
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
        const errorText = await response.text();
        throw new Error(`Failed to fetch call detail: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      setCall(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error fetching engineer call detail:', errorMessage);
      toast.error('Failed to load call details');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch(
        `/api/service-calls/${callId}/history`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch history: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error fetching engineer call history:', errorMessage);
      // Don't show toast for history - it's secondary data
    }
  };

  const handleMarkInProgress = () => {
    router.push(
      `/engineer/service-calls/detail/actions/mark-in-progress?callId=${callId}&source=${source}&status=${status}`
    );
    toast.info('Opening mark in progress...');
  };

  const handleMarkPendingAction = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Mark Pending Action?',
      message: 'Are you sure you want to mark this call as pending action required?',
      confirmText: 'Yes, Mark Pending',
      isDangerous: true,
      action: () => {
        router.push(
          `/engineer/service-calls/detail/actions/mark-pending-action?callId=${callId}&source=${source}&status=${status}`
        );
        toast.info('Opening pending action form...');
      },
    });
  };

  const handleMarkPendingServices = () => {
    router.push(
      `/engineer/service-calls/detail/actions/mark-pending-services?callId=${callId}&source=${source}&status=${status}`
    );
    toast.info('Opening pending services form...');
  };

  const handleCloseCall = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Close Call?',
      message: 'Are you sure you want to close this call? This action cannot be undone.',
      confirmText: 'Yes, Close Call',
      isDangerous: true,
      action: () => {
        router.push(
          `/engineer/service-calls/detail/actions/close-call?callId=${callId}&source=${source}&status=${status}`
        );
        toast.info('Opening close call form...');
      },
    });
  };

  const handleResumeCall = () => {
    // Resume from Pending Action back to In Progress
    router.push(
      `/engineer/service-calls/detail/actions/mark-in-progress?callId=${callId}&source=${source}&status=${status}`
    );
  };

  const logWhatsAppAction = async (actionType: string) => {
    try {
      await fetch(
        `/api/engineers/service-calls/${callId}/whatsapp-action`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ action_type: actionType }),
        }
      );
      // Refresh call data to show updated sent status
      await fetchCallDetail();
    } catch (error) {
      console.warn('Could not log WhatsApp action:', error);
      // Don't block WhatsApp open if logging fails
    }
  };

  const handleSendInvoiceToCustomer = async () => {
    if (!call) {
      setWhatsappError('Call information not available');
      return;
    }

    if (!call.customer_whatsapp || !call.whatsapp_country_code) {
      setWhatsappError('Customer WhatsApp number is not available for this call');
      return;
    }

    if (!call.quotation_document_data) {
      setWhatsappError('Invoice data not available for this call');
      return;
    }

    try {
      setWhatsappError('');
      setWhatsappLoading(true);

      const qData = call.quotation_document_data;

      // Extract amounts from quotation_document_data
      const serviceCharges = parseFloat(String(qData.service_charge_amount || 0)) || 0;
      const serviceDiscount = parseFloat(String(qData.service_discount_amount || 0)) || 0;
      const materialTotal = parseFloat(String(qData.material_total || 0)) || 0;
      const materialDiscount = parseFloat(String(qData.material_discount_amount || 0)) || 0;
      const grandTotal = parseFloat(String(qData.grand_total || 0)) || 0;
      const paidAmount = parseFloat(String(qData.paid_amount || 0)) || 0;
      const finalDiscount = parseFloat(String(qData.final_discount_amount || 0)) || 0;
      const pendingAmount = Math.max(0, grandTotal - paidAmount);

      // Extract material items from quotation_document_data
      const materialItems = qData.quotation_rows || [];

      const phoneNumber = formatPhoneForWhatsApp(call.whatsapp_country_code, call.customer_whatsapp);
      const message = generateInvoiceToCustomerMessage({
        customerName: call.customer_name,
        callId: call.call_id,
        createdAt: call.created_at,
        serviceCharges: serviceCharges,
        serviceDiscount: serviceDiscount,
        materialTotal: materialTotal,
        materialDiscount: materialDiscount,
        materialItems: materialItems,
        grandTotal: grandTotal,
        paidAmount: paidAmount,
        pendingAmount: pendingAmount,
        finalDiscount: finalDiscount,
      });

      // Log the action
      await logWhatsAppAction('invoice_sent_to_customer');

      // Open WhatsApp
      const whatsappLink = generateWhatsAppLink(phoneNumber, message);
      window.open(whatsappLink, '_blank');
      toast.success('Invoice sent to customer');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setWhatsappError('Failed to open WhatsApp: ' + errorMsg);
      toast.error('Failed to send invoice');
      console.error('Error in send invoice to customer:', errorMsg);
    } finally {
      setWhatsappLoading(false);
    }
  };

  const handleSendInvoiceToAccountant = async () => {
    if (!call) {
      setWhatsappError('Call information not available');
      return;
    }

    if (!call.quotation_document_data) {
      setWhatsappError('Invoice data not available for this call');
      return;
    }

    try {
      setWhatsappError('');
      setWhatsappLoading(true);

      const qData = call.quotation_document_data;

      // Extract amounts from quotation_document_data
      const serviceCharges = parseFloat(String(qData.service_charge_amount || 0)) || 0;
      const serviceDiscount = parseFloat(String(qData.service_discount_amount || 0)) || 0;
      const materialTotal = parseFloat(String(qData.material_total || 0)) || 0;
      const materialDiscount = parseFloat(String(qData.material_discount_amount || 0)) || 0;
      const grandTotal = parseFloat(String(qData.grand_total || 0)) || 0;
      const paidAmount = parseFloat(String(qData.paid_amount || 0)) || 0;
      const finalDiscount = parseFloat(String(qData.final_discount_amount || 0)) || 0;
      const pendingAmount = Math.max(0, grandTotal - paidAmount);

      // Extract material items from quotation_document_data
      const materialItems = qData.quotation_rows || [];

      const message = generateInvoiceToAccountantMessage({
        customerName: call.customer_name,
        callId: call.call_id,
        createdAt: call.created_at,
        serviceCharges: serviceCharges,
        serviceDiscount: serviceDiscount,
        materialTotal: materialTotal,
        materialDiscount: materialDiscount,
        materialItems: materialItems,
        grandTotal: grandTotal,
        paidAmount: paidAmount,
        pendingAmount: pendingAmount,
        finalDiscount: finalDiscount,
      });

      // Log the action
      await logWhatsAppAction('invoice_sent_to_accountant');

      // Open WhatsApp with generic share (no pre-selected contact)
      const whatsappLink = generateWhatsAppShareLink(message);
      window.open(whatsappLink, '_blank');
      toast.success('Invoice sent to accountant');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setWhatsappError('Failed to open WhatsApp: ' + errorMsg);
      toast.error('Failed to send invoice');
      console.error('Error in send invoice to accountant:', errorMsg);
    } finally {
      setWhatsappLoading(false);
    }
  };

  const handleSendClosureMessage = async () => {
    if (!call) {
      setWhatsappError('Call information not available');
      return;
    }

    if (!call.customer_whatsapp || !call.whatsapp_country_code) {
      setWhatsappError('Customer WhatsApp number is not available for this call');
      return;
    }

    try {
      setWhatsappError('');
      setWhatsappLoading(true);

      const phoneNumber = formatPhoneForWhatsApp(call.whatsapp_country_code, call.customer_whatsapp);
      const message = generateClosureMessageToCustomer({
        customerName: call.customer_name,
        callId: call.call_id,
        createdAt: call.created_at,
      });

      // Log the action
      await logWhatsAppAction('closure_message_sent_to_customer');

      // Open WhatsApp
      const whatsappLink = generateWhatsAppLink(phoneNumber, message);
      window.open(whatsappLink, '_blank');
      toast.success('Closure message sent to customer');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setWhatsappError('Failed to open WhatsApp: ' + errorMsg);
      toast.error('Failed to send closure message');
      console.error('Error in send closure message:', errorMsg);
    } finally {
      setWhatsappLoading(false);
    }
  };

  const handleBackClick = () => {
    // Check both source and fromSearch parameters
    if (source === 'search' || searchParams.get('fromSearch') === 'true') {
      router.push('/engineer');
    } else if (source === 'list') {
      router.push(`/engineer/service-calls?status=${status}`);
    } else {
      router.push('/engineer');
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

  if (loading) {
    return (
      <EngineerLayout showHeader={false}>
        <DetailPageSkeleton />
      </EngineerLayout>
    );
  }

  if (!call) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <div className="bg-white border-b p-4 flex items-center gap-3">
          <button
            onClick={handleBackClick}
            className="text-2xl text-gray-600 hover:text-gray-900"
          >
            ←
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Call Not Found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="bg-white border-b p-4 flex items-center gap-3">
        <button
          onClick={handleBackClick}
          className="text-2xl text-gray-600 hover:text-gray-900"
        >
          ←
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{call.call_id}</h1>
          <p className="text-gray-500 text-sm mt-1">Service Call Details</p>
        </div>
      </div>

      <div className="flex-1 p-4 pb-24">


        {/* Status and Priority */}
        <div className="bg-white rounded-lg p-4 mb-4 border space-y-2">
          <div className="flex justify-between items-center">
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(
                call.call_status
              )}`}
            >
              {getStatusLabel(call.call_status)}
            </span>
          </div>
          <span className={`inline-block px-3 py-1.5 rounded-[12px] text-xs font-bold uppercase tracking-wider ${getPriorityColor(call.priority_level)}`}>
            {call.priority_level?.charAt(0).toUpperCase() + call.priority_level?.slice(1)} Priority
          </span>
        </div>

        {/* Customer Information */}
        <div className="bg-white rounded-lg p-4 mb-4 border">
          <h2 className="font-bold text-gray-900 mb-3">Customer Information</h2>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-gray-500 font-semibold mb-1">CUSTOMER NAME</div>
              <div className="text-gray-900 font-medium">{call.customer_name}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 font-semibold mb-1">ADDRESS</div>
              <div className="text-gray-900">{call.customer_address}</div>
            </div>
            <div className="flex gap-3">
              <a
                href={`tel:${call.phone_country_code}${call.customer_phone}`}
                className="flex-1 flex items-center gap-2 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
              >
                <span className="text-xl">☎️</span>
                <div className="text-left">
                  <div className="text-xs text-gray-500">Phone</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {call.phone_country_code} {call.customer_phone}
                  </div>
                </div>
              </a>
              <a
                href={`https://wa.me/${call.whatsapp_country_code}${call.customer_whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center gap-2 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition"
              >
                <span className="text-xl">💬</span>
                <div className="text-left">
                  <div className="text-xs text-gray-500">WhatsApp</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {call.whatsapp_country_code} {call.customer_whatsapp}
                  </div>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Customer History CTA */}
        <button
          onClick={() => {
            router.push(
              `/engineer/customer-history?countryCode=${encodeURIComponent(call.phone_country_code)}&phoneNumber=${encodeURIComponent(call.customer_phone)}`
            );
          }}
          className="w-full mb-4 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-3 rounded-lg transition flex items-center justify-center gap-2\">\n          📋 Customer History\n        </button>

        {/* Service Details */}
        <div className="bg-white rounded-lg p-4 mb-4 border">
          <h2 className="font-bold text-gray-900 mb-3">Service Details</h2>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-gray-500 font-semibold mb-1">CATEGORY</div>
              <div className="text-gray-900">{call.category_name_snapshot}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 font-semibold mb-1">PROBLEM REPORTED</div>
              <div className="text-gray-900">{call.problem_reported}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 font-semibold mb-1">CHARGE TYPE</div>
              <div className="text-gray-900">
                {call.charge_type.charAt(0).toUpperCase() + call.charge_type.slice(1)}
                {call.charge_type === 'custom' && call.custom_amount ? ` - ${call.custom_amount}` : ''}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 font-semibold mb-1">CREATED</div>
              <div className="text-gray-900">
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
          </div>
        </div>

        {/* Purchase Details */}
        <div className="bg-white rounded-lg p-4 mb-4 border">
          <h2 className="font-bold text-gray-900 mb-3">Purchase Details</h2>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-gray-500 font-semibold mb-1">PURCHASE SOURCE</div>
              <div className="text-gray-900 font-medium">
                {call.purchase_source === 'own_business' && 'Purchased from Business'}
                {call.purchase_source === 'not_purchased' && 'Not Purchased from Business'}
                {call.purchase_source === 'other' && 'Purchased from Other'}
                {!call.purchase_source && 'Not specified'}
              </div>
            </div>
            {call.purchase_source === 'other' && call.seller_name_if_other && (
              <div>
                <div className="text-xs text-gray-500 font-semibold mb-1">SELLER NAME</div>
                <div className="text-gray-900 font-medium">{call.seller_name_if_other}</div>
              </div>
            )}
          </div>
        </div>

        {/* Warranty Details */}
        <div className="bg-white rounded-lg p-4 mb-4 border">
          <h2 className="font-bold text-gray-900 mb-3">Warranty Details</h2>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-gray-500 font-semibold mb-1">WARRANTY STATUS</div>
              <div className="text-gray-900 font-medium">
                {call.warranty_status === 'in_warranty' && 'In Warranty'}
                {call.warranty_status === 'out_warranty' && 'Out of Warranty'}
                {call.warranty_status === 'unknown' && 'Unknown Warranty Status'}
                {!call.warranty_status && 'Not specified'}
              </div>
            </div>
            {call.warranty_status === 'in_warranty' && call.purchase_date && (
              <div>
                <div className="text-xs text-gray-500 font-semibold mb-1">PURCHASE DATE</div>
                <div className="text-gray-900 font-medium">
                  {new Date(call.purchase_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Special Note to Engineer */}
        {call.special_note_to_engineer && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <h2 className="font-bold text-yellow-900 mb-2">📝 Special Note from Manager</h2>
            <p className="text-yellow-800">{call.special_note_to_engineer}</p>
          </div>
        )}

        {/* Status Action Buttons */}
        <div className="space-y-2 mb-4">
          {call.call_status === 'assigned' && (
            <button
              onClick={handleMarkInProgress}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition"
            >
              ▶ Mark as In Progress
            </button>
          )}

          {call.call_status === 'in_progress' && (
            <>
              <button
                onClick={handleMarkPendingAction}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg transition"
              >
                ⚠️ Mark Pending Action Required
              </button>
              <button
                onClick={handleMarkPendingServices}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 rounded-lg transition"
              >
                📋 Mark Pending Under Services
              </button>
              <button
                onClick={handleCloseCall}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg transition"
              >
                ✓ Close Call
              </button>
            </>
          )}

          {call.call_status === 'pending_action_required' && (
            <button
              onClick={handleResumeCall}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition"
            >
              ▶️ Resume (Mark In Progress)
            </button>
          )}
        </div>

        {/* Closure Information (if closed) */}
        {call.call_status === 'closed' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <h2 className="font-bold text-green-900 mb-3">✓ Call Closed</h2>
            <div className="space-y-3">
              {call.closure_timestamp && (
                <div>
                  <div className="text-xs text-green-700 font-semibold mb-1">CLOSED DATE & TIME</div>
                  <div className="text-green-900">
                    {new Date(call.closure_timestamp).toLocaleDateString('en-US', {
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
              {call.closure_note && (
                <div>
                  <div className="text-xs text-green-700 font-semibold mb-1">CLOSURE NOTE</div>
                  <div className="text-green-900">{call.closure_note}</div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Billing Details (if closed) */}
        {call.call_status === 'closed' && call.quotation_document_data && (
          <div className="bg-white rounded-lg p-4 mb-4 border">
            <h2 className="font-bold text-gray-900 mb-3">Billing Details</h2>
            <div className="space-y-3">
              {/* Service Charges Section */}
              <div>
                <div className="text-xs text-gray-500 font-semibold mb-2">SERVICE CHARGES</div>
                <div className="text-gray-900 font-medium">
                  {formatCurrency(call.quotation_document_data.service_charge_amount || 0)}
                </div>
              </div>

              {/* Service Discount */}
              {call.quotation_document_data.service_discount_amount && parseFloat(String(call.quotation_document_data.service_discount_amount)) > 0 && (
                <div>
                  <div className="text-xs text-gray-500 font-semibold mb-2">SERVICE DISCOUNT</div>
                  <div className="text-gray-900 font-medium">
                    -{formatCurrency(call.quotation_document_data.service_discount_amount)}
                  </div>
                </div>
              )}

              {/* Total Service Charges */}
              <div className="border-t border-gray-200 pt-2">
                <div className="text-xs text-gray-500 font-semibold mb-2">TOTAL SERVICE CHARGES</div>
                <div className="text-lg font-bold text-gray-900">
                  {formatCurrency(
                    (parseFloat(String(call.quotation_document_data.service_charge_amount || 0)) || 0) -
                    (parseFloat(String(call.quotation_document_data.service_discount_amount || 0)) || 0)
                  )}
                </div>
              </div>

              {/* Material Items */}
              {call.quotation_document_data.quotation_rows && call.quotation_document_data.quotation_rows.length > 0 && (
                <>
                  <div className="border-t border-gray-200 pt-3">
                    <div className="text-xs text-gray-500 font-semibold mb-2">MATERIAL ITEMS</div>
                    <div className="space-y-2">
                      {call.quotation_document_data.quotation_rows.map((row: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                          <span className="text-gray-700">{row.product_name} × {row.quantity}</span>
                          <span className="font-semibold text-gray-900">{formatCurrency(row.row_total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Material Total */}
                  <div>
                    <div className="text-xs text-gray-500 font-semibold mb-2">MATERIAL USED TOTAL</div>
                    <div className="text-gray-900 font-medium">
                      {formatCurrency(call.quotation_document_data.material_total || 0)}
                    </div>
                  </div>

                  {/* Material Discount */}
                  {call.quotation_document_data.material_discount_amount && parseFloat(String(call.quotation_document_data.material_discount_amount)) > 0 && (
                    <div>
                      <div className="text-xs text-gray-500 font-semibold mb-2">MATERIAL DISCOUNT</div>
                      <div className="text-gray-900 font-medium">
                        -{formatCurrency(call.quotation_document_data.material_discount_amount)}
                      </div>
                    </div>
                  )}

                  {/* Total Material */}
                  <div className="border-t border-gray-200 pt-2">
                    <div className="text-xs text-gray-500 font-semibold mb-2">TOTAL MATERIAL CHARGES</div>
                    <div className="text-lg font-bold text-gray-900">
                      {formatCurrency(
                        (parseFloat(String(call.quotation_document_data.material_total || 0)) || 0) -
                        (parseFloat(String(call.quotation_document_data.material_discount_amount || 0)) || 0)
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Grand Total */}
              <div className="border-t border-gray-200 pt-3 bg-blue-50 p-3 rounded-lg">
                <div className="text-xs text-blue-700 font-semibold mb-2">GRAND TOTAL</div>
                <div className="text-2xl font-black text-blue-900">
                  {formatCurrency(call.quotation_document_data.grand_total || 0)}
                </div>
              </div>

              {/* Paid Amount */}
              <div>
                <div className="text-xs text-gray-500 font-semibold mb-2">PAID AMOUNT</div>
                <div className="text-gray-900 font-medium">
                  {formatCurrency(call.quotation_document_data.paid_amount || 0)}
                </div>
              </div>

              {/* Pending Amount */}
              <div>
                <div className="text-xs text-gray-500 font-semibold mb-2">PENDING AMOUNT</div>
                <div className="text-lg font-bold text-red-600">
                  {formatCurrency(
                    Math.max(0, (parseFloat(String(call.quotation_document_data.grand_total || 0)) || 0) -
                    (parseFloat(String(call.quotation_document_data.paid_amount || 0)) || 0))
                  )}
                </div>
              </div>

              {/* Final Discount */}
              {call.quotation_document_data.final_discount_amount && parseFloat(String(call.quotation_document_data.final_discount_amount)) > 0 && (
                <div>
                  <div className="text-xs text-gray-500 font-semibold mb-2">FINAL DISCOUNT</div>
                  <div className="text-gray-900 font-medium">
                    -{formatCurrency(call.quotation_document_data.final_discount_amount)}
                  </div>
                </div>
              )}

              {/* Final Pending Amount */}
              {call.quotation_document_data.final_discount_amount && parseFloat(String(call.quotation_document_data.final_discount_amount)) > 0 && (
                <div className="border-t border-gray-200 pt-2">
                  <div className="text-xs text-gray-500 font-semibold mb-2">FINAL PENDING AMOUNT</div>
                  <div className="text-lg font-bold text-red-600">
                    {formatCurrency(
                      Math.max(0, (parseFloat(String(call.quotation_document_data.grand_total || 0)) || 0) -
                      (parseFloat(String(call.quotation_document_data.paid_amount || 0)) || 0) -
                      (parseFloat(String(call.quotation_document_data.final_discount_amount || 0)) || 0))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* View Quotation Button (if closed) */}
        {call.call_status === 'closed' && (
          <div className="mb-4">
            <button
              onClick={() => router.push(`/engineer/service-calls/detail/quotation?callId=${callId}`)}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition"
            >
              📄 View Quotation / PDF
            </button>
          </div>
        )}

        {/* WhatsApp Error Message */}
        {whatsappError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
            {whatsappError}
          </div>
        )}

        {/* Post-Closure WhatsApp Actions (if closed) */}
        {call.call_status === 'closed' && (
          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">WhatsApp Actions</h3>
            <div className="space-y-2">
              <button
                onClick={handleSendInvoiceToCustomer}
                disabled={whatsappLoading}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition"
              >
                {whatsappLoading ? '⏳ Sending...' : `${call.invoice_sent_to_customer ? '✓ ' : ''}💬 Send Invoice to Customer`}
              </button>
              <button
                onClick={handleSendInvoiceToAccountant}
                disabled={whatsappLoading}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition"
              >
                {whatsappLoading ? '⏳ Sending...' : `${call.invoice_sent_to_accountant ? '✓ ' : ''}💬 Send Invoice to Accountant`}
              </button>
              <button
                onClick={handleSendClosureMessage}
                disabled={whatsappLoading}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition"
              >
                {whatsappLoading ? '⏳ Sending...' : `${call.closure_message_sent_to_customer ? '✓ ' : ''}💬 Call Closure Message`}
              </button>
            </div>
          </div>
        )}

        {/* History Toggle */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full mb-4 bg-white border rounded-lg p-3 font-semibold text-gray-900 hover:bg-gray-50 transition flex justify-between items-center"
        >
          <span>Call History</span>
          <span className={`text-xl transition ${showHistory ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {/* History Timeline */}
        {showHistory && history.length > 0 && (
          <div className="bg-white rounded-lg p-4 border">
            <div className="space-y-4">
              {history.map((entry, idx) => (
                <div key={entry.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    {idx < history.length - 1 && <div className="w-0.5 h-12 bg-gray-200"></div>}
                  </div>
                  <div className="pb-4">
                    <div className="font-semibold text-gray-900 text-sm">
                      {entry.event_type
                        .replace(/_/g, ' ')
                        .charAt(0)
                        .toUpperCase() +
                        entry.event_type
                          .replace(/_/g, ' ')
                          .slice(1)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {entry.actor_role} •{' '}
                      {new Date(entry.event_timestamp).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    {entry.note_text && (
                      <div className="text-sm text-gray-700 mt-2">{entry.note_text}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        isDangerous={confirmDialog.isDangerous}
        onConfirm={() => {
          confirmDialog.action?.();
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        }}
        onCancel={() => {
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        }}
      />
    </div>
  );
}

export default function ServiceCallDetailPage() {
  return (
    <ProtectedRoute allowedRoles={['engineer']}>
      <EngineerLayout showHeader={false}>
        <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
          <ServiceCallDetailContent />
        </Suspense>
      </EngineerLayout>
    </ProtectedRoute>
  );
}
