"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { adminApi } from '@/lib/backendApi';
import BetterParentingPageBuilder from '@/components/BetterParentingPageBuilder';

export default function EditBetterParentingPage() {
  const { isAuthenticated, hasRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated()) return router.push('/');
      if (!hasRole('admin') && !hasRole('superadmin')) return router.push('/profile');
      fetchRow();
    }
  }, [authLoading, params.id]);

  const fetchRow = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminApi.getBetterParentingPage(params.id);
      if (res?.success) {
        const pageData = res.data || res.message || res;
        setRow(pageData);
      } else {
        setError(res?.message || 'Failed to fetch page');
      }
    } catch (e) {
      setError('Error fetching page');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data) => {
    try {
      setSaving(true);
      setError('');
      const res = await adminApi.updateBetterParentingPage(params.id, data);
      if (res?.success) router.push('/admin/better-parenting');
      else setError(res?.message || 'Failed to update page');
    } catch (e) {
      setError('Error updating page');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="text-lg">Loading page...</div></div>;

  return (
    <div>
      {error && <div className="container mx-auto px-4 py-4"><div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div></div>}
      <BetterParentingPageBuilder pageId={params.id} initialData={row} onSubmit={handleSubmit} onCancel={() => router.push('/admin/better-parenting')} loading={saving} />
    </div>
  );
}


