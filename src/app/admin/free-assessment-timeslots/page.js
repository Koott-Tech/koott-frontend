'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, Check, X, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminApi } from '@/lib/backendApi';

const formatDisplayTime = (hours24, minutes) => {
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const displayHour = ((hours24 + 11) % 12) + 1;
  const minuteStr = minutes.toString().padStart(2, '0');
  return `${displayHour}:${minuteStr} ${period}`;
};

const generateTwentyMinuteSlots = (startHour, endHour) => {
  const slots = [];
  let currentMinutes = startHour * 60;
  const endMinutes = endHour * 60;

  while (currentMinutes <= endMinutes) {
    const hours24 = Math.floor(currentMinutes / 60);
    const minutes = currentMinutes % 60;
    slots.push(formatDisplayTime(hours24, minutes));
    currentMinutes += 20;
  }

  return slots;
};

export default function FreeAssessmentTimeslotsPage() {
  const { user, token, authLoading } = useAuth();
  const [timeslots, setTimeslots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  
  // Removed modal/form states in favor of calendar-based editing

  // Calendar states (like doctor modal)
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTimes, setSelectedTimes] = useState([]);
  const [availabilityData, setAvailabilityData] = useState({});
  const [step, setStep] = useState(1); // 1: select date, 2: select times, 3: save
  const [bookedAssessments, setBookedAssessments] = useState([]);

  // Time slot categories – restricted to 20-minute slots from 10 AM-1 PM and 2 PM-5 PM
  const timeSlots = {
    morning: generateTwentyMinuteSlots(10, 13), // 10:00 AM - 1:00 PM
    noon: generateTwentyMinuteSlots(14, 17),    // 2:00 PM - 5:00 PM
    evening: [],
    night: []
  };

  // Fetch all future configurations in a date range
  const fetchAllFutureConfigurations = async (startDate, endDate) => {
    try {
      const startYear = startDate.getFullYear();
      const startMonth = String(startDate.getMonth() + 1).padStart(2, '0');
      const startDay = String(startDate.getDate()).padStart(2, '0');
      const startDateStr = `${startYear}-${startMonth}-${startDay}`;
      
      const endYear = endDate.getFullYear();
      const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
      const endDay = String(new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate()).padStart(2, '0');
      const endDateStr = `${endYear}-${endMonth}-${endDay}`;
      
      console.log('[Admin/FreeAssess] fetchAllFutureConfigurations:range', { startDateStr, endDateStr });
      const data = await adminApi.getDateConfigsRange(startDateStr, endDateStr);
      console.log('[Admin/FreeAssess] fetchAllFutureConfigurations:response', data);
      
      if (data.success && data.data) {
        // Merge all fetched data
        setAvailabilityData(prevData => {
          const merged = { ...prevData, ...data.data };
          console.log('[Admin/FreeAssess] fetchAllFutureConfigurations:merged', {
            prevKeys: Object.keys(prevData || {}).length,
            newKeys: Object.keys(data.data || {}).length,
            mergedKeys: Object.keys(merged).length
          });
          return merged;
        });
      }
    } catch (error) {
      console.error('Error fetching all future configurations:', error);
    }
  };

  // Fetch availability data for current month (and merge with existing data)
  const fetchAvailabilityData = async (date) => {
    try {
      setLoading(true);
      console.log('[Admin/FreeAssess] fetchAvailabilityData:start', {
        date,
        iso: date?.toISOString(),
        month: date?.getMonth() + 1,
        year: date?.getFullYear()
      });
      
      // Get current month dates
      const year = date.getFullYear();
      const month = date.getMonth();
      
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
      
      console.log('[Admin/FreeAssess] fetchAvailabilityData:range', { startDate, endDate });
      const data = await adminApi.getDateConfigsRange(startDate, endDate);
      console.log('[Admin/FreeAssess] fetchAvailabilityData:response', data);
      
      if (data.success && data.data) {
        // Merge new data with existing data instead of replacing
        setAvailabilityData(prevData => {
          const merged = { ...prevData, ...data.data };
          console.log('[Admin/FreeAssess] fetchAvailabilityData:merged', {
            prevKeys: Object.keys(prevData || {}).length,
            newKeys: Object.keys(data.data || {}).length,
            mergedKeys: Object.keys(merged).length,
            sampleKeys: Object.keys(merged).slice(0, 5)
          });
          return merged;
        });
      } else {
        console.error('Failed to fetch availability:', data);
        // Don't clear existing data, just log the error
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
      // Don't clear existing data on error
    } finally {
      setLoading(false);
      console.log('[Admin/FreeAssess] fetchAvailabilityData:done');
    }
  };

  // Convert 12-hour format to 24-hour format
  const convertTo24Hour = (time12h) => {
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');
    
    if (hours === '12') {
      hours = '00';
    }
    
    if (modifier === 'PM') {
      hours = (parseInt(hours, 10) + 12).toString();
    }
    
    return `${hours.padStart(2, '0')}:${minutes}:00`;
  };

  // Convert 24-hour format to 12-hour format
  const convertTo12Hour = (time24h) => {
    const [hours, minutes] = time24h.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Check if a date is in the past
  const isPastDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date < today;
  };

  // Check if a time slot has passed (for today's date)
  const isPastTime = (time12h, dateStr) => {
    const today = new Date();
    const date = new Date(dateStr);
    
    // If not today, it's not past
    if (date.toDateString() !== today.toDateString()) {
      return false;
    }
    
    // Convert 12-hour time to 24-hour for comparison
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');
    
    if (hours === '12') {
      hours = '00';
    }
    
    if (modifier === 'PM') {
      hours = (parseInt(hours, 10) + 12).toString();
    }
    
    const slotTime = new Date();
    slotTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    
    const now = new Date();
    return slotTime < now;
  };

  // Fetch all timeslots
  const fetchTimeslots = async () => {
    try {
      setLoading(true);
      console.log('[Admin/FreeAssess] fetchTimeslots:start');
      const data = await adminApi.getFreeAssessmentTimeslots();
      console.log('[Admin/FreeAssess] fetchTimeslots:response', data);
      
      if (data.success) {
        setTimeslots(data.data);
        console.log('[Admin/FreeAssess] fetchTimeslots:setTimeslots', {
          count: (data.data || []).length,
          sample: (data.data || []).slice(0, 3)
        });
      } else {
        setError(data.message || 'Failed to fetch timeslots');
      }
    } catch (error) {
      console.error('Error fetching timeslots:', error);
      setError('Failed to fetch timeslots');
    } finally {
      setLoading(false);
      console.log('[Admin/FreeAssess] fetchTimeslots:done');
    }
  };

  // Load booked free assessments for admin list
  const fetchBookedAssessments = async () => {
    if (!token) return;
    try {
      setLoading(true);
      console.log('[Admin/FreeAssess] fetchBooked:start');
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api';
      const response = await fetch(`${backendUrl}/free-assessments/admin/list?status=booked`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      console.log('[Admin/FreeAssess] fetchBooked:response', data);
      if (data.success) {
        const list =
          data?.data?.assessments ||
          data?.message?.assessments ||
          [];
        setBookedAssessments(Array.isArray(list) ? list : []);
      } else {
        setBookedAssessments([]);
        setError(data.message || 'Failed to fetch booked free assessments.');
      }
    } catch (error) {
      console.error('Error fetching booked free assessments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMeetLink = async (link) => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setSuccess('Meet link copied to clipboard.');
    } catch (copyError) {
      console.error('Failed to copy meet link:', copyError);
      setError('Failed to copy meet link.');
    }
  };

  // Calendar helper functions
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startingDay = new Date(year, month, 1).getDay();
    return { daysInMonth, startingDay };
  };

  const handlePrevMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const today = new Date();
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Don't allow navigation to past months
    if (newDate < currentMonth) {
      return;
    }
    
    setCurrentDate(newDate);
    fetchAvailabilityData(newDate);
  };

  // Check if previous month button should be disabled
  const canGoToPrevMonth = () => {
    const today = new Date();
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    return prevMonth >= currentMonth;
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    setCurrentDate(newDate);
    
    // Fetch data for the new month if we don't have it
    const year = newDate.getFullYear();
    const month = newDate.getMonth();
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, '0')}`;
    
    // Check if we already have data for any date in this month
    const hasDataForMonth = Object.keys(availabilityData).some(dateStr => {
      const date = new Date(dateStr);
      return date.getFullYear() === year && date.getMonth() === month;
    });
    
    if (!hasDataForMonth) {
      fetchAvailabilityData(newDate);
    }
    
    // Also prefetch next month for smoother navigation
    const nextMonth = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 1);
    fetchAvailabilityData(nextMonth);
  };

  const handleDateSelect = (day) => {
    const newSelectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    
    // Double-check: prevent selecting past dates
    const year = newSelectedDate.getFullYear();
    const month = String(newSelectedDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(newSelectedDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayStr}`;
    
    if (isPastDate(dateStr)) {
      console.warn('[Admin/FreeAssess] Attempted to select past date, prevented:', dateStr);
      setError('Cannot select past dates. Please select a future date.');
      return;
    }
    
    console.log('[Admin/FreeAssess] handleDateSelect', {
      day,
      selected: newSelectedDate,
      iso: newSelectedDate.toISOString()
    });
    setSelectedDate(newSelectedDate);

    // Prefill selectedTimes from existing availability for this date (to allow edit/remove)
    const existing = availabilityData[dateStr]?.timeSlots;

    if (existing) {
      const preselected = [];
      const today = new Date();
      const isToday = newSelectedDate.toDateString() === today.toDateString();
      
      Object.entries(existing).forEach(([period, times]) => {
        if (Array.isArray(times)) {
          times.forEach((t) => {
            const timeKey = `${period}:${t}`;
            // Filter out past time slots if it's today
            if (!isToday || !isPastTime(t, dateStr)) {
              preselected.push(timeKey);
            }
          });
        }
      });
      setSelectedTimes(preselected);
      console.log('[Admin/FreeAssess] prefillSelectedTimes', { preselected, isToday });
    } else {
      setSelectedTimes([]);
      console.log('[Admin/FreeAssess] prefillSelectedTimes:none');
    }

    setStep(2); // Move to time selection/edit step
  };

  const handleTimeSelect = (timeKey) => {
    setSelectedTimes(prev => {
      if (prev.includes(timeKey)) {
        return prev.filter(t => t !== timeKey);
      } else {
        return prev.concat(timeKey);
      }
    });
  };

  const saveCurrentDateAvailability = async () => {
    if (selectedTimes.length === 0) {
      setError('Please select at least one time slot');
      return;
    }

    try {
      setLoading(true);
      console.log('[Admin/FreeAssess] saveCurrentDateAvailability:start', {
        selectedTimes,
        selectedDate,
        selectedDateISO: selectedDate?.toISOString()
      });
      
      // Convert selected times to 24-hour format for backend
      const timeslotsToSave = selectedTimes.map(timeKey => {
        const colonIndex = timeKey.indexOf(':');
        const period = timeKey.substring(0, colonIndex);
        const time = timeKey.substring(colonIndex + 1);
        return convertTo24Hour(time);
      });
      console.log('[Admin/FreeAssess] saveCurrentDateAvailability:normalizedTimes', { timeslotsToSave });

      // Save timeslots to backend
      const data = await adminApi.bulkCreateFreeAssessmentTimeslots({
        timeslots: timeslotsToSave.map(time => ({
          time_slot: time,
          is_active: true,
          max_bookings_per_slot: 3
        }))
      });
      console.log('[Admin/FreeAssess] bulkCreateFreeAssessmentTimeslots:response', data);

      if (data.success) {
        // Now save the date-specific configuration (use local date parts to avoid UTC shift)
        const y = selectedDate.getFullYear();
        const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const d = String(selectedDate.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        console.log('[Admin/FreeAssess] saveCurrentDateAvailability:dateStr', dateStr);
        const timeSlotsByPeriod = {
          morning: [],
          noon: [],
          evening: [],
          night: []
        };
        
        // Organize selected times by period
        selectedTimes.forEach(timeKey => {
          const colonIndex = timeKey.indexOf(':');
          const period = timeKey.substring(0, colonIndex);
          const time = timeKey.substring(colonIndex + 1);
          if (timeSlotsByPeriod[period]) {
            timeSlotsByPeriod[period].push(time);
          }
        });
        console.log('[Admin/FreeAssess] saveCurrentDateAvailability:payload', {
          date: dateStr,
          timeSlotsByPeriod
        });

        // Save date configuration
        const dateConfigData = await adminApi.createDateConfig({
          date: dateStr,
          timeSlots: timeSlotsByPeriod
        });
        console.log('[Admin/FreeAssess] createDateConfig:response', dateConfigData);

        if (dateConfigData.success) {
          setSuccess('Timeslots saved successfully!');
          console.log('[Admin/FreeAssess] saveCurrentDateAvailability:success');
          
          // Update local availability data
          const newAvailability = { ...availabilityData };
          newAvailability[dateStr] = {
            timeSlots: timeSlotsByPeriod,
            isConfigured: true
          };
          setAvailabilityData(newAvailability);
          console.log('[Admin/FreeAssess] availabilityData:updated', {
            dateStr,
            timeSlots: newAvailability[dateStr]
          });
          
          // Reset selection
          setSelectedDate(null);
          setSelectedTimes([]);
          setStep(1);
          
          // Refresh timeslots list
          fetchTimeslots();
        } else {
          setError(dateConfigData.message || 'Failed to save date configuration');
          console.log('[Admin/FreeAssess] saveCurrentDateAvailability:dateConfigError', dateConfigData);
        }
      } else {
        setError(data.message || 'Failed to save timeslots');
        console.log('[Admin/FreeAssess] saveCurrentDateAvailability:bulkError', data);
      }
    } catch (error) {
      console.error('Error saving timeslots:', error);
      setError('Failed to save timeslots');
    } finally {
      setLoading(false);
      console.log('[Admin/FreeAssess] saveCurrentDateAvailability:done');
    }
  };

  const goToNextDate = async () => {
    if (selectedTimes.length === 0) {
      setError('Please select at least one time slot');
      return;
    }

    // Save current date and move to next date
    console.log('[Admin/FreeAssess] goToNextDate:start');
    await saveCurrentDateAvailability();
    
    // Move to next day
    const nextDate = new Date(selectedDate);
    nextDate.setDate(selectedDate.getDate() + 1);
    setCurrentDate(nextDate);
    setSelectedDate(nextDate);
    setSelectedTimes([]);
    setStep(2);
    console.log('[Admin/FreeAssess] goToNextDate:nextDate', nextDate);
  };

  const handleSelectAllDefaultSlots = () => {
    const today = new Date();
    const selectedDateStr = selectedDate ? 
      `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}` : 
      null;
    const isToday = selectedDateStr && 
      selectedDate.toDateString() === today.toDateString();
    
    let defaultSelection = [
      ...timeSlots.morning.map(time => `morning:${time}`),
      ...timeSlots.noon.map(time => `noon:${time}`)
    ];
    
    // Filter out past time slots if the selected date is today
    if (isToday) {
      defaultSelection = defaultSelection.filter(timeKey => {
        const colonIndex = timeKey.indexOf(':');
        const time = timeKey.substring(colonIndex + 1);
        return !isPastTime(time, selectedDateStr);
      });
    }
    
    setSelectedTimes(defaultSelection);
  };

  const handleEditDate = (dateStr) => {
    const existing = availabilityData[dateStr];
    if (!existing || !existing.timeSlots) return;

    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);

    const selections = [];
    Object.entries(existing.timeSlots).forEach(([period, times]) => {
      if (Array.isArray(times)) {
        times.forEach((time) => selections.push(`${period}:${time}`));
      }
    });

    setCurrentDate(dateObj);
    setSelectedDate(dateObj);
    setSelectedTimes(selections);
    setStep(2);
  };

  const removeAvailability = async (dateStr) => {
    try {
      setLoading(true);
      console.log('[Admin/FreeAssess] removeAvailability:start', { dateStr });
      
      const data = await adminApi.deleteDateConfig(dateStr);
      console.log('[Admin/FreeAssess] removeAvailability:response', data);

      if (data.success) {
        setSuccess('Date configuration removed successfully!');
        console.log('[Admin/FreeAssess] removeAvailability:success', { dateStr });
        
        // Remove from local state
        const newAvailability = { ...availabilityData };
        delete newAvailability[dateStr];
        setAvailabilityData(newAvailability);
      } else {
        setError(data.message || 'Failed to remove date configuration');
        console.log('[Admin/FreeAssess] removeAvailability:error', data);
      }
    } catch (error) {
      console.error('Error removing availability:', error);
      setError('Failed to remove date configuration');
    } finally {
      setLoading(false);
      console.log('[Admin/FreeAssess] removeAvailability:done');
    }
  };

  useEffect(() => {
    if (!authLoading && token && user) {
      console.log('[Admin/FreeAssess] useEffect:init', {
        user: { id: user?.id, role: user?.role, email: user?.email },
        tokenPreview: (token || '').substring(0, 10) + '...',
        currentDate,
        iso: currentDate.toISOString()
      });
      
      // Ensure currentDate is not in the past - reset to current month if needed
      const today = new Date();
      const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const displayedMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      
      let monthToFetch = currentDate;
      if (displayedMonth < currentMonth) {
        console.log('[Admin/FreeAssess] Resetting to current month');
        setCurrentDate(currentMonth);
        monthToFetch = currentMonth;
      }
      
      // Fetch all future date configurations (from today to 3 months ahead)
      // This ensures we get all existing configurations
      const todayDate = new Date();
      const threeMonthsFromNow = new Date(todayDate.getFullYear(), todayDate.getMonth() + 3, 1);
      
      // Fetch data for current month and next 2 months
      fetchAvailabilityData(monthToFetch);
      const nextMonth = new Date(monthToFetch.getFullYear(), monthToFetch.getMonth() + 1, 1);
      const monthAfterNext = new Date(monthToFetch.getFullYear(), monthToFetch.getMonth() + 2, 1);
      fetchAvailabilityData(nextMonth);
      fetchAvailabilityData(monthAfterNext);
      
      // Also fetch a wide range to get all existing configurations
      fetchAllFutureConfigurations(todayDate, threeMonthsFromNow);
      
      fetchTimeslots();
      fetchBookedAssessments();
    }
  }, [authLoading, token, user]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <X className="h-12 w-12 text-red-500 mx-auto" />
          <h6>Access Denied</h6>
          <p className="mt-2 text-gray-600">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h6>Free Assessment Timeslots</h6>
          </div>
          <button
            type="button"
            onClick={() => setIsAvailabilityModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-[#025545] text-white text-sm font-medium rounded-lg hover:bg-[#012f23] transition-colors"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Manage Availability
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <X className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <Check className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-green-800">{success}</span>
            </div>
          </div>
        )}

        {/* Current Availability Display */}
        {Object.keys(availabilityData).length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h6>Current Availability</h6>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(availabilityData)
                .filter(([dateStr, data]) => {
                  // Only show dates that have been configured through the calendar (have timeSlots)
                  if (!data || !data.timeSlots) {
                    return false;
                  }
                  // Filter out past dates
                  return !isPastDate(dateStr);
                })
                .map(([dateStr, data]) => {
                  const date = new Date(dateStr);
                  const allSlots = [
                    ...(data.timeSlots.morning || []),
                    ...(data.timeSlots.noon || []),
                    ...(data.timeSlots.evening || []),
                    ...(data.timeSlots.night || [])
                  ];
                  
                  // Filter out past time slots for today's date
                  const availableSlots = allSlots.filter(slot => {
                    let displayText = slot;
                    if (typeof slot === 'object' && slot !== null) {
                      if (slot.displayTime) {
                        displayText = slot.displayTime;
                      } else if (slot.time) {
                        displayText = slot.time;
                      } else {
                        displayText = JSON.stringify(slot);
                      }
                    }
                    // If it's today, check if the time has passed
                    return !isPastTime(displayText, dateStr);
                  });
                  
                  // Don't show the date card if all slots have passed
                  if (availableSlots.length === 0) {
                    return null;
                  }
                  
                  return (
                    <div key={dateStr} className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="font-medium text-green-800">
                          {date.toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </h5>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditDate(dateStr)}
                            className="text-[#025545] hover:text-[#012f23] text-xs font-medium"
                          >
                            Edit
                          </button>
                        <button
                          type="button"
                          onClick={() => removeAvailability(dateStr)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {availableSlots.map((slot, slotIndex) => {
                          let displayText = slot;
                          if (typeof slot === 'object' && slot !== null) {
                            if (slot.displayTime) {
                              displayText = slot.displayTime;
                            } else if (slot.time) {
                              displayText = slot.time;
                            } else {
                              displayText = JSON.stringify(slot);
                            }
                          }
                          
                          return (
                            <span key={`${dateStr}-${slotIndex}`} className="inline-block px-2 py-1 bg-green-100 text-green-700 rounded text-xs mr-1 mb-1">
                              {displayText}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
                .filter(Boolean)}
            </div>
          </div>
        )}

        {/* Booked Free Assessments */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h6>Booked Free Assessments</h6>
          {bookedAssessments.length === 0 ? (
            <p className="text-sm text-gray-600">No free assessments booked yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Date</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Time</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Client</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Doctor</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Meet Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bookedAssessments.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap">{a.scheduledDate}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{a.scheduledTime}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{a.client ? `${a.client.first_name || ''} ${a.client.last_name || ''}`.trim() : '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {a.psychologist ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {`${a.psychologist.first_name || ''} ${a.psychologist.last_name || ''}`.trim() || 'Assessment Specialist'}
                            </div>
                            {a.psychologist.email && (
                              <div className="text-xs text-gray-500">{a.psychologist.email}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500">Unassigned</span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {a.meetLink ? (
                          <button
                            onClick={() => window.open(a.meetLink, '_blank', 'noopener')}
                            className="inline-flex items-center px-3 py-1.5 bg-[#025545] text-white text-sm font-medium rounded hover:bg-[#012f23] transition-colors"
                          >
                            Copy Meet
                          </button>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Availability Modal */}
        {isAvailabilityModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200/80">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#025545]/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-[#025545]" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900 tracking-tight" role="heading" aria-level={2}>
                      Manage Free Assessment Availability
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Configure which dates and time slots are open for free assessments.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAvailabilityModalOpen(false)}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
          {/* Step Indicator */}
                <div className="flex items-center justify-center mb-5">
            <div className="flex items-center space-x-4">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                      step >= 1 ? 'bg-[#025545] text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                1
              </div>
                    <div className="w-8 h-px bg-slate-200" />
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                      step >= 2 ? 'bg-[#025545] text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                2
              </div>
            </div>
          </div>
          
          {/* Step 1: Date Selection */}
          {step === 1 && (
            <div className="text-center">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                      Step 1 · Select a Date
                    </div>

                    {/* Calendar */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 max-w-xs mx-auto">
                      <div className="flex items-center justify-between mb-3">
                  <button
                          type="button"
                    onClick={handlePrevMonth}
                    className={`p-2 rounded-lg transition-colors ${
                      canGoToPrevMonth() && !loading
                              ? 'hover:bg-slate-100 cursor-pointer'
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                    disabled={!canGoToPrevMonth() || loading}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                        <div className="text-xs font-medium text-slate-900">
                    {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </div>
                  <button
                          type="button"
                    onClick={handleNextMonth}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    disabled={loading}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Days of Week */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                          <div key={`day-header-${index}`} className="text-center text-[10px] font-medium text-slate-500 py-0.5">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-1">
                  {(() => {
                    const { daysInMonth, startingDay } = getDaysInMonth(currentDate);
                    const calendarDays = [];
                    
                          // Empty cells before first day
                    for (let i = 0; i < startingDay; i++) {
                      calendarDays.push(
                              <div key={`empty-${i}`} className="h-7" />
                      );
                    }
                    
                    for (let day = 1; day <= daysInMonth; day++) {
                      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                      const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                      const today = new Date();
                            const isToday =
                              isCurrentMonth &&
                                     day === today.getDate() && 
                                     currentDate.getMonth() === today.getMonth() &&
                                     currentDate.getFullYear() === today.getFullYear();
                      
                      const calendarDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                      const year = calendarDate.getFullYear();
                      const month = String(calendarDate.getMonth() + 1).padStart(2, '0');
                      const dayStr = String(calendarDate.getDate()).padStart(2, '0');
                      const dateStr = `${year}-${month}-${dayStr}`;
                      const isPast = isPastDate(dateStr);
                      const isAvailable = !isPast && isCurrentMonth;
                      
                      const dateAvailability = availabilityData[dateStr];
                      const hasTimeslots = dateAvailability && dateAvailability.timeSlots;

                      calendarDays.push(
                        <div
                          key={`day-${day}`}
                          onClick={() => {
                            if (isAvailable) {
                              handleDateSelect(day);
                            }
                          }}
                                className={`text-center py-1.5 rounded-lg text-[11px] transition-all ${
                            isAvailable 
                                    ? 'cursor-pointer hover:bg-slate-100'
                              : 'cursor-not-allowed opacity-50'
                          } ${
                            hasTimeslots && isAvailable
                              ? 'bg-green-500 text-white hover:bg-green-600' 
                              : isToday && isAvailable
                                ? 'bg-[#025545]/10 text-[#025545] font-semibold'
                                : isAvailable
                                        ? 'text-slate-700'
                                        : 'text-slate-300 bg-slate-50'
                          }`}
                          title={
                            hasTimeslots && isAvailable
                                    ? 'Timeslots configured – Click to edit'
                              : isAvailable 
                                ? 'Click to select' 
                                      : 'Past date – Cannot select'
                          }
                        >
                          {day}
                          {hasTimeslots && isAvailable && (
                                  <div className="w-1 h-1 bg-white rounded-full mx-auto mt-1" />
                          )}
                        </div>
                      );
                    }
                    
                    return calendarDays;
                  })()}
                </div>
              </div>
              
                    <p className="text-xs text-slate-500 mt-3">
                      Click on any future date to configure or edit free assessment slots.
                    </p>
            </div>
          )}
          
          {/* Step 2: Time Selection */}
          {step === 2 && selectedDate && (
            <div className="text-center">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                      Step 2 · Select Time Slots for{' '}
                      <span className="text-slate-900">
                        {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
              
              {/* Time Periods */}
              <div className="max-w-md mx-auto space-y-4">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSelectAllDefaultSlots}
                          className="px-3 py-2 text-[11px] font-medium text-white bg-[#025545] rounded-lg shadow hover:bg-[#012f23] transition-colors"
                  >
                    Select All Default Slots
                  </button>
                </div>
                {Object.entries(timeSlots)
                  .filter(([, times]) => times.length > 0)
                  .map(([period, times]) => {
                    const today = new Date();
                          const selectedDateStr = selectedDate
                            ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
                            : null;
                          const isToday =
                            selectedDateStr &&
                      selectedDate.toDateString() === today.toDateString();
                    
                    const availableTimes = isToday 
                      ? times.filter(time => !isPastTime(time, selectedDateStr))
                      : times;
                    
                    if (availableTimes.length === 0) {
                      return null;
                    }
                    
                    return (
                            <div key={period} className="bg-slate-50 rounded-lg p-4">
                              <div className="mb-3 text-xs font-medium text-slate-700 capitalize">
                                {period}
                              </div>
                        <div className="grid grid-cols-2 gap-2">
                          {availableTimes.map(time => {
                            const timeKey = `${period}:${time}`;
                            const isSelected = selectedTimes.includes(timeKey);
                            
                            return (
                              <button
                                key={timeKey}
                                type="button"
                                onClick={() => handleTimeSelect(timeKey)}
                                      className={`p-2 text-[11px] rounded-lg border transition-colors ${
                                  isSelected
                                    ? 'bg-[#025545] text-white border-[#025545]'
                                          : 'bg-white text-slate-700 border-slate-200 hover:border-[#025545]/40'
                                }`}
                              >
                                {time}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                  .filter(Boolean)}
              </div>
              
              {/* Action Buttons */}
                    <div className="flex justify-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate(null);
                    setSelectedTimes([]);
                    setStep(1);
                  }}
                        className="px-5 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm"
                >
                  Back to Date Selection
                </button>
                
                <button
                  type="button"
                  onClick={goToNextDate}
                  disabled={selectedTimes.length === 0 || loading}
                        className="px-5 py-2 bg-[#025545] text-white rounded-lg hover:bg-[#012f23] transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed text-sm"
                >
                  {loading ? 'Saving...' : 'Next Date'}
                </button>
                
                <button
                  type="button"
                  onClick={saveCurrentDateAvailability}
                  disabled={selectedTimes.length === 0 || loading}
                        className="px-5 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed text-sm"
                >
                  {loading ? 'Saving...' : 'Save & Finish'}
                </button>
              </div>
            </div>
          )}

                {!selectedDate && step === 2 && (
                  <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-sm text-center">
                    Select a date to see available time slots.
          </div>
        )}
                            </div>
                          </div>
            </div>
          )}
      </div>

      {/* Modals removed: editing is done directly via calendar selection */}
    </div>
  );
}
