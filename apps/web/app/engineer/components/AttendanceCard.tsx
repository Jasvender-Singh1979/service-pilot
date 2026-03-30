'use client';

import { useEffect, useState } from 'react';
import { toast } from '@/lib/toast';
import { format } from 'date-fns';

interface AttendanceRecord {
  id: string;
  status: 'not_checked_in' | 'checked_in' | 'checked_out';
  checkInTime: string | null;
  checkOutTime: string | null;
  attendanceDate: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AttendanceCard() {
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/attendance/today`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch attendance: ${response.status}`);
      }

      const data = await response.json();
      setAttendance(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error fetching attendance:', errorMessage);
      // Default to not checked in if error
      setAttendance({
        id: '',
        status: 'not_checked_in',
        checkInTime: null,
        checkOutTime: null,
        attendanceDate: new Date().toISOString().split('T')[0],
        notes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      setActionLoading(true);
      const response = await fetch(
        `/api/attendance/check-in`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Check-in failed: ${response.status}`);
      }

      const data = await response.json();
      setAttendance(data.attendance);
      toast.success('Checked in successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Check-in error:', errorMessage);
      toast.error(errorMessage || 'Failed to check in');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setActionLoading(true);
      const response = await fetch(
        `/api/attendance/check-out`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Check-out failed: ${response.status}`);
      }

      const data = await response.json();
      setAttendance(data.attendance);
      toast.success('Checked out successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Check-out error:', errorMessage);
      toast.error(errorMessage || 'Failed to check out');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusDisplay = () => {
    if (!attendance) return 'Not Checked In';
    switch (attendance.status) {
      case 'checked_in':
        return 'Checked In';
      case 'checked_out':
        return 'Checked Out';
      default:
        return 'Not Checked In';
    }
  };

  const getStatusColor = () => {
    if (!attendance) return 'text-slate-600';
    switch (attendance.status) {
      case 'checked_in':
        return 'text-green-600';
      case 'checked_out':
        return 'text-blue-600';
      default:
        return 'text-slate-600';
    }
  };

  const getStatusBgColor = () => {
    if (!attendance) return 'bg-slate-100';
    switch (attendance.status) {
      case 'checked_in':
        return 'bg-green-100';
      case 'checked_out':
        return 'bg-blue-100';
      default:
        return 'bg-slate-100';
    }
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    try {
      return format(new Date(isoString), 'hh:mm a');
    } catch {
      return '--:--';
    }
  };

  if (loading) {
    return (
      <div className="px-6 mb-8">
        <div className="h-40 bg-gray-200 rounded-[24px] animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="px-6 mb-8">
      <div className="p-6 bg-white rounded-[24px] border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white">
            <i className="ph-fill ph-map-pin text-lg"></i>
          </div>
          <h3 className="text-sm font-bold text-slate-900">Attendance</h3>
        </div>

        {/* Status Display */}
        <div className="mb-6">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-[12px] ${getStatusBgColor()} mb-3`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${getStatusColor()}`}>
              {getStatusDisplay()}
            </span>
          </div>

          {/* Time Info */}
          <div className="space-y-2">
            {attendance?.checkInTime && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 font-medium">Check In:</span>
                <span className="text-sm font-bold text-slate-900">{formatTime(attendance.checkInTime)}</span>
              </div>
            )}
            {attendance?.checkOutTime && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 font-medium">Check Out:</span>
                <span className="text-sm font-bold text-slate-900">{formatTime(attendance.checkOutTime)}</span>
              </div>
            )}
            {!attendance?.checkInTime && (
              <div className="text-xs text-slate-500">No check-in yet today</div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={
            attendance?.status === 'not_checked_in'
              ? handleCheckIn
              : attendance?.status === 'checked_in'
                ? handleCheckOut
                : undefined
          }
          disabled={attendance?.status === 'checked_out' || actionLoading}
          className={`w-full py-3 px-4 rounded-[14px] font-bold text-sm transition-all active:scale-95 ${
            attendance?.status === 'not_checked_in'
              ? 'bg-green-500 text-white hover:bg-green-600 disabled:opacity-50'
              : attendance?.status === 'checked_in'
                ? 'bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50'
                : 'bg-slate-200 text-slate-500 cursor-not-allowed'
          } ${actionLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {actionLoading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin"></div>
              <span>Processing...</span>
            </div>
          ) : attendance?.status === 'not_checked_in' ? (
            <div className="flex items-center justify-center gap-2">
              <i className="ph-fill ph-sign-in text-lg"></i>
              <span>Check In</span>
            </div>
          ) : attendance?.status === 'checked_in' ? (
            <div className="flex items-center justify-center gap-2">
              <i className="ph-fill ph-sign-out text-lg"></i>
              <span>Check Out</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <i className="ph-fill ph-check-circle text-lg"></i>
              <span>Completed</span>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
