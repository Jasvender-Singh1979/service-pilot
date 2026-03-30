'use client';

import { useRouter } from 'next/navigation';
import BottomNav from '@/app/components/BottomNav';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function TaskDetailsPage() {
  const router = useRouter();

    return (
      <ProtectedRoute>
        <div className="bg-[#F8F9FB] text-slate-900 pt-[55px] overflow-x-hidden relative min-h-screen pb-20">
          {/* Ambient Depth Elements */}
  <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none bg-noise mix-blend-multiply"></div>
  <div className="fixed top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none z-0"></div>

  {/* App Header */}
  <header className="w-full px-6 pb-2 flex justify-between items-center relative z-10">
    <button onClick={() => router.push('/service-calls')} className="w-11 h-11 bg-white rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-center justify-center border border-slate-100 active:scale-95 transition-transform">
      <i className="ph-bold ph-arrow-left text-[20px] text-slate-700"></i>
    </button>
    <div className="flex flex-col items-center justify-center">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Task Details</span>
      <h1 className="text-xl font-black tracking-tight text-slate-900 leading-none">CALL-9038</h1>
    </div>
    <button className="w-11 h-11 bg-white rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-center justify-center border border-slate-100 active:scale-95 transition-transform">
      <i className="ph-bold ph-dots-three text-[24px] text-slate-700"></i>
    </button>
  </header>

  {/* Main Content */}
  <main className="w-full px-6 mt-6 pb-[140px] relative z-10">
    
    {/* Empty State */}
    <div className="bg-white rounded-[32px] p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-slate-100 mt-16">
      <div className="w-16 h-16 bg-slate-100 rounded-[20px] flex items-center justify-center mx-auto mb-4">
        <i className="ph-fill ph-clipboard-text text-[32px] text-slate-400"></i>
      </div>
      <h3 className="text-xl font-black text-slate-900 mb-2 text-center">No Task Selected</h3>
      <p className="text-sm font-medium text-slate-500 text-center mb-6">
        Select a service call from the list to view its details, media, and timeline.
      </p>
      <button 
        onClick={() => router.push('/service-calls')}
        className="w-full h-12 bg-slate-900 text-white rounded-[18px] flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-transform"
      >
        <i className="ph-bold ph-list text-lg"></i>
        <span className="text-[13px] font-black uppercase tracking-widest">View Service Calls</span>
      </button>
    </div>

  </main>

  {/* Attached Bottom Navigation */}
        </div>
      <BottomNav />
      </ProtectedRoute>
    );
}
