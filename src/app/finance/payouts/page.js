'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, Eye, Check, Clock, Calendar, User, Loader2, MoreVertical, Filter, Receipt, CheckCircle, Download, Pencil, Save, X, Search, Trash2 } from 'lucide-react';
import { financeApi } from '@/lib/backendApi';
import { useAuth } from '@/contexts/AuthContext';
import DateRangePicker from '@/components/ui/date-range-picker';
import { hasDateRangeBounds } from '@/lib/dateRangeBounds';
import { formatIstCalendarYmd, istCalendarMonthBounds } from '@/lib/wixFinanceDates';
import { exportFinanceRowsToExcel } from '@/lib/financeExcelExport';
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

const fmtBookedDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    });
  } catch {
    return d;
  }
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

const EDITABLE_SESSION_STATUSES = [
  { value: 'completed', label: 'Completed' },
  { value: 'booked', label: 'Booked' },
  { value: 'rescheduled', label: 'Rescheduled' },
  { value: 'reschedule_requested', label: 'Reschedule Requested' },
  { value: 'no_show', label: 'No Show' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
];

const sourceStyleFor = (source) => {
  const key = String(source || 'razorpay').toLowerCase();
  return SOURCE_STYLES[key] || {
    cls: key.includes('admin') ? SOURCE_STYLES.admin.cls : SOURCE_STYLES.razorpay.cls,
    label: key.includes('admin') ? 'Admin' : 'Razorpay',
  };
};

function FinanceToast({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="fixed right-4 top-4 z-[70] flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-medium text-emerald-800 shadow-lg shadow-emerald-900/10">
      <CheckCircle className="h-4 w-4 text-emerald-600" />
      <span>{message}</span>
      <button onClick={onClose} className="ml-1 rounded p-0.5 text-emerald-600 hover:bg-emerald-50" aria-label="Close notification">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

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
  // True while the confirm dialog is fetching this doctor's real totals (Pending tab loads a
  // listOnly payload whose amounts are null).
  const [markDetailsLoading, setMarkDetailsLoading] = useState(false);
  const [pendingTabCount, setPendingTabCount] = useState(0);
  const [completedTabCount, setCompletedTabCount] = useState(0);
  const [pendingTabAmount, setPendingTabAmount] = useState(0);
  const [completedTabAmount, setCompletedTabAmount] = useState(0);
  const [editingDetailRowId, setEditingDetailRowId] = useState(null);
  const [detailEditValues, setDetailEditValues] = useState({ session_amount: '', doctor_amount: '', company_amount: '', status: '' });
  const [savingDetailRowId, setSavingDetailRowId] = useState(null);
  const [deletingDetailRowId, setDeletingDetailRowId] = useState(null);
  const [loadedTabs, setLoadedTabs] = useState({ pending: false, completed: false });
  const [doctorSearch, setDoctorSearch] = useState('');
  const [detailClientSearch, setDetailClientSearch] = useState('');
  const [financeToast, setFinanceToast] = useState('');
  
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
      setPendingPayoutRows([]);
      setCompletedPayoutRows([]);
      setDoctorPayouts([]);
      setPendingTabCount(0);
      setCompletedTabCount(0);
      setPendingTabAmount(0);
      setCompletedTabAmount(0);
      setLoadedTabs({ pending: false, completed: false });
      loadPayoutPageData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, authLoading]);

  useEffect(() => {
    setDoctorPayouts(activeTab === 'pending' ? pendingPayoutRows : completedPayoutRows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, pendingPayoutRows, completedPayoutRows]);

  useEffect(() => {
    if (!financeToast) return undefined;
    const timeout = setTimeout(() => setFinanceToast(''), 1800);
    return () => clearTimeout(timeout);
  }, [financeToast]);

  const getDateParams = () => {
    let dateFrom = null;
    let dateTo = null;
    if (hasDateRangeBounds(dateRange)) {
      dateFrom = formatIstCalendarYmd(dateRange.from) || null;
      dateTo = formatIstCalendarYmd(dateRange.to) || null;
    }
    return { dateFrom, dateTo };
  };

  /**
   * Fetch one tab's rows and update its state. `isActive` also swaps the visible table.
   * Returns the rows so callers can await a specific tab.
   */
  const fetchTabRows = async (tab, { isActive = false } = {}) => {
    const { dateFrom, dateTo } = getDateParams();
    const pendingMy = pendingPayoutIstMonthYear(dateRange?.from);

    if (tab === 'completed') {
      const completedRes = await financeApi.getDoctorPayouts({ dateFrom, dateTo, status: 'completed' });
      const completedPayouts = completedRes?.data?.payouts || [];
      setCompletedPayoutRows(completedPayouts);
      if (isActive) setDoctorPayouts(completedPayouts);
      setCompletedTabCount(completedPayouts.length);
      setCompletedTabAmount(completedPayouts.reduce((sum, p) => sum + getPayoutDisplayAmount(p, 'completed'), 0));
      setLoadedTabs(prev => ({ ...prev, completed: true }));
      return completedPayouts;
    }

    const pendingRes = await financeApi.getPendingPayouts({
      month: pendingMy.month,
      year: pendingMy.year,
      includeDetails: 'false',
      listOnly: 'true',
    });
    const pendingPayouts = pendingRes?.data?.payouts || [];
    setPendingPayoutRows(pendingPayouts);
    if (isActive) setDoctorPayouts(pendingPayouts);
    setPendingTabCount(pendingPayouts.length);
    setPendingTabAmount(pendingPayouts.reduce((sum, p) => sum + getPayoutDisplayAmount(p, 'pending'), 0));
    setLoadedTabs(prev => ({ ...prev, pending: true }));
    return pendingPayouts;
  };

  const loadPayoutPageData = async (displayTab = activeTab, { silent = false } = {}) => {
    try {
      if (!silent) setIsLoading(true);
      setError(null);

      await fetchTabRows(displayTab, { isActive: true });

      // Prefetch the OTHER tab in the background so its "(n)" badge is correct straight away.
      // Previously only the active tab was fetched, so the inactive tab's count sat at 0 until
      // you clicked it (the date-change effect resets both counts to 0 first). Fire-and-forget:
      // it must never block the visible tab or surface an error over it.
      const otherTab = displayTab === 'completed' ? 'pending' : 'completed';
      fetchTabRows(otherTab).catch((err) => {
        console.error(`Background load of "${otherTab}" payouts failed:`, err);
      });
    } catch (err) {
      console.error('Failed to load payout page data:', err);
      setError('Failed to load payout data. Please try again.');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setDoctorPayouts(tab === 'pending' ? pendingPayoutRows : completedPayoutRows);
    if (!loadedTabs[tab]) {
      loadPayoutPageData(tab);
    }
  };

  const handleViewDetails = async (payout) => {
    setSelectedPayout(payout);
    setSelectedPayoutProfile(null);
    setSelectedPayoutProfileError(null);
    setDetailClientSearch('');

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

  const reloadSelectedPayoutProfile = async () => {
    if (!selectedPayout?.psychologist_id) return;
    const params = { dateBasis: 'scheduled' };
    if (hasDateRangeBounds(dateRange)) {
      params.dateFrom = formatIstCalendarYmd(dateRange.from);
      params.dateTo = formatIstCalendarYmd(dateRange.to);
    }
    const response = await financeApi.getDoctorFinanceProfile(selectedPayout.psychologist_id, params);
    if (!response?.success) {
      throw new Error(response?.message || 'Failed to reload payout details');
    }
    setSelectedPayoutProfile(response.data || null);
  };

  const startEditDetailRow = (row) => {
    const rowId = row.session_id || row.id;
    const doctorAmount = row.doctor_amount ?? row.doctor_wallet ?? 0;
    const companyAmount = row.company_amount ?? row.company_commission ?? 0;
    setEditingDetailRowId(rowId);
    setDetailEditValues({
      session_amount: String(Number(row.session_amount || 0)),
      doctor_amount: String(Number(doctorAmount || 0)),
      company_amount: String(Number(companyAmount || 0)),
      status: String(row.status || 'booked').toLowerCase(),
    });
  };

  const cancelEditDetailRow = () => {
    setEditingDetailRowId(null);
    setDetailEditValues({ session_amount: '', doctor_amount: '', company_amount: '', status: '' });
  };

  const updateDetailEditValue = (field, value) => {
    const next = { ...detailEditValues, [field]: value };
    const sessionAmount = Number(field === 'session_amount' ? value : next.session_amount) || 0;
    if (field === 'doctor_amount') {
      next.company_amount = String(sessionAmount - (Number(value) || 0));
    } else if (field === 'company_amount' || field === 'session_amount') {
      next.doctor_amount = String(sessionAmount - (Number(next.company_amount) || 0));
    }
    setDetailEditValues(next);
  };

  const saveDetailRow = async (row) => {
    const rowId = row.session_id || row.id;
    const sessionAmount = Number(detailEditValues.session_amount);
    const companyAmount = Number(detailEditValues.company_amount);

    if (!rowId || !Number.isFinite(sessionAmount) || sessionAmount < 0 || !Number.isFinite(companyAmount)) {
      alert('Enter valid amount values before saving');
      return;
    }

    try {
      setSavingDetailRowId(rowId);
      const response = await financeApi.updateSessionCommission(rowId, companyAmount, sessionAmount);
      if (detailEditValues.status && detailEditValues.status !== String(row.status || '').toLowerCase()) {
        await financeApi.updateSession(rowId, { status: detailEditValues.status });
      }
      const updated = response?.data || {};
      const nextSessionAmount = Number(updated.session_amount ?? sessionAmount) || 0;
      const nextCompanyAmount = Number(updated.commission_amount ?? companyAmount) || 0;
      const nextDoctorAmount = Number(updated.doctor_wallet ?? (nextSessionAmount - nextCompanyAmount)) || 0;

      const patchSessionRows = (rows) => (rows || []).map((session) => {
        const currentRowId = session.session_id || session.id;
        if (currentRowId !== rowId) return session;
        return {
          ...session,
          session_amount: nextSessionAmount,
          doctor_amount: nextDoctorAmount,
          doctor_wallet: nextDoctorAmount,
          company_amount: nextCompanyAmount,
          company_commission: nextCompanyAmount,
          status: detailEditValues.status || session.status,
        };
      });

      const patchPayoutRows = (rows) => (rows || []).map((payout) => {
        if (payout.psychologist_id !== selectedPayout?.psychologist_id) return payout;
        let doctorDelta = 0;
        let companyDelta = 0;
        let touched = false;
        const sessionDetails = (payout.session_details || []).map((session) => {
          const currentRowId = session.session_id || session.id;
          if (currentRowId !== rowId) return session;
          const oldDoctor = Number(session.doctor_wallet ?? session.doctor_amount ?? 0) || 0;
          const oldCompany = Number(session.company_commission ?? session.company_amount ?? 0) || 0;
          doctorDelta = nextDoctorAmount - oldDoctor;
          companyDelta = nextCompanyAmount - oldCompany;
          touched = true;
          return {
            ...session,
            session_amount: nextSessionAmount,
            doctor_wallet: nextDoctorAmount,
            doctor_amount: nextDoctorAmount,
            company_commission: nextCompanyAmount,
            company_amount: nextCompanyAmount,
            status: detailEditValues.status || session.status,
          };
        });
        if (!touched) return payout;
        const totalDoctorWallet = Math.round(((Number(payout.total_doctor_wallet ?? payout.pending_payout_amount ?? 0) || 0) + doctorDelta) * 100) / 100;
        const totalCompanyCommission = Math.round(((Number(payout.total_company_commission ?? 0) || 0) + companyDelta) * 100) / 100;
        return {
          ...payout,
          session_details: sessionDetails,
          total_doctor_wallet: totalDoctorWallet,
          pending_payout_amount: activeTab === 'pending' ? totalDoctorWallet : payout.pending_payout_amount,
          net_payout: totalDoctorWallet,
          total_company_commission: totalCompanyCommission,
          total_commission: totalCompanyCommission,
          profile_company_earnings: totalCompanyCommission,
          profile_doctor_earnings: totalDoctorWallet,
          profile_gross_revenue: totalDoctorWallet + totalCompanyCommission,
        };
      });

      setSelectedPayoutProfile(prev => {
        if (!prev) return prev;
        const oldRow = (prev.sessions || []).find((session) => (session.session_id || session.id) === rowId);
        const oldDoctor = Number(oldRow?.doctor_amount ?? oldRow?.doctor_wallet ?? 0) || 0;
        const oldCompany = Number(oldRow?.company_amount ?? oldRow?.company_commission ?? 0) || 0;
        const doctorDelta = nextDoctorAmount - oldDoctor;
        const companyDelta = nextCompanyAmount - oldCompany;
        return {
          ...prev,
          sessions: patchSessionRows(prev.sessions),
          summary: prev.summary ? {
            ...prev.summary,
            doctor_earnings: Math.round(((Number(prev.summary.doctor_earnings || 0) || 0) + doctorDelta) * 100) / 100,
            company_earnings: Math.round(((Number(prev.summary.company_earnings || 0) || 0) + companyDelta) * 100) / 100,
            payout_pending: Math.round(((Number(prev.summary.payout_pending || 0) || 0) + doctorDelta) * 100) / 100,
          } : prev.summary,
        };
      });
      setSelectedPayout(prev => {
        if (!prev) return prev;
        return patchPayoutRows([prev])[0];
      });
      setPendingPayoutRows(prev => {
        const next = patchPayoutRows(prev);
        setPendingTabAmount(next.reduce((sum, p) => sum + getPayoutDisplayAmount(p, 'pending'), 0));
        return next;
      });
      setCompletedPayoutRows(prev => {
        const next = patchPayoutRows(prev);
        setCompletedTabAmount(next.reduce((sum, p) => sum + getPayoutDisplayAmount(p, 'completed'), 0));
        return next;
      });
      setDoctorPayouts(prev => patchPayoutRows(prev));
      cancelEditDetailRow();
      setFinanceToast('Session finance values updated');
      reloadSelectedPayoutProfile().catch((err) => console.error('Background payout profile reload failed:', err));
      loadPayoutPageData(activeTab, { silent: true }).catch((err) => console.error('Background payout list reload failed:', err));
    } catch (error) {
      console.error('Failed to update payout detail row:', error);
      alert(error?.message || 'Failed to update session finance values');
    } finally {
      setSavingDetailRowId(null);
    }
  };

  const deleteDetailRow = async (row) => {
    const rowId = row.session_id || row.id;
    if (!rowId) return;

    const clientLabel = row.client_name ? ` for ${row.client_name}` : '';
    const confirmed = window.confirm(`Delete this session${clientLabel}? This cannot be undone from this screen.`);
    if (!confirmed) return;

    try {
      setDeletingDetailRowId(rowId);
      await financeApi.deleteSession(rowId);

      const removeRow = (rows) => (rows || []).filter((session) => (session.session_id || session.id) !== rowId);
      const removeFromPayoutRows = (rows) => (rows || []).map((payout) => {
        if (payout.psychologist_id !== selectedPayout?.psychologist_id) return payout;
        return {
          ...payout,
          session_details: removeRow(payout.session_details),
          total_sessions: Math.max(0, Number(payout.total_sessions || 0) - 1),
        };
      });

      setSelectedPayoutProfile(prev => prev ? { ...prev, sessions: removeRow(prev.sessions) } : prev);
      setSelectedPayout(prev => prev ? {
        ...prev,
        session_details: removeRow(prev.session_details),
        total_sessions: Math.max(0, Number(prev.total_sessions || 0) - 1),
      } : prev);
      setPendingPayoutRows(prev => removeFromPayoutRows(prev));
      setCompletedPayoutRows(prev => removeFromPayoutRows(prev));
      setDoctorPayouts(prev => removeFromPayoutRows(prev));
      if (editingDetailRowId === rowId) cancelEditDetailRow();

      setFinanceToast('Session deleted');
      reloadSelectedPayoutProfile().catch((err) => console.error('Background payout profile reload failed:', err));
      loadPayoutPageData(activeTab, { silent: true }).catch((err) => console.error('Background payout list reload failed:', err));
    } catch (error) {
      console.error('Failed to delete payout detail row:', error);
      alert(error?.message || 'Failed to delete session');
    } finally {
      setDeletingDetailRowId(null);
    }
  };

  const handleMarkAsPaidClick = async (payout) => {
    setPayoutToMark(payout);
    setShowConfirmModal(true);

    // The Pending tab loads a lightweight list (listOnly=true), where the backend returns
    // every amount as null for speed. The table hides those columns, but this dialog shows
    // them — so they rendered as "0 sessions / ₹0". It also leaves session_details empty,
    // which the confirm step needs. Pull the real figures for this one doctor on open.
    const needsDetails = payout && (payout.total_sessions == null || !(payout.session_details || []).length);
    if (activeTab !== 'pending' || !needsDetails) return;

    try {
      setMarkDetailsLoading(true);
      const pendingMy = pendingPayoutIstMonthYear(dateRange?.from);
      const res = await financeApi.getPendingPayouts({ month: pendingMy.month, year: pendingMy.year });
      const full = (res?.data?.payouts || []).find((p) => p.psychologist_id === payout.psychologist_id);
      if (full) setPayoutToMark((prev) => (prev && prev.psychologist_id === payout.psychologist_id ? { ...prev, ...full } : prev));
    } catch (err) {
      console.error('Failed to load payout details for confirmation:', err);
    } finally {
      setMarkDetailsLoading(false);
    }
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

      // month/year is sent as a fallback: the backend needs sessionIds OR dateFrom/dateTo OR
      // month/year. On the Pending tab session_details can be empty (listOnly payload), and
      // if no date range is picked dateFrom/dateTo are null too — without this the request
      // failed with "Either sessionIds, month/year, or dateFrom/dateTo are required".
      const pendingMy = pendingPayoutIstMonthYear(dateRange?.from);

      const response = await financeApi.markPayoutAsPaid({
        psychologist_id: payoutToMark.psychologist_id,
        sessionIds: (payoutToMark.session_details || [])
          .filter((session) => (session.payout_status || session.payment_status || 'pending') === 'pending')
          .map((session) => session.session_id)
          .filter(Boolean),
        dateFrom,
        dateTo,
        month: pendingMy.month,
        year: pendingMy.year
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

  const getPayoutState = (payout, tab = activeTab) => {
    if (tab === 'completed') return 'paid';
    const explicitState = String(payout?.payout_state || payout?.payment_status || '').toLowerCase();
    if (explicitState) return explicitState;
    return getPayoutDisplayAmount(payout, tab) > 0 ? 'pending' : 'not_due';
  };

  const canMarkPayoutAsPaid = (payout) =>
    activeTab === 'pending' &&
    getPayoutState(payout, 'pending') === 'pending' &&
    (payout?.can_mark_paid === true || getPayoutDisplayAmount(payout, 'pending') > 0);

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
  const isPendingFastList = activeTab === 'pending';
  const doctorSearchTerm = doctorSearch.trim().toLowerCase();
  const visibleDoctorPayouts = doctorSearchTerm
    ? doctorPayouts.filter((payout) => {
      const doctorName = [
        payout.psychologist?.first_name,
        payout.psychologist?.last_name,
      ].filter(Boolean).join(' ').toLowerCase();
      const doctorEmail = String(payout.psychologist?.email || '').toLowerCase();
      return doctorName.includes(doctorSearchTerm) || doctorEmail.includes(doctorSearchTerm);
    })
    : doctorPayouts;
  const selectedProfileSessions = selectedPayoutProfile?.sessions || null;
  const selectedProfileSummary = selectedPayoutProfile?.summary || null;
  const selectedDetailRowsAll = selectedProfileSessions || selectedPayout?.session_details || [];
  // Each tab's breakdown must show only ITS OWN rows. The profile endpoint returns every
  // session in the range — paid, unpaid and 'void' (cancelled/refunded) alike — so without
  // this both popups showed the same full list:
  //   • Pending tab   → only what is STILL OWED  ('pending' / 'not_due')
  //   • Completed tab → only what was ACTUALLY PAID ('paid')
  // 'void' rows are excluded from both: a cancelled session is owed to nobody and was never
  // paid, and including it made the list stop footing to the amount in the header.
  const selectedDetailRows = selectedDetailRowsAll.filter((session) => {
    const st = String(session.payout_status || session.payment_status || 'pending').toLowerCase();
    return activeTab === 'pending' ? (st === 'pending' || st === 'not_due') : st === 'paid';
  });
  const detailClientSearchTerm = detailClientSearch.trim().toLowerCase();
  const visibleSelectedDetailRows = detailClientSearchTerm
    ? selectedDetailRows.filter((session) => {
      const clientName = String(session.client_name || '').toLowerCase();
      const clientEmail = String(session.client_email || '').toLowerCase();
      return clientName.includes(detailClientSearchTerm) || clientEmail.includes(detailClientSearchTerm);
    })
    : selectedDetailRows;
  const selectedDetailCount = visibleSelectedDetailRows.length;
  const isUsingProfileRows = Array.isArray(selectedProfileSessions);
  const selectedSummaryTotalSessions = selectedProfileSummary?.total_sessions ?? selectedPayout?.profile_total_sessions ?? selectedPayout?.total_sessions ?? 0;
  const selectedSummaryCompletedSessions = selectedProfileSummary?.completed_sessions ?? selectedPayout?.completed_sessions ?? selectedPayout?.total_sessions ?? 0;
  const selectedSummaryCompanyEarnings = selectedProfileSummary?.company_earnings ?? selectedPayout?.profile_company_earnings ?? selectedPayout?.total_company_commission ?? 0;
  const selectedSummaryPendingPayout = selectedProfileSummary?.payout_pending ?? getPayoutDisplayAmount(selectedPayout, activeTab);
  const selectedSummaryNotDue = selectedProfileSummary?.payout_not_due ?? selectedPayout?.profile_payout_not_due ?? 0;
  // On the Completed tab the headline figure is what was PAID, not what is pending — showing
  // "Pending Payout ₹6,750" above a list of ₹1,43,000 of settled sessions made no sense.
  const selectedSummaryPaidPayout = selectedProfileSummary?.payout_paid
    ?? selectedPayout?.profile_payout_paid
    ?? getPayoutDisplayAmount(selectedPayout, 'completed');
  const selectedDetailTotals = visibleSelectedDetailRows.reduce((acc, session) => {
    acc.amount += Number(session.session_amount || 0);
    acc.doctor += Number((isUsingProfileRows ? session.doctor_amount : session.doctor_wallet) || 0);
    acc.company += Number((isUsingProfileRows ? session.company_amount : session.company_commission) || 0);
    return acc;
  }, { amount: 0, doctor: 0, company: 0 });
  const selectedDoctorName = [
    selectedPayout?.psychologist?.first_name,
    selectedPayout?.psychologist?.last_name,
  ].filter(Boolean).join(' ').trim() || selectedPayoutProfile?.doctor?.name || 'Therapist';

  const handleDownloadPayoutExcel = () => {
    if (!visibleSelectedDetailRows.length) return;
    const dateFrom = hasDateRangeBounds(dateRange) ? formatIstCalendarYmd(dateRange.from) : null;
    const dateTo = hasDateRangeBounds(dateRange) ? formatIstCalendarYmd(dateRange.to) : null;
    exportFinanceRowsToExcel({
      rows: visibleSelectedDetailRows,
      doctorName: selectedDoctorName,
      filePrefix: `${selectedDoctorName}-payout-details`,
      dateFrom,
      dateTo,
      sourceStyleFor,
      payoutStyles: PAYOUT_STYLES,
      summary: {
        status: activeTab === 'pending' ? 'Pending Payout' : 'Paid',
        total_sessions: selectedSummaryTotalSessions,
        completed_sessions: selectedSummaryCompletedSessions,
        company_earnings: Number(selectedSummaryCompanyEarnings || 0),
        pending_payout: Number(selectedSummaryPendingPayout || 0),
        not_due_payout: Number(selectedSummaryNotDue || 0),
      },
      totals: selectedDetailTotals,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-3 lg:p-4">
      <FinanceToast message={financeToast} onClose={() => setFinanceToast('')} />
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
              onClick={() => handleTabChange('pending')}
              className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium ${
                activeTab === 'pending'
                  ? 'text-[#025545] border-b-2 border-[#025545]'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pending Payouts ({pendingTabCount})
            </button>
            <button
              onClick={() => handleTabChange('completed')}
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
        {!isPendingFastList && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
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
        </div>}

        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {doctorPayouts.length > 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="flex flex-col gap-2 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {activeTab === 'pending' ? 'Pending payout therapists' : 'Completed payout therapists'}
                    </div>
                    <p className="text-xs text-gray-500">
                      Showing {visibleDoctorPayouts.length} of {doctorPayouts.length}
                    </p>
                  </div>
                  <div className="relative w-full sm:w-80">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="search"
                      value={doctorSearch}
                      onChange={(e) => setDoctorSearch(e.target.value)}
                      placeholder="Search doctor name or email"
                      className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 outline-none transition focus:border-[#025545] focus:ring-2 focus:ring-[#025545]/20"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Doctor Name</th>
                        {!isPendingFastList && (
                          <>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid Sessions</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company Earnings</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Doctor Wallet</th>
                          </>
                        )}
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {visibleDoctorPayouts.length === 0 ? (
                        <tr>
                          <td colSpan={isPendingFastList ? 3 : 6} className="px-6 py-10 text-center text-sm text-gray-500">
                            No therapists match this search.
                          </td>
                        </tr>
                      ) : visibleDoctorPayouts.map((payout) => {
                        const payoutState = getPayoutState(payout, activeTab);
                        const payoutStyle = PAYOUT_STYLES[payoutState] || PAYOUT_STYLES.pending;
                        return (
                        <tr key={payout.psychologist_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {payout.psychologist?.first_name} {payout.psychologist?.last_name}
                            </div>
                            <div className="mt-0.5 text-xs text-gray-500">{payout.psychologist?.email || '—'}</div>
                          </td>
                          {!isPendingFastList && (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {payout.total_sessions || 0}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                ₹{(payout.total_company_commission || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                                ₹{getPayoutDisplayAmount(payout, activeTab).toLocaleString('en-IN')}
                              </td>
                            </>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${payoutStyle.cls}`}>
                              {payoutState === 'pending' ? 'Pending Payout' : payoutStyle.label}
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
                                {canMarkPayoutAsPaid(payout) && (
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
                      );
                      })}
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
            <div className="bg-white rounded-lg max-w-xl w-full shadow-xl">
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
                      <span className="ml-2 font-semibold text-gray-900">
                        {markDetailsLoading ? '…' : (payoutToMark.total_sessions ?? 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">{activeTab === 'pending' ? 'Pending Payout:' : 'Doctor Wallet:'}</span>
                      <span className="ml-2 font-semibold text-green-600">
                        {markDetailsLoading ? '…' : `₹${getPayoutDisplayAmount(payoutToMark, activeTab).toLocaleString('en-IN')}`}
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
                    disabled={markDetailsLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {markDetailsLoading
                      ? <><Loader2 className="h-4 w-4 animate-spin" />Loading…</>
                      : <><Check className="h-4 w-4" />Mark as Paid</>}
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDownloadPayoutExcel}
                      disabled={!visibleSelectedDetailRows.length || selectedPayoutProfileLoading}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Download className="h-4 w-4" />
                      Excel
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPayout(null);
                        setSelectedPayoutProfile(null);
                        setSelectedPayoutProfileError(null);
                        setDetailClientSearch('');
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
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
                    <label className="text-sm font-medium text-gray-700">Total Sessions</label>
                    <p className="mt-1 text-lg font-semibold text-gray-900">{selectedSummaryTotalSessions}</p>
                    {isUsingProfileRows && (
                      <p className="mt-0.5 text-xs text-gray-500">Completed sessions: {selectedSummaryCompletedSessions}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Company Earnings</label>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      ₹{Number(selectedSummaryCompanyEarnings || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      {activeTab === 'pending' ? 'Pending Payout' : 'Paid Payout'}
                    </label>
                    <p className="mt-1 text-lg font-semibold text-green-600">
                      ₹{Number((activeTab === 'pending' ? selectedSummaryPendingPayout : selectedSummaryPaidPayout) || 0).toLocaleString('en-IN')}
                    </p>
                    {activeTab === 'pending' && (
                      <p className="mt-0.5 text-xs text-gray-500">Not yet due: ₹{Number(selectedSummaryNotDue || 0).toLocaleString('en-IN')}</p>
                    )}
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
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm font-semibold text-gray-900">
                        Session Details <span className="font-normal text-gray-400">({selectedDetailCount} shown)</span>
                      </div>
                      <div className="relative w-full sm:w-80">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          type="search"
                          value={detailClientSearch}
                          onChange={(e) => setDetailClientSearch(e.target.value)}
                          placeholder="Search client name or email"
                          className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 outline-none transition focus:border-[#025545] focus:ring-2 focus:ring-[#025545]/20"
                        />
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">First / Follow-up</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Session Amount</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Doctor</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Company</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Booked Date</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Payout</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {visibleSelectedDetailRows.length === 0 ? (
                            <tr>
                              <td colSpan={12} className="px-4 py-10 text-center text-sm text-gray-500">
                                No client sessions match this search.
                              </td>
                            </tr>
                          ) : visibleSelectedDetailRows.map((session, idx) => {
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
                            const rowId = session.session_id || session.id || idx;
                            const isEditing = editingDetailRowId === rowId;
                            const isSaving = savingDetailRowId === rowId;
                            const isDeleting = deletingDetailRowId === rowId;
                            const rowTone = idx % 2 === 0 ? 'bg-white' : 'bg-slate-100/70';
                            return (
                              <tr key={rowId} className={`${rowTone} transition-colors hover:bg-sky-50/80`}>
                                <td className="px-4 py-2.5 whitespace-nowrap">
                                  <div className="text-slate-900">{fmtDate(session.session_date)}</div>
                                  <div className="text-xs text-slate-400">{fmtTime(session.session_time)}</div>
                                </td>
                                <td className="px-4 py-2.5 text-slate-700 max-w-[210px]" title={session.client_name}>
                                  <div className="truncate">{session.client_name || '—'}</div>
                                  <div className="mt-0.5 truncate text-xs text-slate-400">
                                    {session.client_email || '—'}
                                  </div>
                                </td>
                                <td className="px-4 py-2.5 text-slate-600 capitalize">
                                  {session.package_label || session.session_type_label || session.session_type?.replace(/_/g, ' ') || '-'}
                                </td>
                                <td className="px-4 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                                  {session.session_sequence_label || (session.is_first_session || session.is_package_first_for_client ? 'First' : 'Follow-up')}
                                </td>
                                <td className="px-4 py-2.5">
                                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${source.cls}`}>
                                    {source.label}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5">
                                  {isEditing ? (
                                    <select
                                      value={detailEditValues.status}
                                      onChange={(e) => setDetailEditValues(prev => ({ ...prev, status: e.target.value }))}
                                      className="w-36 rounded border border-slate-200 px-2 py-1 text-xs bg-white"
                                    >
                                      {EDITABLE_SESSION_STATUSES.map(option => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[statusKey] || 'bg-slate-100 text-slate-700'}`}>
                                      {String(status || '-').replace(/_/g, ' ')}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 text-right text-slate-700">
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      value={detailEditValues.session_amount}
                                      onChange={(e) => updateDetailEditValue('session_amount', e.target.value)}
                                      className="w-24 rounded border border-slate-200 px-2 py-1 text-right text-xs"
                                    />
                                  ) : inr(session.session_amount)}
                                </td>
                                <td className="px-4 py-2.5 text-right font-semibold text-emerald-700">
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      value={detailEditValues.doctor_amount}
                                      onChange={(e) => updateDetailEditValue('doctor_amount', e.target.value)}
                                      className="w-24 rounded border border-slate-200 px-2 py-1 text-right text-xs"
                                    />
                                  ) : inr(doctorAmount)}
                                </td>
                                <td className={`px-4 py-2.5 text-right ${Number(companyAmount) < 0 ? 'text-slate-400' : 'text-indigo-700'}`}>
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      value={detailEditValues.company_amount}
                                      onChange={(e) => updateDetailEditValue('company_amount', e.target.value)}
                                      className="w-24 rounded border border-slate-200 px-2 py-1 text-right text-xs"
                                    />
                                  ) : inr(companyAmount)}
                                </td>
                                <td className="px-4 py-2.5 whitespace-nowrap text-xs text-slate-500">
                                  {fmtBookedDate(session.booked_at || session.booking_created_at || session.created_at)}
                                </td>
                                <td className="px-4 py-2.5">
                                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${payoutStyle.cls}`}>
                                    {payoutStyle.label}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  {isEditing ? (
                                    <div className="flex justify-center gap-1">
                                      <button onClick={() => saveDetailRow(session)} disabled={isSaving || isDeleting} className="rounded p-1 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50" title="Save">
                                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                      </button>
                                      <button onClick={cancelEditDetailRow} disabled={isSaving || isDeleting} className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50" title="Cancel">
                                        <X className="h-4 w-4" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex justify-center gap-1">
                                      <button
                                        onClick={() => startEditDetailRow(session)}
                                        disabled={isDeleting}
                                        className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
                                        title="Edit finance values"
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => deleteDetailRow(session)}
                                        disabled={isDeleting}
                                        className="rounded p-1 text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                                        title="Delete session"
                                      >
                                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        {visibleSelectedDetailRows.length > 0 && (
                          <tfoot className="bg-slate-50 font-semibold">
                            <tr>
                              <td colSpan={7} className="px-4 py-2.5 text-right text-slate-600">Totals shown</td>
                              <td className="px-4 py-2.5 text-right text-slate-900">{inr(selectedDetailTotals.amount)}</td>
                              <td className="px-4 py-2.5 text-right text-emerald-700">{inr(selectedDetailTotals.doctor)}</td>
                              <td className="px-4 py-2.5 text-right text-indigo-700">{inr(selectedDetailTotals.company)}</td>
                              <td colSpan={2} />
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
