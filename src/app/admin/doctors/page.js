'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  UserCheck, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Search,
  Filter,
  Clock,
  Calendar,
  GripVertical,
  MoreVertical,
  Check,
  ClipboardList
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { adminApi } from '@/lib/backendApi';
import DoctorModal from '@/components/DoctorModal';
import { useNotification } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeImageUrl } from '@/utils/urlNormalizer';
import { isChildSpecialistProfile, specialistCategoryLabel } from '@/lib/doctorSpecialistProfile';

const getDoctorImageUrl = (doctor) => {
  if (!doctor) return null;

  const possibleFields = [
    doctor.profile_image_url,
    doctor.cover_image_url,
    doctor.profile_picture_url,
    doctor.profile_image,
    doctor.photo_url,
    doctor.avatar_url,
    doctor.image_url,
    doctor.image,
  ];

  for (const field of possibleFields) {
    if (typeof field === 'string' && field.trim()) {
      // Normalize the image URL (converts Supabase URLs to proxy URLs with signed signatures)
      return normalizeImageUrl(field);
    }
  }

  if (doctor.photos && Array.isArray(doctor.photos) && doctor.photos.length > 0) {
    const photo = doctor.photos.find(Boolean);
    if (photo) {
      return normalizeImageUrl(photo);
    }
  }

  if (doctor.media && doctor.media.profile && doctor.media.profile.url) {
    return normalizeImageUrl(doctor.media.profile.url);
  }

  return null;
};

const formatTimeSlotLabel = (slot) => {
  if (typeof slot === 'string') return slot;
  if (slot && typeof slot === 'object') {
    if (slot.displayTime) return slot.displayTime;
    if (slot.time) return slot.time;
  }
  return String(slot ?? '');
};

const parseTimeStringToMinutes = (timeLabel) => {
  if (!timeLabel) return Number.POSITIVE_INFINITY;
  const trimmed = timeLabel.trim();
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const period = match12[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    return hours * 60 + minutes;
  }
  return Number.POSITIVE_INFINITY;
};

const sortTimeSlotsChronologically = (slots = []) => {
  return [...slots]
    .sort((a, b) => parseTimeStringToMinutes(formatTimeSlotLabel(a)) - parseTimeStringToMinutes(formatTimeSlotLabel(b)))
    .map(formatTimeSlotLabel);
};

const formatCurrency = (value) => {
  const number = Number(value || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: Number.isInteger(number) ? 0 : 2,
  }).format(Number.isFinite(number) ? number : 0);
};

const formatDisplayDate = (value) => {
  if (!value) return 'Not scheduled';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const titleCase = (value) => String(value || '—')
  .replace(/[_-]+/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const statusBadgeClass = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'completed') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (['booked', 'scheduled', 'confirmed', 'rescheduled', 'reschedule_requested'].includes(normalized)) {
    return 'bg-blue-50 text-blue-700 border-blue-200';
  }
  if (['cancelled', 'canceled', 'deleted', 'refunded'].includes(normalized)) {
    return 'bg-red-50 text-red-700 border-red-200';
  }
  if (['no_show', 'no-show'].includes(normalized)) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
};

