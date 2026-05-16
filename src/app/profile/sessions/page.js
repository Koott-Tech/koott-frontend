"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../contexts/AuthContext";
import { clientApi, messagesApi } from "../../../lib/backendApi";
import RescheduleModal from "../../../components/RescheduleModal";
import SessionFeedbackModal from "../../../components/SessionFeedbackModal";
import WheelPagination from "../../../components/ui/wheel-pagination";
import { normalizeImageUrl } from "@/utils/urlNormalizer";
import { 
  Calendar, 
  MessageSquare,
  X,
  Info
} from "lucide-react";

export default function SessionsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [sessionToReschedule, setSessionToReschedule] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [sessionToFeedback, setSessionToFeedback] = useState(null);
  const [showTooltip, setShowTooltip] = useState(null); // Track which tooltip is open

  // Tab and pagination state
  const [activeTab, setActiveTab] = useState('upcoming'); // Default to upcoming
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSessions, setTotalSessions] = useState(0);
  
  // Packages state (for Packages tab)
  const [clientPackages, setClientPackages] = useState([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(false);

  // Helper function to conditionally apply hover handlers only on desktop
  const getHoverHandlers = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      return {}; // No handlers on mobile
    }
    return {
      onMouseEnter: (e) => e.currentTarget.style.borderColor = '#3f2e73',
      onMouseLeave: (e) => e.currentTarget.style.borderColor = '#e5e7eb'
    };
  };
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    if (activeTab === 'packages') {
      loadPackages();
    } else {
      loadSessions();
    }
  }, [activeTab, currentPage]);

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showTooltip && !event.target.closest('.tooltip-container')) {
        setShowTooltip(null);
      }
    };

    if (showTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showTooltip]);

  const loadPackages = async () => {
    try {
      setIsLoadingPackages(true);
      setIsLoading(true);
      setError(null);
      const packagesData = await clientApi.getClientPackages();
      const rawPackages = packagesData.data?.clientPackages || [];
      // Filter to show only packages with remaining sessions (status: active)
      const packagesWithRemaining = rawPackages.filter(pkg => {
        const totalSessions = Number.isFinite(pkg.total_sessions)
          ? pkg.total_sessions
          : Number(pkg.package?.session_count) || 0;
        const remainingSessions = Number.isFinite(pkg.remaining_sessions) && pkg.remaining_sessions >= 0
          ? pkg.remaining_sessions
          : Math.max(totalSessions - (pkg.completed_sessions || 0), 0);
        return remainingSessions > 0 && pkg.status === 'active';
      });
      setClientPackages(packagesWithRemaining);
    } catch (err) {
      console.error('Error loading packages:', err);
      setError('Failed to load packages');
    } finally {
      setIsLoadingPackages(false);
      setIsLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      setError(null); // Clear any previous errors
      
      let sessionsList = [];
      let pagination = {};
      
      // Optimized: All tabs use backend filtering for efficiency
      // Backend handles all filtering and pagination server-side
      // Status is passed directly: 'upcoming', 'completed', 'cancelled', 'rescheduled'
      
      const params = {
        page: currentPage,
        limit: 5,
        status: activeTab // Backend handles the filtering for all tabs
      };
      
      const sessionsData = await clientApi.getSessions(params);
      
      sessionsList = sessionsData.data?.sessions || [];
      pagination = sessionsData.data?.pagination || {};
      
      // Backend handles all filtering and pagination, just use the results
      setTotalPages(Math.max(1, Math.ceil((pagination.total || 0) / 5)));
      setTotalSessions(pagination.total || 0);
      
      setSessions(sessionsList);
    } catch (err) {
      console.error('Error loading sessions:', err);
      setError('Failed to load sessions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Sessions are already filtered and limited to 5 per page in loadSessions
  const displaySessions = sessions;

  // Use ref to store totalSessions for tabs badge - prevents tabs from re-rendering on page changes
  const totalSessionsForTabsRef = useRef(totalSessions);
  
  // Update ref when totalSessions changes (but ref changes don't trigger re-renders)
  useEffect(() => {
    totalSessionsForTabsRef.current = totalSessions;
  }, [totalSessions]);

  // Memoize handleTabChange to keep it stable
  const handleTabChangeMemoized = useCallback((tab) => {
    // Optimistically update UI immediately for faster perceived performance
    if (tab !== activeTab) {
      setActiveTab(tab);
      setCurrentPage(1); // Reset to first page when changing tabs
      // Don't clear sessions immediately - let new data replace it smoothly
    }
  }, [activeTab]);

  // Memoize tabs component - re-render when activeTab or totalSessions changes (for count display)
  // IMPORTANT: This must be called before any conditional returns to follow React hooks rules
  const tabsComponent = useMemo(() => {
    const tabs = [
      { id: 'upcoming', label: 'Upcoming' },
      { id: 'rescheduled', label: 'Rescheduled' },
      { id: 'packages', label: 'Packages' },
      { id: 'pending', label: 'Pending' },
      { id: 'completed', label: 'Completed' },
      { id: 'cancelled', label: 'Cancelled' }
    ];
    
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 overflow-x-auto">
          {tabs.map((tab) => {
            // For upcoming tab, show total upcoming sessions count
            // Use totalSessions directly (only when upcoming tab is active) to ensure count updates
            const count = tab.id === 'upcoming' && activeTab === 'upcoming' ? totalSessions : (tab.id === 'upcoming' ? totalSessionsForTabsRef.current : 0);
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChangeMemoized(tab.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-full font-medium text-sm flex items-center gap-2 transition-all duration-300 ease-in-out ${
                  isActive
                    ? 'text-white shadow-sm'
                    : 'bg-purple-100 text-gray-600 hover:text-gray-900'
                }`}
                style={isActive ? { 
                  backgroundColor: '#3f2e73',
                  transition: 'background-color 0.3s ease-in-out, color 0.3s ease-in-out'
                } : {
                  transition: 'background-color 0.3s ease-in-out, color 0.3s ease-in-out'
                }}
              >
                <span>{tab.label}</span>
                {tab.id === 'upcoming' && count > 0 && (
                  <span className={`rounded-full text-xs min-w-[20px] h-5 flex items-center justify-center px-1.5 ${
                    isActive ? 'bg-white text-purple-800' : 'bg-white text-purple-800'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }, [activeTab, totalSessions, handleTabChangeMemoized]); // Include totalSessions so count updates when tab is selected

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
      case 'booked':
        // Background will be applied via inline style
        return '';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'reschedule_requested':
        return 'bg-[#f0edff] text-[#3f2e73]'; // Theme color instead of yellow
      case 'rescheduled':
        return 'bg-yellow-100 text-yellow-800';
      case 'expired':
        return 'bg-orange-100 text-orange-800';
      case 'ongoing':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
      case 'pending_completion':
        return 'bg-slate-100 text-slate-700';
      case 'no_show':
      case 'noshow':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusStyle = (status) => {
    if (status?.toLowerCase() === 'scheduled' || status?.toLowerCase() === 'booked') {
      return { backgroundColor: '#3f2e73', color: 'white' };
    }
    if (status?.toLowerCase() === 'reschedule_requested' || status?.toLowerCase() === 'rescheduled') {
      return {};
    }
    // Default fallback for unknown statuses
    if (!status || status.trim() === '') {
      return { backgroundColor: '#3f2e73', color: 'white' };
    }
    return {};
  };

  // Helper to add minutes to time string (HH:MM:SS format)
  const addMinutesToTime = (timeStr, minutes) => {
    if (!timeStr) return null;
    const [hours, mins, secs] = timeStr.split(':').map(Number);
    const totalMinutes = (hours * 60) + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60);
    const newMins = totalMinutes % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}:${secs || '00'}`;
  };

  // Check if session is currently ongoing (between start and end time)
  const isSessionOngoing = (session) => {
    if (!session.scheduled_date || !session.scheduled_time) return false;
    if (session.status === 'completed' || session.status === 'no_show' || session.status === 'noshow') return false;
    
    const now = new Date();
    const timeStr = session.scheduled_time || '00:00:00';
    const timeOnly = timeStr.split(' ')[0];
    const sessionStartDateTime = new Date(`${session.scheduled_date}T${timeOnly}+05:30`);
    
    // Session duration is 50 minutes
    const endTime = addMinutesToTime(timeOnly, 50);
    const sessionEndDateTime = new Date(`${session.scheduled_date}T${endTime}+05:30`);
    
    return sessionStartDateTime <= now && now < sessionEndDateTime;
  };

  // Check if session time has passed (after end time)
  const isSessionExpired = (session) => {
    if (!session.scheduled_date || !session.scheduled_time) return false;
    
    const now = new Date();
    // Create date in IST timezone (time is already in IST format)
    // Format: "2025-12-31T18:00:00+05:30" to ensure IST timezone
    const timeStr = session.scheduled_time || '00:00:00';
    const timeOnly = timeStr.split(' ')[0]; // Remove any timezone suffix if present
    const sessionStartDateTime = new Date(`${session.scheduled_date}T${timeOnly}+05:30`);
    
    // Session duration is 50 minutes - check if end time has passed
    const endTime = addMinutesToTime(timeOnly, 50);
    const sessionEndDateTime = new Date(`${session.scheduled_date}T${endTime}+05:30`);
    
    return sessionEndDateTime < now;
  };

  // Get display status for session
  const getSessionDisplayStatus = (session) => {
    // If already marked as completed or no_show, use that
    if (session.status === 'completed') return { status: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' };
    if (session.status === 'no_show' || session.status === 'noshow') return { status: 'no_show', label: 'No Show', color: 'bg-red-100 text-red-800' };
    
    // Check if session is ongoing
    if (isSessionOngoing(session)) {
      return { status: 'ongoing', label: 'Ongoing', color: 'bg-blue-100 text-blue-800' };
    }
    
    // Check if session time has passed but not marked (awaiting completion or no-show)
    if (isSessionExpired(session)) {
      const allowedStatuses = ['booked', 'scheduled', 'rescheduled', 'reschedule_requested'];
      if (allowedStatuses.includes(session.status)) {
        return { status: 'pending', label: 'Pending', color: 'bg-slate-100 text-slate-700' };
      }
    }
    
    // Default: return original status
    return { status: session.status, label: session.status || 'Scheduled', color: getStatusColor(session.status) };
  };

  // Store all sessions across all tabs for package checking
  const [allSessionsForPackageCheck, setAllSessionsForPackageCheck] = useState([]);

  // Load all booked/upcoming sessions for package checking
  // This allows us to check if there are booked sessions even when viewing completed tab
  useEffect(() => {
    const loadAllSessionsForPackageCheck = async () => {
      try {
        // Fetch sessions with status 'upcoming' to check for booked sessions in packages
        const bookedSessionsData = await clientApi.getSessions({ status: 'upcoming', page: 1, limit: 1000 });
        const bookedSessions = bookedSessionsData.data?.sessions || [];
        setAllSessionsForPackageCheck(bookedSessions);
      } catch (err) {
        console.error('Error loading sessions for package check:', err);
        // Don't block UI if this fails - set empty array as fallback
        setAllSessionsForPackageCheck([]);
      }
    };
    
    // Load when component mounts or when activeTab changes (to refresh booked sessions)
    if (user) {
      loadAllSessionsForPackageCheck();
    }
  }, [user, activeTab]); // Reload when tab changes to get fresh booked sessions

  // Check if there are any upcoming/scheduled sessions for the same package
  const hasUpcomingSessionsForPackage = (packageId) => {
    if (!packageId) return false;
    // Check both current tab sessions and all booked sessions
    const allSessionsToCheck = [...sessions, ...allSessionsForPackageCheck];
    return allSessionsToCheck.some(s => {
      // Must match the package
      if (s.package_id !== packageId) return false;
      
      // Exclude completed, no_show, cancelled sessions
      if (s.status === 'completed' || s.status === 'no_show' || s.status === 'noshow' || s.status === 'cancelled') {
        return false;
      }
      
      // Check if it's an ongoing session
      const displayStatus = getSessionDisplayStatus(s);
      if (displayStatus.status === 'ongoing') {
        return true;
      }
      
      // Check if it's a booked/scheduled/rescheduled session that hasn't expired
      return ['booked', 'scheduled', 'reschedule_requested', 'rescheduled'].includes(s.status) && !isSessionExpired(s);
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateMobile = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    try {
      // Handle formats: "18:00:00" or "18:00" or "6:00 PM" (shouldn't happen but handle it)
      // First, check if it's already in 12-hour format
      if (typeof timeString === 'string' && (timeString.includes('AM') || timeString.includes('PM'))) {
        // Already formatted, return as is
        return timeString;
      }
      
      // Extract time parts (handle HH:MM:SS or HH:MM)
      const timeOnly = timeString.split(' ')[0]; // Remove any timezone or other text
      const timeParts = timeOnly.split(':');
      const hours = parseInt(timeParts[0], 10);
      const minutes = timeParts[1] || '00';
      
      // Validate hours
      if (isNaN(hours) || hours < 0 || hours > 23) {
        console.error('Invalid time format:', timeString);
        return timeString;
      }
      
      // Convert to 12-hour format
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      const displayMinutes = minutes.padStart(2, '0');
      
      return `${displayHour}:${displayMinutes} ${ampm}`;
    } catch (error) {
      console.error('Error formatting time:', timeString, error);
      return timeString;
    }
  };

  const getSummary = (session) => session?.summary || session?.session_summary || '';
  const getReport = (session) => session?.report || session?.session_report || '';
  const getSummaryNotes = (session) => session?.summary_notes || session?.session_notes || '';

  const handleMessageClick = async (session) => {
    try {
      const response = await messagesApi.createConversation(session.id);
      
      // Extract conversation ID from response
      // Backend returns: { success: true, message: '...', data: { conversation: {...} } } or { conversationId: '...' }
      let conversationId = null;
      if (response.data?.conversation?.id) {
        conversationId = response.data.conversation.id;
      } else if (response.data?.conversationId) {
        conversationId = response.data.conversationId;
      } else if (response.message?.conversation?.id) {
        conversationId = response.message.conversation.id;
      } else if (response.message?.conversationId) {
        conversationId = response.message.conversationId;
      } else if (response.conversation?.id) {
        conversationId = response.conversation.id;
      } else if (response.conversationId) {
        conversationId = response.conversationId;
      }
      
      // Store conversation ID in sessionStorage so messages page can auto-select it
      if (conversationId) {
        sessionStorage.setItem('selectedConversationId', conversationId);
      }
      
      router.push('/profile/messages');
    } catch (err) {
      console.error('Error creating conversation:', err);
      setError('Failed to create conversation. Please try again.');
      // Still navigate to messages page - conversation might already exist
      router.push('/profile/messages');
    }
  };

  const handleRescheduleClick = (session) => {
    setSessionToReschedule(session);
    setShowRescheduleModal(true);
  };
  const getMeetLink = (session) =>
    session?.google_meet_link || session?.google_meet_join_url || session?.google_meet_start_url || session?.google_calendar_link;

  const handleJoinMeet = (session) => {
    const meetUrl = getMeetLink(session);
    if (!meetUrl) {
      alert('No Google Meet link available for this session yet.');
      return;
    }
    if (typeof window !== 'undefined') {
      const url = meetUrl.startsWith('http') ? meetUrl : `https://${meetUrl}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };


  const handleRescheduleRequest = async (session) => {
    try {
      await clientApi.requestReschedule(session.id);
      await loadSessions();
    } catch (err) {
      console.error('Error requesting reschedule:', err);
      setError('Failed to request reschedule. Please try again.');
    }
  };

  const handleRescheduleSuccess = async () => {
    await loadSessions();
    setShowRescheduleModal(false);
    setSessionToReschedule(null);
  };

  const handleViewFullReport = (session) => {
    setSelectedReport(session);
    setShowReportModal(true);
  };

  const openFeedbackModal = (session) => {
    setSessionToFeedback(session);
    setShowFeedbackModal(true);
  };

  const handleSubmitFeedback = async (sessionId, feedbackData) => {
    try {
      await clientApi.submitSessionFeedback(sessionId, feedbackData);
      await loadSessions();
      setShowFeedbackModal(false);
      setSessionToFeedback(null);
    } catch (err) {
      console.error('Error submitting feedback:', err);
      throw err;
    }
  };

  if (isLoading) {
    return (
      <div className="absolute inset-0 w-full flex items-center justify-center z-10" style={{ minHeight: 'calc(100vh - 8rem)' }}>
        <div className="flex flex-col items-center justify-center text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mb-4" style={{ borderBottomColor: '#3f2e73' }}></div>
          <p className="text-gray-600">Loading sessions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6">
        <div className="text-center py-12">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white p-6">
        {/* Tabs - Fixed, won't refresh on page changes */}
        {tabsComponent}

        {activeTab === 'packages' ? (
          // Packages Tab Content
          isLoadingPackages ? (
            <div className="absolute inset-0 w-full flex items-center justify-center z-10" style={{ minHeight: 'calc(100vh - 8rem)' }}>
              <div className="flex flex-col items-center justify-center text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 mb-4" style={{ borderBottomColor: '#3f2e73' }}></div>
                <p className="text-gray-600">Loading packages...</p>
              </div>
            </div>
          ) : clientPackages.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Calendar className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-gray-900 mb-2">No Active Packages</h3>
              <p className="text-gray-600 mb-4 sm:mb-6">
                You don't have any packages with remaining sessions.
              </p>
              <button
                onClick={() => router.push('/online-child-psychologist')}
                className="text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg text-sm sm:text-base font-medium transition-colors duration-200 flex items-center gap-2 mx-auto cursor-pointer"
                style={{ backgroundColor: '#3f2e73' }}
                {...(typeof window !== 'undefined' && window.innerWidth >= 1024 ? {
                  onMouseEnter: (e) => e.currentTarget.style.backgroundColor = '#1d1733',
                  onMouseLeave: (e) => e.currentTarget.style.backgroundColor = '#3f2e73'
                } : {})}
              >
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">View Therapists</span>
                <span className="sm:hidden">View Therapists</span>
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              <div>
                {/* Mobile Layout - Single Column Cards */}
                <div className="block lg:hidden space-y-4">
                  {clientPackages.map((pkg) => {
                    const totalSessions = Number.isFinite(pkg.total_sessions)
                      ? pkg.total_sessions
                      : Number(pkg.package?.session_count) || 0;
                    // Use completed_sessions from backend (counts actual completed sessions)
                    const completedSessions = Number.isFinite(pkg.completed_sessions) && pkg.completed_sessions >= 0
                      ? pkg.completed_sessions
                      : 0;
                    // Calculate remaining sessions for display: total - completed (always correct)
                    // This shows how many sessions are left to COMPLETE, not to book
                    const remainingSessions = Math.max(totalSessions - completedSessions, 0);
                    // Use remaining_sessions_for_booking for button logic (sessions left to book)
                    const remainingSessionsForBooking = Number.isFinite(pkg.remaining_sessions_for_booking) && pkg.remaining_sessions_for_booking >= 0
                      ? pkg.remaining_sessions_for_booking
                      : (Number.isFinite(pkg.remaining_sessions) && pkg.remaining_sessions >= 0
                        ? pkg.remaining_sessions
                        : Math.max(totalSessions - 1, 0));
                    // Calculate displayed count: total - remaining_for_booking (includes completed + booked sessions)
                    // This matches the count shown in the upcoming tab
                    const displayedCount = Math.max(totalSessions - remainingSessionsForBooking, completedSessions);
                    
                    return (
                      <div key={pkg.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm transition-colors" {...getHoverHandlers()}>
                        {/* Status Badge */}
                        <div className={`flex ${remainingSessionsForBooking > 0 && pkg.status === 'active' && completedSessions > 0 && !hasUpcomingSessionsForPackage(pkg.package_id) ? 'justify-between' : 'justify-between'} items-center mb-3 gap-2`}>
                          <div className="flex gap-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              Package ({displayedCount}/{totalSessions})
                            </span>
                            <span 
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
                              style={{ backgroundColor: '#3f2e73' }}
                            >
                              {pkg.status === 'active' ? 'Active' : pkg.status}
                            </span>
                          </div>
                          <span 
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${remainingSessions > 0 ? 'text-[#3f2e73] bg-purple-50 border border-purple-200' : 'text-red-600 bg-red-50 border border-red-200'} ${remainingSessionsForBooking > 0 && pkg.status === 'active' && completedSessions > 0 && !hasUpcomingSessionsForPackage(pkg.package_id) ? 'ml-auto mr-2' : ''}`}
                          >
                            Remaining: {remainingSessions}
                          </span>
                        </div>
                        
                        {/* Main Content */}
                        <div className="flex gap-5 items-start">
                          {/* Avatar */}
                          {pkg.psychologist && (
                            <div className="flex-shrink-0 w-28 h-28 rounded-full overflow-hidden border-2 border-gray-200">
                              {pkg.psychologist.cover_image_url ? (
                                <img 
                                  src={normalizeImageUrl(pkg.psychologist.cover_image_url)}
                                  alt={`${pkg.psychologist.first_name} ${pkg.psychologist.last_name}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-semibold text-xl">
                                  {pkg.psychologist.first_name?.[0]}{pkg.psychologist.last_name?.[0]}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Package Details */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 mb-1">
                              Purchased: {new Date(pkg.purchased_at).toLocaleDateString()}
                            </p>
                            <h6 className="text-gray-900 font-bold mb-2">
                              {pkg.package?.name || `Package with ${pkg.psychologist?.first_name} ${pkg.psychologist?.last_name}`}
                            </h6>
                            <div className="space-y-1 text-sm text-gray-600">
                              <p>
                                <span className="font-medium">Total Amount:</span> ₹{pkg.total_amount}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-6">
                          {/* Show button only if: remaining sessions to book > 0, package is active, at least one session completed, AND no booked sessions exist */}
                          {remainingSessionsForBooking > 0 && pkg.status === 'active' && completedSessions > 0 && !hasUpcomingSessionsForPackage(pkg.package_id) ? (
                            <button
                              onClick={() => {
                                const psychologist = pkg.psychologist;
                                if (psychologist) {
                                  const name = psychologist.name || `${psychologist.first_name || ''} ${psychologist.last_name || ''}`.trim();
                                  if (name) {
                                    const slug = name
                                      .toLowerCase()
                                      .trim()
                                      .replace(/[^a-z0-9]+/g, '-')
                                      .replace(/^-+|-+$/g, '');
                                    router.push(`/online-child-psychologist/${slug}?package_id=${pkg.id}`);
                                  }
                                }
                              }}
                              className="flex-1 text-white px-2 py-1 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                              style={{ backgroundColor: '#3f2e73' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d1733'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3f2e73'}
                            >
                              <Calendar className="h-3 w-3" />
                              Book Remaining Sessions
                            </button>
                          ) : (
                            remainingSessions > 0 && hasUpcomingSessionsForPackage(pkg.package_id) ? (
                              <span className="flex-1 text-gray-500 text-xs px-2 py-1 bg-gray-100 rounded text-center inline-flex items-center justify-center">
                                Complete the session
                              </span>
                            ) : pkg.status === 'completed' ? (
                              <span className="flex-1 text-gray-500 text-sm px-2 py-1 bg-gray-100 rounded text-center">
                                Package Completed
                              </span>
                            ) : null
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Layout - Match Completed Sessions Design */}
                <div className="hidden lg:block space-y-4">
                  {clientPackages.map((pkg) => {
                    const totalSessions = Number.isFinite(pkg.total_sessions)
                      ? pkg.total_sessions
                      : Number(pkg.package?.session_count) || 0;
                    // Use completed_sessions from backend (counts actual completed sessions)
                    const completedSessions = Number.isFinite(pkg.completed_sessions) && pkg.completed_sessions >= 0
                      ? pkg.completed_sessions
                      : 0;
                    // Calculate remaining sessions for display: total - completed (always correct)
                    // This shows how many sessions are left to COMPLETE, not to book
                    const remainingSessions = Math.max(totalSessions - completedSessions, 0);
                    // Use remaining_sessions_for_booking for button logic (sessions left to book)
                    const remainingSessionsForBooking = Number.isFinite(pkg.remaining_sessions_for_booking) && pkg.remaining_sessions_for_booking >= 0
                      ? pkg.remaining_sessions_for_booking
                      : (Number.isFinite(pkg.remaining_sessions) && pkg.remaining_sessions >= 0
                        ? pkg.remaining_sessions
                        : Math.max(totalSessions - 1, 0));
                    // Calculate displayed count: total - remaining_for_booking (includes completed + booked sessions)
                    // This matches the count shown in the upcoming tab
                    const displayedCount = Math.max(totalSessions - remainingSessionsForBooking, completedSessions);
                    
                    return (
                      <div key={pkg.id} className="border border-gray-200 rounded-lg p-5 sm:p-6 lg:hover:shadow-md transition-all bg-blue-50/30" {...getHoverHandlers()}>
                        <div className="flex gap-4 items-center">
                          {/* Avatar */}
                          {pkg.psychologist && (
                            <div className="flex-shrink-0 w-28 h-28 rounded-full overflow-hidden border-2 border-gray-200">
                              {pkg.psychologist.cover_image_url ? (
                                <img 
                                  src={normalizeImageUrl(pkg.psychologist.cover_image_url)}
                                  alt={`${pkg.psychologist.first_name} ${pkg.psychologist.last_name}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-semibold text-xl">
                                  {pkg.psychologist.first_name?.[0]}{pkg.psychologist.last_name?.[0]}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Package Details */}
                          <div className="flex-1 flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-0">
                            <div className="flex-1">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 mb-4">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                                  <span className="inline-flex items-center px-2 py-1 sm:px-2.5 sm:py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    Package ({displayedCount}/{totalSessions})
                                  </span>
                                  <span 
                                    className="inline-flex items-center px-2 py-1 sm:px-2.5 sm:py-0.5 rounded-full text-xs font-medium text-white"
                                    style={{ backgroundColor: '#3f2e73' }}
                                  >
                                    {pkg.status === 'active' ? 'Active' : pkg.status}
                                  </span>
                                  <span className="text-xs sm:text-sm text-gray-500">
                                    Purchased: {new Date(pkg.purchased_at).toLocaleDateString()}
                                  </span>
                                </div>
                                <span 
                                  className={`inline-flex items-center px-2 py-1 sm:px-2.5 sm:py-0.5 rounded-full text-xs font-medium ${remainingSessions > 0 ? 'text-[#3f2e73] bg-purple-50 border border-purple-200' : 'text-red-600 bg-red-50 border border-red-200'} ${remainingSessionsForBooking > 0 && pkg.status === 'active' && completedSessions > 0 && !hasUpcomingSessionsForPackage(pkg.package_id) ? 'mr-auto ml-4' : ''}`}
                                >
                                  Remaining: {remainingSessions}
                                </span>
                              </div>
                              
                              <h5 className="text-gray-900 font-semibold mb-3">
                                {pkg.package?.name || `Package with ${pkg.psychologist?.first_name} ${pkg.psychologist?.last_name}`}
                              </h5>
                              
                              <div className="space-y-1 text-sm text-gray-600 mb-2">
                                <p>
                                  <span className="font-medium">Total Amount:</span> ₹{pkg.total_amount}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 items-start sm:items-end sm:ml-4">
                              {/* Show button only if: remaining sessions to book > 0, package is active, at least one session completed, AND no booked sessions exist */}
                              {remainingSessionsForBooking > 0 && pkg.status === 'active' && completedSessions > 0 && !hasUpcomingSessionsForPackage(pkg.package_id) ? (
                                <button
                                  onClick={() => {
                                    const psychologist = pkg.psychologist;
                                    if (psychologist) {
                                      const name = psychologist.name || `${psychologist.first_name || ''} ${psychologist.last_name || ''}`.trim();
                                      if (name) {
                                        const slug = name
                                          .toLowerCase()
                                          .trim()
                                          .replace(/[^a-z0-9]+/g, '-')
                                          .replace(/^-+|-+$/g, '');
                                        router.push(`/online-child-psychologist/${slug}?package_id=${pkg.id}`);
                                      }
                                    }
                                  }}
                                  className="text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-2"
                                  style={{ backgroundColor: '#3f2e73' }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d1733'}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3f2e73'}
                                >
                                  <Calendar className="h-4 w-4" />
                                  Book Remaining Sessions
                                </button>
                              ) : (
                                remainingSessions > 0 && hasUpcomingSessionsForPackage(pkg.package_id) ? (
                                  <span className="text-gray-500 text-sm px-4 py-2 bg-gray-100 rounded-lg inline-flex items-center justify-center">
                                    Complete the session
                                  </span>
                                ) : pkg.status === 'completed' ? (
                                  <span className="text-gray-500 text-sm px-3 py-2 bg-gray-100 rounded-lg">
                                    Package Completed
                                  </span>
                                ) : null
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )
        ) : displaySessions.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <Calendar className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-gray-900 mb-2">No {activeTab} sessions</h3>
            <p className="text-gray-600 mb-4 sm:mb-6">
              {activeTab === 'upcoming' 
                ? 'You don\'t have any upcoming sessions at the moment.'
                : activeTab === 'completed'
                ? 'You don\'t have any completed sessions yet.'
                : activeTab === 'cancelled'
                ? 'You don\'t have any cancelled sessions.'
                : activeTab === 'rescheduled'
                ? 'You don\'t have any rescheduled sessions.'
                : activeTab === 'pending'
                ? 'You don\'t have any pending sessions.'
                : 'You don\'t have any sessions yet.'}
            </p>
            <button
              onClick={() => router.push('/online-child-psychologist')}
              className="text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg text-sm sm:text-base font-medium transition-colors duration-200 flex items-center gap-2 mx-auto cursor-pointer"
              style={{ backgroundColor: '#3f2e73' }}
              {...(typeof window !== 'undefined' && window.innerWidth >= 1024 ? {
                onMouseEnter: (e) => e.currentTarget.style.backgroundColor = '#1d1733',
                onMouseLeave: (e) => e.currentTarget.style.backgroundColor = '#3f2e73'
              } : {})}
            >
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">View Therapists</span>
              <span className="sm:hidden">View Therapists</span>
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Sessions List */}
            {displaySessions.length > 0 ? (
              <div>
                {/* Mobile Layout - Single Column Cards */}
                <div className="block lg:hidden space-y-4">
                  {displaySessions
                    .map((session) => (
                      <div key={session.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm transition-colors" {...getHoverHandlers()}>
                        {/* Status Badge */}
                        <div className="flex justify-end mb-3 gap-2">
                          {(session.session_type === 'assessment' || session.type === 'assessment') && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              Assessment
                            </span>
                          )}
                          {(() => {
                            const displayStatus = getSessionDisplayStatus(session);
                            return (
                              <span 
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${displayStatus.color}`}
                                style={displayStatus.status === 'booked' || displayStatus.status === 'scheduled' ? getStatusStyle(session.status) : {}}
                              >
                                {displayStatus.label}
                              </span>
                            );
                          })()}
                              {((session.package && session.package.package_type) || session.package_id) && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  {session.package?.session_number && session.package?.total_sessions ? (
                                    <span>Package ({session.package.session_number}/{session.package.total_sessions})</span>
                                  ) : (
                                    <span>{session.package?.name?.trim() || 'Package Session'}</span>
                                  )}
                            </span>
                          )}
                        </div>
                        
                        {/* Main Content */}
                        <div className="flex gap-5 items-start">
                          {/* Avatar - For regular sessions, or Icon for free assessments */}
                          {session.session_type === 'free_assessment' ? (
                            <div className="flex-shrink-0 w-20 h-20 rounded-full overflow-hidden">
                              <img 
                                src="/favicon.png"
                                alt="Free Assessment"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : session.session_type !== 'assessment' && session.type !== 'assessment' && (
                            <div className="flex-shrink-0 w-28 h-28 rounded-full overflow-hidden border-2 border-gray-200">
                              {session.psychologist?.cover_image_url ? (
                                <img 
                                  src={normalizeImageUrl(session.psychologist.cover_image_url)}
                                  alt={`${session.psychologist.first_name} ${session.psychologist.last_name}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-semibold text-xl">
                                  {session.psychologist?.first_name?.[0]}{session.psychologist?.last_name?.[0]}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Session Details */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 mb-1">
                              {formatDateMobile(session.scheduled_date)} at {formatTime(session.scheduled_time)}
                            </p>
                            <h6 className="text-gray-900 font-bold mb-2">
                              {session.session_type === 'assessment' || session.type === 'assessment'
                                ? `Assessment: ${session.assessment?.hero_title || session.assessment?.seo_title || 'Assessment Session'}`
                                : session.session_type === 'free_assessment'
                                ? 'Free Assessment'
                                : `Session with ${session.psychologist?.first_name} ${session.psychologist?.last_name}`}
                            </h6>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-6">
                              {/* Action Buttons for booked/rescheduled/ongoing sessions */}
                              {(() => {
                                const displayStatus = getSessionDisplayStatus(session);
                                const isOngoing = displayStatus.status === 'ongoing';
                                const canShowActions = (['booked', 'scheduled', 'reschedule_requested', 'rescheduled'].includes(session.status) && !isSessionExpired(session)) || isOngoing;
                                
                                if (!canShowActions) return null;
                                
                                return (
                            <>
                              {session.session_type !== 'free_assessment' && (
                              <button
                                onClick={() => handleMessageClick(session)}
                                className="flex-1 text-green-600 border border-green-300 px-2 py-1 rounded text-xs font-medium lg:hover:bg-green-50 transition-colors flex items-center justify-center gap-1"
                              >
                                <MessageSquare className="h-3 w-3" />
                                Message
                              </button>
                              )}
                                    {session.status !== 'reschedule_requested' && !isOngoing && (
                              <button
                                onClick={() => handleRescheduleClick(session)}
                                className="flex-1 px-2 py-1 rounded text-xs font-medium transition-colors text-blue-600 border border-blue-300 lg:hover:bg-blue-50"
                              >
                                Reschedule
                              </button>
                                    )}
                                  {getMeetLink(session) && (
                              <button
                                      onClick={() => handleJoinMeet(session)}
                                      className="flex-1 text-green-700 border border-green-300 px-2 py-1 rounded text-xs font-medium lg:hover:bg-green-50 transition-colors"
                              >
                                      Join Meet
                              </button>
                          )}
                            </>
                                );
                              })()}
                          
                          {(() => {
                            const displayStatus = getSessionDisplayStatus(session);
                            if (displayStatus.status === 'ongoing') {
                              return (
                                <span className="flex-1 text-blue-600 bg-blue-100 px-2 py-1 rounded text-xs text-center">
                                  Session Ongoing
                            </span>
                              );
                            }
                            if ((displayStatus.status === 'pending' || displayStatus.status === 'pending_completion')) {
                              return (
                            <span className="flex-1 text-orange-600 bg-orange-100 px-2 py-1 rounded text-xs text-center">
                                  Pending Completion
                            </span>
                              );
                            }
                            if (displayStatus.status === 'no_show') {
                              return (
                                <span className="flex-1 text-red-600 bg-red-100 px-2 py-1 rounded text-xs text-center">
                                  No Show
                            </span>
                              );
                            }
                            // Show feedback button for completed sessions
                            if (session.status === 'completed') {
                              const hasFeedback = session.feedback || session.rating;
                              if (hasFeedback) {
                                return (
                                  <span className="flex-1 text-green-600 bg-green-50 border border-green-200 px-2 py-1 rounded text-xs text-center">
                                    Feedback Submitted
                                  </span>
                                );
                              } else {
                                return (
                                  <button
                                    onClick={() => openFeedbackModal(session)}
                                    className="flex-1 text-purple-600 border border-purple-300 px-2 py-1 rounded text-xs font-medium lg:hover:bg-purple-50 transition-colors flex items-center justify-center gap-1"
                                  >
                                    <MessageSquare className="h-3 w-3" />
                                    Give Feedback
                                  </button>
                                );
                              }
                            }
                            // Show "Book Next Session" button ONLY for completed package sessions with remaining sessions
                            // AND only if there are NO booked/pending sessions in the package
                            // Must check actual session.status === 'completed' (not display status)
                            if (session.status === 'completed' && session.package_id && session.package?.remaining_sessions > 0) {
                              // Check if there are any booked/pending sessions in this package
                              // If yes, don't show the button (user should complete those first)
                              const hasBookedSessions = hasUpcomingSessionsForPackage(session.package_id);
                              if (!hasBookedSessions) {
                                const psychologist = session.psychologist;
                                if (psychologist) {
                                  const name = psychologist.name || `${psychologist.first_name || ''} ${psychologist.last_name || ''}`.trim();
                                  if (name) {
                                    const slug = name
                                      .toLowerCase()
                                      .trim()
                                      .replace(/[^a-z0-9]+/g, '-')
                                      .replace(/^-+|-+$/g, '');
                                    return (
                                      <button
                                        onClick={() => router.push(`/online-child-psychologist/${slug}?package_id=${session.package_id}`)}
                                        className="flex-1 text-white px-2 py-1 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                                        style={{ backgroundColor: '#3f2e73' }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d1733'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3f2e73'}
                                      >
                                        <Calendar className="h-3 w-3" />
                                        Book Next Session
                                      </button>
                                    );
                                  }
                                }
                              }
                            }
                            return null;
                          })()}
                          
                          
                        </div>
                      </div>
                    ))}
                </div>

                {/* Desktop Layout - Current Design */}
                <div className="hidden lg:block space-y-4">
                  {displaySessions
                    .map((session) => (
                      <div key={session.id} className="border border-gray-200 rounded-lg p-5 sm:p-6 lg:hover:shadow-md transition-all bg-blue-50/30" {...getHoverHandlers()}>
                        <div className="flex gap-4 items-center">
                          {/* Avatar / Placeholder - For regular sessions, or Icon for free assessments */}
                          {session.session_type === 'free_assessment' ? (
                            <div className="flex-shrink-0 w-20 h-20 rounded-full overflow-hidden">
                              <img 
                                src="/favicon.png"
                                alt="Free Assessment"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : session.session_type !== 'assessment' && session.type !== 'assessment' && (
                          <div className="flex-shrink-0 w-28 h-28 rounded-full overflow-hidden border-2 border-gray-200">
                              {session.psychologist?.cover_image_url ? (
                                <img 
                                  src={normalizeImageUrl(session.psychologist.cover_image_url)}
                                  alt={`${session.psychologist.first_name} ${session.psychologist.last_name}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-semibold text-xl">
                                  {session.psychologist?.first_name?.[0]}{session.psychologist?.last_name?.[0]}
                                </div>
                            )}
                          </div>
                          )}
                          
                          {/* Session Details */}
                          <div className="flex-1 flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-0">
                            <div className="flex-1">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-4">
                                {(() => {
                                  const displayStatus = getSessionDisplayStatus(session);
                                  if (displayStatus.status === 'reschedule_requested') {
                                    return (
                                    <span 
                                        className={`inline-flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-0.5 rounded-full text-xs font-medium ${displayStatus.color} group`} 
                                      style={getStatusStyle(session.status)}
                                    >
                                        Reschedule Requested
                                        <div className="relative tooltip-container">
                                          <Info 
                                            className="h-3.5 w-3.5 text-current cursor-help" 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setShowTooltip(showTooltip === session.id ? null : session.id);
                                            }}
                                            onMouseEnter={() => {
                                              if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
                                                setShowTooltip(session.id);
                                              }
                                            }}
                                            onMouseLeave={() => {
                                              if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
                                                setShowTooltip(null);
                                              }
                                            }}
                                          />
                                          {showTooltip === session.id && (
                                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-white border-2 border-[#3f2e73] text-gray-900 text-xs rounded-lg shadow-lg z-50 tooltip-container">
                                              <div className="space-y-1.5">
                                                <p className="font-semibold mb-2 text-[#3f2e73]">Reschedule Request Rules:</p>
                                                <p>• If reschedule is within 24 hours of session OR</p>
                                                <p>• If this is your 2nd or more reschedule</p>
                                                <p className="mt-2 font-semibold">→ Admin approval is required</p>
                                                <p className="mt-2">If approved by admin, your session will be rescheduled.</p>
                                                <p className="mt-2 text-[#3f2e73]">If you don't receive a response, please contact us via WhatsApp.</p>
                                              </div>
                                              {/* Tooltip arrow */}
                                              <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#3f2e73]"></div>
                                            </div>
                                          )}
                                        </div>
                                    </span>
                                    );
                                  }
                                  return (
                                    <span 
                                      className={`inline-flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-0.5 rounded-full text-xs font-medium ${displayStatus.color}`} 
                                      style={displayStatus.status === 'booked' || displayStatus.status === 'scheduled' ? getStatusStyle(session.status) : {}}
                                    >
                                      {displayStatus.label}
                                    </span>
                                  );
                                })()}
                                    {((session.package && session.package.package_type) || session.package_id) && (
                                      <span className="inline-flex items-center px-2 py-1 sm:px-2.5 sm:py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                        {session.package?.session_number && session.package?.total_sessions ? (
                                      <span>Package ({session.package.session_number}/{session.package.total_sessions})</span>
                                        ) : (
                                      <span>{session.package?.name?.trim() || 'Package Session'}</span>
                                        )}
                                  </span>
                                )}
                                <span className="text-xs sm:text-sm text-gray-500">
                                  {formatDate(session.scheduled_date)} at {formatTime(session.scheduled_time)}
                                </span>
                                {session.reschedule_count > 0 && (
                                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                    Rescheduled {session.reschedule_count} time{session.reschedule_count > 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                              
                              <h5 className="text-gray-900 font-semibold mb-1 leading-tight">
                                {session.session_type === 'assessment' || session.type === 'assessment'
                                  ? (
                                    <span className="flex items-center gap-2">
                                      <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full">
                                        Assessment
                                      </span>
                                      {session.assessment?.hero_title || session.assessment?.seo_title || 'Assessment Session'}
                                    </span>
                                  )
                                  : session.session_type === 'free_assessment'
                                  ? 'Free Assessment'
                                  : `Session with ${session.psychologist?.first_name} ${session.psychologist?.last_name}`}
                              </h5>
                              
                              {Number(session.price) > 0 && (
                                <p className="text-gray-600 mb-1 leading-tight">
                                  Price: ₹{session.price}
                                </p>
                              )}
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                              {/* Action Buttons for booked/rescheduled/ongoing sessions */}
                              {(() => {
                                const displayStatus = getSessionDisplayStatus(session);
                                const isOngoing = displayStatus.status === 'ongoing';
                                const canShowActions = (['booked', 'scheduled', 'reschedule_requested', 'rescheduled'].includes(session.status) && !isSessionExpired(session)) || isOngoing;
                                
                                if (!canShowActions) return null;
                                
                                return (
                                <>
                                  {session.session_type !== 'free_assessment' && (
                                  <button
                                    onClick={() => handleMessageClick(session)}
                                    className="text-green-600 lg:hover:text-green-900 text-xs sm:text-sm font-medium border border-green-300 px-2 py-1 rounded-md lg:hover:bg-green-50 transition-colors flex items-center gap-1 cursor-pointer"
                                  >
                                    <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
                                    <span>Message</span>
                                  </button>
                                  )}
                                    {session.status !== 'reschedule_requested' && !isOngoing && (
                                  <button
                                    onClick={() => handleRescheduleClick(session)}
                                    className="text-blue-600 border border-blue-300 lg:hover:bg-blue-50 lg:hover:text-blue-900 text-xs sm:text-sm font-medium px-2 py-1 rounded-md transition-colors cursor-pointer"
                                  >
                                    {session.reschedule_count > 0 ? 'Request Reschedule' : 'Reschedule'}
                                  </button>
                                    )}
                                  {getMeetLink(session) && (
                                  <button
                                      onClick={() => handleJoinMeet(session)}
                                      className="text-green-700 lg:hover:text-green-900 text-xs sm:text-sm font-medium border border-green-300 px-2 py-1 rounded-md lg:hover:bg-green-50 transition-colors cursor-pointer"
                                  >
                                      Join Meet
                                  </button>
                              )}
                                </>
                                );
                              })()}
                              
                              {(() => {
                                const displayStatus = getSessionDisplayStatus(session);
                                if (displayStatus.status === 'ongoing') {
                                  return (
                                    <span className="text-blue-600 bg-blue-100 px-2 py-1 rounded-md text-xs sm:text-sm">
                                      Session Ongoing
                                </span>
                                  );
                                }
                                if ((displayStatus.status === 'pending' || displayStatus.status === 'pending_completion')) {
                                  return (
                                <span className="text-orange-600 bg-orange-100 px-2 py-1 rounded-md text-xs sm:text-sm">
                                      Pending Completion
                                </span>
                                  );
                                }
                                if (displayStatus.status === 'no_show') {
                                  return (
                                    <span className="text-red-600 bg-red-100 px-2 py-1 rounded-md text-xs sm:text-sm">
                                      No Show
                                </span>
                                  );
                                }
                                // Show feedback button for completed sessions
                                if (session.status === 'completed') {
                                  const hasFeedback = session.feedback || session.rating;
                                  if (hasFeedback) {
                                    return (
                                      <span className="text-green-600 bg-green-50 border border-green-200 px-3 py-1.5 rounded-md text-xs sm:text-sm text-center">
                                        Feedback Submitted
                                      </span>
                                    );
                                  } else {
                                    return (
                                      <button
                                        onClick={() => openFeedbackModal(session)}
                                        className="text-purple-600 border border-purple-300 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium lg:hover:bg-purple-50 transition-colors flex items-center gap-2 cursor-pointer"
                                      >
                                        <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
                                        Give Feedback
                                      </button>
                                    );
                                  }
                                }
                                // Show "Book Next Session" button ONLY for completed package sessions with remaining sessions
                                // AND only if there are NO booked/pending sessions in the package
                                // Must check actual session.status === 'completed' (not display status)
                                if (session.status === 'completed' && session.package_id && session.package?.remaining_sessions > 0) {
                                  // Check if there are any booked/pending sessions in this package
                                  // If yes, don't show the button (user should complete those first)
                                  const hasBookedSessions = hasUpcomingSessionsForPackage(session.package_id);
                                  if (!hasBookedSessions) {
                                    const psychologist = session.psychologist;
                                    if (psychologist) {
                                      const name = psychologist.name || `${psychologist.first_name || ''} ${psychologist.last_name || ''}`.trim();
                                      if (name) {
                                        const slug = name
                                          .toLowerCase()
                                          .trim()
                                          .replace(/[^a-z0-9]+/g, '-')
                                          .replace(/^-+|-+$/g, '');
                                        return (
                                          <button
                                            onClick={() => router.push(`/online-child-psychologist/${slug}?package_id=${session.package_id}`)}
                                            className="text-white px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer"
                                            style={{ backgroundColor: '#3f2e73' }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d1733'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3f2e73'}
                                          >
                                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                                            Book Next Session
                                          </button>
                                        );
                                      }
                                    }
                                  }
                                }
                                return null;
                              })()}
                              
                              
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Pagination Controls - Wheel Pagination */}
                {totalPages > 1 && displaySessions.length > 0 && (
                  <div className="flex items-center justify-center mt-8 pt-6 border-t border-gray-200">
                    <WheelPagination
                      totalPages={totalPages}
                      visibleCount={7}
                      currentPage={currentPage - 1} // Convert 1-indexed to 0-indexed
                      onPageChange={(page) => handlePageChange(page + 1)} // Convert back to 1-indexed
                      className="bg-white"
                    />
                                </div>
                              )}
                            </div>
            ) : (
              <div className="text-center py-8 sm:py-12">
                <Calendar className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-gray-900 mb-2">No {activeTab} sessions</h3>
                <p className="text-gray-600">You don&apos;t have any {activeTab} sessions yet.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <RescheduleModal
        isOpen={showRescheduleModal}
        session={sessionToReschedule}
        onClose={() => {
          setShowRescheduleModal(false);
          setSessionToReschedule(null);
        }}
        onRescheduleSuccess={handleRescheduleSuccess}
      />

      {showFeedbackModal && (
        <SessionFeedbackModal
          isOpen={showFeedbackModal}
          session={sessionToFeedback}
          onClose={() => {
            setShowFeedbackModal(false);
            setSessionToFeedback(null);
          }}
          onSubmit={handleSubmitFeedback}
        />
      )}

      {/* Report Modal */}
      {showReportModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h5 className="text-gray-900">Complete Session Report</h5>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-gray-400 lg:hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4">
                <div className="space-y-4">
                  <div>
                  <h6 className="text-gray-900">Session Details</h6>
                    <p className="text-gray-600">
                      {formatDate(selectedReport.scheduled_date)} at {formatTime(selectedReport.scheduled_time)}
                    </p>
                  </div>
                  
                    <div>
                  <h6 className="text-gray-900">Session Summary</h6>
                  {getSummary(selectedReport) ? (
                    <p className="text-gray-600">{getSummary(selectedReport)}</p>
                  ) : (
                    <p className="text-gray-500 italic">No summary available for this session.</p>
                  )}
                </div>

                {getReport(selectedReport) && (
                  <div>
                    <h6 className="text-gray-900">Session Report</h6>
                    <p className="text-gray-600">{getReport(selectedReport)}</p>
                  </div>
                )}

                {getSummaryNotes(selectedReport) && (
                    <div>
                    <h6 className="text-gray-900">Additional Notes</h6>
                    <p className="text-gray-600">{getSummaryNotes(selectedReport)}</p>
                    </div>
                  )}

                  {selectedReport.feedback && (
                    <div>
                    <h6 className="text-gray-900">Feedback</h6>
                      <p className="text-gray-600">{selectedReport.feedback}</p>
                    </div>
                  )}
                </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

