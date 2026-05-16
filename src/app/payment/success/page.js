'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { clientApi, paymentApi } from '../../../lib/backendApi';
import { useAuth } from '../../../contexts/AuthContext';
import {
  buildPaymentSuccessBookingSummary,
  formatDurationHuman,
  getSessionDurationMinutesFromPackageType
} from '../../../utils/bookingConfirmationLabels';

// Force dynamic rendering to bypass cache
export const dynamic = 'force-dynamic';

function packageMetaFromSession(s) {
  const pkg = s?.package;
  if (!pkg) return { packageName: null, packageType: null };
  return {
    packageName: pkg.name || null,
    packageType: pkg.package_type || null
  };
}

// Success Animation Component (Google Pay style)
function SuccessAnimationContent() {
  const confettiColors = ['#22c55e', '#3f2e73', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  // Optimize particles based on device capability
  const [particleCount, setParticleCount] = useState(20);
  const [isMobile, setIsMobile] = useState(false);
  const [isLowEnd, setIsLowEnd] = useState(false);
  
  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      const isMobileDevice = width <= 768;
      setIsMobile(isMobileDevice);
      
      // Detect low-end devices
      const hardwareConcurrency = navigator.hardwareConcurrency || 4;
      const deviceMemory = navigator.deviceMemory || 4;
      const connection = navigator.connection;
      const isLowEndDevice = 
        hardwareConcurrency <= 2 ||
        deviceMemory <= 2 ||
        (connection && (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g')) ||
        width <= 480;
      
      setIsLowEnd(isLowEndDevice);
      
      // Set particle count based on device capability
      if (isLowEndDevice) {
        setParticleCount(4); // Ultra-low-end devices
      } else if (isMobileDevice) {
        setParticleCount(6); // Regular mobile
      } else {
        setParticleCount(20); // Desktop
      }
    };
    
    if (typeof window !== 'undefined') {
      checkDevice();
      window.addEventListener('resize', checkDevice);
      return () => window.removeEventListener('resize', checkDevice);
    }
  }, []);
  
  const particles = Array.from({ length: particleCount }, (_, i) => i);

  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      {/* Checkmark Circle */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={
          isMobile
            ? { type: 'tween', duration: 0.4, ease: 'easeOut' }
            : { type: 'spring', stiffness: 200, damping: 15, duration: 0.6 }
        }
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: '#f0fdf4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 2,
          boxShadow: '0 4px 12px rgba(34, 197, 94, 0.2)',
          willChange: 'transform, opacity'
        }}
      >
        <motion.svg
          width="50"
          height="50"
          viewBox="0 0 52 52"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            pathLength: { delay: 0.2, duration: 0.5, ease: 'easeInOut' },
            opacity: { delay: 0.2, duration: 0.3 }
          }}
        >
          <motion.circle
            cx="26"
            cy="26"
            r="25"
            fill="none"
            stroke="#22c55e"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.1, duration: 0.4, ease: 'easeInOut' }}
          />
          <motion.path
            fill="none"
            stroke="#22c55e"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.1 27.2l7.1 7.2 16.7-16.8"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.5, duration: 0.3, ease: 'easeInOut' }}
          />
        </motion.svg>
      </motion.div>

      {/* Confetti Particles */}
      <AnimatePresence>
        {particles.map((particle) => {
          const angle = (360 / particles.length) * particle;
          const distance = 60 + Math.random() * 40;
          const x = Math.cos((angle * Math.PI) / 180) * distance;
          const y = Math.sin((angle * Math.PI) / 180) * distance;
          const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
          const delay = Math.random() * 0.3;
          const size = 6 + Math.random() * 4;

          return (
            <motion.div
              key={particle}
              initial={{ 
                x: 0, 
                y: 0, 
                scale: 0, 
                opacity: 1,
                ...(isLowEnd ? {} : { rotate: 0 }) // Remove rotate on low-end devices
              }}
              animate={{ 
                x: x, 
                y: y, 
                scale: [0, 1, 0.8, 0],
                opacity: [1, 1, 0.8, 0],
                ...(isLowEnd ? {} : { rotate: 360 }) // Remove rotate on low-end devices
              }}
              transition={{
                delay: isMobile ? delay * 0.5 : delay, // Reduce delay on mobile
                duration: isMobile ? 0.6 : 0.8, // Shorter duration on mobile
                ease: 'easeOut'
              }}
              style={{
                position: 'absolute',
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: color,
                borderRadius: '50%',
                zIndex: 1,
                boxShadow: isLowEnd ? 'none' : `0 0 ${size}px ${color}`, // Remove shadow on low-end
                willChange: 'transform, opacity'
              }}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// Sliding Animation (starts centered, moves to top)
function SlidingSuccessAnimation({ onComplete }) {
  const [isMoving, setIsMoving] = useState(false);
  const [showBackground, setShowBackground] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Ensure page stays at top during animation
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
    // After 1.2 seconds (checkmark animation completes), start moving to top
    const timer = setTimeout(() => {
      setIsMoving(true);
      // Fade out background immediately when moving starts
      setShowBackground(false);
      // After slide completes, notify parent
      setTimeout(() => {
        // Ensure scroll is at top when animation completes
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        onComplete();
      }, 600); // Duration of slide animation
    }, 1200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <>
      {/* White Background Overlay */}
      <AnimatePresence>
        {showBackground && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(255, 255, 255, 0.98)',
              // Remove backdrop-filter on mobile for better performance
              backdropFilter: !isMobile ? 'blur(4px)' : 'none',
              WebkitBackdropFilter: !isMobile ? 'blur(4px)' : 'none',
              zIndex: 9998,
              pointerEvents: 'none'
            }}
          />
        )}
      </AnimatePresence>

      {/* Checkmark Animation - Using transform instead of top for better performance */}
      <motion.div
        initial={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          x: '-50%',
          y: '-50%',
          zIndex: 9999
        }}
        animate={isMoving ? {
          position: 'fixed',
          left: '50%',
          top: '140px', // Fixed position for top
          x: '-50%',
          y: 0, // Reset y transform when at top
          scale: 0.8,
          zIndex: 9999
        } : {
          position: 'fixed',
          left: '50%',
          top: '50%',
          x: '-50%',
          y: '-50%',
          scale: 1,
          zIndex: 9999
        }}
        transition={{
          duration: isMobile ? 0.4 : 0.6, // Faster on mobile
          ease: [0.4, 0, 0.2, 1] // Custom easing for smooth slide
        }}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          willChange: 'transform'
        }}
      >
        <SuccessAnimationContent />
      </motion.div>
    </>
  );
}

