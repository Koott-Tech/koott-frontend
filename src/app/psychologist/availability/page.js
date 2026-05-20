"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { psychologistApi } from "../../../lib/backendApi";
import { useNotification } from "../../../contexts/NotificationContext";
import AvailabilityModal from "../../../components/AvailabilityModal";
import RecurringBlockModal from "../../../components/RecurringBlockModal";
import WheelPagination from "../../../components/ui/wheel-pagination";
import { getStoredToken } from "@/lib/authStorage";
import { 
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Calendar as CalendarIcon,
  X,
  RefreshCw,
  Unlock,
  Loader2
} from "lucide-react";

export default function PsychologistAvailability() {
  const { user } = useAuth();
  const { showError, showSuccess } = useNotification();
  const [availability, setAvailability] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  // Date filter state
  const [selectedDate, setSelectedDate] = useState('');
  
  // Availability management state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAvailability, setEditingAvailability] = useState(null);

  // Recurring blocks (e.g. block every Sunday)
  const [recurringBlocks, setRecurringBlocks] = useState([]);
  const [showRecurringBlockModal, setShowRecurringBlockModal] = useState(false);
  // Custom unblock confirm popup: { id, label } or null
  const [unblockConfirmBlock, setUnblockConfirmBlock] = useState(null);
  const [isUnblocking, setIsUnblocking] = useState(false);
  const [showUnblockAllConfirm, setShowUnblockAllConfirm] = useState(false);
  const [isUnblockingAll, setIsUnblockingAll] = useState(false);

  useEffect(() => {
    if (user) {
      loadAvailability();
    }
  }, [user, currentPage, selectedDate]);

  const loadRecurringBlocks = async () => {
    if (!user) return;
    try {
      const res = await psychologistApi.getRecurringBlocks();
      const data = res?.data ?? res;
      setRecurringBlocks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading recurring blocks:', err);
    }
  };

  useEffect(() => {
    if (user) loadRecurringBlocks();
  }, [user]);

  const loadAvailability = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const params = {
        page: currentPage,
        limit: itemsPerPage
      };
      
      // Add date filter if selected
      if (selectedDate) {
        params.date = selectedDate;
      }
      
      const availabilityData = await psychologistApi.getAvailability(params);
      console.log('Raw availability data from backend:', availabilityData);
      
      // Handle both old format (array) and new format (object with availability and pagination)
      let availabilityList = [];
      if (Array.isArray(availabilityData.data)) {
        // Old format - just an array
        availabilityList = availabilityData.data;
        setTotalPages(1);
        setTotalCount(availabilityList.length);
      } else if (availabilityData.data?.availability) {
        // New format - object with availability and pagination
        availabilityList = availabilityData.data.availability || [];
        setTotalPages(availabilityData.data.pagination?.totalPages || 1);
        setTotalCount(availabilityData.data.pagination?.total || 0);
      } else {
        availabilityList = [];
        setTotalPages(1);
        setTotalCount(0);
      }
      
      // Clean up duplicate time slots for each date
      const cleanedAvailability = availabilityList.map(day => ({
        ...day,
        time_slots: Array.from(new Set(day.time_slots || [])).sort()
      }));
      
      console.log('Cleaned availability data:', cleanedAvailability);
      setAvailability(cleanedAvailability);
    } catch (err) {
      console.error('Error loading availability:', err);
      setError(err.message);
      showError(`Failed to load availability: ${err.message}`, 'Load Error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateFilterChange = (date) => {
    setSelectedDate(date);
    setCurrentPage(1); // Reset to first page when date filter changes
  };

  const handleClearDateFilter = () => {
    setSelectedDate('');
    setCurrentPage(1); // Reset to first page when clearing filter
  };

  const handlePageChange = (page) => {
    setCurrentPage(page + 1); // WheelPagination is 0-indexed, API is 1-indexed
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper function to convert time to 24-hour format (HH:MM)
  const normalizeTimeTo24Hour = (timeStr) => {
    if (!timeStr) return null;
    
    const time = String(timeStr).trim();
    
    // If already in 24-hour format (HH:MM), return as-is
    const hhmmMatch = time.match(/^(\d{1,2}):(\d{2})$/);
    if (hhmmMatch) {
      const hours = hhmmMatch[1].padStart(2, '0');
      const minutes = hhmmMatch[2];
      return `${hours}:${minutes}`;
    }
    
    // If in 12-hour format (e.g., "2:30 PM" or "2:30PM")
    const ampmMatch = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (ampmMatch) {
      let hours = parseInt(ampmMatch[1], 10);
      const minutes = ampmMatch[2];
      const period = ampmMatch[3].toUpperCase();
      
      if (period === 'PM' && hours !== 12) {
        hours += 12;
      } else if (period === 'AM' && hours === 12) {
        hours = 0;
      }
      
      return `${String(hours).padStart(2, '0')}:${minutes}`;
    }
    
    // Try to extract HH:MM from any string
    const extractMatch = time.match(/(\d{1,2}):(\d{2})/);
    if (extractMatch) {
      const hours = extractMatch[1].padStart(2, '0');
      const minutes = extractMatch[2];
      return `${hours}:${minutes}`;
    }
    
    return null;
  };

  // Function to clean up duplicates in the database
  const cleanupDuplicates = async () => {
    try {
      // Fetch all availability (no pagination/date filter for cleanup)
      const availabilityData = await psychologistApi.getAvailability({ limit: 1000 });
      
      // Handle both old format (array) and new format (object with availability and pagination)
      let availabilityList = [];
      if (Array.isArray(availabilityData.data)) {
        availabilityList = availabilityData.data;
      } else if (availabilityData.data?.availability) {
        availabilityList = availabilityData.data.availability || [];
      }
      
      // Clean and normalize time slots to 24-hour format
      const cleanedData = availabilityList.map(day => {
        const normalizedSlots = (day.time_slots || [])
          .map(slot => normalizeTimeTo24Hour(slot))
          .filter(slot => slot !== null); // Remove invalid slots
        
        return {
        ...day,
          time_slots: Array.from(new Set(normalizedSlots)).sort()
        };
      });
      
      // Update each availability entry to remove duplicates
      for (const day of cleanedData) {
        if (day.time_slots && day.time_slots.length > 0 && day.date) {
          try {
          await psychologistApi.updateAvailability({
            date: day.date,
            time_slots: day.time_slots
          });
          } catch (updateErr) {
            console.error(`Error updating availability for ${day.date}:`, updateErr);
            // Continue with next entry instead of failing completely
          }
        }
      }
      
      // Reload the data
      await loadAvailability();
      showSuccess('Duplicates cleaned up successfully', 'Success');
      setError(null);
    } catch (err) {
      console.error('Error cleaning up duplicates:', err);
      setError('Failed to clean up duplicate time slots');
      showError('Failed to clean up duplicate time slots: ' + (err.message || 'Unknown error'), 'Cleanup Error');
    }
  };

  const handleAddAvailability = async (availabilityData, isUpdate = false) => {
    try {
      let response;
      if (isUpdate) {
        response = await psychologistApi.updateAvailability(availabilityData);
      } else {
        response = await psychologistApi.addAvailability(availabilityData);
      }

      // Check if any slots were blocked due to Google Calendar conflicts
      if (response.data?.blocked_count > 0) {
        showError(
          `⚠️ ${response.data.blocked_count} slot(s) were automatically blocked due to Google Calendar conflicts: ${response.data.blocked_slots.join(', ')}`,
          'Calendar Conflict Detected'
        );
      } else {
        showSuccess(isUpdate ? 'Availability updated successfully' : 'Availability added successfully', 'Success');
      }

      // Reload availability data
      await loadAvailability();
      
      setError(null);
    } catch (err) {
      console.error('Error adding availability:', err);
      setError(err.message);
      showError(err.message || 'Failed to add availability', 'Add Error');
      throw err; // Re-throw to let the modal handle the error
    }
  };

  const handleEditAvailability = async (updatedData) => {
    try {
      // Guard: require at least one time slot
      if (!updatedData.time_slots || updatedData.time_slots.length === 0) {
        setError('Please select at least one time slot');
        return;
      }

      // Normalize date to YYYY-MM-DD using local components (no timezone conversion)
      const normalizedDate = (() => {
        try {
          if (typeof updatedData.date === 'string' && /\d{4}-\d{2}-\d{2}/.test(updatedData.date)) {
            return updatedData.date;
          }
          const d = new Date(updatedData.date);
          if (Number.isNaN(d.getTime())) return updatedData.date; // fallback
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        } catch (_) {
          return updatedData.date;
        }
      })();

      // Sanitize time slots to HH:MM and ensure uniqueness
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      const sanitizedSlots = Array.from(
        new Set(
          (updatedData.time_slots || [])
            .map((t) => (typeof t === 'string' ? t.trim() : String(t)))
            .filter((t) => timeRegex.test(t))
        )
      ).sort(); // Sort for consistent display

      if (sanitizedSlots.length === 0) {
        setError('Invalid time slots. Please pick valid HH:MM times.');
        return;
      }

      // Extract only the required fields for the API
      const availabilityData = {
        date: normalizedDate,
        time_slots: sanitizedSlots
      };
      // Debug payload
      console.log('Updating availability with payload:', availabilityData);
      
      const response = await psychologistApi.updateAvailability(availabilityData);
      
      // Check if any slots were blocked due to Google Calendar conflicts
      if (response.data?.blocked_count > 0) {
        showError(
          `⚠️ ${response.data.blocked_count} slot(s) were automatically blocked due to Google Calendar conflicts: ${response.data.blocked_slots.join(', ')}`,
          'Calendar Conflict Detected'
        );
      } else {
        showSuccess('Availability updated successfully', 'Success');
      }
      
      // Reset edit state and close modal
      setEditingAvailability(null);
      
      // Reload availability data
      await loadAvailability();
      
      setError(null);
    } catch (err) {
      console.error('Error updating availability (frontend catch):', err);
      setError(err.message);
      showError(err.message || 'Failed to update availability', 'Update Error');
    }
  };

  const handleDeleteAvailability = async (availabilityId) => {
    if (!confirm('Are you sure you want to delete this availability?')) {
      return;
    }

    try {
      await psychologistApi.deleteAvailability(availabilityId);
      
      // Reload availability data
      await loadAvailability();
      
      setError(null);
    } catch (err) {
      console.error('Error deleting availability:', err);
      setError(err.message);
    }
  };

  const openEditMode = (availability) => {
    setEditingAvailability(availability);
  };

  const closeEditMode = () => {
    setEditingAvailability(null);
    setError(null);
  };

  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const handleSaveRecurringBlock = async (data) => {
    await psychologistApi.addRecurringBlock(data);
    await loadRecurringBlocks();
    await loadAvailability();
  };

  const handleUnblockRecurringBlock = async (blockId) => {
    setIsUnblocking(true);
    try {
      await psychologistApi.deleteRecurringBlock(blockId);
      showSuccess('Recurring block removed – that day is available again');
      setUnblockConfirmBlock(null);
      await loadRecurringBlocks();
      await loadAvailability();
    } catch (err) {
      showError(err.message || 'Failed to unblock');
    } finally {
      setIsUnblocking(false);
    }
  };

  const handleUnblockAllRecurringBlocks = async () => {
    if (!recurringBlocks.length) return;
    setIsUnblockingAll(true);
    try {
      for (const block of recurringBlocks) {
        await psychologistApi.deleteRecurringBlock(block.id);
      }
      showSuccess(`All ${recurringBlocks.length} recurring block(s) removed – those days are available again`);
      setShowUnblockAllConfirm(false);
      await loadRecurringBlocks();
      await loadAvailability();
    } catch (err) {
      showError(err.message || 'Failed to unblock all');
    } finally {
      setIsUnblockingAll(false);
    }
  };

  const formatTimeForDisplay = (time) => {
    // If time already contains AM/PM, return as-is (already formatted)
    if (typeof time === 'string' && (time.includes('AM') || time.includes('PM') || time.includes('am') || time.includes('pm'))) {
      return time;
    }
    
    // Otherwise, convert from 24-hour format (HH:MM) to 12-hour format
    const timeStr = String(time).trim();
    const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})/);
    
    if (!timeMatch) {
      return timeStr; // Return as-is if format is unexpected
    }
    
    const hour = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2];
    
    // Convert to 12-hour format
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Format recurring block time: show range only if slots are continuous (e.g. 8,9,10,11); else list specific slots (e.g. 8, 9, 1 PM)
  const formatRecurringBlockTimeRange = (block) => {
    const slots = block?.time_slots || [];
    if (slots.length === 0) return '';
    const parseMinutes = (s) => {
      const m = String(s).trim().match(/^(\d{1,2}):(\d{2})/);
      return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : -1;
    };
    const withMins = slots.map((s) => ({ s, m: parseMinutes(s) })).filter((x) => x.m >= 0);
    if (withMins.length === 0) return '';
    withMins.sort((a, b) => a.m - b.m);
    const minutes = withMins.map((x) => x.m);
    const isContinuous = minutes.every((m, i) => i === 0 || m - minutes[i - 1] === 60);
    if (isContinuous && minutes.length > 0) {
      const firstSlot = withMins[0].s;
      const lastSlot = withMins[withMins.length - 1].s;
      const start = formatTimeForDisplay(firstSlot);
      const lastMatch = String(lastSlot).match(/^(\d{1,2}):(\d{2})/);
      const endHour = lastMatch ? parseInt(lastMatch[1], 10) + 1 : 0;
      const endStr = `${String(endHour).padStart(2, '0')}:${lastMatch ? lastMatch[2] : '00'}`;
      const end = formatTimeForDisplay(endStr);
      return `${start} – ${end}`;
    }
    return withMins.map((x) => formatTimeForDisplay(x.s)).join(', ');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#025545] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading availability...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 text-lg">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h6 className="font-semibold text-gray-900">Availability Management</h6>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex flex-wrap gap-2">
          <button
            onClick={cleanupDuplicates}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#025545] focus:ring-offset-2"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Clean Duplicates
          </button>
          <button
            onClick={() => setShowRecurringBlockModal(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-amber-600 px-3 py-2 text-xs sm:text-sm font-medium text-white shadow-sm hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Block recurring (e.g. leave every Sunday)
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-[#025545] px-3 py-2 text-xs sm:text-sm font-medium text-white shadow-sm hover:bg-[#012f23] focus:outline-none focus:ring-2 focus:ring-[#025545] focus:ring-offset-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Availability
          </button>
        </div>
      </div>

      {/* Date Filter */}
      <div className="mt-6 sm:mt-8 bg-white shadow rounded-lg p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <label htmlFor="date-filter" className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Date (Optional)
            </label>
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-gray-400" />
              <input
                id="date-filter"
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateFilterChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#025545] focus:border-[#025545]"
              />
              {selectedDate && (
                <button
                  onClick={handleClearDateFilter}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                  title="Clear date filter"
                >
                  <X className="h-4 w-4" />
                  Clear
                </button>
              )}
            </div>
          </div>
          {selectedDate && (
            <div className="text-sm text-gray-600">
              Showing availability for: <span className="font-medium">{new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          )}
        </div>
      </div>

      {/* Availability List */}
      <div className="mt-8">
        {totalCount > 0 && (
          <div className="flex items-center justify-end mb-4">
            <p className="text-sm text-gray-600">
              Showing {availability.length} of {totalCount} entries
            </p>
          </div>
        )}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <p className="font-medium text-gray-900 text-sm sm:text-base">Your Available Time Slots</p>
          </div>
          <div className="p-4 sm:p-6">
            {availability.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm font-medium text-gray-900">No availability set</p>
                <p className="mt-1 text-sm text-gray-500">
                  Click &quot;Add New Availability&quot; to add your available time slots.
                </p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {availability.map((day) => (
                  <div key={day.id} className="border rounded-lg p-3 sm:p-4">
                    {editingAvailability?.id === day.id ? (
                      // Edit Mode
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <p className="font-medium text-gray-900">
                            {(() => {
                              const [yy, mm, dd] = String(day.date).split('-').map(Number);
                              const localDate = !Number.isNaN(yy) && !Number.isNaN(mm) && !Number.isNaN(dd)
                                ? new Date(yy, mm - 1, dd)
                                : new Date(day.date);
                              return localDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                            })()}
                          </p>
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => handleEditAvailability(editingAvailability)}
                              className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                              title="Save changes"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={closeEditMode}
                              className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-50"
                              title="Cancel edit"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Time Slots Editor */}
                        <div className="mb-4">
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Time Slots</label>
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                            {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map((time) => (
                              <button
                                key={time}
                                onClick={() => {
                                  const slots = editingAvailability.time_slots.includes(time)
                                    ? editingAvailability.time_slots.filter(t => t !== time)
                                    : [...editingAvailability.time_slots, time];
                                  setEditingAvailability({...editingAvailability, time_slots: slots});
                                }}
                                className={`p-2 text-xs sm:text-sm rounded border transition-colors ${
                                  editingAvailability.time_slots.includes(time)
                                    ? 'bg-[#025545] text-white border-[#025545]'
                                    : 'bg-white text-gray-700 border-gray-300 hover:border-[#025545]/50'
                                }`}
                              >
                                {formatTimeForDisplay(time)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <p className="font-medium text-gray-900">
                            {(() => {
                              const [yy, mm, dd] = String(day.date).split('-').map(Number);
                              const localDate = !Number.isNaN(yy) && !Number.isNaN(mm) && !Number.isNaN(dd)
                                ? new Date(yy, mm - 1, dd)
                                : new Date(day.date);
                              return localDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                            })()}
                          </p>
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => openEditMode(day)}
                              className="text-[#025545] hover:text-[#012f23] p-1 rounded hover:bg-[#025545]/10"
                              title="Edit availability"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteAvailability(day.id)}
                              className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                              title="Delete availability"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {day.time_slots.map((time, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs sm:text-sm font-medium bg-green-100 text-green-800"
                            >
                              {formatTimeForDisplay(time)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && availability.length > 0 && (
            <div className="px-4 sm:px-6 py-4 border-t border-gray-200">
              <WheelPagination
                totalPages={totalPages}
                visibleCount={7}
                currentPage={currentPage - 1} // Convert 1-indexed to 0-indexed
                onPageChange={handlePageChange}
                className="bg-white"
              />
            </div>
          )}
        </div>
      </div>

      {/* Add Availability Modal */}
      <AvailabilityModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddAvailability={handleAddAvailability}
      />

      {/* Recurring blocks – add block or unblock to re-enable */}
      <div className="mt-8 bg-white shadow rounded-lg p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <p className="font-medium text-gray-900">Recurring blocks</p>
            <p className="text-sm text-gray-500 mt-0.5">
              Block the same day every week (e.g. leave every Sunday). Unblock to re-enable that day for future weeks.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { loadRecurringBlocks(); loadAvailability(); }}
              className="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              title="Refresh list of recurring blocks"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
            <button
              onClick={() => setShowRecurringBlockModal(true)}
              className="inline-flex items-center rounded-md border border-amber-600 px-3 py-2 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add recurring block
            </button>
          </div>
        </div>
        {recurringBlocks.length === 0 ? (
          <p className="text-sm text-gray-500">No recurring blocks. Add one to block a day every week (e.g. leave). Unblock later to re-enable.</p>
        ) : (
          <>
            <ul className="space-y-2">
              {recurringBlocks.map((block) => (
                <li
                  key={block.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 border border-gray-200"
                >
                  <span className="text-sm font-medium text-gray-800">
                    Every {DAY_NAMES[block.day_of_week] ?? block.day_of_week}
                    {block.block_entire_day
                      ? ' – Full day blocked'
                      : ` – ${formatRecurringBlockTimeRange(block)}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setUnblockConfirmBlock({ id: block.id, label: `Every ${DAY_NAMES[block.day_of_week] ?? block.day_of_week}${block.block_entire_day ? ' – Full day' : ` – ${formatRecurringBlockTimeRange(block)}`}` })}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100"
                    title="Unblock – re-enable this day for future weeks"
                  >
                    <Unlock className="h-4 w-4" />
                    Unblock
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-4 pt-3 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowUnblockAllConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100"
                title="Remove all recurring blocks – all those days will be available again"
              >
                <Unlock className="h-4 w-4" />
                Unblock all
              </button>
            </div>
          </>
        )}
      </div>

      {/* Recurring block modal */}
      <RecurringBlockModal
        isOpen={showRecurringBlockModal}
        onClose={() => setShowRecurringBlockModal(false)}
        onSave={handleSaveRecurringBlock}
      />

      {/* Custom unblock confirm popup – inline styles only */}
      {unblockConfirmBlock && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            background: 'rgba(0,0,0,0.4)'
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
              width: '100%',
              maxWidth: 360,
              padding: 20
            }}
          >
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
              Unblock recurring block?
            </p>
            <p style={{ margin: 0, fontSize: 13, color: '#4b5563', marginBottom: 20 }}>
              &quot;{unblockConfirmBlock.label}&quot; will be removed. That day will be available again for future weeks.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center' }}>
              <button
                type="button"
                disabled={isUnblocking}
                onClick={() => setUnblockConfirmBlock(null)}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 500,
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  background: '#fff',
                  color: '#374151',
                  cursor: isUnblocking ? 'not-allowed' : 'pointer',
                  opacity: isUnblocking ? 0.6 : 1
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUnblocking}
                onClick={() => handleUnblockRecurringBlock(unblockConfirmBlock.id)}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 500,
                  border: 'none',
                  borderRadius: 8,
                  background: isUnblocking ? '#22c55e' : '#16a34a',
                  color: '#fff',
                  cursor: isUnblocking ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                {isUnblocking ? (
                  <>
                    <Loader2 style={{ width: 16, height: 16, animation: 'spin 0.8s linear infinite' }} />
                    <span>Unblocking...</span>
                  </>
                ) : (
                  'Unblock'
                )}
              </button>
            </div>
            {isUnblocking && (
              <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
              `}</style>
            )}
          </div>
        </div>
      )}

      {/* Unblock all recurring blocks confirm */}
      {showUnblockAllConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            background: 'rgba(0,0,0,0.4)'
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
              width: '100%',
              maxWidth: 360,
              padding: 20
            }}
          >
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
              Unblock all recurring blocks?
            </p>
            <p style={{ margin: 0, fontSize: 13, color: '#4b5563', marginBottom: 20 }}>
              All {recurringBlocks.length} block(s) will be removed. Those days will be available again for future weeks.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center' }}>
              <button
                type="button"
                disabled={isUnblockingAll}
                onClick={() => setShowUnblockAllConfirm(false)}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 500,
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  background: '#fff',
                  color: '#374151',
                  cursor: isUnblockingAll ? 'not-allowed' : 'pointer',
                  opacity: isUnblockingAll ? 0.6 : 1
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUnblockingAll}
                onClick={handleUnblockAllRecurringBlocks}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 500,
                  border: 'none',
                  borderRadius: 8,
                  background: isUnblockingAll ? '#b45309' : '#b45309',
                  color: '#fff',
                  cursor: isUnblockingAll ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                {isUnblockingAll ? (
                  <>
                    <Loader2 style={{ width: 16, height: 16, animation: 'spin 0.8s linear infinite' }} />
                    <span>Unblocking all...</span>
                  </>
                ) : (
                  'Unblock all'
                )}
              </button>
            </div>
            {isUnblockingAll && (
              <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
              `}</style>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
