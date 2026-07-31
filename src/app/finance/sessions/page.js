'use client';

import { useState, useEffect } from 'react';
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
  RefreshCw,
  MoreVertical,
  TrendingUp,
  ShoppingBag,
  IndianRupee,
  Pencil,
  Check,
  Trash2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { financeApi } from '@/lib/backendApi';
import { useNotification } from '@/contexts/NotificationContext';
import WheelPagination from '@/components/ui/wheel-pagination';
import DateRangePicker from '@/components/ui/date-range-picker';
import AdminEditSessionModal from '@/components/AdminEditSessionModal';
import { hasDateRangeBounds } from '@/lib/dateRangeBounds';
import { formatIstCalendarYmd, istCalendarMonthBounds } from '@/lib/wixFinanceDates';
import { sessionBookedAtIso } from '@/lib/sessionBookedAt';

export default function FinanceSessionsPage() {
  const { showError, showSuccess } = useNotification();
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSessionDetailsOpen, setIsSessionDetailsOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetailsLoading, setSessionDetailsLoading] = useState(false);
  const [isEditSessionOpen, setIsEditSessionOpen] = useState(false);
  const [selectedEditSession, setSelectedEditSession] = useState(null);
  const [isEditingCommission, setIsEditingCommission] = useState(false);
  const [commissionEditValue, setCommissionEditValue] = useState('');
  const [commissionSaving, setCommissionSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [wixFilterType, setWixFilterType] = useState('all');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSessions, setTotalSessions] = useState(0);
  const [dateRange, setDateRange] = useState(() => istCalendarMonthBounds(new Date()));
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [verifyTarget, setVerifyTarget] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [openRowId, setOpenRowId] = useState(null);

  // Today's stats — fetched once on mount, independent of page filters
  const [todayStats, setTodayStats] = useState(null);
  const [todayStatsLoading, setTodayStatsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const today = formatIstCalendarYmd(new Date());
        const res = await financeApi.getDashboard({
          dateFrom: today,
          dateTo: today,
          includeCharts: false,
        });
        if (res?.success) {
          const summary = res.data?.summary || {};
          setTodayStats({
            totalOrders: summary.total_sessions || 0,
            totalAmount: summary.total_revenue || 0,
          });
        }
      } catch (e) {
        console.error('Failed to load today stats:', e);
      } finally {
        setTodayStatsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    loadSessions();
  }, [currentPage, filterStatus, wixFilterType, dateRange]);

  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [filterStatus, wixFilterType, searchTerm, dateRange]);

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      
      const params = {
        limit: 500,
        dateBasis: 'booked',
        includeUnpaid: 'true',
      };

      if (filterStatus && filterStatus !== 'all') {
        params.status = filterStatus;
      }

      if (hasDateRangeBounds(dateRange)) {
        params.dateFrom = formatIstCalendarYmd(dateRange.from);
        params.dateTo = formatIstCalendarYmd(dateRange.to);
      }

      const response = await financeApi.getSessions(params);
      
      if (response && response.success) {
        const sessionsData = (response.data?.sessions || []).filter((s) => {
          const src = String(s.source || '').toLowerCase();
          const wp = s.wix_payload;
          const isUndefinedWix = src === 'wix' && !s.payment_id && (!wp || typeof wp !== 'object' || !wp.sessionId);
          return !isUndefinedWix;
        });
        setSessions(sessionsData);
      } else {
        setSessions([]);
      }
    } catch (error) {
      console.error('Failed to load finance sessions:', error);
      showError('Failed to load sessions', 'Load Error');
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewSession = async (session) => {
    if (!session?.id) return;
    setSelectedSession(null);
    setIsSessionDetailsOpen(true);
    setSessionDetailsLoading(true);
    setIsEditingCommission(false);
    setCommissionEditValue('');
    try {
      const response = await financeApi.getSessionDetails(session.id);
      if (!response?.success) {
        setSelectedSession(session);
        return;
      }
      const sessionData = response.data?.session ?? (response.data && typeof response.data === 'object' && response.data.id ? response.data : null);
      setSelectedSession(sessionData || session);
    } catch (err) {
      console.error('Failed to load session details:', err);
      setSelectedSession(session);
    } finally {
      setSessionDetailsLoading(false);
    }
  };

  const handleEditSession = async (session) => {
    if (!session?.id) return;
    try {
      const response = await financeApi.getSessionDetails(session.id);
      const sessionData = response?.data?.session ?? session;
      setSelectedEditSession(sessionData);
      setIsEditSessionOpen(true);
    } catch (err) {
      console.error('Failed to load session for editing:', err);
      setSelectedEditSession(session);
      setIsEditSessionOpen(true);
    }
  };

  const handleSaveCommission = async () => {
    if (!selectedSession?.id) return;
    const val = parseFloat(commissionEditValue);
    if (isNaN(val) || val < 0) {
      showError('Enter a valid commission amount');
      return;
    }
    const sessionAmount = getCommissionSplit(selectedSession)?.sessionAmount ?? 0;
    if (val > sessionAmount) {
      showError(`Commission cannot exceed session amount (₹${sessionAmount})`);
      return;
    }
    try {
      setCommissionSaving(true);
      const resp = await financeApi.updateSessionCommission(selectedSession.id, val);
      if (!resp?.success) throw new Error(resp?.message || 'Failed to save');
      // Optimistically update the displayed session data
      const updated = {
        ...selectedSession,
        commission: {
          ...(selectedSession.commission || {}),
          commission_amount: val,
          session_amount: sessionAmount,
        },
        commission_split: {
          sessionAmount,
          companyCommission: val,
          doctorWallet: Math.max(0, sessionAmount - val),
          paymentStatus: selectedSession.commission_split?.paymentStatus || selectedSession.commission?.payment_status || null,
          source: 'commission_history',
        },
      };
      setSelectedSession(updated);
      setIsEditingCommission(false);
      showSuccess('Commission updated successfully');
    } catch (err) {
      showError(err.message || 'Failed to update commission');
    } finally {
      setCommissionSaving(false);
    }
  };

  const normRel = (r) => (Array.isArray(r) ? r[0] : r) ?? null;

  const getAmountPaid = (session) => {
    if (!session) return null;
    if (session.session_type === 'assessment' || session.type === 'assessment') {
      if (session.amount !== undefined && session.amount !== null) return session.amount;
    }
    if (session.price !== undefined && session.price !== null) return session.price;
    if (session.package && session.package.price !== undefined && session.package.price !== null) return session.package.price;
    return null;
  };

  const getStatusColor = (status, booking) => {
    const isTimePassed = () => {
      if (!booking?.scheduled_date || !booking?.scheduled_time) return false;
      return new Date(`${booking.scheduled_date}T${booking.scheduled_time}`) < new Date();
    };
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled':
      case 'canceled':
      case 'refunded': return 'bg-red-100 text-red-800';
      case 'no_show':
      case 'noshow': return 'bg-orange-100 text-orange-800';
      case 'rescheduled': return 'bg-yellow-100 text-yellow-800';
      case 'booked':
        return isTimePassed() ? 'bg-slate-100 text-slate-700' : 'bg-[#025545]/10 text-[#025545]';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status, booking) => {
    const isTimePassed = () => {
      if (!booking?.scheduled_date || !booking?.scheduled_time) return false;
      return new Date(`${booking.scheduled_date}T${booking.scheduled_time}`) < new Date();
    };
    switch (status) {
      case 'completed': return 'Completed';
      case 'cancelled':
      case 'canceled': return 'Cancelled';
      case 'refunded': return 'Refunded';
      case 'no_show':
      case 'noshow': return 'No Show';
      case 'rescheduled': return 'Rescheduled';
      case 'booked': return isTimePassed() ? 'Pending' : 'Booked';
      default: return status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown';
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
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const parseWixIso = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  /** @returns {object|null} */
  const wixPayload = (booking) => {
    const w = booking?.wix_payload;
    if (w == null) return null;
    if (typeof w === 'string') {
      try {
        const o = JSON.parse(w);
        return typeof o === 'object' && o !== null ? o : null;
      } catch {
        return null;
      }
    }
    return typeof w === 'object' ? w : null;
  };

  const wixStartInstant = (p) => {
    if (!p) return null;
    const cands = [
      p.startTime,
      p.start,
      p.sessionInfo?.start,
      p.rawBookedEntity?.singleSession?.start,
      p.rawBookedEntity?.start,
      p.bookedSessionInfo?.start,
      p.slot?.startDate,
    ];
    for (const c of cands) {
      const d = parseWixIso(c);
      if (d) return d;
    }
    return null;
  };

  const getScheduledDateValue = (booking) => {
    if (booking?.scheduled_date) return booking.scheduled_date;
    const p = wixPayload(booking);
    const d = wixStartInstant(p);
    return d ? d.toISOString().split('T')[0] : null;
  };

  const getScheduledTimeValue = (booking) => {
    if (booking?.scheduled_time) return booking.scheduled_time;
    const p = wixPayload(booking);
    const d = wixStartInstant(p);
    if (!d) return null;
    return d.toLocaleTimeString('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getClientDisplayName = (booking) => {
    const direct = `${booking?.client?.first_name || ''} ${booking?.client?.last_name || ''}`.trim();
    if (direct) return direct;
    const p = wixPayload(booking);
    if (!p) return '—';
    const c = p.client || p.formInfo?.contactDetails || p.contactDetails;
    const wixName =
      c?.fullName ||
      [c?.firstName, c?.lastName].filter(Boolean).join(' ').trim() ||
      c?.name ||
      p.client?.fullName;
    return wixName || '—';
  };

  const getPsychologistDisplayName = (booking) => {
    const direct = `${booking?.psychologist?.first_name || ''} ${booking?.psychologist?.last_name || ''}`.trim();
    if (direct) return direct;
    const p = wixPayload(booking);
    if (!p) return '—';
    return (
      p.therapist?.name ||
      p.therapist?.displayName ||
      p.staffMember?.name ||
      p.staff?.name ||
      p.provider?.name ||
      (typeof p.therapist === 'string' ? p.therapist : null) ||
      '—'
    );
  };

  const getPriceDisplayAmount = (booking) => {
    const n = booking?.amount ?? booking?.price;
    if (n != null && n !== '' && !Number.isNaN(Number(n)) && Number(n) !== 0) {
      return Number(n);
    }
    const p = wixPayload(booking);
    if (p) {
      const wixFinal = p.paymentDetails?.balance?.finalPrice?.amount;
      if (wixFinal != null && wixFinal !== '' && !Number.isNaN(Number(wixFinal))) return Number(wixFinal);
      const plan = p.pricingPlanInfo?.priceDetails?.price ?? p.pricingPlanInfo?.totalPrice;
      if (plan != null && plan !== '' && !Number.isNaN(Number(plan))) return Number(plan);
      const wixPrice = p.price ?? p.rawBookedEntity?.rate?.defaultVariedPrice?.amount;
      if (wixPrice != null && wixPrice !== '' && !Number.isNaN(Number(wixPrice))) return Number(wixPrice);
    }
    if (n != null && n !== '' && !Number.isNaN(Number(n))) return Number(n);
    return 0;
  };

  const deriveSessionType = (booking) => {
    const p = wixPayload(booking) || {};
    const rawCredits = p.pricingPlanInfo?.credits || {};
    const type = booking?.session_type || p.bookingType || null;
    const isCouple = type === 'couple';
    const isChild = !!booking?.package_parent_booking_id && !!booking?.session_index;
    // session_type='package' with session_count=1 and no series evidence = single plan-credit booking → treat as individual
    const hasSeriesEvidence = (booking?.session_count ?? 0) > 1
      || booking?.package_session_number != null
      || !!booking?.package_id
      || !!booking?.package
      || isChild
      || p.planSessionNumber != null
      || (p.creditsAvailable != null && Number(p.creditsAvailable) > 1)
      || (rawCredits.available != null && Number(rawCredits.available) > 1);
    const isPkg = (type === 'package' && hasSeriesEvidence) || !!booking?.package_id || !!booking?.package || isChild;

    // Mirror wix-discover priority: DB column → Velo payload → raw pricingPlanInfo credits
    const pkgNum = booking?.package_session_number
      ?? p.planSessionNumber
      ?? (rawCredits.available != null && rawCredits.remaining != null ? rawCredits.available - rawCredits.remaining : null)
      ?? null;
    const pkgTotal = booking?.session_count
      ?? p.creditsAvailable
      ?? rawCredits.available
      ?? p.detectedSessionCount
      ?? null;
    const hasPlan = !!(pkgNum || rawCredits.available != null) && !!(p.creditsAvailable || rawCredits.available);
    const pkgSuffix = pkgNum && pkgTotal ? ` (${pkgNum}/${pkgTotal})` : pkgNum ? ` (${pkgNum})` : pkgTotal && pkgTotal > 1 ? ` (1/${pkgTotal})` : '';

    if (isCouple && (hasPlan || isPkg)) return `Couple Package${pkgSuffix}`;
    if (isCouple) return 'Couple';
    if (type === 'assessment') return 'Assessment';
    if (type === 'discovery') return 'Discovery';
    if (type === 'free_assessment') return 'Free Assessment';
    if (hasPlan || (isPkg && pkgNum)) return `Package${pkgSuffix}`;
    if (isChild) return pkgTotal ? `Session ${booking.session_index} of ${pkgTotal} (Package)` : `Session ${booking.session_index} (Package)`;
    if (isPkg) return pkgTotal && pkgTotal > 1 ? `Package (1/${pkgTotal})` : 'Package';
    return 'Individual';
  };

  const deriveSessionTypeKey = (booking) => {
    const label = deriveSessionType(booking).toLowerCase();
    if (label.includes('couple')) return 'couple';
    if (label.includes('package')) return 'package';
    return 'individual';
  };

  const derivePaymentMethod = (booking) => {
    const p = wixPayload(booking) || {};
    // Admin-created booking (Wix admin-manual mirror or platform manual) → "Admin".
    if (p.isAdminManual === true || String(booking.source || '').toLowerCase() === 'admin_manual') return 'Admin';
    const vendors = p.paymentDetails?.wixPayMultipleDetails;
    if (Array.isArray(vendors) && vendors.length > 0) {
      const v = vendors[0]?.paymentVendorName;
      if (v === 'inPerson') return 'Manual';
      if (v === 'Razorpay') return 'Razorpay';
      if (v) return v;
    }
    if (p.paymentState === 'FREE') return 'Free';
    // A completed online Wix payment collapses the vendor breakdown to [] and only reports
    // paymentState:'COMPLETE' — for Koott the only online gateway is Razorpay.
    if (p.paymentState === 'COMPLETE') return 'Razorpay';
    // ₹0 package follow-ups aren't "Free": the whole package price sits on session #1 and the
    // follow-ups inherit its method. A non-admin Wix package (admin handled above) = Razorpay.
    if (deriveSessionTypeKey(booking) === 'package') return 'Razorpay';
    if (getPriceDisplayAmount(booking) === 0) return 'Free';
    // A real-priced Wix booking with no explicit vendor/state is an online Razorpay payment.
    return 'Razorpay';
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

  const getCommissionSplit = (session) => {
    const split = session?.commission_split || null;
    if (split) {
      return {
        sessionAmount: Number(split.session_amount || 0),
        companyCommission: split.company_commission == null ? null : Number(split.company_commission || 0),
        doctorWallet: split.doctor_wallet == null ? null : Number(split.doctor_wallet || 0),
        paymentStatus: split.commission_payment_status || split.payment_status || null,
      };
    }

    const commission = session?.commission || null;
    if (commission) {
      const sessionAmount = Number(commission.session_amount || session?.price || 0);
      const companyCommission = Number(commission.commission_amount || 0);
      return {
        sessionAmount,
        companyCommission,
        doctorWallet: Math.max(0, sessionAmount - companyCommission),
        paymentStatus: commission.payment_status || null,
      };
    }

    if (session?.therapist_commission != null && session?.price != null) {
      const sessionAmount = Number(session.price || 0);
      const doctorWallet = Number(session.therapist_commission || 0);
      return {
        sessionAmount,
        companyCommission: Math.max(0, sessionAmount - doctorWallet),
        doctorWallet,
        paymentStatus: null,
      };
    }

    return null;
  };

  const normalizeStatus = (s) => (s === 'noshow' ? 'no_show' : (s || ''));

  const filteredSessions = sessions.filter(s => {
    const statusMatch = filterStatus === 'all' || normalizeStatus(s.status) === filterStatus;
    if (!statusMatch) return false;
    const typeMatch = wixFilterType === 'all' || deriveSessionTypeKey(s) === wixFilterType;
    if (!typeMatch) return false;
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase().replace(/^#/, ''); // strip leading # if pasted from UI
    const clientName = getClientDisplayName(s).toLowerCase();
    const clientEmail = (s.client?.user?.email || s.client?.email || s.wix_payload?.client?.email || '').toLowerCase();
    const sessionId = (s.id || '').toLowerCase();
    const wixBookingId = (s.wix_booking_id || '').toLowerCase();
    const displayId = s.wix_booking_id
      ? s.wix_booking_id.slice(-6).toLowerCase()
      : (s.id || '').slice(0, 6).toLowerCase();
    return (
      clientName.includes(q) ||
      clientEmail.includes(q) ||
      sessionId.includes(q) ||
      wixBookingId.includes(q) ||
      displayId.includes(q)
    );
  });

  const displaySessions = [...filteredSessions].sort((a, b) => {
    const aBookedAt = sessionBookedAtIso(a);
    const bBookedAt = sessionBookedAtIso(b);
    const aMs = aBookedAt ? new Date(aBookedAt).getTime() : 0;
    const bMs = bBookedAt ? new Date(bBookedAt).getTime() : 0;
    if (aMs !== bMs) return bMs - aMs;

    const aDate = getScheduledDateValue(a) || '';
    const aTime = getScheduledTimeValue(a) || '';
    const bDate = getScheduledDateValue(b) || '';
    const bTime = getScheduledTimeValue(b) || '';
    const aDt = new Date(`${aDate}T${aTime}`).getTime();
    const bDt = new Date(`${bDate}T${bTime}`).getTime();
    return bDt - aDt;
  });

  useEffect(() => {
    const total = displaySessions.length;
    setTotalSessions(total);
    setTotalPages(Math.max(1, Math.ceil(total / itemsPerPage)));
  }, [displaySessions, itemsPerPage]);

  const paginatedSessions = displaySessions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const statusTabs = [
    { value: 'all', label: 'All' },
    { value: 'booked', label: 'Booked' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'rescheduled', label: 'Rescheduled' },
    { value: 'no_show', label: 'No Show' }
  ];

  const wixTypeTabs = [
    { value: 'all', label: 'All Types' },
    { value: 'individual', label: 'Individual' },
    { value: 'couple', label: 'Couple' },
    { value: 'package', label: 'Package' }
  ];

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Any session where payment was done manually (cash/in-person/plan-credit)
  // needs finance team verification — same as the "Manual" badge logic
  const isManualSession = (s) => {
    if (!s) return false;
    // Admin-created sessions
    if (s.source === 'admin_manual') return true;
    if (String(s.wix_booking_id || '').startsWith('admin_manual_')) return true;
    if (s.wix_payload?.isAdminManual === true || s.wix_payload?.manualBooking === true) return true;
    // Wix plan-credit / inPerson payment sessions
    const vendor = (s.wix_payload?.paymentDetails?.wixPayMultipleDetails?.[0]?.paymentVendorName || '').toLowerCase();
    if (vendor === 'inperson') return true;
    const payState = (s.wix_payload?.paymentState || s.wix_payload?.paymentDetails?.state || '').toUpperCase();
    if (payState === 'UNDEFINED' && !s.wix_payload?.paymentDetails?.balance?.finalPrice?.amount) return true;
    return false;
  };

  const handleVerifyPayment = async () => {
    if (!verifyTarget || isVerifying) return;
    setIsVerifying(true);
    try {
      const res = await financeApi.verifyPayment(verifyTarget.id);
      if (!res?.success) throw new Error(res?.error || res?.message || 'Failed');
      showSuccess('Payment verified ✓', 'Verified');
      setVerifyTarget(null);
      loadSessions();
    } catch (e) { showError(e.message || 'Failed to verify', 'Error'); }
    finally { setIsVerifying(false); }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await financeApi.deleteSession(deleteTarget.id);
      if (!res?.success) throw new Error(res?.message || 'Failed to delete');
      showSuccess('Session deleted', 'Deleted');
      setDeleteTarget(null);
      loadSessions();
    } catch (e) { showError(e.message || 'Failed to delete', 'Error'); }
    finally { setIsDeleting(false); }
  };

  const handleCancelRefundConfirm = async () => {
    if (!cancelTarget || isCancelling) return;
    setIsCancelling(true);
    try {
      const res = await financeApi.cancelRefundSession(cancelTarget.id);
      if (!res?.success) throw new Error(res?.error || 'Failed');
      showSuccess(`Cancelled & refunded${res.data?.calendarEventRemoved ? '. Calendar event removed.' : '.'}`, 'Cancelled');
      setCancelTarget(null);
      loadSessions();
    } catch (e) { showError(e.message || 'Failed to cancel', 'Error'); }
    finally { setIsCancelling(false); }
  };

  if (isLoading && sessions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#025545]"></div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-2">
      <div className="space-y-2">
        {/* Today Stats Header Bar */}
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm px-5 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-6 sm:gap-8">
            {/* Sales */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sales</span>
              </div>
              {todayStatsLoading ? (
                <div className="h-5 w-16 bg-gray-100 rounded animate-pulse" />
              ) : (
                <span className="text-base font-bold text-gray-900">₹{(todayStats?.totalAmount || 0).toLocaleString('en-IN')}</span>
              )}
            </div>

            <div className="hidden sm:block w-px h-6 bg-gray-200" />

            {/* Orders */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Orders</span>
              </div>
              {todayStatsLoading ? (
                <div className="h-5 w-8 bg-gray-100 rounded animate-pulse" />
              ) : (
                <span className="text-base font-bold text-gray-900">{todayStats?.totalOrders || 0}</span>
              )}
            </div>
          </div>

          {/* Today label */}
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
            <Calendar className="h-3.5 w-3.5" />
            Today
          </div>
        </div>

        {/* Date Range + Search row */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex items-center gap-2 shrink-0">
              <Filter className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Date Range:</span>
              <DateRangePicker
                selectedRange={dateRange}
                onSelect={setDateRange}
              />
            </div>
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by client name, email or session ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#025545] focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-1.5">
          <nav className="flex gap-1 overflow-x-auto" aria-label="Filter by status">
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

        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-1.5">
          <nav className="flex gap-1 overflow-x-auto" aria-label="Filter by session type">
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

        {/* Sessions Table — same style as Wix Discovery */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto shadow-sm">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Session</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Therapist</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created at</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading…</td></tr>
              ) : paginatedSessions.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">No sessions found{searchTerm || filterStatus !== 'all' ? ' for current filters' : ''}.</td></tr>
              ) : (
                paginatedSessions.map((booking) => {
                  const typeLabel = deriveSessionType(booking);
                  const typeKey = deriveSessionTypeKey(booking);
                  const typeColour = typeLabel.startsWith('Couple')
                    ? 'bg-pink-50 text-pink-700'
                    : typeLabel.startsWith('Package') || typeLabel.includes('(Package)')
                      ? 'bg-violet-50 text-violet-700'
                      : typeLabel === 'Assessment' ? 'bg-purple-50 text-purple-700'
                      : typeLabel === 'Discovery'  ? 'bg-sky-50 text-sky-700'
                      : 'bg-indigo-50 text-indigo-700';
                  const paymentLabel = derivePaymentMethod(booking);
                  const paymentColour = paymentLabel === 'Manual' || paymentLabel === 'Admin'
                    ? 'bg-orange-50 text-orange-700'
                    : paymentLabel === 'Free'
                      ? 'bg-sky-50 text-sky-700'
                      : 'bg-emerald-50 text-emerald-700';
                  const _wp = wixPayload(booking) || {};
                  const _wpContact = _wp.client || _wp.formInfo?.contactDetails || _wp.contactDetails || {};
                  const clientEmail = booking.client?.user?.email || booking.client?.email || booking.client_email || _wpContact.email || null;
                  const clientPhone = booking.client?.phone_number || booking.client_phone || _wpContact.phone || _wpContact.phoneNumber || null;

                  const isManual = isManualSession(booking);
                  const isVerified = booking.payment_verified === true;

                  return (
                    <tr key={booking.id} className={`transition-colors ${openRowId === booking.id ? 'bg-[#025545]/5' : 'hover:bg-gray-50/60'}`}>
                      {/* Session */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-gray-900 text-xs leading-snug">
                            {booking.wix_order_number ? `#${booking.wix_order_number}` : booking.wix_booking_id ? `ID: ${booking.wix_booking_id.slice(-6).toUpperCase()}` : `ID: ${booking.id?.slice(0, 6).toUpperCase()}`}
                          </p>
                        </div>
                        <p className="text-gray-500 text-xs mt-0.5">{formatDate(getScheduledDateValue(booking))} at {formatTime(getScheduledTimeValue(booking))}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize ${typeColour}`}>{typeLabel}</span>
                          {paymentLabel && <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${paymentColour}`}>{paymentLabel}</span>}
                          {isManual && (
                            isVerified
                              ? <span title="Payment verified" className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-green-50 text-green-700 border border-green-200">
                                  <CheckCircle className="h-2.5 w-2.5" />
                                </span>
                              : <span title="Pending verification" className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                  <Clock className="h-2.5 w-2.5" />
                                </span>
                          )}
                        </div>
                      </td>
                      {/* Client */}
                      <td className="px-4 py-3">
                        {(() => { const nm = getClientDisplayName(booking); return <p className="text-gray-900 font-medium truncate max-w-[180px]" title={nm}>{nm}</p>; })()}
                        {clientEmail && <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5 max-w-[200px]"><Mail className="h-3 w-3 shrink-0" /><span className="truncate" title={clientEmail}>{clientEmail}</span></div>}
                        {clientPhone && <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5"><Phone className="h-3 w-3 shrink-0" />{clientPhone}</div>}
                      </td>
                      {/* Therapist */}
                      <td className="px-4 py-3 text-gray-700">{getPsychologistDisplayName(booking)}</td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(booking.status, booking)}`}>
                          {getStatusText(booking.status, booking)}
                        </span>
                      </td>
                      {/* Price */}
                      <td className="px-4 py-3 text-gray-700">₹{getPriceDisplayAmount(booking).toLocaleString('en-IN')}</td>
                      {/* Created at */}
                      <td className="px-4 py-3 text-xs text-gray-400">{formatBookedAt(sessionBookedAtIso(booking))}</td>
                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        <DropdownMenu open={openRowId === booking.id} onOpenChange={(o) => setOpenRowId(o ? booking.id : null)}>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem onClick={() => handleViewSession(booking)} className="cursor-pointer">
                              <Eye className="h-4 w-4 mr-2" />View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditSession(booking)} className="cursor-pointer">
                              <Edit className="h-4 w-4 mr-2" />Edit
                            </DropdownMenuItem>
                            {isManual && !isVerified && (
                              <DropdownMenuItem onClick={() => setVerifyTarget(booking)} className="cursor-pointer text-green-700">
                                <CheckCircle className="h-4 w-4 mr-2" />Approve Payment
                              </DropdownMenuItem>
                            )}
                            {!['cancelled', 'refunded', 'completed'].includes(booking.status) && (
                              <DropdownMenuItem onClick={() => setCancelTarget(booking)} className="cursor-pointer text-red-600">
                                <XCircle className="h-4 w-4 mr-2" />Cancel &amp; Refund
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => setDeleteTarget(booking)} className="cursor-pointer text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center mt-8 pt-6 border-t border-gray-200">
            <WheelPagination
              totalPages={totalPages}
              visibleCount={7}
              currentPage={currentPage - 1}
              onPageChange={(page) => handlePageChange(page + 1)}
              className=""
            />
          </div>
        )}

        {/* Total count */}
        {(displaySessions.length > 0 || totalSessions > 0) && (
          <div className="text-center mt-4 text-sm text-gray-600">
            Showing {paginatedSessions.length} of {totalSessions} session{totalSessions !== 1 ? 's' : ''}
            {filterStatus !== 'all' && (
              <>
                {' '}with status{' '}
                <span className="font-medium text-gray-900">
                  {filterStatus === 'no_show' ? 'No Show' : filterStatus.replace('_', ' ')}
                </span>
              </>
            )}
            {wixFilterType !== 'all' && (
              <>
                {' '}in{' '}
                <span className="font-medium text-gray-900">
                  {wixTypeTabs.find((tab) => tab.value === wixFilterType)?.label || wixFilterType}
                </span>
              </>
            )}
            {searchTerm && ` matching "${searchTerm}"`}
            {totalPages > 1 && ` — Page ${currentPage} of ${totalPages}`}
          </div>
        )}

        {/* Enhanced Session Details Modal (matches admin bookings) */}
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
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-slate-900 tracking-tight" role="heading" aria-level={2}>Session Details</div>

                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedSession?.wix_order_number ? `#${selectedSession.wix_order_number}` : (selectedSession ? `#${selectedSession.id?.slice(0, 8)}` : 'Loading...')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setIsSessionDetailsOpen(false); setIsEditingCommission(false); setCommissionEditValue(''); }}
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
                        {selectedSession.wix_booking_id && (
                          <div>
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Booking ID</p>
                            <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 font-mono">
                              {selectedSession.wix_booking_id}
                            </div>
                          </div>
                        )}
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
                                if (totalSessions > 0 && sessionNumber !== undefined && sessionNumber !== null) {
                                  return <>Package <span className="text-slate-600">(Session {sessionNumber}/{totalSessions})</span></>;
                                }
                                if (totalSessions > 0) return <>Package <span className="text-slate-600">({totalSessions} sessions)</span></>;
                                return 'Package';
                              })()
                            ) : (
                              'Individual'
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Date</p>
                          <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900">
                            {formatDate(selectedSession.scheduled_date || selectedSession.session_date)}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Time</p>
                          <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900">
                            {formatTime(selectedSession.scheduled_time || selectedSession.session_time)}
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
                            {normRel(selectedSession.client)?.email || normRel(selectedSession.client)?.user?.email || 'Not provided'}
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
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Package Type</p>
                            <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900">
                              {(() => {
                                const raw = (selectedSession.package.package_type || 'Package').replace(/_\d+$/, '') || 'Package';
                                return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
                              })()}
                            </div>
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
                      const wp = selectedSession?.wix_payment;
                      const razorpayOrderId = wp?.razorpay_order_id || selectedSession?.payment?.razorpay_order_id || null;
                      const paymentType = wp?.vendor || selectedSession?.payment?.payment_method || null;
                      const wixTxId = wp?.wix_transaction_id || null;
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
                            <div>
                              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Payment Type</p>
                              <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900">
                                {(() => {
                                  const raw = (paymentType || '').toLowerCase().trim();
                                  if (raw === 'inperson') return 'Manual (In Person)';
                                  if (raw === 'razorpay') return 'Razorpay';
                                  if (raw === 'cash' || raw === 'cash payment') return 'Cash';
                                  if (raw === 'upi') return 'UPI';
                                  if (raw === 'card' || raw === 'card payment') return 'Card';
                                  if (raw === 'netbanking' || raw === 'net banking') return 'Net Banking';
                                  return paymentType || '—';
                                })()}
                              </div>
                            </div>
                            {razorpayOrderId && (
                              <div className="md:col-span-2">
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Razorpay Order ID</p>
                                <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono break-all">
                                  {razorpayOrderId}
                                </div>
                              </div>
                            )}
                            {wixTxId && (
                              <div className="md:col-span-2">
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Wix Transaction ID</p>
                                <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono break-all">
                                  {wixTxId}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Manual Booking Payment Details — shown for all manual sessions */}
                    {isManualSession(selectedSession) && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="text-xs font-semibold text-amber-800 uppercase tracking-wider" role="heading" aria-level={3}>Manual Booking — Payment Details</div>
                          {selectedSession.payment_verified && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-100 border border-green-200 rounded-full px-2 py-0.5">
                              <CheckCircle className="h-3 w-3" /> Verified
                            </span>
                          )}
                        </div>
                        {/* Fallback when no payment record linked */}
                        {!selectedSession.payment && !selectedSession.wix_payment && !selectedSession.receipt_url && (
                          <p className="text-sm text-amber-700/70 italic">No payment record linked to this manual booking.</p>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {(selectedSession.payment?.payment_method || selectedSession.wix_payment?.vendor) && (
                            <div>
                              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Payment Method</p>
                              <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 capitalize">
                                {(() => {
                                  const raw = (selectedSession.payment?.payment_method || selectedSession.wix_payment?.vendor || '').toLowerCase().trim();
                                  if (raw === 'inperson') return 'Manual (In Person)';
                                  if (raw === 'cash' || raw === 'cash payment') return 'Cash';
                                  if (raw === 'upi') return 'UPI';
                                  if (raw === 'card' || raw === 'card payment') return 'Card';
                                  if (raw === 'netbanking' || raw === 'net banking') return 'Net Banking';
                                  if (raw === 'razorpay') return 'Razorpay';
                                  return raw || '—';
                                })()}
                              </div>
                            </div>
                          )}
                          {selectedSession.payment?.transaction_id && (
                            <div>
                              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Transaction ID</p>
                              <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono break-all">
                                {selectedSession.payment.transaction_id}
                              </div>
                            </div>
                          )}
                          {selectedSession.payment?.reference_number && (
                            <div className="md:col-span-2">
                              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Reference Number</p>
                              <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono break-all">
                                {selectedSession.payment.reference_number}
                              </div>
                            </div>
                          )}
                          {(selectedSession.payment?.payment_date || selectedSession.payment?.razorpay_params?.notes?.payment_received_date) && (
                            <div>
                              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Payment Received</p>
                              <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900">
                                {(() => {
                                  const d = selectedSession.payment?.razorpay_params?.notes?.payment_received_date || selectedSession.payment?.payment_date;
                                  try { return new Date(d).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium' }); }
                                  catch { return d; }
                                })()}
                              </div>
                            </div>
                          )}
                          {selectedSession.payment?.notes && (
                            <div className="md:col-span-2">
                              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Notes</p>
                              <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 whitespace-pre-wrap">
                                {selectedSession.payment.notes}
                              </div>
                            </div>
                          )}
                          {/* Payment proof link */}
                          {(selectedSession.payment?.receipt_url || selectedSession.receipt_url) && (
                            <div className="md:col-span-2">
                              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Payment Proof</p>
                              <a
                                href={selectedSession.payment?.receipt_url || selectedSession.receipt_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-200 bg-white hover:bg-amber-50 hover:border-amber-400 text-sm text-amber-700 font-medium transition-colors"
                              >
                                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                View Payment Proof
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {(() => {
                      const split = getCommissionSplit(selectedSession);
                      if (!split) return null;
                      const liveDocWallet = isEditingCommission
                        ? Math.max(0, split.sessionAmount - (parseFloat(commissionEditValue) || 0))
                        : split.doctorWallet;
                      return (
                        <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider" role="heading" aria-level={3}>Commission Split</div>
                              {selectedSession?.commission_split?.source === 'calculated' && !isEditingCommission && (
                                <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5 font-medium">estimated</span>
                              )}
                              {selectedSession?.commission_split?.source === 'commission_history' && !isEditingCommission && (
                                <span className="text-xs bg-green-50 text-green-700 border border-green-200 rounded px-1.5 py-0.5 font-medium">overridden</span>
                              )}
                            </div>
                            {!isEditingCommission ? (
                              <button
                                onClick={() => {
                                  setCommissionEditValue(String(split.companyCommission ?? ''));
                                  setIsEditingCommission(true);
                                }}
                                className="flex items-center gap-1.5 text-xs text-[#025545] hover:text-[#025545]/80 font-medium border border-[#025545]/30 rounded-lg px-2.5 py-1 hover:bg-[#025545]/5 transition-colors"
                              >
                                <Pencil className="h-3 w-3" /> Edit Commission
                              </button>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setIsEditingCommission(false)}
                                  disabled={commissionSaving}
                                  className="text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-2.5 py-1 hover:bg-slate-100 transition-colors"
                                >Cancel</button>
                                <button
                                  onClick={handleSaveCommission}
                                  disabled={commissionSaving}
                                  className="flex items-center gap-1.5 text-xs text-white bg-[#025545] hover:bg-[#025545]/90 rounded-lg px-2.5 py-1 font-medium transition-colors disabled:opacity-60"
                                >
                                  {commissionSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                  Save
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Session Amount</p>
                              <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-900">
                                ₹{split.sessionAmount.toLocaleString('en-IN')}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Company Commission</p>
                              {isEditingCommission ? (
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₹</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max={split.sessionAmount}
                                    step="1"
                                    value={commissionEditValue}
                                    onChange={(e) => setCommissionEditValue(e.target.value)}
                                    className="w-full bg-white border-2 border-[#025545]/50 rounded-lg pl-7 pr-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:border-[#025545]"
                                    autoFocus
                                  />
                                </div>
                              ) : (
                                <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-900">
                                  {split.companyCommission == null ? '—' : `₹${split.companyCommission.toLocaleString('en-IN')}`}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Doctor Wallet</p>
                              <div className={`bg-white border rounded-lg px-3 py-2 text-sm font-medium ${isEditingCommission ? 'border-amber-300 text-amber-700 bg-amber-50/50' : 'border-slate-200 text-slate-900'}`}>
                                {liveDocWallet == null ? '—' : `₹${liveDocWallet.toLocaleString('en-IN')}`}
                                {isEditingCommission && <span className="text-xs ml-1 opacity-60">(preview)</span>}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Payout Status</p>
                              <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 capitalize">
                                {(() => {
                                  const ps = split.paymentStatus;
                                  if (ps && ps !== 'null') return ps;
                                  const src = selectedSession?.commission_split?.source;
                                  if (src === 'none') return '—'; // no commission settings at all
                                  return 'Pending'; // calculated or recorded but not yet paid
                                })()}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Session Order</p>
                              <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium">
                                {selectedSession?.is_first_session == null ? (
                                  <span className="text-slate-400">—</span>
                                ) : selectedSession.is_first_session ? (
                                  <span className="text-green-700">🟢 First Session</span>
                                ) : (
                                  <span className="text-blue-700">🔵 Follow-up</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : null}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end px-6 py-4 border-t border-slate-200 bg-slate-50/30 flex-shrink-0">
                <button
                  onClick={() => { setIsSessionDetailsOpen(false); setIsEditingCommission(false); setCommissionEditValue(''); }}
                  className="px-4 py-2 text-[#025545] bg-white border border-[#025545]/40 rounded-lg hover:bg-[#025545]/10 transition-colors text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        <AdminEditSessionModal
          isOpen={isEditSessionOpen}
          onClose={() => {
            setIsEditSessionOpen(false);
            setSelectedEditSession(null);
          }}
          session={selectedEditSession}
          apiClient={financeApi}
          onUpdateSuccess={async () => {
            await loadSessions();
            if (selectedEditSession?.id) {
              try {
                const response = await financeApi.getSessionDetails(selectedEditSession.id);
                const sessionData = response?.data?.session ?? null;
                if (sessionData) setSelectedSession(sessionData);
              } catch (err) {
                console.error('Failed to refresh edited finance session:', err);
              }
            }
          }}
        />

        {/* Approve Payment confirm */}
        {verifyTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => !isVerifying && setVerifyTarget(null)}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <h3 className="text-base font-semibold text-gray-900">Approve Payment?</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                This confirms the manual payment for <strong>{getClientDisplayName(verifyTarget)}</strong> has been received and verified. A <strong className="text-green-700">✓ Verified</strong> badge will appear on this session.
              </p>

              {/* Payment proof image preview */}
              {verifyTarget.receipt_url && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Payment Proof</p>
                  <a
                    href={verifyTarget.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg overflow-hidden border border-gray-200 hover:border-green-400 transition-colors"
                    title="Click to open full image"
                  >
                    <img
                      src={verifyTarget.receipt_url}
                      alt="Payment proof"
                      className="w-full max-h-48 object-contain bg-gray-50"
                      onError={e => { e.currentTarget.parentElement.style.display = 'none'; }}
                    />
                  </a>
                  <p className="text-[10px] text-gray-400 mt-1">Click image to open full size</p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button onClick={() => setVerifyTarget(null)} disabled={isVerifying} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40">Cancel</button>
                <button onClick={handleVerifyPayment} disabled={isVerifying}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-40">
                  {isVerifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                  Yes, Approve
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cancel & Refund confirm */}
        {cancelTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => !isCancelling && setCancelTarget(null)}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <h3 className="text-base font-semibold text-gray-900">Cancel &amp; Refund?</h3>
              </div>
              <p className="text-sm text-gray-500 mb-5">
                This will mark the session as <strong>refunded</strong> and remove the Google Calendar event. Refund the client via your payment gateway separately.
              </p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setCancelTarget(null)} disabled={isCancelling} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40">Back</button>
                <button onClick={handleCancelRefundConfirm} disabled={isCancelling}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-40">
                  {isCancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                  Confirm Cancel &amp; Refund
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirm */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => !isDeleting && setDeleteTarget(null)}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-base font-semibold text-gray-900 mb-2">Delete Session?</h3>
              <p className="text-sm text-gray-500 mb-5">
                This will permanently delete the session for <strong>{getClientDisplayName(deleteTarget)}</strong>. This cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setDeleteTarget(null)} disabled={isDeleting} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40">Cancel</button>
                <button onClick={handleDeleteConfirm} disabled={isDeleting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-40">
                  {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
