"use client";

import Image from "next/image";
import { normalizeImageUrlWithSize } from '@/utils/urlNormalizer';
import { useRouter } from "next/navigation";

export default function TherapyTypesSplit({ therapyType = "individual", cmsData = null }) {
  const router = useRouter();
  // Content configuration for different therapy types
  const content = {
    individual: {
      title: "Types of individual therapy",
      types: [
        {
          title: "Cognitive behavioral therapy (CBT)",
          description: "Cognitive behavioral therapy focuses on the connection between people's thoughts, feelings, and behaviors to interrupt anxiety and other mental health challenges."
        },
        {
          title: "Dialectic behavioral therapy (DBT)",
          description: "Focuses on building emotional regulation skills and encouraging participants to fully accept all parts of themselves — even their anxiety."
        },
        {
          title: "Eye movement desensitization and reprocessing (EMDR)",
          description: "EMDR is a therapeutic technique that uses specific eye movements or tapping to help people process traumatic memories."
        },
        {
          title: "Acceptance and commitment therapy (ACT)",
          description: "ACT is a mindfulness-based form of behavioral therapy. It can effectively treat depression, anxiety, psychosis, OCD, and health conditions like chronic pain."
        }
      ],
      buttonText: "Get started"
    },
    "anxiety-sadness": {
      title: "Common Types of Anxiety in Kids",
      types: [
        {
          title: "Generalized Anxiety",
          description: "Worrying about lots of different things—school, friendships, safety, or family. Kids with this type of anxiety often feel nervous most of the time."
        },
        {
          title: "Separation Anxiety",
          description: "Fear of being away from parents or caregivers. This is common in younger children but can affect older kids too."
        },
        {
          title: "Social Anxiety",
          description: "Feeling very shy or nervous about talking to others, being in groups, or being the center of attention."
        },
        {
          title: "Specific Phobias",
          description: "Strong fears of certain things or situations, like animals, heights, storms, or doctors' visits."
        },
        {
          title: "School Anxiety",
          description: "Worrying a lot about going to school, tests, or being away from home, leading to resistance or refusal."
        },
        {
          title: "Panic Anxiety",
          description: "Sudden, intense feelings of fear that can cause a racing heart, dizziness, or feeling like something bad is about to happen."
        },
        {
          title: "Performance Anxiety",
          description: "Fear of making mistakes or being judged, especially during tests, sports, or presentations."
        }
      ],
      buttonText: "Get Started"
    },
    "big-emotions": {
      title: "Types of Big Emotions Therapy",
      types: [
        {
          title: "Cognitive Behavioral Therapy (CBT)",
          description: "Helps children identify and change negative thought patterns that contribute to emotional outbursts."
        },
        {
          title: "Emotion Regulation Training",
          description: "Teaches children strategies to manage and express their feelings in healthy ways."
        },
        {
          title: "Mindfulness Techniques",
          description: "Introduces calming practices to help children stay present and manage overwhelming emotions."
        },
        {
          title: "Parent-Child Interaction Therapy",
          description: "Involves parents in the therapeutic process to create consistent emotional support at home."
        }
      ],
      buttonText: "Get Started with Big Emotions Therapy"
    },
    "adhd-attention": {
      title: "Types of ADHD & Attention Support",
      types: [
        {
          title: "Behavioral Interventions",
          description: "Structured approaches to improve focus, organization, and task completion."
        },
        {
          title: "Executive Function Training",
          description: "Develops planning, organization, and time management skills."
        },
        {
          title: "Attention Training Programs",
          description: "Specific exercises to improve sustained attention and concentration."
        },
        {
          title: "Parent Coaching",
          description: "Guidance for parents on managing ADHD symptoms and supporting their child's success."
        }
      ],
      buttonText: "Start ADHD Support Today"
    }
  };

  // Use CMS data if available, otherwise fall back to hardcoded content
  const currentContent = cmsData ? {
    title: cmsData.title || content[therapyType]?.title || content.individual.title,
    types: cmsData.types && cmsData.types.length > 0 ? cmsData.types : (content[therapyType]?.types || content.individual.types),
    rightImageUrl: normalizeImageUrlWithSize(
      cmsData.rightImageUrl || content[therapyType]?.rightImageUrl || content.individual.rightImageUrl,
      900,
      80
    ),
    buttonText: cmsData.buttonText || content[therapyType]?.buttonText || content.individual.buttonText
  } : {
    ...(content[therapyType] || content.individual),
    rightImageUrl: normalizeImageUrlWithSize(
      content[therapyType]?.rightImageUrl || content.individual.rightImageUrl,
      900,
      80
    )
  };
  return (
    <section className="therapy-types-section w-full mt-4 lg:mt-0 mb-0 lg:mb-8 px-0 pt-8 lg:pt-0" style={{ marginBottom: '120px' }}>
      <style jsx>{`
        .therapy-types-list h3 {
          font-size: 0.875rem !important; /* text-sm - 14px */
          margin: 0 !important;
          padding: 0 !important;
          font-weight: 600 !important;
          margin-bottom: 0.5rem !important;
        }
        @media (min-width: 1024px) {
          .therapy-types-list h3 {
            font-size: 1.125rem !important; /* text-lg - 18px */
            margin-bottom: 0.75rem !important;
          }
        }
        @media (min-width: 768px) and (max-width: 1180px) and (max-height: 1180px) {
          .therapy-types-section {
            padding-left: 24px !important;
            padding-right: 24px !important;
          }
          .therapy-types-content-area {
            border-radius: 10px !important;
            overflow: hidden !important;
          }
          .therapy-types-button {
            padding: 10px 20px !important;
            font-size: 14px !important;
          }
          .therapy-types-content {
            padding-left: 80px !important;
            padding-right: 80px !important;
          }
          .therapy-types-content h3 {
            line-height: 1.2 !important;
          }
          .therapy-types-content p {
            line-height: 1.4 !important;
          }
          .therapy-types-list > div {
            margin-top: 1rem !important;
          }
          .therapy-types-list > div:first-child {
            margin-top: 0 !important;
          }
          .therapy-types-image {
            padding-left: 80px !important;
            padding-right: 80px !important;
            margin-bottom: 2rem !important;
          }
          .therapy-types-image > div {
            left: 80px !important;
            right: 80px !important;
            border-radius: 10px !important;
            overflow: hidden !important;
          }
        }
      `}</style>
      <div className="w-full overflow-hidden">
        <div className="flex flex-col lg:grid lg:grid-cols-2">
          {/* Content Area - with background */}
          <div
            className="therapy-types-content-area flex flex-col justify-start px-0 pt-10 pb-0 lg:py-20 text-[#1c331d] order-1 lg:order-1 relative bg-[#DEEFDC]"
          >
            <div className="therapy-types-content px-6 sm:px-8 lg:px-[120px]">
            <h2 
              className="how-it-works-heading text-base md:text-xl lg:text-2xl mb-2"
              style={{
                color: '#15171a',
                fontSize: '24px',
                fontWeight: 600,
                lineHeight: '1.1',
                marginBottom: '0.5rem'
              }}
            >
              {currentContent.title}
            </h2>
           
            <div className="therapy-types-list mt-8 lg:mt-12 space-y-6 lg:space-y-8">
              {currentContent.types.map((type, index) => (
                <div key={index}>
                  <h3 className="font-semibold text-sm lg:text-lg mb-2 lg:mb-3">
                    {type.title}
                  </h3>
                  <p className="leading-relaxed font-normal text-xs lg:text-base">
                    {type.description}
                  </p>
                </div>
              ))}
            </div>
                
              <div className="flex justify-start lg:justify-start">
            <button 
                className="therapy-types-button mt-6 lg:mt-8 inline-flex items-center justify-center rounded-full px-8 lg:px-10 py-3 lg:py-4 shadow-lg transition-colors duration-200 text-sm lg:text-lg text-white"
              style={{ 
                backgroundColor: '#3f2e73',
                fontWeight: 500,
                textTransform: 'none',
                letterSpacing: 'normal',
                    fontFamily: "'Work Sans', Arial, sans-serif",
                    width: 'auto',
                    maxWidth: '80%'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1d1733')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#3f2e73')}
                  onClick={() => router.push('/online-child-psychologist')}
            >
              {currentContent.buttonText || "Get started"}
            </button>
              </div>
            </div>

            {/* Mobile Image - Inside the green background area */}
            <div className="therapy-types-image block lg:hidden mt-8 mx-0 relative" style={{ minHeight: '380px', height: '55vh', marginBottom: 0, paddingBottom: 0 }}>
              <div className="absolute inset-0" style={{ borderRadius: 0, minHeight: '380px' }}>
                <Image
                  src={currentContent.rightImageUrl || "/rightside5th.png"}
                  alt={currentContent.title ? `${currentContent.title} - Therapy types illustration` : "Child counseling therapy types illustration"}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) calc(100vw - 48px), 100vw"
                  priority
                  style={{ objectPosition: 'center', borderRadius: 0 }}
                />
              </div>
            </div>
          </div>

          {/* Image Area - Desktop Only */}
          <div className="hidden lg:block relative" style={{ minHeight: '400px' }}>
            <div className="absolute inset-0" style={{ minHeight: '400px' }}>
              <Image
                src={currentContent.rightImageUrl || "/rightside5th.png"}
                alt={currentContent.title ? `${currentContent.title} - Therapy types illustration` : "Child counseling therapy types illustration"}
                fill
                className="object-cover"
                sizes="50vw"
                priority
                style={{ objectPosition: 'center' }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


