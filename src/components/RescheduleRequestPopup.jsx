'use client';

import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, CheckCircle, XCircle, Phone, MessageCircle, AlertCircle } from 'lucide-react';
import { psychologistApi } from '../lib/backendApi';

export default function RescheduleRequestPopup({ notification, onClose, onAction }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showContactMessage, setShowContactMessage] = useState(false);
  const [sessionTime, setSessionTime] = useState(null);

  useEffect(() => {
    // Parse session date/time from notification message
    // Message format: "ClientName has requested to reschedule their session from YYYY-MM-DD at HH:MM:SS to YYYY-MM-DD at HH:MM:SS..."
    const message = notification?.message || '';
    const originalDateMatch = message.match(/from (\d{4}-\d{2}-\d{2}) at (\d{2}:\d{2})/);
    
    if (originalDateMatch) {
      const [, date, time] = originalDateMatch;
      // Create date in IST timezone (Asia/Kolkata)
      const [hours, minutes] = time.split(':');
      const sessionDateTime = new Date(`${date}T${hours}:${minutes}:00+05:30`);
      setSessionTime(sessionDateTime);
      
      // Check if session is 1 hour away (using IST)
      const now = new Date();
      const hoursUntilSession = (sessionDateTime - now) / (1000 * 60 * 60);
      
      if (hoursUntilSession <= 1 && hoursUntilSession > 0) {
        setShowContactMessage(true);
      }
    }
  }, [notification]);

  const handleApprove = async () => {
    if (!notification?.related_id) {
      alert('Session information not available');
      return;
    }

    // Check if this requires admin approval
    if (notification.message?.includes('admin approval') && 
        notification.message?.includes('within 24 hours')) {
      alert('This reschedule request requires admin approval. Please contact admin for approval.');
      return;
    }

    setIsProcessing(true);
    try {
      // Backend will parse date/time from message, so we just need to send the action
      await psychologistApi.handleRescheduleRequest(notification.id, 'approve', '');
      onAction('approve', {});
    } catch (error) {
      console.error('Error approving reschedule:', error);
      const errorMessage = error.message || error.response?.data?.message || 'Unknown error';
      alert(`Failed to approve reschedule: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!notification?.related_id) {
      alert('Session information not available');
      return;
    }

    const reason = prompt('Please provide a reason for rejection (optional):') || '';
    
    setIsProcessing(true);
    try {
      await psychologistApi.handleRescheduleRequest(notification.id, 'reject', reason);
      onAction('reject', { reason });
    } catch (error) {
      console.error('Error rejecting reschedule:', error);
      alert(`Failed to reject reschedule: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Parse dates from message
  const message = notification?.message || '';
  const originalMatch = message.match(/from (\d{4}-\d{2}-\d{2}) at (\d{2}:\d{2})/);
  const newMatch = message.match(/to (\d{4}-\d{2}-\d{2}) at (\d{2}:\d{2})/);
  
  const originalDate = originalMatch ? originalMatch[1] : null;
  const originalTime = originalMatch ? originalMatch[2] : null;
  const newDate = newMatch ? newMatch[1] : null;
  const newTime = newMatch ? newMatch[2] : null;

  // Get operations contact info from env or use defaults
  const operationsPhone = process.env.NEXT_PUBLIC_OPERATIONS_PHONE || '+91 XXXX XXXXXX';
  const operationsWhatsApp = process.env.NEXT_PUBLIC_OPERATIONS_WHATSAPP || operationsPhone;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header with Close Icon */}
        <div className="sticky top-0 bg-gradient-to-r from-orange-50 to-yellow-50 px-6 py-4 border-b border-orange-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-full">
              <AlertCircle className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Reschedule Request
              </h3>
              <p className="text-sm text-gray-600">
                Action Required - Within 24 Hours
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-white rounded-full"
            title="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Contact Operations Message (if 1 hour before session) */}
          {showContactMessage && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-900 mb-2">
                    Urgent: Session Starting Soon
                  </h4>
                  <p className="text-sm text-red-800 mb-3">
                    This session is less than 1 hour away and requires immediate attention. 
                    Please contact our operations team for assistance.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={`tel:${operationsPhone.replace(/\s/g, '')}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                    >
                      <Phone className="h-4 w-4" />
                      Call Operations
                    </a>
                    <a
                      href={`https://wa.me/${operationsWhatsApp.replace(/[^\d]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                    >
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp Operations
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
            <p className="text-gray-800 leading-relaxed">
              {notification?.message || 'A client has requested to reschedule their session.'}
            </p>
          </div>

          {/* Session Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Original Session */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-5 w-5 text-gray-600" />
                <h4 className="font-semibold text-gray-900">Current Schedule</h4>
              </div>
              {originalDate && originalTime ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Date:</span> {formatDateTime(`${originalDate}T${originalTime}:00`).split(' at ')[0]}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Time:</span> {formatTime(originalTime)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Date/time information not available</p>
              )}
            </div>

            {/* New Requested Session */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-5 w-5 text-green-600" />
                <h4 className="font-semibold text-gray-900">Requested New Schedule</h4>
              </div>
              {newDate && newTime ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Date:</span> {formatDateTime(`${newDate}T${newTime}:00`).split(' at ')[0]}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Time:</span> {formatTime(newTime)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">New date/time information not available</p>
              )}
            </div>
          </div>

          {/* Important Note */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> This reschedule request is within 24 hours of the original session time. 
              Your approval is required to proceed with the reschedule.
            </p>
          </div>

          {/* Action Buttons - Only show if psychologist can approve (not admin-only requests) */}
          {!notification.message?.includes('admin approval') && (
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={handleApprove}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    Approve Reschedule
                  </>
                )}
              </button>
              <button
                onClick={handleReject}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5" />
                    Reject Request
                  </>
                )}
              </button>
            </div>
          )}

          {/* Info message if admin approval required */}
          {notification.message?.includes('admin approval') && (
            <div className="pt-4 border-t border-gray-200">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> This reschedule request requires admin approval as it's within 24 hours. 
                  An admin will review and approve/reject this request. You will be notified once a decision is made.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

