"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import GuideModal from '@/components/GuideModal';

export default function MissionHero() {
  const [showGuide, setShowGuide] = useState(false);

  const handleGetStartedClick = () => {
    setShowGuide(true);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .mission-hero-container {
          height: auto;
          min-height: auto;
        }
        @media (min-width: 768px) {
          .mission-hero-container {
            height: auto;
            min-height: 100vh;
          }
        }
        @media (min-width: 768px) and (max-width: 1180px) and (max-height: 1180px) {
          .mission-hero-container {
            height: auto;
            min-height: 60vh;
          }
        }
        @media (max-width: 767px) {
          .mission-hero-container {
            height: auto;
            min-height: auto;
          }
        }
        .mission-hero-image-container {
          width: 100%;
          max-width: 100%;
        }
        @media (max-width: 767px) {
          h1.mission-hero-title {
            line-height: 1.0 !important;
            margin-bottom: 0.5rem;
          }
          h1.mission-hero-title br {
            display: none;
          }
          .mission-hero-header {
            padding-top: 6rem;
            margin-top: 1rem;
            padding-bottom: 0;
          }
          .mission-hero-header p {
            margin-bottom: 0.5rem;
            line-height: 1.3;
          }
          .mission-hero-button {
            margin-bottom: 0;
            margin-top: 2rem;
          }
          .mission-hero-image {
            padding-top: 0;
            padding-bottom: 0;
            margin-top: 2rem;
            flex: 0 0 auto;
          }
          .mission-hero-image-container {
            max-width: 100%;
            height: auto;
            max-height: 40vh;
          }
        }
        @media (min-width: 768px) {
          .mission-hero-image {
            flex: 0 1 auto;
          }
        }
        @media (min-width: 768px) and (max-width: 1180px) and (max-height: 1180px) {
          .mission-hero-image-container {
            max-width: 80%;
            max-height: 45vh;
          }
        }
        @media (min-width: 1024px) and (max-width: 1279px) {
          .mission-hero-image-container {
            max-width: 70%;
            max-height: 50vh;
          }
        }
        @media (min-width: 1280px) {
          .mission-hero-image-container {
            max-width: 60%;
            max-height: 55vh;
          }
        }
      `}} />
      <div className="mission-hero-container w-full bg-gradient-to-b from-purple-50 to-purple-100 flex flex-col">
        {/* Row 1: Header Content */}
        <div className="mission-hero-header flex flex-col items-center px-6 pt-16 md:pt-16 mt-8 md:mt-8 text-center">
          <h1 
            className="mission-hero-title text-[2.5rem] md:text-4xl lg:text-5xl font-medium leading-[1.0] md:leading-tight mb-6 md:mb-6 max-w-4xl tracking-[-0.195rem]"
            style={{ color: '#1d1733' }}
          >
            Our mission is to make care <br /> feel closer, calmer, and real.
          </h1>
          
          <p className="text-[1rem] md:text-lg lg:text-xl text-gray-700 mb-8 md:mb-8 max-w-4xl leading-[1.3rem] md:leading-relaxed">
          Because every child deserves care that truly connects.
          </p>
        </div>

        {/* Row 2: Button */}
        <div className="mission-hero-button flex justify-center items-center w-full mb-8 md:mb-8">
          <button 
            type="button"
            onClick={handleGetStartedClick}
            className="px-8 py-3 bg-[#3f2e73] text-white font-semibold text-sm rounded-full transition-colors duration-200 shadow-lg"
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1d1733'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#3f2e73'; }}
          >
            Explore how we can help
          </button>
        </div>

        {/* Row 3: Hero Image */}
        <div className="mission-hero-image flex-1 flex items-end justify-center px-6 pb-4">
          <div className="mission-hero-image-container relative w-full aspect-video">
            <Image
              src="/aboutushero.webp"
              alt="Koott mission illustration - making mental health care closer, calmer, and real for children"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
      </div>
      {showGuide && (
        <GuideModal open={showGuide} onClose={() => setShowGuide(false)} />
      )}
    </>
  );
}
