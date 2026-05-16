'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Search,
  MoreVertical,
  User,
  Clock,
  TrendingUp,
  Globe
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { getStoredToken } from '@/lib/authStorage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function BlogsPage() {
  const { user, isAuthenticated, hasRole, isLoading: authLoading, logout } = useAuth();
  const { showError, showSuccess, showWarning } = useNotification();
  const router = useRouter();
  const [blogs, setBlogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState(null);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated()) {
        router.push('/');
        return;
      }
      
      if (!hasRole('admin') && !hasRole('superadmin')) {
        router.push('/');
        return;
      }
      
      loadBlogs();
    }
  }, [authLoading, isAuthenticated, hasRole, router]);

  const loadBlogs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = getStoredToken();
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api';
      
      const queryParams = new URLSearchParams();
      // Always send status - 'all' shows all blogs including drafts
      queryParams.append('status', statusFilter || 'all');
      if (searchTerm) queryParams.append('search', searchTerm);
      
      const response = await fetch(`${baseUrl}/blogs/admin?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setBlogs(result.data.blogs || []);
        } else {
          setBlogs([]);
        }
      } else if (response.status === 401) {
        setBlogs([]);
        setError('Session expired or invalid. Please sign in again.');
        logout();
        router.push('/');
      } else if (response.status === 404) {
        setBlogs([]);
      } else {
        throw new Error('Failed to load blogs');
      }
    } catch (err) {
      console.error('Error loading blogs:', err);
      setBlogs([]);
      if (err.message !== 'Failed to load blogs') {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated() && hasRole('admin')) {
      loadBlogs();
    }
  }, [searchTerm, statusFilter]);

  const handleDelete = async () => {
    try {
      const token = getStoredToken();
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api';
      
      const response = await fetch(`${baseUrl}/blogs/admin/${selectedBlog.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          showSuccess('Blog deleted successfully');
          setShowDeleteDialog(false);
          setSelectedBlog(null);
          loadBlogs();
        }
      } else {
        throw new Error('Failed to delete blog');
      }
    } catch (err) {
      console.error('Error deleting blog:', err);
      showError('Failed to delete blog');
    }
  };

  const handleEdit = (blog) => {
    router.push(`/admin/blogs/${blog.id}/edit`);
  };

  const handleDeleteClick = (blog) => {
    setSelectedBlog(blog);
    setShowDeleteDialog(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#3f2e73]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h6>Blog Management</h6>
              <p className="text-gray-600 mt-1">Manage blog posts and content</p>
            </div>
            <Link
              href="/admin/blogs/new"
              className="bg-[#3f2e73] text-white px-4 py-2 rounded-lg hover:bg-[#1d1733] flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>New Blog</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Globe className="h-8 w-8 text-[#3f2e73]" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Blogs</p>
                <p className="number-bold">{blogs?.length || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Published</p>
                <p className="number-bold">
                  {blogs?.filter(b => b.status === 'published').length || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Drafts</p>
                <p className="number-bold">
                  {blogs?.filter(b => b.status === 'draft').length || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Eye className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Views</p>
                <p className="number-bold">
                  {blogs?.reduce((sum, b) => sum + (b.view_count || 0), 0) || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search blogs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3f2e73] focus:border-[#3f2e73]"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3f2e73] focus:border-[#3f2e73]"
              >
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </div>

        {/* Blogs Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Image
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Author
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Views
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#3f2e73] mx-auto"></div>
                    </td>
                  </tr>
                ) : blogs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center">
                      <div className="flex flex-col items-center justify-center py-8">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                          </svg>
                        </div>
                        <h6>No blog posts yet</h6>
                        <p className="text-gray-500 mb-4">Create your first blog post to get started</p>
                        <Link
                          href="/admin/blogs/new"
                          className="bg-[#3f2e73] text-white px-4 py-2 rounded-lg hover:bg-[#1d1733] inline-flex items-center space-x-2"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Create First Blog</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  blogs.map((blog) => (
                    <tr key={blog.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="w-20 h-16 flex-shrink-0">
                          {blog.featured_image_url ? (
                            <img
                              src={blog.featured_image_url}
                              alt={blog.title}
                              className="w-full h-full object-cover rounded-lg border border-gray-200"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                const placeholder = e.target.parentNode.querySelector('.placeholder-div');
                                if (placeholder) {
                                  placeholder.style.display = 'flex';
                                }
                              }}
                            />
                          ) : null}
                          {!blog.featured_image_url && (
                            <div className="placeholder-div w-full h-full bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          {/* Always include the placeholder div for error fallback but hide it initially if image exists */}
                          {blog.featured_image_url && (
                            <div className="placeholder-div w-full h-full bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center" style={{ display: 'none' }}>
                              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                            {blog.title}
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {blog.excerpt}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{blog.author_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(blog.status)}`}>
                          {blog.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {blog.view_count || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(blog.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-100">
                              <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => window.open(`/blogs/${blog.slug}`, '_blank')} className="cursor-pointer">
                              <Eye className="h-4 w-4 mr-2" />
                              View Blog
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEdit(blog)} className="cursor-pointer">
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteClick(blog)} 
                              className="cursor-pointer text-red-600"
                            >
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

        {/* Delete Confirmation Dialog */}
        {showDeleteDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Delete Blog Post
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete "<strong>{selectedBlog?.title}</strong>"? 
                This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteDialog(false);
                    setSelectedBlog(null);
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
