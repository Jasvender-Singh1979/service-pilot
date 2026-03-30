'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import BottomNav from '@/app/components/BottomNav';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';

interface Category {
  id: string;
  category_name: string;
  description?: string;
  active_status: boolean;
}

function EditCategoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryId = searchParams.get('id');
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [category, setCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [description, setDescription] = useState('');
  const [activeStatus, setActiveStatus] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Validate prerequisites before fetching
    if (!categoryId) {
      setError('No category ID provided');
      setLoading(false);
      return;
    }

    // Only fetch after auth is confirmed and user is available
    if (isAuthenticated && user && !authLoading) {
      fetchCategory();
    } else if (!isAuthenticated && !authLoading) {
      router.push('/login');
    }
  }, [categoryId, isAuthenticated, user?.id, authLoading]);

  async function fetchCategory() {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/categories/${categoryId}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch category (${response.status})`);
      }

      const data = await response.json();
      setCategory(data);
      setCategoryName(data.category_name);
      setDescription(data.description || '');
      setActiveStatus(data.active_status);
    } catch (err) {
      console.error('Error fetching category:', err instanceof Error ? err.message : err);
      setError(err instanceof Error ? err.message : 'Failed to load category');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!categoryName.trim()) {
      setError('Category name is required');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/categories/${categoryId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            categoryName: categoryName.trim(),
            description: description.trim() || null,
            activeStatus,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update category');
      }

      // Navigate back to categories list
      router.push('/manager/categories');
    } catch (err) {
      console.error('Error updating category:', err);
      setError(err instanceof Error ? err.message : 'Failed to update category');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-[#F8F9FB] text-slate-900 pt-[55px] overflow-x-hidden relative min-h-screen pb-20">
        <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none bg-noise mix-blend-multiply"></div>
        <div className="fixed top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none z-0"></div>

        <header className="w-full px-6 pb-4 flex justify-between items-center relative z-10">
          <div className="flex flex-col justify-center">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 leading-none mb-1">
              Edit Category
            </h1>
          </div>
          <button
            onClick={() => router.back()}
            className="w-11 h-11 bg-white rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-center justify-center border border-slate-100 active:scale-95 transition-transform"
          >
            <i className="ph-bold ph-x text-[22px] text-slate-700"></i>
          </button>
        </header>

        <main className="w-full px-6 mt-6 pb-[180px] relative z-10">
          <div className="bg-white rounded-[20px] p-5 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] animate-pulse">
            <div className="h-5 bg-slate-200 rounded w-1/3 mb-3"></div>
            <div className="h-12 bg-slate-100 rounded mb-4"></div>
            <div className="h-24 bg-slate-100 rounded"></div>
          </div>
        </main>

        <BottomNav />
      </div>
    );
  }

  if (error && !category) {
    return (
      <div className="bg-[#F8F9FB] text-slate-900 pt-[55px] overflow-x-hidden relative min-h-screen pb-20">
        <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none bg-noise mix-blend-multiply"></div>
        <div className="fixed top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none z-0"></div>

        <header className="w-full px-6 pb-4 flex justify-between items-center relative z-10">
          <div className="flex flex-col justify-center">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 leading-none mb-1">
              Edit Category
            </h1>
          </div>
          <button
            onClick={() => router.back()}
            className="w-11 h-11 bg-white rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-center justify-center border border-slate-100 active:scale-95 transition-transform"
          >
            <i className="ph-bold ph-x text-[22px] text-slate-700"></i>
          </button>
        </header>

        <main className="w-full px-6 mt-6 pb-[180px] space-y-6 relative z-10">
          <div className="bg-red-50 border border-red-100 rounded-[20px] p-4 text-red-700 text-sm font-medium">
            {error}
          </div>
          <button
            onClick={() => router.back()}
            className="w-full h-[52px] bg-slate-100 text-slate-900 rounded-[20px] font-bold uppercase tracking-widest active:scale-[0.98] transition-all"
          >
            Go Back
          </button>
        </main>

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="bg-[#F8F9FB] text-slate-900 pt-[55px] overflow-x-hidden relative min-h-screen pb-20">
      {/* Ambient Depth Elements */}
      <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none bg-noise mix-blend-multiply"></div>
      <div className="fixed top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none z-0"></div>

      {/* App Header */}
      <header className="w-full px-6 pb-4 flex justify-between items-center relative z-10">
        <div className="flex flex-col justify-center">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 leading-none mb-1">
            Edit Category
          </h1>
          <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Update category details</p>
        </div>
        <button
          onClick={() => router.back()}
          className="w-11 h-11 bg-white rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-center justify-center border border-slate-100 active:scale-95 transition-transform"
        >
          <i className="ph-bold ph-x text-[22px] text-slate-700"></i>
        </button>
      </header>

      {/* Main Content */}
      <main className="w-full px-6 mt-6 pb-[180px] space-y-6 relative z-10">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-[20px] p-4 text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Category Name Field */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-900 uppercase tracking-widest">
              Category Name *
            </label>
            <input
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="w-full px-5 py-4 rounded-[18px] border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-medium"
            />
          </div>

          {/* Description Field */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-900 uppercase tracking-widest">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-5 py-4 rounded-[18px] border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-medium resize-none"
            />
          </div>

          {/* Active Status Toggle */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-900 uppercase tracking-widest">
              Status
            </label>
            <div className="flex items-center gap-3 p-4 bg-white rounded-[18px] border border-slate-200">
              <label className="flex items-center cursor-pointer flex-1">
                <input
                  type="checkbox"
                  checked={activeStatus}
                  onChange={(e) => setActiveStatus(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-12 h-6.5 rounded-full transition-colors ${
                    activeStatus ? 'bg-green-600' : 'bg-slate-300'
                  } flex items-center px-1`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      activeStatus ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </div>
              </label>
              <span className="text-sm font-bold text-slate-900">
                {activeStatus ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full h-[52px] bg-blue-600 text-white rounded-[20px] font-bold uppercase tracking-widest active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-8"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>

          {/* Cancel Button */}
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full h-[52px] bg-slate-100 text-slate-900 rounded-[20px] font-bold uppercase tracking-widest active:scale-[0.98] transition-all"
          >
            Cancel
          </button>
        </form>
      </main>

      <BottomNav />
    </div>
  );
}

export default function EditCategoryPage() {
  return (
    <ProtectedRoute>
      <Suspense
        fallback={
          <div className="bg-[#F8F9FB] text-slate-900 pt-[55px] overflow-x-hidden relative min-h-screen pb-20">
            <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none bg-noise mix-blend-multiply"></div>
            <BottomNav />
          </div>
        }
      >
        <EditCategoryContent />
      </Suspense>
    </ProtectedRoute>
  );
}
