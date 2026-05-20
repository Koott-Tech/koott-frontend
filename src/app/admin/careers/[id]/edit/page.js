'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { careersApi } from '@/lib/backendApi';

export default function EditCareerPage({ params }) {
  const id = params?.id;
  const { isAuthenticated, hasRole, isLoading: authLoading } = useAuth();
  const { showError, showSuccess } = useNotification();
  const router = useRouter();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated() || (!hasRole('admin') && !hasRole('superadmin'))) {
        router.push('/');
        return;
      }
      loadCareer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, id]);

  const loadCareer = async () => {
    try {
      setLoading(true);
      const resp = await careersApi.getCareer(id);
      if (resp?.success && resp.data) {
        setForm({
          title: resp.data.title || '',
          slug: resp.data.slug || '',
          short_description: resp.data.short_description || '',
          description: resp.data.description || '',
          responsibilities: resp.data.responsibilities || '',
          requirements: resp.data.requirements || '',
          benefits: resp.data.benefits || '',
          location: resp.data.location || '',
          employment_type: resp.data.employment_type || 'Full-time',
          department: resp.data.department || '',
          experience_level: resp.data.experience_level || '',
          min_experience_years: resp.data.min_experience_years ?? '',
          max_experience_years: resp.data.max_experience_years ?? '',
          application_email: resp.data.application_email || '',
          application_url: resp.data.application_url || '',
          is_remote: resp.data.is_remote || false,
          is_featured: resp.data.is_featured || false,
          status: resp.data.status || 'draft',
          seo_title: resp.data.seo_title || '',
          seo_description: resp.data.seo_description || '',
        });
      } else {
        showError('Job not found');
        router.push('/admin/careers');
      }
    } catch (err) {
      showError('Failed to load job');
      router.push('/admin/careers');
    } finally {
      setLoading(false);
    }
  };

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const getPoints = (field) => {
    const raw = (form[field] || '').split('\n');
    return raw.length ? raw : [''];
  };

  const handlePointChange = (field, index, value) => {
    const items = getPoints(field);
    items[index] = value;
    const cleaned = items.filter((item, i) => item.trim() !== '' || i === items.length - 1);
    set(field, cleaned.join('\n'));
  };

  const addPoint = (field) => {
    const items = getPoints(field);
    items.push('');
    set(field, items.join('\n'));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title?.trim()) { showError('Title is required'); return; }
    if (!form.description?.trim()) { showError('Description is required'); return; }
    if (saving) return;
    setSaving(true);
    try {
      const payload = { ...form };
      if (payload.min_experience_years !== '') payload.min_experience_years = Number(payload.min_experience_years);
      else payload.min_experience_years = null;
      if (payload.max_experience_years !== '') payload.max_experience_years = Number(payload.max_experience_years);
      else payload.max_experience_years = null;
      const resp = await careersApi.updateCareer(id, payload);
      if (resp?.success) {
        showSuccess('Job updated successfully');
        router.push('/admin/careers');
      } else {
        showError(resp?.message || 'Failed to update job');
      }
    } catch (err) {
      showError(err?.message || 'Failed to update job');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this job? This cannot be undone.')) return;
    setDeleting(true);
    try {
      const resp = await careersApi.deleteCareer(id);
      if (resp?.success) {
        showSuccess('Job deleted');
        router.push('/admin/careers');
      } else {
        showError(resp?.message || 'Failed to delete');
      }
    } catch (err) {
      showError('Failed to delete job');
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#025545]" />
      </div>
    );
  }

  if (!form) return null;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin/careers" className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h6>Edit Job</h6>
              <p className="text-sm text-gray-500">{form.title}</p>
            </div>
          </div>
          <button onClick={handleDelete} disabled={deleting} className="inline-flex items-center gap-1.5 px-3 py-2 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg text-sm disabled:opacity-50">
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow border border-gray-200 p-6 space-y-6">
          {/* Title & Slug */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Title *</label>
              <input type="text" value={form.title} onChange={(e) => set('title', e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#025545] focus:border-transparent text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Slug</label>
              <input type="text" value={form.slug} onChange={(e) => set('slug', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#025545] focus:border-transparent text-sm" />
            </div>
          </div>

          {/* Short description */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Short Description</label>
            <input type="text" value={form.short_description} onChange={(e) => set('short_description', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#025545] focus:border-transparent text-sm" />
          </div>

          {/* Full description */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Description *</label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={6} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#025545] focus:border-transparent text-sm" />
          </div>

          {/* Responsibilities, Requirements, Benefits (as points) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Responsibilities</label>
              <div className="space-y-2">
                {getPoints('responsibilities').map((value, idx) => (
                  <input
                    key={idx}
                    type="text"
                    value={value}
                    onChange={(e) => handlePointChange('responsibilities', idx, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#025545] focus:border-transparent text-xs"
                    placeholder={`Responsibility ${idx + 1}`}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => addPoint('responsibilities')}
                  className="text-[11px] text-[#025545] hover:underline"
                >
                  + Add responsibility
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Requirements</label>
              <div className="space-y-2">
                {getPoints('requirements').map((value, idx) => (
                  <input
                    key={idx}
                    type="text"
                    value={value}
                    onChange={(e) => handlePointChange('requirements', idx, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#025545] focus:border-transparent text-xs"
                    placeholder={`Requirement ${idx + 1}`}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => addPoint('requirements')}
                  className="text-[11px] text-[#025545] hover:underline"
                >
                  + Add requirement
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Benefits</label>
              <div className="space-y-2">
                {getPoints('benefits').map((value, idx) => (
                  <input
                    key={idx}
                    type="text"
                    value={value}
                    onChange={(e) => handlePointChange('benefits', idx, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#025545] focus:border-transparent text-xs"
                    placeholder={`Benefit ${idx + 1}`}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => addPoint('benefits')}
                  className="text-[11px] text-[#025545] hover:underline"
                >
                  + Add benefit
                </button>
              </div>
            </div>
          </div>

          {/* Location, Type, Department */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Location</label>
              <input type="text" value={form.location} onChange={(e) => set('location', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#025545] focus:border-transparent text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Employment Type</label>
              <select value={form.employment_type} onChange={(e) => set('employment_type', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#025545] focus:border-transparent text-sm">
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
                <option value="Freelance">Freelance</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Department</label>
              <input type="text" value={form.department} onChange={(e) => set('department', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#025545] focus:border-transparent text-sm" />
            </div>
          </div>

          {/* Experience */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Experience Level</label>
              <select value={form.experience_level} onChange={(e) => set('experience_level', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#025545] focus:border-transparent text-sm">
                <option value="">Not specified</option>
                <option value="Entry">Entry Level</option>
                <option value="Junior">Junior</option>
                <option value="Mid">Mid Level</option>
                <option value="Senior">Senior</option>
                <option value="Lead">Lead</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Min Experience (years)</label>
              <input type="number" value={form.min_experience_years} onChange={(e) => set('min_experience_years', e.target.value)} min="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#025545] focus:border-transparent text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Max Experience (years)</label>
              <input type="number" value={form.max_experience_years} onChange={(e) => set('max_experience_years', e.target.value)} min="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#025545] focus:border-transparent text-sm" />
            </div>
          </div>

          {/* Application info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Application Email</label>
              <input type="email" value={form.application_email} onChange={(e) => set('application_email', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#025545] focus:border-transparent text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Application URL (optional)</label>
              <input type="url" value={form.application_url} onChange={(e) => set('application_url', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#025545] focus:border-transparent text-sm" />
            </div>
          </div>

          {/* Toggles + Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.is_remote} onChange={(e) => set('is_remote', e.target.checked)} className="rounded border-gray-300 text-[#025545] focus:ring-[#025545]" />
                Remote
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.is_featured} onChange={(e) => set('is_featured', e.target.checked)} className="rounded border-gray-300 text-[#025545] focus:ring-[#025545]" />
                Featured
              </label>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status *</label>
              <select value={form.status} onChange={(e) => set('status', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#025545] focus:border-transparent text-sm">
                <option value="draft">Draft</option>
                <option value="open">Open (visible on site)</option>
                <option value="closed">Closed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {/* SEO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">SEO Title</label>
              <input type="text" value={form.seo_title} onChange={(e) => set('seo_title', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#025545] focus:border-transparent text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">SEO Description</label>
              <input type="text" value={form.seo_description} onChange={(e) => set('seo_description', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#025545] focus:border-transparent text-sm" />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
            <Link href="/admin/careers" className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">Cancel</Link>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-[#025545] text-white rounded-lg hover:bg-[#012f23] disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
