'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, UserCheck, Mail, Phone, Edit2, X, Check, AlertCircle, User, Plus, Filter } from 'lucide-react';
import { adminApi } from '@/lib/backendApi';
import { useNotification } from '@/contexts/NotificationContext';
import DoctorModal from '@/components/DoctorModal';
import DateRangePicker from '@/components/ui/date-range-picker';
import { hasDateRangeBounds } from '@/lib/dateRangeBounds';
import { formatIstCalendarYmd, istCalendarMonthBounds } from '@/lib/wixFinanceDates';
import { normalizeImageUrl } from '@/utils/urlNormalizer';

const getTherapistImageUrl = (therapist) => {
  const raw =
    therapist?.psychologist?.cover_image_url ||
    therapist?.psychologist?.profile_image_url ||
    therapist?.psychologist?.profile_picture_url ||
    null;
  return raw ? normalizeImageUrl(raw) : null;
};

// Mirrors the backend's name-matching key (wixPsychologistResolverService.nameMatchKey):
// strips leading titles, lowercases, and removes ALL whitespace. Two rows sharing this key
// are the same person as far as Wix-booking sync is concerned — if they point to DIFFERENT
// psychologist profiles, that's a duplicate that needs manual merging.
function nameMatchKey(value) {
  let s = String(value || '').trim().replace(/\s+/g, ' ');
  while (true) {
    const next = s.replace(/^(dr|mr|mrs|ms|miss|prof|doctor)\.?\s+/i, '');
    if (next === s) break;
    s = next;
  }
  return s.toLowerCase().replace(/\s+/g, '');
}

