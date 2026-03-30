'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import BottomNav from '@/app/components/BottomNav';
import ManagerLayout from '@/app/components/ManagerLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { MessageSquare, Edit2, Trash2, Plus, Lock } from 'lucide-react';

interface Template {
  id: string;
  template_name: string;
  template_message: string;
  template_type: 'system' | 'custom';
  is_active: boolean;
  created_at: string;
}

export default function WhatsAppTemplatesPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && user && !authLoading) {
      fetchTemplates();
    }
  }, [isAuthenticated, user?.id, authLoading]);

  async function fetchTemplates() {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(
        `/api/whatsapp-templates`
      );

      if (!response.ok) {
        let errorMsg = `Failed to fetch templates (${response.status})`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (e) {
          // If response is not JSON, use status message
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      setTemplates(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      let errorMessage = 'Failed to load templates';
      if (err instanceof Error) {
        errorMessage = err.message;
        console.error('Error fetching templates:', err.message);
      }
      setError(errorMessage);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(templateId: string) {
    try {
      const response = await fetch(
        `/api/whatsapp-templates/${templateId}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete template');
      }

      setDeleteConfirm(null);
      fetchTemplates();
    } catch (err) {
      console.error('Error deleting template:', err);
      alert('Failed to delete template');
    }
  }

  const customTemplates = templates.filter((t) => t.template_type === 'custom');
  const systemTemplates = templates.filter((t) => t.template_type === 'system');

  return (
    <ProtectedRoute>
      <ManagerLayout>
        <div className="bg-[#F8F9FB] text-slate-900 overflow-x-hidden relative min-h-screen pb-20">
          {/* Ambient Depth Elements */}
          <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none bg-noise mix-blend-multiply"></div>
          <div className="fixed top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none z-0"></div>

          {/* Main Content */}
          <main className="w-full px-6 pb-[140px] space-y-5 relative z-10">
            {/* Header */}
            <div className="pt-6 pb-2">
              <div className="flex items-center gap-3 mb-1">
                <MessageSquare className="w-6 h-6 text-blue-600" />
                <h1 className="text-3xl font-bold text-slate-900">WhatsApp Templates</h1>
              </div>
              <p className="text-sm text-slate-500">
                Create and manage message templates with variables
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-100 rounded-[20px] p-4 text-red-700 text-sm font-medium">
                {error}
              </div>
            )}

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-100 rounded-[20px] p-4 text-sm text-blue-700">
              <div className="font-semibold mb-2">Supported Variables:</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>• {'{customer_name}'} - Customer name</div>
                <div>• {'{engineer_name}'} - Engineer name</div>
                <div>• {'{call_id}'} - Call ID</div>
                <div>• {'{mobile}'} - Phone number</div>
                <div>• {'{priority}'} - Priority level</div>
                <div>• {'{warranty_status}'} - Warranty status</div>
                <div>• {'{purchase_source}'} - Purchase source</div>
                <div>• {'{charge_type}'} - Charge type</div>
                <div>• {'{time_stamp_call_creation}'} - Call creation time</div>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-[20px] p-5 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] animate-pulse"
                  >
                    <div className="h-5 bg-slate-200 rounded w-1/3 mb-3"></div>
                    <div className="h-3 bg-slate-100 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {/* System Templates */}
                {systemTemplates.length > 0 && (
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-slate-500" />
                      System Templates
                    </h2>
                    <div className="space-y-3">
                      {systemTemplates.map((template) => (
                        <div
                          key={template.id}
                          className="bg-white rounded-[20px] p-5 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]"
                        >
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base font-bold text-slate-900 break-words mb-1">
                                {template.template_name}
                              </h3>
                              <p className="text-xs text-slate-600 whitespace-pre-wrap break-words line-clamp-2">
                                {template.template_message}
                              </p>
                              <div className="mt-2 flex items-center gap-2">
                                <span className="inline-block px-2 py-1 rounded-[8px] bg-slate-100 text-slate-600 text-xs font-medium">
                                  System
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Templates */}
                <div>
                  <h2 className="text-lg font-bold text-slate-900 mb-3">
                    Custom Templates ({customTemplates.length}/10)
                  </h2>
                  {customTemplates.length === 0 ? (
                    <div className="bg-white rounded-[28px] p-8 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] text-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-[16px] flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-slate-600 font-bold mb-2">
                        No custom templates yet
                      </p>
                      <p className="text-slate-500 text-sm mb-4">
                        Create your first template to send personalized messages
                      </p>
                      <button
                        onClick={() => router.push('/manager/whatsapp-templates/add')}
                        className="inline-block px-4 py-2 bg-blue-600 text-white rounded-[12px] text-sm font-bold hover:bg-blue-700"
                      >
                        Create Template
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {customTemplates.map((template) => (
                        <div
                          key={template.id}
                          className="bg-white rounded-[20px] p-5 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]"
                        >
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base font-bold text-slate-900 break-words mb-1">
                                {template.template_name}
                              </h3>
                              <p className="text-xs text-slate-600 whitespace-pre-wrap break-words line-clamp-3">
                                {template.template_message}
                              </p>
                              <p className="text-xs font-medium text-slate-400 mt-2">
                                {new Date(template.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                router.push(
                                  `/manager/whatsapp-templates/edit?id=${template.id}`
                                )
                              }
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-[12px] bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-100"
                            >
                              <Edit2 className="w-3 h-3" />
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(template.id)}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-[12px] bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>

          {/* Fixed Add Button */}
          {customTemplates.length < 10 && (
            <div className="fixed bottom-24 right-6 z-40">
              <button
                onClick={() => router.push('/manager/whatsapp-templates/add')}
                className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform font-bold hover:bg-blue-700"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
          )}

          {/* Delete Confirmation Dialog */}
          {deleteConfirm && (
            <div className="fixed inset-0 bg-black/40 flex items-end z-50">
              <div className="w-full bg-white rounded-t-[28px] p-6 animate-in slide-in-from-bottom">
                <h2 className="text-xl font-bold text-slate-900 mb-2">
                  Delete Template?
                </h2>
                <p className="text-slate-600 text-sm mb-6">
                  This action cannot be undone. Are you sure?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 px-4 py-3 rounded-[12px] border border-slate-200 text-slate-900 font-bold text-sm hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(deleteConfirm)}
                    className="flex-1 px-4 py-3 rounded-[12px] bg-red-600 text-white font-bold text-sm hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          <BottomNav />
        </div>
      </ManagerLayout>
    </ProtectedRoute>
  );
}
