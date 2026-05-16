"use client";
import { useState, useEffect } from "react";
import { X, Calendar, Clock, AlertCircle, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useNotification } from "../contexts/NotificationContext";
import { getStoredToken } from "@/lib/authStorage";

export default function TimeBlockingModal({ isOpen, onClose, onBlock }) {
  const { showError, showSuccess } = useNotification();
  const [blockingType, setBlockingType] = useState('whole_day');
  const [isLoading, setIsLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [datesWithSlots, setDatesWithSlots] = useState(new Set());
  
  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        type: 'whole_day',
        date: '',
        startDate: '',
        endDate: '',
        timeSlots: [],
        reason: ''
      });
      setAvailableSlots([]);
      setCurrentMonth(new Date());
    }
  }, [isOpen]);
  
  // Form data
  const [formData, setFormData] = useState({
    type: 'whole_day',
    date: '',
    startDate: '',
    endDate: '',
    timeSlots: [],
    reason: ''
  });

  // Debug formData changes
  useEffect(() => {
    console.log('FormData changed:', formData);
  }, [formData]);
  
  // Debug availableSlots changes
  useEffect(() => {
    console.log('AvailableSlots changed:', availableSlots);
  }, [availableSlots]);

  // Fetch all availability for current month to highlight dates with slots
  const fetchMonthAvailability = async () => {
    try {
      const token = getStoredToken();
      if (!token) return;

      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      
      // Get first and last day of month
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api'}/psychologists/availability?start_date=${startDate}&end_date=${endDate}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const availabilityData = data.data || data;
        
        // Extract dates that have time slots
        const datesWithAvailability = new Set();
        availabilityData.forEach(day => {
          if (day.time_slots && day.time_slots.length > 0) {
            datesWithAvailability.add(day.date);
          }
        });
        
        setDatesWithSlots(datesWithAvailability);
        console.log('Dates with slots:', Array.from(datesWithAvailability));
      }
    } catch (error) {
      console.error('Error fetching month availability:', error);
    }
  };

  // Fetch month availability when month changes
  useEffect(() => {
    if (isOpen) {
      fetchMonthAvailability();
    }
  }, [currentMonth, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const blockingData = {
        type: blockingType,
        reason: formData.reason || 'Personal Time'
      };

      // Add type-specific data
      switch (blockingType) {
        case 'whole_day':
          if (!formData.date) {
            showError('Please select a date');
            return;
          }
          blockingData.date = formData.date;
          break;

        case 'multiple_days':
          if (!formData.startDate || !formData.endDate) {
            showError('Please select start and end dates');
            return;
          }
          blockingData.startDate = formData.startDate;
          blockingData.endDate = formData.endDate;
          break;

        case 'specific_slots':
          if (!formData.date || formData.timeSlots.length === 0) {
            showError('Please select a date and at least one time slot');
            return;
          }
          blockingData.date = formData.date;
          blockingData.timeSlots = formData.timeSlots;
          break;
      }

      console.log('🚫 Sending blocking data:', blockingData);
      await onBlock(blockingData);
      showSuccess('Time slots blocked successfully');
      
      // Reset form only after successful blocking
      setFormData({
        type: 'whole_day',
        date: '',
        startDate: '',
        endDate: '',
        timeSlots: [],
        reason: ''
      });
      
      onClose();

    } catch (error) {
      showError(error.message || 'Failed to block time slots');
    } finally {
      setIsLoading(false);
    }
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour < 18; hour++) {
      const timeSlot = `${hour.toString().padStart(2, '0')}:00-${(hour + 1).toString().padStart(2, '0')}:00`;
      slots.push(timeSlot);
    }
    return slots;
  };

  // Fetch available slots for a specific date
  const fetchAvailableSlots = async (date) => {
    try {
      console.log('Fetching available slots for date:', date);
      
      setIsLoadingSlots(true);
      const token = getStoredToken();
      if (!token) {
        console.log('No token found');
        showError('Please log in to view available slots');
        return;
      }

      console.log('Making API call to:', `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api'}/psychologists/availability?date=${date}`);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api'}/psychologists/availability?date=${date}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('API response status:', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          console.log('Unauthorized - no valid token');
          showError('Please log in to view available slots');
          return;
        }
        const errorText = await response.text();
        console.log('API error response:', errorText);
        throw new Error('Failed to fetch available slots');
      }

      const data = await response.json();
      console.log('Available slots data:', data);
      
      // The backend returns availability directly, not wrapped in data.data
      let availabilityData = data.data || data;
      console.log('Availability data:', availabilityData);
      
      // Find the availability for the selected date
      const dayAvailability = availabilityData.find(day => day.date === date);
      console.log('Day availability found:', dayAvailability);
      
      const availableTimeSlots = dayAvailability?.time_slots || [];
      console.log('Available time slots for', date, ':', availableTimeSlots);
      setAvailableSlots(availableTimeSlots);
      
      // Update form data with selected date
      setFormData(prev => ({
        ...prev,
        date: date,
        timeSlots: [] // Reset selected time slots
      }));
      
    } catch (error) {
      console.error('Error fetching available slots:', error);
      showError('Failed to fetch available slots');
      setAvailableSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  // Calendar navigation
  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(prev.getMonth() + direction);
      return newMonth;
    });
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    // Get current IST date
    const now = new Date();
    const istOffset = 5.5 * 60; // IST is UTC+5:30
    const istTime = new Date(now.getTime() + (istOffset * 60 * 1000));
    const istToday = new Date(istTime.getFullYear(), istTime.getMonth(), istTime.getDate());
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const isCurrentMonth = date.getMonth() === month;
      const isPast = date < istToday;
      const isToday = date.toDateString() === istToday.toDateString();
      
      // Create date string in YYYY-MM-DD format
      const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      // Check if this date has available slots (only for future dates)
      const hasSlots = !isPast && datesWithSlots.has(dateString);
      
      days.push({
        date: dateString,
        day: date.getDate(),
        isCurrentMonth,
        isPast,
        isToday,
        hasSlots
      });
    }
    
    return days;
  };

  // Handle date selection
  const handleDateSelect = (date) => {
    console.log('Date selected:', date);
    setFormData(prev => ({ ...prev, date }));
    fetchAvailableSlots(date);
  };

  // Helper function to check if a time slot is selected (handles both formats)
  const isTimeSlotSelected = (timeSlot) => {
    const convertToTimeRange = (slot) => {
      // If it's already in range format, return as-is
      if (slot.includes('-')) {
        return slot;
      }
      
      // If it's in HH:MM format, convert to HH:MM-HH:MM
      if (slot.match(/^\d{1,2}:\d{2}$/)) {
        const [hours, minutes] = slot.split(':');
        const hour = parseInt(hours);
        const nextHour = hour + 1;
        return `${slot}-${nextHour.toString().padStart(2, '0')}:${minutes}`;
      }
      
      // Return as-is if format is not recognized
      return slot;
    };

    const timeRangeSlot = convertToTimeRange(timeSlot);
    return formData.timeSlots.some(slot => {
      const slotRange = convertToTimeRange(slot);
      return slotRange === timeRangeSlot;
    });
  };

  // Handle time slot toggle for blocking
  const handleTimeSlotToggle = (timeSlot) => {
    // Convert single time format (HH:MM) to range format (HH:MM-HH:MM) for blocking
    const convertToTimeRange = (slot) => {
      // If it's already in range format, return as-is
      if (slot.includes('-')) {
        return slot;
      }
      
      // If it's in HH:MM format, convert to HH:MM-HH:MM
      if (slot.match(/^\d{1,2}:\d{2}$/)) {
        const [hours, minutes] = slot.split(':');
        const hour = parseInt(hours);
        const nextHour = hour + 1;
        return `${slot}-${nextHour.toString().padStart(2, '0')}:${minutes}`;
      }
      
      // Return as-is if format is not recognized
      return slot;
    };

    const timeRangeSlot = convertToTimeRange(timeSlot);
    
    setFormData(prev => {
      // Check if this slot (in either format) is already selected
      const isSelected = prev.timeSlots.some(slot => {
        const slotRange = convertToTimeRange(slot);
        return slotRange === timeRangeSlot;
      });
      
      const newTimeSlots = isSelected
        ? prev.timeSlots.filter(slot => {
            const slotRange = convertToTimeRange(slot);
            return slotRange !== timeRangeSlot;
          })
        : [...prev.timeSlots, timeRangeSlot];
      
      // Automatically switch to specific_slots type when time slots are selected
      const newType = newTimeSlots.length > 0 ? 'specific_slots' : prev.type;
      
      return {
        ...prev,
        type: newType,
        timeSlots: newTimeSlots
      };
    });
  };

  // Format time slot for display (simple format like therapist profile)
  const formatTimeSlot = (timeSlot) => {
    // If it's already in display format (like "9:00 AM"), return as-is
    if (timeSlot.includes('AM') || timeSlot.includes('PM')) {
      return timeSlot;
    }
    
    // Convert from "09:00" format to "9:00 AM" format
    const [hours, minutes] = timeSlot.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Block Time Slots</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Blocking Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Blocking Type
            </label>
            <div className="space-y-2">
              {[
                { value: 'whole_day', label: 'Whole Day', icon: Calendar },
                { value: 'multiple_days', label: 'Multiple Days', icon: Calendar },
                { value: 'specific_slots', label: 'Specific Time Slots', icon: Clock }
              ].map(({ value, label, icon: Icon }) => (
                <label key={value} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="blockingType"
                    value={value}
                    checked={blockingType === value}
                    onChange={(e) => setBlockingType(e.target.value)}
                    className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                  />
                  <Icon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Calendar View */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Calendar */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Date</h3>
              
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() => navigateMonth(-1)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-500" />
                </button>
                <h4 className="text-lg font-semibold text-gray-900">
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h4>
                <button
                  type="button"
                  onClick={() => navigateMonth(1)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {generateCalendarDays().map((day, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => !day.isPast && handleDateSelect(day.date)}
                    disabled={day.isPast}
                    className={`
                      p-2 text-sm rounded-lg transition-colors relative
                      ${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                      ${day.isPast ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-100'}
                      ${day.isToday ? 'bg-blue-100 text-blue-600 font-semibold' : ''}
                      ${formData.date === day.date ? 'bg-red-100 text-red-600 font-semibold' : ''}
                      ${day.hasSlots && formData.date !== day.date && !day.isPast ? 'bg-green-50 text-green-700 border border-green-200' : ''}
                    `}
                  >
                    <span className="relative">
                      {day.day}
                      {day.hasSlots && !day.isPast && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Time Slots Selection */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Time Slots</h3>
              
              {formData.date ? (
                <div>
                  {isLoadingSlots ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                      <p className="text-gray-500 mt-2">Loading available slots...</p>
                    </div>
                  ) : availableSlots.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <p className="font-bold text-gray-800 text-sm">TIME SLOTS</p>
                        <span className="font-bold text-gray-800 text-sm">Available: {availableSlots.length}</span>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-green-700">Available Times:</p>
                        <div className="grid grid-cols-3 md:grid-cols-5 gap-1">
                          {availableSlots.map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => handleTimeSlotToggle(slot)}
                              className={`p-2 rounded-lg border text-xs transition-all duration-200 w-full h-10 flex items-center justify-center ${
                                isTimeSlotSelected(slot)
                                  ? 'border-red-500 bg-red-50 text-red-700' 
                                  : 'border-gray-300 bg-white hover:border-gray-400 text-gray-700'
                              }`}
                            >
                              {formatTimeSlot(slot)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No available slots for this date</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>Select a date to view available time slots</p>
                </div>
              )}
            </div>
          </div>


          {/* Multiple Days */}
          {blockingType === 'multiple_days' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  min={formData.startDate || new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  required
                />
              </div>
            </div>
          )}


          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason (Optional)
            </label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="e.g., Personal emergency, Vacation, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          {/* Warning */}
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-red-800">Important</h4>
                <p className="text-sm text-red-700 mt-1">
                  Blocked time slots will be automatically synced to your Google Calendar and will prevent bookings across all platforms.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Blocking...
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" />
                  Block Time
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
