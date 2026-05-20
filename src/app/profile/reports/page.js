"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../contexts/AuthContext";
import { clientApi } from "../../../lib/backendApi";
import { FileText, X, BarChart3, MessageSquare } from "lucide-react";
import WheelPagination from "../../../components/ui/wheel-pagination";
import SessionFeedbackModal from "../../../components/SessionFeedbackModal";
import { normalizeImageUrl } from "@/utils/urlNormalizer";

export default function ReportsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSessions, setTotalSessions] = useState(0);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [sessionToFeedback, setSessionToFeedback] = useState(null);

  // Helper function to conditionally apply hover handlers only on desktop
  const getHoverHandlers = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      return {}; // No handlers on mobile
    }
    return {
      onMouseEnter: (e) => e.currentTarget.style.borderColor = '#025545',
      onMouseLeave: (e) => e.currentTarget.style.borderColor = '#e5e7eb'
    };
  };

  // Helper function for button hover handlers
  const getButtonHoverHandlers = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      return {}; // No handlers on mobile
    }
    return {
      onMouseEnter: (e) => {
        e.currentTarget.style.color = '#012f23';
        e.currentTarget.style.borderColor = '#012f23';
        e.currentTarget.style.backgroundColor = '#f2fff1';
      },
      onMouseLeave: (e) => {
        e.currentTarget.style.color = '#025545';
        e.currentTarget.style.borderColor = '#025545';
        e.currentTarget.style.backgroundColor = 'transparent';
      }
    };
  };

  useEffect(() => {
    loadSessions();
  }, [currentPage]);

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      // Fetch only completed sessions for reports page with pagination
      // Filter out free assessment sessions as they don't have reports
      const sessionsData = await clientApi.getSessions({ 
        status: 'completed',
        page: currentPage,
        limit: 5
      });
      const sessionsList = sessionsData.data?.sessions || [];
      // Filter out free assessment sessions (they don't have reports)
      const sessionsWithReports = sessionsList.filter(session => 
        session.session_type !== 'free_assessment'
      );
      const pagination = sessionsData.data?.pagination || {};
      setSessions(sessionsWithReports);
      
      // For pagination, we need to account for filtered sessions
      // Since we're filtering on frontend, we'll use the filtered count
      // If we have fewer sessions than expected, we might need to load more
      // For now, use the filtered count and adjust pagination accordingly
      const freeAssessmentCount = sessionsList.filter(s => s.session_type === 'free_assessment').length;
      const totalFiltered = Math.max(0, (pagination.total || 0) - freeAssessmentCount);
      setTotalPages(Math.max(1, Math.ceil(totalFiltered / 5)));
      setTotalSessions(totalFiltered);
    } catch (err) {
      console.error('Error loading sessions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getSummary = (session) => session?.summary || session?.session_summary || '';
  const getReport = (session) => {
    // Report might be in session_notes with a separator, or in a separate field
    const sessionNotes = session?.summary_notes || session?.session_notes || '';
    if (sessionNotes.includes('--- Report ---')) {
      const parts = sessionNotes.split('--- Report ---');
      return parts.length > 1 ? parts[1].trim() : '';
    }
    // Check for separate report field
    return session?.report || session?.session_report || '';
  };
  const getSummaryNotes = (session) => {
    // If session_notes contains report, extract only the notes part
    const sessionNotes = session?.summary_notes || session?.session_notes || '';
    if (sessionNotes.includes('--- Report ---')) {
      return sessionNotes.split('--- Report ---')[0].trim();
    }
    return sessionNotes;
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

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours, 10);
      const minute = minutes || '00';
      
      let hour12 = hour;
      let ampm = 'AM';
      
      if (hour === 0) {
        hour12 = 12;
      } else if (hour === 12) {
        ampm = 'PM';
      } else if (hour > 12) {
        hour12 = hour - 12;
        ampm = 'PM';
      }
      
      return `${hour12}:${minute} ${ampm}`;
    } catch (error) {
      return timeString;
    }
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mb-4" style={{ borderBottomColor: '#025545' }}></div>
          <p className="text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white p-4 sm:p-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: '#025545' }} />
          <h4 className="text-gray-900 text-lg sm:text-xl">Session Reports</h4>
        </div>
        
        {sessions.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <FileText className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
            <h5 className="text-gray-900 mb-2 text-base sm:text-lg">No reports available</h5>
            <p className="text-gray-600 text-sm sm:text-base px-4">Session reports will appear here after sessions are completed.</p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {sessions.map((session) => (
                <div 
                  key={session.id} 
                  className="border border-gray-200 rounded-lg p-3 sm:p-4 md:p-5 transition-colors"
                  {...getHoverHandlers()}
                >
                  {/* Mobile Layout - Image left, details right */}
                  <div className="lg:hidden">
                    <div className="flex items-center gap-2 sm:gap-3">
                      {/* Psychologist Avatar - Left side on mobile */}
                      <div className="flex-shrink-0 w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200">
                        {session.psychologist?.cover_image_url ? (
                          <img 
                            src={normalizeImageUrl(session.psychologist.cover_image_url)}
                            alt={`${session.psychologist.first_name} ${session.psychologist.last_name}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-green-500 flex items-center justify-center text-white font-semibold text-xl">
                            {session.psychologist?.first_name?.[0]}{session.psychologist?.last_name?.[0]}
                          </div>
                        )}
                      </div>
                      
                      {/* Session Details - Right side on mobile */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 mb-1">
                          {formatDate(session.scheduled_date)} at {formatTime(session.scheduled_time)}
                        </p>
                        <h6 className="text-gray-900 font-bold mb-2 text-sm break-words">
                          Session with {session.psychologist?.first_name} {session.psychologist?.last_name}
                        </h6>
                      </div>
                    </div>
                    
                    {/* View Report and Feedback Buttons - Full width below on mobile */}
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => handleViewFullReport(session)}
                        className="flex-1 text-xs font-medium cursor-pointer transition-colors px-3 py-2 rounded-lg border text-center"
                        style={{ color: '#025545', borderColor: '#025545' }}
                        {...getButtonHoverHandlers()}
                      >
                        View Complete Report
                      </button>
                      {session.feedback || session.rating ? (
                        <span className="flex-1 text-green-600 bg-green-50 border border-green-200 px-3 py-2 rounded-lg text-xs text-center">
                          Feedback Submitted
                        </span>
                      ) : (
                        <button
                          onClick={() => openFeedbackModal(session)}
                          className="flex-1 text-purple-600 border border-purple-300 px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                        >
                          <MessageSquare className="h-3 w-3" />
                          Give Feedback
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Desktop Layout - Horizontal layout */}
                  <div className="hidden lg:flex items-center gap-4">
                    {/* Psychologist Avatar - Left side */}
                    <div className="flex-shrink-0">
                      {session.psychologist?.cover_image_url ? (
                        <img 
                          src={session.psychologist.cover_image_url}
                          alt={`${session.psychologist.first_name} ${session.psychologist.last_name}`}
                          className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center text-white font-semibold text-xl">
                          {session.psychologist?.first_name?.[0]}{session.psychologist?.last_name?.[0]}
                        </div>
                      )}
                    </div>
                    
                    {/* Session Details - Middle */}
                    <div className="flex-1 min-w-0">
                      <h5 className="text-gray-900 mb-1 font-semibold text-base break-words">
                        Session with {session.psychologist?.first_name} {session.psychologist?.last_name}
                      </h5>
                      <p className="text-gray-600 text-sm">
                        {formatDate(session.scheduled_date)} at {formatTime(session.scheduled_time)}
                      </p>
                    </div>
                    
                    {/* View Report and Feedback Buttons - Right side */}
                    <div className="flex-shrink-0 flex gap-2">
                      <button
                        onClick={() => handleViewFullReport(session)}
                        className="text-sm font-medium cursor-pointer transition-colors px-3 py-1.5 rounded-lg border"
                        style={{ color: '#025545', borderColor: '#025545' }}
                        {...getButtonHoverHandlers()}
                      >
                        View Complete Report
                      </button>
                      {session.feedback || session.rating ? (
                        <span className="text-green-600 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg text-sm text-center">
                          Feedback Submitted
                        </span>
                      ) : (
                        <button
                          onClick={() => openFeedbackModal(session)}
                          className="text-purple-600 border border-purple-300 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Give Feedback
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
        
        {/* Pagination Controls */}
        {totalPages > 1 && sessions.length > 0 && (
          <div className="flex items-center justify-center mt-8 pt-6 border-t border-gray-200">
            <WheelPagination
              totalPages={totalPages}
              visibleCount={7}
              currentPage={currentPage - 1}
              onPageChange={(page) => handlePageChange(page + 1)}
              className="bg-white"
            />
          </div>
        )}
      </div>

      {/* Report Modal */}
      {showReportModal && selectedReport && (
        <div 
          className="fixed inset-0 bg-transparent sm:bg-black/30 sm:backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowReportModal(false);
            }
          }}
        >
          <div className="bg-white rounded-t-2xl sm:rounded-lg max-w-2xl w-full h-[90vh] sm:h-auto sm:max-h-[85vh] flex flex-col shadow-xl">
            {/* Sticky Header */}
            <div className="px-4 sm:px-6 py-4 sm:py-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex justify-between items-center">
                <h5 className="text-gray-900 text-base sm:text-lg font-semibold">Complete Session Report</h5>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-gray-400 lg:hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </div>
            </div>
            
            {/* Scrollable Content */}
            <div className="px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto flex-1 min-h-0 pb-6 sm:pb-6" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="space-y-4 sm:space-y-6">
                {/* Session Details */}
                <div className="border-b border-gray-200 pb-4 sm:pb-4">
                  <h6 className="text-gray-900 font-semibold mb-3 text-sm sm:text-base">Session Details</h6>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500">Date</p>
                      <p className="text-gray-900 text-sm sm:text-base break-words">{formatDate(selectedReport.scheduled_date)}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500">Time</p>
                      <p className="text-gray-900 text-sm sm:text-base">{formatTime(selectedReport.scheduled_time)}</p>
                    </div>
                <div>
                      <p className="text-xs sm:text-sm text-gray-500">Psychologist</p>
                      <p className="text-gray-900 text-sm sm:text-base break-words">
                        {selectedReport.psychologist?.first_name} {selectedReport.psychologist?.last_name}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Session Summary */}
                {getSummary(selectedReport) && (
                  <div className="pb-2">
                    <h6 className="text-gray-900 font-semibold mb-3 text-sm sm:text-base">Session Summary</h6>
                    <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                      <p className="text-gray-700 whitespace-pre-wrap text-sm sm:text-base break-words leading-relaxed">{getSummary(selectedReport)}</p>
                    </div>
                  </div>
                )}

                {/* Session Report */}
                {getReport(selectedReport) && (
                  <div className="pb-2">
                    <h6 className="text-gray-900 font-semibold mb-3 text-sm sm:text-base">Session Report</h6>
                    <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                      <p className="text-gray-700 whitespace-pre-wrap text-sm sm:text-base break-words leading-relaxed">{getReport(selectedReport)}</p>
                    </div>
                  </div>
                )}

                {/* Additional Notes - NOT VISIBLE TO CLIENT (Psychologist only) */}
                {/* Removed from client view - these are private notes for psychologists only */}

                {/* Client Feedback */}
                {selectedReport.feedback && (
                  <div className="pb-2">
                    <h6 className="text-gray-900 font-semibold mb-3 text-sm sm:text-base">Your Feedback</h6>
                    <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
                      <p className="text-gray-700 whitespace-pre-wrap text-sm sm:text-base break-words leading-relaxed">{selectedReport.feedback}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
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
    </>
  );
}

