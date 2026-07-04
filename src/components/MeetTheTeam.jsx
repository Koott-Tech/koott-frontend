"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { normalizeImageUrl } from '@/utils/urlNormalizer';

const teamMembers = [
  { 
    name: "Dr. Albin Eldhose", 
    title: "Advisory Board Member", 
    image: "/api/images/static-files/Albin.webp",
    description: "A Clinical Psychologist and Sex Therapist with more than 10 years of experience working with both individuals and couples. The work blends evidence-based practices with a nuanced understanding of how people think, feel, and relate. The focus is on mental health concerns, relationship challenges, intimacy difficulties, and the emotional struggles that often stay unspoken."
  },
  { 
    name: "Dr. Aswathy Balan", 
    title: "Advisory Board Member", 
    image: "/api/images/static-files/Aswathy Balan.webp",
    description: "A certified psychiatrist with an MD and 7+ years of clinical experience. The work focuses on mood, anxiety, and personality disorders, guided by a calm, evidence-based approach. Care extends beyond the clinic, with active involvement in community awareness programs that make mental health easier to understand and talk about."
  },
  { 
    name: "Dr. Thaniya K Leela", 
    title: "Advisory Board Member", 
    image: "/api/images/static-files/Thaniya.webp",
    description: "With a Ph.D. in Psychology and an M.Phil. from UiB, Norway, backed by 7+ years of experience. The work supports adolescents, women, parents, and couples as they navigate the moments in life that feel confusing, overwhelming, or heavy. Using a trauma-informed approach, the focus is on creating a space that feels safe enough for people to open up, heal, build resilience, and grow at their own pace."
  },
  { 
    name: "Aswathy Sambath", 
    title: "Advisory Board Member", 
    image: "/api/images/static-files/Aswathy Sambath.webp",
    description: "A registered Clinical Psychologist with an M.Phil. and 8+ years of experience. The work spans individual, relationship, and family counseling, helping people untangle emotional knots and understand themselves with more clarity. The approach stays collaborative and empathetic, creating space for clients to explore what they feel, why it matters, and how they can move toward healthier patterns in their lives and relationships."
  },
  { 
    name: "Dr. Athullya Nair", 
    title: "Advisory Board Member", 
    image: "/api/images/static-files/Athullya.webp",
    description: "With 12+ years of experience, offering support to individuals, couples, and families through clinical supervision, assessments, and therapy. The approach stays compassionate and collaborative, creating steady space for people to understand themselves better, work through what feels difficult, and move toward healing with clarity and confidence. The goal is to help every person feel seen, supported, and capable of rebuilding the parts of life that matter most."
  },
  { 
    name: "Dr. Gayathri V", 
    title: "Advisory Board Member", 
    image: "/api/images/static-files/Gayathri.webp",
    description: "Experienced Consultant Psychiatrist and Professor at KMCH, Palakkad, with a solid foundation in clinical care, teaching, and research. The work centers on adult psychiatry, CBT, and community mental health awareness, offering guidance that's both clear and grounded. The aim is to support people with practical, thoughtful care while helping the wider community understand mental health with more openness and ease."
  },
];

