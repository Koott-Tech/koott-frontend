'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Search,
  User,
  Mail,
  Calendar,
  MoreVertical,
  Loader2,
  History
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { adminApi } from '@/lib/backendApi';
import UserModal from '@/components/UserModal';
import ConfirmModal from '@/components/ConfirmModal';
import { useNotification } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import WheelPagination from '@/components/ui/wheel-pagination';
import ClientBookingsHistoryModal from '@/components/ClientBookingsHistoryModal';

export default function UsersPage() {
  const { showError, showSuccess } = useNotification();
  const { user, isAuthenticated, hasRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFullProfileOpen, setIsFullProfileOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null); // Track which user is being deleted
  const [bookingsHistoryOpen, setBookingsHistoryOpen] = useState(false);
  const [bookingsHistoryUser, setBookingsHistoryUser] = useState(null);

  useEffect(() => {
    // Check authentication and role
    if (!authLoading) {
      if (!isAuthenticated()) {
        console.log('User not authenticated, redirecting to home');
        router.push('/');
        return;
      }
      
      if (!hasRole('admin') && !hasRole('superadmin')) {
        console.log('User does not have admin privileges, redirecting to profile');
        router.push('/profile');
        return;
      }
      
      // User is authenticated and has admin role, load users data
      loadUsers();
    }
  }, [authLoading, isAuthenticated, hasRole, router, currentPage]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Loading users...');
      const response = await adminApi.getUsers({
        page: currentPage,
        limit: 10,
        role: 'client' // Only fetch client users
      });
      console.log('📊 Users API response:', response);
      
      if (response && response.success && response.data) {
        const usersData = response.data.users || [];
        const pagination = response.data.pagination || {};
        
        console.log('🔍 Users from API:', usersData);
        console.log('📊 Pagination:', pagination);
        
        setUsers(usersData);
        setTotalUsers(pagination.total || 0);
        setTotalPages(Math.max(1, Math.ceil((pagination.total || 0) / 10)));
      } else {
        console.warn('Invalid response structure:', response);
        setUsers([]);
        setTotalUsers(0);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      showError('Failed to load users', 'Load Error');
      setUsers([]);
      setTotalUsers(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setIsUserModalOpen(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setIsUserModalOpen(true);
  };

  const handleDeleteUser = (user) => {
    setUserToDelete(user);
    setIsConfirmModalOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete || deletingUserId) return; // Prevent double deletion

    try {
      setDeletingUserId(userToDelete.id); // Set loading state - keep modal open
      await adminApi.deleteUser(userToDelete.id);
      showSuccess('User deleted successfully');
      setIsConfirmModalOpen(false); // Close modal after success
      setUserToDelete(null);
      await loadUsers(); // Reload users list
    } catch (error) {
      console.error('Error deleting user:', error);
      showError('Failed to delete user', 'Delete Error');
      // Keep modal open on error so user can try again
    } finally {
      setDeletingUserId(null); // Clear loading state
    }
  };

  const openFullProfile = (user) => {
    setSelectedUser(user);
    setIsFullProfileOpen(true);
  };

  const openBookingsHistory = (user) => {
    setBookingsHistoryUser(user);
    setBookingsHistoryOpen(true);
  };

  const handleUserModalClose = () => {
    setIsUserModalOpen(false);
    setEditingUser(null);
  };

  const handleUserModalSuccess = () => {
    handleUserModalClose();
    loadUsers();
    showSuccess(
      editingUser ? 'User updated successfully' : 'User added successfully'
    );
  };


  // Note: Search and role filtering are now handled on the backend via API
  // Keep client-side filtering as fallback if backend doesn't support it
  const filteredUsers = users.filter(user => {
    const fullName = `${user.profile?.first_name || ''} ${user.profile?.last_name || ''}`.trim().toLowerCase() || 
                     user.name?.toLowerCase() || '';
    const email = user.email?.toLowerCase() || '';
    
    const matchesSearch = !searchTerm || 
                         fullName.includes(searchTerm.toLowerCase()) ||
                         email.includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });
  
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage + 1); // WheelPagination uses 0-indexed, we use 1-indexed
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Show loading spinner while checking authentication
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#025545]"></div>
      </div>
    );
  }

  // Show access denied if user is not authenticated or doesn't have admin role
  if (!user || (!hasRole('admin') && !hasRole('superadmin'))) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-4 h-4 bg-red-600 rounded-full"></div>
          </div>
          <h6>Access Denied</h6>
          <p className="text-sm text-red-700 mt-1">You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  // Show loading spinner while fetching data
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#025545]"></div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h6>Users Management</h6>
            {totalUsers > 0 && (
              <span className="px-3 py-1 bg-[#025545]/10 text-[#025545] rounded-full text-sm font-medium">
                {totalUsers} {totalUsers === 1 ? 'User' : 'Users'}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Manage client users and their accounts on the platform
          </p>
        </div>
        <button
          onClick={handleAddUser}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-[#025545] text-white rounded-lg hover:bg-[#012f23] transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#025545] focus:border-transparent"
          />
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone Number
                </th>
                <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                <tr 
                  key={user.id} 
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 sm:px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {user.name || 
                       (user.profile?.first_name && user.profile?.last_name 
                        ? `${user.profile.first_name} ${user.profile.last_name}`.trim()
                        : user.profile?.first_name || 
                          user.profile?.child_name || 
                          user.email?.split('@')[0] || 
                          'No Name')}
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <div className="text-sm text-gray-600">{user.email}</div>
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <div className="text-sm text-gray-600">{user.profile?.phone_number || 'Not provided'}</div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {deletingUserId === user.id ? (
                        <div className="flex items-center text-gray-500">
                          <Loader2 className="h-4 w-4 animate-spin mr-2 text-red-600" />
                          <span className="text-xs">Deleting...</span>
                        </div>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button 
                              onClick={(e) => e.stopPropagation()}
                              disabled={deletingUserId === user.id}
                              className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                openFullProfile(user); 
                              }} 
                              className="cursor-pointer"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                openBookingsHistory(user);
                              }}
                              className="cursor-pointer"
                            >
                              <History className="h-4 w-4 mr-2" />
                              Bookings history
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                handleEditUser(user); 
                              }} 
                              disabled={deletingUserId === user.id}
                              className="cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                handleDeleteUser(user); 
                              }} 
                              disabled={deletingUserId === user.id}
                              className="cursor-pointer text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" className="px-4 sm:px-6 py-8 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center mt-8 pt-6 border-t border-gray-200">
          <WheelPagination
            totalPages={totalPages}
            visibleCount={7}
            currentPage={currentPage - 1} // Convert 1-indexed to 0-indexed
            onPageChange={handlePageChange}
            className="bg-white"
          />
        </div>
      )}

      {/* Empty State */}
      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h6>No users found</h6>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm 
              ? 'Try adjusting your search criteria.'
              : 'Get started by adding your first user.'
            }
          </p>
          {!searchTerm && (
            <div className="mt-6">
              <button
                onClick={handleAddUser}
                className="inline-flex items-center px-4 py-2 bg-[#025545] text-white rounded-lg hover:bg-[#012f23] transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </button>
            </div>
          )}
        </div>
      )}

      {/* User Modal */}
      {isUserModalOpen && (
        <UserModal
          isOpen={isUserModalOpen}
          onClose={handleUserModalClose}
          onSave={async (userData) => {
            // Decide between create and update based on editingUser
            if (editingUser && editingUser.id) {
              await adminApi.updateUser(editingUser.id, userData);
            } else {
              await adminApi.createUser(userData);
            }
            handleUserModalSuccess();
          }}
          user={editingUser}
          mode={editingUser ? 'edit' : 'add'}
        />
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => {
          if (!deletingUserId) { // Don't allow closing while deleting
            setIsConfirmModalOpen(false);
            setUserToDelete(null);
          }
        }}
        onConfirm={confirmDeleteUser}
        title="Delete User"
        message={`Are you sure you want to delete ${userToDelete?.name || userToDelete?.email || 'this user'}? This action cannot be undone.`}
        confirmText={deletingUserId ? (
          <span className="flex items-center">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Deleting...
          </span>
        ) : "Delete"}
        cancelText="Cancel"
        variant="danger"
        isLoading={!!deletingUserId}
        disabled={!!deletingUserId}
      />

      {/* Full Profile Modal (View) */}
      <ClientBookingsHistoryModal
        isOpen={bookingsHistoryOpen}
        onClose={() => {
          setBookingsHistoryOpen(false);
          setBookingsHistoryUser(null);
        }}
        clientId={bookingsHistoryUser?.client_id || bookingsHistoryUser?.profile?.client_id || null}
        displayName={
          bookingsHistoryUser?.name ||
          (bookingsHistoryUser?.profile?.first_name && bookingsHistoryUser?.profile?.last_name
            ? `${bookingsHistoryUser.profile.first_name} ${bookingsHistoryUser.profile.last_name}`.trim()
            : bookingsHistoryUser?.email || '')
        }
      />

      {isFullProfileOpen && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#025545]/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-[#025545]" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-800 tracking-tight" role="heading" aria-level={1}>
                    {selectedUser.name ||
                     (selectedUser.profile?.first_name && selectedUser.profile?.last_name
                       ? `${selectedUser.profile.first_name} ${selectedUser.profile.last_name}`.trim()
                       : selectedUser.profile?.first_name ||
                         selectedUser.profile?.child_name ||
                         selectedUser.email?.split('@')[0] ||
                         'User Profile')}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 capitalize">{selectedUser.role || 'User'}</p>
                </div>
              </div>
              <button
                onClick={() => setIsFullProfileOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-200/80"
                aria-label="Close modal"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content - labels outside, data in input-style boxes */}
            <div className="p-6 space-y-5">
              {/* Basic Information */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3" role="heading" aria-level={2}>
                  Basic Information
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">ID</label>
                    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 font-mono">
                      {selectedUser.id || '—'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
                    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800">
                      {selectedUser.email || 'Not provided'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Phone Number</label>
                    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800">
                      {selectedUser.profile?.phone_number || 'Not provided'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Child Information (for clients) */}
              {selectedUser.role === 'client' && (selectedUser.profile?.child_name || selectedUser.profile?.child_age) && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3" role="heading" aria-level={2}>
                    Child Information
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Child Name</label>
                      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800">
                        {selectedUser.profile?.child_name || 'Not provided'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Child Age</label>
                      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800">
                        {selectedUser.profile?.child_age ? `${selectedUser.profile.child_age} years old` : 'Not provided'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Account Information */}
              {selectedUser.created_at && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3" role="heading" aria-level={2}>
                    Account Information
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Member Since</label>
                      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800">
                        {new Date(selectedUser.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Account Status</label>
                      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
                <button
                  onClick={() => setIsFullProfileOpen(false)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setIsFullProfileOpen(false);
                    handleEditUser(selectedUser);
                  }}
                  className="px-4 py-2 bg-[#025545] text-white rounded-lg hover:bg-[#012f23] transition-colors text-sm font-medium"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
