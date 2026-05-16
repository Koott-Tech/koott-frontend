"use client";

import { useState, useRef } from "react";
import Image from "next/image";

export default function ProcessSteps({ therapyType = "individual" }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollContainerRef = useRef(null);
  // Content configuration for different therapy types
  const content = {
    individual: {
      title: "How individual therapy works at LittleMinds",
      subtitle: "From beginning to end, we'll tailor your online therapy experience to you.",
      step1: {
        title: "1. Tell us what's important",
        description: "We'll use your preferences and insurance details to find providers who fit your needs.",
        tags: ["Anger Management", "Behavioral Issues", "Chronic Impulsivity", "Coping Skills"]
      },
      step2: {
        title: "2. Explore your matches",
        description: "Browse the profiles of licensed, in-network providers who match your preferences."
      },
      step3: {
        title: "3. Schedule your visit",
        description: "Choose your preferred time and meet with your provider as soon as tomorrow."
      },
      step4: {
        title: "4. Join your online session",
        description: "Connect with your provider over live video from wherever you feel comfortable."
      }
    },
    couples: {
      title: "How couples therapy works at LittleMinds",
      subtitle: "From beginning to end, we'll tailor your couples therapy experience to strengthen your relationship.",
      step1: {
        title: "1. Share your relationship goals",
        description: "Tell us about your relationship challenges and what you hope to achieve together.",
        tags: ["Communication", "Trust Issues", "Conflict Resolution", "Intimacy"]
      },
      step2: {
        title: "2. Find your perfect match",
        description: "Browse profiles of licensed couples therapists who specialize in relationship counseling."
      },
      step3: {
        title: "3. Book your session",
        description: "Schedule a time that works for both partners to begin your journey together."
      },
      step4: {
        title: "4. Start healing together",
        description: "Join your online session as a couple and begin building a stronger relationship."
      }
    },
    family: {
      title: "How family therapy works at LittleMinds",
      subtitle: "From beginning to end, we'll help your family build stronger bonds and better communication.",
      step1: {
        title: "1. Identify family dynamics",
        description: "Share your family's unique challenges and what you hope to improve together.",
        tags: ["Parent-Child Issues", "Sibling Rivalry", "Blended Families", "Communication"]
      },
      step2: {
        title: "2. Choose your family therapist",
        description: "Find licensed family therapists who understand your family's specific needs."
      },
      step3: {
        title: "3. Schedule family time",
        description: "Book sessions that work for everyone's schedule and commitments."
      },
      step4: {
        title: "4. Grow together",
        description: "Join your online family session and start building healthier relationships."
      }
    },
    child: {
      title: "How child therapy works at LittleMinds",
      subtitle: "From beginning to end, we'll create a safe, supportive environment for your child's growth.",
      step1: {
        title: "1. Understand your child's needs",
        description: "Share your concerns about your child's behavior, emotions, or development.",
        tags: ["Anxiety", "Behavioral Issues", "Social Skills", "Academic Challenges"]
      },
      step2: {
        title: "2. Find the right specialist",
        description: "Connect with licensed child therapists who specialize in working with children."
      },
      step3: {
        title: "3. Plan your child's sessions",
        description: "Schedule appointments that fit your family's routine and your child's energy levels."
      },
      step4: {
        title: "4. Support their journey",
        description: "Join your child in their online therapy session and support their emotional growth."
      }
    },
    teen: {
      title: "How teen therapy works at LittleMinds",
      subtitle: "From beginning to end, we'll provide a safe space for your teenager to explore and grow.",
      step1: {
        title: "1. Address teen-specific concerns",
        description: "Share your teen's unique challenges and what they hope to achieve through therapy.",
        tags: ["Peer Pressure", "Identity Issues", "Academic Stress", "Family Dynamics"]
      },
      step2: {
        title: "2. Connect with teen specialists",
        description: "Find therapists who specialize in adolescent mental health and development."
      },
      step3: {
        title: "3. Respect their schedule",
        description: "Book sessions that work with your teen's school, activities, and social life."
      },
      step4: {
        title: "4. Empower their independence",
        description: "Support your teen as they engage in their online therapy sessions."
      }
    },
    psychiatry: {
      title: "How psychiatry works at LittleMinds",
      subtitle: "From beginning to end, we'll provide comprehensive psychiatric care for your mental health needs.",
      step1: {
        title: "1. Share your symptoms",
        description: "Describe your mental health symptoms and any previous treatment experiences.",
        tags: ["Medication Management", "Diagnosis", "Treatment Planning", "Monitoring"]
      },
      step2: {
        title: "2. Find your psychiatrist",
        description: "Connect with licensed psychiatrists who can provide medication and therapy."
      },
      step3: {
        title: "3. Schedule your evaluation",
        description: "Book your initial psychiatric evaluation at a time that works for you."
      },
      step4: {
        title: "4. Begin your treatment",
        description: "Start your psychiatric treatment plan with medication and ongoing support."
      }
    }
  };

  const currentContent = content[therapyType] || content.individual;

  // Create carousel data from the steps
  const carouselData = [
    {
      id: 1,
      number: "01",
      title: currentContent.step1.title,
      description: currentContent.step1.description,
      gradient: "conic-gradient(at 50% 50%, #f5f3ff 0deg, #ede9fe 120deg, #e9d5ff 240deg, #f5f3ff 360deg)",
      tags: currentContent.step1.tags || []
    },
    {
      id: 2,
      number: "02",
      title: currentContent.step2.title,
      description: currentContent.step2.description,
      gradient: "conic-gradient(at 50% 50%, #ecfdf5 0deg, #d1fae5 140deg, #a7f3d0 280deg, #ecfdf5 360deg)"
    },
    {
      id: 3,
      number: "03",
      title: currentContent.step3.title,
      description: currentContent.step3.description,
      gradient: "conic-gradient(at 50% 50%, #fff7ed 0deg, #ffedd5 150deg, #fed7aa 300deg, #fff7ed 360deg)"
    },
    {
      id: 4,
      number: "04",
      title: currentContent.step4.title,
      description: currentContent.step4.description,
      gradient: "conic-gradient(at 50% 50%, #ecfeff 0deg, #cffafe 160deg, #bae6fd 320deg, #ecfeff 360deg)"
    }
  ];

  const avatars = [
    "/mainlogo.webp",
    "/360_F_262015638_nxpC4t1wbe8cLiVX3eholwctgVItTqF6.webp",
    "/mainlogo.webp",
    "/360_F_262015638_nxpC4t1wbe8cLiVX3eholwctgVItTqF6.webp",
  ];

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

  // Handle scroll events to sync with navigation dots
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const scrollLeft = scrollContainerRef.current.scrollLeft;
      const cardWidth = 320; // Fixed card width (w-80 = 320px)
      const gap = 16; // gap-4 = 16px
      const totalCardWidth = cardWidth + gap;
      const newSlide = Math.round(scrollLeft / totalCardWidth);
      setCurrentSlide(Math.min(newSlide, carouselData.length - 1));
    }
  };

  // Scroll to specific slide
  const scrollToSlide = (index) => {
    if (scrollContainerRef.current) {
      const cardWidth = 320; // Fixed card width (w-80 = 320px)
      const gap = 16; // gap-4 = 16px
      const totalCardWidth = cardWidth + gap;
      scrollContainerRef.current.scrollTo({
        left: index * totalCardWidth,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="w-full bg-white py-16 mt-8">
      <div className="mx-auto max-w-[1400px] pl-8 pr-16">
        {/* Header */}
        <div className="mb-12 text-center">
          <h2 className="text-[2.5rem] md:text-5xl font-medium text-black mb-4 tracking-[-0.125rem] md:tracking-normal leading-[1.1] md:leading-normal">
            {currentContent.title}
          </h2>
                     <p className="text-base md:text-xl text-black max-w-3xl mx-auto tracking-[-0.0375rem] md:tracking-normal leading-[150%] md:leading-normal">
             {currentContent.subtitle}
           </p>
        </div>

        {/* Process Steps - Carousel Layout */}
        <div className="mt-10 flex flex-col md:flex-row justify-center gap-6 max-w-7xl mx-auto px-4">
          {/* Mobile Carousel */}
          <div className="md:hidden w-full max-w-sm mx-auto">
            {/* Scrollable Carousel Container */}
            <div 
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="relative overflow-x-auto overflow-y-hidden rounded-2xl carousel-scroll snap-x snap-mandatory"
              style={{ scrollSnapType: 'x mandatory' }}
            >
              <div className="flex gap-4 pb-4">
                {carouselData.map((card, index) => (
                  <div 
                    key={card.id} 
                    className="flex-shrink-0 w-80 snap-start"
                  >
                    <div
                      className="rounded-lg p-4 h-[280px] w-full flex flex-col justify-between"
                      style={{ background: card.gradient }}
                    >
                      {/* Header Section */}
                      <div className="flex-shrink-0">
                        <div className="text-xl font-medium text-indigo-900 text-center">{card.number}</div>
                        <h3 className="mt-1 text-sm font-medium text-gray-900 text-center">
                          {card.title}
                        </h3>
                      </div>

                      {/* Content Section */}
                      <div className="flex-1 flex flex-col justify-center">
                        {/* Card-specific content */}
                        {card.id === 1 && card.tags && (
                          <div className="mt-2 flex flex-col gap-1 items-center">
                            {card.tags.map((label) => (
                              <div
                                key={label}
                                className="inline-flex w-fit items-center gap-1 rounded-full border border-gray-200 bg-white/90 px-1.5 py-0.5 text-xs text-gray-900"
                              >
                                <span className="text-indigo-700 text-xs">✓</span>
                                <span>{label}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {card.id === 2 && (
                          <>
                            <div className="mt-6 flex items-center justify-center gap-4">
                              {avatars.map((src, idx) => (
                                <div key={idx} className="relative h-10 w-10 overflow-hidden rounded-full ring-2 ring-white">
                                  <Image src={src} alt="avatar" fill className="object-cover" sizes="40px" />
                                </div>
                              ))}
                            </div>
                            <div className="mt-6 text-center">
                              <p className="text-base font-semibold text-gray-900">Anne Treisman</p>
                              <p className="text-sm text-gray-600">Licensed Psychiatric Provider</p>
                            </div>
                          </>
                        )}

                        {card.id === 3 && (
                          <>
                            <div className="mt-6 flex justify-center">
                              <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/90 px-3 py-1.5 text-sm text-gray-900">
                                <span className="text-indigo-700">📅</span>
                                <span>Evenings After 4pm</span>
                              </div>
                            </div>
                            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-700">
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
                          </>
                        )}

                        {card.id === 4 && (
                          <div className="mt-6 flex items-center justify-center gap-4">
                            <div className="relative h-14 w-14 overflow-hidden rounded-full">
                              <Image
                                src="/360_F_262015638_nxpC4t1wbe8cLiVX3eholwctgVItTqF6.webp"
                                alt="participant"
                                fill
                                className="object-cover"
                                sizes="56px"
                              />
                            </div>
                            <div className="relative h-28 w-40 overflow-hidden rounded-md">
                              <Image
                                src="/mainlogo.webp"
                                alt="provider"
                                fill
                                className="object-cover"
                                sizes="160px"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer Section */}
                      <div className="flex-shrink-0">
                        <p className="mt-4 pt-2 text-xs leading-relaxed text-gray-700 text-center">
                          {card.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Dots */}
            <div className="flex justify-center mt-6 gap-2">
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
            <div className="flex justify-between items-center mt-4 px-4">
              <button 
                onClick={prevSlide} 
                disabled={currentSlide === 0}
                className={`p-2 rounded-full transition-colors duration-200 ${
                  currentSlide === 0 ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-sm text-gray-500">
                {currentSlide + 1} of {carouselData.length}
              </span>
              <button 
                onClick={nextSlide} 
                disabled={currentSlide === carouselData.length - 1}
                className={`p-2 rounded-full transition-colors duration-200 ${
                  currentSlide === carouselData.length - 1 ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mx-auto md:mx-auto ml-4 md:ml-0">
            {/* Step 1 */}
            <div className="text-center ml-2 md:ml-0">
              <div className="bg-purple-100 rounded-2xl p-6 mb-6 h-56 min-w-[320px] flex items-center justify-center">
                <div className="space-y-2">
                  {currentContent.step1.tags?.map((tag, index) => (
                    <div key={index} className="bg-white rounded-full px-4 py-2 text-sm text-gray-600">{tag}</div>
                  ))}
                </div>
              </div>
              <h3 className="text-xl font-medium text-black mb-3 text-left">{currentContent.step1.title}</h3>
              <p className="text-base text-black text-left font-normal tracking-[-0.0375rem] leading-[150%]">
                {currentContent.step1.description}
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center ml-2 md:ml-0">
              <div className="bg-green-100 rounded-2xl p-6 mb-6 h-56 min-w-[320px] flex items-center justify-center">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                  <div className="w-16 h-16 bg-gray-400 rounded-full"></div>
                  <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                  <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                  <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                </div>
              </div>
              <h3 className="text-xl font-medium text-black mb-3 text-left">{currentContent.step2.title}</h3>
              <p className="text-base text-black text-left font-normal tracking-[-0.0375rem] leading-[150%]">
                {currentContent.step2.description}
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center ml-2 md:ml-0">
              <div className="bg-orange-100 rounded-2xl p-6 mb-6 h-56 min-w-[320px] flex flex-col items-center justify-center space-y-4">
                <div className="text-sm font-medium text-gray-700">Mornings Before 12pm</div>
                <div className="flex space-x-2">
                  {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'S'].map((day, index) => (
                    <button
                      key={day}
                      className={`w-8 h-8 rounded-full text-sm font-medium ${
                        day === 'Fr' 
                          ? 'bg-white border-2 border-gray-400 text-gray-700' 
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
              <h3 className="text-xl font-medium text-black mb-3 text-left">{currentContent.step3.title}</h3>
              <p className="text-base text-black text-left font-normal tracking-[-0.0375rem] leading-[150%]">
                {currentContent.step3.description}
              </p>
            </div>

            {/* Step 4 */}
            <div className="text-center ml-2 md:ml-0">
              <div className="bg-blue-100 rounded-2xl p-6 mb-6 h-56 min-w-[320px] flex flex-col items-center justify-center relative">
                <div className="text-center mb-4">
                  <div className="text-sm font-bold text-gray-800">Tyrell Washington</div>
                  <div className="text-xs text-gray-600">LMFT</div>
                </div>
                <div className="w-20 h-20 bg-gray-400 rounded-full mb-4"></div>
                <div className="flex items-center justify-between w-full px-4">
                  <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-gray-600 rounded-full"></div>
                  </div>
                  <button className="bg-red-500 text-white text-xs px-3 py-1 rounded">
                    End
                  </button>
                </div>
              </div>
              <h3 className="text-xl font-medium text-black mb-3 text-left">{currentContent.step4.title}</h3>
              <p className="text-base text-black text-left font-normal tracking-[-0.0375rem] leading-[150%]">
                {currentContent.step4.description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
