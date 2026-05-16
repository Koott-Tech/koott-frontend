"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { adminApi } from '@/lib/backendApi';
import AssessmentsPageBuilder from '@/components/AssessmentsPageBuilder';

export default function CreateAssessmentPage() {
  const { isAuthenticated, hasRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated()) return router.push('/');
      if (!hasRole('admin') && !hasRole('superadmin')) return router.push('/profile');
    }
  }, [authLoading]);

  const handleSubmit = async (data) => {
    try {
      setSaving(true);
      setError('');
      const res = await adminApi.createAssessment(data);
      if (res?.success) router.push('/admin/assessments');
      else setError(res?.message || 'Failed to create assessment');
    } catch (e) {
      setError('Error creating assessment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {error && <div className="container mx-auto px-4 py-4"><div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div></div>}
      <AssessmentsPageBuilder onSubmit={handleSubmit} onCancel={() => router.push('/admin/assessments')} loading={saving} />
    </div>
  );
}


