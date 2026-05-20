"use client";

import { useState } from "react";

const FAQ_DATA = [
  {
    q: "What is Koott?",
    a: "Koott is an online child counseling platform that supports children and parents through therapy, assessments, and emotional wellness sessions — all from the comfort of your home.",
  },
  {
    q: "Who are the therapists at Koott?",
    a: "Our team includes consultant psychologists, clinical psychologists, and child therapists with experience in child behaviour, emotional regulation, and developmental support.",
  },
  {
    q: "What age group do you work with?",
    a: "We primarily work with children aged 4 to 16 years, depending on their emotional and developmental needs.",
  },
  {
    q: "How does online child counseling work?",
    a: "Sessions take place over Google Meet, designed to be interactive and child-friendly using games, stories, and visual tools to make therapy engaging and comfortable.",
  },
  {
    q: "How do I know which service is right for my child?",
    a: "If you're unsure where to begin, you can book a free 20-minute consultation with our consultant psychologist. They'll help you understand your child's needs and recommend the best next step.",
  },
  {
    q: "Are parent sessions included?",
    a: "Yes. Parent sessions are an important part of our process. They help us understand the child better and guide parents on how to support progress at home.",
  },
  {
    q: "How many sessions does my child need?",
    a: "Every child is unique. The number of sessions depends on the concern and progress",
  },
  {
    q: "Is everything discussed confidential?",
    a: "Absolutely. We maintain strict confidentiality and privacy for all our clients, in line with ethical standards of psychological practice.",
  },
  {
    q: "What if my child doesn't open up online?",
    a: "Our therapists are trained to build comfort and trust through playful, engaging methods. Most children adapt quickly once they feel understood.",
  },
  {
    q: "How do I book a session?",
    a: "You can easily book online through our website or reach out via WhatsApp or email. Our team will guide you through the simple booking process.",
  },
];

export default function FAQ() {
  const [openId, setOpenId] = useState("");

  return (
    <div className="w-full min-h-screen bg-white">
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 767px) {
          .faq-main-heading {
            line-height: 1.4 !important;
          }
        }
      `}} />
      {/* Hero Section */}
      <section className="w-full py-16 md:py-20 px-4 md:px-6 lg:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="faq-main-heading text-[2.5rem] md:text-4xl lg:text-5xl font-medium leading-[1.0] md:leading-tight mb-4 md:mb-6 mt-8 md:mt-0 tracking-[-0.195rem]" style={{ color: '#012f23' }}>
            Frequently Asked Questions
          </h1>
          <p className="text-base md:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto">
            Find answers to common questions about Koott and our services.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="w-full px-4 md:px-6 lg:px-6 pb-16 md:pb-24">
        <style dangerouslySetInnerHTML={{__html: `
          @media (max-width: 767px) {
            .faq-heading {
              font-size: 16px !important;
              font-weight: 600;
              line-height: 1.4;
            }
            .faq-answer {
              font-size: 14px !important;
              line-height: 1.5;
            }
          }
        `}} />
        <div className="mx-auto max-w-4xl">
          <div className="space-y-0">
            {FAQ_DATA.map((item, index) => {
              const id = `${index}`;
              const open = openId === id;
              return (
                <div key={id} className="border-b border-gray-200 last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? "" : id)}
                    className="flex w-full items-center justify-between py-3 md:py-4 text-left hover:bg-white transition-colors px-2 md:px-0 cursor-pointer"
                  >
                    <span className="faq-heading text-xs md:text-sm lg:text-base text-gray-900 w-full md:w-auto pr-2 md:pr-3 lg:pr-0">
                      {item.q}
                    </span>
                    <Chevron className={`h-3 w-3 md:h-4 md:w-4 lg:h-5 lg:w-5 text-gray-800 transition-transform flex-shrink-0 ${open ? "rotate-180" : "rotate-0"}`} />
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-out ${
                      open ? "max-h-96 md:max-h-64 opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="px-2 pb-3 md:px-0 md:pb-4">
                      <p className="faq-answer md:text-sm leading-relaxed">
                        {item.a}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
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