function EditTherapistModal({ therapist, onClose, onSaved }) {
  const { showError, showSuccess } = useNotification();
  const [loading, setLoading] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
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
        const payload = {
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          designation: formData.designation,
          area_of_expertise: formData.area_of_expertise,
          experience_years: formData.experience_years ? parseInt(formData.experience_years) : null,
          description: formData.description,
        };
        if (showPasswordReset && newPassword.trim()) {
          payload.password = newPassword.trim();
        }
        r = await adminApi.updatePsychologist(therapist.psychologist.id, payload);
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
            <Edit2 className="h-4 w-4 text-[#025545]" />
            {therapist.psychologist?.id ? 'Edit Profile' : 'Link to Profile'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
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
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#025545] focus:ring-2 focus:ring-[#025545]/10 outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#025545] focus:ring-2 focus:ring-[#025545]/10 outline-none"
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
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#025545] focus:ring-2 focus:ring-[#025545]/10 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Phone Number</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#025545] focus:ring-2 focus:ring-[#025545]/10 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Designation</label>
            <input
              type="text"
              required
              value={formData.designation}
              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#025545] focus:ring-2 focus:ring-[#025545]/10 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Experience (Years)</label>
              <input
                type="number"
                value={formData.experience_years}
                onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#025545] focus:ring-2 focus:ring-[#025545]/10 outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Area of Expertise</label>
              <input
                type="text"
                value={formData.area_of_expertise}
                onChange={(e) => setFormData({ ...formData, area_of_expertise: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#025545] focus:ring-2 focus:ring-[#025545]/10 outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Description / Bio</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#025545] focus:ring-2 focus:ring-[#025545]/10 outline-none"
            />
          </div>

          {/* Password Section */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <label className="text-xs font-semibold text-gray-700 block">Account Password</label>
            {therapist.psychologist?.id ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                  <div className="text-[11px] text-gray-600 leading-relaxed">
                    Manage the password for this therapist account.
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPasswordReset(!showPasswordReset)}
                    className="px-3 py-1.5 bg-[#025545] hover:bg-[#012f23] text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                  >
                    {showPasswordReset ? 'Cancel Reset' : 'Reset Password'}
                  </button>
                </div>
                {showPasswordReset && (
                  <div className="space-y-2 animate-in slide-in-from-top duration-200">
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#025545]/20 focus:border-[#025545] text-sm"
                      placeholder="Enter new password"
                    />
                    <p className="text-[10px] text-gray-500">
                      Leave empty to keep current password unchanged
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="px-3 py-2 border border-blue-100 rounded-lg bg-blue-50/50 text-xs text-blue-800">
                Password will be automatically set to <span className="font-semibold">MyKoott@#2026</span> upon creation.
              </div>
            )}
          </div>

          <div className="pt-4 flex gap-3 sticky bottom-0 bg-white border-t border-slate-100">
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
              className="flex-2 bg-[#025545] text-white px-8 py-2 rounded-xl hover:bg-[#012f23] disabled:opacity-50 transition-all text-sm font-medium flex items-center justify-center gap-2"
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
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState(() => istCalendarMonthBounds(new Date()));

  const handleDoctorModalSuccess = async (doctorData) => {
    try {
      await adminApi.createPsychologist(doctorData);
      showSuccess('Doctor added successfully');
      setIsDoctorModalOpen(false);
      await load({ silent: true });
    } catch (error) {
      console.error('Error creating doctor:', error);
      // Re-throw so DoctorModal shows the backend message inline.
      throw error;
    }
  };

  const load = async ({ silent = true } = {}) => {
    try {
      setLoading(true);
      const dateParams = hasDateRangeBounds(dateRange) ? {
        dateFrom: formatIstCalendarYmd(dateRange.from),
        dateTo: formatIstCalendarYmd(dateRange.to),
      } : {};
      const r = await adminApi.getWixTherapists(dateParams);
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

  // Reload whenever the date range changes (initial mount included).
  useEffect(() => {
    load({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.name, r.email, r.psychologist?.email, r.psychologist?.firstName, r.psychologist?.lastName]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, search]);

  // Duplicate-profile detector: group all therapist rows (regardless of the active
  // search/date filters) by the same name-matching key the backend uses to link Wix
  // bookings to a psychologist. If a group has rows pointing at more than one DISTINCT
  // psychologist id (or an unlinked row alongside a linked one), that's a duplicate that
  // needs manual merging — flag it so ops can catch it without needing dev access.
  const duplicateKeys = useMemo(() => {
    const byKey = new Map();
    rows.forEach((r) => {
      const key = nameMatchKey(r.name);
      if (!key) return;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(r);
    });
    const flagged = new Map(); // key -> array of rows
    byKey.forEach((group, key) => {
      const distinctPsychIds = new Set(group.map((r) => r.psychologist?.id || `__unlinked_${r.email || r.name}`));
      if (distinctPsychIds.size > 1) flagged.set(key, group);
    });
    return flagged;
  }, [rows]);

  const duplicateGroupList = useMemo(() => Array.from(duplicateKeys.values()), [duplicateKeys]);

  return (
    <div className="p-4 md:p-8 max-w-[1280px] mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-[#025545]" />
          <div>
            <div className="text-xl font-semibold text-gray-900">MyKoott Therapists</div>
            <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
              Unique therapists inferred from synced Wix bookings.
            </p>
          </div>
        </div>
        <div className="mt-2 sm:mt-0 flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
          <button
            onClick={() => setIsDoctorModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-[#025545] text-white text-sm font-medium rounded-lg hover:bg-[#012f23] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#025545] transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Doctor
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

      {/* Duplicate-profile warning — catches the same "Rajina RS" vs "Rajina R S" style
          split-profile bug without needing a developer to check the database. */}
      {duplicateGroupList.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-amber-800">
                Possible duplicate therapist profile{duplicateGroupList.length > 1 ? 's' : ''} found
              </div>
              <p className="text-xs text-amber-700 mt-0.5">
                These names look like the same person but are linked to different (or no) doctor profiles.
                Wix bookings could be splitting across them — one may be missing calendar sync, email, or phone.
                Ask a developer to merge these, or make sure any new booking uses the exact spelling of the correct one.
              </p>
              <div className="mt-2 space-y-1.5">
                {duplicateGroupList.map((group, gi) => (
                  <div key={gi} className="text-xs text-amber-800 bg-white/60 rounded px-2 py-1.5 border border-amber-100">
                    {group.map((r, ri) => (
                      <span key={ri}>
                        {ri > 0 && <span className="text-amber-400 mx-1">vs</span>}
                        <span className="font-semibold">&ldquo;{r.name}&rdquo;</span>
                        {' '}
                        {r.psychologist?.id ? (
                          <span className="text-emerald-700">(linked{r.psychologist?.google_calendar_connected ? ', calendar synced' : ', NO calendar'})</span>
                        ) : (
                          <span className="text-red-600">(not linked to any doctor profile)</span>
                        )}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Date Range Filter — same component/behavior as the Bookings page. */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
        <div className="flex flex-col gap-4 md:flex-row md:flex-wrap items-start md:items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Date Range:</span>
          </div>
          <DateRangePicker
            selectedRange={dateRange}
            onSelect={setDateRange}
          />
          <span className="md:ml-auto text-xs text-gray-400">
            {filtered.length} therapist{filtered.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search therapist name or email..."
          className="w-full max-w-sm rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#025545] focus:outline-none focus:ring-2 focus:ring-[#025545]/15"
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
          const isDuplicateRow = duplicateKeys.has(nameMatchKey(row.name));
          return (
            <div
              key={`${row.name || 'n'}-${row.email || 'e'}-${idx}`}
              className={`bg-white border-2 shadow-sm hover:shadow-md transition-all p-6 w-full rounded-lg ${isDuplicateRow ? 'border-amber-300' : 'border-gray-200'}`}
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
                    <div className="text-sm font-semibold text-gray-900 truncate flex items-center gap-2">
                      {row.name || '—'}
                      {isDuplicateRow && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[9px] font-bold border border-amber-200 shrink-0">
                          <AlertCircle className="h-2.5 w-2.5" /> POSSIBLE DUPLICATE
                        </span>
                      )}
                    </div>
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
                        : 'bg-[#025545] text-white hover:bg-[#012f23]'
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

      {/* Add Doctor Modal (same as Doctors page) */}
      {isDoctorModalOpen && (
        <DoctorModal
          isOpen={isDoctorModalOpen}
          onClose={() => setIsDoctorModalOpen(false)}
          onSave={handleDoctorModalSuccess}
          doctor={null}
          mode="add"
        />
      )}
    </div>
  );
}

