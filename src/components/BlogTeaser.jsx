"use client";

import { normalizeImageUrl } from '@/utils/urlNormalizer';
import Image from "next/image";
import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** Must match mobile `.blog-grid` gap and desktop Tailwind gap for scroll snapping. */
const BLOG_CARD_GAP_PX = 28;

export default function BlogTeaser() {
  const router = useRouter();

  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const handleExploreClick = () => {
    router.push('/blog');
  };

  const createSlug = (title = "") =>
    title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .trim();

  const handleBlogClick = (post) => {
    const slug = post.slug || createSlug(post.title);
    router.push(`/blog/${slug}`);
  };

  const carouselRef = useRef(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  useEffect(() => {
    const node = carouselRef.current;
    if (!node) return;

    const updateButtons = () => {
      setCanScrollPrev(node.scrollLeft > 0);
      setCanScrollNext(node.scrollLeft + node.offsetWidth < node.scrollWidth - 1);
    };

    updateButtons();
    node.addEventListener("scroll", updateButtons, { passive: true });
    window.addEventListener("resize", updateButtons);

    return () => {
      node.removeEventListener("scroll", updateButtons);
      window.removeEventListener("resize", updateButtons);
    };
  }, [posts.length]);

  useEffect(() => {
    const loadBlogs = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api';
        // Fetch 3 blogs for all screen sizes
        const response = await fetch(`${baseUrl}/blogs?status=published&limit=3`, {
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          if (response.status !== 404) {
            throw new Error('Failed to load blogs');
          }
          return;
        }

        const result = await response.json();
        if (result.success && Array.isArray(result.data?.blogs) && result.data.blogs.length > 0) {
          // Use 3 blogs for all screen sizes
          setPosts(result.data.blogs.slice(0, 3));
        } else {
          setPosts([]);
        }
      } catch (error) {
        console.error('Error fetching latest blogs:', error);
        setPosts([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadBlogs();
  }, []);

  useEffect(() => {
    const node = carouselRef.current;
    if (!node || typeof window === "undefined") return;

    const centerFirstSlide = () => {
      const firstSlide = node.firstElementChild;
      if (!firstSlide) return;
      const slideWidth = firstSlide.getBoundingClientRect().width;
      const offset = Math.max((node.offsetWidth - slideWidth) / 2, 0);
      const target = Math.max(firstSlide.offsetLeft - offset, 0);
      if (node.scrollLeft !== target) {
        node.scrollTo({ left: target, behavior: "auto" });
      }
    };

    centerFirstSlide();
    window.addEventListener("resize", centerFirstSlide);

    return () => {
      window.removeEventListener("resize", centerFirstSlide);
    };
  }, []);

  const scrollCarousel = (dir) => {
    if (isLoading) return;
    const node = carouselRef.current;
    if (!node) return;
    const firstSlide = node.firstElementChild;
    const slideWidth = firstSlide?.getBoundingClientRect().width || node.offsetWidth * 0.75;
    const styles = window.getComputedStyle(node);
    const parsedGap = parseFloat(styles.getPropertyValue("column-gap") || styles.getPropertyValue("gap"));
    const gap = Number.isFinite(parsedGap) && parsedGap > 0 ? parsedGap : BLOG_CARD_GAP_PX;
    node.scrollTo({ left: node.scrollLeft + dir * (slideWidth + gap), behavior: "smooth" });
  };

  return (
    <section className="w-full px-4 md:px-6 lg:px-6 mt-16 md:mt-24 mb-16 md:mb-0">
      <style dangerouslySetInnerHTML={{__html: `
        @media (min-width: 768px) and (max-width: 1180px) and (max-height: 1180px) {
          .blog-teaser-heading {
            font-size: 32px !important;
            font-weight: 500 !important;
            line-height: 1.1 !important;
          }
          .blog-card {
            max-width: none !important;
            width: 100% !important;
          }
          .blog-image {
            height: 200px !important;
          }
          .blog-title {
            font-size: 16px !important;
            line-height: 1.4 !important;
          }
          .blog-meta {
            font-size: 13px !important;
          }
        }
        @media (min-width: 1024px) and (max-width: 1440px) {
          .blog-teaser-heading {
            font-weight: 500 !important;
          }
          .blog-card {
            max-width: none !important;
            width: 100% !important;
          }
          .blog-image {
            height: 220px !important;
          }
          .blog-title {
            font-size: 17px !important;
            line-height: 1.4 !important;
          }
          .blog-meta {
            font-size: 14px !important;
          }
        }
        /* Desktop default font weight */
        @media (min-width: 1441px) {
          .blog-teaser-heading {
            font-weight: 500 !important;
          }
        }
        @media (max-width: 767px) {
          h3.blog-teaser-heading {
            font-size: 24px !important;
            font-weight: 600 !important;
            line-height: 1.1 !important;
            text-align: center;
            padding-left: 0;
            padding-right: 0;
          }
          .blog-grid {
            display: flex !important;
            flex-wrap: nowrap !important;
            overflow-x: auto !important;
            scroll-snap-type: x mandatory !important;
            -webkit-overflow-scrolling: touch !important;
            gap: ${BLOG_CARD_GAP_PX}px !important;
            padding-bottom: 12px !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
            margin-left: -16px !important;
            margin-right: -16px !important;
            width: calc(100% + 32px) !important;
            max-width: none !important;
          }
          .blog-grid::-webkit-scrollbar {
            display: none !important;
          }
          .blog-image {
            height: 120px !important;
          }
          .blog-title {
            font-size: 13px !important;
            line-height: 1.3 !important;
          }
          .blog-meta {
            font-size: 11px !important;
          }
          .blog-card {
            flex: 0 0 75% !important;
            max-width: none !important;
            width: 75% !important;
            scroll-snap-align: center !important;
            min-width: 0 !important;
            padding-left: 16px !important;
            padding-right: 16px !important;
            box-sizing: border-box !important;
          }
          .blog-card:first-child {
            padding-left: clamp(18px, 7vw, 32px) !important;
          }
          .blog-card:last-child {
            padding-right: clamp(18px, 7vw, 32px) !important;
          }
          .blog-card img {
            width: 100% !important;
            height: auto !important;
          }
          .blog-carousel-controls {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            margin-top: 16px !important;
            padding: 0 4px !important;
          }
          .blog-carousel-controls button {
            width: 44px !important;
            height: 44px !important;
            border-radius: 50% !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            background-color: #f1f1f5 !important;
            color: #1f1f28 !important;
            border: none !important;
            transition: background-color 0.2s ease, transform 0.2s ease !important;
            position: relative !important;
            z-index: 1 !important;
          }
          .blog-carousel-controls button:disabled {
            opacity: 0.5 !important;
          }
          .blog-carousel-controls button:not(:disabled):active {
            transform: scale(0.96) !important;
          }
        }
      `}} />
      <div className="mx-auto max-w-[1100px] px-0 md:px-0 overflow-hidden md:overflow-visible">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 md:mb-12">
          <div className="text-center md:text-left max-w-4xl md:max-w-none mx-auto md:mx-0 px-4 md:px-0">
             <p className="text-sm md:text-base lg:text-lg">From our blog</p>
                 <h3 className="blog-teaser-heading mt-2 md:mt-3 mb-4 md:mb-0 break-words text-base md:text-xl lg:text-2xl max-w-full" style={{ fontSize: '24px', fontWeight: 600, lineHeight: '1.1' }}>
               Parenting Tips & Child Mental Health<br className="hidden md:inline" /> Guidance for Everyday Life
             </h3>
           </div>
          <div className="flex justify-center md:justify-end md:self-start md:pt-8">
            <button
              type="button"
              onClick={handleExploreClick}
              className="inline-flex items-center rounded-full px-4 py-2 md:px-5 md:py-3 text-sm md:text-base font-semibold transition-colors duration-200 whitespace-nowrap"
              style={{ 
                backgroundColor: '#ffffff',
                color: '#15171A',
                border: '2px solid #15171A'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#15171A';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.color = '#15171A';
              }}
            >
              Explore more articles
            </button>
          </div>
        </div>

        <div className="overflow-hidden md:overflow-visible">
          <div ref={carouselRef} className="blog-grid md:grid md:grid-cols-3 md:gap-8 lg:gap-10" id="blog-carousel" suppressHydrationWarning>
           {posts.map((post, index) => {
            const imageSrc = normalizeImageUrl(post.featured_image_url || post.src);
            const author = post.author_name || post.author || "Koott Team";
            const date = post.published_at || post.created_at || post.date || '';
            const altText = post.alt || post.title || "Blog cover image";
            // Add priority to first blog image (LCP element)
            const isFirstImage = index === 0;

            return (
            <article 
              key={post.id || post.slug || post.title} 
              className="blog-card min-w-0 cursor-pointer"
              onClick={() => handleBlogClick(post)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleBlogClick(post);
                }
              }}
              tabIndex={0}
              role="link"
              aria-label={`Read article: ${post.title || "Blog post"}`}
            >
               {imageSrc && (
               <div
               className={`blog-image relative w-full min-w-0 h-[140px] sm:h-[150px] md:h-[160px] lg:aspect-[16/9] overflow-hidden rounded-2xl ${
                   post.highlight ? "ring-4 md:ring-8 ring-sky-100" : ""
                 }`}
               >
                <Image
                  src={imageSrc}
                  alt={altText}
                  fill
                  className="object-cover object-center"
                  sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, 100vw"
                  priority={isFirstImage}
                />
              </div>
              )}
              <div className="blog-meta mt-4 md:mt-6 lg:mt-4 text-gray-600 text-xs md:text-sm">
                <span className="p2">{author}</span>
                <span className="px-1 md:px-2 p2">•</span>
                <span className="p2">{date ? new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}</span>
              </div>
              <h6 className="blog-title mt-2 md:mt-3 lg:mt-2 font-medium text-sm md:text-base">
                {post.title}
              </h6>
            </article>
          )})}
        </div>
        </div>
        
        {/* Mobile: Carousel Controls */}
        <div className="md:hidden">
          <div className="blog-carousel-controls">
          <button
            type="button"
            aria-label="Previous"
            onClick={() => scrollCarousel(-1)}
            disabled={!canScrollPrev}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
            
          <button
            type="button"
            aria-label="Next"
            onClick={() => scrollCarousel(1)}
            disabled={!canScrollNext}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          </div>
        </div>
      </div>
    </section>
  );
}


