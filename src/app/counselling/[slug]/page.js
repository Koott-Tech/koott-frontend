import HeroSection from '@/components/HeroSection';
import LogosStrip from '@/components/LogosStrip';
import HowItWorks from '@/components/HowItWorks';
import BlogTeaser from '@/components/BlogTeaser';
import BenefitsSection from '@/components/BenefitsSection';
import TherapyTypesSplit from '@/components/TherapyTypesSplit';
import InfoCards from '@/components/InfoCards';
import Reviews from '@/components/Reviews';
import VideosShowcase from '@/components/VideosShowcase';
// Link replaced with plain anchor to avoid client navigation context during SSR
import HelpFaq from '@/components/HelpFaq';
import CounsellingNotFound from '@/components/CounsellingNotFound';
import ScrollToTop from '@/components/ScrollToTop';
import TherapistCarousel from '@/components/TherapistCarousel';
import { normalizeImageUrl, normalizeImageUrlWithSize } from '@/utils/urlNormalizer';
import Image from "next/image";

// Force dynamic rendering and disable caching so edits reflect immediately
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const dynamicParams = true;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

const EXCLUDED = new Set([
  'assessments',
  'better-parenting',
  'resources'
]);

// Fallback metadata for when API fails
const FALLBACK_META = {
  'depression': {
    title: 'Depression Counseling - MyKoott',
    description: 'Compassionate, evidence-based counseling to support children experiencing depression.'
  },
  'anxiety-sadness': {
    title: 'Anxiety, Sadness or Low mood - MyKoott',
    description: 'Professional support for children experiencing anxiety, sadness, or low mood.'
  },
};

export async function generateMetadata({ params, searchParams }) {
  const { slug } = await params;
  const isPreview = searchParams?.preview === '1' || searchParams?.preview === 'true';
  
    try {
    // Try to fetch from API for dynamic metadata
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
    const timestamp = Date.now();
    const previewSuffix = isPreview ? '&preview=1' : '';
    const response = await fetch(`${baseUrl}/api/counselling/${slug}?t=${timestamp}${previewSuffix}`, {
      cache: 'no-store'
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data?.success) {
        const service = data.data || data.message;
        if (service && typeof service === 'object' && !Array.isArray(service)) {
          const title =
            service.seo_title ||
            service.hero_title ||
            `${slug?.replace(/[-_]/g, ' ')} - MyKoott`;
          const description =
            service.seo_description ||
            service.hero_subtext ||
            'Specialized counseling services for children and families.';
          // Always use logo.png for social sharing (as per requirements)
          const ogImage = 'https://www.koott.in/logo.png';

          return {
            title,
            description,
            openGraph: {
              title,
              description,
              type: 'website',
              siteName: 'MyKoott',
              url: `https://www.koott.in/counselling/${slug}`,
              images: [
                {
                  url: ogImage,
                  width: 1200,
                  height: 630,
                  alt: 'MyKoott logo',
                },
              ],
            },
            twitter: {
              card: 'summary_large_image',
              title,
              description,
              images: [ogImage],
            },
            alternates: {
              canonical: `https://www.koott.in/counselling/${slug}`,
            },
          };
        }
      }
    }
  } catch (error) {
    console.error('Error fetching metadata (non-critical):', error);
    // Fall through to static metadata
  }
  
  // Fallback to static metadata if API fails
  const meta = FALLBACK_META[slug] || {
    title: `${slug?.replace(/[-_]/g, ' ') || 'Counseling'} - MyKoott`,
    description: 'Specialized counseling services for children and families.'
  };
  return meta;
}

const removeAssessmentSpecialist = (docs = []) => {
  const assessmentEmail = (process.env.NEXT_PUBLIC_FREE_ASSESSMENT_PSYCHOLOGIST_EMAIL || 'assessment.koott@gmail.com').toLowerCase();
  const filtered = docs.filter(doc => (doc?.email || '').toLowerCase() !== assessmentEmail);
  return filtered.length > 0 ? filtered : docs;
};

async function fetchCounsellingService(slug, { preview = false } = {}) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
    const timestamp = Date.now();
    const previewSuffix = preview ? '&preview=1' : '';
    const response = await fetch(`${baseUrl}/api/counselling/${slug}?t=${timestamp}${previewSuffix}`, {
      cache: 'no-store'
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data?.success) {
        const service = data.data || data.message;
        if (service && typeof service === 'object' && !Array.isArray(service)) {
          return service;
        }
      }
    }
  } catch (error) {
    console.error('Error fetching counselling service:', error);
  }
  
  return null;
}



async function fetchPublicTherapists(limit = 6) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    const response = await fetch(`${baseUrl}/api/public/psychologists`, {
      cache: 'no-store'
    });

    if (response.ok) {
      const data = await response.json();
      const psychologists = data?.data?.psychologists || data?.message?.psychologists || data?.psychologists || [];
      if (Array.isArray(psychologists)) {
        const sanitized = removeAssessmentSpecialist(psychologists);
        return sanitized.slice(0, limit);
      }
    }
  } catch (error) {
    console.error('Error fetching public psychologists:', error);
  }

  return [];
}

