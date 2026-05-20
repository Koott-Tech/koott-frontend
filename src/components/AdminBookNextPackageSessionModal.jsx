'use client';

import { useState, useEffect } from 'react';
import { X, CalendarDays, Clock, User, UserCheck, Package, Loader2 } from 'lucide-react';
import { adminApi } from '@/lib/backendApi';
import { useNotification } from '@/contexts/NotificationContext';

function normRel(r) {
  return (Array.isArray(r) ? r[0] : r) ?? null;
}

function formatTimeDisplay(timeString) {
  if (!timeString) return '';
  if (timeString.includes('AM') || timeString.includes('PM')) return timeString;
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes || '00'} ${ampm}`;
}

function to24Hour(timeString) {
  if (!timeString) return '';
  if (!timeString.includes('AM') && !timeString.includes('PM')) {
    return timeString.length === 5 ? `${timeString}:00` : timeString;
  }
  const [time, ampm] = timeString.split(' ');
  const [hours, minutes] = time.split(':');
  let hour = parseInt(hours, 10);
  if (ampm === 'AM' && hour === 12) hour = 0;
  else if (ampm === 'PM' && hour !== 12) hour += 12;
  return `${String(hour).padStart(2, '0')}:${minutes || '00'}:00`;
}

function getDaysInMonth(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  return {
    daysInMonth: lastDay.getDate(),
    startingDay: firstDay.getDay()
  };
}

export default function AdminBookNextPackageSessionModal({ isOpen, onClose, session, onSuccess }) {
  const { showError, showSuccess } = useNotification();
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [psychologistAvailability, setPsychologistAvailability] = useState({});
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateObj, setSelectedDateObj] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');

  const clientId = session?.client_id ?? normRel(session?.client)?.id;
  const psychologistId = session?.psychologist_id ?? normRel(session?.psychologist)?.id;
  const packageId = session?.package_id ?? session?.package?.id;
  const pkg = session?.package || {};
  const totalSessions = pkg.total_sessions ?? pkg.session_count ?? 0;
  const completedSessions = pkg.completed_sessions ?? 0;
  const remainingSessions = pkg.remaining_sessions ?? Math.max(totalSessions - completedSessions, 0);
  const rawType = (pkg.package_type || 'Package').replace(/_\d+$/, '') || 'Package';
  const packageTypeDisplay = (rawType === 'multi_session' || rawType === 'multisession' ? 'Package' : rawType).replace(/^\w/, (c) => c.toUpperCase());

  useEffect(() => {
    if (!isOpen || !psychologistId) return;
    setSelectedDateObj(null);
    setSelectedTime('');
    setError(null);
    setCurrentDate(new Date());
    fetchAvailability();
  }, [isOpen, psychologistId]);

  const fetchAvailability = async () => {
    if (!psychologistId) return;
    setLoadingAvailability(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, '0')}`;
      const response = await adminApi.getPsychologistAvailabilityForReschedule(psychologistId, startDate, endDate);
      const availabilityObject = {};
      if (response?.data?.availability && Array.isArray(response.data.availability)) {
        response.data.availability.forEach((day) => {
          if (day.date) availabilityObject[day.date] = day;
        });
      }
      setPsychologistAvailability(availabilityObject);
    } catch (err) {
      console.error('Error fetching availability:', err);
      setPsychologistAvailability({});
    } finally {
      setLoadingAvailability(false);
    }
  };

  useEffect(() => {
    if (isOpen && psychologistId) fetchAvailability();
  }, [currentDate, isOpen, psychologistId]);

  const handlePrevMonth = () => {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    setSelectedDateObj(null);
    setSelectedTime('');
  };

  const handleNextMonth = () => {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    setSelectedDateObj(null);
    setSelectedTime('');
  };

  const handleDateSelect = (day) => {
    setSelectedDateObj(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
    setSelectedTime('');
  };

  const getAvailableSlotsForDate = (dateObj) => {
    if (!dateObj) return [];
    const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    const dayAvailability = psychologistAvailability[dateStr];
    if (!dayAvailability) return [];
    if (dayAvailability.available_slots && Array.isArray(dayAvailability.available_slots)) {
      return dayAvailability.available_slots;
    }
    if (dayAvailability.timeSlots && Array.isArray(dayAvailability.timeSlots)) {
      return dayAvailability.timeSlots.filter((s) => s.available).map((s) => s.displayTime || s.time);
    }
    return [];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clientId || !packageId || !selectedDateObj || !selectedTime) {
      setError('Please select date and time.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const scheduled_date = `${selectedDateObj.getFullYear()}-${String(selectedDateObj.getMonth() + 1).padStart(2, '0')}-${String(selectedDateObj.getDate()).padStart(2, '0')}`;
      const scheduled_time = to24Hour(selectedTime);
      await adminApi.bookPackageNextSession({
        client_id: clientId,
        package_id: packageId,
        scheduled_date,
        scheduled_time: scheduled_time || selectedTime
      });
      showSuccess('Next package session booked successfully.', 'Booked');
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg = err?.message || err?.error || 'Failed to book session';
      showError(msg, 'Booking failed');
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const clientName = session?.client
    ? (() => {
        const c = normRel(session.client);
        return c ? `${(c.first_name || '').trim()} ${(c.last_name || '').trim()}`.trim() || c.child_name || '—' : '—';
      })()
    : '—';
  const psychologistName = session?.psychologist
    ? (() => {
        const p = normRel(session.psychologist);
        return p ? `${(p.first_name || '').trim()} ${(p.last_name || '').trim()}`.trim() || '—' : '—';
      })()
    : '—';

  const getMonthName = (date) => date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const today = new Date();
  const isCurrentMonth = currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
  const { daysInMonth, startingDay } = getDaysInMonth(currentDate);
  const availableSlots = selectedDateObj ? getAvailableSlotsForDate(selectedDateObj) : [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-200">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#025545]/10 text-[#025545]">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900" role="heading" aria-level={2}>
                Book next session
              </div>
              <div className="text-xs text-slate-500">Package session — same client & psychologist</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4 space-y-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Session details</div>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Client</p>
                <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-400" />
                  {clientName}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Psychologist</p>
                <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-slate-400" />
                  {psychologistName}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Package</p>
                <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 flex items-center gap-2">
                  <Package className="h-4 w-4 text-slate-400" />
                  {packageTypeDisplay} — {completedSessions}/{totalSessions} completed, {remainingSessions} remaining
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              <CalendarDays className="h-4 w-4 inline mr-1" />
              Select date & time *
            </label>
            <div className="border border-slate-200 rounded-lg p-4 bg-white">
              <div className="flex items-center justify-between mb-3">
                <button type="button" onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <p className="text-sm font-semibold text-slate-800">{getMonthName(currentDate)}</p>
                <button type="button" onClick={handleNextMonth} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>
              {loadingAvailability && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-[#025545]" />
                </div>
              )}
              {!loadingAvailability && (
                <div className="grid grid-cols-7 gap-1 mb-3">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                    <div key={i} className="text-center text-xs font-medium text-slate-500 py-1">
                      {day}
                    </div>
                  ))}
                  {Array.from({ length: startingDay }, (_, i) => (
                    <div key={`e-${i}`} className="text-center py-1 text-xs" />
                  ))}
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const isToday = isCurrentMonth && day === today.getDate();
                    const isSelected =
                      selectedDateObj &&
                      selectedDateObj.getDate() === day &&
                      selectedDateObj.getMonth() === currentDate.getMonth() &&
                      selectedDateObj.getFullYear() === currentDate.getFullYear();
                    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dayAv = psychologistAvailability[dateStr];
                    const hasSlots =
                      dayAv &&
                      ((dayAv.available_slots && dayAv.available_slots.length > 0) ||
                        (dayAv.timeSlots && dayAv.timeSlots.some((s) => s.available)));
                    const isPast = isCurrentMonth && day < today.getDate();
                    const clickable = hasSlots && !isPast;
                    return (
                      <div
                        key={day}
                        onClick={() => clickable && handleDateSelect(day)}
                        className={`text-center py-1 rounded-lg text-xs cursor-pointer ${
                          isSelected
                            ? 'bg-[#025545] text-white font-bold'
                            : clickable
                              ? 'bg-green-500/80 text-white hover:bg-green-500'
                              : isPast
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedDateObj && (
              <div className="mt-4">
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Time *
                </label>
                {availableSlots.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {availableSlots.map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setSelectedTime(time)}
                        className={`px-3 py-2 rounded-lg border text-xs transition-colors ${
                          selectedTime === time
                            ? 'bg-[#025545] text-white border-[#025545]'
                            : 'bg-white text-slate-700 border-slate-300 hover:border-[#025545]'
                        }`}
                      >
                        {formatTimeDisplay(time)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    No slots for this date. Pick another.
                  </p>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedDateObj || !selectedTime}
              className="px-4 py-2 bg-[#025545] text-white rounded-lg hover:bg-[#012f23] disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Booking…
                </>
              ) : (
                'Book next session'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
