'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, UserCheck, Mail, Phone, Edit2, X, Check, AlertCircle, Calendar, User } from 'lucide-react';
import { adminApi } from '@/lib/backendApi';
import { useNotification } from '@/contexts/NotificationContext';
import AdminManualBookingModal from '@/components/AdminManualBookingModal';
import { normalizeImageUrl } from '@/utils/urlNormalizer';

const getTherapistImageUrl = (therapist) => {
  const raw =
    therapist?.psychologist?.cover_image_url ||
    therapist?.psychologist?.profile_image_url ||
    therapist?.psychologist?.profile_picture_url ||
    null;
  return raw ? normalizeImageUrl(raw) : null;
};

function EditTherapistModal({ therapist, onClose, onSaved }) {
  const { showError, showSuccess } = useNotification();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: therapist.psychologist?.firstName || therapist.name?.split(' ')[0] || '',
    lastName: therapist.psychologist?.lastName || therapist.name?.split(' ').slice(1).join(' ') || '',
    email: therapist.psychologist?.email || therapist.email || '',
    phone: therapist.psychologist?.phone || therapist.phone || '',
    designation: therapist.psychologist?.designation || 'Psychologist',
    area_of_expertise: therapist.psychologist?.area_of_expertise || '',
    experience_years: therapist.psychologist?.experience_years || '',
    description: therapist.psychologist?.description || '',
  });

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      let r;
      if (therapist.psychologist?.id) {
        // Update existing
        r = await adminApi.updatePsychologist(therapist.psychologist.id, {
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          designation: formData.designation,
          area_of_expertise: formData.area_of_expertise,
          experience_years: formData.experience_years ? parseInt(formData.experience_years) : null,
          description: formData.description,
        });
      } else {
        // Create new
        r = await adminApi.createPsychologist({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          designation: formData.designation,
          area_of_expertise: formData.area_of_expertise,
          experience_years: formData.experience_years ? parseInt(formData.experience_years) : null,
          description: formData.description,
        });
      }

      if (!r?.success) throw new Error(r?.error || 'Failed to save profile');
      showSuccess(therapist.psychologist?.id ? 'Profile updated' : 'Profile created and linked');
      onSaved();
    } catch (err) {
      showError(err.message || 'Failed to save', 'Save Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-200/80">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Edit2 className="h-4 w-4 text-[#3f2e73]" />
            {therapist.psychologist?.id ? 'Edit Profile' : 'Link to Profile'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 space-y-1">
            <div className="text-[10px] uppercase tracking-wider font-bold text-blue-600/80">Wix Reference</div>
            <div className="text-sm font-medium text-blue-900">{therapist.name}</div>
            {therapist.email && <div className="text-xs text-blue-700/70">{therapist.email}</div>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">First Name</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#3f2e73] focus:ring-2 focus:ring-[#3f2e73]/10 outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#3f2e73] focus:ring-2 focus:ring-[#3f2e73]/10 outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Email Address</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#3f2e73] focus:ring-2 focus:ring-[#3f2e73]/10 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Phone Number</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#3f2e73] focus:ring-2 focus:ring-[#3f2e73]/10 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Designation</label>
            <input
              type="text"
              required
              value={formData.designation}
              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#3f2e73] focus:ring-2 focus:ring-[#3f2e73]/10 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Experience (Years)</label>
              <input
                type="number"
                value={formData.experience_years}
                onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#3f2e73] focus:ring-2 focus:ring-[#3f2e73]/10 outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Area of Expertise</label>
              <input
                type="text"
                value={formData.area_of_expertise}
                onChange={(e) => setFormData({ ...formData, area_of_expertise: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#3f2e73] focus:ring-2 focus:ring-[#3f2e73]/10 outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Description / Bio</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#3f2e73] focus:ring-2 focus:ring-[#3f2e73]/10 outline-none"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-2 bg-[#3f2e73] text-white px-8 py-2 rounded-xl hover:bg-[#2d2152] disabled:opacity-50 transition-all text-sm font-medium flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {therapist.psychologist?.id ? 'Update Profile' : 'Link Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function WixTherapistsPage() {
  const { showError, showSuccess } = useNotification();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [statsMeta, setStatsMeta] = useState(null);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [isManualBookingOpen, setIsManualBookingOpen] = useState(false);
  const [isAddRecordOpen, setIsAddRecordOpen] = useState(false);

  const load = async ({ silent = true } = {}) => {
    try {
      setLoading(true);
      const r = await adminApi.getWixTherapists();
      if (!r?.success) throw new Error(r?.error || 'Failed to load Wix therapists');
      setRows(r?.data?.therapists || []);
      setStatsMeta(r?.data?.meta ?? null);
      if (!silent) showSuccess('Therapists refreshed');
    } catch (e) {
      showError(e?.message || 'Failed to load Wix therapists', 'Load error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load({ silent: true });
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.name, r.email, r.psychologist?.email, r.psychologist?.firstName, r.psychologist?.lastName]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, search]);

  return (
    <div className="p-4 md:p-8 max-w-[1280px] mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-[#3f2e73]" />
          <div>
            <div className="text-xl font-semibold text-gray-900">Koott Therapists</div>
            <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
              Unique therapists inferred from synced Wix bookings.
            </p>
          </div>
        </div>
        <div className="mt-2 sm:mt-0 flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
          <button
            onClick={() => setIsManualBookingOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-[#3f2e73] text-white text-sm font-medium rounded-lg hover:bg-[#1d1733] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3f2e73] transition-colors"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Create Manual Booking
          </button>
          <button
            onClick={() => setIsAddRecordOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3f2e73] transition-colors"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Add record
          </button>
          <button
            type="button"
            onClick={() => load({ silent: false })}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search therapist name or email..."
          className="w-full max-w-sm rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#3f2e73] focus:outline-none focus:ring-2 focus:ring-[#3f2e73]/15"
        />
        <div className="text-sm text-gray-500 flex flex-col sm:flex-row sm:items-center sm:gap-3">
          <span>{filtered.length} from bookings</span>
          {typeof statsMeta?.bookingsScanned === 'number' && (
            <span className="text-slate-400">· {statsMeta.bookingsScanned} booking rows scanned</span>
          )}
          {typeof statsMeta?.psychologistsTableCount === 'number' && (
            <span className="text-slate-400">
              · {statsMeta.psychologistsTableCount} profile(s) on Doctors page (psychologists table)
            </span>
          )}
        </div>
      </div>


      <div className="flex flex-col gap-4">
        {filtered.map((row, idx) => {
          const isLinked = !!row.psychologist?.id;
          const imageUrl = getTherapistImageUrl(row);
          return (
            <div
              key={`${row.name || 'n'}-${row.email || 'e'}-${idx}`}
              className="bg-white border-2 border-gray-200 shadow-sm hover:shadow-md transition-all p-6 w-full rounded-lg"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {imageUrl ? (
                      <img src={imageUrl} alt={row.name || 'Therapist'} className="w-full h-full object-cover" />
                    ) : (
                      <User className="h-8 w-8 text-gray-500" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">{row.name || '—'}</div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                      <Mail className="h-3 w-3 text-gray-400" />
                      {row.psychologist?.email || row.email || '—'}
                    </div>
                    {(row.psychologist?.phone || row.phone) && (
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-gray-400" />
                        {row.psychologist?.phone || row.phone}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-6 md:gap-8">
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Status</div>
                    {isLinked ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 text-green-700 text-[10px] font-bold border border-green-100">
                        <Check className="h-2.5 w-2.5" /> LINKED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-100">
                        <AlertCircle className="h-2.5 w-2.5" /> UNLINKED
                      </span>
                    )}
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">G-Calendar</div>
                    {row.psychologist?.google_calendar_connected ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100" title="Google Calendar is connected and synced">
                        <Check className="h-2.5 w-2.5" /> SYNCED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-50 text-gray-500 text-[10px] font-bold border border-gray-200" title="Google Calendar is not connected">
                        NOT SYNCED
                      </span>
                    )}
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Bookings</div>
                    <div className="text-lg font-semibold text-gray-900">{row.bookingsCount || 0}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Last Booking</div>
                    <div className="text-sm font-medium text-gray-700">
                      {row.latestBookingAt ? new Date(row.latestBookingAt).toLocaleDateString('en-IN') : '—'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditing(row)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
                      isLinked
                        ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                        : 'bg-[#3f2e73] text-white hover:bg-[#2d2152]'
                    }`}
                  >
                    <Edit2 className="h-4 w-4" />
                    {isLinked ? 'Edit Profile' : 'Link Profile'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500">No Wix therapists found matching your search</p>
          </div>
        )}
      </div>

      {editing && (
        <EditTherapistModal
          therapist={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load({ silent: true });
          }}
        />
      )}

      {/* Admin Manual Booking Modal */}
      <AdminManualBookingModal
        isOpen={isManualBookingOpen}
        onClose={() => setIsManualBookingOpen(false)}
        onBookingSuccess={() => {
          showSuccess('Manual booking created successfully!');
          load({ silent: true });
        }}
      />

      {/* Add record only modal */}
      <AdminManualBookingModal
        recordOnly
        isOpen={isAddRecordOpen}
        onClose={() => setIsAddRecordOpen(false)}
        onBookingSuccess={() => {
          showSuccess('Session record added successfully.');
          load({ silent: true });
        }}
      />
    </div>
  );
}

