'use client';

import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import ManagerLayout from '@/app/components/ManagerLayout';
import { useEffect, useState } from 'react';
import { toast } from '@/lib/toast';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { formatLocationAsync } from '@/lib/formatters';
import { getTodayIST } from '@/lib/dateUtils';

interface EngineerInfo {
  id: string;
  name: string;
  email: string;
  mobile_number: string;
}

interface AttendanceRecord {
  attendance_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  check_in_latitude: number | null;
  check_in_longitude: number | null;
  check_in_address: string | null;
  check_out_latitude: number | null;
  check_out_longitude: number | null;
  check_out_address: string | null;
  worked_duration_minutes: number | null;
  attendance_status: string;
  status: string; // "Present", "Absent", "Invalid"
  timeliness: string | null; // "on_time", "late", or null
}

interface Summary {
  total_days: number;
  present_count: number;
  absent_count: number;
  invalid_count?: number;
  on_time_count: number;
  late_count: number;
  total_worked_minutes?: number;
}

interface ResolvedLocation {
  [key: string]: string;
}

/**
 * Helper: Get an IST date string (YYYY-MM-DD) for N days ago
 * Uses IST timezone to ensure dates match attendance_date column in database
 */
function getISTDateNDaysAgo(daysAgo: number): string {
  // Get today's IST date, then subtract N days
  const today = getTodayIST(); // Returns YYYY-MM-DD in IST
  const [todayYear, todayMonth, todayDay] = today.split('-').map(Number);
  
  // Create a Date object representing today in UTC
  const dateObj = new Date(Date.UTC(todayYear, todayMonth - 1, todayDay, 0, 0, 0));
  // Subtract N days
  dateObj.setDate(dateObj.getDate() - daysAgo);
  
  const resultYear = dateObj.getUTCFullYear();
  const resultMonth = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
  const resultDay = String(dateObj.getUTCDate()).padStart(2, '0');
  
  return `${resultYear}-${resultMonth}-${resultDay}`;
}

