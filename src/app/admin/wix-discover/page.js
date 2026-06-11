'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { RefreshCw, Loader2, Search, Mail, Phone, CloudDownload, MoreVertical, Eye, Edit, Trash2, CheckCircle, X, Save, AlertCircle, Package, Video, Calendar, Filter, XCircle, ArrowRightLeft } from 'lucide-react';
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

  if (isCouple && (hasPlan || isPkg)) return `Couple Package${pkgSuffix}`;
  if (isCouple) return 'Couple';
  if (hasPlan || (isPkg && pkgNum)) return `Package${pkgSuffix}`;
  if (isChild) return count ? `Session ${idx} of ${count} (Package)` : `Session ${idx} (Package)`;
  if (isPkg) {
    if (count && count > 1) return `Package (1/${count})`;
    return 'Package';
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
  if (state === 'COMPLETE') return null;
  if (parseFloat(row.price || '0') === 0) return 'Free';
  return null;
}

function statusBadge(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'completed') return 'bg-green-100 text-green-800';
  if (s === 'cancelled') return 'bg-red-100 text-red-800';
  if (s === 'deleted') return 'bg-red-50 text-red-400 line-through';
  if (s === 'booked') return 'bg-emerald-100 text-emerald-800';
  if (s === 'no_show') return 'bg-amber-100 text-amber-900';
  return 'bg-slate-100 text-slate-700';
}

function effectiveCompletionStatus(row) {
  const primary = String(row?.status || '').toLowerCase();
  const linked = String(row?.session_status || '').toLowerCase();
  return linked || primary;
}

