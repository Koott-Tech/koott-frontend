/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strip console.* in production (logs only on localhost/dev)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // SWC is now enabled (Babel config moved to Jest-only configuration)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      // NOTE: Supabase storage URLs are NOT included here because we use a proxy route
      // All Supabase images should go through /api/images/... proxy route which handles
      // authentication and signed URLs properly. Including Supabase here causes Next.js
      // Image Optimization to try fetching directly from Supabase, which fails with 400 errors
      // for private buckets or invalid URLs.
      // Allow images from same domain (for proxy)
      {
        protocol: 'https',
        hostname: 'www.little.care',
      },
      {
        protocol: 'https',
        hostname: 'little.care',
      },
      {
        protocol: 'https',
        hostname: 'static.wixstatic.com',
      },
      // Development
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
      },
    ],
    // Also allow unoptimized images if needed (fallback)
    unoptimized: false,
  },
  // Force cache busting
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
  // Optimize bundle size
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  // Redirect old URLs to canonical psychologist listing
  async redirects() {
    return [
      {
        source: '/online-child-psycologist/:path*',
        destination: '/online-child-psychologist/:path*',
        permanent: true,
      },
      {
        source: '/psychologists',
        destination: '/online-child-psychologist',
        permanent: true,
      },
      {
        source: '/psychologists/',
        destination: '/online-child-psychologist',
        permanent: true,
      },
    ];
  },
  // Rewrite analytics requests to bypass ad blockers
  // These proxies make analytics requests appear as first-party requests (bypasses ad blockers)
  async rewrites() {
    // Proxy /api/images to Express so next/image and relative /api/images/* URLs work in dev/prod
    const backendOrigin = (
      process.env.BACKEND_INTERNAL_URL ||
      (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api').replace(
        /\/api\/?$/,
        ''
      )
    ).replace(/\/$/, '');

    return [
      {
        source: '/api/images/:path*',
        destination: `${backendOrigin}/api/images/:path*`,
      },
      {
        source: '/posthog/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
      {
        source: '/clarity/:path*',
        destination: 'https://www.clarity.ms/:path*',
      },
    ];
  },
};

export default nextConfig;
