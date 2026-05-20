"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { normalizeImageUrlWithSize } from '@/utils/urlNormalizer';

export default function TherapistCarousel({ therapists = [] }) {
  const containerRef = useRef(null);
  const [current, setCurrent] = useState(0);
  const autoplayRef = useRef(null);
  const touchStartRef = useRef(null);
  const touchEndRef = useRef(null);
  const isPausedRef = useRef(false);

  // Sync dots with scroll position
  const handleScroll = () => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    // width minus 16px accounts for gap-4
    const cardWidth = el.firstChild ? el.firstChild.getBoundingClientRect().width : 320;
    const gap = 16;
    const total = cardWidth + gap;
    const idx = Math.round(el.scrollLeft / total);
    setCurrent(Math.max(0, Math.min(idx, therapists.length - 1)));
  };

  const scrollTo = (index) => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const cardWidth = el.firstChild ? el.firstChild.getBoundingClientRect().width : 320;
    const gap = 16;
    const total = cardWidth + gap;
    el.scrollTo({ left: index * total, behavior: "smooth" });
    setCurrent(index);
  };

  // Autoplay functionality
  useEffect(() => {
    if (therapists.length === 0) return;
    
    const startAutoplay = () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
      
      autoplayRef.current = setInterval(() => {
        if (!isPausedRef.current && containerRef.current) {
          const el = containerRef.current;
          const cardWidth = el.firstChild ? el.firstChild.getBoundingClientRect().width : 320;
          const gap = 16;
          const total = cardWidth + gap;
          
          setCurrent((prev) => {
            const next = (prev + 1) % therapists.length;
            el.scrollTo({ left: next * total, behavior: "smooth" });
            return next;
          });
        }
      }, 5000); // 5 seconds delay
    };

    startAutoplay();
    
    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
    };
  }, [therapists.length]);

  // Touch handlers for pause on touch and hold
  const handleTouchStart = (e) => {
    touchStartRef.current = Date.now();
    isPausedRef.current = true;
  };

  const handleTouchEnd = () => {
    touchEndRef.current = Date.now();
    // If touch was held for more than 200ms, keep paused
    if (touchStartRef.current && touchEndRef.current - touchStartRef.current > 200) {
      setTimeout(() => {
        isPausedRef.current = false;
      }, 1000); // Resume after 1 second
    } else {
      isPausedRef.current = false;
    }
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="md:hidden w-full therapist-carousel-wrapper">
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 767px) {
          .therapist-carousel-wrapper {
            width: 100% !important;
            max-width: 100% !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          .therapist-cards-stack {
            display: flex !important;
            flex-direction: column !important;
            gap: 1rem !important;
            overflow: visible !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          .therapist-card-item {
            width: 95% !important;
            max-width: 95% !important;
            flex-shrink: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }
        }
      `}} />
      <div
        className="therapist-cards-stack"
      >
        {therapists.map((doc, idx) => {
          const imageSrc = normalizeImageUrlWithSize(
            doc.cover_image_url || doc.profile_picture_url || '/logo.png',
            400,
            80
          );
          const name = doc.name || doc.first_name || 'Therapist';
          // Create slug from doctor name
          const nameSlug = name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
          if (!nameSlug) return null; // Skip if no valid name
          return (
            <a 
              key={idx} 
              href={`/online-child-psychologist/${nameSlug}`} 
              className="therapist-card-item block"
            >
              <div className="guide-video-card h-[380px] w-full rounded-[10px] overflow-hidden border border-gray-200 bg-white shadow-sm cursor-pointer relative">
                <Image
                  src={imageSrc}
                  alt={name}
                  fill
                  sizes="(max-width: 768px) 100vw, 400px"
                  style={{ 
                    objectFit: 'cover',
                    aspectRatio: '400/380'
                  }}
                  priority={false}
                />
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '55%',
              background:
                'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0.2) 75%, rgba(0,0,0,0) 100%)'
            }}
          />
                <div style={{ position: 'absolute', left: 18, bottom: 18, zIndex: 2, display: 'flex', flexDirection: 'column', gap: 6, width: '85%' }}>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.05rem', textShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>{name}</div>
                  {/* Expertise bubbles */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                    {/* Specialization chips first */}
                    {(doc.area_of_expertise && Array.isArray(doc.area_of_expertise) && doc.area_of_expertise.length > 0 ? doc.area_of_expertise.slice(0, 1) : ['Child Therapy']).map((exp, i) => (
                      <span key={i} style={{ background: 'rgba(255,255,255,0.22)', color: '#fff', borderRadius: 16, padding: '0.18em 0.5em', fontWeight: 400, fontSize: '0.9rem', boxShadow: '0 2px 8px rgba(0,0,0,0.10)', backdropFilter: 'blur(0.5px)', WebkitBackdropFilter: 'blur(0.5px)', border: '1.5px solid rgba(255,255,255,0.18)' }}>{exp}</span>
                    ))}
                    {/* Price chip (matches specialization chip style) */}
                    <span style={{ background: 'rgba(255,255,255,0.22)', color: '#fff', borderRadius: 16, padding: '0.18em 0.5em', fontWeight: 400, fontSize: '0.9rem', boxShadow: '0 2px 8px rgba(0,0,0,0.10)', backdropFilter: 'blur(0.5px)', WebkitBackdropFilter: 'blur(0.5px)', border: '1.5px solid rgba(255,255,255,0.18)' }}>{doc.price ? `₹${doc.price}` : (doc.individual_session_price ? `₹${doc.individual_session_price}` : '₹—')}</span>
                    {/* Experience chip */}
                    <span style={{
                      background: 'rgba(255,255,255,0.22)',
                      color: '#fff',
                      borderRadius: 16,
                      padding: '0.18em 0.5em',
                      fontWeight: 400,
                      fontSize: '0.9rem',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                      backdropFilter: 'blur(0.5px)',
                      WebkitBackdropFilter: 'blur(0.5px)',
                      border: '1.5px solid rgba(255,255,255,0.18)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6
                    }}>
                      <span role="img" aria-label="experience" style={{ fontSize: 14, lineHeight: 1 }}>⚡️</span>
                      {`${(doc.experience_years || 3)}+ yrs Experience`}
                    </span>
                    {/* Designation chip (same as online-child-psychologist, with book emoji) */}
                    {doc.designation || doc.specialization ? (
                      <span style={{
                        background: 'rgba(255,255,255,0.22)',
                        color: '#fff',
                        borderRadius: 16,
                        padding: '0.18em 0.5em',
                        fontWeight: 400,
                        fontSize: '0.9rem',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                        backdropFilter: 'blur(0.5px)',
                        WebkitBackdropFilter: 'blur(0.5px)',
                        border: '1.5px solid rgba(255,255,255,0.18)'
                      }}>📚 {doc.designation || doc.specialization}</span>
                    ) : null}
                  </div>
                </div>
              </div>
            </a>
          );
        })}

        {/* View more link under last card */}
        <a 
          href="/online-child-psychologist" 
          className="therapist-card-item block mt-2"
        >
          <div className="w-full py-4 text-center">
            <span className="text-gray-900 text-lg font-medium group cursor-pointer inline-flex items-center gap-2">
              View more
              <span className="text-gray-600">→</span>
                <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-gray-900 transition-all duration-300 ease-out group-hover:w-full" />
              </span>
          </div>
        </a>
      </div>
    </div>
  );
}


