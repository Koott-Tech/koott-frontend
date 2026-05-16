"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { psychologistApi } from "../../../lib/backendApi";
import { 
  Calendar, 
  Clock, 
  User,
  CheckCircle,
  AlertCircle,
  X,
  FileText,
  MessageSquare,
  Trash2,
  MoreVertical,
  Eye,
  Video,
  CheckCircle2,
  XCircle,
  Search,
  History
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import SessionCompletionModal from "../../../components/SessionCompletionModal";
import SessionDetailsModal from "../../../components/SessionDetailsModal";
import SessionNotesModal from "../../../components/SessionNotesModal";
import ScheduleAssessmentSessionModal from "../../../components/ScheduleAssessmentSessionModal";
import WheelPagination from "../../../components/ui/wheel-pagination";
// Removed RescheduleRequestPopup import - reschedule requests are handled on rescheduling page
import { useNotification } from "../../../contexts/NotificationContext";
import { sessionBookedAtIso } from "@/lib/sessionBookedAt";

const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5";
const valueBoxClass = "bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800";

function SessionHistoryDetailView({ session, currentPsychologistId, formatTime, formatDate }) {
  const isOwnSession = session.psychologist_id === currentPsychologistId;
  const showPrivateNotes = isOwnSession && session.summary_notes;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
        <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3" role="heading" aria-level={2}>Session</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Date</label>
            <div className={valueBoxClass}>{session.scheduled_date ? formatDate(session.scheduled_date) : "—"}</div>
          </div>
          <div>
            <label className={labelClass}>Time</label>
            <div className={valueBoxClass}>{session.scheduled_time ? formatTime(session.scheduled_time) : "—"}</div>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Booked at (IST)</label>
            <div className={valueBoxClass}>
              {sessionBookedAtIso(session)
                ? new Date(sessionBookedAtIso(session)).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "—"}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Therapist</label>
            <div className={valueBoxClass}>{session.psychologist_name || "—"}</div>
          </div>
        </div>
      </div>
      {session.summary && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3" role="heading" aria-level={2}>Session summary</div>
          <div className={`${valueBoxClass} whitespace-pre-wrap`}>{session.summary}</div>
        </div>
      )}
      {session.report && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3" role="heading" aria-level={2}>Session report</div>
          <div className={`${valueBoxClass} whitespace-pre-wrap`}>{session.report}</div>
        </div>
      )}
      {showPrivateNotes && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3" role="heading" aria-level={2}>Private notes</div>
          <div className={`${valueBoxClass} whitespace-pre-wrap`}>{session.summary_notes}</div>
          <p className="text-xs text-slate-500 mt-2">Visible only to you (therapist who conducted this session).</p>
        </div>
      )}
    </div>
  );
}

