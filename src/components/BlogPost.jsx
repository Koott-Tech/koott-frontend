"use client";

import { normalizeImageUrl } from '@/utils/urlNormalizer';
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import backendApi from "@/lib/backendApi";
import BlogMetaTags from "./BlogMetaTags";
import {
  BLOG_CARD_TITLE_CLASS,
  BLOG_CARD_TITLE_STYLE,
  BLOG_LETTER_SPACING_CLASS,
  BLOG_SECTION_HEADING_CLASS,
  BLOG_SECTION_HEADING_STYLE,
  BLOG_BODY_IMAGE_MAX_WIDTH,
  BLOG_TYPOGRAPHY_ROOT_CLASS,
  BLOG_TYPOGRAPHY_ROOT_CSS,
  HERO_BODY_TEXT_CLASS,
  HERO_BODY_TEXT_STYLE,
  HERO_DISPLAY_HEADING_CLASS,
  HERO_DISPLAY_HEADING_STYLE,
} from '@/constants/heroTypography';
import { getBlogPostPageTypographyCss } from '@/constants/blogContentTypographyCss';

// Extract text content from block - handles string, object { text/content }, or array of nodes
const getBlockContent = (block) => {
  const raw = block?.content;
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw.text ?? raw.content ?? '';
  }
  if (Array.isArray(raw)) {
    return raw.map((n) => (typeof n === 'string' ? n : n?.text ?? n?.content ?? '')).join('');
  }
  return block?.title ?? '';
};

