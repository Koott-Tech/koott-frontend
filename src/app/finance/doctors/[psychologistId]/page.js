'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Wallet, TrendingUp, Calendar, User, Download, Loader2, CheckCircle2, Clock, XCircle, Pencil, Save, X, Search } from 'lucide-react';
import { financeApi } from '@/lib/backendApi';
import { useNotification } from '@/contexts/NotificationContext';
import DateRangePicker from '@/components/ui/date-range-picker';
import { hasDateRangeBounds } from '@/lib/dateRangeBounds';
import { formatIstCalendarYmd, istCalendarMonthBounds } from '@/lib/wixFinanceDates';
import { exportFinanceRowsToExcel } from '@/lib/financeExcelExport';

const inr = (n) =>
  `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(`${d}T00:00:00+05:30`).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
    });
  } catch { return d; }
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

const parseYmdToLocalDate = (ymd) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(ymd || ''))) return null;
  const [year, month, day] = String(ymd).split('-').map((part) => parseInt(part, 10));
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const STATUS_STYLES = {
  completed: 'bg-green-100 text-green-800',
  booked: 'bg-emerald-100 text-emerald-800',
  rescheduled: 'bg-slate-100 text-slate-700',
  no_show: 'bg-amber-100 text-amber-900',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-red-50 text-red-700',
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

function StatCard({ icon: Icon, label, value, sub, tone = 'default' }) {
  const tones = {
    default: 'border-slate-200 bg-white',
    doctor: 'border-emerald-200 bg-emerald-50/50',
    company: 'border-indigo-200 bg-indigo-50/50',
    pending: 'border-amber-200 bg-amber-50/50',
  };
  return (
    <div className={`rounded-xl border p-4 ${tones[tone] || tones.default}`}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {label}
      </div>
      <div className="mt-1.5 text-xl font-bold text-slate-900">{value}</div>
      {sub ? <div className="mt-0.5 text-xs text-slate-500">{sub}</div> : null}
    </div>
  );
}

export default function DoctorFinanceProfilePage() {
  const { psychologistId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showError, showSuccess } = useNotification();

  const initialDateRange = (() => {
    const fromParam = searchParams.get('dateFrom');
    const toParam = searchParams.get('dateTo');
    const from = parseYmdToLocalDate(fromParam);
    const to = parseYmdToLocalDate(toParam);
    if (from && to) return { from, to };
    return istCalendarMonthBounds(new Date());
  })();
  const initialDateBasis = searchParams.get('dateBasis') === 'booked' ? 'booked' : 'scheduled';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [dateRange, setDateRange] = useState(initialDateRange);
  const [dateBasis, setDateBasis] = useState(initialDateBasis);
  const [statusFilter, setStatusFilter] = useState('all');
  const [payoutFilter, setPayoutFilter] = useState('all');
  const [clientSearch, setClientSearch] = useState('');
  const [editingRowId, setEditingRowId] = useState(null);
  const [editValues, setEditValues] = useState({ session_amount: '', doctor_amount: '', company_amount: '', status: '' });
  const [savingRowId, setSavingRowId] = useState(null);

  const load = useCallback(async () => {
    if (!psychologistId) return;
    setLoading(true);
    try {
      const params = { dateBasis };
      if (hasDateRangeBounds(dateRange)) {
        params.dateFrom = formatIstCalendarYmd(dateRange.from);
        params.dateTo = formatIstCalendarYmd(dateRange.to);
      }
      const res = await financeApi.getDoctorFinanceProfile(psychologistId, params);
      if (!res?.success) throw new Error(res?.message || 'Failed to load profile');
      setData(res.data);
    } catch (e) {
      showError(e?.message || 'Failed to load therapist profile');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [psychologistId, dateRange, dateBasis, showError]);

  useEffect(() => { load(); }, [load]);

  const startEditRow = (row) => {
    setEditingRowId(row.session_id);
    setEditValues({
      session_amount: String(Number(row.session_amount || 0)),
      doctor_amount: String(Number(row.doctor_amount || 0)),
      company_amount: String(Number(row.company_amount || 0)),
      status: String(row.status || 'booked').toLowerCase(),
    });
  };

  const cancelEditRow = () => {
    setEditingRowId(null);
    setEditValues({ session_amount: '', doctor_amount: '', company_amount: '', status: '' });
  };

  const updateEditValue = (field, value) => {
    const next = { ...editValues, [field]: value };
    const sessionAmount = Number(field === 'session_amount' ? value : next.session_amount) || 0;
    if (field === 'doctor_amount') {
      next.company_amount = String(sessionAmount - (Number(value) || 0));
    } else if (field === 'company_amount' || field === 'session_amount') {
      next.doctor_amount = String(sessionAmount - (Number(next.company_amount) || 0));
    }
    setEditValues(next);
  };

  const saveEditRow = async (row) => {
    const sessionAmount = Number(editValues.session_amount);
    const companyAmount = Number(editValues.company_amount);

    if (!Number.isFinite(sessionAmount) || sessionAmount < 0 || !Number.isFinite(companyAmount)) {
      showError('Enter valid amount values before saving');
      return;
    }

    try {
      setSavingRowId(row.session_id);
      await financeApi.updateSessionCommission(row.session_id, companyAmount, sessionAmount);
      if (editValues.status && editValues.status !== String(row.status || '').toLowerCase()) {
        await financeApi.updateSession(row.session_id, { status: editValues.status });
      }
      showSuccess('Session finance values updated');
      cancelEditRow();
      await load();
    } catch (error) {
      showError(error?.message || 'Failed to update session finance values');
    } finally {
      setSavingRowId(null);
    }
  };

  const sessions = useMemo(() => data?.sessions || [], [data?.sessions]);
  const filtered = useMemo(() => sessions.filter((r) => {
    const searchTerm = clientSearch.trim().toLowerCase();
    if (searchTerm) {
      const clientName = String(r.client_name || '').toLowerCase();
      const clientEmail = String(r.client_email || '').toLowerCase();
      if (!clientName.includes(searchTerm) && !clientEmail.includes(searchTerm)) return false;
    }
    if (statusFilter !== 'all' && String(r.status).toLowerCase() !== statusFilter) return false;
    if (payoutFilter !== 'all' && r.payout_status !== payoutFilter) return false;
    return true;
  }), [sessions, clientSearch, statusFilter, payoutFilter]);

  // Totals for exactly what's on screen, so the table foots to the filters applied.
  const shown = useMemo(() => filtered.reduce((t, r) => ({
    amount: t.amount + (Number(r.session_amount) || 0),
    doctor: t.doctor + (Number(r.doctor_amount) || 0),
    company: t.company + (Number(r.company_amount) || 0),
  }), { amount: 0, doctor: 0, company: 0 }), [filtered]);

  const exportCsv = () => {
    const head = ['Date', 'Time', 'Client', 'Type', 'First / Follow-up', 'Source', 'Payment Proof', 'Status', 'Session Amount', 'Doctor Commission', 'Company Commission', 'Booked At', 'Payout', 'Order'];
    const lines = filtered.map((r) => [
      r.session_date, r.session_time, r.client_name, r.package_label, r.session_sequence_label || (r.is_first_session || r.is_package_first_for_client ? 'First' : 'Follow-up'), sourceStyleFor(r.source).label, r.payment_proof_url || '', r.status,
      r.session_amount, r.doctor_amount, r.company_amount, fmtBookedDate(r.booked_at), r.payout_status, r.order_id || '',
    ].map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
    const csv = [head.join(','), ...lines].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data?.doctor?.name || 'therapist'}-finance-${formatIstCalendarYmd(dateRange.from) || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    if (!filtered.length) return;
    exportFinanceRowsToExcel({
      rows: filtered,
      doctorName: data?.doctor?.name || 'Therapist',
      filePrefix: `${data?.doctor?.name || 'therapist'}-finance`,
      dateFrom: hasDateRangeBounds(dateRange) ? formatIstCalendarYmd(dateRange.from) : null,
      dateTo: hasDateRangeBounds(dateRange) ? formatIstCalendarYmd(dateRange.to) : null,
      sourceStyleFor,
      payoutStyles: PAYOUT_STYLES,
      summary: {
        date_basis: dateBasis === 'booked' ? 'Booking date' : 'Session date',
        status_filter: statusFilter,
        payout_filter: payoutFilter,
        total_sessions: s?.total_sessions || 0,
        completed_sessions: s?.completed_sessions || 0,
        gross_revenue: Number(s?.gross_revenue || 0),
        doctor_earnings: Number(s?.doctor_earnings || 0),
        company_earnings: Number(s?.company_earnings || 0),
        payout_paid: Number(s?.payout_paid || 0),
        payout_pending: Number(s?.payout_pending || 0),
        payout_not_due: Number(s?.payout_not_due || 0),
      },
      totals: shown,
    });
  };

  const s = data?.summary;

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4 text-slate-600" />
          </button>
          <div>
            {/* Not an <h1>: globals.css forces h1 to 60px !important, which blew this up. */}
            <div className="text-xl font-bold text-slate-900 leading-tight">{data?.doctor?.name || 'Therapist'}</div>
            <p className="text-xs text-slate-500">
              {data?.doctor?.email || '—'}
              {data?.doctor?.area_of_expertise ? ` · ${data.doctor.area_of_expertise}` : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={dateBasis} onChange={(e) => setDateBasis(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
            <option value="scheduled">By session date</option>
            <option value="booked">By booking date</option>
          </select>
          <DateRangePicker selectedRange={dateRange} onSelect={setDateRange} />
          <button onClick={exportCsv} disabled={!filtered.length}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <Download className="h-4 w-4" /> CSV
          </button>
          <button onClick={exportExcel} disabled={!filtered.length}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <Download className="h-4 w-4" /> Excel
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Loading…
        </div>
      ) : !data ? (
        <div className="py-20 text-center text-slate-400">No data.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={Calendar} label="Total sessions" value={s.total_sessions} sub="All profile rows" />
            <StatCard icon={CheckCircle2} label="Completed" value={s.completed_sessions} tone="doctor" sub="Finished sessions" />
            <StatCard icon={Clock} label="Upcoming" value={s.upcoming_sessions} tone="pending" sub="Not completed yet" />
            <StatCard icon={XCircle} label="Void / cancelled" value={s.cancelled_sessions || 0} sub="No payout counted" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard icon={TrendingUp} label="Gross revenue" value={inr(s.gross_revenue)} sub="Client payments" />
            <StatCard icon={Wallet} label="Doctor earnings" value={inr(s.doctor_earnings)} tone="doctor" sub="Therapist share" />
            <StatCard icon={User} label="Company earnings" value={inr(s.company_earnings)} tone="company" sub="After therapist share" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard icon={CheckCircle2} label="Payout paid" value={inr(s.payout_paid)} sub="Already settled" />
            <StatCard icon={Clock} label="Payout pending" value={inr(s.payout_pending)} tone="pending" sub="Completed, awaiting payout" />
            <StatCard icon={XCircle} label="Not yet due" value={inr(s.payout_not_due)} sub="Upcoming sessions" />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
              {/* Not an <h2>: globals.css forces h2 to 48px !important. */}
              <div className="text-sm font-semibold text-slate-900">
                Session breakdown <span className="text-slate-400 font-normal">({filtered.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="relative w-full sm:w-72">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    placeholder="Search client name or email"
                    className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-2.5 text-xs text-slate-900 outline-none transition focus:border-[#025545] focus:ring-2 focus:ring-[#025545]/20"
                  />
                </div>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white">
                  <option value="all">All statuses</option>
                  <option value="completed">Completed</option>
                  <option value="booked">Booked</option>
                  <option value="rescheduled">Rescheduled</option>
                  <option value="no_show">No show</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <select value={payoutFilter} onChange={(e) => setPayoutFilter(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white">
                  <option value="all">All payouts</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="not_due">Not due</option>
                  <option value="void">Void</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {['Date', 'Client', 'Type', 'First / Follow-up', 'Source', 'Proof', 'Status', 'Session ₹', 'Doctor ₹', 'Company ₹', 'Booked Date', 'Payout', 'Edit'].map((h, i) => (
                      <th key={h} className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 ${i >= 7 && i <= 9 ? 'text-right' : i === 12 ? 'text-center' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={13} className="px-4 py-12 text-center text-slate-400">No sessions for these filters.</td></tr>
                  ) : filtered.map((r, idx) => {
                    const po = PAYOUT_STYLES[r.payout_status] || PAYOUT_STYLES.not_due;
                    const source = sourceStyleFor(r.source);
                    const isEditing = editingRowId === r.session_id;
                    const isSaving = savingRowId === r.session_id;
                    const rowTone = idx % 2 === 0 ? 'bg-white' : 'bg-slate-100/70';
                    return (
                      <tr key={r.session_id} className={`${rowTone} transition-colors hover:bg-sky-50/80`}>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <div className="text-slate-900">{fmtDate(r.session_date)}</div>
                          <div className="text-xs text-slate-400">{fmtTime(r.session_time)}</div>
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 max-w-[210px]" title={`${r.client_name || ''} ${r.client_email || ''}`.trim()}>
                          <div className="truncate">{r.client_name || '—'}</div>
                          <div className="mt-0.5 truncate text-xs text-slate-400">{r.client_email || '—'}</div>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 capitalize">{r.package_label}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                          {r.session_sequence_label || (r.is_first_session || r.is_package_first_for_client ? 'First' : 'Follow-up')}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${source.cls}`}>{source.label}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          {r.payment_proof_url ? (
                            <a href={r.payment_proof_url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-sky-700 hover:text-sky-900 underline">
                              View
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {isEditing ? (
                            <select
                              value={editValues.status}
                              onChange={(e) => setEditValues(prev => ({ ...prev, status: e.target.value }))}
                              className="w-36 rounded border border-slate-200 px-2 py-1 text-xs bg-white"
                            >
                              {EDITABLE_SESSION_STATUSES.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                          ) : (
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[String(r.status).toLowerCase()] || 'bg-slate-100 text-slate-700'}`}>
                              {r.status}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-700">
                          {isEditing ? (
                            <input type="number" value={editValues.session_amount} onChange={(e) => updateEditValue('session_amount', e.target.value)}
                              className="w-24 rounded border border-slate-200 px-2 py-1 text-right text-xs" />
                          ) : inr(r.session_amount)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-emerald-700">
                          {isEditing ? (
                            <input type="number" value={editValues.doctor_amount} onChange={(e) => updateEditValue('doctor_amount', e.target.value)}
                              className="w-24 rounded border border-slate-200 px-2 py-1 text-right text-xs" />
                          ) : inr(r.doctor_amount)}
                        </td>
                        <td className={`px-4 py-2.5 text-right ${Number(r.company_amount) < 0 ? 'text-slate-400' : 'text-indigo-700'}`}>
                          {isEditing ? (
                            <input type="number" value={editValues.company_amount} onChange={(e) => updateEditValue('company_amount', e.target.value)}
                              className="w-24 rounded border border-slate-200 px-2 py-1 text-right text-xs" />
                          ) : inr(r.company_amount)}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-xs text-slate-500">{fmtBookedDate(r.booked_at)}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${po.cls}`}>{po.label}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {isEditing ? (
                            <div className="flex justify-center gap-1">
                              <button onClick={() => saveEditRow(r)} disabled={isSaving} className="rounded p-1 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50" title="Save">
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                              </button>
                              <button onClick={cancelEditRow} disabled={isSaving} className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50" title="Cancel">
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => startEditRow(r)} className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800" title="Edit finance values">
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {filtered.length > 0 && (
                  <tfoot className="bg-slate-50 font-semibold">
                    <tr>
                      <td colSpan={7} className="px-4 py-2.5 text-right text-slate-600">Totals shown</td>
                      <td className="px-4 py-2.5 text-right text-slate-900">{inr(shown.amount)}</td>
                      <td className="px-4 py-2.5 text-right text-emerald-700">{inr(shown.doctor)}</td>
                      <td className="px-4 py-2.5 text-right text-indigo-700">{inr(shown.company)}</td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            <p className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-400">
              A package is paid on its first session while the therapist&apos;s commission is split across all its
              sessions — so follow-ups show ₹0 received with a negative company figure that offsets the first
              session. Doctor + Company always reconciles to Gross revenue.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