export default function AdminWixDiscoverPage() {
  const { showError, showSuccess } = useNotification();
  const initializedRef = useRef(false);
  const [initialSyncDone, setInitialSyncDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [rows, setRows] = useState([]);
  const [platformRows, setPlatformRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('booked');
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
  const [completeConfirmRow, setCompleteConfirmRow] = useState(null);

  // Close action menu when user scrolls (menu is fixed-position so it won't follow the row)
  useEffect(() => {
    if (!openMenuId) return;
    const close = () => setOpenMenuId(null);
    window.addEventListener('scroll', close, { passive: true, capture: true });
    return () => window.removeEventListener('scroll', close, { capture: true });
  }, [openMenuId]);

  const hasActiveFilters =
    Boolean(searchTerm.trim()) || hasDateRangeBounds(dateRange) || wixFilterType !== 'all' || (statusFilter !== 'booked' && statusFilter !== 'all');

  const load = useCallback(async (targetPage = 1) => {
    setLoading(true);
    try {
      const dateParams = hasDateRangeBounds(dateRange) ? {
        dateFrom: formatIstCalendarYmd(dateRange.from),
        dateTo: formatIstCalendarYmd(dateRange.to),
      } : {};

      // Fetch Wix bookings (wix_bookings table)
      const [res, platformRes] = await Promise.all([
        adminApi.getWixBookings({
          page: targetPage, limit: 10,
          ...dateParams,
          search: searchTerm.trim() || undefined,
          status: (statusFilter && statusFilter !== 'all') ? statusFilter : undefined,
          session_type: wixFilterType !== 'all' ? wixFilterType : undefined,
        }),
        // Fetch platform (manual) sessions from sessions table — non-wix source only
        sessionsApi.getAllSessions({
          page: 1,
          limit: 200,
          sort: 'created_at',
          order: 'desc',
          // Map wix status filter to platform status equivalents
          status: statusFilter === 'booked' ? ['booked', 'rescheduled']
            : statusFilter === 'all' ? undefined
            : statusFilter || undefined,
          ...dateParams,
        }).catch(() => null),
      ]);

      if (!res?.success) throw new Error(res?.error || 'Failed to load Wix bookings');

      const bookings = res.data?.bookings || [];
      setRows(bookings);
      const p = res.data?.pagination || {};
      setPagination({ page: p.page || targetPage, limit: p.limit || 10, total: p.total || 0, totalPages: Math.max(1, Math.ceil((p.total || 0) / (p.limit || 10))) });
      setPage(p.page || targetPage);

      // Filter platform sessions to non-wix source only (exclude sessions already in wix_bookings)
      const allPlatformSessions = platformRes?.data?.sessions || [];
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
        if (searchTerm.trim()) {
          const q = searchTerm.trim().toLowerCase();
          const name = `${s.client?.first_name || ''} ${s.client?.last_name || ''}`.toLowerCase();
          const email = String(s.client?.user?.email || '').toLowerCase();
          const therapist = `${s.psychologist?.first_name || ''} ${s.psychologist?.last_name || ''}`.toLowerCase();
          if (!name.includes(q) && !email.includes(q) && !therapist.includes(q)) return false;
        }
        return true;
      });
      setPlatformRows(platformOnly);
    } catch (e) {
      showError(e?.message || 'Failed to load Wix bookings', 'Wix');
      setRows([]);
      setPlatformRows([]);
    } finally { setLoading(false); }
  }, [dateRange, searchTerm, showError, wixFilterType, statusFilter]);

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

  useEffect(() => {
    if (!initialSyncDone || syncing) return;
    if (page !== 1) { setPage(1); load(1); return; }
    load(1);
  }, [dateRange, searchTerm, wixFilterType, statusFilter, load, initialSyncDone, syncing]);

  const handlePageChange = async (nextPage) => {
    const safePage = Math.max(1, Math.min(pagination.totalPages, nextPage));
    if (safePage === page) return;
    setPage(safePage);
    await load(safePage);
  };

  // --- Actions ---
  const handleView = (row) => { setViewingRow(row); setOpenMenuId(null); };
  const handleEdit = (row) => {
    setEditingRow(row);
    setEditForm({ status: row.status || '', title: row.title || '', price: row.price || '', therapist_name: row.therapist_name || '', notes: row.notes || '' });
    setOpenMenuId(null);
  };
  const handleEditSave = async () => {
    if (!editingRow) return;
    setActionLoading(true);
    try {
      const res = await adminApi.editWixBooking(editingRow.id, editForm);
      if (!res?.success) throw new Error(res?.error || 'Update failed');
      showSuccess('Booking updated', 'Wix');
      setEditingRow(null);
      await load(page);
    } catch (e) { showError(e?.message || 'Update failed', 'Wix'); }
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
      const res = await adminApi.completeWixBooking(completeConfirmRow.id);
      if (!res?.success) throw new Error(res?.error || 'Failed');
      showSuccess('Booking marked as completed', 'Wix');
      setCompleteConfirmRow(null);
      await load(page);
    } catch (e) { showError(e?.message || 'Failed', 'Wix'); }
    finally { setActionLoading(false); }
  };
  const handleNoShow = async (row) => {
    setOpenMenuId(null);
    setActionLoading(true);
    try {
      const res = await adminApi.noShowWixBooking(row.id);
      if (!res?.success) throw new Error(res?.error || 'Failed');
      showSuccess('Booking marked as no-show', 'Wix');
      await load(page);
    } catch (e) { showError(e?.message || 'Failed', 'Wix'); }
    finally { setActionLoading(false); }
  };
  const handleCancelRefundConfirm = async () => {
    if (!cancelRefundRow) return;
    setActionLoading(true);
    try {
      const res = await adminApi.cancelRefundWixBooking(cancelRefundRow.id);
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

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;
    setActionLoading(true);
    try {
      const res = await adminApi.deleteWixBooking(deleteConfirmId);
      if (!res?.success) throw new Error(res?.error || 'Failed');
      showSuccess('Booking deleted', 'Wix');
      setDeleteConfirmId(null);
      await load(page);
    } catch (e) { showError(e?.message || 'Delete failed', 'Wix'); }
    finally { setActionLoading(false); }
  };

  const canBookNextFromRow = (row) => {
    if (!row) return false;
    const status = effectiveCompletionStatus(row);
    if (status !== 'completed') return false;
    // Internal package path (has an internal package_id)
    if (row.package_id && row.client_id && row.psychologist_id) return true;
    // Wix package path: session_type=package + resolved client & psychologist
    const isWixPackage = row.session_type === 'package' && !row.package_id;
    if (isWixPackage && row.client_id && row.psychologist_id) {
      // Only show if there are remaining sessions: session_count > package_session_number (or > 1 if unknown)
      const total = row.session_count ?? row.payload?.creditsAvailable ?? 0;
      const done = row.package_session_number ?? row.payload?.planSessionNumber ?? 1;
      return total > done;
    }
    return false;
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
      id: row.session_id || null,
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
    const sessionProxy = buildSessionProxy(row);
    if (!sessionProxy?.id || !sessionProxy?.psychologist_id) {
      showError('This Wix row is not linked to a reschedulable session yet.', 'Reschedule');
      return;
    }
    setOpenMenuId(null);
    setSelectedRescheduleSession(sessionProxy);
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
        <div className="text-xl font-semibold text-gray-900">Wix Bookings</div>
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
        const platformTagged = platformRows.map((s) => ({ ...s, _isPlatform: true }));
        const allRows = [...rows, ...platformTagged];
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
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading…</td></tr>
                ) : allRows.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">No bookings found{hasActiveFilters ? ' for current filters' : ''}.</td></tr>
                ) : (
                  allRows.map((row) => {
                    const isPlatform = !!row._isPlatform;

                    if (isPlatform) {
                      // ── Platform / manual booking row ──────────────────────────
                      const clientName = [row.client?.first_name, row.client?.last_name].filter(Boolean).join(' ') || '—';
                      const therapistName = [row.psychologist?.first_name, row.psychologist?.last_name].filter(Boolean).join(' ') || '—';
                      const sessionDateStr = row.scheduled_date
                        ? new Date(row.scheduled_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : null;
                      const sessionTimeStr = row.scheduled_time
                        ? (() => {
                            const [h, m] = row.scheduled_time.split(':');
                            const hr = parseInt(h, 10);
                            return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
                          })()
                        : null;
                      const bookedAt = row.booking_created_at || row.created_at;
                      const typeLabel = row.session_type === 'package' ? 'Package'
                        : row.session_type === 'couple' ? 'Couple'
                        : row.session_type === 'assessment' ? 'Assessment'
                        : row.session_type === 'discovery' ? 'Discovery'
                        : 'Individual';
                      const meetLink = row.google_meet_link || row.google_meet_join_url || row.google_calendar_link;
                      return (
                        <tr key={`platform-${row.id}`} className={`transition-colors bg-[#025545]/[0.02] ${openMenuId === `platform-${row.id}` ? 'bg-[#025545]/5' : 'hover:bg-[#025545]/[0.04]'}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-medium text-gray-900 text-xs">{row.id?.slice(-6).toUpperCase()}</span>
                              <span className="inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-100">Manual</span>
                              <span className="inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-[#025545]/10 text-[#025545]">{typeLabel}</span>
                            </div>
                            <p className="text-gray-500 text-xs mt-0.5">
                              {sessionDateStr ? `${sessionDateStr}${sessionTimeStr ? ` · ${sessionTimeStr}` : ''}` : '—'}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-gray-900">{clientName}</p>
                            {row.client?.user?.email && (
                              <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5"><Mail className="h-3 w-3 shrink-0" />{row.client.user.email}</div>
                            )}
                            {row.client?.phone_number && (
                              <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5"><Phone className="h-3 w-3 shrink-0" />{row.client.phone_number}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-700">{therapistName}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(row.status)}`}>{row.status || '—'}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-700">{row.price != null ? `₹${row.price}` : '—'}</td>
                          <td className="px-4 py-3 text-xs text-gray-400">{bookedAt ? fmtDateTime(bookedAt) : '—'}</td>
                          <td className="px-4 py-3 text-center relative">
                            <button
                              onClick={(e) => {
                                const uid = `platform-${row.id}`;
                                if (openMenuId === uid) { setOpenMenuId(null); return; }
                                const rect = e.currentTarget.getBoundingClientRect();
                                const menuHeight = 160;
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
                                {meetLink && !['completed', 'cancelled', 'no_show'].includes(row.status) && (
                                  <button onClick={() => { window.open(meetLink.startsWith('http') ? meetLink : `https://${meetLink}`, '_blank', 'noopener,noreferrer'); setOpenMenuId(null); }}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                    <Video className="h-3.5 w-3.5" /> Open Meet
                                  </button>
                                )}
                                {['booked', 'rescheduled', 'confirmed', 'scheduled', 'reschedule_requested'].includes(row.status) && (
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
                                <a href="/admin/bookings" className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#025545] hover:bg-[#025545]/5">
                                  <Eye className="h-3.5 w-3.5" /> Manage on Bookings page
                                </a>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    }

                    // ── Wix booking row ────────────────────────────────────────
                    return (
                      <tr key={row.id} className={`transition-colors ${openMenuId === row.id ? 'bg-[#025545]/5' : 'hover:bg-gray-50/60'}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-gray-900 text-xs leading-snug">
                              {row.wix_order_number ? `#${row.wix_order_number}` : (row.wix_booking_id ? `ID: ${row.wix_booking_id.slice(-6).toUpperCase()}` : 'No ID')}
                            </p>
                            {row.session_type === 'package' && row.package_session_number && (
                              <span className="text-[10px] font-semibold text-[#025545] bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                {row.package_session_number} of {row.session_count || '?'}
                              </span>
                            )}
                          </div>
                          <p className="text-gray-500 text-xs mt-0.5">{fmtDateTime(row.start_time)}</p>
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
                              return <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize ${colour}`}>{st}</span>;
                            })()}
                            {row.payload?.isAdminManual && (
                              <span className="inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-100">Admin booked</span>
                            )}
                            {!row.payload?.isAdminManual && (() => {
                              const pm = derivePaymentMethod(row);
                              if (!pm) return null;
                              const isManual = pm === 'Manual';
                              return <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${isManual ? 'bg-orange-50 text-orange-700' : 'bg-emerald-50 text-emerald-700'}`}>{pm}</span>;
                            })()}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-gray-900">{row.client_full_name || row.client_first_name || '—'}</p>
                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5"><Mail className="h-3 w-3 shrink-0" />{row.client_email || '—'}</div>
                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5"><Phone className="h-3 w-3 shrink-0" />{row.client_phone || '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{row.therapist_name || '—'}</td>
                        <td className="px-4 py-3">
                          {(() => {
                            const resolved = effectiveCompletionStatus(row);
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
                              {canBookNextFromRow(row) && (
                                <button onClick={() => openBookNext(row)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                  <Package className="h-3.5 w-3.5" /> Book Next Session
                                </button>
                              )}
                              {['booked', 'rescheduled', 'confirmed', 'scheduled', 'reschedule_requested'].includes(effectiveCompletionStatus(row)) && (
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
                              {!['cancelled', 'refunded', 'completed'].includes(effectiveCompletionStatus(row)) && (
                                <button onClick={() => { setOpenMenuId(null); setCancelRefundRow(row); }}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                                  <XCircle className="h-3.5 w-3.5" /> Cancel &amp; Refund
                                </button>
                              )}
                              <hr className="my-1 border-gray-100" />
                              <button onClick={() => { setDeleteConfirmId(row.id); setOpenMenuId(null); }}
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
      {viewingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setViewingRow(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="text-base font-semibold text-gray-900">Booking Details</h3>
              <button onClick={() => setViewingRow(null)} className="p-1 rounded hover:bg-gray-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="px-5 py-4 space-y-3 text-sm">
              {[
                ['Title', viewingRow.title],
                ['Status', viewingRow.status],
                ['Client', viewingRow.client_full_name || viewingRow.client_first_name],
                ['Email', viewingRow.client_email],
                ['Phone', viewingRow.client_phone],
                ['Therapist', viewingRow.therapist_name],
                ['Date/Time', fmtDateTime(viewingRow.start_time)],
                ['Price', viewingRow.price ? `${viewingRow.price} ${viewingRow.currency || ''}` : '—'],
                ['Session Type', deriveSessionType(viewingRow)],
                ['Payment Method', derivePaymentMethod(viewingRow) || '—'],
                ['Payment State', viewingRow.payload?.paymentState || '—'],
                ['Wix Booking ID', viewingRow.wix_booking_id],
                ['Created at', fmtDateTime(wixBookingBookedAtIso(viewingRow))],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-gray-500">{label}</span>
                  <span className="text-gray-900 text-right max-w-[60%] break-all">{val || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditingRow(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="text-base font-semibold text-gray-900">Edit Booking</h3>
              <button onClick={() => setEditingRow(null)} className="p-1 rounded hover:bg-gray-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              {[
                { key: 'status', label: 'Status', type: 'select', options: ['booked', 'completed', 'cancelled', 'no_show'] },
                { key: 'title', label: 'Title' },
                { key: 'therapist_name', label: 'Therapist' },
                { key: 'price', label: 'Price', type: 'number' },
                { key: 'notes', label: 'Notes', type: 'textarea' },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
                  {field.type === 'select' ? (
                    <select value={editForm[field.key] || ''} onChange={(e) => setEditForm(f => ({ ...f, [field.key]: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#025545] focus:outline-none focus:ring-2 focus:ring-[#025545]/15">
                      {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea value={editForm[field.key] || ''} onChange={(e) => setEditForm(f => ({ ...f, [field.key]: e.target.value }))}
                      rows={3} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#025545] focus:outline-none focus:ring-2 focus:ring-[#025545]/15" />
                  ) : (
                    <input type={field.type || 'text'} value={editForm[field.key] || ''} onChange={(e) => setEditForm(f => ({ ...f, [field.key]: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#025545] focus:outline-none focus:ring-2 focus:ring-[#025545]/15" />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t">
              <button onClick={() => setEditingRow(null)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleEditSave} disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#025545] text-white text-sm hover:bg-[#012f23] disabled:opacity-40">
                {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
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
    </div>
  );
}