// Structured Content Renderer Component
const StructuredContentRenderer = ({ content }) => {
  if (!Array.isArray(content)) {
    return <div>Invalid content format</div>;
  }

  return (
    <div className={`prose prose-lg max-w-none space-y-12 ${BLOG_LETTER_SPACING_CLASS} [&_p]:leading-[24px] [&_li]:leading-[20px] [&_blockquote]:leading-[24px] [&_h1]:leading-[60px] [&_h2]:leading-tight [&_h3]:leading-tight [&_h4]:leading-tight`}>
      {content.map((block, index) => {
        switch (block.type) {
                 case 'paragraph':
                   return (
                     <p key={index} className={`leading-[24px] ${BLOG_LETTER_SPACING_CLASS}`}>
                       {(() => {
                         const normalizeUrl = (url) => {
                           if (!url || !url.trim()) return url;
                           
                           const trimmedUrl = url.trim();
                           
                           // If it already has a protocol, return as is
                           if (trimmedUrl.match(/^https?:\/\//i)) {
                             return trimmedUrl;
                           }
                           
                           // If it starts with //, add https:
                           if (trimmedUrl.startsWith('//')) {
                             return `https:${trimmedUrl}`;
                           }
                           
                           // If it's a relative path, return as is
                           if (trimmedUrl.startsWith('/') || trimmedUrl.startsWith('./') || trimmedUrl.startsWith('../')) {
                             return trimmedUrl;
                           }
                           
                           // If it looks like a domain (contains a dot and no spaces), add https://
                           if (trimmedUrl.includes('.') && !trimmedUrl.includes(' ')) {
                             return `https://${trimmedUrl}`;
                           }
                           
                           // Otherwise, return as is
                           return trimmedUrl;
                         };

                         const parseInlineLinks = (rawText) => {
                           const text = rawText != null ? String(rawText) : '';
                           if (!text) return [{ type: 'text', content: '' }];
                           
                           const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
                           const parts = [];
                           let lastIndex = 0;
                           let match;
                           
                           while ((match = linkRegex.exec(text)) !== null) {
                             if (match.index > lastIndex) {
                               parts.push({
                                 type: 'text',
                                 content: text.slice(lastIndex, match.index)
                               });
                             }
                             
                             // Normalize the URL to ensure it has a protocol
                             const normalizedUrl = normalizeUrl(match[2]);
                             
                             parts.push({
                               type: 'link',
                               text: match[1],
                               url: normalizedUrl
                             });
                             
                             lastIndex = match.index + match[0].length;
                           }
                           
                           if (lastIndex < text.length) {
                             parts.push({
                               type: 'text',
                               content: text.slice(lastIndex)
                             });
                           }
                           
                           return parts.length > 0 ? parts : [{ type: 'text', content: text ?? '' }];
                         };
                         
                         const parts = parseInlineLinks(getBlockContent(block));
                         return parts.map((part, partIndex) => {
                           if (part.type === 'link') {
                             return (
                               <a
                                 key={partIndex}
                                 href={part.url}
                                 target="_blank"
                                 rel="noopener noreferrer"
                                 className="underline font-medium"
                                 style={{ textDecoration: 'underline', color: '#025545' }}
                                 onMouseEnter={(e) => e.target.style.color = '#012f23'}
                                 onMouseLeave={(e) => e.target.style.color = '#025545'}
                               >
                                 {part.text}
                               </a>
                             );
                           }
                           return <span key={partIndex}>{part.content ?? ''}</span>;
                         });
                       })()}
                     </p>
                   );
          
          case 'heading':
            // Render heading based on the level (1-6)
            const HeadingTag = `h${Math.min(Math.max(block.level || 2, 1), 6)}`;
            const normalizeUrl = (url) => {
              if (!url || !url.trim()) return url;
              
              const trimmedUrl = url.trim();
              
              // If it already has a protocol, return as is
              if (trimmedUrl.match(/^https?:\/\//i)) {
                return trimmedUrl;
              }
              
              // If it starts with //, add https:
              if (trimmedUrl.startsWith('//')) {
                return `https:${trimmedUrl}`;
              }
              
              // If it's a relative path, return as is
              if (trimmedUrl.startsWith('/') || trimmedUrl.startsWith('./') || trimmedUrl.startsWith('../')) {
                return trimmedUrl;
              }
              
              // If it looks like a domain (contains a dot and no spaces), add https://
              if (trimmedUrl.includes('.') && !trimmedUrl.includes(' ')) {
                return `https://${trimmedUrl}`;
              }
              
              // Otherwise, return as is
              return trimmedUrl;
            };

            const parseInlineLinks = (text) => {
              if (!text) return [{ type: 'text', content: text }];
              
              const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
              const parts = [];
              let lastIndex = 0;
              let match;
              
              while ((match = linkRegex.exec(text)) !== null) {
                if (match.index > lastIndex) {
                  parts.push({
                    type: 'text',
                    content: text.slice(lastIndex, match.index)
                  });
                }
                
                // Normalize the URL to ensure it has a protocol
                const normalizedUrl = normalizeUrl(match[2]);
                
                parts.push({
                  type: 'link',
                  text: match[1],
                  url: normalizedUrl
                });
                
                lastIndex = match.index + match[0].length;
              }
              
              if (lastIndex < text.length) {
                parts.push({
                  type: 'text',
                  content: text.slice(lastIndex)
                });
              }
              
              return parts.length > 0 ? parts : [{ type: 'text', content: text ?? '' }];
            };
            const headingText = String(getBlockContent(block) ?? '');
            const headingParts = parseInlineLinks(headingText);
            const headingLeadClass = HeadingTag === 'h1' ? 'leading-[60px]' : 'leading-tight';
            return (
              <HeadingTag key={index} className={`mb-4 mt-8 font-semibold ${headingLeadClass} text-gray-900 ${BLOG_LETTER_SPACING_CLASS}`}>
                {headingParts.map((part, partIndex) => {
                  if (part.type === 'link') {
                    return (
                      <a
                        key={partIndex}
                        href={part.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-medium"
                        style={{ textDecoration: 'underline', color: '#025545' }}
                        onMouseEnter={(e) => e.target.style.color = '#012f23'}
                        onMouseLeave={(e) => e.target.style.color = '#025545'}
                      >
                        {part.text}
                      </a>
                    );
                  }
                  return <span key={partIndex}>{part.content ?? ''}</span>;
                })}
              </HeadingTag>
            );
          
          case 'image':
            return (
              <div key={index} className="flex justify-center">
                <img 
                  src={normalizeImageUrl(block.src || '')} 
                  alt={block.alt}
                  className="w-full max-w-[min(92%,560px)] max-h-96 object-cover rounded-lg shadow-md"
                  loading="lazy"
                />
                {block.caption && (
                  <p className={`text-sm text-gray-600 mt-3 text-center italic leading-[24px] ${BLOG_LETTER_SPACING_CLASS}`}>
                    {block.caption}
                  </p>
                )}
              </div>
            );
          
          case 'bulletList':
            return (
              <ul key={index} className="list-disc list-inside space-y-2 ml-4">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex} className={`leading-[20px] ${BLOG_LETTER_SPACING_CLASS}`}>
                    {item}
                  </li>
                ))}
              </ul>
            );
          
          case 'numberedList':
            return (
              <ol key={index} className="list-decimal list-inside space-y-2 ml-4">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex} className={`leading-[20px] ${BLOG_LETTER_SPACING_CLASS}`}>
                    {item}
                  </li>
                ))}
              </ol>
            );
          
          case 'spacer':
            return (
              <div key={index} className="h-6"></div>
            );
          
          case 'quote':
            return (
              <blockquote key={index} className={`border-l-4 border-indigo-500 pl-6 my-8 italic leading-[24px] text-gray-700 bg-gray-50 py-4 rounded-r-lg ${BLOG_LETTER_SPACING_CLASS}`}>
                <p className={`mb-2 leading-[24px] ${BLOG_LETTER_SPACING_CLASS}`}>"{block.content}"</p>
                {block.author && (
                  <cite className={`text-sm text-gray-500 not-italic leading-[20px] ${BLOG_LETTER_SPACING_CLASS}`}>
                    — {block.author}
                  </cite>
                )}
              </blockquote>
            );
          
          default:
            return (
              <div key={index} className="mb-4">
                {block.content}
              </div>
            );
        }
      })}
    </div>
  );
};

