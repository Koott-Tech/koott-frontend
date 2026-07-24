'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, Eye, Check, Clock, Calendar, User, Loader2, MoreVertical, Filter, Receipt, CheckCircle } from 'lucide-react';
import { financeApi } from '@/lib/backendApi';
import { useAuth } from '@/contexts/AuthContext';
import DateRangePicker from '@/components/ui/date-range-picker';
import { hasDateRangeBounds } from '@/lib/dateRangeBounds';
import { formatIstCalendarYmd, istCalendarMonthBounds } from '@/lib/wixFinanceDates';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/** Pending-payout month in Asia/Kolkata (same calendar as Wix / finance range). */
function pendingPayoutIstMonthYear(from) {
  const ymd = formatIstCalendarYmd(from);
  if (!ymd) return { month: undefined, year: undefined };
  const [yStr, mStr] = ymd.split('-');
  return { year: parseInt(yStr, 10), month: parseInt(mStr, 10) };
}

const inr = (n) =>
  `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(`${d}T00:00:00+05:30`).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    });
  } catch {
    return d;
  }
};

const fmtTime = (t) => {
  if (!t) return '';
  const [hh, mm] = String(t).split(':');
  const h = parseInt(hh, 10);
  if (Number.isNaN(h)) return t;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 === 0 ? 12 : h % 12}:${mm || '00'} ${ampm}`;
};

const STATUS_STYLES = {
  completed: 'bg-green-100 text-green-800',
  booked: 'bg-emerald-100 text-emerald-800',
  rescheduled: 'bg-slate-100 text-slate-700',
  no_show: 'bg-amber-100 text-amber-900',
  noshow: 'bg-amber-100 text-amber-900',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-red-50 text-red-700',
  on_hold: 'bg-slate-100 text-slate-700',
};

const PAYOUT_STYLES = {
  paid: { cls: 'bg-green-100 text-green-800', label: 'Paid' },
  pending: { cls: 'bg-amber-100 text-amber-900', label: 'Pending' },
  not_due: { cls: 'bg-slate-100 text-slate-600', label: 'Not due' },
  void: { cls: 'bg-red-50 text-red-700', label: 'Void' },
};

const SOURCE_STYLES = {
  admin: { cls: 'bg-sky-100 text-sky-800', label: 'Admin' },
  admin_manual: { cls: 'bg-sky-100 text-sky-800', label: 'Admin' },
  razorpay: { cls: 'bg-violet-100 text-violet-800', label: 'Razorpay' },
  wix: { cls: 'bg-violet-100 text-violet-800', label: 'Razorpay' },
  platform: { cls: 'bg-violet-100 text-violet-800', label: 'Razorpay' },
  koott: { cls: 'bg-violet-100 text-violet-800', label: 'Razorpay' },
};

const sourceStyleFor = (source) => {
  const key = String(source || 'razorpay').toLowerCase();
  return SOURCE_STYLES[key] || {
    cls: key.includes('admin') ? SOURCE_STYLES.admin.cls : SOURCE_STYLES.razorpay.cls,
    label: key.includes('admin') ? 'Admin' : 'Razorpay',
  };
};

