'use client';

interface ActionModalProps {
  action: string | null;
  actionNote: string;
  actionError: string;
  updating: boolean;
  onNoteChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export default function ActionModal({
  action,
  actionNote,
  actionError,
  updating,
  onNoteChange,
  onCancel,
  onSubmit,
}: ActionModalProps) {
  if (!action) return null;

  const getTitle = () => {
    switch (action) {
      case 'mark_in_progress':
        return 'Mark as In Progress';
      case 'pending_action':
        return 'Pending Action Required';
      case 'pending_services':
        return 'Pending Under Services';
      default:
        return 'Update Status';
    }
  };

  const getDescription = () => {
    switch (action) {
      case 'mark_in_progress':
        return 'Start working on this service call';
      default:
        return 'Provide a reason for this status';
    }
  };

  const requiresNote = action === 'pending_action' || action === 'pending_services';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50">
      <div className="w-full bg-white rounded-t-2xl p-4 max-h-[90vh] overflow-y-auto pb-8 safe-area-inset-bottom">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{getTitle()}</h2>
            <p className="text-gray-500 text-sm mt-1">{getDescription()}</p>
          </div>
          <button
            onClick={onCancel}
            className="text-2xl text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {requiresNote && (
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Reason / Note <span className="text-red-500">*</span>
            </label>
            <textarea
              value={actionNote}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="Explain why you're marking this call as pending..."
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={4}
            />
            <div className="text-xs text-gray-500 mt-1">
              {actionNote.trim().length} characters
            </div>
          </div>
        )}

        {actionError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-red-700 text-sm font-semibold">Error</div>
            <div className="text-red-600 text-sm mt-1">{actionError}</div>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <button
            onClick={onCancel}
            disabled={updating}
            className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-300 text-gray-900 font-semibold rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={updating}
            className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold rounded-lg transition"
          >
            {updating ? 'Saving...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
