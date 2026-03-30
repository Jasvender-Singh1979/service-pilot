'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  // Hide bottom nav for engineers and managers
  if (user && (pathname.includes('/engineer') || pathname.includes('/manager'))) {
    return null;
  }

  const isActive = (path: string) => pathname === path;

  // Handle Home button click - route to appropriate dashboard
  const handleHomeClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      const userResponse = await fetch(`/api/user/by-email?email=${encodeURIComponent(user.email)}`);
      const userData = await userResponse.json();
      
      if (userData.role === 'super_admin') {
        router.push('/super-admin');
      } else if (userData.role === 'manager') {
        router.push('/manager');
      } else if (userData.role === 'engineer') {
        router.push('/engineer');
      }
    } catch (error) {
      console.error('Error routing to home:', error);
      router.push('/login');
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 w-full z-50">
      <div className="w-full bg-white/90 backdrop-blur-xl border-t border-slate-200 pb-[max(25px,env(safe-area-inset-bottom))] pt-2 relative shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
        <div className="flex items-end justify-around w-full px-2">
          
          {/* 1. Dashboard (Home) */}
          <button onClick={handleHomeClick} className="flex flex-col items-center gap-1.5 w-[68px] relative">
            {(isActive('/super-admin') || isActive('/manager') || isActive('/engineer')) && (
              <div className="absolute -top-1 w-6 h-1 bg-blue-600 rounded-full"></div>
            )}
            <i className={`ph-fill ph-squares-four text-[26px] ${(isActive('/super-admin') || isActive('/manager') || isActive('/engineer')) ? 'text-blue-600' : 'text-slate-400'}`}></i>
            <span className={`text-[10px] font-bold ${(isActive('/super-admin') || isActive('/manager') || isActive('/engineer')) ? 'text-blue-600' : 'text-slate-500'}`}>Home</span>
          </button>
          
          {/* 2. Tasks */}
          <Link href="/task-details" className="flex flex-col items-center gap-1.5 w-[68px]">
            {isActive('/task-details') && (
              <div className="absolute -top-1 w-6 h-1 bg-blue-600 rounded-full"></div>
            )}
            <i className={`${isActive('/task-details') ? 'ph-fill' : 'ph'} ph-clipboard-text text-[26px] ${isActive('/task-details') ? 'text-blue-600' : 'text-slate-400'}`}></i>
            <span className={`text-[10px] font-bold ${isActive('/task-details') ? 'text-blue-600' : 'text-slate-500'}`}>Tasks</span>
          </Link>
          
          {/* 3. Service Calls (Primary Center Action) */}
          <div className="w-[72px] flex flex-col items-center relative">
            <Link href="/service-calls" className="absolute -top-[48px] w-[60px] h-[60px] bg-blue-600 rounded-[22px] flex items-center justify-center text-white shadow-[0_12px_28px_rgba(37,99,235,0.4)] active:scale-95 active:shadow-[0_4px_12px_rgba(37,99,235,0.4)] transition-all duration-200">
              <i className="ph-fill ph-headset text-[28px]"></i>
            </Link>
            <span className="text-[10px] font-bold text-slate-500 mt-[26px]">Calls</span>
          </div>
          
          {/* 4. Profile */}
          <Link href="/user-profile" className="flex flex-col items-center gap-1.5 w-[68px]">
            {isActive('/user-profile') && (
              <div className="absolute -top-1 w-6 h-1 bg-blue-600 rounded-full"></div>
            )}
            <i className={`${isActive('/user-profile') ? 'ph-fill' : 'ph'} ph-user text-[26px] ${isActive('/user-profile') ? 'text-blue-600' : 'text-slate-400'}`}></i>
            <span className={`text-[10px] font-bold ${isActive('/user-profile') ? 'text-blue-600' : 'text-slate-500'}`}>Profile</span>
          </Link>
          
          {/* 5. Settings */}
          <Link href="/settings" className="flex flex-col items-center gap-1.5 w-[68px]">
            {isActive('/settings') && (
              <div className="absolute -top-1 w-6 h-1 bg-blue-600 rounded-full"></div>
            )}
            <i className={`${isActive('/settings') ? 'ph-fill' : 'ph'} ph-gear text-[26px] ${isActive('/settings') ? 'text-blue-600' : 'text-slate-400'}`}></i>
            <span className={`text-[10px] font-bold ${isActive('/settings') ? 'text-blue-600' : 'text-slate-500'}`}>Settings</span>
          </Link>
          
        </div>
      </div>
    </nav>
  );
}