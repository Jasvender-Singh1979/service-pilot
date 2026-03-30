'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ChevronLeft } from 'lucide-react';

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

interface QuotationData {
  closure_note: string;
  service_charge_amount: number;
  service_discount_amount?: number;
  service_payment_status: string;
  material_total: number;
  material_discount_amount?: number;
  material_payment_status: string | null;
  quotation_rows: Array<{
    product_name: string;
    quantity: number;
    price: number;
    row_total: number;
  }>;
  grand_total: number;
  paid_amount?: number;
}

interface ServiceCall {
  id: string;
  call_id: string;
  customer_name: string;
  customer_phone: string;
  category_name_snapshot: string;
  problem_reported: string;
  created_at: string;
  closure_timestamp: string;
  quotation_document_data: QuotationData;
  business_id: string;
}

function QuotationContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callId = searchParams.get('callId');

  const [call, setCall] = useState<ServiceCall | null>(null);
  const [loading, setLoading] = useState(true);
  const [businessInfo, setBusinessInfo] = useState<any>(null);

  useEffect(() => {
    if (callId) {
      fetchCallAndBusiness();
    }
  }, [callId]);

  const fetchCallAndBusiness = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/engineers/service-calls/detail?callId=${callId}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch call (${response.status})`);
      }

      const callData = await response.json();
      setCall(callData);

      // Fetch business info using business_id from the call
      if (callData.business_id) {
        try {
          const businessRes = await fetch(
            `/api/business/${callData.business_id}`,
            { credentials: 'include' }
          );

          if (businessRes.ok) {
            const business = await businessRes.json();
            console.log('[Quotation] Business info fetched:', { id: business.id, name: business.name });
            setBusinessInfo(business);
          } else {
            const errorData = await businessRes.json();
            const errorMsg = errorData.error || `Business fetch returned ${businessRes.status}`;
            console.error('[Quotation] Business fetch failed:', errorMsg);
          }
        } catch (businessError) {
          const errorMsg = businessError instanceof Error ? businessError.message : String(businessError);
          console.error('[Quotation] Business fetch exception:', errorMsg);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Error fetching quotation data:', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    // Set document title for PDF filename using customer name
    if (call?.customer_name) {
      const originalTitle = document.title;
      document.title = call.customer_name;
      window.print();
      document.title = originalTitle;
    } else {
      window.print();
    }
  };

  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-gray-500">Loading quotation...</div>
        </div>
      </div>
    );
  }

  if (!call || !call.quotation_document_data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-gray-500">Quotation not found</div>
          <button
            onClick={handleBack}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const quotation = call.quotation_document_data;

  return (
    <div className="bg-white">
      {/* Header - Print-hidden */}
      <div className="print:hidden bg-white border-b sticky top-0 z-20 p-4 flex items-center justify-between">
        <button
          onClick={handleBack}
          className="text-2xl text-gray-600 hover:text-gray-900"
          type="button"
        >
          ←
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Quotation</h1>
        <button
          onClick={handlePrint}
          className="text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          Print / Save
        </button>
      </div>

      {/* Quotation Document */}
      <div className="max-w-4xl mx-auto p-6 bg-white">
        {/* Header */}
        <div className="mb-6 pb-4 border-b-2 border-gray-300">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">📄 Quotation</h1>
          <p className="text-sm text-gray-600">Call ID: <span className="font-bold text-gray-900 text-lg">{call.call_id}</span></p>
        </div>

        {/* Business & Customer Info */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* From */}
          <div>
            <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">From</h3>
            {businessInfo ? (
              <div className="text-gray-900 text-sm">
                <div className="font-bold">{businessInfo.name}</div>
                {businessInfo.address && <div>{businessInfo.address}</div>}
                {businessInfo.mobile_number && (
                  <div>{businessInfo.mobile_number}</div>
                )}
              </div>
            ) : (
              <div className="text-gray-600 text-sm">Business information not available</div>
            )}
          </div>

          {/* Bill To */}
          <div>
            <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Bill To</h3>
            <div className="text-gray-900 text-sm">
              <div className="font-bold">{call.customer_name}</div>
              {call.customer_phone && (
                <div>{call.customer_phone}</div>
              )}
            </div>
          </div>
        </div>

        {/* Service Details */}
        <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded-lg text-sm">
          <div>
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Service Category</p>
            <p className="text-gray-900 font-semibold">{call.category_name_snapshot}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Problem Reported</p>
            <p className="text-gray-900">{call.problem_reported}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Call Created</p>
            <p className="text-gray-900">
              {new Date(call.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Call Closed</p>
            <p className="text-gray-900">
              {new Date(call.closure_timestamp).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* Invoice Summary */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-300">Invoice Summary</h3>
          
          {/* Service Section */}
          <div className="mb-4 pb-3 border-b border-gray-200">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700">Service Charges:</span>
              <span className="font-semibold text-gray-900">{formatCurrency(quotation.service_charge_amount)}</span>
            </div>
            {quotation.service_discount_amount && quotation.service_discount_amount > 0 && (
              <div className="flex justify-between text-sm mb-1 text-red-600">
                <span>Service Discount:</span>
                <span className="font-semibold">({formatCurrency(quotation.service_discount_amount)})</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold pt-1 mt-1 border-t border-gray-200">
              <span className="text-gray-700">Total Service Charges:</span>
              <span className="text-gray-900">
                {formatCurrency(
                  (quotation.service_charge_amount || 0) - (quotation.service_discount_amount || 0)
                )}
              </span>
            </div>
          </div>
          
          {/* Material Items Table */}
          {quotation.quotation_rows && quotation.quotation_rows.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Material Items:</p>
              <table className="w-full text-sm mb-3">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-2 px-2 text-xs font-bold text-gray-600">Description</th>
                    <th className="text-right py-2 px-2 text-xs font-bold text-gray-600">Qty</th>
                    <th className="text-right py-2 px-2 text-xs font-bold text-gray-600">Price</th>
                    <th className="text-right py-2 px-2 text-xs font-bold text-gray-600">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {quotation.quotation_rows.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="py-2 px-2 text-gray-900">{row.product_name}</td>
                      <td className="py-2 px-2 text-right text-gray-900">{row.quantity}</td>
                      <td className="py-2 px-2 text-right text-gray-900">{formatCurrency(row.price)}</td>
                      <td className="py-2 px-2 text-right font-semibold text-gray-900">
                        {formatCurrency(row.row_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Material Total Section */}
          <div className="mb-4 pb-3 border-b border-gray-200">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700">Material Used Total:</span>
              <span className="font-semibold text-gray-900">{formatCurrency(quotation.material_total)}</span>
            </div>
            {quotation.material_discount_amount && quotation.material_discount_amount > 0 && (
              <div className="flex justify-between text-sm mb-1 text-red-600">
                <span>Material Discount:</span>
                <span className="font-semibold">({formatCurrency(quotation.material_discount_amount)})</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold pt-1 mt-1 border-t border-gray-200">
              <span className="text-gray-700">Total Material Charges:</span>
              <span className="text-gray-900">
                {formatCurrency(
                  (quotation.material_total || 0) - (quotation.material_discount_amount || 0)
                )}
              </span>
            </div>
          </div>
          
          {/* Grand Total and Payment */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex justify-between text-lg font-bold mb-2 pb-2 border-b border-gray-200">
              <span className="text-gray-900">Grand Total:</span>
              <span className="text-blue-600">{formatCurrency(quotation.grand_total)}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-700">Paid Amount:</span>
              <span className="font-semibold text-green-600">{formatCurrency(quotation.paid_amount || 0)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold mb-2 pb-2 border-b border-gray-200">
              <span className="text-gray-700">Pending Amount:</span>
              <span className="text-orange-600">
                {formatCurrency(
                  Math.max(0, (quotation.grand_total || 0) - (quotation.paid_amount || 0))
                )}
              </span>
            </div>
            {quotation.final_discount_amount && quotation.final_discount_amount > 0 && (
              <>
                <div className="flex justify-between text-sm text-red-600 mb-2">
                  <span>Final Discount:</span>
                  <span className="font-semibold">({formatCurrency(quotation.final_discount_amount)})</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-blue-600">
                  <span>Final Pending Amount:</span>
                  <span>
                    {formatCurrency(
                      Math.max(
                        0,
                        (quotation.grand_total || 0) -
                        (quotation.paid_amount || 0) -
                        (quotation.final_discount_amount || 0)
                      )
                    )}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Closure Note */}
        {quotation.closure_note && (
          <div className="border-t pt-4 mb-6">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Work Notes</h3>
            <p className="text-gray-700 text-sm whitespace-pre-wrap">{quotation.closure_note}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-300 text-center text-gray-500 text-xs">
          <p>Generated on {new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}</p>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .print\\:hidden {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

export default function QuotationPage() {
  return (
    <ProtectedRoute allowedRoles={['engineer', 'manager']}>
      <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
        <QuotationContent />
      </Suspense>
    </ProtectedRoute>
  );
}
