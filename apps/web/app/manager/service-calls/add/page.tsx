'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AlertCircle, ChevronLeft } from 'lucide-react';

// Comprehensive list of country codes - unique entries only
const COUNTRY_CODES = [
  { id: 'us', code: '+1', country: 'United States' },
  { id: 'ca', code: '+1', country: 'Canada' },
  { id: 'uk', code: '+44', country: 'United Kingdom' },
  { id: 'in', code: '+91', country: 'India' },
  { id: 'cn', code: '+86', country: 'China' },
  { id: 'jp', code: '+81', country: 'Japan' },
  { id: 'kr', code: '+82', country: 'South Korea' },
  { id: 'fr', code: '+33', country: 'France' },
  { id: 'de', code: '+49', country: 'Germany' },
  { id: 'it', code: '+39', country: 'Italy' },
  { id: 'es', code: '+34', country: 'Spain' },
  { id: 'nl', code: '+31', country: 'Netherlands' },
  { id: 'be', code: '+32', country: 'Belgium' },
  { id: 'ch', code: '+41', country: 'Switzerland' },
  { id: 'at', code: '+43', country: 'Austria' },
  { id: 'se', code: '+46', country: 'Sweden' },
  { id: 'no', code: '+47', country: 'Norway' },
  { id: 'dk', code: '+45', country: 'Denmark' },
  { id: 'fi', code: '+358', country: 'Finland' },
  { id: 'pl', code: '+48', country: 'Poland' },
  { id: 'hu', code: '+36', country: 'Hungary' },
  { id: 'sk', code: '+421', country: 'Slovakia' },
  { id: 'cz', code: '+420', country: 'Czech Republic' },
  { id: 'si', code: '+386', country: 'Slovenia' },
  { id: 'hr', code: '+385', country: 'Croatia' },
  { id: 'ro', code: '+40', country: 'Romania' },
  { id: 'bg', code: '+359', country: 'Bulgaria' },
  { id: 'gr', code: '+30', country: 'Greece' },
  { id: 'lu', code: '+352', country: 'Luxembourg' },
  { id: 'ie', code: '+353', country: 'Ireland' },
  { id: 'is', code: '+354', country: 'Iceland' },
  { id: 'mt', code: '+356', country: 'Malta' },
  { id: 'cy', code: '+357', country: 'Cyprus' },
  { id: 'au', code: '+61', country: 'Australia' },
  { id: 'nz', code: '+64', country: 'New Zealand' },
  { id: 'sg', code: '+65', country: 'Singapore' },
  { id: 'my', code: '+60', country: 'Malaysia' },
  { id: 'th', code: '+66', country: 'Thailand' },
  { id: 'vn', code: '+84', country: 'Vietnam' },
  { id: 'ph', code: '+63', country: 'Philippines' },
  { id: 'id', code: '+62', country: 'Indonesia' },
  { id: 'br', code: '+55', country: 'Brazil' },
  { id: 'mx', code: '+52', country: 'Mexico' },
  { id: 'ar', code: '+54', country: 'Argentina' },
  { id: 'cl', code: '+56', country: 'Chile' },
  { id: 'co', code: '+57', country: 'Colombia' },
  { id: 'pe', code: '+51', country: 'Peru' },
  { id: 've', code: '+58', country: 'Venezuela' },
  { id: 'za', code: '+27', country: 'South Africa' },
  { id: 'eg', code: '+20', country: 'Egypt' },
  { id: 'ng', code: '+234', country: 'Nigeria' },
  { id: 'ma', code: '+212', country: 'Morocco' },
  { id: 'tn', code: '+216', country: 'Tunisia' },
  { id: 'ae', code: '+971', country: 'UAE' },
  { id: 'sa', code: '+966', country: 'Saudi Arabia' },
  { id: 'qa', code: '+974', country: 'Qatar' },
  { id: 'kw', code: '+965', country: 'Kuwait' },
  { id: 'bh', code: '+973', country: 'Bahrain' },
  { id: 'om', code: '+968', country: 'Oman' },
  { id: 'il', code: '+972', country: 'Israel' },
  { id: 'tr', code: '+90', country: 'Turkey' },
];

