'use client';

import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import ManagerLayout from '@/app/components/ManagerLayout';
import { useEffect, useState } from 'react';
import { toast } from '@/lib/toast';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { formatDuration, formatLocation } from '@/lib/formatters';

interface EngineerAttendance {
  id: string;
  name: string;
  email: string;
  mobile_number: string;
  attendance_status: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  worked_duration_minutes: number | null;
  check_in_latitude: number | null;
  check_in_longitude: number | null;
  check_in_address: string | null;
  check_out_latitude: number | null;
  check_out_longitude: number | null;
  check_out_address: string | null;
  last_activity_time: string | null;
  completion_status: string | null;
  assigned_calls_count: number;
  attendance_date?: string;
}

interface Summary {
  checked_in_count: number;
  checked_out_count: number;
  not_checked_in_count: number;
  total_engineers: number;
}

function AttendanceDashboardContent() {
  const { user } = useAuth();
  const [engineers, setEngineers] = useState<EngineerAttendance[]>([]);
  const [summary, setSummary] = useState<Summary>({
    checked_in_count: 0,
    checked_out_count: 0,
    not_checked_in_count: 0,
    total_engineers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedEngineer, setSelectedEngineer] = useState<EngineerAttendance | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchAttendanceDashboard();
  }, []);

  const fetchAttendanceDashboard = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ''}/api/attendance/manager-dashboard`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch attendance dashboard: ${response.status}`);
      }

      const data = await response.json();
      setEngineers(data.engineers || []);
      setSummary(data.summary);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error fetching attendance dashboard:', errorMessage);
      toast.error('Failed to load attendance dashboard');
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



  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'checked_in':
        return 'bg-green-100 text-green-700';
      case 'checked_out':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'checked_in':
        return 'Checked In';
      case 'checked_out':
        return 'Checked Out';
      default:
        return 'Not Checked In';
    }
  };

  if (loading) {
    return (
      <div className="flex-1 pb-8">
        <div className="px-6 pt-6 mb-8">
          <div className="h-32 bg-gradient-to-br from-blue-200 to-blue-300 rounded-[24px] animate-pulse"></div>
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
        <div className="mb-3 p-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-[24px] text-white shadow-[0_8px_28px_rgba(37,99,235,0.25)] border border-blue-500 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h2 className="text-[11px] font-black opacity-95 uppercase tracking-wider">Team Attendance</h2>
            <div className="flex items-center gap-2">
              <Link
                href="/manager/attendance/settings"
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-[8px] text-xs font-bold transition-colors flex items-center gap-1"
              >
                <i className="ph-fill ph-gear text-sm"></i>
                <span>Settings</span>
              </Link>
              <Link
                href="/manager/attendance/named-locations"
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-[8px] text-xs font-bold transition-colors flex items-center gap-1"
              >
                <i className="ph-fill ph-map-pin text-sm"></i>
                <span>Locations</span>
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 relative z-10">
            <div>
              <div className="text-3xl font-black mb-1 tracking-tighter">{summary.checked_in_count}</div>
              <div className="text-[11px] font-bold opacity-90 uppercase tracking-wider">Checked In</div>
            </div>
            <div>
              <div className="text-3xl font-black mb-1 tracking-tighter">{summary.checked_out_count}</div>
              <div className="text-[11px] font-bold opacity-90 uppercase tracking-wider">Checked Out</div>
            </div>
            <div>
              <div className="text-3xl font-black mb-1 tracking-tighter">{summary.not_checked_in_count}</div>
              <div className="text-[11px] font-bold opacity-90 uppercase tracking-wider">Not Checked In</div>
            </div>
            <div>
              <div className="text-3xl font-black mb-1 tracking-tighter">{summary.total_engineers}</div>
              <div className="text-[11px] font-bold opacity-90 uppercase tracking-wider">Total Engineers</div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 mb-8">
        <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-4">Engineers Status</h3>
        <div className="space-y-3">
          {engineers.length === 0 ? (
            <div className="p-6 bg-white rounded-[16px] border border-slate-100 text-center">
              <p className="text-sm text-slate-600">No engineers assigned</p>
            </div>
          ) : (
            engineers.map((engineer) => (
              <button
                key={engineer.id}
                onClick={() => {
                  setSelectedEngineer(engineer);
                  setShowDetails(true);
                }}
                className="w-full p-4 bg-white rounded-[16px] border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)] transition-all active:scale-95 text-left"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{engineer.name}</h4>
                    <p className="text-xs text-slate-600 mt-1">{engineer.email}</p>
                  </div>
                  <span className={`px-3 py-1.5 rounded-[10px] text-xs font-bold uppercase tracking-wider ${getStatusColor(engineer.attendance_status)}`}>
                    {getStatusLabel(engineer.attendance_status)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-600 font-medium">Check In:</span>
                    <p className="font-bold text-slate-900 mt-1">{formatTime(engineer.check_in_time)}</p>
                  </div>
                  <div>
                    <span className="text-slate-600 font-medium">Duration:</span>
                    <p className="font-bold text-slate-900 mt-1">{formatDuration(engineer.worked_duration_minutes)}</p>
                  </div>
                </div>

                {engineer.assigned_calls_count > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <span className="text-slate-600 text-xs font-medium">Active Calls: </span>
                    <span className="font-bold text-blue-600">{engineer.assigned_calls_count}</span>
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {showDetails && selectedEngineer && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end">
          <div className="w-full bg-white rounded-t-[24px] p-6 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black text-slate-900">{selectedEngineer.name}</h2>
              <button
                onClick={() => setShowDetails(false)}
                className="p-2 text-slate-400 hover:text-slate-600"
              >
                <i className="ph-fill ph-x text-xl"></i>
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Contact</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <i className="ph ph-envelope text-slate-400"></i>
                    <span className="text-sm text-slate-700">{selectedEngineer.email}</span>
                  </div>
                  {selectedEngineer.mobile_number && (
                    <div className="flex items-center gap-3">
                      <i className="ph ph-phone text-slate-400"></i>
                      <span className="text-sm text-slate-700">{selectedEngineer.mobile_number}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Today's Attendance</h3>
                <div className="p-4 bg-slate-50 rounded-[14px] border border-slate-200 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-600">Status:</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${getStatusColor(selectedEngineer.attendance_status)}`}>
                      {getStatusLabel(selectedEngineer.attendance_status)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-600">Check In:</span>
                    <span className="text-xs font-bold text-slate-900">{formatTime(selectedEngineer.check_in_time)}</span>
                  </div>
                  {selectedEngineer.check_out_time && (
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-600">Check Out:</span>
                      <span className="text-xs font-bold text-slate-900">{formatTime(selectedEngineer.check_out_time)}</span>
                    </div>
                  )}
                  {selectedEngineer.worked_duration_minutes && (
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-600">Duration:</span>
                      <span className="text-xs font-bold text-slate-900">{formatDuration(selectedEngineer.worked_duration_minutes)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Locations</h3>
                <div className="space-y-3">
                  {/* Check-in Location */}
                  <div className="p-4 bg-slate-50 rounded-[14px] border border-slate-200">
                    <div className="text-xs font-bold text-slate-600 mb-2">Check-in Location</div>
                    {selectedEngineer.check_in_latitude || selectedEngineer.check_in_longitude || selectedEngineer.check_in_address ? (
                      <>
                        <div className="text-xs text-slate-700 font-mono">
                          {formatLocation(
                            selectedEngineer.check_in_latitude,
                            selectedEngineer.check_in_longitude,
                            selectedEngineer.check_in_address
                          )}
                        </div>
                        {Number.isFinite(Number(selectedEngineer.check_in_latitude)) &&
                          Number.isFinite(Number(selectedEngineer.check_in_longitude)) && (
                            <a
                              href={`https://maps.google.com/?q=${selectedEngineer.check_in_latitude},${selectedEngineer.check_in_longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 font-bold mt-2 inline-block hover:underline"
                            >
                              Open in Google Maps →
                            </a>
                          )}
                      </>
                    ) : (
                      <div className="text-xs text-slate-600 italic">Location unavailable</div>
                    )}
                  </div>

                  {/* Check-out Location */}
                  <div className="p-4 bg-slate-50 rounded-[14px] border border-slate-200">
                    <div className="text-xs font-bold text-slate-600 mb-2">Check-out Location</div>
                    {selectedEngineer.check_out_time ? (
                      selectedEngineer.check_out_latitude ||
                      selectedEngineer.check_out_longitude ||
                      selectedEngineer.check_out_address ? (
                        <>
                          <div className="text-xs text-slate-700 font-mono">
                            {formatLocation(
                              selectedEngineer.check_out_latitude,
                              selectedEngineer.check_out_longitude,
                              selectedEngineer.check_out_address
                            )}
                          </div>
                          {Number.isFinite(Number(selectedEngineer.check_out_latitude)) &&
                            Number.isFinite(Number(selectedEngineer.check_out_longitude)) && (
                              <a
                                href={`https://maps.google.com/?q=${selectedEngineer.check_out_latitude},${selectedEngineer.check_out_longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 font-bold mt-2 inline-block hover:underline"
                              >
                                Open in Google Maps →
                              </a>
                            )}
                        </>
                      ) : (
                        <div className="text-xs text-slate-600 italic">Location unavailable</div>
                      )
                    ) : (
                      <div className="text-xs text-slate-600 italic">Not checked out yet</div>
                    )}
                  </div>
                </div>
              </div>

              {selectedEngineer.assigned_calls_count > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Active Calls</h3>
                  <div className="p-4 bg-blue-50 rounded-[14px] border border-blue-200">
                    <p className="text-2xl font-black text-blue-600">{selectedEngineer.assigned_calls_count}</p>
                    <p className="text-xs text-blue-600 font-bold mt-1">Currently assigned</p>
                  </div>
                </div>
              )}

              <Link
                href={`/manager/attendance/report?engineer_id=${selectedEngineer.id}`}
                onClick={() => setShowDetails(false)}
                className="w-full py-3 px-4 bg-blue-500 text-white rounded-[14px] font-bold text-sm text-center hover:bg-blue-600 transition-all active:scale-95"
              >
                View Full Report
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AttendanceDashboard() {
  return (
    <ProtectedRoute allowedRoles={['manager', 'super_admin']}>
      <ManagerLayout>
        <AttendanceDashboardContent />
      </ManagerLayout>
    </ProtectedRoute>
  );
}
