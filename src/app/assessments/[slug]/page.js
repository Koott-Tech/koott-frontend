import HeroSection from '@/components/HeroSection';
import LogosStrip from '@/components/LogosStrip';
import HelpFaq from '@/components/HelpFaq';
import ScrollToTop from '@/components/ScrollToTop';
import HowItWorks from '@/components/HowItWorks';
import BenefitsSection from '@/components/BenefitsSection';
import TherapyTypesSplit from '@/components/TherapyTypesSplit';
import AssessmentInfoCard from '@/components/AssessmentInfoCard';
import TherapistCarousel from '@/components/TherapistCarousel';
import InfoCards from '@/components/InfoCards';
import Reviews from '@/components/Reviews';
import VideosShowcase from '@/components/VideosShowcase';
import { normalizeImageUrl, normalizeImageUrlWithSize } from '@/utils/urlNormalizer';

// No cache for CMS pages - changes reflect immediately
export const revalidate = 0;
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const dynamicParams = true;

// Dynamic metadata for assessment pages
export async function generateMetadata({ params, searchParams }) {
  const { slug } = await params;
  const isPreview =
    searchParams?.preview === '1' || searchParams?.preview === 'true';

  try {
    const data = await fetchAssessment(slug, { preview: isPreview });
    if (data && typeof data === 'object') {
      const title =
        data.seo_title ||
        data.hero_title ||
        (slug ? `${slug.replace(/[-_]/g, ' ')} - MyKoott` : 'Assessment');
      const description =
        data.seo_description ||
        data.hero_subtext ||
        'Professional assessments to better understand children’s needs and strengths.';
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
          url: `https://www.koott.in/assessments/${slug}`,
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
          canonical: `https://www.koott.in/assessments/${slug}`,
        },
      };
    }
  } catch (e) {
    console.error('Error generating assessment metadata (non-critical):', e);
  }

  const fallbackTitle =
    (slug && `${slug.replace(/[-_]/g, ' ')} - MyKoott`) ||
    'Assessment - MyKoott';

  return {
    title: fallbackTitle,
    description:
      'Professional assessments to better understand children’s needs and strengths.',
    alternates: {
      canonical: `https://www.koott.in/assessments/${slug}`,
    },
  };
}

async function fetchAssessment(slug, { preview = false } = {}) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
    const timestamp = Date.now();
    const previewSuffix = preview ? '&preview=1' : '';
    const url = `${baseUrl}/api/assessments/${slug}?t=${timestamp}${previewSuffix}`;
    
    console.log(`[Assessment] Fetching: ${url}`);
    
    const response = await fetch(url, {
      cache: 'no-store'
    });

    console.log(`[Assessment] Response status: ${response.status} for slug: ${slug}`);

    if (response.ok) {
      const json = await response.json();
      console.log(`[Assessment] Response data structure:`, {
        hasSuccess: !!json?.success,
        hasData: !!json?.data,
        hasMessage: !!json?.message,
        keys: Object.keys(json || {})
      });
      
      // Handle both success: true and success: false responses
      if (json?.success === true) {
        const payload = json.data ?? json.message ?? json.assessment ?? json.result ?? json;
        if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
          if (payload.assessment && typeof payload.assessment === 'object' && !Array.isArray(payload.assessment)) {
            return payload.assessment;
          }
          return payload;
        }
      } else if (json?.success === false) {
        // Backend returned error response
        console.warn(`[Assessment] Backend error for slug: ${slug}:`, json.message || json.error || json);
        return null;
      } else {
        // No success field - try to extract data anyway (backward compatibility)
        const payload = json.data ?? json.message ?? json.assessment ?? json.result ?? json;
        if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
          if (payload.assessment && typeof payload.assessment === 'object' && !Array.isArray(payload.assessment)) {
            return payload.assessment;
          }
          return payload;
        }
        console.warn(`[Assessment] Unexpected response structure for slug: ${slug}`, json);
      }
    } else {
      const errorText = await response.text();
      let errorJson = null;
      try {
        errorJson = JSON.parse(errorText);
      } catch (e) {
        // Not JSON, use text as is
      }
      console.error(`[Assessment] API error ${response.status} for slug: ${slug}`, errorJson || errorText);
    }
  } catch (error) {
    console.error(`[Assessment] Fetch error for slug: ${slug}:`, error);
  }

  return null;
}

async function fetchPublicTherapists(limit = 6) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
    // Use ISR with revalidation for better performance
    const response = await fetch(`${baseUrl}/api/public/psychologists?limit=${limit}`, {
      next: { revalidate: 300 } // Revalidate every 5 minutes (psychologists change less frequently)
    });

    if (response.ok) {
      const json = await response.json();
      const psychologists = json?.data?.psychologists || json?.message?.psychologists || json?.psychologists || [];
      if (Array.isArray(psychologists)) {
        return psychologists.slice(0, limit);
      }
    }
  } catch (error) {
    console.error('Error fetching public psychologists:', error);
  }

  return [];
}