// Top Position Animation (shows after slide completes)
function TopSuccessAnimation() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      style={{ marginBottom: '20px' }}
    >
      <SuccessAnimationContent />
    </motion.div>
  );
}

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const [paymentData, setPaymentData] = useState(null);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingSessionDetails, setLoadingSessionDetails] = useState(true);
  const [error, setError] = useState(null);
  const [showCenteredAnimation, setShowCenteredAnimation] = useState(false);
  const [loadingScreenComplete, setLoadingScreenComplete] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Refs to prevent duplicate fetches
  const isFetchingSessionRef = useRef(false);
  const fetchAbortControllerRef = useRef(null);
  const hasCalledPaymentSuccessRef = useRef(false); // Track if we've already called /payment/success (only for retries)
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Keep page at top; do NOT show celebration until booking is verified (avoids "success" then failure UX)
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    setLoadingScreenComplete(true);
  }, []);

  useEffect(() => {
    if (sessionDetails && !error) {
      setShowCenteredAnimation(true);
    }
  }, [sessionDetails, error]);

  // Scroll to top on page load and prevent unwanted scrolling
  useEffect(() => {
    // Scroll to top immediately and lock it
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
    // Prevent scroll restoration
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    
    // Lock scroll position at top during initial load and animation
    const preventScroll = () => {
      if (window.scrollY > 0 || document.documentElement.scrollTop > 0 || document.body.scrollTop > 0) {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }
    };
    
    // Check scroll position frequently during animation phase
    const scrollCheck = setInterval(preventScroll, 50);
    
    // Keep locked until animation completes (about 2-3 seconds)
    const unlockTimer = setTimeout(() => {
      clearInterval(scrollCheck);
    }, 3000);
    
    return () => {
      clearInterval(scrollCheck);
      clearTimeout(unlockTimer);
    };
  }, []);

  useEffect(() => {
    // Get URL parameters from Razorpay
    const razorpay_order_id = searchParams.get('razorpay_order_id');
    const razorpay_payment_id = searchParams.get('razorpay_payment_id');
    const razorpay_signature = searchParams.get('razorpay_signature');
    const verification_error = searchParams.get('verification_error'); // Flag if verification failed


    // Set payment data from URL parameters
    const payload = {
      orderId: razorpay_order_id || 'N/A',
      paymentId: razorpay_payment_id || 'N/A',
      status: 'verifying'
    };

    setPaymentData(payload);
    
    // NEW SYSTEM: Poll booking status (sessions created by webhook, not frontend)
    // Webhook is the source of truth - frontend only polls for status
    if (razorpay_order_id && razorpay_order_id !== 'N/A' && !hasCalledPaymentSuccessRef.current) {
      hasCalledPaymentSuccessRef.current = true;
      
      // Check if this is a revisit (payment initiated more than 10 minutes ago)
      const paymentInitTimeKey = `payment_init_${razorpay_order_id}`;
      const storedInitTime = localStorage.getItem(paymentInitTimeKey);
      const now = Date.now();
      
      if (storedInitTime) {
        const minutesSinceInit = (now - parseInt(storedInitTime)) / (1000 * 60);
        if (minutesSinceInit > 10) {
          console.log(`⏰ Payment was initiated ${minutesSinceInit.toFixed(1)} minutes ago, checking status once without polling...`);
          // Check status once, but don't poll if it's old
          pollBookingStatus(razorpay_order_id, 0, true); // Pass skipPolling flag
          return;
        }
      } else {
        // Store current time as payment initiation time
        localStorage.setItem(paymentInitTimeKey, now.toString());
      }
      
      console.log('🔍 Starting booking status polling...', { orderId: razorpay_order_id?.substring(0, 10) + '...' });
      pollBookingStatus(razorpay_order_id);
    } else if (!razorpay_order_id && !hasCalledPaymentSuccessRef.current) {
      // Try to get order ID from sessionStorage (iPhone backup)
      try {
        const storedPayment = sessionStorage.getItem('razorpay_payment');
        if (storedPayment) {
          const paymentData = JSON.parse(storedPayment);
          if (paymentData.razorpay_order_id) {
            hasCalledPaymentSuccessRef.current = true;
            console.log('🔍 Found order ID in sessionStorage, starting polling...');
            pollBookingStatus(paymentData.razorpay_order_id);
          }
        }
      } catch (storageErr) {
        console.warn('⚠️ Could not read payment from sessionStorage:', storageErr);
      }
    }

    // Notify parent window when running inside iframe (modal checkout)
    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      window.parent.postMessage(
        {
          type: 'RAZORPAY_PAYMENT_RESULT',
          status: 'success',
          payload
        },
        window.location.origin
      );
    }

    setLoading(false);

    // Cleanup function to reset fetching state on unmount
    return () => {
      if (fetchAbortControllerRef.current) {
        fetchAbortControllerRef.current.abort();
        fetchAbortControllerRef.current = null;
      }
      isFetchingSessionRef.current = false;
      // Note: Don't reset hasCalledPaymentSuccessRef on unmount
      // It should persist for the component lifecycle to prevent duplicate calls
    };
  }, [searchParams, isAuthenticated]);

  // Session details fetching only - no receipt fetching
  // Receipts are generated on sessions page and sent via WhatsApp/email only

  // Poll booking status (NEW: Uses webhook-based system)
  // This function polls the booking status endpoint which returns current state
  // Sessions are created by webhook, not by frontend
  const pollBookingStatus = async (orderId, attempt = 0, skipPolling = false) => {
    // Prevent duplicate fetches
    if (attempt === 0) {
      if (isFetchingSessionRef.current) {
        return;
      }
      isFetchingSessionRef.current = true;
      fetchAbortControllerRef.current = new AbortController();
      setLoadingSessionDetails(true);
    }

    try {
      // Spacing between polls is only the setTimeout in each branch below—do not add an extra
      // await here or each retry waits twice (e.g. 1s timer + 1s delay = 2s between checks).

      console.log(`🔍 Polling booking status (attempt ${attempt + 1})...`, { orderId: orderId?.substring(0, 10) + '...' });
      
      const statusResponse = await paymentApi.getBookingStatusByOrderId(orderId);

      if (statusResponse.success && statusResponse.data) {
        const { status, session, message, payment, failureReason } = statusResponse.data;
        
        // Check if payment was completed long ago (more than 5 minutes)
        // If so, and session exists, fetch it immediately without polling
        if (payment?.completed_at || payment?.created_at) {
          const paymentTime = payment.completed_at ? new Date(payment.completed_at) : new Date(payment.created_at);
          const now = new Date();
          const minutesSincePayment = (now - paymentTime) / (1000 * 60);
          
          // If payment is older than 5 minutes and session exists, fetch immediately
          if (minutesSincePayment > 5 && status === 'COMPLETED' && session?.id) {
            console.log('⏰ Payment is older than 5 minutes, fetching session directly...');
            // Fetch session directly - will be handled below in the COMPLETED status block
          } else if (minutesSincePayment > 10) {
            // If payment is older than 10 minutes, stop polling and show message
            console.log('⏰ Payment is older than 10 minutes, stopping polling...');
            setLoadingSessionDetails(false);
            if (session?.id) {
              // Session exists, try to fetch it
              try {
                const sessionResponse = await clientApi.getSession(session.id);
                if (sessionResponse.success && sessionResponse.data) {
                  const fullSession = sessionResponse.data.session || sessionResponse.data;
                  setSessionDetails({
                    psychologistName: fullSession.psychologist?.first_name || 'your therapist',
                    date: fullSession.scheduled_date,
                    time: fullSession.scheduled_time,
                    packageInfo: fullSession.package_id ? { hasPackage: true } : null,
                    sessionType: fullSession.package_id ? 'Package Session' : 'Individual Session',
                    ...packageMetaFromSession(fullSession)
                  });
                  setLoadingSessionDetails(false);
                  isFetchingSessionRef.current = false;
                  fetchAbortControllerRef.current = null;
                  return;
                }
              } catch (err) {
                console.error('Error fetching old session:', err);
              }
            }
            setError('This payment was completed some time ago. Please check your sessions page.');
            isFetchingSessionRef.current = false;
            fetchAbortControllerRef.current = null;
            return;
          }
        }
        
        // Update paymentData with amount if available
        if (payment && payment.amount) {
          setPaymentData(prev => ({
            ...prev,
            amount: payment.amount
          }));
        }

        console.log('📊 Booking status:', { status, hasSession: !!session, message });

        if (status === 'COMPLETED' && session?.id) {
          // Session created! Fetch full session details (require real session id — never trust placeholder objects)
          console.log('✅ Session created, fetching details...', { sessionId: session.id, hasSessionId: !!session.id, sessionType: session.session_type, packageId: session.package_id });
          
          // If we have a session ID, fetch full session details
          if (session.id) {
            try {
              const sessionResponse = await clientApi.getSession(session.id);
              console.log('📥 Full session response from API:', {
                success: sessionResponse.success,
                hasData: !!sessionResponse.data,
                data: sessionResponse.data,
                session: sessionResponse.data?.session,
                directData: sessionResponse.data
              });
              
              if (sessionResponse.success && sessionResponse.data) {
                const fullSession = sessionResponse.data.session || sessionResponse.data;
                
                console.log('📋 Parsed fullSession:', {
                  id: fullSession.id,
                  package_id: fullSession.package_id,
                  hasPackage: !!fullSession.package,
                  package: fullSession.package,
                  session_type: fullSession.session_type
                });
                
                let psychologistName = 'your therapist';
                if (fullSession.psychologist) {
                  if (fullSession.psychologist.first_name && fullSession.psychologist.last_name) {
                    psychologistName = `${fullSession.psychologist.first_name} ${fullSession.psychologist.last_name}`;
                  } else if (fullSession.psychologist.first_name) {
                    psychologistName = fullSession.psychologist.first_name;
                  }
                }
                
                const timeValue = fullSession.scheduled_time;
                const timeOnly = typeof timeValue === 'string' 
                  ? timeValue.split(' ')[0]
                  : timeValue;
                
                // Debug: Log full session to see what we have
                console.log('📋 Full session data:', {
                  hasPackage: !!fullSession.package,
                  package: fullSession.package,
                  package_id: fullSession.package_id,
                  session_type: fullSession.session_type,
                  fullSessionKeys: Object.keys(fullSession)
                });
                
                // Extract package info if available
                let packageInfo = null;
                if (fullSession.package) {
                  console.log('📦 Package data from API:', {
                    package: fullSession.package,
                    completed_sessions: fullSession.package.completed_sessions,
                    total_sessions: fullSession.package.total_sessions,
                    session_count: fullSession.package.session_count,
                    packageKeys: Object.keys(fullSession.package)
                  });
                  
                  // Try multiple ways to get totalSessions
                  let totalSessions = fullSession.package.total_sessions;
                  if (totalSessions === undefined || totalSessions === null) {
                    totalSessions = fullSession.package.session_count;
                  }
                  // If still undefined, try to get from the package object directly
                  if (totalSessions === undefined || totalSessions === null) {
                    totalSessions = fullSession.package.totalSessions;
                  }
                  
                  const completedSessions = fullSession.package.completed_sessions || fullSession.package.completedSessions || 0;
                  
                  console.log('🔍 Extracted values:', {
                    total_sessions: fullSession.package.total_sessions,
                    session_count: fullSession.package.session_count,
                    totalSessions: fullSession.package.totalSessions,
                    finalTotalSessions: totalSessions,
                    completedSessions: completedSessions,
                    totalSessionsType: typeof totalSessions,
                    totalSessionsValue: totalSessions,
                    packageObject: fullSession.package
                  });
                  
                  if (totalSessions !== undefined && totalSessions !== null) {
                    packageInfo = {
                      completedSessions: completedSessions,
                      totalSessions: totalSessions,
                      remainingSessions: Math.max(totalSessions - completedSessions, 0),
                      sessionNumber: fullSession.package.session_number || null,
                      packageType: fullSession.package.package_type || 'Package'
                    };
                    
                    console.log('✅ Extracted package info:', packageInfo);
                  } else {
                    console.warn('⚠️ Package object exists but totalSessions is invalid:', {
                      total_sessions: fullSession.package.total_sessions,
                      session_count: fullSession.package.session_count,
                      totalSessions: fullSession.package.totalSessions,
                      finalTotalSessions: totalSessions,
                      packageKeys: Object.keys(fullSession.package)
                    });
                    // Still mark as package even if count is missing
                    if (fullSession.package_id) {
                      packageInfo = {
                        hasPackage: true
                      };
                    }
                  }
                } else if (fullSession.package_id) {
                  // If package_id exists but package object is not populated, fetch it
                  console.log('⚠️ Package ID exists but package object not populated. Fetching package details...', fullSession.package_id);
                  try {
                    // Try to fetch package details from API
                    const packageResponse = await clientApi.getClientPackages();
                    if (packageResponse.success && packageResponse.data?.clientPackages) {
                      const matchingPackage = packageResponse.data.clientPackages.find(
                        pkg => pkg.package?.id === fullSession.package_id || pkg.id === fullSession.package_id
                      );
                      if (matchingPackage) {
                        const totalSessions = matchingPackage.total_sessions || matchingPackage.package?.session_count || 0;
                        if (totalSessions > 0) {
                          packageInfo = {
                            completedSessions: matchingPackage.completed_sessions || 0,
                            totalSessions: totalSessions,
                            remainingSessions: matchingPackage.remaining_sessions || 0,
                            packageType: matchingPackage.package?.package_type || 'Package'
                          };
                          console.log('✅ Fetched package info from client packages:', packageInfo);
                        }
                      }
                    }
                  } catch (packageError) {
                    console.error('❌ Error fetching package details:', packageError);
                  }
                  
                  // If still no package info, mark as package
                  if (!packageInfo) {
                    packageInfo = {
                      hasPackage: true
                    };
                  }
                }
                
                // Determine session type - check package_id first, then format session_type
                let sessionType = 'Individual Session';
                // If it has a package_id, it's definitely a package session
                if (fullSession.package_id || packageInfo || session.package_id) {
                  sessionType = 'Package Session';
                } else if (fullSession.session_type) {
                  // Format session_type for display
                  if (fullSession.session_type === 'therapy_session' || fullSession.session_type === 'individual_session') {
                    sessionType = 'Individual Session';
                  } else if (fullSession.session_type === 'package_session' || fullSession.session_type.includes('package')) {
                    sessionType = 'Package Session';
                  } else {
                    // Capitalize and format other session types
                    sessionType = fullSession.session_type.split('_').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ');
                  }
                } else if (session.session_type) {
                  if (session.session_type === 'therapy_session' || session.session_type === 'individual_session') {
                    sessionType = 'Individual Session';
                  } else if (session.session_type === 'package_session' || session.session_type.includes('package')) {
                    sessionType = 'Package Session';
                  } else {
                    sessionType = session.session_type.split('_').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ');
                  }
                }
                
                setSessionDetails({
                  psychologistName,
                  date: fullSession.scheduled_date,
                  time: timeOnly,
                  packageInfo: packageInfo,
                  sessionType: sessionType,
                  ...packageMetaFromSession(fullSession)
                });
                setLoadingSessionDetails(false);
                isFetchingSessionRef.current = false;
                fetchAbortControllerRef.current = null;
                
                // Clean up localStorage entry for this payment
                const paymentInitTimeKey = `payment_init_${orderId}`;
                localStorage.removeItem(paymentInitTimeKey);
                
                return;
              }
            } catch (sessionError) {
              console.error('❌ Error fetching session details:', sessionError);
              // Fall through to use basic info from status response
            }
          }
          
          // Use basic info from status response (fallback if session.id is null or fetch failed)
          console.log('📋 Using session details from status response:', {
            scheduledDate: session.scheduledDate,
            scheduledTime: session.scheduledTime,
            sessionType: session.session_type,
            packageId: session.package_id,
            fullSession: session,
            statusResponseSession: statusResponse.data?.session
          });
          
          // Try to extract package info from status response or fetch it
          let packageInfo = null;
          const packageId = session?.package_id || statusResponse.data?.session?.package_id;
          
          if (packageId) {
            console.log('📦 Package ID found in status response, fetching package details...', packageId);
            // Try to fetch package details
            try {
              // Fetch session again to get full details including package
              if (session?.id) {
                const retrySessionResponse = await clientApi.getSession(session.id);
                if (retrySessionResponse.success && retrySessionResponse.data) {
                  const retrySession = retrySessionResponse.data.session || retrySessionResponse.data;
                  if (retrySession.package) {
                    const totalSessions = retrySession.package.total_sessions || retrySession.package.session_count;
                    if (totalSessions && totalSessions > 0) {
                      packageInfo = {
                        completedSessions: retrySession.package.completed_sessions || 0,
                        totalSessions: totalSessions,
                        remainingSessions: retrySession.package.remaining_sessions || 0,
                        sessionNumber: retrySession.package.session_number || null,
                        packageType: retrySession.package.package_type || 'Package'
                      };
                      console.log('✅ Fetched package info from retry:', packageInfo);
                    }
                  }
                }
              }
            } catch (packageError) {
              console.error('❌ Error fetching package in fallback:', packageError);
            }
            
            // If still no package info, mark as package
            if (!packageInfo) {
              packageInfo = {
                hasPackage: true
              };
            }
          }
          
          // Determine session type from status response - check package_id first
          let sessionType = 'Individual Session';
          // If it has a package_id, it's definitely a package session
          if (packageId || packageInfo) {
            sessionType = 'Package Session';
          } else if (session?.session_type) {
            // Format session_type for display
            if (session.session_type === 'therapy_session' || session.session_type === 'individual_session') {
              sessionType = 'Individual Session';
            } else if (session.session_type === 'package_session' || session.session_type.includes('package')) {
              sessionType = 'Package Session';
            } else {
              sessionType = session.session_type.split('_').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ');
            }
          } else if (statusResponse.data?.session?.session_type) {
            const rawType = statusResponse.data.session.session_type;
            if (rawType === 'therapy_session' || rawType === 'individual_session') {
              sessionType = 'Individual Session';
            } else if (rawType === 'package_session' || rawType.includes('package')) {
              sessionType = 'Package Session';
            } else {
              sessionType = rawType.split('_').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ');
            }
          }
          
          setSessionDetails({
            psychologistName: 'your therapist',
            date: session?.scheduledDate || statusResponse.data.slotDetails?.scheduledDate,
            time: session?.scheduledTime || statusResponse.data.slotDetails?.scheduledTime,
            packageInfo: packageInfo,
            sessionType: sessionType,
            ...packageMetaFromSession(session)
          });
          setLoadingSessionDetails(false);
          isFetchingSessionRef.current = false;
          fetchAbortControllerRef.current = null;
          
          // Clean up localStorage entry for this payment
          const paymentInitTimeKey = `payment_init_${orderId}`;
          localStorage.removeItem(paymentInitTimeKey);
          
          return;
        } else if (status === 'FAILED' || status === 'EXPIRED') {
          setLoadingSessionDetails(false);
          let failMsg = message || 'Booking failed. Please contact support.';
          if (
            status === 'FAILED' &&
            failureReason === 'payment_risk_check_failed'
          ) {
            failMsg =
              'Your bank or Razorpay blocked this payment (risk check). No money was taken. Try another card, UPI, or network—or contact support with your order ID.';
          }
          setError(failMsg);
          isFetchingSessionRef.current = false;
          fetchAbortControllerRef.current = null;
          return;
        } else {
          // Still processing - continue polling
          // Don't poll if skipPolling flag is set (old payment revisit)
          if (skipPolling) {
            console.log('⏰ Skipping polling for old payment, redirecting to sessions page...');
            setLoadingSessionDetails(false);
            setError('Payment was completed earlier. Please check your sessions page for booking details.');
            isFetchingSessionRef.current = false;
            fetchAbortControllerRef.current = null;
            return;
          }
          
          // Reduce max attempts if payment is old (already processed)
          const maxAttempts = 20; // Poll for up to ~20 seconds
          
          // Check localStorage for payment initiation time
          const paymentInitTimeKey = `payment_init_${orderId}`;
          const storedInitTime = localStorage.getItem(paymentInitTimeKey);
          let adjustedMaxAttempts = maxAttempts;
          
          if (storedInitTime) {
            const minutesSinceInit = (Date.now() - parseInt(storedInitTime)) / (1000 * 60);
            if (minutesSinceInit > 2) {
              // If payment is older than 2 minutes, only poll 3 more times
              adjustedMaxAttempts = Math.min(attempt + 3, maxAttempts);
              console.log(`⏰ Payment is ${minutesSinceInit.toFixed(1)} minutes old, limiting polling attempts to ${adjustedMaxAttempts}`);
            }
          }
          
          // If payment is older than 2 minutes, reduce polling attempts
          if (payment?.completed_at || payment?.created_at) {
            const paymentTime = payment.completed_at ? new Date(payment.completed_at) : new Date(payment.created_at);
            const now = new Date();
            const minutesSincePayment = (now - paymentTime) / (1000 * 60);
            
            if (minutesSincePayment > 2) {
              // If payment is older than 2 minutes, only poll 3 more times
              adjustedMaxAttempts = Math.min(attempt + 3, maxAttempts);
              console.log(`⏰ Payment is ${minutesSincePayment.toFixed(1)} minutes old, limiting polling attempts to ${adjustedMaxAttempts}`);
            }
          }
          
          if (attempt < adjustedMaxAttempts) {
            setTimeout(() => {
              pollBookingStatus(orderId, attempt + 1, skipPolling);
            }, 600); // Tight poll while webhook/session finalize (spacing only; no duplicate delay inside pollBookingStatus)
          } else {
            // Timeout - show message but don't error (webhook might still process it)
            setLoadingSessionDetails(false);
            // Check if session might exist but status check failed
            if (payment?.status === 'success') {
              setError('Payment was successful. Please check your sessions page for booking details.');
            } else {
              setError('Booking is taking longer than expected. Please check your sessions page in a few minutes.');
            }
            isFetchingSessionRef.current = false;
            fetchAbortControllerRef.current = null;
          }
        }
      } else {
        // Error or not found
        const maxAttempts = 10;
        if (attempt < maxAttempts) {
          setTimeout(() => {
            pollBookingStatus(orderId, attempt + 1);
          }, 2000); // Retry after 2 seconds on error
        } else {
          setLoadingSessionDetails(false);
          setError('Could not verify booking status. Please contact support.');
          isFetchingSessionRef.current = false;
          fetchAbortControllerRef.current = null;
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        // Intentional abort, ignore
        return;
      }

      console.error('❌ Error polling booking status:', error);
      
      const maxAttempts = 10;
      if (attempt < maxAttempts) {
        setTimeout(() => {
          pollBookingStatus(orderId, attempt + 1);
        }, 2000);
      } else {
        setLoadingSessionDetails(false);
        setError('Error checking booking status. Please contact support.');
        isFetchingSessionRef.current = false;
        fetchAbortControllerRef.current = null;
      }
    }
  };

  // Direct fetch by session ID (much more efficient!)
  const fetchSessionById = async (sessionId, retryAttempt = 0) => {
    // Prevent duplicate fetches on first attempt
    if (retryAttempt === 0) {
      if (isFetchingSessionRef.current) {
        return;
      }
      // Mark as fetching immediately
      isFetchingSessionRef.current = true;
      fetchAbortControllerRef.current = new AbortController();
    }
    
    try {
      if (retryAttempt === 0) {
        setLoadingSessionDetails(true);
      }
      
      // On mobile, add a small delay on first attempt to ensure session is ready
      // On desktop, try immediately
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
      if (retryAttempt === 0 && isMobile) {
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay on mobile
      }
      
      const sessionResponse = await clientApi.getSession(sessionId);
      
      if (sessionResponse.success && sessionResponse.data) {
        const session = sessionResponse.data.session || sessionResponse.data;
        
        if (session && session.scheduled_date && session.scheduled_time) {
          let psychologistName = 'your therapist';
          if (session.psychologist) {
            if (session.psychologist.first_name && session.psychologist.last_name) {
              psychologistName = `${session.psychologist.first_name} ${session.psychologist.last_name}`;
            } else if (session.psychologist.first_name) {
              psychologistName = session.psychologist.first_name;
            }
          } else if (session.psychologist_name) {
            psychologistName = session.psychologist_name;
          } else if (session.psychologist_first_name && session.psychologist_last_name) {
            psychologistName = `${session.psychologist_first_name} ${session.psychologist_last_name}`;
          }
          
          const timeValue = session.scheduled_time;
          const timeOnly = typeof timeValue === 'string' 
            ? timeValue.split(' ')[0]
            : timeValue;
          
          // Extract package info if available
          let packageInfo = null;
          if (session.package) {
            packageInfo = {
              completedSessions: session.package.completed_sessions || 0,
              totalSessions: session.package.total_sessions || session.package.session_count || 0,
              remainingSessions: (session.package.total_sessions || session.package.session_count || 0) - (session.package.completed_sessions || 0),
              sessionNumber: session.package.session_number || null,
              packageType: session.package.package_type || 'Package'
            };
          } else if (session.package_id) {
            packageInfo = {
              hasPackage: true
            };
          }
          
          // Determine session type - check package_id first
          let sessionType = 'Individual Session';
          // If it has a package_id, it's definitely a package session
          if (session.package_id || packageInfo) {
            sessionType = 'Package Session';
          } else if (session.session_type) {
            // Format session_type for display
            if (session.session_type === 'therapy_session' || session.session_type === 'individual_session') {
              sessionType = 'Individual Session';
            } else if (session.session_type === 'package_session' || session.session_type.includes('package')) {
              sessionType = 'Package Session';
            } else {
              sessionType = session.session_type.split('_').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ');
            }
          }
          
          setSessionDetails({
            psychologistName,
            date: session.scheduled_date,
            time: timeOnly,
            packageInfo: packageInfo,
            sessionType: sessionType,
            ...packageMetaFromSession(session)
          });
          setLoadingSessionDetails(false);
          // Reset fetching flag on success
          isFetchingSessionRef.current = false;
          fetchAbortControllerRef.current = null;
          return;
        }
      }
      
      // If session not found and we haven't retried, try once more after a short delay
      // This handles race conditions where session might not be ready yet
      if (retryAttempt === 0) {
        setTimeout(() => {
          fetchSessionById(sessionId, 1);
        }, 1000); // Retry after 1 second
        return;
      }
      
      setLoadingSessionDetails(false);
      // Reset fetching flag
      isFetchingSessionRef.current = false;
      fetchAbortControllerRef.current = null;
      
      // Fallback to polling if direct fetch fails after retry
      const orderId = searchParams.get('razorpay_order_id');
      if (orderId) {
        fetchSessionDetails(orderId);
      }
    } catch (error) {
      // If 404 error and first attempt, retry once (session might not be ready yet)
      if (retryAttempt === 0 && error.message?.includes('not found')) {
        setTimeout(() => {
          fetchSessionById(sessionId, 1);
        }, 1000); // Retry after 1 second
        return;
      }
      
      console.error('❌ Error fetching session by ID:', error);
      setLoadingSessionDetails(false);
      // Reset fetching flag on error
      isFetchingSessionRef.current = false;
      fetchAbortControllerRef.current = null;
      
      // Fallback to polling if direct fetch fails
      const orderId = searchParams.get('razorpay_order_id');
      if (orderId) {
        fetchSessionDetails(orderId);
      }
    }
  };

  // Polling method to fetch session details
  const fetchSessionDetails = async (orderId, attempt = 0) => {
    // Prevent duplicate fetches - check and set atomically
    if (attempt === 0) {
      if (isFetchingSessionRef.current) {
        return;
      }
      // Mark as fetching immediately to prevent race conditions
      isFetchingSessionRef.current = true;
      // Create abort controller for this fetch
      fetchAbortControllerRef.current = new AbortController();
    }
    
    try {
      setLoadingSessionDetails(true);
      
      // Add delay based on attempt number
      // First attempt: wait shorter on mobile for better UX, longer on desktop
      // Payment verification can take 2-5 seconds (signature verification, session creation)
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
      if (attempt === 0) {
        // Mobile: 1 second, Desktop: 2 seconds (reduced from 3 seconds)
        await new Promise(resolve => setTimeout(resolve, isMobile ? 1000 : 2000));
      } else if (attempt === 1) {
        await new Promise(resolve => setTimeout(resolve, isMobile ? 1000 : 1500));
      }
      
      // Fetch sessions list to find the newly created session
      // This is the only way to get session details - no receipt endpoint used
      const cacheBuster = Date.now();
      const sessionsResponse = await clientApi.getSessions({ limit: 20, page: 1, _t: cacheBuster });
      
      if (sessionsResponse.success && sessionsResponse.data) {
        const sessions = sessionsResponse.data.sessions || sessionsResponse.data;
        const sessionsArray = Array.isArray(sessions) ? sessions : [];
        
        // Find the most recent session that was just created (within last 5 minutes)
        // Use a shorter time window to avoid picking old sessions
        const now = new Date();
        const recentSessions = sessionsArray
          .filter(s => {
            if (!s.created_at) return false;
            const sessionTime = new Date(s.created_at);
            const minutesAgo = (now - sessionTime) / (1000 * 60);
            // Only consider sessions created in the last 5 minutes (more strict)
            return minutesAgo < 5 && minutesAgo >= 0;
          })
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // Most recent first
        
        const targetSession = recentSessions.length > 0 ? recentSessions[0] : null;
        
        if (targetSession && targetSession.scheduled_date && targetSession.scheduled_time) {
          let psychologistName = 'your therapist';
          if (targetSession.psychologist) {
            if (targetSession.psychologist.first_name && targetSession.psychologist.last_name) {
              psychologistName = `${targetSession.psychologist.first_name} ${targetSession.psychologist.last_name}`;
            } else if (targetSession.psychologist.first_name) {
              psychologistName = targetSession.psychologist.first_name;
            }
          } else if (targetSession.psychologist_name) {
            psychologistName = targetSession.psychologist_name;
          } else if (targetSession.psychologist_first_name && targetSession.psychologist_last_name) {
            psychologistName = `${targetSession.psychologist_first_name} ${targetSession.psychologist_last_name}`;
          }
          
          const timeValue = targetSession.scheduled_time;
          const timeOnly = typeof timeValue === 'string' 
            ? timeValue.split(' ')[0]
            : timeValue;
          
          // Extract package info if available
          let packageInfo = null;
          if (targetSession.package) {
            packageInfo = {
              completedSessions: targetSession.package.completed_sessions || 0,
              totalSessions: targetSession.package.total_sessions || targetSession.package.session_count || 0,
              remainingSessions: (targetSession.package.total_sessions || targetSession.package.session_count || 0) - (targetSession.package.completed_sessions || 0),
              sessionNumber: targetSession.package.session_number || null,
              packageType: targetSession.package.package_type || 'Package'
            };
          } else if (targetSession.package_id) {
            packageInfo = {
              hasPackage: true
            };
          }
          
          // Determine session type - check package_id first
          let sessionType = 'Individual Session';
          // If it has a package_id, it's definitely a package session
          if (targetSession.package_id || packageInfo) {
            sessionType = 'Package Session';
          } else if (targetSession.session_type) {
            // Format session_type for display
            if (targetSession.session_type === 'therapy_session' || targetSession.session_type === 'individual_session') {
              sessionType = 'Individual Session';
            } else if (targetSession.session_type === 'package_session' || targetSession.session_type.includes('package')) {
              sessionType = 'Package Session';
            } else {
              sessionType = targetSession.session_type.split('_').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ');
            }
          }
          
          setSessionDetails({
            psychologistName,
            date: targetSession.scheduled_date,
            time: timeOnly,
            packageInfo: packageInfo,
            sessionType: sessionType,
            ...packageMetaFromSession(targetSession)
          });
          setLoadingSessionDetails(false);
          // Reset fetching flag on success
          isFetchingSessionRef.current = false;
          fetchAbortControllerRef.current = null;
          return;
        }
      }
      
      // If not found and haven't exceeded max retries, retry after delay
      // Increase delay progressively to give backend more time
      const maxRetries = 10; // Increased retries to handle slower backend processing
      if (attempt < maxRetries) {
        // Progressive delay: 3s, 4s, 5s, 6s, etc.
        const delay = 3000 + (attempt * 1000);
        setTimeout(() => {
          fetchSessionDetails(orderId, attempt + 1);
        }, delay);
      } else {
        setLoadingSessionDetails(false);
        // Reset fetching flag on max retries
        isFetchingSessionRef.current = false;
        fetchAbortControllerRef.current = null;
        // Don't show error, just show generic message
      }
    } catch (error) {
      // Don't log abort errors as they're intentional
      if (error.name !== 'AbortError') {
        console.error('Could not fetch session details:', error.message, error);
      }
      // Retry if we haven't exceeded max attempts
      const maxRetries = 10;
      if (attempt < maxRetries && error.name !== 'AbortError') {
        // Progressive delay: 3s, 4s, 5s, 6s, etc.
        const delay = 3000 + (attempt * 1000);
        setTimeout(() => {
          fetchSessionDetails(orderId, attempt + 1);
        }, delay);
      } else {
        setLoadingSessionDetails(false);
        // Reset fetching flag on error completion
        isFetchingSessionRef.current = false;
        fetchAbortControllerRef.current = null;
      }
    }
  };

  // Receipt download handled via email/WhatsApp; no manual download button on success page.

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    
    // Handle different time formats: HH:MM:SS or HH:MM
    let timeParts = timeString.split(':');
    const hours = parseInt(timeParts[0], 10);
    const minutes = timeParts[1] || '00';
    
    // Validate hours
    if (isNaN(hours) || hours < 0 || hours > 23) {
      console.error('Invalid time format:', timeString);
      return timeString; // Return original if invalid
    }
    
    // Convert to 12-hour format
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;
    const displayMinutes = minutes.padStart(2, '0');
    
    return `${displayHour}:${displayMinutes} ${ampm}`;
  };

  if (loading) {
    return null;
  }

  if (!error && !sessionDetails && loadingSessionDetails) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16 bg-slate-50">
        <div
          className="w-10 h-10 border-2 border-slate-200 border-t-[#3f2e73] rounded-full animate-spin mb-6"
          aria-hidden
        />
        <p className="text-slate-800 text-center font-medium text-lg">
          Verifying your payment and booking…
        </p>
        <p className="text-slate-500 text-center text-sm mt-2 max-w-sm">
          Please wait—do not close this page. We confirm with the payment provider before showing success.
        </p>
      </div>
    );
  }

  if (error) {
    const supportEmail = 'hey@koott.com';
    const supportPhone = '+91 95390 07766';
    return (
      <div className="w-full max-w-md mx-auto rounded-2xl border border-slate-200 bg-white shadow-xl p-8 text-center mt-24 px-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-slate-600 text-sm mb-4">Oops... {error.replace(/\s*Please try again\.?\s*/gi, ' ').trim() || 'Payment failed.'}</p>
          <p className="text-slate-700 text-sm mb-6 leading-relaxed">
            Please immediately contact our team through mail or phone for assistance.
          </p>
          <div className="space-y-2 mb-6 text-sm">
            <a href={`mailto:${supportEmail}`} className="block text-[#3f2e73] font-medium hover:underline">
              {supportEmail}
            </a>
            <a href={`tel:+919539007766`} className="block text-[#3f2e73] font-medium hover:underline">
              {supportPhone}
            </a>
          </div>
          <button
            onClick={() => router.push('/profile/sessions')}
            className="w-full px-6 py-3 bg-[#3f2e73] hover:bg-[#1d1733] text-white font-medium rounded-lg transition-colors"
          >
            View Sessions
          </button>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '40px 20px', 
      paddingTop: '80px',
      maxWidth: '1200px',
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif',
      minHeight: '100vh',
      // Hide content during animation to prevent footer flash
      opacity: showCenteredAnimation ? 0 : 1,
      visibility: showCenteredAnimation ? 'hidden' : 'visible',
      transition: 'opacity 0.3s ease-in-out, visibility 0.3s ease-in-out',
      // Ensure page stays at top during animation
      position: 'relative',
      overflow: showCenteredAnimation ? 'hidden' : 'visible'
    }}>
      {/* Centered Animation Overlay - Shows immediately */}
      <AnimatePresence>
        {showCenteredAnimation && (
          <SlidingSuccessAnimation onComplete={() => setShowCenteredAnimation(false)} />
        )}
      </AnimatePresence>

      {/* Success Heading - Reduced size and proper margin */}
      <div style={{ textAlign: 'center', marginTop: '60px', marginBottom: '20px' }}>
        {!showCenteredAnimation && (
          <>
            <TopSuccessAnimation />
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                delay: isMobile ? 0.1 : 0.2, 
                duration: isMobile ? 0.3 : 0.4 
              }}
              style={{ 
                color: '#22c55e', 
                fontSize: '24px',
                fontWeight: '600',
                marginBottom: '12px',
                marginTop: '20px',
                lineHeight: '1.4',
                willChange: 'transform, opacity'
              }}
            >
              Payment Successful!
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                delay: isMobile ? 0.2 : 0.4, 
                duration: isMobile ? 0.3 : 0.4 
              }}
              style={{ 
                fontSize: '16px', 
                color: '#6b7280', 
                marginBottom: '30px',
                willChange: 'transform, opacity'
              }}
            >
              Your session has been successfully scheduled.
            </motion.p>
          </>
        )}
      </div>
      
      {/* Two Column Layout: Transaction Details (Left) and Session Details (Right) */}
      {!showCenteredAnimation && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            delay: isMobile ? 0.3 : 0.6, 
            duration: isMobile ? 0.4 : 0.5 
          }}
          style={{ 
            marginTop: '80px',
            willChange: 'transform, opacity'
          }}
        >
        <div className="details-container">
        {/* Transaction Details - Left Column */}
      {paymentData && (
          <div className="transaction-details-column">
            <div style={{ textAlign: 'left', paddingLeft: '0' }}>
              <div style={{ 
                fontSize: '16px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '12px',
                marginTop: '0',
                lineHeight: '1.4'
              }}>
                Transaction Details
              </div>
              <div style={{ 
                fontSize: '14px',
                color: '#6b7280',
                lineHeight: '1.8',
                marginBottom: '20px'
              }}>
                {paymentData.transactionId && (
                  <p style={{ margin: '6px 0' }}><strong style={{ color: '#374151' }}>Transaction ID:</strong> {paymentData.transactionId}</p>
                )}
                <p style={{ margin: '6px 0' }}><strong style={{ color: '#374151' }}>Order ID:</strong> {paymentData.orderId}</p>
                <p style={{ margin: '6px 0' }}><strong style={{ color: '#374151' }}>Payment ID:</strong> {paymentData.paymentId}</p>
                {paymentData.amount && (
                  <p style={{ margin: '6px 0' }}><strong style={{ color: '#374151' }}>Amount:</strong> <span style={{ fontWeight: '600' }}>₹{paymentData.amount.toLocaleString('en-IN')}</span></p>
                )}
                <p style={{ margin: '6px 0' }}>
                  <strong style={{ color: '#374151' }}>Status:</strong>{' '}
                  <span style={{ color: '#22c55e', fontWeight: '500' }}>Confirmed with booking</span>
                </p>
              </div>
            </div>
          </div>
        )}

          {/* Vertical Divider - Only show on desktop when paymentData exists */}
          {paymentData && <div className="vertical-divider"></div>}

        {/* Session Details - Right Column */}
        <div className="session-details-column" style={{ minHeight: '200px' }}>
          <div style={{
            textAlign: 'left',
            color: '#374151',
            width: '100%'
          }}>
            {loadingSessionDetails ? (
              <>
                <div style={{ 
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '12px',
                  marginTop: '0',
                  lineHeight: '1.4'
                }}>
                  Session Details
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px',
                  color: '#6b7280',
                  fontSize: '14px'
                }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #e5e7eb',
                    borderTop: '2px solid #3f2e73',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }}></div>
                  <span>Creating your session..</span>
                </div>
              </>
            ) : sessionDetails ? (
              <>
                <div style={{ 
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '12px',
                  marginTop: '0',
                  lineHeight: '1.4'
                }}>
                  Session Details
                </div>
                <p style={{
                  fontSize: '16px',
                  lineHeight: '1.6',
                  marginBottom: '16px',
                  color: '#374151'
                }}>
                  Thank you for booking a session. Your session has been scheduled.
                </p>
                
        <div style={{
                  backgroundColor: '#f9fafb',
          borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '16px',
                  border: '1px solid #e5e7eb'
        }}>
                  <div style={{ marginBottom: '8px' }}>
                    <strong style={{ color: '#3f2e73' }}>Therapist:</strong>{' '}
                    <span style={{ color: '#3f2e73' }}>{sessionDetails.psychologistName}</span>
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong style={{ color: '#3f2e73' }}>Booking</strong>{' '}
                    <span style={{ color: '#3f2e73' }}>
                      {buildPaymentSuccessBookingSummary({
                        packageName: sessionDetails.packageName,
                        packageType: sessionDetails.packageType,
                        totalSessions: sessionDetails.packageInfo?.totalSessions || 0,
                        sessionType: sessionDetails.sessionType
                      })}
                    </span>
                  </div>
                  {(() => {
                    const pt = sessionDetails.packageType;
                    const total = sessionDetails.packageInfo?.totalSessions;
                    let mins = null;
                    if (pt) mins = getSessionDurationMinutesFromPackageType(pt);
                    else if (
                      sessionDetails.sessionType === 'Individual Session' &&
                      !total &&
                      !sessionDetails.packageInfo?.hasPackage
                    ) {
                      mins = 50;
                    }
                    const dur = mins != null ? formatDurationHuman(mins) : null;
                    if (!dur) return null;
                    return (
                      <div style={{ marginBottom: '8px' }}>
                        <strong style={{ color: '#3f2e73' }}>Session duration</strong>{' '}
                        <span style={{ color: '#3f2e73' }}>{dur}</span>
                      </div>
                    );
                  })()}
                  <div style={{ marginBottom: '8px' }}>
                    <strong style={{ color: '#3f2e73' }}>Date:</strong>{' '}
                    <span style={{ color: '#3f2e73' }}>{formatDate(sessionDetails.date)}</span>
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong style={{ color: '#3f2e73' }}>Time:</strong>{' '}
                    <span style={{ color: '#3f2e73' }}>{formatTime(sessionDetails.time)}</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div style={{ 
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '12px',
                  marginTop: '0',
                  lineHeight: '1.4'
                }}>
                  Session Details
                </div>
                <p style={{
                  fontSize: '16px',
                  lineHeight: '1.6',
                  marginBottom: '16px',
                  color: '#374151'
                }}>
                  Thank you for booking a session. Your session has been scheduled successfully.
                </p>
              </>
            )}
          </div>
        </div>
        </div>
        </motion.div>
      )}
      
      {/* Action Buttons */}
      {!showCenteredAnimation && (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          delay: isMobile ? 0.4 : 0.8, 
          duration: isMobile ? 0.4 : 0.5 
        }}
        style={{ 
          display: 'flex', 
          gap: '12px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          marginTop: '20px',
          willChange: 'transform, opacity'
        }}
      >
        <button
          onClick={() => router.push('/profile/sessions')}
          style={{
            backgroundColor: 'transparent',
            color: '#3f2e73',
            padding: '10px 24px',
            border: 'none',
            borderRadius: '24px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            boxShadow: 'inset 0 0 0 2px #3f2e73',
            transition: 'all 0.2s ease-in-out'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#3f2e73';
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.boxShadow = 'inset 0 0 0 2px #3f2e73';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#3f2e73';
            e.currentTarget.style.boxShadow = 'inset 0 0 0 2px #3f2e73';
          }}
        >
          View Sessions
        </button>
        <button
          onClick={() => router.push('/')}
          style={{
            backgroundColor: '#3f2e73',
            color: 'white',
            padding: '10px 28px',
            border: 'none',
            borderRadius: '24px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            transition: 'background-color 0.2s ease-in-out'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d1733'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3f2e73'}
        >
          Go Home
        </button>
      </motion.div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .details-container {
          display: flex;
          flex-direction: column;
          gap: 30px;
        }
        
        .transaction-details-column,
        .session-details-column {
          width: 100%;
        }
        
        .vertical-divider {
          display: none;
        }
        
        @media (min-width: 1024px) {
          .details-container {
            flex-direction: row;
            align-items: stretch;
          }
          
          .transaction-details-column {
            flex: 1;
            padding-right: 40px;
          }
          
          .vertical-divider {
            display: block;
            width: 2px;
            background-color: #3f2e73;
            flex-shrink: 0;
            align-self: stretch;
          }
          
          .session-details-column {
            flex: 1;
            padding-left: 40px;
          }
        }
      `}</style>
    </div>
  );
}

export default function PaymentSuccess() {
  return (
    <Suspense fallback={null}>
      <PaymentSuccessContent />
    </Suspense>
  );
}

