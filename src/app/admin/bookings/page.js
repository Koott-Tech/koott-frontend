'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
  Search,
  Filter,
  Eye,
  Edit,
  Clock,
  Loader2,
  User,
  UserCheck,
  CheckCircle,
  XCircle,
  AlertCircle,
  X,
  Phone,
  Mail,
  Package,
  DollarSign,
  MapPin,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Trash2,
  MessageSquare,
  MoreVertical,
  FileText,
  Video,
  Globe,
  CloudDownload
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { adminApi, sessionsApi } from '@/lib/backendApi';
import { useNotification } from '@/contexts/NotificationContext';
import AdminRescheduleModal from '@/components/AdminRescheduleModal';
import AdminManualBookingModal from '@/components/AdminManualBookingModal';
import AdminBookNextPackageSessionModal from '@/components/AdminBookNextPackageSessionModal';
import AdminEditSessionModal from '@/components/AdminEditSessionModal';
import SessionCompletionModal from '@/components/SessionCompletionModal';
import ConfirmModal from '@/components/ConfirmModal';
import { cache } from '@/lib/cache';
import WheelPagination from '@/components/ui/wheel-pagination';
import DateRangePicker from '@/components/ui/date-range-picker';
import { hasDateRangeBounds } from '@/lib/dateRangeBounds';
import { formatIstCalendarYmd, istCalendarMonthBounds } from '@/lib/wixFinanceDates';
import { getSessionCompletionFields } from '@/utils/sessionCompletionFields';
import { sessionBookedAtIso, wixBookingBookedAtIso } from '@/lib/sessionBookedAt';

/** Human-readable plan label: prefer DB `name`, else title-case slug `package_type`. */
function adminPackageDisplayLabel(pkg) {
  if (!pkg || typeof pkg !== 'object') return 'Package';
  const n = typeof pkg.name === 'string' && pkg.name.trim();
  if (n) return n.trim();
  const raw = String(pkg.package_type || 'Package')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!raw || raw === 'Package') return 'Package';
  return raw.replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatIstFromIso(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return '—';
  }
}

