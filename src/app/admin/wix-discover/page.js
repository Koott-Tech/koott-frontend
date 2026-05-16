'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { RefreshCw, Loader2, Search, Mail, Phone, CloudDownload, MoreVertical, Eye, Edit, Trash2, CheckCircle, X, Save, AlertCircle } from 'lucide-react';
import { adminApi } from '@/lib/backendApi';
import { useNotification } from '@/contexts/NotificationContext';
import { wixBookingBookedAtIso } from '@/lib/sessionBookedAt';

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
  // Follow-up session of a package — show "Session 2 of 3"
  if (row.package_parent_booking_id && idx) {
    return count ? `Session ${idx} of ${count} (package)` : `Session ${idx} (package)`;
  }
  if (type === 'package') {
    if (count && count > 1) return `Session 1 of ${count} (package)`;
    return 'Package';
  }
  if (type === 'individual') return 'Individual';
  if (type === 'class') return 'Class';
  if (type) return type;
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

export default function AdminWixDiscoverPage() {
  const { showError, showSuccess } = useNotification();
  const initializedRef = useRef(false);
  const [initialSyncDone, setInitialSyncDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [rows, setRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [wixFilterType, setWixFilterType] = useState('all');
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  const wixTypeTabs = [
    { label: 'All', value: 'all' },
    { label: 'Individual', value: 'individual' },
    { label: 'Couple', value: 'couple' },
    { label: 'Package', value: 'package' }
  ];

  // Action state
  const [openMenuId, setOpenMenuId] = useState(null);
  const [viewingRow, setViewingRow] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async (targetPage = 1) => {
    setLoading(true);
    try {
      const res = await adminApi.getWixBookings({
        page: targetPage, limit: 10,
        dateFrom: dateFrom || undefined, dateTo: dateTo || undefined,
        search: searchTerm.trim() || undefined,
        session_type: wixFilterType !== 'all' ? wixFilterType : undefined
      });
      if (!res?.success) throw new Error(res?.error || 'Failed to load Wix bookings');
      // Backend already filters: deleted rows and UNDEFINED-state (no wix_session_id) excluded.
      // No additional client-side filtering needed — use backend data directly.
      const bookings = res.data?.bookings || [];
      setRows(bookings);
      const p = res.data?.pagination || {};
      setPagination({ page: p.page || targetPage, limit: p.limit || 10, total: p.total || 0, totalPages: Math.max(1, Math.ceil((p.total || 0) / (p.limit || 10))) });
      setPage(p.page || targetPage);
    } catch (e) {
      showError(e?.message || 'Failed to load Wix bookings', 'Wix');
      setRows([]);
    } finally { setLoading(false); }
  }, [dateFrom, dateTo, searchTerm, showError, wixFilterType]);

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
  }, [dateFrom, dateTo, searchTerm, wixFilterType, load, initialSyncDone, syncing]);

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
  const handleComplete = async (row) => {
    setOpenMenuId(null);
    setActionLoading(true);
    try {
      const res = await adminApi.completeWixBooking(row.id);
      if (!res?.success) throw new Error(res?.error || 'Failed');
      showSuccess('Booking marked as completed', 'Wix');
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

  return (
    <div className="p-4 md:p-8 max-w-[1480px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-xl font-semibold text-gray-900">Wix Bookings</div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => load(page)} disabled={loading || syncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Refresh
          </button>
          <button type="button" onClick={() => syncAndReload({ silentSuccess: false })} disabled={loading || syncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3f2e73] text-white text-sm hover:bg-[#352863] disabled:opacity-40">
            {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CloudDownload className="h-3.5 w-3.5" />}
            {syncing ? 'Syncing…' : 'Sync from Wix'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search client, therapist…"
            className="w-full rounded-lg border border-gray-200 py-1.5 pl-8 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#3f2e73] focus:outline-none focus:ring-2 focus:ring-[#3f2e73]/15" />
        </div>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-700 focus:border-[#3f2e73] focus:outline-none focus:ring-2 focus:ring-[#3f2e73]/15" />
        <span className="text-xs text-gray-400">–</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-700 focus:border-[#3f2e73] focus:outline-none focus:ring-2 focus:ring-[#3f2e73]/15" />
        {(searchTerm || dateFrom || dateTo) && (
          <button type="button" onClick={() => { setSearchTerm(''); setDateFrom(''); setDateTo(''); setWixFilterType('all'); }}
            className="text-xs text-gray-400 hover:text-gray-600 px-1">Clear</button>
        )}
        <span className="ml-auto text-xs text-gray-400">{pagination.total} booking{pagination.total === 1 ? '' : 's'}</span>
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
                onClick={() => setWixFilterType(tab.value)}
                className={`
                  relative px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap
                  transition-all duration-200 ease-out
                  ${isActive
                    ? 'bg-[#3f2e73] text-white shadow-sm'
                    : 'text-gray-600 hover:text-[#3f2e73] hover:bg-[#3f2e73]/8'
                  }
                `}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Table */}
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
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">No bookings found{searchTerm || dateFrom || dateTo ? ' for current filters' : ''}.</td></tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-gray-900 text-xs leading-snug">
                        {row.wix_order_number ? `#${row.wix_order_number}` : (row.wix_booking_id ? `ID: ${row.wix_booking_id.slice(-6).toUpperCase()}` : 'No ID')}
                      </p>
                      {row.session_type === 'package' && row.package_session_number && (
                        <span className="text-[10px] font-semibold text-[#3f2e73] bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                          {row.package_session_number} of {row.session_count || '?'}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-xs mt-0.5">{fmtDateTime(row.start_time)}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(() => { 
                        const st = deriveSessionType(row); 
                        return st ? (
                          <span className="inline-flex rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 capitalize">{st}</span>
                        ) : null; 
                      })()}
                      {row.locally_modified && (
                        <span className="inline-flex rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Edited locally</span>
                      )}
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
                      const s = row.status && row.status !== 'undefined' && row.status !== 'null' ? row.status : null;
                      return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(s)}`}>{s || '—'}</span>;
                    })()}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{row.price ? `${row.price}${row.currency ? ` ${row.currency}` : ''}` : '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{fmtDateTime(wixBookingBookedAtIso(row))}</td>
                  <td className="px-4 py-3 text-center relative">
                    <button onClick={() => setOpenMenuId(openMenuId === row.id ? null : row.id)}
                      className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {openMenuId === row.id && (
                      <div className="absolute right-4 top-10 z-20 w-44 rounded-lg border border-gray-200 bg-white shadow-lg py-1 text-left">
                        <button onClick={() => handleView(row)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                          <Eye className="h-3.5 w-3.5" /> View Details
                        </button>
                        <button onClick={() => handleEdit(row)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                          <Edit className="h-3.5 w-3.5" /> Edit
                        </button>
                        {row.status !== 'completed' && (
                          <button onClick={() => handleComplete(row)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-green-700 hover:bg-green-50">
                            <CheckCircle className="h-3.5 w-3.5" /> Mark Complete
                          </button>
                        )}
                        {row.status !== 'no_show' && (
                          <button onClick={() => handleNoShow(row)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-amber-700 hover:bg-amber-50">
                            <AlertCircle className="h-3.5 w-3.5" /> Mark No-Show
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
              ))
            )}
          </tbody>
        </table>
      </div>

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
                ['Wix Booking ID', viewingRow.wix_booking_id],
                ['Created at', fmtDateTime(wixBookingBookedAtIso(viewingRow))],
                ['Locally Modified', viewingRow.locally_modified ? 'Yes' : 'No'],
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
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#3f2e73] focus:outline-none focus:ring-2 focus:ring-[#3f2e73]/15">
                      {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea value={editForm[field.key] || ''} onChange={(e) => setEditForm(f => ({ ...f, [field.key]: e.target.value }))}
                      rows={3} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#3f2e73] focus:outline-none focus:ring-2 focus:ring-[#3f2e73]/15" />
                  ) : (
                    <input type={field.type || 'text'} value={editForm[field.key] || ''} onChange={(e) => setEditForm(f => ({ ...f, [field.key]: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#3f2e73] focus:outline-none focus:ring-2 focus:ring-[#3f2e73]/15" />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t">
              <button onClick={() => setEditingRow(null)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleEditSave} disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3f2e73] text-white text-sm hover:bg-[#352863] disabled:opacity-40">
                {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
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
    </div>
  );
}
