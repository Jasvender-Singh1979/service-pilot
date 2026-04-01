'use client';

import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import ManagerLayout from '@/app/components/ManagerLayout';
import { useEffect, useState } from 'react';
import { toast } from '@/lib/toast';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';

interface NamedLocation {
  id: string;
  latitude: number;
  longitude: number;
  location_name: string;
  created_at: string;
  updated_at: string;
}

interface FrequentLocation {
  latitude: number;
  longitude: number;
  count: number;
  first_seen: string;
  last_seen: string;
  addresses: string | null;
}

function NamedLocationsContent() {
  const { user } = useAuth();
  const [namedLocations, setNamedLocations] = useState<NamedLocation[]>([]);
  const [frequentLocations, setFrequentLocations] = useState<FrequentLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    latitude: '',
    longitude: '',
    location_name: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const locationsRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ''}/api/attendance/named-locations`,
        { credentials: 'include' }
      );
      if (locationsRes.ok) {
        const locations = await locationsRes.json();
        setNamedLocations(locations || []);
      }

      const frequentRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ''}/api/attendance/frequent-locations`,
        { credentials: 'include' }
      );
      if (frequentRes.ok) {
        const frequent = await frequentRes.json();
        setFrequentLocations(frequent || []);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error fetching data:', errorMessage);
      toast.error('Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  const handleAddClick = (lat?: number, lng?: number) => {
    setEditingId(null);
    setFormData({
      latitude: lat ? String(lat) : '',
      longitude: lng ? String(lng) : '',
      location_name: '',
    });
    setShowAddForm(true);
  };

  const handleEditClick = (location: NamedLocation) => {
    setEditingId(location.id);
    setFormData({
      latitude: String(location.latitude),
      longitude: String(location.longitude),
      location_name: location.location_name,
    });
    setShowAddForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.location_name.trim()) {
      toast.error('Location name is required');
      return;
    }

    const lat = Number(formData.latitude);
    const lng = Number(formData.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      toast.error('Invalid latitude or longitude');
      return;
    }

    try {
      let url = `${process.env.NEXT_PUBLIC_API_URL || ''}/api/attendance/named-locations`;
      let method = 'POST';

      if (editingId) {
        url += `/${editingId}`;
        method = 'PUT';
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
          location_name: formData.location_name,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save location');
      }

      toast.success(editingId ? 'Location updated' : 'Location added');
      setShowAddForm(false);
      fetchData();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || 'Failed to save location');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this location?')) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ''}/api/attendance/named-locations/${id}`,
        { method: 'DELETE', credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error('Failed to delete location');
      }

      toast.success('Location deleted');
      fetchData();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || 'Failed to delete location');
    }
  };

  return (
    <div className="flex-1 pb-8">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-slate-900">Named Locations</h2>
          <Link
            href="/manager/attendance"
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <i className="ph-fill ph-x text-xl"></i>
          </Link>
        </div>
        <p className="text-xs text-slate-600 mb-4">
          Create friendly names for frequently captured attendance locations
        </p>
        <button
          onClick={() => handleAddClick()}
          className="w-full py-2 px-4 bg-blue-500 text-white rounded-[10px] font-bold text-sm hover:bg-blue-600 transition-all active:scale-95"
        >
          <div className="flex items-center justify-center gap-2">
            <i className="ph-fill ph-plus text-lg"></i>
            <span>Add Location</span>
          </div>
        </button>
      </div>

      <div className="px-6 py-6 space-y-8">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
            Saved Locations ({namedLocations.length})
          </h3>
          {namedLocations.length === 0 ? (
            <div className="p-6 bg-slate-50 rounded-[16px] border border-slate-200 text-center">
              <p className="text-sm text-slate-600">No named locations yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {namedLocations.map((location) => {
                const latNum = Number(location.latitude);
                const lngNum = Number(location.longitude);
                const safeLat = Number.isFinite(latNum) ? latNum.toFixed(6) : 'N/A';
                const safeLng = Number.isFinite(lngNum) ? lngNum.toFixed(6) : 'N/A';
                const canOpenMaps = Number.isFinite(latNum) && Number.isFinite(lngNum);

                return (
                  <div
                    key={location.id}
                    className="p-4 bg-white rounded-[16px] border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{location.location_name}</h4>
                        <p className="text-xs text-slate-600 mt-1 font-mono">
                          {safeLat}, {safeLng}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditClick(location)}
                          className="p-2 text-blue-500 hover:bg-blue-50 rounded-[8px] transition-colors"
                        >
                          <i className="ph-fill ph-pencil text-lg"></i>
                        </button>
                        <button
                          onClick={() => handleDelete(location.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-[8px] transition-colors"
                        >
                          <i className="ph-fill ph-trash text-lg"></i>
                        </button>
                      </div>
                    </div>
                    {canOpenMaps && (
                      <a
                        href={`https://maps.google.com/?q=${latNum},${lngNum}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 font-bold hover:underline"
                      >
                        View on Maps →
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {frequentLocations.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
              Frequently Captured Locations
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Click &quot;Add Location&quot; to create a friendly name
            </p>
            <div className="space-y-3">
              {frequentLocations.map((location, idx) => {
                const latNum = Number(location.latitude);
                const lngNum = Number(location.longitude);
                const safeLat = Number.isFinite(latNum) ? latNum.toFixed(6) : 'N/A';
                const safeLng = Number.isFinite(lngNum) ? lngNum.toFixed(6) : 'N/A';
                const canAdd = Number.isFinite(latNum) && Number.isFinite(lngNum);

                return (
                  <div
                    key={idx}
                    className="p-4 bg-slate-50 rounded-[16px] border border-slate-200"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-bold text-slate-900 text-sm font-mono">
                          {safeLat}, {safeLng}
                        </div>
                        {location.addresses && (
                          <p className="text-xs text-slate-600 mt-1">{location.addresses}</p>
                        )}
                        <div className="flex gap-4 mt-2 text-[10px] text-slate-600">
                          <span>Captured: {location.count}x</span>
                          <span>Last: {format(parseISO(location.last_seen), 'MMM d')}</span>
                        </div>
                      </div>
                      {canAdd && (
                        <button
                          onClick={() => handleAddClick(latNum, lngNum)}
                          className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-[8px] text-xs font-bold hover:bg-blue-200 transition-colors"
                        >
                          Add Name
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end">
          <div className="w-full bg-white rounded-t-[24px] p-6 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black text-slate-900">
                {editingId ? 'Edit Location' : 'Add Location'}
              </h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-2 text-slate-400 hover:text-slate-600"
              >
                <i className="ph-fill ph-x text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
                  Location Name
                </label>
                <input
                  type="text"
                  value={formData.location_name}
                  onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                  placeholder="e.g., Megahertz Technologies"
                  className="w-full px-4 py-3 border border-slate-200 rounded-[12px] text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    placeholder="29.950273"
                    className="w-full px-4 py-3 border border-slate-200 rounded-[12px] text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    placeholder="77.546927"
                    className="w-full px-4 py-3 border border-slate-200 rounded-[12px] text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 bg-blue-500 text-white rounded-[14px] font-bold text-sm hover:bg-blue-600 transition-all active:scale-95"
              >
                {editingId ? 'Update Location' : 'Add Location'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NamedLocations() {
  return (
    <ProtectedRoute allowedRoles={['manager', 'super_admin']}>
      <ManagerLayout>
        <NamedLocationsContent />
      </ManagerLayout>
    </ProtectedRoute>
  );
}
