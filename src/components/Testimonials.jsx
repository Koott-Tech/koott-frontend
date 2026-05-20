"use client";
import Image from "next/image";
import { useState, useRef, useEffect, useCallback } from "react";

// Helper function to extract YouTube video ID (matches VideosShowcase)
const extractYouTubeId = (url) => {
  if (!url) return null;
  const patterns = [
    /youtube\.com\/shorts\/([^&\n?#\/]+)/,
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
};

// Helper function to convert YouTube URL to embed URL (matches VideosShowcase)
const getYouTubeEmbedUrl = (url, muted = true, autoplay = true) => {
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;
  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    mute: muted ? '1' : '0',
    loop: '1',
    playlist: videoId,
    controls: '0',
    modestbranding: '1',
    rel: '0',
    showinfo: '0',
    iv_load_policy: '3',
    fs: '0',
    disablekb: '1',
    playsinline: '1',
    cc_load_policy: '0',
    enablejsapi: '1',
    origin: typeof window !== 'undefined' ? window.location.origin : '',
    widget_referrer: typeof window !== 'undefined' ? window.location.href : ''
  });
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
};

// Helper function to get YouTube thumbnail URL
const getYouTubeThumbnailUrl = (url) => {
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
};

// Check if URL is YouTube
const isYouTubeUrl = (url) => {
  if (!url) return false;
  return /youtube\.com|youtu\.be/.test(url);
};

const DEFAULT_DESKTOP_YOUTUBE_URL = "https://www.youtube.com/watch?v=RSge3l2uKSI";

/** Default carousel items (tablet/mobile) — same as original homepage. */
const DEFAULT_PHOTOS = [
  { src: "https://www.youtube.com/watch?v=RSge3l2uKSI", alt: "Testimonial video", type: "video" },
  { src: "/TESTIMONIALS 1.webp", alt: "Smiling parent and child", type: "image" },
  {
    text: "What I liked most is how the therapist involved us as parents. It didn't feel like therapy alone, it felt like teamwork. My child is opening up more every week.",
    author: "Father of a 10-year-old",
    bgImage: "/Our promise bg1.webp",
    gradient: "linear-gradient(135deg, #E6F5EC 0%, #D4EDE0 50%, #C8E8D5 100%)",
    type: "text",
  },
  { src: "/TESTIMONIALS 2.webp", alt: "Family smiling", type: "image" },
  {
    text: "I thought therapy was only for people with big problems, but now I know it's just a space to talk and feel better. I feel safe to say anything, and it's helping me be more confident.",
    author: "12-year-old girl",
    bgImage: "/Our promise bg2.webp",
    gradient: "linear-gradient(135deg, #f2fff1 0%, #E0DEFF 50%, #D4D2FF 100%)",
    type: "text",
  },
  { src: "/TESTIMONIALS 3.webp", alt: "Happy child", type: "image" },
  {
    text: "I was a person who used to get angry at my kid for every little thing. Through better parenting coaching I started becoming a better parent and a better person.",
    author: "Parent of an 8-year-old",
    bgImage: "/Our promise bg3.webp",
    gradient: "linear-gradient(135deg, #FFF5E6 0%, #FFEED6 50%, #FFE7C8 100%)",
    type: "text",
  },
  { src: "/TESTIMONIALS 4.webp", alt: "Family moment", type: "image" },
  {
    text: "Koott has been such a gentle support for our family. My daughter used to struggle with focus and big emotions, but after a few sessions, I can see how much more confident she feels. The therapists truly understand children.",
    author: "Parent of a 9-year-old",
    bgImage: "/Our promise bg4.webp",
    gradient: "linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 50%, #D1E9FF 100%)",
    type: "text",
  },
  { src: "/TESTIMONIALS 5.webp", alt: "Happy family", type: "image" },
];

/** Desktop xl 5-column layout content — default homepage copy. */
const DEFAULT_DESKTOP_GRID = {
  col1: {
    src: "/testimonial2.PNG",
    alt: "Collage of parents and children sharing their counseling experience",
  },
  col2: [
    {
      quote:
        "What I liked most is how the therapist involved us as parents. It didn't feel like therapy alone, it felt like teamwork. My child is opening up more every week.",
      author: "Father of a 10-year-old",
      bg: "/Our promise bg1.webp",
      quoteClassName: "p1",
    },
    {
      quote:
        "I thought therapy was only for people with big problems, but now I know it's just a space to talk and feel better. I feel safe to say anything, and it's helping me be more confident.",
      author: "12-year-old girl",
      bg: "/Our promise bg2.webp",
      quoteClassName: "",
    },
  ],
  col3: {
    topImage: {
      src: "/testimonial3.PNG",
      alt: "Mother and child smiling after counseling session",
    },
  },
  col4: {
    textCard: {
      quote:
        "I was a person who used to get angry at my kid for every little thing. Through better parenting coaching I started becoming a better parent and a better person.",
      author: "Parent of an 8-year-old",
      bg: "/Our promise bg3.webp",
    },
    bottomImage: {
      src: "/testimonialgirl.png",
      alt: "Young girl smiling, representing a positive therapy outcome",
    },
  },
  col5: {
    topImage: {
      src: "/testimonial5.PNG",
      alt: "Parents and child together after counseling support",
    },
    textCard: {
      quote:
        "Koott has been such a gentle support for our family. My daughter used to struggle with focus and big emotions, but after a few sessions, I can see how much more confident she feels. The therapists truly understand children.",
      author: "Parent of a 9-year-old",
      bg: "/Our promise bg4.webp",
    },
  },
};

/**
 * Homepage testimonials carousel + desktop grid.
 * Pass `photos`, `desktopGrid`, `headingLine1`, etc. to reuse the same UI with different copy (e.g. events).
 */
export default function Testimonials({
  photos: photosProp,
  desktopGrid: desktopGridProp,
  desktopYouTubeUrl: desktopYouTubeUrlProp,
  eyebrowText,
  headingLine1,
  headingLine2,
  useAccessibleHeading = false,
  headingTag = "h2",
} = {}) {
  const desktopYouTubeUrl = desktopYouTubeUrlProp ?? DEFAULT_DESKTOP_YOUTUBE_URL;
  const photos = photosProp ?? DEFAULT_PHOTOS;
  const desktopGrid = desktopGridProp ?? DEFAULT_DESKTOP_GRID;
  const resolvedEyebrow = eyebrowText ?? "Testimonials";
  const resolvedHeadingLine1 = headingLine1 ?? "What Families Are Saying About Our";
  const resolvedHeadingLine2 = headingLine2 === undefined ? "Child Counseling Support" : headingLine2;
  const HeadingTag = headingTag === "h3" ? "h3" : "h2";

  const scrollContainerRef = useRef(null);
  const autoPlayRef = useRef(null);
  const [isMuted, setIsMuted] = useState(true);
  const isPausedRef = useRef(false);
  const touchStartRef = useRef(null);
  const touchEndRef = useRef(null);
  const touchHoldTimerRef = useRef(null);
  const isHoldingRef = useRef(false);
  const scrollCheckRef = useRef(null);
  const isScrollingRef = useRef(false);
  const isMobileRef = useRef(false);
  const [useMobileMarquee, setUseMobileMarquee] = useState(false);
  const [isMobileMarqueePaused, setIsMobileMarqueePaused] = useState(false);
  const marqueeResumeTimeoutRef = useRef(null);
  const testimonialVideoRef = useRef(null);
  const [visibleVideoIndex, setVisibleVideoIndex] = useState(null);
  const videoCardRefs = useRef({});
  const desktopYouTubeIframeRef = useRef(null);
  const [isDesktopVideoPlaying, setIsDesktopVideoPlaying] = useState(true);
  const mobileYouTubeIframeRefs = useRef({});

  // Create infinite loop by duplicating photos
  const infinitePhotos = [...photos, ...photos, ...photos];
  
  const handleScroll = () => {
    if (!scrollContainerRef.current || isScrollingRef.current) return;
    
    // Use requestAnimationFrame to throttle scroll checks
    if (scrollCheckRef.current) {
      cancelAnimationFrame(scrollCheckRef.current);
    }
    
    scrollCheckRef.current = requestAnimationFrame(() => {
      if (!scrollContainerRef.current || isScrollingRef.current) return;
      
      const container = scrollContainerRef.current;
      const scrollLeft = container.scrollLeft;
      const containerWidth = container.offsetWidth || (typeof window !== 'undefined' ? window.innerWidth : 0);
      
      if (containerWidth === 0) return; // Wait for container to have width
      
      // Detect if we're on landscape tablet (3 cards) or portrait tablet (2 cards)
      const isLandscapeTablet = typeof window !== 'undefined' && 
        window.matchMedia('(min-width: 1024px) and (max-width: 1180px) and (max-height: 850px)').matches;
      const cardsPerView = isLandscapeTablet ? 3 : 2;
      const cardWidth = containerWidth / cardsPerView;
      
      const thresholdStart = photos.length * cardWidth;
      const thresholdEnd = photos.length * 2 * cardWidth;
      
      // If scrolled past the end of middle set, instantly jump to corresponding position in middle set
      if (scrollLeft >= thresholdEnd - (cardWidth * 0.5)) {
        isScrollingRef.current = true;
        // Temporarily disable smooth scrolling and scroll snap
        const originalScrollBehavior = container.style.scrollBehavior;
        const originalScrollSnap = container.style.scrollSnapType;
        container.style.scrollBehavior = 'auto';
        container.style.scrollSnapType = 'none';
        
        // Calculate offset more precisely
        const positionInLastSet = scrollLeft - thresholdEnd;
        const offset = positionInLastSet >= 0 ? (positionInLastSet % (photos.length * cardWidth)) : 0;
        const targetScroll = thresholdStart + offset;

        // Set scroll position instantly
        container.scrollLeft = targetScroll;
        
        // Re-enable smooth scrolling and snap after jump completes
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            container.style.scrollBehavior = originalScrollBehavior || 'smooth';
            container.style.scrollSnapType = originalScrollSnap || 'x mandatory';
            setTimeout(() => {
              isScrollingRef.current = false;
            }, 150);
          });
        });
      }
      // If scrolled before the start of middle set, instantly jump to corresponding position in middle set
      else if (scrollLeft <= thresholdStart - (cardWidth * 0.5)) {
        isScrollingRef.current = true;
        // Temporarily disable smooth scrolling and scroll snap
        const originalScrollBehavior = container.style.scrollBehavior;
        const originalScrollSnap = container.style.scrollSnapType;
        container.style.scrollBehavior = 'auto';
        container.style.scrollSnapType = 'none';
        
        // Calculate offset more precisely
        const positionBeforeStart = thresholdStart - scrollLeft;
        const offset = positionBeforeStart >= 0 ? (positionBeforeStart % (photos.length * cardWidth)) : 0;
        const targetScroll = thresholdEnd - offset;
        
        // Set scroll position instantly
        container.scrollLeft = targetScroll;
        
        // Re-enable smooth scrolling and snap after jump completes
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            container.style.scrollBehavior = originalScrollBehavior || 'smooth';
            container.style.scrollSnapType = originalScrollSnap || 'x mandatory';
            setTimeout(() => {
              isScrollingRef.current = false;
            }, 150);
          });
        });
      }
    });
  };

  // Auto-play functionality with infinite loop
  const startAutoPlay = () => {
    if (isMobileRef.current) {
      stopAutoPlay();
      return;
    }
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
    }
    autoPlayRef.current = setInterval(() => {
      if (!isPausedRef.current && !isScrollingRef.current && scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const containerWidth = container.offsetWidth || (typeof window !== 'undefined' ? window.innerWidth : 0);
        if (containerWidth === 0) return;
        
        // Detect if we're on landscape tablet (3 cards) or portrait tablet (2 cards)
        const isLandscapeTablet = typeof window !== 'undefined' && 
          window.matchMedia('(min-width: 1024px) and (max-width: 1180px) and (max-height: 850px)').matches;
        const cardsPerView = isLandscapeTablet ? 3 : 2;
        const cardWidth = containerWidth / cardsPerView;
        
        container.scrollBy({
          left: cardWidth,
          behavior: 'smooth'
        });

        const thresholdStart = photos.length * cardWidth;
        const thresholdEnd = photos.length * 2 * cardWidth;

        // After the scroll animation, ensure we loop back to the first card
        setTimeout(() => {
          if (!scrollContainerRef.current) return;
          const currentScroll = scrollContainerRef.current.scrollLeft;
          if (currentScroll >= thresholdEnd - (cardWidth * 0.25)) {
            const originalScrollBehavior = scrollContainerRef.current.style.scrollBehavior;
            const originalScrollSnap = scrollContainerRef.current.style.scrollSnapType;
            scrollContainerRef.current.style.scrollBehavior = 'auto';
            scrollContainerRef.current.style.scrollSnapType = 'none';
            scrollContainerRef.current.scrollLeft = thresholdStart;
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                if (!scrollContainerRef.current) return;
                scrollContainerRef.current.style.scrollBehavior = originalScrollBehavior || 'smooth';
                scrollContainerRef.current.style.scrollSnapType = originalScrollSnap || 'x mandatory';
              });
            });
      }
        }, 700);
      }
    }, 5000);
  };

  const stopAutoPlay = () => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
      autoPlayRef.current = null;
    }
  };

  const updateIsMobileFlag = () => {
    if (typeof window === 'undefined') return;
    const nextIsMobile = window.matchMedia
      ? window.matchMedia('(max-width: 767px)').matches
      : window.innerWidth < 768;
    isMobileRef.current = nextIsMobile;
    setUseMobileMarquee(nextIsMobile);
    if (!nextIsMobile) {
      setIsMobileMarqueePaused(false);
      if (marqueeResumeTimeoutRef.current) {
        clearTimeout(marqueeResumeTimeoutRef.current);
        marqueeResumeTimeoutRef.current = null;
      }
    }
    if (isMobileRef.current) {
      stopAutoPlay();
    }
  };

  const pauseMobileMarquee = useCallback(() => {
    if (!useMobileMarquee) return;
    setIsMobileMarqueePaused(true);
    if (marqueeResumeTimeoutRef.current) {
      clearTimeout(marqueeResumeTimeoutRef.current);
      marqueeResumeTimeoutRef.current = null;
    }
  }, [useMobileMarquee]);

  const resumeMobileMarquee = useCallback((delay = 4000) => {
    if (!useMobileMarquee) return;
    if (marqueeResumeTimeoutRef.current) {
      clearTimeout(marqueeResumeTimeoutRef.current);
    }
    marqueeResumeTimeoutRef.current = setTimeout(() => {
      setIsMobileMarqueePaused(false);
      marqueeResumeTimeoutRef.current = null;
    }, delay);
  }, [useMobileMarquee]);

  useEffect(() => {
    updateIsMobileFlag();
    if (typeof window === 'undefined') return;
    const onResize = () => updateIsMobileFlag();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (marqueeResumeTimeoutRef.current) {
        clearTimeout(marqueeResumeTimeoutRef.current);
        marqueeResumeTimeoutRef.current = null;
      }
    };
  }, []);

  const resumeAutoPlay = () => {
    if (isMobileRef.current) {
      stopAutoPlay();
      return;
    }
    startAutoPlay();
  };

  // Touch/swipe support with hold-to-pause
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    touchEndRef.current = null;
    touchStartRef.current = e.targetTouches[0].clientX;
    isPausedRef.current = true;
    stopAutoPlay();
    
    // Start touch hold timer
    touchHoldTimerRef.current = setTimeout(() => {
      isHoldingRef.current = true;
      isPausedRef.current = true;
      stopAutoPlay();
    }, 300);
  };

  const onTouchMove = (e) => {
    touchEndRef.current = e.targetTouches[0].clientX;
    // If moved significantly, cancel hold
    if (touchStartRef.current && Math.abs(e.targetTouches[0].clientX - touchStartRef.current) > 10) {
      if (touchHoldTimerRef.current) {
        clearTimeout(touchHoldTimerRef.current);
        touchHoldTimerRef.current = null;
      }
      isHoldingRef.current = false;
    }
  };

  const onTouchEnd = () => {
    // Clear hold timer
    if (touchHoldTimerRef.current) {
      clearTimeout(touchHoldTimerRef.current);
      touchHoldTimerRef.current = null;
    }
    
    if (isHoldingRef.current) {
      isHoldingRef.current = false;
      // If was holding, don't swipe, just resume autoplay after delay
      setTimeout(() => {
        isPausedRef.current = false;
        resumeAutoPlay();
      }, 1000);
      return;
    }
    
    if (!touchStartRef.current || !touchEndRef.current) {
      setTimeout(() => {
        isPausedRef.current = false;
        resumeAutoPlay();
      }, 1000);
      return;
    }
    
    const distance = touchStartRef.current - touchEndRef.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe || isRightSwipe) {
      // Let native scroll handle the swipe
      isPausedRef.current = false;
    setTimeout(() => {
      resumeAutoPlay();
    }, 2000);
    } else {
      // No swipe, resume autoplay
      isPausedRef.current = false;
      setTimeout(() => {
        resumeAutoPlay();
      }, 1000);
    }
  };

  // Initialize carousel and start auto-play
  useEffect(() => {
    if (useMobileMarquee) {
      updateIsMobileFlag();
      return;
    }
    // Wait for DOM to be ready
    const initCarousel = () => {
      if (scrollContainerRef.current && typeof window !== 'undefined') {
        const container = scrollContainerRef.current;
        // Wait for container to have proper width
        const containerWidth = container.offsetWidth || window.innerWidth;
        if (containerWidth > 0) {
          // Detect if we're on landscape tablet (3 cards) or portrait tablet (2 cards)
          const isLandscapeTablet = window.matchMedia('(min-width: 1024px) and (max-width: 1180px) and (max-height: 850px)').matches;
          const cardsPerView = isLandscapeTablet ? 3 : 2;
          const cardWidth = containerWidth / cardsPerView;
          
          // Disable smooth scrolling for initial positioning
          container.style.scrollBehavior = 'auto';
          // Start at the middle set (infinite loop starting point)
          container.scrollLeft = photos.length * cardWidth;
          // Re-enable smooth scrolling after positioning
          requestAnimationFrame(() => {
            container.style.scrollBehavior = 'smooth';
          });
          return true;
        }
      }
      return false;
    };

    // Try to initialize immediately, if not ready, wait a bit
    if (!initCarousel()) {
      const timeout = setTimeout(() => {
        initCarousel();
      }, 100);
      return () => clearTimeout(timeout);
    }

    updateIsMobileFlag();
    resumeAutoPlay();

    return () => {
      stopAutoPlay();
      if (touchHoldTimerRef.current) {
        clearTimeout(touchHoldTimerRef.current);
      }
      if (scrollCheckRef.current) {
        cancelAnimationFrame(scrollCheckRef.current);
      }
    };
  }, [photos.length, useMobileMarquee]);

  const handleMarqueeInteractionStart = useCallback(() => {
    pauseMobileMarquee();
  }, [pauseMobileMarquee]);

  const handleMarqueeInteractionEnd = useCallback(() => {
    resumeMobileMarquee(4000);
  }, [resumeMobileMarquee]);

  const handleMarqueeScroll = useCallback(() => {
    pauseMobileMarquee();
    resumeMobileMarquee(4000);
  }, [pauseMobileMarquee, resumeMobileMarquee]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (testimonialVideoRef.current) {
      testimonialVideoRef.current.muted = !isMuted;
    }
  };

  // Sync video mute state
  useEffect(() => {
    if (testimonialVideoRef.current) {
      testimonialVideoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // YouTube iframe API control (same as VideosShowcase)
  const sendYouTubeCommand = useCallback((iframe, command) => {
    if (!iframe || !iframe.contentWindow) return;
    iframe.contentWindow.postMessage(JSON.stringify({
      event: 'command',
      func: command,
      args: []
    }), '*');
  }, []);

  // Control desktop YouTube video mute state
  useEffect(() => {
    if (!isYouTubeUrl(desktopYouTubeUrl) || !isDesktopVideoPlaying) return;
    const iframe = desktopYouTubeIframeRef.current;
    if (!iframe) return;
    sendYouTubeCommand(iframe, isMuted ? 'mute' : 'unMute');
  }, [isMuted, isDesktopVideoPlaying, sendYouTubeCommand]);

  // Control mobile carousel YouTube videos mute state
  useEffect(() => {
    if (visibleVideoIndex == null) return;
    const iframe = mobileYouTubeIframeRefs.current[visibleVideoIndex];
    if (!iframe) return;
    sendYouTubeCommand(iframe, isMuted ? 'mute' : 'unMute');
  }, [isMuted, visibleVideoIndex, sendYouTubeCommand]);

  // Control mobile carousel YouTube videos play/pause based on visibility
  useEffect(() => {
    Object.keys(mobileYouTubeIframeRefs.current).forEach((key) => {
      const index = parseInt(key);
      const iframe = mobileYouTubeIframeRefs.current[key];
      if (!iframe) return;
      if (visibleVideoIndex === index) {
        sendYouTubeCommand(iframe, 'playVideo');
      } else {
        sendYouTubeCommand(iframe, 'pauseVideo');
      }
    });
  }, [visibleVideoIndex, sendYouTubeCommand]);

  // Auto-play desktop YouTube video on mount
  useEffect(() => {
    if (!isYouTubeUrl(desktopYouTubeUrl)) return;
    const iframe = desktopYouTubeIframeRef.current;
    if (!iframe) return;
    // Small delay to ensure iframe is loaded
    const timer = setTimeout(() => {
      sendYouTubeCommand(iframe, 'playVideo');
      setIsDesktopVideoPlaying(true);
    }, 500);
    return () => clearTimeout(timer);
  }, [sendYouTubeCommand]);

  // Track visible video card using IntersectionObserver
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Set initial visible video (first YouTube video in the array)
    const firstYouTubeIndex = infinitePhotos.findIndex((photo) => 
      photo.type === "video" && isYouTubeUrl(photo.src)
    );
    if (firstYouTubeIndex !== -1) {
      setVisibleVideoIndex(firstYouTubeIndex);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the most visible entry
        let mostVisibleEntry = null;
        let highestRatio = 0;

        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > highestRatio) {
            highestRatio = entry.intersectionRatio;
            mostVisibleEntry = entry;
          }
        });

        if (mostVisibleEntry && highestRatio > 0.2) {
          const index = parseInt(mostVisibleEntry.target.getAttribute('data-video-index'));
          if (!isNaN(index)) {
            setVisibleVideoIndex(index);
          }
        }
      },
      {
        root: null, // Use viewport as root
        rootMargin: '0px',
        threshold: [0.1, 0.2, 0.3, 0.5, 0.75, 1.0]
      }
    );

    // Small delay to ensure refs are set, then observe
    const timeoutId = setTimeout(() => {
      // Observe all video cards (both desktop and mobile)
      Object.values(videoCardRefs.current).forEach((ref) => {
        if (ref) {
          observer.observe(ref);
        }
      });
      
      // Also trigger initial check after observing
      setTimeout(() => {
        Object.values(videoCardRefs.current).forEach((ref) => {
          if (ref) {
            const rect = ref.getBoundingClientRect();
            const isVisible = rect.top < window.innerHeight && rect.bottom > 0 && 
                             rect.left < window.innerWidth && rect.right > 0;
            if (isVisible) {
              const index = parseInt(ref.getAttribute('data-video-index'));
              if (!isNaN(index)) {
                setVisibleVideoIndex(index);
              }
            }
          }
        });
      }, 100);
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [infinitePhotos]);

  return (
    <section className="w-full bg-white testimonials-section mt-8">
      <style jsx global>{`
        .testimonial-faq-bg {
          position: absolute;
          inset: 0;
          transform: rotate(90deg) scale(2.0);
          transform-origin: center;
          /* Stretch the overlay wider than the container and center it */
          width: 220%;
          height: 120%;
          left: -60%;
          top: -10%;
          background-size: cover;
          background-position: center center;
          background-repeat: no-repeat;
        }
        @media (max-width: 1180px) and (max-height: 1180px) {
          .testimonial-faq-bg {
            transform: rotate(90deg) scale(2.3);
            width: 240%;
            height: 140%;
            left: -70%;
            top: -20%;
          }
        }
        @media (min-width: 768px) and (max-width: 1180px) and (min-height: 850px) and (max-height: 1180px) {
          .testimonials-section {
            margin-top: 128px;
          }
          .testimonials-heading {
            font-size: 32px;
            font-weight: 500 !important;
            line-height: 1.1;
          }
          /* Portrait tablet: show 2 testimonial cards per carousel viewport */
          .testimonials-infinite-carousel {
            scroll-snap-type: x mandatory;
          }
          .testimonials-carousel-track {
            gap: 0;
            padding-inline: 0;
          }
          .testimonials-carousel-card {
            flex: 0 0 50% !important;
            width: 50% !important;
            max-width: 50% !important;
            min-width: 50% !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .testimonials-carousel-card .testimonials-card-content {
            padding-left: 8px !important;
            padding-right: 8px !important;
          }
        }
        /* Landscape tablets (1180x810): show 3 cards per carousel viewport */
        @media (min-width: 1024px) and (max-width: 1180px) and (max-height: 850px) {
          .testimonials-section {
            margin-top: 128px;
          }
          .testimonials-heading {
            font-size: 32px;
            font-weight: 500 !important;
            line-height: 1.1;
          }
          .testimonials-infinite-carousel {
            scroll-snap-type: x mandatory;
          }
          .testimonials-carousel-track {
            gap: 0;
            padding-inline: 0;
          }
          .testimonials-carousel-card {
            flex: 0 0 33.333% !important;
            width: 33.333% !important;
            max-width: 33.333% !important;
            min-width: 33.333% !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .testimonials-carousel-card .testimonials-card-content {
            padding-left: 8px !important;
            padding-right: 8px !important;
          }
        }
        @media (max-width: 767px) {
          .testimonials-heading {
            font-size: 24px;
            font-weight: 500;
            line-height: 1.1;
            text-align: center;
            padding-left: 0;
            padding-right: 0;
          }
          .testimonials-carousel-track {
            padding-left: 0 !important;
            padding-right: 0 !important;
            width: 100% !important;
          }
          /* Mobile carousel text review card background - fit inside without overflow */
          .testimonials-text-card-bg {
            position: absolute !important;
            top: -50% !important;
            left: -125% !important;
            right: auto !important;
            bottom: auto !important;
            transform: rotate(90deg) scale(3.5) !important;
            transform-origin: center !important;
            width: 350% !important;
            height: 200% !important;
            background-size: cover !important;
            background-position: center center !important;
            background-repeat: no-repeat !important;
          }
          .testimonials-infinite-carousel {
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            -ms-overflow-style: none;
            width: 100% !important;
            max-width: 100vw !important;
            scroll-behavior: smooth !important;
            scroll-snap-type: x mandatory !important;
            overscroll-behavior-x: contain !important;
            will-change: scroll-position;
          }
          .testimonials-carousel-track {
            will-change: transform;
          }
          .testimonials-infinite-carousel::-webkit-scrollbar {
            display: none;
          }
          .testimonials-carousel-card {
            flex: 0 0 100% !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 100% !important;
            box-sizing: border-box !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            scroll-snap-align: start !important;
            scroll-snap-stop: always !important;
          }
        .testimonials-mobile-marquee-wrapper {
          width: 100%;
          overflow-x: auto;
          overflow-y: hidden;
          position: relative;
          scroll-snap-type: x mandatory;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
        }
        .testimonials-mobile-marquee-wrapper::-webkit-scrollbar {
          display: none;
        }
        .testimonials-mobile-marquee {
          display: flex;
          gap: 16px;
          width: max-content;
          animation: testimonials-mobile-scroll 20s linear infinite;
        }
        .testimonials-mobile-marquee:hover,
        .testimonials-mobile-marquee:active,
        .testimonials-mobile-marquee-wrapper:active .testimonials-mobile-marquee,
        .testimonials-mobile-marquee-wrapper:focus-within .testimonials-mobile-marquee,
        .testimonials-mobile-marquee.paused {
          animation-play-state: paused;
        }
        @keyframes testimonials-mobile-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
          }
        }
        /* Hide YouTube branding and UI elements */
        .youtube-embed-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        .youtube-embed-wrapper iframe {
          position: absolute;
          top: -40px;
          left: -1%;
          width: 102%;
          height: calc(100% + 80px);
          transform: scale(1.02);
          transform-origin: center center;
          pointer-events: none;
        }
        @media (max-width: 767px) {
          .youtube-embed-wrapper iframe {
          top: -60px;
          height: calc(100% + 120px);
            transform: scale(1.04);
          }
        }
        /* Hide YouTube logo overlay using pseudo-element */
        .youtube-embed-wrapper::after,
        .youtube-embed-wrapper::before {
          content: '';
          position: absolute;
          left: 0;
          width: 100%;
          height: 64px;
          z-index: 10;
          pointer-events: none;
        }
        .youtube-embed-wrapper::after {
          top: 0;
          background: linear-gradient(180deg, rgba(0, 0, 0, 0.35) 0%, rgba(0, 0, 0, 0) 100%);
        }
        .youtube-embed-wrapper::before {
          bottom: 0;
          background: linear-gradient(0deg, rgba(0, 0, 0, 0.35) 0%, rgba(0, 0, 0, 0) 100%);
        }
        /* Mobile line height for testimonials heading and center alignment */
        @media (max-width: 767px) {
          .testimonials-heading {
            line-height: 1.1 !important;
            text-align: center !important;
            padding-left: 1rem !important;
            padding-right: 1rem !important;
            max-width: 100% !important;
          }
        }
      `}</style>
      <div className="mx-auto max-w-[1600px]  px-0 md:px-1 ">
        {/* Heading */}
        <div className="text-center max-w-4xl mx-auto px-4">
          <p className="p1">{resolvedEyebrow}</p>
          {useAccessibleHeading ? (
            <HeadingTag
              className="testimonials-heading mt-2 mb-16 text-lg md:text-xl lg:text-2xl max-w-full font-sans"
              style={{ fontWeight: 500, lineHeight: 1.05 }}
            >
              {resolvedHeadingLine1}
              {resolvedHeadingLine2 ? (
                <>
                  <br className="hidden md:inline" />
                  {resolvedHeadingLine2}
                </>
              ) : null}
            </HeadingTag>
          ) : (
            <HeadingTag
              className="testimonials-heading mt-2 mb-16 text-lg md:text-xl lg:text-2xl max-w-full"
              style={{ fontWeight: 500, lineHeight: 1.05 }}
            >
              {resolvedHeadingLine1}
              {resolvedHeadingLine2 ? (
                <>
                  <br className="hidden md:inline" />
                  {resolvedHeadingLine2}
                </>
              ) : null}
            </HeadingTag>
          )}
        </div>

        {/* Desktop: 5-column layout with images (xl and above to match header/hero desktop breakpoint) */}
        <div className="hidden xl:grid grid-cols-5 gap-2 px-2.5 items-start">
          {/* First column: full-length image edge-to-edge */}
          <div className="h-[640px] rounded-[10px] overflow-hidden flex flex-col p-0">
            <div className="flex-1 rounded-[10px] relative overflow-hidden">
              <Image
                src={desktopGrid.col1.src}
                alt={desktopGrid.col1.alt}
                fill
                className="object-cover object-bottom scale-100"
              />
            </div>
          </div>
          {/* Second column split vertically into two equal halves with padding and gap */}
          <div className="h-[640px] rounded-[10px] overflow-hidden flex flex-col p-0 gap-2">
            {desktopGrid.col2.map((card, idx) => (
              <div
                key={idx}
                className="relative rounded-[10px] border border-gray-200 p-4 overflow-hidden"
                style={{ height: "316px" }}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center z-0 testimonial-faq-bg"
                  style={{ backgroundImage: `url('${card.bg}')` }}
                />
                <div className="relative z-10">
                  <p className={card.quoteClassName || undefined}>
                    &quot;{card.quote}&quot;
                  </p>
                  <br />
                  <p className="p2 mt-4 mb-4">{card.author}</p>
                </div>
              </div>
            ))}
          </div>
          {/* Third column: split 30% top (image), 70% bottom (video) */}
          <div className="h-[640px] rounded-[10px] overflow-hidden flex flex-col p-0 gap-2">
            <div className="rounded-[10px] relative overflow-hidden" style={{ height: "186px" }}>
              <img
                src={desktopGrid.col3.topImage.src}
                alt={desktopGrid.col3.topImage.alt}
                className="w-full h-full object-cover object-bottom scale-100"
              />
            </div>
            <div 
              className="rounded-[10px] relative overflow-hidden" 
              style={{height: '446px'}}
            >
              {isYouTubeUrl(desktopYouTubeUrl) && isDesktopVideoPlaying ? (
                <div className="youtube-embed-wrapper relative w-full h-full overflow-hidden rounded-[10px]">
                  <iframe
                    ref={desktopYouTubeIframeRef}
                    key={`youtube-desktop-${isMuted ? 'muted' : 'unmuted'}`}
                    src={getYouTubeEmbedUrl(desktopYouTubeUrl, isMuted, true)}
                    className="absolute inset-0 w-full h-full rounded-[10px]"
                    title="desktop-testimonial-video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen={false}
                    frameBorder="0"
                    style={{ pointerEvents: 'none' }}
                  />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
                className="absolute bottom-4 right-4 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                )}
              </button>
                </div>
              ) : (
                <>
                  <div className="absolute inset-0 flex items-center justify-center bg-black rounded-[10px]">
                    <img
                      src={getYouTubeThumbnailUrl(desktopYouTubeUrl) || '/logo.png'}
                      alt="Testimonial video thumbnail"
                      className="absolute inset-0 w-full h-full object-cover rounded-[10px]"
                      style={{ transform: 'scale(1.22)', transformOrigin: 'center center' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors rounded-[10px] cursor-pointer"
                      onClick={() => setIsDesktopVideoPlaying(true)}
                    >
                      <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
                        <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDesktopVideoPlaying(true);
                    }}
                    className="absolute bottom-4 right-4 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
                    aria-label="Play video"
                  >
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Fourth column: split 40% top (text review), 60% bottom (image) */}
          <div className="h-[640px] rounded-[10px] overflow-hidden flex flex-col p-0 gap-2">
            <div
              className="relative rounded-[10px] border border-gray-200 p-3 flex flex-col overflow-hidden"
              style={{
                height: "260px",
                width: "calc(100% - 0.5rem)",
                marginLeft: "0.25rem",
                marginRight: "0.25rem",
              }}
            >
              <div
                className="absolute inset-0 bg-cover bg-center z-0 testimonial-faq-bg"
                style={{ backgroundImage: `url('${desktopGrid.col4.textCard.bg}')` }}
              />
              <div className="relative z-10">
                <p>&quot;{desktopGrid.col4.textCard.quote}&quot;</p>
                <br />
                <p className="p2 mt-4 mb-4">{desktopGrid.col4.textCard.author}</p>
              </div>
            </div>
            <div
              className="rounded-[10px] relative overflow-hidden"
              style={{
                height: "372px",
                width: "calc(100% - 0.5rem)",
                marginLeft: "0.25rem",
                marginRight: "0.25rem",
              }}
            >
              <Image
                src={desktopGrid.col4.bottomImage.src}
                alt={desktopGrid.col4.bottomImage.alt}
                fill
                className="object-cover object-bottom scale-100"
              />
            </div>
          </div>

          {/* Fifth column: split 50% image (top), 50% text (bottom) */}
          <div className="h-[640px] rounded-[10px] overflow-hidden flex flex-col p-0 gap-2">
            <div className="rounded-[10px] relative overflow-hidden" style={{ height: "316px" }}>
              <Image
                src={desktopGrid.col5.topImage.src}
                alt={desktopGrid.col5.topImage.alt}
                fill
                className="object-cover object-center scale-100"
              />
            </div>
            <div className="relative rounded-[10px] border border-gray-200 p-3 flex flex-col overflow-hidden" style={{ height: "316px" }}>
              <div
                className="absolute inset-0 bg-cover bg-center z-0 testimonial-faq-bg"
                style={{ backgroundImage: `url('${desktopGrid.col5.textCard.bg}')` }}
              />
              <div className="relative z-10">
                <p>&quot;{desktopGrid.col5.textCard.quote}&quot;</p>
                <br />
                <p className="p2 mt-4 mb-4">{desktopGrid.col5.textCard.author}</p>
              </div>
            </div>
          </div>
        </div>


        {/* Mobile + Tablet + Small laptop: Horizontal photo carousel */}
        <div className="block xl:hidden w-full mt-6">
          {useMobileMarquee ? (
            <div
              className="testimonials-mobile-marquee-wrapper"
              onTouchStart={handleMarqueeInteractionStart}
              onTouchEnd={handleMarqueeInteractionEnd}
              onTouchCancel={handleMarqueeInteractionEnd}
              onPointerDown={handleMarqueeInteractionStart}
              onPointerUp={handleMarqueeInteractionEnd}
              onPointerCancel={handleMarqueeInteractionEnd}
              onScroll={handleMarqueeScroll}
            >
              <div className={`testimonials-mobile-marquee ${isMobileMarqueePaused ? 'paused' : ''}`}>
                {infinitePhotos.map((photo, index) => {
                  const isVideoCard = photo.type === "video";
                  const cardWidth = isVideoCard ? 'clamp(200px, 72vw, 300px)' : 'clamp(240px, 92vw, 360px)';
                  return (
                    <div
                      key={`${photo.src}-${index}`}
                      className="flex-shrink-0 flex justify-center"
                      style={{ width: cardWidth, scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
                    >
                      <div
                        className="w-full px-3 testimonials-card-content"
                        style={{
                          boxSizing: 'border-box',
                          maxWidth: cardWidth
                        }}
                      >
                        {isVideoCard ? (
                          <div
                            ref={(el) => {
                              if (isYouTubeUrl(photo.src)) {
                                videoCardRefs.current[`mobile-${index}`] = el;
                                if (el) el.setAttribute('data-video-index', index.toString());
                              }
                            }}
                            className="relative h-[360px] rounded-[10px] overflow-hidden bg-black mx-auto"
                            style={{
                              minHeight: '360px',
                              maxHeight: '360px',
                              width: '100%'
                            }}
                          >
                            {isYouTubeUrl(photo.src) ? (
                              visibleVideoIndex === index && getYouTubeEmbedUrl(photo.src, isMuted, true) ? (
                                <div className="youtube-embed-wrapper relative w-full h-full overflow-hidden rounded-[10px]">
                                  <iframe
                                    key={`youtube-${index}-active`}
                                    ref={(el) => { mobileYouTubeIframeRefs.current[index] = el; }}
                                    src={getYouTubeEmbedUrl(photo.src, isMuted, true)}
                                    className="absolute inset-0 w-full h-full rounded-[10px]"
                                    title={`testimonial-video-${index}`}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen={false}
                                    frameBorder="0"
                                    style={{ pointerEvents: 'none' }}
                                  />
                                </div>
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-black rounded-[10px]">
                                  <img
                                    src={getYouTubeThumbnailUrl(photo.src) || '/logo.png'}
                                    alt={photo.alt || "Testimonial video"}
                                    className="absolute inset-0 w-full h-full object-cover rounded-[10px]"
                                    onError={(e) => {
                                      // Fallback if thumbnail fails to load
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors rounded-[10px]">
                                    <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
                                      <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z"/>
                                      </svg>
                                    </div>
                                  </div>
                                </div>
                              )
                            ) : photo.src.includes('supabase.co') ? (
                              <video
                                className="absolute inset-0 w-full h-full object-cover rounded-[10px]"
                                autoPlay
                                loop
                                playsInline
                                muted={isMuted}
                                style={{ 
                                  pointerEvents: 'none',
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover'
                                }}
                              >
                                <source src={photo.src} type="video/webm" />
                              </video>
                            ) : null}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    toggleMute();
                                  }}
                                  className="absolute bottom-4 right-4 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 active:bg-black/90 flex items-center justify-center transition-colors"
                                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                                  style={{ pointerEvents: 'auto', touchAction: 'manipulation' }}
                                >
                                  {isMuted ? (
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                    </svg>
                                  ) : (
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                    </svg>
                                  )}
                                </button>
                          </div>
                        ) : photo.type === "text" ? (
                          <div className="relative w-full h-[360px] rounded-[10px] overflow-hidden border border-gray-200 mx-auto" style={{ minHeight: '360px', maxHeight: '360px', width: '100%' }}>
                            <div
                              className="z-0"
                              style={{ 
                                background: photo.gradient || `linear-gradient(135deg, #F5F5F5 0%, #E5E5E5 100%)`,
                                position: 'absolute',
                                inset: 0
                              }}
                            />
                            <div className="relative z-10 h-full flex flex-col justify-between p-4 md:p-6">
                              <p className="text-[15px] leading-relaxed text-gray-900" style={{ lineHeight: '1.6' }}>
                                "{photo.text}"
                              </p>
                              <p className="p2 mt-4 mb-4 text-xs text-gray-600 font-medium">
                                {photo.author}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="relative w-full h-[360px] rounded-[10px] overflow-hidden mx-auto" style={{ minHeight: '360px', maxHeight: '360px', width: '100%' }}>
                            <Image 
                              src={photo.src} 
                              alt={photo.alt} 
                              fill 
                              className="object-cover" 
                              sizes="(max-width: 768px) calc(100vw - 96px), (max-width: 1024px) calc(100vw - 144px), 1200px"
                              loading="lazy"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
          <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            className="relative overflow-x-auto overflow-y-hidden carousel-scroll snap-x snap-mandatory testimonials-infinite-carousel"
            style={{ 
              scrollSnapType: 'x mandatory', 
              width: '100%',
              scrollBehavior: 'smooth',
              WebkitOverflowScrolling: 'touch',
              overscrollBehaviorX: 'contain'
            }}
          >
            <div className="flex pb-4 testimonials-carousel-track" style={{ gap: 0, width: '100%' }}>
                {infinitePhotos.map((photo, index) => {
                  const isVideoCard = photo.type === "video";
                  return (
                <div 
                  key={`${photo.src}-${index}`}
                      className="flex-shrink-0 snap-start testimonials-carousel-card flex justify-center"
                  style={{ width: '100%', minWidth: '100%', maxWidth: '100%' }}
                >
                      <div
                        className="w-full px-4 md:px-6 testimonials-card-content"
                        style={{
                          paddingLeft: isVideoCard ? 'clamp(12px, 6vw, 32px)' : 'clamp(24px, 10vw, 48px)',
                          paddingRight: isVideoCard ? 'clamp(12px, 6vw, 32px)' : 'clamp(24px, 10vw, 48px)',
                          boxSizing: 'border-box'
                        }}
                      >
                        {isVideoCard ? (
                          <div
                            ref={(el) => {
                              if (isYouTubeUrl(photo.src)) {
                                videoCardRefs.current[`desktop-${index}`] = el;
                                if (el) el.setAttribute('data-video-index', index.toString());
                              }
                            }}
                            className="relative h-[360px] rounded-[10px] overflow-hidden bg-black mx-auto"
                            style={{
                              minHeight: '360px',
                              maxHeight: '360px',
                              width: 'clamp(200px, 72vw, 300px)'
                            }}
                          >
                            {isYouTubeUrl(photo.src) ? (
                              visibleVideoIndex === index && getYouTubeEmbedUrl(photo.src, isMuted, true) ? (
                              <div className="youtube-embed-wrapper relative w-full h-full overflow-hidden rounded-[10px]">
                                <iframe
                                    key={`youtube-${index}-active`}
                                    ref={(el) => { mobileYouTubeIframeRefs.current[index] = el; }}
                                  src={getYouTubeEmbedUrl(photo.src, isMuted, true)}
                                  className="absolute inset-0 w-full h-full rounded-[10px]"
                                  title={`testimonial-video-${index}`}
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen={false}
                                  frameBorder="0"
                                  style={{ pointerEvents: 'none' }}
                                />
                              </div>
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-black rounded-[10px]">
                                  <img
                                    src={getYouTubeThumbnailUrl(photo.src) || '/logo.png'}
                                    alt={photo.alt || "Testimonial video"}
                                    className="absolute inset-0 w-full h-full object-cover rounded-[10px]"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors rounded-[10px]">
                                    <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
                                      <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z"/>
                                      </svg>
                                    </div>
                                  </div>
                                </div>
                              )
                            ) : photo.src.includes('supabase.co') ? (
                              <video
                                className="absolute inset-0 w-full h-full object-cover rounded-[10px]"
                                autoPlay
                                loop
                                playsInline
                                muted={isMuted}
                                style={{ 
                                  pointerEvents: 'none',
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover'
                                }}
                              >
                                <source src={photo.src} type="video/webm" />
                              </video>
                            ) : null}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                toggleMute();
                              }}
                              onTouchStart={(e) => {
                                e.stopPropagation();
                              }}
                              className="absolute bottom-4 right-4 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 active:bg-black/90 flex items-center justify-center transition-colors"
                              aria-label={isMuted ? 'Unmute' : 'Mute'}
                              style={{ pointerEvents: 'auto', touchAction: 'manipulation' }}
                            >
                              {isMuted ? (
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                </svg>
                              )}
                            </button>
                      </div>
                    ) : photo.type === "text" ? (
                      <div className="relative w-full h-[360px] rounded-[10px] overflow-hidden border border-gray-200 mx-auto" style={{ minHeight: '360px', maxHeight: '360px', width: '100%' }}>
                        <div
                          className="z-0"
                          style={{ 
                            background: photo.gradient || `linear-gradient(135deg, #F5F5F5 0%, #E5E5E5 100%)`,
                            position: 'absolute',
                            inset: 0
                          }}
                        />
                        <div className="relative z-10 h-full flex flex-col justify-between p-4 md:p-6">
                          <p className="text-[15px] leading-relaxed text-gray-900" style={{ lineHeight: '1.6' }}>
                            "{photo.text}"
                          </p>
                          <p className="p2 mt-4 mb-4 text-xs text-gray-600 font-medium">
                            {photo.author}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="relative w-full h-[360px] rounded-[10px] overflow-hidden mx-auto" style={{ minHeight: '360px', maxHeight: '360px', width: '100%' }}>
                    <Image 
                      src={photo.src} 
                      alt={photo.alt} 
                      fill 
                      className="object-cover" 
                          sizes="(max-width: 768px) calc(100vw - 96px), (max-width: 1024px) calc(100vw - 144px), 1200px"
                          loading="lazy"
                    />
                      </div>
                    )}
                  </div>
                </div>
                  );
                })}
            </div>
          </div>
          )}
        </div>

      </div>
    </section>
  );
}

function QuoteCard({ quote, by, tone = "mint", className = "" }) {
  const toneClasses = {
    mint: "bg-[#E6F5EC] text-gray-900",
    lavender: "bg-[#f2fff1] text-gray-900",
    peach: "bg-[#FFF0E1] text-gray-900",
  };
  return (
    <div className={`rounded-2xl p-6 md:p-7 border border-gray-200 ${toneClasses[tone]} ${className}`}>
      <p>"{quote}"</p>
      <br />
      <p className="p2 mt-4 mb-4">
        {by}
      </p>
    </div>
  );
}

function PlayImage({ src, alt, className = "" }) {
  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
      <Image src={src} alt={alt} fill className="object-cover" sizes="(min-width: 1024px) 25vw, 50vw" />
      <button
        aria-label="Play testimonial"
        className="absolute left-4 bottom-4 h-10 w-10 md:h-12 md:w-12 grid place-items-center rounded-full bg-white/90 shadow-md hover:bg-white transition"
      >
        <PlayIcon className="h-5 w-5 md:h-6 md:w-6 text-gray-900" />
      </button>
    </div>
  );
}

function ImageTile({ src, alt, className = "" }) {
  const hasFullHeight = className?.includes('h-full');
  const aspectClass = hasFullHeight ? '' : 'aspect-[4/3]';
  return (
    <div className={`relative w-full ${aspectClass} overflow-hidden rounded-2xl ${className}`}>
      <Image src={src} alt={alt} fill className="object-cover" sizes="(min-width: 1024px) 20vw, 50vw" />
    </div>
  );
}

function PlayIcon({ className = "h-6 w-6" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M8 5.14v13.72c0 .79.86 1.28 1.54.86l10.37-6.86a1 1 0 000-1.72L9.54 4.28A1 1 0 008 5.14z" />
    </svg>
  );
}

