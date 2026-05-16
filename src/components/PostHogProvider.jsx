'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'

// Global error handler to suppress PostHog blocked requests
if (typeof window !== 'undefined') {
  // Store original error handlers
  const originalError = window.console.error
  const originalWarn = window.console.warn
  
  // Override console.error to filter out PostHog blocked request errors
  window.console.error = function(...args) {
    const errorMessage = args.join(' ')
    
    // Check if this is a PostHog or Clarity blocked request error (check for various patterns)
    const isAnalyticsBlockedError = 
      (errorMessage.includes('ERR_BLOCKED_BY_CLIENT') || 
       errorMessage.includes('net::ERR_BLOCKED_BY_CLIENT') ||
       errorMessage.includes('Failed to load resource')) &&
      (errorMessage.includes('posthog') || 
       errorMessage.includes('us.i.posthog.com') ||
       errorMessage.includes('us-assets.i.posthog.com') ||
       errorMessage.includes('clarity.ms') ||
       errorMessage.includes('clarity'))
    
    // Suppress analytics blocked errors, but allow other errors
    if (!isAnalyticsBlockedError) {
      originalError.apply(window.console, args)
    }
    // Silently suppress - don't log anything to keep console clean
  }
  
  // Also override console.warn for PostHog errors
  window.console.warn = function(...args) {
    const errorMessage = args.join(' ')
    
    const isAnalyticsBlockedError = 
      (errorMessage.includes('ERR_BLOCKED_BY_CLIENT') || 
       errorMessage.includes('net::ERR_BLOCKED_BY_CLIENT')) &&
      (errorMessage.includes('posthog') || 
       errorMessage.includes('us.i.posthog.com') ||
       errorMessage.includes('clarity.ms') ||
       errorMessage.includes('clarity'))
    
    if (!isAnalyticsBlockedError) {
      originalWarn.apply(window.console, args)
    }
  }
  
  // Handle unhandled promise rejections from PostHog
  window.addEventListener('unhandledrejection', (event) => {
    const errorMessage = event.reason?.message || event.reason?.toString() || ''
    
    if ((errorMessage.includes('ERR_BLOCKED_BY_CLIENT') || 
         errorMessage.includes('blocked')) && 
        (errorMessage.includes('posthog') || 
         errorMessage.includes('us.i.posthog.com') ||
         errorMessage.includes('clarity.ms') ||
         errorMessage.includes('clarity'))) {
      // Prevent the error from showing in console
      event.preventDefault()
    }
  })
  
  // Intercept fetch/XHR errors for PostHog (catches network errors before they're logged)
  if (typeof window.fetch !== 'undefined') {
    const originalFetch = window.fetch
    window.fetch = function(...args) {
      const url = args[0]?.toString() || ''
      
      // If it's an analytics URL (PostHog or Clarity), wrap in try-catch to suppress errors
      if (url.includes('posthog.com') || url.includes('/posthog/') ||
          url.includes('clarity.ms') || url.includes('/clarity/')) {
        return originalFetch.apply(this, args).catch((error) => {
          // Silently handle blocked requests
          if (error?.message?.includes('ERR_BLOCKED_BY_CLIENT') || 
              error?.message?.includes('blocked')) {
            // Return a fake successful response to prevent errors
            return new Response(JSON.stringify({}), { status: 200 })
          }
          throw error
        })
      }
      
      return originalFetch.apply(this, args)
    }
  }
}

