"use client";
import { useState, useEffect, useMemo } from "react";
import { Calendar, Clock, X, AlertCircle, Package } from "lucide-react";
import { psychologistApi, publicApi } from "../lib/backendApi";
import { useNotification } from "../contexts/NotificationContext";
import { useAuth } from "../contexts/AuthContext";

export default function ScheduleAssessmentSessionModal({ 
  isOpen, 
  onClose, 
  session,
  onScheduleSuccess
}) {
  const { showError, showSuccess } = useNotification();
  const { hasRole } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [availability, setAvailability] = useState({});
  const [doctorId, setDoctorId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignedDoctors, setAssignedDoctors] = useState([]); // [{id, name}]

  useEffect(() => {
    if (isOpen && session) {
      // Reset selections when modal opens
      setSelectedDate(null);
      setSelectedTime(null);
      setCurrentDate(new Date());
      setDoctorId(session.psychologist_id);
      fetchAvailability();
      loadAssignedDoctors();
    }
  }, [isOpen, session]);

  const fetchAvailability = async () => {
    const targetId = doctorId || session?.psychologist_id;
    if (!targetId) return;
    
    setIsLoading(true);
    try {
      // Get availability for the current month
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const startYear = startDate.getFullYear();
      const startMonth = String(startDate.getMonth() + 1).padStart(2, '0');
      const startDay = String(startDate.getDate()).padStart(2, '0');
      const endYear = endDate.getFullYear();
      const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
      const endDay = String(endDate.getDate()).padStart(2, '0');
      
      const response = await psychologistApi.getAvailability({
        startDate: `${startYear}-${startMonth}-${startDay}`,
        endDate: `${endYear}-${endMonth}-${endDay}`,
        psychologist_id: targetId
      });

      const availData = response.data || [];
      const availabilityMap = {};
      
      availData.forEach(item => {
        if (item.date && item.time_slots && item.time_slots.length > 0) {
          availabilityMap[item.date] = item.time_slots.filter(slot => {
            // Filter out blocked slots
            return !item.blocked_slots || !item.blocked_slots.includes(slot);
          });
        }
      });
      
      setAvailability(availabilityMap);
    } catch (error) {
      console.error('Error fetching availability:', error);
      showError('Failed to load availability', 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAssignedDoctors = async () => {
    try {
      // Load ALL psychologists from the system (not just assigned ones)
      // This allows any psychologist to schedule sessions with any psychologist
      const res = await publicApi.getPsychologists();
      const all = res?.data?.psychologists || [];
      
      // Map all psychologists to dropdown options
      const mapped = all.map(doc => ({
        id: doc.id || doc.user_id,
        name: doc.name || `${doc.first_name || ''} ${doc.last_name || ''}`.trim() || doc.email || 'Psychologist'
      })).filter(d => d.id); // Remove any without valid ID
      
      setAssignedDoctors(mapped);
      
      // Set default to current psychologist if session has one, otherwise first in list
      if (session?.psychologist_id && !doctorId) {
        setDoctorId(session.psychologist_id);
      } else if (mapped.length > 0 && !doctorId) {
        setDoctorId(mapped[0].id);
      }
    } catch (e) {
      console.warn('Failed to load psychologists:', e);
      setAssignedDoctors([]);
    }
  };

  useEffect(() => {
    if (isOpen && session) {
      fetchAvailability();
    }
  }, [currentDate, isOpen, session, doctorId]);

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    return { daysInMonth, startingDay };
  };

  const dateStr = (d) => {
    if (!d) return '';
    if (typeof d === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
      return d.split('T')[0];
    }
    const date = d instanceof Date ? d : new Date(d);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handlePrevMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    setCurrentDate(newDate);
    setSelectedDate(null);
    setSelectedTime(null);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    setCurrentDate(newDate);
    setSelectedDate(null);
    setSelectedTime(null);
  };

  const handleDateSelect = (day) => {
    const newSelectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(newSelectedDate);
    setSelectedTime(null);
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) {
      showError('Please select a date and time', 'Selection Required');
      return;
    }

    if (!doctorId) {
      showError('Please select a psychologist', 'Selection Required');
      return;
    }

    setIsSubmitting(true);
    try {
      const scheduleData = {
        scheduled_date: dateStr(selectedDate),
        scheduled_time: selectedTime,
        target_psychologist_id: doctorId // Always required - assign to selected psychologist
      };

      await psychologistApi.scheduleAssessmentSession(session.id, scheduleData);
      
      showSuccess('Assessment session scheduled successfully!', 'Success');
      onScheduleSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error scheduling assessment session:', error);
      showError(error.message || 'Failed to schedule session', 'Schedule Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !session) return null;

  const daysInMonth = getDaysInMonth();
  const today = new Date();
  const todayStr = dateStr(today);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Package className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Schedule Assessment Session
              </h2>
              <p className="text-sm text-gray-600">
                Select a date and time for this assessment session
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
        <div className="p-4 sm:p-6 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Client</label>
              <p className="text-sm text-gray-900">
                {session.client?.first_name} {session.client?.last_name}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Assessment</label>
              <p className="text-sm text-gray-900">
                {session.assessment_title || session.assessment?.hero_title || 'Assessment'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Status</label>
              <p className="text-sm text-gray-900">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  Pending Schedule
                </span>
              </p>
            </div>
            <div className="sm:col-span-3">
              <label className="text-sm font-medium text-gray-700">Select Doctor</label>
              {assignedDoctors && assignedDoctors.length > 0 ? (
                <div className="flex gap-2 items-center">
                  <select
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={doctorId || ''}
                    onChange={(e)=> setDoctorId(e.target.value || null)}
                  >
                    {assignedDoctors.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={fetchAvailability}
                    className="mt-1 px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                  >
                    Load Availability
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={doctorId || ''}
                    onChange={(e)=> setDoctorId(e.target.value.trim() || null)}
                    placeholder="Psychologist ID"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={fetchAvailability}
                    className="mt-1 px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                  >
                    Load Availability
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">Select any psychologist from the system to schedule this session with.</p>
            </div>
          </div>
        </div>

        {/* Calendar and Time Slots */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Calendar */}
            <div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-3">
                  <button 
                    onClick={handlePrevMonth}
                    className="px-2 py-1 border rounded hover:bg-gray-50"
                  >
                    &lt;
                  </button>
                  <div className="text-sm font-medium">
                    {currentDate.toLocaleString('default', { month: 'long' })} {currentDate.getFullYear()}
                  </div>
                  <button 
                    onClick={handleNextMonth}
                    className="px-2 py-1 border rounded hover:bg-gray-50"
                  >
                    &gt;
                  </button>
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 text-gray-600">
                  {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                    <div key={d} className="p-1">{d}</div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: daysInMonth.startingDay }).map((_, idx) => (
                    <div key={`pad-${idx}`} />
                  ))}
                  {Array.from({ length: daysInMonth.daysInMonth }).map((_, idx) => {
                    const day = idx + 1;
                    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                    const ds = dateStr(date);
                    const hasAvailability = Array.isArray(availability[ds]) && availability[ds].length > 0;
                    const isPast = ds < todayStr;
                    const isSelected = selectedDate && dateStr(selectedDate) === ds;

                    return (
                      <button
                        key={day}
                        type="button"
                        disabled={!hasAvailability || isPast}
                        onClick={() => handleDateSelect(day)}
                        className={`rounded-md py-2 text-sm border ${
                          isSelected 
                            ? 'bg-purple-600 text-white border-purple-600' 
                            : hasAvailability && !isPast 
                              ? 'border-gray-300 hover:bg-gray-50 bg-blue-50' 
                              : 'border-gray-200 text-gray-300 cursor-not-allowed'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Time Slots */}
            <div>
              {selectedDate ? (
                <>
                  <div className="text-sm font-medium text-gray-900 mb-4">
                    Available times{hasRole && hasRole('client') ? ' (IST)' : ''} for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </div>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                      {(availability[dateStr(selectedDate)] || []).map((time) => (
                        <button
                          key={time}
                          type="button"
                          onClick={() => setSelectedTime(time)}
                          className={`p-2 rounded-lg border text-xs transition-all duration-200 w-full h-10 flex items-center justify-center ${
                            selectedTime === time
                              ? 'bg-purple-600 text-white border-purple-600'
                              : 'border-gray-300 bg-white hover:border-gray-400 text-gray-700'
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                    {(!availability[dateStr(selectedDate)] || availability[dateStr(selectedDate)].length === 0) && (
                      <div className="text-center text-sm text-gray-500 py-8">
                        No times available for this date
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-gray-500">
                  Select a date to see available times
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-4 sm:p-6 border-t border-gray-200 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedDate || !selectedTime || isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Scheduling...' : 'Schedule Session'}
          </button>
        </div>
      </div>
    </div>
  );
}

