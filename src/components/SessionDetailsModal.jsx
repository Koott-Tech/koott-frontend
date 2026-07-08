import { useState } from 'react';
import { X, FileText, MessageSquare, Eye, EyeOff, User, Calendar } from 'lucide-react';
import { getSessionCompletionFields } from '@/utils/sessionCompletionFields';
import { sessionBookedAtIso } from '@/lib/sessionBookedAt';

const labelClass = 'block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5';
const valueBoxClass = 'bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800';

export default function SessionDetailsModal({
  session,
  isOpen,
  onClose,
  isPsychologist = false
}) {
  const [showNotes, setShowNotes] = useState(false);

  if (!isOpen || !session) return null;

  const { summary, report, privateNotes } = getSessionCompletionFields(session);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '—';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${(minutes || '00').padStart(2, '0')} ${ampm}`;
  };

  const clientName = [session.client?.first_name, session.client?.last_name].filter(Boolean).join(' ').trim() || '—';

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header — minimal */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#025545]/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-[#025545]" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-800 tracking-tight" role="heading" aria-level={1}>
                Session Details
              </div>
              <p className="text-xs text-slate-500 mt-0.5">#{session.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Client Information (psychologist view) */}
          {isPsychologist && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2" role="heading" aria-level={2}>
                <User className="w-4 h-4 text-[#025545]" />
                Client Information
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Name</label>
                  <div className={valueBoxClass}>{clientName}</div>
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <div className={valueBoxClass}>{session.client?.user?.email || '—'}</div>
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <div className={valueBoxClass}>{session.client?.phone_number || '—'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Session Information */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2" role="heading" aria-level={2}>
              <Calendar className="w-4 h-4 text-[#025545]" />
              Session Information
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Date</label>
                <div className={valueBoxClass}>
                  {formatDate(session.scheduled_date)}
                  {session.original_scheduled_date && (
                    <div className="text-[10px] text-amber-600 mt-1">Was: {formatDate(session.original_scheduled_date)}</div>
                  )}
                </div>
              </div>
              <div>
                <label className={labelClass}>Time</label>
                <div className={valueBoxClass}>
                  {formatTime(session.scheduled_time)}
                </div>
              </div>
              {isPsychologist && (
                <div className="sm:col-span-2">
                  <label className={labelClass}>Booked at (IST)</label>
                  <div className={valueBoxClass}>
                    {sessionBookedAtIso(session)
                      ? new Date(sessionBookedAtIso(session)).toLocaleString('en-IN', {
                          timeZone: 'Asia/Kolkata',
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })
                      : '—'}
                  </div>
                </div>
              )}
              <div>
                <label className={labelClass}>Status</label>
                <div className={valueBoxClass}>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    session.status === 'completed' ? 'bg-green-100 text-green-800' :
                    session.status === 'booked' ? 'bg-[#025545]/10 text-[#025545]' :
                    session.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    session.status === 'no_show' ? 'bg-orange-100 text-orange-800' :
                    session.status === 'rescheduled' ? 'bg-amber-100 text-amber-800' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {session.status}
                  </span>
                </div>
              </div>
              {session.status === 'rescheduled' && session.original_scheduled_date && (
                <div className="sm:col-span-2">
                  <label className={labelClass}>Original date</label>
                  <div className={valueBoxClass}>{formatDate(session.original_scheduled_date)}</div>
                </div>
              )}
              {session.package && (
                <div>
                  <label className={labelClass}>Package</label>
                  <div className={valueBoxClass}>{session.package.package_type}</div>
                </div>
              )}
            </div>
          </div>

          {/* Session Summary */}
          {summary && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-[#025545]" />
                <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider" role="heading" aria-level={2}>Session Summary</div>
              </div>
              <div className={`${valueBoxClass} whitespace-pre-wrap`}>{summary}</div>
              <p className="text-xs text-slate-500 mt-2">Shared via WhatsApp</p>
            </div>
          )}

          {/* Session Report */}
          {report && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-[#025545]" />
                <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider" role="heading" aria-level={2}>Session Report</div>
              </div>
              <div className={`${valueBoxClass} whitespace-pre-wrap`}>{report}</div>
              <p className="text-xs text-slate-500 mt-2">Internal Only</p>
            </div>
          )}

          {/* Private Notes — therapist only */}
          {isPsychologist && privateNotes && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#025545]" />
                  <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider" role="heading" aria-level={2}>Private Notes</div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNotes(!showNotes)}
                  className="text-xs font-medium text-[#025545] hover:text-[#012f23]"
                >
                  {showNotes ? <><EyeOff className="w-3.5 h-3.5 inline mr-1" /> Hide</> : <><Eye className="w-3.5 h-3.5 inline mr-1" /> Show</>}
                </button>
              </div>
              {showNotes && <div className={`${valueBoxClass} whitespace-pre-wrap`}>{privateNotes}</div>}
              <p className="text-xs text-slate-500 mt-2">Private — visible only to you and admin</p>
            </div>
          )}

          {/* Client Feedback */}
          {(session.feedback || session.client_feedback) && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-[#025545]" />
                <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider" role="heading" aria-level={2}>Client Feedback</div>
              </div>
              <div className={valueBoxClass}>
                {session.feedback || session.client_feedback}
                {session.rating != null && <p className="text-xs text-slate-500 mt-2">{session.rating} / 5</p>}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 pb-5 pt-2 border-t border-slate-200">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
