'use client';

import { useState, useEffect } from 'react';
import { X, CalendarDays, Clock, User, UserCheck, Package, Loader2, ChevronLeft, ChevronRight, Timer } from 'lucide-react';
import { adminApi } from '@/lib/backendApi';
import { useNotification } from '@/contexts/NotificationContext';

function normRel(r) {
  return (Array.isArray(r) ? r[0] : r) ?? null;
}

/** { hour12 '1'–'12', minute '00'–'55', ampm 'AM'|'PM' } → 'HH:MM:00' */
function buildTime24(hour12, minute, ampm) {
  let h = parseInt(hour12, 10);
  if (ampm === 'AM' && h === 12) h = 0;
  else if (ampm === 'PM' && h !== 12) h += 12;
  return `${String(h).padStart(2, '0')}:${minute}:00`;
}

function getDaysInMonth(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  return {
    daysInMonth: new Date(year, month + 1, 0).getDate(),
    startingDay: new Date(year, month, 1).getDay(),
  };
}

// Hour options 1–12
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));

// Minute options 00–55 in 5-min steps
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

// Duration options
const DURATIONS = [
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '50 min', value: 50, default: true },
  { label: '60 min', value: 60 },
  { label: '80 min', value: 80 },
  { label: '90 min', value: 90 },
];

