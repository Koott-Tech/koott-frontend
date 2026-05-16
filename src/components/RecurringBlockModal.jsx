"use client";
import { useState, useEffect } from "react";
import { X, Calendar } from "lucide-react";
import { useNotification } from "../contexts/NotificationContext";

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAY_INDICES = [1, 2, 3, 4, 5];
const WEEKEND_INDICES = [0, 6];
// Match default availability: 8 AM–9 PM (14 slots; last slot 9 PM = 21:00, no 10 PM)
const TIME_OPTIONS = Array.from({ length: 14 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`);

function formatTimeLabel(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const hour = h % 12 || 12;
  const ampm = h < 12 ? 'AM' : 'PM';
  return `${hour}:${String(m || 0).padStart(2, '0')} ${ampm}`;
}

export default function RecurringBlockModal({ isOpen, onClose, onSave }) {
  const { showError, showSuccess } = useNotification();
  const [selectedDays, setSelectedDays] = useState([]);
  const [blockEntireDay, setBlockEntireDay] = useState(true);
  const [useTimeRange, setUseTimeRange] = useState(true);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedDays([]);
      setBlockEntireDay(true);
      setUseTimeRange(true);
      setStartTime('08:00');
      setEndTime('17:00');
      setSelectedSlots([]);
    }
  }, [isOpen]);

  const toggleDay = (dayIndex) => {
    setSelectedDays((prev) =>
      prev.includes(dayIndex)
        ? prev.filter((d) => d !== dayIndex)
        : [...prev, dayIndex].sort((a, b) => a - b)
    );
  };

  const selectAllWeekdays = () => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      WEEKDAY_INDICES.forEach((d) => next.add(d));
      return [...next].sort((a, b) => a - b);
    });
  };

  const selectAllWeekend = () => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      WEEKEND_INDICES.forEach((d) => next.add(d));
      return [...next].sort((a, b) => a - b);
    });
  };

  // Range includes both start and end: e.g. 8 AM to 5 PM = block 8 AM through 5 PM, 6 PM and after available
  const getTimeSlotsFromRange = () => {
    const startIdx = TIME_OPTIONS.indexOf(startTime);
    const endIdx = TIME_OPTIONS.indexOf(endTime);
    if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) return [];
    return TIME_OPTIONS.slice(startIdx, endIdx + 1);
  };

  const getBlockedSlots = () => {
    if (blockEntireDay) return [...TIME_OPTIONS];
    if (useTimeRange) return getTimeSlotsFromRange();
    return selectedSlots;
  };

  const getAvailableSlotsAfterBlock = () => {
    const blocked = getBlockedSlots();
    return TIME_OPTIONS.filter((s) => !blocked.includes(s));
  };

  const getTimeSlotsToSave = () => {
    if (blockEntireDay) return null;
    if (useTimeRange) return getTimeSlotsFromRange();
    return selectedSlots.length > 0 ? [...selectedSlots].sort() : null;
  };

  const toggleSlot = (slot) => {
    setSelectedSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot].sort()
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedDays.length === 0) {
      showError('Select at least one day.');
      return;
    }
    if (!blockEntireDay) {
      const slots = getTimeSlotsToSave();
      if (!slots || slots.length === 0) {
        showError(
          useTimeRange
            ? 'Set a valid range (End after Start).'
            : 'Select at least one time slot or tick Block full day.'
        );
        return;
      }
    }
    setIsLoading(true);
    try {
      const time_slots = getTimeSlotsToSave();
      for (let i = 0; i < selectedDays.length; i++) {
        await onSave({
          day_of_week: selectedDays[i],
          block_entire_day: blockEntireDay,
          time_slots
        });
      }
      const dayLabel = selectedDays.length === 1 ? DAYS[selectedDays[0]] : `${selectedDays.length} days`;
      showSuccess(`Recurring block saved for ${dayLabel}.`);
      onClose();
    } catch (err) {
      showError(err.message || 'Failed to save recurring block');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const canSave = selectedDays.length > 0 && (blockEntireDay || (getTimeSlotsToSave() || []).length > 0);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: 'rgba(15, 23, 42, 0.35)',
        backdropFilter: 'blur(4px)'
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.04)',
          width: '100%',
          maxWidth: 600,
          maxHeight: '88vh',
          overflowY: 'auto'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 28px 16px',
            borderBottom: '1px solid #f1f5f9'
          }}
        >
          <div
            role="heading"
            aria-level={2}
            style={{
              margin: 0,
              fontSize: '25px',
              fontWeight: 600,
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              letterSpacing: '-0.01em'
            }}
          >
            <Calendar size={18} style={{ color: '#3f2e73', flexShrink: 0 }} />
            Recurring block
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: 8,
              borderRadius: 10,
              border: 'none',
              background: 'transparent',
              color: '#64748b',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px 28px' }}>
          {/* Which days */}
          <section style={{ marginBottom: 28 }}>
            <p
              style={{
                margin: '0 0 14px',
                fontSize: '0.6875rem',
                fontWeight: 600,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.06em'
              }}
            >
              Which days
            </p>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                <p style={{ margin: 0, fontSize: '0.6875rem', color: '#94a3b8' }}>Weekdays</p>
                <button
                  type="button"
                  onClick={selectAllWeekdays}
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.6875rem',
                    fontWeight: 500,
                    color: '#3f2e73',
                    background: 'transparent',
                    border: '1px solid #c7d2fe',
                    borderRadius: 6,
                    cursor: 'pointer'
                  }}
                >
                  Select all weekdays
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 20px' }}>
                {WEEKDAY_INDICES.map((i) => (
                  <label
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                      color: '#334155'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDays.includes(i)}
                      onChange={() => toggleDay(i)}
                      style={{ width: 14, height: 14, accentColor: '#3f2e73' }}
                    />
                    {DAYS[i]}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                <p style={{ margin: 0, fontSize: '0.6875rem', color: '#94a3b8' }}>Weekend</p>
                <button
                  type="button"
                  onClick={selectAllWeekend}
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.6875rem',
                    fontWeight: 500,
                    color: '#3f2e73',
                    background: 'transparent',
                    border: '1px solid #c7d2fe',
                    borderRadius: 6,
                    cursor: 'pointer'
                  }}
                >
                  Select all weekend
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 20px' }}>
                {WEEKEND_INDICES.map((i) => (
                  <label
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                      color: '#334155'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDays.includes(i)}
                      onChange={() => toggleDay(i)}
                      style={{ width: 14, height: 14, accentColor: '#3f2e73' }}
                    />
                    {DAYS[i]}
                  </label>
                ))}
              </div>
            </div>
          </section>

          {/* When to block */}
          <section style={{ marginBottom: 28 }}>
            <p
              style={{
                margin: '0 0 14px',
                fontSize: '0.6875rem',
                fontWeight: 600,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.06em'
              }}
            >
              When to block
            </p>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                marginBottom: 16
              }}
            >
              <input
                type="checkbox"
                checked={blockEntireDay}
                onChange={(e) => setBlockEntireDay(e.target.checked)}
                style={{ width: 14, height: 14, accentColor: '#3f2e73' }}
              />
              <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#334155' }}>Block full day</span>
            </label>

            {!blockEntireDay && (
              <div style={{ marginLeft: 24, marginTop: 16 }}>
                <div
                  style={{
                    display: 'flex',
                    gap: 0,
                    marginBottom: 16,
                    background: '#f8fafc',
                    borderRadius: 10,
                    padding: 3
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setUseTimeRange(true)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      borderRadius: 8,
                      border: 'none',
                      cursor: 'pointer',
                      background: useTimeRange ? '#fff' : 'transparent',
                      color: useTimeRange ? '#3f2e73' : '#64748b',
                      boxShadow: useTimeRange ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                    }}
                  >
                    Range
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseTimeRange(false)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      borderRadius: 8,
                      border: 'none',
                      cursor: 'pointer',
                      background: !useTimeRange ? '#fff' : 'transparent',
                      color: !useTimeRange ? '#3f2e73' : '#64748b',
                      boxShadow: !useTimeRange ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                    }}
                  >
                    Specific slots
                  </button>
                </div>

                {useTimeRange ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                      <div style={{ flex: '1 1 100px', minWidth: 0 }}>
                        <label style={{ display: 'block', fontSize: '0.6875rem', color: '#94a3b8', marginBottom: 6 }}>From</label>
                        <select
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            fontSize: '0.75rem',
                            border: '1px solid #e2e8f0',
                            borderRadius: 10,
                            background: '#fff',
                            color: '#334155'
                          }}
                        >
                          {TIME_OPTIONS.map((t) => (
                            <option key={t} value={t}>{formatTimeLabel(t)}</option>
                          ))}
                        </select>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 22 }}>to</span>
                      <div style={{ flex: '1 1 100px', minWidth: 0 }}>
                        <label style={{ display: 'block', fontSize: '0.6875rem', color: '#94a3b8', marginBottom: 6 }}>Till (last slot to block)</label>
                        <select
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            fontSize: '0.75rem',
                            border: '1px solid #e2e8f0',
                            borderRadius: 10,
                            background: '#fff',
                            color: '#334155'
                          }}
                        >
                          {TIME_OPTIONS.map((t) => (
                            <option key={t} value={t} disabled={TIME_OPTIONS.indexOf(t) < TIME_OPTIONS.indexOf(startTime)}>
                              {formatTimeLabel(t)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {getTimeSlotsFromRange().length > 0 && (
                      <p style={{ margin: '10px 0 0', fontSize: '0.6875rem', color: '#94a3b8', lineHeight: 1.4 }}>
                        Blocking: {getTimeSlotsFromRange().map((t) => formatTimeLabel(t)).join(', ')}.
                      </p>
                    )}
                    {getTimeSlotsFromRange().length > 0 && (
                      <div style={{ marginTop: 12, padding: '10px 12px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0' }}>
                        <p style={{ margin: '0 0 4px', fontSize: '0.6875rem', fontWeight: 600, color: '#166534' }}>Available slots after block (confirm)</p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#15803d', lineHeight: 1.4 }}>
                          {getAvailableSlotsAfterBlock().length > 0
                            ? getAvailableSlotsAfterBlock().map((t) => formatTimeLabel(t)).join(', ')
                            : 'None'}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <p style={{ margin: '0 0 10px', fontSize: '0.6875rem', color: '#94a3b8' }}>Click slots to block</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                      {TIME_OPTIONS.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => toggleSlot(slot)}
                          style={{
                            padding: '6px 4px',
                            fontSize: '0.6875rem',
                            borderRadius: 8,
                            border: `1px solid ${selectedSlots.includes(slot) ? '#b45309' : '#e2e8f0'}`,
                            cursor: 'pointer',
                            background: selectedSlots.includes(slot) ? '#fef3c7' : '#fff',
                            color: selectedSlots.includes(slot) ? '#92400e' : '#334155'
                          }}
                        >
                          {formatTimeLabel(slot)}
                        </button>
                      ))}
                    </div>
                    {selectedSlots.length > 0 && (
                      <p style={{ margin: '10px 0 0', fontSize: '0.6875rem', color: '#64748b' }}>
                        Blocking: {selectedSlots.map((t) => formatTimeLabel(t)).join(', ')}
                      </p>
                    )}
                    {selectedSlots.length > 0 && (
                      <div style={{ marginTop: 12, padding: '10px 12px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0' }}>
                        <p style={{ margin: '0 0 4px', fontSize: '0.6875rem', fontWeight: 600, color: '#166534' }}>Available slots after block (confirm)</p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#15803d', lineHeight: 1.4 }}>
                          {getAvailableSlotsAfterBlock().length > 0
                            ? getAvailableSlotsAfterBlock().map((t) => formatTimeLabel(t)).join(', ')
                            : 'None'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '10px 14px',
                fontSize: '0.8125rem',
                fontWeight: 500,
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                background: '#fff',
                color: '#475569',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !canSave}
              style={{
                flex: 1,
                padding: '10px 14px',
                fontSize: '0.8125rem',
                fontWeight: 500,
                border: 'none',
                borderRadius: 10,
                background: (isLoading || !canSave) ? '#cbd5e1' : '#3f2e73',
                color: '#fff',
                cursor: (isLoading || !canSave) ? 'not-allowed' : 'pointer'
              }}
            >
              {isLoading ? 'Saving...' : selectedDays.length > 1 ? `Save ${selectedDays.length} days` : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
