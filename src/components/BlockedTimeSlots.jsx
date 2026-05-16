"use client";
import { useState, useEffect } from "react";
import { AlertCircle, Calendar, Clock, X, RefreshCw } from "lucide-react";
import { useNotification } from "../contexts/NotificationContext";
import { getStoredToken } from "@/lib/authStorage";

export default function BlockedTimeSlots({ psychologistId }) {
  const { showError, showSuccess } = useNotification();
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnblocking, setIsUnblocking] = useState(false);

  useEffect(() => {
    loadBlockedSlots();
  }, [psychologistId]);

  const loadBlockedSlots = async () => {
    try {
      setIsLoading(true);
      
      // Check if user is authenticated
      const token = getStoredToken();
      if (!token) {
        console.log('No authentication token found, skipping blocked slots load');
        setBlockedSlots([]);
        return;
      }
      
      // Get blocked slots for the next 30 days
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api'}/psychologists/blocked-time?startDate=${startDate}&endDate=${endDate}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('User not authenticated, skipping blocked slots load');
          setBlockedSlots([]);
          return;
        }
        throw new Error('Failed to load blocked time slots');
      }

      const data = await response.json();
      setBlockedSlots(data.data || []);
    } catch (error) {
      console.error('Error loading blocked slots:', error);
      // Don't show error to user if it's just an authentication issue
      if (!error.message.includes('401') && !error.message.includes('Unauthorized')) {
        showError('Failed to load blocked time slots');
      }
      setBlockedSlots([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblock = async (eventId) => {
    try {
      setIsUnblocking(true);
      
      // Check if user is authenticated
      const token = getStoredToken();
      if (!token) {
        showError('Please log in to unblock time slots');
        return;
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api'}/psychologists/unblock-time`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ eventIds: [eventId] })
      });

      if (!response.ok) {
        if (response.status === 401) {
          showError('Please log in to unblock time slots');
          return;
        }
        throw new Error('Failed to unblock time slot');
      }

      showSuccess('Time slot unblocked successfully');
      loadBlockedSlots(); // Refresh the list
    } catch (error) {
      console.error('Error unblocking time slot:', error);
      showError('Failed to unblock time slot');
    } finally {
      setIsUnblocking(false);
    }
  };

  const formatEventTime = (event) => {
    if (event.start.dateTime) {
      // Specific time slot
      const startTime = new Date(event.start.dateTime);
      const endTime = new Date(event.end.dateTime);
      return {
        type: 'time',
        start: startTime.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        }),
        end: endTime.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        }),
        date: startTime.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        })
      };
    } else if (event.start.date) {
      // All-day event
      const startDate = new Date(event.start.date);
      const endDate = new Date(event.end.date);
      
      if (startDate.getTime() === endDate.getTime() - 24 * 60 * 60 * 1000) {
        // Single day
        return {
          type: 'day',
          date: startDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
          })
        };
      } else {
        // Multiple days
        return {
          type: 'range',
          startDate: startDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          }),
          endDate: new Date(endDate.getTime() - 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          })
        };
      }
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          <span className="ml-2 text-gray-600">Loading blocked time slots...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Blocked Time Slots</h3>
            <p className="text-sm text-gray-600">Time slots blocked across all platforms</p>
          </div>
        </div>
        <button
          onClick={loadBlockedSlots}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        {blockedSlots.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Blocked Time Slots</h4>
            <p className="text-gray-600">You haven't blocked any time slots yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {blockedSlots.map((event) => {
              const timeInfo = formatEventTime(event);
              if (!timeInfo) return null;

              return (
                <div key={event.id} className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      {timeInfo.type === 'time' ? (
                        <Clock className="w-4 h-4 text-red-600" />
                      ) : (
                        <Calendar className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-red-900">
                        {timeInfo.type === 'time' && `${timeInfo.start} - ${timeInfo.end}`}
                        {timeInfo.type === 'day' && `Whole Day`}
                        {timeInfo.type === 'range' && `${timeInfo.startDate} - ${timeInfo.endDate}`}
                      </div>
                      <div className="text-sm text-red-700">
                        {timeInfo.type === 'time' && timeInfo.date}
                        {timeInfo.type === 'day' && timeInfo.date}
                        {timeInfo.type === 'range' && 'Multiple Days'}
                      </div>
                      {event.description && (
                        <div className="text-xs text-red-600 mt-1">
                          {event.description.replace('Time blocked by psychologist - ', '')}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnblock(event.id)}
                    disabled={isUnblocking}
                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isUnblocking ? (
                      <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
