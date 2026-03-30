'use client';

import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import ManagerLayout from '@/app/components/ManagerLayout';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import ConfirmDialog from '@/app/components/ConfirmDialog';
import { toast } from '@/lib/toast';

function ManagerProfileContent() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
      toast.success('Signed out successfully');
      router.push('/login');
    } catch (error) {
      toast.error('Failed to sign out');
      console.error('Sign out error:', error);
    } finally {
      setIsSigningOut(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="p-6">
      {/* Profile Card */}
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white shadow-md">
            <i className="ph-fill ph-user text-2xl"></i>
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">{user?.name || 'Manager'}</h2>
            <p className="text-sm text-slate-600 mt-1">{user?.email}</p>
          </div>
        </div>

        {/* Profile Details */}
        <div className="space-y-4">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Name</p>
            <p className="text-slate-900 font-semibold">{user?.name}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Email</p>
            <p className="text-slate-900 font-semibold">{user?.email}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Role</p>
            <p className="text-slate-900 font-semibold">Manager</p>
          </div>
        </div>
      </div>

      {/* Sign Out Button */}
      <button
        onClick={() => setShowConfirm(true)}
        disabled={isSigningOut}
        className="w-full px-4 py-3 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold rounded-[18px] transition-colors active:scale-95"
      >
        {isSigningOut ? '⏳ Signing Out...' : 'Sign Out'}
      </button>

      <ConfirmDialog
        isOpen={showConfirm}
        title="Sign Out?"
        message="Are you sure you want to sign out?"
        confirmText="Yes, Sign Out"
        isDangerous
        onConfirm={handleSignOut}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}

export default function ManagerProfilePage() {
  return (
    <ProtectedRoute allowedRoles={['manager']}>
      <ManagerLayout showHeader={true}>
        <ManagerProfileContent />
      </ManagerLayout>
    </ProtectedRoute>
  );
}
