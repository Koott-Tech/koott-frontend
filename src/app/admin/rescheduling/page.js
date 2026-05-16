'use client';

import React, { useState, useEffect } from 'react';
import { adminApi } from '../../../lib/backendApi';
import { useNotification } from '@/contexts/NotificationContext';
import { CheckCircle, XCircle, Clock, Calendar, AlertCircle, Phone, MessageCircle, Eye, X } from 'lucide-react';

export default function AdminReschedulingPage() {
  const { showSuccess, showError, showConfirmDialog } = useNotification();
  const [rescheduleRequests, setRescheduleRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'approved'
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [declineReason, setDeclineReason] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    loadRescheduleRequests();
    // Refresh every 30 seconds
    const interval = setInterval(loadRescheduleRequests, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const loadRescheduleRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const status = filter === 'all' ? undefined : filter;
      const response = await adminApi.getRescheduleRequests(status);
      if (response.success) {
        setRescheduleRequests(response.data || []);
        setCurrentPage(1);
      } else {
        setError('Failed to fetch reschedule requests');
      }
    } catch (err) {
      console.error('Error loading reschedule requests:', err);
      setError('Failed to load reschedule requests');
    } finally {
      setLoading(false);
    }
  };

  const parseRescheduleInfo = (message, session) => {
    if (!message) {
      // If no message, try to get from session
      if (session) {
        return {
          originalDate: session.scheduled_date,
          originalTime: session.scheduled_time ? session.scheduled_time.split(':').slice(0, 2).join(':') : null,
          newDate: null,
          newTime: null,
          clientName: 'Client',
          reason: null
        };
      }
      return { originalDate: null, originalTime: null, newDate: null, newTime: null, clientName: 'Client', reason: null };
    }
    
    // Extract reason if present
    let reason = null;
    const reasonMatch = message.match(/Reason provided by client:\s*(.+?)(?:\n\n|$)/i);
    if (reasonMatch) {
      reason = reasonMatch[1].trim();
    }
    
    // Try multiple patterns to match different message formats
    // Pattern 1: "from YYYY-MM-DD at HH:MM:SS" or "from YYYY-MM-DD at HH:MM"
    let fromMatch = message.match(/from\s+(\d{4}-\d{2}-\d{2})\s+at\s+(\d{1,2}:\d{2}(?::\d{2})?)/i);
    
    // Pattern 2: Try without "at" keyword, just space
    if (!fromMatch) {
      fromMatch = message.match(/from\s+(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2}(?::\d{2})?)/i);
    }
    
    // Pattern 3: Try with different spacing
    if (!fromMatch) {
      fromMatch = message.match(/from\s+(\d{4}-\d{2}-\d{2})\s+at\s+(\d{1,2}:\d{2}(?::\d{2})?)\s/i);
    }
    
    // Pattern 1: "to YYYY-MM-DD at HH:MM:SS" or "to YYYY-MM-DD at HH:MM"
    let toMatch = message.match(/to\s+(\d{4}-\d{2}-\d{2})\s+at\s+(\d{1,2}:\d{2}(?::\d{2})?)/i);
    
    // Pattern 2: Try without "at" keyword, just space
    if (!toMatch) {
      toMatch = message.match(/to\s+(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2}(?::\d{2})?)/i);
    }
    
    // Pattern 3: Try with different spacing
    if (!toMatch) {
      toMatch = message.match(/to\s+(\d{4}-\d{2}-\d{2})\s+at\s+(\d{1,2}:\d{2}(?::\d{2})?)\s/i);
    }
    
    // Debug: Log if parsing fails
    if (!toMatch && message) {
      console.log('⚠️ Could not parse new date/time from message:', message);
    }
    
    // Extract dates and times
    let originalDate = fromMatch ? fromMatch[1] : null;
    let originalTime = fromMatch ? fromMatch[2] : null;
    let newDate = toMatch ? toMatch[1] : null;
    let newTime = toMatch ? toMatch[2] : null;
    
    // Fallback: Use session data for original date/time if parsing failed
    if (!originalDate && session) {
      originalDate = session.scheduled_date;
      originalTime = session.scheduled_time;
    }
    
    // Normalize time format (remove seconds, ensure 2-digit hours)
    const normalizeTime = (time) => {
      if (!time) return null;
      const parts = time.split(':');
      if (parts.length >= 2) {
        const hours = parts[0].padStart(2, '0');
        const minutes = parts[1];
        return `${hours}:${minutes}`;
      }
      return time;
    };
    
    return {
      originalDate,
      originalTime: normalizeTime(originalTime),
      newDate,
      newTime: normalizeTime(newTime),
      clientName: message.split(' has requested')[0] || 'Client',
      reason: reason
    };
  };

  const getRescheduleRequestType = (session) => {
    if (!session) return 'Unknown';
    
    const rescheduleCount = session.reschedule_count || 0;
    
    // Check if within 24 hours
    if (session.scheduled_date && session.scheduled_time) {
      const sessionDateTime = new Date(`${session.scheduled_date}T${session.scheduled_time}`);
      const now = new Date();
      const hoursUntilSession = (sessionDateTime - now) / (1000 * 60 * 60);
      
      if (hoursUntilSession <= 24 && rescheduleCount >= 1) {
        return 'Within 24 hours & 2nd+ reschedule';
      } else if (hoursUntilSession <= 24) {
        return 'Within 24 hours';
      } else if (rescheduleCount >= 1) {
        return '2nd or more reschedule';
      }
    }
    
    return 'Standard request';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  const handleApprove = async (notification) => {
    showConfirmDialog({
      title: 'Approve Reschedule Request',
      message: 'Are you sure you want to approve this reschedule request?',
      type: 'warning',
      confirmText: 'Approve',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setProcessingId(notification.id);
        try {
          await adminApi.handleRescheduleRequest(notification.id, 'approve', '');
          await loadRescheduleRequests();
          showSuccess('Reschedule request approved successfully!');
          setShowDetailsModal(false);
          setSelectedRequest(null);
        } catch (err) {
          console.error('Error approving reschedule:', err);
          const errorMsg = err.response?.data?.message || err.message || 'Failed to approve reschedule';
          showError(errorMsg);
        } finally {
          setProcessingId(null);
        }
      }
    });
  };

  const handleDecline = (notification) => {
    setSelectedNotification(notification);
    setDeclineReason('');
    setShowDeclineModal(true);
  };

  const confirmDecline = async () => {
    if (!selectedNotification) return;
    
    setProcessingId(selectedNotification.id);
    try {
      await adminApi.handleRescheduleRequest(selectedNotification.id, 'reject', declineReason);
      await loadRescheduleRequests();
      showSuccess('Reschedule request declined successfully!');
      setShowDeclineModal(false);
      setShowDetailsModal(false);
      setSelectedNotification(null);
      setSelectedRequest(null);
      setDeclineReason('');
    } catch (err) {
      console.error('Error declining reschedule:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to decline reschedule';
      showError(errorMsg);
    } finally {
      setProcessingId(null);
    }
  };

  const operationsPhone = process.env.NEXT_PUBLIC_OPERATIONS_PHONE || '+91 XXXX XXXXXX';
  const operationsWhatsApp = process.env.NEXT_PUBLIC_OPERATIONS_WHATSAPP || operationsPhone;

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3f2e73]"></div>
        </div>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(rescheduleRequests.length / itemsPerPage));
  const paginatedRequests = rescheduleRequests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div
              className="text-sm font-semibold text-gray-900 tracking-tight"
              role="heading"
              aria-level={2}
            >
              Rescheduling Requests
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Review and act on client reschedule requests.
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-4 flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              filter === 'all'
                ? 'border-[#3f2e73] text-[#3f2e73]'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            All Requests
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              filter === 'pending'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              filter === 'approved'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Processed
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {rescheduleRequests.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Reschedule Requests</h3>
            <p className="text-gray-500">
              {filter === 'pending' 
                ? 'There are no pending reschedule requests at this time.'
                : 'There are no reschedule requests at this time.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Old Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">New Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedRequests.map((request) => {
                  const session = request.session;
                  const info = parseRescheduleInfo(request.message || '', session);
                  const client = request.client || session?.client;
                  const psychologist = request.psychologist || session?.psychologist;
                  const isProcessed = request.is_read;
                  const requestType = getRescheduleRequestType(session);
                  
                  const clientName = client?.child_name || `${client?.first_name || ''} ${client?.last_name || ''}`.trim() || 'N/A';
                  const psychologistName = psychologist ? `${psychologist.first_name || ''} ${psychologist.last_name || ''}`.trim() : 'N/A';
                  
                  return (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{clientName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{psychologistName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {info.originalDate ? (
                          <div>
                            <div>{formatDate(info.originalDate)}</div>
                            {info.originalTime && <div className="text-xs text-gray-500">{formatTime(info.originalTime)}</div>}
                          </div>
                        ) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {info.newDate ? (
                          <div>
                            <div>{formatDate(info.newDate)}</div>
                            {info.newTime && <div className="text-xs text-gray-500">{formatTime(info.newTime)}</div>}
                          </div>
                        ) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {!isProcessed ? (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">Pending</span>
                        ) : (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Processed</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewDetails(request)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-[#3f2e73] bg-[#3f2e73]/10 hover:bg-[#3f2e73]/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3f2e73]"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </button>
                          {!isProcessed && (
                            <>
                              <button
                                onClick={() => handleApprove(request)}
                                disabled={processingId === request.id}
                                className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white rounded-md text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {processingId === request.id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Approve
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => handleDecline(request)}
                                disabled={processingId === request.id}
                                className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white rounded-md text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Decline
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {rescheduleRequests.length > itemsPerPage && (
          <div className="mt-4 flex justify-center items-center gap-3">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <span className="text-xs text-gray-600">
              Page <span className="font-medium text-gray-900">{currentPage}</span> of{' '}
              <span className="font-medium text-gray-900">{totalPages}</span>
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedRequest && (() => {
        const session = selectedRequest.session;
        const info = parseRescheduleInfo(selectedRequest.message || '', session);
        const client = selectedRequest.client || session?.client;
        const psychologist = selectedRequest.psychologist || session?.psychologist;
        const isProcessed = selectedRequest.is_read;
        const requestType = getRescheduleRequestType(session);
        
        // Get client email from user relationship if available
        const clientEmail = client?.user?.email || client?.email || 'N/A';
        const clientPhone = client?.phone_number || 'N/A';
        const clientName = client?.child_name || `${client?.first_name || ''} ${client?.last_name || ''}`.trim() || 'N/A';
        const psychologistName = psychologist ? `${psychologist.first_name || ''} ${psychologist.last_name || ''}`.trim() : 'N/A';
        const psychologistEmail = psychologist?.email || 'N/A';
        const psychologistPhone = psychologist?.phone || 'N/A';
        
        // Session details
        const sessionType = session?.session_type === 'free_assessment' ? 'Free Assessment' : 
                           session?.package_id ? 'Package Session' : 'Individual Session';
        const sessionId = session?.id || 'N/A';

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-base font-semibold text-gray-900" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Reschedule Request Details</h2>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedRequest(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="px-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                <div className="space-y-4">
                  {/* Client Info */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-xs font-semibold text-gray-900 mb-2" style={{ fontSize: '0.7rem', fontWeight: '600' }}>Client Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                      <div><span className="text-gray-600">Client ID:</span> <span className="font-medium text-gray-900 font-mono text-xs">{client?.id || 'N/A'}</span></div>
                      <div><span className="text-gray-600">Client:</span> <span className="font-medium text-gray-900">{clientName}</span></div>
                      {client?.schedule_name && <div><span className="text-gray-600">Schedule:</span> <span className="font-medium text-gray-900">{client.schedule_name}</span></div>}
                      {client?.child_name && <div><span className="text-gray-600">Child:</span> <span className="font-medium text-gray-900">{client.child_name}</span></div>}
                      {client?.child_age && <div><span className="text-gray-600">Age:</span> <span className="font-medium text-gray-900">{client.child_age} yrs</span></div>}
                      <div><span className="text-gray-600">Phone:</span> <span className="font-medium text-gray-900">{clientPhone}</span></div>
                      <div className="sm:col-span-2"><span className="text-gray-600">Email:</span> <span className="font-medium text-gray-900 break-all">{clientEmail}</span></div>
                    </div>
                  </div>
                  
                  {/* Psychologist Info */}
                  {psychologist && (
                    <div className="bg-[#3f2e73]/5 rounded-lg p-4">
                      <h3 className="text-xs font-semibold text-gray-900 mb-2" style={{ fontSize: '0.7rem', fontWeight: '600' }}>Psychologist Information</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                        <div><span className="text-gray-600">Psychologist:</span> <span className="font-medium text-gray-900">{psychologistName}</span></div>
                        <div className="sm:col-span-2"><span className="text-gray-600">Email:</span> <span className="font-medium text-gray-900 break-all">{psychologistEmail}</span></div>
                        {psychologistPhone !== 'N/A' && <div><span className="text-gray-600">Phone:</span> <span className="font-medium text-gray-900">{psychologistPhone}</span></div>}
                      </div>
                    </div>
                  )}
                  
                  {/* Session Info */}
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h3 className="text-xs font-semibold text-gray-900 mb-2" style={{ fontSize: '0.7rem', fontWeight: '600' }}>Session Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                      <div><span className="text-gray-600">Session ID:</span> <span className="font-medium text-gray-900 font-mono text-xs">{sessionId}</span></div>
                      <div><span className="text-gray-600">Type:</span> <span className="font-medium text-gray-900">{sessionType}</span></div>
                      <div><span className="text-gray-600">Request Type:</span> <span className="font-medium text-gray-900">{requestType}</span></div>
                    </div>
                  </div>
                  
                  {/* Request Reason/Message */}
                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                    <h3 className="text-xs font-semibold text-gray-900 mb-2" style={{ fontSize: '0.7rem', fontWeight: '600' }}>Client's Request Message</h3>
                    {info.reason ? (
                      <p className="text-sm text-gray-700 italic">"{info.reason}"</p>
                    ) : (
                      <p className="text-sm text-gray-500">No reason provided by the client.</p>
                    )}
                  </div>
                  
                  {/* Schedule Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-100 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-xs font-semibold text-gray-900" style={{ fontSize: '0.7rem', fontWeight: '600' }}>Current Schedule</span>
                      </div>
                      {info.originalDate && info.originalTime ? (
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">{formatDate(info.originalDate)}</p>
                          <p className="text-gray-600">{formatTime(info.originalTime)}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">N/A</p>
                      )}
                    </div>
                    <div className="bg-green-100 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-green-600" />
                        <span className="text-xs font-semibold text-gray-900" style={{ fontSize: '0.7rem', fontWeight: '600' }}>Requested Schedule</span>
                      </div>
                      {info.newDate && info.newTime ? (
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">{formatDate(info.newDate)}</p>
                          <p className="text-gray-600">{formatTime(info.newTime)}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">N/A</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 pt-2">
                    Requested: {new Date(selectedRequest.created_at).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Decline Reason Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Decline Reschedule Request
            </h3>
            <p className="text-gray-600 mb-4">
              Please provide a reason for declining this reschedule request (optional):
            </p>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Enter reason for declining..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
              rows={4}
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeclineModal(false);
                  setSelectedNotification(null);
                  setDeclineReason('');
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDecline}
                disabled={processingId === selectedNotification?.id}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingId === selectedNotification?.id ? 'Processing...' : 'Decline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
