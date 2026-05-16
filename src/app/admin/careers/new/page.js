'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { careersApi } from '@/lib/backendApi';

const EMPTY = {
  title: '',
  slug: '',
  short_description: '',
  description: '',
  responsibilities: '',
  requirements: '',
  benefits: '',
  location: '',
  employment_type: 'Full-time',
  department: '',
  experience_level: '',
  min_experience_years: '',
  max_experience_years: '',
  application_email: '',
  application_url: '',
  is_remote: false,
  is_featured: false,
  status: 'draft',
  seo_title: '',
  seo_description: '',
};

export default function NewCareerPage() {
  const { isAuthenticated, hasRole, isLoading: authLoading } = useAuth();
  const { showError, showSuccess } = useNotification();
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  if (!authLoading && (!isAuthenticated() || (!hasRole('admin') && !hasRole('superadmin')))) {
    router.push('/');
    return null;
  }

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const getPoints = (field) => {
    const raw = (form[field] || '').split('\n');
    // Always keep at least one input
    return raw.length ? raw : [''];
  };

  const handlePointChange = (field, index, value) => {
    const items = getPoints(field);
    items[index] = value;
    // Trim extra empty items except one at end
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
      if (payload.min_experience_years) payload.min_experience_years = Number(payload.min_experience_years);
      if (payload.max_experience_years) payload.max_experience_years = Number(payload.max_experience_years);
      const resp = await careersApi.createCareer(payload);
      if (resp?.success) {
        showSuccess('Job created successfully');
        router.push('/admin/careers');
      } else {
        showError(resp?.message || 'Failed to create job');
      }
    } catch (err) {
      showError(err?.message || 'Failed to create job');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3f2e73]" />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin/careers" className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h6>Create New Job</h6>
            <p className="text-sm text-gray-500">Add a new career opening</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow border border-gray-200 p-6 space-y-6">
          {/* Title & Slug */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Title *</label>
              <input type="text" value={form.title} onChange={(e) => set('title', e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3f2e73] focus:border-transparent text-sm" placeholder="e.g. Child Psychologist" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Slug (optional)</label>
              <input type="text" value={form.slug} onChange={(e) => set('slug', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3f2e73] focus:border-transparent text-sm" placeholder="auto-generated from title" />
            </div>
          </div>

          {/* Short description */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Short Description</label>
            <input type="text" value={form.short_description} onChange={(e) => set('short_description', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3f2e73] focus:border-transparent text-sm" placeholder="One-liner shown on the careers listing page" />
          </div>

          {/* Full description */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Description *</label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={6} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3f2e73] focus:border-transparent text-sm" placeholder="Detailed job description..." />
          </div>

          {/* Responsibilities, Requirements, Benefits (as points) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Responsibilities</label>
              <p className="text-[11px] text-gray-500 mb-2">Add each responsibility as a separate point.</p>
              <div className="space-y-2">
                {getPoints('responsibilities').map((value, idx) => (
                  <input
                    key={idx}
                    type="text"
                    value={value}
                    onChange={(e) => handlePointChange('responsibilities', idx, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3f2e73] focus:border-transparent text-xs"
                    placeholder={`Responsibility ${idx + 1}`}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => addPoint('responsibilities')}
                  className="text-[11px] text-[#3f2e73] hover:underline"
                >
                  + Add responsibility
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Requirements</label>
              <p className="text-[11px] text-gray-500 mb-2">Add each requirement as a separate point.</p>
              <div className="space-y-2">
                {getPoints('requirements').map((value, idx) => (
                  <input
                    key={idx}
                    type="text"
                    value={value}
                    onChange={(e) => handlePointChange('requirements', idx, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3f2e73] focus:border-transparent text-xs"
                    placeholder={`Requirement ${idx + 1}`}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => addPoint('requirements')}
                  className="text-[11px] text-[#3f2e73] hover:underline"
                >
                  + Add requirement
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Benefits</label>
              <p className="text-[11px] text-gray-500 mb-2">Add each benefit as a separate point.</p>
              <div className="space-y-2">
                {getPoints('benefits').map((value, idx) => (
                  <input
                    key={idx}
                    type="text"
                    value={value}
                    onChange={(e) => handlePointChange('benefits', idx, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3f2e73] focus:border-transparent text-xs"
                    placeholder={`Benefit ${idx + 1}`}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => addPoint('benefits')}
                  className="text-[11px] text-[#3f2e73] hover:underline"
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
              <input type="text" value={form.location} onChange={(e) => set('location', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3f2e73] focus:border-transparent text-sm" placeholder="e.g. Bangalore / Remote" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Employment Type</label>
              <select value={form.employment_type} onChange={(e) => set('employment_type', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3f2e73] focus:border-transparent text-sm">
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
                <option value="Freelance">Freelance</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Department</label>
              <input type="text" value={form.department} onChange={(e) => set('department', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3f2e73] focus:border-transparent text-sm" placeholder="e.g. Psychology" />
            </div>
          </div>

          {/* Experience */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Experience Level</label>
              <select value={form.experience_level} onChange={(e) => set('experience_level', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3f2e73] focus:border-transparent text-sm">
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
              <input type="number" value={form.min_experience_years} onChange={(e) => set('min_experience_years', e.target.value)} min="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3f2e73] focus:border-transparent text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Max Experience (years)</label>
              <input type="number" value={form.max_experience_years} onChange={(e) => set('max_experience_years', e.target.value)} min="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3f2e73] focus:border-transparent text-sm" />
            </div>
          </div>

          {/* Application info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Application Email</label>
              <input type="email" value={form.application_email} onChange={(e) => set('application_email', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3f2e73] focus:border-transparent text-sm" placeholder="hey@koott.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Application URL (optional)</label>
              <input type="url" value={form.application_url} onChange={(e) => set('application_url', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3f2e73] focus:border-transparent text-sm" placeholder="https://forms.google.com/..." />
            </div>
          </div>

          {/* Toggles + Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.is_remote} onChange={(e) => set('is_remote', e.target.checked)} className="rounded border-gray-300 text-[#3f2e73] focus:ring-[#3f2e73]" />
                Remote
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.is_featured} onChange={(e) => set('is_featured', e.target.checked)} className="rounded border-gray-300 text-[#3f2e73] focus:ring-[#3f2e73]" />
                Featured
              </label>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status *</label>
              <select value={form.status} onChange={(e) => set('status', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3f2e73] focus:border-transparent text-sm">
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
              <input type="text" value={form.seo_title} onChange={(e) => set('seo_title', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3f2e73] focus:border-transparent text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">SEO Description</label>
              <input type="text" value={form.seo_description} onChange={(e) => set('seo_description', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3f2e73] focus:border-transparent text-sm" />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
            <Link href="/admin/careers" className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">Cancel</Link>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-[#3f2e73] text-white rounded-lg hover:bg-[#1d1733] disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? 'Creating...' : 'Create Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
