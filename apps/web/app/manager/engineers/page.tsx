'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import BottomNav from '@/app/components/BottomNav';
import ManagerLayout from '@/app/components/ManagerLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';

interface Engineer {
  id: string;
  name: string;
  email: string;
  mobile_number: string;
  designation: string | null;
  is_active: boolean;
  createdAt: string;
}

export default function ManageEngineersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    if (user?.id) {
      fetchEngineers();
    }

    return () => {
      mounted = false;
    };
  }, [user?.id]); // Only re-run when user ID changes

  async function fetchEngineers() {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/engineers`
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error || `Failed to fetch engineers (${response.status})`;
        console.error('Failed to fetch engineers:', errorMsg);
        setEngineers([]);
        return;
      }
      
      const data = await response.json();
      setEngineers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching engineers:', error instanceof Error ? error.message : String(error));
      setEngineers([]);
    } finally {
      setLoading(false);
    }
  }



  async function handleToggleActive(engineer: Engineer) {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/engineers/${engineer.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: engineer.name,
            email: engineer.email,
            mobileNumber: engineer.mobile_number,
            designation: engineer.designation,
            isActive: !engineer.is_active,
          }),
        }
      );

      if (response.ok) {
        fetchEngineers();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to toggle engineer status:', errorData.error || 'Unknown error');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error toggling engineer status:', errorMessage);
    }
  }

  async function handleDelete(engineerId: string) {
    if (!confirm('Are you sure you want to delete this engineer?')) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/engineers/${engineerId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        fetchEngineers();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to delete engineer:', errorData.error || 'Unknown error');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error deleting engineer:', errorMessage);
    }
  }

  return (
    <ProtectedRoute>
      <ManagerLayout>
        <div className="bg-[#F8F9FB] text-slate-900 overflow-x-hidden relative min-h-screen pb-20">
          {/* Ambient Depth Elements */}
          <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none bg-noise mix-blend-multiply"></div>
          <div className="fixed top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-[80px] pointer-events-none z-0"></div>

          {/* Main Content */}
          <main className="w-full px-6 pb-[140px] space-y-5 relative z-10">
          
          {/* Engineers List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm font-bold text-slate-500">Loading engineers...</p>
            </div>
          ) : engineers.length === 0 ? (
            <div className="bg-white rounded-[32px] p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-slate-100 text-center">
              <div className="w-16 h-16 bg-green-50 rounded-[20px] flex items-center justify-center mx-auto mb-4">
                <i className="ph-fill ph-user-gear text-[32px] text-green-600"></i>
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">No Engineers Yet</h3>
              <p className="text-sm font-bold text-slate-500">
                Add your first engineer to start managing field operations.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {engineers.map((engineer) => (
                <div
                  key={engineer.id}
                  className="bg-white rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-slate-100"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-black text-slate-900">{engineer.name}</h3>
                        {!engineer.is_active && (
                          <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold rounded-full">
                            INACTIVE
                          </span>
                        )}
                      </div>
                      {engineer.designation && (
                        <p className="text-xs font-medium text-slate-500 mb-2">{engineer.designation}</p>
                      )}
                      <p className="text-xs font-bold text-slate-600 mb-1">{engineer.email}</p>
                      <p className="text-xs font-bold text-slate-600">{engineer.mobile_number}</p>
                    </div>
                    <div className="w-10 h-10 bg-green-50 rounded-[14px] flex items-center justify-center flex-shrink-0">
                      <i className="ph-fill ph-user-gear text-lg text-green-600"></i>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => router.push(`/manager/engineers/edit?id=${engineer.id}`)}
                      className="flex-1 h-10 bg-blue-50 text-blue-600 rounded-[14px] text-xs font-black active:scale-95 transition-transform"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(engineer)}
                      className={`flex-1 h-10 rounded-[14px] text-xs font-black active:scale-95 transition-transform ${
                        engineer.is_active
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-green-50 text-green-600'
                      }`}
                    >
                      {engineer.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDelete(engineer.id)}
                      className="flex-1 h-10 bg-red-50 text-red-600 rounded-[14px] text-xs font-black active:scale-95 transition-transform"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Floating Add Button */}
        <button
          onClick={() => router.push('/manager/engineers/add')}
          className="fixed bottom-[calc(90px+env(safe-area-inset-bottom))] right-6 w-16 h-16 bg-green-600 rounded-full shadow-[0_12px_28px_rgba(34,197,94,0.4)] flex items-center justify-center text-white active:scale-95 transition-all z-40"
        >
          <i className="ph-bold ph-plus text-2xl"></i>
        </button>

        <BottomNav />
        </div>
      </ManagerLayout>
    </ProtectedRoute>
  );
}
