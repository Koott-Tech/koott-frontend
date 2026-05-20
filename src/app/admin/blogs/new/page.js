'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, PanelLeft, PanelLeftClose } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminSidebar } from '@/contexts/AdminSidebarContext';
import { useNotification } from '@/contexts/NotificationContext';
import BlogEditorWix from '@/components/BlogEditorWix';
import { getStoredToken } from '@/lib/authStorage';

const initialBlogState = (userName = '') => ({
  title: '',
  excerpt: '',
  content: '',
  structured_content: [],
  content_images: [],
  featured_image_url: '',
  author_name: userName,
  status: 'draft',
  tags: [],
  categories: [],
  read_time_minutes: 5,
  slug: '',
  seo_title: '',
  seo_description: '',
  focus_keyword: '',
  meta_keywords: [],
  canonical_url: ''
});

export default function NewBlogPage() {
  const { user, isAuthenticated, hasRole, isLoading: authLoading } = useAuth();
  const { showError, showSuccess } = useNotification();
  const { setSidebarOpen } = useAdminSidebar() || {};
  const router = useRouter();
  const [blog, setBlog] = useState(() => initialBlogState(user?.name || ''));
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showEditorSidebar, setShowEditorSidebar] = useState(false);
  const blogEditorRef = useRef(null);

  // Hide admin sidebar when editor opens
  useEffect(() => {
    if (setSidebarOpen) {
      setSidebarOpen(false);
    }
  }, [setSidebarOpen]);

  if (!authLoading && (!isAuthenticated() || (!hasRole('admin') && !hasRole('superadmin')))) {
    router.push('/');
    return null;
  }

  const uploadFeaturedImage = async (file) => {
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      showError('Please select a valid image file (JPEG, PNG, WebP, or GIF)');
      return { success: false };
    }
    if (file.size > 5 * 1024 * 1024) {
      showError('File size must be less than 5MB');
      return { success: false };
    }
    setUploadingImage(true);
    try {
      const token = getStoredToken();
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api';
      const formData = new FormData();
      formData.append('image', file);
      formData.append('blogTitle', blog.title || 'untitled');
      const response = await fetch(`${baseUrl}/blogs/admin/upload-image`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const result = await response.json();
      if (result.success) {
        setBlog(prev => ({ ...prev, featured_image_url: result.data.imageUrl }));
        setImagePreview(result.data.imageUrl);
        showSuccess('Image uploaded successfully');
        return result;
      }
      showError(result.message || 'Failed to upload image');
      return { success: false };
    } catch (error) {
      showError('Failed to upload image');
      return { success: false };
    } finally {
      setUploadingImage(false);
    }
  };

  const handleContentImageUpload = async (formData) => {
    const token = getStoredToken();
    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api';
    formData.append('blogTitle', blog.title || 'untitled');
    const response = await fetch(`${baseUrl}/blogs/admin/upload-multiple-images`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    const result = await response.json();
    if (result.success) {
      showSuccess('Image uploaded successfully');
      return result;
    }
    showError(result.message || 'Failed to upload image');
    return { success: false, error: result.message };
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!blog.title?.trim()) {
      showError('Please enter a title');
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      let editorContent = blogEditorRef.current?.getContent?.() ?? blog.content;
      const payload = { ...blog };
      if (editorContent != null) payload.content = editorContent;

      const token = getStoredToken();
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api';
      const response = await fetch(`${baseUrl}/blogs/admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.success) {
        showError(result?.message || 'Failed to create blog');
        return;
      }
      showSuccess('Blog created successfully');
      router.push('/admin/blogs');
    } catch (err) {
      showError(err?.message || 'Failed to save blog');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#025545] border-t-transparent" />
          <p className="text-sm text-gray-500">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#fafbfc]">
      {/* Editor: single chrome (nav + formatting toolbar) via BlogEditorWix */}
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <BlogEditorWix
          ref={blogEditorRef}
          blog={blog}
          onChange={setBlog}
          onFeaturedImageUpload={uploadFeaturedImage}
          onContentImageUpload={handleContentImageUpload}
          uploadProgress={uploadingImage}
          defaultAuthorName={user?.name}
          featuredImagePreview={imagePreview}
          showSidebar={showEditorSidebar}
          headerLeft={
            <>
              <Link
                href="/admin/blogs"
                className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to blogs"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div className="h-5 w-px bg-gray-200" />
              <button
                type="button"
                onClick={() => setShowEditorSidebar(!showEditorSidebar)}
                className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title={showEditorSidebar ? 'Hide sidebar' : 'Show sidebar'}
              >
                {showEditorSidebar ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
              </button>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                New Post
              </span>
            </>
          }
          headerRight={
            <>
              <Link
                href="/admin/blogs"
                className="hidden sm:flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </Link>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-[#025545] text-white text-sm font-medium rounded-lg hover:bg-[#012f23] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Creating...' : 'Create'}</span>
              </button>
            </>
          }
        />
      </main>
    </div>
  );
}
