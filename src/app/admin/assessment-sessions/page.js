'use client';

import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Search,
  User,
  UserCheck,
  CheckCircle,
  Clock,
  AlertCircle,
  Package,
  ChevronDown,
  ChevronUp,
  Eye,
  X,
  FileText,
  Phone,
  Mail,
  DollarSign
} from 'lucide-react';
import { sessionsApi } from '@/lib/backendApi';
import { useNotification } from '@/contexts/NotificationContext';

export default function AssessmentSessionsPage() {
  const { showError, showSuccess } = useNotification();
  const [assessmentSessions, setAssessmentSessions] = useState([]);
  const [groupedAssessments, setGroupedAssessments] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedSession, setSelectedSession] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  useEffect(() => {
    loadAssessmentSessions();
  }, []);

  useEffect(() => {
    groupSessions();
  }, [assessmentSessions, filterStatus]);

  const loadAssessmentSessions = async () => {
    try {
      setIsLoading(true);
      const response = await sessionsApi.getAllSessions({ limit: 1000 });
      
      if (response && response.success) {
        // Filter only assessment sessions
        const allSessions = response.data?.sessions || [];
        const assessments = allSessions.filter(s => 
          s.session_type === 'assessment' || s.type === 'assessment'
        );
        setAssessmentSessions(assessments);
      }
    } catch (error) {
      console.error('Failed to load assessment sessions:', error);
      showError('Failed to load assessment sessions', 'Load Error');
    } finally {
      setIsLoading(false);
    }
  };

  const groupSessions = () => {
    const groups = {};
    
    assessmentSessions.forEach(session => {
      // Create a unique key for each assessment package
      const key = `${session.assessment_id}_${session.client_id}_${session.payment_id || 'no-payment'}`;
      
      if (!groups[key]) {
        groups[key] = {
          assessment_id: session.assessment_id,
          client_id: session.client_id,
          payment_id: session.payment_id,
          client: session.client,
          assessment: session.assessment || { hero_title: 'Assessment', seo_title: 'Assessment' },
          sessions: [],
          completed: 0,
          total: 3
        };
      }
      
      groups[key].sessions.push(session);
      
      if (session.status === 'completed') {
        groups[key].completed++;
      }
    });

    // Sort sessions within each group by session_number
    Object.keys(groups).forEach(key => {
      groups[key].sessions.sort((a, b) => {
        const numA = a.session_number || 0;
        const numB = b.session_number || 0;
        return numA - numB;
      });
    });

    // Apply filters
    let filteredGroups = groups;
    
    if (filterStatus !== 'all') {
      filteredGroups = {};
      Object.keys(groups).forEach(key => {
        const group = groups[key];
        if (filterStatus === 'completed' && group.completed === 3) {
          filteredGroups[key] = group;
        } else if (filterStatus === 'in-progress' && group.completed < 3 && group.completed > 0) {
          filteredGroups[key] = group;
        } else if (filterStatus === 'pending' && group.completed === 0) {
          filteredGroups[key] = group;
        }
      });
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const searchedGroups = {};
      Object.keys(filteredGroups).forEach(key => {
        const group = filteredGroups[key];
        const clientName = `${group.client?.first_name || ''} ${group.client?.last_name || ''}`.toLowerCase();
        const clientEmail = group.client?.user?.email?.toLowerCase() || '';
        
        if (clientName.includes(searchLower) || clientEmail.includes(searchLower)) {
          searchedGroups[key] = group;
        }
      });
      filteredGroups = searchedGroups;
    }

    setGroupedAssessments(filteredGroups);
  };

  const toggleGroup = (key) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedGroups(newExpanded);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'booked': { bg: 'bg-[#025545]/10', text: 'text-[#025545]', label: 'Booked' },
      'reserved': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Reserved' },
      'completed': { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
      'pending': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Pending' },
      'cancelled': { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' }
    };
    
    const config = statusConfig[status] || statusConfig['pending'];
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch (error) {
      return timeString;
    }
  };

  const handleViewDetails = (session) => {
    setSelectedSession(session);
    setIsDetailsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#025545] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assessment sessions...</p>
        </div>
      </div>
    );
  }

  const groupKeys = Object.keys(groupedAssessments);
  const totalAssessments = groupKeys.length;
  const completedAssessments = groupKeys.filter(key => groupedAssessments[key].completed === 3).length;
  const inProgressAssessments = groupKeys.filter(key => 
    groupedAssessments[key].completed > 0 && groupedAssessments[key].completed < 3
  ).length;
  const pendingAssessments = groupKeys.filter(key => groupedAssessments[key].completed === 0).length;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Assessment Sessions</h1>
        <p className="mt-2 text-sm text-gray-600">
          View and manage all assessment package sessions. Each package includes 3 sessions.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Assessments</div>
          <div className="text-2xl font-bold text-gray-900">{totalAssessments}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Completed</div>
          <div className="text-2xl font-bold text-green-600">{completedAssessments}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">In Progress</div>
          <div className="text-2xl font-bold text-[#025545]">{inProgressAssessments}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Pending</div>
          <div className="text-2xl font-bold text-yellow-600">{pendingAssessments}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by client name or email..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#025545]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#025545]"
            >
              <option value="all">All Assessments</option>
              <option value="completed">Completed (3/3)</option>
              <option value="in-progress">In Progress (1/3 or 2/3)</option>
              <option value="pending">Pending (0/3)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assessment Groups */}
      <div className="space-y-4">
        {groupKeys.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No assessment sessions found</p>
          </div>
        ) : (
          groupKeys.map(key => {
            const group = groupedAssessments[key];
            const isExpanded = expandedGroups.has(key);
            const clientName = group.client?.child_name || 
              `${group.client?.first_name || ''} ${group.client?.last_name || ''}`.trim() || 
              'Unknown Client';
            return (
              <div key={key} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                {/* Group Header */}
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleGroup(key)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h5>{clientName}</h5>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          Assessment
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Package className="h-4 w-4" />
                          <span className="font-medium text-[#025545]">
                            {group.completed}/{group.total} sessions completed
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {group.completed === 3 ? 'Completed' : 
                           group.completed > 0 ? 'In Progress' : 'Pending'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {group.sessions.length} session{group.sessions.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Sessions List */}
                {isExpanded && (
                  <div className="border-t border-gray-200 divide-y divide-gray-200">
                    {[1, 2, 3].map(slotNum => {
                      const session = group.sessions.find(s => s.session_number === slotNum);
                      
                      return (
                        <div key={slotNum} className="p-4 bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-800 font-semibold text-sm">
                                  {slotNum}
                                </span>
                                <span className="text-sm font-medium text-gray-900">Session {slotNum}</span>
                                {session && getStatusBadge(session.status)}
                              </div>
                              
                              {session ? (
                                <div className="ml-11 space-y-1">
                                  {session.scheduled_date && session.scheduled_time ? (
                                    <div className="flex items-center gap-4 text-sm text-gray-600">
                                      <div className="flex items-center gap-1">
                                        <Calendar className="h-4 w-4" />
                                        <span>{formatDate(session.scheduled_date)}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Clock className="h-4 w-4" />
                                        <span>{formatTime(session.scheduled_time)}</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-sm text-gray-500 italic">Not scheduled yet</div>
                                  )}
                                  
                                  {session.psychologist ? (
                                    <div className="flex items-center gap-1 text-sm text-gray-600">
                                      <UserCheck className="h-4 w-4" />
                                      <span>
                                        Dr. {session.psychologist.first_name} {session.psychologist.last_name}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="text-sm text-gray-500 italic">No psychologist assigned</div>
                                  )}
                                  
                                  {session.session_summary && (
                                    <div className="text-sm text-gray-600 mt-2">
                                      <span className="font-medium">Summary: </span>
                                      <span className="text-gray-500">{session.session_summary.substring(0, 100)}...</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="ml-11 text-sm text-gray-500 italic">Session not created yet</div>
                              )}
                            </div>
                            {session && (
                              <div className="ml-11 mt-2">
                                <button
                                  onClick={() => handleViewDetails(session)}
                                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-[#025545] hover:bg-[#012f23] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#025545]"
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View Details
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Session Details Modal */}
      {isDetailsModalOpen && selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-[#025545]" />
                <h4>Assessment Session Details</h4>
              </div>
              <button
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  setSelectedSession(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Session Info */}
            <div className="p-6 space-y-6">
              {/* Assessment Info */}
              <div className="bg-purple-50 rounded-lg p-4">
                <h5 className="mb-3 flex items-center gap-2">
                  <Package className="h-5 w-5 text-purple-600" />
                  Assessment Information
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Assessment:</span>
                    <span className="ml-2 font-medium text-gray-800">
                      {selectedSession.assessment?.hero_title || selectedSession.assessment?.seo_title || 'Assessment'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Session Number:</span>
                    <span className="ml-2 font-medium text-gray-800">
                      Session {selectedSession.session_number || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Client Info */}
              <div>
                <h5 className="mb-3 flex items-center gap-2">
                  <User className="h-5 w-5 text-[#025545]" />
                  Client Information
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <span className="ml-2 font-medium text-gray-800">
                      {selectedSession.client?.child_name || 
                       `${selectedSession.client?.first_name || ''} ${selectedSession.client?.last_name || ''}`.trim() || 
                       'N/A'}
                    </span>
                  </div>
                  {selectedSession.client?.phone_number && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Phone:</span>
                      <span className="ml-2 font-medium text-gray-800">
                        {selectedSession.client.phone_number}
                      </span>
                    </div>
                  )}
                  {selectedSession.client?.user?.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Email:</span>
                      <span className="ml-2 font-medium text-gray-800">
                        {selectedSession.client.user.email}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Session Details */}
              <div>
                <h5 className="mb-3 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-green-600" />
                  Session Details
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Date:</span>
                    <span className="ml-2 font-medium text-gray-800">
                      {selectedSession.scheduled_date ? formatDate(selectedSession.scheduled_date) : 'Not scheduled'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Time:</span>
                    <span className="ml-2 font-medium text-gray-800">
                      {selectedSession.scheduled_time ? formatTime(selectedSession.scheduled_time) : 'Not scheduled'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <span className="ml-2">
                      {getStatusBadge(selectedSession.status)}
                    </span>
                  </div>
                  {selectedSession.amount && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Amount:</span>
                      <span className="ml-2 font-medium text-gray-800">
                        ₹{selectedSession.amount}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Psychologist Info */}
              {selectedSession.psychologist && (
                <div>
                  <h5 className="mb-3 flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-indigo-600" />
                    Assigned Psychologist
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Name:</span>
                      <span className="ml-2 font-medium text-gray-800">
                        Dr. {selectedSession.psychologist.first_name} {selectedSession.psychologist.last_name}
                      </span>
                    </div>
                    {selectedSession.psychologist.area_of_expertise && (
                      <div>
                        <span className="text-gray-600">Expertise:</span>
                        <span className="ml-2 font-medium text-gray-800">
                          {selectedSession.psychologist.area_of_expertise}
                        </span>
                      </div>
                    )}
                    {selectedSession.psychologist.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Email:</span>
                        <span className="ml-2 font-medium text-gray-800">
                          {selectedSession.psychologist.email}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Session Summary */}
              {selectedSession.session_summary && (
                <div>
                  <h5 className="mb-3">Session Summary</h5>
                  <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700">
                    {selectedSession.session_summary}
                  </div>
                </div>
              )}

              {/* Session Notes */}
              {selectedSession.session_notes && (
                <div>
                  <h5 className="mb-3">Session Notes</h5>
                  <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700">
                    {selectedSession.session_notes}
                  </div>
                </div>
              )}

              {/* Additional Info */}
              <div className="border-t border-gray-200 pt-4">
                <h5 className="mb-3">Additional Information</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Session ID:</span>
                    <span className="ml-2 font-mono text-xs text-gray-500">
                      {selectedSession.id}
                    </span>
                  </div>
                  {selectedSession.payment_id && (
                    <div>
                      <span className="text-gray-600">Payment ID:</span>
                      <span className="ml-2 font-mono text-xs text-gray-500">
                        {selectedSession.payment_id}
                      </span>
                    </div>
                  )}
                  {selectedSession.created_at && (
                    <div>
                      <span className="text-gray-600">Created:</span>
                      <span className="ml-2 text-gray-800">
                        {formatDate(selectedSession.created_at)}
                      </span>
                    </div>
                  )}
                  {selectedSession.updated_at && (
                    <div>
                      <span className="text-gray-600">Last Updated:</span>
                      <span className="ml-2 text-gray-800">
                        {formatDate(selectedSession.updated_at)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end p-6 border-t border-gray-200 sticky bottom-0 bg-white">
              <button
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  setSelectedSession(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

