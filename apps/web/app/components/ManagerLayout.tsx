'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

interface ManagerLayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
}

export default function ManagerLayout({
  children,
  showHeader = true,
}: ManagerLayoutProps) {
  const router = useRouter();
  const { user } = useAuth();

  if (!showHeader) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FB]">
      {/* Fixed Top Header */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-100 p-6 flex justify-between items-start shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Hi, {user?.name || 'Manager'}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              MANAGER
            </span>
            <span className="text-slate-500 text-xs font-medium">Dashboard</span>
          </div>
        </div>

        {/* Settings and Home Icons - Vertical Stack */}
        <div className="flex flex-col gap-3">
          {/* Settings Icon */}
          <Link
            href="/manager/profile"
            className="w-10 h-10 rounded-[14px] bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors active:scale-95"
            aria-label="Open Settings"
            title="Settings"
          >
            <i className="ph-fill ph-gear text-lg"></i>
          </Link>

          {/* Home Icon */}
          <button
            onClick={() => router.push('/manager')}
            className="w-10 h-10 rounded-[14px] bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors active:scale-95"
            aria-label="Go to Home"
            title="Home"
          >
            <i className="ph-fill ph-house text-lg"></i>
          </button>
        </div>
      </div>

      {/* Content Area with Top Padding to Account for Fixed Header */}
      <div className="flex-1 pt-[130px] pb-8 relative z-10">
        {children}
      </div>
    </div>
  );
}
