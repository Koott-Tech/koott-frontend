'use client';

import Head from 'next/head';

const BlogMetaTags = ({ blog, siteUrl = 'https://koott.com' }) => {
  if (!blog) return null;

  const {
    title,
    seo_title,
    excerpt,
    seo_description,
    focus_keyword,
    meta_keywords,
    tags,
    categories,
    featured_image_url,
    canonical_url,
    author_name,
    published_at,
    slug
  } = blog;

  // Use SEO fields or fallback to regular fields
  const metaTitle = seo_title || title;
  const metaDescription = seo_description || excerpt;
  const keywords = [
    focus_keyword,
    ...(meta_keywords || []),
    ...(tags || []),
    ...(categories || [])
  ].filter(Boolean).join(', ');

  // Generate structured data
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": metaTitle,
    "description": metaDescription,
    "image": featured_image_url ? `${siteUrl}${featured_image_url}` : `${siteUrl}/logo.png`,
    "author": {
      "@type": "Person",
      "name": author_name || "Koott Team"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Koott",
      "logo": {
        "@type": "ImageObject",
        "url": `${siteUrl}/logo.png`
      }
    },
    "datePublished": published_at,
    "dateModified": published_at,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${siteUrl}/blog/${slug}`
    },
    "keywords": keywords,
    "articleSection": categories?.[0] || "Mental Health",
    "wordCount": blog.read_time_minutes ? blog.read_time_minutes * 200 : 1000
  };

  return (
    <Head>
      {/* Primary Meta Tags */}
      <title>{metaTitle}</title>
      <meta name="title" content={metaTitle} />
      <meta name="description" content={metaDescription} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={author_name || "Koott Team"} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content="article" />
      <meta property="og:url" content={`${siteUrl}/blog/${slug}`} />
      <meta property="og:title" content={metaTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={featured_image_url ? `${siteUrl}${featured_image_url}` : `${siteUrl}/logo.png`} />
      <meta property="og:site_name" content="Koott" />
      <meta property="og:locale" content="en_US" />
      <meta property="article:author" content={author_name || "Koott Team"} />
      <meta property="article:published_time" content={published_at} />
      <meta property="article:modified_time" content={published_at} />
      {categories?.map((category, index) => (
        <meta key={index} property="article:section" content={category} />
      ))}
      {tags?.map((tag, index) => (
        <meta key={index} property="article:tag" content={tag} />
      ))}

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={`${siteUrl}/blog/${slug}`} />
      <meta property="twitter:title" content={metaTitle} />
      <meta property="twitter:description" content={metaDescription} />
      <meta property="twitter:image" content={featured_image_url ? `${siteUrl}${featured_image_url}` : `${siteUrl}/logo.png`} />

      {/* Additional SEO Meta Tags */}
      <meta name="robots" content="index, follow" />
      <meta name="googlebot" content="index, follow" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="theme-color" content="#4F46E5" />
      
      {/* Canonical URL */}
      <link rel="canonical" href={canonical_url || `${siteUrl}/blog/${slug}`} />
      
      {/* Language */}
      <meta httpEquiv="content-language" content="en" />
      <meta name="language" content="English" />
      
      {/* Geo Tags */}
      <meta name="geo.region" content="IN" />
      <meta name="geo.placename" content="India" />
      
      {/* Focus Keyword Highlight */}
      {focus_keyword && (
        <meta name="focus-keyword" content={focus_keyword} />
      )}
      
      {/* Reading Time */}
      {blog.read_time_minutes && (
        <meta name="reading-time" content={`${blog.read_time_minutes} minutes`} />
      )}
      
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData)
        }}
      />
    </Head>
  );
};

export default BlogMetaTags;
