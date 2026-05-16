'use client';

import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar } from 'lucide-react';
import { publicApi, clientApi } from '../lib/backendApi';

export default function RescheduleModal({ isOpen, onClose, session, onRescheduleSuccess }) {
  // Calendar state - EXACT same as therapist profile
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  
  // Availability state - EXACT same as therapist profile
  const [psychologistAvailability, setPsychologistAvailability] = useState({});
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availableTimeslots, setAvailableTimeslots] = useState([]);
  const [loadingTimeslots, setLoadingTimeslots] = useState(false);
  
  // Reschedule state
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [error, setError] = useState(null);
  const [showApprovalPopup, setShowApprovalPopup] = useState(false);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [approvalReason, setApprovalReason] = useState('');

  // Helper function to display time in 12-hour format with AM/PM
  const formatTime12Hour = (timeValue) => {
    if (!timeValue) return '';
    const raw = String(timeValue).trim();

    // If already in 12-hour format with AM/PM (e.g. "5:00 PM"), just normalise spacing/case
    if (/am|pm/i.test(raw)) {
      const [timePart, period] = raw.split(/\s+/);
      return `${timePart} ${period.toUpperCase()}`;
    }

    // Otherwise assume 24-hour "HH:MM" or "HH:MM:SS" and convert
    const [hours, minutes] = raw.split(':');
    const hour = parseInt(hours, 10);
    const mins = minutes || '00';
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12; // Convert 0 to 12, 13-23 to 1-11
    return `${hour12}:${mins} ${ampm}`;
  };

  // Helper function to convert 12-hour time to 24-hour for sorting
  const convertTo24HourForSort = (timeStr) => {
    if (!timeStr) return 0;
    const time = String(timeStr).trim();
    
    // If already in 24-hour format (no AM/PM), parse directly
    if (!time.includes('AM') && !time.includes('PM')) {
      const [hours, minutes] = time.split(':');
      return parseInt(hours || '0', 10) * 60 + parseInt(minutes || '0', 10);
    }
    
    // Parse 12-hour format
    const [timePart, period] = time.split(/\s+/);
    const [hours, minutes] = timePart.split(':');
    let hour24 = parseInt(hours || '0', 10);
    
    if (period && period.toUpperCase() === 'PM' && hour24 !== 12) {
      hour24 += 12;
    } else if (period && period.toUpperCase() === 'AM' && hour24 === 12) {
      hour24 = 0;
    }
    
    return hour24 * 60 + parseInt(minutes || '0', 10);
  };

  // Helper function to sort time slots chronologically
  const sortTimeSlots = (slots) => {
    return [...slots].sort((a, b) => {
      const timeA = convertTo24HourForSort(a);
      const timeB = convertTo24HourForSort(b);
      return timeA - timeB;
    });
  };

  // EXACT same helper functions as therapist profile
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
    
    return { daysInMonth, startingDay };
  };

  const handlePrevMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    setCurrentDate(newDate);
    
    // Refetch availability for new month
    if (session?.psychologist_id) {
      fetchPsychologistAvailability();
    }
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    setCurrentDate(newDate);
    
    // Refetch availability for new month
    if (session?.psychologist_id) {
      fetchPsychologistAvailability();
    }
  };

  const handleDateSelect = (day) => {
    const newSelectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(newSelectedDate);
    // Clear selected time when date changes
    setSelectedTime(null);
    
    // For free assessments, fetch time slots for the selected date (same as free assessment page)
    if (session.session_type === 'free_assessment') {
      fetchAvailableTimeslots(newSelectedDate);
    }
  };

  const handleTimeSelect = (time) => {
    setSelectedTime(time);
  };

  // Fetch available timeslots for selected date - same as free assessment page
  const fetchAvailableTimeslots = async (date) => {
    try {
      setLoadingTimeslots(true);
      console.log('[Reschedule] fetchAvailableTimeslots:start', { date, iso: date?.toISOString() });
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      console.log('[Reschedule] fetchAvailableTimeslots:dateStr', dateStr);
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await fetch(
        `/api/free-assessments/available-slots?date=${dateStr}`,
        Object.keys(headers).length ? { headers } : undefined
      );
      
      const data = await response.json();
      console.log('[Reschedule] fetchAvailableTimeslots:response', data);
      
      if (data.success) {
        const slots = data.data.availableSlots || [];
        console.log('[Reschedule] Setting availableTimeslots:', slots);
        setAvailableTimeslots(slots);
      } else {
        console.error('Failed to fetch timeslots:', data);
        setAvailableTimeslots([]);
      }
    } catch (error) {
      console.error('Error fetching timeslots:', error);
      setAvailableTimeslots([]);
    } finally {
      setLoadingTimeslots(false);
      console.log('[Reschedule] fetchAvailableTimeslots:done');
    }
  };

  // EXACT same availability fetching as therapist profile
  const fetchPsychologistAvailability = async () => {
    if (!session?.psychologist_id) return;

    try {
      setLoadingAvailability(true);
      
      // Check if this is a free assessment session
      if (session.session_type === 'free_assessment') {
        // Fetch free assessment availability instead
        await fetchFreeAssessmentAvailability();
      } else {
        // Fetch regular psychologist availability
        await fetchRegularPsychologistAvailability();
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
      setError('Failed to fetch availability');
    } finally {
      setLoadingAvailability(false);
    }
  };

  // Fetch free assessment availability - same method as free assessment page
  const fetchFreeAssessmentAvailability = async () => {
    try {
      setLoadingAvailability(true);
      
      // Get current month dates - same as free assessment page
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      
      // Format start date (first day of month)
      const startYear = year;
      const startMonth = String(month + 1).padStart(2, '0');
      const startDay = '01';
      const startDate = `${startYear}-${startMonth}-${startDay}`;
      
      // Format end date (last day of month)
      const endYear = year;
      const endMonth = String(month + 1).padStart(2, '0');
      const endDay = String(new Date(year, month + 1, 0).getDate()).padStart(2, '0');
      const endDate = `${endYear}-${endMonth}-${endDay}`;
      
      console.log('🔍 Fetching free assessment availability for reschedule:', startDate, 'to', endDate);
      
      // Use the same endpoint as free assessment page
      const response = await fetch(
        `/api/free-assessments/availability-range?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
          }
        }
      );
      
      const data = await response.json();
      console.log('🔍 Free assessment availability response:', data);
      
      if (data.success) {
        // Convert array to object with date keys - same as free assessment page
        const availabilityObject = {};
        data.data.forEach(dayAvailability => {
          availabilityObject[dayAvailability.date] = dayAvailability;
        });
        
        console.log('🔍 Processed availability object:', availabilityObject);
        setPsychologistAvailability(availabilityObject);
      } else {
        console.error('Failed to fetch availability:', data);
        setError('Failed to fetch free assessment availability');
        setPsychologistAvailability({});
      }
    } catch (error) {
      console.error('Error fetching free assessment availability:', error);
      setError('Failed to fetch free assessment availability');
      setPsychologistAvailability({});
    } finally {
      setLoadingAvailability(false);
    }
  };

  // Fetch regular psychologist availability
  const fetchRegularPsychologistAvailability = async () => {
    try {
      // Get current month dates - EXACT same logic
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      
      // Format start date (first day of month)
      const startYear = year;
      const startMonth = String(month + 1).padStart(2, '0');
      const startDay = '01';
      const startDate = `${startYear}-${startMonth}-${startDay}`;
      
      // Format end date (last day of month)
      const endYear = year;
      const endMonth = String(month + 1).padStart(2, '0');
      const endDay = String(new Date(year, month + 1, 0).getDate()).padStart(2, '0');
      const endDate = `${endYear}-${endMonth}-${endDay}`;
      
      console.log('Fetching availability for psychologist:', session.psychologist_id);
      console.log('Date range:', startDate, 'to', endDate);
      
      // Use the exact same API call as therapist profile
      // Pass withSync = true to get latest blocked slots (same as therapist profile)
      const response = await publicApi.getPsychologistAvailabilityRange(
        session.psychologist_id, 
        startDate, 
        endDate,
        true // withSync - ensures blocked slots are included
      );
      
      if (response.success) {
        // Convert array to object with date keys - same as therapist profile
        const availabilityObject = {};
        response.data.data.forEach(dayAvailability => {
          availabilityObject[dayAvailability.date] = dayAvailability;
        });
        
        setPsychologistAvailability(availabilityObject);
        console.log('Availability loaded:', availabilityObject);
      } else {
        console.error('Failed to fetch availability:', response);
        setError('Failed to load availability');
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
      setError('Failed to load availability');
    } finally {
      setLoadingAvailability(false);
    }
  };

  useEffect(() => {
    if (isOpen && session) {
      fetchPsychologistAvailability();
    }
  }, [isOpen, session, currentDate]);

  // Check if reschedule requires approval
  const checkIfRequiresApproval = () => {
    if (!session || !selectedDate || !selectedTime) return false;
    
    const rescheduleCount = session.reschedule_count || 0;
    
    // Check if within 24 hours
    if (session.scheduled_date && session.scheduled_time) {
      const sessionDateTime = new Date(`${session.scheduled_date}T${session.scheduled_time}`);
      const now = new Date();
      const hoursUntilSession = (sessionDateTime - now) / (1000 * 60 * 60);
      
      // Requires approval if within 24 hours OR 2nd+ reschedule
      return hoursUntilSession <= 24 || rescheduleCount >= 1;
    }
    
    // If 2nd+ reschedule, requires approval
    return rescheduleCount >= 1;
  };

  const getApprovalReasonText = () => {
    if (!session) return '';
    
    const rescheduleCount = session.reschedule_count || 0;
    
    if (session.scheduled_date && session.scheduled_time) {
      const sessionDateTime = new Date(`${session.scheduled_date}T${session.scheduled_time}`);
      const now = new Date();
      const hoursUntilSession = (sessionDateTime - now) / (1000 * 60 * 60);
      
      if (hoursUntilSession <= 24 && rescheduleCount >= 1) {
        return 'This reschedule requires admin approval because the session is within 24 hours AND this is your 2nd or more reschedule.';
      } else if (hoursUntilSession <= 24) {
        return 'This reschedule requires admin approval because the session is within 24 hours.';
      } else if (rescheduleCount >= 1) {
        return 'This reschedule requires admin approval because this is your 2nd or more reschedule.';
      }
    } else if (rescheduleCount >= 1) {
      return 'This reschedule requires admin approval because this is your 2nd or more reschedule.';
    }
    
    return '';
  };

  const handleRescheduleClick = () => {
    if (!selectedDate || !selectedTime) {
      setError('Please select a date and time');
      return;
    }

    // Check if approval is needed
    if (checkIfRequiresApproval()) {
      setApprovalReason(getApprovalReasonText());
      setShowApprovalPopup(true);
      return;
    }

    // Direct reschedule - proceed immediately
    proceedWithReschedule();
  };

  const proceedWithReschedule = async () => {
    setIsRescheduling(true);
    setError(null);

    try {
      const rescheduleData = {
        new_date: `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`,
        new_time: selectedTime,
        psychologist_id: session.psychologist_id,
        reason: rescheduleReason || undefined
      };

      const response = await clientApi.rescheduleSession(session.id, rescheduleData);
      
      if (response.success) {
        // Check if this was a direct reschedule or a request
        if (response.message && response.message.includes('request sent')) {
          // This was a reschedule request - show success message in theme color
          setError('Reschedule request sent to admin for approval');
          setTimeout(() => {
            onClose();
            // Call success callback to refresh the page
            if (onRescheduleSuccess) {
              onRescheduleSuccess(response.data);
            }
          }, 3000);
        } else {
          // This was a direct reschedule
          onClose();
          // Call success callback to refresh the page
          if (onRescheduleSuccess) {
            onRescheduleSuccess(response.data);
          }
        }
      } else {
        setError(response.message || 'Failed to reschedule session');
      }
    } catch (error) {
      console.error('Error rescheduling session:', error);
      setError('Failed to reschedule session');
    } finally {
      setIsRescheduling(false);
      setShowApprovalPopup(false);
      setRescheduleReason('');
    }
  };

  const handleCancelApproval = () => {
    setShowApprovalPopup(false);
    setRescheduleReason('');
    setApprovalReason('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-none sm:rounded-2xl shadow-2xl w-full sm:max-w-4xl max-h-[100vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-6 border-b">
          <h4 className="text-sm sm:text-base font-semibold text-gray-900">Reschedule Session</h4>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        <div className="p-3 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
            {/* Calendar - EXACT same structure as therapist profile */}
            <div>
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg sm:shadow-2xl p-3 sm:p-6 w-full sm:max-w-md">
                {/* Calendar Header */}
                <div className="text-center mb-3 sm:mb-4">
                  {loadingAvailability && (
                    <div className="mt-2 flex items-center justify-center text-xs" style={{ color: '#3f2e73' }}>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 mr-2" style={{ borderBottomColor: '#3f2e73' }}></div>
                      Loading availability...
                    </div>
                  )}
                </div>
                
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-2">
                  <button 
                    onClick={handlePrevMonth}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 18l-6-6 6-6"/>
                    </svg>
                  </button>
                  <h6 className="text-[10px] sm:text-xs font-semibold text-gray-800">{getMonthName(currentDate)}</h6>
                  <button 
                    onClick={handleNextMonth}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </button>
                </div>
                
                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-3 sm:mb-4">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                    <div key={`header-${index}`} className="text-center text-xs font-medium text-gray-500 py-1">
                      {day}
                    </div>
                  ))}
                  {(() => {
                    const { daysInMonth, startingDay } = getDaysInMonth(currentDate);
                    const today = new Date();
                    const isCurrentMonth = currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
                    
                    // Create array for calendar grid
                    const calendarDays = [];
                    
                    // Add empty cells for days before the first day of the month
                    for (let i = 0; i < startingDay; i++) {
                      calendarDays.push(<div key={`empty-${i}`} className="text-center py-0.5 sm:py-1 text-xs"></div>);
                    }
                    
                    // Add days of the month
                    for (let day = 1; day <= daysInMonth; day++) {
                      const isToday = isCurrentMonth && day === today.getDate();
                      const isSelected = selectedDate && selectedDate.getDate() === day && selectedDate.getMonth() === currentDate.getMonth() && selectedDate.getFullYear() === currentDate.getFullYear();
                      
                      // Properly check if date is in the past (same logic as free assessment page)
                      const calendarDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                      todayStart.setHours(0, 0, 0, 0);
                      calendarDate.setHours(0, 0, 0, 0);
                      const isPastDate = calendarDate < todayStart;
                      const isAvailable = !isPastDate;
                      
                      // Check if this specific date is available for the psychologist
                      // Use local date formatting to avoid timezone conversion issues
                      const year = calendarDate.getFullYear();
                      const month = String(calendarDate.getMonth() + 1).padStart(2, '0');
                      const dayStr = String(calendarDate.getDate()).padStart(2, '0');
                      const dateStr = `${year}-${month}-${dayStr}`;
                      const dateAvailability = psychologistAvailability[dateStr];
                      
                      // For free assessments, use same highlighting logic as free assessment page
                      let isPsychologistAvailable = false;
                      let shouldHighlight = false;
                      let availableSlotsCount = 0;
                      let isConfigured = false;
                      
                      if (session.session_type === 'free_assessment') {
                        // STRICT check: Only highlight dates that have isConfigured: true AND availableSlots > 0
                        // If date is not in availability object, treat as having 0 slots and not configured
                        
                        if (dateAvailability && typeof dateAvailability === 'object' && dateAvailability !== null) {
                          // Check if date is configured (has specific date config)
                          isConfigured = dateAvailability.isConfigured === true;
                          
                          const slots = dateAvailability.availableSlots;
                          // Only accept positive numbers - reject 0, negative, or non-numbers
                          if (typeof slots === 'number' && slots > 0 && Number.isFinite(slots)) {
                            availableSlotsCount = slots;
                          } else {
                            // Explicitly set to 0 if slots is 0, negative, or invalid
                            availableSlotsCount = 0;
                          }
                        }
                        // If dateAvailability is undefined/null, availableSlotsCount remains 0 and isConfigured remains false
                        
                        // Only consider available if: isConfigured is true AND slots count is strictly greater than 0
                        isPsychologistAvailable = isConfigured && availableSlotsCount > 0;
                        
                        // Only show highlight/available indicator if it's configured AND has available slots (> 0) AND is not a past date
                        shouldHighlight = isPsychologistAvailable && !isPastDate;
                      } else {
                        // Regular session logic
                        isPsychologistAvailable = dateAvailability && dateAvailability.availableSlots > 0;
                        shouldHighlight = isPsychologistAvailable;
                      }
                      
                      // Only show dates as available if they actually have availability data
                      const isActuallyAvailable = isPsychologistAvailable && isAvailable;
                      
                      calendarDays.push(
                        <div
                          key={`day-${day}`}
                          onClick={() => {
                            // Allow clicking on any future date, not just those with availability
                            if (isAvailable) {
                              handleDateSelect(day);
                            }
                          }}
                          className={`text-center py-0.5 sm:py-1 rounded-lg transition-all duration-200 text-xs ${
                            session.session_type === 'free_assessment' 
                              ? (
                                // Free assessment styling - same as free assessment page
                                // Only highlight if: isConfigured is true AND slots > 0 AND actually available
                                isSelected
                                  ? 'bg-[#3f2e73] text-white font-bold shadow-lg cursor-pointer border border-[#3f2e73]'
                                  : (isToday && isConfigured && availableSlotsCount > 0 && shouldHighlight)
                                    ? 'bg-[#6d5ba8] text-white font-semibold shadow-md cursor-pointer border border-[#6d5ba8]'
                                    : isToday && (!isConfigured || availableSlotsCount === 0 || !shouldHighlight)
                                      ? 'bg-[#eae4ff] text-[#3f2e73] font-semibold cursor-pointer border border-[#d8ccff]'
                                      : (isConfigured && availableSlotsCount > 0 && shouldHighlight)
                                        ? 'bg-[#f0edff] text-[#3f2e73] font-semibold cursor-pointer border border-[#3f2e73] hover:bg-[#e3dcff]'
                                        : isAvailable
                                          ? 'text-[#3f2e73] cursor-pointer border border-transparent hover:bg-[#f6f3ff]'
                                          : 'text-gray-300 cursor-not-allowed'
                              )
                              : (
                                // Regular session styling - match therapist profile calendar theme
                            isSelected 
                                  ? 'bg-[#3f2e73] text-white font-bold shadow-lg cursor-pointer border border-[#3f2e73]'
                                  : (isToday && isActuallyAvailable)
                                    ? 'bg-[#6d5ba8] text-white font-semibold shadow-md cursor-pointer border border-[#6d5ba8]'
                              : isToday
                                      ? 'bg-[#eae4ff] text-[#3f2e73] font-semibold cursor-pointer border border-[#d8ccff]'
                                      : isActuallyAvailable
                                        ? 'bg-[#f0edff] text-[#3f2e73] font-semibold cursor-pointer border border-[#3f2e73] hover:bg-[#e3dcff]'
                                : isAvailable
                                          ? 'text-[#3f2e73] cursor-pointer border border-transparent hover:bg-[#f6f3ff]'
                                      : 'text-gray-300 cursor-not-allowed'
                              )
                          }`}
                          title={shouldHighlight ? (isToday ? 'Today - Available for free assessment' : 'Available for free assessment') : isAvailable ? 'Click to check availability' : 'Past date'}
                        >
                          {day}
                          {shouldHighlight && session.session_type === 'free_assessment' && isConfigured && availableSlotsCount > 0 && (
                            <div
                              className={`w-2 h-2 rounded-full mx-auto mt-1 shadow-sm ${
                                isSelected ? 'bg-[#f0edff]' : 'bg-[#3f2e73]'
                              }`}
                            ></div>
                          )}
                          {shouldHighlight && session.session_type !== 'free_assessment' && (
                            <div
                              className={`w-2 h-2 rounded-full mx-auto mt-1 shadow-sm ${
                                isSelected ? 'bg-[#f0edff]' : 'bg-[#3f2e73]'
                              }`}
                            ></div>
                          )}
                          {!shouldHighlight && isAvailable && session.session_type !== 'free_assessment' && (
                            <div className="w-1 h-1 bg-gray-400 rounded-full mx-auto mt-1"></div>
                          )}
                        </div>
                      );
                    }
                    
                    return calendarDays;
                  })()}
                </div>
                
              </div>
            </div>

            {/* Time Selection - EXACT same as therapist profile */}
            <div className="space-y-4 sm:space-y-6">
              <div>
                <div className="mb-3 sm:mb-4 flex items-center justify-between">
                  <h6 className="text-xs sm:text-sm font-semibold text-gray-900">
                  Select New Time (IST)
                  </h6>
                  {selectedDate && (
                    <p className="text-[10px] sm:text-xs text-gray-500">
                      {selectedDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  )}
                </div>

                {!selectedDate ? (
                  <div className="text-center py-8">
                    <div className="text-gray-500 text-sm">
                      <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v16a2 2 0 002 2z" />
                      </svg>
                      <p>Select a date to see available times</p>
                    </div>
                  </div>
                                 ) : (() => {
                  // For free assessments, use availableTimeslots from fetchAvailableTimeslots (same as free assessment page)
                  // Check this FIRST before checking dateAvailability
                  if (session.session_type === 'free_assessment') {
                    console.log('[Reschedule] Rendering free assessment slots:', {
                      loadingTimeslots,
                      availableTimeslotsLength: availableTimeslots.length,
                      availableTimeslots
                    });
                    
                    if (loadingTimeslots) {
                      return (
                        <div className="flex items-center justify-center py-4 min-h-[200px]">
                          <div className="flex flex-col items-center justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 mb-3" style={{ borderBottomColor: '#3f2e73' }}></div>
                            <span className="text-gray-600 text-sm">Creating a safe place for you</span>
                          </div>
                        </div>
                      );
                    }
                    
                    // Filter slots for today (same as free assessment page)
                    const filteredSlots = availableTimeslots.filter((timeslot) => {
                      if (!selectedDate) return true;
                      const now = new Date();
                      const isToday =
                        selectedDate.getFullYear() === now.getFullYear() &&
                        selectedDate.getMonth() === now.getMonth() &&
                        selectedDate.getDate() === now.getDate();
                      if (!isToday) return true;
                      const [hh, mm] = timeslot.time.split(':');
                      const slotMinutes = parseInt(hh, 10) * 60 + parseInt(mm, 10);
                      const nowMinutes = now.getHours() * 60 + now.getMinutes();
                      return slotMinutes > nowMinutes;
                    });

                    console.log('[Reschedule] Filtered slots:', filteredSlots);
                    
                    if (filteredSlots.length === 0) {
                      console.log('[Reschedule] No filtered slots, showing empty message');
                      return (
                        <div className="flex items-center justify-center h-32 text-gray-500 text-sm italic">
                          No available time slots for this date
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-3 gap-2">
                        {filteredSlots.map((timeslot, index) => {
                          const isSelected = selectedTime === timeslot.time;
                          const isFullyBooked = timeslot.currentBookings >= timeslot.maxBookings;
                          const remainingSlots = timeslot.maxBookings - timeslot.currentBookings;
                          
                          return (
                            <button
                              key={index}
                              onClick={() => !isFullyBooked && handleTimeSelect(timeslot.time)}
                              disabled={isFullyBooked}
                              className={`p-2 text-xs rounded-lg border transition-colors ${
                                isSelected
                                  ? 'bg-[#3f2e73] text-white border-[#3f2e73]'
                                  : isFullyBooked
                                    ? 'bg-red-100 text-red-600 border-red-300 cursor-not-allowed'
                                    : 'bg-white text-[#3f2e73] border-[#3f2e73] hover:bg-[#f0edff]'
                              }`}
                              title={isFullyBooked ? 'Fully booked' : `Available: ${remainingSlots} slots left`}
                            >
                              <div className="text-center">
                                <div>{timeslot.displayTime || timeslot.time}</div>
                                {isFullyBooked && (
                                  <div className="text-xs text-red-500 mt-1">Fully booked</div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  }
                  
                  // Regular session structure: { timeSlots: [{ available, displayTime, ... }] }
                  // Get availability for the selected date
                  const year = selectedDate.getFullYear();
                  const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                  const day = String(selectedDate.getDate()).padStart(2, '0');
                  const dateStr = `${year}-${month}-${day}`;
                  const dateAvailability = psychologistAvailability[dateStr];
                  
                  if (!dateAvailability) {
                    return (
                      <div className="text-center py-8">
                        <div className="text-gray-500 text-sm">
                          <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p>Loading availability for this date...</p>
                        </div>
                      </div>
                    );
                  }
                  
                  const allTimeSlots = dateAvailability.timeSlots || [];
                  const availableSlots = allTimeSlots.filter(slot => slot.available).map(slot => slot.displayTime);
                  
                  // Sort time slots chronologically
                  const sortedAvailableSlots = sortTimeSlots(availableSlots);
                  
                  if (sortedAvailableSlots.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <div className="text-gray-500 text-sm">
                          <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p>No available time slots for this date</p>
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1">
                            {sortedAvailableSlots.map((time) => (
                              <button
                                key={time}
                                onClick={() => handleTimeSelect(time)}
                                className={`p-1 sm:p-2 rounded-lg border text-xs transition-all duration-200 w-full h-8 sm:h-10 flex items-center justify-center ${
                                  selectedTime === time
                                    ? 'border-[#3f2e73] bg-[#3f2e73] text-white font-bold shadow-lg'
                                    : 'border-gray-300 bg-white hover:border-[#3f2e73] text-gray-700'
                                }`}
                              >
                                {time}
                              </button>
                            ))}
                    </div>
                  );
                })()}
              </div>

              {/* Error/Success Display */}
              {error && (
                <div className={`p-2 sm:p-3 rounded-lg ${
                  error.includes('request sent') || error.includes('success')
                    ? 'bg-[#f0edff] border border-[#3f2e73]'
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <p className={`text-xs sm:text-sm ${
                    error.includes('request sent') || error.includes('success')
                      ? 'text-[#3f2e73]'
                      : 'text-red-700'
                  }`}>{error}</p>
                </div>
              )}

              {/* Reschedule Button */}
              <button
                onClick={handleRescheduleClick}
                disabled={!selectedDate || !selectedTime || isRescheduling}
                className={`w-full py-2 sm:py-3 px-4 sm:px-6 rounded-lg font-semibold transition-all duration-200 text-sm sm:text-base text-white shadow-sm ${
                  selectedDate && selectedTime && !isRescheduling
                    ? 'cursor-pointer'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                style={selectedDate && selectedTime && !isRescheduling 
                  ? { backgroundColor: '#3f2e73' }
                  : {}
                }
                onMouseEnter={(e) => {
                  if (selectedDate && selectedTime && !isRescheduling) {
                    e.currentTarget.style.backgroundColor = '#1d1733';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedDate && selectedTime && !isRescheduling) {
                    e.currentTarget.style.backgroundColor = '#3f2e73';
                  }
                }}
              >
                {isRescheduling ? 'Rescheduling...' : 'Reschedule Session'}
              </button>

              {/* New Session Details Preview */}
              {selectedDate && selectedTime && (
                <div className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h6 className="font-semibold text-green-900 mb-2 text-xs sm:text-sm">New Session Details</h6>
                  <p className="text-blue-800 text-xs sm:text-sm">
                    📅 {selectedDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  <p className="text-blue-800 text-xs sm:text-sm">
                    🕐 {formatTime12Hour(selectedTime)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Approval Required Popup */}
      {showApprovalPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-3 sm:p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg sm:max-w-2xl w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Reschedule Request Approval Required</h3>
            
            <div className="mb-3 sm:mb-4">
              <p className="text-xs sm:text-sm text-gray-700 mb-2 sm:mb-3">
                <strong>Reason for approval:</strong>
              </p>
              <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 bg-yellow-50 border border-yellow-200 rounded p-2 sm:p-3">
                {approvalReason}
              </p>
              
              <p className="text-xs sm:text-sm text-gray-700 mb-1.5 sm:mb-2">
                Your reschedule request will be sent to the admin for review and approval.
              </p>
              <p className="text-xs sm:text-sm text-gray-700 mb-2 sm:mb-4">
                You will be notified of the admin's response through:
              </p>
              <ul className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 list-disc list-inside space-y-0.5 sm:space-y-1">
                <li>Email notification</li>
                <li>WhatsApp message</li>
                <li>In-app notification</li>
              </ul>
            </div>

            <div className="mb-3 sm:mb-4">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Reason for reschedule request (optional):
              </label>
              <textarea
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="Please provide a reason for rescheduling (optional)..."
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3f2e73] focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={handleCancelApproval}
                className="flex-1 px-3 sm:px-4 py-2 text-xs sm:text-sm border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={proceedWithReschedule}
                disabled={isRescheduling}
                className="flex-1 px-3 sm:px-4 py-2 text-xs sm:text-sm bg-[#3f2e73] text-white rounded-lg font-medium hover:bg-[#2d1f52] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRescheduling ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white inline-block mr-2"></div>
                    Sending...
                  </>
                ) : (
                  'Request Reschedule'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