export default async function AssessmentDynamicPage({ params, searchParams }) {
  const { slug } = await params;
  const isPreview = searchParams?.preview === '1' || searchParams?.preview === 'true';
  
  // Fetch data in parallel to reduce TTFB - don't block on therapists
  const [data, therapists] = await Promise.all([
    fetchAssessment(slug, { preview: isPreview }),
    fetchPublicTherapists(6).catch(() => []) // Don't block page if therapists fail
  ]);

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-5xl font-bold mb-4" style={{ color: '#025545' }}>404</h1>
          <h2 className="text-2xl font-semibold mb-3" style={{ color: '#025545' }}>
            Assessment page not found
          </h2>
          <p className="text-gray-600 mb-6">
            We couldn&apos;t load this assessment right now. It may have been moved, unpublished, or does not exist.
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center w-full py-3 px-4 text-base font-semibold text-white rounded-lg transition-colors duration-200 bg-[#025545] hover:bg-[#012f23]"
          >
            Go back home
          </a>
        </div>
      </div>
    );
  }

  const title = data?.hero_title || (slug ? slug.replace(/[-_]/g, ' ') : 'Assessment');
  const subtext = data?.hero_subtext || 'Professional assessment to better understand needs and strengths.';
  const imageUrl = normalizeImageUrlWithSize(data?.hero_image_url || '', 1200, 80);
  const heroFeatures = [data?.hero_point_1, data?.hero_point_2, data?.hero_point_3].filter(Boolean);

  return (
    <div>
      <ScrollToTop />
      <HeroSection 
        therapyType={slug}
        cmsData={{
          title,
          subtext,
          ctaText: data?.hero_cta_text || '',
          imageUrl,
          features: heroFeatures,
        }}
      />
      <LogosStrip bgColor="bg-[#15171A]" height="py-4" logosCount={6} swapSecondThird />

      <div className="mt-8 md:mt-12">
        <AssessmentInfoCard
          cmsData={{
            slug,
            id: data?.id,
            title: data?.assessment_card_title,
            description: data?.assessment_card_description,
            sessionsInfo: data?.assessment_card_sessions_info,
            typesHeading: data?.assessment_card_types_heading,
            certifiedLabel: data?.assessment_card_certified_label,
            nonCertifiedLabel: data?.assessment_card_non_certified_label,
            assigned_doctor_ids: data?.assigned_doctor_ids || [],
          }}
        />
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 mt-8 md:mt-12 hidden md:block">
        <TherapistCarousel therapists={therapists} />
      </div>

      <div className="mt-12 md:mt-16">
        <HowItWorks />
      </div>

      <div className="mt-16 md:mt-20">
        <BenefitsSection 
          cmsData={{ 
            title: data?.benefits_title || 'Why this assessment?', 
            benefits: data?.benefits || [],
            benefitsImageUrl: normalizeImageUrlWithSize(data?.benefits_image_url || '', 800, 75)
          }} 
        />
      </div>
      <div className="mt-0">
        <TherapyTypesSplit 
          therapyType={slug}
          cmsData={{ 
            title: data?.types_title || 'What we evaluate', 
            types: data?.types || [],
            rightImageUrl: normalizeImageUrlWithSize(data?.right_image_url || '', 900, 80),
            buttonText: data?.types_button_text || 'Get started'
          }} 
        />
      </div>
      <div className="mt-4 md:-mt-24">
        <VideosShowcase cmsData={{ 
          videos: (data?.videos || []).map(video => ({
            url: video.url || video.src,
            src: video.url || video.src,
            thumbnailUrl: normalizeImageUrl(video.thumbnailUrl || video.poster || ''),
            poster: normalizeImageUrl(video.thumbnailUrl || video.poster || ''),
            title: video.title,
            position: video.position
          })),
          videosHeading: data?.videos_heading,
          videosSubheading: data?.videos_subheading,
          featuredIndex: data?.videos_featured_index
        }} />
      </div>
      {(data?.info_cards && data.info_cards.length > 0) && (
        <div className="-mt-8 md:-mt-24">
          <InfoCards cmsData={{ items: data.info_cards }} isCmsPage={true} />
        </div>
      )}
      <div className="mt-8 md:-mt-24">
        <Reviews cmsData={{ 
          reviews: data?.reviews?.map(review => ({
            ...review,
            avatar: normalizeImageUrl(review.avatar || review.avatarUrl || ''),
            avatarUrl: normalizeImageUrl(review.avatarUrl || review.avatar || '')
          })) || []
        }} />
      </div>
      <div className="mt-12 md:mt-16 px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          <HelpFaq cmsData={{ 
            faqs: data?.faqs || [],
            leftImageUrl: normalizeImageUrl(data?.left_image_url || ''),
            left_image_url: normalizeImageUrl(data?.left_image_url || '')
          }} />
        </div>
      </div>
    </div>
  );
}


