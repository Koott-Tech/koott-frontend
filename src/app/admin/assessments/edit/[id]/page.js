"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { adminApi } from '@/lib/backendApi';
import AssessmentsPageBuilder from '@/components/AssessmentsPageBuilder';

export default function EditAssessmentPage() {
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
      const res = await adminApi.getAssessment(params.id);
      if (res?.success) {
        const assessmentData = res.data || res.message || res;
        setRow(assessmentData);
      } else {
        setError(res?.message || 'Failed to fetch assessment');
      }
    } catch (e) {
      setError('Error fetching assessment');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data) => {
    try {
      setSaving(true);
      setError('');
      const res = await adminApi.updateAssessment(params.id, data);
      if (res?.success) router.push('/admin/assessments');
      else setError(res?.message || 'Failed to update assessment');
    } catch (e) {
      setError('Error updating assessment');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="text-lg">Loading assessment...</div></div>;
  }

  return (
    <div>
      {error && <div className="container mx-auto px-4 py-4"><div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div></div>}
      <AssessmentsPageBuilder assessmentId={params.id} initialData={row} onSubmit={handleSubmit} onCancel={() => router.push('/admin/assessments')} loading={saving} />
    </div>
  );
}


