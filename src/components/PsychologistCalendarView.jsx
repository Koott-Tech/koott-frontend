'use client';

import React, { useState, useEffect } from 'react';
import { adminApi } from '@/lib/backendApi';
import { Calendar, RefreshCw, ExternalLink, Clock, CheckCircle } from 'lucide-react';

const PsychologistCalendarView = ({ psychologistId, psychologistName, onClose }) => {
  const [events, setEvents] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hasGoogleCalendar, setHasGoogleCalendar] = useState(false);

  useEffect(() => {
    fetchCalendarAndAvailability();
  }, [psychologistId, currentMonth]);

  const fetchCalendarAndAvailability = async () => {
    if (!psychologistId) return;
    try {
      setLoading(true);
      setError(null);

      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      const [eventsRes, availabilityRes] = await Promise.all([
        adminApi.getPsychologistCalendarEvents(psychologistId, startStr, endStr),
        adminApi.getPsychologistAvailabilityForReschedule(psychologistId, startStr, endStr),
      ]);

      if (eventsRes && eventsRes.success) {
        setEvents(eventsRes.data.events || []);
        setHasGoogleCalendar(!!eventsRes.data.hasGoogleCalendar);
      } else {
        setError('Failed to fetch calendar events');
      }

      if (availabilityRes && availabilityRes.success && availabilityRes.data?.availability) {
        setAvailability(availabilityRes.data.availability);
      } else {
        setAvailability([]);
      }
    } catch (err) {
      console.error('Error fetching calendar/availability:', err);
      setError('Failed to fetch calendar and availability');
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(newMonth.getMonth() + direction);
      return newMonth;
    });
  };

  const getMonthName = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    return { daysInMonth, startingDay, year, month };
  };

  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => {
      const eventDate = event.start.dateTime || event.start.date;
      return eventDate.startsWith(dateStr);
    });
  };

  const getAvailabilityForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return availability.find(d => d.date === dateStr) || null;
  };

  const getEventColor = (summary, source) => {
    if (source === 'koott') {
      return 'bg-green-50 border-green-200';
    }
    return 'bg-blue-50 border-blue-200';
  };

  const formatEventTime = (event) => {
    const startTime = new Date(event.start.dateTime || event.start.date);
    const endTime = event.end ? new Date(event.end.dateTime || event.end.date) : null;
    
    const startTimeStr = startTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
    
    if (endTime) {
      const endTimeStr = endTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
      return `${startTimeStr} - ${endTimeStr}`;
    }
    
    return startTimeStr;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Calendar className="h-6 w-6 mr-2" />
              {psychologistName}'s Calendar
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Calendar & availability status */}
          <div className="mb-4 p-3 rounded-md border" style={{ backgroundColor: 'rgba(63, 46, 115, 0.08)', borderColor: 'rgba(63, 46, 115, 0.2)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" style={{ color: '#025545' }} />
                <span className="text-sm" style={{ color: '#025545' }}>
                  {hasGoogleCalendar ? 'Google Calendar connected' : 'Google Calendar not connected'} · Availability loaded for this month
                </span>
              </div>
              <button
                onClick={fetchCalendarAndAvailability}
                disabled={loading}
                className="text-xs flex items-center gap-1 font-medium hover:opacity-80 disabled:opacity-60"
                style={{ color: '#025545' }}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-transparent border-t-current"></div>
                    Loading...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3" />
                    Refresh
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Month Calendar View - same design as therapist individual (booking) page */}
          <div className="mb-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <p className="text-sm font-semibold text-gray-800">{getMonthName(currentMonth)}</p>
                <button
                  onClick={() => navigateMonth(1)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>

              {/* Calendar grid - S M T W T F S headers like therapist page */}
              <div className="grid grid-cols-7 gap-1 mb-4">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                  <div key={`header-${index}`} className="text-center text-xs font-medium text-gray-500 py-1">
                    {day}
                  </div>
                ))}
                {(() => {
                  const { daysInMonth, startingDay, year, month } = getDaysInMonth(currentMonth);
                  const today = new Date();
                  const isCurrentMonth = currentMonth.getMonth() === today.getMonth() && currentMonth.getFullYear() === today.getFullYear();
                  const calendarDays = [];

                  for (let i = 0; i < startingDay; i++) {
                    calendarDays.push(<div key={`empty-${i}`} className="text-center py-1 text-xs" />);
                  }

                  for (let day = 1; day <= daysInMonth; day++) {
                    const date = new Date(year, month, day);
                    const eventsForDay = getEventsForDate(date);
                    const dayAvailability = getAvailabilityForDate(date);
                    const hasAvailableSlots = dayAvailability?.available_slots?.length > 0;
                    const isToday = isCurrentMonth && day === today.getDate();
                    const isSelected = selectedDate && selectedDate.getDate() === day && selectedDate.getMonth() === currentMonth.getMonth() && selectedDate.getFullYear() === currentMonth.getFullYear();

                    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    todayStart.setHours(0, 0, 0, 0);
                    date.setHours(0, 0, 0, 0);
                    const isPastDate = date < todayStart;
                    const isAvailable = !isPastDate;

                    const hasEvents = eventsForDay.length > 0;
                    const shouldHighlightAvailable = hasAvailableSlots && !hasEvents && !isPastDate;

                    calendarDays.push(
                      <div
                        key={day}
                        onClick={() => isAvailable && setSelectedDate(new Date(year, month, day))}
                        className={`text-center py-1 rounded-lg transition-all duration-200 text-xs cursor-pointer border ${
                          isSelected
                            ? 'bg-[#025545] text-white font-bold shadow-lg border-[#025545]'
                            : isToday && shouldHighlightAvailable
                              ? 'bg-[#189e4f] text-white font-semibold shadow-md border-[#189e4f]'
                              : isToday
                                ? 'bg-[#d7fec5] text-[#025545] font-semibold border-[#d7fec5]'
                                : shouldHighlightAvailable
                                  ? 'bg-[#f2fff1] text-[#025545] font-semibold border-[#025545] hover:bg-[#d7fec5]'
                                  : hasEvents && !isPastDate
                                    ? 'bg-red-50 text-red-700 font-semibold border-red-200 hover:bg-red-100'
                                    : isPastDate
                                      ? 'text-gray-300 cursor-not-allowed border-transparent'
                                      : 'text-[#025545] border-transparent hover:bg-[#f2fff1]'
                        }`}
                        title={hasEvents ? 'Has bookings/events' : shouldHighlightAvailable ? 'Available for booking' : isPastDate ? 'Past date' : 'No slots'}
                      >
                        {day}
                        {shouldHighlightAvailable && (
                          <div
                            className={`w-2 h-2 rounded-full mx-auto mt-1 shadow-sm ${
                              isSelected ? 'bg-[#f2fff1]' : isToday && shouldHighlightAvailable ? 'bg-white' : 'bg-[#025545]'
                            }`}
                          />
                        )}
                        {hasEvents && !shouldHighlightAvailable && !isSelected && (
                          <div className="w-2 h-2 rounded-full mx-auto mt-1 bg-red-400" />
                        )}
                      </div>
                    );
                  }
                  return calendarDays;
                })()}
              </div>
            </div>
          </div>
          
          {/* Selected Date Events */}
          <div className="bg-white border rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              Events for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </h4>
            
            {(() => {
              const dayEvents = getEventsForDate(selectedDate);
              return dayEvents.length > 0 ? (
                <div className="space-y-2">
                  {dayEvents.map((event, index) => (
                    <div
                      key={event.id || index}
                      className={`p-3 rounded-lg border ${getEventColor(event.summary, event.source)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h5 className="font-medium text-sm">{event.summary || 'Untitled Event'}</h5>
                            {event.source === 'external' && (
                              <ExternalLink className="h-3 w-3 text-blue-600" />
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3 text-gray-500" />
                            <p className="text-xs text-gray-600">
                              {formatEventTime(event)}
                            </p>
                          </div>
                          {event.location && (
                            <p className="text-xs mt-1 text-gray-600">📍 {event.location}</p>
                          )}
                          {event.description && (
                            <p className="text-xs mt-2 text-gray-600 line-clamp-2">{event.description}</p>
                          )}
                          {event.status && (
                            <p className="text-xs mt-1 text-gray-500">Status: {event.status}</p>
                          )}
                        </div>
                        <div className="ml-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            event.source === 'koott' 
                              ? 'bg-green-200 text-green-900' 
                              : 'bg-blue-200 text-blue-900'
                          }`}>
                            {event.source === 'koott' ? 'Koott' : 'External'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">No events on this date</p>
                </div>
              );
            })()}
          </div>

          {/* Available slots for selected date */}
          <div className="bg-white border rounded-lg p-4 mt-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" style={{ color: '#025545' }} />
              Available times — {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </h4>
            {(() => {
              const dayAvailability = getAvailabilityForDate(selectedDate);
              const slots = dayAvailability?.available_slots || [];
              return slots.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {slots.map((time, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-[#025545]/10 text-[#025545] border border-[#025545]/20"
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      {time}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No available slots on this date</p>
              );
            })()}
          </div>

          {/* Close Button */}
          <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PsychologistCalendarView;
