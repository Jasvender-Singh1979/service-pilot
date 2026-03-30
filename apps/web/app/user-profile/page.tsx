'use client';

import { useRouter } from 'next/navigation';
import BottomNav from '@/app/components/BottomNav';
import ProtectedRoute from '@/components/ProtectedRoute';
import useAuth from '@/hooks/useAuth';

export default function UserProfilePage() {
  const router = useRouter();
  const { signOut } = useAuth();

    return (
      <ProtectedRoute>
        <div className="bg-[#F8F9FB] text-slate-900 pt-[55px] overflow-x-hidden relative min-h-screen pb-20">
          {/* Ambient Depth Elements */}
  <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none bg-noise mix-blend-multiply"></div>
  <div className="fixed top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none z-0"></div>

  {/* App Header */}
  <header className="w-full px-6 pb-2 flex justify-between items-center relative z-10">
    <div className="flex flex-col justify-center">
      <h1 className="text-2xl font-black tracking-tight text-slate-900 leading-none mb-1">Profile</h1>
      <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Account & Preferences</p>
    </div>
    <button className="w-11 h-11 bg-white rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-center justify-center border border-slate-100 active:scale-95 transition-transform" onClick={() => router.push('/settings')}>
      <i className="ph-bold ph-gear text-[22px] text-slate-700"></i>
    </button>
  </header>

  {/* Main Content */}
  <main className="w-full px-6 mt-6 pb-[140px] space-y-7 relative z-10">
    
    {/* Hero Profile Card */}
    <section>
      <div className="bg-white rounded-[28px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-slate-100 relative overflow-hidden">
        {/* Edge Indicator */}
        <div className="absolute left-0 top-0 bottom-0 w-[6px] bg-slate-900"></div>
        
        {/* Profile Info */}
        <div className="flex items-center gap-5 mb-6 pl-1.5">
          <div className="relative">
            <div className="w-20 h-20 rounded-[22px] border-[3px] border-white shadow-md bg-slate-200 flex items-center justify-center">
              <i className="ph-fill ph-user text-[40px] text-slate-400"></i>
            </div>
            <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-600 text-white rounded-[10px] flex items-center justify-center shadow-md active:scale-95 transition-transform border-2 border-white">
              <i className="ph-bold ph-pencil-simple text-[14px]"></i>
            </button>
          </div>
          <div className="flex flex-col">
            <span className="inline-flex w-max items-center px-2 py-1 rounded-[6px] bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-widest mb-1.5 border border-blue-100/50">
              Account
            </span>
            <h2 className="font-black text-slate-900 text-2xl leading-none mb-1 tracking-tight">User Profile</h2>
          </div>
        </div>
      </div>
    </section>

    {/* Personal Info Details */}
    <section>
      <h3 className="text-[13px] font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-slate-300"></span> Contact Details
      </h3>
      <div className="bg-white rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-slate-100 overflow-hidden p-2">
        
        {/* Profile Module Coming Soon */}
        <div className="p-6 bg-slate-50 rounded-[18px] text-center">
          <i className="ph-fill ph-user-circle text-[40px] text-slate-400 mb-2"></i>
          <p className="text-sm font-bold text-slate-600">Profile information module not configured yet</p>
        </div>

      </div>
    </section>

    {/* Preferences */}
    <section>
      <h3 className="text-[13px] font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-slate-300"></span> App Preferences
      </h3>
      <div className="bg-white rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-slate-100 overflow-hidden p-2">
        
        {/* Push Notifications Toggle */}
        <div className="flex items-center justify-between p-4 bg-transparent border-b border-slate-50">
          <div className="flex items-center gap-3">
            <i className="ph-fill ph-bell-ringing text-[20px] text-slate-500"></i>
            <span className="text-[14px] font-bold text-slate-900">Push Notifications</span>
          </div>
          {/* Tailwind custom toggle */}
          <label className="flex items-center cursor-pointer relative">
            <input type="checkbox" className="sr-only toggle-checkbox" defaultChecked readOnly />
            <div className="toggle-label block w-12 h-6.5 bg-blue-600 rounded-full transition-colors duration-300 relative flex items-center shadow-inner">
              <div className="dot absolute left-[2px] bg-white w-[22px] h-[22px] rounded-full transition-transform duration-300 translate-x-[22px] shadow-sm"></div>
            </div>
          </label>
        </div>

        {/* Location Services Toggle */}
        <div className="flex items-center justify-between p-4 bg-transparent border-b border-slate-50">
          <div className="flex items-center gap-3">
            <i className="ph-fill ph-navigation-arrow text-[20px] text-slate-500"></i>
            <span className="text-[14px] font-bold text-slate-900">Live GPS Tracking</span>
          </div>
          {/* Tailwind custom toggle */}
          <label className="flex items-center cursor-pointer relative">
            <input type="checkbox" className="sr-only toggle-checkbox" defaultChecked readOnly />
            <div className="toggle-label block w-12 h-6.5 bg-blue-600 rounded-full transition-colors duration-300 relative flex items-center shadow-inner">
              <div className="dot absolute left-[2px] bg-white w-[22px] h-[22px] rounded-full transition-transform duration-300 translate-x-[22px] shadow-sm"></div>
            </div>
          </label>
        </div>

        {/* Offline Mode */}
        <div className="flex items-center justify-between p-4 bg-transparent">
          <div className="flex items-center gap-3">
             <i className="ph-fill ph-cloud-slash text-[20px] text-slate-500"></i>
             <div className="flex flex-col">
              <span className="text-[14px] font-bold text-slate-900 leading-tight">Offline Mode</span>
              <span className="text-[11px] font-bold text-slate-400">Syncs data when back online</span>
            </div>
          </div>
          {/* Tailwind custom toggle */}
          <label className="flex items-center cursor-pointer relative">
            <input type="checkbox" className="sr-only toggle-checkbox" defaultChecked={false} readOnly />
            <div className="toggle-label block w-12 h-6.5 bg-slate-200 rounded-full transition-colors duration-300 relative flex items-center shadow-inner">
              <div className="dot absolute left-[2px] bg-white w-[22px] h-[22px] rounded-full transition-transform duration-300 shadow-sm"></div>
            </div>
          </label>
        </div>

      </div>
    </section>

    {/* Sign Out Button */}
    <button 
      onClick={async () => {
        await signOut();
        router.push('/login');
      }}
      className="w-full h-[52px] bg-rose-50 text-rose-600 border border-rose-100 rounded-[20px] flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-transform"
    >
      <i className="ph-bold ph-sign-out text-lg"></i>
      <span className="text-[13px] font-black uppercase tracking-widest">Sign Out Securely</span>
    </button>

  </main>

  {/* Attached Bottom Navigation */}
        </div>
      <BottomNav />
      </ProtectedRoute>
    );
}
