"use client";

import { useEffect, useState } from 'react';
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

export default function BetterParentingAdminPage() {
  const { isAuthenticated, hasRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated()) return router.push('/');
      if (!hasRole('admin') && !hasRole('superadmin')) return router.push('/profile');
      fetchRows();
    }
  }, [authLoading]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    if (!authLoading && isAuthenticated()) fetchRows();
  }, [debouncedSearch]);

  const fetchRows = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getBetterParentingPages({ search: debouncedSearch, limit: 20 });
      if (res?.success) {
        const list = res.data?.pages;
        setRows(Array.isArray(list) ? list : []);
      } else {
        setError(res?.message || 'Failed to fetch pages');
        setRows([]);
      }
    } catch (e) {
      setError('Error fetching pages');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this page?')) return;
    try {
      await adminApi.deleteBetterParentingPage(id);
      await fetchRows();
    } catch (e) {
      alert('Error deleting page');
    }
  };

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="text-lg">Loading...</div></div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h5 className="font-bold text-gray-900">Better Parenting</h5>
          <p className="text-gray-600 mt-2">Manage Better Parenting pages</p>
        </div>
        <button onClick={() => router.push('/admin/better-parenting/create')} className="bg-[#593494] text-white px-6 py-3 rounded-lg hover:bg-[#7351A9]">Create New</button>
      </div>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">{error}</div>}

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {rows.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No pages found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{r.hero_title || 'Untitled'}</div>
                      <div className="text-sm text-gray-500">/better-parenting/{r.slug}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${r.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{r.status}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(r.updated_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-100">
                            <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => window.open(`/better-parenting/${r.slug}`, '_blank')} className="cursor-pointer">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => router.push(`/admin/better-parenting/edit/${r.id}`)} className="cursor-pointer">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(r.id)} 
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


