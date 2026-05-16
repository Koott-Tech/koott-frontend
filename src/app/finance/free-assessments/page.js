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
  X,
  Loader2,
  Star,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { financeApi } from '@/lib/backendApi';
import { useNotification } from '@/contexts/NotificationContext';
import DateRangePicker from '@/components/ui/date-range-picker';
import { hasDateRangeBounds } from '@/lib/dateRangeBounds';
import { formatIstCalendarYmd, istCalendarMonthBounds } from '@/lib/wixFinanceDates';

export default function FinanceFreeAssessments() {
  const { showError } = useNotification();
  const [assessments, setAssessments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [dateRange, setDateRange] = useState(() => istCalendarMonthBounds(new Date()));

  useEffect(() => {
    loadAssessments();
  }, [filterStatus, dateRange]);

  const loadAssessments = async () => {
    try {
      setIsLoading(true);
      
      const params = {};
      if (filterStatus && filterStatus !== 'all') {
        params.status = filterStatus;
      }
      if (hasDateRangeBounds(dateRange)) {
        params.dateFrom = formatIstCalendarYmd(dateRange.from);
        params.dateTo = formatIstCalendarYmd(dateRange.to);
      }

      const response = await financeApi.getFreeAssessments(params);
      
      if (response && response.success) {
        const assessmentsData = response.data?.assessments || [];
        const mappedAssessments = assessmentsData.map(a => ({
          id: a.id,
          assessmentNumber: a.assessmentNumber || a.assessment_number,
          scheduled_date: a.scheduledDate || a.scheduled_date,
          scheduled_time: a.scheduledTime || a.scheduled_time,
          status: a.status,
          feedback: a.feedback || null,
          rating: a.rating || null,
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
          meetLink: a.meetLink || a.meet_link,
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'booked': return 'bg-[#3f2e73]/10 text-[#3f2e73]';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      case 'booked': return 'Booked';
      default: return status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown';
    }
  };

  const normalizeStatus = (s) => (s === 'noshow' ? 'no_show' : (s || ''));

  const filteredAssessments = assessments.filter(assessment => {
    const statusMatch = filterStatus === 'all' || normalizeStatus(assessment.status) === filterStatus;
    if (!statusMatch) return false;
    if (!searchTerm) return true;
    const clientName = `${assessment.client?.first_name || ''} ${assessment.client?.last_name || ''}`.toLowerCase();
    return clientName.includes(searchTerm.toLowerCase());
  });

  const statusTabs = [
    { value: 'all', label: 'All' },
    { value: 'booked', label: 'Booked' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  if (isLoading && assessments.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#3f2e73]"></div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h6>Free Assessments</h6>
          </div>
        </div>

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

        {/* Search */}
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
                    {filterStatus.replace('_', ' ')}
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
                  placeholder="Search by client name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3f2e73] focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-1.5">
          <nav className="flex gap-1 overflow-x-auto" aria-label="Filter free assessments by status">
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
                      ? 'bg-[#3f2e73] text-white shadow-sm'
                      : 'text-gray-600 hover:text-[#3f2e73] hover:bg-[#3f2e73]/8 active:bg-[#3f2e73]/12'
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assessment Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booked at</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center">
                      <div className="inline-flex flex-col items-center gap-3 text-gray-500">
                        <Loader2 className="h-8 w-8 animate-spin text-[#3f2e73]" />
                        <span className="text-sm font-medium">Processing...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredAssessments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                      <h6 className="mt-2">No free assessments found</h6>
                      <p className="mt-1 text-sm text-gray-500">
                        {searchTerm || filterStatus !== 'all'
                          ? 'Try adjusting your search or filter criteria.'
                          : 'No free assessment sessions have been booked yet.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredAssessments.map((assessment) => (
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
                          <div className="text-xs text-gray-500 ml-6">
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
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-100">
                              <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => handleViewAssessment(assessment)} className="cursor-pointer">
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Enhanced Assessment Details Modal */}
        {isDetailsOpen && selectedAssessment && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col border border-slate-200/80">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#3f2e73]/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-[#3f2e73]" />
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
                        className="block bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-[#3f2e73] hover:bg-[#3f2e73]/5 break-all"
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
                  className="px-4 py-2 text-[#3f2e73] bg-white border border-[#3f2e73]/40 rounded-lg hover:bg-[#3f2e73]/10 transition-colors text-sm font-medium"
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