export default function MeetTheTeam() {
    const [currentSlide, setCurrentSlide] = useState(0);
    const scrollContainerRef = useRef(null);
    const autoPlayRef = useRef(null);

    const nextSlide = () => {
        stopAutoPlay();
        const newSlide = (currentSlide + 1) % teamMembers.length;
        setCurrentSlide(newSlide);
        scrollToSlide(newSlide);
        setTimeout(() => startAutoPlay(), 2000);
    };

    const prevSlide = () => {
        stopAutoPlay();
        const newSlide = (currentSlide - 1 + teamMembers.length) % teamMembers.length;
        setCurrentSlide(newSlide);
        scrollToSlide(newSlide);
        setTimeout(() => startAutoPlay(), 2000);
    };

    const goToSlide = (index) => {
        stopAutoPlay();
        setCurrentSlide(index);
        scrollToSlide(index);
        setTimeout(() => startAutoPlay(), 2000);
    };

    const handleScroll = () => {
        if (scrollContainerRef.current) {
            const scrollLeft = scrollContainerRef.current.scrollLeft;
            const cardWidth = 320;
            const gap = 8;
            const totalCardWidth = cardWidth + gap;
            const newSlide = Math.round(scrollLeft / totalCardWidth);
            setCurrentSlide(Math.min(newSlide, teamMembers.length - 1));
        }
    };

    const scrollToSlide = (index) => {
        if (scrollContainerRef.current) {
            const cardWidth = 320;
            const gap = 8;
            const totalCardWidth = cardWidth + gap;
            scrollContainerRef.current.scrollTo({
                left: index * totalCardWidth,
                behavior: 'smooth'
            });
        }
    };

    const startAutoPlay = () => {
        if (autoPlayRef.current) {
            clearInterval(autoPlayRef.current);
        }
        autoPlayRef.current = setInterval(() => {
            setCurrentSlide((prev) => {
                const next = (prev + 1) % teamMembers.length;
                scrollToSlide(next);
                return next;
            });
        }, 5000);
    };

    const stopAutoPlay = () => {
        if (autoPlayRef.current) {
            clearInterval(autoPlayRef.current);
            autoPlayRef.current = null;
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
        
        // Start touch hold timer
        const timer = setTimeout(() => {
            setIsHolding(true);
            stopAutoPlay();
        }, 300);
        setTouchHoldTimer(timer);
    };

    const onTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
        // If moved significantly, cancel hold
        if (touchStart && Math.abs(e.targetTouches[0].clientX - touchStart) > 10) {
            if (touchHoldTimer) {
                clearTimeout(touchHoldTimer);
                setTouchHoldTimer(null);
            }
            setIsHolding(false);
        }
    };

    const onTouchEnd = () => {
        // Clear hold timer
        if (touchHoldTimer) {
            clearTimeout(touchHoldTimer);
            setTouchHoldTimer(null);
        }
        
        if (isHolding) {
            setIsHolding(false);
            // If was holding, don't swipe, just resume autoplay after delay
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
        startAutoPlay();
        return () => stopAutoPlay();
    }, []);
  useEffect(() => {
    const styleId = 'team-image-border-radius';
    let styleElement = document.getElementById(styleId);
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    styleElement.innerHTML = `
      @media (max-width: 767px) {
        .team-image-container {
          border-radius: 10px !important;
          overflow: hidden !important;
        }
        .team-image-container * {
          border-radius: 10px !important;
        }
        .team-image-container img,
        .team-image-container span,
        .team-image-container span img,
        .team-image-container > *,
        .team-image-container > * > * {
          border-radius: 10px !important;
          overflow: hidden !important;
        }
      }
    `;
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 767px) {
          .team-image-container {
            border-radius: 10px !important;
            overflow: hidden !important;
          }
          .team-image-container * {
            border-radius: 10px !important;
          }
          .team-image-container img,
          .team-image-container span,
          .team-image-container span img,
          .team-image-container > *,
          .team-image-container > * > * {
            border-radius: 10px !important;
            overflow: hidden !important;
          }
        }
      `}} />
      <div className="px-4 md:px-[50px]">
      <section className="w-full mt-24">
        <div className="w-full">
          {/* Header Section */}
          <div className="text-center mb-16">
            <p className="text-xl text-black font-normal text-center mb-2">
              Meet Our
            </p>
            <h2 
              className="text-[2.5rem] md:text-4xl lg:text-5xl font-medium leading-[110%] md:leading-[106%] tracking-[-0.125rem] md:tracking-[-0.195rem]"
              style={{
                color: '#012f23'
              }}
            >
              Advisory Board
            </h2>
          </div>

          {/* Desktop: Team Members Grid */}
          <div className="hidden md:flex flex-wrap justify-center gap-8">
            {teamMembers.map((member, index) => (
              <div key={index} className="w-80 bg-white rounded-2xl overflow-hidden">
              <div className="h-80 w-full overflow-hidden rounded-[10px] team-image-container" suppressHydrationWarning>
                <Image
                    src={normalizeImageUrl(member.image)}
                    alt={`${member.name} - ${member.title} at MyKoott`}
                  width={320}
                  height={320}
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              </div>
              <div className="px-0 py-6">
                <h5 className="text-sm md:text-base font-medium text-gray-900 mb-1">
                    {member.name}
                </h5>
                  <p className="text-gray-600">{member.title}</p>
                    {member.description && (
                      <p className="text-sm text-gray-600 mt-3" style={{ lineHeight: '1.25' }}>{member.description}</p>
                    )}
            </div>
              </div>
            ))}
          </div>

          {/* Mobile: Carousel */}
          <div className="block md:hidden w-full mt-6 mx-auto max-w-sm px-4">
            {/* Scrollable Carousel Container */}
            <div 
                ref={scrollContainerRef}
                onScroll={handleScroll}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                className="relative overflow-x-auto overflow-y-hidden rounded-[10px] carousel-scroll snap-x snap-mandatory"
                style={{ scrollSnapType: 'x mandatory' }}
            >
                <div className="flex gap-2 pb-4 items-stretch">
                    {teamMembers.map((member, index) => (
                        <div 
                            key={index} 
                            className="flex-shrink-0 w-[320px] snap-start px-4"
                        >
                            <div className="w-full bg-white rounded-2xl overflow-hidden">
                                <div className="h-80 w-full overflow-hidden rounded-[10px] team-image-container" suppressHydrationWarning>
                                    <Image
                                        src={normalizeImageUrl(member.image)}
                                        alt={`${member.name} - ${member.title} at MyKoott`}
                                        width={320}
                                        height={320}
                                        className="w-full h-full object-contain rounded-[10px]"
                                        loading="lazy"
                                    />
                                </div>
                                <div className="px-0 py-6">
                                    <h5 className="text-sm font-medium text-gray-900 mb-1">
                                        {member.name}
                                    </h5>
                                    <p className="text-gray-600">{member.title}</p>
                                    {member.description && (
                                      <p className="text-sm text-gray-600 mt-3" style={{ lineHeight: '1.25' }}>{member.description}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Navigation Dots */}
            <div className="flex justify-center mt-6 gap-2">
                {teamMembers.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => goToSlide(index)}
                        className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                            currentSlide === index ? 'bg-indigo-600' : 'bg-gray-300'
                        }`}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>

            {/* Navigation Arrows */}
            <div className="flex justify-between items-center mt-4 px-4">
                <button
                    onClick={prevSlide}
                    className="p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow"
                >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                
                <button
                    onClick={nextSlide}
                    className="p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow"
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
