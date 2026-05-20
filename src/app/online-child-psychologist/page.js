'use client';

import React, { useState, useEffect, useRef, useMemo } from "react";
import OnboardingModal from './OnboardingModal';
import { useRouter } from 'next/navigation';
import { publicApi } from '../../lib/backendApi';
import { normalizeImageUrl } from '@/utils/urlNormalizer';

const Guide = () => {
  const [showOnboarding, setShowOnboarding] = React.useState(false);
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selected, setSelected] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [doctorAvailability, setDoctorAvailability] = useState({}); // Store availability for each doctor
  const [loadingAvailability, setLoadingAvailability] = useState(new Set()); // Track which doctors are loading
  // Modal animation state
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [isClosingDoctorModal, setIsClosingDoctorModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();
  const loadedImagesCount = useRef(0);
  const totalImagesCount = useRef(0);
  /** One listing retry with sync=1 per psychologist when fast availability returns no slots (GCal-heavy profiles). */
  const emptyAvailabilityListRetryRef = useRef(new Set());

  // Helper functions for time slot filtering (same as therapist profile page)
  const parseTimeStringToMinutes = (timeStr) => {
    if (!timeStr) return null;
    const trimmed = timeStr.trim();
    
    // Handle 12-hour format (e.g., "2:30 PM", "10:00 AM")
    const pmMatch = trimmed.match(/(\d{1,2}):(\d{2})\s*(PM|pm)/i);
    const amMatch = trimmed.match(/(\d{1,2}):(\d{2})\s*(AM|am)/i);
    
    if (pmMatch) {
      let hours = parseInt(pmMatch[1], 10);
      const minutes = parseInt(pmMatch[2], 10);
      if (hours !== 12) hours += 12;
      return hours * 60 + minutes;
    }
    
    if (amMatch) {
      let hours = parseInt(amMatch[1], 10);
      const minutes = parseInt(amMatch[2], 10);
      if (hours === 12) hours = 0;
      return hours * 60 + minutes;
    }
    
    // Handle 24-hour format (e.g., "14:30", "10:00")
    const timeMatch = trimmed.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      return hours * 60 + minutes;
    }

    return null;
  };

  const getSlotMinutes = (slot) => {
    if (!slot) return null;
    if (typeof slot === 'string') {
      return parseTimeStringToMinutes(slot);
    }
    const possibleKeys = ['time', 'time_slot', 'startTime', 'start_time', 'displayTime'];
    for (const key of possibleKeys) {
      if (slot[key]) {
        const minutes = parseTimeStringToMinutes(slot[key]);
        if (minutes !== null) return minutes;
      }
    }
    return null;
  };

  const isSlotInPast = (slot, date) => {
    if (!slot || !date) return false;
    const now = new Date();
    const isSameDay =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();
    if (!isSameDay) return false;
    const slotMinutes = getSlotMinutes(slot);
    if (slotMinutes === null) return false;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return slotMinutes <= nowMinutes;
  };

  /** Local calendar YYYY-MM-DD (avoid UTC drift from toISOString()). */
  const formatLocalYmd = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Cache management functions
  const CACHE_KEY = 'psychologists_list_cache';
  const CACHE_VERSION_KEY = 'psychologists_cache_version';
  const CACHE_TTL = 30 * 60 * 1000; // 30 minutes in milliseconds (increased for egress reduction)

  const getCachedDoctors = () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      const cachedVersion = localStorage.getItem(CACHE_VERSION_KEY);
      const timestamp = localStorage.getItem(`${CACHE_KEY}_timestamp`);
      
      if (!cached || !timestamp) return null;
      
      const now = Date.now();
      const cacheAge = now - parseInt(timestamp, 10);
      
      // Check if cache is expired
      if (cacheAge > CACHE_TTL) {
        console.log('📦 Cache expired, clearing...');
        clearDoctorCache();
        return null;
      }
      
      const parsedCache = JSON.parse(cached);
      console.log('📦 Using cached doctors data (age:', Math.round(cacheAge / 1000), 'seconds)');
      return parsedCache;
    } catch (error) {
      console.error('Error reading cache:', error);
      clearDoctorCache();
      return null;
    }
  };

  const setCachedDoctors = (doctors, version = null) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(doctors));
      localStorage.setItem(`${CACHE_KEY}_timestamp`, Date.now().toString());
      if (version) {
        localStorage.setItem(CACHE_VERSION_KEY, version);
      }
      console.log('📦 Cached doctors data');
    } catch (error) {
      console.error('Error setting cache:', error);
    }
  };

  const clearDoctorCache = () => {
    try {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(`${CACHE_KEY}_timestamp`);
      localStorage.removeItem(CACHE_VERSION_KEY);
      console.log('📦 Cleared doctors cache');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  };

  // Check if cache version matches (for invalidation on updates)
  const checkCacheVersion = async () => {
    try {
      const cachedVersion = localStorage.getItem(CACHE_VERSION_KEY);
      
      // Fetch current cache version from API
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api'}/public/psychologists/cache-version`);
      if (!response.ok) {
        // If endpoint fails, assume cache is valid (fallback)
        return true;
      }
      
      const data = await response.json();
      const serverVersion = data?.data?.cache_version;
      
      if (!serverVersion) {
        return true; // No version from server, assume valid
      }
      
      // If we have a cached version, compare it
      if (cachedVersion) {
        const cachedVersionNum = parseInt(cachedVersion, 10);
        const serverVersionNum = parseInt(serverVersion, 10);
        
        // If server version is newer, cache is invalid
        if (serverVersionNum > cachedVersionNum) {
          console.log('📦 Cache version mismatch, invalidating cache');
          clearDoctorCache();
          return false;
        }
      }
      
      // Update cached version
      localStorage.setItem(CACHE_VERSION_KEY, serverVersion.toString());
      return true;
    } catch (error) {
      console.error('Error checking cache version:', error);
      // On error, assume cache is valid (fallback to prevent breaking)
      return true;
    }
  };

  // Fetch doctors from database with caching and retry logic
  const fetchDoctors = async (forceRefresh = false, retryCount = 0) => {
    const MAX_RETRIES = 2;
    const RETRY_DELAY = 2000; // 2 seconds between retries
    
    try {
      // OPTIMIZED: Check cache first (unless force refresh) - show cached data immediately
      if (!forceRefresh) {
        const cached = getCachedDoctors();
        if (cached && cached.length > 0) {
          // Use cached data immediately - don't wait for version check
          setDoctors(cached);
          setImagesLoaded(true); // Don't wait for images - show content immediately
          setLoading(false); // Stop loading screen immediately
          
          // Check cache version in background (non-blocking) - don't await
          checkCacheVersion().then(versionValid => {
            if (!versionValid) {
              // Version mismatch, fetch fresh data in background
              fetchDoctorsInBackground();
            } else {
              // Still fetch in background to update cache
              fetchDoctorsInBackground();
            }
          }).catch(() => {
            // On error, still fetch in background to update cache
            fetchDoctorsInBackground();
          });
          return; // Exit early - page is already showing cached data
        }
      } else {
        clearDoctorCache();
      }

      // OPTIMIZED: Removed console.log statements for production performance
      if (process.env.NODE_ENV === 'development' && retryCount > 0) {
        console.log('Fetching doctors...', `(Retry ${retryCount}/${MAX_RETRIES})`);
      }
      setLoading(true);
      setError(null);
      
      // OPTIMIZED: Reduced timeout for faster error feedback (8s for initial, retries can be longer)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), retryCount > 0 ? 15000 : 8000)
      );
      
      const fetchPromise = publicApi.getPsychologists();
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      
      const psychologists = response?.data?.psychologists || [];
      
      const assessmentEmail = (process.env.NEXT_PUBLIC_FREE_ASSESSMENT_PSYCHOLOGIST_EMAIL || 'assessment.koott@gmail.com').toLowerCase();
      const filteredPsychologists = psychologists.filter(psych => (psych.email || '').toLowerCase() !== assessmentEmail);
      
      // OPTIMIZED: Removed debug console.log for production performance
      
      // Get cache version from response if available
      const cacheVersion = response?.data?.cache_version || Date.now();
      
      // Cache the filtered doctors with version
      setCachedDoctors(filteredPsychologists, cacheVersion);
      setDoctors(filteredPsychologists);
      // Don't wait for images - show content immediately after doctors are loaded
      setImagesLoaded(true); // Set to true immediately so page shows without waiting for images
      setError(null); // Clear any previous errors
      setLoading(false); // Critical: clear loading on first-visit success (was missing, caused stuck loader)
    } catch (err) {
      console.error('Error fetching doctors:', err);
      
      // Determine error type for better messaging
      const isNetworkError = err.message?.includes('Failed to fetch') || 
                            err.message?.includes('NetworkError') ||
                            err.message?.includes('timeout') ||
                            err.name === 'TypeError';
      const isTimeout = err.message?.includes('timeout') || err.message?.includes('Request timeout');
      
      // On error, try to use cache as fallback first
      const cached = getCachedDoctors();
      if (cached) {
        console.log('📦 Using cached data as fallback due to fetch error');
        setDoctors(cached);
        setImagesLoaded(true);
        setError(null);
        setLoading(false);
        // Try to fetch fresh data in background
        setTimeout(() => fetchDoctorsInBackground(), 1000);
      } else if (retryCount < MAX_RETRIES) {
        // Retry with exponential backoff
        console.log(`🔄 Retrying fetch (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
        // Clear error and show loading during retry
        setError(null);
        setLoading(true);
        // Retry after delay - don't await, let it run in background
        setTimeout(() => {
          fetchDoctors(false, retryCount + 1);
        }, RETRY_DELAY * (retryCount + 1));
        // Keep loading state - don't clear it here
        return; // Exit early, retry will handle loading state
      } else {
        // All retries exhausted, show user-friendly error
        let errorMessage = 'Unable to load therapists at the moment.';
        
        if (isTimeout) {
          errorMessage = 'The request is taking longer than expected. Please check your internet connection and try again.';
        } else if (isNetworkError) {
          errorMessage = 'Connection issue detected. Please check your internet connection and try again.';
        }
        
        setError(errorMessage);
        setDoctors([]);
        setLoading(false);
      }
    } finally {
      // Only clear loading if we're not retrying (retries handle their own loading state)
      if (retryCount >= MAX_RETRIES) {
        setLoading(false);
      }
    }
  };

  // Background fetch to update cache without blocking UI
  const fetchDoctorsInBackground = async () => {
    try {
      const response = await publicApi.getPsychologists();
      const psychologists = response?.data?.psychologists || [];
      const assessmentEmail = (process.env.NEXT_PUBLIC_FREE_ASSESSMENT_PSYCHOLOGIST_EMAIL || 'assessment.koott@gmail.com').toLowerCase();
      const filteredPsychologists = psychologists.filter(psych => (psych.email || '').toLowerCase() !== assessmentEmail);
      
      // Get cache version from response if available
      const cacheVersion = response?.data?.cache_version || Date.now();
      
      // Update cache with fresh data and version
      setCachedDoctors(filteredPsychologists, cacheVersion);
      
      // Update state if doctors list changed
      setDoctors(prevDoctors => {
        const prevIds = new Set(prevDoctors.map(d => d.id));
        const newIds = new Set(filteredPsychologists.map(d => d.id));
        const idsChanged = prevIds.size !== newIds.size || 
          [...prevIds].some(id => !newIds.has(id));
        
        if (idsChanged) {
          console.log('📦 Background fetch: Doctors list changed, updating UI');
          return filteredPsychologists;
        }
        return prevDoctors;
      });
    } catch (error) {
      console.error('Background fetch error (non-critical):', error);
    }
  };

  // No frontend caching - availability can change anytime (bookings, blocks, calendar events)
  // Backend handles caching for performance, but we always fetch fresh data

  // Fetch availability for a doctor (no caching - always fresh data)
  // withSync: if true, syncs Google Calendar for accurate real-time data (slower but accurate)
  //           if false, uses backend cache (faster but backend handles caching)
  const fetchDoctorAvailability = async (doctorId, withSync = false) => {
    try {
      // No frontend caching - availability can change anytime (bookings, blocks, etc.)
      // Backend still has its own cache for performance, but we always fetch fresh from backend

      // Mark as loading
      setLoadingAvailability(prev => new Set(prev).add(doctorId));

      const today = new Date();
      const startDate = formatLocalYmd(today);
      const endCap = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      endCap.setDate(endCap.getDate() + 42); // ~6 weeks — closer to profile “full month” than 12 days
      const endDateStr = formatLocalYmd(endCap);

      // Listing used 5s race: slow cache + GCal sync=?sync=1 often exceeded it → empty “next availability”.
      const timeoutMs = withSync ? 50000 : 18000;
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeoutMs)
      );

      // Hybrid approach: sync=false for fast initial load, sync=true for on-demand accuracy
      const fetchPromise = publicApi.getPsychologistAvailabilityRange(doctorId, startDate, endDateStr, withSync);
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (response.success && response.data && response.data.data) {
        // Collect slots across multiple days until we have 2 slots (max 2 lines)
        // Store slots with their dates so we can display them correctly
        const availabilityArray = response.data.data;
        const collectedSlots = []; // Array of {date, time} objects
        let firstDateWithSlots = null;
        
        // Loop through dates until we have 2 slots
        for (const day of availabilityArray) {
          // Parse the date string to a Date object
          const [year, month, dayNum] = day.date.split('-');
          const dayDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(dayNum));
          
          // Filter available slots and exclude past time slots if it's today
          const availableSlots = day.timeSlots?.filter(slot => {
            if (!slot.available) return false;
            // If the date is today, filter out past time slots
            return !isSlotInPast(slot, dayDate);
          }) || [];

          // Sort available slots by time so display is chronological
          const sortedAvailableSlots = [...availableSlots].sort((a, b) => {
            const aMinutes = getSlotMinutes(a);
            const bMinutes = getSlotMinutes(b);
            if (aMinutes === null && bMinutes === null) return 0;
            if (aMinutes === null) return 1;
            if (bMinutes === null) return -1;
            return aMinutes - bMinutes;
          });
          
          if (sortedAvailableSlots.length > 0) {
            // Track the first date that has slots
            if (!firstDateWithSlots) {
              firstDateWithSlots = day.date;
            }
            
            // Calculate how many slots we still need
            const slotsNeeded = 2 - collectedSlots.length;
            const slotsToAdd = sortedAvailableSlots
              .slice(0, slotsNeeded) // Only take what we need
              .map(slot => ({
                date: day.date,
                time: slot.displayTime || slot.time
              }));
            
            collectedSlots.push(...slotsToAdd);
            
            // Stop if we have 2 slots (keeps display to max 2 lines)
            if (collectedSlots.length >= 2) {
              break;
            }
          }
        }

        if (collectedSlots.length > 0 && firstDateWithSlots) {
          const result = {
            nextDate: firstDateWithSlots,
            timeSlots: collectedSlots.slice(0, 2), // Ensure max 2 slots (max 2 lines)
            slotsByDate: collectedSlots // Keep date info for each slot
          };
          // No caching - availability can change anytime (bookings, blocks, calendar events)
          
          return result;
        }
      }
      
      // No slots found - return empty result object (not null) to indicate fetch completed
      return { timeSlots: [], nextDate: null };
    } catch (err) {
      // Silently fail - don't log timeout errors
      if (err.message !== 'Timeout') {
        console.error(`Error fetching availability for doctor ${doctorId}:`, err);
      }
      return { timeSlots: [], nextDate: null };
    }
  };

  /**
   * Listing cards: fast path first (no GCal sync). If no slots, one retry with sync so psychologists
   * whose blocks depend on Google Calendar still show next availability (same pattern as profile page).
   */
  const fetchDoctorAvailabilityForListing = async (doctorId) => {
    let result = await fetchDoctorAvailability(doctorId, false);
    result = result || { timeSlots: [], nextDate: null };
    if (
      !result.timeSlots?.length &&
      !emptyAvailabilityListRetryRef.current.has(doctorId)
    ) {
      emptyAvailabilityListRetryRef.current.add(doctorId);
      const synced = await fetchDoctorAvailability(doctorId, true);
      if (synced?.timeSlots?.length) {
        result = synced;
      }
    }
    return result;
  };

  // Fetch availability for all doctors (optimized - parallel fetching with Promise.allSettled)
  const fetchAllDoctorsAvailability = async (doctorsList) => {
    if (doctorsList.length === 0) return;
    
    // Fetch all doctors in parallel (not batches) - backend caching handles load
    // Use Promise.allSettled to handle failures gracefully
    const availabilityPromises = doctorsList.map(async (doctor) => {
      try {
        const availability = await fetchDoctorAvailabilityForListing(doctor.id);
        return { doctorId: doctor.id, availability, success: true };
      } catch (error) {
        console.error(`Failed to fetch availability for doctor ${doctor.id}:`, error);
        return { doctorId: doctor.id, availability: null, success: false };
      }
    });

    // Wait for all requests to complete (parallel)
    const results = await Promise.allSettled(availabilityPromises);
    
    // Update state with all results at once (better performance)
    // Also remove loading state for all doctors that completed
    setDoctorAvailability(prev => {
      const updated = { ...prev };
      const updatedLoading = new Set(loadingAvailability);
      
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          const { doctorId, availability } = result.value;
          // Always update availability (even if empty) and remove loading state
          updated[doctorId] = availability || { timeSlots: [], nextDate: null };
          updatedLoading.delete(doctorId);
        }
      });
      
      setLoadingAvailability(updatedLoading);
      return updated;
    });
  };

  // Handle scroll restoration on page load/refresh
  useEffect(() => {
    // Disable browser's automatic scroll restoration
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    
    // Save scroll position before page unload
    const handleBeforeUnload = () => {
      sessionStorage.setItem('psychologistsPageScroll', window.scrollY.toString());
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'auto';
      }
    };
  }, []);

  // Restore scroll position after content is loaded
  useEffect(() => {
    // Only restore scroll if doctors are loaded and images are loaded (or timed out)
    if (doctors.length > 0 && imagesLoaded && !loading) {
      const savedScroll = sessionStorage.getItem('psychologistsPageScroll');
      if (savedScroll) {
        // Use requestAnimationFrame to ensure DOM is fully rendered
        requestAnimationFrame(() => {
          setTimeout(() => {
            const scrollY = parseInt(savedScroll, 10);
            window.scrollTo(0, scrollY);
            // Clear saved scroll after restoring
            sessionStorage.removeItem('psychologistsPageScroll');
          }, 100);
        });
      }
    }
  }, [doctors.length, imagesLoaded, loading]);

  // Fetch doctors on component mount
  useEffect(() => {
    fetchDoctors();
  }, []);

  // Periodic cache version check (every 10 minutes) to detect updates (non-blocking) - REDUCED FREQUENCY FOR EGRESS REDUCTION
  useEffect(() => {
    // Only check if page is visible (not in background tab)
    const checkCache = async () => {
      if (document.hidden) return; // Skip if tab is hidden
      const cached = getCachedDoctors();
      if (cached && doctors.length > 0) {
        // Check version in background - don't block UI
        checkCacheVersion().then(versionValid => {
        if (!versionValid) {
            // Cache was invalidated, fetch fresh data in background
            console.log('📦 Cache invalidated, fetching fresh data in background...');
            fetchDoctorsInBackground();
        }
        }).catch(err => {
          console.error('Error checking cache version:', err);
        });
      }
    };
    
    const interval = setInterval(checkCache, 10 * 60 * 1000); // Check every 10 minutes (reduced from 2)
    
    // Check on visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkCache();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctors.length]);

  // Image loading tracking (non-blocking - images load in background)
  useEffect(() => {
    if (doctors.length > 0) {
      // Count total images (doctors with image URLs)
      const totalImages = doctors.filter(doc => {
        const imageSrc = doc.cover_image_url;
        // Also count fallback images
        if (!imageSrc) {
          const name = (doc.name || doc.first_name || '').toLowerCase();
          if (name.includes('irene') || name.includes('marium') || 
              name.includes('doug') || name.includes('douglas') || 
              name.includes('ashley') || name.includes('ash') || 
              name.includes('sarah') || name.includes('child') || 
              name.includes('teen') || name.includes('liana')) {
            return true;
          }
        }
        return !!imageSrc;
      }).length;
      
      totalImagesCount.current = totalImages;
      loadedImagesCount.current = 0;
      
      // Images load in background - don't block page rendering
      // Content is shown immediately, images will load progressively
      console.log(`Tracking ${totalImages} images to load in background`);
        
        // Check for already-loaded images (from browser cache) after a short delay
        setTimeout(() => {
          const images = document.querySelectorAll('.guide-video-card img.doctor-card-image');
          let alreadyLoadedCount = 0;
          images.forEach((img) => {
            if (img.complete && img.naturalHeight !== 0) {
              alreadyLoadedCount++;
              handleImageLoad();
            }
          });
          if (alreadyLoadedCount > 0) {
            console.log(`Found ${alreadyLoadedCount} images already loaded from cache`);
          }
        }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctors.length]);

  // Prefetch a few psychologists by API order + observe ALL cards by DOM order.
  // IMPORTANT: DOM order is [all child specialists…][all better parenting…], while `doctors` is flat API order.
  // Old logic skipped observing the first 4 DOM nodes but only prefetched `doctors.slice(0,4)` — psychologists
  // who appeared in the first 4 *cards* but not in the first 4 *API rows* never got a fetch (stuck on "No availability").
  useEffect(() => {
    if (doctors.length === 0) return;

    const fetchedIds = new Set();

    const runListingAvailabilityFetch = (doctorId) => {
      if (!doctorId || fetchedIds.has(doctorId)) return;
      fetchedIds.add(doctorId);

      setLoadingAvailability((prev) => new Set(prev).add(doctorId));

      fetchDoctorAvailabilityForListing(doctorId)
        .then((availability) => {
          setDoctorAvailability((prev) => ({
            ...prev,
            [doctorId]: availability || { timeSlots: [], nextDate: null },
          }));
        })
        .catch(() => {})
        .finally(() => {
          setLoadingAvailability((prev) => {
            const next = new Set(prev);
            next.delete(doctorId);
            return next;
          });
        });
    };

    // Warm-cache typical above-the-fold rows (API order — cheap parallel start)
    doctors.slice(0, 4).forEach((d) => runListingAvailabilityFetch(d.id));

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      doctors.forEach((d) => runListingAvailabilityFetch(d.id));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const doctorId = entry.target.getAttribute('data-doctor-id');
          if (doctorId) {
            runListingAvailabilityFetch(doctorId);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        root: null,
        rootMargin: '200px',
        threshold: 0.1,
      }
    );

    requestAnimationFrame(() => {
      setTimeout(() => {
        document.querySelectorAll('[data-doctor-id]').forEach((card) => {
          observer.observe(card);
        });
      }, 100);
    });

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctors.length]);

  // Open modal when a doctor is selected
  useEffect(() => {
    if (selected !== null && selected !== undefined) {
      setIsClosingDoctorModal(false);
      setShowDoctorModal(true);
    }
  }, [selected]);

  const closeDoctorModal = () => {
    setIsClosingDoctorModal(true);
    // Wait for exit animation before unmounting
    setTimeout(() => {
      setShowDoctorModal(false);
      setSelected(null);
    }, 220);
  };

  // Prevent background scroll when modal is open
  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      if (showDateTimePicker || showPaymentModal) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
      return () => { document.body.style.overflow = ''; };
    }
  }, [showDateTimePicker, showPaymentModal]);

  const handleBookSession = (doctor) => {
    setSelectedDoctor(doctor);
    setShowDateTimePicker(true);
  };

  // Track image loading - called by each image's onLoad/onError handler
  const handleImageLoad = () => {
    loadedImagesCount.current += 1;
    // Check if all images have loaded
    if (loadedImagesCount.current >= totalImagesCount.current) {
      console.log(`All ${totalImagesCount.current} images loaded`);
      setImagesLoaded(true);
    }
  };

  // Sync availability for a specific doctor (called on hover/interaction for accuracy)
  const syncDoctorAvailability = async (doctorId) => {
    if (loadingAvailability.has(doctorId)) {
      return;
    }
    const cached = doctorAvailability[doctorId];
    // Empty object { timeSlots: [] } is truthy — must not block; those need a sync=true refresh.
    if (cached?.timeSlots?.length > 0) {
      return;
    }
    if (cached?.syncAttempted) {
      return;
    }

    try {
      const availability = await fetchDoctorAvailability(doctorId, true);
      setDoctorAvailability((prev) => ({
        ...prev,
        [doctorId]: {
          ...(availability || { timeSlots: [], nextDate: null }),
          syncAttempted: true,
        },
      }));
    } catch (error) {
      console.error(`Background sync failed for doctor ${doctorId}:`, error);
    }
  };

  const handleDoctorClick = (doctor, index) => {
    // Sync availability when user clicks (accurate data for booking)
    syncDoctorAvailability(doctor.id);
    // Open modal with selected doctor for all screen sizes
    setSelected(index);
  };

  const childSpecialistDoctors = useMemo(
    () => doctors.filter((d) => d?.specialist_category !== 'better_parent'),
    [doctors]
  );
  const betterParentingDoctors = useMemo(
    () => doctors.filter((d) => d?.specialist_category === 'better_parent'),
    [doctors]
  );

  const psychologistSections = useMemo(
    () => [
      { key: 'child_specialist', title: 'Child specialist', list: childSpecialistDoctors },
      { key: 'better_parenting', title: 'Better parenting', list: betterParentingDoctors },
    ],
    [childSpecialistDoctors, betterParentingDoctors]
  );

  const handleDateTimeConfirm = () => {
    if (selectedDate && selectedTime) {
      setShowDateTimePicker(false);
      setShowPaymentModal(true);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setSelectedDate('');
    setSelectedTime('');
    setSelectedDoctor(null);
    // Redirect to chat session or show success message
    router.push('/chat-therapy');
  };

  const handlePaymentCancel = () => {
    setShowPaymentModal(false);
    setShowDateTimePicker(true);
  };

  // No full-screen loader on first visit: show page shell + skeleton cards so mobile feels faster.
  // When doctors load we fill in; cached visit shows content at once.

  // Skeleton card for first-load perceived performance (mobile)
  const SkeletonCard = () => (
    <div className="guide-video-card" style={{ opacity: 0.85 }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '60%', background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
      <div style={{ position: 'absolute', bottom: 80, left: 16, right: 16, height: 20, borderRadius: 4, background: '#e5e7eb' }} />
      <div style={{ position: 'absolute', bottom: 50, left: 16, right: 40, height: 14, borderRadius: 4, background: '#e5e7eb' }} />
      <div style={{ position: 'absolute', bottom: 12, left: 16, right: 16, height: 36, borderRadius: 8, background: '#e5e7eb' }} />
    </div>
  );

  return (
    <div style={{ width: "100vw", minHeight: "100vh", background: "#f8fafc", overflowX: "hidden", position: "relative" }}>
      <style>{`
        @media (max-width: 768px) {
          .company-name-guide {
            display: none !important;
          }
        }
      `}</style>
      
      {/* Company name at left, aligned with navbar */}
      <div
        className="company-name-guide"
        style={{
          position: "absolute",
          top: "2.5rem",
          left: "5vw",
          zIndex: 2,
          fontWeight: 900,
          fontSize: "2.2rem",
          color: "#27ae60",
          letterSpacing: "0.05em",
          userSelect: "none",
          textShadow: "0 2px 12px rgba(39,174,96,0.08)",
          cursor: "pointer"
        }}
        onClick={() => router.push('/')}
        title="Go to homepage"
      >
        
      </div>
      
      <div style={{ position: "relative", zIndex: 3 }}></div>
      
      <section className="psychologists-hero-section" style={{ width: "100vw", minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", paddingTop: "8rem", paddingBottom: "4rem" }}>
        <h2 className="psychologists-main-heading text-center max-w-[900px] mb-4 md:mb-9 text-[#1a1a1a] font-semibold mt-4 text-xl md:text-2xl lg:text-3xl px-4">
          Child Psychologists Helping Children Grow Emotionally and Confidently
        </h2>
        <p className="psychologists-description text-sm md:text-base lg:text-lg text-center max-w-[600px] font-medium px-4 mb-6 md:mb-9" style={{ color: "#444" }}>
          Our child psychologists provide gentle, evidence-based child and parenting counselling to feel understood, emotionally safe, and supported through every stage of growth.
        </p>
        
        
        <style>{`
          .find-therapist-btn {
            position: relative;
            overflow: hidden;
            padding: 0.85rem 2.2rem;
            border-radius: 15px;
            border: none;
            background: #27ae60;
            color: #fff;
            font-weight: 700;
            font-size: 1.1rem;
            cursor: pointer;
            box-shadow: 0 6px 24px rgba(0,0,0,0.18), 0 2px 12px rgba(0,0,0,0.12);
            transition: all 0.4s cubic-bezier(.4,2,.6,1);
            z-index: 1;
          }
          .find-therapist-btn:hover {
            background: #fff;
            color: #27ae60;
            border: 2px solid #27ae60;
            transform: translateY(-2px);
            box-shadow: 0 8px 32px rgba(39,174,96,0.25), 0 4px 16px rgba(0,0,0,0.15);
          }
          .find-therapist-btn span {
            position: relative;
            z-index: 1;
          }
          /* Mobile-only: line break in heading before word you */
          .psychologists-heading-mobile-br { display: none; }
          @media (max-width: 767px) {
            .psychologists-heading-mobile-br { display: block; }
          }
          /* Mobile-specific styles for psychologists page */
          @media (max-width: 767px) {
            .psychologists-hero-section {
              padding-top: 5.5rem !important; /* Reduced from 8rem to 5.5rem - moderate reduction */
            }
            .psychologists-main-heading {
              margin-top: 0.75rem !important; /* Reduced from mt-4 (1rem) to 0.75rem */
              line-height: 1.30 !important; /* Readable line height when heading wraps on mobile */
            }
            .psychologists-description {
              line-height: 1.3 !important; /* Reduced line height for mobile */
            }
          }
        `}</style>
        

        
        <OnboardingModal 
          open={showOnboarding} 
          onClose={() => setShowOnboarding(false)} 
          onComplete={() => { setShowOnboarding(false); router.push('/online-child-psychologist'); }} 
        />
        
        {/* Guide video cards grid - Responsive grid layout */}
        <div className="guide-cards-container">
          <style>{`
            .guide-cards-container {
              width: 100%;
              max-width: 1400px;
              margin-top: 3.2rem;
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); /* Flexible columns - increased min width */
              gap: 12px clamp(8px, 0.9vw, 12px); /* row gap, responsive column gap - further reduced */
              padding: 0 clamp(1rem, 2vw, 2rem) !important; /* responsive side padding - reduced */
              justify-items: center;
            }
            .doctor-card-wrapper {
              cursor: pointer;
              will-change: transform;
              transition: transform 0.25s cubic-bezier(.4,2,.6,1), box-shadow 0.2s;
              z-index: 1;
            }
            .doctor-card-wrapper:hover {
              transform: scale(1.04) translateY(-12px);
              z-index: 10;
            }
            .guide-video-card {
              width: 100%;
              min-width: 300px; /* Increased minimum width for cards */
              max-width: 100%; /* Allow cards to grow with grid - remains flexible */
              height: 360px;
              border-radius: 10px 10px 0 0; /* Rounded only on top to connect seamlessly with availability container */
              overflow: hidden;
              box-shadow: none !important;
              background: #fff;
              border: none;
              position: relative;
              margin: 0 !important; /* ensure no extra row spacing */
            }
            
            /* Mac M1 13-inch / 14-15 inch laptop view (1366px - 1440px) - flexible cards with minimal gaps */
            @media (min-width: 1366px) and (max-width: 1440px) {
              .guide-cards-container {
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); /* Flexible - increased min width */
                gap: 12px clamp(8px, 0.8vw, 12px) !important; /* row gap, responsive column gap - further reduced */
                max-width: 100%;
                padding: 0 clamp(1rem, 1.5vw, 1.5rem) !important; /* Reduced padding */
              }
              .guide-video-card {
                min-width: 300px; /* Increased minimum width */
                max-width: 100%; /* Flexible width - scales with screen */
                width: 100%;
                height: 360px;
              }
              .doctor-card-wrapper:hover {
                transform: scale(1.04) translateY(-12px);
              }
            }
            
            /* Landscape tablet (1180 x 810) - 3 cards per row to prevent overflow */
            @media (min-width: 1100px) and (max-width: 1365px) and (max-height: 900px) {
              .guide-cards-container {
                grid-template-columns: repeat(3, 1fr);
                gap: 12px clamp(16px, 2vw, 24px) !important; /* row gap, responsive column gap */
                max-width: 1300px;
                padding: 0 clamp(1.25rem, 2vw, 2.5rem) !important; /* responsive padding */
              }
              .guide-video-card {
                min-width: 270px; /* Minimum width for cards */
                max-width: 100%; /* Flexible width - scales with screen */
                width: 100%;
                height: 360px;
              }
              .doctor-card-wrapper:hover {
                transform: scale(1.03) translateY(-10px);
              }
            }
            
            /* Small laptop view (1025px - 1280px) - flexible cards with minimal gaps */
            @media (min-width: 1025px) and (max-width: 1280px) and (min-height: 901px) {
              .guide-cards-container {
                grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); /* Flexible - increased min width */
                gap: 12px clamp(8px, 0.9vw, 12px) !important; /* row gap, responsive column gap - further reduced */
                max-width: 100%;
                padding: 0 clamp(0.75rem, 1.5vw, 1.5rem) !important; /* Reduced padding */
              }
              .guide-video-card {
                min-width: 290px; /* Increased minimum width */
                max-width: 100%; /* Flexible width - scales with screen */
                width: 100%;
                height: 360px;
              }
              .doctor-card-wrapper:hover {
                transform: scale(1.04) translateY(-12px);
              }
            }
            
            /* Medium laptop view (1281px - 1440px) - flexible cards with minimal gaps */
            @media (min-width: 1281px) and (max-width: 1440px) and (min-height: 901px) {
              .guide-cards-container {
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); /* Flexible - increased min width */
                gap: 12px clamp(8px, 0.8vw, 12px) !important; /* row gap, responsive column gap - further reduced */
                max-width: 100%;
                padding: 0 clamp(1rem, 1.5vw, 1.5rem) !important; /* Reduced padding */
              }
              .guide-video-card {
                min-width: 300px; /* Increased minimum width */
                max-width: 100%; /* Flexible width - scales with screen */
                width: 100%;
                height: 360px;
              }
              .doctor-card-wrapper:hover {
                transform: scale(1.04) translateY(-12px);
              }
            }
            
            /* Mac M1 14-inch / Medium-large laptop (1441px - 1600px) - flexible cards */
            @media (min-width: 1441px) and (max-width: 1600px) {
              .guide-cards-container {
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); /* Flexible - increased min width */
                gap: 12px clamp(10px, 1vw, 14px) !important; /* row gap, responsive column gap - reduced */
                row-gap: 12px !important;
                max-width: 100%;
                padding: 0 clamp(1.5rem, 2vw, 2rem) !important;
              }
              .guide-video-card {
                min-width: 300px; /* Increased minimum width */
                max-width: 100%; /* Flexible width - scales with screen */
                width: 100%;
                height: 360px;
              }
              .doctor-card-wrapper:hover {
                transform: scale(1.04) translateY(-12px);
              }
            }
            
            /* Large laptop/desktop view (1601px+) - flexible cards */
            @media (min-width: 1601px) {
              .guide-cards-container {
                grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); /* Flexible - increased min width */
                gap: 14px clamp(12px, 1.2vw, 18px) !important; /* row gap, responsive column gap - reduced */
                row-gap: 14px !important;
                max-width: 100%;
                padding: 0 clamp(2rem, 3vw, 3.5rem) !important;
              }
              .guide-video-card {
                min-width: 320px; /* Increased minimum width for cards */
                max-width: 100%; /* Flexible width - scales with screen */
                width: 100%;
                height: 380px;
              }
              .doctor-card-wrapper:hover {
                transform: scale(1.04) translateY(-12px);
              }
            }
            
            /* Large tablet/small laptop view - 2 cards per row */
            @media (max-width: 1024px) and (min-width: 769px) {
              .guide-cards-container {
                grid-template-columns: repeat(2, 1fr);
                gap: 12px 20px !important; /* row gap, column gap - reduced spacing */
                padding: 0 3rem !important; /* more side padding */
              }
              .guide-video-card {
                min-width: 270px; /* Minimum width for cards */
                max-width: 100%; /* Flexible width - scales with screen */
                width: 100%;
                height: 350px;
              }
              .doctor-card-wrapper:hover {
                transform: scale(1.03) translateY(-10px);
              }
            }
            
            /* Medium tablet view - 2 cards per row with smaller cards */
            @media (max-width: 900px) and (min-width: 769px) {
              .guide-cards-container {
                grid-template-columns: repeat(2, 1fr);
                gap: 12px 16px !important; /* row gap, column gap - reduced spacing */
                padding: 0 2.5rem !important; /* more side padding */
              }
              .guide-video-card {
                min-width: 250px; /* Minimum width for cards */
                max-width: 100%; /* Flexible width - scales with screen */
                width: 100%;
                height: 330px;
              }
              .doctor-card-wrapper:hover {
                transform: scale(1.02) translateY(-8px);
              }
            }
            
            /* Mobile view - 1 card per row */
            @media (max-width: 768px) {
              .guide-cards-container {
                grid-template-columns: 1fr;
                gap: 20px !important; /* increased gap between cards */
                padding: 0 clamp(1.5rem, 4vw, 2rem) !important; /* increased side padding to reduce card width */
                max-width: 92% !important; /* Constrain container width to make cards narrower */
                width: 92% !important;
                margin-left: auto;
                margin-right: auto;
                justify-items: stretch !important; /* Make cards stretch to container width */
              }
              .guide-video-card {
                max-width: calc(100% - 0px) !important;
                min-width: 0 !important; /* Remove min-width constraint */
                width: 100% !important;
                height: 460px;
              }
              .doctor-card-wrapper:hover {
                transform: none !important; /* Remove hover effect on mobile */
              }
              /* Increase doctor name size on mobile */
              .guide-video-card .doctor-card-name {
                font-size: 1.25rem !important;
              }
            }
            
            /* Small mobile view - 1 card per row with smaller cards */
            @media (max-width: 480px) {
              .guide-cards-container {
                gap: 20px !important; /* increased gap between cards */
                padding: 0 clamp(1.25rem, 3.5vw, 1.75rem) !important; /* increased side padding to reduce card width */
                max-width: 94% !important; /* Constrain container width to make cards narrower */
                width: 94% !important;
                justify-items: stretch !important; /* Make cards stretch to container width */
              }
              .guide-video-card {
                max-width: 100% !important;
                min-width: 0 !important; /* Remove min-width constraint */
                width: 100% !important;
                height: 440px;
              }
              .doctor-card-wrapper:hover {
                transform: none !important; /* Remove hover effect on mobile */
              }
            }
            
            /* Availability div width matching - responsive (flexible to match card width) */
            .availability-container {
              max-width: 100%;
              width: 100%;
            }
            
            @media (min-width: 1441px) {
              .availability-container {
                max-width: 100%;
                width: 100%;
              }
            }
            
            /* 14-15 inch laptop view - match flexible card width */
            @media (min-width: 1366px) and (max-width: 1440px) {
              .availability-container {
                max-width: 100%;
                width: 100%;
              }
            }
            
            /* Landscape tablet (1180 x 810) - match flexible card width */
            @media (min-width: 1100px) and (max-width: 1365px) and (max-height: 900px) {
              .availability-container {
                max-width: 100%;
                width: 100%;
              }
            }
            
            /* Medium laptop - match flexible card width */
            @media (min-width: 1025px) and (max-width: 1440px) and (min-height: 901px) {
              .availability-container {
                max-width: 100%;
                width: 100%;
              }
            }
            
            @media (max-width: 1024px) and (min-width: 769px) {
              .availability-container {
                max-width: 100%;
                width: 100%;
              }
            }
            
            @media (max-width: 900px) and (min-width: 769px) {
              .availability-container {
                max-width: 100%;
                width: 100%;
              }
            }
            
            @media (max-width: 768px) {
              .availability-container {
                max-width: 100%;
              }
            }
          `}</style>
          
          {loading && doctors.length === 0 ? (
            <>
              <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={`skeleton-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                  <SkeletonCard />
                  <div style={{ height: 60, background: '#f8fafc', borderRadius: '0 0 10px 10px', border: '1px solid #e2e8f0', borderTop: 'none' }} />
                </div>
              ))}
            </>
          ) : error ? (
            <div style={{
              width: "100%",
              gridColumn: "1 / -1",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "1rem",
              padding: "2rem",
              textAlign: "center"
            }}>
              <div style={{
                color: "#e74c3c",
                fontSize: "1.1rem",
                fontWeight: 500,
                marginBottom: "0.5rem"
              }}>
                {error}
              </div>
              <button
                onClick={() => {
                  setError(null);
                  fetchDoctors(true);
                }}
                style={{
                  padding: "0.75rem 1.5rem",
                  fontSize: "1rem",
                  fontWeight: 500,
                  color: "#fff",
                  backgroundColor: "#025545",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "background-color 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#012f23";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#025545";
                }}
              >
                Try Again
              </button>
            </div>
          ) : doctors.length === 0 ? (
            <div style={{
              width: "100%",
              gridColumn: "1 / -1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 200,
              color: "#666",
              fontSize: "1.2rem",
              textAlign: "center"
            }}>
              No doctors available at the moment.
            </div>
          ) : (
            <>
            {psychologistSections.map((section) =>
              section.list.length === 0 ? null : (
                <React.Fragment key={section.key}>
                  <div
                    className="psychologists-subheading"
                    style={{
                      gridColumn: '1 / -1',
                      width: '100%',
                      fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
                      fontWeight: 600,
                      color: '#025545',
                      marginTop: section.key === 'child_specialist' ? '0.25rem' : '2.25rem',
                      marginBottom: '0.75rem',
                      paddingLeft: 'clamp(1rem, 2vw, 2rem)',
                      paddingRight: 'clamp(1rem, 2vw, 2rem)',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {section.title}
                  </div>
                  {section.list.map((doc) => {
              const idx = doctors.indexOf(doc);
              return (
                <div 
                  key={doc.id || doc.name || idx} 
                  className="doctor-card-wrapper" 
                  data-doctor-id={doc.id}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
                  onClick={() => handleDoctorClick(doc, idx)}
                  onMouseEnter={() => syncDoctorAvailability(doc.id)} // Sync on hover for accurate data
                >
                <div
                  className="guide-video-card"
                >
                  {/* Doctor Profile Picture or Cover Image */}
                  <div style={{ 
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    minHeight: "100%"
                  }}>
                  {(() => {
                    // Use cover_image_url from database
                    let imageSrc = doc.cover_image_url;
                    
                    // Normalize the image URL (converts Supabase URLs to proxy URLs)
                    if (imageSrc) {
                      imageSrc = normalizeImageUrl(imageSrc);
                    }
                    
                    // If no database image, use fallback based on name
                    if (!imageSrc) {
                      const name = (doc.name || doc.first_name || '').toLowerCase();
                      if (name.includes('irene') || name.includes('marium')) {
                        imageSrc = '/irene.jpeg';
                      } else if (name.includes('doug') || name.includes('douglas')) {
                        imageSrc = '/doug.png';
                      } else if (name.includes('ashley') || name.includes('ash') || name.includes('sarah')) {
                        imageSrc = '/logo.png';
                      } else if (name.includes('child') || name.includes('teen') || name.includes('liana')) {
                        imageSrc = '/kids.png';
                      }
                    }
                    
                    // OPTIMIZED: Removed console.log for production performance
                    if (process.env.NODE_ENV === 'development') {
                      console.log(`Doctor ${doc.name || doc.first_name}: imageSrc = ${imageSrc}`);
                    }
                    
                    if (imageSrc) {
                      // Preload first 3 images (above the fold) for faster initial render
                      const isAboveFold = idx < 3;
                      return (
                        <img
                          key={`img-${doc.id || idx}`}
                          src={imageSrc}
                          alt={`${doc.name || doc.first_name} - Child psychologist profile photo`}
                          className="doctor-card-image"
                          width={400}
                          height={500}
                          loading={isAboveFold ? "eager" : "lazy"}
                          fetchPriority={isAboveFold ? "high" : "auto"}
                          decoding="async"
                          style={{ 
                            width: "100%", 
                            height: "100%", 
                            minHeight: "100%",
                            objectFit: "cover",
                            aspectRatio: "4/5",
                            position: "relative",
                            zIndex: 2
                          }}
                          onError={(e) => {
                            // OPTIMIZED: Removed console.log for production performance
                            // Fallback to initials if image fails to load
                            e.target.style.display = 'none';
                            if (e.target.nextSibling) {
                              e.target.nextSibling.style.display = 'flex';
                            }
                            // Mark as loaded even on error so we don't block the page
                            handleImageLoad();
                          }}
                          onLoad={(e) => {
                            // OPTIMIZED: Removed console.log for production performance
                            handleImageLoad();
                          }}
                        />
                      );
                    }
                    return null;
                  })()}
                  </div>
                  
                  {/* Gradient Overlay - Black fade from bottom to top */}
                  <div style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "45%",
                  background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0.2) 75%, rgba(0,0,0,0) 100%)",
                  height: '55%',
                    pointerEvents: "none",
                    zIndex: 2
                  }} />
                  
                  {/* Fallback: Doctor Initials Avatar */}
                  <div 
                    style={{
                      display: (() => {
                        // Check if we have any image (database or fallback)
                        const name = (doc.name || doc.first_name || '').toLowerCase();
                        if (doc.cover_image_url) return 'none';
                        if (name.includes('irene') || name.includes('marium') || 
                            name.includes('doug') || name.includes('douglas') || 
                            name.includes('ashley') || name.includes('ash') || 
                            name.includes('child') || name.includes('teen') ||
                            name.includes('sarah') || name.includes('liana')) return 'none';
                        return 'flex';
                      })(),
                      width: "100%",
                      height: "100%",
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "4rem",
                      fontWeight: "bold",
                      color: "#fff",
                      textShadow: "0 2px 8px rgba(0,0,0,0.3)"
                    }}
                  >
                    {doc.name ? 
                      doc.name.split(' ').map(n => n.charAt(0)).join('').toUpperCase() :
                      doc.first_name ? 
                        doc.first_name.charAt(0).toUpperCase() : 
                        'D'
                    }
                  </div>
                  {/* Doctor name and expertise bubbles */}
                  <div style={{
                    position: "absolute",
                    left: 18,
                    bottom: 10,
                    zIndex: 3,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 0,
                    width: "80%"
                  }}>
                    <div className="doctor-card-name" style={{ color: '#fff', fontWeight: 700, fontSize: '1.05rem', textShadow: '0 2px 8px rgba(0,0,0,0.25)', paddingLeft: 10, paddingBottom: 0, marginBottom: 0 }}>{doc.name || 'Dr. ' + (doc.first_name || 'Unknown')}</div>
                    {/* Expertise bubbles - Personality chips only */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 1 }}>
                      {/* Personality chips (replaces specialization) */}
                      {(() => {
                        const rawTraits = doc.personality_traits || doc.personalityTraits || doc.personalities || null;
                        let traits = [];
                        if (Array.isArray(rawTraits)) {
                          traits = rawTraits;
                        } else if (typeof rawTraits === 'string' && rawTraits.trim().length > 0) {
                          traits = rawTraits.split(/[,|/]/).map(t => t.trim()).filter(Boolean);
                        }
                        return traits.slice(0, 1).map((trait, i) => (
                          <span key={`p_${i}`} style={{ background: 'rgba(255,255,255,0.16)', color: '#fff', borderRadius: 16, padding: '0.05em 0.5em', fontWeight: 400, fontSize: '0.85rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', backdropFilter: 'blur(0.5px)', WebkitBackdropFilter: 'blur(0.5px)', border: '1.2px solid rgba(255,255,255,0.18)' }}>{trait}</span>
                        ));
                      })()}
                      {/* Price chip (matches specialization chip style) */}
                      <span style={{ background: 'rgba(255,255,255,0.22)', color: '#fff', borderRadius: 16, padding: '0.05em 0.5em', fontWeight: 400, fontSize: '0.9rem', boxShadow: '0 2px 8px rgba(0,0,0,0.10)', backdropFilter: 'blur(0.5px)', WebkitBackdropFilter: 'blur(0.5px)', border: '1.5px solid rgba(255,255,255,0.18)' }}>{doc.price ? `₹${doc.price}` : (doc.individual_session_price ? `₹${doc.individual_session_price}` : '₹—')}</span>
                      {/* Experience chip */}
                      <span style={{
                        background: 'rgba(255,255,255,0.22)',
                        color: '#fff',
                        borderRadius: 16,
                        padding: '0.05em 0.5em',
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
                      {/* Designation chip */}
                      {doc.designation || doc.specialization ? (
                      <span style={{
                        background: 'rgba(255,255,255,0.22)',
                        color: '#fff',
                        borderRadius: 16,
                        padding: '0.05em 0.5em',
                        fontWeight: 400,
                        fontSize: '0.9rem',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                        backdropFilter: 'blur(0.5px)',
                        WebkitBackdropFilter: 'blur(0.5px)',
                        border: '1.5px solid rgba(255,255,255,0.18)'
                      }}>
                          {doc.designation || doc.specialization}
                      </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                {/* Availability information - below card */}
                <div className="availability-container" style={{
                  marginTop: 0,
                  marginBottom: 20
                }}>
                  <div style={{
                    background: 'rgba(255,255,255,0.25)',
                    color: '#000000',
                    borderRadius: '0 0 12px 12px',
                    padding: '8px 12px 12px 12px',
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    boxShadow: '0 1px 4px rgba(63, 46, 115, 0.15)',
                    backdropFilter: 'blur(0.5px)',
                    WebkitBackdropFilter: 'blur(0.5px)',
                    border: '1px solid #ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    width: '100%',
                    lineHeight: '1.4', // Better line spacing
                    overflow: 'visible', // Allow button to be visible
                    minHeight: '7.5rem' // Reserve space so cards with 1–2 availability lines + button align
                  }}>
                    {(() => {
                      const isLoading = loadingAvailability.has(doc.id);
                      const availability = doctorAvailability[doc.id];
                      
                      // Show loading state first
                      if (isLoading) {
                        return 'Loading next availability...';
                      }
                      
                      // Show availability if it exists
                      if (availability && availability.timeSlots && availability.timeSlots.length > 0) {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        
                        // Group slots by date
                        // Handle both old format (strings) and new format (objects with date/time)
                        const slotsByDate = {};
                        availability.timeSlots.forEach(slot => {
                          let slotDate, slotTime;
                          
                          if (typeof slot === 'string') {
                            // Old format: just a time string, use nextDate
                            slotDate = availability.nextDate;
                            slotTime = slot;
                          } else if (slot && slot.date && slot.time) {
                            // New format: object with date and time
                            slotDate = slot.date;
                            slotTime = slot.time;
                          } else {
                            // Fallback
                            slotDate = availability.nextDate;
                            slotTime = slot.time || slot;
                          }
                          
                          if (!slotsByDate[slotDate]) {
                            slotsByDate[slotDate] = [];
                          }
                          slotsByDate[slotDate].push(slotTime);
                        });
                        
                        // Format and display slots grouped by date
                        const formattedSlots = Object.entries(slotsByDate).map(([dateStr, times]) => {
                          const [year, month, day] = dateStr.split('-');
                          const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                          const isToday = dateObj.getTime() === today.getTime();
                          const isTomorrow = dateObj.getTime() === today.getTime() + 86400000;
                          
                          let dateLabel;
                          if (isToday) {
                            dateLabel = 'Today';
                          } else if (isTomorrow) {
                            dateLabel = 'Tomorrow';
                          } else {
                            dateLabel = dateObj.toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: dateObj.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
                            });
                          }
                          
                          return { dateLabel, text: `${dateLabel}: ${times.join(' • ')}` };
                        });

                        return (
                          <>
                            Next available:
                            <br />
                            {formattedSlots.map((slot, index) => (
                              <React.Fragment key={index}>
                                {slot.text}
                                {index < formattedSlots.length - 1 ? <br /> : null}
                              </React.Fragment>
                            ))}
                          </>
                        );
                      }
                      
                      // Only show "No availability" if not loading and no slots found
                      return 'No availability';
                    })()}
                    {/* Book Now Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const name = doc.name || `${doc.first_name || ''} ${doc.last_name || ''}`.trim();
                        const slug = name
                          .toLowerCase()
                          .trim()
                          .replace(/[^a-z0-9]+/g, '-')
                          .replace(/^-+|-+$/g, '');
                        if (slug) {
                          router.push(`/online-child-psychologist/${slug}`);
                        }
                      }}
                      style={{
                        marginTop: '12px',
                        width: '100%',
                        padding: '8px 16px',
                        backgroundColor: '#025545',
                        color: '#ffffff',
                        border: '2px solid #025545',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 4px rgba(63, 46, 115, 0.2)'
                      }}
                      onMouseEnter={(e) => {
                        if (typeof window !== 'undefined' && window.innerWidth > 767) {
                          e.target.style.backgroundColor = '#189e4f';
                          e.target.style.borderColor = '#189e4f';
                          e.target.style.transform = 'translateY(-1px)';
                          e.target.style.boxShadow = '0 4px 8px rgba(107, 82, 153, 0.3)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (typeof window !== 'undefined' && window.innerWidth > 767) {
                          e.target.style.backgroundColor = '#025545';
                          e.target.style.borderColor = '#025545';
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = '0 2px 4px rgba(63, 46, 115, 0.2)';
                        }
                      }}
                    >
                      Book Now
                    </button>
                  </div>
                </div>
                </div>
              );
            })}
                </React.Fragment>
            ))}
            </>
          )}
        </div>

        {/* Modal Popup for Doctor Details - Hidden on mobile */}
        {showDoctorModal && (
          <div className={`doctor-modal-overlay ${isClosingDoctorModal ? 'closing' : ''}`} style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.32)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.2s"
          }}
            onClick={closeDoctorModal}
          >
            <style>{`
              .doctor-modal-overlay { opacity: 0; animation: overlayFadeIn 200ms ease forwards; }
              .doctor-modal-overlay.closing { animation: overlayFadeOut 200ms ease forwards; }
              @keyframes overlayFadeIn { from { opacity: 0; } to { opacity: 1; } }
              @keyframes overlayFadeOut { from { opacity: 1; } to { opacity: 0; } }
              @media (max-width: 768px) {
                .doctor-modal-overlay {
                  display: flex !important;
                  padding: 0 !important; /* remove outer padding including bottom */
                  align-items: flex-end; /* stick modal to bottom */
                  overflow-y: auto;
                  height: 100dvh !important; /* ensure full dynamic viewport height on mobile */
                }
              }
            `}</style>
            <div className={`doctor-modal ${isClosingDoctorModal ? 'closing' : ''}`} onClick={e => e.stopPropagation()}>
              <style>{`
                .doctor-modal {
                  width: clamp(560px, 70vw, 900px);
                  max-width: 900px;
                  height: clamp(500px, 70vh, 680px);
                  max-height: 680px;
                  background: #fff;
                  border-radius: 10px;
                  background-clip: padding-box; /* ensure rounded corners render cleanly */
                  box-shadow: 0 12px 48px rgba(39,174,96,0.18), 0 4px 16px rgba(0,0,0,0.12);
                  display: grid;
                  grid-template-columns: 45% 55%;
                  grid-template-rows: 1fr auto;
                  gap: 2px;
                  overflow: hidden;
                  position: relative;
                  opacity: 0;
                  transform: translateY(8px) scale(0.98);
                  animation: modalIn 220ms ease forwards;
                }
                /* Responsive desktop: scale modal down gently as width shrinks */
                @media (max-width: 1200px) and (min-width: 769px) {
                  .doctor-modal {
                    width: clamp(520px, 80vw, 860px); /* allow container to shrink with viewport */
                    max-width: 860px;
                    height: clamp(480px, 68vh, 650px);
                    max-height: 650px;
                    transform: translateY(0) scale(0.98);
                  }
                  .doctor-modal-image img,
                  .doctor-modal-img {
                    object-fit: contain !important; /* avoid aggressive crop/zoom */
                  }
                }
                .doctor-modal.closing { animation: modalOut 200ms ease forwards; }
                @keyframes modalIn { 
                  from { opacity: 0; transform: translateY(8px) scale(0.98); }
                  to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes modalOut { 
                  from { opacity: 1; transform: translateY(0) scale(1); }
                  to { opacity: 0; transform: translateY(8px) scale(0.98); }
                }
                
                .doctor-modal-image {
                  flex: 1;
                  display: flex;
                  align-items: flex-start;
                  justify-content: flex-start;
                  overflow: hidden; /* clip image to container radius */
                  /* Top | Right | Bottom | Left. Further increased bottom padding */
                  padding: 12px clamp(6px, 1.2vw, 12px) clamp(24px, 5vw, 64px) 12px;
                  border-radius: 10px;
                  border-top-left-radius: 10px;
                  border-bottom-left-radius: 10px;
                  background-clip: padding-box;
                }
                .doctor-modal-image img,
                .doctor-modal-img {
                  border-radius: 10px !important; /* round all image corners to avoid sharp top-right */
                  border-top-left-radius: 10px !important;
                  border-top-right-radius: 10px !important;
                  border-bottom-left-radius: 10px !important;
                  border-bottom-right-radius: 10px !important;
                  object-fit: contain !important;
                }
                /* Ensure right panel honors top-right rounding */
                .doctor-modal-content {
                  border-top-right-radius: 10px;
                  background: #fff;
                }
                
                /* Ensure laptop view keeps image contained to avoid zoom/crop */
                @media (min-width: 1024px) {
                  .doctor-modal-image img,
                  .doctor-modal-img {
                    object-fit: contain !important;
                    object-position: left top !important; /* anchor image to top to avoid extra top whitespace */
                    border-radius: 10px !important;
                    /* Increase visual height slightly to eliminate bottom gap while keeping width */
                    height: calc(100% + 28px) !important;
                    width: auto !important;
                    max-width: none !important;
                  }
                  /* Reduce only bottom padding to remove white gap, keep top padding same */
                  .doctor-modal-image {
                    padding: 12px clamp(6px, 1.2vw, 12px) clamp(16px, 2.2vw, 28px) 12px !important;
                  }
                }
                .doctor-modal-content {
                  flex: 1;
                  padding: clamp(24px, 3.5vw, 40px) clamp(28px, 4vw, 48px) clamp(24px, 3.5vw, 40px) 12px; /* responsive top/right/bottom */
                  display: flex;
                  flex-direction: column;
                  justify-content: flex-start;
                  gap: 16px;
                  position: relative;
                  overflow-y: auto;
                  max-height: 100%;
                  /* Ensure right side respects rounded corners */
                  border-top-right-radius: 10px;
                  border-bottom-right-radius: 10px;
                  /* By default hide overflow, tablet/mobile overrides will enable vertical scroll when needed */
                  overflow: hidden;
                  background-clip: padding-box;
                }
                .doctor-modal-title {
                  font-weight: 700;
                  margin-bottom: 0 !important;
                  font-size: 32px !important; /* Override global h3 */
                }
                .doctor-modal-buttons {
                  display: flex;
                  flex-direction: row;
                  gap: 16px;
                  justify-content: center;
                  align-items: center;
                  margin-top: 16px;
                  flex-wrap: wrap;
                }
                .doctor-modal-button {
                  padding: 12px 24px;
                  font-size: 15px;
                  font-weight: 600;
                  border-radius: 12px;
                  cursor: pointer;
                  transition: all 0.2s;
                  min-width: 140px;
                }
                
                /* Laptop specific button adjustments */
                @media (min-width: 1024px) and (max-width: 1440px) {
                  .doctor-modal-buttons {
                    gap: 14px;
                    margin-top: 14px;
                  }
                  .doctor-modal-button {
                    padding: 11px 22px;
                    font-size: 14px;
                    min-width: 130px;
                  }
                }
                
                @media (min-width: 1441px) {
                  .doctor-modal-buttons {
                    gap: 16px;
                    margin-top: 32px;
                  }
                  .doctor-modal-button {
                    padding: 12px 24px;
                    font-size: 15px;
                    min-width: 140px;
                  }
                }
                
                /* Tablet specific styles (portrait & general tablet) */
                @media (min-width: 768px) and (max-width: 1180px) and (max-height: 1180px) {
                  .doctor-modal-title {
                    font-size: 28px !important; /* Tablet size */
                  }
                  .doctor-modal {
                    /* Make the modal a bit wider on tablet so it uses more horizontal space */
                    width: 92vw;
                    max-width: 860px;
                    /* Make the popup clearly shorter on tablet and let inner columns scroll */
                    height: 60vh;
                    max-height: 580px;
                  }
                  .doctor-modal-image {
                    /* Tighten bottom padding so gap under the image is much smaller */
                    padding: 12px clamp(6px, 1.4vw, 12px) 12px 12px;
                  }
                  .doctor-modal-image img,
                  .doctor-modal-img {
                    /* Ensure the image fills the left column height on tablet */
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover !important;
                    object-position: center top !important;
                  }
                  .doctor-modal-content {
                    padding: 24px 32px 24px 12px;
                    /* Right side scrolls within the same fixed modal height, similar to mobile behavior */
                    overflow-y: auto;
                    max-height: 100%;
                    overflow-x: hidden;
                    position: relative;
                  }
                  /* Blur effects removed */
                  .doctor-modal-content::after {
                    display: none !important;
                  }
                  .doctor-modal-buttons-container {
                    position: relative;
                    flex-wrap: nowrap !important; /* Keep all buttons on one line */
                    gap: 6px !important; /* Reduced gap */
                    padding: 10px 12px !important; /* Reduced padding */
                  }
                  .doctor-modal-buttons-container::before {
                    display: none !important; /* Remove blur effect */
                  }
                  .doctor-modal-buttons {
                    gap: 8px;
                    margin-top: 12px;
                  }
                  .doctor-modal-button {
                    padding: 8px 12px !important; /* Reduced padding */
                    font-size: 13px !important; /* Reduced font size */
                    min-width: auto !important; /* Remove min-width constraint */
                    white-space: nowrap !important; /* Prevent text wrapping */
                    flex-shrink: 0 !important; /* Prevent buttons from shrinking */
                  }
                  /* Reduce Book Now button size on tablet */
                  .find-guide-button {
                    padding: 8px 32px !important; /* Reduced from 16px 120px */
                    font-size: 13px !important; /* Reduced from 16px */
                    white-space: nowrap !important; /* Prevent text wrapping */
                    height: auto !important;
                    flex: 0 0 auto !important; /* Don't grow or shrink */
                  }
                  /* Keep prev/next buttons compact */
                  .doctor-modal-button:not(.find-guide-button) {
                    padding: 8px 10px !important;
                    font-size: 12px !important;
                    white-space: nowrap !important;
                  }
                }
                /* Wider tablet landscape (~1180 x 810): reduce image column width */
                @media (min-width: 1024px) and (max-width: 1180px) and (max-height: 900px) {
                  .doctor-modal {
                    grid-template-columns: 40% 60% !important;
                  }
                }
                
                /* Ensure grid layout for desktop */
                @media (min-width: 769px) {
                  .doctor-modal {
                    display: grid !important;
                    grid-template-columns: 45% 55% !important;
                    column-gap: 12px; /* add visible gap between image and text */
                  }
                  /* Make the image column span both rows so it fills full height and avoids white gap below */
                  .doctor-modal-image {
                    grid-row: 1 / span 2;
                  }
                  /* Blur effect removed - no longer needed */
                }
                
                @media (max-width: 768px) {
                  .doctor-modal {
                    position: fixed;
                    left: 0;
                    right: 0;
                    bottom: 0; /* stick to bottom */
                    width: 100vw;
                    max-width: 100vw;
                    height: 100dvh; /* use full viewport height */
                    max-height: 100dvh;
                    display: flex !important;
                    flex-direction: column !important;
                    grid-template-columns: none !important;
                    grid-template-rows: none !important;
                    border-radius: 10px 10px 0 0; /* bottom corners square to meet bottom edge */
                    box-shadow: none; /* remove outer shadow on mobile */
                    margin: 0 !important; /* remove outer margins */
                  }
                  .doctor-modal-image {
                    flex: 1.63 1 0; /* Take 62% of available space (1.63:1 ratio with content) */
                    width: 100%;
                    min-height: 0; /* Allow flexbox to control height */
                    /* Reduced padding - no bottom padding to eliminate gap */
                    padding: 12px 12px 0 12px;
                    overflow: hidden;
                    transform: none !important;
                    zoom: 1 !important;
                    margin-bottom: 0 !important;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                  }
                  .doctor-modal-image img,
                  .doctor-modal-img {
                    width: 100% !important;
                    height: 100% !important;
                    max-width: 100% !important;
                    max-height: 100% !important;
                    object-fit: cover !important;
                    object-position: center center !important;
                    transform: none !important;
                    zoom: 1 !important;
                    scale: 1 !important;
                    -webkit-transform: none !important;
                    -moz-transform: none !important;
                    margin-bottom: 0 !important;
                    padding-bottom: 0 !important;
                  }
                  .doctor-modal-content {
                    flex: 1 1 0; /* Take 40% of available space (1:1.5 ratio with image) */
                    padding: 16px 20px 24px 20px;
                    gap: 12px;
                    overflow-y: auto;
                    min-height: 0; /* Allow flexbox to control height */
                    margin-top: 0 !important;
                    -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
                  }
                  .doctor-modal-title {
                    font-size: 24px !important;
                  }
                  .doctor-modal-buttons-container {
                    gridColumn: none !important;
                    order: 3;
                    width: 100%;
                    padding: 16px 20px;
                    border-top: 1px solid rgba(0, 0, 0, 0.1);
                    margin-top: 0;
                    flex-shrink: 0; /* Don't shrink buttons container */
                    position: relative;
                    background: #fff;
                  }
                  /* Blur effect removed */
                  .doctor-modal-buttons-container::before {
                    display: none !important; /* Remove blur effect */
                  }
                  .doctor-modal-image {
                    order: 1;
                    margin-bottom: 0 !important;
                    padding-bottom: 0 !important;
                  }
                  .doctor-modal-content {
                    order: 2;
                    margin-top: 0 !important;
                    padding-top: 16px !important;
                  }
                  .doctor-modal-buttons {
                    flex-direction: row;
                    gap: 8px;
                    margin-top: 0;
                    width: 100%;
                    flex-wrap: nowrap;
                  }
                  .doctor-modal-button {
                    padding: 12px 16px;
                    font-size: 14px;
                    flex: 1;
                    min-width: 0;
                  }
                  .doctor-modal-button:first-child,
                  .doctor-modal-button:last-child {
                    flex: 0 1 auto;
                    padding: 10px 14px;
                    font-size: 18px;
                    min-width: 48px;
                    width: 48px;
                    height: 48px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                  }
                  .doctor-modal-button:first-child .button-text,
                  .doctor-modal-button:last-child .button-text {
                    display: none;
                  }
                  .doctor-modal-button:first-child .button-arrow-mobile,
                  .doctor-modal-button:last-child .button-arrow-mobile {
                    display: block;
                  }
                  .button-arrow-desktop {
                    display: none !important;
                  }
                  .doctor-modal-button:nth-child(2),
                  .find-guide-button {
                    flex: 1 1 auto;
                    padding: 14px 20px !important; /* increased mobile padding */
                    font-size: 14px;
                    min-width: 0;
                  }
                  /* Keep laptop view padding as is */
                  @media (min-width: 769px) {
                    .doctor-modal-button:nth-child(2),
                    .find-guide-button {
                      padding: 16px 120px !important; /* increased desktop padding */
                    }
                  }
                }
                /* Desktop/Laptop arrow and text behavior */
                @media (min-width: 769px) {
                  .doctor-modal-button .button-arrow-mobile {
                    display: none !important;
                  }
                  .doctor-modal-button .button-text {
                    display: inline;
                  }
                  .doctor-modal-button:first-child .button-arrow-desktop {
                    display: inline !important;
                    margin-right: 4px;
                  }
                  .doctor-modal-button:last-child .button-arrow-desktop {
                    display: inline !important;
                    margin-right: 0;
                    margin-left: 4px;
                  }
                  .doctor-modal-button:first-child,
                  .doctor-modal-button:last-child {
                    padding: 6px 0;
                    font-size: 14px;
                    min-width: auto;
                    width: auto;
                    height: auto;
                    display: inline-block;
                  }
                  /* Increase separation between side buttons and center CTA on laptop */
                  .find-guide-button {
                    margin: 0 86px !important;
                  }
                }
              `}</style>
              {/* Close X Button */}
              <button
                style={{
                  position: "absolute",
                  top: 20,
                  right: 20,
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.9)",
                  border: "2px solid #e1e5e9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  transition: "all 0.2s",
                  zIndex: 20
                }}
                onClick={closeDoctorModal}
                onMouseEnter={(e) => {
                  e.target.style.background = "rgba(255,255,255,1)";
                  e.target.style.borderColor = "#ff6b6b";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "rgba(255,255,255,0.9)";
                  e.target.style.borderColor = "#e1e5e9";
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
              
              {/* Left: Doctor Profile Picture or Cover Image */}
              <div className="doctor-modal-image" onClick={e => e.stopPropagation()}>
                {doctors[selected]?.cover_image_url ? (
                  <img
                    src={normalizeImageUrl(doctors[selected].cover_image_url)}
                    alt={`${doctors[selected]?.name || doctors[selected]?.first_name} - Child psychologist profile photo`}
                    className="doctor-modal-img"
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", borderRadius: "10px", transform: "none" }}
                    onError={(e) => {
                      // Fallback to initials if image fails to load
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                
                {/* Fallback: Doctor Initials Avatar */}
                <div 
                  style={{
                    display: doctors[selected]?.cover_image_url ? 'none' : 'flex',
                    width: "100%",
                    height: "100%",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 หว100%)",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "8rem",
                    fontWeight: "bold",
                    color: "#fff",
                    textShadow: "0 4px 16px rgba(0,0,0,0.5)",
                    borderRadius: "10px"
                  }}
                >
                  {doctors[selected]?.name ? 
                    doctors[selected].name.split(' ').map(n => n.charAt(0)).join('').toUpperCase() :
                    doctors[selected]?.first_name ? 
                      doctors[selected].first_name.charAt(0).toUpperCase() : 
                      'D'
                  }
                </div>
              </div>
              
              {/* Right: Details - Only name, years of experience, price, and description */}
              <div 
                className="doctor-modal-content" 
                onClick={e => e.stopPropagation()}
                style={{ maxHeight: '60vh', overflowY: 'auto' }}
              >
                <h3 className="doctor-modal-title" style={{ lineHeight: 1.1, fontWeight: 400, margin: 0, color: '#111', marginBottom: 0, paddingBottom: 0 }}>
                  {doctors[selected]?.name || 'Dr. ' + (doctors[selected]?.first_name || 'Unknown')}
                </h3>
                {/* Doctor Info Card with Light Background */}
                <div style={{
                  background: 'rgba(63, 46, 115, 0.08)',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  marginTop: '0px',
                  marginBottom: '4px'
                }}>
                  <p style={{ margin: '0 0 8px 0', color: '#025545', fontWeight: 600, fontSize: '16px' }}>
                    Consultant Psychologist
                  </p>
                  {doctors[selected]?.experience_years && (
                  <p style={{ margin: '0 0 8px 0', color: '#4b5563', fontSize: '14px' }}>
                      {doctors[selected].experience_years} {doctors[selected].experience_years === 1 ? 'year' : 'years'} of experience
                  </p>
                  )}
                  <p style={{ margin: 0, color: '#4b5563', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>Starting from</span>
                    <span style={{ color: "#025545", fontWeight: 600 }}>
                      {doctors[selected]?.price ? `₹${doctors[selected].price}` : (doctors[selected]?.individual_session_price ? `₹${doctors[selected].individual_session_price}` : '₹—')}
                    </span>
                  </p>
                  </div>

                {/* Specialization */}
                {(() => {
                  const expertiseArray = doctors[selected]?.area_of_expertise && Array.isArray(doctors[selected].area_of_expertise) && doctors[selected].area_of_expertise.length > 0 
                    ? doctors[selected].area_of_expertise 
                    : [];

                  return expertiseArray.length > 0 ? (
                    <div style={{ marginBottom: 8, marginTop: 8 }}>
                      <h6 style={{ marginBottom: 8, marginTop: 0, fontWeight: 600 }}>Specialization</h6>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {expertiseArray.map((spec, i) => (
                          <span key={i} style={{ 
                            background: '#f0f0f0', 
                            color: '#333', 
                            padding: '4px 12px', 
                            borderRadius: '16px', 
                            fontSize: '14px',
                            fontWeight: 400
                          }}>
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
                
                {/* Description */}
                <p style={{ marginBottom: 8, marginTop: 0, lineHeight: '1.2', whiteSpace: 'pre-line' }}>
                  {(doctors[selected]?.description || doctors[selected]?.short_description || '').trim()
                    || 'No description provided.'}
                </p>
                
              </div>
              
              {/* Bottom Actions - Below both components */}
              <div className="doctor-modal-buttons-container" style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, padding: '16px 24px' }}>
                <button
                  className="doctor-modal-button"
                  style={{ background: 'transparent', border: 'none', color: '#025545', fontWeight: 600, fontSize: '14px', padding: '6px 0', cursor: 'pointer' }}
                  onClick={() => {
                    const prevIndex = selected === 0 ? doctors.length - 1 : selected - 1;
                    setSelected(prevIndex);
                  }}
                >
                  <span className="button-arrow-desktop">&lt;</span>
                  <span className="button-text">{(() => {
                    const prevDoctor = doctors[(selected === 0 ? doctors.length - 1 : selected - 1)];
                    if (!prevDoctor) return 'Prev';
                    const name = prevDoctor.name || '';
                    const firstName = prevDoctor.first_name || '';
                    const hasDr = name.toLowerCase().startsWith('dr.') || name.toLowerCase().startsWith('dr ');
                    const firstWord = name.split(' ').find(word => word.toLowerCase() !== 'dr.' && word.toLowerCase() !== 'dr' && word.trim() !== '') || firstName;
                    return `Meet ${hasDr ? 'Dr. ' : ''}${firstWord || 'Prev'}`;
                  })()}</span>
                  <span className="button-arrow-mobile">&lt;</span>
                </button>

                <button
                  className="doctor-modal-button find-guide-button"
                  style={{ background: '#025545', color: '#fff', border: 'none', borderRadius: 14, padding: '16px 120px', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
                  onClick={() => {
                    const doctor = doctors[selected];
                    if (doctor) {
                      const name = doctor.name || `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim();
                      if (name) {
                        const slug = name
                          .toLowerCase()
                          .trim()
                          .replace(/[^a-z0-9]+/g, '-')
                          .replace(/^-+|-+$/g, '');
                        router.push(`/online-child-psychologist/${slug}`);
                      }
                    }
                  }}
                >
                  Book Now
                </button>

                <button
                  className="doctor-modal-button"
                  style={{ background: 'transparent', border: 'none', color: '#025545', fontWeight: 600, fontSize: '14px', padding: '6px 0', cursor: 'pointer' }}
                  onClick={() => {
                    const nextIndex = selected === doctors.length - 1 ? 0 : selected + 1;
                    setSelected(nextIndex);
                  }}
                >
                  <span className="button-text">{(() => {
                    const nextDoctor = doctors[(selected === doctors.length - 1 ? 0 : selected + 1)];
                    if (!nextDoctor) return 'Next';
                    const name = nextDoctor.name || '';
                    const firstName = nextDoctor.first_name || '';
                    const hasDr = name.toLowerCase().startsWith('dr.') || name.toLowerCase().startsWith('dr ');
                    const firstWord = name.split(' ').find(word => word.toLowerCase() !== 'dr.' && word.toLowerCase() !== 'dr' && word.trim() !== '') || firstName;
                    return `Meet ${hasDr ? 'Dr. ' : ''}${firstWord || 'Next'}`;
                  })()}</span>
                  <span className="button-arrow-desktop">&gt;</span>
                  <span className="button-arrow-mobile">&gt;</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Date/Time Picker Modal */}
        {showDateTimePicker && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.5)",
            zIndex: 3000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(8px)"
          }}
            onClick={() => setShowDateTimePicker(false)}
          >
            <div className="datetime-modal">
              <style>{`
                .datetime-modal {
                  background: #fff;
                  border-radius: 20px;
                  padding: 30px;
                  max-width: 450px;
                  width: 90%;
                  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
                  text-align: center;
                }
                .datetime-modal-title {
                  font-weight: 700;
                  color: #1a1a1a;
                  margin-bottom: 20px;
                }
                .datetime-modal-buttons {
                  display: flex;
                  gap: 15px;
                  justify-content: center;
                }
                .datetime-modal-button {
                  padding: 12px 24px;
                  font-size: 16px;
                  font-weight: 600;
                  border-radius: 12px;
                  cursor: pointer;
                  transition: all 0.2s;
                }
                @media (max-width: 768px) {
                  .datetime-modal {
                    padding: 20px;
                    max-width: 95%;
                    max-height: 90vh;
                    overflow-y: auto;
                  }
                  .datetime-modal-buttons {
                    flex-direction: column;
                  }
                  .datetime-modal-button {
                    padding: 14px 20px;
                    font-size: 16px;
                    width: 100%;
                  }
                }
              `}</style>
              <p className="datetime-modal-title">
                Book Session with {selectedDoctor?.name}
              </p>
              
              {/* Calendar Header */}
              <div style={{ textAlign: "center", marginBottom: "15px" }}>
                <p style={{ fontWeight: 700, color: "#333", marginBottom: "3px" }}>Select Date & Time</p>
                <p style={{ fontSize: "12px", color: "#666" }}>Choose a date and time that works for you</p>
              </div>
              
              {/* Calendar Grid */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "repeat(7, 1fr)", 
                  gap: "2px", 
                  marginBottom: "12px" 
                }}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                    <div key={`header-${index}`} style={{ 
                      textAlign: "center", 
                      fontSize: "10px", 
                      fontWeight: 600, 
                      color: "#666", 
                      padding: "4px 2px" 
                    }}>
                      {day}
                    </div>
                  ))}
                  {Array.from({ length: 35 }, (_, i) => {
                    const day = i + 1;
                    const isAvailable = day >= 15 && day <= 25;
                    const isSelected = selectedDate && new Date(selectedDate).getDate() === day;
                    return (
                      <div
                        key={`day-${day}`}
                        onClick={() => {
                          if (isAvailable) {
                            const today = new Date();
                            const selectedDay = new Date(today.getFullYear(), today.getMonth(), day);
                            setSelectedDate(selectedDay.toISOString().split('T')[0]);
                          }
                        }}
                        style={{
                          textAlign: "center",
                          padding: "4px 2px",
                          borderRadius: "4px",
                          cursor: isAvailable ? "pointer" : "default",
                          transition: "all 0.2s",
                          fontSize: "11px",
                          fontWeight: 500,
                          backgroundColor: isSelected ? "#27ae60" : "transparent",
                          color: isSelected ? "#fff" : isAvailable ? "#333" : "#ccc",
                          border: isSelected ? "none" : "1px solid transparent"
                        }}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Time Slots */}
              <div style={{ marginBottom: "20px" }}>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "#333", marginBottom: "8px", textAlign: "left" }}>
                  Available Times
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "6px" }}>
                  {['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'].map((time) => {
                    const timeValue = time === '9:00 AM' ? '09:00' : 
                                    time === '10:00 AM' ? '10:00' : 
                                    time === '11:00 AM' ? '11:00' : 
                                    time === '12:00 PM' ? '12:00' : 
                                    time === '2:00 PM' ? '14:00' : 
                                    time === '3:00 PM' ? '15:00' : 
                                    time === '4:00 PM' ? '16:00' : '17:00';
                    const isSelected = selectedTime === timeValue;
                    return (
                      <div
                        key={time}
                        onClick={() => setSelectedTime(timeValue)}
                        style={{
                          padding: "8px 6px",
                          borderRadius: "6px",
                          border: `2px solid ${isSelected ? "#27ae60" : "#e1e5e9"}`,
                          cursor: "pointer",
                          transition: "all 0.2s",
                          fontSize: "12px",
                          fontWeight: 500,
                          backgroundColor: isSelected ? "#f0f9f0" : "transparent",
                          color: isSelected ? "#27ae60" : "#333",
                          textAlign: "center"
                        }}
                      >
                        {time}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="datetime-modal-buttons">
                <button
                  className="datetime-modal-button"
                  onClick={() => setShowDateTimePicker(false)}
                  style={{
                    border: "2px solid #e1e5e9",
                    background: "#fff",
                    color: "#666"
                  }}
                >
                  Cancel
                </button>
                <button
                  className="datetime-modal-button"
                  onClick={handleDateTimeConfirm}
                  disabled={!selectedDate || !selectedTime}
                  style={{
                    border: "none",
                    background: selectedDate && selectedTime ? "#27ae60" : "#ccc",
                    color: "#fff",
                    cursor: selectedDate && selectedTime ? "pointer" : "not-allowed"
                  }}
                >
                  Continue to Payment
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.5)",
            zIndex: 3000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(8px)"
          }}
            onClick={() => setShowPaymentModal(false)}
          >
            <div className="payment-modal">
              <style>{`
                .payment-modal {
                  background: #fff;
                  border-radius: 20px;
                  padding: 40px;
                  max-width: 500px;
                  width: 90%;
                  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
                  text-align: center;
                }
                .payment-modal-title {
                  font-weight: 700;
                  color: #1a1a1a;
                  margin-bottom: 20px;
                }
                .payment-modal-buttons {
                  display: flex;
                  gap: 15px;
                  justify-content: center;
                }
                .payment-modal-button {
                  padding: 12px 24px;
                  font-size: 16px;
                  font-weight: 600;
                  border-radius: 12px;
                  cursor: pointer;
                  transition: all 0.2s;
                }
                @media (max-width: 768px) {
                  .payment-modal {
                    padding: 20px;
                    max-width: 95%;
                    max-height: 90vh;
                    overflow-y: auto;
                  }
                  .payment-modal-buttons {
                    flex-direction: column;
                  }
                  .payment-modal-button {
                    padding: 14px 20px;
                    font-size: 16px;
                    width: 100%;
                  }
                }
              `}</style>
              <div onClick={e => e.stopPropagation()}>
              <p className="payment-modal-title">
                Complete Your Booking
              </p>
              
              <div style={{ 
                background: "#f8f9fa", 
                borderRadius: "12px", 
                padding: "20px", 
                marginBottom: "30px",
                textAlign: "left"
              }}>
                <p style={{ fontWeight: 600, color: "#333", marginBottom: "15px" }}>
                  Session Details:
                </p>
                <div style={{ fontSize: "16px", color: "#666", lineHeight: "1.6" }}>
                  <p><strong>Doctor:</strong> {selectedDoctor?.name}</p>
                  <p><strong>Date:</strong> {selectedDate}</p>
                  <p><strong>Time:</strong> {selectedTime}</p>
                  <p><strong>Duration:</strong> 30 minutes</p>
                  <p><strong>Price:</strong> ₹100</p>
                </div>
              </div>

              <div style={{ marginBottom: "30px" }}>
                <p style={{ fontWeight: 600, color: "#333", marginBottom: "15px" }}>
                  Payment Method:
                </p>
                <div style={{ 
                  border: "2px solid #e1e5e9", 
                  borderRadius: "12px", 
                  padding: "15px",
                  background: "#f8f9fa"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <input type="radio" id="card" name="payment" defaultChecked style={{ transform: "scale(1.2)" }} />
                    <label htmlFor="card" style={{ fontSize: "16px", color: "#333" }}>
                      Credit/Debit Card
                    </label>
                  </div>
                </div>
              </div>

              <div className="payment-modal-buttons">
                <button
                  className="payment-modal-button"
                  onClick={handlePaymentCancel}
                  style={{
                    border: "2px solid #e1e5e9",
                    background: "#fff",
                    color: "#666"
                  }}
                >
                  Back
                </button>
                <button
                  className="payment-modal-button"
                  onClick={handlePaymentSuccess}
                  style={{
                    border: "none",
                    background: "#27ae60",
                    color: "#fff"
                  }}
                >
                  Pay ₹100
                </button>
              </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default Guide;

