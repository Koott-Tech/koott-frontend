'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Edit, Save, X, TrendingUp, Calendar, Wallet, Eye, User, MoreVertical, Filter } from 'lucide-react';
import { financeApi } from '@/lib/backendApi';
import { useNotification } from '@/contexts/NotificationContext';
import { normalizeImageUrl } from '@/utils/urlNormalizer';
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

/** Rupee-prefixed amount field for commission editing — unified focus ring and layout */
function CommissionAmountField({ id, label, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium text-slate-700 leading-snug">
        {label}
      </label>
      <div className="flex rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden transition-[box-shadow,border-color] focus-within:shadow-md focus-within:ring-2 focus-within:ring-[#025545]/25 focus-within:border-[#025545]">
        <span
          className="inline-flex items-center shrink-0 px-3 py-2.5 bg-slate-50 text-slate-600 text-sm font-semibold tabular-nums border-r border-slate-200"
          aria-hidden
        >
          ₹
        </span>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={value}
          onChange={onChange}
          className="min-w-0 flex-1 border-0 bg-transparent py-2.5 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          min={0}
          step="0.01"
          placeholder="0.00"
        />
      </div>
    </div>
  );
}

const getDoctorImageUrl = (doctor) => {
  if (!doctor) return null;
  const imageUrl =
    doctor.psychologist?.cover_image_url ||
    doctor.psychologist?.profile_picture_url ||
    doctor.cover_image_url ||
    doctor.profile_picture_url ||
    null;
  // Normalize the image URL (converts Supabase URLs to proxy URLs with signed signatures)
  return imageUrl ? normalizeImageUrl(imageUrl) : null;
};

const formatAmount = (value) => `₹${(value || 0).toLocaleString('en-IN')}`;

const PACKAGE_COMMISSION_GROUPS = [
  { key: 'package_3', label: 'Package of 3 Sessions' },
  { key: 'package_6', label: 'Package of 6 Sessions' },
  { key: 'package_9', label: 'Package of 9 Sessions' },
];

const COUPLE_PACKAGE_GROUPS = [
  { key: 'couple_package_3', label: 'Couple Package of 3 Sessions' },
];

