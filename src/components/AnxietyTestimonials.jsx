"use client";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";

export default function AnxietyTestimonials() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollContainerRef = useRef(null);
  const autoPlayRef = useRef(null);
  
  const photos = [
    { src: "/thumb1.jpg", alt: "Smiling parent and child" },
    { src: "/thumb2.jpg", alt: "Family smiling" },
    { src: "/thumb3.jpg", alt: "Happy child" },
    { src: "/thumb4.jpg", alt: "Family moment" },
    { src: "/kids.png", alt: "Happy family" }
  ];

  const nextSlide = () => {
    stopAutoPlay(); // Stop auto-play when user clicks
    const newSlide = (currentSlide + 1) % photos.length;
    setCurrentSlide(newSlide);
    scrollToSlide(newSlide);
    // Restart auto-play after delay
    setTimeout(() => startAutoPlay(), 2000);
  };

  const prevSlide = () => {
    stopAutoPlay(); // Stop auto-play when user clicks
    const newSlide = (currentSlide - 1 + photos.length) % photos.length;
    setCurrentSlide(newSlide);
    scrollToSlide(newSlide);
    // Restart auto-play after delay
    setTimeout(() => startAutoPlay(), 2000);
  };

  const goToSlide = (index) => {
    stopAutoPlay(); // Stop auto-play when user clicks
    setCurrentSlide(index);
    scrollToSlide(index);
    // Restart auto-play after delay
    setTimeout(() => startAutoPlay(), 2000);
  };

  // Handle scroll events to sync with navigation dots
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const scrollLeft = scrollContainerRef.current.scrollLeft;
      const cardWidth = 280; // Fixed card width
      const gap = 16; // gap-4 = 16px
      const totalCardWidth = cardWidth + gap;
      const newSlide = Math.round(scrollLeft / totalCardWidth);
      setCurrentSlide(newSlide);
    }
  };

  const scrollToSlide = (index) => {
    if (scrollContainerRef.current) {
      const cardWidth = 280; // Fixed card width
      const gap = 16; // gap-4 = 16px
      const totalCardWidth = cardWidth + gap;
      scrollContainerRef.current.scrollTo({
        left: index * totalCardWidth,
        behavior: 'smooth'
      });
    }
  };

  const startAutoPlay = () => {
    autoPlayRef.current = setInterval(() => {
      setCurrentSlide(prev => {
        const newSlide = (prev + 1) % photos.length;
        scrollToSlide(newSlide);
        return newSlide;
      });
    }, 3000);
  };

  const stopAutoPlay = () => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
      autoPlayRef.current = null;
    }
  };

  useEffect(() => {
    startAutoPlay();
    return () => stopAutoPlay();
  }, []);

  return (
    <section className="w-full bg-white">
      <div className="mx-auto max-w-[1600px] px-0 md:px-1 py-12 md:py-16">
        <h2 className="text-3xl md:text-[44px] font-semibold tracking-tight text-gray-900 text-center leading-[1.1] md:leading-normal">
          Hear from our patients
        </h2>
        <p className="text-gray-600 text-center mt-3 mb-10 text-base md:text-lg">
          We're making online therapy work the way it should.
        </p>

        {/* Desktop Grid Layout */}
        <div className="hidden md:grid md:grid-cols-5 gap-1 px-2.5">
          {/* First column: 2 text reviews stacked */}
          <div className="h-[640px] rounded-[10px] overflow-hidden flex flex-col p-1 gap-3">
            <div className="rounded-[10px] bg-[#E6F5EC] border border-gray-200 p-4" style={{height: '314px'}}>
              <p className="text-[15px] leading-relaxed text-gray-900">
                "My 9-year-old struggled with anxiety, and I felt helpless. The online counseling gave him tools to feel safe, and I finally felt supported as a parent too."
              </p>
              <div className="mt-3 text-xs text-gray-600 font-medium">Priya, Parent of a 9-year-old</div>
            </div>
            <div className="rounded-[10px] bg-[#ECEBFF] border border-gray-200 p-4" style={{height: '314px'}}>
              <p className="text-[15px] leading-relaxed text-gray-900">
                "We were unsure about online sessions, but they worked wonders. My daughter now looks forward to her therapy, and I've learned how to support her anxiety better."
              </p>
              <div className="mt-3 text-xs text-gray-600 font-medium">Rahul, Parent of an 8-year-old</div>
            </div>
          </div>

          {/* Second column: testimonial5.PNG */}
          <div className="h-[640px] rounded-[10px] overflow-hidden flex flex-col p-0">
            <div className="flex-1 rounded-[10px] relative overflow-hidden">
              <Image src="/testimonial5.PNG" alt="Testimonial" fill className="object-cover object-top scale-100" />
            </div>
          </div>

          {/* Third column: split 40% top (text review), 60% bottom (image) */}
          <div className="h-[640px] rounded-[10px] overflow-hidden flex flex-col p-1 gap-3">
            <div className="rounded-[10px] bg-[#ECEBFF] border border-gray-200 p-3 flex flex-col" style={{height: '231px', marginBottom: '0'}}>
              <p className="text-[13px] leading-snug text-gray-900">
                "At first I was nervous, but my therapist made me feel safe. We play games and talk about my worries. Now I'm not scared to go to school."
              </p>
              <div className="mt-2 text-[11px] text-gray-600 font-medium">Riya, 9 years old</div>
            </div>
            <div className="rounded-[10px] relative overflow-hidden mb-0" style={{height: '391px', marginTop: '0'}}>
              <Image src="/TESTIMONIALS 4.webp" alt="Testimonial" fill className="object-cover object-bottom scale-100" />
            </div>
          </div>

          {/* Fourth column: split 30% top (image), 70% bottom (image) */}
          <div className="h-[640px] rounded-[10px] overflow-hidden flex flex-col p-0 px-1 gap-3">
            <div className="rounded-[10px] relative overflow-hidden mb-0" style={{height: '184px'}}>
              <Image src="/TESTIMONIALS 1.webp" alt="Testimonial" fill className="object-cover object-bottom scale-100" />
            </div>
            <div className="rounded-[10px] relative overflow-hidden mb-0" style={{height: '444px'}}>
              <Image src="/testimonial3.PNG" alt="Testimonial" fill className="object-cover object-bottom scale-100" />
            </div>
          </div>

          {/* Fifth column: split 50% top (image), 50% bottom (text review) */}
          <div className="h-[640px] rounded-[10px] overflow-hidden flex flex-col p-0 px-1 gap-3">
            <div className="rounded-[10px] relative overflow-hidden mb-0" style={{height: '314px'}}>
              <Image src="/testimonial2.PNG" alt="Testimonial" fill className="object-cover object-bottom scale-100" />
            </div>
            <div className="rounded-[10px] bg-[#FFFBE6] border border-gray-200 p-3 flex flex-col" style={{height: '314px'}}>
              <p className="text-[13px] leading-snug text-gray-900">
                "The strategies we learned help both at school and home. My daughter feels heard, and I feel confident in how to support her."
              </p>
              <div className="mt-2 text-[11px] text-gray-600 font-medium">Meera, Parent of a 10-year-old</div>
            </div>
          </div>
        </div>

        {/* Mobile Carousel */}
        <div className="md:hidden">
          <div 
            className="flex gap-4 overflow-x-auto scrollbar-hide pb-4"
            ref={scrollContainerRef}
            onScroll={handleScroll}
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {photos.map((photo, index) => (
              <div key={index} className="flex-shrink-0 w-70 h-96 rounded-lg overflow-hidden" style={{ scrollSnapAlign: 'start' }}>
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  width={280}
                  height={384}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>

          {/* Navigation Dots */}
          <div className="flex justify-center mt-6 gap-2">
            {photos.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-colors duration-200 ${
                  currentSlide === index ? 'bg-gray-800' : 'bg-gray-300'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Navigation Arrows */}
          <div className="flex justify-between items-center mt-4 px-4">
            <button
              onClick={prevSlide}
              className="p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow duration-200"
              aria-label="Previous slide"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={nextSlide}
              className="p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow duration-200"
              aria-label="Next slide"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
