import "./globals.css";
import { Suspense } from "react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import Script from "next/script";
import HeaderWrapper from "@/components/HeaderWrapper";
import FooterWrapper from "@/components/FooterWrapper";
import ConditionalProviders from "@/components/ConditionalProviders";
import ConditionalPadding from "@/components/ConditionalPadding";
import WhatsAppWidgetWrapper from "@/components/WhatsAppWidgetWrapper";
import PageLoadingOverlay from "@/components/PageLoadingOverlay";
import ErrorBoundary from "@/components/ErrorBoundary";
import { PostHogProvider } from "@/components/PostHogProvider";

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://www.koott.in"
).replace(/\/+$/, "");

export const metadata = {
  metadataBase: new URL(`${siteUrl}/`),
  title: {
    default: "India's Trusted Child Psychologist | Online Child Counseling",
    template: "%s | MyKoott"
  },
  description:
    "Connect with experienced child psychologists for safe, supportive online child counseling. Help your child manage anxiety, behavior, or school stress from the comfort of home.",
  icons: {
    icon: [{ url: "/logo.png", type: "image/png", sizes: "32x32" }],
    apple: [{ url: "/logo.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "India's Trusted Child Psychologist | Online Child Counseling",
    description:
      "Connect with experienced child psychologists for safe, supportive online child counseling. Help your child manage anxiety, behavior, or school stress from the comfort of home.",
    type: "website",
    siteName: "MyKoott",
    url: "/",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "MyKoott",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "India's Trusted Child Psychologist | Online Child Counseling",
    description:
      "Connect with experienced child psychologists for safe, supportive online child counseling. Help your child manage anxiety, behavior, or school stress from the comfort of home.",
    images: [`${siteUrl}/logo.png`],
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Favicon */}
        <link rel="icon" href="/logo.png" type="image/png" />
        {/* DNS Prefetch and Preconnect for faster API connections (especially for international users) */}
        {process.env.NEXT_PUBLIC_BACKEND_URL && (
          <>
            <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_BACKEND_URL.replace('/api', '')} />
            <link rel="preconnect" href={process.env.NEXT_PUBLIC_BACKEND_URL.replace('/api', '')} crossOrigin="anonymous" />
          </>
        )}
        {/* Preconnect to critical third-party origins for better performance */}
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.youtube-nocookie.com" />
        {/* Clarity and PostHog preconnect removed - using proxies (/clarity/* and /posthog/*) which don't need preconnect */}
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.youtube-nocookie.com" />
        {/* Font preloading to prevent CLS */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Load fonts - Varela Round loaded first as it's render-blocking, others can load async */}
        <link href="https://fonts.googleapis.com/css2?family=Varela+Round&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,100..1000&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        {/* Preload logo for instant loading screen display */}
        <link rel="preload" as="image" href="/logo.png" />
        {/* CRITICAL: Script to manage loader - runs only on client side to prevent hydration mismatch */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Only run on client side (not during SSR)
                if (typeof window === 'undefined') return;
                
                const LOADER_ID = 'initial-loader';
                const body = document.body;
                const loader = document.getElementById(LOADER_ID);
                const MIN_DISPLAY_TIME = 700; // Minimum 0.7 second display time
                let showTime = null; // Track when loader was shown
                
                // Show loader immediately on every page load/refresh with smooth fade in
                function showLoader() {
                  if (loader && body && body.classList) {
                    // Reset opacity to 0 first for smooth fade in
                    loader.style.opacity = '0';
                    loader.style.visibility = 'visible';
                    loader.style.pointerEvents = 'auto';
                    body.classList.remove('loaded');
                    // Trigger fade in by setting opacity to 1 after a brief moment
                    requestAnimationFrame(() => {
                      if (loader) {
                      loader.style.opacity = '1';
                      }
                    });
                    showTime = Date.now(); // Record when loader was shown
                  }
                }
                
                // Function to hide loader with smooth fade out (respects minimum display time)
                function hideLoader() {
                  if (!showTime) {
                    // If showTime wasn't set, wait full minimum time
                    showTime = Date.now();
                    setTimeout(hideLoader, MIN_DISPLAY_TIME);
                    return;
                  }
                  
                  const elapsed = Date.now() - showTime;
                  const remaining = Math.max(0, MIN_DISPLAY_TIME - elapsed);
                  
                  setTimeout(function() {
                    if (loader && body && body.classList) {
                    // Start fade out
                    loader.style.opacity = '0';
                    // Wait for transition to complete before hiding
                    setTimeout(() => {
                        if (loader && body && body.classList) {
                      loader.style.pointerEvents = 'none';
                      loader.style.visibility = 'hidden';
                      body.classList.add('loaded');
                        }
                      }, 300); // Match the CSS transition duration
                  }
                  }, remaining);
                }
                
                // Show loader immediately
                showLoader();
                
                // Wait for page to be fully loaded, but ensure minimum display time
                if (document.readyState === 'complete') {
                  // Page already loaded, but ensure minimum display time
                  hideLoader();
                } else if (document.readyState === 'interactive') {
                  // DOM is ready, wait for all resources
                  window.addEventListener('load', hideLoader, { once: true });
                } else {
                  // Still loading, wait for window load event
                  window.addEventListener('load', hideLoader, { once: true });
                  
                  // Fallback: hide after 5 seconds if load event doesn't fire
                  setTimeout(function() {
                    if (body && body.classList && !body.classList.contains('loaded')) {
                      hideLoader();
                    }
                  }, 5000);
                }
                
                // Handle browser back/forward navigation
                window.addEventListener('pageshow', function(event) {
                  // If page was loaded from cache (back/forward), show loader briefly
                  if (event.persisted) {
                    showLoader();
                    // Hide when ready, but ensure minimum display time
                    if (document.readyState === 'complete') {
                      hideLoader();
                    } else {
                      window.addEventListener('load', hideLoader, { once: true });
                    }
                  }
                });
              })();
            `,
          }}
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
            /* Critical CSS for immediate mobile styling */
            @media (max-width: 767px) {
              .hero-title, .hero-description {
                text-align: center !important;
              }
              .hero-title {
                line-height: 0.95 !important;
              }
            }
            /* Instant loading screen - renders with HTML, no hydration needed */
            /* CRITICAL: Loader is position:fixed overlay - NEVER affects layout flow */
            /* Content renders immediately for FCP/LCP metrics */
            body:not(.loaded) {
              overflow: hidden !important;
            }
            /* Prevent interaction during initial load, but allow rendering */
            body:not(.loaded) > *:not(#initial-loader) {
              pointer-events: none !important;
            }
            body.loaded > *:not(#initial-loader) {
              pointer-events: auto !important;
            }
            /* Prevent layout shifts during font loading */
            body {
              font-display: swap;
            }
            /* Reserve space for images to prevent CLS */
            img {
              max-width: 100%;
              height: auto;
            }
            img[width][height] {
              aspect-ratio: attr(width) / attr(height);
            }
            /* Loader must be visible and on top */
            #initial-loader {
              position: fixed !important;
              inset: 0 !important;
              width: 100% !important;
              height: 100% !important;
              background: #ffffff !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              z-index: 999999 !important;
              font-family: Arial, Helvetica, sans-serif !important;
              overflow: hidden !important;
              margin: 0 !important;
              padding: 0 !important;
              transition: opacity 150ms ease-in-out !important;
              pointer-events: auto !important;
              opacity: 1 !important;
              visibility: visible !important;
            }
            body.loaded #initial-loader {
              opacity: 0 !important;
              pointer-events: none !important;
              visibility: hidden !important;
              transition: opacity 300ms ease-out !important;
            }
             #initial-loader .loading-logo {
              width: 720px;
              height: 237px;
              margin: 0 auto;
              background-image: url('/logo.png');
              background-size: contain;
              background-repeat: no-repeat;
              background-position: center;
              animation: pulseScale 2s ease-in-out infinite;
            }
            @keyframes pulseScale {
              0% { transform: scale(1); opacity: 0.9; }
              50% { transform: scale(1.05); opacity: 1; }
              100% { transform: scale(1); opacity: 0.9; }
            }
            @media (max-width: 767px) {
              #initial-loader .loading-logo {
                width: 500px !important;
                height: 165px !important;
              }
            }
          `,
          }}
        />
        {/* Organization / MedicalBusiness structured data for Google */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "MedicalBusiness",
              name: "MyKoott",
              description:
                "Connect with experienced child psychologists for safe, supportive online child counseling. Help your child manage anxiety, behavior, or school stress from the comfort of home.",
              url: siteUrl,
              logo: {
                "@type": "ImageObject",
                "url": `${siteUrl}/logo.png`,
                "width": 1200,
                "height": 400
              },
              image: `${siteUrl}/logo.png`,
              telephone: "+91 95390 07766",
              email: "hello@koott.in",
              address: {
                "@type": "PostalAddress",
                addressCountry: "IN",
              },
              medicalSpecialty: [
                "Child Psychology",
                "Child Counseling",
                "Parent Support",
              ],
              serviceType: "Online Therapy",
              areaServed: "Worldwide",
            }),
          }}
        />
      </head>
      <body className="antialiased bg-gray-50" suppressHydrationWarning>
        {/* INSTANT - Server-rendered loader (appears at 0ms, no hydration needed) */}
        {/* Position:fixed overlay - NEVER affects layout flow, prevents CLS */}
        <div id="initial-loader">
          <div className="loading-logo"></div>
        </div>
        {/* Client-side PageLoadingOverlay - handles navigation transitions */}
        <Suspense fallback={null}>
          <PageLoadingOverlay />
        </Suspense>
        <ErrorBoundary>
          <Suspense fallback={null}>
            <PostHogProvider>
              <ConditionalProviders>
                <HeaderWrapper />
                <ConditionalPadding>
                  {children}
                </ConditionalPadding>
                <FooterWrapper />
                <WhatsAppWidgetWrapper />
              </ConditionalProviders>
            </PostHogProvider>
          </Suspense>
        </ErrorBoundary>
        <SpeedInsights />
        <Analytics />
        {/* Google Analytics - Load after interactive to prevent forced reflows */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-K7Z8F94Z80"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-K7Z8F94Z80');
          `}
        </Script>
        {/* Microsoft Clarity - User behavior analytics */}
        {/* Using proxy (/clarity/*) to bypass ad blockers - requests appear as first-party */}
        <Script id="microsoft-clarity-analytics" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;
              // Use proxy to bypass ad blockers - /clarity/* proxies to clarity.ms
              t.src="/clarity/tag/"+i;
              t.onerror=function(){/* Silently handle blocked requests */};
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "v8mh6s1q7j");
          `}
        </Script>
      </body>
    </html>
  );
}