export default function DoctorsPage() {
  const { showError, showSuccess } = useNotification();
  const { user, isAuthenticated, hasRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [doctors, setDoctors] = useState([]);
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('all');
  const [isFullProfileOpen, setIsFullProfileOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);
  const [isBookingDetailsOpen, setIsBookingDetailsOpen] = useState(false);
  const [bookingDetailsDoctor, setBookingDetailsDoctor] = useState(null);
  const [bookingDetails, setBookingDetails] = useState(null);
  const [isBookingDetailsLoading, setIsBookingDetailsLoading] = useState(false);
  const [bookingStatusFilter, setBookingStatusFilter] = useState('all');

  useEffect(() => {
    // Check authentication and role
    if (!authLoading) {
      if (!isAuthenticated()) {
        console.log('User not authenticated, redirecting to home');
        router.push('/');
        return;
      }
      
      if (!hasRole('admin') && !hasRole('superadmin')) {
        console.log('User does not have admin privileges, redirecting to profile');
        router.push('/profile');
        return;
      }
      
      // User is authenticated and has admin role, load doctors data
      loadDoctors();
    }
  }, [authLoading, isAuthenticated, hasRole, router]);

  const loadDoctors = async () => {
    try {
      setIsLoading(true);
      // console.log('Loading psychologists directly from psychologists table...');
      
      // Use the dedicated psychologists endpoint
      const response = await adminApi.getPsychologists();
      
      // Avoid logging entire doctor objects in admin console for privacy and performance
      // console.log('API Response OK');
      
      if (response && response.success && response.data) {
        // Backend returns psychologists as an array directly in data
        // Handle both formats: response.data (array) or response.data.users (array)
        const doctorsData = Array.isArray(response.data) 
          ? response.data 
          : (response.data.users || []);
        
        console.log('📊 Doctors loaded:', doctorsData.length, 'doctors');
        setDoctors(doctorsData);
      } else {
        console.warn('⚠️ Invalid response structure:', response);
        setDoctors([]);
      }
    } catch (error) {
      console.error('Failed to load doctors:', error);
      
      // Check if it's an authentication error
      if (error.message && (error.message.includes('401') || error.message.includes('unauthorized') || error.message.includes('token'))) {
        console.log('Authentication error detected, redirecting to home');
        router.push('/');
        return;
      }
      
      showError('Failed to load doctors', 'Load Error');
      setDoctors([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDoctor = () => {
    setEditingDoctor(null);
    setIsDoctorModalOpen(true);
  };

  const handleEditDoctor = (doctor) => {
    setEditingDoctor(doctor);
    setIsDoctorModalOpen(true);
  };

  const handleDeleteDoctor = async (doctor) => {
    if (!confirm(`Are you sure you want to delete Dr. ${doctor.name || doctor.email}?`)) {
      return;
    }

    try {
      const deleteId = doctor.psychologist_id || doctor.id;
      await adminApi.deletePsychologist(deleteId);
      showSuccess('Doctor deleted successfully');
      loadDoctors();
    } catch (error) {
      console.error('Error deleting doctor:', error);
      showError('Failed to delete doctor', 'Delete Error');
    }
  };

  const handleUpdateAllAvailability = async () => {
    if (!confirm('This will add default availability (8 AM - 10 PM for 3 weeks) to ALL existing psychologists. Continue?')) {
      return;
    }

    try {
      showSuccess('Updating availability for all psychologists...', 'Processing');
      const response = await adminApi.updateAllPsychologistsAvailability();
      if (response && response.success) {
        showSuccess(`Successfully updated ${response.data?.updated || 0} psychologists with default availability`, 'Success');
      } else {
        showError(response?.data?.message || 'Failed to update availability', 'Update Error');
      }
    } catch (error) {
      console.error('Error updating all psychologists availability:', error);
      showError('Failed to update availability for all psychologists', 'Update Error');
    }
  };

  const openFullProfile = (doctor) => {
    setSelectedDoctor(doctor);
    setIsFullProfileOpen(true);
  };

  const loadBookingDetails = async (doctor, status = bookingStatusFilter) => {
    if (!doctor) return;

    const doctorId = doctor.psychologist_id || doctor.id;
    if (!doctorId) {
      showError('Doctor ID is missing', 'Booking Details Error');
      return;
    }

    try {
      setIsBookingDetailsLoading(true);
      const response = await adminApi.getPsychologistBookingDetails(doctorId, {
        page: 1,
        limit: 100,
        status,
      });

      if (response?.success) {
        setBookingDetails(response.data || null);
      } else {
        setBookingDetails(null);
        showError(response?.message || 'Failed to load booking details', 'Booking Details Error');
      }
    } catch (error) {
      console.error('Failed to load booking details:', error);
      setBookingDetails(null);
      showError(error?.message || 'Failed to load booking details', 'Booking Details Error');
    } finally {
      setIsBookingDetailsLoading(false);
    }
  };

  const openBookingDetails = (doctor) => {
    setBookingDetailsDoctor(doctor);
    setBookingDetails(null);
    setBookingStatusFilter('all');
    setIsBookingDetailsOpen(true);
    loadBookingDetails(doctor, 'all');
  };

  const closeBookingDetails = () => {
    setIsBookingDetailsOpen(false);
    setBookingDetailsDoctor(null);
    setBookingDetails(null);
    setBookingStatusFilter('all');
  };

  const handleBookingStatusChange = (status) => {
    setBookingStatusFilter(status);
    loadBookingDetails(bookingDetailsDoctor, status);
  };

  const handleDoctorModalClose = () => {
    setIsDoctorModalOpen(false);
    setEditingDoctor(null);
  };

  const handleDoctorModalSuccess = async (doctorData) => {
    try {
      if (editingDoctor) {
        // Update existing doctor
        const deleteId = editingDoctor.psychologist_id || editingDoctor.id;
        await adminApi.updatePsychologist(deleteId, doctorData);
        showSuccess('Doctor updated successfully');
      } else {
        // Create new doctor
        await adminApi.createPsychologist(doctorData);
        showSuccess('Doctor added successfully');
      }
      
      handleDoctorModalClose();
      console.log('Refreshing doctors data after save...');
      await loadDoctors(); // Wait for the data to load
      console.log('Doctors data refreshed');
    } catch (error) {
      console.error('Error saving doctor:', error);
      const message = error?.message || 'Failed to save doctor';
      showError(message, 'Save Error');
      // Re-throw so DoctorModal can show the same backend message inline.
      throw error;
    }
  };

  // Drag and drop handlers (only the grip handle starts the drag)
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    const card = e.currentTarget.closest('[data-doctor-card]');
    if (card) card.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    document.querySelectorAll('[data-doctor-card]').forEach((el) => { el.style.opacity = '1'; });
    setDraggedIndex(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    // Work with the full doctors list, not filtered
    const newDoctors = [...doctors];
    
    // Find the actual indices in the full doctors array
    const draggedDoctorInFiltered = filteredDoctors[draggedIndex];
    const dropDoctorInFiltered = filteredDoctors[dropIndex];
    
    const draggedIndexInFull = newDoctors.findIndex(d => d.id === draggedDoctorInFiltered.id);
    const dropIndexInFull = newDoctors.findIndex(d => d.id === dropDoctorInFiltered.id);
    
    if (draggedIndexInFull === -1 || dropIndexInFull === -1) {
      setDraggedIndex(null);
      return;
    }

    // Reorder in the full doctors array
    const draggedDoctor = newDoctors[draggedIndexInFull];
    newDoctors.splice(draggedIndexInFull, 1);
    newDoctors.splice(dropIndexInFull, 0, draggedDoctor);

    // Update display_order for all doctors based on their new position (sequential: 1, 2, 3...)
    setIsUpdatingOrder(true);
    try {
      const updatePromises = newDoctors.map((doctor, index) => {
        const newOrder = index + 1; // Sequential order starting from 1
        const doctorId = doctor.psychologist_id || doctor.id;
        // Always update to ensure sequential ordering without gaps or duplicates
        return adminApi.updatePsychologist(doctorId, { display_order: newOrder });
      });

      await Promise.all(updatePromises);
      showSuccess('Doctor order updated successfully');
      await loadDoctors(); // Reload to get updated order
    } catch (error) {
      console.error('Error updating doctor order:', error);
      showError('Failed to update doctor order', 'Update Error');
      await loadDoctors(); // Reload to revert changes
    } finally {
      setIsUpdatingOrder(false);
      setDraggedIndex(null);
    }
  };


  const filteredDoctors = doctors.filter(doctor => {
    const fullName = doctor.name?.toLowerCase() || '';
    const email = doctor.email?.toLowerCase() || '';
    
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) ||
                         email.includes(searchTerm.toLowerCase());
    
    const matchesSpecialty = filterSpecialty === 'all' || 
                            (doctor.area_of_expertise && Array.isArray(doctor.area_of_expertise) && 
                             doctor.area_of_expertise.includes(filterSpecialty));
    
    return matchesSearch && matchesSpecialty;
  });

  const specialties = [...new Set(doctors.flatMap(d => d.area_of_expertise || []).filter(Boolean))];

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#025545]"></div>
      </div>
    );
  }

  // Show loading while checking authentication or loading data
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#025545]"></div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h6>Doctors Management</h6>
          <p className="mt-1 text-sm text-gray-600">
            Manage psychologist profiles.
          </p>
          <p className="mt-2 text-xs text-gray-500">{doctors.length} profile(s) total.</p>
        </div>
        <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-2">
        <button
          onClick={handleAddDoctor}
            className="inline-flex items-center px-4 py-2 bg-[#025545] text-white rounded-lg hover:bg-[#012f23] transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Doctor
        </button>
          <button
            onClick={handleUpdateAllAvailability}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            title="Add default availability (8 AM - 10 PM for 3 weeks) to all existing psychologists"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Update All Availability
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#025545] focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={filterSpecialty}
              onChange={(e) => setFilterSpecialty(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#025545] focus:border-transparent"
            >
              <option value="all">All Specialties</option>
              {specialties.map(specialty => (
                <option key={specialty} value={specialty}>{specialty}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Doctors List */}
      {(searchTerm || filterSpecialty !== 'all') && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
          <p>⚠️ Drag and drop reordering works with the full list. Clear filters to see all doctors in order.</p>
        </div>
      )}
      <div className="flex flex-col gap-4">
        {filteredDoctors.map((doctor, filteredIndex) => {
          // Find the position in the full doctors array for accurate order number
          const fullIndex = doctors.findIndex(d => d.id === doctor.id);
          const displayOrder = doctor.display_order !== null && doctor.display_order !== undefined 
            ? doctor.display_order 
            : (fullIndex >= 0 ? fullIndex + 1 : filteredIndex + 1);
          const isDragging = draggedIndex === filteredIndex;
          
          return (
          <div
            key={doctor.id}
              data-doctor-card
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, filteredIndex)}
              className={`bg-white border-2 transition-all p-6 w-full rounded-[10px] ${
                isDragging 
                  ? 'opacity-50 border-[#025545] shadow-lg' 
                  : 'border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300'
              } ${isUpdatingOrder ? 'opacity-60 pointer-events-none' : ''}`}
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-4">
                  {/* Order Number and Drag Handle – only this area is draggable */}
                  <div className="flex flex-col items-center gap-2 flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-[#025545]/10 flex items-center justify-center border-2 border-[#025545]/40">
                      <span className="text-[#025545] font-bold text-base">{displayOrder}</span>
                    </div>
                    <div
                      draggable={!isUpdatingOrder}
                      onDragStart={(e) => handleDragStart(e, filteredIndex)}
                      onDragEnd={handleDragEnd}
                      className="p-2 rounded border-2 border-dashed border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100 transition-colors cursor-grab active:cursor-grabbing touch-none select-none"
                      title="Drag to reorder"
                    >
                      <GripVertical className="h-5 w-5 text-gray-500" />
                    </div>
                  </div>
                  
                <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {getDoctorImageUrl(doctor) ? (
                    <img
                      src={getDoctorImageUrl(doctor)}
                      alt={doctor.name || 'Doctor photo'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserCheck className="h-6 w-6 text-gray-500" />
                )}
            </div>

                <div className="flex-1">
                  <h6 className="text-gray-900" style={{ fontSize: '16px', fontWeight: 600 }}>
                    {doctor.name || 'No Name'}
                  </h6>
                  <p className="text-sm text-gray-600 mt-1">{doctor.email}</p>
                  <div className="mt-3 flex items-center gap-4 flex-wrap">
                    <div className="text-sm flex items-center gap-3">
                      {doctor.active === false ? (
                        <span className="flex items-center text-red-600">
                          <Clock className="h-4 w-4 mr-2" />
                          Inactive - Not available for sessions
                        </span>
                      ) : doctor.availability && doctor.availability.length > 0 ? (
                        <span className="flex items-center text-green-600">
                          <Clock className="h-4 w-4 mr-2" />
                          Available for sessions
                        </span>
                      ) : null}
                      {(doctor.active === false || (doctor.availability && doctor.availability.length > 0)) && <span className="text-gray-400">·</span>}
                      {doctor.google_calendar_connected ? (
                        <span className="text-blue-600 text-sm font-medium flex items-center gap-1">
                          <Check className="h-3 w-3" /> G-Calendar SYNCED
                        </span>
                      ) : (
                        <span className="text-gray-500 text-sm">Calendar not connected</span>
                      )}
                    </div>
                    {/* Active Toggle */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600">Active:</span>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const doctorId = doctor.psychologist_id || doctor.id;
                          const newActiveStatus = !(doctor.active !== false); // Default to true if undefined
                          
                          // Save previous state for potential revert
                          const previousDoctors = [...doctors];
                          
                          // Optimistically update UI immediately
                          setDoctors(prevDoctors => 
                            prevDoctors.map(d => 
                              d.id === doctor.id ? { ...d, active: newActiveStatus } : d
                            )
                          );
                          
                          try {
                            await adminApi.updatePsychologist(doctorId, { active: newActiveStatus });
                            // No success popup - just update silently
                          } catch (error) {
                            console.error('Error updating active status:', error);
                            // Revert on error
                            setDoctors(previousDoctors);
                            showError('Failed to update active status', 'Update Error');
                          }
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          doctor.active !== false ? 'bg-green-600' : 'bg-gray-300'
                        }`}
                        role="switch"
                        aria-checked={doctor.active !== false}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            doctor.active !== false ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span className={`text-xs ${doctor.active !== false ? 'text-green-600' : 'text-gray-500'}`}>
                        {doctor.active !== false ? 'On' : 'Off'}
                      </span>
                    </div>
                  </div>
                </div>
            </div>

              <div className="flex flex-wrap justify-start md:justify-end gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button 
                    onClick={(e) => e.stopPropagation()}
                    className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-100"
                  >
                    <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openFullProfile(doctor); }} className="cursor-pointer">
                    <Eye className="h-4 w-4 mr-2" />
                    View Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openBookingDetails(doctor); }} className="cursor-pointer">
                    <ClipboardList className="h-4 w-4 mr-2" />
                    View Booking Details
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditDoctor(doctor); }} className="cursor-pointer">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={(e) => { e.stopPropagation(); handleDeleteDoctor(doctor); }} 
                    className="cursor-pointer text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredDoctors.length === 0 && (
        <div className="text-center py-12">
          <UserCheck className="mx-auto h-12 w-12 text-gray-400" />
          <h6>No doctors found</h6>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || filterSpecialty !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by adding your first doctor.'
            }
          </p>
          {!searchTerm && filterSpecialty === 'all' && (
            <div className="mt-6">
              <button
                onClick={handleAddDoctor}
                className="inline-flex items-center px-4 py-2 bg-[#025545] text-white rounded-lg hover:bg-[#012f23] transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Doctor
              </button>
            </div>
          )}
        </div>
      )}

      {/* Doctor Modal */}
      {isDoctorModalOpen && (
        <DoctorModal
          isOpen={isDoctorModalOpen}
          onClose={handleDoctorModalClose}
          onSave={handleDoctorModalSuccess}
          doctor={editingDoctor}
          mode={editingDoctor ? 'edit' : 'add'}
        />
      )}

      {/* Booking Details Modal - loaded only from the action menu */}
      {isBookingDetailsOpen && bookingDetailsDoctor && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#025545]/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {getDoctorImageUrl(bookingDetailsDoctor) ? (
                    <img
                      src={getDoctorImageUrl(bookingDetailsDoctor)}
                      alt={bookingDetailsDoctor.name || bookingDetailsDoctor.email}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ClipboardList className="w-5 h-5 text-[#025545]" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-800 tracking-tight" role="heading" aria-level={1}>
                    Booking Details — {bookingDetails?.psychologist?.name || bookingDetailsDoctor.name || bookingDetailsDoctor.email}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {bookingDetails?.psychologist?.email || bookingDetailsDoctor.email || 'No email'}
                  </p>
                </div>
              </div>
              <button
                onClick={closeBookingDetails}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-200/80"
                aria-label="Close booking details"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              {isBookingDetailsLoading && !bookingDetails ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#025545]"></div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                    {[
                      ['Total Sessions', bookingDetails?.summary?.total ?? 0, 'text-slate-900'],
                      ['Completed', bookingDetails?.summary?.completed ?? 0, 'text-emerald-700'],
                      ['Upcoming / Active', bookingDetails?.summary?.upcoming ?? 0, 'text-blue-700'],
                      ['Cancelled / Refunded', bookingDetails?.summary?.void ?? 0, 'text-red-700'],
                      ['Package Rows', bookingDetails?.summary?.package_sessions ?? 0, 'text-purple-700'],
                      ['Completed Amount', formatCurrency(bookingDetails?.summary?.completed_amount ?? 0), 'text-[#025545]'],
                    ].map(([label, value, color]) => (
                      <div key={label} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                        <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">{label}</p>
                        <p className={`mt-1 text-lg font-bold ${color}`}>{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">Therapist sessions</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Loaded only for this selected therapist. Showing {bookingDetails?.bookings?.length || 0}
                        {bookingDetails?.pagination?.total ? ` of ${bookingDetails.pagination.total}` : ''} rows.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</label>
                      <select
                        value={bookingStatusFilter}
                        onChange={(e) => handleBookingStatusChange(e.target.value)}
                        disabled={isBookingDetailsLoading}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#025545] focus:border-transparent disabled:bg-slate-100"
                      >
                        <option value="all">All</option>
                        <option value="booked">Booked</option>
                        <option value="rescheduled">Rescheduled</option>
                        <option value="completed">Completed</option>
                        <option value="no_show">No show</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="refunded">Refunded</option>
                      </select>
                    </div>
                  </div>

                  {isBookingDetailsLoading && (
                    <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                      Refreshing booking details…
                    </div>
                  )}

                  {bookingDetails?.bookings?.length > 0 ? (
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="hidden lg:grid grid-cols-[1.2fr_1.3fr_1fr_1fr_0.8fr_1fr] gap-3 bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <div>Session</div>
                        <div>Client</div>
                        <div>Type / Package</div>
                        <div>Status</div>
                        <div>Amount</div>
                        <div>Booked At</div>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {bookingDetails.bookings.map((session) => {
                          const client = session.client || {};
                          const clientName = `${client.first_name || ''} ${client.last_name || ''}`.trim()
                            || client.child_name
                            || 'Unknown client';
                          const clientEmail = client.user?.email || client.email || 'No email';
                          const packageNumber = session.package_session_number || null;
                          const packageTotal = session.session_count || null;
                          const amount = session.amount ?? session.price ?? 0;

                          return (
                            <div key={session.id} className="grid grid-cols-1 lg:grid-cols-[1.2fr_1.3fr_1fr_1fr_0.8fr_1fr] gap-3 px-4 py-4 text-sm">
                              <div>
                                <p className="font-semibold text-slate-900">
                                  {formatDisplayDate(session.scheduled_date)}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">{session.scheduled_time || 'No time'}</p>
                                <p className="text-[11px] text-slate-400 mt-1 font-mono">ID: {session.id}</p>
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800">{clientName}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{clientEmail}</p>
                                {client.phone_number ? (
                                  <p className="text-xs text-slate-400 mt-0.5">{client.phone_number}</p>
                                ) : null}
                              </div>
                              <div>
                                <p className="font-medium text-slate-800">{titleCase(session.session_type)}</p>
                                {packageNumber || Number(packageTotal) > 1 ? (
                                  <p className="inline-flex mt-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold">
                                    Package {packageNumber || '—'} / {packageTotal || '—'}
                                  </p>
                                ) : (
                                  <p className="text-xs text-slate-500 mt-1">Single session</p>
                                )}
                                {session.source ? (
                                  <p className="text-[11px] text-slate-400 mt-1">Source: {titleCase(session.source)}</p>
                                ) : null}
                              </div>
                              <div>
                                <span className={`inline-flex px-2.5 py-1 rounded-full border text-xs font-semibold ${statusBadgeClass(session.status)}`}>
                                  {titleCase(session.status)}
                                </span>
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{formatCurrency(amount)}</p>
                              </div>
                              <div>
                                <p className="text-slate-700">{formatDateTime(session.booking_created_at || session.created_at)}</p>
                                {session.wix_order_number ? (
                                  <p className="text-xs text-slate-400 mt-1">Order: {session.wix_order_number}</p>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 rounded-xl border border-dashed border-slate-300 bg-slate-50/70">
                      <ClipboardList className="mx-auto h-10 w-10 text-slate-400" />
                      <p className="mt-3 text-sm font-semibold text-slate-700">No booking details found</p>
                      <p className="mt-1 text-xs text-slate-500">Try another status filter or check this therapist later.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full Profile Modal (View) - matches Users page design */}
      {isFullProfileOpen && selectedDoctor && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#025545]/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {getDoctorImageUrl(selectedDoctor) ? (
                    <img
                      src={getDoctorImageUrl(selectedDoctor)}
                      alt={selectedDoctor.name || selectedDoctor.email}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserCheck className="w-5 h-5 text-[#025545]" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-800 tracking-tight" role="heading" aria-level={1}>
                    {selectedDoctor.name ||
                      (selectedDoctor.first_name && selectedDoctor.last_name
                        ? `${selectedDoctor.first_name} ${selectedDoctor.last_name}`.trim()
                        : selectedDoctor.psychologist?.first_name && selectedDoctor.psychologist?.last_name
                          ? `${selectedDoctor.psychologist.first_name} ${selectedDoctor.psychologist.last_name}`.trim()
                          : selectedDoctor.email?.split('@')[0] || 'Doctor Profile')}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 capitalize">{selectedDoctor.role || selectedDoctor.specialty || 'Psychologist'}</p>
                </div>
              </div>
              <button
                onClick={() => setIsFullProfileOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-200/80"
                aria-label="Close modal"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content - labels outside, data in input-style boxes */}
            <div className="p-6 space-y-5">
              {/* Basic Information */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3" role="heading" aria-level={2}>
                  Basic Information
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">ID</label>
                    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 font-mono">
                      {selectedDoctor.psychologist_id ?? selectedDoctor.id ?? '—'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Name</label>
                    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800">
                      {selectedDoctor.name || (selectedDoctor.first_name && selectedDoctor.last_name ? `${selectedDoctor.first_name} ${selectedDoctor.last_name}`.trim() : selectedDoctor.psychologist ? `${selectedDoctor.psychologist.first_name || ''} ${selectedDoctor.psychologist.last_name || ''}`.trim() : 'Not provided') || 'Not provided'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
                    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800">
                      {selectedDoctor.email || selectedDoctor.psychologist?.email || 'Not provided'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Specialty</label>
                    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800">
                      {selectedDoctor.specialty || 'Not specified'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Designation</label>
                    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800">
                      {selectedDoctor.designation || 'Not specified'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Experience</label>
                    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800">
                      {selectedDoctor.experience_years ? `${selectedDoctor.experience_years} years` : 'Not specified'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Individual Session Price</label>
                    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800">
                      {(() => {
                        const indiv = selectedDoctor.price ?? selectedDoctor.individual_session_price;
                        return indiv != null && String(indiv).trim() !== '' ? `₹${indiv}` : 'Not set';
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Specialist pricing — same rules as public booking; DB may have pricing JSON before category is set */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3" role="heading" aria-level={2}>
                  Specialist pricing
                </div>
                <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 mb-3">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</span>
                  <p className="mt-1">{specialistCategoryLabel(selectedDoctor)}</p>
                </div>
                {isChildSpecialistProfile(selectedDoctor) && selectedDoctor.child_specialist_pricing?.initial && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Initial session</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        ['parent_only', 'Parent only'],
                        ['child_only', 'Child only'],
                        ['family', 'Family'],
                      ].map(([key, label]) => {
                        const cell = selectedDoctor.child_specialist_pricing.initial[key];
                        const price = cell?.price;
                        return (
                          <div key={key} className="bg-white border border-slate-200 rounded-lg p-3 text-sm">
                            <div className="text-xs text-slate-500">{label}</div>
                            <div className="font-semibold text-slate-900 mt-1">
                              {price != null && price !== '' ? `₹${price}` : '—'}
                            </div>
                            {cell?.durationLabel ? (
                              <div className="text-xs text-slate-400 mt-0.5">{cell.durationLabel}</div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                    {selectedDoctor.child_specialist_pricing?.followUpPackages && (
                      <p className="text-xs text-slate-600 pt-1">
                        Follow-up package tiers (1 / 3 / 6 / 9 / 12 sessions) are configured; open{' '}
                        <span className="font-medium">Edit Profile</span> for the full grid and synced package rows.
                      </p>
                    )}
                  </div>
                )}
                {!isChildSpecialistProfile(selectedDoctor) && (
                  <p className="text-sm text-slate-600">
                    Uses standard individual and multi-session packages. To use child specialist initial + follow-up plans,
                    open Edit and set <span className="font-medium">Child specialist</span>.
                  </p>
                )}
              </div>

              {/* Availability */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3" role="heading" aria-level={2}>
                  Availability
                </div>
                {selectedDoctor.availability && selectedDoctor.availability.length > 0 ? (
                  <div className="space-y-2">
                    {selectedDoctor.availability.map((slot, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800">
                          {slot.date}: {slot.time_slots && Array.isArray(slot.time_slots) ? sortTimeSlotsChronologically(slot.time_slots).join(', ') : 'Available'}
                        </div>
                      </div>
                    ))}
                    <div className="pt-1">
                      <span className={`text-xs font-medium ${selectedDoctor.google_calendar_connected ? 'text-blue-600' : 'text-slate-500'}`}>
                        {selectedDoctor.google_calendar_connected ? '✓ G-Calendar connected' : 'Calendar not connected'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="pt-1">
                    <span className={`text-xs font-medium ${selectedDoctor.google_calendar_connected ? 'text-blue-600' : 'text-slate-500'}`}>
                      {selectedDoctor.google_calendar_connected ? '✓ G-Calendar connected' : 'Calendar not connected'}
                    </span>
                  </div>
                )}
              </div>

              {/* Package Information */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3" role="heading" aria-level={2}>
                  Packages
                </div>
                <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800">
                  Package details and pricing are managed through the packages system. Individual session pricing is used as the base rate for package calculations.
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
                <button
                  onClick={() => setIsFullProfileOpen(false)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setIsFullProfileOpen(false);
                    handleEditDoctor(selectedDoctor);
                  }}
                  className="px-4 py-2 bg-[#025545] text-white rounded-lg hover:bg-[#012f23] transition-colors text-sm font-medium"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
