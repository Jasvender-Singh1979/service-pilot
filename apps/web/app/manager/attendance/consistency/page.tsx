'use client';

import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import ManagerLayout from '@/app/components/ManagerLayout';
import { useEffect, useState } from 'react';
import { toast } from '@/lib/toast';
import Link from 'next/link';

interface ConsistencyFlag {
  engineer_id: string;
  engineer_name: string;
  flag_type: string;
  severity: 'warning' | 'critical';
  description: string;
  details?: {
    checked_in_since?: string;
    open_call_id?: string;
    open_call_count?: number;
  };
}

interface ConsistencyCheckResponse {
  flags: ConsistencyFlag[];
  total_issues: number;
  critical_count: number;
  warning_count: number;
}

function ConsistencyCheckContent() {
  const { user } = useAuth();
  const [data, setData] = useState<ConsistencyCheckResponse>({
    flags: [],
    total_issues: 0,
    critical_count: 0,
    warning_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchConsistencyChecks();

    if (autoRefresh) {
      const interval = setInterval(fetchConsistencyChecks, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchConsistencyChecks = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ''}/api/attendance/consistency-check`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch consistency checks: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error fetching consistency checks:', errorMessage);
      toast.error('Failed to load consistency checks');
    } finally {
      setLoading(false);
    }
  };

  const getFlagIcon = (flagType: string) => {
    switch (flagType) {
      case 'checked_in_no_work':
        return 'ph-person-check';
      case 'work_without_checkin':
        return 'ph-warning';
      case 'checked_out_with_open_calls':
        return 'ph-warning';
      default:
        return 'ph-question';
    }
  };

  const groupedFlags = data.flags.reduce(
    (acc: { critical: ConsistencyFlag[]; warning: ConsistencyFlag[] }, flag) => {
      if (flag.severity === 'critical') {
        acc.critical.push(flag);
      } else {
        acc.warning.push(flag);
      }
      return acc;
    },
    { critical: [], warning: [] }
  );

  if (loading) {
    return (
      <div className="flex-1 pb-8">
        <div className="px-6 pt-6 mb-8">
          <div className="h-32 bg-gradient-to-br from-red-200 to-red-300 rounded-[24px] animate-pulse"></div>
        </div>
        <div className="px-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-[16px] animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 pb-8">
      <div className="px-6 pt-6 mb-8">
        <div className="mb-3 p-6 bg-gradient-to-br from-red-500 to-red-600 rounded-[24px] text-white shadow-[0_8px_28px_rgba(220,38,38,0.25)] border border-red-500 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <h2 className="text-[11px] font-black mb-4 opacity-95 uppercase tracking-wider">Consistency Checks</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-3xl font-black mb-1 tracking-tighter">{data.total_issues}</div>
                  <div className="text-[11px] font-bold opacity-90 uppercase tracking-wider">Total Issues</div>
                </div>
                <div>
                  <div className="text-3xl font-black mb-1 tracking-tighter">{data.critical_count}</div>
                  <div className="text-[11px] font-bold opacity-90 uppercase tracking-wider">Critical</div>
                </div>
              </div>
            </div>
            <div className="text-5xl opacity-30">⚠️</div>
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-3 bg-white rounded-[12px] border border-slate-100">
          <label className="text-sm font-bold text-slate-900 flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            Auto-refresh (every 30s)
          </label>
          <button
            onClick={fetchConsistencyChecks}
            className="px-3 py-2 bg-blue-500 text-white text-xs font-bold rounded-[8px] hover:bg-blue-600 transition-all"
          >
            <i className="ph ph-arrow-clockwise mr-1"></i> Refresh
          </button>
        </div>
      </div>

      {groupedFlags.critical.length > 0 && (
        <div className="px-6 mb-8">
          <h3 className="text-xs font-black text-red-700 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-600 rounded-full"></span>
            Critical ({groupedFlags.critical.length})
          </h3>
          <div className="space-y-3">
            {groupedFlags.critical.map((flag, idx) => (
              <div
                key={`${flag.engineer_id}-${idx}`}
                className="p-4 bg-red-50 rounded-[16px] border-2 border-red-200 shadow-[0_2px_12px_rgba(220,38,38,0.1)]"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-red-100 rounded-[10px] text-red-600 flex-shrink-0">
                    <i className={`ph-fill ${getFlagIcon(flag.flag_type)} text-lg`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-red-900 text-sm">{flag.engineer_name}</h4>
                    <p className="text-xs text-red-700 mt-1">{flag.description}</p>
                    {flag.details?.open_call_id && (
                      <p className="text-xs text-red-600 font-mono mt-1">Call ID: {flag.details.open_call_id}</p>
                    )}
                  </div>
                  <Link
                    href={`/manager/attendance?engineer_id=${flag.engineer_id}`}
                    className="px-3 py-2 bg-red-500 text-white text-xs font-bold rounded-[8px] hover:bg-red-600 transition-all flex-shrink-0"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {groupedFlags.warning.length > 0 && (
        <div className="px-6 mb-8">
          <h3 className="text-xs font-black text-yellow-700 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-600 rounded-full"></span>
            Warnings ({groupedFlags.warning.length})
          </h3>
          <div className="space-y-3">
            {groupedFlags.warning.map((flag, idx) => (
              <div
                key={`${flag.engineer_id}-${idx}`}
                className="p-4 bg-yellow-50 rounded-[16px] border border-yellow-200 shadow-[0_2px_12px_rgba(180,83,9,0.1)]"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-yellow-100 rounded-[10px] text-yellow-600 flex-shrink-0">
                    <i className={`ph-fill ${getFlagIcon(flag.flag_type)} text-lg`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-yellow-900 text-sm">{flag.engineer_name}</h4>
                    <p className="text-xs text-yellow-700 mt-1">{flag.description}</p>
                    {flag.details?.open_call_count && (
                      <p className="text-xs text-yellow-600 font-bold mt-1">{flag.details.open_call_count} open calls</p>
                    )}
                  </div>
                  <Link
                    href={`/manager/attendance?engineer_id=${flag.engineer_id}`}
                    className="px-3 py-2 bg-yellow-500 text-white text-xs font-bold rounded-[8px] hover:bg-yellow-600 transition-all flex-shrink-0"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.total_issues === 0 && (
        <div className="px-6">
          <div className="p-8 bg-gradient-to-br from-green-50 to-green-100 rounded-[24px] border-2 border-green-200 text-center">
            <div className="text-4xl mb-3">✓</div>
            <h3 className="font-bold text-green-900 text-lg mb-1">All Clear!</h3>
            <p className="text-sm text-green-700">No attendance consistency issues detected</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConsistencyCheck() {
  return (
    <ProtectedRoute allowedRoles={['manager', 'super_admin']}>
      <ManagerLayout>
        <ConsistencyCheckContent />
      </ManagerLayout>
    </ProtectedRoute>
  );
}
