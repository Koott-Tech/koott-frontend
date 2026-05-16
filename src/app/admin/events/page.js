'use client';

import { useEffect, useState, useCallback } from 'react';
import { Ticket, Loader2, User, Eye, Pencil, Trash2, UserPlus, X, MoreVertical, Search } from 'lucide-react';
import { adminApi } from '@/lib/backendApi';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function formatWhen(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export default function AdminEventsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [events, setEvents] = useState([]);
  const [message, setMessage] = useState('');
  const [viewRow, setViewRow] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);
  const [addClientRow, setAddClientRow] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientForm, setClientForm] = useState({
    event_slug: '',
    first_name: '',
    last_name: '',
    child_name: 'Not provided',
    child_age: 0,
    password: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getEventRegistrations();
      if (!res?.success) {
        setError(res?.error || res?.message || 'Could not load events');
        setEvents([]);
        return;
      }
      const list = res.data?.events || [];
      setEvents(list);
    } catch (e) {
      setError(e?.message || 'Failed to load');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const allRows = events.flatMap((ev) =>
    (ev.registrations || []).map((r) => ({
      ...r,
      event_slug: ev.event_slug,
      event_title: ev.event_title || ev.event_slug,
    }))
  );

  const eventOptions = events.map((ev) => ({
    slug: ev.event_slug,
    title: ev.event_title || ev.event_slug,
  }));

  const filteredRows = allRows.filter((row) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    const name = String(row.full_name || '').toLowerCase();
    const email = String(row.email || '').toLowerCase();
    const eventTitle = String(row.event_title || '').toLowerCase();
    const eventSlug = String(row.event_slug || '').toLowerCase();
    return name.includes(q) || email.includes(q) || eventTitle.includes(q) || eventSlug.includes(q);
  });

  const openAddClient = (row = null) => {
    const selectedRow = row || allRows[0] || null;
    if (!selectedRow) return;
    const parts = String(selectedRow.full_name || '').trim().split(/\s+/).filter(Boolean);
    const first = parts[0] || '';
    const last = parts.slice(1).join(' ');
    setClientForm({
      event_slug: selectedRow.event_slug || '',
      first_name: first,
      last_name: last,
      child_name: 'Not provided',
      child_age: 0,
      password: '',
    });
    setAddClientRow(selectedRow);
  };

  const updateSelectedRegistration = (registrationId) => {
    const selectedRow = allRows.find((row) => String(row.id) === String(registrationId));
    if (!selectedRow) return;
    const parts = String(selectedRow.full_name || '').trim().split(/\s+/).filter(Boolean);
    const first = parts[0] || '';
    const last = parts.slice(1).join(' ');
    setClientForm({
      event_slug: selectedRow.event_slug || '',
      first_name: first,
      last_name: last,
      child_name: 'Not provided',
      child_age: 0,
      password: '',
    });
    setAddClientRow(selectedRow);
  };

  const saveEdit = async () => {
    if (!editRow?.id) return;
    setSaving(true);
    setError(null);
    try {
      const patch = {
        full_name: editRow.full_name,
        email: editRow.email,
        country_code: editRow.country_code,
        phone: editRow.phone,
        event_slug: editRow.event_slug,
        event_title:
          eventOptions.find((e) => e.slug === editRow.event_slug)?.title || editRow.event_title || editRow.event_slug,
      };
      await adminApi.updateEventRegistration(editRow.id, patch);
      setEditRow(null);
      setMessage('Registration updated.');
      await load();
    } catch (e) {
      setError(e?.message || 'Failed to update registration');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteRow?.id) return;
    setSaving(true);
    setError(null);
    try {
      await adminApi.deleteEventRegistration(deleteRow.id);
      setDeleteRow(null);
      setMessage('Registration deleted.');
      await load();
    } catch (e) {
      setError(e?.message || 'Failed to delete registration');
    } finally {
      setSaving(false);
    }
  };

  const createClientFromRegistration = async () => {
    if (!addClientRow?.id) return;
    setSaving(true);
    setError(null);
    try {
      const selected = clientForm.event_slug;
      if (!selected) throw new Error('Please select an event.');
      if (!clientForm.password || clientForm.password.length < 8) {
        throw new Error('Password is required (minimum 8 characters).');
      }

      // Assign registration to selected event before creating the client.
      const selectedTitle = eventOptions.find((e) => e.slug === selected)?.title || selected;
      await adminApi.updateEventRegistration(addClientRow.id, {
        event_slug: selected,
        event_title: selectedTitle,
      });

      await adminApi.createUser({
        email: addClientRow.email,
        password: clientForm.password,
        first_name: clientForm.first_name,
        last_name: clientForm.last_name,
        phone_number: `${addClientRow.country_code || ''}${addClientRow.phone || ''}`.trim(),
        child_name: clientForm.child_name || 'Not provided',
        child_age: Number(clientForm.child_age || 0),
      });

      setAddClientRow(null);
      setMessage('Client created and assigned to selected event.');
      await load();
    } catch (e) {
      setError(e?.message || 'Failed to create client');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h6 className="text-gray-900 flex items-center gap-2">
                <Ticket className="h-5 w-5 text-[#3f2e73]" aria-hidden />
                Events Registrations
              </h6>
              {allRows.length > 0 && (
                <span className="px-3 py-1 bg-[#3f2e73]/10 text-[#3f2e73] rounded-full text-sm font-medium">
                  {allRows.length} {allRows.length === 1 ? 'Registration' : 'Registrations'}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-600">
              Manage workshop/event signups and convert entries into clients.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openAddClient()}
            disabled={allRows.length === 0}
            className="mt-4 sm:mt-0 inline-flex items-center gap-2 rounded-lg bg-[#3f2e73] px-4 py-2 text-sm font-medium text-white hover:bg-[#1d1733] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserPlus className="h-4 w-4" />
            Add Client
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, event title, or slug..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3f2e73] focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {message}
        </div>
      )}

      {loading && events.length === 0 ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-[#3f2e73]" aria-label="Loading" />
        </div>
      ) : allRows.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <p className="text-center text-gray-500 py-16 px-4">
            No registrations yet. When visitors submit the workshop form, entries appear here.
          </p>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <p className="text-center text-gray-500 py-16 px-4">
            No matching registrations found.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Registered
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRows.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 sm:px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {r.full_name || 'Unknown'}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <div className="text-sm text-gray-600">{r.email || 'No email'}</div>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <div className="text-sm text-gray-900">{r.event_title || 'Untitled event'}</div>
                      <div className="text-xs text-gray-500">{r.event_slug || '—'}</div>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <div className="text-sm text-gray-600 whitespace-nowrap">{formatWhen(r.created_at)}</div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right text-sm font-medium">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-100"
                            title="Actions"
                          >
                            <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => setViewRow(r)} className="cursor-pointer">
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setEditRow({ ...r })} className="cursor-pointer">
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setDeleteRow(r)} className="cursor-pointer text-red-600 focus:text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewRow && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#3f2e73]/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-[#3f2e73]" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-800 tracking-tight" role="heading" aria-level={1}>
                    {viewRow.full_name || 'Registration details'}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Event registration</p>
                </div>
              </div>
              <button
                onClick={() => setViewRow(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-200/80"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3" role="heading" aria-level={2}>
                  Contact
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Name</label>
                    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800">
                      {viewRow.full_name || 'Unknown'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
                    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 break-all">
                      {viewRow.email || 'Not provided'}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Phone</label>
                    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800">
                      {`${viewRow.country_code || ''} ${viewRow.phone || ''}`.trim() || 'Not provided'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3" role="heading" aria-level={2}>
                  Registration
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Event</label>
                    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800">
                      {viewRow.event_title || 'Untitled event'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Event slug</label>
                    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800">
                      {viewRow.event_slug || '—'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Registered at</label>
                    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800">
                      {formatWhen(viewRow.created_at)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Join link</label>
                    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800">
                      {viewRow.session_join_url ? (
                        <a className="text-[#3f2e73] underline break-all" href={viewRow.session_join_url} target="_blank" rel="noreferrer">
                          Open session link
                        </a>
                      ) : (
                        'Not available'
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
                <button
                  onClick={() => setViewRow(null)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editRow && (
        <div className="fixed inset-0 z-50 bg-black/40 p-4 flex items-center justify-center">
          <div className="w-full max-w-xl rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold">Edit Registration</h3><button onClick={() => setEditRow(null)}><X className="h-4 w-4" /></button></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <input className="rounded-lg border px-3 py-2 sm:col-span-2" placeholder="Full name" value={editRow.full_name || ''} onChange={(e) => setEditRow((p) => ({ ...p, full_name: e.target.value }))} />
              <input className="rounded-lg border px-3 py-2 sm:col-span-2" placeholder="Email" value={editRow.email || ''} onChange={(e) => setEditRow((p) => ({ ...p, email: e.target.value }))} />
              <input className="rounded-lg border px-3 py-2" placeholder="Country code" value={editRow.country_code || ''} onChange={(e) => setEditRow((p) => ({ ...p, country_code: e.target.value }))} />
              <input className="rounded-lg border px-3 py-2" placeholder="Phone" value={editRow.phone || ''} onChange={(e) => setEditRow((p) => ({ ...p, phone: e.target.value }))} />
              <select className="rounded-lg border px-3 py-2 sm:col-span-2" value={editRow.event_slug || ''} onChange={(e) => setEditRow((p) => ({ ...p, event_slug: e.target.value }))}>
                {eventOptions.map((o) => <option key={o.slug} value={o.slug}>{o.title} ({o.slug})</option>)}
              </select>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="rounded-md border px-3 py-2 text-sm" onClick={() => setEditRow(null)}>Cancel</button>
              <button disabled={saving} className="rounded-md bg-[#3f2e73] text-white px-3 py-2 text-sm disabled:opacity-50" onClick={saveEdit}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteRow && (
        <div className="fixed inset-0 z-50 bg-black/40 p-4 flex items-center justify-center">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold mb-2">Delete Registration</h3>
            <p className="text-sm text-gray-600">Delete <b>{deleteRow.full_name}</b> from <b>{deleteRow.event_title}</b>?</p>
            <div className="mt-4 flex justify-end gap-2">
              <button className="rounded-md border px-3 py-2 text-sm" onClick={() => setDeleteRow(null)}>Cancel</button>
              <button disabled={saving} className="rounded-md bg-red-600 text-white px-3 py-2 text-sm disabled:opacity-50" onClick={confirmDelete}>{saving ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}

      {addClientRow && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-800 tracking-tight" role="heading" aria-level={1}>
                    Add Client from Registration
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Create client account and link event</p>
                </div>
              </div>
              <button
                onClick={() => setAddClientRow(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-200/80"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3" role="heading" aria-level={2}>
                  Select registration
                </div>
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={addClientRow?.id || ''}
                  onChange={(e) => updateSelectedRegistration(e.target.value)}
                >
                  {allRows.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.full_name || 'Unknown'} - {row.email || 'No email'} ({row.event_slug || '—'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3" role="heading" aria-level={2}>
                  Client account details
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
                    <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white" value={addClientRow.email || ''} readOnly />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">First name</label>
                    <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white" value={clientForm.first_name} onChange={(e) => setClientForm((p) => ({ ...p, first_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Last name</label>
                    <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white" value={clientForm.last_name} onChange={(e) => setClientForm((p) => ({ ...p, last_name: e.target.value }))} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Assign event</label>
                    <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white" value={clientForm.event_slug} onChange={(e) => setClientForm((p) => ({ ...p, event_slug: e.target.value }))}>
                      <option value="">Select event</option>
                      {eventOptions.map((o) => <option key={o.slug} value={o.slug}>{o.title} ({o.slug})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Child name</label>
                    <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white" value={clientForm.child_name} onChange={(e) => setClientForm((p) => ({ ...p, child_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Child age</label>
                    <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white" type="number" min="0" value={clientForm.child_age} onChange={(e) => setClientForm((p) => ({ ...p, child_age: e.target.value }))} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Password</label>
                    <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white" placeholder="Minimum 8 characters" type="password" value={clientForm.password} onChange={(e) => setClientForm((p) => ({ ...p, password: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
                <button
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
                  onClick={() => setAddClientRow(null)}
                >
                  Cancel
                </button>
                <button
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50"
                  onClick={createClientFromRegistration}
                >
                  {saving ? 'Creating...' : 'Create Client'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
