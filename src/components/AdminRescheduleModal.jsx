'use client';

import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  X, 
  CheckCircle, 
  AlertCircle,
  User,
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
  const [psychologistAvailability, setPsychologistAvailability] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date());

  // No-show reschedule fee: when a session was a no-show (client's mistake), rescheduling
  // requires an additional (usually half) payment. Only shown for no-show sessions.
  const isNoShow = ['no_show', 'noshow'].includes(
    String(session?.status || session?.session_status || '').toLowerCase()
  );
  const [feeAmount, setFeeAmount] = useState('');
  const [feeMethod, setFeeMethod] = useState('cash');
  const [feeReceiptUrl, setFeeReceiptUrl] = useState('');
  const [feeReceiptName, setFeeReceiptName] = useState('');
  const [isUploadingFee, setIsUploadingFee] = useState(false);

  const handleFeeScreenshotUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      setError('Payment screenshot must be 15MB or smaller');
      e.target.value = '';
      return;
    }
    setError(null);
    setIsUploadingFee(true);
    try {
      const response = await adminApi.uploadImage(file, { bucket: 'manual-bookings' });
      if (!response?.success || !response?.url) {
        throw new Error(response?.message || response?.error || 'Failed to upload payment screenshot');
      }
      setFeeReceiptUrl(response.url);
      setFeeReceiptName(file.name);
    } catch (uploadError) {
      setFeeReceiptUrl('');
      setFeeReceiptName('');
      setError(uploadError.message || 'Failed to upload payment screenshot');
      e.target.value = '';
    } finally {
      setIsUploadingFee(false);
    }
  };

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
      setError(null);
      setFeeAmount('');
      setFeeMethod('cash');
      setFeeReceiptUrl('');
      setFeeReceiptName('');
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

    // No-show reschedule fee is OPTIONAL — a no-show can be rescheduled without charging.
    // Only validate the supporting details once an amount has actually been entered, so a
    // half-filled fee (amount but no type/proof) still can't be recorded.
    if (isNoShow && feeAmount && parseFloat(feeAmount) > 0) {
      if (!feeMethod) {
        setError('Select the payment type for the no-show fee.');
        return;
      }
      if (!feeReceiptUrl) {
        setError('Upload the payment screenshot for the no-show fee.');
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const new_date = selectedDate;
      const new_time = convertTo24Hour(selectedTime);

      // Only attach the no-show fee when this is a no-show reschedule AND a fee was actually
      // charged. Rescheduling a no-show without a fee sends nothing, so no payment is recorded.
      const chargingNoShowFee = isNoShow && feeAmount && parseFloat(feeAmount) > 0;
      const noShowFee = chargingNoShowFee ? {
        noshow_fee_amount: parseFloat(feeAmount),
        noshow_fee_method: feeMethod,
        noshow_fee_receipt_url: feeReceiptUrl,
      } : {};

      let response;
      if (session._isWixBooking && session._wixBookingId) {
        response = await adminApi.rescheduleWixBooking(session._wixBookingId, { new_date, new_time, ...noShowFee });
      } else {
        response = await adminApi.rescheduleSession(session.id, {
          new_date,
          new_time,
          reason: 'Admin rescheduled',
          ...noShowFee,
        });
      }

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
    if (!timeString) return '';
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
    if (!timeString) return '';
    // If the time already doesn't contain AM/PM, return it as is (already 24-hour)
    if (!timeString.includes('AM') && !timeString.includes('PM')) {
      return timeString.length === 5 ? `${timeString}:00` : timeString;
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

  if (!isOpen || !session) return null;

  const selectedHour24 = selectedTime ? parseInt(selectedTime.slice(0, 2), 10) : null;
  const selectedHour12 = selectedHour24 !== null ? String(selectedHour24 % 12 || 12).padStart(2, '0') : '';
  const selectedAmPm = selectedHour24 !== null ? (selectedHour24 >= 12 ? 'PM' : 'AM') : 'AM';
  const selectedMinute = selectedTime ? selectedTime.slice(3, 5) : '00';

  const setHourMinuteAmPm = (hr12, min, ampm) => {
    if (!hr12) {
      setSelectedTime('');
      return;
    }
    let h24 = parseInt(hr12, 10);
    if (ampm === 'PM' && h24 !== 12) h24 += 12;
    if (ampm === 'AM' && h24 === 12) h24 = 0;
    setSelectedTime(`${String(h24).padStart(2, '0')}:${min || '00'}`);
  };

  const hours12 = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];

  // Session length: prefer the booking's own start/end window, else couple→80, default 50.
  const getDurationMinutes = () => {
    if (session.start_time && session.end_time) {
      const d = Math.round((new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / 60000);
      if (Number.isFinite(d) && d > 0 && d <= 600) return d;
    }
    const t = String(session.session_type || session.package?.package_type || '').toLowerCase();
    if (t.includes('couple')) return 80;
    return 50;
  };
  const durationMinutes = getDurationMinutes();
  const formatDurationLabel = (m) => (m % 60 === 0 ? `${m / 60} hr${m / 60 > 1 ? 's' : ''}` : m >= 60 ? `${Math.floor(m / 60)} hr ${m % 60} min` : `${m} min`);

  // Given a "HH:MM" 24-hour start and a duration, return the 12-hour AM/PM end time.
  const computeEndTime12h = (hhmm, mins) => {
    if (!hhmm) return '';
    const [h, mn] = hhmm.split(':').map(Number);
    const total = h * 60 + mn + mins;
    const eh = Math.floor((total % 1440) / 60);
    const em = total % 60;
    const ampm = eh >= 12 ? 'PM' : 'AM';
    const dh = eh % 12 === 0 ? 12 : eh % 12;
    return `${dh}:${String(em).padStart(2, '0')} ${ampm}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div />
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs text-gray-500">Client</div>
              <div className="font-medium text-gray-900">
                {session.client?.child_name ||
                  `${session.client?.first_name || ''} ${session.client?.last_name || ''}`.trim() || '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Psychologist</div>
              <div className="font-medium text-gray-900">
                {session.psychologist?.first_name} {session.psychologist?.last_name}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Current Time</div>
              <div className="font-medium text-gray-900">
                {formatDate(session.scheduled_date)} at {formatTime(session.scheduled_time)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoadingAvailability ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin text-[#025545]" />
                Loading availability...
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7">
                {error && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-5">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </button>
                    <div className="text-sm font-semibold text-gray-900">{getMonthName(currentDate)}</div>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-2 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="text-center text-xs font-medium text-gray-400">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-2">
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
                        const isSelected = selectedDate === dateStr;
                        const startOfToday = new Date(todayY, todayM, todayD);
                        const startOfCell = new Date(year, dateObj.getMonth(), day);
                        const isPastDate = startOfCell < startOfToday;
                        const isClickable = !isPastDate;

                        cells.push(
                          <button
                            key={`day-${day}`}
                            type="button"
                            onClick={() => isClickable && handleDateSelect(day)}
                            disabled={!isClickable}
                            className={[
                              'aspect-square rounded-lg text-sm font-medium border transition-colors',
                              isSelected ? 'bg-[#025545] text-white border-[#025545]' :
                              isClickable ? 'bg-white text-gray-900 border-gray-200 hover:border-[#025545]' :
                              'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
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

              <div className="lg:col-span-5">
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="text-sm font-semibold text-gray-900 mb-4">Time</div>
                  {!selectedDate ? (
                    <div className="text-sm text-gray-400 py-8">Select a date first.</div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Hour</label>
                          <select
                            value={selectedHour12}
                            onChange={(e) => setHourMinuteAmPm(e.target.value, selectedMinute, selectedAmPm)}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-[#025545] focus:outline-none focus:ring-2 focus:ring-[#025545]/15"
                          >
                            <option value="">HH</option>
                            {hours12.map((hour) => (
                              <option key={hour} value={hour}>{hour}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Minute</label>
                          <select
                            value={selectedMinute}
                            onChange={(e) => setHourMinuteAmPm(selectedHour12 || '12', e.target.value, selectedAmPm)}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-[#025545] focus:outline-none focus:ring-2 focus:ring-[#025545]/15"
                          >
                            <option value="">MM</option>
                            {minutes.map((minute) => (
                              <option key={minute} value={minute}>{minute}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">AM / PM</label>
                          <select
                            value={selectedAmPm}
                            onChange={(e) => setHourMinuteAmPm(selectedHour12 || '12', selectedMinute, e.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-[#025545] focus:outline-none focus:ring-2 focus:ring-[#025545]/15"
                          >
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                          </select>
                        </div>
                      </div>

                      <div className="text-xs text-gray-500">
                        Session duration: <span className="font-semibold text-gray-700">{formatDurationLabel(durationMinutes)}</span>
                      </div>

                      {selectedTime && (
                        <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-sm text-emerald-800">
                          {formatDate(selectedDate)} at {formatTime(selectedTime)} – {computeEndTime12h(selectedTime, durationMinutes)}
                          <span className="text-emerald-600"> ({formatDurationLabel(durationMinutes)})</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* No-show reschedule fee — only for sessions marked as no-show. */}
          {isNoShow && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-800">No-show reschedule fee (optional)</span>
              </div>
              <p className="text-xs text-amber-700 -mt-1">
                This session was a no-show. If you are charging an additional payment, record the details below —
                otherwise leave the amount blank and reschedule without a fee.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Amount (₹)</label>
                  <input type="number" min="0" step="1" value={feeAmount}
                    onChange={(e) => setFeeAmount(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-[#025545] focus:outline-none focus:ring-2 focus:ring-[#025545]/15 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Payment type</label>
                  <select value={feeMethod} onChange={(e) => setFeeMethod(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 bg-white focus:border-[#025545] focus:outline-none focus:ring-2 focus:ring-[#025545]/15 cursor-pointer">
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="razorpay">Razorpay</option>
                    <option value="card">Card</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Payment screenshot</label>
                <input type="file" accept="image/*" onChange={handleFeeScreenshotUpload} disabled={isUploadingFee}
                  className="block w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#025545] file:text-white hover:file:bg-[#012f23] disabled:opacity-50" />
                {isUploadingFee && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                    <Loader2 className="h-3 w-3 animate-spin" /> Uploading…
                  </div>
                )}
                {!isUploadingFee && feeReceiptUrl && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-700">
                    <CheckCircle className="h-3 w-3" /> {feeReceiptName || 'Screenshot uploaded'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleReschedule}
            disabled={!selectedDate || !selectedTime || isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#025545] text-white text-sm font-medium hover:bg-[#012f23] disabled:opacity-40"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