export default function FinanceDoctors() {
  const { showError } = useNotification();
  const router = useRouter();
  const [doctors, setDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editCommissions, setEditCommissions] = useState({});
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isBookingsModalOpen, setIsBookingsModalOpen] = useState(false);
  const [bookingRows, setBookingRows] = useState([]);
  const [bookingsDoctor, setBookingsDoctor] = useState(null);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [dateRange, setDateRange] = useState(() => istCalendarMonthBounds(new Date()));

  useEffect(() => {
    loadDoctors();
  }, [dateRange]);

  const loadDoctors = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = {};
      if (hasDateRangeBounds(dateRange)) {
        params.dateFrom = formatIstCalendarYmd(dateRange.from);
        params.dateTo = formatIstCalendarYmd(dateRange.to);
      }

      /** Filter by scheduled_date — shows all sessions scheduled within the selected month */
      params.dateBasis = 'scheduled';

      const response = await financeApi.getCommissions(params);
      
      if (response.success) {
        setDoctors(response.data.commissions || []);
      } else {
        setError(response.message || 'Failed to load doctors');
      }
    } catch (err) {
      console.error('Failed to load doctors:', err);
      setError('Failed to load doctors. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (doctor) => {
    setEditingId(doctor.psychologist_id);
    const commissions = doctor.commission_amounts || {};
    const pkgComm = doctor.doctor_commission_packages || {};
    const editData = {
      individual: commissions.individual?.toString() || '',
      doctor_commission_first_session: doctor.doctor_commission_first_session?.toString() || '',
      doctor_commission_followup: doctor.doctor_commission_followup?.toString() || '',
      doctor_commission_couple: (doctor.doctor_commission_couple ?? pkgComm.couple_session ?? '')?.toString() || '',
      doctor_commission_couple_followup: (pkgComm.couple_followup ?? pkgComm.couple_session ?? '')?.toString() || '',
      doctor_commission_individual: doctor.doctor_commission_individual?.toString() || '',
      // Legacy package commissions (for backward compatibility)
      doctor_commission_first_session_package: doctor.doctor_commission_first_session_package?.toString() || '',
      doctor_commission_followup_package: doctor.doctor_commission_followup_package?.toString() || ''
    };
    
    // Add commission amounts for each package type (company commission)
    if (doctor.package_commissions) {
      doctor.package_commissions.forEach(pkg => {
        editData[pkg.type] = pkg.commission_amount?.toString() || '';
      });
    }

    [...PACKAGE_COMMISSION_GROUPS, ...COUPLE_PACKAGE_GROUPS].forEach(({ key }) => {
      if (commissions[key] !== undefined) {
        editData[key] = commissions[key]?.toString() || '';
      }
      editData[`${key}_first_session`] = (pkgComm[`${key}_first_session`] ?? '')?.toString() || '';
      editData[`${key}_followup`] = (pkgComm[`${key}_followup`] ?? '')?.toString() || '';
    });
    
    // Add package-specific doctor commissions (first_session and followup for each package)
    if (doctor.package_commissions) {
      doctor.package_commissions.forEach(pkg => {
        const packageType = pkg.type || `package_${pkg.session_count}`;
        // Get from doctor_commission_packages JSONB field if available
        const packageCommissions = doctor.doctor_commission_packages || {};
        const firstSessionKey = `${packageType}_first_session`;
        const followupKey = `${packageType}_followup`;
        
        editData[firstSessionKey] = packageCommissions[firstSessionKey]?.toString() || 
          (pkg.doctor_commission_first_session?.toString() || '');
        editData[followupKey] = packageCommissions[followupKey]?.toString() || 
          (pkg.doctor_commission_followup?.toString() || '');
      });
    }
    
    setEditCommissions(editData);
    setExpandedCards(new Set([doctor.psychologist_id])); // Expand the card
  };

  const handleSave = async (psychologistId) => {
    try {
      // Build commission amounts object (company gets)
      const commissionAmounts = {};
      const doctorCommissionFields = [
        'doctor_commission_first_session',
        'doctor_commission_followup',
        'doctor_commission_individual',
        'doctor_commission_couple',
        'doctor_commission_couple_followup',
        'doctor_commission_first_session_package',
        'doctor_commission_followup_package',
      ];
      let hasValidAmount = false;

      for (const [packageType, value] of Object.entries(editCommissions)) {
        // Skip doctor commission fields - they're handled separately
        if (
          doctorCommissionFields.includes(packageType) ||
          packageType.endsWith('_first_session') ||
          packageType.endsWith('_followup')
        ) {
          continue;
        }
        
        if (value && value.trim() !== '') {
          const amount = parseFloat(value);
          if (isNaN(amount) || amount < 0) {
            alert(`Please enter a valid commission amount for ${packageType} (≥ 0)`);
            return;
          }
          commissionAmounts[packageType] = amount;
          hasValidAmount = true;
        }
      }

      // Build request data with commission amounts and doctor commission fields
      const requestData = {
        commission_amounts: commissionAmounts
      };
      
      // Include doctor commission amounts if provided
      if (editCommissions.doctor_commission_first_session && editCommissions.doctor_commission_first_session.trim() !== '') {
        const amount = parseFloat(editCommissions.doctor_commission_first_session);
        if (isNaN(amount) || amount < 0) {
          alert('Please enter a valid doctor commission amount for first session (≥ 0)');
          return;
        }
        requestData.doctor_commission_first_session = amount;
        hasValidAmount = true;
      }
      if (editCommissions.doctor_commission_followup && editCommissions.doctor_commission_followup.trim() !== '') {
        const amount = parseFloat(editCommissions.doctor_commission_followup);
        if (isNaN(amount) || amount < 0) {
          alert('Please enter a valid doctor commission amount for follow-up package (≥ 0)');
          return;
        }
        requestData.doctor_commission_followup = amount;
        hasValidAmount = true;
      }
      if (editCommissions.doctor_commission_individual && editCommissions.doctor_commission_individual.trim() !== '') {
        const amount = parseFloat(editCommissions.doctor_commission_individual);
        if (isNaN(amount) || amount < 0) {
          alert('Please enter a valid doctor commission amount for individual session (≥ 0)');
          return;
        }
        requestData.doctor_commission_individual = amount;
        hasValidAmount = true;
      }
      // Legacy package commissions (for backward compatibility)
      if (editCommissions.doctor_commission_first_session_package && editCommissions.doctor_commission_first_session_package.trim() !== '') {
        const amount = parseFloat(editCommissions.doctor_commission_first_session_package);
        if (isNaN(amount) || amount < 0) {
          alert('Please enter a valid doctor commission amount for first session (package) (≥ 0)');
          return;
        }
        requestData.doctor_commission_first_session_package = amount;
        hasValidAmount = true;
      }
      if (editCommissions.doctor_commission_followup_package && editCommissions.doctor_commission_followup_package.trim() !== '') {
        const amount = parseFloat(editCommissions.doctor_commission_followup_package);
        if (isNaN(amount) || amount < 0) {
          alert('Please enter a valid doctor commission amount for follow-up package (full package) (≥ 0)');
          return;
        }
        requestData.doctor_commission_followup_package = amount;
        hasValidAmount = true;
      }
      
      // Package-specific doctor commissions (for each package type)
      // Start with existing keys so couple/package_3 data is never wiped on save
      const doctor = doctors.find(d => d.psychologist_id === psychologistId);
      const doctorCommissionPackages = { ...(doctor?.doctor_commission_packages || {}) };
      if (doctor && doctor.package_commissions) {
        doctor.package_commissions.forEach(pkg => {
          const packageType = pkg.type || `package_${pkg.session_count}`;
          const firstSessionKey = `${packageType}_first_session`;
          const followupKey = `${packageType}_followup`;
          
          if (editCommissions[firstSessionKey] && editCommissions[firstSessionKey].trim() !== '') {
            const amount = parseFloat(editCommissions[firstSessionKey]);
            if (isNaN(amount) || amount < 0) {
              alert(`Please enter a valid doctor commission amount for ${pkg.name || packageType} first session (≥ 0)`);
              return;
            }
            doctorCommissionPackages[firstSessionKey] = amount;
            hasValidAmount = true;
          }
          
          if (editCommissions[followupKey] && editCommissions[followupKey].trim() !== '') {
            const amount = parseFloat(editCommissions[followupKey]);
            if (isNaN(amount) || amount < 0) {
              alert(`Please enter a valid doctor commission amount for ${pkg.name || packageType} follow-up package (≥ 0)`);
              return;
            }
            doctorCommissionPackages[followupKey] = amount;
            hasValidAmount = true;
          }
        });
      }

      if (editCommissions.doctor_commission_couple && editCommissions.doctor_commission_couple.trim() !== '') {
        const amount = parseFloat(editCommissions.doctor_commission_couple);
        if (isNaN(amount) || amount < 0) {
          alert('Please enter a valid couple session commission (≥ 0)');
          return;
        }
        doctorCommissionPackages.couple_session = amount;
        hasValidAmount = true;
      }
      if (editCommissions.doctor_commission_couple_followup && editCommissions.doctor_commission_couple_followup.trim() !== '') {
        const amount = parseFloat(editCommissions.doctor_commission_couple_followup);
        if (isNaN(amount) || amount < 0) {
          alert('Please enter a valid couple follow-up commission (≥ 0)');
          return;
        }
        doctorCommissionPackages.couple_followup = amount;
        hasValidAmount = true;
      }
      [...PACKAGE_COMMISSION_GROUPS, ...COUPLE_PACKAGE_GROUPS].forEach(({ key, label }) => {
        const firstKey = `${key}_first_session`;
        const followKey = `${key}_followup`;

        if (editCommissions[firstKey] && editCommissions[firstKey].trim() !== '') {
          const amount = parseFloat(editCommissions[firstKey]);
          if (isNaN(amount) || amount < 0) {
            throw new Error(`Please enter a valid ${label} first session commission (≥ 0)`);
          }
          doctorCommissionPackages[firstKey] = amount;
          hasValidAmount = true;
        }

        if (editCommissions[followKey] && editCommissions[followKey].trim() !== '') {
          const amount = parseFloat(editCommissions[followKey]);
          if (isNaN(amount) || amount < 0) {
            throw new Error(`Please enter a valid ${label} follow-up commission (≥ 0)`);
          }
          doctorCommissionPackages[followKey] = amount;
          hasValidAmount = true;
        }
      });

      if (Object.keys(doctorCommissionPackages).length > 0) {
        requestData.doctor_commission_packages = doctorCommissionPackages;
      }

      if (!hasValidAmount) {
        alert('Please enter at least one commission amount');
        return;
      }

      const response = await financeApi.updateCommissionRate(psychologistId, requestData);

      if (response.success) {
        setEditingId(null);
        setEditCommissions({});
        setExpandedCards(new Set());
        loadDoctors();
      } else {
        alert(response.message || 'Failed to update commission amounts');
      }
    } catch (err) {
      console.error('Failed to update commission:', err);
      alert('Failed to update commission amounts. Please try again.');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditCommissions({});
    setExpandedCards(new Set());
  };

  const toggleCardExpansion = (doctorId) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(doctorId)) {
      newExpanded.delete(doctorId);
    } else {
      newExpanded.add(doctorId);
    }
    setExpandedCards(newExpanded);
  };

  const handleViewMore = (doctor) => {
    setSelectedDoctor(doctor);
    setIsDetailModalOpen(true);
  };

  const handleViewBookings = async (doctor) => {
    try {
      setBookingsDoctor(doctor);
      setIsBookingsModalOpen(true);
      setBookingsLoading(true);
      const params = {
        limit: 100,
        page: 1,
        dateBasis: 'scheduled',
      };
      if (hasDateRangeBounds(dateRange)) {
        params.dateFrom = formatIstCalendarYmd(dateRange.from);
        params.dateTo = formatIstCalendarYmd(dateRange.to);
      }
      const response = await financeApi.getDoctorBookings(doctor.psychologist_id, params);
      if (!response?.success) {
        throw new Error(response?.message || 'Failed to load bookings');
      }
      setBookingRows(response?.data?.bookings || []);
    } catch (err) {
      showError(err?.message || 'Failed to load booking rows');
      setBookingRows([]);
    } finally {
      setBookingsLoading(false);
    }
  };

  const buildDoctorProfileHref = (psychologistId) => {
    const params = new URLSearchParams();
    params.set('dateBasis', 'scheduled');
    if (hasDateRangeBounds(dateRange)) {
      const from = formatIstCalendarYmd(dateRange.from);
      const to = formatIstCalendarYmd(dateRange.to);
      if (from) params.set('dateFrom', from);
      if (to) params.set('dateTo', to);
    }
    const query = params.toString();
    return `/finance/doctors/${psychologistId}${query ? `?${query}` : ''}`;
  };

  if (isLoading && doctors.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#025545]"></div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="space-y-6">
        {/* Date Range Filter */}
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
          </div>
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {doctors.length > 0 ? (
              doctors.map((doctor) => (
                <div
                  key={doctor.psychologist_id}
                  className="bg-white border-2 border-gray-200 shadow-sm hover:shadow-md transition-all p-6 w-full rounded-lg"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center gap-6 flex-1 min-w-0">
                      <div className="w-40 shrink-0 text-sm font-semibold text-gray-900">
                        {doctor.psychologist?.first_name} {doctor.psychologist?.last_name}
                      </div>
                      <div className="flex flex-wrap items-stretch gap-y-3 text-sm min-w-0">
                        {[
                          { label: 'Total Sessions', value: doctor.total_sessions_finance ?? doctor.total_sessions ?? 0, valueClass: 'text-gray-900' },
                          { label: 'Pending', value: doctor.pending_sessions || 0, valueClass: 'text-amber-700' },
                          { label: 'Completed', value: doctor.completed_sessions || 0, valueClass: 'text-emerald-700' },
                          { label: 'Company Commission', value: formatAmount(doctor.total_commission_to_company), valueClass: 'text-sky-700' },
                          { label: 'Pending Payout', value: formatAmount(doctor.pending_payout), valueClass: 'text-orange-700' },
                          { label: 'Completed Payout', value: formatAmount(doctor.completed_payout), valueClass: 'text-green-700' },
                        ].map((item, index, arr) => (
                          <div key={item.label} className="flex items-stretch">
                            <div className="min-w-[110px] pr-4">
                              <div className="text-[11px] uppercase tracking-wide text-gray-500">{item.label}</div>
                              <div className={`mt-1 text-base font-semibold ${item.valueClass}`}>{item.value}</div>
                            </div>
                            {index < arr.length - 1 ? (
                              <div className="px-1 pr-4 flex items-center text-gray-300 text-lg font-light">|</div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 self-start lg:self-center">
                      {editingId === doctor.psychologist_id ? (
                        <>
                          <button
                            onClick={() => handleSave(doctor.psychologist_id)}
                            className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                            title="Save"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            onClick={handleCancel}
                            className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-100">
                              <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() => router.push(buildDoctorProfileHref(doctor.psychologist_id))}
                              className="cursor-pointer"
                            >
                              <User className="h-4 w-4 mr-2" />
                              Profile
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleViewMore(doctor)} className="cursor-pointer">
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewBookings(doctor)} className="cursor-pointer">
                              <Calendar className="h-4 w-4 mr-2" />
                              View Bookings
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEdit(doctor)} className="cursor-pointer">
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Commission
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>

                  {/* Commission Settings Section - Always visible when editing, expandable when viewing */}
                  {editingId === doctor.psychologist_id ? (
                    <div className="mt-5 pt-5 border-t border-slate-200">
                      <div className="text-sm font-semibold text-slate-900 mb-1">Commission settings</div>
                      <p className="text-xs text-slate-500 mb-4">
                        Amounts below are what the doctor receives; company share is calculated from listed session prices.
                      </p>
                      {/* auto-fit grid: no empty trailing columns when only individual + fallback (or few cards) */}
                      <div className="grid grid-cols-1 gap-4 lg:gap-5 md:[grid-template-columns:repeat(auto-fit,minmax(min(100%,17.5rem),1fr))]">
                        {/* Column 1: Individual Session */}
                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="text-sm font-semibold text-slate-900 mb-1">Individual session</div>
                          <div className="mb-4 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs text-slate-600">
                            List price{' '}
                            <span className="font-semibold text-slate-800">
                              ₹{doctor.individual_session_price ? doctor.individual_session_price.toLocaleString('en-IN') : 'Not set'}
                            </span>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <CommissionAmountField
                                id={`dc-${doctor.psychologist_id}-ind-first`}
                                label="First session (doctor receives)"
                                value={editCommissions.doctor_commission_first_session || ''}
                                onChange={(e) =>
                                  setEditCommissions({ ...editCommissions, doctor_commission_first_session: e.target.value })
                                }
                              />
                              {editCommissions.doctor_commission_first_session && doctor.individual_session_price > 0 && (
                                <p className="mt-1.5 text-xs text-slate-600">
                                  Company: ₹
                                  {(doctor.individual_session_price -
                                    parseFloat(editCommissions.doctor_commission_first_session || 0)).toLocaleString('en-IN')}
                                </p>
                              )}
                            </div>

                            <div>
                              <CommissionAmountField
                                id={`dc-${doctor.psychologist_id}-ind-follow`}
                                label="Follow-up (doctor receives)"
                                value={editCommissions.doctor_commission_followup || ''}
                                onChange={(e) =>
                                  setEditCommissions({ ...editCommissions, doctor_commission_followup: e.target.value })
                                }
                              />
                              {editCommissions.doctor_commission_followup && doctor.individual_session_price > 0 && (
                                <p className="mt-1.5 text-xs text-slate-600">
                                  Company: ₹
                                  {(doctor.individual_session_price -
                                    parseFloat(editCommissions.doctor_commission_followup || 0)).toLocaleString('en-IN')}
                                </p>
                              )}
                            </div>

                            <div>
                              <CommissionAmountField
                                id={`dc-${doctor.psychologist_id}-couple`}
                                label="Couple session (doctor receives)"
                                value={editCommissions.doctor_commission_couple || ''}
                                onChange={(e) =>
                                  setEditCommissions({ ...editCommissions, doctor_commission_couple: e.target.value })
                                }
                              />
                            </div>

                            <div>
                              <CommissionAmountField
                                id={`dc-${doctor.psychologist_id}-couple-followup`}
                                label="Couple follow-up (doctor receives)"
                                value={editCommissions.doctor_commission_couple_followup || ''}
                                onChange={(e) =>
                                  setEditCommissions({ ...editCommissions, doctor_commission_couple_followup: e.target.value })
                                }
                              />
                              <p className="mt-1 text-xs text-slate-400">Leave blank to use same as couple session</p>
                            </div>
                          </div>
                        </div>

                        {/* Column 2 & 3: Package Sessions */}
                        {[...PACKAGE_COMMISSION_GROUPS, ...COUPLE_PACKAGE_GROUPS].map(({ key, label }) => {
                          const firstSessionKey = `${key}_first_session`;
                          const followupKey = `${key}_followup`;
                          const firstSessionValue = editCommissions[firstSessionKey] || '';
                          const followupValue = editCommissions[followupKey] || '';
                          const companyCommissionValue = editCommissions[key] || '';

                          return (
                            <div key={key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                              <div className="text-sm font-semibold text-slate-900 mb-4">{label}</div>
                              <div className="space-y-4">
                                <CommissionAmountField
                                  id={`dc-${doctor.psychologist_id}-${key}-company`}
                                  label="Company commission"
                                  value={companyCommissionValue}
                                  onChange={(e) =>
                                    setEditCommissions({ ...editCommissions, [key]: e.target.value })
                                  }
                                />
                                <CommissionAmountField
                                  id={`dc-${doctor.psychologist_id}-${firstSessionKey}`}
                                  label="First session (doctor receives)"
                                  value={firstSessionValue}
                                  onChange={(e) =>
                                    setEditCommissions({ ...editCommissions, [firstSessionKey]: e.target.value })
                                  }
                                />
                                <CommissionAmountField
                                  id={`dc-${doctor.psychologist_id}-${followupKey}`}
                                  label="Follow-up (doctor receives)"
                                  value={followupValue}
                                  onChange={(e) =>
                                    setEditCommissions({ ...editCommissions, [followupKey]: e.target.value })
                                  }
                                />
                              </div>
                            </div>
                          );
                        })}

                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="text-sm font-semibold text-slate-900 mb-4">Legacy package fallback</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <CommissionAmountField
                              id={`dc-${doctor.psychologist_id}-pkg-first-fb`}
                              label="First session (doctor receives)"
                              value={editCommissions.doctor_commission_first_session_package || ''}
                              onChange={(e) =>
                                setEditCommissions({
                                  ...editCommissions,
                                  doctor_commission_first_session_package: e.target.value,
                                })
                              }
                            />
                            <CommissionAmountField
                              id={`dc-${doctor.psychologist_id}-pkg-follow-fb`}
                              label="Follow-up (doctor receives)"
                              value={editCommissions.doctor_commission_followup_package || ''}
                              onChange={(e) =>
                                setEditCommissions({
                                  ...editCommissions,
                                  doctor_commission_followup_package: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : expandedCards.has(doctor.psychologist_id) && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="text-sm font-semibold text-gray-900 mb-4">Commission Settings</div>
                      <div className="space-y-4">
                        {/* Individual Session Commission (Doctor Gets) */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">
                            Individual Session
                          </label>
                          <div className="bg-blue-50 p-2 rounded mb-2">
                            <div className="text-xs text-gray-600">Session Price (from Admin Profile):</div>
                            <div className="text-sm font-semibold text-gray-900">
                              ₹{doctor.individual_session_price ? doctor.individual_session_price.toLocaleString('en-IN') : 'Not Set'}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div className="bg-white border border-gray-200 rounded p-2">
                              <div className="text-xs text-gray-600">First Session (Doctor Gets)</div>
                              <div className="text-sm font-semibold text-gray-900">₹{doctor.doctor_commission_first_session || 0}</div>
                            </div>
                            <div className="bg-white border border-gray-200 rounded p-2">
                              <div className="text-xs text-gray-600">Follow-up Session (Doctor Gets)</div>
                              <div className="text-sm font-semibold text-gray-900">₹{doctor.doctor_commission_followup || 0}</div>
                            </div>
                          </div>
                        </div>

                        {/* Package Commissions (Doctor Gets) */}
                        {doctor.package_commissions && doctor.package_commissions.length > 0 && (
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">Package Commissions</label>
                            <div className="space-y-3">
                              {doctor.package_commissions.map((pkg) => (
                                <div key={pkg.type} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                  <div className="mb-3">
                                    <div className="text-sm font-medium text-gray-900 mb-1">
                                      {pkg.name || `${pkg.session_count} Session Package`}
                                    </div>
                                    <div className="bg-blue-50 p-2 rounded">
                                      <div className="text-xs text-gray-600">Full Package Price (from Admin Profile):</div>
                                      <div className="text-sm font-semibold text-gray-900">
                                        ₹{pkg.price.toLocaleString('en-IN')} (Full Package)
                                      </div>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    <div className="bg-white border border-gray-200 rounded p-2">
                                      <div className="text-xs text-gray-600">First Session (Doctor Gets)</div>
                                      <div className="text-sm font-semibold text-gray-900">₹{pkg.doctor_commission_first_session || 0}</div>
                                    </div>
                                    <div className="bg-white border border-gray-200 rounded p-2">
                                      <div className="text-xs text-gray-600">Follow-up Session (Doctor Gets)</div>
                                      <div className="text-sm font-semibold text-gray-900">₹{pkg.doctor_commission_followup || 0}</div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {(!doctor.package_commissions || doctor.package_commissions.length === 0) && (
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">Package Commissions (Fallback)</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <div className="bg-white border border-gray-200 rounded p-2">
                                <div className="text-xs text-gray-600">First Session (Doctor Gets)</div>
                                <div className="text-sm font-semibold text-gray-900">₹{doctor.doctor_commission_first_session_package || 0}</div>
                              </div>
                              <div className="bg-white border border-gray-200 rounded p-2">
                                <div className="text-xs text-gray-600">Follow-up Session (Doctor Gets)</div>
                                <div className="text-sm font-semibold text-gray-900">₹{doctor.doctor_commission_followup_package || 0}</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-white rounded-lg">
                <p className="text-gray-500">No doctors found</p>
              </div>
            )}
          </div>
        )}

        {/* Detail Modal */}
        {isDetailModalOpen && selectedDoctor && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col border border-slate-200/80">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {getDoctorImageUrl(selectedDoctor) ? (
                      <img
                        src={getDoctorImageUrl(selectedDoctor)}
                        alt={`${selectedDoctor.psychologist?.first_name} ${selectedDoctor.psychologist?.last_name}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-6 w-6 text-gray-500" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900 tracking-tight">
                      {selectedDoctor.psychologist?.first_name} {selectedDoctor.psychologist?.last_name}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{selectedDoctor.psychologist?.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Commission Settings */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Commission Settings</div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Individual - First Session (Doctor Gets)</p>
                          <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-900">
                            ₹{selectedDoctor.doctor_commission_first_session || 0}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Individual - Follow-up Session (Doctor Gets)</p>
                          <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-900">
                            ₹{selectedDoctor.doctor_commission_followup || 0}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Package - First Session (Doctor Gets)</p>
                          <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-900">
                            ₹{selectedDoctor.doctor_commission_first_session_package || 0}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Package - Follow-up Session (Doctor Gets)</p>
                          <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-900">
                            ₹{selectedDoctor.doctor_commission_followup_package || 0}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Couple Session (Doctor Gets)</p>
                          <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-900">
                            ₹{selectedDoctor.doctor_commission_couple || 0}
                          </div>
                        </div>
                        {[...PACKAGE_COMMISSION_GROUPS, ...COUPLE_PACKAGE_GROUPS].map(({ key, label }) => {
                          const pkgComm = selectedDoctor.doctor_commission_packages || {};
                          const companyComm = selectedDoctor.commission_amounts?.[key] || 0;
                          return (
                            <div key={key} className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Company</span>
                                <span className="font-medium text-slate-900">₹{companyComm || 0}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Doctor First</span>
                                <span className="font-medium text-slate-900">₹{pkgComm[`${key}_first_session`] || 0}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Doctor Follow-up</span>
                                <span className="font-medium text-slate-900">₹{pkgComm[`${key}_followup`] || 0}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Session Prices */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Session Prices</div>
                      <div className="space-y-2">
                        <div className="flex justify-between bg-white border border-slate-200 rounded-lg px-3 py-2">
                          <span className="text-xs text-slate-500">Individual:</span>
                          <span className="text-sm font-medium text-slate-900">
                            ₹{selectedDoctor.individual_session_price ? selectedDoctor.individual_session_price.toLocaleString('en-IN') : 'N/A'}
                          </span>
                        </div>
                        {selectedDoctor.package_prices && selectedDoctor.package_prices.length > 0 ? (
                          selectedDoctor.package_prices.map((pkg, idx) => (
                            <div key={idx} className="flex justify-between bg-white border border-slate-200 rounded-lg px-3 py-2">
                              <span className="text-xs text-slate-500">{pkg.session_count} Sessions:</span>
                              <span className="text-sm font-medium text-slate-900">₹{pkg.price.toLocaleString('en-IN')}</span>
                            </div>
                          ))
                        ) : (
                          <div className="flex justify-between bg-white border border-slate-200 rounded-lg px-3 py-2">
                            <span className="text-xs text-slate-500">Package:</span>
                            <span className="text-sm text-slate-400">N/A</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Session Statistics */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Session Statistics</div>
                      <div className="space-y-2">
                        <div className="flex justify-between bg-white border border-slate-200 rounded-lg px-3 py-2">
                          <span className="text-xs text-slate-500">Individual:</span>
                          <span className="text-sm font-medium text-slate-900">{selectedDoctor.individual_sessions || 0}</span>
                        </div>
                        <div className="flex justify-between bg-white border border-slate-200 rounded-lg px-3 py-2">
                          <span className="text-xs text-slate-500">Package:</span>
                          <span className="text-sm font-medium text-slate-900">{selectedDoctor.package_sessions || 0}</span>
                        </div>
                        <div className="flex justify-between bg-white border border-slate-200 rounded-lg px-3 py-2">
                          <span className="text-xs text-slate-500">Total:</span>
                          <span className="text-sm font-semibold text-slate-900">{selectedDoctor.total_sessions_finance ?? selectedDoctor.total_sessions ?? 0}</span>
                        </div>
                        <div className="flex justify-between bg-white border border-slate-200 rounded-lg px-3 py-2">
                          <span className="text-xs text-amber-600">Pending:</span>
                          <span className="text-sm font-semibold text-amber-800">{selectedDoctor.pending_sessions || 0}</span>
                        </div>
                        <div className="flex justify-between bg-white border border-slate-200 rounded-lg px-3 py-2">
                          <span className="text-xs text-emerald-600">Completed:</span>
                          <span className="text-sm font-semibold text-emerald-800">{selectedDoctor.completed_sessions || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Revenue Statistics */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Revenue Statistics</div>
                      <div className="space-y-2">
                        <div className="flex justify-between bg-white border border-slate-200 rounded-lg px-3 py-2">
                          <span className="text-xs text-slate-500">Total Revenue:</span>
                          <span className="text-sm font-medium text-slate-900">{formatAmount(selectedDoctor.total_revenue)}</span>
                        </div>
                        <div className="flex justify-between bg-white border border-slate-200 rounded-lg px-3 py-2">
                          <span className="text-xs text-orange-600">Pending Payout:</span>
                          <span className="text-sm font-medium text-orange-700">{formatAmount(selectedDoctor.pending_payout)}</span>
                        </div>
                        <div className="flex justify-between bg-white border border-slate-200 rounded-lg px-3 py-2">
                          <span className="text-xs text-green-600">Completed Payout:</span>
                          <span className="text-sm font-medium text-green-700">{formatAmount(selectedDoctor.completed_payout)}</span>
                        </div>
                        <div className="flex justify-between bg-white border border-slate-200 rounded-lg px-3 py-2">
                          <span className="text-xs text-blue-600">Company Commission:</span>
                          <span className="text-sm font-medium text-blue-700">{formatAmount(selectedDoctor.total_commission_to_company)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Monthly Breakdown */}
                  {selectedDoctor.monthly_breakdown && selectedDoctor.monthly_breakdown.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Monthly Breakdown</div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {selectedDoctor.monthly_breakdown.map((month, idx) => (
                          <div key={idx} className="bg-white border border-slate-200 rounded-lg px-4 py-3">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium text-slate-900">
                                {new Date(month.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                              </span>
                              <span className="text-sm font-semibold text-slate-900">
                                ₹{(month.total_revenue || 0).toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-500">
                              <span>Doctor Share: {formatAmount(month.to_doctor_wallet)}</span>
                              <span>Company: {formatAmount(month.commission_to_company)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                              <span>Individual: {month.individual_sessions || 0}</span>
                              <span>Package: {month.package_sessions || 0}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end px-6 py-4 border-t border-slate-200 bg-slate-50/30 flex-shrink-0">
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-4 py-2 text-[#025545] bg-white border border-[#025545]/40 rounded-lg hover:bg-[#025545]/10 transition-colors text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bookings list modal */}
        {isBookingsModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200/80">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Booked Sessions</div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {bookingsDoctor?.psychologist?.first_name} {bookingsDoctor?.psychologist?.last_name}
                  </p>
                </div>
                <button
                  onClick={() => setIsBookingsModalOpen(false)}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4 overflow-auto">
                {bookingsLoading ? (
                  <div className="py-10 text-center text-sm text-gray-500">Loading...</div>
                ) : bookingRows.length === 0 ? (
                  <div className="py-10 text-center text-sm text-gray-500">No bookings found for this doctor.</div>
                ) : (
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                        <th className="text-left px-3 py-2 font-medium">Order ID</th>
                        <th className="text-left px-3 py-2 font-medium">Client Name</th>
                        <th className="text-left px-3 py-2 font-medium">Email</th>
                        <th className="text-left px-3 py-2 font-medium">Booked At (IST)</th>
                        <th className="text-left px-3 py-2 font-medium">Session Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookingRows.map((row) => {
                        const clientName = `${row?.client?.first_name || ''} ${row?.client?.last_name || ''}`.trim() || row?.client?.child_name || '—';
                        const bookedDate = row?.booked_at
                          ? new Date(row.booked_at).toLocaleString('en-IN', {
                              timeZone: 'Asia/Kolkata',
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: true,
                            })
                          : '—';
                        const sessionDate = row?.session_date ? new Date(row.session_date).toLocaleDateString('en-IN') : '—';
                        return (
                          <tr key={row.id} className="border-b border-slate-100">
                            <td className="px-3 py-2 text-slate-700">{row?.order_id || row?.id || '—'}</td>
                            <td className="px-3 py-2 text-slate-700">{clientName}</td>
                            <td className="px-3 py-2 text-slate-700">{row?.client?.email || '—'}</td>
                            <td className="px-3 py-2 text-slate-700">{bookedDate}</td>
                            <td className="px-3 py-2 text-slate-700">{sessionDate}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
