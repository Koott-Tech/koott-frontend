"use client";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { normalizeImageUrl } from '@/utils/urlNormalizer';
import {
  BLOG_UI_LINE_HEIGHT_CLASS,
  BLOG_LETTER_SPACING_CLASS,
  BLOG_CARD_TITLE_CLASS,
  BLOG_CARD_TITLE_STYLE,
  BLOG_FEATURED_TITLE_CLASS,
  BLOG_FEATURED_TITLE_STYLE,
  BLOG_TYPOGRAPHY_ROOT_CLASS,
  BLOG_TYPOGRAPHY_ROOT_CSS,
  HERO_BODY_TEXT_CLASS,
  HERO_BODY_TEXT_STYLE,
  HERO_DISPLAY_HEADING_CLASS,
  HERO_DISPLAY_HEADING_STYLE,
} from '@/constants/heroTypography';

export default function Blog() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);

  useEffect(() => {
    loadBlogs();
  }, []);

  const loadBlogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api';
      
      const response = await fetch(`${baseUrl}/blogs?status=published&limit=100`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setBlogs(result.data.blogs || []);
        } else {
          // Set empty blogs array instead of throwing error
          setBlogs([]);
        }
      } else if (response.status === 404) {
        // No blogs found - this is normal
        setBlogs([]);
      } else {
        throw new Error('Failed to load blogs');
      }
    } catch (err) {
      console.error('Error loading blogs:', err);
      setBlogs([]); // Set empty array instead of showing error
      setError('Failed to load blogs');
    } finally {
      setLoading(false);
    }
  };

  // Get unique categories from blog tags and categories
  const allCategories = [...new Set(
    (blogs || []).flatMap(blog => [...(blog.categories || []), ...(blog.tags || [])])
  )].filter(Boolean).sort();
  
  const displayCategories = ["All", ...allCategories];
  const visibleCategories = showAllCategories ? displayCategories : displayCategories.slice(0, 7);
  
  // Sort blogs by creation date, get the latest as featured
  const sortedBlogs = [...(blogs || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const featuredPosts = sortedBlogs.slice(0, Math.min(4, sortedBlogs.length)); // Get top 4 for carousel (or less if fewer blogs)
  const featuredPost = featuredPosts[featuredIndex] || sortedBlogs[0];
  
  // Auto-rotate featured posts with fade animation - 8 seconds per slide
  useEffect(() => {
    if (featuredPosts.length <= 1) return;
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setFeaturedIndex((prev) => (prev + 1) % featuredPosts.length);
      }, 600);
      setTimeout(() => {
        setIsAnimating(false);
      }, 650);
    }, 8000);
    return () => clearInterval(interval);
  }, [featuredPosts.length]);

  const goToSlide = useCallback((index) => {
    if (index === featuredIndex) return;
    setIsAnimating(true);
    setTimeout(() => {
      setFeaturedIndex(index);
    }, 600);
    setTimeout(() => {
      setIsAnimating(false);
    }, 650);
  }, [featuredIndex]);

  // Filter posts based on selected category and search query - skip only the currently featured post
  const filteredPosts = sortedBlogs.slice(1).filter(post => {
    const matchesCategory = selectedCategory === "All" || 
      (post.tags && post.tags.some(tag => tag === selectedCategory)) ||
      (post.categories && post.categories.some(cat => cat === selectedCategory));
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (post.author_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (post.excerpt || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (post.tags && post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))) ||
                         (post.categories && post.categories.some(cat => cat.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesCategory && matchesSearch;
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  /* globals.css uses !important on h1–h6 font sizes; use a div + role so Tailwind / inline size is not overridden (avoids loading → loaded title flash). */
  const pageTitle = (
    <div
      role="heading"
      aria-level={1}
      className={`text-gray-900 mb-4 ${HERO_DISPLAY_HEADING_CLASS}`}
      style={HERO_DISPLAY_HEADING_STYLE}
    >
      The MyKoott Blog
    </div>
  );

  if (loading) {
    return (
      <section className={`min-h-screen w-full bg-white ${BLOG_TYPOGRAPHY_ROOT_CLASS} ${BLOG_LETTER_SPACING_CLASS}`}>
        <style dangerouslySetInnerHTML={{ __html: BLOG_TYPOGRAPHY_ROOT_CSS }} />
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 pt-28 pb-12 md:pt-32 md:pb-16">
          <div className="text-left mb-16 sm:mb-20">
            {pageTitle}
            <p className={`text-gray-600 max-w-xl ${HERO_BODY_TEXT_CLASS}`} style={HERO_BODY_TEXT_STYLE}>
              A trusted resource for parents and families, offering expert insights and guidance on child mental health.
            </p>
          </div>
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#025545]"></div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={`min-h-screen w-full bg-white ${BLOG_TYPOGRAPHY_ROOT_CLASS} ${BLOG_LETTER_SPACING_CLASS}`}>
        <style dangerouslySetInnerHTML={{ __html: BLOG_TYPOGRAPHY_ROOT_CSS }} />
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 pt-28 pb-12 md:pt-32 md:pb-16">
          <div className="text-left mb-16 sm:mb-20">
            {pageTitle}
            <p className={`text-gray-600 max-w-xl ${HERO_BODY_TEXT_CLASS}`} style={HERO_BODY_TEXT_STYLE}>
              A trusted resource for parents and families, offering expert insights and guidance on child mental health.
            </p>
          </div>
          <div className="text-center py-16">
            <p className="text-red-600 mb-4">Failed to load blogs: {error}</p>
            <button 
              onClick={loadBlogs}
              className="px-4 py-2 bg-[#025545] text-white rounded-lg hover:bg-[#012f23]"
            >
              Try Again
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`min-h-screen w-full bg-white ${BLOG_TYPOGRAPHY_ROOT_CLASS} ${BLOG_LETTER_SPACING_CLASS}`}>
      <style dangerouslySetInnerHTML={{ __html: `
        ${BLOG_TYPOGRAPHY_ROOT_CSS}
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @media (max-width: 767px) {
          /* Override global mobile hero centering for blog page */
          .blog-typography-root .hero-description {
            text-align: left !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            max-width: 100% !important;
          }
        }
      `}} />
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 pt-28 pb-12 md:pt-32 md:pb-16">
        {/* Header Section */}
        <div className="text-left mb-16 sm:mb-20">
          {pageTitle}
          <p className={`text-gray-600 max-w-xl text-left ${HERO_BODY_TEXT_CLASS}`} style={{ ...HERO_BODY_TEXT_STYLE, textAlign: 'left' }}>
            A trusted resource for parents and families, offering expert insights and guidance on child mental health.
          </p>
        </div>

        {/* Featured Blog Post - Rula Style */}
        {featuredPost && (
          <div className="mb-24 relative">
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-center">
              {/* Left: Image - landscape wider 60% - Only fade animation */}
              <Link 
                href={`/blog/${featuredPost.slug}`} 
                className={`block group w-full lg:w-[60%] lg:flex-shrink-0 transition-opacity duration-700 ease-in-out ${
                  isAnimating ? 'opacity-0' : 'opacity-100'
                }`}
                key={`img-${featuredIndex}`}
              >
                <div className="relative aspect-[16/8] rounded-xl overflow-hidden">
                  <Image
                    src={normalizeImageUrl(featuredPost.featured_image_url || "/kids.png")}
                    alt={featuredPost.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    priority
                  />
                </div>
              </Link>

              {/* Right: Content - Fade animation (same as image) */}
              <div 
                className={`flex flex-col justify-center w-full lg:w-auto lg:flex-1 lg:pl-4 transition-opacity duration-700 ease-in-out ${
                  isAnimating ? 'opacity-0' : 'opacity-100'
                }`}
                key={`content-${featuredIndex}`}
              >
                {/* Category Tags */}
                {featuredPost.tags && featuredPost.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {featuredPost.tags.slice(0, 2).map((tag, idx) => (
                      <span
                        key={idx}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${BLOG_UI_LINE_HEIGHT_CLASS} bg-gray-100 text-gray-700 border border-gray-200`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Title */}
                <Link href={`/blog/${featuredPost.slug}`}>
                  <div 
                    role="heading"
                    aria-level={2}
                    className={`text-gray-900 hover:text-[#025545] transition-colors cursor-pointer ${BLOG_FEATURED_TITLE_CLASS}`}
                    style={BLOG_FEATURED_TITLE_STYLE}
                  >
                    {featuredPost.title}
                  </div>
                </Link>

                {/* Excerpt */}
                <p 
                  className={`mt-4 text-gray-600 line-clamp-2 text-left ${HERO_BODY_TEXT_CLASS}`}
                  style={{ ...HERO_BODY_TEXT_STYLE, textAlign: 'left' }}
                >
                  {featuredPost.excerpt || "A therapist can help you process and understand this topic better."}
                </p>

                {/* Read More Link */}
                <Link
                  href={`/blog/${featuredPost.slug}`}
                  className={`mt-6 inline-flex items-center gap-2 text-gray-900 font-medium ${BLOG_UI_LINE_HEIGHT_CLASS} hover:text-[#025545] transition-colors group/link`}
                >
                  <span className="border-b border-gray-900 group-hover/link:border-[#025545]">Read more</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover/link:translate-x-1" />
                </Link>
              </div>
            </div>

            {/* Pagination Dots with Progress */}
            {featuredPosts.length > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <style dangerouslySetInnerHTML={{ __html: `
                  @keyframes progressFill {
                    from { width: 0%; }
                    to { width: 100%; }
                  }
                `}} />
                {featuredPosts.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => goToSlide(idx)}
                    className="relative"
                    aria-label={`Go to slide ${idx + 1}`}
                  >
                    {idx === featuredIndex ? (
                      <div className="relative w-8 h-2.5 bg-gray-300 rounded-full overflow-hidden">
                        <div 
                          key={`progress-${featuredIndex}`}
                          className="absolute top-0 left-0 h-full bg-[#025545] rounded-full"
                          style={{
                            width: '0%',
                            animation: 'progressFill 8s linear forwards'
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-2.5 h-2.5 bg-gray-300 rounded-full hover:bg-gray-400 transition-colors" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search articles, authors, or topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full px-4 py-3 pl-10 pr-4 text-gray-700 ${BLOG_UI_LINE_HEIGHT_CLASS} bg-white border border-gray-300 rounded-full focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200`}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Category Filters - Full width on mobile */}
        <div className="mb-24 -mx-4 sm:-mx-6 lg:-mx-8">
          <div className="flex md:flex-wrap md:justify-center gap-3 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 pl-4 md:px-6 lg:px-8 scrollbar-hide">
            {visibleCategories.map((category, idx) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium ${BLOG_UI_LINE_HEIGHT_CLASS} whitespace-nowrap flex-shrink-0 transition-all duration-200 ${
                  idx === visibleCategories.length - 1 && displayCategories.length <= 7 ? 'mr-4 md:mr-0' : ''
                }`}
                style={{
                  backgroundColor: selectedCategory === category ? '#025545' : '#f3f4f6',
                  color: selectedCategory === category ? 'white' : '#374151',
                  boxShadow: selectedCategory === category ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
                }}
              >
                {category}
              </button>
            ))}
            {displayCategories.length > 7 && (
              <button
                onClick={() => setShowAllCategories(!showAllCategories)}
                className={`px-4 py-2 rounded-full text-sm font-medium ${BLOG_UI_LINE_HEIGHT_CLASS} whitespace-nowrap flex-shrink-0 bg-white border-2 border-[#025545] text-[#025545] hover:bg-[#025545] hover:text-white transition-all duration-200 mr-4 md:mr-0`}
              >
                {showAllCategories ? 'Show less' : `+${displayCategories.length - 7} more`}
              </button>
            )}
          </div>
        </div>

        {/* Blog Posts Grid */}
        {filteredPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-32 px-4 sm:px-6 lg:px-8">
            {filteredPosts.map((post) => (
              <Link 
                key={post.id} 
                href={`/blog/${post.slug}`} 
                className="group block w-full"
              >
                <article className="w-full cursor-pointer overflow-hidden">
                  {/* Image Container */}
                  {post.featured_image_url && (
                    <div className="relative w-full aspect-[16/9] overflow-hidden bg-white rounded-xl">
                      <Image
                        src={normalizeImageUrl(post.featured_image_url || '')}
                        alt={post.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 280px, 100vw"
                      />
                    </div>
                  )}
                  
                  {/* Meta Info */}
                  <div className="mt-4">
                    <div className={`text-gray-600 text-xs md:text-sm text-left ${BLOG_UI_LINE_HEIGHT_CLASS}`}>
                      <span>{post.author_name || "MyKoott Team"}</span>
                      <span className="px-1 md:px-2">•</span>
                      <span>{formatDate(post.published_at || post.created_at)}</span>
                    </div>
                    
                    {/* Title - Fixed height with 2 line clamp */}
                    <div
                      role="heading"
                      aria-level={3}
                      className={BLOG_CARD_TITLE_CLASS}
                      style={BLOG_CARD_TITLE_STYLE}
                    >
                      {post.title}
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 px-4 sm:px-6 lg:px-8">
            <div className={`text-gray-500 text-lg ${BLOG_UI_LINE_HEIGHT_CLASS} mb-4`}>
              {blogs.length === 0 
                ? "No blog posts available yet." 
                : `No articles found for "${searchQuery}" in ${selectedCategory === "All" ? "all categories" : selectedCategory}`
              }
            </div>
            {blogs.length > 0 && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                }}
                className={`text-indigo-600 hover:text-indigo-800 font-medium ${BLOG_UI_LINE_HEIGHT_CLASS}`}
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}