export default async function CounsellingDynamicPage({ params, searchParams }) {
  const { slug } = await params;
  const isPreview = searchParams?.preview === '1' || searchParams?.preview === 'true';

  // Guard for excluded roots if accessed directly
  if (EXCLUDED.has(slug)) {
    return (
      <div className="px-6 py-16 text-center">
        <h3 className="text-2xl font-medium">Section coming soon</h3>
        <p className="mt-2 text-gray-600">Please choose a specific counseling topic from the menu.</p>
      </div>
    );
  }

  // Try to fetch from CMS
  const serviceData = await fetchCounsellingService(slug, { preview: isPreview });
  
  if (!serviceData) {
    return <CounsellingNotFound slug={slug} />;
  }

  // Fetch therapists (6 cards)
  const therapists = await fetchPublicTherapists(6);
  const displayTherapists = removeAssessmentSpecialist(therapists);

  // Render with CMS data - with safe fallbacks
  return (
    <div>
      <ScrollToTop />
      <HeroSection 
        therapyType={slug} 
        cmsData={{
          title: serviceData.hero_title || 'Counseling',
          subtext: serviceData.hero_subtext || '',
          ctaText: serviceData.hero_cta_text || '',
          imageUrl: normalizeImageUrlWithSize(serviceData.hero_image_url || '', 1200, 80),
          features: [
            serviceData.hero_point_1,
            serviceData.hero_point_2,
            serviceData.hero_point_3
          ].filter(Boolean)
        }}
      />
      <LogosStrip bgColor="bg-[#15171A]" height="py-4" logosCount={6} swapSecondThird />
      {/* Therapist grid under hero */}
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 767px) {
          h2.therapist-heading-mobile {
            font-size: 24px !important;
            line-height: 1.1 !important;
            max-width: 100% !important;
          }
        }
      `}} />
      <div className="mx-auto max-w-4xl px-4 sm:px-6 mt-8 md:mt-12">
        <div className="px-4 sm:px-6 mb-8 md:mb-10 text-center">
          <div className="mt-3 text-center md:text-center max-w-full mx-auto px-4">
            <h2 className="how-it-works-heading therapist-heading-mobile text-center text-2xl md:text-xl lg:text-2xl" style={{ fontWeight: 500 }}>
              {serviceData.therapists_heading || 'Your journey to a happier, calmer home begins here.'}
            </h2>
          </div>
        </div>
        <TherapistCarousel therapists={displayTherapists} />

        {/* Desktop/tablet grid */}
        <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 md:gap-x-6 gap-y-4 md:gap-y-6 justify-items-stretch" style={{ columnGap: '2rem' }}>
          {displayTherapists.map((doc, idx) => {
            const imageSrc = normalizeImageUrlWithSize(
              doc.cover_image_url || doc.profile_picture_url || '/logo.png',
              400,
              80
            );
            const name = doc.name || doc.first_name || 'Therapist';
            // Create slug from doctor name
            const nameSlug = name
              .toLowerCase()
              .trim()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '');
            if (!nameSlug) return null; // Skip if no valid name
            return (
              <a key={idx} href={`/online-child-psychologist/${nameSlug}`} className="block">
                <div className="guide-video-card h-[360px] w-full rounded-[10px] overflow-hidden border border-gray-200 bg-white shadow-sm transition-transform duration-200 hover:scale-105 cursor-pointer relative">
                  <Image
                    src={imageSrc}
                    alt={name}
                    fill
                    sizes="(max-width: 768px) 100vw, 400px"
                    style={{ 
                      objectFit: 'cover',
                      aspectRatio: '400/360'
                    }}
                    priority={false}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '55%',
                      background:
                        'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0.2) 75%, rgba(0,0,0,0) 100%)'
                    }}
                  />
                  <div style={{ position: 'absolute', left: 18, bottom: 18, zIndex: 2, display: 'flex', flexDirection: 'column', gap: 6, width: '85%' }}>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.05rem', textShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>{name}</div>
                    {/* Expertise bubbles */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                      {/* Specialization chips first */}
                      {(doc.area_of_expertise && Array.isArray(doc.area_of_expertise) && doc.area_of_expertise.length > 0 ? doc.area_of_expertise.slice(0, 1) : ['Child Therapy']).map((exp, i) => (
                        <span key={i} style={{ background: 'rgba(255,255,255,0.22)', color: '#fff', borderRadius: 16, padding: '0.18em 0.5em', fontWeight: 400, fontSize: '0.9rem', boxShadow: '0 2px 8px rgba(0,0,0,0.10)', backdropFilter: 'blur(0.5px)', WebkitBackdropFilter: 'blur(0.5px)', border: '1.5px solid rgba(255,255,255,0.18)' }}>{exp}</span>
                      ))}
                      {/* Price chip (matches specialization chip style) */}
                      <span style={{ background: 'rgba(255,255,255,0.22)', color: '#fff', borderRadius: 16, padding: '0.18em 0.5em', fontWeight: 400, fontSize: '0.9rem', boxShadow: '0 2px 8px rgba(0,0,0,0.10)', backdropFilter: 'blur(0.5px)', WebkitBackdropFilter: 'blur(0.5px)', border: '1.5px solid rgba(255,255,255,0.18)' }}>{doc.price ? `₹${doc.price}` : (doc.individual_session_price ? `₹${doc.individual_session_price}` : '₹—')}</span>
                      {/* Experience chip */}
                      <span style={{
                        background: 'rgba(255,255,255,0.22)',
                        color: '#fff',
                        borderRadius: 16,
                        padding: '0.18em 0.5em',
                        fontWeight: 400,
                        fontSize: '0.9rem',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                        backdropFilter: 'blur(0.5px)',
                        WebkitBackdropFilter: 'blur(0.5px)',
                        border: '1.5px solid rgba(255,255,255,0.18)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        <span role="img" aria-label="experience" style={{ fontSize: 14, lineHeight: 1 }}>⚡️</span>
                        {`${(doc.experience_years || 3)}+ yrs Experience`}
                      </span>
                      {/* Designation chip (same as online-child-psychologist, with book emoji) */}
                      {doc.designation || doc.specialization ? (
                        <span style={{
                          background: 'rgba(255,255,255,0.22)',
                          color: '#fff',
                          borderRadius: 16,
                          padding: '0.18em 0.5em',
                          fontWeight: 400,
                          fontSize: '0.9rem',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                          backdropFilter: 'blur(0.5px)',
                          WebkitBackdropFilter: 'blur(0.5px)',
                          border: '1.5px solid rgba(255,255,255,0.18)'
                        }}>📚 {doc.designation || doc.specialization}</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>
      {/* Desktop-only View More under grid */}
      <div className="hidden md:block text-center mt-6">
        <a href="/online-child-psychologist" className="inline-flex items-center justify-center text-gray-900 text-lg group">
          <span className="relative cursor-pointer">
            View more →
            <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-gray-900 transition-all duration-300 ease-out group-hover:w-full" />
          </span>
        </a>
      </div>
      <div className="mt-12 md:mt-16">
        <HowItWorks />
      </div>
      <div className="mt-16 md:mt-20">
      <BenefitsSection 
        therapyType={slug} 
        cmsData={{
          title: serviceData.benefits_title,
          benefits: serviceData.benefits || [],
          benefitsImageUrl: normalizeImageUrlWithSize(serviceData.benefits_image_url || '', 800, 75)
        }}
      />
      </div>
      <div className="mt-0">
        <TherapyTypesSplit 
          therapyType={slug} 
          cmsData={{
            title: serviceData.types_title,
            types: serviceData.types || [],
            rightImageUrl: normalizeImageUrlWithSize(serviceData.right_image_url || '', 900, 80),
            buttonText: 'Get started'
          }}
        />
      </div>
      {/* Videos showcase above InfoCards */}
      <div className="mt-4 md:-mt-24">
        <VideosShowcase cmsData={{ 
          videos: (serviceData.videos || []).map(video => ({
            url: video.url || video.src,
            src: video.url || video.src,
            thumbnailUrl: normalizeImageUrl(video.thumbnailUrl || video.poster || ''),
            poster: normalizeImageUrl(video.thumbnailUrl || video.poster || ''),
            title: video.title,
            position: video.position
          })),
          videosHeading: serviceData.videos_heading,
          videosSubheading: serviceData.videos_subheading,
          featuredIndex: serviceData.videos_featured_index
        }} />
      </div>
      {/* Info Cards under Types of Therapy */}
      <div className="-mt-8 md:-mt-24">
        <div className="mx-auto w-full max-w-[22rem] sm:max-w-[28rem] md:max-w-none px-4 sm:px-6 md:px-0">
          <InfoCards cmsData={{ items: serviceData.info_cards }} isCmsPage={true} />
        </div>
      </div>
      {/* Reviews */}
      <div className="mt-8 md:-mt-24">
        <Reviews cmsData={{ 
          reviews: serviceData.reviews?.map(review => ({
            ...review,
            avatar: normalizeImageUrl(review.avatar || review.avatarUrl || ''),
            avatarUrl: normalizeImageUrl(review.avatarUrl || review.avatar || '')
          })) || []
        }} />
      </div>
      {/* Blog Teaser above FAQ */}
      <div className="mt-12 md:mt-16">
        <BlogTeaser />
      </div>
      <div className="mt-12 md:mt-16">
        <HelpFaq 
          cmsData={{
            faqs: serviceData.faqs || [],
            leftImageUrl: normalizeImageUrl(serviceData.left_image_url || ''),
            left_image_url: normalizeImageUrl(serviceData.left_image_url || '')
          }}
        />
      </div>
    </div>
  );
}
