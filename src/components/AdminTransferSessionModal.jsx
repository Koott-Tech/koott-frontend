'use client';

import { useState, useEffect } from 'react';
import {
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  UserCheck,
  Calendar,
  Clock,
} from 'lucide-react';
import { adminApi } from '@/lib/backendApi';
import { useNotification } from '@/contexts/NotificationContext';

/**
 * AdminTransferSessionModal
 *
 * Transfers a platform session (sessions table) to a different therapist.
 * Optionally lets the admin pick a new date / time too.
 *
 * Props:
 *  isOpen          – boolean
 *  onClose         – () => void
 *  session         – session object. If session._isWixBooking is true the modal calls
 *                    adminApi.transferWixBooking(session._wixBookingId, …), otherwise
 *                    adminApi.transferSession(session.id, …).
 *  onTransferSuccess – () => void  (called after a successful transfer so parent can reload)
 */
export default function AdminTransferSessionModal({ isOpen, onClose, session, onTransferSuccess }) {
  const { showError, showSuccess } = useNotification();

  // Therapist list
  const [psychologists, setPsychologists] = useState([]);
  const [psychsLoading, setPsychsLoading] = useState(false);

  // Form state
  const [selectedPsychId, setSelectedPsychId] = useState('');
  const [changeDateTime, setChangeDateTime] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  // Calendar nav
  const [currentDate, setCurrentDate] = useState(new Date());

  // Loading / error
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const getMonthName = (d) => d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const getDaysInMonth = (d) => {
    const year = d.getFullYear();
    const month = d.getMonth();
    return {
      daysInMonth: new Date(year, month + 1, 0).getDate(),
      startingDay: new Date(year, month, 1).getDay(),
    };
  };

  const formatDate = (s) => {
    if (!s) return '';
    return new Date(s).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatTime = (t) => {
    if (!t) return '';
    if (t.includes('AM') || t.includes('PM')) return t;
    const [h, m] = t.split(':');
    const hr = parseInt(h, 10);
    return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
  };

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];
  const selectedHour = selectedTime ? selectedTime.slice(0, 2) : '';
  const selectedMinute = selectedTime ? selectedTime.slice(3, 5) : '';

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setSelectedPsychId('');
    setChangeDateTime(false);
    setSelectedDate('');
    setSelectedTime('');
    setError(null);
    setCurrentDate(new Date());
    loadPsychologists();
  }, [isOpen]);

  const loadPsychologists = async () => {
    setPsychsLoading(true);
    try {
      const res = await adminApi.getPsychologists();
      if (res?.success) {
        setPsychologists(res.data || []);
      } else {
        setPsychologists([]);
      }
    } catch {
      setPsychologists([]);
    } finally {
      setPsychsLoading(false);
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedPsychId) { setError('Please select a therapist'); return; }
    if (changeDateTime && (!selectedDate || !selectedTime)) {
      setError('Please select both a date and time');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const payload = {
        new_psychologist_id: selectedPsychId,
        ...(changeDateTime && selectedDate ? { new_date: selectedDate } : {}),
        ...(changeDateTime && selectedTime ? { new_time: selectedTime } : {}),
      };
      // Route to the right endpoint depending on whether this is a Wix booking or a platform session
      const res = session._isWixBooking
        ? await adminApi.transferWixBooking(session._wixBookingId, payload)
        : await adminApi.transferSession(session.id, payload);
      if (!res?.success) throw new Error(res?.error || 'Transfer failed');
      showSuccess(
        res.data?.newMeetLink
          ? 'Session transferred and new Meet link created.'
          : 'Session transferred. No Meet link was generated (therapist may need to connect Google Calendar).',
        'Transfer'
      );
      onTransferSuccess?.();
      onClose();
    } catch (e) {
      setError(e?.message || 'Transfer failed');
      showError(e?.message || 'Transfer failed', 'Transfer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDateSelect = (day) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${d}`);
    setSelectedTime('');
  };

  if (!isOpen || !session) return null;

  // ── Resolve display fields — handles both platform sessions (nested objects)
  // and Wix booking rows (flat string fields like therapist_name / client_full_name)
  const currentPsych = Array.isArray(session.psychologist) ? session.psychologist[0] : session.psychologist;
  const currentTherapistName =
    (currentPsych ? `${currentPsych.first_name || ''} ${currentPsych.last_name || ''}`.trim() : '') ||
    session.therapist_name ||
    '—';

  const client = Array.isArray(session.client) ? session.client[0] : session.client;
  const clientName =
    [client?.first_name, client?.last_name].filter(Boolean).join(' ') ||
    client?.child_name ||
    session.client_full_name ||
    session.client_first_name ||
    session.client_email ||
    '—';

  // For Wix rows scheduled_date / scheduled_time come from start_time slice; guard nulls
  const displayDate = session.scheduled_date || null;
  const displayTime = session.scheduled_time || null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <p className="text-sm font-semibold text-gray-900">Transfer Session</p>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Session summary */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs text-gray-500">Client</div>
              <div className="font-medium text-gray-900">{clientName}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Current Therapist</div>
              <div className="font-medium text-gray-900">{currentTherapistName}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Current Time</div>
              <div className="font-medium text-gray-900">
                {displayDate ? formatDate(displayDate) : '—'}
                {displayTime ? ` at ${formatTime(displayTime)}` : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Therapist picker */}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              <UserCheck className="inline h-4 w-4 mr-1 text-[#025545]" />
              New Therapist <span className="text-red-500">*</span>
            </label>
            {psychsLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading therapists…
              </div>
            ) : (
              <select
                value={selectedPsychId}
                onChange={(e) => setSelectedPsychId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#025545] focus:outline-none focus:ring-2 focus:ring-[#025545]/15"
              >
                <option value="">— Select therapist —</option>
                {psychologists.map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                    disabled={p.id === session.psychologist_id}
                  >
                    {p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim()}
                    {p.id === session.psychologist_id ? ' (current)' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Date/time toggle */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer w-fit">
              <div
                role="checkbox"
                aria-checked={changeDateTime}
                onClick={() => { setChangeDateTime(!changeDateTime); setSelectedDate(''); setSelectedTime(''); }}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${changeDateTime ? 'bg-[#025545]' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${changeDateTime ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-sm font-medium text-gray-800">
                <Calendar className="inline h-4 w-4 mr-1 text-[#025545]" />
                Change date &amp; time
              </span>
              {!changeDateTime && (
                <span className="text-xs text-gray-400">
                  (keeping {session.scheduled_date ? formatDate(session.scheduled_date) : 'current date'}
                  {session.scheduled_time ? ` at ${formatTime(session.scheduled_time)}` : ''})
                </span>
              )}
            </label>
          </div>

          {/* Date + time picker (shown only when toggle is on) */}
          {changeDateTime && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Calendar */}
              <div className="lg:col-span-7">
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-5">
                    <button
                      type="button"
                      onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                    </button>
                    <div className="text-sm font-semibold text-gray-900">{getMonthName(currentDate)}</div>
                    <button
                      type="button"
                      onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-2 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                      <div key={d} className="text-center text-xs font-medium text-gray-400">{d}</div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {(() => {
                      const { daysInMonth, startingDay } = getDaysInMonth(currentDate);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const cells = [];

                      for (let i = 0; i < startingDay; i++) {
                        cells.push(<div key={`e-${i}`} className="aspect-square" />);
                      }

                      for (let day = 1; day <= daysInMonth; day++) {
                        const y = currentDate.getFullYear();
                        const m = String(currentDate.getMonth() + 1).padStart(2, '0');
                        const d = String(day).padStart(2, '0');
                        const dateStr = `${y}-${m}-${d}`;
                        const cellDate = new Date(y, currentDate.getMonth(), day);
                        const isPast = cellDate < today;
                        const isSelected = selectedDate === dateStr;

                        cells.push(
                          <button
                            key={`day-${day}`}
                            type="button"
                            onClick={() => !isPast && handleDateSelect(day)}
                            disabled={isPast}
                            className={[
                              'aspect-square rounded-lg text-sm font-medium border transition-colors',
                              isSelected
                                ? 'bg-[#025545] text-white border-[#025545]'
                                : !isPast
                                  ? 'bg-white text-gray-900 border-gray-200 hover:border-[#025545]'
                                  : 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed',
                            ].join(' ')}
                          >
                            {day}
                          </button>
                        );
                      }
                      return cells;
                    })()}
                  </div>
                </div>
              </div>

              {/* Time */}
              <div className="lg:col-span-5">
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="text-sm font-semibold text-gray-900 mb-4">
                    <Clock className="inline h-4 w-4 mr-1 text-[#025545]" />Time
                  </div>
                  {!selectedDate ? (
                    <div className="text-sm text-gray-400 py-8">Select a date first.</div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Hour</label>
                          <select
                            value={selectedHour}
                            onChange={(e) => {
                              const h = e.target.value;
                              const m = selectedMinute || '00';
                              setSelectedTime(h && m ? `${h}:${m}` : '');
                            }}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#025545] focus:outline-none focus:ring-2 focus:ring-[#025545]/15"
                          >
                            <option value="">HH</option>
                            {hours.map((h) => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Minute</label>
                          <select
                            value={selectedMinute}
                            onChange={(e) => {
                              const m = e.target.value;
                              const h = selectedHour || '00';
                              setSelectedTime(h && m ? `${h}:${m}` : '');
                            }}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#025545] focus:outline-none focus:ring-2 focus:ring-[#025545]/15"
                          >
                            <option value="">MM</option>
                            {minutes.map((m) => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                      </div>

                      {selectedTime && (
                        <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-sm text-emerald-800">
                          {formatDate(selectedDate)} at {formatTime(selectedTime)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-white">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedPsychId || (changeDateTime && (!selectedDate || !selectedTime))}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#025545] text-white text-sm font-medium hover:bg-[#012f23] disabled:opacity-40"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Transfer Session
          </button>
        </div>
      </div>
    </div>
  );
}
