'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import ManagerLayout from '@/app/components/ManagerLayout';
import { useAuth } from '@/hooks/useAuth';
import { ChevronLeft, MessageSquare } from 'lucide-react';
import {
  replaceTemplateVariables,
  getAvailableVariables,
  getTemplateSampleData,
  validateTemplate,
} from '@/lib/template-utils';

export default function AddWhatsAppTemplatePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateMessage, setTemplateMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const sampleData = getTemplateSampleData();
  const availableVariables = getAvailableVariables();

  const previewMessage = replaceTemplateVariables(templateMessage, sampleData);

  const handleMessageChange = (value: string) => {
    setTemplateMessage(value);
    // Validate on change
    const validation = validateTemplate(value);
    setValidationErrors(validation.errors);
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById(
      'templateMessage'
    ) as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue =
        templateMessage.substring(0, start) +
        variable +
        templateMessage.substring(end);
      handleMessageChange(newValue);
      // Focus back to textarea
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!templateName.trim()) {
      setError('Template name is required');
      return;
    }

    if (!templateMessage.trim()) {
      setError('Template message is required');
      return;
    }

    // Validate template
    const validation = validateTemplate(templateMessage);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setError('Please fix template errors');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/whatsapp-templates`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateName: templateName.trim(),
            templateMessage: templateMessage.trim(),
          }),
        }
      );

      if (!response.ok) {
        let errorMsg = 'Failed to create template';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (e) {
          // If response is not JSON, use status message
        }
        throw new Error(errorMsg);
      }

      setSuccess('Template created successfully!');
      setTemplateName('');
      setTemplateMessage('');
      setValidationErrors([]);

      // Redirect after success
      setTimeout(() => {
        router.push('/manager/whatsapp-templates');
      }, 1500);
    } catch (err) {
      let errorMessage = 'Failed to create template';
      if (err instanceof Error) {
        errorMessage = err.message;
        console.error('Error creating template:', err.message);
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ProtectedRoute>
      <ManagerLayout>
        <div className="bg-[#F8F9FB] text-slate-900 overflow-x-hidden relative min-h-screen pb-20">
          {/* Header */}
          <div className="bg-white border-b p-4 flex items-center gap-3 sticky top-0 z-20">
            <button
              onClick={() => router.push('/manager/whatsapp-templates')}
              className="text-2xl text-gray-600 hover:text-gray-900"
            >
              ←
            </button>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">New Template</h1>
            </div>
          </div>

          {/* Main Content */}
          <main className="w-full px-6 py-6 space-y-5 pb-[140px]">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-100 rounded-[20px] p-4 text-red-700 text-sm font-medium">
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-green-50 border border-green-100 rounded-[20px] p-4 text-green-700 text-sm font-medium">
                {success}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Template Name */}
              <div className="bg-white rounded-[20px] p-5 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                <label className="block text-sm font-bold text-slate-900 mb-2">
                  Template Name
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Service Confirmation, Engineer Assigned"
                  className="w-full px-4 py-3 rounded-[12px] border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-slate-400"
                  disabled={loading}
                />
              </div>

              {/* Template Message */}
              <div className="bg-white rounded-[20px] p-5 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                <label className="block text-sm font-bold text-slate-900 mb-2">
                  Message Template
                </label>
                <textarea
                  id="templateMessage"
                  value={templateMessage}
                  onChange={(e) => handleMessageChange(e.target.value)}
                  placeholder="Enter your message. Use variables like {customer_name}, {call_id}, etc."
                  rows={5}
                  className="w-full px-4 py-3 rounded-[12px] border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-slate-400 font-mono text-xs resize-none"
                  disabled={loading}
                />
                <p className="text-xs text-slate-500 mt-2">
                  {templateMessage.length} / 1000 characters
                </p>

                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                  <div className="mt-3 p-3 bg-red-50 rounded-[12px] border border-red-100">
                    {validationErrors.map((error, i) => (
                      <p key={i} className="text-xs text-red-700 font-medium">
                        • {error}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Available Variables */}
              <div className="bg-blue-50 rounded-[20px] p-5 border border-blue-100">
                <p className="text-sm font-bold text-blue-900 mb-3">
                  Insert Variables
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {availableVariables.map((variable) => (
                    <button
                      key={variable.name}
                      type="button"
                      onClick={() => insertVariable(variable.name)}
                      className="text-left px-3 py-2 rounded-[10px] bg-white text-blue-700 text-xs font-medium border border-blue-200 hover:bg-blue-100 active:scale-95 transition-transform"
                      title={variable.description}
                    >
                      {variable.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview Section */}
              <div className="bg-white rounded-[20px] p-5 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="w-full text-left font-bold text-slate-900 text-sm flex items-center justify-between hover:text-blue-600"
                >
                  Preview
                  <span className={`transition-transform ${showPreview ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>

                {showPreview && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-[12px] border border-slate-200">
                    <p className="text-xs font-medium text-slate-500 mb-2">
                      Sample Preview (using demo data):
                    </p>
                    <div className="bg-white p-3 rounded-[10px] border border-slate-200">
                      <p className="text-xs text-slate-700 whitespace-pre-wrap break-words">
                        {previewMessage || '(Empty)'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => router.push('/manager/whatsapp-templates')}
                  className="flex-1 px-4 py-3 rounded-[12px] border border-slate-200 text-slate-900 font-bold text-sm hover:bg-slate-50 disabled:opacity-50"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-[12px] bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-50 active:scale-95"
                  disabled={loading || !templateName || !templateMessage}
                >
                  {loading ? 'Creating...' : 'Create Template'}
                </button>
              </div>
            </form>
          </main>
        </div>
      </ManagerLayout>
    </ProtectedRoute>
  );
}
