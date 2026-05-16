"use client";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

export default function SupportFaq() {
  const items = [
    {
      title: "Care that feels safe",
      body:
        "Every child deserves a space where their feelings are seen and understood. Our child psychologists create a gentle, non-judgmental environment where kids can open up freely and feel supported.",
      image: "/mainlogo.webp",
    },
    {
      title: "Guidance parents can trust",
      body:
        "We support parents with clear communication, practical tools, and expert guidance—so you never feel alone in understanding your child's emotions or navigating their well-being.",
      image: "/mainlogo.webp",
    },
    {
      title: "Expertise made simple",
      body:
        "Our licensed child psychologists bring evidence-based care right to your home. Sessions are easy to access, child-friendly, and tailored to match your child's unique needs.",
      image: "/mainlogo.webp",
    },
    {
      title: "Support at every stage",
      body:
        "Whether it's early emotional struggles, learning challenges, behaviour changes, or big life transitions, our child counseling services are here to guide your family—one steady step at a time.",
      image: "/mainlogo.webp",
    },
  ];

  const [active, setActive] = useState(0);
  const [imageMounted, setImageMounted] = useState(true);
  const [currentSrc, setCurrentSrc] = useState('/ourpromise1.webp');
  const [prevSrc, setPrevSrc] = useState(null);
  const [isImageTransitioning, setIsImageTransitioning] = useState(false);

  const gradients = [
    "linear-gradient(180deg, #f5f3ff 0%, #ede9fe 50%, #ffffff 100%)",
    "linear-gradient(180deg, #ecfdf5 0%, #d1fae5 50%, #ffffff 100%)",
    "linear-gradient(180deg, #fff7ed 0%, #ffedd5 50%, #ffffff 100%)",
    "linear-gradient(180deg, #ecfeff 0%, #cffafe 50%, #ffffff 100%)",
  ];

  function toggle(idx) {
    setActive((prev) => (prev === idx ? -1 : idx));
  }

  const resolvedSrcByIndex = useMemo(() => ({
    0: '/ourpromise1.webp',
    1: '/Our promise 2.webp',
    2: '/Our promise 3.webp',
    3: '/Our promise 4.webp',
  }), []);

  useEffect(() => {
    // Determine new source based on active index
    const nextSrc = resolvedSrcByIndex[active] || (items[active]?.image || '/ourpromise1.webp');
    if (nextSrc !== currentSrc) {
      setPrevSrc(currentSrc);
      setIsImageTransitioning(true);
      // Small delay to ensure previous image is set before starting fade
      const delayTimer = setTimeout(() => {
        setCurrentSrc(nextSrc);
        // Complete transition after fade duration (increased to 1200ms for slower transition)
        const transitionTimer = setTimeout(() => {
        setIsImageTransitioning(false);
        setPrevSrc(null);
        }, 1200);
        return () => clearTimeout(transitionTimer);
      }, 50);
      return () => clearTimeout(delayTimer);
    }
  }, [active, currentSrc, items, resolvedSrcByIndex]);

  return (
    <section className="w-full flex items-center our-promise-section mt-16" style={{ height: 'auto' }}>
      <style jsx>{`
        .faq-background {
          height: 100%;
          min-height: calc(100% - 48px);
        }
        .faq-mobile-content {
          position: relative;
        }
        @media (max-width: 1180px) and (max-height: 1180px) {
          .faq-background {
            position: absolute;
            top: 0;
            left: 50%;
            width: 170%; /* stretch beyond container width */
            height: 100%;
            max-height: 100%;
            transform: translateX(-50%) rotate(90deg);
            transform-origin: center center;
            background-size: cover;
            background-position: center center;
          }
        }
        .our-promise-section {
          min-height: auto;
          height: auto;
          padding-top: 0;
          padding-bottom: 0;
          overflow: visible;
        }
        @media (min-width: 768px) and (max-width: 1180px) and (max-height: 1180px) {
          .our-promise-section {
            padding: 0 24px;
          }
          .our-promise-title {
            font-size: 22px;
            margin-bottom: 14px;
          }
          .our-promise-description {
            font-size: 15px;
            line-height: 1.5;
          }
          .faq-mobile-content h2 {
            font-size: 18px !important;
            font-weight: 500 !important;
            margin: 0 !important;
            line-height: 1.2 !important;
          }
          .faq-mobile-content p {
            font-size: 14px;
            line-height: 1.5;
          }
        }
        /* Landscape tablets (1180x810): reduce FAQ width */
        @media (min-width: 1024px) and (max-width: 1180px) and (max-height: 850px) {
          .our-promise-section > div {
            max-width: 700px;
            margin-left: auto;
            margin-right: auto;
          }
          .our-promise-section .xl\\:hidden {
            max-width: 100%;
          }
        }
        @media (max-width: 767px) {
          .our-promise-section {
            padding: 0 16px;
          }
          .our-promise-title {
            font-size: 18px;
            margin-bottom: 12px;
          }
          .our-promise-description {
            font-size: 14px;
            line-height: 1.4;
          }
          .faq-mobile-content h2 {
            font-size: 16px !important;
            font-weight: 500 !important;
            margin: 0 !important;
            line-height: 1.2 !important;
          }
          .faq-mobile-content p {
            font-size: 13px;
            line-height: 1.4;
          }
          h2.our-promise-title {
            font-size: 24px !important;
            font-weight: 600 !important;
            line-height: 1.1 !important;
            text-align: center;
            padding-left: 0;
            padding-right: 0;
          }
        }
        /* Override h3 FAQ titles for desktop to match original h6 size */
        .support-faq-title {
          font-size: 16px !important;
          font-weight: 500 !important;
          margin: 0 !important;
          line-height: 1.2 !important;
        }
        .our-promise-grid {
          height: 600px;
          min-height: 600px;
          max-height: 600px;
        }
        .left-side-image-container {
          transition: opacity 0.3s ease-in-out;
          transform: none;
          height: 500px;
          min-height: 500px;
          max-height: 500px;
          flex-shrink: 0;
          flex-grow: 0;
          overflow: hidden;
          border-radius: 10px;
        }
        .left-side-image-container img {
          transition: opacity 0.3s ease-in-out;
          transform: none;
          animation: none;
          height: 500px;
          width: 100%;
          object-fit: contain;
          max-width: 100%;
          max-height: 500px;
          min-height: 500px;
          min-width: 100%;
          border-radius: 10px;
        }
        @media (min-width: 1280px) {
          .our-promise-section {
            min-height: clamp(520px, 60vh, 820px);
            height: clamp(520px, 60vh, 820px);
            padding-top: 0;
            padding-bottom: 0;
          }
        }
      `}</style>
      <div className="w-full mx-auto max-w-[1400px] px-3 sm:px-8 md:px-[50px]">
        <p className="text-center md:text-center text-sm md:text-base lg:text-lg font-normal text-gray-700 leading-tight mt-4 md:mt-6">Our promise</p>
        <div className="max-w-full md:max-w-4xl mx-auto px-4">
        <h2 className="our-promise-title text-center md:text-center mt-4 md:mt-2 mb-8 md:mb-16 text-base md:text-xl lg:text-2xl" style={{ fontSize: '24px', fontWeight: 600, lineHeight: '1.1' }}>
        Supporting You and Your Little One With Expert Child Counseling
        </h2>
        </div>

        {/* Desktop Layout: Image on left (55%), FAQ on right (45%) */}
        <div className="hidden xl:grid grid-cols-[55fr_45fr] gap-16 xl:gap-20 our-promise-grid " style={{ height: '600px' }}>
          {/* Left: Image with true crossfade between previous and next */}
            <div className="relative w-full left-side-image-container" style={{ height: '500px' }}>
              {prevSrc && (
              <img
                  src={prevSrc}
                  alt="Previous illustration of Koott's child counseling promise"
                  className={`absolute inset-0 w-full h-full object-contain rounded-[10px] transition-opacity duration-[1200ms] ease-in-out z-10 ${isImageTransitioning ? 'opacity-0' : 'opacity-100'}`}
                  style={{ width: '100%', height: '500px', objectFit: 'contain', borderRadius: '10px' }}
                />
              )}
              <img
                src={currentSrc}
                alt="Illustration highlighting Koott's child counseling promise"
                className={`relative w-full h-full object-contain rounded-[10px] transition-opacity duration-[1200ms] ease-in-out z-20 ${isImageTransitioning ? 'opacity-100' : 'opacity-100'}`}
                style={{ width: '100%', height: '500px', objectFit: 'contain', borderRadius: '10px' }}
              />
            </div>

          {/* Right: FAQ Accordion */}
          <div className="w-full" style={{ height: '500px' }}>
            <div className="rounded-2xl bg-white space-y-0 h-full max-h-full overflow-y-auto pr-2 shadow-none" style={{ padding: '4px' }}>
              {items.map((item, idx) => {
                const open = active === idx;
                const gradient = gradients[idx % gradients.length];
                return (
                  <div key={item.title} className={open ? 'my-1' : ''}>
                    <div className={`relative overflow-hidden hover:bg-white hover:shadow-none pb-1 ${idx < items.length - 1 && !open && active !== idx + 1 ? 'border-b border-gray-200 pb-2 rounded-none' : 'rounded-2xl'}`}>
                    {/* Background image for first FAQ when open */}
                    {idx === 0 && open && (
                      <div
                        className="absolute inset-0 bg-no-repeat rounded-2xl"
                        style={{ 
                          backgroundImage: "url('/Our promise bg1.webp')",
                          backgroundSize: '200%',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          width: '100%',
                          height: '100%',
                          borderRadius: '16px'
                        }}
                      />
                    )}
                    {/* Background image for second FAQ when open */}
                    {idx === 1 && open && (
                      <div
                        className="absolute inset-0 bg-no-repeat rounded-2xl"
                        style={{ 
                          backgroundImage: "url('/Our promise bg2.webp')",
                          backgroundSize: '140%',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          width: '100%',
                          height: '100%',
                          borderRadius: '16px'
                        }}
                      />
                    )}
                    {/* Background image for third FAQ when open */}
                    {idx === 2 && open && (
                      <div
                        className="absolute inset-0 bg-no-repeat rounded-2xl"
                        style={{ 
                          backgroundImage: "url('/Our promise bg3.webp')",
                          backgroundSize: '140%',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          width: '100%',
                          height: '100%',
                          borderRadius: '16px'
                        }}
                      />
                    )}
                    {/* Background image for fourth FAQ when open */}
                    {idx === 3 && open && (
                      <div
                        className="absolute inset-0 bg-no-repeat rounded-2xl"
                        style={{ 
                          backgroundImage: "url('/Our promise bg4.webp')",
                          backgroundSize: '140%',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          width: '100%',
                          height: '100%',
                          borderRadius: '16px'
                        }}
                      />
                    )}

                    <div className="relative p-6">
                      <button
                        type="button"
                        onClick={() => toggle(idx)}
                        className="flex w-full items-start justify-between gap-4 text-left cursor-pointer"
                        aria-expanded={open}
                      >
                      <div>
                        <h2 className="support-faq-title" style={{ margin: 0, padding: 0 }}>{item.title}</h2>
                      </div>
                        <ChevronIcon className={`mt-1 h-5 w-5 transition-transform duration-300 ${open ? "rotate-180" : "rotate-0"}`} />
                      </button>

                      {/* Smoothly expanding answer with subtle fade-up */}
                      <div
                        className={`overflow-hidden transition-[max-height,opacity,margin-top] ${open ? "max-h-60 opacity-100 mt-4" : "max-h-0 opacity-0 mt-0"}`}
                        style={{ 
                          transitionDuration: '600ms',
                          willChange: 'max-height, opacity'
                        }}
                      >
                        <p className={`text-sm text-gray-800 mb-4 transition-transform duration-500 ease-out ${open ? 'translate-y-0' : 'translate-y-2'}`} style={{ willChange: 'transform' }}>{item.body}</p>
                        {open && (
                          <button className="inline-flex items-center gap-2 text-sm font-bold text-gray-800 hover:text-gray-900 cursor-pointer group relative">
                            <span className="relative">
                              Get started
                              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gray-800 transition-all duration-300 ease-out group-hover:w-full"></span>
                            </span>
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mobile/Tablet Layout: FAQ centered with image below when opened */}
        <div className="xl:hidden">
          <div className="rounded-2xl bg-white space-y-0">
            {items.map((item, idx) => {
              const open = active === idx;
              const gradient = gradients[idx % gradients.length];
              return (
                <div key={item.title} className={`relative overflow-hidden pb-1 ${idx < items.length - 1 && !open && active !== idx + 1 ? 'border-b border-gray-200 pb-2 rounded-none' : 'rounded-2xl'}`}>
                  {open && (
                    <div
                      className="absolute inset-0 z-0"
                      style={{ background: gradient, opacity: 0.9 }}
                    />
                  )}
                  <div className="relative p-6 z-10 faq-mobile-content">
                    <button
                      type="button"
                      onClick={() => toggle(idx)}
                      className="flex w-full items-start justify-between gap-4 text-left"
                      aria-expanded={open}
                    >
                      <div>
                        <h2 className="support-faq-title" style={{ margin: 0, padding: 0 }}>{item.title}</h2>
                      </div>
                      <ChevronIcon className={`mt-1 h-5 w-5 transition-transform duration-300 ${open ? "rotate-180" : "rotate-0"}`} />
                    </button>

                    {/* Smoothly expanding answer with image below */}
                    <div
                      className={`overflow-hidden transition-[max-height,opacity,margin-top] duration-500 ${open ? "max-h-[400px] md:max-h-[500px] opacity-100 mt-4" : "max-h-0 opacity-0 mt-0"}`}
                      style={{ willChange: 'max-height, opacity' }}
                    >
                      <div className="space-y-4">
                        <p className="text-sm text-gray-800">{item.body}</p>
                        
                        {/* Image appears below text when FAQ is opened on mobile/tablet */}
                        <div className="relative aspect-[4/3] w-full mx-auto overflow-hidden rounded-xl bg-gray-100 -mx-6">
                          <Image
                            src={
                              idx === 3 ? '/Our promise 4.webp' :
                              idx === 2 ? '/Our promise 3.webp' :
                              idx === 1 ? '/Our promise 2.webp' :
                              idx === 0 ? '/ourpromise1.webp' :
                              item.image
                            }
                            alt={`${item.title} – illustration supporting our child counseling promise`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) calc(100vw - 48px), (max-width: 1024px) calc(100vw - 96px), 1200px"
                            priority
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function ChevronIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 10.19l3.71-2.96a.75.75 0 11.94 1.17l-4.24 3.38a.75.75 0 01-.94 0L5.27 8.34a.75.75 0 01-.04-1.13z"
        clipRule="evenodd"
      />
    </svg>
  );
}

{/*hi*/}


