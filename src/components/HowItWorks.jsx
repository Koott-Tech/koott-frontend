"use client";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HowItWorks({ heading, ctaText } = {}) {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollContainerRef = useRef(null);
  const trackRef = useRef(null);
  const isAdjustingRef = useRef(false);

  const carouselData = [
    {
      id: 1,
      number: "01",
      title: "Tell Us What's Important",
      gradient: "radial-gradient(circle at top right, #fffdff 0%, #fffdff 30%, #d6cae9 50%, #b19cd3 100%)",
      tags: ["Assessment", "Child counseling", "Better parenting"],
      description: "Choose what do you want to prioritize to get started."
    },
    {
      id: 2,
      number: "02", 
      title: "Explore Your Matches",
      gradient: "conic-gradient(at 50% 50%, #ecfdf5 0deg, #d1fae5 140deg, #a7f3d0 280deg, #ecfdf5 360deg)",
      description: "Choose a therapist for you and your child."
    },
    {
      id: 3,
      number: "03",
      title: "Schedule Your Visit", 
      gradient: "conic-gradient(at 50% 50%, #fff7ed 0deg, #ffedd5 150deg, #fed7aa 300deg, #fff7ed 360deg)",
      description: "Choose your preferred slot & Get started as early as today."
    },
    {
      id: 4,
      number: "04",
      title: "Join Online Session",
      gradient: "conic-gradient(at 50% 50%, #ecfeff 0deg, #cffafe 160deg, #bae6fd 320deg, #ecfeff 360deg)",
      description: "Join sessions on Google Meet from your comfort place."
    }
  ];

  useEffect(() => {
    const container = scrollContainerRef.current;
    const track = trackRef.current;
    if (!container || !track) return;

    const centerFirstSlide = () => {
      const firstSlide = track.querySelector('[data-slide-index="0"]');
      if (!firstSlide) return;
      isAdjustingRef.current = true;
      const containerWidth = container.offsetWidth;
      const targetCenter = firstSlide.offsetLeft + firstSlide.offsetWidth / 2;
      container.scrollLeft = Math.max(targetCenter - containerWidth / 2, 0);
      requestAnimationFrame(() => {
        isAdjustingRef.current = false;
      });
    };

    centerFirstSlide();
    window.addEventListener("resize", centerFirstSlide);
    return () => {
      window.removeEventListener("resize", centerFirstSlide);
    };
  }, []);

  const nextSlide = () => {
    const newSlide = (currentSlide + 1) % carouselData.length;
    setCurrentSlide(newSlide);
    scrollToSlide(newSlide);
  };

  const prevSlide = () => {
    const newSlide = (currentSlide - 1 + carouselData.length) % carouselData.length;
    setCurrentSlide(newSlide);
    scrollToSlide(newSlide);
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
    scrollToSlide(index);
  };

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    const track = trackRef.current;
    if (!container || !track || isAdjustingRef.current) return;

    const containerCenter = container.scrollLeft + container.offsetWidth / 2;

    let closestIndex = 0;
    let smallestDiff = Infinity;
    const slides = track.querySelectorAll('[data-slide-index]');
    slides.forEach((slide) => {
      const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
      const diff = Math.abs(containerCenter - slideCenter);
      if (diff < smallestDiff) {
        smallestDiff = diff;
        closestIndex = Number(slide.getAttribute("data-slide-index") || 0);
    }
    });

    setCurrentSlide(closestIndex);
  };

  const scrollToSlide = (index, behavior = 'smooth') => {
    const container = scrollContainerRef.current;
    const track = trackRef.current;
    if (!container || !track) return;
    const target = track.querySelector(`[data-slide-index="${index}"]`);
    if (!target) return;
    const containerWidth = container.offsetWidth;
    const targetCenter = target.offsetLeft + target.offsetWidth / 2;
    const newScrollLeft = targetCenter - containerWidth / 2;
    isAdjustingRef.current = true;
    container.scrollTo({
      left: newScrollLeft,
      behavior,
    });
    requestAnimationFrame(() => {
      isAdjustingRef.current = false;
      });
  };

  return (
    <section id="how-it-works" className="w-full mobile-section mt-16">
      <style jsx>{`
        @media (min-width: 768px) and (max-width: 1180px) and (max-height: 1180px) {
          .how-it-works-card {
            height: 320px;
            /* Tablet: card should fill its container (300px) */
            width: 100%;
            max-width: 300px;
          }
          .how-it-works-title {
            font-size: 20px !important;
            margin-bottom: 14px !important;
            font-weight: 600 !important;
            line-height: 1.2 !important;
            margin: 0 0 14px 0 !important;
          }
          .how-it-works-description {
            font-size: 14px;
            line-height: 1.4;
          }
          .how-it-works-heading {
            font-size: 32px;
            font-weight: 600;
            line-height: 1.1;
          }
          /* Override h3 tag pills to match original span size */
          .how-it-works-tag-pill {
            font-size: 12px !important;
            line-height: 1 !important;
            margin: 0 !important;
            font-weight: 500 !important;
          }
        }
        @media (max-width: 767px) {
          .mobile-section {
            margin-top: 8px;
          }
          .how-it-works-card {
            height: 320px;
            width: 100%;
            max-width: 100%;
            min-width: 0;
            border-radius: 10px !important;
            box-sizing: border-box;
          }
          .how-it-works-title {
            font-size: 18px !important;
            margin-bottom: 12px !important;
            font-weight: 600 !important;
            line-height: 1.2 !important;
            margin: 0 0 12px 0 !important;
          }
          .how-it-works-description {
            font-size: 13px;
            line-height: 1.3;
          }
          h2.how-it-works-heading {
            font-size: 24px !important;
            font-weight: 600 !important;
            line-height: 1.1 !important;
            text-align: center;
            padding-left: 0;
            padding-right: 0;
          }
          .how-it-works-slide-number {
            display: none !important;
          }
          /* Override h3 tag pills to match original span size */
          .how-it-works-tag-pill {
            font-size: 12px !important;
            line-height: 1 !important;
            margin: 0 !important;
            font-weight: 500 !important;
          }
        }
        /* Desktop override for h3 card titles */
        .how-it-works-title-desktop {
          font-size: 16px !important;
          font-weight: 600 !important;
          line-height: 1.2 !important;
          margin: 0 !important;
        }
        /* Override h3 tag pills to match original span size (all breakpoints) */
        .how-it-works-tag-pill {
          font-size: 12px !important;
          line-height: 1 !important;
          margin: 0 !important;
          font-weight: 500 !important;
        }
        .card-bg-mobile {
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          background-attachment: initial;
        }
        @media (max-width: 768px) {
          .card-bg-mobile {
            background-size: 100% 100%;
            background-position: center top;
          }
          .card-2-inner-image {
            margin-top: 10px;
          }
        }
        /* Mobile carousel layout */
        @media (max-width: 767px) {
          .how-it-works-carousel-wrapper {
            width: 100% !important;
            max-width: 100% !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
            overflow: hidden;
          }
          .how-it-works-carousel {
            scroll-padding-inline: 0;
            padding-bottom: 12px;
            margin-inline: 0;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            padding-left: 0 !important;
            padding-right: 0 !important;
            width: 100%;
            max-width: 100%;
            overflow-x: auto;
            overflow-y: hidden;
          }
          .how-it-works-carousel::-webkit-scrollbar {
            display: none;
          }
          .how-it-works-track {
            gap: clamp(12px, 4vw, 20px);
            padding-inline: 0;
            min-width: 0;
          }
          .how-it-works-slide {
            flex: 0 0 85%;
            max-width: 85%;
            scroll-snap-align: center;
            min-width: 0;
            box-sizing: border-box;
          }
          .how-it-works-track > .how-it-works-slide:first-child {
            margin-left: 0;
            padding-left: clamp(16px, 4vw, 24px);
          }
          .how-it-works-track > .how-it-works-slide:last-child {
            margin-right: 0;
            padding-right: clamp(16px, 4vw, 24px);
          }
        }
        /* Tablet carousel layout: behave like mobile, with 50% cards and a tiny gap */
        @media (min-width: 768px) and (max-width: 1180px) and (max-height: 1180px) {
          .how-it-works-carousel-wrapper {
            width: 100vw !important;
            max-width: 100vw !important;
            margin-left: calc(50% - 50vw) !important;
            margin-right: calc(50% - 50vw) !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          .how-it-works-carousel {
            scroll-padding-inline: 0;
            padding-bottom: 12px;
            margin-inline: 0;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          .how-it-works-carousel::-webkit-scrollbar {
            display: none;
          }
          .how-it-works-track {
            gap: 0;
            padding-inline: 0;
          }
          .how-it-works-slide {
            /* Each slide container - width includes card + gap padding */
            flex: 0 0 auto;
            margin: 0;
            box-sizing: content-box;
            scroll-snap-align: center;
          }
          /* Use padding for spacing - width is content width, padding adds to it */
          .how-it-works-track > .how-it-works-slide:first-child {
            padding-left: clamp(24px, 5vw, 32px);
            padding-right: 16px;
            width: 300px;
          }
          .how-it-works-track > .how-it-works-slide:not(:first-child):not(:last-child) {
            padding-left: 0;
            padding-right: 16px;
            width: 300px;
          }
          .how-it-works-track > .how-it-works-slide:last-child {
            padding-left: 0;
            padding-right: clamp(8px, 2vw, 16px);
            width: 300px;
          }
          /* Hide navigation dots and numbers in tablet view */
          .how-it-works-dots {
            display: none;
          }
          .how-it-works-slide-number {
            display: none;
          }
        }
        @media (max-width: 767px) {
          .how-it-works-slide-number {
            display: none !important;
          }
        }
      `}</style>
      <div className="mx-auto flex max-w-[1400px] flex-col justify-center px-4 lg:px-6 overflow-hidden">
        <p className="text-center md:text-center mt-2 text-sm md:text-base">
          How it works
        </p>

        {/* Inline CTA under the heading */}
        <div className="mt-3 mb-8 md:mb-6 text-center md:text-center max-w-full md:max-w-4xl mx-auto px-4">
          <h2 className="how-it-works-heading text-center text-base md:text-xl lg:text-2xl" style={{ fontSize: '24px', fontWeight: 600, lineHeight: '1.1' }}>
            {heading || "Start Your Child's Therapy Journey Towards a Happier, Calmer Home"}
          </h2>
          {ctaText && (
            <p className="text-center mt-2 text-sm md:text-base" style={{ color: '#025545', fontWeight: 500 }}>
              {ctaText}
            </p>
          )}
          <button
            type="button"
            className="mt-4 md:mt-5 inline-flex items-center rounded-full px-6 md:px-8 py-2.5 text-sm md:text-sm font-medium text-white shadow-sm transition-colors duration-200"
            style={{ backgroundColor: '#15171A' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2a2d33'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#15171A'}
            onClick={() => router.push('/online-child-psychologist')}
          >
            Get started
          </button>
        </div>

        <div className="mt-10 flex flex-col xl:flex-row justify-center gap-6 max-w-7xl mx-auto px-0 overflow-hidden w-full">
          {/* Mobile + Tablet Carousel */}
          <div className="xl:hidden w-full how-it-works-carousel-wrapper max-w-full">
            <div className="relative">
              {/* Scrollable Carousel Container */}
              <div 
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="how-it-works-carousel relative overflow-x-auto overflow-y-hidden snap-x snap-mandatory"
                style={{ paddingLeft: '0', paddingRight: '0' }}
              >
                <div ref={trackRef} className="how-it-works-track flex pb-4">
                {carouselData.map((card, index) => (
                  <div 
                    key={`${card.id}-${index}`} 
                    className="how-it-works-slide flex-shrink-0 snap-center"
                    data-slide-index={index}
                  >
                    <div
                      className="how-it-works-card p-4 h-[320px] w-full flex flex-col justify-between card-bg-mobile rounded-[10px]"
                      style={{ 
                        backgroundImage: card.id === 1 ? "url('/How it works bg 1.webp')" : card.id === 2 ? "url('/howitworks2.webp')" : card.id === 3 ? "url('/How it works bg 3.webp')" : card.id === 4 ? "url('/howitworks4.webp')" : card.gradient,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                        backgroundAttachment: "scroll",
                        backgroundColor: card.id === 2 ? "#f0f0f0" : "transparent",
                        borderRadius: "10px",
                        minWidth: 0,
                        maxWidth: "100%",
                        boxSizing: "border-box"
              }}
            >
              {/* Header Section */}
                      <div className="flex-shrink-0">
                        <div className="text-xl font-medium text-gray-900 text-center" style={{ marginBottom: '12px' }}>{card.number}</div>
                        <h3 className="how-it-works-title text-center font-semibold text-base">
                          {card.title}
                        </h3>
                      </div>

                      {/* Content Section */}
                      <div className={`flex-1 flex flex-col ${card.id === 2 ? 'justify-center' : 'justify-center'}`} style={card.id === 2 ? { padding: 0 } : {}}>
                        {/* Card-specific content */}
                        {card.id === 1 && (
                          <div className="space-y-2 flex flex-col items-center">
                            {card.tags && card.tags.map((tag, idx) => (
                              <div key={idx} className="bg-white/90 rounded-full px-3 py-1.5 border border-gray-200 flex items-center gap-2 w-fit">
                                <div className="w-5 h-5 rounded-full border border-gray-800 flex items-center justify-center flex-shrink-0">
                                  <svg className="w-3.5 h-3.5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                                <h3 className="how-it-works-tag-pill text-gray-900 text-center tracking-tight" style={{ letterSpacing: '-0.01em', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{tag}</h3>
                              </div>
                            ))}
                          </div>
                        )}

                        {card.id === 2 && (
                          <div className="flex flex-col items-center justify-center card-2-inner-image" style={{ padding: 0, margin: '-70px auto 0 auto' }}>
                            <div className="relative" style={{ width: '200px', height: '200px', padding: 0, margin: 0 }}>
                              <Image
                                src="/How it works 2 Inner.webp"
                                alt="Child psychologist profile card used to match families with therapists"
                                width={200}
                                height={200}
                                className="object-contain"
                                unoptimized
                                style={{ padding: '0', margin: '0', display: 'block', width: '200px', height: '200px' }}
                                onError={(e) => {
                                  console.error('Image failed to load: /How it works 2 Inner.webp');
                                  console.error('Error target:', e.target);
                                }}
                                onLoad={() => {
                                  console.log('Image loaded successfully: /How it works 2 Inner.webp');
                                }}
                              />
                            </div>
                            {/* Doctor Information */}
                            <div className="text-center" style={{ marginTop: '-50px' }}>
                              <div className="text-xs font-bold text-gray-900">Aswathy Sampath</div>
                              <div className="text-xs text-gray-600">M.Phil, Clinical Psychologist</div>
                            </div>
                          </div>
                        )}

                        {card.id === 3 && (
                          <>
                          <div className="mt-4 flex justify-center">
                            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/90 px-3 py-1.5 text-sm text-gray-900">
                                <span className="text-indigo-700">📅</span>
                                <span className="tight-tracking">Evenings After 4pm</span>
                              </div>
                            </div>
                            <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-gray-700">
                              {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
                                <div
                                  key={d}
                                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                                    d === "Tu" || d === "Fr" ? "bg-white/90 border border-gray-200" : ""
                                  }`}
                                >
                                  {d}
                                </div>
                              ))}
                            </div>
                          </>
                        )}

                        {card.id === 4 && (
                          <div className="flex justify-center items-center" style={{ margin: '-45px 0', padding: 0 }}>
                            <div className="relative" style={{ width: '170px', height: '170px', padding: 0, margin: 0 }}>
                              <Image
                                src="/How it works 4 Inner.webp"
                                alt="Online child counseling session illustration on a laptop"
                                width={170}
                                height={170}
                                className="object-contain"
                                unoptimized
                                style={{ padding: '0', margin: '0', display: 'block', width: '170px', height: '170px' }}
                                onError={(e) => {
                                  console.error('Image failed to load: /How it works 4 Inner.webp');
                                  console.error('Error target:', e.target);
                                }}
                                onLoad={() => {
                                  console.log('Image loaded successfully: /How it works 4 Inner.webp');
                                }}
                              />
                            </div>
                          </div>
                        )}

                      </div>

                      {/* Footer Section */}
                      <div className="flex-shrink-0" style={card.id === 4 ? { marginTop: '-5px' } : {}}>
                        <p className="how-it-works-description text-center px-4 text-xs" style={card.id === 4 ? { marginTop: '5px', paddingTop: '0px', lineHeight: '1.2' } : { marginTop: '4px', paddingTop: '8px' }}>
                          {card.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              </div>
            </div>

            {/* Navigation Dots */}
            <div className="how-it-works-dots flex justify-center mt-6 gap-2">
              {carouselData.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                    currentSlide === index ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            {/* Navigation Arrows */}
            <div className="flex justify-center items-center mt-4 px-4 gap-4">
              <button
                onClick={prevSlide}
                className="p-2 rounded-full bg-white border border-gray-300 transition-shadow"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <span className="how-it-works-slide-number text-sm text-gray-500">
                {currentSlide + 1} of {carouselData.length}
              </span>
              
              <button
                onClick={nextSlide}
                className="p-2 rounded-full bg-white border border-gray-300 transition-shadow"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Desktop Layout (xl and above, but exclude landscape tablets) */}
          <div className="hidden xl:flex flex-row justify-center gap-4 max-w-7xl mx-auto px-0">
            {/* Card 01 - Desktop */}
            <div
              className="rounded-2xl p-6 h-[350px] w-[290px] flex-shrink-0 flex flex-col bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: "url('/How it works bg 1.webp')",
              }}
            >
            <div className="text-3xl md:text-4xl font-medium text-gray-900 text-center mb-4">01</div>
            <h3 className="how-it-works-title-desktop text-center font-semibold">
              Tell Us What's Important
            </h3>

            <div className="flex-1 flex flex-col justify-center">
              <div className="space-y-2 flex flex-col items-center">
                <div className="bg-white/90 rounded-full px-3 py-1.5 border border-gray-200 flex items-center gap-2 w-fit">
                  <div className="w-5 h-5 rounded-full border border-gray-800 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3.5 h-3.5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="how-it-works-tag-pill text-gray-900 whitespace-nowrap text-center tracking-tight" style={{ letterSpacing: '-0.01em' }}>Assessment</h3>
                </div>
                <div className="bg-white/90 rounded-full px-3 py-1.5 border border-gray-200 flex items-center gap-2 w-fit">
                  <div className="w-5 h-5 rounded-full border border-gray-800 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3.5 h-3.5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="how-it-works-tag-pill text-gray-900 whitespace-nowrap text-center tracking-tight" style={{ letterSpacing: '-0.01em' }}>Child counseling</h3>
                </div>
                <div className="bg-white/90 rounded-full px-3 py-1.5 border border-gray-200 flex items-center gap-2 w-fit">
                  <div className="w-5 h-5 rounded-full border border-gray-800 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3.5 h-3.5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="how-it-works-tag-pill text-gray-900 whitespace-nowrap text-center tracking-tight" style={{ letterSpacing: '-0.01em' }}>Better parenting</h3>
                </div>
              </div>
            </div>

            <p className="mt-auto mb-2.5 text-center">
            Choose what do you want to prioritize to get started.
            </p>
          </div>

            {/* Card 02 - Desktop */}
            <div
              className="rounded-2xl p-6 h-[350px] w-[290px] flex-shrink-0 flex flex-col bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: "url('/howitworks2.webp')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                backgroundColor: "#f0f0f0"
              }}
            >
            <div className="text-3xl md:text-4xl font-medium text-gray-900 text-center mb-4">02</div>
            <h3 className="how-it-works-title-desktop text-center font-semibold" style={{ marginBottom: '8px' }}>
              Explore Your Matches
            </h3>

            <div className="flex-1 flex items-start justify-center" style={{ paddingBottom: '0px', paddingTop: '0px' }}>
              {/* Inner Image */}
              <div className="flex flex-col items-center" style={{ padding: 0, margin: '-55px 0 -10px 0' }}>
                <div className="relative" style={{ width: '220px', height: '220px', padding: 0, margin: 0, marginBottom: 0 }}>
                  <Image
                    src="/How it works 2 Inner.webp"
                    alt="Child psychologist profile card used to match families with therapists"
                    width={220}
                    height={220}
                    className="object-contain"
                    unoptimized
                    style={{ padding: '0', margin: '0', display: 'block', width: '220px', height: '220px' }}
                    onError={(e) => {
                      console.error('Image failed to load (desktop): /How it works 2 Inner.webp');
                      console.error('Error target:', e.target);
                    }}
                    onLoad={() => {
                      console.log('Image loaded successfully (desktop): /How it works 2 Inner.webp');
                    }}
                  />
                </div>
                {/* Doctor Information */}
                <div className="text-center" style={{ marginTop: '-60px' }}>
                  <div className="text-sm font-bold text-gray-900">Aswathy Sampath</div>
                  <div className="text-xs text-gray-600">M.Phil, Clinical Psychologist
                  </div>
                </div>
              </div>
            </div>

            <p className="mb-2.5 text-center" style={{ marginTop: '-15px', marginBottom: '10px', lineHeight: '1.2' }}>
              Choose a therapist for you and your child.
            </p>
          </div>

            {/* Card 03 - Desktop */}
          <div
              className="rounded-2xl p-6 h-[350px] w-[290px] flex-shrink-0 flex flex-col bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: "url('/How it works bg 3.webp')",
              }}
            >
            <div className="text-3xl md:text-4xl font-medium text-gray-900 text-center mb-4">03</div>
            <h3 className="how-it-works-title-desktop text-center font-semibold">
              Schedule Your Visit
            </h3>

            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="mt-2 flex justify-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/90 px-3 py-1.5 text-sm text-gray-900">
                  <span className="text-indigo-700">📅</span>
                  <span className="tight-tracking">Evenings After 4pm</span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-700">
                {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
                  <div
                    key={d}
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs ${
                      d === "Tu" || d === "Fr" ? "bg-white/90 border border-gray-200" : ""
                    }`}
                  >
                    {d}
                  </div>
                ))}
              </div>
            </div>

            <p className="mt-auto mb-2.5 text-center">
              Choose your preferred slot & Get started as early as today.
            </p>
          </div>

            {/* Card 04 - Desktop */}
          <div
              className="rounded-2xl p-6 h-[350px] w-[290px] flex-shrink-0 flex flex-col bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: "url('/howitworks4.webp')",
              }}
            >
            <div className="text-3xl md:text-4xl font-medium text-gray-900 text-center mb-4">04</div>
            <h3 className="how-it-works-title-desktop text-center font-semibold">
              Join Online Session
            </h3>

            {/* Inner Image */}
            <div className="flex flex-col items-center" style={{ padding: 0, margin: '-15px 0 -10px 0' }}>
              <div className="relative" style={{ width: '190px', height: '190px', padding: 0, margin: 0, marginBottom: 0 }}>
                <Image
                  src="/How it works 4 Inner.webp"
                  alt="Online child counseling session illustration on a laptop"
                  width={190}
                  height={190}
                  className="object-contain"
                  unoptimized
                  style={{ padding: '0', margin: '0', display: 'block', width: '190px', height: '190px' }}
                  onError={(e) => {
                    console.error('Image failed to load (desktop): /How it works 4 Inner.webp');
                    console.error('Error target:', e.target);
                  }}
                  onLoad={() => {
                    console.log('Image loaded successfully (desktop): /How it works 4 Inner.webp');
                  }}
                />
              </div>
            </div>

            <p className="mb-2.5 text-center" style={{ marginTop: '5px', marginBottom: '10px', lineHeight: '1.2' }}>
              Join sessions on Google Meet from your comfort place.
            </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