export default function AdminBookNextPackageSessionModal({ isOpen, onClose, session, onSuccess }) {
  const { showError, showSuccess } = useNotification();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateObj, setSelectedDateObj] = useState(null);

  // Time picker
  const [hour, setHour] = useState('10');
  const [minute, setMinute] = useState('00');
  const [ampm, setAmpm] = useState('AM');

  // Duration
  const [duration, setDuration] = useState(50);

  // Wix vs internal package
  const isWixSession = !!session?.wix_row_id || !!session?._isWixBooking;
  const wixRowId = session?.wix_row_id ?? session?._wixBookingId ?? null;
  const clientId = session?.client_id ?? normRel(session?.client)?.id;
  const packageId = session?.package_id ?? session?.package?.id;

  const pkg = session?.package || {};
  const totalSessions = pkg.total_sessions ?? pkg.session_count ?? 0;
  const completedSessions = pkg.completed_sessions ?? 0;
  const remainingSessions = pkg.remaining_sessions ?? Math.max(totalSessions - completedSessions, 0);
  const rawType = (pkg.package_type || 'Package').replace(/_\d+$/, '') || 'Package';
  const packageTypeDisplay = (rawType === 'multi_session' || rawType === 'multisession' ? 'Package' : rawType)
    .replace(/^\w/, (c) => c.toUpperCase());

  // Default duration based on session type
  useEffect(() => {
    if (!isOpen) return;
    setSelectedDateObj(null);
    setHour('10');
    setMinute('00');
    setAmpm('AM');
    setError(null);
    setCurrentDate(new Date());
    // Sensible duration default from session type
    const type = (session?.session_type || '').toLowerCase();
    if (type === 'couple') setDuration(80);
    else if (type === 'assessment' || type === 'discovery') setDuration(30);
    else setDuration(50);
  }, [isOpen, session?.session_type]);

  const handlePrevMonth = () => { setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1)); setSelectedDateObj(null); };
  const handleNextMonth = () => { setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1)); setSelectedDateObj(null); };
  const handleDateSelect = (day) => setSelectedDateObj(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDateObj) { setError('Please select a date.'); return; }
    if (!isWixSession && (!clientId || !packageId)) { setError('Missing client or package information.'); return; }
    if (isWixSession && !wixRowId) { setError('Missing Wix booking reference.'); return; }

    setError(null);
    setSubmitting(true);
    try {
      const scheduled_date = `${selectedDateObj.getFullYear()}-${String(selectedDateObj.getMonth() + 1).padStart(2, '0')}-${String(selectedDateObj.getDate()).padStart(2, '0')}`;
      const scheduled_time = buildTime24(hour, minute, ampm);

      if (isWixSession) {
        await adminApi.bookWixNextSession({ wix_row_id: wixRowId, scheduled_date, scheduled_time, duration_minutes: duration });
      } else {
        await adminApi.bookPackageNextSession({ client_id: clientId, package_id: packageId, scheduled_date, scheduled_time, duration_minutes: duration });
      }
      showSuccess('Next session booked successfully.', 'Booked');
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
    ? (() => { const c = normRel(session.client); return c ? `${(c.first_name || '').trim()} ${(c.last_name || '').trim()}`.trim() || c.child_name || '—' : '—'; })()
    : (session?.client_full_name || '—');

  const psychologistName = session?.psychologist
    ? (() => { const p = normRel(session.psychologist); return p ? `${(p.first_name || '').trim()} ${(p.last_name || '').trim()}`.trim() || '—' : '—'; })()
    : (session?.therapist_name || '—');

  const getMonthName = (d) => d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const today = new Date();
  const isCurrentMonth = currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
  const { daysInMonth, startingDay } = getDaysInMonth(currentDate);

  const selectedDateStr = selectedDateObj
    ? selectedDateObj.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const selectCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#025545]/30 focus:border-[#025545] appearance-none';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-200">

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#025545]/10 text-[#025545]">
              <CalendarDays className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">Book next session</div>
              <div className="text-xs text-slate-500">Package — same client &amp; psychologist</div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">

          {/* Session info strip */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-800">
              <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="font-medium">{clientName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <UserCheck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>{psychologistName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Package className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>{packageTypeDisplay} &mdash; {completedSessions}/{totalSessions} done,&nbsp;
                <span className="text-[#025545] font-medium">{remainingSessions} remaining</span>
              </span>
            </div>
          </div>

          {/* Calendar */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 pt-3 pb-1 border-b border-slate-100">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <CalendarDays className="h-3 w-3" /> Date
              </div>
            </div>
            <div className="p-4">
              {/* Month nav */}
              <div className="flex items-center justify-between mb-3">
                <button type="button" onClick={handlePrevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-semibold text-slate-800">{getMonthName(currentDate)}</span>
                <button type="button" onClick={handleNextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Day labels */}
              <div className="grid grid-cols-7 mb-1">
                {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
                  <div key={d} className="text-center text-[10px] font-medium text-slate-400 py-0.5">{d}</div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: startingDay }, (_, i) => <div key={`b${i}`} />)}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const isPast = isCurrentMonth && day < today.getDate();
                  const isToday = isCurrentMonth && day === today.getDate();
                  const isSel = selectedDateObj &&
                    selectedDateObj.getDate() === day &&
                    selectedDateObj.getMonth() === currentDate.getMonth() &&
                    selectedDateObj.getFullYear() === currentDate.getFullYear();
                  return (
                    <button key={day} type="button" disabled={isPast} onClick={() => !isPast && handleDateSelect(day)}
                      className={`aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-colors
                        ${isSel ? 'bg-[#025545] text-white'
                          : isToday ? 'ring-1 ring-[#025545] text-[#025545] hover:bg-[#025545]/10'
                          : isPast ? 'text-slate-300 cursor-not-allowed'
                          : 'text-slate-700 hover:bg-slate-100'}`}>
                      {day}
                    </button>
                  );
                })}
              </div>

              {selectedDateStr && (
                <div className="mt-2.5 text-xs text-center text-[#025545] font-medium">{selectedDateStr}</div>
              )}
            </div>
          </div>

          {/* Time & Duration */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 pt-3 pb-1 border-b border-slate-100">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Clock className="h-3 w-3" /> Time &amp; Duration
              </div>
            </div>
            <div className="p-4 space-y-4">

              {/* Time row */}
              <div className="flex items-end gap-2">
                {/* Hour */}
                <div className="flex-1 min-w-0">
                  <label className="block text-xs text-slate-500 mb-1">Hour</label>
                  <div className="relative">
                    <select value={hour} onChange={(e) => setHour(e.target.value)} className={selectCls}>
                      {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>

                <span className="text-lg font-bold text-slate-300 mb-2">:</span>

                {/* Minute */}
                <div className="flex-1 min-w-0">
                  <label className="block text-xs text-slate-500 mb-1">Minute</label>
                  <div className="relative">
                    <select value={minute} onChange={(e) => setMinute(e.target.value)} className={selectCls}>
                      {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

                {/* AM / PM */}
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Period</label>
                  <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                    {['AM', 'PM'].map((p) => (
                      <button key={p} type="button" onClick={() => setAmpm(p)}
                        className={`px-3.5 py-2 text-sm font-semibold transition-colors
                          ${ampm === p ? 'bg-[#025545] text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Duration row */}
              <div>
                <label className="block text-xs text-slate-500 mb-2 flex items-center gap-1">
                  <Timer className="h-3 w-3" /> Duration
                </label>
                <div className="flex flex-wrap gap-2">
                  {DURATIONS.map((d) => (
                    <button key={d.value} type="button" onClick={() => setDuration(d.value)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors
                        ${duration === d.value
                          ? 'bg-[#025545] text-white border-[#025545]'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-[#025545] hover:text-[#025545]'}`}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-xs text-slate-600 flex items-center justify-between">
                <span>Start</span>
                <span className="font-semibold text-slate-800">{hour}:{minute} {ampm}</span>
                <span>·</span>
                <span>Duration</span>
                <span className="font-semibold text-slate-800">{duration} min</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">{error}</div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-1 border-t border-slate-200">
            <button type="button" onClick={onClose} disabled={submitting}
              className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium">
              Cancel
            </button>
            <button type="submit" disabled={submitting || !selectedDateObj}
              className="px-4 py-2 bg-[#025545] text-white rounded-lg hover:bg-[#012f23] disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Booking…</> : 'Book next session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
