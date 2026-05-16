import { useState } from 'react';
import { X, CheckCircle, FileText, MessageSquare } from 'lucide-react';

export default function CompleteSessionModal({ 
  session, 
  isOpen, 
  onClose, 
  onComplete 
}) {
  const [sessionSummary, setSessionSummary] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!sessionSummary.trim()) {
      setError('Session summary is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      
      await onComplete(session.id, {
        session_summary: sessionSummary.trim(),
        session_notes: sessionNotes.trim() || null,
        status: 'completed'
      });
      
      // Reset form
      setSessionSummary('');
      setSessionNotes('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to complete session');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSessionSummary('');
      setSessionNotes('');
      setError('');
      onClose();
    }
  };

  if (!isOpen || !session) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-800">
              Finish Session
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Session Info */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <h3 className="font-medium text-gray-800 mb-3">Session Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Client:</span>
              <span className="ml-2 font-medium text-gray-800">
                {session.client?.first_name} {session.client?.last_name}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Date:</span>
              <span className="ml-2 font-medium text-gray-800">
                {new Date(session.scheduled_date).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Time:</span>
              <span className="ml-2 font-medium text-gray-800">
                {session.scheduled_time}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Status:</span>
              <span className="ml-2 font-medium text-gray-800 capitalize">
                {session.status}
              </span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Session Summary */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              Session Summary *
              <span className="text-red-500">*</span>
            </label>
            <textarea
              value={sessionSummary}
              onChange={(e) => setSessionSummary(e.target.value)}
              placeholder="Provide a brief summary of the session that will be visible to the client..."
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              required
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500 mt-1">
              This summary will be visible to the client
            </p>
          </div>

          {/* Session Notes */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 text-purple-600" />
              Session Notes (Optional)
            </label>
            <textarea
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="Add private notes for your reference (not visible to client)..."
              className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500 mt-1">
              These notes are private and only visible to you
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !sessionSummary.trim()}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Finishing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Finish Session
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
