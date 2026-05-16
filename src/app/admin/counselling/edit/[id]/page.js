"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { adminApi } from '@/lib/backendApi';
import CounsellingPageBuilder from '@/components/CounsellingPageBuilder';

export default function EditCounsellingServicePage() {
  const { user, isAuthenticated, hasRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
      
      // User is authenticated and has admin role, load data
      fetchService();
    }
  }, [authLoading, isAuthenticated, hasRole, router, params.id]);

  const fetchService = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await adminApi.getCounsellingService(params.id);
      
      if (response && response.success) {
        const serviceData = response.data || response.message || response;
        console.log('Edit page - fetched service:', serviceData);
        console.log('Edit page - benefits count:', serviceData?.benefits?.length);
        console.log('Edit page - FAQs count:', serviceData?.faqs?.length);
        setService(serviceData);
      } else {
        setError(response?.message || 'Failed to fetch service');
      }
    } catch (err) {
      setError('Error fetching service');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData) => {
    try {
      setSaving(true);
      setError('');
      
      console.log('Submitting counselling service update:', {
        id: params.id,
        formData
      });
      
      const response = await adminApi.updateCounsellingService(params.id, formData);
      
      console.log('Update response:', response);

      if (response && response.success) {
        console.log('✅ Counselling service updated successfully');
        router.push('/admin/counselling');
      } else {
        const errorMsg = response?.message || response?.error || 'Failed to update counselling service';
        console.error('❌ Update failed:', errorMsg, response);
        setError(errorMsg);
      }
    } catch (err) {
      const errorMsg = err?.message || err?.response?.data?.message || 'Error updating counselling service';
      console.error('❌ Error updating counselling service:', {
        message: err?.message,
        response: err?.response,
        error: err
      });
      setError(errorMsg);
    } finally {
      setSaving(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading counselling service...</div>
      </div>
    );
  }

  if (error && !service) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
        <button
          onClick={() => router.push('/admin/counselling')}
          className="mt-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Back to Services
        </button>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="container mx-auto px-4 py-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}
      <CounsellingPageBuilder
        serviceId={params.id}
        initialData={service}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        loading={saving}
      />
    </div>
  );
}