function AttendanceReportContent() {
  const { user } = useAuth();
  const [engineers, setEngineers] = useState<any[]>([]);
  const [selectedEngineerId, setSelectedEngineerId] = useState<string>('');
  // CRITICAL FIX: Initialize dates using IST, not browser local time
  // This ensures dates match the IST-based attendance_date column
  const [startDate, setStartDate] = useState(() => getISTDateNDaysAgo(30));
  const [endDate, setEndDate] = useState(() => getTodayIST());

  const [engineer, setEngineer] = useState<EngineerInfo | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [resolvedLocations, setResolvedLocations] = useState<ResolvedLocation>({});

  // Fetch engineers on load
  useEffect(() => {
    fetchEngineers();
  }, []);

  // Fetch report when engineer or dates change
  useEffect(() => {
    if (selectedEngineerId) {
      fetchReport();
    }
  }, [selectedEngineerId, startDate, endDate]);

  const fetchEngineers = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ''}/api/engineers`,
        { credentials: 'include' }
      );
      if (response.ok) {
        const data = await response.json();
        setEngineers(data || []);
        if (data.length > 0) {
          setSelectedEngineerId(data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch engineers:', error);
    }
  };

  const fetchReport = async () => {
    if (!selectedEngineerId) return;

    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ''}/api/attendance/report?engineer_id=${selectedEngineerId}&start_date=${startDate}&end_date=${endDate}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch report: ${response.status}`);
      }

      const data = await response.json();
      setEngineer(data.engineer);
      setRecords(data.records);
      setSummary(data.summary);
      
      // Resolve locations asynchronously
      resolveLocations(data.records);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error fetching report:', errorMessage);
      toast.error('Failed to load attendance report');
    } finally {
      setLoading(false);
    }
  };

  const resolveLocations = async (attendanceRecords: AttendanceRecord[]) => {
    const locations: ResolvedLocation = {};
    
    for (const record of attendanceRecords) {
      // Resolve check-in location
      if (record.check_in_latitude && record.check_in_longitude) {
        const checkInKey = `checkin-${record.attendance_date}`;
        locations[checkInKey] = await formatLocationAsync(
          record.check_in_latitude,
          record.check_in_longitude,
          record.check_in_address
        );
      }
      
      // Resolve check-out location
      if (record.check_out_time && record.check_out_latitude && record.check_out_longitude) {
        const checkOutKey = `checkout-${record.attendance_date}`;
        locations[checkOutKey] = await formatLocationAsync(
          record.check_out_latitude,
          record.check_out_longitude,
          record.check_out_address
        );
      }
    }
    
    setResolvedLocations(locations);
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



  const generatePDF = async () => {
    if (!engineer || !records || !summary) {
      toast.error('No data to export');
      return;
    }

    try {
      setGeneratingPDF(true);

      // Get business info from user
      const businessResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ''}/api/business`,
        { credentials: 'include' }
      );
      const businessData = await businessResponse.ok
        ? await businessResponse.json()
        : { name: 'Business' };
      const businessName = businessData.name || 'Company';

      // Create canvas from HTML
      const element = document.getElementById('pdf-content');
      if (!element) throw new Error('PDF content not found');

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      const imgWidth = 210 - 20; // A4 width - margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= 277; // A4 height - margins

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= 277;
      }

      pdf.save(`${engineer.name}.pdf`);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('PDF generation error:', errorMessage);
      toast.error('Failed to generate PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <div className="flex-1 pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-slate-900">Attendance Report</h2>
          <Link
            href="/manager/attendance"
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <i className="ph-fill ph-x text-xl"></i>
          </Link>
        </div>

        {/* Filters */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
              Engineer
            </label>
            <select
              value={selectedEngineerId}
              onChange={(e) => setSelectedEngineerId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-[10px] text-sm bg-white"
            >
              {engineers.map((eng) => (
                <option key={eng.id} value={eng.id}>
                  {eng.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
                From
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-[10px] text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
                To
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-[10px] text-sm"
              />
            </div>
          </div>

          {records.length > 0 && (
            <button
              onClick={generatePDF}
              disabled={generatingPDF}
              className="w-full py-2 px-4 bg-blue-500 text-white rounded-[10px] font-bold text-sm hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50"
            >
              {generatingPDF ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                  <span>Generating PDF...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <i className="ph-fill ph-download text-lg"></i>
                  <span>Download PDF</span>
                </div>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Content for PDF */}
      <div id="pdf-content" className="px-6 py-6 bg-white">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-[16px] animate-pulse"></div>
            ))}
          </div>
        ) : engineer && summary ? (
          <>
            {/* PDF Header (visible on page and in PDF) */}
            <div className="mb-8 pb-6 border-b-2 border-slate-200">
              <h1 className="text-2xl font-black text-slate-900 mb-1">Attendance Report</h1>
              <p className="text-sm text-slate-600 mb-4">
                {engineer.name} ({engineer.email})
              </p>
              <div className="text-xs text-slate-600">
                <p>
                  <strong>Period:</strong> {formatDate(startDate)} to {formatDate(endDate)}
                </p>
                <p>
                  <strong>Generated:</strong> {format(new Date(), 'MMM d, yyyy hh:mm a')}
                </p>
              </div>
            </div>

            {/* Summary */}
            {summary && (
              <div className="mb-8">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
                  Summary
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-slate-50 rounded-[10px] border border-slate-200">
                    <div className="text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                      Total Days
                    </div>
                    <div className="text-2xl font-black text-slate-900">
                      {summary.total_days}
                    </div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-[10px] border border-green-200">
                    <div className="text-xs font-bold text-green-600 mb-1 uppercase tracking-wider">
                      Present
                    </div>
                    <div className="text-2xl font-black text-green-600">
                      {summary.present_count}
                    </div>
                  </div>
                  <div className="p-4 bg-red-50 rounded-[10px] border border-red-200">
                    <div className="text-xs font-bold text-red-600 mb-1 uppercase tracking-wider">
                      Absent
                    </div>
                    <div className="text-2xl font-black text-red-600">
                      {summary.absent_count}
                    </div>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-[10px] border border-emerald-200">
                    <div className="text-xs font-bold text-emerald-600 mb-1 uppercase tracking-wider">
                      On Time
                    </div>
                    <div className="text-2xl font-black text-emerald-600">
                      {summary.on_time_count}
                    </div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-[10px] border border-orange-200">
                    <div className="text-xs font-bold text-orange-600 mb-1 uppercase tracking-wider">
                      Late
                    </div>
                    <div className="text-2xl font-black text-orange-600">
                      {summary.late_count}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Daily Records Cards */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
                Daily Records
              </h3>
              {records.length === 0 ? (
                <div className="p-6 bg-slate-50 rounded-[10px] border border-slate-200 text-center">
                  <p className="text-sm text-slate-600">No attendance records found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {records.map((record) => {
                    const checkInKey = `checkin-${record.attendance_date}`;
                    const checkOutKey = `checkout-${record.attendance_date}`;
                    const checkInLoc = resolvedLocations[checkInKey] || 'Resolving...';
                    const checkOutLoc = resolvedLocations[checkOutKey] || 'Resolving...';
                    
                    return (
                      <div key={record.attendance_date} className="p-4 bg-white rounded-[10px] border border-slate-200 space-y-3">
                        {/* Date */}
                        <div className="font-bold text-slate-900">
                          {formatDate(record.attendance_date)}
                        </div>
                        
                        {/* Check In */}
                        <div className="text-sm space-y-1">
                          <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">Check In</div>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-bold text-slate-900">{formatTime(record.check_in_time)}</div>
                              <div className="text-xs text-slate-600 mt-1">{checkInLoc}</div>
                            </div>
                            {record.check_in_latitude && record.check_in_longitude && (
                              <a
                                href={`https://maps.google.com/?q=${record.check_in_latitude},${record.check_in_longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-blue-500 hover:text-blue-600 transition-colors"
                                title="Open in Google Maps"
                              >
                                <i className="ph-fill ph-map-pin text-lg"></i>
                              </a>
                            )}
                          </div>
                        </div>
                        
                        {/* Check Out */}
                        {record.check_out_time && (
                          <div className="text-sm space-y-1 pt-2 border-t border-slate-200">
                            <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">Check Out</div>
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="font-bold text-slate-900">{formatTime(record.check_out_time)}</div>
                                <div className="text-xs text-slate-600 mt-1">{checkOutLoc}</div>
                              </div>
                              {record.check_out_latitude && record.check_out_longitude && (
                                <a
                                  href={`https://maps.google.com/?q=${record.check_out_latitude},${record.check_out_longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 text-blue-500 hover:text-blue-600 transition-colors"
                                  title="Open in Google Maps"
                                >
                                  <i className="ph-fill ph-map-pin text-lg"></i>
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Status & Timing */}
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                          <span
                            className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                              record.status === "Present"
                                ? "bg-green-100 text-green-700"
                                : record.status === "Absent"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {record.status}
                          </span>
                          {record.timeliness && (
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                              record.timeliness === "on_time"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-orange-100 text-orange-700"
                            }`}>
                              {record.timeliness === "on_time" ? "On Time" : "Late"}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-6 bg-slate-50 rounded-[10px] border border-slate-200 text-center">
            <p className="text-sm text-slate-600">
              {selectedEngineerId ? 'Loading report...' : 'Select an engineer to view report'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AttendanceReport() {
  return (
    <ProtectedRoute allowedRoles={['manager', 'super_admin']}>
      <ManagerLayout>
        <AttendanceReportContent />
      </ManagerLayout>
    </ProtectedRoute>
  );
}
