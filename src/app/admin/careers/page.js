'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Briefcase, Plus, Search, Filter, MoreVertical, Eye, Edit, Trash2, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { careersApi } from '@/lib/backendApi';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function CareersAdminPage() {
  const { isAuthenticated, hasRole, isLoading: authLoading } = useAuth();
  const { showError, showSuccess } = useNotification();
  const router = useRouter();

  const [careers, setCareers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated() || (!hasRole('admin') && !hasRole('superadmin'))) {
        router.push('/');
        return;
      }
      loadCareers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  useEffect(() => {
    if (isAuthenticated() && hasRole('admin')) {
      loadCareers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, statusFilter]);

  const loadCareers = async () => {
    try {
      setIsLoading(true);
      const resp = await careersApi.getCareersAdmin({
        status: statusFilter === 'all' ? '' : statusFilter,
        search: searchTerm || '',
      });
      if (resp?.success) {
        setCareers(resp.data?.careers || []);
      } else {
        setCareers([]);
      }
    } catch (err) {
      console.error('Failed to load careers:', err);
      setCareers([]);
      showError('Failed to load careers', 'Load Error');
    } finally {
      setIsLoading(false);
    }
  };

  const statusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'open') return 'bg-green-100 text-green-700';
    if (s === 'draft') return 'bg-yellow-100 text-yellow-700';
    if (s === 'closed') return 'bg-gray-100 text-gray-700';
    if (s === 'archived') return 'bg-slate-100 text-slate-700';
    return 'bg-gray-100 text-gray-700';
  };

  const handleDeleteClick = (job) => {
    setSelectedJob(job);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!selectedJob?.id) return;
    try {
      setIsDeleting(true);
      await careersApi.deleteCareer(selectedJob.id);
      setShowDeleteDialog(false);
      setSelectedJob(null);
      showSuccess('Job deleted successfully.');
      await loadCareers();
    } catch (err) {
      console.error('Failed to delete career:', err);
      showError('Failed to delete job', 'Delete Error');
    } finally {
      setIsDeleting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#3f2e73]" />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h6>Careers CMS</h6>
              {careers.length > 0 && (
                <span className="px-3 py-1 bg-[#3f2e73]/10 text-[#3f2e73] rounded-full text-sm font-medium">
                  {careers.length} {careers.length === 1 ? 'Job' : 'Jobs'}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-600">
              Manage open roles that appear on the careers page.
            </p>
          </div>
          <Link
            href="/admin/careers/new"
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-[#3f2e73] text-white rounded-lg hover:bg-[#1d1733] transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Job
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title, department, or keyword..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3f2e73] focus:border-transparent text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3f2e73] focus:border-transparent text-sm"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="draft">Draft</option>
              <option value="closed">Closed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Jobs Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Published
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#3f2e73] mx-auto"></div>
                    </td>
                  </tr>
                ) : careers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center">
                      <div className="flex flex-col items-center justify-center py-8">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <Briefcase className="h-8 w-8 text-gray-400" />
                        </div>
                        <h6>No jobs yet</h6>
                        <p className="text-gray-500 mb-4">Create your first job to show on the careers page</p>
                        <Link
                          href="/admin/careers/new"
                          className="bg-[#3f2e73] text-white px-4 py-2 rounded-lg hover:bg-[#1d1733] inline-flex items-center space-x-2"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Create First Job</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  careers.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-md">
                          {job.title}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {job.department || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {job.location ? (
                          <div className="flex items-center text-sm text-gray-500">
                            <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                            <span>{job.location}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusBadge(job.status)}`}>
                          {job.status || 'unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {job.published_at ? new Date(job.published_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-100">
                              <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => window.open(`/career/${job.slug}`, '_blank')} className="cursor-pointer">
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => router.push(`/admin/careers/${job.id}/edit`)} className="cursor-pointer">
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDeleteClick(job)} className="cursor-pointer text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
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

        {/* Delete Confirmation Dialog - same pattern as Blogs CMS */}
        {showDeleteDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Delete Job
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete &quot;<strong>{selectedJob?.title}</strong>&quot;?
                This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteDialog(false);
                    setSelectedJob(null);
                  }}
                  disabled={isDeleting}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

