'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, Loader2, Search, Mail, Phone, CloudDownload, MoreVertical, Eye, Edit, Trash2, CheckCircle, X, Save, AlertCircle, Package, Video, Calendar, Filter, XCircle, ArrowRightLeft, PauseCircle, MessageSquare, Paperclip } from 'lucide-react';
import { adminApi, sessionsApi } from '@/lib/backendApi';
import { useNotification } from '@/contexts/NotificationContext';
import { wixBookingBookedAtIso } from '@/lib/sessionBookedAt';
import DateRangePicker from '@/components/ui/date-range-picker';
import { hasDateRangeBounds } from '@/lib/dateRangeBounds';
import { formatIstCalendarYmd, istCalendarMonthBounds } from '@/lib/wixFinanceDates';
import AdminBookNextPackageSessionModal from '@/components/AdminBookNextPackageSessionModal';
import AdminRescheduleModal from '@/components/AdminRescheduleModal';
import AdminManualBookingModal from '@/components/AdminManualBookingModal';
import AdminTransferSessionModal from '@/components/AdminTransferSessionModal';

function fmtDateTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

// Format a plain IST wall-clock date ("YYYY-MM-DD") + time ("HH:MM:SS") pair —
// these are stored as literal local values, not UTC, so no timezone conversion here.
function fmtOrigDateTime(dateStr, timeStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(`${dateStr}T00:00:00`);
    const dateLabel = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    if (!timeStr) return dateLabel;
    const [hh, mm] = String(timeStr).split(':');
    const h = parseInt(hh, 10);
    if (Number.isNaN(h)) return dateLabel;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${dateLabel}, ${h12}:${mm} ${ampm}`;
  } catch {
    return null;
  }
}

function deriveSessionType(row) {
  const type = row.session_type || null;
  const count = row.session_count;
  const idx = row.session_index;
  const p = row.payload || {};
  const rawCredits = p.pricingPlanInfo?.credits || {};
  const isCouple = type === 'couple';
  const isChild = !!row.package_parent_booking_id && !!idx;
  const hasSeriesEvidence = (count ?? 0) > 1
    || row.package_session_number != null
    || isChild
    || p.planSessionNumber != null
    || (p.creditsAvailable != null && Number(p.creditsAvailable) > 1)
    || (rawCredits.available != null && Number(rawCredits.available) > 1);
  const isPkg = (type === 'package' && hasSeriesEvidence) || isChild;

  // Derive session number: DB column → Velo planSessionNumber → raw pricingPlanInfo.credits
  const pkgNum = row.package_session_number
    ?? p.planSessionNumber
    ?? (rawCredits.available != null && rawCredits.remaining != null ? rawCredits.available - rawCredits.remaining : null)
    ?? null;
  // Derive total: DB column → Velo creditsAvailable → raw credits.available → detectedSessionCount
  const pkgTotal = count ?? p.creditsAvailable ?? rawCredits.available ?? p.detectedSessionCount ?? null;
  const hasPlan = !!(pkgNum || (rawCredits.available != null)) && !!(p.creditsAvailable || rawCredits.available);
  const pkgSuffix = pkgNum && pkgTotal ? ` (${pkgNum}/${pkgTotal})` : pkgNum ? ` (${pkgNum})` : pkgTotal && pkgTotal > 1 ? ` (1/${pkgTotal})` : '';

  // A couple session with series evidence (count > 1, a session number, etc.) is a couple
  // PACKAGE — even for admin-booked ones that lack a Wix pricing-plan payload.
  if (isCouple && (hasPlan || isPkg || hasSeriesEvidence)) return `Couple Pkg${pkgSuffix}`;
  if (isCouple) return 'Couple';
  if (hasPlan || (isPkg && pkgNum)) return `Pkg${pkgSuffix}`;
  if (isChild) return count ? `Session ${idx} of ${count} (Pkg)` : `Session ${idx} (Pkg)`;
  if (isPkg) {
    if (count && count > 1) return `Pkg (1/${count})`;
    return 'Pkg';
  }
  if (type === 'assessment') return 'Assessment';
  if (type === 'discovery') return 'Discovery';
  if (type === 'individual') return 'Individual';
  if (type === 'class') return 'Class';
  if (type) return type;
  return null;
}

function derivePaymentMethod(row) {
  const vendors = row.payload?.paymentDetails?.wixPayMultipleDetails;
  if (Array.isArray(vendors) && vendors.length > 0) {
    const v = vendors[0].paymentVendorName;
    if (v === 'inPerson') return 'Manual';
    if (v === 'Razorpay') return 'Razorpay';
    if (v) return v;
  }
  const state = row.payload?.paymentState;
  if (state === 'FREE') return 'Free';
  if (parseFloat(row.price || '0') === 0) return 'Free';
  // A completed Wix payment collapses wixPayMultipleDetails to [] and only reports
  // paymentState:'COMPLETE' (the vendor breakdown is gone). For Koott, a completed
  // online Wix payment with a real price = Razorpay (the only online gateway).
  if (state === 'COMPLETE' && !row.payload?.isAdminManual) return 'Razorpay';
  if (state === 'COMPLETE') return null;
  return null;
}

function DeliveryDot({ done, on, label, compact = false }) {
  const statusLabel = done ? 'sent' : 'not sent';
  const dotRef = useRef(null);
  const [tooltipPos, setTooltipPos] = useState(null);

  const showTooltip = useCallback(() => {
    if (!dotRef.current || typeof window === 'undefined') return;
    const rect = dotRef.current.getBoundingClientRect();
    setTooltipPos({
      left: rect.left + rect.width / 2,
      top: rect.top - 8,
    });
  }, []);

  const hideTooltip = useCallback(() => {
    setTooltipPos(null);
  }, []);

  return (
    <span
      className={`relative inline-flex ${compact ? 'items-center gap-1.5' : ''}`}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      <span
        ref={dotRef}
        aria-label={`${label}: ${statusLabel}`}
        className={`inline-block h-2 w-2 rounded-full ${done ? on : 'bg-gray-200 ring-1 ring-inset ring-gray-300'}`}
      />
      {compact && (
        <span className="text-xs text-gray-600">{label}</span>
      )}
      {tooltipPos && typeof document !== 'undefined' && createPortal(
        <span
          className="pointer-events-none fixed z-[9999] -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white shadow-xl"
          style={{ left: tooltipPos.left, top: tooltipPos.top }}
        >
          {label}: {statusLabel}
        </span>,
        document.body
      )}
    </span>
  );
}

// Three delivery dots shown under the session details: green = WhatsApp sent,
// blue = email sent, red = calendar event created. A dot is coloured when that channel
// succeeded and greyed when it hasn't (so a missing/failed send is visible at a glance).
function DeliveryDots({ row, showLabels = false }) {
  const hasLegacyNotification = !!row.notified_at;
  const hasMeetLink = !!(row.google_meet_link || row.google_meet_join_url || row.google_meet_start_url);
  const hasCalendarEvent = !!row.google_calendar_event_id;
  const dots = [
    { done: !!(row.whatsapp_sent_at || hasLegacyNotification), on: 'bg-green-500', label: 'WhatsApp' },
    { done: !!(row.email_sent_at || hasLegacyNotification), on: 'bg-blue-500', label: 'Email' },
    { done: hasMeetLink, on: 'bg-orange-500', label: 'Meet link' },
    { done: hasCalendarEvent, on: 'bg-red-500', label: 'Calendar' },
  ];
  return (
    <div className={`flex flex-wrap items-center ${showLabels ? 'gap-x-3 gap-y-2' : 'gap-1'} mt-1.5`}>
      {dots.map((d) => (
        <DeliveryDot
          key={d.label}
          done={d.done}
          on={d.on}
          label={d.label}
          compact={showLabels}
        />
      ))}
    </div>
  );
}

function statusBadge(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'completed') return 'bg-green-100 text-green-800';
  if (s === 'cancelled') return 'bg-red-100 text-red-800';
  if (s === 'deleted') return 'bg-red-50 text-red-400 line-through';
  if (s === 'booked') return 'bg-emerald-100 text-emerald-800';
  if (s === 'no_show') return 'bg-amber-100 text-amber-900';
  if (s === 'on_hold') return 'bg-orange-100 text-orange-800';
  if (s === 'pending') return 'bg-yellow-100 text-yellow-800';
  return 'bg-slate-100 text-slate-700';
}

function effectiveCompletionStatus(row) {
  const primary = String(row?.status || '').toLowerCase();
  const linked = String(row?.session_status || '').toLowerCase();
  return linked || primary;
}

// Absolute start instant (ms) of a session. scheduled_date/time are IST wall-clock;
// wix start_time is already an absolute UTC instant.
function sessionStartMs(row) {
  if (row?.scheduled_date && row?.scheduled_time) {
    const [y, m, d] = String(row.scheduled_date).split('-').map(Number);
    const [hh = 0, mm = 0, ss = 0] = String(row.scheduled_time).split(':').map(Number);
    if (y && m && d) return Date.UTC(y, m - 1, d, hh, mm, ss) - 5.5 * 3600 * 1000; // IST → UTC
  }
  if (row?.start_time) {
    const t = Date.parse(row.start_time);
    if (!Number.isNaN(t)) return t;
  }
  return null;
}

// Status to SHOW in the badge. A session whose scheduled time has passed but that the
// doctor hasn't marked completed yet reads as "pending" (awaiting completion) instead of
// "booked". Display-only — does NOT affect action gating (Mark Complete etc.).
function displayStatusFor(row) {
  const st = effectiveCompletionStatus(row);
  if (['booked', 'scheduled', 'confirmed', 'rescheduled', 'reschedule_requested'].includes(st)) {
    const startMs = sessionStartMs(row);
    if (startMs != null && startMs <= Date.now()) return 'pending';
  }
  return st;
}

// Whether a row belongs under the selected status tab, using the DISPLAYED status so tabs
// stay consistent with the badges. A past-due active row displays as "pending", so it must
// only appear under Pending — not under Upcoming/Rescheduled. Guards the platform rows (which
// the backend can't filter by past-due) and back-stops the Wix rows.
function matchesStatusTab(row, tab) {
  if (!tab || tab === 'all') return true;
  const disp = displayStatusFor(row);
  if (tab === 'booked') return ['booked', 'scheduled', 'confirmed', 'rescheduled', 'reschedule_requested'].includes(disp);
  if (tab === 'no_show') return disp === 'no_show' || disp === 'noshow';
  return disp === tab;
}

export default function AdminWixDiscoverPage() {
  const { showError, showSuccess } = useNotification();
  const initializedRef = useRef(false);
  const calendarRefreshAttemptsRef = useRef(new Set());
  const [initialSyncDone, setInitialSyncDone] = useState(false);
  const [loading, setLoading] = useState(false);
  // Monotonic id for load() calls — only the newest response is allowed to render.
  const loadSeqRef = useRef(0);
  const [syncing, setSyncing] = useState(false);
  const [rows, setRows] = useState([]);
  const [platformRows, setPlatformRows] = useState([]);
  // Stable package A/B/C labels computed by the backend over ALL of a client's packages
  // (filter/page independent). Shape: { "<clientId>|<psychId>": { "<groupId>": "A" } }.
  const [packageLabelMap, setPackageLabelMap] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  // Debounced copy used for the actual fetch — typing updates searchTerm instantly (input
  // stays responsive) but we only query after a short pause, so rapid keystrokes don't fire
  // a burst of overlapping requests whose out-of-order responses flicker "no results".
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [wixFilterType, setWixFilterType] = useState('all');
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState(() => istCalendarMonthBounds(new Date()));
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  const statusTabs = [
    { label: 'All', value: 'all' },
    { label: 'Upcoming', value: 'booked' },
    { label: 'Completed', value: 'completed' },
    { label: 'No Show', value: 'no_show' },
    { label: 'Cancelled', value: 'cancelled' },
    { label: 'On Hold', value: 'on_hold' },
    { label: 'Pending', value: 'pending' },
    { label: 'Rescheduled', value: 'rescheduled' },
  ];

  const wixTypeTabs = [
    { label: 'All', value: 'all' },
    { label: 'Individual', value: 'individual' },
    { label: 'Couple', value: 'couple' },
    { label: 'Package', value: 'package' }
  ];

  // Update wix filter type
  const handleTypeChange = (type) => {
    setWixFilterType(type);
  };

  // Action state
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [viewingRow, setViewingRow] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteIsPlatform, setDeleteIsPlatform] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isBookNextOpen, setIsBookNextOpen] = useState(false);
  const [selectedBookNextSession, setSelectedBookNextSession] = useState(null);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [selectedRescheduleSession, setSelectedRescheduleSession] = useState(null);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [selectedTransferSession, setSelectedTransferSession] = useState(null);
  const [isManualBookingOpen, setIsManualBookingOpen] = useState(false);
  const [isAddRecordOpen, setIsAddRecordOpen] = useState(false);
  const [cancelRefundRow, setCancelRefundRow] = useState(null);
  const [cancelOnlyRow, setCancelOnlyRow] = useState(null);
  const [completeConfirmRow, setCompleteConfirmRow] = useState(null);
  const [messageToView, setMessageToView] = useState(null);

  function parseTherapistReport(text) {
    if (!text) return { main: '', operations: '', clientStatement: '', attachments: [] };
    const opsMatch = text.match(/---\s*Message to Operations\s*---([\s\S]*?)(?:---|$)/);
    const clientMatch = text.match(/---\s*Client Opening Statement\s*---([\s\S]*?)(?:---|$)/);
    const attachMatch = text.match(/---\s*Operation Attachments\s*---([\s\S]*?)(?:---|$)/);
    const reportMatch = text.match(/---\s*Report\s*---([\s\S]*?)(?:---|$)/);
    let main = text.split(/---/)[0].trim();
    if (!main && reportMatch) main = reportMatch[1].trim();
    const attachLines = attachMatch ? attachMatch[1].trim().split('\n').filter(Boolean) : [];
    const attachments = attachLines.map(line => {
      const m = line.match(/^-\s*\[([^\]]+)\]:\s*(.+)$/);
      return m ? { name: m[1], url: m[2].trim() } : { name: line.replace(/^-\s*/, ''), url: null };
    });
    return {
      main,
      operations: opsMatch ? opsMatch[1].trim() : '',
      clientStatement: clientMatch ? clientMatch[1].trim() : '',
      attachments
    };
  }
  const [psychologists, setPsychologists] = useState([]);

  // Close action menu when user scrolls (menu is fixed-position so it won't follow the row)
  useEffect(() => {
    if (!openMenuId) return;
    const close = () => setOpenMenuId(null);
    window.addEventListener('scroll', close, { passive: true, capture: true });
    return () => window.removeEventListener('scroll', close, { capture: true });
  }, [openMenuId]);

  const hasActiveFilters =
    Boolean(searchTerm.trim()) || hasDateRangeBounds(dateRange) || wixFilterType !== 'all' || (statusFilter !== 'booked' && statusFilter !== 'all');
  const isSearchPending = searchTerm.trim() !== debouncedSearchTerm.trim();

  const load = useCallback(async (targetPage = 1) => {
    // Race guard: several triggers can call load() at once (search change, the load identity
    // changing, the 6s calendar re-check). Without this, a slower EARLIER request can resolve
    // after a newer one and overwrite the screen with stale rows — the "wrong data flickers,
    // then corrects itself" behaviour. Only the newest request is allowed to render.
    const seq = ++loadSeqRef.current;
    const isStale = () => seq !== loadSeqRef.current;
    setLoading(true);
    try {
      const dateParams = hasDateRangeBounds(dateRange) ? {
        dateFrom: formatIstCalendarYmd(dateRange.from),
        dateTo: formatIstCalendarYmd(dateRange.to),
      } : {};

      // Fetch Wix bookings (wix_bookings table)
      const [res, platformRes, labelsRes] = await Promise.all([
        adminApi.getWixBookings({
          page: targetPage, limit: 10,
          ...dateParams,
          search: debouncedSearchTerm.trim() || undefined,
          status: (statusFilter && statusFilter !== 'all') ? statusFilter : undefined,
          session_type: wixFilterType !== 'all' ? wixFilterType : undefined,
        }),
        // Fetch platform (manual) sessions from sessions table — non-wix source only
        sessionsApi.getAllSessions({
          page: 1,
          // Searching used to pull 200 rows and filter them in the browser. Push the term to
          // the server (getAllSessions supports `search`) so a search returns a small result
          // set instead of a 200-row payload — the main source of the slow search.
          limit: debouncedSearchTerm.trim() ? 50 : 200,
          search: debouncedSearchTerm.trim() || undefined,
          sort: 'created_at',
          order: 'desc',
          // Map wix status filter to platform status equivalents
          status: statusFilter === 'booked' ? ['booked', 'rescheduled']
            : statusFilter === 'all' ? undefined
            : statusFilter || undefined,
          ...dateParams,
        }).catch(() => null),
        // Stable A/B/C package labels. This scans every package session platform-wide, so it
        // must NOT run on each keystroke — the map is global and unaffected by the search.
        // Fetch it only when not searching; the existing map is reused during a search.
        debouncedSearchTerm.trim()
          ? Promise.resolve(null)
          : adminApi.getPackageLabels().catch(() => null),
      ]);

      if (isStale()) return; // a newer search/filter superseded this request
      if (labelsRes?.data?.labels) setPackageLabelMap(labelsRes.data.labels);

      if (!res?.success) throw new Error(res?.error || 'Failed to load Wix bookings');

      const allPlatformSessions = platformRes?.data?.sessions || [];
      const visibleWixBookingIds = (res.data?.bookings || [])
        .map((booking) => booking?.wix_booking_id)
        .filter(Boolean);
      const exactLinkedSessionsRes = visibleWixBookingIds.length
        ? await sessionsApi.getAllSessions({
            page: 1,
            limit: Math.max(visibleWixBookingIds.length, 50),
            wix_booking_id: visibleWixBookingIds,
          }).catch(() => null)
        : null;
      const exactLinkedSessions = exactLinkedSessionsRes?.data?.sessions || [];
      const exactWixSessionMap = new Map(
        exactLinkedSessions
          .filter((s) => s?.wix_booking_id)
          .map((s) => [s.wix_booking_id, s])
      );
      const wixSessionMap = new Map(
        allPlatformSessions
          .filter((s) => s?.wix_booking_id)
          .map((s) => [s.wix_booking_id, s])
      );

      const bookings = (res.data?.bookings || []).map((booking) => {
        const linkedSession = exactWixSessionMap.get(booking.wix_booking_id) || wixSessionMap.get(booking.wix_booking_id);
        if (!linkedSession) return booking;
        return {
          ...booking,
          session_id: booking.session_id || linkedSession.id || null,
          google_calendar_event_id: booking.google_calendar_event_id || linkedSession.google_calendar_event_id || null,
          google_calendar_link: booking.google_calendar_link || linkedSession.google_calendar_link || null,
          google_meet_link: booking.google_meet_link || linkedSession.google_meet_link || null,
          google_meet_join_url: booking.google_meet_join_url || linkedSession.google_meet_join_url || null,
          google_meet_start_url: booking.google_meet_start_url || linkedSession.google_meet_start_url || null,
          notified_at: booking.notified_at || linkedSession.notified_at || null,
          email_sent_at: booking.email_sent_at || linkedSession.email_sent_at || null,
          whatsapp_sent_at: booking.whatsapp_sent_at || linkedSession.whatsapp_sent_at || null,
        };
      });
      setRows(bookings);
      const p = res.data?.pagination || {};
      setPagination({ page: p.page || targetPage, limit: p.limit || 10, total: p.total || 0, totalPages: Math.max(1, Math.ceil((p.total || 0) / (p.limit || 10))) });
      setPage(p.page || targetPage);

      // Filter platform sessions to non-wix source only (exclude sessions already in wix_bookings)
      const wixBookingIdSet = new Set(bookings.map((b) => b.wix_booking_id).filter(Boolean));
      const platformOnly = allPlatformSessions.filter((s) => {
        const src = String(s.source || '').toLowerCase();
        if (src === 'wix') return false; // already in wix view
        if (s.wix_booking_id && wixBookingIdSet.has(s.wix_booking_id)) return false;
        // Apply session_type filter — Discovery's type tabs must filter platform rows too
        if (wixFilterType && wixFilterType !== 'all') {
          const t = String(s.session_type || '').toLowerCase();
          if (wixFilterType === 'package') {
            // Real package only — has package_id, package_session_number, or session_count > 1
            const isPkg = t === 'package' && (!!s.package_id || s.package_session_number != null || (Number(s.session_count) > 1));
            if (!isPkg) return false;
          } else if (t !== wixFilterType) {
            return false;
          }
        }
        // Apply search filter client-side
        if (debouncedSearchTerm.trim()) {
          const q = debouncedSearchTerm.trim().toLowerCase();
          const name = `${s.client?.first_name || ''} ${s.client?.last_name || ''}`.toLowerCase();
          const email = String(s.client?.user?.email || '').toLowerCase();
          const therapist = `${s.psychologist?.first_name || ''} ${s.psychologist?.last_name || ''}`.toLowerCase();
          if (!name.includes(q) && !email.includes(q) && !therapist.includes(q)) return false;
        }
        return true;
      });
      if (isStale()) return;
      setPlatformRows(platformOnly);
    } catch (e) {
      if (isStale()) return;
      showError(e?.message || 'Failed to load Wix bookings', 'Wix');
      setRows([]);
      setPlatformRows([]);
    } finally { if (!isStale()) setLoading(false); }
  }, [dateRange, debouncedSearchTerm, showError, wixFilterType, statusFilter]);

  const syncAndReload = useCallback(async ({ silentSuccess = false } = {}) => {
    setSyncing(true);
    try {
      const res = await adminApi.syncWixBookings();
      if (!res?.success) throw new Error(res?.error || res?.message || 'Failed to sync from Wix');
      if (!silentSuccess) showSuccess(res.message || 'Wix bookings synced', 'Wix');
      await load(1);
    } catch (e) {
      showError(e?.message || 'Failed to sync from Wix', 'Wix');
    } finally { setSyncing(false); }
  }, [load, showError, showSuccess]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    load(1).finally(() => setInitialSyncDone(true));
  }, [load]);

  // Load the therapist list for the Edit modal's Therapist dropdown. Runs when the modal
  // opens (and only if not already loaded) so the dropdown is always populated.
  useEffect(() => {
    if (!editingRow || psychologists.length > 0) return;
    adminApi.getPsychologists()
      .then((r) => { if (r?.success && Array.isArray(r.data)) setPsychologists(r.data); })
      .catch(() => {});
  }, [editingRow, psychologists.length]);

  // Debounce the search box → debouncedSearchTerm (used by load()). 350ms after the user
  // stops typing. Empty search applies immediately so clearing the box is instant.
  useEffect(() => {
    if (!searchTerm) { setDebouncedSearchTerm(''); return; }
    const t = setTimeout(() => setDebouncedSearchTerm(searchTerm), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    if (!initialSyncDone || syncing) return;
    if (page !== 1) { setPage(1); load(1); return; }
    load(1);
  }, [dateRange, debouncedSearchTerm, wixFilterType, statusFilter, load, initialSyncDone, syncing]);

  useEffect(() => {
    if (loading || syncing || !initialSyncDone) return;
    // Don't run the calendar re-check while the user is searching — its delayed load(page)
    // would land on top of the search results and swap them for a different page.
    if (debouncedSearchTerm.trim()) return;

    const pendingCalendarRows = [...rows, ...platformRows].filter((row) => {
      const hasCalendarEvent = !!row.google_calendar_event_id;
      const hasMeetLink = !!(row.google_meet_link || row.google_meet_join_url || row.google_meet_start_url);
      const hasSessionLink = !!(row.session_id || row.id);
      const status = String(displayStatusFor(row) || row.status || '').toLowerCase();
      return hasSessionLink && (!hasCalendarEvent || !hasMeetLink) && !['cancelled', 'refunded', 'deleted'].includes(status);
    });

    if (!pendingCalendarRows.length) return;

    const refreshKey = pendingCalendarRows
      .map((row) => String(row.session_id || row.id))
      .sort()
      .join('|');

    if (!refreshKey || calendarRefreshAttemptsRef.current.has(refreshKey)) return;
    calendarRefreshAttemptsRef.current.add(refreshKey);

    const timer = setTimeout(() => {
      load(page);
    }, 6000);

    return () => clearTimeout(timer);
  }, [rows, platformRows, loading, syncing, initialSyncDone, load, page, debouncedSearchTerm]);

  const handlePageChange = async (nextPage) => {
    const safePage = Math.max(1, Math.min(pagination.totalPages, nextPage));
    if (safePage === page) return;
    setPage(safePage);
    await load(safePage);
  };

  // --- Actions ---
  // Normalize a platform/manual session into the same shape the View/Edit modals expect
  // (Wix rows already carry these flat fields).
  const normalizeRowForModal = (row) => {
    if (!row._isPlatform) return row;
    const email = (Array.isArray(row.client?.user) ? row.client?.user?.[0]?.email : row.client?.user?.email) || row.client?.email || null;
    return {
      ...row,
      _isPlatform: true,
      title: row.title || `Session with ${[row.psychologist?.first_name, row.psychologist?.last_name].filter(Boolean).join(' ')}`.trim(),
      client_full_name: [row.client?.first_name, row.client?.last_name].filter(Boolean).join(' ') || row.client?.child_name || '—',
      client_first_name: row.client?.first_name || null,
      client_email: email,
      client_phone: row.client?.phone_number || null,
      therapist_name: [row.psychologist?.first_name, row.psychologist?.last_name].filter(Boolean).join(' ') || '—',
      start_time: (row.scheduled_date && row.scheduled_time) ? `${row.scheduled_date}T${row.scheduled_time}` : (row.scheduled_date || null),
    };
  };

  const handleView = (row) => { setViewingRow(normalizeRowForModal(row)); setOpenMenuId(null); };
  const handleEdit = (row) => {
    setEditingRow(normalizeRowForModal(row));
    // Derive the current date + time (IST) for the editable fields. Platform rows store
    // scheduled_date/time directly; Wix rows store a UTC start_time.
    let curDate = row.scheduled_date || '';
    let curTime = (row.scheduled_time || '').slice(0, 5);
    if (!curDate && row.start_time) {
      const ist = new Date(new Date(row.start_time).getTime() + 5.5 * 60 * 60 * 1000);
      curDate = ist.toISOString().slice(0, 10);
      curTime = ist.toISOString().slice(11, 16);
    }
    setEditForm({
      status: row.status || '',
      title: row.title || '',
      price: row.price ?? '',
      notes: row.notes || row.session_notes || '',
      psychologist_id: row.psychologist_id || row.psychologist?.id || '',
      session_type: row.session_type || 'individual',
      session_count: row.session_count ?? '',
      scheduled_date: curDate,
      scheduled_time: curTime,
      // Client fields are a per-booking snapshot on Wix rows — safe to edit directly.
      // Platform rows share the client record across all their sessions, so identity
      // edits belong on the Users page instead (shown read-only here).
      client_full_name: row.client_full_name || '',
      client_email: row.client_email || '',
      client_phone: row.client_phone || '',
    });
    setOpenMenuId(null);
    // Fetch the therapist list lazily, right when it's actually needed, instead of
    // relying on a page-load-only effect (which wouldn't re-run for a tab that was
    // already open before this list existed).
    if (psychologists.length === 0) {
      adminApi.getPsychologists().then((r) => {
        if (r?.success) setPsychologists(r.data || []);
      }).catch(() => {});
    }
  };
  const handleEditSave = async () => {
    if (!editingRow) return;
    setActionLoading(true);
    try {
      const originalPsychId = editingRow.psychologist_id || editingRow.psychologist?.id || '';
      const psychChanged = editForm.psychologist_id && editForm.psychologist_id !== originalPsychId;

      // Therapist reassignment goes through the same endpoint as the Transfer action —
      // it moves the Google Calendar event + Meet link. A plain field update would leave
      // the calendar pointing at the old therapist, silently out of sync.
      if (psychChanged) {
        const transferRes = editingRow._isPlatform
          ? await adminApi.transferSession(editingRow.id, { new_psychologist_id: editForm.psychologist_id })
          : await adminApi.transferWixBooking(editingRow.id, { new_psychologist_id: editForm.psychologist_id });
        if (!transferRes?.success) throw new Error(transferRes?.error || transferRes?.message || 'Failed to reassign therapist');
      }

      let res;
      if (editingRow._isPlatform) {
        // Platform session — update status / price / notes / type / date / time directly.
        // (updateSession moves the calendar event when the date/time actually changes.)
        res = await adminApi.updateSession(editingRow.id, {
          status: editForm.status || undefined,
          price: editForm.price !== '' ? parseFloat(editForm.price) : undefined,
          session_notes: editForm.notes || undefined,
          session_type: editForm.session_type || undefined,
          session_count: editForm.session_count !== '' && editForm.session_count != null ? Number(editForm.session_count) : undefined,
          scheduled_date: editForm.scheduled_date || undefined,
          scheduled_time: editForm.scheduled_time || undefined,
        });
      } else {
        res = await adminApi.editWixBooking(editingRow.id, {
          status: editForm.status || undefined,
          title: editForm.title || undefined,
          price: editForm.price !== '' ? parseFloat(editForm.price) : undefined,
          notes: editForm.notes || undefined,
          session_type: editForm.session_type || undefined,
          session_count: editForm.session_count !== '' && editForm.session_count != null ? Number(editForm.session_count) : undefined,
          scheduled_date: editForm.scheduled_date || undefined,
          scheduled_time: editForm.scheduled_time || undefined,
          client_full_name: editForm.client_full_name || undefined,
          client_email: editForm.client_email || undefined,
          client_phone: editForm.client_phone || undefined,
        });
      }
      if (!res?.success) throw new Error(res?.error || res?.message || 'Update failed');
      showSuccess('Booking updated', editingRow._isPlatform ? 'Session' : 'Wix');
      setEditingRow(null);
      await load(page);
    } catch (e) { showError(e?.message || 'Update failed', 'Error'); }
    finally { setActionLoading(false); }
  };
  const handleComplete = (row) => {
    setOpenMenuId(null);
    setCompleteConfirmRow(row);
  };
  const handleCompleteConfirm = async () => {
    if (!completeConfirmRow) return;
    setActionLoading(true);
    try {
      const res = completeConfirmRow._isPlatform
        ? await adminApi.completeSession(completeConfirmRow.id, { status: 'completed' })
        : await adminApi.completeWixBooking(completeConfirmRow.id);
      if (!res?.success) throw new Error(res?.error || 'Failed');
      showSuccess('Booking marked as completed', completeConfirmRow._isPlatform ? 'Session' : 'Wix');
      setCompleteConfirmRow(null);
      await load(page);
    } catch (e) { showError(e?.message || 'Failed', 'Wix'); }
    finally { setActionLoading(false); }
  };
  const handleNoShow = async (row) => {
    setOpenMenuId(null);
    setActionLoading(true);
    try {
      // Platform rows update the session status directly; Wix rows use the Wix endpoint
      // (which also mirrors the status back onto the wix_bookings row).
      const res = row._isPlatform
        ? await adminApi.updateSession(row.id, { status: 'no_show' })
        : await adminApi.noShowWixBooking(row.id);
      if (!res?.success) throw new Error(res?.error || 'Failed');
      showSuccess('Booking marked as no-show', row._isPlatform ? 'Session' : 'Wix');
      await load(page);
    } catch (e) { showError(e?.message || 'Failed', 'Error'); }
    finally { setActionLoading(false); }
  };
  const handleCancelRefundConfirm = async () => {
    if (!cancelRefundRow) return;
    setActionLoading(true);
    try {
      const res = cancelRefundRow._isPlatform
        ? await adminApi.cancelRefundSession(cancelRefundRow.id)
        : await adminApi.cancelRefundWixBooking(cancelRefundRow.id);
      if (!res?.success) throw new Error(res?.error || 'Failed');
      showSuccess(
        `Booking cancelled & refunded${res.data?.calendarEventRemoved ? '. Calendar event removed.' : '.'}`,
        'Cancelled'
      );
      setCancelRefundRow(null);
      await load(page);
    } catch (e) { showError(e?.message || 'Failed to cancel', 'Error'); }
    finally { setActionLoading(false); }
  };

  const handleCancelOnlyConfirm = async () => {
    if (!cancelOnlyRow) return;
    setActionLoading(true);
    try {
      const res = await adminApi.cancelOnlyWixBooking(cancelOnlyRow.id);
      if (!res?.success) throw new Error(res?.error || 'Failed');
      showSuccess('Cancelled without refund and put on hold. The slot is now free — reschedule it when the client confirms a new time.', 'On Hold');
      setCancelOnlyRow(null);
      await load(page);
    } catch (e) { showError(e?.message || 'Failed to cancel', 'Error'); }
    finally { setActionLoading(false); }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;
    setActionLoading(true);
    try {
      const res = deleteIsPlatform
        // Platform (admin/manual) sessions: adminApi has no deleteSession — use sessionsApi,
        // which hits the admin route DELETE /admin/sessions/:sessionId. (adminApi.deleteSession
        // was undefined, so the platform Delete button threw and did nothing.)
        ? await sessionsApi.deleteSession(deleteConfirmId)
        : await adminApi.deleteWixBooking(deleteConfirmId);
      if (!res?.success) throw new Error(res?.error || 'Failed');
      showSuccess('Booking deleted', deleteIsPlatform ? 'Session' : 'Wix');
      setDeleteConfirmId(null);
      setDeleteIsPlatform(false);
      await load(page);
    } catch (e) { showError(e?.message || 'Delete failed', 'Error'); }
    finally { setActionLoading(false); }
  };

  // A package's "group key": real package_group_id when present, else a stable fallback of
  // client+therapist+type so siblings without a group_id (admin couple/individual packages)
  // still resolve to the same group for "latest session only" gating.
  const packageGroupKey = (row) => row.package_group_id || `cp:${row.client_id}:${row.psychologist_id}:${String(row.session_type || '').toLowerCase()}`;

  const canBookNextFromRow = (row, groupMaxMap) => {
    if (!row) return false;
    const status = effectiveCompletionStatus(row);
    // Never offer "Book Next" from a terminated session.
    if (['cancelled', 'refunded', 'deleted', 'no_show', 'noshow'].includes(status)) return false;
    if (!row.client_id || !row.psychologist_id) return false;

    // Internal package path (has a real internal package_id).
    if (row.package_id) {
      const total = row.session_count ?? 0;
      const done = row.package_session_number ?? 1;
      if (total > 0 && done >= total) return false; // package already fully booked
      // Only the LATEST session in the group shows "Book Next" (so it doesn't appear on
      // every completed session of the package — just the most recent one).
      const key = packageGroupKey(row);
      if (groupMaxMap && groupMaxMap[key] != null && Number(done) < groupMaxMap[key]) return false;
      return true;
    }

    // Package path — covers BOTH individual packages (session_type 'package') AND couple
    // packages (session_type 'couple' with more than one session). Book next WITHOUT
    // requiring the current session to be completed.
    const total = row.session_count ?? row.payload?.creditsAvailable ?? 0;
    const done = row.package_session_number ?? row.payload?.planSessionNumber ?? 1;
    const isPackage = row.session_type === 'package' || Number(total) > 1;
    if (!isPackage) return false;
    if (Number(total) <= Number(done)) return false; // no sessions remaining
    // Only the LATEST booked session in the package shows "Book Next" (progress 1→2→3),
    // using the real group id or the client+therapist+type fallback key.
    const key = packageGroupKey(row);
    if (groupMaxMap && groupMaxMap[key] != null && Number(done) < groupMaxMap[key]) return false;
    return true;
  };

  const buildSessionProxy = (row) => {
    const total = row.session_count ?? row.payload?.creditsAvailable ?? 0;
    const done = row.package_session_number ?? row.payload?.planSessionNumber ?? 1;
    // start_time is stored as UTC in wix_bookings; convert to IST (UTC+5:30) for display
    const startTimeIST = row.start_time
      ? (() => {
          const d = new Date(row.start_time);
          const istOffset = 5.5 * 60 * 60 * 1000;
          const ist = new Date(d.getTime() + istOffset);
          const yyyy = ist.getUTCFullYear();
          const mm = String(ist.getUTCMonth() + 1).padStart(2, '0');
          const dd = String(ist.getUTCDate()).padStart(2, '0');
          const hh = String(ist.getUTCHours()).padStart(2, '0');
          const min = String(ist.getUTCMinutes()).padStart(2, '0');
          return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${min}` };
        })()
      : { date: null, time: null };
    return {
      ...row,
      // Wix rows carry the linked session id in `session_id`; platform (admin-booked)
      // rows ARE the session, so their id lives in `row.id`. Fall back to it so admin
      // package sessions (e.g. "Book Next" follow-ups) can still be rescheduled.
      id: row.session_id || row.id || null,
      status: row.session_status || row.status,
      scheduled_date: startTimeIST.date,
      scheduled_time: startTimeIST.time,
      package: {
        id: row.package_id || null,
        session_count: total,
        total_sessions: total,
        completed_sessions: done,
        remaining_sessions: Math.max(total - done, 0),
        package_type: row.session_type || 'package',
      },
      client: row.client_id ? {
        id: row.client_id,
        first_name: row.client_first_name || row.client_full_name?.split(' ')[0] || '',
        last_name: row.client_last_name || row.client_full_name?.split(' ').slice(1).join(' ') || '',
        user: { email: row.client_email || null },
      } : null,
      psychologist: row.psychologist_id ? {
        id: row.psychologist_id,
        first_name: row.therapist_name?.split(' ')[0] || '',
        last_name: row.therapist_name?.split(' ').slice(1).join(' ') || '',
      } : null,
    };
  };

  const getMeetLink = (session) =>
    session?.google_meet_link ||
    session?.google_meet_join_url ||
    session?.google_meet_start_url ||
    session?.google_calendar_link;

  const handleOpenMeet = (row) => {
    const meetUrl = getMeetLink(row);
    if (!meetUrl) {
      showError('No Google Meet link is available for this session yet.', 'Meet Link');
      return;
    }
    if (typeof window !== 'undefined') {
      const url = meetUrl.startsWith('http') ? meetUrl : `https://${meetUrl}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleReschedule = (row) => {
    setOpenMenuId(null);
    const isPlatform = !!row._isPlatform;

    if (isPlatform) {
      const sessionProxy = buildSessionProxy(row);
      if (!sessionProxy?.id) {
        showError('This session cannot be rescheduled.', 'Reschedule');
        return;
      }
      setSelectedRescheduleSession({ ...sessionProxy, _isWixBooking: false });
    } else {
      // Wix booking — reschedule directly via wix_bookings endpoint.
      // Prefer wix_booking_id (Wix string) over row.id because row.id can be the
      // wix_bookings UUID pk OR a sessions UUID depending on how the row was built.
      // The backend accepts both, but wix_booking_id is always unambiguous.
      const wixKey = row.wix_booking_id || row.id;
      setSelectedRescheduleSession({
        ...buildSessionProxy(row),
        _isWixBooking: true,
        _wixBookingId: wixKey,
        id: row.session_id || null,
      });
    }
    setIsRescheduleOpen(true);
  };

  const handleTransfer = (row) => {
    const isPlatform = !!row._isPlatform;
    setOpenMenuId(null);

    if (isPlatform) {
      // Platform rows ARE sessions — row.id is the session id directly
      setSelectedTransferSession({
        ...row,
        id: row.id,
        psychologist_id: row.psychologist_id || row.psychologist?.id || null,
        _isWixBooking: false,
      });
    } else {
      // Wix booking row — transfer operates on wix_bookings directly via row.id (UUID pk)
      setSelectedTransferSession({
        ...row,
        // Expose the wix_bookings primary key so the modal calls the right endpoint
        _isWixBooking: true,
        _wixBookingId: row.id,
        // Provide display fields the modal uses for its session summary
        id: row.session_id || null,
        psychologist_id: row.psychologist_id || null,
        scheduled_date: row.start_time ? row.start_time.slice(0, 10) : null,
        scheduled_time: row.start_time ? row.start_time.slice(11, 16) : null,
        psychologist: row.psychologist_id
          ? { id: row.psychologist_id, first_name: row.therapist_name?.split(' ')[0] || '', last_name: row.therapist_name?.split(' ').slice(1).join(' ') || '' }
          : null,
        client: row.client_id
          ? { first_name: row.client_first_name || row.client_full_name?.split(' ')[0] || '', last_name: row.client_full_name?.split(' ').slice(1).join(' ') || '', child_name: null }
          : null,
      });
    }

    setIsTransferOpen(true);
  };

  const openBookNext = (row) => {
    setOpenMenuId(null);
    const sessionProxy = buildSessionProxy(row);
    setSelectedBookNextSession({
      ...sessionProxy,
      // wix_row_id is the wix_bookings.id (primary key UUID), used by the backend to find the linked session
      wix_row_id: row.package_id ? null : (row.id || null),
    });
    setIsBookNextOpen(true);
  };

  const handleBookNextSuccess = async () => {
    setIsBookNextOpen(false);
    setSelectedBookNextSession(null);
    await load(page);
  };

  const handleRescheduleSuccess = async () => {
    setIsRescheduleOpen(false);
    setSelectedRescheduleSession(null);
    await load(page);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xl font-semibold text-gray-900">Wix Bookings</div>
          <div className="mt-2 inline-flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Delivery dots</span>
            <DeliveryDots
              showLabels
              row={{
                whatsapp_sent_at: true,
                email_sent_at: true,
                google_meet_link: 'https://meet.google.com/legend',
                google_calendar_event_id: 'legend',
              }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={() => setIsManualBookingOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#025545] text-white text-sm hover:bg-[#012f23]">
            <Calendar className="h-3.5 w-3.5" /> Create Manual Booking
          </button>
          <button type="button" onClick={() => setIsAddRecordOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm hover:bg-slate-50">
            <Calendar className="h-3.5 w-3.5" /> Add record
          </button>
          <button type="button" onClick={() => load(page)} disabled={loading || syncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Refresh
          </button>
          <button type="button" onClick={() => syncAndReload({ silentSuccess: false })} disabled={loading || syncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40">
            {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CloudDownload className="h-3.5 w-3.5" />}
            {syncing ? 'Syncing…' : 'Sync from Wix'}
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
        <div className="flex flex-col gap-4 md:flex-row md:flex-wrap items-start md:items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Date Range:</span>
          </div>
          <DateRangePicker
            selectedRange={dateRange}
            onSelect={setDateRange}
          />
          <span className="md:ml-auto text-xs text-gray-400">
            {pagination.total + platformRows.length} booking{(pagination.total + platformRows.length) === 1 ? '' : 's'}
            {platformRows.length > 0 && <span className="ml-1 text-[#025545]">({platformRows.length} platform)</span>}
          </span>
        </div>
      </div>

      {/* Search Filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search client, therapist…"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#025545] focus:border-transparent text-sm" />
            </div>
          </div>
          {searchTerm && (
            <button type="button" onClick={() => setSearchTerm('')}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 self-center">Clear</button>
          )}
        </div>
      </div>

      {/* Status Tabs */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-1.5 overflow-x-auto">
        <nav className="flex gap-1" aria-label="Filter by status">
          {statusTabs.map((tab) => {
            const isActive = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatusFilter(tab.value)}
                className={`
                  relative px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap
                  transition-all duration-200 ease-out
                  ${isActive
                    ? 'bg-[#025545] text-white shadow-sm'
                    : 'text-gray-600 hover:text-[#025545] hover:bg-[#025545]/8'
                  }
                `}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Session Type Tabs */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-1.5 overflow-x-auto">
        <nav className="flex gap-1" aria-label="Filter by session type">
          {wixTypeTabs.map((tab) => {
            const isActive = wixFilterType === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => handleTypeChange(tab.value)}
                className={`
                  relative px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap
                  transition-all duration-200 ease-out
                  ${isActive
                    ? 'bg-[#025545] text-white shadow-sm'
                    : 'text-gray-600 hover:text-[#025545] hover:bg-[#025545]/8'
                  }
                `}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Table — Wix bookings + Platform/manual sessions combined */}
      {(() => {
        const pageLimit = pagination.limit || 10;
        const platformTagged = platformRows.map((s) => ({ ...s, _isPlatform: true }));
        const allRows = [...rows, ...platformTagged]
          // Keep the visible rows consistent with the selected tab's badge. The backend can't
          // filter platform rows by past-due, so a past-due rescheduled/booked platform row
          // (which displays as "pending") would otherwise leak into the Rescheduled/Upcoming tab.
          .filter((r) => matchesStatusTab(r, statusFilter))
          .slice(0, pageLimit);
        // Highest booked session number per package group → "Book Next" shows only on the latest.
        // Keyed by real package_group_id when present, else client+therapist+type fallback,
        // so couple/individual packages without a group_id are still tracked.
        const packageGroupMax = {};
        for (const r of allRows) {
          if (!r.client_id || !r.psychologist_id) continue;
          const total = r.session_count ?? r.payload?.creditsAvailable ?? 0;
          const isPackage = r.session_type === 'package' || Number(total) > 1 || !!r.package_id;
          if (!isPackage) continue;
          const st = effectiveCompletionStatus(r);
          if (['cancelled', 'refunded', 'deleted'].includes(st)) continue;
          const key = packageGroupKey(r);
          const num = r.package_session_number ?? 1;
          if (packageGroupMax[key] == null || num > packageGroupMax[key]) packageGroupMax[key] = num;
        }

        // Package labels (A, B, C…): when a client has MORE THAN ONE package with the SAME
        // therapist, plain "Package (1/3)" is ambiguous. Label each package group A/B/C by
        // chronological order so "Package A (1/3)" vs "Package B (1/3)" are distinguishable.
        const rowSortDate = (r) => r.scheduled_date
          || (r.start_time ? new Date(r.start_time).toISOString().slice(0, 10) : '9999-12-31');
        const groupsByPair = {}; // "clientId|psychId" -> { groupKey: earliestDate }
        for (const r of allRows) {
          if (!r.client_id || !r.psychologist_id) continue;
          const total = r.session_count ?? r.payload?.creditsAvailable ?? 0;
          const isPackage = r.session_type === 'package' || Number(total) > 1 || !!r.package_id;
          if (!isPackage) continue;
          const pair = `${r.client_id}|${r.psychologist_id}`;
          const key = packageGroupKey(r);
          const d = rowSortDate(r);
          (groupsByPair[pair] = groupsByPair[pair] || {});
          if (!groupsByPair[pair][key] || d < groupsByPair[pair][key]) groupsByPair[pair][key] = d;
        }
        const packageLabels = {}; // groupKey -> 'A' | 'B' | …  (only when >1 package for the pair)
        for (const pair of Object.keys(groupsByPair)) {
          const groups = Object.entries(groupsByPair[pair]).sort((a, b) => a[1].localeCompare(b[1]));
          if (groups.length > 1) {
            groups.forEach(([key], i) => { packageLabels[key] = String.fromCharCode(65 + i); });
          }
        }
        const packageLabelFor = (r) => {
          // Prefer the backend-computed map: stable, computed over the client's FULL package
          // history, so the label doesn't change with the current filter/page.
          const pairLabels = packageLabelMap[`${r.client_id}|${r.psychologist_id}`];
          if (pairLabels && r.package_group_id && pairLabels[r.package_group_id]) {
            return pairLabels[r.package_group_id];
          }
          // Fallback to the local (page-scoped) computation for a package created after the
          // last label fetch, or any row still lacking a real group id.
          return packageLabels[packageGroupKey(r)] || null;
        };

        // Per-package payment method: a package is ONE purchase (paid on session 1 via
        // Razorpay/etc.), but its admin-booked follow-ups would otherwise show "Admin booked",
        // making one package display two different tags. Derive the paid session's method and
        // apply it to every session in the group so the whole package reads consistently.
        const packagePayMethod = {};
        for (const r of allRows) {
          const total = r.session_count ?? r.payload?.creditsAvailable ?? 0;
          const isPackage = r.session_type === 'package' || Number(total) > 1 || !!r.package_id;
          if (!isPackage || !r.client_id || !r.psychologist_id) continue;
          // The paying session has a real price and is not an admin-manual follow-up.
          const pm = r._isPlatform ? null : (!r.payload?.isAdminManual ? derivePaymentMethod(r) : null);
          if (pm && Number(r.price) > 0) packagePayMethod[packageGroupKey(r)] = pm;
        }
        // Returns the consistent package tag for a row, or null to fall back to default tags.
        const packageTagFor = (r) => {
          const total = r.session_count ?? r.payload?.creditsAvailable ?? 0;
          const isPackage = r.session_type === 'package' || Number(total) > 1 || !!r.package_id;
          if (!isPackage) return null;
          return packagePayMethod[packageGroupKey(r)] || null;
        };
        return (
          <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto shadow-sm">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Session</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Therapist</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date / Booked at</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {(loading || isSearchPending) ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />{isSearchPending ? 'Searching…' : 'Loading…'}</td></tr>
                ) : allRows.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">No bookings found{hasActiveFilters ? ' for current filters' : ''}.</td></tr>
                ) : (
                  allRows.map((row) => {
                    const isPlatform = !!row._isPlatform;

                    if (isPlatform) {
                      // ── Platform / manual booking row ──────────────────────────
                      const clientName = [row.client?.first_name, row.client?.last_name].filter(Boolean).join(' ') || '—';
                      // The user relation can come back as an array or object; emails live on
                      // users.email (clients.email is usually empty for manual bookings).
                      const clientEmail = (Array.isArray(row.client?.user) ? row.client?.user?.[0]?.email : row.client?.user?.email) || row.client?.email || null;
                      const therapistName = [row.psychologist?.first_name, row.psychologist?.last_name].filter(Boolean).join(' ') || '—';
                      const bookedAt = row.booking_created_at || row.created_at;
                      const typeLabelRaw = row.session_type === 'package' ? 'Package'
                        : row.session_type === 'couple' ? 'Couple'
                        : row.session_type === 'assessment' ? 'Assessment'
                        : row.session_type === 'discovery' ? 'Discovery'
                        : 'Individual';
                      const typeColour = typeLabelRaw === 'Couple' ? 'bg-pink-50 text-pink-700'
                        : typeLabelRaw === 'Package' ? 'bg-violet-50 text-violet-700'
                        : typeLabelRaw === 'Assessment' ? 'bg-purple-50 text-purple-700'
                        : typeLabelRaw === 'Discovery' ? 'bg-sky-50 text-sky-700'
                        : 'bg-indigo-50 text-indigo-700';
                      const startIso = (row.scheduled_date && row.scheduled_time) ? `${row.scheduled_date}T${row.scheduled_time}` : row.scheduled_date;
                      const meetLink = row.google_meet_link || row.google_meet_join_url || row.google_calendar_link;
                      return (
                        <tr key={`platform-${row.id}`} className={`transition-colors bg-[#025545]/[0.02] ${openMenuId === `platform-${row.id}` ? 'bg-[#025545]/7' : 'hover:bg-[#025545]/[0.08]'}`}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900 text-xs leading-snug">{startIso ? fmtDateTime(startIso) : '—'}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize ${typeColour}`}>
                                {typeLabelRaw}{(Number(row.session_count) > 1 && row.package_session_number) ? ` (${row.package_session_number}/${row.session_count})` : ''}
                              </span>
                              {packageLabelFor(row) && (
                                <span className="inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-bold bg-violet-100 text-violet-800" title="Distinguishes this client's multiple packages with the same therapist">Pkg {packageLabelFor(row)}</span>
                              )}
                              {/* A package follow-up shows its package's payment method (so all
                                  sessions of one package read the same); otherwise "Admin booked". */}
                              {packageTagFor(row) ? (
                                <span className="inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700">{packageTagFor(row)}</span>
                              ) : (
                                <span className="inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-100">Admin</span>
                              )}
                            </div>
                            <DeliveryDots row={row} />
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-gray-900 font-medium truncate max-w-[180px]" title={clientName}>{clientName}</p>
                            {clientEmail && (
                              <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5 max-w-[200px]"><Mail className="h-3 w-3 shrink-0" /><span className="truncate" title={clientEmail}>{clientEmail}</span></div>
                            )}
                            {row.client?.phone_number && (
                              <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5"><Phone className="h-3 w-3 shrink-0" />{row.client.phone_number}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-700">{therapistName}</td>
                          <td className="px-4 py-3">
                            {(() => { const ds = displayStatusFor(row); return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(ds)}`}>{ds || '—'}</span>; })()}
                          </td>
                          <td className="px-4 py-3 text-gray-700">{row.price != null ? `₹${row.price}` : '—'}</td>
                          <td className="px-4 py-3 text-xs text-gray-400">{bookedAt ? fmtDateTime(bookedAt) : '—'}</td>
                          <td className="px-4 py-3 text-center relative">
                            <button
                              onClick={(e) => {
                                const uid = `platform-${row.id}`;
                                if (openMenuId === uid) { setOpenMenuId(null); return; }
                                const rect = e.currentTarget.getBoundingClientRect();
                                const menuHeight = 280;
                                const spaceBelow = window.innerHeight - rect.bottom;
                                const top = spaceBelow < menuHeight ? rect.top - menuHeight : rect.bottom;
                                setMenuPos({ top, right: window.innerWidth - rect.right });
                                setOpenMenuId(uid);
                              }}
                              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                              <MoreVertical className="h-4 w-4" />
                            </button>
                            {openMenuId === `platform-${row.id}` && (
                              <div style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
                                className="w-52 rounded-lg border border-gray-200 bg-white shadow-lg py-1 text-left">
                                <button onClick={() => handleView(row)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                  <Eye className="h-3.5 w-3.5" /> View Details
                                </button>
                                <button onClick={() => handleEdit(row)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                  <Edit className="h-3.5 w-3.5" /> Edit
                                </button>
                                {canBookNextFromRow(row, packageGroupMax) && (
                                  <button onClick={() => openBookNext(row)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                    <Package className="h-3.5 w-3.5" /> Book Next Session
                                  </button>
                                )}
                                {meetLink && !['completed', 'cancelled', 'no_show'].includes(row.status) && (
                                  <button onClick={() => { window.open(meetLink.startsWith('http') ? meetLink : `https://${meetLink}`, '_blank', 'noopener,noreferrer'); setOpenMenuId(null); }}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                    <Video className="h-3.5 w-3.5" /> Open Meet
                                  </button>
                                )}
                                {['booked', 'rescheduled', 'confirmed', 'scheduled', 'reschedule_requested', 'on_hold', 'no_show', 'noshow'].includes(row.status) && (
                                  <button onClick={() => { handleReschedule(row); setOpenMenuId(null); }}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                    <RefreshCw className="h-3.5 w-3.5" /> Reschedule
                                  </button>
                                )}
                                {!['completed', 'cancelled', 'refunded'].includes(row.status) && (
                                  <button onClick={() => { handleTransfer(row); setOpenMenuId(null); }}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                    <ArrowRightLeft className="h-3.5 w-3.5" /> Transfer
                                  </button>
                                )}
                                {row.status === 'completed' && (
                                  <button onClick={() => { setMessageToView(row); setOpenMenuId(null); }}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-purple-700 hover:bg-purple-50">
                                    <MessageSquare className="h-3.5 w-3.5" /> View Message
                                  </button>
                                )}
                                {row.status !== 'completed' && (
                                  <button onClick={() => { handleComplete(row); }}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-green-700 hover:bg-green-50">
                                    <CheckCircle className="h-3.5 w-3.5" /> Mark Complete
                                  </button>
                                )}
                                {['booked', 'pending', 'confirmed', 'scheduled', 'rescheduled', 'reschedule_requested'].includes(row.status) && (
                                  <button onClick={() => { handleNoShow(row); }}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-amber-700 hover:bg-amber-50">
                                    <AlertCircle className="h-3.5 w-3.5" /> Mark No Show
                                  </button>
                                )}
                                {!['cancelled', 'refunded', 'completed'].includes(row.status) && (
                                  <button onClick={() => { setOpenMenuId(null); setCancelRefundRow(row); }}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                                    <XCircle className="h-3.5 w-3.5" /> Cancel &amp; Refund
                                  </button>
                                )}
                                <hr className="my-1 border-gray-100" />
                                <button onClick={() => { setDeleteConfirmId(row.id); setDeleteIsPlatform(true); setOpenMenuId(null); }}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                                  <Trash2 className="h-3.5 w-3.5" /> Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    }

                    // ── Wix booking row ────────────────────────────────────────
                    return (
                      <tr key={row.id} className={`transition-colors ${openMenuId === row.id ? 'bg-[#025545]/7' : 'hover:bg-[#025545]/[0.08]'}`}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 text-xs leading-snug">{fmtDateTime(row.start_time)}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(() => {
                              const st = deriveSessionType(row);
                              if (!st) return null;
                              const sl = st.toLowerCase();
                              const colour = sl.startsWith('couple') ? 'bg-pink-50 text-pink-700'
                                : sl.includes('package') ? 'bg-violet-50 text-violet-700'
                                : sl === 'assessment' ? 'bg-purple-50 text-purple-700'
                                : sl === 'discovery' ? 'bg-sky-50 text-sky-700'
                                : 'bg-indigo-50 text-indigo-700';
                              // deriveSessionType already includes the "(n/m)" suffix for packages.
                              return <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize ${colour}`}>{st}</span>;
                            })()}
                            {packageLabelFor(row) && (
                              <span className="inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-bold bg-violet-100 text-violet-800" title="Distinguishes this client's multiple packages with the same therapist">Pkg {packageLabelFor(row)}</span>
                            )}
                            {/* A package follow-up inherits its package's payment method so the
                                whole package reads the same tag (not a mix of "Razorpay" + "Admin booked"). */}
                            {(() => {
                              const pkgTag = packageTagFor(row);
                              if (pkgTag) {
                                const isManual = pkgTag === 'Manual';
                                return <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${isManual ? 'bg-orange-50 text-orange-700' : 'bg-emerald-50 text-emerald-700'}`}>{pkgTag}</span>;
                              }
                              if (row.payload?.isAdminManual) {
                                return <span className="inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-100">Admin</span>;
                              }
                              const pm = derivePaymentMethod(row);
                              if (!pm) return null;
                              const isManual = pm === 'Manual';
                              return <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${isManual ? 'bg-orange-50 text-orange-700' : 'bg-emerald-50 text-emerald-700'}`}>{pm}</span>;
                            })()}
                          </div>
                          <DeliveryDots row={row} />
                        </td>
                        <td className="px-4 py-3">
                          {(() => { const nm = row.client_full_name || row.client_first_name || '—'; return <p className="text-gray-900 font-medium truncate max-w-[180px]" title={nm}>{nm}</p>; })()}
                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5 max-w-[200px]"><Mail className="h-3 w-3 shrink-0" /><span className="truncate" title={row.client_email || ''}>{row.client_email || '—'}</span></div>
                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5"><Phone className="h-3 w-3 shrink-0" />{row.client_phone || '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{row.therapist_name || '—'}</td>
                        <td className="px-4 py-3">
                          {(() => {
                            const resolved = displayStatusFor(row);
                            const s = resolved && resolved !== 'undefined' && resolved !== 'null' ? resolved : null;
                            return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(s)}`}>{s || '—'}</span>;
                          })()}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{row.price ? `${row.price}${row.currency ? ` ${row.currency}` : ''}` : '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">{fmtDateTime(wixBookingBookedAtIso(row))}</td>
                        <td className="px-4 py-3 text-center relative">
                          <button
                            onClick={(e) => {
                              if (openMenuId === row.id) { setOpenMenuId(null); return; }
                              const rect = e.currentTarget.getBoundingClientRect();
                              const menuHeight = 280;
                              const spaceBelow = window.innerHeight - rect.bottom;
                              const top = spaceBelow < menuHeight ? rect.top - menuHeight : rect.bottom;
                              setMenuPos({ top, right: window.innerWidth - rect.right });
                              setOpenMenuId(row.id);
                            }}
                            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {openMenuId === row.id && (
                            <div style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
                              className="w-52 rounded-lg border border-gray-200 bg-white shadow-lg py-1 text-left">
                              <button onClick={() => handleView(row)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                <Eye className="h-3.5 w-3.5" /> View Details
                              </button>
                              <button onClick={() => handleEdit(row)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                <Edit className="h-3.5 w-3.5" /> Edit
                              </button>
                              {getMeetLink(row) && !['completed', 'cancelled'].includes(effectiveCompletionStatus(row)) && (
                                <button onClick={() => handleOpenMeet(row)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                  <Video className="h-3.5 w-3.5" /> Open Meet
                                </button>
                              )}
                              {canBookNextFromRow(row, packageGroupMax) && (
                                <button onClick={() => openBookNext(row)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                  <Package className="h-3.5 w-3.5" /> Book Next Session
                                </button>
                              )}
                              {['booked', 'rescheduled', 'confirmed', 'scheduled', 'reschedule_requested', 'on_hold', 'no_show', 'noshow'].includes(effectiveCompletionStatus(row)) && (
                                <button onClick={() => handleReschedule(row)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                  <RefreshCw className="h-3.5 w-3.5" /> Reschedule
                                </button>
                              )}
                              {!['completed', 'cancelled', 'refunded'].includes(effectiveCompletionStatus(row)) && (
                                <button onClick={() => handleTransfer(row)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                  <ArrowRightLeft className="h-3.5 w-3.5" /> Transfer
                                </button>
                              )}
                              {effectiveCompletionStatus(row) !== 'completed' && (
                                <button onClick={() => handleComplete(row)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-green-700 hover:bg-green-50">
                                  <CheckCircle className="h-3.5 w-3.5" /> Mark Complete
                                </button>
                              )}
                              {effectiveCompletionStatus(row) === 'completed' && (
                                <button onClick={() => { setMessageToView(row); setOpenMenuId(null); }}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-purple-700 hover:bg-purple-50">
                                  <MessageSquare className="h-3.5 w-3.5" /> View Message
                                </button>
                              )}
                              {['booked', 'pending', 'confirmed', 'scheduled', 'rescheduled', 'reschedule_requested'].includes(effectiveCompletionStatus(row)) && (
                                <button onClick={() => handleNoShow(row)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-amber-700 hover:bg-amber-50">
                                  <AlertCircle className="h-3.5 w-3.5" /> Mark No Show
                                </button>
                              )}
                              {!['cancelled', 'refunded', 'completed', 'on_hold'].includes(effectiveCompletionStatus(row)) && (
                                <button onClick={() => { setOpenMenuId(null); setCancelOnlyRow(row); }}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-amber-700 hover:bg-amber-50">
                                  <PauseCircle className="h-3.5 w-3.5" /> On Hold
                                </button>
                              )}
                              {!['cancelled', 'refunded', 'completed'].includes(effectiveCompletionStatus(row)) && (
                                <button onClick={() => { setOpenMenuId(null); setCancelRefundRow(row); }}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                                  <XCircle className="h-3.5 w-3.5" /> Cancel &amp; Refund
                                </button>
                              )}
                              <hr className="my-1 border-gray-100" />
                              <button onClick={() => { setDeleteConfirmId(row.id); setDeleteIsPlatform(false); setOpenMenuId(null); }}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                                <Trash2 className="h-3.5 w-3.5" /> Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        );
      })()}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Page {page} of {pagination.totalPages}</span>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => handlePageChange(page - 1)} disabled={page <= 1 || loading}
              className="px-2.5 py-1 rounded border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50">Prev</button>
            <button type="button" onClick={() => handlePageChange(page + 1)} disabled={page >= pagination.totalPages || loading}
              className="px-2.5 py-1 rounded border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50">Next</button>
          </div>
        </div>
      )}

      {/* Click outside to close menu */}
      {openMenuId && <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />}

      {/* View Modal */}
      {viewingRow && (() => {
        // Detect reschedule: compare original_scheduled_date/time (IST wall-clock, set once
        // at first booking) against the current schedule to decide whether to show both.
        const currentSched = viewingRow._isPlatform
          ? { date: viewingRow.scheduled_date, time: viewingRow.scheduled_time }
          : (() => {
              if (!viewingRow.start_time) return { date: null, time: null };
              const d = new Date(viewingRow.start_time);
              const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
              return { date: ist.toISOString().slice(0, 10), time: ist.toISOString().slice(11, 19) };
            })();
        const wasRescheduled = !!(
          viewingRow.original_scheduled_date &&
          (viewingRow.original_scheduled_date !== currentSched.date ||
            (viewingRow.original_scheduled_time && currentSched.time &&
              String(viewingRow.original_scheduled_time).slice(0, 5) !== String(currentSched.time).slice(0, 5)))
        );
        const originalLabel = wasRescheduled
          ? fmtOrigDateTime(viewingRow.original_scheduled_date, viewingRow.original_scheduled_time)
          : null;
        // Detect transfer: backend only sets original_therapist_name when the original
        // therapist differs from the current one (i.e. an actual transfer happened).
        const wasTransferred = !!(viewingRow.original_therapist_name);
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4" onClick={() => setViewingRow(null)}>
          <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-white/20" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100 bg-gradient-to-r from-[#025545] to-[#189e4f] flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md text-white shadow-inner"><Eye className="h-5 w-5" /></div>
                <div>
                  <div className="text-lg font-bold text-white tracking-tight leading-tight">Booking Details</div>
                  <p className="text-xs text-white/70 mt-0.5 font-medium">{viewingRow.wix_order_number ? `Order #${viewingRow.wix_order_number}` : 'Wix booking'}</p>
                </div>
              </div>
              <button onClick={() => setViewingRow(null)} className="p-2 rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition-all"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 bg-slate-50/40 space-y-4">
              {/* Client header card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-[#025545]/10 text-[#025545] flex items-center justify-center font-bold text-lg shrink-0">
                  {(viewingRow.client_full_name || viewingRow.client_first_name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-900 truncate">{viewingRow.client_full_name || viewingRow.client_first_name || '—'}</div>
                  <div className="text-xs text-slate-500 truncate">{viewingRow.title || 'Session'}</div>
                </div>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize shrink-0 ${statusBadge(effectiveCompletionStatus(viewingRow))}`}>
                  {effectiveCompletionStatus(viewingRow) || '—'}
                </span>
              </div>
              {/* Detail grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  ['Booking ID', viewingRow.wix_order_number ? `#${viewingRow.wix_order_number}` : (viewingRow._isPlatform ? `ID: ${String(viewingRow.id || '').slice(-6).toUpperCase()}` : (viewingRow.wix_booking_id ? `ID: ${String(viewingRow.wix_booking_id).slice(-6).toUpperCase()}` : '—')), false],
                  ['Email', viewingRow.client_email, false],
                  ['Phone', viewingRow.client_phone, false],
                  ...(wasTransferred ? [['Transferred From', viewingRow.original_therapist_name, false]] : []),
                  [wasTransferred ? 'Transferred To' : 'Therapist', viewingRow.therapist_name, false],
                  ...(wasRescheduled ? [['Originally Scheduled', originalLabel, false]] : []),
                  [wasRescheduled ? 'Rescheduled To' : 'Date / Time', fmtDateTime(viewingRow.start_time), false],
                  ['Session Type', deriveSessionType(viewingRow), false],
                  ['Price', viewingRow.price ? `${viewingRow.price} ${viewingRow.currency || ''}` : '—', false],
                  ['Payment Method', derivePaymentMethod(viewingRow) || '—', false],
                  ['Payment State', viewingRow.payload?.paymentState || '—', false],
                  ['Created at', fmtDateTime(wixBookingBookedAtIso(viewingRow)), false],
                  [viewingRow._isPlatform ? 'Session ID (full)' : 'Wix Booking ID', viewingRow._isPlatform ? viewingRow.id : viewingRow.wix_booking_id, true],
                ].map(([label, val, full]) => (
                  <div key={label} className={`rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm ${full ? 'sm:col-span-2' : ''}`}>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.06em]">{label}</div>
                    <div className="text-sm font-semibold text-slate-900 mt-1 break-words">{val || '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Edit Modal */}
      {editingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4" onClick={() => !actionLoading && setEditingRow(null)}>
          <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-white/20" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100 bg-gradient-to-r from-[#025545] to-[#189e4f] flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md text-white shadow-inner"><Edit className="h-5 w-5" /></div>
                <div>
                  <div className="text-lg font-bold text-white tracking-tight leading-tight">Edit Booking</div>
                  <p className="text-xs text-white/70 mt-0.5 font-medium">Every detail of this session, in one place</p>
                </div>
              </div>
              <button onClick={() => setEditingRow(null)} className="p-2 rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition-all"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 bg-slate-50/40 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: 'status', label: 'Status', type: 'select', options: ['booked', 'pending', 'confirmed', 'scheduled', 'rescheduled', 'reschedule_requested', 'on_hold', 'completed', 'no_show', 'cancelled', 'refunded'] },
                  { key: 'session_type', label: 'Session Type', type: 'sessionType' },
                  { key: 'psychologist_id', label: 'Therapist', type: 'psychologist', full: true },
                  { key: 'scheduled_date', label: 'Date', type: 'date' },
                  { key: 'scheduled_time', label: 'Time', type: 'time' },
                  { key: 'price', label: 'Price', type: 'number' },
                  // Client identity fields: real per-booking columns on Wix rows, safe to
                  // edit directly. Platform rows share the client record across every
                  // session, so identity edits belong on the Users page instead.
                  ...(editingRow._isPlatform ? [] : [
                    { key: 'client_full_name', label: 'Client Name', full: true },
                    { key: 'client_email', label: 'Client Email' },
                    { key: 'client_phone', label: 'Client Phone' },
                  ]),
                  { key: 'notes', label: 'Notes', type: 'textarea', full: true },
                ].map((field) => (
                  <div key={field.key} className={`space-y-1.5 ${field.full ? 'sm:col-span-2' : ''}`}>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-[0.05em]">{field.label}</label>
                    {field.type === 'select' ? (
                      <select value={editForm[field.key] || ''} onChange={(e) => setEditForm(f => ({ ...f, [field.key]: e.target.value }))}
                        className="w-full px-4 py-3 border border-slate-200 rounded-2xl bg-white text-sm font-medium text-slate-900 shadow-sm capitalize focus:ring-4 focus:ring-[#025545]/10 focus:border-[#025545] outline-none transition-all cursor-pointer">
                        {field.options.map(o => <option key={o} value={o} className="capitalize">{o}</option>)}
                      </select>
                    ) : field.type === 'sessionType' ? (() => {
                      // "package" expands into concrete sizes so the admin picks Package (N).
                      // Selecting a size sets session_type='package' + session_count=N; any other
                      // type is a single session (count 1). Always includes the current count so an
                      // existing 4/2/… pack isn't silently changed.
                      const curCount = Number(editForm.session_count) || 0;
                      const pkgSizes = [...new Set([2, 3, 6, 9, 12, ...(curCount > 1 ? [curCount] : [])])].sort((a, b) => a - b);
                      const value = editForm.session_type === 'package' ? `package_${curCount || 3}` : (editForm.session_type || 'individual');
                      return (
                        <select value={value} onChange={(e) => {
                          const v = e.target.value;
                          if (v.startsWith('package_')) {
                            const n = parseInt(v.slice(8), 10);
                            setEditForm(f => ({ ...f, session_type: 'package', session_count: n }));
                          } else {
                            setEditForm(f => ({ ...f, session_type: v, session_count: 1 }));
                          }
                        }}
                          className="w-full px-4 py-3 border border-slate-200 rounded-2xl bg-white text-sm font-medium text-slate-900 shadow-sm focus:ring-4 focus:ring-[#025545]/10 focus:border-[#025545] outline-none transition-all cursor-pointer">
                          <option value="individual">Individual</option>
                          <option value="couple">Couple</option>
                          {pkgSizes.map(n => <option key={n} value={`package_${n}`}>{`Package (${n} sessions)`}</option>)}
                          <option value="assessment">Assessment</option>
                          <option value="discovery">Discovery</option>
                        </select>
                      );
                    })() : field.type === 'psychologist' ? (
                      <select value={editForm[field.key] || ''} onChange={(e) => setEditForm(f => ({ ...f, [field.key]: e.target.value }))}
                        className="w-full px-4 py-3 border border-slate-200 rounded-2xl bg-white text-sm font-medium text-slate-900 shadow-sm focus:ring-4 focus:ring-[#025545]/10 focus:border-[#025545] outline-none transition-all cursor-pointer">
                        <option value="">— Select therapist —</option>
                        {/* Fallback: if the current therapist isn't in the loaded list (or the
                            list is still loading), still show them as the selected option so
                            the field never appears blank. */}
                        {editForm.psychologist_id && !psychologists.some((p) => p.id === editForm.psychologist_id) && (
                          <option value={editForm.psychologist_id}>{editingRow.therapist_name || 'Current therapist'}</option>
                        )}
                        {psychologists.map((p) => (
                          <option key={p.id} value={p.id}>{p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim()}</option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea value={editForm[field.key] || ''} onChange={(e) => setEditForm(f => ({ ...f, [field.key]: e.target.value }))}
                        rows={3} className="w-full px-4 py-3 border border-slate-200 rounded-2xl bg-white text-sm text-slate-900 shadow-sm resize-none focus:ring-4 focus:ring-[#025545]/10 focus:border-[#025545] outline-none transition-all" />
                    ) : (
                      <input type={field.type || 'text'} value={editForm[field.key] || ''} onChange={(e) => setEditForm(f => ({ ...f, [field.key]: e.target.value }))}
                        className="w-full px-4 py-3 border border-slate-200 rounded-2xl bg-white text-sm text-slate-900 shadow-sm focus:ring-4 focus:ring-[#025545]/10 focus:border-[#025545] outline-none transition-all" />
                    )}
                  </div>
                ))}
              </div>
              {editingRow._isPlatform ? (
                <p className="text-xs text-slate-400 px-1">
                  Client name, email &amp; phone are shared across this client&apos;s other sessions — edit them from the Users page.
                </p>
              ) : (
                <p className="text-xs text-slate-400 px-1">
                  Changing the date/time here edits the record only — for an active booking that needs the Google Calendar event moved, use <span className="font-semibold">Reschedule</span>.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-3 px-7 py-4 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
              <button onClick={() => setEditingRow(null)} disabled={actionLoading} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all disabled:opacity-40">Cancel</button>
              <button onClick={handleEditSave} disabled={actionLoading}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-[#025545] to-[#189e4f] rounded-xl hover:shadow-lg transition-all disabled:opacity-50">
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {/* Mark Complete confirm modal */}
      {completeConfirmRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => !actionLoading && setCompleteConfirmRow(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <h3 className="text-base font-semibold text-gray-900">Mark as Completed?</h3>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              This will mark the session with <strong>{completeConfirmRow.client_full_name || completeConfirmRow.client_email || 'this client'}</strong> as completed. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setCompleteConfirmRow(null)} disabled={actionLoading}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                Cancel
              </button>
              <button onClick={handleCompleteConfirm} disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-40">
                {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                Yes, Mark Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel & Refund confirm modal */}
      {cancelRefundRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => !actionLoading && setCancelRefundRow(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <h3 className="text-base font-semibold text-gray-900">Cancel &amp; Refund?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-1">This will:</p>
            <ul className="text-sm text-gray-500 list-disc ml-4 mb-4 space-y-1">
              <li>Mark the booking as <strong>refunded</strong> in our system</li>
              <li>Remove the therapist's <strong>Google Calendar event</strong> so the slot reopens</li>
              <li>Finance will show this under <strong>Refunds</strong> — not deducted from gross revenue</li>
            </ul>
            <p className="text-xs text-gray-400 mb-5">Note: Refund the client directly via your payment gateway if needed.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setCancelRefundRow(null)} disabled={actionLoading}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                Back
              </button>
              <button onClick={handleCancelRefundConfirm} disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-40">
                {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                Confirm Cancel &amp; Refund
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel (No Refund) — put on hold, free the slot, reschedule later */}
      {cancelOnlyRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => !actionLoading && setCancelOnlyRow(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <PauseCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <h3 className="text-base font-semibold text-gray-900">Put booking on hold?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-1">For a client who can't attend but doesn't want a refund and will reschedule later. This will:</p>
            <ul className="text-sm text-gray-500 list-disc ml-4 mb-4 space-y-1">
              <li>Set the status to <strong>On Hold</strong> (no refund — money is kept)</li>
              <li>Remove the calendar events from the <strong>therapist's and client's</strong> calendars so the slot reopens</li>
              <li>Keep the booking so you can <strong>Reschedule</strong> it once the client confirms a new date/time</li>
            </ul>
            <div className="flex justify-end gap-2">
              <button onClick={() => setCancelOnlyRow(null)} disabled={actionLoading}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                Back
              </button>
              <button onClick={handleCancelOnlyConfirm} disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-sm hover:bg-amber-600 disabled:opacity-40">
                {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PauseCircle className="h-3.5 w-3.5" />}
                Confirm — On Hold
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteConfirmId(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-900 mb-2">Delete Booking?</h3>
            <p className="text-sm text-gray-500 mb-5">This will soft-delete the booking. It won't be re-created by the next Wix sync.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteConfirmId(null)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleDeleteConfirm} disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-40">
                {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminBookNextPackageSessionModal
        isOpen={isBookNextOpen}
        onClose={() => {
          setIsBookNextOpen(false);
          setSelectedBookNextSession(null);
        }}
        session={selectedBookNextSession}
        onSuccess={handleBookNextSuccess}
      />

      <AdminRescheduleModal
        isOpen={isRescheduleOpen}
        onClose={() => {
          setIsRescheduleOpen(false);
          setSelectedRescheduleSession(null);
        }}
        session={selectedRescheduleSession}
        onRescheduleSuccess={handleRescheduleSuccess}
      />

      <AdminTransferSessionModal
        isOpen={isTransferOpen}
        onClose={() => {
          setIsTransferOpen(false);
          setSelectedTransferSession(null);
        }}
        session={selectedTransferSession}
        onTransferSuccess={async () => {
          setIsTransferOpen(false);
          setSelectedTransferSession(null);
          await load(page);
        }}
      />

      <AdminManualBookingModal
        isOpen={isManualBookingOpen}
        onClose={() => setIsManualBookingOpen(false)}
        onBookingSuccess={() => {
          showSuccess('Manual booking created successfully!', 'Booking Created');
          load(page);
        }}
      />

      <AdminManualBookingModal
        isOpen={isAddRecordOpen}
        onClose={() => setIsAddRecordOpen(false)}
        onBookingSuccess={() => {
          showSuccess('Session record added successfully.', 'Record Added');
          load(page);
        }}
        recordOnly={true}
      />

      {/* Therapist Message Modal */}
      {messageToView && (() => {
        const reportText = messageToView.report || messageToView.session_notes || '';
        const parsed = parseTherapistReport(reportText);
        const therapistName = messageToView.psychologist_name || messageToView.therapist_name || 'Therapist';
        const clientName = messageToView.client_name || messageToView.client_full_name || messageToView.client_first_name || 'Client';
        return (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Message to Operations</p>
                  <p className="text-xs text-gray-400 mt-0.5">{therapistName} · {clientName}</p>
                </div>
                <button onClick={() => setMessageToView(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
                {parsed.clientStatement && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                    <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-widest mb-1.5">Client Opening Statement</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{parsed.clientStatement}</p>
                  </div>
                )}

                {parsed.operations ? (
                  <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                    <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-widest mb-1.5">Operations Note</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{parsed.operations}</p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-8 text-center">
                    <p className="text-sm text-gray-400">No message to operations submitted.</p>
                  </div>
                )}

                {parsed.attachments.length > 0 && (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">Attachments</p>
                    <div className="flex flex-wrap gap-2">
                      {parsed.attachments.map((att, i) => (
                        <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:border-purple-300 hover:bg-purple-50 text-xs font-medium text-gray-600 hover:text-purple-700 transition-all">
                          <Paperclip className="h-3 w-3 shrink-0" />
                          View Attachment {parsed.attachments.length > 1 ? i + 1 : ''}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-gray-100">
                <button onClick={() => setMessageToView(null)}
                  className="w-full py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
