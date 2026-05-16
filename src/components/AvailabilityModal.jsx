"use client";
import { useState, useEffect } from "react";
import { X, Calendar, Clock, Plus, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useNotification } from "../contexts/NotificationContext";
import { getStoredToken } from "@/lib/authStorage";

export default function AvailabilityModal({ isOpen, onClose, onAddAvailability }) {
  const { showError, showSuccess } = useNotification();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState('');
  const [existingSlots, setExistingSlots] = useState([]);
  const [selectedSlots, setSelectedSlots] = useState([]);
  
  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedDate('');
      setExistingSlots([]);
      setSelectedSlots([]);
    }
  }, [isOpen]);

  // Fetch existing availability for a specific date
  const fetchExistingAvailability = async (date) => {
    try {
      setIsLoadingSlots(true);
      const token = getStoredToken();
      if (!token) {
        showError('Please log in to view availability');
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api'}/psychologists/availability?date=${date}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          showError('Please log in to view availability');
          return;
        }
        throw new Error('Failed to fetch existing availability');
      }

      const data = await response.json();
      const daySlots = data.data?.find(day => day.date === date);
      setExistingSlots(daySlots?.time_slots || []);
      setSelectedSlots([]); // Reset selected slots when changing date
    } catch (error) {
      console.error('Error fetching existing availability:', error);
      showError('Failed to fetch existing availability');
      setExistingSlots([]);
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const isCurrentMonth = date.getMonth() === month;
      const isPast = date < today;
      const isToday = date.getTime() === today.getTime();
      
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      
      days.push({
        date: `${y}-${m}-${d}`,
        day: date.getDate(),
        isCurrentMonth,
        isPast,
        isToday
      });
    }
    
    return days;
  };

  // Handle date selection
  const handleDateSelect = (date) => {
    setSelectedDate(date);
    fetchExistingAvailability(date);
  };

  // Generate time slots (9 AM to 6 PM)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour < 18; hour++) {
      const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
      slots.push(timeSlot);
    }
    return slots;
  };

  // Handle time slot toggle
  const handleTimeSlotToggle = (timeSlot) => {
    setSelectedSlots(prev => 
      prev.includes(timeSlot)
        ? prev.filter(slot => slot !== timeSlot)
        : [...prev, timeSlot]
    );
  };

  // Format time slot for display
  const formatTimeSlot = (timeSlot) => {
    const [hours, minutes] = timeSlot.split(':');
    const hour = parseInt(hours);
    const nextHour = hour + 1;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const nextAmpm = nextHour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const displayNextHour = nextHour === 0 ? 12 : nextHour > 12 ? nextHour - 12 : nextHour;
    return `${displayHour}:${minutes} ${ampm} - ${displayNextHour}:${minutes} ${nextAmpm}`;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedDate) {
      showError('Please select a date');
      return;
    }
    
    if (selectedSlots.length === 0) {
      showError('Please select at least one time slot');
      return;
    }

    setIsLoading(true);
    
    try {
      const availabilityData = {
        date: selectedDate,
        time_slots: [...existingSlots, ...selectedSlots] // Combine existing and new slots
      };

      await onAddAvailability(availabilityData, existingSlots.length > 0);
      showSuccess(existingSlots.length > 0 ? 'Availability updated successfully' : 'Availability added successfully');
      onClose();
      
      // Reset form
      setSelectedDate('');
      setExistingSlots([]);
      setSelectedSlots([]);
    } catch (error) {
      showError(error.message || 'Failed to add availability');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Plus className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Add Availability</h2>
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
                      p-2 text-sm rounded-lg transition-colors
                      ${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                      ${day.isPast ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-100'}
                      ${day.isToday ? 'bg-blue-100 text-blue-600 font-semibold' : ''}
                      ${selectedDate === day.date ? 'bg-green-100 text-green-600 font-semibold' : ''}
                    `}
                  >
                    {day.day}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Slots Selection */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Time Slots</h3>
              
              {selectedDate ? (
                <div>
                  {/* Existing Slots */}
                  {existingSlots.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Existing Availability</h4>
                      <div className="space-y-1">
                        {existingSlots.map((slot, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-gray-700">{formatTimeSlot(slot)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Available Time Slots */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Add New Time Slots</h4>
                    {isLoadingSlots ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                        <p className="text-gray-500 mt-2">Loading existing availability...</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {generateTimeSlots()
                          .filter(slot => !existingSlots.includes(slot)) // Filter out existing slots
                          .map((slot, index) => (
                          <label key={index} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={selectedSlots.includes(slot)}
                              onChange={() => handleTimeSlotToggle(slot)}
                              className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                            />
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">
                              {formatTimeSlot(slot)}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>Select a date to add availability</p>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !selectedDate || selectedSlots.length === 0}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Availability
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
