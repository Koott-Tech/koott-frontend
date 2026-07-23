'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Wallet, TrendingUp, Calendar, User, Download, Loader2, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { financeApi } from '@/lib/backendApi';
import { useNotification } from '@/contexts/NotificationContext';
import DateRangePicker from '@/components/ui/date-range-picker';
import { hasDateRangeBounds } from '@/lib/dateRangeBounds';
import { formatIstCalendarYmd, istCalendarMonthBounds } from '@/lib/wixFinanceDates';

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
  const { showError } = useNotification();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [dateRange, setDateRange] = useState(() => istCalendarMonthBounds(new Date()));
  const [dateBasis, setDateBasis] = useState('scheduled');
  const [statusFilter, setStatusFilter] = useState('all');
  const [payoutFilter, setPayoutFilter] = useState('all');

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

  const sessions = data?.sessions || [];
  const filtered = useMemo(() => sessions.filter((r) => {
    if (statusFilter !== 'all' && String(r.status).toLowerCase() !== statusFilter) return false;
    if (payoutFilter !== 'all' && r.payout_status !== payoutFilter) return false;
    return true;
  }), [sessions, statusFilter, payoutFilter]);

  // Totals for exactly what's on screen, so the table foots to the filters applied.
  const shown = useMemo(() => filtered.reduce((t, r) => ({
    amount: t.amount + (Number(r.session_amount) || 0),
    doctor: t.doctor + (Number(r.doctor_amount) || 0),
    company: t.company + (Number(r.company_amount) || 0),
  }), { amount: 0, doctor: 0, company: 0 }), [filtered]);

  const exportCsv = () => {
    const head = ['Date', 'Time', 'Client', 'Type', 'Status', 'Session Amount', 'Doctor Commission', 'Company Commission', 'Payout', 'Order'];
    const lines = filtered.map((r) => [
      r.session_date, r.session_time, r.client_name, r.package_label, r.status,
      r.session_amount, r.doctor_amount, r.company_amount, r.payout_status, r.order_id || '',
    ].map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
    const csv = [head.join(','), ...lines].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data?.doctor?.name || 'therapist'}-finance-${formatIstCalendarYmd(dateRange.from) || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
            <StatCard icon={Calendar} label="Sessions" value={s.total_sessions}
              sub={`${s.completed_sessions} completed · ${s.upcoming_sessions} upcoming`} />
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
                    {['Date', 'Client', 'Type', 'Status', 'Session ₹', 'Doctor ₹', 'Company ₹', 'Payout'].map((h, i) => (
                      <th key={h} className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 ${i >= 4 && i <= 6 ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">No sessions for these filters.</td></tr>
                  ) : filtered.map((r) => {
                    const po = PAYOUT_STYLES[r.payout_status] || PAYOUT_STYLES.not_due;
                    return (
                      <tr key={r.session_id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <div className="text-slate-900">{fmtDate(r.session_date)}</div>
                          <div className="text-xs text-slate-400">{fmtTime(r.session_time)}</div>
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 max-w-[180px] truncate" title={r.client_name}>{r.client_name}</td>
                        <td className="px-4 py-2.5 text-slate-600 capitalize">{r.package_label}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[String(r.status).toLowerCase()] || 'bg-slate-100 text-slate-700'}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-700">{inr(r.session_amount)}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-emerald-700">{inr(r.doctor_amount)}</td>
                        <td className={`px-4 py-2.5 text-right ${Number(r.company_amount) < 0 ? 'text-slate-400' : 'text-indigo-700'}`}>{inr(r.company_amount)}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${po.cls}`}>{po.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {filtered.length > 0 && (
                  <tfoot className="bg-slate-50 font-semibold">
                    <tr>
                      <td colSpan={4} className="px-4 py-2.5 text-right text-slate-600">Totals shown</td>
                      <td className="px-4 py-2.5 text-right text-slate-900">{inr(shown.amount)}</td>
                      <td className="px-4 py-2.5 text-right text-emerald-700">{inr(shown.doctor)}</td>
                      <td className="px-4 py-2.5 text-right text-indigo-700">{inr(shown.company)}</td>
                      <td />
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
