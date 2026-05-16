'use client';

/**
 * Dev-only page to test blog editor block type change without admin auth.
 * Access at /dev/blog-editor-test
 */
import { useState, useRef } from 'react';
import BlogEditorWix from '@/components/BlogEditorWix';

export default function DevBlogEditorTestPage() {
  const [blog, setBlog] = useState({
    title: 'Test',
    excerpt: 'Description here',
    content: '<p>para 1</p><p>para 2</p>',
    structured_content: [],
    content_images: [],
    featured_image_url: '',
    author_name: 'Test',
    status: 'draft',
    tags: [],
    read_time_minutes: 5,
    slug: '',
  });
  const blogEditorRef = useRef(null);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-xl font-bold mb-4">Blog Editor Block Type Test (Dev)</h1>
      <p className="text-sm text-gray-600 mb-4">
        Select &quot;para 1&quot;, open the block type dropdown (Paragraph), choose Heading 1. Para 1 should become a heading.
      </p>
      <div className="bg-white rounded-lg shadow p-6 max-w-4xl">
        <BlogEditorWix
          ref={blogEditorRef}
          blog={blog}
          onChange={setBlog}
          onFeaturedImageUpload={async () => ({ success: false })}
          onContentImageUpload={async () => ({ success: false })}
          uploadProgress={false}
          defaultAuthorName="Test"
          featuredImagePreview={null}
          adminSidebarCollapsed={false}
        />
      </div>
    </div>
  );
}
