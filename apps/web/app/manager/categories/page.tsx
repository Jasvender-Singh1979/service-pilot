'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import BottomNav from '@/app/components/BottomNav';
import ManagerLayout from '@/app/components/ManagerLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';

interface Category {
  id: string;
  category_name: string;
  description?: string;
  active_status: boolean;
  created_at: string;
}

export default function ManageCategoriesPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Only fetch after auth is confirmed and user is available
    // ProtectedRoute will handle redirection if not authenticated
    if (isAuthenticated && user && !authLoading) {
      fetchCategories();
    }
  }, [isAuthenticated, user?.id, authLoading]);

  async function fetchCategories() {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(
        `/api/categories`
      );

      if (!response.ok) {
        let errorMsg = `Failed to fetch categories (${response.status})`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (e) {
          // If response is not JSON, use status message
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      setCategories(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      let errorMessage = 'Failed to load categories';
      if (err instanceof Error) {
        errorMessage = err.message;
        console.error('Error fetching categories:', err.message, err);
      } else if (typeof err === 'object' && err !== null) {
        console.error('Error fetching categories (object):', JSON.stringify(err));
        errorMessage = 'Server error: ' + JSON.stringify(err);
      } else {
        console.error('Error fetching categories:', err);
        errorMessage = String(err);
      }
      setError(errorMessage);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }

  async function toggleCategoryStatus(categoryId: string, newStatus: boolean) {
    try {
      const response = await fetch(
        `/api/categories/${categoryId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activeStatus: newStatus }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update category');
      }

      // Refresh the list
      fetchCategories();
    } catch (err) {
      console.error('Error updating category:', err);
      alert('Failed to update category status');
    }
  }

  return (
    <ProtectedRoute>
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

          {/* Categories List */}
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
          ) : categories.length === 0 ? (
            <div className="bg-white rounded-[28px] p-8 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-[16px] flex items-center justify-center mx-auto mb-4">
                <i className="ph-fill ph-list text-[32px] text-slate-400"></i>
              </div>
              <p className="text-slate-600 font-bold mb-2">No service categories added yet</p>
              <p className="text-slate-500 text-sm">Create your first service category to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="bg-white rounded-[20px] p-5 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-slate-900 break-words mb-1">
                        {category.category_name}
                      </h3>
                      {category.description && (
                        <p className="text-xs text-slate-500">{category.description}</p>
                      )}
                      <p className="text-xs font-medium text-slate-400 mt-2">
                        {new Date(category.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleCategoryStatus(category.id, !category.active_status)}
                      className={`px-3 py-1.5 rounded-[12px] text-xs font-bold uppercase tracking-widest transition-colors flex-shrink-0 ${
                        category.active_status
                          ? 'bg-green-50 text-green-700 border border-green-100'
                          : 'bg-slate-100 text-slate-600 border border-slate-100'
                      }`}
                    >
                      {category.active_status ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                  <button
                    onClick={() => router.push(`/manager/categories/edit?id=${category.id}`)}
                    className="w-full text-left text-xs font-bold text-blue-600 hover:text-blue-700 py-2"
                  >
                    Edit Category →
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>

          {/* Fixed Add Button */}
          <div className="fixed bottom-24 right-6 z-40">
            <button
              onClick={() => router.push('/manager/categories/add')}
              className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform font-bold"
            >
              <i className="ph-bold ph-plus text-2xl"></i>
            </button>
          </div>

          <BottomNav />
        </div>
      </ManagerLayout>
    </ProtectedRoute>
  );
}
