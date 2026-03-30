'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import BottomNav from '@/app/components/BottomNav';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';

export default function AddCategoryPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [categoryName, setCategoryName] = useState('');
  const [description, setDescription] = useState('');
  const [activeStatus, setActiveStatus] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Ensure user is authenticated before allowing category creation
  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!categoryName.trim()) {
      setError('Category name is required');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/categories`,
        {
          method: 'POST',
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
        throw new Error(errorData.error || `Failed to create category (${response.status})`);
      }

      // Navigate back to categories list
      router.push('/manager/categories');
    } catch (err) {
      console.error('Error creating category:', err instanceof Error ? err.message : err);
      setError(err instanceof Error ? err.message : 'Failed to create category');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ProtectedRoute>
      <div className="bg-[#F8F9FB] text-slate-900 pt-[55px] overflow-x-hidden relative min-h-screen pb-20">
        {/* Ambient Depth Elements */}
        <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none bg-noise mix-blend-multiply"></div>
        <div className="fixed top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none z-0"></div>

        {/* App Header */}
        <header className="w-full px-6 pb-4 flex justify-between items-center relative z-10">
          <div className="flex flex-col justify-center">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 leading-none mb-1">
              Add Service Category
            </h1>
            <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Create a new category</p>
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
                placeholder="e.g., Computer Repair, CCTV Installation"
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
                placeholder="e.g., General computer repairs including hardware and software..."
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
              disabled={loading}
              className="w-full h-[52px] bg-blue-600 text-white rounded-[20px] font-bold uppercase tracking-widest active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-8"
            >
              {loading ? 'Creating...' : 'Create Category'}
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
    </ProtectedRoute>
  );
}
