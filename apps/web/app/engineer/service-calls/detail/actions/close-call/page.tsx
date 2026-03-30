'use client';

import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { ChevronLeft, Plus, Trash2, Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

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

interface QuotationRow {
  id: string;
  product_name: string;
  quantity: string;
  price: string;
  row_total: number;
}

interface CloseFormData {
  closure_note: string;
  closure_image_url: string | null;
  service_charge_amount: string;
  service_discount_amount: string;
  quotation_rows: QuotationRow[];
  material_discount_amount: string;
  paid_amount: string;
  final_discount_amount: string;
}

function CloseCallContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callId = searchParams.get('callId');
  const source = searchParams.get('source') || 'list';
  const status = searchParams.get('status') || 'all';

  const [formData, setFormData] = useState<CloseFormData>({
    closure_note: '',
    closure_image_url: null,
    service_charge_amount: '',
    service_discount_amount: '',
    quotation_rows: [],
    material_discount_amount: '',
    paid_amount: '',
    final_discount_amount: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleInputChange = (field: keyof CloseFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageSelect = (file: File) => {
    setImageFile(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setFormData(prev => ({ ...prev, closure_image_url: null }));
  };

  const addQuotationRow = () => {
    const newRow: QuotationRow = {
      id: uuidv4(),
      product_name: '',
      quantity: '',
      price: '',
      row_total: 0,
    };
    setFormData(prev => ({
      ...prev,
      quotation_rows: [...prev.quotation_rows, newRow],
    }));
  };

  const removeQuotationRow = (rowId: string) => {
    setFormData(prev => ({
      ...prev,
      quotation_rows: prev.quotation_rows.filter(r => r.id !== rowId),
    }));
  };

  const updateQuotationRow = (rowId: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      quotation_rows: prev.quotation_rows.map(row => {
        if (row.id !== rowId) return row;
        const updated = { ...row, [field]: value };
        if (field === 'quantity' || field === 'price') {
          const qty = parseFloat(updated.quantity) || 0;
          const price = parseFloat(updated.price) || 0;
          updated.row_total = qty * price;
        }
        return updated;
      }),
    }));
  };

  const getMaterialTotal = () => {
    return formData.quotation_rows.reduce((sum, row) => sum + row.row_total, 0);
  };

  const getFinalServiceAmount = () => {
    const serviceCharge = parseFloat(formData.service_charge_amount) || 0;
    const serviceDiscount = parseFloat(formData.service_discount_amount) || 0;
    return serviceCharge - serviceDiscount;
  };

  const getFinalMaterialAmount = () => {
    const materialTotal = getMaterialTotal();
    const materialDiscount = parseFloat(formData.material_discount_amount) || 0;
    return materialTotal - materialDiscount;
  };

  const getGrandTotal = () => {
    return getFinalServiceAmount() + getFinalMaterialAmount();
  };

  const validateForm = (): boolean => {
    if (!formData.closure_note.trim()) {
      setError('Closure note is required');
      return false;
    }
    if (!formData.service_charge_amount) {
      setError('Service charge amount is required');
      return false;
    }

    const serviceCharge = parseFloat(formData.service_charge_amount) || 0;
    const serviceDiscount = parseFloat(formData.service_discount_amount) || 0;

    if (serviceDiscount < 0) {
      setError('Service discount cannot be negative');
      return false;
    }
    if (serviceDiscount > serviceCharge) {
      setError('Service discount cannot exceed service charge amount');
      return false;
    }

    const materialTotal = getMaterialTotal();
    const materialDiscount = parseFloat(formData.material_discount_amount) || 0;

    if (materialDiscount < 0) {
      setError('Material discount cannot be negative');
      return false;
    }
    if (materialDiscount > materialTotal) {
      setError('Material discount cannot exceed material total');
      return false;
    }

    // Validate paid amount
    const paidAmount = parseFloat(formData.paid_amount) || 0;
    if (paidAmount < 0) {
      setError('Paid amount cannot be negative');
      return false;
    }
    const grandTotal = getGrandTotal();
    if (paidAmount > grandTotal) {
      setError('Paid amount cannot exceed grand total');
      return false;
    }

    // Validate final discount
    const finalDiscount = parseFloat(formData.final_discount_amount) || 0;
    if (finalDiscount < 0) {
      setError('Final discount cannot be negative');
      return false;
    }
    const pendingBeforeDiscount = Math.max(0, grandTotal - paidAmount);
    if (finalDiscount > pendingBeforeDiscount) {
      setError('Final discount cannot exceed pending amount');
      return false;
    }

    // Validate each quotation row
    for (const row of formData.quotation_rows) {
      if (!row.product_name.trim()) {
        setError('All quotation items must have a product name');
        return false;
      }
      if (!row.quantity || isNaN(parseFloat(row.quantity))) {
        setError('All quotation items must have a valid quantity');
        return false;
      }
      if (!row.price || isNaN(parseFloat(row.price))) {
        setError('All quotation items must have a valid price');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!callId) {
      setError('Call ID is missing');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Upload image if selected
      let imageUrl = null;
      if (imageFile) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', imageFile);
        const uploadRes = await fetch(`/api/upload`, {
          method: 'POST',
          body: uploadFormData,
        });
        if (!uploadRes.ok) {
          throw new Error('Failed to upload image');
        }
        const uploadData = await uploadRes.json();
        imageUrl = uploadData.url;
      }

      // Submit closure
      const response = await fetch(
        `/api/engineers/service-calls/${callId}/close`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            closure_note: formData.closure_note,
            closure_image_url: imageUrl,
            service_charge_amount: parseFloat(formData.service_charge_amount),
            service_discount_amount: parseFloat(formData.service_discount_amount) || 0,
            material_discount_amount: parseFloat(formData.material_discount_amount) || 0,
            quotation_rows: formData.quotation_rows.map(row => ({
              product_name: row.product_name,
              quantity: parseFloat(row.quantity),
              price: parseFloat(row.price),
              row_total: row.row_total,
            })),
            grand_total: getGrandTotal(),
            material_total: getMaterialTotal(),
            paid_amount: parseFloat(formData.paid_amount) || 0,
            final_discount_amount: parseFloat(formData.final_discount_amount) || 0,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to close call');
      }

      // Navigate back to detail page
      router.push(
        `/engineer/service-calls/detail?callId=${callId}&source=${source}&status=${status}`
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to close call';
      setError(errorMessage);
      console.error('Error closing call:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(
      `/engineer/service-calls/detail?callId=${callId}&source=${source}&status=${status}`
    );
  };

  const materialTotal = getMaterialTotal();
  const finalServiceAmount = getFinalServiceAmount();
  const finalMaterialAmount = getFinalMaterialAmount();
  const grandTotal = getGrandTotal();

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-20 p-4 flex items-center gap-3">
        <button
          onClick={handleCancel}
          disabled={loading}
          className="text-2xl text-gray-600 hover:text-gray-900 disabled:opacity-50"
          type="button"
        >
          ←
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Close Call</h1>
          <p className="text-gray-500 text-sm mt-1">Complete closure form with billing details</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 pb-24 max-w-2xl mx-auto w-full">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Section A: Closure Note */}
        <div className="bg-white rounded-lg p-4 mb-4 border">
          <h2 className="font-bold text-gray-900 mb-3">Closure Note</h2>
          <textarea
            value={formData.closure_note}
            onChange={(e) => handleInputChange('closure_note', e.target.value)}
            placeholder="Enter closure note (required)"
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            rows={4}
            disabled={loading}
          />
          <p className="text-xs text-gray-500 mt-2">
            {formData.closure_note.length} characters
          </p>
        </div>

        {/* Section B: Optional Picture */}
        <div className="bg-white rounded-lg p-4 mb-4 border">
          <h2 className="font-bold text-gray-900 mb-3">Upload Picture (Optional)</h2>
          {imageFile ? (
            <div className="relative bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={URL.createObjectURL(imageFile)}
                alt="Selected"
                className="w-full h-auto"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                disabled={loading}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 disabled:opacity-50"
              >
                ✕
              </button>
            </div>
          ) : (
            <label className="block border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleImageSelect(e.target.files[0])}
                disabled={loading}
                className="hidden"
              />
              <div className="text-gray-600">
                <div className="text-3xl mb-2">📷</div>
                <p className="text-sm">Click to select an image</p>
              </div>
            </label>
          )}
        </div>

        {/* Section C: Service Charges */}
        <div className="bg-white rounded-lg p-4 mb-4 border">
          <h2 className="font-bold text-gray-900 mb-3">Service Charges</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Amount (Required)</label>
              <input
                type="number"
                value={formData.service_charge_amount}
                onChange={(e) => handleInputChange('service_charge_amount', e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                step="0.01"
                min="0"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Discount (Optional)</label>
              <input
                type="number"
                value={formData.service_discount_amount}
                onChange={(e) => handleInputChange('service_discount_amount', e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                step="0.01"
                min="0"
                disabled={loading}
              />
              {formData.service_discount_amount && parseFloat(formData.service_discount_amount) > 0 && (
                <div className="mt-2 text-sm bg-gray-50 p-2 rounded">
                  <div className="flex justify-between text-gray-700">
                    <span>Service Charges:</span>
                    <span>{formatCurrency(formData.service_charge_amount)}</span>
                  </div>
                  <div className="flex justify-between text-gray-700 border-t pt-1 mt-1">
                    <span>- Service Discount:</span>
                    <span>{formatCurrency(formData.service_discount_amount)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-gray-900 border-t pt-1 mt-1">
                    <span>= Total Service Charges:</span>
                    <span className="text-blue-600">{formatCurrency(finalServiceAmount)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section D: Quotation / Material Items */}
        <div className="bg-white rounded-lg p-4 mb-4 border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900">Quotation / Material</h2>
            <button
              type="button"
              onClick={addQuotationRow}
              disabled={loading}
              className="text-blue-600 hover:text-blue-700 text-sm font-semibold disabled:opacity-50"
            >
              + Add Item
            </button>
          </div>

          {formData.quotation_rows.length > 0 ? (
            <div className="space-y-4 mb-4">
              {formData.quotation_rows.map((row, idx) => (
                <div key={row.id} className="border rounded-lg p-3 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold text-gray-500">Item {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeQuotationRow(row.id)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={row.product_name}
                      onChange={(e) => updateQuotationRow(row.id, 'product_name', e.target.value)}
                      placeholder="Product / Item Name"
                      className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="number"
                        value={row.quantity}
                        onChange={(e) => updateQuotationRow(row.id, 'quantity', e.target.value)}
                        placeholder="Qty"
                        className="px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        step="0.01"
                        min="0"
                        disabled={loading}
                      />
                      <input
                        type="number"
                        value={row.price}
                        onChange={(e) => updateQuotationRow(row.id, 'price', e.target.value)}
                        placeholder="Price"
                        className="px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        step="0.01"
                        min="0"
                        disabled={loading}
                      />
                      <div className="px-2 py-1 bg-white border rounded text-sm font-semibold text-gray-700">
                        {formatCurrency(row.row_total)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 mb-4">No items added yet</p>
          )}

          {formData.quotation_rows.length > 0 && (
            <div className="border-t pt-4 space-y-3">
              <div>
                <div className="mb-3 text-sm bg-gray-50 p-2 rounded">
                  <div className="flex justify-between text-gray-700">
                    <span>Material Total:</span>
                    <span className="font-semibold">{formatCurrency(materialTotal)}</span>
                  </div>
                </div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Material Discount (Optional)</label>
                <input
                  type="number"
                  value={formData.material_discount_amount}
                  onChange={(e) => handleInputChange('material_discount_amount', e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  step="0.01"
                  min="0"
                  disabled={loading}
                />
                {formData.material_discount_amount && parseFloat(formData.material_discount_amount) > 0 && (
                  <div className="mt-2 text-sm bg-gray-50 p-2 rounded">
                    <div className="flex justify-between text-gray-700 border-t pt-1 mt-1">
                      <span>- Material Discount:</span>
                      <span>{formatCurrency(formData.material_discount_amount)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-gray-900 border-t pt-1 mt-1">
                      <span>= Total Material Charges:</span>
                      <span className="text-blue-600">{formatCurrency(finalMaterialAmount)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section E: Final Totals & Payment */}
        <div className="bg-white rounded-lg p-4 mb-4 border">
          <h2 className="font-bold text-gray-900 mb-3">Invoice Summary</h2>
          <div className="space-y-2 border-t pt-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Service Charges:</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(formData.service_charge_amount)}
              </span>
            </div>
            {parseFloat(formData.service_discount_amount || '0') > 0 && (
              <div className="flex justify-between items-center text-red-600">
                <span>- Service Discount:</span>
                <span className="font-semibold">{formatCurrency(formData.service_discount_amount)}</span>
              </div>
            )}
            {formData.quotation_rows.length > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Material Total:</span>
                <span className="font-semibold text-gray-900">{formatCurrency(materialTotal)}</span>
              </div>
            )}
            {parseFloat(formData.material_discount_amount || '0') > 0 && (
              <div className="flex justify-between items-center text-red-600">
                <span>- Material Discount:</span>
                <span className="font-semibold">{formatCurrency(formData.material_discount_amount)}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between items-center">
              <span className="font-bold text-gray-900">Grand Total:</span>
              <span className="text-xl font-bold text-blue-600">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Section F: Payment Collection */}
        <div className="bg-white rounded-lg p-4 mb-4 border">
          <h2 className="font-bold text-gray-900 mb-3">Payment Collection</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Paid Amount (Optional)</label>
              <input
                type="number"
                value={formData.paid_amount}
                onChange={(e) => handleInputChange('paid_amount', e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                step="0.01"
                min="0"
                max={grandTotal}
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">Cannot exceed grand total: {formatCurrency(grandTotal)}</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Final Discount (Optional)</label>
              <input
                type="number"
                value={formData.final_discount_amount}
                onChange={(e) => handleInputChange('final_discount_amount', e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                step="0.01"
                min="0"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Cannot exceed pending amount: {formatCurrency(Math.max(0, grandTotal - parseFloat(formData.paid_amount || '0')))}
              </p>
            </div>
            {(parseFloat(formData.paid_amount || '0') > 0 || parseFloat(formData.final_discount_amount || '0') > 0) && (
              <div className="mt-3 text-sm bg-gray-50 p-2 rounded space-y-1">
                <div className="flex justify-between text-gray-700">
                  <span>Grand Total:</span>
                  <span className="font-semibold">{formatCurrency(grandTotal)}</span>
                </div>
                {parseFloat(formData.paid_amount || '0') > 0 && (
                  <div className="flex justify-between text-green-700 border-t pt-1">
                    <span>- Paid Amount:</span>
                    <span className="font-semibold">{formatCurrency(formData.paid_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-orange-700 border-t pt-1 font-semibold">
                  <span>= Pending Amount:</span>
                  <span>
                    {formatCurrency(Math.max(0, grandTotal - parseFloat(formData.paid_amount || '0')))}
                  </span>
                </div>
                {parseFloat(formData.final_discount_amount || '0') > 0 && (
                  <>
                    <div className="flex justify-between text-red-600 border-t pt-1">
                      <span>- Final Discount:</span>
                      <span className="font-semibold">{formatCurrency(formData.final_discount_amount)}</span>
                    </div>
                    <div className="flex justify-between text-blue-700 border-t pt-1 font-bold">
                      <span>= Final Pending Amount:</span>
                      <span>
                        {formatCurrency(
                          Math.max(
                            0,
                            grandTotal -
                              parseFloat(formData.paid_amount || '0') -
                              parseFloat(formData.final_discount_amount || '0')
                          )
                        )}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex gap-3 z-20 safe-area-bottom">
        <button
          type="button"
          onClick={handleCancel}
          disabled={loading}
          className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold rounded-lg transition disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !formData.closure_note.trim() || !formData.service_charge_amount}
          className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Closing...
            </>
          ) : (
            'Confirm Close'
          )}
        </button>
      </div>
    </div>
  );
}

export default function CloseCallPage() {
  return (
    <ProtectedRoute allowedRoles={['engineer']}>
      <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
        <CloseCallContent />
      </Suspense>
    </ProtectedRoute>
  );
}