interface Category {
  id: string;
  category_name: string;
}

interface Engineer {
  id: string;
  name: string;
  mobile_number?: string;
}

interface FormData {
  business?: { name: string };
  categories: Category[];
  engineers: Engineer[];
}

function AddServiceCallContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    categories: [],
    engineers: [],
  });
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  const [form, setForm] = useState({
    customer_name: '',
    customer_address: '',
    phone_country_code: '+91',
    customer_phone: '',
    whatsapp_country_code: '+91',
    customer_whatsapp: '',
    whatsapp_same_as_phone: false,
    category_id: '',
    problem_reported: '',
    priority_level: '',
    purchase_source: '',
    seller_name_if_other: '',
    warranty_status: '',
    purchase_date: '',
    charge_type: '',
    custom_amount: '',
    selected_whatsapp_template: '',
    assigned_engineer_user_id: '',
  });

  // Load form data - only when user ID changes, not when user object reference changes
  useEffect(() => {
    if (!user?.id) return;

    const fetchFormData = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/service-calls/form-data`
        );
        if (!response.ok) throw new Error('Failed to load form data');
        const data = await response.json();
        setFormData(data);
        setLoading(false);
      } catch (err) {
        console.error('Error loading form data:', err);
        setError('Failed to load form data');
        setLoading(false);
      }
    };

    fetchFormData();
  }, [user?.id]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    const checked =
      type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;

    setForm((prev) => {
      const updated = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      };

      // Sync WhatsApp with phone if checkbox is checked
      if (name === 'whatsapp_same_as_phone' && checked) {
        updated.whatsapp_country_code = prev.phone_country_code;
        updated.customer_whatsapp = prev.customer_phone;
      }

      // Sync WhatsApp when phone changes and checkbox is checked
      if ((name === 'customer_phone' || name === 'phone_country_code') && prev.whatsapp_same_as_phone) {
        updated.whatsapp_country_code = name === 'phone_country_code' ? value : prev.phone_country_code;
        updated.customer_whatsapp = name === 'customer_phone' ? value : prev.customer_phone;
      }

      return updated;
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      // Validate all required fields
      if (
        !form.customer_name.trim() ||
        !form.customer_address.trim() ||
        !form.customer_phone.trim() ||
        !form.customer_whatsapp.trim() ||
        !form.category_id ||
        !form.problem_reported.trim() ||
        !form.priority_level ||
        !form.purchase_source ||
        !form.warranty_status ||
        !form.charge_type
      ) {
        setError('Please fill in all required fields');
        setSubmitting(false);
        return;
      }

      // Validate conditional fields
      if (form.purchase_source === 'other' && !form.seller_name_if_other.trim()) {
        setError('Seller name is required when purchase source is "Other"');
        setSubmitting(false);
        return;
      }

      if (form.warranty_status === 'in_warranty' && !form.purchase_date) {
        setError('Purchase date is required when warranty status is "In Warranty"');
        setSubmitting(false);
        return;
      }

      if (form.charge_type === 'custom' && !form.custom_amount) {
        setError('Custom amount is required');
        setSubmitting(false);
        return;
      }

      // Handle image upload if provided
      let service_image_url = '';
      if (imageFile) {
        try {
          const uploadFormData = new FormData();
          uploadFormData.append('file', imageFile);

          const uploadResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/upload`,
            {
              method: 'POST',
              body: uploadFormData,
            }
          );

          if (!uploadResponse.ok) {
            const uploadErrorData = await uploadResponse.json();
            // If upload is not configured, allow gracefully skipping image
            if (uploadErrorData.error?.includes('not configured')) {
              console.warn('Image upload not configured, continuing without image');
              service_image_url = '';
            } else {
              throw new Error(
                uploadErrorData.error || `Upload failed with status ${uploadResponse.status}`
              );
            }
          } else {
            const uploadData = await uploadResponse.json();
            if (!uploadData.url) {
              throw new Error('No URL returned from upload service');
            }
            service_image_url = uploadData.url;
          }
        } catch (uploadErr) {
          console.error('Image upload error:', uploadErr);
          // Allow continuing without image for optional field
          if (uploadErr instanceof Error && uploadErr.message.includes('not configured')) {
            console.warn('Image upload not configured, continuing without image');
          } else {
            setError(
              uploadErr instanceof Error
                ? `Image upload failed: ${uploadErr.message}`
                : 'Image upload failed'
            );
            setSubmitting(false);
            return;
          }
        }
      }

      // Create service call (exclude selected_whatsapp_template as it's handled in detail view)
      const { selected_whatsapp_template, ...formDataForSubmit } = form;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/service-calls`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formDataForSubmit,
            service_image_url,
            selected_whatsapp_template: null,
            custom_amount: form.custom_amount ? parseFloat(form.custom_amount) : null,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create service call');
      }

      // Success
      router.push('/manager/service-calls');
    } catch (err) {
      console.error('Error creating service call:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to create service call'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-500">Loading form...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4 pb-24">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
          type="button"
        >
          <ChevronLeft className="w-6 h-6 text-slate-900" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create Service Call</h1>
          <p className="text-sm text-slate-500 mt-1">
            Fill in the details to create a new service call
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* SECTION 1: CUSTOMER DETAILS */}
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Customer Details
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Customer Name *
              </label>
              <input
                type="text"
                name="customer_name"
                value={form.customer_name}
                onChange={handleInputChange}
                placeholder="Enter customer name"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Address *
              </label>
              <textarea
                name="customer_address"
                value={form.customer_address}
                onChange={handleInputChange}
                placeholder="Enter customer address"
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Phone Number *
              </label>
              <div className="flex gap-2">
                <select
                  name="phone_country_code"
                  value={form.phone_country_code}
                  onChange={handleInputChange}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-24"
                >
                  {COUNTRY_CODES.map((cc) => (
                    <option key={cc.id} value={cc.code}>
                      {cc.code}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  name="customer_phone"
                  value={form.customer_phone}
                  onChange={handleInputChange}
                  placeholder="Phone number"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="checkbox"
                  name="whatsapp_same_as_phone"
                  checked={form.whatsapp_same_as_phone}
                  onChange={handleInputChange}
                  id="whatsapp_same_as_phone"
                  className="w-4 h-4"
                />
                <label
                  htmlFor="whatsapp_same_as_phone"
                  className="text-sm text-slate-700"
                >
                  WhatsApp number same as phone
                </label>
              </div>

              <label className="block text-sm font-medium text-slate-700 mb-2">
                WhatsApp Number *
              </label>
              <div className="flex gap-2">
                <select
                  name="whatsapp_country_code"
                  value={form.whatsapp_country_code}
                  onChange={handleInputChange}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-24"
                  disabled={form.whatsapp_same_as_phone}
                >
                  {COUNTRY_CODES.map((cc) => (
                    <option key={cc.id} value={cc.code}>
                      {cc.code}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  name="customer_whatsapp"
                  value={form.customer_whatsapp}
                  onChange={handleInputChange}
                  placeholder="WhatsApp number"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={form.whatsapp_same_as_phone}
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: SERVICE DETAILS */}
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Service Details
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Service Category *
              </label>
              <select
                name="category_id"
                value={form.category_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a category</option>
                {formData.categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.category_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Problem Reported *
              </label>
              <textarea
                name="problem_reported"
                value={form.problem_reported}
                onChange={handleInputChange}
                placeholder="Describe the problem"
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Priority Level *
              </label>
              <select
                name="priority_level"
                value={form.priority_level}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select priority</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Upload Image (Optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full"
              />
              {imagePreview && (
                <div className="mt-3 relative w-32 h-32 rounded-lg overflow-hidden border border-slate-300">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview('');
                    }}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 3: PURCHASE DETAILS */}
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Purchase Details
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Purchase Source *
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="purchase_source"
                    value="own_business"
                    checked={form.purchase_source === 'own_business'}
                    onChange={handleInputChange}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-700">
                    Purchased from {formData.business?.name || 'Our Business'}
                  </span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="purchase_source"
                    value="not_purchased"
                    checked={form.purchase_source === 'not_purchased'}
                    onChange={handleInputChange}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-700">
                    Not Purchased from {formData.business?.name || 'Our Business'}
                  </span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="purchase_source"
                    value="other"
                    checked={form.purchase_source === 'other'}
                    onChange={handleInputChange}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-700">
                    Purchased from Other
                  </span>
                </label>
              </div>
            </div>

            {form.purchase_source === 'other' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Seller Name *
                </label>
                <input
                  type="text"
                  name="seller_name_if_other"
                  value={form.seller_name_if_other}
                  onChange={handleInputChange}
                  placeholder="Enter seller name"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required={form.purchase_source === 'other'}
                />
              </div>
            )}
          </div>
        </div>

        {/* SECTION 4: WARRANTY DETAILS */}
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Warranty Details
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Warranty Status *
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="warranty_status"
                    value="in_warranty"
                    checked={form.warranty_status === 'in_warranty'}
                    onChange={handleInputChange}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-700">In Warranty</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="warranty_status"
                    value="out_warranty"
                    checked={form.warranty_status === 'out_warranty'}
                    onChange={handleInputChange}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-700">Out of Warranty</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="warranty_status"
                    value="unknown"
                    checked={form.warranty_status === 'unknown'}
                    onChange={handleInputChange}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-700">
                    Unknown Warranty Status
                  </span>
                </label>
              </div>
            </div>

            {form.warranty_status === 'in_warranty' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Purchase Date *
                </label>
                <input
                  type="date"
                  name="purchase_date"
                  value={form.purchase_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required={form.warranty_status === 'in_warranty'}
                />
              </div>
            )}
          </div>
        </div>

        {/* SECTION 5: CALL CHARGES */}
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Call Charges
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Charge Type *
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="charge_type"
                    value="amc"
                    checked={form.charge_type === 'amc'}
                    onChange={handleInputChange}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-700">AMC</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="charge_type"
                    value="standard_500"
                    checked={form.charge_type === 'standard_500'}
                    onChange={handleInputChange}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-700">
                    Standard Rate Rs 500
                  </span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="charge_type"
                    value="standard_500_coupon"
                    checked={form.charge_type === 'standard_500_coupon'}
                    onChange={handleInputChange}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-700">
                    Standard Rate Rs 500 With Coupon
                  </span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="charge_type"
                    value="custom"
                    checked={form.charge_type === 'custom'}
                    onChange={handleInputChange}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-700">Custom Amount</span>
                </label>
              </div>
            </div>

            {form.charge_type === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Custom Amount (Rs) *
                </label>
                <input
                  type="number"
                  name="custom_amount"
                  value={form.custom_amount}
                  onChange={handleInputChange}
                  placeholder="Enter amount"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required={form.charge_type === 'custom'}
                />
              </div>
            )}
          </div>
        </div>

        {/* SECTION 6: ASSIGN CALL */}
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Assign Call
          </h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Assign call to Engineer (You can also assign later)
            </label>
            <select
              name="assigned_engineer_user_id"
              value={form.assigned_engineer_user_id}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Don't assign now</option>
              {formData.engineers.map((eng) => (
                <option key={eng.id} value={eng.id}>
                  {eng.name}
                  {eng.mobile_number ? ` (${eng.mobile_number})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <div className="border-t pt-6 flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={submitting}
            className="flex-1 px-4 py-3 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {submitting ? 'Creating...' : 'Create Service Call'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AddServiceCallPage() {
  return (
    <ProtectedRoute requiredRole="manager">
      <Suspense>
        <AddServiceCallContent />
      </Suspense>
    </ProtectedRoute>
  );
}
