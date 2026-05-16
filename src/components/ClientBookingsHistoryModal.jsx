'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Loader2,
  Calendar,
  User,
  Package,
  ChevronRight,
  MoreVertical,
  Copy,
  Check,
  Eye,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { sessionsApi } from '@/lib/backendApi';
import { sessionBookedAtIso } from '@/lib/sessionBookedAt';

function scheduledSlotMs(s) {
  const d = s?.scheduled_date;
  if (!d) return 0;
  const dateOnly = String(d).slice(0, 10);
  const rawT = s.scheduled_time != null ? String(s.scheduled_time) : '00:00:00';
  const t = rawT.split('.')[0].trim();
  const parts = t.split(':');
  const hh = String(parts[0] || '00').padStart(2, '0');
  const mm = String(parts[1] || '00').padStart(2, '0');
  const ss = String((parts[2] || '00').split('.')[0]).padStart(2, '0');
  const ms = new Date(`${dateOnly}T${hh}:${mm}:${ss}`).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function formatDateLabel(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function formatTimeLabel(t) {
  if (t == null || t === '') return '';
  const raw = String(t).split('.')[0].trim();
  const [h, m] = raw.split(':');
  if (h == null || m == null) return raw;
  const hr = parseInt(h, 10);
  const min = parseInt(m, 10);
  if (Number.isNaN(hr) || Number.isNaN(min)) return raw;
  const period = hr >= 12 ? 'PM' : 'AM';
  const h12 = hr % 12 || 12;
  return `${h12}:${String(min).padStart(2, '0')} ${period}`;
}

function statusLabel(status) {
  if (!status) return '—';
  const s = String(status).toLowerCase();
  const map = {
    booked: 'Booked',
    scheduled: 'Scheduled',
    rescheduled: 'Rescheduled',
    reschedule_requested: 'Reschedule requested',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_show: 'No show',
    noshow: 'No show',
    confirmed: 'Confirmed',
  };
  return map[s] || status;
}

function packageProgressLine(pkg, sessionsInGroup) {
  const total =
    pkg?.session_count ?? pkg?.total_sessions ?? (sessionsInGroup?.length || 0);
  const completed = (sessionsInGroup || []).filter((x) => x.status === 'completed').length;
  const upcoming = (sessionsInGroup || []).filter((x) =>
    ['booked', 'scheduled', 'rescheduled', 'reschedule_requested', 'confirmed'].includes(
      String(x.status || '').toLowerCase()
    )
  ).length;
  if (total > 0 && completed >= total) {
    return `Complete · ${completed}/${total}`;
  }
  if (total > 0) {
    return `${completed}/${total} done${upcoming ? ` · ${upcoming} upcoming` : ''}`;
  }
  return `${completed} session(s)`;
}

function copyText(text, setDone) {
  if (!text || typeof navigator === 'undefined' || !navigator.clipboard) return;
  navigator.clipboard.writeText(text).then(() => {
    setDone?.(true);
    setTimeout(() => setDone?.(false), 1600);
  });
}

/** @param {{ entries: { label: string; value: string | null | undefined }[]; onViewDetails?: () => void }} props */
function IdMenu({ entries, onViewDetails }) {
  const [copied, setCopied] = useState(false);
  const clean = entries.filter((e) => e.value != null && String(e.value).length > 0);
  const showMenu = clean.length > 0 || onViewDetails;
  if (!showMenu) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 -mr-1"
          aria-label="Session actions"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <MoreVertical className="h-3.5 w-3.5" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="z-[300] w-[min(100vw-2rem,22rem)] text-xs shadow-xl ring-1 ring-slate-200/80"
      >
        {onViewDetails && (
          <>
            <DropdownMenuItem
              className="cursor-pointer gap-2 py-2"
              onSelect={(ev) => {
                ev.preventDefault();
                onViewDetails();
              }}
            >
              <Eye className="h-3.5 w-3.5 shrink-0 text-slate-600" />
              <span>View details</span>
            </DropdownMenuItem>
            {clean.length > 0 && <DropdownMenuSeparator />}
          </>
        )}
        {clean.length > 0 && (
          <>
            <DropdownMenuLabel className="text-[10px] font-normal text-slate-500 uppercase tracking-wide">
              Copy ID
            </DropdownMenuLabel>
            {clean.map((e) => (
              <DropdownMenuItem
                key={e.label}
                className="flex flex-col items-start gap-0.5 py-2 cursor-pointer"
                onSelect={(ev) => {
                  ev.preventDefault();
                  copyText(String(e.value), setCopied);
                }}
              >
                <span className="text-[10px] text-slate-500">{e.label}</span>
                <span className="font-mono text-[11px] text-slate-800 break-all">{e.value}</span>
                <span className="flex items-center gap-1 text-[10px] text-[#3f2e73]">
                  <Copy className="h-3 w-3" /> Tap to copy
                </span>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DetailRow({ label, value }) {
  if (value == null || value === '') return null;
  const str = String(value);
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2 text-[11px] border-b border-slate-100 last:border-0 py-2">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="text-slate-800">{str}</span>
    </div>
  );
}

/**
 * @param {{ open: boolean; onClose: () => void; payload: { session: object; packageId?: string | null; kind?: string } | null }} props
 */
function SessionDetailOverlay({ open, onClose, payload }) {
  const [copiedLine, setCopiedLine] = useState(null);

  if (!open || !payload?.session) return null;

  const s = payload.session;
  const packageId = payload.packageId ?? s.package_id ?? null;
  const psych = s.psychologist;
  const psychName = psych
    ? `${psych.first_name || ''} ${psych.last_name || ''}`.trim()
    : null;
  const isAssessment =
    s._kind === 'assessment' ||
    s.session_type === 'assessment' ||
    s.type === 'assessment' ||
    s.assessment_id;

  const title = isAssessment
    ? `Assessment${s.assessment_title ? ` · ${s.assessment_title}` : ''}`
    : packageId
      ? 'Package session'
      : 'Individual therapy';

  const copyOne = (key, text) => {
    if (text == null || typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(String(text)).then(() => {
      setCopiedLine(key);
      setTimeout(() => setCopiedLine(null), 1600);
    });
  };

  const idRows = [
    { key: 'session', label: 'Session ID', value: s.id },
    { key: 'package', label: 'Package ID', value: packageId },
    { key: 'payment', label: 'Payment ID', value: s.payment_id },
    { key: 'assessment', label: 'Assessment ID', value: s.assessment_id },
  ].filter((r) => r.value != null && String(r.value).length > 0);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 sm:p-6 bg-slate-950/55 backdrop-blur-md"
      style={{ zIndex: 100200 }}
      role="presentation"
      onClick={onClose}
    >
      <div
        className="relative z-[1] w-full max-w-md max-h-[min(82vh,600px)] flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_25px_50px_-12px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/90 pointer-events-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100/90 bg-gradient-to-b from-slate-50/90 to-white px-4 py-3">
          <p
            id="session-detail-title"
            className="m-0 pr-2 text-sm font-semibold text-slate-900"
          >
            {title}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-800 shrink-0"
            aria-label="Close details"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/40 px-4 py-4 text-[11px]">
          <p className="m-0 mb-2 !text-[9px] font-medium uppercase tracking-wide text-slate-400">Summary</p>
          <div className="mb-4 space-y-1.5 rounded-xl border border-slate-100 bg-white px-3 py-2.5 shadow-sm">
            <DetailRow label="Status" value={statusLabel(s.status)} />
            <DetailRow label="Booked" value={formatDateLabel(sessionBookedAtIso(s))} />
            <DetailRow
              label="Scheduled"
              value={`${formatDateLabel(s.scheduled_date)}${s.scheduled_time ? ` · ${formatTimeLabel(s.scheduled_time)}` : ''}`}
            />
            <DetailRow label="Therapist" value={psychName || (isAssessment ? 'Unassigned' : '—')} />
            {s.session_type && <DetailRow label="Session type" value={s.session_type} />}
            {s.price != null && s.price !== '' && <DetailRow label="Price" value={String(s.price)} />}
          </div>

          <p className="m-0 mb-2 !text-[9px] font-medium uppercase tracking-wide text-slate-400">Identifiers</p>
          <div className="rounded-xl border border-slate-200 bg-white px-2 shadow-sm">
            {idRows.map((r) => (
              <div
                key={r.key}
                className="flex items-start justify-between gap-2 border-b border-slate-100 last:border-0 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] text-slate-500">{r.label}</div>
                  <div className="font-mono text-[10px] text-slate-900 break-all mt-0.5">{r.value}</div>
                </div>
                <button
                  type="button"
                  onClick={() => copyOne(r.key, String(r.value))}
                  className="shrink-0 p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-[#3f2e73]"
                  title="Copy"
                >
                  {copiedLine === r.key ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function SessionBlock({ s, packageId, onViewDetails }) {
  const name = s.psychologist
    ? `${s.psychologist.first_name || ''} ${s.psychologist.last_name || ''}`.trim()
    : null;

  const idEntries = [
    { label: 'Session', value: s.id },
    { label: 'Package', value: packageId || null },
  ];

  return (
    <div className="rounded-lg border border-slate-100 bg-white px-3 py-2.5 text-[11px] leading-snug">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-slate-800 font-medium">{statusLabel(s.status)}</div>
          <div className="mt-1 space-y-0.5 text-slate-600">
            <div>
              <span className="text-slate-400">Booked</span> {formatDateLabel(sessionBookedAtIso(s))}
            </div>
            <div>
              <span className="text-slate-400">Scheduled</span> {formatDateLabel(s.scheduled_date)}
              {s.scheduled_time ? ` · ${formatTimeLabel(s.scheduled_time)}` : ''}
            </div>
            <div className="flex items-center gap-1">
              <User className="h-3 w-3 text-slate-400 shrink-0" />
              <span>{name || '—'}</span>
            </div>
          </div>
        </div>
        <IdMenu entries={idEntries} onViewDetails={onViewDetails} />
      </div>
    </div>
  );
}

export default function ClientBookingsHistoryModal({ isOpen, onClose, clientId, displayName }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sessionDetailPayload, setSessionDetailPayload] = useState(null);

  useEffect(() => {
    if (!isOpen) setSessionDetailPayload(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !clientId) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setSessions([]);
      try {
        const response = await sessionsApi.getAllSessions({
          client_id: clientId,
          page: 1,
          limit: 500,
          sort: 'scheduled_date',
          order: 'desc',
        });
        if (cancelled) return;
        if (!response?.success) {
          setError(response?.message || 'Failed to load bookings');
          setSessions([]);
          return;
        }
        const list = response?.data?.sessions || [];
        setSessions(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || 'Failed to load bookings');
          setSessions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, clientId]);

  const { packageGroups, individuals } = useMemo(() => {
    const byPackage = new Map();
    const indiv = [];
    for (const s of sessions) {
      const isAssessment =
        s.session_type === 'assessment' || s.type === 'assessment' || s.assessment_id;
      if (isAssessment) {
        indiv.push({ ...s, _kind: 'assessment' });
        continue;
      }
      if (s.package_id) {
        const pid = s.package_id;
        if (!byPackage.has(pid)) {
          byPackage.set(pid, {
            package: s.package || {
              id: pid,
              name: 'Therapy package',
              session_count: null,
            },
            package_id: pid,
            sessions: [],
          });
        }
        byPackage.get(pid).sessions.push(s);
      } else {
        indiv.push({ ...s, _kind: 'therapy' });
      }
    }
    for (const g of byPackage.values()) {
      g.sessions.sort((a, b) => scheduledSlotMs(a) - scheduledSlotMs(b));
    }
    const packageGroups = Array.from(byPackage.values()).sort((a, b) => {
      const am = Math.max(0, ...a.sessions.map(scheduledSlotMs));
      const bm = Math.max(0, ...b.sessions.map(scheduledSlotMs));
      return bm - am;
    });
    indiv.sort((a, b) => scheduledSlotMs(b) - scheduledSlotMs(a));
    return {
      packageGroups,
      individuals: indiv,
    };
  }, [sessions]);

  if (!isOpen) return null;

  return (
    <>
    <div
      className={`fixed inset-0 flex items-center justify-center p-4 sm:p-8 bg-slate-950/40 backdrop-blur-md transition-none ${
        sessionDetailPayload ? 'z-[90] pointer-events-none' : 'z-[100]'
      }`}
      aria-hidden={sessionDetailPayload ? true : undefined}
    >
      <div
        className="flex w-full max-w-2xl max-h-[92vh] min-h-[min(440px,86vh)] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_25px_60px_-15px_rgba(15,23,42,0.45)] ring-1 ring-slate-200/80"
        role="dialog"
        aria-labelledby="bookings-history-title"
      >
        {/* Header — compact (use p not h* so global heading styles never apply) */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100/90 bg-gradient-to-b from-slate-50/90 to-white px-5 py-4">
          <div className="min-w-0 pt-0.5">
            <p
              id="bookings-history-title"
              role="heading"
              aria-level={2}
              className="m-0 p-0 !text-[11px] font-semibold leading-none text-slate-500 uppercase tracking-wider"
            >
              Bookings history
            </p>
            {displayName && (
              <p className="text-base font-medium text-slate-900 truncate mt-1 leading-snug">{displayName}</p>
            )}
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto bg-slate-50/30 px-5 py-6">
          {!clientId && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-md px-2.5 py-2 leading-relaxed">
              No client profile is linked to this account. History cannot be loaded.
            </p>
          )}

          {clientId && loading && (
            <div className="flex items-center justify-center py-14 text-slate-400">
              <Loader2 className="h-7 w-7 animate-spin text-[#3f2e73]" />
            </div>
          )}

          {clientId && !loading && error && <p className="text-xs text-red-600">{error}</p>}

          {clientId && !loading && !error && sessions.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-10">No bookings for this client.</p>
          )}

          {clientId && !loading && !error && sessions.length > 0 && (
            <>
              {packageGroups.length > 0 && (
                <section>
                  <p
                    role="heading"
                    aria-level={3}
                    className="m-0 p-0 !text-sm font-semibold leading-snug text-slate-500 uppercase tracking-wide mb-3.5"
                  >
                    Packages
                  </p>
                  <div className="space-y-3">
                    {packageGroups.map((group) => {
                      const pkg = group.package;
                      const pid = group.package_id;
                      const title = pkg?.name || pkg?.description || 'Therapy package';
                      const packageIdEntries = [{ label: 'Package (catalog) ID', value: pid }];

                      return (
                        <details
                          key={pid}
                          className="border border-slate-200 rounded-lg bg-slate-50/50 open:bg-white open:[&_.chevron-pkg]:rotate-90"
                        >
                          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-left [&::-webkit-details-marker]:hidden">
                            <ChevronRight className="chevron-pkg h-3.5 w-3.5 text-slate-400 shrink-0 transition-transform duration-200" />
                            <Package className="h-3.5 w-3.5 text-[#3f2e73] shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-medium text-slate-900 leading-tight">{title}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                {packageProgressLine(pkg, group.sessions)} · {group.sessions.length} session
                                {group.sessions.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                            <span
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                              className="inline-flex shrink-0"
                              role="presentation"
                            >
                              <IdMenu entries={packageIdEntries} />
                            </span>
                          </summary>
                          <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-100">
                            {group.sessions.map((s) => (
                              <SessionBlock
                                key={s.id}
                                s={s}
                                packageId={pid}
                                onViewDetails={() =>
                                  setSessionDetailPayload({
                                    session: s,
                                    packageId: pid,
                                  })
                                }
                              />
                            ))}
                          </div>
                        </details>
                      );
                    })}
                  </div>
                </section>
              )}

              {individuals.length > 0 && (
                <section>
                  <p
                    role="heading"
                    aria-level={3}
                    className="m-0 p-0 !text-sm font-semibold leading-snug text-slate-500 uppercase tracking-wide mb-3.5"
                  >
                    Individual &amp; assessments
                  </p>
                  <div className="space-y-3">
                    {individuals.map((s) => {
                      const isAssess = s._kind === 'assessment';
                      const idEntries = [
                        { label: 'Session', value: s.id },
                        ...(s.assessment_id
                          ? [{ label: 'Assessment', value: s.assessment_id }]
                          : []),
                      ];

                      return (
                        <div
                          key={s.id}
                          className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-[11px]"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                                <Calendar
                                  className={`h-3.5 w-3.5 shrink-0 ${isAssess ? 'text-teal-600' : 'text-slate-500'}`}
                                />
                                <span>
                                  {isAssess
                                    ? `Assessment${s.assessment_title ? ` · ${s.assessment_title}` : ''}`
                                    : 'Individual therapy'}
                                </span>
                                <span className="text-slate-400 font-normal">· {statusLabel(s.status)}</span>
                              </div>
                              <div className="mt-1.5 space-y-0.5 text-slate-600">
                                <div>
                                  <span className="text-slate-400">Booked</span> {formatDateLabel(sessionBookedAtIso(s))}
                                </div>
                                <div>
                                  <span className="text-slate-400">Scheduled</span>{' '}
                                  {formatDateLabel(s.scheduled_date)}
                                  {s.scheduled_time ? ` · ${formatTimeLabel(s.scheduled_time)}` : ''}
                                </div>
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3 text-slate-400 shrink-0" />
                                  {s.psychologist
                                    ? `${s.psychologist.first_name || ''} ${s.psychologist.last_name || ''}`.trim()
                                    : isAssess
                                      ? 'Unassigned'
                                      : '—'}
                                </div>
                              </div>
                            </div>
                            <IdMenu
                              entries={idEntries}
                              onViewDetails={() =>
                                setSessionDetailPayload({
                                  session: s,
                                  packageId: s.package_id || null,
                                })
                              }
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>

    {typeof document !== 'undefined' &&
      sessionDetailPayload &&
      createPortal(
        <SessionDetailOverlay
          open
          onClose={() => setSessionDetailPayload(null)}
          payload={sessionDetailPayload}
        />,
        document.body
      )}
    </>
  );
}
