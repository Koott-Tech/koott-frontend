"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { adminApi } from '@/lib/backendApi';
import CounsellingPageBuilder from '@/components/CounsellingPageBuilder';

export default function CreateCounsellingServicePage() {
  const { user, isAuthenticated, hasRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    }
  }, [authLoading, isAuthenticated, hasRole, router]);

  const handleSubmit = async (formData) => {
    try {
      setLoading(true);
      setError('');
      
      const response = await adminApi.createCounsellingService(formData);

      if (response && response.success) {
        router.push('/admin/counselling');
      } else {
        setError(response?.message || 'Failed to create counselling service');
      }
    } catch (err) {
      setError('Error creating counselling service');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin/counselling');
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <CounsellingPageBuilder
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      loading={loading}
    />
  );
}