export default function FinancePayouts() {
  const { user, isAuthenticated, hasRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [doctorPayouts, setDoctorPayouts] = useState([]);
  const [pendingPayoutRows, setPendingPayoutRows] = useState([]);
  const [completedPayoutRows, setCompletedPayoutRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [selectedPayoutProfile, setSelectedPayoutProfile] = useState(null);
  const [selectedPayoutProfileLoading, setSelectedPayoutProfileLoading] = useState(false);
  const [selectedPayoutProfileError, setSelectedPayoutProfileError] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [markingAsPaid, setMarkingAsPaid] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [payoutToMark, setPayoutToMark] = useState(null);
  const [pendingTabCount, setPendingTabCount] = useState(0);
  const [completedTabCount, setCompletedTabCount] = useState(0);
  const [pendingTabAmount, setPendingTabAmount] = useState(0);
  const [completedTabAmount, setCompletedTabAmount] = useState(0);
  
  const [dateRange, setDateRange] = useState(() => istCalendarMonthBounds(new Date()));

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated()) {
        router.push('/');
        return;
      }
      
      if (!hasRole('finance') && !hasRole('admin') && !hasRole('superadmin')) {
        router.push('/');
        return;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, hasRole, router]);

  // Reload data when date range changes
  useEffect(() => {
    if (!authLoading && (hasRole('finance') || hasRole('admin') || hasRole('superadmin')) && dateRange) {
      loadPayoutPageData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, authLoading]);

  useEffect(() => {
    setDoctorPayouts(activeTab === 'pending' ? pendingPayoutRows : completedPayoutRows);
  }, [activeTab, pendingPayoutRows, completedPayoutRows]);

  const getDateParams = () => {
    let dateFrom = null;
    let dateTo = null;
    if (hasDateRangeBounds(dateRange)) {
      dateFrom = formatIstCalendarYmd(dateRange.from) || null;
      dateTo = formatIstCalendarYmd(dateRange.to) || null;
    }
    return { dateFrom, dateTo };
  };

  const loadPayoutPageData = async (displayTab = activeTab) => {
    try {
      setIsLoading(true);
      setError(null);

      const { dateFrom, dateTo } = getDateParams();
      const pendingMy = pendingPayoutIstMonthYear(dateRange?.from);

      const [pendingRes, completedRes] = await Promise.all([
        financeApi.getPendingPayouts({
          month: pendingMy.month,
          year: pendingMy.year,
        }),
        financeApi.getDoctorPayouts({ dateFrom, dateTo, status: 'completed' }),
      ]);

      const pendingPayouts = pendingRes?.data?.payouts || [];
      const completedPayouts = completedRes?.data?.payouts || [];

      setPendingPayoutRows(pendingPayouts);
      setCompletedPayoutRows(completedPayouts);
      setDoctorPayouts(displayTab === 'pending' ? pendingPayouts : completedPayouts);

      setPendingTabCount(pendingPayouts.length);
      setCompletedTabCount(completedPayouts.length);
      setPendingTabAmount(pendingPayouts.reduce((sum, p) => sum + getPayoutDisplayAmount(p, 'pending'), 0));
      setCompletedTabAmount(completedPayouts.reduce((sum, p) => sum + getPayoutDisplayAmount(p, 'completed'), 0));
    } catch (err) {
      console.error('Failed to load payout page data:', err);
      setError('Failed to load payout data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = async (payout) => {
    setSelectedPayout(payout);
    setSelectedPayoutProfile(null);
    setSelectedPayoutProfileError(null);

    if (!payout?.psychologist_id) return;

    try {
      setSelectedPayoutProfileLoading(true);
      const params = { dateBasis: 'scheduled' };
      if (hasDateRangeBounds(dateRange)) {
        params.dateFrom = formatIstCalendarYmd(dateRange.from);
        params.dateTo = formatIstCalendarYmd(dateRange.to);
      }
      const response = await financeApi.getDoctorFinanceProfile(payout.psychologist_id, params);
      if (!response?.success) {
        throw new Error(response?.message || 'Failed to load full session breakdown');
      }
      setSelectedPayoutProfile(response.data || null);
    } catch (err) {
      console.error('Failed to load payout doctor profile:', err);
      setSelectedPayoutProfileError(err?.message || 'Failed to load full session breakdown');
    } finally {
      setSelectedPayoutProfileLoading(false);
    }
  };

  const handleMarkAsPaidClick = (payout) => {
    setPayoutToMark(payout);
    setShowConfirmModal(true);
  };

  const handleConfirmMarkAsPaid = async () => {
    if (!payoutToMark) return;

    try {
      setShowConfirmModal(false);
      setMarkingAsPaid(payoutToMark.psychologist_id);
      
      // Format dates for API
      let dateFrom = null;
      let dateTo = null;
      if (hasDateRangeBounds(dateRange)) {
        dateFrom = formatIstCalendarYmd(dateRange.from) || null;
        dateTo = formatIstCalendarYmd(dateRange.to) || null;
      }

      const response = await financeApi.markPayoutAsPaid({
        psychologist_id: payoutToMark.psychologist_id,
        sessionIds: (payoutToMark.session_details || [])
          .map((session) => session.session_id)
          .filter(Boolean),
        dateFrom,
        dateTo
      });

      if (response.success) {
        // Switch first, then load completed payouts explicitly to avoid stale-tab fetches.
        setActiveTab('completed');
        await loadPayoutPageData('completed');
      } else {
        alert(response.message || 'Failed to mark payout as paid');
      }
    } catch (err) {
      console.error('Failed to mark payout as paid:', err);
      alert('Failed to mark payout as paid. Please try again.');
    } finally {
      setMarkingAsPaid(null);
      setPayoutToMark(null);
    }
  };

  const handleCancelMarkAsPaid = () => {
    setShowConfirmModal(false);
    setPayoutToMark(null);
  };

  const getPayoutDisplayAmount = (payout, tab = activeTab) => {
    if (!payout) return 0;
    if (tab === 'pending') {
      return parseFloat(
        payout.pending_payout_amount ??
        payout.total_doctor_wallet ??
        payout.net_payout ??
        0
      ) || 0;
    }
    return parseFloat(
      payout.total_doctor_wallet ??
      payout.net_payout ??
      payout.pending_payout_amount ??
      0
    ) || 0;
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderBottomColor: '#025545' }}></div>
      </div>
    );
  }

  const pendingTotal = pendingTabAmount;
  const completedTotal = completedTabAmount;
  const pendingSessions = pendingPayoutRows.reduce((sum, payout) => sum + (Number(payout.total_sessions) || 0), 0);
  const completedSessions = completedPayoutRows.reduce((sum, payout) => sum + (Number(payout.total_sessions) || 0), 0);
  const totalSessions = activeTab === 'pending' 
    ? pendingSessions
    : completedSessions;
  const selectedProfileSessions = selectedPayoutProfile?.sessions || null;
  const selectedDetailRows = selectedProfileSessions || selectedPayout?.session_details || [];
  const selectedDetailCount = selectedProfileSessions?.length ?? selectedPayout?.session_details?.length ?? 0;
  const isUsingProfileRows = Array.isArray(selectedProfileSessions);
  const selectedDetailTotals = selectedDetailRows.reduce((acc, session) => {
    acc.amount += Number(session.session_amount || 0);
    acc.doctor += Number((isUsingProfileRows ? session.doctor_amount : session.doctor_wallet) || 0);
    acc.company += Number((isUsingProfileRows ? session.company_amount : session.company_commission) || 0);
    return acc;
  }, { amount: 0, doctor: 0, company: 0 });

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-3 lg:p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-2 sm:mb-3">
          <div role="heading" aria-level="2" className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900 mb-1">Payouts & Payments</div>
          <p className="text-xs sm:text-sm text-gray-600">Manage doctor payouts and commission payments</p>
        </div>

        {/* Date Range Filter */}
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

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium ${
                activeTab === 'pending'
                  ? 'text-[#025545] border-b-2 border-[#025545]'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pending Payouts ({pendingTabCount})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium ${
                activeTab === 'completed'
                  ? 'text-[#025545] border-b-2 border-[#025545]'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Completed Payouts ({completedTabCount})
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
          <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 ${activeTab === 'pending' ? 'border-orange-200 bg-orange-50' : ''}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pending Payout</p>
                <p className="text-2xl font-semibold text-orange-700">₹{pendingTotal.toLocaleString('en-IN')}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </div>
          <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 ${activeTab === 'completed' ? 'border-green-200 bg-green-50' : ''}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Completed Payout</p>
                <p className="text-2xl font-semibold text-green-700">₹{completedTotal.toLocaleString('en-IN')}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pending Sessions</p>
                <p className="text-2xl font-semibold text-yellow-700">{pendingSessions}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Completed Sessions</p>
                <p className="text-2xl font-semibold text-blue-700">{completedSessions}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {doctorPayouts.length > 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Doctor Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {activeTab === 'pending' ? 'Completed Sessions' : 'Paid Sessions'}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company Commission</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {activeTab === 'pending' ? 'Pending Payout' : 'Doctor Wallet'}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {doctorPayouts.map((payout) => (
                        <tr key={payout.psychologist_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {payout.psychologist?.first_name} {payout.psychologist?.last_name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {payout.total_sessions || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                            ₹{(payout.total_company_commission || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                            ₹{getPayoutDisplayAmount(payout, activeTab).toLocaleString('en-IN')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              activeTab === 'pending' 
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {activeTab === 'pending' ? 'Pending Payout' : 'Paid'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-100">
                                  <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => handleViewDetails(payout)} className="cursor-pointer">
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                {activeTab === 'pending' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => handleMarkAsPaidClick(payout)}
                                      disabled={markingAsPaid === payout.psychologist_id}
                                      className="cursor-pointer text-green-600"
                                    >
                                      {markingAsPaid === payout.psychologist_id ? (
                                        <>
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          Marking...
                                        </>
                                      ) : (
                                        <>
                                          <Check className="h-4 w-4 mr-2" />
                                          Mark as Paid
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <p className="text-gray-500">No {activeTab} payouts found for the selected date range</p>
              </div>
            )}
          </div>
        )}

        {/* Confirm Mark as Paid Modal */}
        {showConfirmModal && payoutToMark && (
          <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full shadow-xl">
              <div className="p-6 border-b border-gray-200">
                <div role="heading" aria-level="2" className="text-lg font-semibold text-gray-900">Confirm Mark as Paid</div>
              </div>
              <div className="p-6">
                <p className="text-gray-700 mb-4">
                  Are you sure you want to mark the payout as paid for{' '}
                  <span className="font-semibold">
                    {payoutToMark.psychologist?.first_name} {payoutToMark.psychologist?.last_name}
                  </span>?
                </p>
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">{activeTab === 'pending' ? 'Completed Sessions:' : 'Paid Sessions:'}</span>
                      <span className="ml-2 font-semibold text-gray-900">{payoutToMark.total_sessions || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">{activeTab === 'pending' ? 'Pending Payout:' : 'Doctor Wallet:'}</span>
                      <span className="ml-2 font-semibold text-green-600">
                        ₹{getPayoutDisplayAmount(payoutToMark, activeTab).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={handleCancelMarkAsPaid}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmMarkAsPaid}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Mark as Paid
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payout Details Modal */}
        {selectedPayout && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-[96vw] w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div role="heading" aria-level="2" style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>Payout Details</div>
                  <button
                    onClick={() => {
                      setSelectedPayout(null);
                      setSelectedPayoutProfile(null);
                      setSelectedPayoutProfileError(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-6">
                {/* Doctor Info */}
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Doctor</div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#025545] flex items-center justify-center text-white font-semibold">
                      {selectedPayout.psychologist?.first_name?.[0] || <User className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {selectedPayout.psychologist?.first_name} {selectedPayout.psychologist?.last_name}
                      </div>
                      <div className="text-sm text-gray-600">{selectedPayout.psychologist?.email}</div>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      {activeTab === 'pending' ? 'Completed Sessions' : 'Paid Sessions'}
                    </label>
                    <p className="mt-1 text-lg font-semibold text-gray-900">{selectedPayout.total_sessions || 0}</p>
                    {isUsingProfileRows && (
                      <p className="mt-0.5 text-xs text-gray-500">Full profile rows: {selectedDetailCount}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Company Commission</label>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      ₹{(selectedPayout.total_company_commission || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">{activeTab === 'pending' ? 'Pending Payout' : 'Doctor Wallet'}</label>
                    <p className="mt-1 text-lg font-semibold text-green-600">
                      ₹{getPayoutDisplayAmount(selectedPayout, activeTab).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <p className="mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        activeTab === 'pending' 
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {activeTab === 'pending' ? 'Pending Payout' : 'Paid'}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Session Details */}
                {selectedPayoutProfileLoading ? (
                  <div className="py-10 text-center text-gray-500">
                    <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                    Loading full session breakdown...
                  </div>
                ) : selectedPayoutProfileError ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    {selectedPayoutProfileError}. Showing payout-only rows.
                  </div>
                ) : null}

                {selectedDetailRows.length > 0 && (
                  <div>
                    <div className="mb-3">
                      <label className="text-sm font-medium text-gray-700">
                        Session Breakdown ({selectedDetailCount})
                      </label>
                      {isUsingProfileRows && (
                        <p className="mt-1 text-xs text-gray-500">
                          Showing the same full doctor-profile breakdown for this date range.
                        </p>
                      )}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Session Amount</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Doctor</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Company</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Payout</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {selectedDetailRows.map((session, idx) => {
                            const isProfileRow = isUsingProfileRows;
                            const status = session.status || (activeTab === 'pending' ? 'completed' : 'paid');
                            const statusKey = String(status || '').toLowerCase();
                            const payoutStatus = isProfileRow
                              ? session.payout_status
                              : (activeTab === 'pending' ? 'pending' : 'paid');
                            const payoutStyle = PAYOUT_STYLES[payoutStatus] || PAYOUT_STYLES.not_due;
                            const companyAmount = (isProfileRow ? session.company_amount : session.company_commission) || 0;
                            const doctorAmount = (isProfileRow ? session.doctor_amount : session.doctor_wallet) || 0;
                            const source = sourceStyleFor(session.source);
                            return (
                              <tr key={session.session_id || session.id || idx} className="hover:bg-slate-50/60">
                                <td className="px-4 py-2.5 whitespace-nowrap">
                                  <div className="text-slate-900">{fmtDate(session.session_date)}</div>
                                  <div className="text-xs text-slate-400">{fmtTime(session.session_time)}</div>
                                </td>
                                <td className="px-4 py-2.5 text-slate-700 max-w-[180px] truncate" title={session.client_name}>
                                  {session.client_name || '—'}
                                </td>
                                <td className="px-4 py-2.5 text-slate-600 capitalize">
                                  {session.package_label || session.session_type_label || session.session_type?.replace(/_/g, ' ') || '-'}
                                </td>
                                <td className="px-4 py-2.5">
                                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${source.cls}`}>
                                    {source.label}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5">
                                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[statusKey] || 'bg-slate-100 text-slate-700'}`}>
                                    {String(status || '-').replace(/_/g, ' ')}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-right text-slate-700">{inr(session.session_amount)}</td>
                                <td className="px-4 py-2.5 text-right font-semibold text-emerald-700">{inr(doctorAmount)}</td>
                                <td className={`px-4 py-2.5 text-right ${Number(companyAmount) < 0 ? 'text-slate-400' : 'text-indigo-700'}`}>
                                  {inr(companyAmount)}
                                </td>
                                <td className="px-4 py-2.5">
                                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${payoutStyle.cls}`}>
                                    {payoutStyle.label}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        {selectedDetailRows.length > 0 && (
                          <tfoot className="bg-slate-50 font-semibold">
                            <tr>
                              <td colSpan={5} className="px-4 py-2.5 text-right text-slate-600">Totals shown</td>
                              <td className="px-4 py-2.5 text-right text-slate-900">{inr(selectedDetailTotals.amount)}</td>
                              <td className="px-4 py-2.5 text-right text-emerald-700">{inr(selectedDetailTotals.doctor)}</td>
                              <td className="px-4 py-2.5 text-right text-indigo-700">{inr(selectedDetailTotals.company)}</td>
                              <td />
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                    {isUsingProfileRows && (
                      <p className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-400">
                        A package is paid on its first session while the therapist&apos;s commission is split across all
                        its sessions, so follow-ups can show ₹0 received while still showing the per-session therapist share.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
