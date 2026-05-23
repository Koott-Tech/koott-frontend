'use client';

import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Search,
  Filter,
  Eye,
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
  IndianRupee
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
import { hasDateRangeBounds } from '@/lib/dateRangeBounds';
import { formatIstCalendarYmd, istCalendarMonthBounds } from '@/lib/wixFinanceDates';
import { sessionBookedAtIso } from '@/lib/sessionBookedAt';

export default function FinanceSessionsPage() {
  const { showError } = useNotification();
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSessionDetailsOpen, setIsSessionDetailsOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetailsLoading, setSessionDetailsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSessions, setTotalSessions] = useState(0);
  const [dateRange, setDateRange] = useState(() => istCalendarMonthBounds(new Date()));

  // Today's stats — fetched once on mount, independent of page filters
  const [todayStats, setTodayStats] = useState(null);
  const [todayStatsLoading, setTodayStatsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const today = formatIstCalendarYmd(new Date());
        const res = await financeApi.getAllSessions({
          dateFrom: today,
          dateTo: today,
          dateBasis: 'booked',
          includeUnpaid: 'true',
          limit: 500,
        });
        if (res?.success) {
          const rows = (res.data?.sessions || []).filter((r) => {
            const src = String(r.source || '').toLowerCase();
            const wp = r.wix_payload;
            const isUndefinedWix = src === 'wix' && !r.payment_id && (!wp || typeof wp !== 'object' || !wp.sessionId);
            const isPackageChild = src === 'wix' && Number(r.package_session_number || 1) > 1;
            return !(isUndefinedWix || isPackageChild);
          });
          const keys = new Set();
          for (const r of rows) {
            const pid = r.payment_id;
            if (pid) { keys.add(`payment:${String(pid)}`); continue; }
            const src = String(r.source || '').toLowerCase();
            const wp = r.wix_payload;
            if (src === 'wix') {
              const sid = wp.sessionId;
              if (sid) keys.add(`wixBooking:${String(sid)}`);
              else if (r.id) keys.add(`row:${r.id}`);
              continue;
            }
            if (wp?.sessionId) { keys.add(`wixBooking:${String(wp.sessionId)}`); continue; }
            if (r.id) keys.add(`row:${r.id}`);
          }
          const totalOrders = keys.size;
          // Sum price only for deduped rows.
          let totalAmount = 0;
          const seenKeys = new Set();
          for (const r of rows) {
            const pid = r.payment_id;
            let key = '';
            if (pid) {
              key = `payment:${String(pid)}`;
            } else {
              const src = String(r.source || '').toLowerCase();
              const wp = r.wix_payload;
              if (src === 'wix') {
                const sid = wp.sessionId;
                if (sid) key = `wixBooking:${String(sid)}`;
                else if (r.id) key = `row:${r.id}`;
              } else {
                if (wp?.sessionId) key = `wixBooking:${String(wp.sessionId)}`;
                else if (r.id) key = `row:${r.id}`;
              }
            }
            if (key && !seenKeys.has(key)) {
              seenKeys.add(key);
              totalAmount += parseFloat(r.price) || 0;
            }
          }
          setTodayStats({ totalOrders, totalAmount });
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
  }, [currentPage, filterStatus, dateRange]);

  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [filterStatus, searchTerm, dateRange]);

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        dateBasis: 'booked',
        includeUnpaid: 'true',
        sort: 'scheduled_date',
        order: 'asc'
      };

      if (filterStatus && filterStatus !== 'all') {
        params.status = filterStatus;
      }

      if (hasDateRangeBounds(dateRange)) {
        params.dateFrom = formatIstCalendarYmd(dateRange.from);
        params.dateTo = formatIstCalendarYmd(dateRange.to);
      }

      const response = await financeApi.getAllSessions(params);
      
      if (response && response.success) {
        const sessionsData = (response.data?.sessions || []).filter((s) => {
          const src = String(s.source || '').toLowerCase();
          const wp = s.wix_payload;
          const isUndefinedWix = src === 'wix' && !s.payment_id && (!wp || typeof wp !== 'object' || !wp.sessionId);
          const isPackageChild = src === 'wix' && Number(s.package_session_number || 1) > 1;
          return !(isUndefinedWix || isPackageChild);
        });
        const paginationData = response.data?.pagination || {};
        const hiddenCount = (response.data?.sessions || []).length - sessionsData.length;
        setSessions(sessionsData);
        setTotalSessions(Math.max(0, (paginationData.total || 0) - hiddenCount));
        setTotalPages(Math.max(1, Math.ceil(Math.max(0, (paginationData.total || 0) - hiddenCount) / itemsPerPage)));
      } else {
        setSessions([]);
        setTotalSessions(0);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Failed to load finance sessions:', error);
      showError('Failed to load sessions', 'Load Error');
      setSessions([]);
      setTotalSessions(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewSession = async (session) => {
    if (!session?.id) return;
    setSelectedSession(null);
    setIsSessionDetailsOpen(true);
    setSessionDetailsLoading(true);
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

  const normalizeStatus = (s) => (s === 'noshow' ? 'no_show' : (s || ''));

  const filteredSessions = sessions.filter(s => {
    const statusMatch = filterStatus === 'all' || normalizeStatus(s.status) === filterStatus;
    if (!statusMatch) return false;
    if (!searchTerm) return true;
    const clientName = getClientDisplayName(s).toLowerCase();
    const clientEmail = (s.client?.user?.email || s.client?.email || s.wix_payload?.client?.email || '').toLowerCase();
    return clientName.includes(searchTerm.toLowerCase()) || clientEmail.includes(searchTerm.toLowerCase());
  });

  const displaySessions = [...filteredSessions].sort((a, b) => {
    const aDate = getScheduledDateValue(a) || '';
    const aTime = getScheduledTimeValue(a) || '';
    const bDate = getScheduledDateValue(b) || '';
    const bTime = getScheduledTimeValue(b) || '';
    const aDt = new Date(`${aDate}T${aTime}`);
    const bDt = new Date(`${bDate}T${bTime}`);
    return aDt - bDt;
  });

  const statusTabs = [
    { value: 'all', label: 'All' },
    { value: 'booked', label: 'Booked' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'rescheduled', label: 'Rescheduled' },
    { value: 'no_show', label: 'No Show' }
  ];

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
                  placeholder="Search by client name or email..."
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

        {/* Sessions Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Psychologist</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created at</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center">
                      <div className="inline-flex flex-col items-center gap-3 text-gray-500">
                        <Loader2 className="h-8 w-8 animate-spin text-[#025545]" />
                        <span className="text-sm font-medium">Processing...</span>
                      </div>
                    </td>
                  </tr>
                ) : displaySessions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                      <h6 className="mt-2">No sessions found</h6>
                      <p className="mt-1 text-sm text-gray-500">
                        {searchTerm || filterStatus !== 'all'
                          ? 'Try adjusting your search or filter criteria.'
                          : 'No therapy sessions have been booked yet.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  displaySessions.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <div className="text-sm font-medium text-gray-900">
                              {booking.wix_order_number ? (
                                <span className="font-semibold">#{booking.wix_order_number}</span>
                              ) : (
                                <span className="text-xs text-gray-400">ID: {booking.id?.slice(0, 6)}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {(() => {
                              const wp = booking.wix_payload || {};
                              const wixType = wp.bookingType || booking.session_type;

                              if (booking.session_type === 'free_assessment') {
                                return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-800">Free Assessment</span>;
                              }
                              if (booking.session_type === 'assessment' || wixType === 'assessment') {
                                return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-800">Assessment</span>;
                              }
                              if (wixType === 'couple') {
                                return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-pink-100 text-pink-800">Couple</span>;
                              }
                              if (wixType === 'discovery') {
                                return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-100 text-sky-800">Discovery</span>;
                              }
                              // Wix pricing plan package — planSessionNumber is exact
                              if (wp.planSessionNumber && wp.creditsAvailable) {
                                return (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-100 text-violet-800">
                                    Package ({wp.planSessionNumber}/{wp.creditsAvailable})
                                  </span>
                                );
                              }
                              if (booking.package_id || booking.package || booking.session_type === 'package') {
                                const pkg = booking.package || {};
                                const totalSessions = booking.session_count ?? pkg.total_sessions ?? pkg.session_count ?? 0;
                                const sessionNumber = booking.package_session_number ?? pkg.session_number;
                                const hasTotal = totalSessions > 0;
                                const hasSessionNum = sessionNumber !== undefined && sessionNumber !== null;
                                return (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-100 text-violet-800">
                                    Package{hasSessionNum && hasTotal ? ` (${sessionNumber}/${totalSessions})` : ''}
                                  </span>
                                );
                              }
                              return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-800">Individual</span>;
                            })()}
                            {(() => {
                              const vendors = booking.wix_payload?.paymentDetails?.wixPayMultipleDetails;
                              if (!Array.isArray(vendors) || !vendors.length) return null;
                              const v = vendors[0].paymentVendorName;
                              if (v === 'inPerson') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-100 text-orange-800">Manual</span>;
                              return null;
                            })()}
                          </div>
                          
                          <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(getScheduledDateValue(booking))} at {formatTime(getScheduledTimeValue(booking))}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <div className="text-sm text-gray-900">
                            {getClientDisplayName(booking)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <UserCheck className="h-4 w-4 text-gray-400 mr-2" />
                          <div className="text-sm text-gray-900">
                            {getPsychologistDisplayName(booking)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(booking.status, booking)}`}>
                          {getStatusText(booking.status, booking)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        ₹{getPriceDisplayAmount(booking).toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatBookedAt(sessionBookedAtIso(booking))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
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
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
            Showing {displaySessions.length} of {totalSessions} session{totalSessions !== 1 ? 's' : ''}
            {filterStatus !== 'all' && (
              <>
                {' '}with status{' '}
                <span className="font-medium text-gray-900">
                  {filterStatus === 'no_show' ? 'No Show' : filterStatus.replace('_', ' ')}
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
                  </div>
                ) : null}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end px-6 py-4 border-t border-slate-200 bg-slate-50/30 flex-shrink-0">
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
      </div>
    </div>
  );
}
