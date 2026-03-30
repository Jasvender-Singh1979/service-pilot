'use client';

import { useRouter } from 'next/navigation';
import BottomNav from '@/app/components/BottomNav';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function SettingsPage() {
  const router = useRouter();

    return (
      <ProtectedRoute>
        <div className="bg-[#F8F9FB] text-slate-900 pt-[55px] overflow-x-hidden relative min-h-screen pb-20">
          {/* Ambient Depth Elements */}
  <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none bg-noise mix-blend-multiply"></div>
  <div className="fixed top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none z-0"></div>

  {/* App Header */}
  <header className="w-full px-6 pb-2 flex justify-between items-center relative z-10">
    <div className="flex flex-col justify-center">
      <h1 className="text-2xl font-black tracking-tight text-slate-900 leading-none mb-1">Settings</h1>
      <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">System Configuration</p>
    </div>
    <button className="w-11 h-11 bg-white rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-center justify-center border border-slate-100 active:scale-95 transition-transform" onClick={() => router.push('/user-profile')}>
      <i className="ph-bold ph-user text-[22px] text-slate-700"></i>
    </button>
  </header>

  {/* Main Content */}
  <main className="w-full px-6 mt-6 pb-[140px] space-y-7 relative z-10">
    
    {/* Business Info Card */}
    <section>
      <div className="bg-slate-900 rounded-[28px] p-6 shadow-xl relative overflow-hidden text-white">
        {/* Internal Glow */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/40 rounded-full blur-2xl pointer-events-none z-0"></div>
        
        <div className="flex items-center gap-4 mb-5 relative z-10 pl-1">
          <div className="w-12 h-12 bg-white/10 rounded-[16px] flex items-center justify-center border border-white/10 backdrop-blur-md">
            <i className="ph-fill ph-buildings text-2xl text-white"></i>
          </div>
          <div>
            <span className="inline-flex px-2 py-0.5 rounded-[6px] bg-blue-500/20 text-blue-300 text-[9px] font-black uppercase tracking-widest border border-blue-500/30 mb-1">
              Your Business
            </span>
            <h2 className="font-black text-[22px] leading-none tracking-tight">Business Name</h2>
          </div>
        </div>
      </div>
    </section>

    {/* Role & Team Management */}
    <section>
      <h3 className="text-[13px] font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-slate-300"></span> Organization Access
      </h3>
      <div className="bg-white rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-slate-100 overflow-hidden p-2">
        
        {/* Manage Roles */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-[18px] mb-2 active:bg-slate-100 transition-colors cursor-pointer">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 bg-white rounded-[14px] flex items-center justify-center border border-slate-100 text-slate-500 shadow-sm">
              <i className="ph-fill ph-users-three text-[20px]"></i>
            </div>
            <div>
              <p className="text-[14px] font-black text-slate-900 leading-none mb-0.5">Role Management</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Configure access levels & scopes</p>
            </div>
          </div>
          <i className="ph-bold ph-caret-right text-slate-300 mr-2"></i>
        </div>

        {/* Invite Members */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-[18px] mb-2 active:bg-slate-100 transition-colors cursor-pointer">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 bg-white rounded-[14px] flex items-center justify-center border border-slate-100 text-slate-500 shadow-sm">
              <i className="ph-fill ph-user-plus text-[20px]"></i>
            </div>
            <div>
              <p className="text-[14px] font-black text-slate-900 leading-none mb-0.5">Invite Members</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Add staff via email or link</p>
            </div>
          </div>
          <i className="ph-bold ph-caret-right text-slate-300 mr-2"></i>
        </div>

        {/* Territories */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-[18px] active:bg-slate-100 transition-colors cursor-pointer">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 bg-white rounded-[14px] flex items-center justify-center border border-slate-100 text-slate-500 shadow-sm">
              <i className="ph-fill ph-map-trifold text-[20px]"></i>
            </div>
            <div>
              <p className="text-[14px] font-black text-slate-900 leading-none mb-0.5">Service Territories</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Map geographic zones</p>
            </div>
          </div>
          <i className="ph-bold ph-caret-right text-slate-300 mr-2"></i>
        </div>

      </div>
    </section>

    {/* Global Configuration Toggles */}
    <section>
      <h3 className="text-[13px] font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-slate-300"></span> Service Policies
      </h3>
      <div className="bg-white rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-slate-100 overflow-hidden p-2">
        
        {/* Auto Dispatch Toggle */}
        <div className="flex items-center justify-between p-4 bg-transparent border-b border-slate-50">
          <div className="flex items-center gap-3">
            <i className="ph-fill ph-lightning text-[20px] text-blue-600"></i>
            <div className="flex flex-col">
              <span className="text-[14px] font-bold text-slate-900 leading-tight">Auto-Dispatch</span>
              <span className="text-[11px] font-medium text-slate-400">Route via closest tech AI</span>
            </div>
          </div>
          {/* Tailwind custom toggle */}
          <label className="flex items-center cursor-pointer relative">
            <input type="checkbox" className="sr-only toggle-checkbox" defaultChecked readOnly />
            <div className="toggle-label block w-12 h-6.5 bg-blue-600 rounded-full transition-colors duration-300 relative flex items-center shadow-inner">
              <div className="dot absolute left-[2px] bg-white w-[22px] h-[22px] rounded-full transition-transform duration-300 translate-x-[22px] shadow-sm"></div>
            </div>
          </label>
        </div>

        {/* Strict SLA Enforcement */}
        <div className="flex items-center justify-between p-4 bg-transparent border-b border-slate-50">
          <div className="flex items-center gap-3">
            <i className="ph-fill ph-clock-countdown text-[20px] text-amber-500"></i>
            <div className="flex flex-col">
              <span className="text-[14px] font-bold text-slate-900 leading-tight">Strict SLA Timers</span>
              <span className="text-[11px] font-medium text-slate-400">Alert managers on breach</span>
            </div>
          </div>
          {/* Tailwind custom toggle */}
          <label className="flex items-center cursor-pointer relative">
            <input type="checkbox" className="sr-only toggle-checkbox" defaultChecked readOnly />
            <div className="toggle-label block w-12 h-6.5 bg-blue-600 rounded-full transition-colors duration-300 relative flex items-center shadow-inner">
              <div className="dot absolute left-[2px] bg-white w-[22px] h-[22px] rounded-full transition-transform duration-300 translate-x-[22px] shadow-sm"></div>
            </div>
          </label>
        </div>

        {/* Require Photo Proof */}
        <div className="flex items-center justify-between p-4 bg-transparent">
          <div className="flex items-center gap-3">
             <i className="ph-fill ph-camera text-[20px] text-slate-500"></i>
             <div className="flex flex-col">
              <span className="text-[14px] font-bold text-slate-900 leading-tight">Require Completion Media</span>
              <span className="text-[11px] font-medium text-slate-400">Force photo upload to close</span>
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

  </main>

  {/* Attached Bottom Navigation */}
        </div>
      <BottomNav />
      </ProtectedRoute>
    );
}
