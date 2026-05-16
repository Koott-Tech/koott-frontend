"use client";

import Image from "next/image";
import { normalizeImageUrl } from '@/utils/urlNormalizer';

export default function Reviews({ cmsData = null }) {
  const defaultReviews = [
    {
      name: "Emma Thompson",
      handle: "@emmaai",
      avatar: "/testimonialgirl.png",
      text:
        "Using Koott has transformed how we support our child. The therapists are warm and the progress is visible.",
    },
    {
      name: "David Park",
      handle: "@davidtech",
      avatar: "/testimonial5.PNG",
      text:
        "Very professional and easy to schedule. We saw major improvements in a short time.",
    },
    {
      name: "Sofia Rodriguez",
      handle: "@sofiaml",
      avatar: "/TESTIMONIALS 4.webp",
      text:
        "Therapists are kind and skilled. My child feels heard and safe during sessions.",
    },
  ];

  const reviews = (cmsData?.reviews && Array.isArray(cmsData.reviews) && cmsData.reviews.length > 0)
    ? cmsData.reviews
    : defaultReviews;

  // Always use marquee/scrolling for better UX - duplicate reviews for seamless loop
  const loopReviews = reviews.length > 0 ? [...reviews, ...reviews, ...reviews] : defaultReviews;

  return (
    <section className="w-screen py-0 mt-4 md:mt-0">
      <style jsx>{`
        h3.reviews-subheading {
          font-size: 0.875rem !important; /* text-sm - 14px */
          font-weight: 400 !important;
          margin: 0 !important;
          padding: 0 !important;
          margin-top: 0.5rem !important;
          margin-bottom: 3.5rem !important;
          line-height: 1.5 !important;
        }
        @media (min-width: 768px) {
          h3.reviews-subheading {
            font-size: 1rem !important; /* text-base - 16px */
          }
        }
        .marquee {
          display: flex;
          gap: 16px;
          width: max-content;
          animation: scroll-left 90s linear infinite;
        }
        @media (max-width: 767px) {
          .marquee {
            animation: scroll-left 20s linear infinite;
          }
        }
        .marquee:hover { animation-play-state: paused; }
        @keyframes scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
      <div className="w-full px-0">
        <div className="text-center" style={{ marginBottom: '20px' }}>
          <h2 className="how-it-works-heading text-base md:text-xl lg:text-2xl" style={{ fontSize: '24px', fontWeight: 600, lineHeight: '1.1' }}>{cmsData?.title || 'What parents say'}</h2>
          <h3 className="text-sm md:text-base text-gray-600 mt-2 mb-14 reviews-subheading">Real experiences from families like yours</h3>
        </div>

        {/* Always show scrolling marquee */}
        <div className="relative overflow-hidden" style={{ marginBottom: '0px' }}>
          <div className="marquee">
            {loopReviews.map((r, idx) => {
              const avatarSrc = normalizeImageUrl(r.avatarUrl || r.avatar || (idx % 3 === 0 ? '/testimonialgirl.png' : idx % 3 === 1 ? '/testimonial5.PNG' : '/TESTIMONIALS 4.webp'));
              const rawName = r.author || r.name || 'Parent';
              const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
              const handle = r.handle;
              return (
                <div key={idx} className="min-w-[280px] max-w-[320px] rounded-[10px] border border-gray-200 bg-white p-4 md:p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center relative">
                      {avatarSrc ? (
                        <Image src={avatarSrc} alt={`${displayName} - Parent review avatar`} fill className="object-cover" sizes="40px" />
                      ) : (
                        <span className="text-gray-500 text-sm">🙂</span>
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm md:text-base">{displayName}</div>
                      {handle && (<div className="text-gray-500 text-xs md:text-sm">{handle}</div>)}
                    </div>
                  </div>
                  <p className="text-gray-800 text-sm md:text-base leading-relaxed">{r.text}</p>
                </div>
              );
            })}
          </div>
        </div>
        {/* space below the carousel */}
        
      </div>
    </section>
  );
}


