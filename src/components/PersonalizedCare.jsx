"use client";

import Image from "next/image";

export default function PersonalizedCare() {
  return (
    <section className="w-full personalized-care-section">
      <style jsx>{`
        @media (min-width: 768px) and (max-width: 1180px) and (max-height: 1180px) {
          .personalized-care-heading {
            font-size: 32px;
            font-weight: 600;
            line-height: 1.1;
          }
        }
        @media (max-width: 767px) {
          .personalized-care-section {
            margin-top: 64px !important;
            margin-bottom: 64px !important;
          }
          h2.personalized-care-heading {
            font-size: 24px !important;
            font-weight: 600 !important;
            line-height: 1.1 !important;
            text-align: center;
            padding-left: 0;
            padding-right: 0;
          }
          .personalized-care-description {
            line-height: 1.2 !important;
          }
          .personalized-care-image-wrapper .personalized-care-image-container {
            margin-top: 70px !important;
            margin-bottom: 40px !important;
          }
        }
        .personalized-care-section {
          padding-top: 0 !important;
          padding-bottom: 0 !important;
        }
        @media (min-width: 768px) {
          .personalized-care-section {
            margin-top: 0 !important;
            margin-bottom: 0 !important;
          }
        }
        .personalized-care-image-wrapper {
          margin-top: 0 !important;
          margin-bottom: 0 !important;
          padding-top: 0 !important;
          padding-bottom: 0 !important;
        }
        .personalized-care-image-container {
          padding-top: 0 !important;
          padding-bottom: 0 !important;
        }
        @media (min-width: 768px) {
          .personalized-care-image-container {
            margin-top: 0 !important;
            margin-bottom: 0 !important;
          }
        }
        .personalized-care-image-container img {
          margin-top: 0 !important;
          margin-bottom: 0 !important;
          padding-top: 0 !important;
          padding-bottom: 0 !important;
          display: block !important;
        }
        .personalized-care-content {
          margin-bottom: 0 !important;
          padding-bottom: 0 !important;
        }
        @media (min-width: 768px) {
          .personalized-care-section {
            margin-top: 0 !important;
            margin-bottom: 0 !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
          }
          .personalized-care-content {
            margin-top: 0 !important;
            margin-bottom: 0 !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
          }
          .personalized-care-section > div {
            margin-top: 0 !important;
            margin-bottom: 0 !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
          }
          .personalized-care-header {
            margin-bottom: 0 !important;
            padding-bottom: 0 !important;
          }
          .personalized-care-heading {
            margin-bottom: 0 !important;
            padding-bottom: 0 !important;
          }
          .personalized-care-description {
            margin-bottom: 0 !important;
            padding-bottom: 0 !important;
            line-height: 1.4 !important;
          }
          .personalized-care-header + .personalized-care-image-wrapper {
            margin-top: 0 !important;
            padding-top: 0 !important;
          }
          .personalized-care-image-wrapper {
            margin-top: 0 !important;
            margin-bottom: 0 !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
            gap: 0 !important;
            row-gap: 0 !important;
            column-gap: 0 !important;
          }
          .personalized-care-image-wrapper .personalized-care-image-container {
            margin-top: 96px !important;
            margin-bottom: 96px !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
            max-width: 550px !important;
            width: 100% !important;
          }
          @media (min-width: 1024px) {
            .personalized-care-image-wrapper .personalized-care-image-container {
              max-width: 800px !important;
            }
          }
          @media (min-width: 1280px) {
            .personalized-care-image-wrapper .personalized-care-image-container {
              max-width: 1000px !important;
            }
          }
          .personalized-care-image-container img,
          .personalized-care-image-container span,
          .personalized-care-image-container picture {
            margin-top: 0 !important;
            margin-bottom: 0 !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
            display: block !important;
            vertical-align: top !important;
            line-height: 0 !important;
            font-size: 0 !important;
          }
          .personalized-care-image-container {
            line-height: 0 !important;
            font-size: 0 !important;
          }
          .personalized-care-image-wrapper {
            line-height: 0 !important;
            font-size: 0 !important;
          }
        }
      `}</style>
      <div className="w-full px-4 sm:px-6 md:px-0 personalized-care-content" style={{ marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}>
        {/* Header Section */}
        <div className="text-center max-w-4xl mx-auto px-4 personalized-care-header" style={{ marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}>
          <h2 className="personalized-care-heading mb-0 mx-auto text-lg md:text-2xl lg:text-3xl" style={{ fontSize: '24px', fontWeight: 600, marginTop: 0, marginBottom: 0, lineHeight: '1.1' }}>
            The care your child needs,<br className="hidden md:inline" /> whenever you need it
          </h2>
          <p className="p1 text-sm md:text-base lg:text-lg max-w-3xl mx-auto personalized-care-description" style={{ marginTop: '12px', marginBottom: 0, paddingBottom: 0, paddingTop: 0 }}>
            Wherever you are, Koott offers a safe space with trusted child psychologists and gentle child counseling whenever you need it.
          </p>
        </div>

        {/* Images - No top/bottom padding */}
        <div className="flex items-center justify-center personalized-care-image-wrapper" style={{ marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0, borderBottom: 'none' }}>
          {/* Mobile Image - Hidden on laptop */}
          <div className="w-full max-w-[380px] sm:max-w-[480px] md:max-w-[550px] h-[190px] sm:h-[270px] md:h-[350px] rounded-2xl overflow-hidden mx-auto md:hidden personalized-care-image-container" style={{ marginTop: '70px', marginBottom: '40px', paddingTop: 0, paddingBottom: 0 }}>
            <Image
              src="/Little Hope.webp"
              alt="Illustration of a child and parent receiving personalized emotional care"
              width={1000}
              height={667}
              className="w-full h-full object-contain"
              sizes="(max-width: 640px) 380px, (max-width: 768px) 480px, 550px"
              style={{ margin: 0, padding: 0 }}
            />
          </div>
          {/* Laptop Image - Hidden on mobile */}
          <div className="hidden md:block w-full max-w-[550px] lg:max-w-[800px] xl:max-w-[1000px] rounded-2xl overflow-hidden mx-auto personalized-care-image-container" style={{ marginTop: '96px', marginBottom: '96px', paddingTop: 0, paddingBottom: 0 }}>
            <Image
              src="/Little Hope lap.webp"
              alt="Desktop illustration of Koott’s child counseling and parent support"
              width={1000}
              height={667}
              className="w-full h-auto object-contain"
              sizes="(max-width: 1024px) 550px, (max-width: 1280px) 800px, 1000px"
              priority
              style={{ margin: 0, padding: 0, display: 'block', height: 'auto' }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
