"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { adminApi } from '@/lib/backendApi';
import { Eye, Edit, Trash2, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function CounsellingAdminPage() {
  const { user, isAuthenticated, hasRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingService, setEditingService] = useState(null);

  useEffect(() => {
    // Check authentication and role
    if (!authLoading) {
      if (!isAuthenticated()) {
        console.log('User not authenticated, redirecting to login');
        router.push('/');
        return;
      }
      
      if (!hasRole('admin') && !hasRole('superadmin')) {
        console.log('User does not have admin privileges, redirecting to profile');
        router.push('/profile');
        return;
      }
      
      // User is authenticated and has admin role, load data
      fetchServices();
    }
  }, [authLoading, isAuthenticated, hasRole, router]);

  // Debounce the search term
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  // Fetch services when debounced search term changes
  useEffect(() => {
    if (!authLoading && isAuthenticated() && hasRole('admin')) {
      fetchServices();
    }
  }, [debouncedSearchTerm]);

  const fetchServices = async () => {
    try {
      // Only show loading spinner on initial load, not during search
      if (isInitialLoad) {
        setLoading(true);
      }
      setError('');
      
      const response = await adminApi.getCounsellingServices({
        search: debouncedSearchTerm,
        limit: 20
      });
      
      if (response?.success) {
        const list = response.data?.services;
        setServices(Array.isArray(list) ? list : []);
      } else {
        setError(response?.message || 'Failed to fetch services');
        setServices([]);
      }
    } catch (err) {
      const errorMsg = err?.message || 'Error fetching services';
      setError(errorMsg);
      console.error('Error fetching counselling services:', {
        message: err?.message,
        response: err?.response,
        error: err
      });
    } finally {
      if (isInitialLoad) {
        setLoading(false);
        setIsInitialLoad(false);
      }
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this counselling service?')) {
      return;
    }

    try {
      await adminApi.deleteCounsellingService(id);
      await fetchServices();
    } catch (err) {
      alert('Error deleting service');
      console.error('Error:', err);
    }
  };

  const filteredServices = services.filter(service => {
    const matchesSearch = service.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.hero_title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || service.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading counselling services...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h5 className="font-bold text-gray-900">Counselling Services</h5>
          <p className="text-gray-600 mt-2">Manage counselling service pages and content</p>
        </div>
        <button
          onClick={() => router.push('/admin/counselling/create')}
          className="bg-[#189e4f] text-white px-6 py-3 rounded-lg hover:bg-[#189e4f] transition-colors duration-200"
        >
          Create New Service
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Services
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by slug or title..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#189e4f]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status Filter
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#189e4f]"
            >
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
      </div>

      {/* Services List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {filteredServices.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No counselling services found</p>
            <button
              onClick={() => router.push('/admin/counselling/create')}
              className="mt-4 bg-[#189e4f] text-white px-6 py-3 rounded-lg hover:bg-[#189e4f] transition-colors duration-200"
            >
              Create Your First Service
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Updated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredServices.map((service) => (
                  <tr key={service.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {service.hero_title || 'Untitled Service'}
                        </div>
                        <div className="text-sm text-gray-500">
                          /counselling/{service.slug}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        service.status === 'published' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {service.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(service.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-100">
                            <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => window.open(`/counselling/${service.slug}`, '_blank')} className="cursor-pointer">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => router.push(`/admin/counselling/edit/${service.id}`)} className="cursor-pointer">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(service.id)} 
                            className="cursor-pointer text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
