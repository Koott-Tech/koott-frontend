"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import LeadershipMemberCard from "@/components/LeadershipMemberCard";

const LEADERSHIP_IMAGE_CSS = `
  @media (max-width: 767px) {
    .leadership-image-container {
      border-radius: 10px !important;
      overflow: hidden !important;
    }
    .leadership-image-container * {
      border-radius: 10px !important;
    }
    .leadership-image-container img,
    .leadership-image-container span,
    .leadership-image-container span img,
    .leadership-image-container > *,
    .leadership-image-container > * > * {
      border-radius: 10px !important;
      overflow: hidden !important;
    }
  }
`;

/** Carousel slide width + gap must stay in sync with Tailwind classes on the track (`gap-8` = 32px). */
const CAROUSEL_CARD_WIDTH_PX = 320;
const CAROUSEL_GAP_PX = 32;

/**
 * `layout="grid"` — desktop flex-wrap grid + mobile-only carousel (About / Leadership).
 * `layout="carousel"` — carousel on all breakpoints (arrows, dots, autoplay).
 */
export default function LeadershipMembersShowcase({
  members = [],
  sectionTitle = "Leadership",
  sectionSubtitle = "",
  showSectionHeader = true,
  useAccessibleNameHeading = false,
  className = "px-4 md:px-[50px]",
  sectionClassName = "w-full mt-24",
  headerTitleClassName = "text-[2.5rem] md:text-[3.75rem] font-medium md:font-[500] leading-[110%] md:leading-[106%] tracking-[-0.125rem] md:tracking-[-0.195rem] mb-4",
  layout = "grid",
  /** Edge-to-edge horizontal carousel (use with a full-bleed wrapper on the page). */
  carouselFullBleed = false,
  /** Panel photos: no fixed-height crop box — image scales to full frame with object-contain. */
  naturalMemberImageHeight = false,
  /** Optional dot theme overrides for carousel pagination. */
  activeDotClassName = "bg-indigo-600",
  inactiveDotClassName = "bg-gray-300",
  dotBaseClassName = "w-2 h-2 rounded-full",
}) {
  const carouselOnly = layout === "carousel";
  const count = members.length;
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollContainerRef = useRef(null);
  const autoPlayRef = useRef(null);
  const membersRef = useRef(members);
  membersRef.current = members;

  const scrollToSlide = useCallback((index) => {
    if (!scrollContainerRef.current || count === 0) return;
    const step = CAROUSEL_CARD_WIDTH_PX + CAROUSEL_GAP_PX;
    scrollContainerRef.current.scrollTo({
      left: index * step,
      behavior: "smooth",
    });
  }, [count]);

  const stopAutoPlay = useCallback(() => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
      autoPlayRef.current = null;
    }
  }, []);

  const startAutoPlay = useCallback(() => {
    if (count <= 1) return;
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
    }
    autoPlayRef.current = setInterval(() => {
      setCurrentSlide((prev) => {
        const len = membersRef.current.length;
        if (len === 0) return prev;
        const next = (prev + 1) % len;
        if (scrollContainerRef.current) {
          const step = CAROUSEL_CARD_WIDTH_PX + CAROUSEL_GAP_PX;
          scrollContainerRef.current.scrollTo({
            left: next * step,
            behavior: "smooth",
          });
        }
        return next;
      });
    }, 5000);
  }, [count]);

  const nextSlide = () => {
    stopAutoPlay();
    const len = membersRef.current.length;
    if (len === 0) return;
    setCurrentSlide((prev) => {
      const newSlide = (prev + 1) % len;
      requestAnimationFrame(() => scrollToSlide(newSlide));
      return newSlide;
    });
    setTimeout(() => startAutoPlay(), 2000);
  };

  const prevSlide = () => {
    stopAutoPlay();
    const len = membersRef.current.length;
    if (len === 0) return;
    setCurrentSlide((prev) => {
      const newSlide = (prev - 1 + len) % len;
      requestAnimationFrame(() => scrollToSlide(newSlide));
      return newSlide;
    });
    setTimeout(() => startAutoPlay(), 2000);
  };

  const goToSlide = (index) => {
    stopAutoPlay();
    setCurrentSlide(index);
    scrollToSlide(index);
    setTimeout(() => startAutoPlay(), 2000);
  };

  const handleScroll = () => {
    if (scrollContainerRef.current && count > 0) {
      const scrollLeft = scrollContainerRef.current.scrollLeft;
      const step = CAROUSEL_CARD_WIDTH_PX + CAROUSEL_GAP_PX;
      const newSlide = Math.round(scrollLeft / step);
      setCurrentSlide(Math.min(newSlide, count - 1));
    }
  };

  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [touchHoldTimer, setTouchHoldTimer] = useState(null);
  const [isHolding, setIsHolding] = useState(false);
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    stopAutoPlay();

    const timer = setTimeout(() => {
      setIsHolding(true);
      stopAutoPlay();
    }, 300);
    setTouchHoldTimer(timer);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
    if (touchStart && Math.abs(e.targetTouches[0].clientX - touchStart) > 10) {
      if (touchHoldTimer) {
        clearTimeout(touchHoldTimer);
        setTouchHoldTimer(null);
      }
      setIsHolding(false);
    }
  };

  const onTouchEnd = () => {
    if (touchHoldTimer) {
      clearTimeout(touchHoldTimer);
      setTouchHoldTimer(null);
    }

    if (isHolding) {
      setIsHolding(false);
      setTimeout(() => {
        startAutoPlay();
      }, 3000);
      return;
    }

    if (!touchStart || !touchEnd) {
      setTimeout(() => {
        startAutoPlay();
      }, 3000);
      return;
    }

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }

    setTimeout(() => {
      startAutoPlay();
    }, 3000);
  };

  useEffect(() => {
    if (count <= 1) return undefined;
    startAutoPlay();
    return () => stopAutoPlay();
  }, [count, startAutoPlay, stopAutoPlay]);

  if (!members.length) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: LEADERSHIP_IMAGE_CSS }} />
      <div className={className}>
        <section className={sectionClassName}>
          <div className="w-full">
            {showSectionHeader ? (
              <div className="text-center mb-16">
                <h2
                  className={headerTitleClassName}
                  style={{ color: "#1d1733" }}
                >
                  {sectionTitle}
                </h2>
                {sectionSubtitle ? (
                  <p className="text-lg text-gray-600 max-w-2xl mx-auto">{sectionSubtitle}</p>
                ) : null}
              </div>
            ) : null}

            {!carouselOnly ? (
              <div
                className={`hidden md:flex flex-wrap justify-center gap-12 lg:gap-14${
                  naturalMemberImageHeight ? " items-start" : ""
                }`}
              >
                {members.map((member, index) => (
                  <LeadershipMemberCard
                    key={member.name || index}
                    name={member.name}
                    title={member.title}
                    image={member.image}
                    useAccessibleNameHeading={useAccessibleNameHeading}
                    naturalImageHeight={naturalMemberImageHeight}
                  />
                ))}
              </div>
            ) : null}

            <div
              className={
                carouselOnly
                  ? carouselFullBleed
                    ? "block w-full mt-6 max-w-none px-0"
                    : "block w-full mt-6 mx-auto max-w-6xl px-4 sm:px-6"
                  : "block md:hidden w-full mt-6 mx-auto max-w-sm px-4"
              }
            >
              <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                className={`relative overflow-x-auto overflow-y-hidden carousel-scroll snap-x snap-mandatory [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 ${
                  carouselFullBleed ? "rounded-none" : "rounded-[10px]"
                }`}
                style={{ scrollSnapType: "x mandatory" }}
              >
                <div
                  className={`flex gap-8 pb-4 ps-0 pe-0 ${
                    naturalMemberImageHeight ? "items-start" : "items-stretch"
                  }`}
                >
                  {members.map((member, index) => (
                    <div
                      key={member.name || index}
                      className={`flex-shrink-0 w-[320px] snap-start ${carouselFullBleed ? "px-0" : "px-4"}`}
                    >
                      <LeadershipMemberCard
                        name={member.name}
                        title={member.title}
                        image={member.image}
                        className="w-full"
                        useAccessibleNameHeading={useAccessibleNameHeading}
                        naturalImageHeight={naturalMemberImageHeight}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-center mt-6 gap-2">
                {members.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => goToSlide(index)}
                    className={`${dotBaseClassName} transition-all duration-200 ${
                      currentSlide === index ? activeDotClassName : inactiveDotClassName
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>

              <div
                className={`flex justify-between items-center mt-4 w-full ${
                  carouselFullBleed ? "px-2 sm:px-3" : "px-4"
                }`}
              >
                <button
                  type="button"
                  onClick={prevSlide}
                  className="p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow"
                  aria-label="Previous"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={nextSlide}
                  className="p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow"
                  aria-label="Next"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