// Latest Blogs Suggestion Component
const LatestBlogsSection = ({ blogs, currentSlug }) => {
  if (!blogs || blogs.length === 0) {
    return null;
  }

  return (
    <section className="mt-16 pt-8 border-t border-gray-200" aria-label="You might also like">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media (max-width: 767px) {
              .related-blog-card {
                border-radius: 14px !important;
                overflow: hidden !important;
              }
              .related-blog-image-card {
                border-radius: 14px !important;
                overflow: hidden !important;
              }
              .related-blog-meta,
              .related-blog-title {
                text-align: center !important;
              }
              .related-blog-title {
                max-width: 92% !important;
                margin-left: auto !important;
                margin-right: auto !important;
              }
            }
          `,
        }}
      />
      <div className="related-posts text-left">
        <div role="heading" aria-level={2} className={BLOG_SECTION_HEADING_CLASS} style={BLOG_SECTION_HEADING_STYLE}>
          You might also like
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogs.map((blog) => (
            <Link 
              key={blog.id} 
              href={`/blog/${blog.slug}`}
              className="group block w-full max-w-[340px] mx-auto md:mx-0"
            >
              <article className="related-blog-card w-full cursor-pointer text-center md:text-left rounded-xl md:rounded-none overflow-hidden md:overflow-visible">
                {/* Image Container */}
                {blog.featured_image_url && (
                  <div className="related-blog-image-card relative w-full h-[140px] sm:h-[150px] md:h-[160px] lg:aspect-[16/9] overflow-hidden rounded-xl md:rounded-2xl">
                    <Image
                      src={normalizeImageUrl(blog.featured_image_url || '')}
                      alt={blog.title}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 280px, 100vw"
                      className="object-contain object-center"
                      priority={false}
                    />
                  </div>
                )}
                
                {/* Meta Info */}
                <div className={`related-blog-meta mt-4 md:mt-6 lg:mt-4 px-2 md:px-0 text-gray-600 text-xs md:text-sm text-center md:text-left leading-[20px] ${BLOG_LETTER_SPACING_CLASS}`}>
                  <span>{blog.author_name || "Koott Team"}</span>
                  <span className="px-1 md:px-2">•</span>
                  <span>{formatDate(blog.published_at || blog.created_at)}</span>
                </div>
                
                {/* Title */}
                <div
                  role="heading"
                  aria-level={3}
                  className={`related-blog-title ${BLOG_CARD_TITLE_CLASS} md:mt-3 lg:mt-2 text-center md:text-left px-2 md:px-0 max-w-[92%] md:max-w-none mx-auto md:mx-0`}
                  style={BLOG_CARD_TITLE_STYLE}
                >
                  {blog.title}
                </div>
              </article>
            </Link>
          ))}
        </div>
        
        {/* View All Blogs Link */}
        <div className="mt-8 text-center">
          <Link 
            href="/blog" 
            className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors ${BLOG_LETTER_SPACING_CLASS}`}
          >
            View All Articles
            <svg className="ml-2 -mr-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export default function BlogPost({ slug }) {
  const router = useRouter();
  const blogContentRef = useRef(null);
  const hasResetScrollRef = useRef(false);
  const [blogPost, setBlogPost] = useState(null);
  const [latestBlogs, setLatestBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    loadBlogPost();
    loadLatestBlogs();
    hasResetScrollRef.current = false;
  }, [slug]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (loading || hasResetScrollRef.current) return;

    // Avoid browser scroll restoration placing the page near footer on refresh.
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    hasResetScrollRef.current = true;
  }, [loading]);

  // Frontend: remove drag UI and disable drag (drag only in CMS editor)
  useEffect(() => {
    if (!blogPost) return;
    const root = blogContentRef.current;
    if (!root) return;
    const stripDragUI = () => {
      root.querySelectorAll('.doc-editor-img-block, .document-editor-image-wrapper').forEach((el) => {
        el.setAttribute('draggable', 'false');
        // Force full-width rendering even for legacy content with inline image sizing.
        el.style.setProperty('display', 'block', 'important');
        el.style.setProperty('width', '100%', 'important');
        el.style.setProperty('max-width', BLOG_BODY_IMAGE_MAX_WIDTH, 'important');
        el.style.setProperty('margin-left', 'auto', 'important');
        el.style.setProperty('margin-right', 'auto', 'important');
        const imgEl = el.querySelector('img');
        if (imgEl) {
          imgEl.removeAttribute('width');
          imgEl.removeAttribute('height');
          imgEl.style.setProperty('display', 'block', 'important');
          imgEl.style.setProperty('width', '100%', 'important');
          imgEl.style.setProperty('min-width', '0', 'important');
          imgEl.style.setProperty('max-width', '100%', 'important');
          imgEl.style.setProperty('height', 'auto', 'important');
          imgEl.style.setProperty('max-height', 'none', 'important');
          imgEl.style.setProperty('object-fit', 'cover', 'important');
        }
        // Make whole image block clickable when editor saved a link.
        // Supports both <a href><img/></a> and fallback data-link-url persistence.
        const linkedAnchor = el.querySelector('a[href]');
        const linkUrl = linkedAnchor?.getAttribute('href') || el.getAttribute('data-link-url') || '';
        if (linkUrl) {
          el.style.setProperty('cursor', 'pointer', 'important');
          el.onclick = (evt) => {
            evt.preventDefault();
            evt.stopPropagation();
            window.open(linkUrl, '_blank', 'noopener,noreferrer');
          };
        } else {
          el.onclick = null;
        }
        el.querySelectorAll('.doc-editor-img-drag-handle, .doc-editor-img-overlay').forEach((c) => c.remove());
      });
    };
    const handleLinkedImageClick = (evt) => {
      const target = evt.target;
      if (!(target instanceof Element)) return;
      const img = target.closest('img');
      if (!img || !root.contains(img)) return;

      // Prefer explicit anchor href. Fallback to preserved wrapper/data attribute link.
      const hrefFromAnchor = img.closest('a[href]')?.getAttribute('href') || '';
      const hrefFromData =
        img.closest('[data-link-url]')?.getAttribute('data-link-url') ||
        img.getAttribute('data-link-url') ||
        '';
      const href = (hrefFromAnchor || hrefFromData || '').trim();
      if (!href) return;

      evt.preventDefault();
      evt.stopPropagation();
      window.location.assign(href);
    };
    const t = setTimeout(stripDragUI, 0);
    root.addEventListener('click', handleLinkedImageClick, true);
    return () => {
      clearTimeout(t);
      root.removeEventListener('click', handleLinkedImageClick, true);
    };
  }, [blogPost]);

  useEffect(() => {
    if (notFound) {
      router.replace('/blog');
    }
  }, [notFound, router]);

  const loadBlogPost = async () => {
    try {
      setLoading(true);
      const response = await backendApi.get(`/blogs/slug/${slug}`);
      
      if (response.success) {
        setBlogPost(response.data);
      } else {
        throw new Error(response.message || 'Failed to load blog post');
      }
    } catch (err) {
      if (err?.message && err.message.toLowerCase().includes('not found')) {
        setNotFound(true);
        setError('Article not found');
      } else {
        console.error('Error loading blog post:', err);
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadLatestBlogs = async () => {
    try {
      const response = await backendApi.get('/blogs?limit=3');
      
      if (response.success) {
        // Filter out the current blog post
        const filteredBlogs = response.data.blogs.filter(blog => blog.slug !== slug);
        setLatestBlogs(filteredBlogs.slice(0, 3)); // Take up to 3 latest blogs
      }
    } catch (err) {
      console.error('Error loading latest blogs:', err);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <article className={`min-h-screen bg-white ${BLOG_TYPOGRAPHY_ROOT_CLASS} ${BLOG_LETTER_SPACING_CLASS}`}>
        <style dangerouslySetInnerHTML={{ __html: BLOG_TYPOGRAPHY_ROOT_CSS }} />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </article>
    );
  }

  if (error || !blogPost) {
    return (
      <article className={`min-h-screen flex flex-col items-center justify-center px-4 ${BLOG_TYPOGRAPHY_ROOT_CLASS} ${BLOG_LETTER_SPACING_CLASS}`}>
        <style dangerouslySetInnerHTML={{ __html: BLOG_TYPOGRAPHY_ROOT_CSS }} />
        <div className="max-w-md text-center">
          <h1 className={`text-5xl font-bold leading-none mb-4 ${BLOG_LETTER_SPACING_CLASS}`} style={{ color: '#025545' }}>404</h1>
          <h2 className={`text-2xl font-semibold leading-none mb-3 ${BLOG_LETTER_SPACING_CLASS}`} style={{ color: '#025545' }}>
            Article not found
          </h2>
          <p className={`text-gray-600 leading-none mb-6 ${BLOG_LETTER_SPACING_CLASS}`}>
            {error ? `Error: ${error}` : "The article you're looking for doesn't exist or is no longer available."}
            </p>
          <Link
            href="/"
            className={`inline-flex items-center justify-center w-full py-3 px-4 text-base font-semibold leading-none text-white rounded-lg transition-colors duration-200 bg-[#025545] hover:bg-[#012f23] ${BLOG_LETTER_SPACING_CLASS}`}
          >
            Go back home
          </Link>
      </div>
      </article>
    );
  }

  return (
    <>
      <BlogMetaTags blog={blogPost} />
      <style dangerouslySetInnerHTML={{ __html: `
        ${BLOG_TYPOGRAPHY_ROOT_CSS}
        @media (max-width: 767px) {
          .blog-typography-root .blog-content,
          .blog-typography-root .blog-content-html,
          .blog-typography-root .blog-content .document-editor,
          .blog-typography-root .blog-content [data-block-content="true"] {
            text-align: left !important;
            text-align-last: left !important;
            word-spacing: normal !important;
          }
          .blog-typography-root .blog-post-title,
          .blog-typography-root .blog-content h1,
          .blog-typography-root .blog-content h2,
          .blog-typography-root .blog-content h3,
          .blog-typography-root .blog-content h4,
          .blog-typography-root .blog-content h5,
          .blog-typography-root .blog-content h6,
          .blog-typography-root .blog-content-html h1,
          .blog-typography-root .blog-content-html h2,
          .blog-typography-root .blog-content-html h3,
          .blog-typography-root .blog-content-html h4,
          .blog-typography-root .blog-content-html h5,
          .blog-typography-root .blog-content-html h6,
          .blog-typography-root [data-block-content="true"] h1,
          .blog-typography-root [data-block-content="true"] h2,
          .blog-typography-root [data-block-content="true"] h3,
          .blog-typography-root [data-block-content="true"] h4,
          .blog-typography-root [data-block-content="true"] h5,
          .blog-typography-root [data-block-content="true"] h6 {
            text-align: left !important;
            text-justify: auto !important;
            word-spacing: normal !important;
          }
          /* Restore comfortable mobile heading rhythm after left-align overrides */
          .blog-typography-root .blog-post-title {
            line-height: 1.1 !important;
          }
          .blog-typography-root .blog-content h2,
          .blog-typography-root .blog-content h3,
          .blog-typography-root .blog-content h4,
          .blog-typography-root .blog-content h5,
          .blog-typography-root .blog-content h6,
          .blog-typography-root .blog-content-html h2,
          .blog-typography-root .blog-content-html h3,
          .blog-typography-root .blog-content-html h4,
          .blog-typography-root .blog-content-html h5,
          .blog-typography-root .blog-content-html h6,
          .blog-typography-root [data-block-content="true"] h2,
          .blog-typography-root [data-block-content="true"] h3,
          .blog-typography-root [data-block-content="true"] h4,
          .blog-typography-root [data-block-content="true"] h5,
          .blog-typography-root [data-block-content="true"] h6 {
            line-height: 1.25 !important;
          }
          .blog-typography-root .hero-description {
            text-align: left !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            max-width: 100% !important;
          }
        }
      ` }} />
    <article className={`min-h-screen bg-white ${BLOG_TYPOGRAPHY_ROOT_CLASS} ${BLOG_LETTER_SPACING_CLASS}`}>
      <div className="max-w-6xl mx-auto px-6 sm:px-32 lg:px-40 xl:px-44 pt-24 pb-12">
        {/* Title & Metadata */}
        <header className="mb-8">
          <div className={`mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-[20px] text-gray-600 sm:gap-x-4 sm:text-sm ${BLOG_LETTER_SPACING_CLASS}`}>
            <span className="font-medium">{blogPost.author_name}</span>
            <span>•</span>
            <span>
              {formatDate(blogPost.published_at || blogPost.created_at)}
            </span>
            <span>•</span>
            <span>
              {blogPost.read_time_minutes || 5} min read
            </span>
            <span>•</span>
            <span>
              {blogPost.view_count || 0} views
            </span>
          </div>
          <div
            role="heading"
            aria-level={1}
            className={`blog-post-title text-gray-900 mb-4 ${HERO_DISPLAY_HEADING_CLASS}`}
            style={{ ...HERO_DISPLAY_HEADING_STYLE, textAlign: 'left', wordSpacing: 'normal' }}
          >
            {blogPost.title}
          </div>
          {blogPost.excerpt && (
            <p className={`font-medium text-gray-600 mb-4 text-left ${HERO_BODY_TEXT_CLASS}`} style={{ ...HERO_BODY_TEXT_STYLE, textAlign: 'left' }}>
              {blogPost.excerpt}
            </p>
          )}
          {/* Tags */}
          {blogPost.tags && blogPost.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {blogPost.tags.map((tag, index) => (
                <span
                  key={index}
                  className={`inline-flex items-center px-3 py-1 rounded-full p2 leading-[20px] bg-indigo-100 text-indigo-800 ${BLOG_LETTER_SPACING_CLASS}`}
                >
                  {tag}
                </span>
              ))}
          </div>
          )}
        </header>

        {/* Featured Image */}
        {blogPost.featured_image_url && (
          <div className="mb-8">
            <div className="flex justify-center">
              <div className="w-full max-w-[960px] rounded-2xl overflow-hidden">
                <img
                  src={normalizeImageUrl(blogPost.featured_image_url || '')}
                  alt={blogPost.title}
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        )}

        {/* Blog body: content first, then "You might also like" below (no overlap) */}
        <div className="blog-post-body w-full">
        <div ref={blogContentRef} className="blog-content w-full">
          <style dangerouslySetInnerHTML={{ __html: getBlogPostPageTypographyCss(BLOG_BODY_IMAGE_MAX_WIDTH) }} />
          {(() => {
            // Prefer HTML content when it has block structure (from BlogEditorWix/CMS) so headings display correctly
            const hasHtmlBlocks = blogPost.content && /<(p|div|br|h[1-6]|ul|ol|li|blockquote)\b/i.test(blogPost.content);
            const useStructured = !hasHtmlBlocks && blogPost.structured_content && blogPost.structured_content.length > 0;
            const raw = blogPost.content || '';
            const htmlContent = !raw.trim() ? '' : !/<(p|div|br|h[1-6]|ul|ol|li|blockquote)\b/i.test(raw) && /\n/.test(raw) ? raw.replace(/\n/g, '<br>') : raw;

            if (useStructured) {
              return <StructuredContentRenderer content={blogPost.structured_content} />;
            }
            return (
              <div
                className="blog-content-html document-editor"
                data-block-content="true"
                style={{ display: 'block', maxWidth: 'none', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '24px', letterSpacing: '-0.7px' }}
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            );
          })()}
        </div>

        {/* You might also like – always after the blog content */}
        <LatestBlogsSection blogs={latestBlogs.slice(0, 2)} currentSlug={slug} />
        </div>
      </div>
    </article>
    </>
  );
}
