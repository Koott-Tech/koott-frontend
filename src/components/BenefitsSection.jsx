"use client";

import Image from 'next/image';
import { useState } from 'react';
import { normalizeImageUrlWithSize } from '@/utils/urlNormalizer';

export default function BenefitsSection({ therapyType = "individual", cmsData = null, showAllBenefits = false, fluid = false, compactSpacing = false }) {
  // Content configuration for different therapy types
  const content = {
    individual: {
      title: "Benefits of individual therapy",
      benefits: [
        {
          title: "Develop coping skills",
          description: "Gain tools and strategies for managing stress and anxiety."
        },
        {
          title: "Improve emotional wellbeing",
          description: "Therapy builds greater emotional regulation and awareness, helping to replace negative thought patterns with healthy habits."
        },
        {
          title: "Reduce mental health symptoms",
          description: "Talk therapy can help you manage symptoms linked to conditions like anxiety, depression, OCD, and eating disorders."
        },
        {
          title: "Get personalized support",
          description: "Connect one-on-one with an expert who can develop a treatment plan to meet your specific needs and goals."
        },
        {
          title: "Bolster self-esteem",
          description: "Strengthen your sense of self-worth and break patterns of negative self talk."
        },
        {
          title: "Build healthier relationships",
          description: "Learn to set boundaries, communicate effectively, and develop more fulfilling connections with others."
        }
      ]
    },
    couples: {
      title: "Benefits of couples therapy",
      benefits: [
        {
          title: "Improve communication",
          description: "Learn to express your feelings clearly and listen to your partner with empathy and understanding."
        },
        {
          title: "Resolve conflicts constructively",
          description: "Develop healthy ways to address disagreements and find solutions that work for both partners."
        },
        {
          title: "Rebuild trust and intimacy",
          description: "Work through past hurts and create a stronger foundation for your relationship."
        },
        {
          title: "Strengthen emotional connection",
          description: "Deepen your bond and create more meaningful moments together."
        },
        {
          title: "Navigate life transitions",
          description: "Get support during major changes like marriage, children, career shifts, or relocation."
        },
        {
          title: "Create shared goals",
          description: "Align your vision for the future and work together toward common objectives."
        }
      ]
    },
    family: {
      title: "Benefits of family therapy",
      benefits: [
        {
          title: "Improve family communication",
          description: "Learn to express thoughts and feelings openly while respecting each family member's perspective."
        },
        {
          title: "Resolve family conflicts",
          description: "Address ongoing issues and develop strategies for handling disagreements constructively."
        },
        {
          title: "Strengthen family bonds",
          description: "Create deeper connections and build a more supportive family environment."
        },
        {
          title: "Navigate family transitions",
          description: "Get support during major changes like divorce, remarriage, or the addition of new family members."
        },
        {
          title: "Improve parenting skills",
          description: "Learn effective parenting strategies and create consistent boundaries and expectations."
        },
        {
          title: "Heal from past trauma",
          description: "Work through difficult experiences together and create a path toward healing and growth."
        }
      ]
    },
    child: {
      title: "Benefits of child therapy",
      benefits: [
        {
          title: "Develop emotional regulation",
          description: "Help your child learn to manage big feelings and respond appropriately to different situations."
        },
        {
          title: "Improve social skills",
          description: "Build confidence in making friends, resolving conflicts, and navigating social situations."
        },
        {
          title: "Address behavioral challenges",
          description: "Work through difficult behaviors and develop positive alternatives that support healthy development."
        },
        {
          title: "Build self-esteem",
          description: "Help your child develop a positive self-image and confidence in their abilities."
        },
        {
          title: "Support academic success",
          description: "Address emotional or behavioral issues that may be affecting learning and school performance."
        },
        {
          title: "Strengthen family relationships",
          description: "Improve communication and understanding between your child and the rest of the family."
        }
      ]
    },
    teen: {
      title: "Benefits of teen therapy",
      benefits: [
        {
          title: "Navigate identity development",
          description: "Support your teen as they explore who they are and develop their sense of self."
        },
        {
          title: "Manage academic stress",
          description: "Help your teen develop healthy coping strategies for school-related pressure and expectations."
        },
        {
          title: "Improve peer relationships",
          description: "Build social skills and confidence in forming and maintaining healthy friendships."
        },
        {
          title: "Address family dynamics",
          description: "Work through conflicts and improve communication within the family system."
        },
        {
          title: "Develop emotional intelligence",
          description: "Help your teen understand and manage their emotions in healthy ways."
        },
        {
          title: "Build resilience",
          description: "Support your teen in developing the skills to bounce back from challenges and setbacks."
        }
      ]
    },
    psychiatry: {
      title: "Benefits of psychiatry",
      benefits: [
        {
          title: "Comprehensive mental health evaluation",
          description: "Get a thorough assessment of your mental health symptoms and overall psychological functioning."
        },
        {
          title: "Medication management",
          description: "Receive expert guidance on psychiatric medications, including dosage adjustments and monitoring."
        },
        {
          title: "Integrated treatment planning",
          description: "Develop a comprehensive treatment plan that may include medication, therapy, and lifestyle changes."
        },
        {
          title: "Symptom relief",
          description: "Experience significant improvement in symptoms related to depression, anxiety, bipolar disorder, and other conditions."
        },
        {
          title: "Ongoing monitoring and support",
          description: "Receive regular check-ins to monitor progress and adjust treatment as needed."
        },
        {
          title: "Crisis intervention",
          description: "Get immediate support during mental health emergencies or acute episodes."
        }
      ]
    },
    "anxiety-sadness": {
      title: "Understanding Worry and Anxiety in Kids",
      benefits: [
        {
          title: "Anxiety doesn't mean something is wrong with your child",
          description: "It means their brain is working extra hard to keep them safe."
        },
        {
          title: "Anxiety in children is common and not a weakness",
          description: "It signals that they may need extra emotional care."
        },
        {
          title: "Kids learn tools to manage fears",
          description: "With child anxiety counseling online, children develop coping strategies."
        },
        {
          title: "Parents receive guidance through support",
          description: "Support for child anxiety helps parents understand and assist their children."
        },
        {
          title: "Get Child Anxiety Counseling Online With Parent Support",
          description: "Comprehensive care that addresses both child and family needs."
        }
      ]
    }
  };

  // Use CMS data if available, otherwise fall back to hardcoded content
  const currentContent = cmsData ? {
    title: cmsData.title || content[therapyType]?.title || content.individual.title,
    benefits: cmsData.benefits && cmsData.benefits.length > 0 ? cmsData.benefits : (content[therapyType]?.benefits || content.individual.benefits)
  } : (content[therapyType] || content.individual);
  
  // Prefer CMS-provided image (support both camelCase and snake_case keys) and fall back to default asset
  const benefitsImageUrl = normalizeImageUrlWithSize(
    cmsData?.benefitsImageUrl ||
    cmsData?.benefits_image_url ||
    cmsData?.imageUrl ||
    cmsData?.image_url ||
    '/rightside5th.png',
    800,
    75
  );
  
  const [isExpanded, setIsExpanded] = useState(showAllBenefits);

  const sectionClass = `w-full bg-white pt-0 md:pt-2${fluid ? '' : ' lg:h-screen'}`;
  const containerClass = `mx-auto max-w-[1400px] px-4 sm:px-8 lg:pl-8 lg:pr-16 ${compactSpacing ? 'pb-0 md:pb-0' : 'pb-2 md:pb-0'}`;
  const headerClass = `text-left md:text-center ${compactSpacing ? 'mb-16 md:mb-20' : 'mb-12 md:mb-16'} mt-8 md:mt-12`;

  return (
    <section className={sectionClass} style={{ marginBottom: '120px' }}>
      <style jsx>{`
        @media (max-width: 640px) {
          .benefits-grid-2col {
            gap: 0.5rem !important;
          }
        }
        .benefits-title-text {
          line-height: 1.2 !important;
        }
        h3.benefits-title-text {
          font-size: 0.875rem !important; /* text-sm - 14px */
          margin: 0 !important;
          padding: 0 !important;
          font-weight: 600 !important;
        }
        @media (min-width: 768px) {
          h3.benefits-title-text {
            font-size: 1rem !important; /* text-base - 16px */
          }
        }
        .benefits-description-text {
          line-height: 1.2 !important;
        }
      `}</style>
      <div className={containerClass}>
        {/* Header */}
        <div className={headerClass}>
          <h2 className="how-it-works-heading text-base md:text-xl lg:text-2xl px-2 text-left md:text-center" style={{ fontSize: '24px', fontWeight: 600, lineHeight: '1.1' }}>
            {currentContent.title}
          </h2>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 md:gap-3 lg:gap-3 items-center px-6 md:px-8 lg:px-12">
          {/* Left Section - Image */}
          <div className="hidden lg:flex justify-start -mt-4">
            <div className="relative w-[500px] h-[600px]">
              <Image
                src={benefitsImageUrl}
                alt={currentContent.title ? `${currentContent.title} - Benefits illustration` : "Child counseling benefits illustration"}
                fill
                className="object-cover rounded-lg"
                sizes="500px"
              />
            </div>
          </div>

          {/* Right Section - Benefits List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 sm:gap-x-10 md:gap-x-12 lg:gap-x-16 gap-y-4 md:gap-y-8 w-full justify-items-start benefits-grid-2col">
            {currentContent.benefits.map((benefit, index) => (
              <div 
                key={index} 
                className={`pt-3 border-t border-gray-200 ${
                  index >= 4 && !isExpanded ? 'opacity-50 lg:opacity-100' : ''
                } ${index >= 4 && !isExpanded ? 'hidden lg:block' : ''}`}
              >
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="w-5 h-5 border-2 border-[#296662] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-2.5 h-2.5 text-[#296662]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 
                      className="font-semibold text-sm md:text-base text-black mb-1 md:mb-2 leading-tight benefits-title-text"
                      style={{ lineHeight: '1.2' }}
                    >
                      {benefit.title}
                    </h3>
                    <p 
                      className="text-xs md:text-sm text-black md:font-sans leading-tight benefits-description-text"
                      style={{ lineHeight: '1.2' }}
                    >
                      {benefit.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            
            {/* View More Button - Mobile Only */}
            {currentContent.benefits.length > 4 && (
              <div className="lg:hidden col-span-1 sm:col-span-2 pt-4 border-t border-gray-200 text-center flex items-center justify-center h-16 w-full">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-black font-medium hover:text-gray-700 transition-colors duration-200 flex flex-col items-center"
                >
                  <span>{isExpanded ? 'View less' : 'View more'}</span>
                  <svg className="w-4 h-4 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
