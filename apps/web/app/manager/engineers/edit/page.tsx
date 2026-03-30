'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import BottomNav from '@/app/components/BottomNav';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';

interface Engineer {
  id: string;
  name: string;
  email: string;
  mobile_number: string;
  designation: string | null;
  is_active: boolean;
}

function EditEngineerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const engineerId = searchParams.get('id');

  const [engineer, setEngineer] = useState<Engineer | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobileNumber: '',
    designation: '',
  });

  useEffect(() => {
    if (engineerId && user?.id) {
      fetchEngineer();
    }
  }, [engineerId, user?.id]);

  async function fetchEngineer() {
    if (!engineerId) return;
    
    try {
      // Create a request to get all engineers then find the one with this ID
      // This is necessary because there's no direct GET endpoint for a single engineer
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/engineers`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch engineers');
      }

      const engineers = await response.json();
      const found = engineers.find((e: Engineer) => e.id === engineerId);

      if (!found) {
        throw new Error('Engineer not found');
      }

      setEngineer(found);
      setFormData({
        name: found.name,
        email: found.email,
        mobileNumber: found.mobile_number,
        designation: found.designation || '',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error fetching engineer:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!engineer) return;

    setError('');
    setSubmitting(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/engineers/${engineer.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            mobileNumber: formData.mobileNumber,
            designation: formData.designation,
            isActive: engineer.is_active,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update engineer');
      }

      router.back();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-[#F8F9FB] text-slate-900 pt-[env(safe-area-inset-top,55px)] overflow-x-hidden relative min-h-screen pb-20">
      {/* Ambient Depth Elements */}
      <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none bg-noise mix-blend-multiply"></div>
      <div className="fixed top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-[80px] pointer-events-none z-0"></div>

      {/* App Header */}
      <header className="w-full px-6 pb-4 pt-4 flex justify-between items-center relative z-10">
        <button
          onClick={() => router.back()}
          className="w-11 h-11 bg-white rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-center justify-center border border-slate-100 active:scale-95 transition-transform"
        >
          <i className="ph-bold ph-caret-left text-[22px] text-slate-700"></i>
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-lg font-black tracking-tight text-slate-900 leading-none">Edit Engineer</h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Update Details</p>
        </div>
        <button
          onClick={() => router.push('/settings')}
          className="w-11 h-11 bg-white rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-center justify-center border border-slate-100 active:scale-95 transition-transform"
        >
          <i className="ph-bold ph-gear text-[22px] text-slate-700"></i>
        </button>
      </header>

      {/* Main Content */}
      <main className="w-full px-6 mt-6 pb-[140px] relative z-10">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm font-bold text-slate-500">Loading engineer...</p>
          </div>
        ) : engineer ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-[16px] text-sm font-bold">
                {error}
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-700 mb-2 block">Full Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-12 bg-white border border-slate-200 rounded-[16px] px-4 text-sm font-medium text-slate-900 outline-none focus:border-green-500 shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-2 block">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full h-12 bg-white border border-slate-200 rounded-[16px] px-4 text-sm font-medium text-slate-900 outline-none focus:border-green-500 shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-2 block">Mobile Number *</label>
              <input
                type="tel"
                value={formData.mobileNumber}
                onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                className="w-full h-12 bg-white border border-slate-200 rounded-[16px] px-4 text-sm font-medium text-slate-900 outline-none focus:border-green-500 shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-2 block">Designation (Optional)</label>
              <input
                type="text"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full h-12 bg-white border border-slate-200 rounded-[16px] px-4 text-sm font-medium text-slate-900 outline-none focus:border-green-500 shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
                placeholder="e.g., Senior Technician"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 h-14 bg-white border border-slate-200 text-slate-900 rounded-[18px] font-black text-base active:scale-95 transition-transform shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 h-14 bg-blue-600 text-white rounded-[18px] font-black text-base active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_8px_20px_rgba(37,99,235,0.4)]"
              >
                {submitting ? 'Updating...' : 'Update Engineer'}
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-white rounded-[32px] p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-slate-100 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-[20px] flex items-center justify-center mx-auto mb-4">
              <i className="ph-fill ph-warning text-[32px] text-red-600"></i>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Engineer Not Found</h3>
            <p className="text-sm font-bold text-slate-500 mb-4">
              The engineer you're trying to edit doesn't exist.
            </p>
            <button
              onClick={() => router.back()}
              className="w-full h-12 bg-blue-600 text-white rounded-[16px] font-bold active:scale-95 transition-transform"
            >
              Go Back
            </button>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

export default function EditEngineerPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
        <EditEngineerContent />
      </Suspense>
    </ProtectedRoute>
  );
}
