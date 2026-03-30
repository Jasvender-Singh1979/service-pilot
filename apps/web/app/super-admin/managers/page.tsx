'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { UserPlus, Edit2, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Manager {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export default function ManagersPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingManager, setEditingManager] = useState<Manager | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  // Single auth check on mount
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else {
        setHasCheckedAuth(true);
      }
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch managers only after auth is confirmed
  useEffect(() => {
    if (hasCheckedAuth && isAuthenticated) {
      fetchManagers();
    }
  }, [hasCheckedAuth, isAuthenticated]);

  const fetchManagers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/managers`);
      if (response.ok) {
        const data = await response.json();
        setManagers(data);
      } else if (response.status === 403) {
        router.push('/');
      }
    } catch (err) {
      console.error('Error fetching managers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (editingManager) {
        // Update manager
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/managers/${editingManager.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: formData.name,
              email: formData.email,
            }),
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update manager');
        }
      } else {
        // Create manager
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/managers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create manager');
        }
      }

      // Reset form and refresh list
      setFormData({ name: '', email: '', password: '' });
      setShowCreateForm(false);
      setEditingManager(null);
      fetchManagers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (manager: Manager) => {
    setEditingManager(manager);
    setFormData({
      name: manager.name,
      email: manager.email,
      password: '',
    });
    setShowCreateForm(true);
    setError('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this manager?')) {
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/managers/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete manager');
      }

      fetchManagers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingManager(null);
    setFormData({ name: '', email: '', password: '' });
    setError('');
  };

  // Show loading only if auth is still checking or we haven't confirmed auth yet
  if (authLoading || !hasCheckedAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header with safe area padding */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="px-4 py-4 flex items-center gap-3">
          <Link href="/super-admin">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Manage Managers</h1>
        </div>
      </div>

      <div className="p-4">
        {/* Create/Edit Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingManager ? 'Edit Manager' : 'Create New Manager'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              {!editingManager && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Temporary Password *
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Manager will be required to change this password on first login
                  </p>
                </div>
              )}
              {error && (
                <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingManager ? 'Update Manager' : 'Create Manager'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Managers List */}
        {!showCreateForm && managers.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No managers added yet</h3>
            <p className="text-gray-500 mb-4">
              Create your first manager account to get started
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add First Manager
            </button>
          </div>
        )}

        {!showCreateForm && managers.length > 0 && (
          <div className="space-y-3">
            {managers.map((manager) => (
              <div key={manager.id} className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{manager.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{manager.email}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      Added {new Date(manager.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(manager)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(manager.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Add Manager Button - only show when form is not open */}
      {!showCreateForm && (
        <button
          onClick={() => setShowCreateForm(true)}
          className="fixed bottom-24 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center z-20"
          aria-label="Add Manager"
        >
          <UserPlus className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
