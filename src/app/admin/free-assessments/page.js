'use client';

import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Search,
  Filter,
  Eye,
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Copy,
  Loader2,
  Star,
  MessageSquare,
  Trash2,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { adminApi } from '@/lib/backendApi';
import { useNotification } from '@/contexts/NotificationContext';
import DateRangePicker from '@/components/ui/date-range-picker';
import { hasDateRangeBounds } from '@/lib/dateRangeBounds';
import { formatIstCalendarYmd, istCalendarMonthBounds } from '@/lib/wixFinanceDates';

export default function FreeAssessmentsPage() {
  const { showError, showSuccess } = useNotification();
  const [assessments, setAssessments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [assessmentToComplete, setAssessmentToComplete] = useState(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [feedbackToView, setFeedbackToView] = useState(null);
  const [assessmentToDelete, setAssessmentToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTimeslotModalOpen, setIsTimeslotModalOpen] = useState(false);
  const [selectedDateForTimeslots, setSelectedDateForTimeslots] = useState(null);
  const [timeslots, setTimeslots] = useState([]);
  const [isLoadingTimeslots, setIsLoadingTimeslots] = useState(false);
  const [isSavingTimeslots, setIsSavingTimeslots] = useState(false);
  const [newTimeSlot, setNewTimeSlot] = useState('');
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState({});
  const [availabilityData, setAvailabilityData] = useState({});
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState(() => istCalendarMonthBounds(new Date()));

  useEffect(() => {
    loadAssessments();
  }, [filterStatus, filterDate, dateRange]);

  useEffect(() => {
    // Build calendar data from assessments
    const calendar = {};
    assessments.forEach(assessment => {
      if (assessment.scheduledDate) {
        const dateKey = assessment.scheduledDate;
        if (!calendar[dateKey]) {
          calendar[dateKey] = [];
        }
        calendar[dateKey].push(assessment);
      }
    });
    setCalendarData(calendar);
  }, [assessments]);

  // Load availability data for the current month
  useEffect(() => {
    loadAvailabilityForMonth();
  }, [currentMonth]);

  const loadAvailabilityForMonth = async () => {
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const response = await adminApi.getDateConfigsRange(startDateStr, endDateStr);
      if (response && response.success) {
        // Response format: { data: { "2026-01-15": { timeSlots: [...], isConfigured: true }, ... } }
        const configsByDate = response.data || {};
        const availability = {};
        Object.keys(configsByDate).forEach(date => {
          const config = configsByDate[date];
          if (config.timeSlots && config.timeSlots.length > 0) {
            availability[date] = config.timeSlots.length;
          }
        });
        setAvailabilityData(availability);
      }
    } catch (error) {
      console.error('Error loading availability data:', error);
    }
  };

  const loadAssessments = async () => {
    try {
      setIsLoading(true);
      
      const params = {};
      if (filterStatus && filterStatus !== 'all') {
        params.status = filterStatus;
      }
      if (filterDate) {
        params.date = filterDate;
      }
      if (hasDateRangeBounds(dateRange)) {
        params.dateFrom = formatIstCalendarYmd(dateRange.from);
        params.dateTo = formatIstCalendarYmd(dateRange.to);
      }

      const response = await adminApi.getFreeAssessments(params);
      
      if (response && response.success) {
        const assessmentsData = response.data?.assessments || [];
        // Map the response data to match expected format
        const mappedAssessments = assessmentsData.map(a => ({
          id: a.id,
          assessmentNumber: a.assessmentNumber,
          scheduled_date: a.scheduledDate,
          scheduled_time: a.scheduledTime,
          scheduledDate: a.scheduledDate,
          scheduledTime: a.scheduledTime,
          status: a.status,
          session_id: a.session_id || a.sessionId || null, // Include session_id for completion
          feedback: a.feedback || null, // Include feedback
          rating: a.rating || null, // Include rating
          client: a.client ? {
            first_name: a.client.first_name,
            last_name: a.client.last_name,
            child_name: a.client.child_name
          } : null,
          psychologist: a.psychologist ? {
            first_name: a.psychologist.first_name,
            last_name: a.psychologist.last_name,
            email: a.psychologist.email
          } : null,
          meetLink: a.meetLink,
          created_at: a.created_at || null
        }));
        setAssessments(mappedAssessments);
      } else {
        setAssessments([]);
      }
      
    } catch (error) {
      console.error('Failed to load free assessments:', error);
      showError('Failed to load free assessments', 'Load Error');
      setAssessments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewAssessment = (assessment) => {
    setSelectedAssessment(assessment);
    setIsDetailsOpen(true);
  };

  const handleCopyMeetLink = async (meetLink) => {
    if (!meetLink) {
      showError('No meet link available', 'Copy Error');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(meetLink);
      showSuccess('Meet link copied to clipboard!', 'Copied');
    } catch (error) {
      console.error('Failed to copy meet link:', error);
      showError('Failed to copy meet link', 'Copy Error');
    }
  };

  const handleMarkAsCompleteClick = (assessment) => {
    if (!assessment.session_id) {
      showError('Session ID not found. Cannot mark as complete.', 'Error');
      return;
    }

    if (assessment.status === 'completed') {
      showError('Assessment is already completed', 'Error');
      return;
    }

    setAssessmentToComplete(assessment);
    setIsCompleteModalOpen(true);
  };

  const handleConfirmComplete = async () => {
    if (!assessmentToComplete || !assessmentToComplete.session_id) {
      showError('Session ID not found. Cannot mark as complete.', 'Error');
      setIsCompleteModalOpen(false);
      return;
    }

    setIsCompleting(true);

    try {
      // For free assessments, we only need summary and summary_notes (no report)
      const completionData = {
        summary: `Free Assessment completed for ${assessmentToComplete.client?.child_name || assessmentToComplete.client?.first_name || 'client'}`,
        summary_notes: 'Free assessment session completed by admin.',
        report: '' // Empty for free assessments
      };

      const response = await adminApi.completeSession(assessmentToComplete.session_id, completionData);
      
      if (response && response.success) {
        showSuccess('Free assessment marked as complete successfully!', 'Success');
        setIsCompleteModalOpen(false);
        setAssessmentToComplete(null);
        // Reload assessments to reflect the updated status
        await loadAssessments();
      } else {
        showError(response?.message || 'Failed to mark assessment as complete', 'Error');
      }
    } catch (error) {
      console.error('Error marking assessment as complete:', error);
      showError('Failed to mark assessment as complete', 'Error');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleCancelComplete = () => {
    setIsCompleteModalOpen(false);
    setAssessmentToComplete(null);
  };

  const handleViewFeedback = (assessment) => {
    // Map assessment data to match feedback modal format
    setFeedbackToView({
      client: assessment.client,
      feedback: assessment.feedback,
      rating: assessment.rating
    });
  };

  const handleDeleteClick = (assessment) => {
    setAssessmentToDelete(assessment);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!assessmentToDelete) return;

    try {
      setIsDeleting(true);
      const response = await adminApi.deleteFreeAssessment(assessmentToDelete.id);
      
      if (response && response.success) {
        showSuccess('Free assessment deleted successfully');
        setIsDeleteModalOpen(false);
        setAssessmentToDelete(null);
        loadAssessments(); // Reload the list
      } else {
        showError(response?.message || 'Failed to delete free assessment');
      }
    } catch (error) {
      console.error('Error deleting free assessment:', error);
      showError('Failed to delete free assessment');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false);
    setAssessmentToDelete(null);
  };

  const formatTime = (time) => {
    if (!time) return 'N/A';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Date without year for listing
  const formatDateShort = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const formatBookedAt = (isoString) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'booked':
        return <Clock className="h-4 w-4 text-[#025545]" />;
      default:
        return <Clock className="h-4 w-4 text-[#025545]" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'booked':
        return 'bg-[#025545]/10 text-[#025545]';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      case 'booked':
        return 'Booked';
      default:
        return status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown';
    }
  };

  // Calendar functions
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const getMonthYearString = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getDateKey = (day) => {
    if (!day) return null;
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const isToday = (day) => {
    if (!day) return false;
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day) => {
    if (!day) return false;
    const dateKey = getDateKey(day);
    return dateKey === selectedDate;
  };

  const handleDateClick = (day) => {
    if (!day) return;
    const dateKey = getDateKey(day);
    setSelectedDate(dateKey);
    setFilterDate(dateKey);
    // Open timeslot management modal
    setSelectedDateForTimeslots(dateKey);
    setIsTimeslotModalOpen(true);
    loadTimeslotsForDate(dateKey);
  };

  const loadTimeslotsForDate = async (date) => {
    try {
      setIsLoadingTimeslots(true);
      const response = await adminApi.getDateConfig(date);
      if (response && response.success && response.data) {
        // time_slots is an array of time strings like "09:00:00"
        setTimeslots(response.data.time_slots || []);
      } else {
        setTimeslots([]);
      }
    } catch (error) {
      console.error('Error loading timeslots:', error);
      showError('Failed to load timeslots for this date');
      setTimeslots([]);
    } finally {
      setIsLoadingTimeslots(false);
    }
  };

  const handleAddTimeSlot = () => {
    if (!newTimeSlot.trim()) return;
    
    // Convert to HH:MM:SS format
    let timeStr = newTimeSlot.trim();
    // Handle formats: "9:00 AM", "09:00", "9:00:00"
    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
    if (!timeMatch) {
      showError('Invalid time format. Use HH:MM (e.g., 09:00 or 9:00 AM)');
      return;
    }

    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2];
    const period = timeMatch[4]?.toUpperCase();

    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }

    const formattedTime = `${String(hours).padStart(2, '0')}:${minutes}:00`;
    
    if (timeslots.includes(formattedTime)) {
      showError('This time slot already exists');
      return;
    }

    setTimeslots([...timeslots, formattedTime].sort());
    setNewTimeSlot('');
  };

  const handleRemoveTimeSlot = (timeToRemove) => {
    setTimeslots(timeslots.filter(t => t !== timeToRemove));
  };

  const handleSaveTimeslots = async () => {
    if (!selectedDateForTimeslots) return;

    try {
      setIsSavingTimeslots(true);
      const response = await adminApi.createDateConfig({
        date: selectedDateForTimeslots,
        timeSlots: timeslots
      });

      if (response && response.success) {
        showSuccess('Timeslots saved successfully');
        setIsTimeslotModalOpen(false);
        setSelectedDateForTimeslots(null);
        setTimeslots([]);
        setNewTimeSlot('');
        // Reload availability data to update calendar
        loadAvailabilityForMonth();
      } else {
        showError(response?.message || 'Failed to save timeslots');
      }
    } catch (error) {
      console.error('Error saving timeslots:', error);
      showError('Failed to save timeslots');
    } finally {
      setIsSavingTimeslots(false);
    }
  };

  const handleCloseTimeslotModal = () => {
    setIsTimeslotModalOpen(false);
    setSelectedDateForTimeslots(null);
    setTimeslots([]);
    setNewTimeSlot('');
  };

  const handleDeleteAllTimeslots = async () => {
    if (!selectedDateForTimeslots) return;
    if (!confirm('Are you sure you want to delete all timeslots for this date?')) return;

    try {
      setIsSavingTimeslots(true);
      const response = await adminApi.deleteDateConfig(selectedDateForTimeslots);
      
      if (response && response.success) {
        showSuccess('Timeslots deleted successfully');
        setIsTimeslotModalOpen(false);
        setSelectedDateForTimeslots(null);
        setTimeslots([]);
        setNewTimeSlot('');
        // Reload availability data to update calendar
        loadAvailabilityForMonth();
      } else {
        showError(response?.message || 'Failed to delete timeslots');
      }
    } catch (error) {
      console.error('Error deleting timeslots:', error);
      showError('Failed to delete timeslots');
    } finally {
      setIsSavingTimeslots(false);
    }
  };

  // Normalize status for comparison
  const normalizeStatus = (s) => (s === 'noshow' ? 'no_show' : (s || ''));

  // Filter by status tab and search term
  const filteredAssessments = assessments.filter(assessment => {
    const statusMatch = filterStatus === 'all' || normalizeStatus(assessment.status) === filterStatus;
    if (!statusMatch) return false;

    if (!searchTerm) return true;

    const clientName = `${assessment.client?.first_name || ''} ${assessment.client?.last_name || ''}`.toLowerCase();
    const clientEmail = assessment.client?.user?.email?.toLowerCase() || '';

    const matchesSearch =
      clientName.includes(searchTerm.toLowerCase()) ||
      clientEmail.includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const statusTabs = [
    { value: 'all', label: 'All' },
    { value: 'booked', label: 'Booked' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#025545]"></div>
      </div>
    );
  }

  const days = getDaysInMonth(currentMonth);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-base font-semibold text-gray-900">Free Assessments Management</div>
          </div>
          <button
            type="button"
            onClick={() => setIsAvailabilityModalOpen(true)}
            className="mt-3 sm:mt-0 inline-flex items-center px-4 py-2 bg-[#025545] text-white text-sm font-medium rounded-lg hover:bg-[#012f23] transition-colors"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Manage Availability
          </button>
        </div>

        {/* Availability Modal (Calendar + Timeslot editor) */}
        {isAvailabilityModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200/80">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#025545]/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-[#025545]" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900 tracking-tight" role="heading" aria-level={2}>
                      Manage Free Assessment Availability
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Use the calendar to view and configure timeslots for each date.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAvailabilityModalOpen(false)}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Calendar View */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      type="button"
                      onClick={() => navigateMonth('prev')}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <div className="text-sm font-semibold text-slate-900">
                      {getMonthYearString(currentMonth)}
                    </div>
                    <button
                      type="button"
                      onClick={() => navigateMonth('next')}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {weekDays.map(day => (
                      <div key={day} className="text-center text-xs font-semibold text-slate-600 py-1">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {days.map((day, index) => {
                      const dateKey = getDateKey(day);
                      const dayAssessments = day ? (calendarData[dateKey] || []) : [];
                      const hasAssessments = dayAssessments.length > 0;
                      const hasTimeslots = day ? (availabilityData[dateKey] > 0) : false;

                      return (
                        <div
                          key={index}
                          onClick={() => handleDateClick(day)}
                          className={`
                            min-h-[60px] p-1 border border-slate-200 rounded cursor-pointer transition-colors
                            ${!day ? 'bg-slate-50' : ''}
                            ${isToday(day) ? 'bg-[#025545]/5 border-[#025545]/40' : ''}
                            ${isSelected(day) ? 'bg-[#025545] text-white border-[#025545]' : 'hover:bg-slate-50'}
                            ${hasAssessments && !isSelected(day) ? 'bg-green-50 border-green-300' : ''}
                          `}
                          title={day && hasTimeslots ? `${availabilityData[dateKey]} timeslot(s) configured` : ''}
                        >
                          {day && (
                            <>
                              <div className="flex items-center justify-between">
                                <div className={`text-xs font-medium ${isSelected(day) ? 'text-white' : 'text-slate-900'}`}>
                                  {day}
                                </div>
                                {hasTimeslots && !isSelected(day) && (
                                  <Clock className="h-3 w-3 text-purple-600" title={`${availabilityData[dateKey]} timeslot(s)`} />
                                )}
                              </div>
                              {hasAssessments && (
                                <div className="mt-1 flex flex-wrap gap-0.5">
                                  {dayAssessments.slice(0, 3).map((assessment, idx) => (
                                    <div
                                      key={idx}
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        isSelected(day) ? 'bg-white' : 
                                        assessment.status === 'completed' ? 'bg-green-500' :
                                        assessment.status === 'cancelled' ? 'bg-red-500' :
                                        'bg-[#025545]'
                                      }`}
                                      title={`${assessment.status} - ${assessment.client?.first_name || 'N/A'}`}
                                    />
                                  ))}
                                  {dayAssessments.length > 3 && (
                                    <div className={`text-[8px] ${isSelected(day) ? 'text-white' : 'text-slate-600'}`}>
                                      +{dayAssessments.length - 3}
                                    </div>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Inline note for using the calendar */}
                <p className="text-xs text-slate-500">
                  Click a date to view or edit its timeslots. The timeslot editor will open in a separate popup.
                </p>
              </div>
            </div>
          </div>
        )}

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

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <p className="text-sm text-gray-600">
              Showing{' '}
              <span className="font-semibold text-gray-900">{filteredAssessments.length}</span>{' '}
              assessment{filteredAssessments.length !== 1 ? 's' : ''}
              {filterStatus !== 'all' && (
                <>
                  {' '}with status{' '}
                  <span className="font-medium text-gray-900">
                    {filterStatus === 'no_show'
                      ? 'No Show'
                      : filterStatus.replace('_', ' ')}
                  </span>
                </>
              )}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by client name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#025545] focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-1.5">
          <nav
            className="flex gap-1 overflow-x-auto"
            aria-label="Filter free assessments by status"
          >
            {statusTabs.map((tab) => {
              const isActive = filterStatus === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setFilterStatus(tab.value)}
                  className={`
                    relative px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap
                    transition-all duration-200 ease-out
                    ${isActive
                      ? 'bg-[#025545] text-white shadow-sm'
                      : 'text-gray-600 hover:text-[#025545] hover:bg-[#025545]/8 active:bg-[#025545]/12'
                    }
                  `}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Assessments Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assessment Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Booked at
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAssessments.map((assessment) => (
                  <tr key={assessment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatDateShort(assessment.scheduled_date)} at {formatTime(assessment.scheduled_time)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <div className="text-sm text-gray-900">
                          {assessment.client?.first_name} {assessment.client?.last_name}
                        </div>
                      </div>
                      {assessment.client?.child_name && (
                        <div className="text-xs text-gray-500">
                          Child: {assessment.client.child_name}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatBookedAt(assessment.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(assessment.status)}`}>
                        {getStatusText(assessment.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-100">
                              <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem 
                              onClick={() => handleViewAssessment(assessment)} 
                              className="cursor-pointer"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {assessment.meetLink && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleCopyMeetLink(assessment.meetLink)} 
                                  className="cursor-pointer"
                                >
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copy Meet Link
                                </DropdownMenuItem>
                              </>
                            )}
                            {assessment.status === 'completed' && (assessment.feedback || assessment.rating) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleViewFeedback(assessment)} 
                                  className="cursor-pointer"
                                >
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  View Feedback
                                </DropdownMenuItem>
                              </>
                            )}
                            {assessment.status !== 'completed' && assessment.session_id && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleMarkAsCompleteClick(assessment)} 
                                  className="cursor-pointer"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Mark Complete
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteClick(assessment)} 
                              className="cursor-pointer text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Feedback Modal */}
        {feedbackToView && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <h6 className="text-sm font-semibold text-gray-900">Client Feedback</h6>
                <button
                  onClick={() => setFeedbackToView(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Client</p>
                  <p className="text-sm text-gray-800">
                    {feedbackToView.client?.first_name} {feedbackToView.client?.last_name}
                  </p>
                </div>
                {feedbackToView.rating && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Rating</p>
                    <div className="flex items-center gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-5 w-5 ${
                            star <= feedbackToView.rating
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                      <span className="ml-2 text-sm text-gray-600">
                        ({feedbackToView.rating} out of 5)
                      </span>
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Submitted Feedback</p>
                  <p className="text-sm text-gray-700 whitespace-pre-line mt-1">
                    {feedbackToView.feedback || 'No feedback provided.'}
                  </p>
                </div>
              </div>
              <div className="flex justify-end px-5 py-4 border-t border-gray-200">
                <button
                  onClick={() => setFeedbackToView(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && assessmentToDelete && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <h6 className="text-sm font-semibold text-gray-900">Delete Free Assessment</h6>
                <button
                  onClick={handleCancelDelete}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={isDeleting}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm text-gray-700 mb-4">
                  Are you sure you want to delete this free assessment? This action cannot be undone.
                </p>
                <div className="bg-gray-50 p-3 rounded-lg mb-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Assessment Details</p>
                  {assessmentToDelete.client && (
                    <p className="text-sm text-gray-700">
                      Client: {assessmentToDelete.client.first_name} {assessmentToDelete.client.last_name}
                    </p>
                  )}
                  <p className="text-sm text-gray-700">
                    Date: {formatDate(assessmentToDelete.scheduledDate)} at {formatTime(assessmentToDelete.scheduledTime)}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-200">
                <button
                  onClick={handleCancelDelete}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-700 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Timeslot Management Modal */}
        {isTimeslotModalOpen && selectedDateForTimeslots && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 sticky top-0 bg-white">
                <h6 className="text-sm font-semibold text-gray-900">
                  Manage Timeslots - {new Date(selectedDateForTimeslots).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </h6>
                <button
                  onClick={handleCloseTimeslotModal}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={isSavingTimeslots}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="px-5 py-4">
                {isLoadingTimeslots ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                  </div>
                ) : (
                  <>
                    {/* Add New Timeslot */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Add Time Slot
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newTimeSlot}
                          onChange={(e) => setNewTimeSlot(e.target.value)}
                          placeholder="e.g., 09:00 or 9:00 AM"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleAddTimeSlot();
                            }
                          }}
                        />
                        <button
                          onClick={handleAddTimeSlot}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                        >
                          Add
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        Format: HH:MM (24-hour) or H:MM AM/PM (12-hour)
                      </p>
                    </div>

                    {/* Existing Timeslots */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Available Time Slots ({timeslots.length})
                      </label>
                      {timeslots.length === 0 ? (
                        <p className="text-sm text-gray-500 italic py-4 text-center">
                          No time slots configured for this date. Add slots above.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {timeslots.map((time, index) => {
                            // Format time for display (HH:MM:SS -> H:MM AM/PM)
                            const [hours, minutes] = time.split(':');
                            const hour24 = parseInt(hours, 10);
                            const period = hour24 >= 12 ? 'PM' : 'AM';
                            const displayHour = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
                            const displayTime = `${displayHour}:${minutes} ${period}`;

                            return (
                              <div
                                key={index}
                                className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-lg px-3 py-2"
                              >
                                <span className="text-sm font-medium text-purple-900">
                                  {displayTime}
                                </span>
                                <button
                                  onClick={() => handleRemoveTimeSlot(time)}
                                  className="text-red-600 hover:text-red-800 ml-2"
                                  disabled={isSavingTimeslots}
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
              <div className="flex justify-between items-center px-5 py-4 border-t border-gray-200 sticky bottom-0 bg-white">
                <button
                  onClick={handleDeleteAllTimeslots}
                  className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  disabled={isSavingTimeslots || isLoadingTimeslots || timeslots.length === 0}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete All
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={handleCloseTimeslotModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                    disabled={isSavingTimeslots || isLoadingTimeslots}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveTimeslots}
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-purple-700 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    disabled={isSavingTimeslots || isLoadingTimeslots}
                  >
                    {isSavingTimeslots ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Clock className="h-4 w-4 mr-2" />
                        Save Timeslots
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredAssessments.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-2 text-sm font-semibold text-gray-900">No free assessments found</div>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filterStatus !== 'all' || filterDate
                ? 'Try adjusting your search or filter criteria.'
                : 'No free assessment sessions have been booked yet.'
              }
            </p>
          </div>
        )}

        {/* Mark Complete Confirmation Modal */}
        {isCompleteModalOpen && assessmentToComplete && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200/80">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="text-sm font-semibold text-slate-900 tracking-tight">Mark as Complete</div>
                </div>
                <button
                  onClick={handleCancelComplete}
                  disabled={isCompleting}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="px-6 py-5 space-y-4">
                <p className="text-sm text-slate-600">
                  Are you sure you want to mark this free assessment as complete?
                </p>

                <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Assessment</p>
                      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono">
                        #{assessmentToComplete.assessmentNumber}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Client</p>
                      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900">
                        {assessmentToComplete.client?.first_name} {assessmentToComplete.client?.last_name}
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Date & Time</p>
                      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900">
                        {formatDate(assessmentToComplete.scheduled_date)} at {formatTime(assessmentToComplete.scheduled_time)}
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-500">
                  This will send a notification to the client and mark the session as completed.
                </p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50/30">
                <button
                  onClick={handleCancelComplete}
                  disabled={isCompleting}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmComplete}
                  disabled={isCompleting}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#025545] rounded-lg hover:bg-[#012f23] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCompleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Completing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark Complete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assessment Details Modal - same design as bookings page */}
        {isDetailsOpen && selectedAssessment && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col border border-slate-200/80">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#025545]/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-[#025545]" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900 tracking-tight" role="heading" aria-level={2}>Free Assessment Details</div>
                    <p className="text-xs text-slate-500 mt-0.5">#{selectedAssessment.id?.slice(0, 8)}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDetailsOpen(false)}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-5">
                  {/* Assessment Information */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3" role="heading" aria-level={3}>Assessment Information</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Status</p>
                        <div className="bg-white border border-slate-200 rounded-lg px-3 py-2">
                          <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${getStatusColor(selectedAssessment.status)}`}>
                            {getStatusText(selectedAssessment.status)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Date</p>
                        <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900">
                          {formatDate(selectedAssessment.scheduled_date)}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Time</p>
                        <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900">
                          {formatTime(selectedAssessment.scheduled_time)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Client Information */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3" role="heading" aria-level={3}>Client Information</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Full Name</p>
                        <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900">
                          {selectedAssessment.client?.first_name} {selectedAssessment.client?.last_name}
                        </div>
                      </div>
                      {selectedAssessment.client?.child_name && (
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Child Name</p>
                          <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900">
                            {selectedAssessment.client.child_name}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Psychologist Information */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3" role="heading" aria-level={3}>Psychologist</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Name</p>
                        <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900">
                          {selectedAssessment.psychologist ? `${selectedAssessment.psychologist.first_name} ${selectedAssessment.psychologist.last_name}` : '—'}
                        </div>
                      </div>
                      {selectedAssessment.psychologist?.email && (
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Email</p>
                          <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900">
                            {selectedAssessment.psychologist.email}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Client Feedback */}
                  {selectedAssessment.status === 'completed' && (selectedAssessment.feedback || selectedAssessment.rating) && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4 space-y-4">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider" role="heading" aria-level={3}>Client Feedback</div>
                      {selectedAssessment.rating != null && (
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Rating</p>
                          <div className="flex items-center gap-1 flex-wrap">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-5 w-5 ${star <= selectedAssessment.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                              />
                            ))}
                            <span className="ml-2 text-sm text-slate-600">({selectedAssessment.rating} out of 5)</span>
                          </div>
                        </div>
                      )}
                      {selectedAssessment.feedback && (
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Feedback</p>
                          <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900">
                            {selectedAssessment.feedback}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Meet Link */}
                  {selectedAssessment.meetLink && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3" role="heading" aria-level={3}>Google Meet Link</div>
                      <a
                        href={selectedAssessment.meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-[#025545] hover:bg-[#025545]/5 break-all"
                      >
                        {selectedAssessment.meetLink}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50/30 flex-shrink-0">
                <button
                  onClick={() => setIsDetailsOpen(false)}
                  className="px-4 py-2 text-[#025545] bg-white border border-[#025545]/40 rounded-lg hover:bg-[#025545]/10 transition-colors text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

