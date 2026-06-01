"use client";

import { X, FileText, EyeOff, Calendar, Clock, User, ClipboardList } from "lucide-react";

const sectionTitleClass = "text-xs font-semibold text-slate-500 uppercase tracking-wider";
const panelClass = "rounded-xl border border-slate-200 bg-white shadow-sm";
const contentClass = "mt-3 rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm leading-6 text-slate-700 whitespace-pre-wrap";

function formatSessionDate(dateValue) {
  if (!dateValue) return "—";
  try {
    return new Date(dateValue).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatSessionTime(timeValue) {
  if (!timeValue) return "—";
  const raw = String(timeValue).split(".")[0].trim();
  const [hours, minutes] = raw.split(":");
  const hourNum = parseInt(hours, 10);
  const minuteNum = parseInt(minutes, 10);
  if (Number.isNaN(hourNum) || Number.isNaN(minuteNum)) return raw;
  const period = hourNum >= 12 ? "PM" : "AM";
  const hour12 = hourNum % 12 || 12;
  return `${hour12}:${String(minuteNum).padStart(2, "0")} ${period}`;
}

function getClientLabel(session) {
  const fullName = `${session?.client?.first_name || ""} ${session?.client?.last_name || ""}`.trim();
  return fullName || session?.client?.child_name || "—";
}

function NotesSection({ icon: Icon, title, subtitle, value, tone = "slate" }) {
  const toneMap = {
    blue: {
      icon: "text-blue-600",
      box: "border-blue-200 bg-blue-50/80",
    },
    green: {
      icon: "text-emerald-600",
      box: "border-emerald-200 bg-emerald-50/80",
    },
    purple: {
      icon: "text-purple-600",
      box: "border-purple-200 bg-purple-50/80",
    },
    slate: {
      icon: "text-slate-600",
      box: "border-slate-200 bg-slate-50/80",
    },
  };

  const styles = toneMap[tone] || toneMap.slate;

  return (
    <section className={panelClass}>
      <div className="px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200">
            <Icon className={`h-4 w-4 ${styles.icon}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
              {subtitle ? <span className="text-[11px] text-slate-500">{subtitle}</span> : null}
            </div>
            <div className={`${contentClass} ${styles.box}`}>
              {value ? (
                value
              ) : (
                <span className="italic text-slate-400">No {title.toLowerCase()} added.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function SessionNotesModal({
  isOpen,
  onClose,
  session,
}) {
  if (!isOpen || !session) return null;

  const sessionTypeLabel =
    session.session_type === "assessment" || session.type === "assessment"
      ? "Assessment"
      : session.session_type === "package" || session.package_id
        ? "Package Session"
        : session.session_type === "couple"
          ? "Couple Session"
          : "Individual Session";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#025545]/10">
                <ClipboardList className="h-5 w-5 text-[#025545]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Completed Session Notes</h2>
                <p className="text-sm text-slate-500">Summary, report, and private notes for this session.</p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(90vh-88px)] overflow-y-auto px-6 py-6">
          <section className={`${panelClass} mb-6`}>
            <div className="px-5 py-4">
              <p className={sectionTitleClass}>Session Details</p>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <User className="h-3.5 w-3.5" />
                    Client
                  </div>
                  <div className="mt-1.5 text-sm font-medium text-slate-900">{getClientLabel(session)}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <Calendar className="h-3.5 w-3.5" />
                    Date
                  </div>
                  <div className="mt-1.5 text-sm font-medium text-slate-900">{formatSessionDate(session.scheduled_date)}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <Clock className="h-3.5 w-3.5" />
                    Time
                  </div>
                  <div className="mt-1.5 text-sm font-medium text-slate-900">{formatSessionTime(session.scheduled_time)}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                  <div className="text-xs font-medium text-slate-500">Type</div>
                  <div className="mt-1.5 text-sm font-medium text-slate-900">{sessionTypeLabel}</div>
                </div>
              </div>
            </div>
          </section>

          <div className="space-y-4">
            <NotesSection
              icon={FileText}
              title="Session Summary"
              subtitle="Shared via WhatsApp"
              value={session.summary}
              tone="blue"
            />
            <NotesSection
              icon={FileText}
              title="Session Report"
              subtitle="Internal Only"
              value={session.report}
              tone="green"
            />
            <NotesSection
              icon={EyeOff}
              title="Private Notes"
              subtitle="Only visible to psychologist"
              value={session.summary_notes || session.session_notes}
              tone="purple"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