export default function PsychologistSessions() {
  const { user } = useAuth();
  const { showError, showSuccess } = useNotification();
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [completingSessions, setCompletingSessions] = useState(new Set());
  const [markingNoShowSessions, setMarkingNoShowSessions] = useState(new Set());
  const [selectedSession, setSelectedSession] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  // Reschedule requests are now handled on the rescheduling page
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedCompleteSession, setSelectedCompleteSession] = useState(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedNotesSession, setSelectedNotesSession] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedScheduleSession, setSelectedScheduleSession] = useState(null);
  const [feedbackToView, setFeedbackToView] = useState(null);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' or 'completed'
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const sessionsPerPage = 10;
  // Client session history (History in 3-dots)
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyClientId, setHistoryClientId] = useState(null);
  const [historyClientName, setHistoryClientName] = useState('');
  const [historySessions, setHistorySessions] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistorySession, setSelectedHistorySession] = useState(null);
  // Removed reschedule notification state - notifications are only handled on rescheduling page


  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Request a high limit to ensure we get all sessions including pending ones
      const sessionsData = await psychologistApi.getSessions({ limit: 1000 });
      setSessions(sessionsData.data?.sessions || []);
      // Reset to first page when sessions are reloaded
      setCurrentPage(1);
    } catch (err) {
      console.error('Error loading sessions:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Removed loadRescheduleNotifications - notifications are only fetched on rescheduling page

  const handleUpdateSession = async (sessionId, updateData) => {
    try {
      await psychologistApi.updateSession(sessionId, updateData);
      await loadSessions(); // Reload sessions
    } catch (err) {
      console.error('Error updating session:', err);
      setError(err.message);
      showError(`Failed to update session: ${err.message}`, 'Update Error');
    }
  };

  const handleDeleteSession = async (session) => {
    try {
      if (!confirm('Are you sure you want to delete this session?')) return;
      await psychologistApi.deleteSession(session.id);
      await loadSessions();
      showSuccess('Session deleted successfully');
    } catch (err) {
      console.error('Error deleting session:', err);
      setError(err.message);
      showError(`Failed to delete session: ${err.message}`, 'Delete Error');
    }
  };

  const handleCompleteSession = async (sessionId, sessionData) => {
    try {
      setError(null);
      setCompletingSessions(prev => new Set(prev).add(sessionId));
      
      // Map the form data from SessionCompletionModal to backend expected format
      const mappedData = {
        summary: sessionData.summary?.trim?.() || '',
        report: sessionData.report?.trim?.() || '',
        summary_notes: sessionData.summary_notes?.trim?.() || ''
      };
      
      if (!mappedData.summary || !mappedData.report || !mappedData.summary_notes) {
        throw new Error('Summary, report, and summary notes are required.');
      }
      
      await psychologistApi.completeSession(sessionId, mappedData);
      
      // Show success feedback
      setSuccessMessage('Session finished successfully with summary and notes!');
      showSuccess('Session completed successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Reload sessions to update the UI
      await loadSessions();
    } catch (err) {
      console.error('Error completing session:', err);
      setError(`Failed to finish session: ${err.message}`);
      showError(`Failed to complete session: ${err.message}`, 'Completion Error');
      throw err; // Re-throw to let the modal handle the error
    } finally {
      setCompletingSessions(prev => {
        const newSet = new Set(prev);
        newSet.delete(sessionId);
        return newSet;
      });
    }
  };

  const openCompleteSessionModal = (session) => {
    // Only allow finishing for non-completed sessions
    if (session.status === 'completed') {
      setError('This session is already completed');
      showWarning('This session is already completed', 'Session Status');
      return;
    }
    
    setSelectedCompleteSession(session);
    setShowCompleteModal(true);
  };

  const handleMarkAsNoShow = async (sessionId, reason = '') => {
    if (!confirm('Are you sure you want to mark this session as no-show? This action cannot be undone.')) {
      return;
    }

    try {
      setError(null);
      setMarkingNoShowSessions(prev => new Set(prev).add(sessionId));
      
      await psychologistApi.markSessionAsNoShow(sessionId, reason);
      
      showSuccess('Session marked as no-show successfully');
      setSuccessMessage('Session marked as no-show');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Reload sessions to update the UI
      await loadSessions();
    } catch (err) {
      console.error('Error marking session as no-show:', err);
      setError(`Failed to mark session as no-show: ${err.message}`);
      showError(`Failed to mark session as no-show: ${err.message}`, 'No-Show Error');
    } finally {
      setMarkingNoShowSessions(prev => {
        const newSet = new Set(prev);
        newSet.delete(sessionId);
        return newSet;
      });
    }
  };

  const openSessionNotesModal = (session) => {
    setSelectedNotesSession(session);
    setShowNotesModal(true);
  };

  const getMeetLink = (session) =>
    session?.google_meet_link || session?.google_meet_join_url || session?.google_meet_start_url || session?.google_calendar_link;

  const handleJoinMeet = (session) => {
    const meetUrl = getMeetLink(session);
    if (!meetUrl) {
      alert('No Google Meet link is available for this session yet.');
      return;
    }
    if (typeof window !== 'undefined') {
      const url = meetUrl.startsWith('http') ? meetUrl : `https://${meetUrl}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };





  // Removed reschedule popup handlers - reschedule requests are now handled on the rescheduling page

  const handleViewDetails = (session) => {
    console.log('Session data for details:', session);
    console.log('Client data:', session.client);
    console.log('User email:', session.client?.user?.email);
    setSelectedSession(session);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedSession(null);
  };

  const openHistory = async (session) => {
    const cid = session.client_id ?? session.client?.id;
    if (!cid) {
      showError('Client not found for this session', 'History');
      return;
    }
    const name = [session.client?.first_name, session.client?.last_name].filter(Boolean).join(' ').trim() || 'Client';
    setHistoryClientId(cid);
    setHistoryClientName(name);
    setHistorySessions([]);
    setSelectedHistorySession(null);
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const res = await psychologistApi.getClientSessionHistory(cid);
      const list = res?.data?.sessions ?? [];
      setHistorySessions(list);
    } catch (err) {
      console.error('Load session history error:', err);
      showError(err.message || 'Failed to load session history', 'History');
      setHistorySessions([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3f2e73] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading sessions...</p>
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

  const isAssignedToCurrentPsychologist = (session) => {
    // Regular therapy sessions always have psychologist_id; ensure it matches current user
    if (session.psychologist_id && session.psychologist_id !== user?.id) {
      return false;
    }
    // Assessment sessions that are still unassigned shouldn't appear in the main sessions list
    if ((session.session_type === 'assessment' || session.type === 'assessment') && !session.psychologist_id) {
      return false;
    }
    return true;
  };

  // Exclude free assessment items from psychologist panel
  const excludeFreeAssessment = (s) => s.session_type !== 'free_assessment';
  // Include all sessions (booked, rescheduled, and pending) in upcoming sessions
  // Pending assessment sessions will also appear here, not in a separate section
  // But only include pending sessions that don't have a scheduled date/time yet (truly need scheduling)
  const allUpcomingSessions = sessions.filter(s => {
    if (!isAssignedToCurrentPsychologist(s)) return false;
    if (!excludeFreeAssessment(s)) return false;
    // Include booked and rescheduled sessions
    if (s.status === 'booked' || s.status === 'rescheduled') return true;
    // For pending sessions, only include if they don't have scheduled_date and scheduled_time
    // If they have both, they're already scheduled (just status hasn't been updated yet)
    if (s.status === 'pending') {
      return !s.scheduled_date || !s.scheduled_time;
    }
    return false;
  });

  // Sort upcoming sessions by date/time (nearest first)
  const sortedUpcomingSessions = [...allUpcomingSessions].sort((a, b) => {
    // Sessions without scheduled_date/time go to the end
    if (!a.scheduled_date || !a.scheduled_time) return 1;
    if (!b.scheduled_date || !b.scheduled_time) return -1;
    
    const dateA = new Date(`${a.scheduled_date}T${a.scheduled_time}`);
    const dateB = new Date(`${b.scheduled_date}T${b.scheduled_time}`);
    return dateA - dateB; // Ascending order (nearest first)
  });

  const completedSessions = sessions.filter(s => s.status === 'completed' && excludeFreeAssessment(s));
  const pastSessions = sessions.filter(s => 
    (s.status === 'completed' || s.status === 'cancelled' || s.status === 'no_show') && 
    excludeFreeAssessment(s) && 
    isAssignedToCurrentPsychologist(s)
  );

  // Sort past sessions by date/time (most recent first)
  const sortedPastSessions = [...pastSessions].sort((a, b) => {
    if (!a.scheduled_date || !a.scheduled_time) return 1;
    if (!b.scheduled_date || !b.scheduled_time) return -1;
    
    const dateA = new Date(`${a.scheduled_date}T${a.scheduled_time}`);
    const dateB = new Date(`${b.scheduled_date}T${b.scheduled_time}`);
    return dateB - dateA; // Descending order (most recent first)
  });

  // Filter by search (client name) — after sorted lists are defined
  const filterBySearch = (list) => {
    if (!searchTerm.trim()) return list;
    const q = searchTerm.trim().toLowerCase();
    return list.filter(s => {
      const name = `${s.client?.first_name || ''} ${s.client?.last_name || ''}`.trim().toLowerCase();
      const child = (s.client?.child_name || '').toLowerCase();
      return name.includes(q) || child.includes(q);
    });
  };
  const filteredUpcoming = filterBySearch(sortedUpcomingSessions);
  const filteredPast = filterBySearch(sortedPastSessions);

  // Calculate pagination for upcoming sessions
  const totalUpcomingPages = Math.max(1, Math.ceil(filteredUpcoming.length / sessionsPerPage));
  const upcomingStartIndex = (currentPage - 1) * sessionsPerPage;
  const upcomingEndIndex = upcomingStartIndex + sessionsPerPage;
  const paginatedUpcomingSessions = filteredUpcoming.slice(upcomingStartIndex, upcomingEndIndex);

  // Calculate pagination for completed sessions
  const totalCompletedPages = Math.max(1, Math.ceil(filteredPast.length / sessionsPerPage));
  const completedStartIndex = (currentPage - 1) * sessionsPerPage;
  const completedEndIndex = completedStartIndex + sessionsPerPage;
  const paginatedPastSessions = filteredPast.slice(completedStartIndex, completedEndIndex);

  // Get current sessions based on active tab
  const currentSessions = activeTab === 'upcoming' ? paginatedUpcomingSessions : paginatedPastSessions;
  const totalPages = activeTab === 'upcoming' ? totalUpcomingPages : totalCompletedPages;
  const totalSessions = activeTab === 'upcoming' ? filteredUpcoming.length : filteredPast.length;

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage + 1); // WheelPagination uses 0-indexed, we use 1-indexed
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1); // Reset to first page when switching tabs
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  // Add minutes to time string (HH:mm or HH:mm:ss), return HH:mm:ss
  const addMinutesToTime = (timeStr, minutes) => {
    if (!timeStr || typeof timeStr !== 'string') return '00:00:00';
    const part = timeStr.trim().split(' ')[0];
    const [h, m, s] = part.split(':').map((x) => parseInt(x, 10) || 0);
    const totalMins = h * 60 + m + minutes;
    const nh = Math.floor(totalMins / 60) % 24;
    const nm = totalMins % 60;
    return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}:${String(s || 0).padStart(2, '0')}`;
  };

  // Session is ongoing if now is between session start and start + 50 min
  const isSessionOngoing = (session) => {
    if (!session?.scheduled_date || !session?.scheduled_time) return false;
    if (session.status === 'completed' || session.status === 'no_show' || session.status === 'noshow') return false;
    const now = new Date();
    const timeOnly = String(session.scheduled_time).trim().split(' ')[0];
    const sessionStart = new Date(`${session.scheduled_date}T${timeOnly}+05:30`);
    const endTime = addMinutesToTime(timeOnly, 50);
    const sessionEnd = new Date(`${session.scheduled_date}T${endTime}+05:30`);
    return sessionStart <= now && now < sessionEnd;
  };

  const getStatusBadge = (session) => {
    const now = new Date();
    const timeStr = session.scheduled_time ? String(session.scheduled_time).trim().split(' ')[0] : '';
    const sessionStart = session.scheduled_date && timeStr ? new Date(`${session.scheduled_date}T${timeStr}+05:30`) : null;
    const sessionEnd = sessionStart && timeStr ? new Date(`${session.scheduled_date}T${addMinutesToTime(timeStr, 50)}+05:30`) : null;
    const isOngoing = isSessionOngoing(session);
    const isTimePassed = sessionEnd ? now >= sessionEnd : (session.scheduled_date && session.scheduled_time && new Date(`${session.scheduled_date}T${session.scheduled_time}`) < now);

    let status = session.status;
    let label = session.status;
    if (session.status === 'completed') {
      status = 'completed';
      label = 'Completed';
    } else if (session.status === 'cancelled') {
      status = 'cancelled';
      label = 'Cancelled';
    } else if (session.status === 'no_show' || session.status === 'noshow') {
      status = 'no_show';
      label = 'No Show';
    } else if (session.status === 'rescheduled') {
      status = 'rescheduled';
      label = 'Rescheduled';
    } else if (isOngoing) {
      status = 'ongoing';
      label = 'Ongoing';
    } else if ((session.status === 'booked' || session.status === 'pending') && isTimePassed) {
      status = 'pending';
      label = 'Pending';
    } else if (session.status === 'pending') {
      status = 'pending';
      label = 'Pending';
    } else if (session.status === 'booked') {
      status = 'booked';
      label = 'Booked';
    }

    const classes = {
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      no_show: 'bg-orange-100 text-orange-800',
      rescheduled: 'bg-amber-100 text-amber-800',
      booked: 'bg-[#3f2e73]/10 text-[#3f2e73]',
      pending: 'bg-slate-100 text-slate-700',
      ongoing: 'bg-blue-100 text-blue-800'
    };
    return { label, className: classes[status] || 'bg-gray-100 text-gray-800' };
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      {/* Success / Error */}
      {successMessage && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />
          <span>{successMessage}</span>
        </div>
      )}
      {error && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters and search */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by client name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#3f2e73]/20 focus:border-[#3f2e73]"
            />
          </div>
        </div>
      </div>

      {/* Tabs - modern segmented */}
      <div className="mt-6 flex rounded-xl bg-slate-100 p-1 w-fit">
        <button
          onClick={() => handleTabChange('upcoming')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'upcoming'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Upcoming
          {sortedUpcomingSessions.length > 0 && (
            <span className={`ml-1.5 py-0.5 px-1.5 rounded text-xs ${activeTab === 'upcoming' ? 'bg-[#3f2e73]/10 text-[#3f2e73]' : 'bg-slate-200 text-slate-600'}`}>
              ({sortedUpcomingSessions.length})
            </span>
          )}
        </button>
        <button
          onClick={() => handleTabChange('completed')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'completed'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Completed
          {sortedPastSessions.length > 0 && (
            <span className={`ml-1.5 py-0.5 px-1.5 rounded text-xs ${activeTab === 'completed' ? 'bg-[#3f2e73]/10 text-[#3f2e73]' : 'bg-slate-200 text-slate-600'}`}>
              ({sortedPastSessions.length})
            </span>
          )}
        </button>
      </div>

      {/* Table */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {currentSessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 sm:px-6 py-12 text-center">
                    {activeTab === 'upcoming' ? (
                      <>
                        <Calendar className="mx-auto h-10 w-10 text-slate-300" />
                        <p className="mt-2 text-sm font-medium text-slate-700">No upcoming sessions</p>
                        <p className="mt-1 text-xs text-slate-500">Scheduled sessions will appear here.</p>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mx-auto h-10 w-10 text-slate-300" />
                        <p className="mt-2 text-sm font-medium text-slate-700">No past sessions</p>
                        <p className="mt-1 text-xs text-slate-500">Completed and past sessions will appear here.</p>
                      </>
                    )}
                  </td>
                </tr>
              ) : (
                currentSessions.map((session) => {
                  const statusBadge = getStatusBadge(session);
                  return (
                    <tr key={session.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-[#3f2e73]/10 flex items-center justify-center shrink-0">
                            <User className="h-4 w-4 text-[#3f2e73]" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {session.client?.first_name} {session.client?.last_name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-slate-700">
                        {session.scheduled_date ? (
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                            {new Date(session.scheduled_date).toLocaleDateString()}
                          </span>
                        ) : (session.status === 'pending' && !session.scheduled_date) ? (
                          <span className="text-amber-600 text-xs font-medium">Pending</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-slate-700">
                        {session.scheduled_time ? (
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                            {formatTime(session.scheduled_time)}
                          </span>
                        ) : (session.status === 'pending' && !session.scheduled_time) ? (
                          <span className="text-amber-600 text-xs font-medium">Pending</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        {(session.session_type === 'assessment' || session.type === 'assessment') && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#3f2e73]/10 text-[#3f2e73]">Assessment</span>
                        )}
                        {session.package_id || session.package ? (
                          (() => {
                            const p = session.package || {};
                            const idx = p.session_index;
                            const total = p.total_sessions ?? p.session_count ?? 0;
                            const raw = (p.package_type || 'Package').replace(/_\d+$/, '') || 'Package';
                            const label = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
                            if (total > 0 && idx != null) {
                              return (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#3f2e73]/10 text-[#3f2e73]">
                                  {label} {idx}/{total}
                                </span>
                              );
                            }
                            if (total > 0) {
                              return (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#3f2e73]/10 text-[#3f2e73]">
                                  {label} ({total})
                                </span>
                              );
                            }
                            return (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#3f2e73]/10 text-[#3f2e73]">
                                {label}
                              </span>
                            );
                          })()
                        ) : (session.session_type !== 'assessment' && session.type !== 'assessment') && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">Individual</span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}>
                          {statusBadge.label}
                        </span>
                        {session.status === 'reschedule_requested' && (
                          <span className="ml-1 text-xs text-amber-600">Reschedule requested</span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Primary Actions for Upcoming/Ongoing Sessions */}
                          {session.status !== 'completed' && session.status !== 'cancelled' && session.status !== 'no_show' && session.status !== 'noshow' && (
                            <div className="flex items-center gap-2">
                              {getMeetLink(session) && (
                                <button
                                  onClick={() => handleJoinMeet(session)}
                                  className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors shadow-sm"
                                  title="Join Google Meet"
                                >
                                  <Video className="h-3.5 w-3.5 mr-1.5" />
                                  Join
                                </button>
                              )}
                              <button
                                onClick={() => openCompleteSessionModal(session)}
                                disabled={completingSessions.has(session.id)}
                                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#3f2e73] text-white hover:bg-[#1d1733] transition-colors shadow-sm disabled:opacity-50"
                                title="Mark session as complete"
                              >
                                {completingSessions.has(session.id) ? (
                                  <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                                )}
                                Finish
                              </button>
                            </div>
                          )}

                          {session.status === 'completed' && (session.feedback || session.rating || session.client_feedback) && (
                            <button
                              onClick={() => setFeedbackToView(session)}
                              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-[#3f2e73] transition-colors"
                              title="View feedback"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </button>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => handleViewDetails(session)} className="cursor-pointer">
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openHistory(session)} className="cursor-pointer">
                                <History className="h-4 w-4 mr-2" />
                                History
                              </DropdownMenuItem>
                              
                              {session.status === 'pending' && (session.session_type === 'assessment' || session.type === 'assessment') && (!session.scheduled_date || !session.scheduled_time) && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => { setSelectedScheduleSession(session); setShowScheduleModal(true); }} className="cursor-pointer">
                                    <Calendar className="h-4 w-4 mr-2" />
                                    Schedule Session
                                  </DropdownMenuItem>
                                </>
                              )}
                              
                              <DropdownMenuSeparator />
                              
                              {session.status !== 'completed' && session.status !== 'cancelled' && session.status !== 'no_show' && session.status !== 'noshow' && (
                                <DropdownMenuItem onClick={() => handleMarkAsNoShow(session.id)} disabled={markingNoShowSessions.has(session.id)} className="cursor-pointer text-orange-600">
                                  {markingNoShowSessions.has(session.id) ? (
                                    <span className="flex items-center gap-2">
                                      <span className="h-4 w-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" /> 
                                      Marking...
                                    </span>
                                  ) : (
                                    <>
                                      <XCircle className="h-4 w-4 mr-2" /> 
                                      Mark No Show
                                    </>
                                  )}
                                </DropdownMenuItem>
                              )}
                              
                              {session.status === 'completed' && (
                                <DropdownMenuItem onClick={() => openSessionNotesModal(session)} className="cursor-pointer">
                                  <FileText className="h-4 w-4 mr-2" />
                                  View Notes
                                </DropdownMenuItem>
                              )}
                              
                              <DropdownMenuItem onClick={() => handleDeleteSession(session)} className="cursor-pointer text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {totalSessions > sessionsPerPage && (
          <div className="border-t border-slate-200 px-4 py-4 flex justify-center">
            <WheelPagination
              totalPages={totalPages}
              visibleCount={7}
              currentPage={currentPage - 1}
              onPageChange={handlePageChange}
              className="bg-white"
            />
          </div>
        )}
      </div>

      {/* Complete Session Modal */}
      <SessionCompletionModal
        session={selectedCompleteSession}
        isOpen={showCompleteModal}
        onClose={() => {
          setShowCompleteModal(false);
          setSelectedCompleteSession(null);
        }}
        onSubmit={(formData) => handleCompleteSession(selectedCompleteSession?.id, formData)}
        wide
      />

      {/* Session Notes Modal */}
      <SessionNotesModal
        isOpen={showNotesModal}
        onClose={() => {
          setShowNotesModal(false);
          setSelectedNotesSession(null);
        }}
        session={selectedNotesSession}
      />

      {/* Schedule Assessment Session Modal */}
      <ScheduleAssessmentSessionModal
        isOpen={showScheduleModal}
        onClose={() => {
          setShowScheduleModal(false);
          setSelectedScheduleSession(null);
        }}
        session={selectedScheduleSession}
        onScheduleSuccess={() => {
          loadSessions(); // Reload sessions after scheduling
        }}
      />

      {/* Client Session History Modal (list + detail) */}
      {historyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#3f2e73]/10 flex items-center justify-center">
                  <History className="w-4 h-4 text-[#3f2e73]" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-800 tracking-tight">
                    {selectedHistorySession ? 'Session details' : 'Session history'}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{historyClientName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedHistorySession && (
                  <button
                    type="button"
                    onClick={() => setSelectedHistorySession(null)}
                    className="text-xs font-medium text-slate-600 hover:text-slate-900 px-2 py-1.5 rounded-lg hover:bg-slate-100"
                  >
                    Back
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setHistoryModalOpen(false);
                    setHistoryClientId(null);
                    setHistoryClientName('');
                    setHistorySessions([]);
                    setSelectedHistorySession(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-5">
              {selectedHistorySession ? (
                <SessionHistoryDetailView
                  session={selectedHistorySession}
                  currentPsychologistId={user?.id}
                  formatTime={formatTime}
                  formatDate={formatDate}
                />
              ) : historyLoading ? (
                <div className="py-12 text-center">
                  <div className="inline-block h-8 w-8 border-2 border-[#3f2e73] border-t-transparent rounded-full animate-spin" />
                  <p className="mt-3 text-sm text-slate-500">Loading session history...</p>
                </div>
              ) : historySessions.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-2 text-sm font-medium text-slate-700">No completed sessions</p>
                  <p className="mt-1 text-xs text-slate-500">Past finished sessions for this client will appear here.</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {historySessions.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4 hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-[#3f2e73]/10 flex items-center justify-center shrink-0">
                          <Calendar className="h-5 w-5 text-[#3f2e73]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {s.scheduled_date ? new Date(s.scheduled_date).toLocaleDateString() : '—'} at {s.scheduled_time ? formatTime(s.scheduled_time) : '—'}
                          </p>
                          <p className="text-xs text-slate-500">with {s.psychologist_name || 'Psychologist'}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedHistorySession(s)}
                        className="shrink-0 px-3 py-1.5 text-xs font-medium text-[#3f2e73] bg-[#3f2e73]/10 rounded-lg hover:bg-[#3f2e73]/20"
                      >
                        View
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {feedbackToView && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h5 className="text-sm font-semibold text-gray-900">Client Feedback</h5>
              <button
                onClick={() => setFeedbackToView(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              {feedbackToView.rating && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Rating</p>
                  <p className="text-sm text-gray-800">
                    {feedbackToView.rating} out of 5 stars
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Submitted Feedback</p>
                <p className="text-sm text-gray-700 whitespace-pre-line">
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

      {/* Session Details Modal */}
      <SessionDetailsModal
        session={selectedSession}
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedSession(null);
        }}
        isPsychologist={true}
      />

      {/* Reschedule requests are now handled on the rescheduling page */}
    </div>
  );
}
