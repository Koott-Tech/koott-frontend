"use client";

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { getStoredToken } from '@/lib/authStorage';
import { normalizeImageUrl } from '@/utils/urlNormalizer';

export default function ImageUpload({ 
  currentImageUrl, 
  onImageUpload, 
  imageType, 
  slug,
  label = "Upload Image"
}) {
  const [uploading, setUploading] = useState(false);
  // Normalize the initial preview URL to convert Supabase URLs to proxy URLs
  const [previewUrl, setPreviewUrl] = useState(currentImageUrl ? normalizeImageUrl(currentImageUrl) : '');
  const fileInputRef = useRef(null);

  // Update preview URL when currentImageUrl changes
  useEffect(() => {
    if (currentImageUrl) {
      setPreviewUrl(normalizeImageUrl(currentImageUrl));
    } else {
      setPreviewUrl('');
    }
  }, [currentImageUrl]);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File too large. Maximum size is 5MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload file
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('slug', slug);
      formData.append('imageType', imageType);

      // Try both possible token keys
      const token = getStoredToken();
      
      if (!token || token === 'null' || token === 'undefined') {
        throw new Error('Not authenticated. Please log in again.');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/counselling/admin/upload-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      const data = await response.json();
      if (data.success && data.data?.url) {
        // Normalize the URL from the server response
        const normalizedUrl = normalizeImageUrl(data.data.url);
        setPreviewUrl(normalizedUrl);
        onImageUpload(data.data.url); // Keep original URL for saving to database
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Upload failed: ${error.message}`);
      setPreviewUrl(currentImageUrl ? normalizeImageUrl(currentImageUrl) : '');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl('');
    onImageUpload('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs md:text-sm font-medium text-gray-700">
        {label}
      </label>
      
      {previewUrl ? (
        <div className="relative">
          <div className="relative w-full h-48 border border-gray-300 rounded-lg overflow-hidden bg-gray-50">
            <Image
              src={normalizeImageUrl(previewUrl)}
              alt="Preview"
              fill
              className="object-contain"
            />
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex-1 px-3 py-2 text-xs md:text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Change Image'}
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading}
              className="px-3 py-2 text-xs md:text-sm bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Uploading...</p>
              </div>
            ) : (
              <div className="text-center">
                <svg className="mx-auto h-10 w-10 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-xs md:text-sm text-gray-600">Click to upload image</p>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG, WebP, GIF up to 5MB</p>
              </div>
            )}
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Show current URL if available */}
      {currentImageUrl && (
        <div className="mt-2">
          <p className="text-xs text-gray-500 truncate" title={currentImageUrl}>
            Current URL: {currentImageUrl}
          </p>
        </div>
      )}
    </div>
  );
}

