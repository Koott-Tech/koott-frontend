'use client';

import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  X, 
  CheckCircle, 
  AlertCircle,
  User,
  CalendarDays,
  Loader2
} from 'lucide-react';
import { adminApi } from '@/lib/backendApi';
import { useNotification } from '@/contexts/NotificationContext';

export default function AdminRescheduleModal({ 
  isOpen, 
  onClose, 
  session, 
  onRescheduleSuccess 
}) {
  const { showError, showSuccess } = useNotification();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [reason, setReason] = useState('');
  const [psychologistAvailability, setPsychologistAvailability] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date());

  // Calendar helpers (match client dashboard style)
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

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen && session) {
      setSelectedDate('');
      setSelectedTime('');
      setReason('');
      setError(null);
      // Reset calendar to current month
      setCurrentDate(new Date());
      fetchPsychologistAvailability();
    }
  }, [isOpen, session]);

  const fetchPsychologistAvailability = async (baseDate = currentDate) => {
    if (!session?.psychologist_id) return;

    setIsLoadingAvailability(true);
    setError(null);

    try {
      // Get current month and next month based on provided date
      const year = baseDate.getFullYear();
      const month = baseDate.getMonth();
      
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month + 2).padStart(2, '0')}-01`;
      
      console.log('Fetching availability for psychologist:', session.psychologist_id);
      console.log('Date range:', startDate, 'to', endDate);
      
      const response = await adminApi.getPsychologistAvailabilityForReschedule(
        session.psychologist_id, 
        startDate, 
        endDate
      );
      
      if (response.success) {
        // Convert array to object with date keys
        const availabilityObject = {};
        response.data.availability.forEach(dayAvailability => {
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
      setIsLoadingAvailability(false);
    }
  };

  const handleReschedule = async () => {
    if (!selectedDate || !selectedTime) {
      setError('Please select a date and time');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const rescheduleData = {
        new_date: selectedDate,
        new_time: convertTo24Hour(selectedTime),
        reason: reason || 'Admin rescheduled'
      };

      console.log('Rescheduling session:', session.id, 'with data:', rescheduleData);
      console.log('Time conversion:', {
        original: selectedTime,
        converted: convertTo24Hour(selectedTime)
      });

      const response = await adminApi.rescheduleSession(session.id, rescheduleData);

      if (response.success) {
        showSuccess('Session rescheduled successfully!', 'Reschedule Success');
        onRescheduleSuccess?.(response.data);
        onClose();
      } else {
        setError(response.message || 'Failed to reschedule session');
      }
    } catch (error) {
      console.error('Reschedule error:', error);
      setError(error.message || 'Failed to reschedule session');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    // If the time already contains AM/PM, return it as is
    if (timeString.includes('AM') || timeString.includes('PM')) {
      return timeString;
    }
    
    // Otherwise, convert from 24-hour format to 12-hour format
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const convertTo24Hour = (timeString) => {
    // If the time already doesn't contain AM/PM, return it as is (already 24-hour)
    if (!timeString.includes('AM') && !timeString.includes('PM')) {
      return timeString;
    }
    
    // Convert from 12-hour format to 24-hour format
    const [time, ampm] = timeString.split(' ');
    const [hours, minutes] = time.split(':');
    let hour = parseInt(hours);
    
    if (ampm === 'AM' && hour === 12) {
      hour = 0;
    } else if (ampm === 'PM' && hour !== 12) {
      hour += 12;
    }
    
    return `${hour.toString().padStart(2, '0')}:${minutes}:00`;
  };

  const getAvailableSlots = (date) => {
    const dayAvailability = psychologistAvailability[date];
    if (!dayAvailability || !dayAvailability.is_available) {
      return [];
    }
    return dayAvailability.available_slots || [];
  };

  const isSlotAvailable = (date, time) => {
    const slots = getAvailableSlots(date);
    return slots.includes(time);
  };

  const handleDateSelect = (day) => {
    // Convert selected day in current month to YYYY-MM-DD string
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const dateObj = new Date(year, month, day);
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    setSelectedDate(dateStr);
    setSelectedTime(''); // Reset time when date changes
  };

  const handlePrevMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    setCurrentDate(newDate);
    fetchPsychologistAvailability(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    setCurrentDate(newDate);
    fetchPsychologistAvailability(newDate);
  };

  const handleTimeSelect = (time) => {
    setSelectedTime(time);
  };

  if (!isOpen || !session) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-500">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-500" 
        onClick={onClose} 
        aria-hidden="true" 
      />
      
      {/* Modal Container */}
      <div className="relative bg-white rounded-[2.5rem] shadow-[0_25px_70px_rgba(0,0,0,0.3)] max-w-5xl w-full max-h-[95vh] flex flex-col overflow-hidden transform transition-all duration-500 scale-100 border border-white/20 animate-in zoom-in-95">
        
        {/* Premium Header */}
        <div className="flex-shrink-0 relative overflow-hidden bg-gradient-to-r from-[#3f2e73] to-[#5d44a8] px-8 py-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 shadow-inner">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 role="heading" aria-level={2} className="text-xl font-bold text-white tracking-tight">Reschedule Session</h2>
                <p className="text-white/70 text-xs font-medium mt-0.5">Modify date and time settings</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-300 backdrop-blur-md active:scale-95"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Quick Session Overview Card */}
        <div className="flex-shrink-0 px-8 py-5 bg-slate-50 border-b border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                <User className="h-5 w-5 text-[#3f2e73]" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Client</p>
                <p className="text-sm font-bold text-slate-900 truncate">
                  {session.client?.child_name ||
                    `${session.client?.first_name || ''} ${session.client?.last_name || ''}`.trim()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                <UserCheck className="h-5 w-5 text-indigo-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Specialist</p>
                <p className="text-sm font-bold text-slate-900 truncate">
                  {session.psychologist?.first_name} {session.psychologist?.last_name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-sm">
                <Clock className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Current Plan</p>
                <p className="text-sm font-bold text-indigo-900">
                  {formatDate(session.scheduled_date)} at {formatTime(session.scheduled_time)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50/30">
          {isLoadingAvailability ? (
            <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-700">
              <div className="relative">
                <div className="h-20 w-20 rounded-full border-4 border-indigo-100 animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-10 w-10 animate-spin text-[#3f2e73]" />
                </div>
              </div>
              <span className="mt-6 text-slate-500 font-bold text-sm tracking-wide">Syncing availability matrix...</span>
            </div>
          ) : (
            <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* Left Column: Calendar Matrix (7 columns span) */}
              <div className="lg:col-span-7 space-y-6">
                {error && (
                  <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center gap-3 animate-bounce">
                    <AlertCircle className="h-5 w-5 text-rose-500 flex-shrink-0" />
                    <p className="text-rose-800 text-sm font-bold">{error}</p>
                  </div>
                )}
                
                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/40 p-6 overflow-hidden">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <CalendarDays className="h-5 w-5 text-[#3f2e73]" />
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Availability Matrix</h3>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={handlePrevMonth}
                        className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-600 active:scale-90"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M15 18l-6-6 6-6" />
                        </svg>
                      </button>
                      <span className="px-4 text-xs font-black text-slate-900 min-w-[120px] text-center">
                        {getMonthName(currentDate).toUpperCase()}
                      </span>
                      <button
                        type="button"
                        onClick={handleNextMonth}
                        className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-600 active:scale-90"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-3 mb-4">
                    {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day) => (
                      <div key={day} className="text-center text-[10px] font-black text-slate-400 tracking-tighter">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-3">
                    {(() => {
                      const { daysInMonth, startingDay } = getDaysInMonth(currentDate);
                      const today = new Date();
                      const todayY = today.getFullYear();
                      const todayM = today.getMonth();
                      const todayD = today.getDate();
                      const cells = [];
                      
                      for (let i = 0; i < startingDay; i++) {
                        cells.push(<div key={`empty-${i}`} className="aspect-square" />);
                      }
                      
                      for (let day = 1; day <= daysInMonth; day++) {
                        const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                        const year = dateObj.getFullYear();
                        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                        const dayStr = String(day).padStart(2, '0');
                        const dateStr = `${year}-${month}-${dayStr}`;
                        const isToday = year === todayY && dateObj.getMonth() === todayM && day === todayD;
                        const isSelected = selectedDate === dateStr;
                        const startOfToday = new Date(todayY, todayM, todayD);
                        const startOfCell = new Date(year, dateObj.getMonth(), day);
                        const isPastDate = startOfCell < startOfToday;
                        const availability = psychologistAvailability[dateStr];
                        const hasSlots = !!availability && availability.is_available && 
                                       Array.isArray(availability.available_slots) && 
                                       availability.available_slots.length > 0;
                        const isClickable = !isPastDate && hasSlots;

                        let styleClasses = 'relative aspect-square flex flex-col items-center justify-center rounded-2xl text-xs font-bold transition-all duration-300 border-2 ';
                        
                        if (isSelected) {
                          styleClasses += 'bg-[#3f2e73] text-white border-[#3f2e73] shadow-lg shadow-[#3f2e73]/30 scale-105 z-10';
                        } else if (isClickable) {
                          styleClasses += isToday 
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:border-indigo-400 hover:scale-105' 
                            : 'bg-white text-slate-900 border-slate-100 hover:border-indigo-300 hover:scale-105 shadow-sm';
                        } else if (isPastDate) {
                          styleClasses += 'bg-slate-50 text-slate-300 border-transparent cursor-not-allowed opacity-40';
                        } else {
                          styleClasses += 'bg-white text-slate-300 border-slate-50 cursor-not-allowed';
                        }

                        cells.push(
                          <button
                            key={`day-${day}`}
                            type="button"
                            onClick={() => isClickable && handleDateSelect(day)}
                            disabled={!isClickable}
                            className={styleClasses}
                          >
                            <span>{day}</span>
                            {hasSlots && !isSelected && (
                              <span className="absolute bottom-1.5 h-1 w-3 bg-indigo-500 rounded-full" />
                            )}
                          </button>
                        );
                      }
                      return cells;
                    })()}
                  </div>
                </div>
              </div>

              {/* Right Column: Time Selection & Meta (5 columns span) */}
              <div className="lg:col-span-5 flex flex-col gap-8">
                {/* Time Selection */}
                <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <Clock className="h-5 w-5 text-indigo-600" />
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Select Time Slot</h3>
                  </div>
                  
                  {!selectedDate ? (
                    <div className="py-12 text-center">
                      <div className="h-16 w-16 bg-slate-50 rounded-3xl mx-auto flex items-center justify-center mb-4">
                        <CalendarDays className="h-8 w-8 text-slate-200" />
                      </div>
                      <p className="text-slate-400 font-bold text-xs uppercase tracking-wider">Pick a date first</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                      {getAvailableSlots(selectedDate).map((time) => (
                        <button
                          key={time}
                          onClick={() => handleTimeSelect(time)}
                          className={`
                            py-4 px-3 rounded-2xl text-center font-bold text-sm transition-all duration-300 border-2
                            ${selectedTime === time
                              ? 'bg-[#3f2e73] text-white border-[#3f2e73] shadow-lg shadow-[#3f2e73]/20'
                              : 'bg-white text-slate-700 border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30'
                            }
                          `}
                        >
                          {formatTime(time)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reason Field */}
                <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <Tag className="h-5 w-5 text-indigo-600" />
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Internal Memo</h3>
                  </div>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Briefly describe the reason for this schedule change..."
                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium resize-none outline-none"
                    rows={4}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Premium Footer */}
        <div className="flex-shrink-0 flex items-center justify-end gap-4 px-10 py-6 border-t border-slate-100 bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
          <button
            onClick={onClose}
            className="px-8 py-3.5 text-sm font-bold text-slate-400 hover:text-slate-900 transition-all duration-200"
          >
            Discard
          </button>
          <button
            onClick={handleReschedule}
            disabled={!selectedDate || !selectedTime || isLoading}
            className={`
              px-10 py-3.5 rounded-2xl transition-all duration-300 flex items-center gap-3 text-sm font-black uppercase tracking-widest shadow-xl
              ${!selectedDate || !selectedTime || isLoading
                ? 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-[#3f2e73] to-[#5d44a8] text-white hover:shadow-indigo-200 active:scale-95'
              }
            `}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Syncing...</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5" />
                <span>Confirm Change</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