export default function BookingsPage() {
  const { showError, showSuccess } = useNotification();
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('booked');
  const [isSessionDetailsOpen, setIsSessionDetailsOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetailsLoading, setSessionDetailsLoading] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [isManualBookingOpen, setIsManualBookingOpen] = useState(false);
  const [isAddRecordOpen, setIsAddRecordOpen] = useState(false);
  const [isEditSessionOpen, setIsEditSessionOpen] = useState(false);
  const [feedbackToView, setFeedbackToView] = useState(null);
  const [showNoShowConfirm, setShowNoShowConfirm] = useState(false);
  const [sessionToMarkNoShow, setSessionToMarkNoShow] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [selectedCompleteSession, setSelectedCompleteSession] = useState(null);
  const [isBookNextOpen, setIsBookNextOpen] = useState(false);
  const [packagesList, setPackagesList] = useState([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [listSource, setListSource] = useState('platform');
  const [wixBookings, setWixBookings] = useState([]);
  const [wixLoading, setWixLoading] = useState(false);
  const [wixSyncing, setWixSyncing] = useState(false);
  const [orphansLoading, setOrphansLoading] = useState(false);
  const [orphansData, setOrphansData] = useState(null); // { orphans: [], summary: {} }
  const [showOrphansModal, setShowOrphansModal] = useState(false);
  const [wixFilterType, setWixFilterType] = useState('all');
  const wixAutoSyncedRef = useRef(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBookings, setTotalBookings] = useState(0);
  const [totalInRange, setTotalInRange] = useState(0); // total across all statuses in current date range
  const [dateRange, setDateRange] = useState(() => istCalendarMonthBounds(new Date()));

  useEffect(() => {
    if (listSource === 'wix') return;
    if (filterStatus === 'packages') {
      loadPackages();
    } else {
      loadBookings();
    }
  }, [currentPage, filterStatus, dateRange, listSource]);

  useEffect(() => {
    if (listSource !== 'wix') return;
    let cancelled = false;
    const initializeWixView = async () => {
      if (!cancelled) {
        await loadWixBookings();
      }
    };
    initializeWixView();
    return () => {
      cancelled = true;
    };
  }, [listSource]);

  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [filterStatus, searchTerm, dateRange, listSource, wixFilterType]);

  const loadBookings = async () => {
    try {
      setIsLoading(true);
      
      // Build query parameters for server-side pagination.
      // Completed: desc so page 2 continues “newest first” globally (must match client sort).
      // Upcoming / other tabs: asc (earliest sessions first).
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        sort: 'created_at',
        order: 'desc'
      };

      // Add filters (Upcoming tab = booked + rescheduled — repeated ?status= for reliable parsing)
      if (filterStatus) {
        params.status =
          filterStatus === 'booked' ? ['booked', 'rescheduled'] : filterStatus;
      }

      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      if (hasDateRangeBounds(dateRange)) {
        params.dateFrom = formatIstCalendarYmd(dateRange.from);
        params.dateTo = formatIstCalendarYmd(dateRange.to);
      }

      // Load sessions with pagination from backend
      const response = await sessionsApi.getAllSessions(params);

      // Parallel fetch: total count across ALL statuses in the same date range
      const allStatusParams = { ...params, status: undefined, page: 1, limit: 200 };
      delete allStatusParams.status;
      sessionsApi.getAllSessions(allStatusParams)
        .then(r => {
          const rows = r?.data?.sessions || [];
          const hidden = rows.filter((s) => {
            const src = String(s.source || '').toLowerCase();
            const wp = s.wix_payload;
            return src === 'wix' && !s.payment_id && (!wp || typeof wp !== 'object' || !wp.sessionId);
          }).length;
          setTotalInRange(Math.max(0, (r?.data?.pagination?.total || 0) - hidden));
        })
        .catch(() => setTotalInRange(0));

      if (response && response.success) {
        const bookingsData = (response.data?.sessions || []).filter((s) => {
          const src = String(s.source || '').toLowerCase();
          const wp = s.wix_payload;
          return !(src === 'wix' && !s.payment_id && (!wp || typeof wp !== 'object' || !wp.sessionId));
        });
        const paginationData = response.data?.pagination || {};
        const hiddenCount = (response.data?.sessions || []).length - bookingsData.length;
        setBookings(bookingsData);
        setTotalBookings(Math.max(0, (paginationData.total || 0) - hiddenCount));
        setTotalPages(Math.max(1, Math.ceil(Math.max(0, (paginationData.total || 0) - hiddenCount) / itemsPerPage)));
      } else {
        setBookings([]);
        setTotalBookings(0);
        setTotalPages(1);
      }
      
    } catch (error) {
      console.error('Failed to load bookings:', error);
      showError('Failed to load bookings', 'Load Error');
      setBookings([]);
      setTotalBookings(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPackages = async () => {
    try {
      setPackagesLoading(true);
      const response = await adminApi.getPackagesWithRemaining();
      if (response?.success && response.data?.packages) {
        setPackagesList(response.data.packages);
      } else {
        setPackagesList([]);
      }
    } catch (err) {
      console.error('Failed to load packages:', err);
      showError('Failed to load packages with remaining sessions', 'Load Error');
      setPackagesList([]);
    } finally {
      setPackagesLoading(false);
    }
  };

  const loadWixBookings = async () => {
    try {
      setWixLoading(true);
      const params = {
        page: currentPage,
        limit: itemsPerPage,
      };
      // Only apply date filtering if explicitly requested or if not in Wix view
      // For Wix view, we want to see everything by default like in Discovery page
      if (hasDateRangeBounds(dateRange)) {
        params.dateFrom = formatIstCalendarYmd(dateRange.from);
        params.dateTo = formatIstCalendarYmd(dateRange.to);
      }
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      if (wixFilterType && wixFilterType !== 'all') {
        params.session_type = wixFilterType;
      }
      const response = await adminApi.getWixBookings(params);

      // Parallel: total Wix sessions in the same date range, ignoring session_type filter.
      // `totalSessions` expands packages (Package of 3 = 3 sessions) so it's a true session count.
      const allTypeParams = { ...params, session_type: undefined, page: 1, limit: 1 };
      delete allTypeParams.session_type;
      adminApi.getWixBookings(allTypeParams)
        .then(r => setTotalInRange(r?.data?.pagination?.totalSessions ?? r?.data?.pagination?.total ?? 0))
        .catch(() => setTotalInRange(0));

      if (response?.success && response.data) {
        setWixBookings(response.data.bookings || []);
        const p = response.data.pagination || {};
        setTotalBookings(p.total || 0);
        setTotalPages(Math.max(1, Math.ceil((p.total || 0) / itemsPerPage)));
      } else {
        setWixBookings([]);
        setTotalBookings(0);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Failed to load Wix bookings:', err);
      showError(err?.message || 'Failed to load Wix bookings', 'Wix');
      setWixBookings([]);
      setTotalBookings(0);
      setTotalPages(1);
    } finally {
      setWixLoading(false);
    }
  };

  const syncWixBookings = async ({ silentSuccess = false } = {}) => {
    try {
      setWixSyncing(true);
      const response = await adminApi.syncWixBookings();
      if (!response?.success) {
        throw new Error(response?.error || response?.message || 'Sync failed');
      }
      if (!silentSuccess) {
        showSuccess(response.message || 'Wix data synced to Supabase', 'Wix');
      }
      return true;
    } catch (err) {
      console.error('Wix sync error:', err);
      showError(err?.message || 'Failed to sync from Wix', 'Wix');
      return false;
    } finally {
      setWixSyncing(false);
    }
  };

  const handleWixSync = async () => {
    const ok = await syncWixBookings({ silentSuccess: false });
    if (ok) {
      wixAutoSyncedRef.current = true;
      await loadWixBookings();
    }
  };

  const handleCheckOrphans = async () => {
    setOrphansLoading(true);
    try {
      const res = await adminApi.getWixOrphans();
      if (!res?.success) throw new Error(res?.error || 'Failed to check orphans');
      setOrphansData(res.data || { orphans: [], summary: {} });
      setShowOrphansModal(true);
    } catch (err) {
      console.error('Orphan check error:', err);
      showError(err?.message || 'Failed to check orphans', 'Orphan Check');
    } finally {
      setOrphansLoading(false);
    }
  };

  const handleViewSession = async (session) => {
    if (!session?.id) return;
    setSelectedSession(null);
    setIsSessionDetailsOpen(true);
    setSessionDetailsLoading(true);
    try {
      const response = await sessionsApi.getSessionDetails(session.id);
      if (!response?.success) {
        setSelectedSession(session);
        showError('Could not load full session details', 'Load Error');
        return;
      }
      // Backend may return { data: { session } } or (legacy) { data: session }
      const sessionData = response.data?.session ?? (response.data && typeof response.data === 'object' && response.data.id ? response.data : null);
      if (sessionData) {
        setSelectedSession(sessionData);
      } else {
        setSelectedSession(session);
        showError('Could not load full session details', 'Load Error');
      }
    } catch (err) {
      console.error('Failed to load session details:', err);
      setSelectedSession(session);
      showError('Failed to load session details', 'Load Error');
    } finally {
      setSessionDetailsLoading(false);
    }
  };

  const handleReschedule = (session) => {
    setSelectedSession(session);
    setIsRescheduleOpen(true);
  };

  const handleEditSession = (session) => {
    setSelectedSession(session);
    setIsEditSessionOpen(true);
  };

  const handleEditSuccess = () => {
    loadBookings(); // Reload bookings after successful edit
  };

  const openCompleteSessionModal = (session) => {
    // Only allow completing for non-completed sessions
    if (session.status === 'completed') {
      showError('This session is already completed', 'Session Status');
      return;
    }
    setSelectedCompleteSession(session);
    setIsCompleteModalOpen(true);
  };

  const handleCompleteSession = async (sessionId, sessionData) => {
    try {
      // Map the form data from SessionCompletionModal to backend expected format
      const mappedData = {
        summary: sessionData.summary?.trim?.() || '',
        report: sessionData.report?.trim?.() || '',
        summary_notes: sessionData.summary_notes?.trim?.() || '',
        completion_date: sessionData.completion_date || ''
      };
      
      await adminApi.completeSession(sessionId, mappedData);
      
      showSuccess('Session completed successfully!', 'Completion Success');
      
      // Reload bookings to update the UI
      await loadBookings();
      
      // Close modal
      setIsCompleteModalOpen(false);
      setSelectedCompleteSession(null);
    } catch (err) {
      console.error('Error completing session:', err);
      showError(`Failed to complete session: ${err.message}`, 'Completion Error');
      throw err; // Re-throw to let the modal handle the error
    }
  };

  const handleDeleteSessionClick = (session) => {
    setSessionToDelete(session);
    setShowDeleteConfirm(true);
  };

  const handleDeleteSession = async () => {
    if (!sessionToDelete || isDeleting) return; // Prevent double-clicks

    console.log('🗑️ [DELETE] Starting delete operation, setting isDeleting to true');
    setIsDeleting(true);
    
    try {
      let response;
      // Check if it's an assessment session or regular session
      if (sessionToDelete.session_type === 'assessment' || sessionToDelete.type === 'assessment') {
        console.log('🗑️ [DELETE] Deleting assessment session');
        // Delete assessment session via admin API
        response = await adminApi.deleteAssessmentSession(sessionToDelete.id);
      } else {
        console.log('🗑️ [DELETE] Deleting regular session');
        // Delete regular session
        response = await sessionsApi.deleteSession(sessionToDelete.id);
      }

      // Check if deletion was successful
      if (!response || !response.success) {
        throw new Error(response?.message || 'Failed to delete session');
      }

      console.log('🗑️ [DELETE] Session deleted, reloading bookings...');
      // Reload bookings to get fresh data from server
      await loadBookings();
      
      showSuccess('Session deleted successfully!', 'Delete Success');
      
      // Close details modal if it's open for this session
      if (selectedSession && selectedSession.id === sessionToDelete.id) {
        setIsSessionDetailsOpen(false);
        setSelectedSession(null);
      }

      console.log('🗑️ [DELETE] Closing modal and resetting state');
      // Close confirmation modal AFTER loading completes
      setShowDeleteConfirm(false);
      setSessionToDelete(null);
      setIsDeleting(false);
    } catch (error) {
      console.error('❌ [DELETE] Error deleting session:', error);
      showError(`Failed to delete session: ${error.message || error.error || 'Unknown error'}`, 'Delete Error');
      // Keep modal open on error so user can see the error and try again
      setIsDeleting(false);
      // Don't close modal on error - let user see the error message
    }
  };

  const handleDeleteCancel = () => {
    if (isDeleting) return; // Prevent canceling while deleting
    setShowDeleteConfirm(false);
    setSessionToDelete(null);
    setIsDeleting(false);
  };

  const handleMarkAsNoShowClick = (session) => {
    setSessionToMarkNoShow(session);
    setShowNoShowConfirm(true);
  };

  // Normalize relation from API (Supabase may return object or array)
  const normRel = (r) => (Array.isArray(r) ? r[0] : r) ?? null;

  // Helper: derive amount/price paid for a session/booking
  const getAmountPaid = (session) => {
    if (!session) return null;

    // Assessment sessions use 'amount'
    if (session.session_type === 'assessment' || session.type === 'assessment') {
      if (session.amount !== undefined && session.amount !== null) {
        return session.amount;
      }
    }

    // Regular sessions often store price directly on the session
    if (session.price !== undefined && session.price !== null) {
      return session.price;
    }

    // Fallback: package price (total) if available
    if (session.package && session.package.price !== undefined && session.package.price !== null) {
      return session.package.price;
    }

    return null;
  };

  const handleNoShowConfirm = async () => {
    if (!sessionToMarkNoShow) return;

    try {
      await sessionsApi.markSessionAsNoShow(sessionToMarkNoShow.id, '');
      
      // Update the booking in the list
      setBookings(prevBookings => 
        prevBookings.map(booking => 
          booking.id === sessionToMarkNoShow.id ? { ...booking, status: 'no_show' } : booking
        )
      );
      
      showSuccess('Session marked as no-show successfully!', 'No-Show Success');
      
      // Close details modal if it's open for this session
      if (selectedSession && selectedSession.id === sessionToMarkNoShow.id) {
        setIsSessionDetailsOpen(false);
        setSelectedSession(null);
      }

      // Close confirmation modal
      setShowNoShowConfirm(false);
      setSessionToMarkNoShow(null);
    } catch (error) {
      console.error('Error marking session as no-show:', error);
      showError(`Failed to mark session as no-show: ${error.message}`, 'No-Show Error');
      setShowNoShowConfirm(false);
      setSessionToMarkNoShow(null);
    }
  };

  const handleNoShowCancel = () => {
    setShowNoShowConfirm(false);
    setSessionToMarkNoShow(null);
  };

  const handleRescheduleSuccess = (updatedSession) => {
    // Update the booking in the list
    setBookings(prevBookings => 
      prevBookings.map(booking => 
        booking.id === updatedSession.id ? updatedSession : booking
      )
    );
    showSuccess('Session rescheduled successfully!', 'Reschedule Success');
  };

  const handleManualBookingSuccess = (newBooking) => {
    loadBookings();
    showSuccess('Manual booking created successfully!', 'Booking Created');
  };

  const handleAddRecordSuccess = () => {
    loadBookings();
    showSuccess('Session record added successfully.', 'Record Added');
  };

  const handleBookNextSuccess = () => {
    if (filterStatus === 'packages') {
      loadPackages();
    } else {
      loadBookings();
      setIsSessionDetailsOpen(false);
      setSelectedSession(null);
    }
    setIsBookNextOpen(false);
    setSelectedSession(null);
  };

  const openBookNextFromPackage = (pkg) => {
    setSelectedSession(pkg);
    setIsBookNextOpen(true);
  };

  const getMeetLink = (session) =>
    session?.google_meet_link ||
    session?.google_meet_join_url ||
    session?.google_meet_start_url ||
    session?.google_calendar_link;

  const handleOpenMeet = (session) => {
    const meetUrl = getMeetLink(session);
    if (!meetUrl) {
      showError('No Google Meet link is available for this session yet.', 'Meet Link');
      return;
    }
    if (typeof window !== 'undefined') {
      const url = meetUrl.startsWith('http') ? meetUrl : `https://${meetUrl}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };


  const getStatusIcon = (status, booking) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'no_show':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'rescheduled':
        return <RefreshCw className="h-4 w-4 text-yellow-500" />;
      case 'scheduled':
        if (isBookingPastDue(booking)) {
          return <Clock className="h-4 w-4 text-slate-500" />;
        }
        return <Calendar className="h-4 w-4 text-sky-600" />;
      case 'confirmed':
        return <UserCheck className="h-4 w-4 text-emerald-600" />;
      case 'reschedule_requested':
        return <RefreshCw className="h-4 w-4 text-amber-600" />;
      case 'booked':
        if (isBookingPastDue(booking)) {
          return <Clock className="h-4 w-4 text-slate-500" />;
        }
        return <Clock className="h-4 w-4 text-[#025545]" />;
      default:
        return <Clock className="h-4 w-4 text-[#025545]" />;
    }
  };

  const getStatusColor = (status, booking) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'no_show':
        return 'bg-orange-100 text-orange-800';
      case 'rescheduled':
        return 'bg-yellow-100 text-yellow-800';
      case 'scheduled':
        if (isBookingPastDue(booking)) {
          return 'bg-slate-100 text-slate-700';
        }
        return 'bg-sky-100 text-sky-800';
      case 'confirmed':
        return 'bg-emerald-100 text-emerald-800';
      case 'reschedule_requested':
        return 'bg-amber-100 text-amber-900';
      case 'booked':
        if (isBookingPastDue(booking)) {
          return 'bg-slate-100 text-slate-700';
        }
        return 'bg-[#025545]/10 text-[#025545]';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status, booking) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      case 'no_show':
        return 'No Show';
      case 'rescheduled':
        return 'Rescheduled';
      case 'scheduled':
        if (isBookingPastDue(booking)) {
          return 'Pending';
        }
        return 'Scheduled';
      case 'confirmed':
        return 'Confirmed';
      case 'reschedule_requested':
        if (isBookingPastDue(booking)) {
          return 'Pending';
        }
        return 'Reschedule requested';
      case 'booked':
        if (isBookingPastDue(booking)) {
          return 'Pending';
        }
        return 'Booked';
      default:
        if (!status) return 'Unknown';
        return status
          .split('_')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
    }
  };

  const formatTime = (time) => {
    if (!time) return 'N/A';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const formatBookedAt = (isoString) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Normalize status for comparison (backend may return 'noshow' or 'no_show')
  const normalizeStatus = (s) => (s === 'noshow' ? 'no_show' : (s || ''));

  // Robust overdue check for booked sessions (supports varied backend time formats)
  const isBookingPastDue = (booking) => {
    const status = normalizeStatus(booking?.status);
    if (status !== 'booked' && status !== 'scheduled' && status !== 'reschedule_requested') return false;
    const dateStr = booking?.scheduled_date;
    const timeStr = booking?.scheduled_time;
    if (!dateStr || !timeStr) return false;

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const todayIso = `${y}-${m}-${d}`;
    const sessionDateOnly = String(dateStr).slice(0, 10);

    // Cross-day check avoids timezone parsing ambiguity
    if (sessionDateOnly < todayIso) return true;
    if (sessionDateOnly > todayIso) return false;

    // Same-day check using HH:mm from scheduled_time
    const cleanTime = String(timeStr).split('.')[0].trim();
    const parts = cleanTime.split(':');
    if (parts.length >= 2) {
      const hh = parseInt(parts[0], 10);
      const mm = parseInt(parts[1], 10);
      if (!Number.isNaN(hh) && !Number.isNaN(mm)) {
        const sessionMinutes = hh * 60 + mm;
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        return sessionMinutes < nowMinutes;
      }
    }

    // Fallback for uncommon formats
    const fallback = new Date(`${sessionDateOnly}T${cleanTime}`);
    if (!Number.isNaN(fallback.getTime())) return fallback < now;
    return false;
  };

  // Client-side: filter by selected status tab and by search
  const filteredBookings = bookings.filter(booking => {
    const st = normalizeStatus(booking.status);
    const statusMatch =
      (filterStatus === 'booked' && (st === 'booked' || st === 'rescheduled')) ||
      st === filterStatus;
    if (!statusMatch) return false;

    if (!searchTerm) return true;
    const clientName = `${booking.client?.first_name || ''} ${booking.client?.last_name || ''}`.toLowerCase();
    const clientEmail = booking.client?.user?.email?.toLowerCase() || '';
    const matchesSearch =
      clientName.includes(searchTerm.toLowerCase()) ||
      clientEmail.includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // IST wall-clock for slot ordering (matches backend getAllSessions).
  const scheduledSlotMs = (s) => {
    const d = s?.scheduled_date;
    if (!d) return 0;
    const dateOnly = String(d).slice(0, 10);
    const rawT = s.scheduled_time != null ? String(s.scheduled_time) : '00:00:00';
    const t = rawT.split('.')[0].trim();
    const parts = t.split(':');
    const hh = String(parts[0] || '00').padStart(2, '0');
    const mm = String(parts[1] || '00').padStart(2, '0');
    const ss = String((parts[2] || '00').split('.')[0]).padStart(2, '0');
    const ms = new Date(`${dateOnly}T${hh}:${mm}:${ss}+05:30`).getTime();
    return Number.isFinite(ms) ? ms : 0;
  };
  const displayBookings = [...filteredBookings].sort((a, b) => {
    const ma = scheduledSlotMs(a);
    const mb = scheduledSlotMs(b);
    if (filterStatus === 'completed') {
      return mb - ma;
    }
    // Upcoming + Rescheduled tabs: future sessions first (nearest slot at top), overdue after.
    const nearestFirst =
      filterStatus === 'booked' || filterStatus === 'rescheduled';
    if (nearestFirst) {
      const now = Date.now();
      const aPast = ma < now;
      const bPast = mb < now;
      if (aPast !== bPast) return aPast ? 1 : -1;
      if (aPast && bPast) return mb - ma;
      return ma - mb;
    }
    return ma - mb;
  });

  // Debug logging
  useEffect(() => {
    console.log('Pagination state:', {
      currentPage,
      totalPages,
      totalBookings,
      displayBookingsLength: displayBookings.length,
      shouldShowPagination: totalPages > 1
    });
  }, [currentPage, totalPages, totalBookings, displayBookings.length]);

  const statusTabs = [
    { label: 'Upcoming', value: 'booked' },
    { label: 'Completed', value: 'completed' },
    { label: 'No Show', value: 'no_show' },
    { label: 'Cancelled', value: 'cancelled' },
    { label: 'Reschedule Requested', value: 'reschedule_requested' },
    { label: 'Refund Requested', value: 'refund_requested' },
    { label: 'Packages', value: 'packages' }
  ];

  const wixTypeTabs = [
    { label: 'All', value: 'all' },
    { label: 'Individual', value: 'individual' },
    { label: 'Couple', value: 'couple' },
    { label: 'Package', value: 'package' }
  ];

  // Pagination handlers
  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showWixView = listSource === 'wix';
  const showPackagesView = !showWixView && filterStatus === 'packages';
  const isLoadingView = showWixView ? wixLoading : showPackagesView ? packagesLoading : isLoading;

  if (
    isLoadingView &&
    (showWixView ? wixBookings.length === 0 : showPackagesView ? packagesList.length === 0 : bookings.length === 0)
  ) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#025545]"></div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h6>Bookings Management</h6>
            <span className="inline-flex items-center rounded-full bg-[#025545]/10 px-2.5 py-1 text-xs font-semibold text-[#025545]">
              {totalInRange} {totalInRange === 1 ? 'booking' : 'bookings'}
              <span className="ml-1 font-normal opacity-70">
                · in selected range{showWixView ? ' (Wix)' : ''}
              </span>
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 max-w-xl">
            Koott sessions and packages. Manage your internal therapy sessions here.
          </p>
        </div>
        <div className="mt-2 sm:mt-0 flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
          {!showWixView && (
            <>
              <button
                onClick={() => setIsManualBookingOpen(true)}
                className="inline-flex items-center px-4 py-2 bg-[#025545] text-white text-sm font-medium rounded-lg hover:bg-[#012f23] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#025545] transition-colors"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Create Manual Booking
              </button>
              <button
                onClick={() => setIsAddRecordOpen(true)}
                className="inline-flex items-center px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#025545] transition-colors"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Add record
              </button>
            </>
          )}
          {showWixView && (
            <>
              <button
                type="button"
                onClick={handleCheckOrphans}
                disabled={orphansLoading}
                className="inline-flex items-center px-4 py-2 bg-white border border-amber-300 text-amber-800 text-sm font-medium rounded-lg hover:bg-amber-50 disabled:opacity-50 transition-colors"
              >
                {orphansLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <AlertCircle className="h-4 w-4 mr-2" />}
                {orphansLoading ? 'Checking…' : 'Check Orphans'}
              </button>
              <button
                type="button"
                onClick={handleWixSync}
                disabled={wixSyncing}
                className="inline-flex items-center px-4 py-2 bg-[#025545] text-white text-sm font-medium rounded-lg hover:bg-[#012f23] disabled:opacity-50 transition-colors"
              >
                {wixSyncing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CloudDownload className="h-4 w-4 mr-2" />
                )}
                {wixSyncing ? 'Syncing…' : 'Sync from Wix'}
              </button>
            </>
          )}
        </div>
      </div>

      {!showPackagesView && (
        <>
          {/* Date Range Filter (like finance dashboard) */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-3 sm:mb-4">
            <div className="flex flex-col gap-4 md:flex-row md:flex-wrap items-start md:items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Date Range:</span>
              </div>
              <DateRangePicker
                selectedRange={dateRange}
                onSelect={setDateRange}
              />
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by client name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#025545] focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showPackagesView && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{packagesList.length}</span>{' '}
            package{packagesList.length !== 1 ? 's' : ''} — upcoming sessions and book next when eligible
          </p>
        </div>
      )}

      {/* Status Tabs */}
      {!showWixView && (
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-1.5">
          <nav
            className="flex gap-1 overflow-x-auto"
            aria-label="Filter by status"
          >
            {statusTabs.map((tab) => {
              const isActive = filterStatus === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setFilterStatus(tab.value)}
                  className={`
                    relative px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap
                    transition-all duration-200 ease-out
                    ${isActive
                      ? 'bg-[#025545] text-white shadow-sm'
                      : 'text-gray-600 hover:text-[#025545] hover:bg-[#025545]/8 active:bg-[#025545]/12'
                    }
                  `}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* Session Type Tabs (Wix only) */}
      {showWixView && (
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-1.5">
          <nav
            className="flex gap-1 overflow-x-auto"
            aria-label="Filter by session type"
          >
            {wixTypeTabs.map((tab) => {
              const isActive = wixFilterType === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setWixFilterType(tab.value)}
                  className={`
                    relative px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap
                    transition-all duration-200 ease-out
                    ${isActive
                      ? 'bg-[#025545] text-white shadow-sm'
                      : 'text-gray-600 hover:text-[#025545] hover:bg-[#025545]/8 active:bg-[#025545]/12'
                    }
                  `}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {showWixView && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
          Search filters client name, email, therapist, and title server-side. Date range filters Wix session start time
          (IST).
        </div>
      )}

      {/* Bookings List or Packages List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          {showPackagesView ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Psychologist
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Upcoming sessions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {packagesLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center">
                      <div className="inline-flex flex-col items-center gap-3 text-gray-500">
                        <Loader2 className="h-8 w-8 animate-spin text-[#025545]" />
                        <span className="text-sm font-medium">Processing...</span>
                      </div>
                    </td>
                  </tr>
                ) : packagesList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No packages with sessions.
                    </td>
                  </tr>
                ) : (
                  packagesList.map((pkg) => {
                    const completed = pkg.package?.completed_sessions ?? 0;
                    const total = pkg.package?.total_sessions ?? pkg.package?.session_count ?? 0;
                    const remaining = pkg.package?.remaining_sessions ?? 0;
                    const canBookNext = pkg.package?.can_book_next === true;
                    const upcomingSessions = pkg.upcoming_sessions ?? [];
                    return (
                      <tr key={`${pkg.client_id}-${pkg.package_id}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <User className="h-4 w-4 text-gray-400 mr-2" />
                            <div className="text-sm text-gray-900">
                              {pkg.client?.first_name} {pkg.client?.last_name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <UserCheck className="h-4 w-4 text-gray-400 mr-2" />
                            <div className="text-sm text-gray-900">
                              {pkg.psychologist?.first_name} {pkg.psychologist?.last_name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="font-medium text-gray-900">
                            {adminPackageDisplayLabel(pkg.package)}
                          </div>
                          {total > 0 && (
                            <div className="text-xs text-gray-500 mt-0.5">{total} sessions in plan</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {completed}/{total} completed · {remaining} remaining
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {upcomingSessions.length === 0 ? (
                            <span className="text-gray-400">—</span>
                          ) : (
                            <ul className="space-y-1">
                              {upcomingSessions.map((s) => (
                                <li key={s.id} className="flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                  <span>{formatDate(s.scheduled_date)} at {formatTime(s.scheduled_time)}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {canBookNext ? (
                            <button
                              onClick={() => openBookNextFromPackage(pkg)}
                              className="inline-flex items-center px-3 py-1.5 bg-[#025545] text-white text-sm font-medium rounded-lg hover:bg-[#012f23] transition-colors"
                            >
                              Book next session
                            </button>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : showWixView ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Session (Wix)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Therapist
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created at
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {wixLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center">
                      <div className="inline-flex flex-col items-center gap-3 text-gray-500">
                        <Loader2 className="h-8 w-8 animate-spin text-[#025545]" />
                        <span className="text-sm font-medium">Loading…</span>
                      </div>
                    </td>
                  </tr>
                ) : wixBookings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500">
                      No Wix rows in Supabase for this range. Run the SQL migration, then click{' '}
                      <strong>Sync from Wix</strong>.
                    </td>
                  </tr>
                ) : (
                  wixBookings.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <div className="text-sm font-medium text-gray-900">
                            {row.wix_order_number ? `#${row.wix_order_number}` : (row.wix_booking_id ? `ID: ${row.wix_booking_id.slice(-6).toUpperCase()}` : '—')}
                          </div>
                          {row.session_type === 'package' && row.package_session_number && (
                            <span className="text-[10px] font-semibold text-[#025545] bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                              {row.package_session_number} of {row.session_count || '?'}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatIstFromIso(row.start_time)}
                        </div>
                        {(row.session_type || row.package_parent_booking_id) && (() => {
                          const isPackage = row.session_type === 'package';
                          const isChild = !!row.package_parent_booking_id;
                          const count = row.session_count;
                          const idx = row.session_index;
                          let label;
                          if (isChild) label = count ? `Session ${idx} of ${count} (package)` : `Session ${idx} (package)`;
                          else if (isPackage) label = count && count > 1 ? `Session 1 of ${count} (package)` : 'Package';
                          else if (row.session_type === 'individual') label = 'Individual';
                          else label = row.session_type;
                          const colour = (isPackage || isChild) ? 'bg-purple-50 text-purple-700' : 'bg-indigo-50 text-indigo-700';
                          return (
                            <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium mt-1 ${colour}`}>
                              {label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2 shrink-0" />
                          <div>
                            <div className="text-sm text-gray-900">
                              {row.client_full_name || row.client_first_name || '—'}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <Mail className="h-3 w-3 shrink-0" />
                              {row.client_email || '—'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.therapist_name || '—'}
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const s = row.status && row.status !== 'undefined' && row.status !== 'null' ? row.status : null;
                          const colours = s === 'completed' ? 'bg-sky-50 text-sky-800'
                            : s === 'cancelled' ? 'bg-red-50 text-red-800'
                            : s === 'no_show' ? 'bg-amber-50 text-amber-900'
                            : s === 'booked' ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-slate-100 text-slate-700';
                          return (
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${colours}`}>
                              {s || '—'}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {row.price ? `${row.price} ${row.currency || ''}`.trim() : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                        {formatBookedAt(
                          wixBookingBookedAtIso(row)
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          {(() => {
                            const sid = row.sessions?.[0]?.id || row.sessions?.id || row.session_id;
                            if (!sid) {
                              return (
                                <span className="text-[10px] text-gray-400 italic">No linked session</span>
                              );
                            }
                            // Minimal session object for the actions
                            const bookingProxy = {
                              ...row,
                              id: sid,
                              status: row.status,
                              scheduled_date: row.start_time?.slice(0, 10),
                              scheduled_time: row.start_time?.slice(11, 16),
                              client: {
                                first_name: row.client_first_name || row.client_full_name?.split(' ')[0],
                                last_name: row.client_last_name || row.client_full_name?.split(' ').slice(1).join(' '),
                                user: { email: row.client_email }
                              }
                            };
                            return (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="text-gray-600 hover:text-gray-900 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                                    <MoreVertical className="h-4 w-4" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem onClick={() => handleViewSession(bookingProxy)} className="cursor-pointer">
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleEditSession(bookingProxy)} className="cursor-pointer">
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  {['booked', 'rescheduled', 'confirmed', 'scheduled'].includes(row.status) && (
                                    <DropdownMenuItem onClick={() => handleReschedule(bookingProxy)} className="cursor-pointer">
                                      <RefreshCw className="h-4 w-4 mr-2" />
                                      Reschedule
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  {row.status !== 'completed' && row.status !== 'no_show' && (
                                    <>
                                      <DropdownMenuItem onClick={() => openCompleteSessionModal(bookingProxy)} className="cursor-pointer text-green-600">
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Mark Completed
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleMarkAsNoShowClick(bookingProxy)} className="cursor-pointer text-orange-600">
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Mark No Show
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteSessionClick(bookingProxy)} 
                                    className="cursor-pointer text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Session Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Psychologist
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Booked at
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center">
                    <div className="inline-flex flex-col items-center gap-3 text-gray-500">
                      <Loader2 className="h-8 w-8 animate-spin text-[#025545]" />
                      <span className="text-sm font-medium">Processing...</span>
                    </div>
                  </td>
                </tr>
              ) : displayBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-500">
                    No bookings found matching your criteria.
                  </td>
                </tr>
              ) : (
              displayBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {(() => {
                          // Show session type instead of session ID
                          if (booking.session_type === 'free_assessment') {
                            return (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Free Assessment
                              </span>
                            );
                          }
                          if (booking.session_type === 'assessment' || booking.type === 'assessment') {
                            return (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                Assessment
                              </span>
                            );
                          }
                          // Package session (use package_id so we show Package even when package object is missing)
                          if (booking.package_id || booking.package || booking.session_type === 'package') {
                            const pkg = booking.package || {};
                            const totalSessions = booking.session_count ?? pkg.total_sessions ?? pkg.session_count ?? 0;
                            const sessionNumber = booking.package_session_number ?? pkg.session_number;
                            const packageLabel = adminPackageDisplayLabel(pkg) || (booking.session_type === 'package' ? 'Package' : null);
                            const hasTotal = totalSessions > 0;
                            const hasSessionNum = sessionNumber !== undefined && sessionNumber !== null;
                            return (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#025545]/10 text-[#025545]">
                                {packageLabel}
                                {hasSessionNum && hasTotal && <span className="ml-1">({sessionNumber}/{totalSessions})</span>}
                                {hasTotal && !hasSessionNum && <span className="ml-1">({totalSessions})</span>}
                              </span>
                            );
                          }
                          // Individual session
                          return (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Individual
                            </span>
                          );
                        })()}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {formatDate(booking.scheduled_date)} at {formatTime(booking.scheduled_time)}
                      </div>
                      {booking.status === 'rescheduled' && booking.original_scheduled_date && (
                        <div className="text-xs text-amber-600 mt-0.5">
                          Originally: {formatDate(booking.original_scheduled_date)}
                        </div>
                      )}
                      {(booking.session_type === 'assessment' || booking.type === 'assessment') && booking.assessment_title && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          {booking.assessment_title}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-gray-400 mr-2" />
                      <div className="text-sm text-gray-900">
                        {booking.client?.first_name} {booking.client?.last_name}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {booking.session_type === 'free_assessment' ? (
                      <div className="flex items-center">
                        <UserCheck className="h-4 w-4 text-gray-400 mr-2" />
                        <div className="text-sm text-gray-900">
                          Free Assessment
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <UserCheck className="h-4 w-4 text-gray-400 mr-2" />
                        <div className="text-sm text-gray-900">
                          {booking.psychologist?.first_name} {booking.psychologist?.last_name}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(booking.status, booking)}`}>
                        {getStatusText(booking.status, booking)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {booking.price != null ? `₹${booking.price}` : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatBookedAt(sessionBookedAtIso(booking))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      {/* View Feedback - icon only when feedback exists */}
                      {booking.status === 'completed' && (booking.feedback || booking.rating || booking.client_feedback) && (
                        <button
                          onClick={() => setFeedbackToView(booking)}
                          title="View feedback"
                          className="inline-flex items-center justify-center p-2 rounded-lg text-purple-600 border border-purple-300 bg-purple-50 hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-100">
                            <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => handleViewSession(booking)} className="cursor-pointer">
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {getMeetLink(booking) && booking.status !== 'completed' && booking.status !== 'cancelled' && (
                            <>
                              <DropdownMenuItem onClick={() => handleOpenMeet(booking)} className="cursor-pointer">
                                <Video className="h-4 w-4 mr-2" />
                                Open Meet
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem onClick={() => handleEditSession(booking)} className="cursor-pointer">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {['booked', 'rescheduled', 'confirmed', 'scheduled', 'reschedule_requested'].includes(
                            booking.status
                          ) && (
                            <>
                              <DropdownMenuItem onClick={() => handleReschedule(booking)} className="cursor-pointer">
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Reschedule
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          {booking.status !== 'completed' && booking.status !== 'no_show' && booking.status !== 'noshow' && (
                            <>
                              <DropdownMenuItem onClick={() => openCompleteSessionModal(booking)} className="cursor-pointer text-green-600">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Mark as Completed
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleMarkAsNoShowClick(booking)} className="cursor-pointer text-orange-600">
                                <XCircle className="h-4 w-4 mr-2" />
                                Mark No Show
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem 
                            onClick={() => handleDeleteSessionClick(booking)} 
                            className="cursor-pointer text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
          )}
        </div>
      </div>

      {/* Empty State */}
      {!showPackagesView && !showWixView && displayBookings.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h6>No bookings found</h6>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm
              ? 'Try adjusting your search or filter criteria.'
              : 'No therapy sessions have been booked yet.'
            }
          </p>
        </div>
      )}

      {/* Empty state is inline in Wix table when no rows */}

      {/* Feedback Modal */}
      {feedbackToView && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div className="text-sm font-semibold text-gray-900" role="heading" aria-level={6}>Client Feedback</div>
              <button
                onClick={() => setFeedbackToView(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Client</p>
                <p className="text-sm text-gray-800">
                  {feedbackToView.client?.first_name} {feedbackToView.client?.last_name}
                </p>
              </div>
              {feedbackToView.rating && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Rating</p>
                  <p className="text-sm text-gray-800">
                    {feedbackToView.rating} out of 5 stars
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Submitted Feedback</p>
                <p className="text-sm text-gray-700 whitespace-pre-line">
                  {feedbackToView.feedback || 'No feedback provided.'}
                </p>
              </div>
            </div>
            <div className="flex justify-end px-5 py-4 border-t border-gray-200">
              <button
                onClick={() => setFeedbackToView(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pagination (Koott + Wix Supabase lists) */}
      {!showPackagesView && totalPages > 1 && (
        <div className="flex items-center justify-center mt-8 pt-6 border-t border-gray-200">
          <WheelPagination
            totalPages={totalPages}
            visibleCount={7}
            currentPage={currentPage - 1} // Convert 1-indexed to 0-indexed
            onPageChange={(page) => handlePageChange(page + 1)} // Convert back to 1-indexed
            className="bg-white"
          />
        </div>
      )}
      
      {/* Show total count - under the table */}
      {!showPackagesView && (showWixView ? wixBookings.length > 0 || totalBookings > 0 : displayBookings.length > 0 || totalBookings > 0) && (
        <div className="text-center mt-4 text-sm text-gray-600">
          Showing {showWixView ? wixBookings.length : displayBookings.length} of {totalBookings}{' '}
          {showWixView ? `Wix booking${totalBookings !== 1 ? 's' : ''}` : `booking${totalBookings !== 1 ? 's' : ''}`}
          {!showWixView && filterStatus !== 'packages' && (
            <>
              {' '}with status{' '}
              <span className="font-medium text-gray-900">
                {filterStatus === 'no_show'
                  ? 'No Show'
                  : filterStatus === 'booked'
                    ? 'Upcoming'
                    : filterStatus.split('_').join(' ')}
              </span>
            </>
          )}
          {showWixView && ' (from Supabase wix_bookings)'}
          {searchTerm && ` matching "${searchTerm}"`}
          {totalPages > 1 && ` - Page ${currentPage} of ${totalPages}`}
        </div>
      )}

      {/* Enhanced Session Details Modal */}
      {isSessionDetailsOpen && (selectedSession || sessionDetailsLoading) && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col border border-slate-200/80">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#025545]/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-[#025545]" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900 tracking-tight" role="heading" aria-level={2}>Session Details</div>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedSession ? `#${selectedSession.id?.slice(0, 8)}` : 'Loading...'}</p>
                </div>
              </div>
              <button
                onClick={() => setIsSessionDetailsOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {sessionDetailsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-10 w-10 animate-spin text-[#025545]" />
                </div>
              ) : selectedSession ? (
              <div className="space-y-5">
                {/* Session Information */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3" role="heading" aria-level={3}>Session Information</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Session ID</p>
                      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono">
                        #{selectedSession.id}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Status</p>
                      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${getStatusColor(selectedSession.status, selectedSession)}`}>
                          {getStatusText(selectedSession.status, selectedSession)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Session Type</p>
                      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900">
                        {selectedSession.package_id || selectedSession.package ? (
                          (() => {
                            const pkg = selectedSession.package || {};
                            let totalSessions = pkg.total_sessions ?? pkg.session_count ?? 0;
                            if (totalSessions === 0 && pkg.package_type) {
                              const match = String(pkg.package_type).match(/\d+/);
                              if (match) totalSessions = parseInt(match[0], 10);
                            }
                            const sessionNumber = pkg.session_number;
                            const label = adminPackageDisplayLabel(pkg);
                            if (totalSessions > 0 && sessionNumber !== undefined && sessionNumber !== null) {
                              return <>{label} <span className="text-slate-600">(Session {sessionNumber}/{totalSessions})</span></>;
                            }
                            if (totalSessions > 0) return <>{label} <span className="text-slate-600">({totalSessions} sessions)</span></>;
                            return label;
                          })()
                        ) : (
                          'Individual'
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Date</p>
                      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900">
                        {formatDate(selectedSession.scheduled_date)}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Time</p>
                      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900">
                        {formatTime(selectedSession.scheduled_time)}
                      </div>
                    </div>
                    {selectedSession.status === 'rescheduled' && selectedSession.original_scheduled_date && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Original Scheduled Date</p>
                        <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600">
                          {formatDate(selectedSession.original_scheduled_date)}
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Booked at</p>
                      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900">
                        {formatBookedAt(sessionBookedAtIso(selectedSession))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Client Information */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3" role="heading" aria-level={3}>Client Information</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Full Name</p>
                      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900">
                        {(() => { const c = normRel(selectedSession.client); return c ? `${(c.first_name || '').trim()} ${(c.last_name || '').trim()}`.trim() || '—' : '—'; })()}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Email</p>
                      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900">
                        {normRel(selectedSession.client)?.user?.email || 'Not provided'}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Phone Number</p>
                      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900">
                        {normRel(selectedSession.client)?.phone_number || 'Not provided'}
                      </div>
                    </div>
                    {normRel(selectedSession.client)?.child_name && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Child Name</p>
                        <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900">
                          {normRel(selectedSession.client).child_name}
                        </div>
                      </div>
                    )}
                    {normRel(selectedSession.client)?.child_age != null && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Child Age</p>
                        <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900">
                          {normRel(selectedSession.client).child_age} years
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Psychologist Information */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3" role="heading" aria-level={3}>Psychologist</div>
                  <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900">
                    {(() => { const p = normRel(selectedSession.psychologist); return p ? `${(p.first_name || '').trim()} ${(p.last_name || '').trim()}`.trim() || '—' : '—'; })()}
                  </div>
                </div>

                {/* Package & Pricing Information */}
                {selectedSession.package && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3" role="heading" aria-level={3}>Package & Pricing</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Plan</p>
                        <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900">
                          {adminPackageDisplayLabel(selectedSession.package)}
                        </div>
                        {selectedSession.package.package_type && (
                          <p className="text-xs text-slate-400 mt-1 font-mono">
                            {selectedSession.package.package_type}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Package Price</p>
                        <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900">
                          ₹{selectedSession.package.price}
                        </div>
                      </div>
                      {selectedSession.package.description && (
                        <div className="md:col-span-2">
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Description</p>
                          <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900">
                            {selectedSession.package.description}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Payment / Amount Paid */}
                {(() => {
                  const amountPaid = getAmountPaid(selectedSession);
                  if (amountPaid === null || amountPaid === undefined) return null;
                  return (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3" role="heading" aria-level={3}>Payment</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Amount Paid</p>
                          <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium">
                            ₹{amountPaid}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Session completion fields */}
                {(() => {
                  const { summary, report, privateNotes } = getSessionCompletionFields(selectedSession);
                  const hasAny = summary || report || privateNotes;
                  if (!hasAny) return null;
                  return (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4 space-y-4">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider" role="heading" aria-level={3}>Session completion notes</div>
                      {summary && (
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Session summary — visible to client</p>
                          <div className="bg-[#025545]/5 border border-[#025545]/20 rounded-lg p-3">
                            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{summary}</p>
                          </div>
                        </div>
                      )}
                      {report && (
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Session report — visible to client</p>
                          <div className="bg-[#025545]/5 border border-[#025545]/20 rounded-lg p-3">
                            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{report}</p>
                          </div>
                        </div>
                      )}
                      {privateNotes && (
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Private session notes — therapist only</p>
                          <div className="bg-slate-100 border border-slate-200 rounded-lg p-3">
                            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{privateNotes}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50/30 flex-shrink-0">
              <div>
                {selectedSession?.status === 'completed' &&
                  selectedSession?.package_id &&
                  (selectedSession?.package?.remaining_sessions ?? 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsBookNextOpen(true)}
                    className="px-4 py-2 bg-[#025545] text-white rounded-lg hover:bg-[#012f23] transition-colors text-sm font-medium"
                  >
                    Book next session
                  </button>
                )}
              </div>
              <button
                onClick={() => setIsSessionDetailsOpen(false)}
                className="px-4 py-2 text-[#025545] bg-white border border-[#025545]/40 rounded-lg hover:bg-[#025545]/10 transition-colors text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Reschedule Modal */}
      <AdminRescheduleModal
        isOpen={isRescheduleOpen}
        onClose={() => setIsRescheduleOpen(false)}
        session={selectedSession}
        onRescheduleSuccess={handleRescheduleSuccess}
      />

      {/* Admin Manual Booking Modal */}
      <AdminManualBookingModal
        isOpen={isManualBookingOpen}
        onClose={() => setIsManualBookingOpen(false)}
        onBookingSuccess={handleManualBookingSuccess}
      />

      {/* Add record only modal (no Meet, no notifications) */}
      <AdminManualBookingModal
        recordOnly
        isOpen={isAddRecordOpen}
        onClose={() => setIsAddRecordOpen(false)}
        onBookingSuccess={handleAddRecordSuccess}
      />

      {/* Book next package session modal */}
      <AdminBookNextPackageSessionModal
        isOpen={isBookNextOpen}
        onClose={() => setIsBookNextOpen(false)}
        session={selectedSession}
        onSuccess={handleBookNextSuccess}
      />

      {/* Edit Session Modal */}
      <AdminEditSessionModal
        isOpen={isEditSessionOpen}
        onClose={() => {
          setIsEditSessionOpen(false);
          setSelectedSession(null);
        }}
        session={selectedSession}
        onUpdateSuccess={handleEditSuccess}
      />

      {/* Orphan Sessions Modal */}
      {showOrphansModal && orphansData && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <div>
                  <div className="text-sm font-semibold text-gray-900">Orphan / Suspicious Bookings</div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Found <strong>{orphansData.summary.total}</strong>: {orphansData.summary.eligibleButUnlinked} unlinked ₹0
                    {' '}· {orphansData.summary.duplicateBookings} duplicates
                    {' '}· {orphansData.summary.danglingChildren} dangling
                    {' '}· {orphansData.summary.packageOverflow} overflow
                  </p>
                </div>
              </div>
              <button onClick={() => setShowOrphansModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {orphansData.orphans.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-700 font-medium">All clean — no orphan bookings detected.</p>
                  <p className="text-xs text-gray-500 mt-1">Every ₹0 follow-up is linked, no duplicates, no dangling references.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orphansData.orphans.map((o) => {
                    const reasonStyle = {
                      'eligible-but-unlinked': 'bg-amber-50 border-amber-200 text-amber-900',
                      'duplicate-booking': 'bg-red-50 border-red-200 text-red-900',
                      'dangling-child': 'bg-purple-50 border-purple-200 text-purple-900',
                      'package-overflow': 'bg-orange-50 border-orange-200 text-orange-900',
                    }[o.orphanReason] || 'bg-gray-50 border-gray-200 text-gray-700';
                    return (
                      <div key={o.wix_booking_id} className={`rounded-lg border px-4 py-3 ${reasonStyle}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wide">{o.orphanReason}</span>
                          <span className="text-[10px] font-mono opacity-60">{o.wix_booking_id?.slice(0, 8)}…</span>
                        </div>
                        <div className="text-sm font-medium text-gray-900">{o.client_full_name || o.client_email || '—'}</div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          {o.client_email} · {formatIstFromIso(o.start_time)} · ₹{o.price ?? 0} {o.currency || ''}
                        </div>
                        {o.therapist_name && <div className="text-xs text-gray-500 mt-0.5">Therapist: {o.therapist_name}</div>}
                        <div className="text-xs mt-1.5">{o.orphanDetail}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end px-5 py-3 border-t border-gray-200">
              <button
                onClick={() => setShowOrphansModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No Show Confirmation Modal */}
      {showNoShowConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <XCircle className="h-6 w-6 text-orange-600 mr-3" />
                <div className="text-sm font-semibold text-gray-900" role="heading" aria-level={3}>Confirm No Show</div>
              </div>
              <p className="text-gray-700 mb-6">
                Are you sure you want to mark this session as no-show? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleNoShowCancel}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleNoShowConfirm}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Mark as No Show
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteSession}
        title="Delete Session"
        message="Are you sure you want to delete this session? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
        disabled={isDeleting}
      />

      {/* Complete Session Modal */}
      <SessionCompletionModal
        session={selectedCompleteSession}
        isOpen={isCompleteModalOpen}
        onClose={() => {
          setIsCompleteModalOpen(false);
          setSelectedCompleteSession(null);
        }}
        onSubmit={(formData) => handleCompleteSession(selectedCompleteSession?.id, formData)}
        fieldsOptional
        wide
      />

      </div>
    </div>
  );
}
