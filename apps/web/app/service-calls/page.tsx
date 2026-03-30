'use client';

import { useRouter } from 'next/navigation';
import BottomNav from '@/app/components/BottomNav';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function ServiceCallsPage() {
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
      <h1 className="text-2xl font-black tracking-tight text-slate-900 leading-none mb-1">Service Calls</h1>
      <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Manage & Dispatch</p>
    </div>
    <button className="relative w-12 h-12 bg-blue-600 rounded-[18px] shadow-[0_8px_20px_rgba(37,99,235,0.3)] flex items-center justify-center text-white active:scale-95 transition-transform">
      <i className="ph-bold ph-plus text-xl"></i>
    </button>
  </header>

  {/* Search & Filters */}
  <div className="px-6 mt-4 relative z-10 space-y-4">
    {/* Search Bar */}
    <div className="relative flex items-center w-full h-12 bg-white rounded-[18px] border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
      <i className="ph ph-magnifying-glass text-slate-400 text-lg ml-4 absolute left-0"></i>
      <input type="text" placeholder="Search ID, location, or tech..." className="w-full h-full bg-transparent pl-11 pr-4 text-[13px] font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-medium outline-none" />
      <button className="absolute right-2 w-8 h-8 flex items-center justify-center text-slate-400 bg-slate-50 rounded-[10px]">
        <i className="ph-fill ph-faders"></i>
      </button>
    </div>

    {/* Filter Pills */}
    <div className="w-full overflow-x-auto no-scrollbar pb-2 -mx-6 px-6">
      <div className="flex items-center gap-2.5 w-max">
        <button className="px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-[12px] shadow-sm">
          All Active
        </button>
        <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded-[12px] shadow-sm flex items-center gap-1.5 active:bg-slate-50">
          <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span> Unassigned
        </button>
        <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded-[12px] shadow-sm flex items-center gap-1.5 active:bg-slate-50">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> En Route
        </button>
        <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded-[12px] shadow-sm flex items-center gap-1.5 active:bg-slate-50">
          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span> On Site
        </button>
      </div>
    </div>
  </div>

  {/* Main Call List Content */}
  <main className="w-full px-6 mt-2 pb-[130px] relative z-10">
    
    {/* Empty State */}
    <div className="bg-white rounded-[32px] p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-slate-100 mt-16">
      <div className="w-16 h-16 bg-slate-100 rounded-[20px] flex items-center justify-center mx-auto mb-4">
        <i className="ph-fill ph-phone-slash text-[32px] text-slate-400"></i>
      </div>
      <h3 className="text-xl font-black text-slate-900 mb-2 text-center">No Service Calls Yet</h3>
      <p className="text-sm font-medium text-slate-500 text-center mb-6">
        Service calls will appear here once they are created. Use the + button above to create your first call.
      </p>
    </div>

  </main>

  {/* Attached Bottom Navigation */}
        </div>
      <BottomNav />
      </ProtectedRoute>
    );
}
