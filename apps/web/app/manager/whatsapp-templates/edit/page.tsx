'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import ManagerLayout from '@/app/components/ManagerLayout';
import { useAuth } from '@/hooks/useAuth';
import { MessageSquare } from 'lucide-react';
import {
  replaceTemplateVariables,
  getAvailableVariables,
  getTemplateSampleData,
  validateTemplate,
} from '@/lib/template-utils';

interface Template {
  id: string;
  template_name: string;
  template_message: string;
  template_type: string;
}

function EditWhatsAppTemplateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('id');
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [template, setTemplate] = useState<Template | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateMessage, setTemplateMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const sampleData = getTemplateSampleData();
  const availableVariables = getAvailableVariables();

  useEffect(() => {
    if (templateId) {
      fetchTemplate();
    }
  }, [templateId]);

  async function fetchTemplate() {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/whatsapp-templates/${templateId}`
      );

      if (!response.ok) {
        throw new Error('Template not found');
      }

      const data = await response.json();
      setTemplate(data);
      setTemplateName(data.template_name);
      setTemplateMessage(data.template_message);
      setError('');
    } catch (err) {
      let errorMessage = 'Failed to load template';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      setTemplate(null);
    } finally {
      setLoading(false);
    }
  }

  const handleMessageChange = (value: string) => {
    setTemplateMessage(value);
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

    const validation = validateTemplate(templateMessage);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setError('Please fix template errors');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/whatsapp-templates/${templateId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateName: templateName.trim(),
            templateMessage: templateMessage.trim(),
          }),
        }
      );

      if (!response.ok) {
        let errorMsg = 'Failed to update template';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (e) {
          // If response is not JSON, use status message
        }
        throw new Error(errorMsg);
      }

      setSuccess('Template updated successfully!');
      setTimeout(() => {
        router.push('/manager/whatsapp-templates');
      }, 1500);
    } catch (err) {
      let errorMessage = 'Failed to update template';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  const previewMessage = replaceTemplateVariables(templateMessage, sampleData);

  if (loading) {
    return (
      <div className="bg-[#F8F9FB] text-slate-900 min-h-screen pb-20">
        <div className="bg-white border-b p-4 flex items-center gap-3">
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
        </div>
        <div className="w-full px-6 py-6 space-y-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-[20px] p-5 border border-slate-100 animate-pulse"
            >
              <div className="h-5 bg-slate-200 rounded w-1/3 mb-3"></div>
              <div className="h-3 bg-slate-100 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="bg-[#F8F9FB] text-slate-900 min-h-screen pb-20">
        <div className="bg-white border-b p-4 flex items-center gap-3">
          <button
            onClick={() => router.push('/manager/whatsapp-templates')}
            className="text-2xl text-gray-600 hover:text-gray-900"
          >
            ←
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Template Not Found</h1>
        </div>
      </div>
    );
  }

  // System templates cannot be edited
  if (template.template_type === 'system') {
    return (
      <div className="bg-[#F8F9FB] text-slate-900 min-h-screen pb-20">
        <div className="bg-white border-b p-4 flex items-center gap-3">
          <button
            onClick={() => router.push('/manager/whatsapp-templates')}
            className="text-2xl text-gray-600 hover:text-gray-900"
          >
            ←
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Cannot Edit Template</h1>
        </div>
        <div className="w-full px-6 py-6">
          <div className="bg-yellow-50 border border-yellow-100 rounded-[20px] p-4 text-yellow-700 text-sm font-medium">
            System templates cannot be edited. You can only edit custom templates.
          </div>
          <button
            onClick={() => router.push('/manager/whatsapp-templates')}
            className="mt-4 w-full px-4 py-3 rounded-[12px] bg-blue-600 text-white font-bold text-sm"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
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
          <h1 className="text-2xl font-bold text-gray-900">Edit Template</h1>
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
              className="w-full px-4 py-3 rounded-[12px] border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              disabled={submitting}
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
              rows={5}
              className="w-full px-4 py-3 rounded-[12px] border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-mono text-xs resize-none"
              disabled={submitting}
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
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 rounded-[12px] bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-50 active:scale-95"
              disabled={submitting || !templateName || !templateMessage}
            >
              {submitting ? 'Updating...' : 'Update Template'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function EditWhatsAppTemplatePage() {
  return (
    <ProtectedRoute>
      <ManagerLayout>
        <Suspense fallback={<div>Loading...</div>}>
          <EditWhatsAppTemplateContent />
        </Suspense>
      </ManagerLayout>
    </ProtectedRoute>
  );
}
