'use client';

import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import ManagerLayout from '@/app/components/ManagerLayout';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { toast } from '@/lib/toast';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';

interface AttendanceRecord {
  attendance_date: string;
  engineer_user_id: string;
  check_in_time: string | null;
  check_out_time: string | null;
  worked_duration_minutes: number | null;
  attendance_status: string;
  missed_checkout: boolean;
  status: string;
}

interface Summary {
  total_days: number;
  complete_days: number;
  incomplete_days: number;
  missed_checkout_count: number;
  total_worked_hours: number;
  average_daily_hours: number;
}

function AttendanceHistoryContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const engineer_id = searchParams.get('engineer_id');

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (engineer_id) {
      fetchHistory();
    }
  }, [engineer_id, fromDate, toDate]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ''}/api/attendance/daily-summary?engineer_id=${engineer_id}&from_date=${fromDate}&to_date=${toDate}`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch history: ${response.status}`);
      }

      const data = await response.json();
      setRecords(data.records || []);
      setSummary(data.summary);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error fetching history:', errorMessage);
      toast.error('Failed to load attendance history');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    try {
      return format(parseISO(isoString), 'hh:mm a');
    } catch {
      return '--:--';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '--';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'bg-green-100 text-green-700';
      case 'incomplete':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="flex-1 pb-8">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-slate-900">Attendance History</h2>
          <Link
            href="/manager/attendance"
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <i className="ph-fill ph-x text-xl"></i>
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-[10px] text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-[10px] text-sm"
            />
          </div>
        </div>
      </div>

      {summary && !loading && (
        <div className="px-6 py-6">
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-4">Summary</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-white rounded-[16px] border border-slate-100">
              <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">Total Days</div>
              <div className="text-2xl font-black text-slate-900">{summary.total_days}</div>
            </div>
            <div className="p-4 bg-white rounded-[16px] border border-slate-100">
              <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">Complete</div>
              <div className="text-2xl font-black text-green-600">{summary.complete_days}</div>
            </div>
            <div className="p-4 bg-white rounded-[16px] border border-slate-100">
              <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">Total Hours</div>
              <div className="text-2xl font-black text-blue-600">{summary.total_worked_hours.toFixed(1)}h</div>
            </div>
            <div className="p-4 bg-white rounded-[16px] border border-slate-100">
              <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">Avg/Day</div>
              <div className="text-2xl font-black text-blue-600">{summary.average_daily_hours.toFixed(1)}h</div>
            </div>
          </div>

          {summary.missed_checkout_count > 0 && (
            <div className="mt-3 p-4 bg-red-50 rounded-[16px] border border-red-200">
              <div className="text-xs text-red-700 font-bold">⚠️ {summary.missed_checkout_count} day(s) with missed checkout</div>
            </div>
          )}
        </div>
      )}

      <div className="px-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-[16px] animate-pulse"></div>
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="p-6 bg-white rounded-[16px] border border-slate-100 text-center">
            <p className="text-sm text-slate-600">No attendance records found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map((record) => (
              <div
                key={record.attendance_date}
                className="p-4 bg-white rounded-[16px] border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{formatDate(record.attendance_date)}</h4>
                  </div>
                  <span className={`px-3 py-1 rounded-[8px] text-xs font-bold uppercase tracking-wider ${getStatusColor(record.attendance_status)}`}>
                    {record.attendance_status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-600 font-medium block mb-1">Check In</span>
                    <span className="font-bold text-slate-900">{formatTime(record.check_in_time)}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 font-medium block mb-1">Check Out</span>
                    <span className="font-bold text-slate-900">{formatTime(record.check_out_time)}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 font-medium block mb-1">Duration</span>
                    <span className="font-bold text-slate-900">{formatDuration(record.worked_duration_minutes)}</span>
                  </div>
                </div>

                {record.missed_checkout && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <span className="text-xs text-red-600 font-bold">⚠️ Missed checkout</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AttendanceHistory() {
  return (
    <ProtectedRoute allowedRoles={['manager', 'super_admin']}>
      <ManagerLayout>
        <Suspense fallback={<div className="px-6 pt-6 h-screen bg-gray-100">Loading...</div>}>
          <AttendanceHistoryContent />
        </Suspense>
      </ManagerLayout>
    </ProtectedRoute>
  );
}
