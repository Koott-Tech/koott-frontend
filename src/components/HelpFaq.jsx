"use client";
import Image from "next/image";
import { useState } from "react";
import { normalizeImageUrl } from '@/utils/urlNormalizer';

const DATA = [
  {
    title: "Getting started",
    items: [
      {
        q: "How do I know if my child needs counseling?",
        a: "Look out for changes in behavior, emotions, or daily routines—like sadness, anxiety, anger, withdrawal, or school struggles. A child psychologist can help you understand what your child is experiencing and whether child counseling may support them.",
      },
      {
        q: "Are your sessions online or in-person?",
        a: "Our sessions are fully online, making it easy for your child to get support from a qualified child psychologist right from home.",
      },
      {
        q: "How long is a counseling session?",
        a: "Each session lasts 50–60 minutes, giving your child enough time to feel safe, open up, and receive meaningful support.",
      },
    ],
  },
  {
    title: "Understanding assessments",
    items: [
      {
        q: "What kind of assessments do you offer?",
        a: "We offer emotional, intelligence, projective, ADHD and behavioral assessments to understand your child's strengths, challenges, and needs.",
      },
      {
        q: "Will I be involved in my child's therapy?",
        a: "Absolutely. Parents play a key role in a child’s progress. We keep you updated, share insights, and offer parenting counseling strategies so you can support your child at home with confidence.",
      },
      {
        q: "Is therapy confidential?",
        a: "Yes. Your child’s privacy is deeply valued. We share updates with parents only in supportive, meaningful ways that respect confidentiality and your child’s comfort.",
      },
    ],
  },
];

