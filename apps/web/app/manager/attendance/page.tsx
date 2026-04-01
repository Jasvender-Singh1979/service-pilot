'use client';

import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import ManagerLayout from '@/app/components/ManagerLayout';
import { useEffect, useState } from 'react';
import { toast } from '@/lib/toast';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { formatLocation } from '@/lib/formatters';

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

  const getStatusBadgeColor = (status: string | null) => {
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
    if (!status) return 'Awaited';
    switch (status) {
      case 'checked_in':
        return 'Checked In';
      case 'checked_out':
        return 'Checked Out';
      default:
        return 'Awaited';
    }
  };

  const getTimingBadgeColor = (checkInTime: string | null, checkOutTime: string | null) => {
    if (!checkInTime) return null;
    // For now, show badge only if we have timing data
    return 'bg-amber-100 text-amber-700';
  };

  const getTimingLabel = (checkInTime: string | null) => {
    if (!checkInTime) return null;
    // Simplified: would need cutoff time from API for accurate determination
    return 'On Time';
  };

  const presentEngineersCount = engineers.filter(e => 
    e.attendance_status === 'checked_in' || e.attendance_status === 'checked_out'
  ).length;

  if (loading) {
    return (
      <div className="flex-1 pb-8">
        <div className="px-4 pt-6 mb-6">
          <div className="h-32 bg-gradient-to-br from-slate-200 to-slate-300 rounded-[20px] animate-pulse"></div>
        </div>
        <div className="px-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-200 rounded-[16px] animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 pb-8">
      {/* TOP SUMMARY */}
      <div className="px-4 pt-6 mb-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-[16px] border border-blue-200">
            <div className="text-xs text-blue-600 font-bold uppercase tracking-wide mb-1">Total Engineers</div>
            <div className="text-3xl font-black text-blue-700">{summary.total_engineers}</div>
          </div>
          <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-[16px] border border-green-200">
            <div className="text-xs text-green-600 font-bold uppercase tracking-wide mb-1">Present</div>
            <div className="text-3xl font-black text-green-700">{presentEngineersCount}</div>
          </div>
          <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-[16px] border border-amber-200">
            <div className="text-xs text-amber-600 font-bold uppercase tracking-wide mb-1">Late</div>
            <div className="text-3xl font-black text-amber-700">0</div>
          </div>
        </div>
      </div>

      {/* TOP ACTIONS */}
      <div className="px-4 mb-6 flex gap-2">
        <Link
          href="/manager/attendance/settings"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-[14px] hover:bg-slate-50 active:scale-95 transition-all"
        >
          <i className="ph-fill ph-gear text-slate-600 text-lg"></i>
          <span className="text-xs font-bold text-slate-700 uppercase">Cutoff Time</span>
        </Link>
        <Link
          href="/manager/attendance/named-locations"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-[14px] hover:bg-slate-50 active:scale-95 transition-all"
        >
          <i className="ph-fill ph-map-pin text-slate-600 text-lg"></i>
          <span className="text-xs font-bold text-slate-700 uppercase">Locations</span>
        </Link>
      </div>

      {/* ENGINEER CARDS */}
      <div className="px-4 mb-8">
        <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3">Engineers</h3>
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
                className="w-full p-4 bg-white rounded-[16px] border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all active:scale-95 text-left"
              >
                {/* NAME & EMAIL */}
                <div className="mb-3">
                  <h4 className="font-bold text-slate-900 text-sm">{engineer.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{engineer.email}</p>
                </div>

                {/* CHECK-IN TIME + LOCATION + MAP */}
                {engineer.check_in_time ? (
                  <div className="mb-3 pb-3 border-b border-slate-200">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="text-[11px] text-slate-600 font-medium">Check In</div>
                      <span className="text-xs font-bold text-slate-900">{formatTime(engineer.check_in_time)}</span>
                    </div>
                    {engineer.check_in_address || engineer.check_in_latitude || engineer.check_in_longitude ? (
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[11px] text-slate-500">
                          {formatLocation(engineer.check_in_latitude, engineer.check_in_longitude, engineer.check_in_address)}
                        </span>
                        {Number.isFinite(Number(engineer.check_in_latitude)) && Number.isFinite(Number(engineer.check_in_longitude)) && (
                          <a
                            href={`https://maps.google.com/?q=${engineer.check_in_latitude},${engineer.check_in_longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-blue-600 font-bold shrink-0 hover:underline"
                          >
                            Map
                          </a>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {/* CHECK-OUT TIME + LOCATION + MAP */}
                {engineer.check_out_time ? (
                  <div className="mb-3 pb-3 border-b border-slate-200">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="text-[11px] text-slate-600 font-medium">Check Out</div>
                      <span className="text-xs font-bold text-slate-900">{formatTime(engineer.check_out_time)}</span>
                    </div>
                    {engineer.check_out_address || engineer.check_out_latitude || engineer.check_out_longitude ? (
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[11px] text-slate-500">
                          {formatLocation(engineer.check_out_latitude, engineer.check_out_longitude, engineer.check_out_address)}
                        </span>
                        {Number.isFinite(Number(engineer.check_out_latitude)) && Number.isFinite(Number(engineer.check_out_longitude)) && (
                          <a
                            href={`https://maps.google.com/?q=${engineer.check_out_latitude},${engineer.check_out_longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-blue-600 font-bold shrink-0 hover:underline"
                          >
                            Map
                          </a>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {/* STATUS & TIMING BADGES */}
                <div className="flex flex-wrap gap-2">
                  <span className={`px-2.5 py-1 rounded-[8px] text-[11px] font-bold uppercase tracking-wider ${getStatusBadgeColor(engineer.attendance_status)}`}>
                    {getStatusLabel(engineer.attendance_status)}
                  </span>
                  {getTimingLabel(engineer.check_in_time) && (
                    <span className={`px-2.5 py-1 rounded-[8px] text-[11px] font-bold uppercase tracking-wider ${getTimingBadgeColor(engineer.check_in_time, engineer.check_out_time)}`}>
                      {getTimingLabel(engineer.check_in_time)}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* DETAILS MODAL */}
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
                    <span className={`text-xs font-bold px-2 py-1 rounded ${getStatusBadgeColor(selectedEngineer.attendance_status)}`}>
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
                  {selectedEngineer.worked_duration_minutes !== null && (
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-600">Duration:</span>
                      <span className="text-xs font-bold text-slate-900">
                        {Math.floor(selectedEngineer.worked_duration_minutes / 60)}h {selectedEngineer.worked_duration_minutes % 60}m
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Locations</h3>
                <div className="space-y-3">
                  {/* Check-in Location */}
                  <div className="p-4 bg-slate-50 rounded-[14px] border border-slate-200">
                    <div className="text-xs font-bold text-slate-600 mb-2">Check-in</div>
                    {selectedEngineer.check_in_latitude || selectedEngineer.check_in_longitude || selectedEngineer.check_in_address ? (
                      <>
                        <div className="text-xs text-slate-700 mb-2">
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
                              className="text-xs text-blue-600 font-bold inline-block hover:underline"
                            >
                              Open in Maps →
                            </a>
                          )}
                      </>
                    ) : (
                      <div className="text-xs text-slate-600 italic">Location unavailable</div>
                    )}
                  </div>

                  {/* Check-out Location */}
                  <div className="p-4 bg-slate-50 rounded-[14px] border border-slate-200">
                    <div className="text-xs font-bold text-slate-600 mb-2">Check-out</div>
                    {selectedEngineer.check_out_time ? (
                      selectedEngineer.check_out_latitude ||
                      selectedEngineer.check_out_longitude ||
                      selectedEngineer.check_out_address ? (
                        <>
                          <div className="text-xs text-slate-700 mb-2">
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
                                className="text-xs text-blue-600 font-bold inline-block hover:underline"
                              >
                                Open in Maps →
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
