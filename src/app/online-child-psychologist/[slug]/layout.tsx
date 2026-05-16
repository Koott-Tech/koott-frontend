import { Metadata } from 'next';
import React from 'react';
import { normalizeImageUrl } from '@/utils/urlNormalizer';

// Same helper as page.js - create slug from doctor name
const createSlug = (name: string): string => {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Same fetch as page: publicApi.getPsychologists() -> BACKEND_URL + '/public/psychologists'
// Same filter (exclude assessment psychologist) and same find-by-slug logic
async function getPsychologistBySlug(slug: string) {
  try {
    const baseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api').replace(/\/$/, '');
    const url = `${baseUrl}/public/psychologists`;
    const response = await fetch(url, { cache: 'no-store' });

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.success) return null;

    const rawList = data.data?.psychologists ?? data.data ?? data.psychologists ?? [];
    const list = Array.isArray(rawList) ? rawList : [];

    const assessmentEmail = (process.env.NEXT_PUBLIC_FREE_ASSESSMENT_PSYCHOLOGIST_EMAIL || 'assessment.koott@gmail.com').toLowerCase();
    const psychologists = list.filter((p: { email?: string }) => (p.email || '').toLowerCase() !== assessmentEmail);

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
    if (isUUID) {
      return psychologists.find((doc: { id?: string }) => doc.id === slug) ?? null;
    }

    const psychologist = psychologists.find((doc: { name?: string; first_name?: string; last_name?: string }) => {
      const name = doc.name || `${doc.first_name || ''} ${doc.last_name || ''}`.trim();
      return createSlug(name) === slug;
    });
    return psychologist ?? null;
  } catch (error) {
    console.error('Error fetching psychologist for metadata:', error);
    return null;
  }
}

// Same image as page: profile_picture_url || cover_image_url, then normalizeImageUrl; make absolute for OG
function toAbsoluteOgImage(rawUrl: string | null | undefined): string {
  if (!rawUrl || typeof rawUrl !== 'string') return 'https://www.koott.in/favicon.png';
  const normalized = normalizeImageUrl(rawUrl);
  if (!normalized) return 'https://www.koott.in/favicon.png';
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) return normalized;
  return `https://www.koott.in${normalized.startsWith('/') ? normalized : `/${normalized}`}`;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { slug } = await params;
  
  try {
    const psychologist = await getPsychologistBySlug(slug);
    
    if (psychologist) {
      const name = psychologist.name || `${psychologist.first_name || ''} ${psychologist.last_name || ''}`.trim();
      const title = `${name} | Child Psychologist | Koott`;
      
      // Get description from psychologist data or use default
      const description = psychologist.bio || 
                         psychologist.description || 
                         psychologist.short_bio ||
                         `Book an online session with ${name}, an experienced child psychologist at Koott. Professional counseling and therapy for children.`;
      
      // Same image as page: profile_picture_url || cover_image_url, then normalizeImageUrl → absolute for OG
      const rawImageUrl = psychologist.profile_picture_url || psychologist.cover_image_url;
      const therapistImage = toAbsoluteOgImage(rawImageUrl);
      
      const url = `https://www.koott.in/online-child-psychologist/${slug}`;
      
      return {
        title,
        description,
        openGraph: {
          title,
          description,
          type: 'profile',
          siteName: 'Koott',
          url,
          images: [
            {
              url: therapistImage,
              width: 1200,
              height: 630,
              alt: `${name} - Child Psychologist`,
            },
          ],
        },
        twitter: {
          card: 'summary_large_image',
          title,
          description,
          images: [therapistImage],
        },
        alternates: {
          canonical: url,
        },
      };
    }
  } catch (error) {
    console.error('Error generating metadata for therapist profile:', error);
  }
  
  // Fallback metadata
  const fallbackTitle = slug 
    ? `${slug.replace(/[-_]/g, ' ')} - Child Psychologist | Koott`
    : 'Child Psychologist | Koott';
  
  return {
    title: fallbackTitle,
    description: 'Book an online session with an experienced child psychologist at Koott. Professional counseling and therapy for children.',
    openGraph: {
      title: fallbackTitle,
      description: 'Book an online session with an experienced child psychologist at Koott. Professional counseling and therapy for children.',
      type: 'profile',
      siteName: 'Koott',
      url: `https://www.koott.in/online-child-psychologist/${slug}`,
      images: [
        {
          url: 'https://www.koott.in/favicon.png',
          width: 1200,
          height: 630,
          alt: 'Koott',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fallbackTitle,
      description: 'Book an online session with an experienced child psychologist at Koott. Professional counseling and therapy for children.',
      images: ['https://www.koott.in/favicon.png'],
    },
    alternates: {
      canonical: `https://www.koott.in/online-child-psychologist/${slug}`,
    },
  };
}

export default function TherapistProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
