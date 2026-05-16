"use client";

import Image from "next/image";
import { useState } from "react";
import GuideModal from "@/components/GuideModal";

export default function ChooseOptions() {
  const [showGuide, setShowGuide] = useState(false);
  const [defaultCategory, setDefaultCategory] = useState(null);
  const cards = [
    {
      id: 1,
      tags: ["Counseling", "Emotions"],
      title: "Child\nCounseling",
      description: "A safe space for your kids to express & grow.",
      image: "/Child Counseling.webp",
      gradient: "from-[#DEEFDC] to-white",
      tagColors: {
        primary: "bg-white text-black",
        secondary: "bg-white text-black"
      },
      imageClass: "object-cover object-[50%_100%]"
    },
    {
      id: 2,
      tags: ["Assessments", "Tests"],
      title: "Child\nAssessment", 
      description: "Find your child's needs & strengths to grow.",
      image: "/Child Assessment.webp",
      gradient: "from-[#f1e7f9] to-white",
      tagColors: {
        primary: "bg-white text-black",
        secondary: "bg-white text-black"
      },
      imageClass: "object-cover object-[50%_100%]"
    },
    {
      id: 3,
      tags: ["Parents", "Workshops"],
      title: "Better\nParenting",
      description: "Learn, Connect & Build a wonderful home.", 
      image: "/Better parenting.webp",
      gradient: "from-[#fff4e2] to-white",
      tagColors: {
        primary: "bg-white text-black",
        secondary: "bg-white text-black"
      },
      imageClass: "object-cover object-[50%_100%] scale-110"
    }
  ];

  const openGuide = (categoryKey) => {
    setDefaultCategory(categoryKey);
    setShowGuide(true);
  };

  return (
    <section
      id="choose-your-guide"
      className="w-full py-2 px-4 md:px-4 mt-12 md:mt-20 scroll-mt-48"
    >
      <style jsx>{`
        @media (max-width: 479px) {
          .cards-grid {
            gap: 20px !important;
            max-width: 280px !important;
          }
          .card-container {
            width: 100% !important;
            max-width: 260px !important;
            height: 450px !important;
            min-height: 450px !important;
            max-height: 450px !important;
          }
          .card-image {
            height: 280px !important;
            top: 170px !important;
          }
          .read-more-button {
            bottom: 75px !important;
            left: 20px !important;
          }
          h2.choose-options-heading {
            font-size: 24px !important;
            font-weight: 600 !important;
            line-height: 1.1 !important;
            text-align: center;
            padding-left: 0;
            padding-right: 0;
          }
        }
        @media (min-width: 480px) and (max-width: 599px) {
          .cards-grid {
            gap: 22px !important;
            max-width: 320px !important;
          }
          .card-container {
            width: 100% !important;
            max-width: 300px !important;
            height: 480px !important;
            min-height: 480px !important;
            max-height: 480px !important;
          }
          .card-image {
            height: 340px !important;
            top: 175px !important;
          }
          .read-more-button {
            bottom: 85px !important;
            left: 22px !important;
          }
          h2.choose-options-heading {
            font-size: 24px !important;
            font-weight: 600 !important;
            line-height: 1.1 !important;
            text-align: center;
            padding-left: 0;
            padding-right: 0;
          }
        }
        @media (min-width: 600px) and (max-width: 767px) {
          .cards-grid {
            gap: 24px !important;
            max-width: 350px !important;
          }
          .card-container {
            width: 100% !important;
            max-width: 320px !important;
            height: 500px !important;
            min-height: 500px !important;
            max-height: 500px !important;
          }
          .card-image {
            height: 380px !important;
            top: 180px !important;
          }
          .read-more-button {
            bottom: 95px !important;
            left: 24px !important;
          }
          h2.choose-options-heading {
            font-size: 24px !important;
            font-weight: 600 !important;
            line-height: 1.1 !important;
            text-align: center;
            padding-left: 0;
            padding-right: 0;
          }
        }
        @media (max-width: 767px) {
          .choose-options-heading {
            max-width: 100% !important;
          }
          .card-content {
            padding: 20px !important;
            padding-bottom: 0 !important;
          }
          .card-title {
            font-size: 24px !important;
            margin-bottom: 8px !important;
            line-height: 1.1 !important;
          }
          .card-description {
            font-size: 14px !important;
          }
          .card-image img {
            transform: scale(0.9) !important;
            object-position: center center !important;
          }
        }
          @media (min-width: 768px) {
            .card-container {
              height: 500px !important;
              min-height: 500px !important;
              max-height: 500px !important;
              align-self: stretch !important;
            }
            .cards-grid {
              grid-template-rows: 500px !important;
              align-items: stretch !important;
            }
            .card-image {
              top: 180px !important;
            }
          }
          /* Override h3 tag font size to match original span size */
          .card-tag-pill {
            font-size: 12px !important;
            line-height: 1 !important;
            margin: 0 !important;
            font-weight: 300 !important; /* lighter weight to reduce boldness */
            padding: 2px 8px !important;
          }
      `}</style>
      <div className="mx-auto max-w-[1400px]">
        {/* Header */}
        <div className="text-center md:text-left mb-8 md:mb-6 max-w-4xl mx-auto px-4">
          <p className="p1 text-base md:text-lg mb-2">Let us guide you.</p>
          <h2 className="choose-options-heading text-base md:text-xl lg:text-2xl font-semibold" style={{ fontSize: '24px', fontWeight: 600, lineHeight: '1.1' }}>
            Choose the Right Child Counseling Option to Get Started
          </h2>
        </div>

        {/* Cards Grid */}
        <div className="cards-grid grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 lg:gap-20 max-w-md md:max-w-4xl mx-auto justify-items-center md:justify-items-stretch items-stretch rounded-[37.8px]">
          {cards.map((card) => (
            <div
              key={card.id}
              className={`card-container relative bg-white rounded-[20px] overflow-hidden flex flex-col h-[500px] md:h-[500px] min-h-[500px] md:min-h-[500px] max-h-[500px] md:max-h-[500px] flex-shrink-0 cursor-pointer`}
              onClick={() => {
                const mapping = { 1: 'counselling', 2: 'assessments', 3: 'better-parenting' };
                openGuide(mapping[card.id]);
              }}
              style={{ height: '500px' }}
            >
              {/* Colored background that matches image width */}
              <div className={`absolute top-0 left-0 right-0 bottom-0 bg-gradient-to-b ${card.gradient} pointer-events-none z-0 rounded-[10px]`} />
              {/* White gradient overlay from half to bottom - matches image width on mobile */}
              <div className="absolute top-1/2 left-0 right-0 bottom-0 bg-gradient-to-b from-transparent to-white pointer-events-none z-0 rounded-b-[10px]" />
              {/* Card Content */}
              <div className="card-content p-6 pb-0 mb-0 px-6 md:px-8 relative z-10">
                {/* Tags */}
                <div className="flex gap-2 mb-4">
                  <h3
                    className={`card-tag-pill rounded-full ${card.tagColors.primary}`}
                    style={{ fontFamily: 'inherit' }}
                  >
                    {card.tags[0]}
                  </h3>
                  <h3
                    className={`card-tag-pill rounded-full ${card.tagColors.secondary}`}
                    style={{ fontFamily: 'inherit' }}
                  >
                    {card.tags[1]}
                  </h3>
                </div>

                {/* Title */}
                <h5 className="card-title text-2xl md:text-3xl lg:text-4xl font-medium text-gray-900 mb-1 whitespace-pre-line" style={{ fontWeight: 'bold' }}>
                  {card.title}
                </h5>

                {/* Description */}
                <p className="card-description p1 text-sm md:text-sm mb-0" style={{ lineHeight: '1.3' }}>
                  {card.description}
                </p>
              </div>

              {/* Image Section */}
              <div className="card-image absolute left-0 right-0 z-10 h-[320px] md:h-64 min-h-[320px] md:min-h-64 max-h-[320px] md:max-h-64 overflow-hidden rounded-[20px]" style={{ top: '160px' }}>
                <Image
                  src={card.image}
                  alt={card.title}
                  fill
                  className={`${card.imageClass ? `${card.imageClass.replace('object-[50%_100%]', 'object-center')}` : "object-cover object-center md:object-[50%_100%]"}`}
                  sizes="(max-width: 768px) 100vw, 33vw"
                  priority={card.image === "/Child Assessment.webp"}
                />
                
                {/* Read More Button */}
                <div className="read-more-button absolute bottom-6 md:bottom-8 left-6">
                  <button className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white p-0 h-8 rounded-2xl text-sm font-medium transition-all duration-200 flex items-center shadow-sm border border-white/20 overflow-hidden group">
                    <span className="px-3">Find more</span>
                     <span className="w-8 h-8 rounded-full bg-white flex items-center justify-center group-hover:bg-[#EAE4F4] transition-colors duration-200">
                      <svg
                        className="w-3.5 h-3.5 group-hover:scale-110 transition-all duration-200"
                        fill="none"
                        stroke="#000000"
                        strokeOpacity="0.6"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {showGuide && (
          <GuideModal open={showGuide} onClose={() => setShowGuide(false)} defaultCategory={defaultCategory} />
        )}
      </div>
    </section>
  );
}