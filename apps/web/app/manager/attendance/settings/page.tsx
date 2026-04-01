'use client';

import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import ManagerLayout from '@/app/components/ManagerLayout';
import { useEffect, useState } from 'react';
import { toast } from '@/lib/toast';
import Link from 'next/link';

function AttendanceSettingsContent() {
  const { user } = useAuth();
  const [cutoffTime, setCutoffTime] = useState('09:00');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ''}/api/attendance/cutoff-time`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.cutoff_time) {
          setCutoffTime(data.cutoff_time);
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ''}/api/attendance/cutoff-time`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ cutoff_time: cutoffTime }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to save settings: ${response.status}`);
      }

      toast.success('Check-in cutoff time updated successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error saving settings:', errorMessage);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 pb-8 px-6 pt-6">
        <div className="h-40 bg-gray-200 rounded-[16px] animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 pb-8">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900">Attendance Settings</h2>
          <Link
            href="/manager/attendance"
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <i className="ph-fill ph-x text-xl"></i>
          </Link>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="max-w-md">
          <div className="mb-6 p-6 bg-white rounded-[16px] border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
              <i className="ph-fill ph-clock text-lg mr-2"></i>
              Check-in Cutoff Time
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Engineers checking in on or before this time will be marked as "On Time". Those checking in after will be marked as "Late".
            </p>
            <p className="text-xs text-slate-500 mb-4">
              Time is in 24-hour format (IST timezone)
            </p>

            <input
              type="time"
              value={cutoffTime}
              onChange={(e) => setCutoffTime(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-[12px] text-sm font-bold mb-4"
            />

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 px-4 bg-blue-500 text-white rounded-[12px] font-bold text-sm hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50"
            >
              {saving ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <i className="ph-fill ph-check text-lg"></i>
                  <span>Save Cutoff Time</span>
                </div>
              )}
            </button>
          </div>

          <div className="p-4 bg-blue-50 rounded-[12px] border border-blue-200">
            <p className="text-xs text-blue-700 font-bold">
              <i className="ph-fill ph-info text-sm mr-2"></i>
              This setting applies to all engineers in your team. The cutoff time will be used to determine who checks in on time vs late in attendance reports.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AttendanceSettings() {
  return (
    <ProtectedRoute allowedRoles={['manager', 'super_admin']}>
      <ManagerLayout>
        <AttendanceSettingsContent />
      </ManagerLayout>
    </ProtectedRoute>
  );
}
