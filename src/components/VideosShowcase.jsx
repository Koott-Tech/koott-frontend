"use client";

import { normalizeImageUrl } from '@/utils/urlNormalizer';

import { useState, useRef, useEffect, useCallback } from 'react';

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

// Helper function to convert YouTube URL to embed URL
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

export default function VideosShowcase({ cmsData = null }) {
  const defaultVideos = [
    { src: "/intro_2.mp4", poster: "/testimonialgirl.png" },
    { src: "/intro_2.mp4", poster: "/testimonial5.PNG" },
    { src: "/intro_2.mp4", poster: "/TESTIMONIALS 4.webp" },
  ];
  const videos = (cmsData?.videos && cmsData.videos.length) ? cmsData.videos : defaultVideos;
  
  // Sort videos by position if provided, otherwise keep original order
  const sortedVideos = [...videos].sort((a, b) => {
    const posA = typeof a.position === 'number' ? a.position : 999;
    const posB = typeof b.position === 'number' ? b.position : 999;
    return posA - posB;
  });
  
  // Build display list of 5 slots, allow per-video position (0..4). Fallback to simple spread.
  let displayVideos = new Array(5);
  sortedVideos.forEach((v) => {
    if (v && typeof v.position === 'number' && v.position >= 0 && v.position <= 4) {
      displayVideos[v.position] = v;
    }
  });
  // Fill gaps with available videos in order
  let fillIdx = 0;
  for (let i = 0; i < 5; i++) {
    if (!displayVideos[i]) {
      displayVideos[i] = sortedVideos[fillIdx % sortedVideos.length];
      fillIdx++;
    }
  }
  
  // Initialize playingVideo - default to center (2), will be adjusted on mount for mobile
  const [playingVideo, setPlayingVideo] = useState(typeof cmsData?.featuredIndex === 'number' ? cmsData.featuredIndex : 2);
  const [isMuted, setIsMuted] = useState(true); // Start muted
  const videoRefs = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)];
  const youtubeIframeRefs = useRef([]);
  const scrollerRef = useRef(null);
  const hasAutoPlayedRef = useRef(false);

  const handleVideoClick = (index) => {
    const videoUrl = displayVideos[index]?.url || displayVideos[index]?.src;
    
    // If it's a YouTube URL, just set it as playing (iframe handles it)
    if (isYouTubeUrl(videoUrl)) {
      setPlayingVideo(index);
      return;
    }
    
    // For regular video elements, handle play/pause
    // Pause currently playing video
    if (playingVideo !== null && videoRefs[playingVideo].current) {
      const currentVideo = videoRefs[playingVideo].current;
      if (currentVideo && typeof currentVideo.pause === 'function') {
        currentVideo.pause().catch(() => {});
      }
    }
    
    // Play clicked video
    if (videoRefs[index].current) {
      const video = videoRefs[index].current;
      if (video && typeof video.play === 'function') {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setPlayingVideo(index);
            })
            .catch((error) => {
              // Handle play error silently
              // Video play prevented - non-critical error
            });
        } else {
          setPlayingVideo(index);
        }
      }
    }
  };

  // Auto-play video based on screen size: first video (0) on mobile, center video (2) on desktop
  useEffect(() => {
    if (hasAutoPlayedRef.current) return;
    
    // Detect if mobile view
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const autoPlayIndex = isMobile ? 0 : 2; // First video on mobile, center on desktop
    
    // Set the playing video state first
    setPlayingVideo(autoPlayIndex);
    
    const videoUrl = displayVideos[autoPlayIndex]?.url || displayVideos[autoPlayIndex]?.src;
    
    if (!videoUrl) return;
    
    hasAutoPlayedRef.current = true;
    
    // Auto-play video if it's not YouTube
    if (!isYouTubeUrl(videoUrl)) {
      // Wait a bit for video element to be ready
      const timer = setTimeout(() => {
        if (videoRefs[autoPlayIndex].current) {
          const video = videoRefs[autoPlayIndex].current;
          video.muted = true;
          video.loop = true; // Ensure loop is enabled
          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => {
              // Silently handle play errors
            });
          }
        }
      }, 200); // Increased timeout to ensure element is ready
      return () => clearTimeout(timer);
    }
    // For YouTube videos, setPlayingVideo is already called above, iframe handles autoplay with loop via getYouTubeEmbedUrl
  }, [displayVideos]);

  // When a video is selected to play, auto-play it once mounted; pause others
  useEffect(() => {
    [0,1,2,3,4].forEach((i) => {
      const ref = videoRefs[i].current;
      if (!ref) return;
      
      const videoUrl = displayVideos[i]?.url || displayVideos[i]?.src;
      // Skip YouTube videos (handled by iframe)
      if (isYouTubeUrl(videoUrl)) return;
      
      try {
        if (i === playingVideo) {
          // Set muted state and ensure loop is enabled (especially for center video on desktop)
          ref.muted = isMuted;
          ref.loop = true; // Ensure loop is enabled
          const playPromise = ref.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => {
              // Silently handle play errors
            });
          }
        } else {
          ref.pause().catch(() => {
            // Silently handle pause errors
          });
        }
      } catch (_) {
        // Silently handle errors
      }
    });
  }, [playingVideo, isMuted]);
  
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const sendYouTubeCommand = useCallback((iframe, command) => {
    if (!iframe || !iframe.contentWindow) return;
    iframe.contentWindow.postMessage(JSON.stringify({
      event: 'command',
      func: command,
      args: []
    }), '*');
  }, []);

  useEffect(() => {
    if (playingVideo == null) return;
    const videoUrl = displayVideos[playingVideo]?.url || displayVideos[playingVideo]?.src;
    if (!isYouTubeUrl(videoUrl)) return;
    const iframe = youtubeIframeRefs.current[playingVideo];
    if (!iframe) return;
    sendYouTubeCommand(iframe, isMuted ? 'mute' : 'unMute');
  }, [isMuted, playingVideo, displayVideos, sendYouTubeCommand]);

  useEffect(() => {
    [0, 1, 2, 3, 4].forEach((i) => {
      const videoUrl = displayVideos[i]?.url || displayVideos[i]?.src;
      if (!isYouTubeUrl(videoUrl)) return;
      const iframe = youtubeIframeRefs.current[i];
      if (!iframe) return;
      if (playingVideo === i) {
        sendYouTubeCommand(iframe, 'playVideo');
      } else {
        sendYouTubeCommand(iframe, 'pauseVideo');
      }
    });
  }, [playingVideo, displayVideos, sendYouTubeCommand]);

  const scrollByCard = (direction = 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector('[data-video-card]');
    const cardWidth = card ? card.getBoundingClientRect().width : 320;
    el.scrollBy({ left: direction * (cardWidth + 16), behavior: 'smooth' });
  };

  return (
    <section className="w-full pb-6 md:pb-8 videos-showcase-mobile">
      <style jsx global>{`
        @media (max-width: 767px) {
          section.videos-showcase-mobile {
            margin-top: -0.75rem;
            padding-top: 1rem;
            padding-bottom: 2rem;
          }
          .videos-carousel-container {
            padding-left: 0;
            padding-right: 0;
          }
          .videos-carousel-gap {
            gap: 20px;
            padding-left: 5vw;
            padding-right: 0;
          }
          .video-card {
            width: 85vw;
            height: calc(85vw * 16 / 9);
            max-width: 300px;
            max-height: calc(300px * 16 / 9);
            min-width: 280px;
            min-height: calc(280px * 16 / 9);
          }
        }
        @media (min-width: 768px) {
          section.videos-showcase-mobile {
            margin-top: 96px;
            padding-top: 4rem;
          }
        }
        @media (min-width: 768px) and (max-width: 1180px) and (max-height: 1180px) {
          section.videos-showcase-mobile {
            margin-top: 7rem;
            padding-top: 2rem;
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
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }
        /* Hide YouTube logo overlay using pseudo-element */
        .youtube-embed-wrapper::after,
        .youtube-embed-wrapper::before {
          display: none;
        }
        @media (max-width: 1180px) and (max-height: 1180px) {
          .videos-carousel-container {
            width: 100vw !important;
            max-width: 100vw !important;
            margin-left: calc(50% - 50vw) !important;
            margin-right: calc(50% - 50vw) !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
        }
        @media (min-width: 1024px) and (max-width: 1279px) {
          .video-card-outer {
            width: clamp(152px, 10.8vw, 191px) !important;
            height: clamp(270px, 18vw, 340px) !important;
          }
          .video-card-middle {
            width: clamp(169px, 12vw, 214px) !important;
            height: clamp(300px, 21vw, 380px) !important;
          }
          .video-card-center {
            width: clamp(203px, 14.4vw, 259px) !important;
            height: clamp(360px, 27vw, 460px) !important;
          }
          .videos-carousel-gap {
            gap: clamp(12px, 1.5vw, 24px) !important;
          }
        }
        .video-overlay {
          background-color: transparent;
          transition: background-color 0.2s ease;
        }
        .video-card:hover .video-overlay,
        .video-card:focus-within .video-overlay,
        .video-card:active .video-overlay {
          background-color: transparent;
        }
      `}</style>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="px-4 sm:px-6 mb-10 md:mb-14 text-center">
          {cmsData?.videosSubheading && (
            <p className="text-center md:text-center mt-2 text-sm md:text-base">
              {cmsData.videosSubheading}
            </p>
          )}
          <div className="mt-3 text-center md:text-center px-4">
            <h2 className="how-it-works-heading text-center text-lg sm:text-xl md:text-2xl lg:text-3xl" style={{ fontWeight: 600, lineHeight: '1.1' }}>
              {cmsData?.videosHeading || 'See More of What We Do'}
            </h2>
          </div>
          </div>
        </div>

      {/* Carousel controls (desktop) - Outside padded container for edge-to-edge */}
      <div className="relative videos-carousel-container">
          <button
            type="button"
            aria-label="Previous"
            onClick={() => scrollByCard(-1)}
            className="hidden md:hidden absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center rounded-full bg-white/90 border border-gray-200 shadow hover:bg-white"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>

          <div
            ref={scrollerRef}
            className="flex gap-4 sm:gap-5 lg:gap-8 videos-carousel-gap overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar lg:overflow-visible lg:snap-none lg:justify-center lg:items-center"
            style={{ paddingLeft: '0', paddingRight: '0' }}
          >
            {[0,1,2,3,4].map((i) => {
              return (
              <div key={i} className="flex-shrink-0 snap-center" style={{ 
                paddingLeft: i === 0 ? 'clamp(16px, 5vw, 32px)' : '0', 
                paddingRight: i === 4 ? 'clamp(16px, 5vw, 32px)' : '0'
              }}>
                <div
                  data-video-card
                  className={`video-card relative rounded-[14px] overflow-hidden bg-white cursor-pointer group
                    ${'w-[158px] h-[280px] sm:w-[180px] sm:h-[320px]'}
                    ${i === 2 
                      ? 'lg:w-[259px] lg:h-[460px] video-card-center' 
                      : (i === 0 || i === 4) 
                        ? 'lg:w-[191px] lg:h-[340px] video-card-outer'
                        : 'lg:w-[214px] lg:h-[380px] video-card-middle'}
                  `}
                  onClick={() => handleVideoClick(i)}
                >
                  {(() => {
                    const videoUrl = displayVideos[i]?.url || displayVideos[i]?.src;
                    const thumbnailUrl = normalizeImageUrl(displayVideos[i]?.thumbnailUrl || displayVideos[i]?.poster || '');
                    const isYouTube = isYouTubeUrl(videoUrl);
                    const embedUrl = isYouTube ? getYouTubeEmbedUrl(videoUrl, isMuted, playingVideo === i) : null;
                    const youtubeThumb = isYouTube ? getYouTubeThumbnailUrl(videoUrl) : null;
                    
                    if (isYouTube && embedUrl) {
                      // Render YouTube iframe only when active to avoid duplicate audio
                      return playingVideo === i ? (
                            <div className="youtube-embed-wrapper relative w-full h-full overflow-hidden">
                              <iframe
                            key={`youtube-${i}-active`}
                              ref={(el) => { youtubeIframeRefs.current[i] = el; }}
                                src={embedUrl}
                            className="absolute inset-0 w-full h-full"
                            title={`video-review-${i}`}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen={false}
                                frameBorder="0"
                            style={{ 
                              pointerEvents: 'none'
                            }}
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
                            <div className="absolute inset-0 w-full h-full overflow-hidden">
                              <img
                                src={thumbnailUrl || youtubeThumb || '/logo.png'}
                                alt={displayVideos[i]?.title ? `${displayVideos[i].title} - Video review thumbnail` : 'Child counseling video review thumbnail'}
                                className="absolute inset-0 w-full h-full object-cover"
                                style={{ 
                                  width: '100%', 
                                  height: '100%'
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center video-overlay">
                                <svg className="w-14 h-14 text-white drop-shadow-lg opacity-95" viewBox="0 0 24 24">
                                  <path
                                    d="M9 6.75c0-.832.905-1.346 1.606-.905l7.01 4.33c.702.433.702 1.377 0 1.81l-7.01 4.33c-.701.441-1.606-.073-1.606-.905v-8.66z"
                                    fill="currentColor"
                                  />
                                </svg>
                              </div>
                            </div>
                      );
                    } else {
                      // Render regular video element
                      return (
                        <>
                          <video
                            ref={videoRefs[i]}
                            src={videoUrl}
                            poster={thumbnailUrl}
                            preload="auto"
                            loop
                            muted={isMuted}
                            playsInline
                            className={`w-full h-full object-cover transition-opacity duration-200 ${playingVideo === i ? 'opacity-100' : 'opacity-0'}`}
                            style={playingVideo === i ? {
                              position: 'absolute'
                            } : {}}
                          />
                          {playingVideo === i && (
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
                          )}
                          {playingVideo !== i && (
                            <div className="absolute inset-0 w-full h-full overflow-hidden">
                              <img
                                src={thumbnailUrl || '/logo.png'}
                                alt={displayVideos[i]?.title ? `${displayVideos[i].title} - Video review thumbnail` : 'Child counseling video review thumbnail'}
                                className="absolute inset-0 w-full h-full object-cover"
                                style={{ 
                                  width: '100%', 
                                  height: '100%'
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center video-overlay">
                                <svg className="w-14 h-14 text-white drop-shadow-lg opacity-95" viewBox="0 0 24 24">
                                  <path
                                    d="M9 6.75c0-.832.905-1.346 1.606-.905l7.01 4.33c.702.433.702 1.377 0 1.81l-7.01 4.33c-.701.441-1.606-.073-1.606-.905v-8.66z"
                                    fill="currentColor"
                                  />
                                </svg>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    }
                  })()}
                </div>
              </div>
            )})}
          </div>

          <button
            type="button"
            aria-label="Next"
            onClick={() => scrollByCard(1)}
            className="hidden md:hidden absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center rounded-full bg-white/90 border border-gray-200 shadow hover:bg-white"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
      </div>
    </section>
  );
}


