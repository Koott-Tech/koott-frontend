import { useState } from 'react';
import { X, Star, MessageSquare } from 'lucide-react';
import { formatSessionDate } from '@/lib/sessionDate';

export default function SessionFeedbackModal({ 
  session, 
  isOpen, 
  onClose, 
  onSubmit 
}) {
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!feedback.trim()) {
      setError('Feedback is required');
      return;
    }

    if (rating === 0) {
      setError('Please provide a rating');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      
      await onSubmit(session.id, {
        feedback: feedback.trim(),
        rating: rating
      });
      
      // Reset form
      setFeedback('');
      setRating(0);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFeedback('');
      setRating(0);
      setError('');
      onClose();
    }
  };

  const handleStarClick = (starRating) => {
    setRating(starRating);
  };

  // Format time from 24-hour to 12-hour format with AM/PM
  const formatTime = (timeString) => {
    if (!timeString) return '';
    
    // Handle formats: "18:00:00" or "18:00" or "6:00 PM" (shouldn't happen but handle it)
    // First, check if it's already in 12-hour format
    if (typeof timeString === 'string' && (timeString.includes('AM') || timeString.includes('PM'))) {
      // Already formatted, return as is
      return timeString;
    }
    
    // Extract time parts (handle HH:MM:SS or HH:MM)
    const timeOnly = timeString.split(' ')[0]; // Remove any timezone or other text
    const timeParts = timeOnly.split(':');
    const hours = parseInt(timeParts[0], 10);
    const minutes = timeParts[1] || '00';
    
    // Validate hours
    if (isNaN(hours) || hours < 0 || hours > 23) {
      console.error('Invalid time format:', timeString);
      return timeString;
    }
    
    // Convert to 12-hour format
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const displayMinutes = minutes.padStart(2, '0');
    
    return `${displayHour}:${displayMinutes} ${ampm}`;
  };

  if (!isOpen || !session) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-blue-600" />
            <h5 className="text-sm font-semibold text-gray-800">Session Feedback</h5>
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
          <h6 className="text-xs font-medium text-gray-800 mb-3">Session Details</h6>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Therapist:</span>
              <span className="ml-2 font-medium text-gray-800">
                {session.psychologist?.first_name} {session.psychologist?.last_name}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Date:</span>
              <span className="ml-2 font-medium text-gray-800">
                {formatSessionDate(session.scheduled_date)}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Time:</span>
              <span className="ml-2 font-medium text-gray-800">
                {formatTime(session.scheduled_time)}
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
          {/* Rating */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
              <Star className="w-4 h-4 text-yellow-500" />
              Session Rating *
              <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleStarClick(star)}
                  className={`text-2xl transition-colors ${
                    star <= rating ? 'text-yellow-500' : 'text-gray-300'
                  } hover:text-yellow-500`}
                >
                  ★
                </button>
              ))}
              <span className="ml-3 text-sm text-gray-600">
                {rating > 0 ? `${rating} out of 5 stars` : 'Click to rate'}
              </span>
            </div>
          </div>

          {/* Feedback */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              Session Feedback *
              <span className="text-red-500">*</span>
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Share your experience with this therapy session. What went well? What could be improved? Any specific feedback for the therapist?"
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              required
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500 mt-1">
              Your feedback helps improve the quality of therapy sessions
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
              disabled={isSubmitting || !feedback.trim() || rating === 0}
              className="px-6 py-2 bg-[#025545] text-white rounded-lg hover:bg-[#012f23] transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4" />
                  Submit Feedback
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