export function PostHogProvider({ children }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Initialize PostHog only on client side
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      // Extract backend domain(s) for tracing headers
      const getBackendDomains = () => {
        const domains = new Set() // Use Set to avoid duplicates
        
        // Get backend URL from environment
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
        
        if (backendUrl) {
          try {
            // Remove /api suffix if present and extract domain
            const urlWithoutApi = backendUrl.replace(/\/api\/?$/, '')
            const url = new URL(urlWithoutApi)
            // Add domain (hostname:port or just hostname)
            const domain = url.port ? `${url.hostname}:${url.port}` : url.hostname
            domains.add(domain)
            
            if (process.env.NODE_ENV === 'development') {
              console.log('[PostHog] Backend domain for tracing:', domain)
            }
          } catch (error) {
            console.warn('[PostHog] Failed to parse backend URL:', error)
          }
        }
        
        // Add production backend domain from environment if set
        // You can set NEXT_PUBLIC_POSTHOG_BACKEND_DOMAIN in production
        const productionBackendDomain = process.env.NEXT_PUBLIC_POSTHOG_BACKEND_DOMAIN
        if (productionBackendDomain) {
          domains.add(productionBackendDomain)
        }
        
        // Convert Set to Array
        return Array.from(domains)
      }

      const backendDomains = getBackendDomains()

      // Always use proxy to bypass ad blockers (works in both dev and production)
      // The Next.js rewrite (/posthog/* → https://us.i.posthog.com/*) makes requests appear as first-party
      // This prevents ERR_BLOCKED_BY_CLIENT errors from ad blockers
      // IMPORTANT: Restart dev server after adding rewrite to next.config.mjs for changes to take effect
      const apiHost = '/posthog'

      const posthogConfig = {
        api_host: apiHost,
        // PostHog recommended defaults for new projects (SPA pageviews via history API, autocapture, etc.)
        defaults: '2025-11-30',
        // Enable automatic pageview tracking (works with SPA via history_change when using defaults)
        capture_pageview: true,
        // Capture pageleave automatically
        capture_pageleave: true,
        // Autocapture: pageviews, clicks, form submissions, input changes (a, button, form, input, select, textarea, label)
        autocapture: true,
        // Enable tracing headers to send session ID on requests to backend
        ...(backendDomains.length > 0 && {
          __add_tracing_headers: backendDomains
        }),
        // Disable automatic retries to minimize error spam when blocked
        request_batching: false,
        _retry_queue: [],
        loaded: (posthog) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('[PostHog] Initialized with tracing headers for:', backendDomains)
            console.log('[PostHog] Using API host:', apiHost)
          }
        },
        _onCapture: (eventName, properties) => {
          if (process.env.NODE_ENV === 'development') return
        },
      }

      // Initialize PostHog with error handling
      try {
        // Wrap initialization in a way that catches network errors
        const initPromise = Promise.resolve(posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, posthogConfig))
        
        initPromise.catch((error) => {
          // Silently handle initialization errors (e.g., ad blockers)
          // Don't log anything to keep console clean
        })
        
        // Override PostHog's internal request methods to catch errors
        // This needs to happen after init but we'll set it up immediately
        setTimeout(() => {
          if (typeof window !== 'undefined' && window.posthog) {
            // Override capture method
            const originalCapture = window.posthog.capture
            if (originalCapture) {
              window.posthog.capture = function(...args) {
                try {
                  return originalCapture.apply(this, args)
                } catch (error) {
                  // Silently handle blocked requests
                  return
                }
              }
            }
            
            // Override the internal _send_request if accessible
            if (window.posthog._send_request) {
              const originalSendRequest = window.posthog._send_request
              window.posthog._send_request = function(...args) {
                try {
                  return originalSendRequest.apply(this, args)
                } catch (error) {
                  // Silently handle blocked requests
                  return Promise.resolve()
                }
              }
            }
          }
        }, 100)
        
      } catch (error) {
        // Silently handle synchronous initialization errors
        // Errors are already suppressed by global handlers
      }
    }
  }, [])

  useEffect(() => {
    // Track pageviews on route changes
    if (pathname && typeof window !== 'undefined') {
      // Wait a bit for PostHog to be ready
      const timer = setTimeout(() => {
        if (posthog.__loaded) {
          try {
            let url = window.origin + pathname
            if (searchParams && searchParams.toString()) {
              url = url + `?${searchParams.toString()}`
            }
            posthog.capture('$pageview', {
              $current_url: url,
            })
          } catch (error) {
            // Silently handle blocked requests (ERR_BLOCKED_BY_CLIENT)
            if (process.env.NODE_ENV === 'development') {
              console.debug('[PostHog] Pageview capture failed (may be blocked):', error)
            }
          }
        }
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [pathname, searchParams])

  return children
}