export default function HelpFaq({ cmsData = null }) {
  // Track open item as "categoryIndex-questionIndex"
  const [openId, setOpenId] = useState("");

  // Use CMS data if available, otherwise fall back to hardcoded data
  // If cmsData is provided, show all FAQs without section headings (for CMS pages)
  // If no cmsData, show with section headings (for homepage)
  const isCmsPage = cmsData && cmsData.faqs && cmsData.faqs.length > 0;
  
  const faqData = isCmsPage ? 
    (() => {
      // For CMS pages: show all FAQs in a single list without section headings
      return [{
        title: "", // Empty title to hide section heading
        items: cmsData.faqs.slice(0, 8).map(faq => ({
          q: faq.question,
          a: faq.answer
        }))
      }];
    })() : DATA; // Homepage: use default DATA with section headings

  // Get the left image from CMS data or use default
  const leftImageUrl = normalizeImageUrl(cmsData?.leftImageUrl || cmsData?.left_image_url || "/footerfaq copy.webp");

  return (
    <section className="w-full px-4 lg:px-6 mt-8 lg:mt-24">
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 767px) {
          .help-faq-heading {
            font-size: 28px !important;
            font-weight: 600 !important;
            line-height: 1.1 !important;
            text-align: left !important;
          }
          .help-faq-subheading {
            text-align: left !important;
            line-height: 1.1 !important;
          }
          .help-faq-description {
            text-align: left !important;
          }
          .faq-section-title {
            text-align: left !important;
          }
          /* Override h2 FAQ questions to match original span size */
          .help-faq-question {
            font-size: 14px !important;
            line-height: 1.2 !important;
            margin: 0 !important;
            font-weight: 400 !important;
          }
          /* Force smaller answer text on mobile */
          .faq-answer {
            font-size: 13px !important;
            line-height: 1.4 !important;
          }
          /* Reduce margin-bottom for last FAQ section in mobile */
          .faq-section:last-child {
            margin-bottom: 1rem !important;
          }
          /* Reduce space above "Understanding assessments" section on mobile */
          .faq-section:not(:first-child) {
            margin-top: 0.5rem !important;
          }
          /* Ensure parent container aligns content to left */
          .help-faq-left-column {
            align-items: flex-start !important;
          }
          /* Left align image in mobile view - match text alignment exactly */
          .help-faq-image-container {
            margin-left: 0 !important;
            margin-right: auto !important;
            align-self: flex-start !important;
            width: 280px !important;
            max-width: 280px !important;
            margin-inline-start: 0 !important;
            margin-inline-end: auto !important;
          }
          /* Force image to align with heading text - remove any centering */
          .help-faq-left-column .help-faq-image-container {
            margin-left: 0 !important;
            padding-left: 0 !important;
            left: 0 !important;
            transform: translateX(0) !important;
            margin-inline-start: 0 !important;
            padding-inline-start: 0 !important;
          }
          /* Compensate for parent's ml-2 (8px) and px-2 (8px) to align with text */
          @media (max-width: 767px) {
            .help-faq-left-column .help-faq-image-container {
              margin-left: -16px !important; /* Pull back to match text alignment (ml-2 + px-2 = 16px) */
            }
            /* Align FAQ section titles with FAQ questions */
            /* Right column has ml-1 (4px) + px-2 (8px) = 12px, FAQ button has px-2 (8px) = 20px total */
            /* Section title is at 12px, needs to match FAQ questions at 20px, so add 8px */
            .faq-section-title {
              margin-left: 8px !important;
              padding-left: 0 !important;
            }
          }
        }
        @media (min-width: 768px) and (max-width: 1180px) and (max-height: 1180px) {
          .help-faq-image-container {
            margin-left: auto !important;
            margin-right: auto !important;
            align-self: center !important;
            width: 600px !important;
            max-width: 600px !important;
            height: 450px !important;
          }
          .help-faq-right-column {
            margin-left: auto !important;
            margin-right: auto !important;
            max-width: 600px !important;
          }
          .help-faq-left-column {
            margin-left: auto !important;
            margin-right: auto !important;
            max-width: 600px !important;
            align-items: flex-start !important;
            margin-top: 2rem !important;
          }
          /* Override h2 FAQ questions for tablet */
          .help-faq-question {
            font-size: 14px !important;
            line-height: 1.2 !important;
            margin: 0 !important;
            font-weight: 400 !important;
          }
        }
        /* Override h2 FAQ questions for desktop */
        @media (min-width: 1024px) {
          .help-faq-question {
            font-size: 16px !important;
            line-height: 1.2 !important;
            margin: 0 !important;
            font-weight: 400 !important;
          }
        }
      `}} />
      <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-6 lg:gap-8 px-0 xl:grid-cols-[0.9fr_1.1fr]">
        {/* Left column: Heading + link + image */}
        <div className="flex flex-col ml-2 md:ml-0 space-y-3 md:space-y-4 px-2 md:px-0 help-faq-left-column">
          <div className="space-y-1">
            <h2 className="help-faq-heading font-bold text-gray-900 text-left md:text-left text-base md:text-xl" style={{ margin: 0, padding: 0 }}>
              Questions?
            </h2>
            <h2 className="help-faq-subheading text-gray-900 text-left md:text-left text-base md:text-lg" style={{ margin: 0, padding: 0 }}>
              We're here to help
            </h2>
          </div>
          <div>
            <p className="help-faq-description text-sm md:text-base lg:text-lg text-left md:text-left">
              Visit our full <a className="underline font-medium" href="/faq">FAQ page</a> for more<br className="hidden md:block" />
              commonly asked questions.
            </p>
          </div>
                     <div className="relative mt-4 md:mt-6 max-w-[280px] md:w-[320px] md:mx-0 h-[160px] md:h-[240px] overflow-hidden rounded-2xl help-faq-image-container">
            <Image
              src={leftImageUrl}
              alt="Happy family and children illustration for FAQ section"
              fill
              className="object-contain"
              sizes="(min-width: 1024px) 40vw, 100vw"
            />
          </div>
        </div>

                 {/* Right column: Accordion FAQ */}
         <div className="help-faq-right-column mr-4 md:mr-8 lg:mr-12 w-full md:max-w-2xl ml-1 md:ml-0 px-2 md:px-0">
           {faqData.map((section, ci) => {
            const isLastSection = ci === faqData.length - 1;
            const spacingClasses = isLastSection ? 'mt-16 md:mt-3' : 'mt-3';
            return (
            <div key={section.title || ci} className={`faq-section mb-6 md:mb-10 ${spacingClasses}`}>
              {section.title && (
                <h5 className={`faq-section-title ${section.title === "Understanding assessments" ? "mb-1" : "mb-1"} text-left md:text-left text-sm md:text-base lg:text-lg font-medium`}>
                  {section.title}
                </h5>
              )}
              <div className="space-y-0">
                {section.items.map((item, qi) => {
                  const id = isCmsPage ? `cms-${qi}` : `${ci}-${qi}`;
                  const open = openId === id;
                  return (
                    <div key={id} className="border-b border-gray-200 last:border-b-0">
                      <button
                        type="button"
                        onClick={() => setOpenId(open ? "" : id)}
                        className="flex w-full items-center justify-between py-3 md:py-4 text-left hover:bg-white transition-colors px-2 md:px-0 cursor-pointer"
                      >
                        <h2 className="help-faq-question text-gray-900 w-full md:w-auto pr-2 md:pr-3 lg:pr-0" style={{ margin: 0, padding: 0 }}>
                          {item.q}
                        </h2>
                        <Chevron className={`h-3 w-3 md:h-4 md:w-4 lg:h-5 lg:w-5 text-gray-800 transition-transform flex-shrink-0 ${open ? "rotate-180" : "rotate-0"}`} />
                      </button>
                      <div
                        className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
                          open ? "max-h-96 md:max-h-64 opacity-100" : "max-h-0 opacity-0"
                        }`}
                        style={{ willChange: 'max-height, opacity' }}
                      >
                        <div className="px-2 pb-3 md:px-0 md:pb-4">
                          <p className="faq-answer text-xs md:text-sm leading-relaxed">
                            {item.a}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </section>
  );
}

function Chevron({ className = "" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 10.19l3.71-2.96a.75.75 0 11.94 1.17l-4.24 3.38a.75.75 0 01-.94 0L5.27 8.34a.75.75 0 01-.04-1.13z"
        clipRule="evenodd"
      />
    </svg>
  );
}


