'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const GoogleCalendarIntegration = ({ psychologistId, onAvailabilityUpdate }) => {
  const { user, token } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check if Google Calendar is connected
  useEffect(() => {
    checkGoogleCalendarConnection();
  }, [psychologistId]);

  const checkGoogleCalendarConnection = async () => {
    try {
      setLoading(true);
      // This would check if the psychologist has Google Calendar connected
      // For now, we'll assume it's connected if the service is configured
      setIsConnected(true);
    } catch (error) {
      console.error('Error checking Google Calendar connection:', error);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const syncWithGoogleCalendar = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/availability-controller/sync-google-calendar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          psychologist_id: psychologistId
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCalendarEvents(data.events || []);
        if (onAvailabilityUpdate) {
          onAvailabilityUpdate(data.availability);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to sync with Google Calendar');
      }
    } catch (error) {
      console.error('Error syncing with Google Calendar:', error);
      setError('Failed to sync with Google Calendar');
    } finally {
      setLoading(false);
    }
  };

  const disconnectGoogleCalendar = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/availability/disconnect-google-calendar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          psychologist_id: psychologistId
        })
      });

      if (response.ok) {
        setIsConnected(false);
        setCalendarEvents([]);
        if (onAvailabilityUpdate) {
          onAvailabilityUpdate([]);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to disconnect Google Calendar');
      }
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error);
      setError('Failed to disconnect Google Calendar');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Google Calendar Integration</h3>
        <div className="flex items-center space-x-2">
          {isConnected ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <svg className="w-2 h-2 mr-1" fill="currentColor" viewBox="0 0 8 8">
                <circle cx="4" cy="4" r="3" />
              </svg>
              Connected
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              <svg className="w-2 h-2 mr-1" fill="currentColor" viewBox="0 0 8 8">
                <circle cx="4" cy="4" r="3" />
              </svg>
              Disconnected
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        {isConnected ? (
          <>
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div>
                <p className="text-green-800 font-medium">Google Calendar Connected</p>
                <p className="text-green-700 text-sm">Your availability is synced with Google Calendar</p>
              </div>
              <button
                onClick={syncWithGoogleCalendar}
                disabled={loading}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
              >
                Sync Now
              </button>
            </div>

            {calendarEvents.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-gray-800 mb-2">Recent Calendar Events</h4>
                <div className="space-y-2">
                  {calendarEvents.slice(0, 5).map((event, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                      <span className="text-gray-700">{event.summary}</span>
                      <span className="text-gray-500">{new Date(event.start.dateTime).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={disconnectGoogleCalendar}
              disabled={loading}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              Disconnect Google Calendar
            </button>
          </>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v16a2 2 0 002 2z" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-gray-800 mb-2">Connect Google Calendar</h4>
            <p className="text-gray-600 text-sm mb-4">
              Sync your availability with Google Calendar to automatically manage your schedule
            </p>
            <button
              onClick={() => {
                // This would typically open Google OAuth flow
                // For now, we'll simulate connection
                setIsConnected(true);
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Connect Calendar
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-800 mb-2">Benefits of Google Calendar Integration</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Automatic session scheduling with Google Meet</li>
          <li>• Real-time availability updates</li>
          <li>• Conflict detection and prevention</li>
          <li>• Seamless calendar management</li>
        </ul>
      </div>
    </div>
  );
};

export default GoogleCalendarIntegration;
