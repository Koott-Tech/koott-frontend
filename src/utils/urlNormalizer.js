/**
 * URL Normalizer Utility
 * 
 * Converts absolute URLs to relative URLs for development/production compatibility
 * This ensures image URLs work in both localhost and production environments
 */

/**
 * Convert absolute proxy URL to relative URL
 * Converts: https://www.koott.in/api/images/... → /api/images/...
 * Or: http://localhost:3000/api/images/... → /api/images/...
 * Also converts Supabase storage URLs to proxy URLs:
 * https://PROJECT.supabase.co/storage/v1/object/public/BUCKET/FILE → /api/images/BUCKET/FILE
 * /storage/v1/object/public/BUCKET/FILE → /api/images/BUCKET/FILE
 * Also handles signed URLs by extracting the file path:
 * https://PROJECT.supabase.co/storage/v1/object/sign/BUCKET/FILE?token=... → /api/images/BUCKET/FILE
 * @param {string} url - Absolute or relative URL
 * @returns {string} Relative URL
 */
export function normalizeImageUrl(url) {
  if (!url || typeof url !== 'string') return url;
  
  // If it's already a relative proxy URL, return as-is
  if (url.startsWith('/api/images/')) return url;
  
  // Handle signed URLs (they have /object/sign/ instead of /object/public/)
  // Pattern: https://PROJECT.supabase.co/storage/v1/object/sign/BUCKET/FILENAME?token=...
  const signedUrlMatch = url.match(/\/storage\/v1\/object\/sign\/([^\/\?]+)\/([^\?]+)/);
  if (signedUrlMatch) {
    const bucket = signedUrlMatch[1];
    let filename = signedUrlMatch[2];
    try {
      filename = decodeURIComponent(filename);
    } catch (e) {
      // If decoding fails, use original filename
    }
    return `/api/images/${bucket}/${filename}`;
  }
  
  // Convert Supabase storage URLs to proxy URLs
  // Pattern: /storage/v1/object/public/BUCKET/FILENAME
  // Or: https://PROJECT.supabase.co/storage/v1/object/public/BUCKET/FILENAME
  const supabaseStorageMatch = url.match(/\/storage\/v1\/object\/public\/([^\/]+)\/(.+)$/);
  if (supabaseStorageMatch) {
    const bucket = supabaseStorageMatch[1];
    let filename = supabaseStorageMatch[2];
    // Remove query parameters if present (e.g., ?token=...)
    filename = filename.split('?')[0];
    // Decode URL-encoded characters (e.g., %20 -> space) to get the actual filename
    // The filename will be re-encoded by the browser when making the request
    try {
      filename = decodeURIComponent(filename);
    } catch (e) {
      // If decoding fails, use original filename (might already be decoded)
    }
    // Return with filename (will be encoded by browser automatically in URL)
    return `/api/images/${bucket}/${filename}`;
  }
  
  // If it's already a relative URL (and not Supabase storage), return as-is
  if (url.startsWith('/')) return url;
  
  // Extract the path from absolute proxy URL
  try {
    const urlObj = new URL(url);
    // If it's a proxy URL, return the pathname
    if (urlObj.pathname.startsWith('/api/images/')) {
      return urlObj.pathname;
    }
    // If it's a Supabase URL (signed or public), convert it
    if (urlObj.hostname.includes('supabase.co')) {
      // Handle signed URLs
      const signedMatch = urlObj.pathname.match(/\/storage\/v1\/object\/sign\/([^\/]+)\/(.+)$/);
      if (signedMatch) {
        const bucket = signedMatch[1];
        let filename = signedMatch[2].split('?')[0]; // Remove query params
        try {
          filename = decodeURIComponent(filename);
        } catch (e) {
          // If decoding fails, use original filename
        }
        return `/api/images/${bucket}/${filename}`;
      }
      // Handle public URLs
      if (urlObj.pathname.includes('/storage/v1/object/public/')) {
        const supabaseMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/([^\/]+)\/(.+)$/);
        if (supabaseMatch) {
          const bucket = supabaseMatch[1];
          // pathname is already decoded by URL constructor, but remove query params
          let filename = supabaseMatch[2].split('?')[0];
          try {
            filename = decodeURIComponent(filename);
          } catch (e) {
            // If decoding fails, use original filename
          }
          // Return with filename (will be encoded by browser automatically in URL)
          return `/api/images/${bucket}/${filename}`;
        }
      }
    }
    // Other absolute URLs (CDN, etc.): keep full URL — pathname-only would break Next/Image
    if (urlObj.protocol === 'https:' || urlObj.protocol === 'http:') {
      return url;
    }
    return urlObj.pathname;
  } catch (e) {
    // If URL parsing fails, try regex to extract /api/images/... path
    const match = url.match(/\/api\/images\/.+/);
    if (match) {
      return match[0];
    }
    // Try to extract Supabase storage path even if URL parsing failed
    const supabaseMatch = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^\/]+)\/([^\?]+)/);
    if (supabaseMatch) {
      const bucket = supabaseMatch[1];
      let filename = supabaseMatch[2];
      try {
        filename = decodeURIComponent(filename);
      } catch (e) {
        // If decoding fails, use original filename
      }
      return `/api/images/${bucket}/${filename}`;
    }
    // If no match, return original (might be external URL or already relative)
    return url;
  }
}

/**
 * Normalize multiple image URLs in an object
 * Useful for normalizing service data with multiple image fields
 * @param {object} data - Object containing image URL fields
 * @param {string[]} imageFields - Array of field names that contain image URLs
 * @returns {object} Object with normalized URLs
 */
export function normalizeImageUrls(data, imageFields = ['hero_image_url', 'og_image', 'imageUrl', 'profile_picture_url', 'cover_image_url']) {
  if (!data || typeof data !== 'object') return data;
  
  const normalized = { ...data };
  
  imageFields.forEach(field => {
    if (normalized[field]) {
      normalized[field] = normalizeImageUrl(normalized[field]);
    }
  });
  
  return normalized;
}

/**
 * Normalize an image URL and optionally append width/quality query params
 * for Supabase image transformations via the /api/images proxy.
 * Only applies width/quality when the normalized URL points at /api/images/...;
 * other URLs (local assets, external origins) are returned unchanged.
 *
 * @param {string} url - Original image URL
 * @param {number} width - Desired width in pixels
 * @param {number} [quality=75] - Desired quality (1–100)
 * @returns {string} URL with optional ?width=&quality= params
 */
export function normalizeImageUrlWithSize(url, width, quality = 75) {
  const base = normalizeImageUrl(url);
  if (!base || typeof base !== 'string') return base;

  // Only append sizing params for our image proxy (Supabase-backed)
  if (!base.startsWith('/api/images/')) {
    return base;
  }

  const safeWidth = width && width > 0 ? Math.min(width, 4000) : null;
  if (!safeWidth) return base;

  const safeQuality = quality && quality > 0 && quality <= 100 ? quality : 75;
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}width=${safeWidth}&quality=${safeQuality}`;
}

