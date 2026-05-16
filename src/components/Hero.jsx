"use client";

import Image from "next/image";
import { useState } from "react";
import GuideModal from "@/components/GuideModal";

export default function Hero() {
  const [showGuide, setShowGuide] = useState(false);

  const handleGetStartedClick = () => {
    setShowGuide(true);
  };

  const handleHowItWorksClick = () => {
    const howItWorksSection = document.getElementById('how-it-works');
    if (howItWorksSection) {
      howItWorksSection.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  return (
    <div className="w-full overflow-hidden mt-12">
      <div className="hero-wrapper mx-auto max-w-[1400px] px-0 md:px-0">
        <section 
          className="hero-section hero-home text-black p-4 sm:px-8 sm:py-8 md:px-[50px] md:py-[50px] overflow-hidden relative"
          style={{ 
            backgroundColor: '#E4E4F9',
            border: 'none',
            outline: 'none',
            margin: 0,
            borderRadius: '10px',
            '--hero-desktop-min-height': 'clamp(540px, 60vh, 780px)',
            '--hero-desktop-image-min-height': '480px'
          }}
        >
          <div className="flex flex-col xl:flex-row w-full hero-content-wrapper" style={{ minHeight: 'inherit', border: 'none', outline: 'none', margin: 0, padding: 0 }}>
            {/* Left: Text */}
            <div className="hero-text flex flex-col justify-center xl:w-[45%] xl:order-1 xl:pl-2 text-center xl:text-left items-center xl:items-start mt-0 px-0 sm:px-0 order-1">
              {/* Badge */}
              <div className="hero-badge inline-flex items-center gap-2 border border-gray-200 rounded-full px-3 py-1 text-gray-800 w-fit mx-auto xl:mx-0" style={{ backgroundColor: 'rgba(242, 242, 252, 0.7)' }}>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span className="hero-badge-text text-xs sm:text-sm">Convenient, proven online care for brighter future</span>
              </div>
              
              <h1 className="hero-title mt-4 text-4xl md:text-5xl lg:text-6xl font-medium break-words" style={{ color: '#2C1A4A', fontWeight: 600}}>
                Your Partner in <br /> Child Counseling <br /> & Parenting Support
              </h1>
              <p className="hero-description p1 mt-6 md:mt-6 text-base md:text-lg">
                 Connect with a trusted child psychologist online for gentle, child-friendly counselling from the comfort of your home, helping your child feel safe, supported, and understood without the stress of travel.
              </p>
              <div className="hero-buttons mt-6 md:mt-8 flex flex-col items-center gap-4 sm:flex-row sm:gap-6 sm:justify-start">
                <button
                  onClick={handleGetStartedClick}
                  className="inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-normal text-white shadow-sm transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#593494]/40"
                  style={{ backgroundColor: '#3f2e73' }}
                  type="button"
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d1733'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3f2e73'}
                >
                  <span style={{ fontWeight: 500 }}>Get Started</span>
                </button>
                <button
                  type="button"
                  onClick={handleHowItWorksClick}
                  className="inline-flex items-center justify-center gap-3 text-base font-normal text-black hover:text-gray-800 group relative cursor-pointer"
                >
                  <span className="relative">
                    How does it work?
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gray-800 transition-all duration-300 ease-out group-hover:w-full"></span>
                  </span>
                  <div className="w-5 h-5 border border-gray-800 rounded-full flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-2.5 w-2.5 text-gray-800"
                      aria-hidden="true"
                    >
                      <path d="M12 5v14M19 12l-7 7-7-7"/>
                    </svg>
                  </div>
                </button>
              </div>
            </div>

            {/* Mobile / Tablet / Small-laptop Image */}
            <div className="hero-mobile-wrapper block xl:hidden order-2 mt-6 w-screen relative left-1/2 right-1/2 -translate-x-1/2">
              <div className="relative w-full hero-image-box overflow-hidden flex items-end" style={{ minHeight: 'auto', border: 'none', outline: 'none', boxShadow: 'none' }}>
                <Image
                  src="/hee.webp"
                  alt="Hero illustration of a child with a parent during online counseling"
                  fill
                  className="hero-mobile-image object-bottom w-full h-full"
                  sizes="100vw"
                  priority
                  style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                />
              </div>
            </div>

            {/* Desktop Image (large laptop and above, aligned with header desktop nav breakpoint) */}
            <div className="desktop-hero-image hidden xl:block xl:w-[55%] xl:h-full xl:order-2 relative overflow-hidden" style={{ border: 'none', outline: 'none', minHeight: 'var(--hero-desktop-image-min-height)', marginRight: '-15px', marginTop: '0px', marginBottom: '-50px', width: 'calc(55% + 15px)', position: 'absolute', right: 0, top: 0, bottom: 0 }}>
              {/* Responsive image box aligned to bottom of column */}
              <div className="hero-image-box absolute inset-0 flex items-end justify-center" style={{ border: 'none', outline: 'none', boxShadow: 'none' }}>
                <Image
                  src="/hee.webp"
                  alt="Hero illustration showing Koott’s child counseling and parent support"
                  fill
                  className="object-contain object-bottom"
                  sizes="55vw"
                  loading="eager"
                  style={{ border: 'none', outline: 'none', boxShadow: 'none', objectPosition: 'center bottom', transform: 'scale(1.0)', transformOrigin: 'bottom center' }}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
      {showGuide && (
        <GuideModal open={showGuide} onClose={() => setShowGuide(false)} />
      )}
    </div>
  );
}