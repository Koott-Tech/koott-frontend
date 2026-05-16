"use client";
import { useState } from "react";
import { X, FileText, Eye, EyeOff, Calendar, Clock, User } from "lucide-react";

export default function SessionNotesModal({ 
  isOpen, 
  onClose, 
  session 
}) {
  if (!isOpen || !session) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <EyeOff className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Session Notes
              </h2>
              <p className="text-sm text-gray-600">
                Private notes visible only to you
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Session Info */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Client</label>
              <p className="text-sm text-gray-900">
                {session.client?.first_name} {session.client?.last_name}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Child</label>
              <p className="text-sm text-gray-900">
                {session.client?.child_name} ({session.client?.child_age} years)
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Session Date</label>
              <p className="text-sm text-gray-900">
                {new Date(session.scheduled_date).toLocaleDateString()} at {session.scheduled_time}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Summary */}
          {session.summary && (
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <FileText className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-medium text-gray-900">Session Summary</h3>
                <span className="text-xs text-gray-500">(Visible to client)</span>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-gray-700 leading-relaxed">{session.summary}</p>
              </div>
            </div>
          )}

          {/* Report */}
          {session.report && (
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <FileText className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-medium text-gray-900">Session Report</h3>
                <span className="text-xs text-gray-500">(Visible to client)</span>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-gray-700 leading-relaxed">{session.report}</p>
              </div>
            </div>
          )}

          {/* Private Summary Notes */}
          {session.summary_notes && (
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <EyeOff className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-medium text-gray-900">Private Summary Notes</h3>
                <span className="text-xs text-gray-500">(Psychologist only)</span>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-gray-700 leading-relaxed">{session.summary_notes}</p>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                These notes are private and not visible to the client.
              </p>
            </div>
          )}

          {/* Legacy Session Notes */}
          {session.session_notes && (
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <FileText className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-medium text-gray-900">Session Notes</h3>
                <span className="text-xs text-gray-500">(Legacy format)</span>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-gray-700 leading-relaxed">{session.session_notes}</p>
              </div>
            </div>
          )}

          {/* No Notes Available */}
          {!session.summary && !session.report && !session.summary_notes && !session.session_notes && (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Session Notes Available</h3>
              <p className="text-gray-600">
                This session doesn't have any notes yet. Notes will appear here after the session is completed.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
