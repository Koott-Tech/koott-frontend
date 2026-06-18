"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { psychologistApi } from "../../../lib/backendApi";
import { 
  Calendar, 
  Clock, 
  User,
  Package,
  CheckCircle,
  AlertCircle,
  FileText,
  Phone,
  Mail,
  Trash2,
  MoreVertical,
  Eye,
  CheckCircle2
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
import ScheduleAssessmentSessionModal from "../../../components/ScheduleAssessmentSessionModal";
import { useNotification } from "../../../contexts/NotificationContext";

export default function PsychologistAssessments() {
  const { user } = useAuth();
  const { showError, showSuccess } = useNotification();
  const [assessments, setAssessments] = useState([]);
  const [assessmentProgress, setAssessmentProgress] = useState({}); // { assessmentId: { completed: 1, total: 3, pending: [session1, session2] } }
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [completingSessions, setCompletingSessions] = useState(new Set());
  const [selectedSession, setSelectedSession] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedCompleteSession, setSelectedCompleteSession] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedScheduleSession, setSelectedScheduleSession] = useState(null);

  const getPackageKey = (session) => {
    if (!session) return "";
    const { package_id, assessment_id, client_id, payment_id } = session;

    if (package_id) return `pkg_${package_id}`;
    if (payment_id) return `${assessment_id}_${payment_id}`;
    if (client_id) return `${assessment_id}_${client_id}`;

    return `${assessment_id || "assessment"}_${session.id}`;
  };

  const renderProgressBadge = (session) => {
    const packageKey = getPackageKey(session);
    const progress = assessmentProgress[packageKey];
    if (!progress) return null;
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#025545]/10 text-[#025545]">
        {progress.completed}/{progress.total} sessions
      </span>
    );
  };

  const hasPendingForNext = (session) => {
    if (session.status !== 'completed' || !session?.psychologist_id || !user?.id) return false;

    const packageKey = getPackageKey(session);
    const progress = assessmentProgress[packageKey];
    if (!progress || !Array.isArray(progress.allSessions) || progress.allSessions.length === 0) {
      return false;
    }

    // Only the psychologist who owned the completed session can move the flow forward
    if (String(session.psychologist_id) !== String(user.id)) {
      return false;
    }

    const sessionsOrdered = [...progress.allSessions];
    const currentIndex = sessionsOrdered.findIndex((s) => s.id === session.id);
    if (currentIndex === -1) return false;

    const nextSessions = sessionsOrdered.slice(currentIndex + 1);
    if (nextSessions.length === 0) return false;

    // If any later session is already scheduled (has date & time), this session shouldn't show "Book Next Session"
    const hasFutureScheduled = nextSessions.some(
      (s) => s.scheduled_date && s.scheduled_time
    );
    if (hasFutureScheduled) return false;

    // Allow booking next only when there's an actual pending session waiting to be scheduled
    const hasPendingToSchedule = nextSessions.some(
      (s) => s.status === 'pending' && (!s.scheduled_date || !s.scheduled_time)
    );

    return hasPendingToSchedule;
  };

  useEffect(() => {
    if (user) {
      loadAssessments();
    }
  }, [user]);

  const loadAssessments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const sessionsData = await psychologistApi.getSessions({ limit: 1000 });
      const allSessions = sessionsData.data?.sessions || [];

      const assessmentSessionsAll = allSessions.filter(s => 
        s.session_type === 'assessment' || s.type === 'assessment'
      );

      const packages = new Map();
      assessmentSessionsAll.forEach(session => {
        if (!session.assessment_id || !session.client_id) return;
        const packageKey = getPackageKey(session);
        if (!packageKey) return;
        if (!packages.has(packageKey)) packages.set(packageKey, []);
        packages.get(packageKey).push(session);
      });

      const TOTAL_SESSIONS_PER_PACKAGE = 3;
      const visibleAssessmentSessions = [];
      const progressMap = {};

      packages.forEach((sessionsInPackage, packageKey) => {
        if (!sessionsInPackage.length) return;

        const sortedByNumber = [...sessionsInPackage].sort((a, b) => {
          const numA = typeof a.session_number === 'number' ? a.session_number : 99;
          const numB = typeof b.session_number === 'number' ? b.session_number : 99;
          if (numA !== numB) return numA - numB;
          const dateA = a.scheduled_date ? new Date(a.scheduled_date) : new Date(0);
          const dateB = b.scheduled_date ? new Date(b.scheduled_date) : new Date(0);
          return dateA - dateB;
        });

        const ownerSession = [...sortedByNumber]
          .reverse()
          .find(s => s.psychologist_id);

        const ownerPsychId = ownerSession?.psychologist_id || null;
        const isOwner = ownerPsychId === user.id;
        const hasAssignedToDoc = sortedByNumber.some(s => s.psychologist_id === user.id);

        if (!isOwner && !hasAssignedToDoc) {
          return;
        }

        let sessionsForDoc = sortedByNumber.filter(s => s.psychologist_id === user.id);

        // If no sessions directly assigned to the current psychologist but they are the owner,
        // fall back to showing only their most recent assigned session (if any) to preserve context.
        if (sessionsForDoc.length === 0 && isOwner) {
          const latestOwnedSession = [...sortedByNumber]
            .reverse()
            .find(s => s.psychologist_id === user.id);
          if (latestOwnedSession) {
            sessionsForDoc = [latestOwnedSession];
          }
        }

        visibleAssessmentSessions.push(...sessionsForDoc);

        const completedCount = sortedByNumber.filter(s => s.status === 'completed').length;
        const pendingForOwner = isOwner
          ? sortedByNumber.filter(s => s.status === 'pending' && (!s.scheduled_date || !s.scheduled_time))
          : [];

        const sample = sortedByNumber[0];
        progressMap[packageKey] = {
          completed: completedCount,
          total: TOTAL_SESSIONS_PER_PACKAGE,
          pending: pendingForOwner,
          allSessions: sortedByNumber,
          assessment_id: sample.assessment_id,
          client_id: sample.client_id,
          payment_id: sample.payment_id,
          owner_psychologist_id: ownerPsychId
        };
      });

      const sortedAssessments = visibleAssessmentSessions.sort((a, b) => {
        const dateA = a.scheduled_date ? new Date(a.scheduled_date) : new Date(0);
        const dateB = b.scheduled_date ? new Date(b.scheduled_date) : new Date(0);
        return dateB - dateA;
      });

      setAssessments(sortedAssessments);
      setAssessmentProgress(progressMap);
    } catch (err) {
      console.error('Error loading assessments:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteSession = async (sessionId, sessionData) => {
    try {
      setError(null);
      setCompletingSessions(prev => new Set(prev).add(sessionId));
      
      const mappedData = {
        summary: sessionData.summary?.trim?.() || '',
        report: sessionData.report?.trim?.() || '',
        summary_notes: sessionData.summary_notes?.trim?.() || ''
      };

      // Therapist notes (summary_notes) is optional; only summary + report are required.
      if (!mappedData.summary || !mappedData.report) {
        throw new Error('Summary and report are required.');
      }
      
      await psychologistApi.completeSession(sessionId, mappedData);
      showSuccess('Assessment session completed successfully!');
      
      await loadAssessments();
      setShowCompleteModal(false);
      setSelectedCompleteSession(null);
    } catch (err) {
      console.error('Error completing session:', err);
      setError(`Failed to complete session: ${err.message}`);
      showError(`Failed to complete session: ${err.message}`, 'Completion Error');
      throw err;
    } finally {
      setCompletingSessions(prev => {
        const newSet = new Set(prev);
        newSet.delete(sessionId);
        return newSet;
      });
    }
  };

  const handleScheduleSuccess = async () => {
    await loadAssessments();
    showSuccess('Assessment session scheduled successfully!');
  };

  const handleDeleteAssessmentSession = async (session) => {
    try {
      if (!confirm('Are you sure you want to delete this assessment session?')) return;
      await psychologistApi.deleteAssessmentSession(session.id);
      await loadAssessments();
      showSuccess('Assessment session deleted successfully');
    } catch (err) {
      console.error('Error deleting assessment session:', err);
      setError(err.message);
      showError(`Failed to delete assessment session: ${err.message}`, 'Delete Error');
    }
  };

  const openScheduleModal = (session) => {
    const packageKey = getPackageKey(session);
    const progress = assessmentProgress[packageKey];
    
    // Find the next pending session to schedule
    if (progress && progress.pending.length > 0) {
      // Sort pending sessions by created_at to get the next one
      const sortedPending = [...progress.pending].sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
        const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
        return dateA - dateB;
      });
      
      setSelectedScheduleSession(sortedPending[0]);
      setShowScheduleModal(true);
    } else {
      showError('No pending sessions to schedule', 'Schedule Error');
    }
  };

  const openCompleteSessionModal = (session) => {
    if (session.status === 'completed') {
      showError('This session is already completed', 'Session Status');
      return;
    }
    
    setSelectedCompleteSession(session);
    setShowCompleteModal(true);
  };

  const handleViewDetails = (session) => {
    setSelectedSession(session);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedSession(null);
  };

  const formatTime = (time) => {
    if (!time) return 'Not scheduled';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      booked: { bg: 'bg-[#025545]/10', text: 'text-[#025545]', label: 'Booked' },
      pending: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Pending' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
      reserved: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Reserved' }
    };
    
    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#025545] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading assessments...</p>
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

  // Upcoming assessments: booked/reserved sessions OR completed sessions that have pending sessions
  const upcomingAssessments = assessments.filter(a => {
    if (a.status === 'booked' || a.status === 'reserved') return true;
    // Also include completed sessions if there are pending sessions to schedule
    if (a.status === 'completed') {
      const progress = assessmentProgress[getPackageKey(a)];
      return progress && progress.pending.length > 0;
    }
    return false;
  });
  
  // Completed assessments: all 3 sessions are completed (no pending sessions)
  const completedAssessments = assessments.filter(a => {
    if (a.status !== 'completed') return false;
    const progress = assessmentProgress[getPackageKey(a)];
    // Show as completed only if all 3 sessions are completed (no pending sessions)
    return progress && progress.completed === 3 && progress.pending.length === 0;
  });

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h6 className="font-semibold text-gray-900">Assessments</h6>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Assessments */}
      {upcomingAssessments.length > 0 && (
        <div className="mt-8">
          <p className="font-medium text-gray-900 mb-4">
            Upcoming Assessments ({upcomingAssessments.length})
          </p>
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="divide-y divide-gray-200">
              {upcomingAssessments.map((session) => (
                <div key={session.id} className="px-4 sm:px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                          <Package className="h-6 w-6 text-purple-600" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-base font-medium text-gray-900">
                            {session.client?.first_name} {session.client?.last_name}
                          </p>
                          {getStatusBadge(session.status)}
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Assessment
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-gray-700">
                            {session.assessment_title || session.assessment?.hero_title || 'Assessment'}
                          </p>
                          {renderProgressBadge(session)}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(session.scheduled_date)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{formatTime(session.scheduled_time)}</span>
                          </div>
                          {session.client?.phone_number && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-4 w-4" />
                              <span>{session.client.phone_number}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-100">
                            <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => handleViewDetails(session)} className="cursor-pointer">
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {session.status !== 'completed' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => openCompleteSessionModal(session)}
                                disabled={completingSessions.has(session.id)}
                                className="cursor-pointer"
                              >
                                {completingSessions.has(session.id) ? (
                                  <>
                                    <div className="h-4 w-4 mr-2 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                                    Completing...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Complete Session
                                  </>
                                )}
                              </DropdownMenuItem>
                            </>
                          )}
                          {/* Show "Book Next Session" button ONLY if this session is completed AND there are pending sessions */}
                          {hasPendingForNext(session) && (
                            <>
                              <DropdownMenuItem 
                                onClick={() => openScheduleModal(session)} 
                                className="cursor-pointer"
                              >
                                <Calendar className="h-4 w-4 mr-2" />
                                Book Next Session
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem 
                            onClick={() => handleDeleteAssessmentSession(session)} 
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
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Completed Assessments */}
      {completedAssessments.length > 0 && (
        <div className="mt-8">
          <p className="font-medium text-gray-900 mb-4">
            Completed Assessments ({completedAssessments.length})
          </p>
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="divide-y divide-gray-200">
              {completedAssessments.map((session) => (
                <div key={session.id} className="px-4 sm:px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                          <CheckCircle className="h-6 w-6 text-gray-600" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-base font-medium text-gray-900">
                            {session.client?.first_name} {session.client?.last_name}
                          </p>
                          {getStatusBadge(session.status)}
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Assessment
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-gray-700">
                            {session.assessment_title || session.assessment?.hero_title || 'Assessment'}
                          </p>
                          {renderProgressBadge(session)}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(session.scheduled_date)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{formatTime(session.scheduled_time)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-100">
                            <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => handleViewDetails(session)} className="cursor-pointer">
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {/* Show "Book Next Session" button ONLY if this session is completed AND there are pending sessions */}
                          {hasPendingForNext(session) && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => openScheduleModal(session)} 
                                className="cursor-pointer"
                              >
                                <Calendar className="h-4 w-4 mr-2" />
                                Book Next Session
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {assessments.length === 0 && (
        <div className="mt-6 sm:mt-8 bg-white shadow rounded-lg">
          <div className="px-4 sm:px-6 py-12 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-sm font-medium text-gray-900">No assessment sessions</p>
            <p className="mt-1 text-sm text-gray-500">
              You don't have any assessment sessions yet.
            </p>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCompleteModal && selectedCompleteSession && (
        <SessionCompletionModal
          isOpen={showCompleteModal}
          onClose={() => {
            setShowCompleteModal(false);
            setSelectedCompleteSession(null);
          }}
          session={selectedCompleteSession}
          onSubmit={async (formData) => {
            await handleCompleteSession(selectedCompleteSession.id, formData);
          }}
        />
      )}

      {showDetailsModal && selectedSession && (
        <SessionDetailsModal
          isOpen={showDetailsModal}
          onClose={closeDetailsModal}
          session={selectedSession}
        />
      )}

      {showScheduleModal && selectedScheduleSession && (
        <ScheduleAssessmentSessionModal
          isOpen={showScheduleModal}
          onClose={() => {
            setShowScheduleModal(false);
            setSelectedScheduleSession(null);
          }}
          session={selectedScheduleSession}
          onScheduleSuccess={handleScheduleSuccess}
        />
      )}
    </div>
  );
}

