"use client";

import Image from "next/image";
import { useState } from "react";
import GuideModal from "@/components/GuideModal";

export default function HeroSection({ therapyType = "individual", cmsData = null }) {
  const [showGuide, setShowGuide] = useState(false);

  const handleHowItWorksClick = () => {
    const howItWorksSection = document.getElementById('how-it-works');
    if (howItWorksSection) {
      howItWorksSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  // Content configuration for different therapy types
  const content = {
    individual: {
      title: "Take the first step, individual therapy through Rula.",
      description: "Rula makes it simple to take the first step towards better mental\nhealth. Explore licensed, in-network therapists online who\nspecialise in your unique needs.",
      image: "/kids.png",
      alt: "Individual in therapy session",
      features: [
        "15,000+ licensed providers to match your unique needs",
        "Meet with a therapist via live video as soon as tomorrow",
        "Rula patients pay an average of $15 per session using insurance"
      ]
    },
    couples: {
      title: "Take the first step,\ncouples therapy\nthrough Rula.",
      description: "Rula makes it simple to take the first step towards better relationship\nhealth. Explore licensed, in-network couples therapists online who\nspecialise in strengthening relationships.",
      image: "/kids.png",
      alt: "Couple in therapy session"
    },
    family: {
      title: "Take the first step,\nfamily therapy\nthrough Rula.",
      description: "Rula makes it simple to take the first step towards better family\nhealth. Explore licensed, in-network family therapists online who\nspecialise in improving family dynamics.",
      image: "/kids.png",
      alt: "Family in therapy session"
    },
    child: {
      title: "Take the first step,\nchild therapy\nthrough Rula.",
      description: "Rula makes it simple to take the first step towards better child\nmental health. Explore licensed, in-network child therapists online who\nspecialise in supporting children's emotional growth.",
      image: "/kids.png",
      alt: "Child in therapy session"
    },
    teen: {
      title: "Take the first step,\nteen therapy\nthrough Rula.",
      description: "Rula makes it simple to take the first step towards better teen\nmental health. Explore licensed, in-network teen therapists online who\nspecialise in adolescent development and challenges.",
      image: "/kids.png",
      alt: "Teen in therapy session"
    },
    psychiatry: {
      title: "Take the first step,\npsychiatry\nthrough Rula.",
      description: "Rula makes it simple to take the first step towards better mental\nhealth. Explore licensed, in-network psychiatrists online who\nspecialise in medication management and comprehensive care.",
      image: "/kids.png",
      alt: "Psychiatric consultation session"
    },
    "big-emotions": {
      title: "Take the first step,\nBig Emotions (CBT - Kids)\nthrough Rula.",
      description: "Rula makes it simple to take the first step towards better emotional\nregulation for your child. Explore licensed, in-network therapists online who\nspecialise in Cognitive Behavioral Therapy for children.",
      image: "/kids.png",
      alt: "Child learning emotional regulation"
    },
    "adhd-attention": {
      title: "Take the first step,\nADHD or Attention struggles\nthrough Rula.",
      description: "Rula makes it simple to take the first step towards better focus\nand attention for your child. Explore licensed, in-network therapists online who\nspecialise in ADHD support and attention training.",
      image: "/kids.png",
      alt: "Child with ADHD support"
    },
    "behavioral-coaching": {
      title: "Take the first step,\nBehavioral Coaching\nthrough Rula.",
      description: "Rula makes it simple to take the first step towards better behavior\nmanagement for your child. Explore licensed, in-network therapists online who\nspecialise in behavioral coaching and positive reinforcement.",
      image: "/kids.png",
      alt: "Child behavioral coaching session"
    },
    "communication-social-skills": {
      title: "Take the first step,\nCommunication & Social Skills\nthrough Rula.",
      description: "Rula makes it simple to take the first step towards better communication\nand social skills for your child. Explore licensed, in-network therapists online who\nspecialise in social development and communication training.",
      image: "/kids.png",
      alt: "Child learning social skills"
    },
    "anxiety-sadness": {
      title: "Helping Kids Find Calm: Child Anxiety Counseling Online",
      description: "Our licensed child therapists specialize in child anxiety counseling online, offering personalized care to help kids manage their worries and feel safe. Parents also receive meaningful support for child anxiety, so the whole family feels stronger.",
      image: "/kids.png",
      alt: "Child managing anxiety and sadness",
      features: [
        "Licensed Child Therapists Who Understand Kids",
        "Online Sessions From the Comfort of Home",
        "Affordable & Accessible Care"
      ]
    },
    "overthinking-ocd": {
      title: "Take the first step,\nOverthinking & OCD\nthrough Rula.",
      description: "Rula makes it simple to take the first step towards better mental\npatterns for your child. Explore licensed, in-network therapists online who\nspecialise in OCD treatment and thought management.",
      image: "/kids.png",
      alt: "Child managing OCD and overthinking"
    },
    "exam-fear-study-stress": {
      title: "Take the first step,\nExam Fear & Study Stress\nthrough Rula.",
      description: "Rula makes it simple to take the first step towards better academic\nperformance and stress management for your child. Explore licensed, in-network therapists online who\nspecialise in study skills and test anxiety.",
      image: "/kids.png",
      alt: "Child managing exam stress"
    },
    "learning-difficulties": {
      title: "Take the first step,\nLearning Difficulties (Remedial)\nthrough Rula.",
      description: "Rula makes it simple to take the first step towards better learning\noutcomes for your child. Explore licensed, in-network therapists online who\nspecialise in remedial education and learning support.",
      image: "/kids.png",
      alt: "Child with learning support"
    },
    "trauma-abuses": {
      title: "Take the first step,\nTrauma & Abuses\nthrough Rula.",
      description: "Rula makes it simple to take the first step towards healing and\nrecovery for your child. Explore licensed, in-network therapists online who\nspecialise in trauma-informed care and abuse recovery.",
      image: "/kids.png",
      alt: "Child trauma recovery session"
    },
    "confidence-self-esteem": {
      title: "Take the first step,\nConfidence & Self-esteem\nthrough Rula.",
      description: "Rula makes it simple to take the first step towards building\nconfidence and self-esteem for your child. Explore licensed, in-network therapists online who\nspecialise in self-worth and confidence building.",
      image: "/kids.png",
      alt: "Child building confidence"
    },
    "family-conflict-recovery": {
      title: "Take the first step,\nFamily Conflict Recovery\nthrough Rula.",
      description: "Rula makes it simple to take the first step towards healing\nfamily relationships and resolving conflicts. Explore licensed, in-network therapists online who\nspecialise in family therapy and conflict resolution.",
      image: "/kids.png",
      alt: "Family conflict resolution"
    },
    "grief-loss": {
      title: "Take the first step,\nGrief & Loss\nthrough Rula.",
      description: "Rula makes it simple to take the first step towards processing\ngrief and loss for your child. Explore licensed, in-network therapists online who\nspecialise in grief counseling and loss support.",
      image: "/kids.png",
      alt: "Child grief counseling"
    },
    "fear-phobias-support": {
      title: "Take the first step,\nFear & Phobias Support\nthrough Rula.",
      description: "Rula makes it simple to take the first step towards overcoming\nfears and phobias for your child. Explore licensed, in-network therapists online who\nspecialise in phobia treatment and fear management.",
      image: "/kids.png",
      alt: "Child overcoming fears"
    },
    "autism-support": {
      title: "Take the first step,\nAutism Support\nthrough Rula.",
      description: "Rula makes it simple to take the first step towards comprehensive\nsupport for your child with autism. Explore licensed, in-network therapists online who\nspecialise in autism spectrum support and development.",
      image: "/kids.png",
      alt: "Child with autism support"
    }
  };

  // Default hero feature bullets for all CMS pages
  const defaultFeatures = [
    "Licensed Child Therapists Who Understands Kids",
    "Online sessions that make a real difference.",
    "Affordable & Accessible Care"
  ];

  // Use CMS data if available, otherwise fall back to hardcoded content
  const currentContent = cmsData ? {
    title: cmsData.title || content[therapyType]?.title || content.individual.title,
    description: cmsData.subtext || content[therapyType]?.description || content.individual.description,
    image: cmsData.imageUrl || content[therapyType]?.image || content.individual.image,
    alt: content[therapyType]?.alt || content.individual.alt,
    features: (cmsData.features && cmsData.features.length > 0)
      ? cmsData.features
      : defaultFeatures,
    ctaText: cmsData.ctaText
  } : (content[therapyType] || content.individual);

  return (
    <div className="w-full">
      <style jsx>{`
        @media (min-width: 768px) and (max-width: 1180px) and (max-height: 1180px) {
          .cms-hero-content-area {
            padding-top: 0;
            padding-bottom: 2.5rem;
          }
          .cms-hero-image-container {
            height: 600px;
            min-height: 600px;
            margin-top: 0;
            padding-left: 2rem;
            padding-right: 2rem;
          }
          .cms-hero-image-container > div {
            left: 2rem;
            right: 2rem;
            border-radius: 10px;
            overflow: hidden;
          }
        }
        /* Landscape tablets (1180x810): same layout as portrait tablets, but with reduced image width */
        @media (min-width: 1024px) and (max-width: 1180px) and (max-height: 850px) {
          .cms-hero-content-area {
            padding-top: 0;
            padding-bottom: 2.5rem;
          }
          .cms-hero-image-container {
            height: 600px;
            min-height: 600px;
            margin-top: 0;
            max-width: 800px;
            margin-left: auto;
            margin-right: auto;
            width: 100%;
            padding-left: 4rem;
            padding-right: 4rem;
          }
          .cms-hero-image-container > div {
            left: 4rem;
            right: 4rem;
            border-radius: 10px;
            overflow: hidden;
          }
        }
        /* Desktop: Full height but with min-height to prevent CLS */
        @media (min-width: 1280px) {
          .cms-hero-image-container {
            min-height: 500px;
            height: 100%;
          }
          .cms-hero-image-container > div {
            height: 100%;
            min-height: 500px;
          }
        }
      `}</style>
      <section className="w-full">
        <div className="w-full overflow-hidden" style={{ backgroundColor: '#F3FAF0' }}>
                     <div className="flex flex-col xl:grid xl:grid-cols-2 xl:items-start">
             {/* Content Area */}
                          <div className="cms-hero-content-area p-8 md:p-12 pb-20 md:pb-24 pt-14 md:pt-20 mt-2 md:mt-21 space-y-6 order-1 lg:order-1">
                            <h1 className="cms-hero-title text-[2.5rem] md:text-5xl lg:text-6xl font-medium text-[#1d1733] leading-none md:leading-[1.2] lg:leading-[1.2] md:whitespace-pre-line text-center xl:text-left pt-8 md:pt-0">
                 {currentContent.title}
               </h1>
              
                             <p className="text-base md:text-xl text-black leading-[150%] md:leading-tight font-normal md:font-normal tracking-[-0.0375rem] md:tracking-normal md:whitespace-pre-line">
                {currentContent.description}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 items-center md:items-center justify-center md:justify-start">
                <button className="text-white font-medium px-6 py-2.5 rounded-full transition-colors duration-200 shadow-lg w-fit"
                  style={{ backgroundColor: '#3f2e73' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1d1733')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#3f2e73')}
                  onClick={() => setShowGuide(true)}
                >
                  Get started
                </button>
                
                <div 
                  className="flex items-center gap-2 font-normal cursor-pointer transition-colors duration-200 justify-center md:justify-start w-fit hover:opacity-80" 
                  style={{ color: '#15171A' }}
                  onClick={handleHowItWorksClick}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleHowItWorksClick();
                    }
                  }}
                >
                  <span>See how it works</span>
                  <svg className="w-4 h-4 md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 13l5 5 5-5" />
                  </svg>
                  <svg className="w-4 h-4 hidden md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              
              {/* Feature List */}
              <div className="space-y-3 pt-4">
                {(currentContent.features || [
                  "15,000+ licensed providers to match your unique needs",
                  "Meet with a therapist via live video as soon as tomorrow",
                  "Rula patients pay an average of $15 per session using insurance"
                ]).map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 rounded-full flex items-center justify-center" style={{ borderColor: '#15171A' }}>
                      <svg className="w-3 h-3" style={{ color: '#15171A' }} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-black font-normal">{feature}</span>
                  </div>
                ))}
              </div>
              
              {/* Additional CTA Text */}
              {currentContent.ctaText && (
                <div className="pt-6">
                  <p className="text-lg md:text-xl font-medium text-[#123331] text-center xl:text-left">
                    {currentContent.ctaText}
                  </p>
                </div>
              )}
            </div>
            
                         {/* Image Area - Below content on mobile, right side on desktop */}
             <div className="cms-hero-image-container relative h-96 xl:h-full order-2 lg:order-2" style={{ 
               minHeight: '300px'
             }}>
               <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
                 {currentContent.image ? (
                   <Image
                     src={currentContent.image}
                     alt={currentContent.title ? `${currentContent.title} - Hero illustration for child counseling and parent support` : (currentContent.alt || "Child counseling and parent support hero illustration")}
                     fill
                     className="object-cover"
                     priority
                    fetchPriority="high"
                     sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 50vw"
                     style={{ objectPosition: 'center center' }}
                     onError={(e) => {
                       console.error('Image failed to load:', currentContent.image);
                       e.target.src = '/kids.png'; // Fallback image
                     }}
                   />
                 ) : (
                   <div className="text-gray-500 text-center">
                     <p>No image selected</p>
                     <p className="text-sm">Image URL: {currentContent.image || 'None'}</p>
                   </div>
                 )}
               </div>
             </div>
          </div>
        </div>
      </section>
      {showGuide && (
        <GuideModal open={showGuide} onClose={() => setShowGuide(false)} />
      )}
    </div>
  );
}
