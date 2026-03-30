'use client';

import { useEffect, useState } from 'react';

interface TeamAttendanceData {
  engineerId: string;
  engineerName: string;
  engineerEmail: string;
  engineerMobile: string;
  status: 'checked_in' | 'checked_out' | 'not_checked_in';
  checkInTime: string | null;
  checkOutTime: string | null;
  notes: string | null;
}

interface TeamAttendanceResponse {
  date: string;
  summary: {
    total: number;
    checkedIn: number;
    checkedOut: number;
    notCheckedIn: number;
  };
  team: TeamAttendanceData[];
}

export default function TeamAttendanceWidget() {
  const [data, setData] = useState<TeamAttendanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTeamAttendance();
  }, []);

  const fetchTeamAttendance = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/attendance/team`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch team attendance: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error fetching team attendance:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '-';
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '-';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'checked_in':
        return 'text-green-600';
      case 'checked_out':
        return 'text-blue-600';
      case 'not_checked_in':
        return 'text-amber-600';
      default:
        return 'text-slate-600';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'checked_in':
        return 'bg-green-50';
      case 'checked_out':
        return 'bg-blue-50';
      case 'not_checked_in':
        return 'bg-amber-50';
      default:
        return 'bg-slate-50';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'checked_in':
        return 'Checked In';
      case 'checked_out':
        return 'Checked Out';
      case 'not_checked_in':
        return 'Not Checked In';
      default:
        return 'Unknown';
    }
  };

  // Loading state
  if (loading) {
    return (
      <section className="space-y-4">
        <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.15em] px-1 pt-2">
          Team Attendance
        </h2>
        <div className="bg-white rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-slate-100 animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-4 gap-2 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-[16px]"></div>
            ))}
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-[16px]"></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <section className="space-y-4">
        <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.15em] px-1 pt-2">
          Team Attendance
        </h2>
        <div className="bg-red-50 rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-red-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-[14px] flex items-center justify-center flex-shrink-0">
            <i className="ph-fill ph-warning text-lg text-red-600"></i>
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Failed to Load Attendance</h3>
            <p className="text-xs text-slate-600 mt-0.5">Unable to fetch team attendance data</p>
          </div>
        </div>
      </section>
    );
  }

  // Empty state
  if (!data || !data.team || data.team.length === 0) {
    return (
      <section className="space-y-4">
        <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.15em] px-1 pt-2">
          Team Attendance
        </h2>
        <div className="bg-slate-50 rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-200 rounded-[14px] flex items-center justify-center">
            <i className="ph-fill ph-info text-lg text-slate-600"></i>
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">No Engineers</h3>
            <p className="text-xs text-slate-600 mt-0.5">No team members to display attendance</p>
          </div>
        </div>
      </section>
    );
  }

  const summary = data.summary;

  return (
    <section className="space-y-4">
      <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.15em] px-1 pt-2">
        Team Attendance
      </h2>

      {/* Summary Pills */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-slate-50 rounded-[16px] p-3 shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-slate-100 flex flex-col items-center gap-1">
          <span className="text-xl font-black text-slate-900">{summary.total}</span>
          <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider text-center">
            Total
          </span>
        </div>

        <div className="bg-green-50 rounded-[16px] p-3 shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-green-100 flex flex-col items-center gap-1">
          <span className="text-xl font-black text-green-600">{summary.checkedIn}</span>
          <span className="text-[9px] font-bold text-green-700 uppercase tracking-wider text-center">
            Checked In
          </span>
        </div>

        <div className="bg-blue-50 rounded-[16px] p-3 shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-blue-100 flex flex-col items-center gap-1">
          <span className="text-xl font-black text-blue-600">{summary.checkedOut}</span>
          <span className="text-[9px] font-bold text-blue-700 uppercase tracking-wider text-center">
            Checked Out
          </span>
        </div>

        <div className="bg-amber-50 rounded-[16px] p-3 shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-amber-100 flex flex-col items-center gap-1">
          <span className="text-xl font-black text-amber-600">{summary.notCheckedIn}</span>
          <span className="text-[9px] font-bold text-amber-700 uppercase tracking-wider text-center">
            Not Checked
          </span>
        </div>
      </div>

      {/* Team List */}
      <div className="space-y-2">
        {data.team.slice(0, 5).map((engineer) => (
          <div
            key={engineer.engineerId}
            className={`${getStatusBgColor(
              engineer.status
            )} rounded-[20px] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] border ${
              engineer.status === 'checked_in'
                ? 'border-green-100'
                : engineer.status === 'checked_out'
                ? 'border-blue-100'
                : 'border-amber-100'
            } flex items-center justify-between gap-3`}
          >
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-slate-900 text-sm truncate">
                {engineer.engineerName}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${getStatusColor(engineer.status)}`}>
                  {getStatusLabel(engineer.status)}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1 text-right flex-shrink-0">
              {engineer.checkInTime && (
                <span className="text-[10px] text-slate-600">
                  In: <span className="font-semibold">{formatTime(engineer.checkInTime)}</span>
                </span>
              )}
              {engineer.checkOutTime && (
                <span className="text-[10px] text-slate-600">
                  Out: <span className="font-semibold">{formatTime(engineer.checkOutTime)}</span>
                </span>
              )}
              {!engineer.checkInTime && !engineer.checkOutTime && (
                <span className="text-[10px] text-slate-500 italic">No activity</span>
              )}
            </div>
          </div>
        ))}

        {/* Show "and more" if there are more than 5 engineers */}
        {data.team.length > 5 && (
          <div className="text-center py-2">
            <p className="text-xs text-slate-600 font-medium">
              +{data.team.length - 5} more engineer{data.team.length - 5 !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
