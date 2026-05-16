// Server Component - No "use client" directive
// Individual components handle their own client-side needs
import Header from "../components/Header";
import Hero from "../components/Hero";
import ChooseOptions from "../components/ChooseOptions";
import ConsultationBanner from "../components/ConsultationBanner";
// import LogosStrip from "../components/LogosStrip";
import PersonalizedCare from "../components/PersonalizedCare";
import FeatureCards from "../components/FeatureCards";
import HowItWorks from "../components/HowItWorks";
import Testimonials from "../components/Testimonials";
import ResultsSplit from "../components/ResultsSplit";
import InfoCards from "../components/InfoCards";
import BlogTeaser from "../components/BlogTeaser";
import HelpFaq from "../components/HelpFaq";
import SupportFaq from "../components/SupportFaq";
import Link from "next/link";

export default function Home() {
  return (
    <main className="pt-8">
      <style dangerouslySetInnerHTML={{
        __html: `
          @media (max-width: 767px) {
            .sister-brands-text {
              text-align: left !important;
            }
            .sister-brands-container {
              align-items: flex-start !important;
              justify-content: flex-start !important;
            }
            .sister-brands-content {
              flex-direction: row !important;
              align-items: flex-start !important;
            }
            .sister-brands-nav {
              justify-content: flex-start !important;
              width: 100% !important;
              margin-top: 16px !important;
            }
            .sister-brands-container {
              justify-content: flex-start !important;
            }
          }
          .sister-brands-nav a,
          .sister-brands-nav span,
          .sister-brands-nav a[href] {
            cursor: pointer !important;
          }
          .tooltip-container {
            position: relative;
            display: inline-block;
          }
          .tooltip-popup {
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            margin-bottom: 8px;
            padding: 6px 12px;
            background-color: white;
            color: #1f2937;
            font-size: 12px;
            border-radius: 6px;
            white-space: nowrap;
            z-index: 1000;
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
            transition: opacity 0.2s ease-in-out, visibility 0.2s ease-in-out;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            border: 1px solid #e5e7eb;
            min-width: max-content;
            max-width: calc(100vw - 32px);
          }
          .tooltip-popup::after {
            content: '';
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            border: 5px solid transparent;
            border-top-color: white;
          }
          .tooltip-container:hover .tooltip-popup,
          .tooltip-container:active .tooltip-popup {
            opacity: 1;
            visibility: visible;
          }
          @media (max-width: 767px) {
            .tooltip-popup {
              font-size: 11px;
              padding: 5px 10px;
              left: 50%;
              transform: translateX(-50%);
              right: auto;
              margin-left: 0;
              margin-right: 0;
              width: max-content;
              max-width: calc(100vw - 32px);
              white-space: normal;
              word-wrap: break-word;
            }
            .tooltip-container {
              position: relative;
            }
          }
        `
      }} />
     
      <Hero />
      
      {/* Sister Brands Section */}
      <div className="bg-white py-6 md:py-8 mt-0">
        <div className="mx-auto max-w-[1400px] px-4 md:px-2">
          <div className="mx-0 sm:mx-6 md:mx-0">
            <div className="sister-brands-container flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="sister-brands-content text-gray-700 text-sm md:text-sm text-center md:text-left flex flex-col md:flex-row items-center md:items-start gap-3 md:gap-2">
                <div className="sister-brands-text text-center md:text-left">
                  <div className="text-[10px] md:text-sm leading-tight md:leading-normal">Our sister brands, united by one vision:</div>
                  <div className="font-semibold text-[10px] md:text-sm leading-tight md:leading-normal">Redefining care, work, and hope for a better tomorrow.</div>
                </div>
              </div>
              <div className="sister-brands-nav flex flex-wrap items-center justify-start md:justify-end gap-4 md:gap-6 text-sm md:text-base text-gray-700 md:ml-auto">
                <a 
                  href="https://www.koott.in/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-gray-900 cursor-pointer font-semibold"
                  style={{ cursor: 'pointer' }}
                >
                  Koott
                </a>
                <div className="tooltip-container">
                  <span className="hover:text-gray-900 cursor-pointer font-semibold" style={{ cursor: 'pointer' }}>Hopelly</span>
                  <div className="tooltip-popup" suppressHydrationWarning>Launching Soon</div>
                </div>
                <div className="tooltip-container">
                  <span className="hover:text-gray-900 cursor-pointer font-semibold" style={{ cursor: 'pointer' }}>WorkMate</span>
                  <div className="tooltip-popup" suppressHydrationWarning>Launching Soon</div>
                </div>
                <Link 
                  href="/about"
                  className="hover:text-gray-900 cursor-pointer"
                  style={{ cursor: 'pointer' }}
                >
                  About us
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

        <ChooseOptions />
      
      {/* <FeatureCards /> */}
        <PersonalizedCare />
        <InfoCards compact />
        <ConsultationBanner />
        <HowItWorks />
        <SupportFaq />
        <Testimonials />
      
      {/* <ResultsSplit /> */}
      
        <BlogTeaser />
      
        <HelpFaq />
    </main>
  );
}
// Force deployment Tue Sep  9 12:03:00 IST 2025
