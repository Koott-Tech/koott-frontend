'use client';

import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, CheckCircle, XCircle, ChevronLeft, ChevronRight, X } from 'lucide-react';
import AuthModal from '@/components/AuthModal';
import QuickContactModal from '@/components/QuickContactModal';
import { clientApi } from '@/lib/backendApi';
import { isClientContactComplete } from '@/lib/contactValidation';
import { loadAuthData } from '@/lib/authStorage';

dayjs.extend(utc);
dayjs.extend(timezone);

// Success Animation Component (Google Pay style)
function SuccessAnimationContent() {
  const confettiColors = ['#22c55e', '#025545', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
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

export default function FreeAssessmentPage() {
  const router = useRouter();
  const { user, token, authLoading } = useAuth();
  const [assessmentStatus, setAssessmentStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // All free assessment times are handled and displayed in IST
  const [showAuth, setShowAuth] = useState(false);
  const [showQuickContact, setShowQuickContact] = useState(false);
  const [pendingBooking, setPendingBooking] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [pendingBookingAfterAuth, setPendingBookingAfterAuth] = useState(false);
  const [missingFields, setMissingFields] = useState([]);

  // Calendar state (like therapist profile)
  const [currentDate, setCurrentDate] = useState(new Date());
  // Initialize with current date - will be overridden if localStorage has a selection
  const [selectedDate, setSelectedDate] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('freeAssessmentPendingSelection');
      if (stored) {
        try {
          const selection = JSON.parse(stored);
          const restoredDate = new Date(selection.date);
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          const restoredDateOnly = new Date(restoredDate);
          restoredDateOnly.setHours(0, 0, 0, 0);
          if (restoredDateOnly >= now) {
            return restoredDate;
          }
        } catch (e) {
          // Invalid stored data, use current date
        }
      }
    }
    // Default to current date
    return new Date();
  });
  // Initialize with stored time if available
  const [selectedTime, setSelectedTime] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('freeAssessmentPendingSelection');
      if (stored) {
        try {
          const selection = JSON.parse(stored);
          if (selection.time) {
            return selection.time;
          }
        } catch (e) {
          // Invalid stored data
        }
      }
    }
    return null;
  });
  const [freeAssessmentAvailability, setFreeAssessmentAvailability] = useState({});
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availableTimeslots, setAvailableTimeslots] = useState([]);
  const [loadingTimeslots, setLoadingTimeslots] = useState(false);

  // Show calendar for logged-in users by default, unless we explicitly know they can't book
  // This allows calendar to show even if assessmentStatus hasn't loaded yet or profile doesn't exist
  const canBookFreeAssessment = user 
    ? (assessmentStatus === null ? true : Boolean(assessmentStatus?.canBook))
    : true;

  // Get assessment status
  const fetchAssessmentStatus = async () => {
    if (!token) return;
    try {
      setLoading(true);
      console.log('[FreeAssess] fetchAssessmentStatus:start', { tokenPreview: (token || '').slice(0,10) + '...' });
      const response = await fetch('/api/free-assessments/status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      console.log('[FreeAssess] fetchAssessmentStatus:response', data);
      
      if (data.success) {
        setAssessmentStatus(data.data);
        setError(''); // Clear any previous errors
      } else {
        // Don't block calendar for "Client profile not found" - it will be created on booking
        const errorMessage = data.message || 'Failed to fetch assessment status';
        if (errorMessage.includes('Client profile not found') || errorMessage.includes('profile not found')) {
          // Set assessmentStatus to allow booking (will be created on booking attempt)
          setAssessmentStatus({ canBook: true, totalAssessments: 3, usedAssessments: 0, availableAssessments: 3 });
          setError(''); // Don't show error - profile will be created when booking
        } else {
          setError(errorMessage);
        }
      }
    } catch (error) {
      console.error('Error fetching assessment status:', error);
      setError('Failed to fetch assessment status');
    } finally {
      setLoading(false);
      console.log('[FreeAssess] fetchAssessmentStatus:done');
    }
  };

  // Calendar helper functions (like therapist profile)
  const getMonthName = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    return { daysInMonth, startingDay };
  };

  const handlePrevMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    setCurrentDate(newDate);
    fetchFreeAssessmentAvailability(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    setCurrentDate(newDate);
    fetchFreeAssessmentAvailability(newDate);
  };

  const handleDateSelect = (day) => {
    const newSelectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(newSelectedDate);
    setSelectedTime(null);
    // Clear stored selection when user manually changes date
    if (typeof window !== 'undefined') {
      localStorage.removeItem('freeAssessmentPendingSelection');
      localStorage.removeItem('freeAssessmentPendingBooking');
    }
    // Clear missing fields message when user selects date
    setMissingFields(prev => prev.filter(f => f !== 'Date'));
    fetchAvailableTimeslots(newSelectedDate);
  };

  const handleTimeSelect = (time) => {
    setSelectedTime(time);
    // Clear stored selection when user manually changes time
    if (typeof window !== 'undefined') {
      localStorage.removeItem('freeAssessmentPendingSelection');
      localStorage.removeItem('freeAssessmentPendingBooking');
    }
    // Clear missing fields message when user selects time
    setMissingFields(prev => prev.filter(f => f !== 'Time'));
  };

  // Fetch free assessment availability for current month
  const fetchFreeAssessmentAvailability = async (date) => {
    try {
      setLoadingAvailability(true);
      console.log('[FreeAssess] fetchAvailability:start', { date, iso: date?.toISOString() });
      
      // Get current month dates
      const year = date.getFullYear();
      const month = date.getMonth();
      
      // Format start date (first day of month)
      const startYear = year;
      const startMonth = String(month + 1).padStart(2, '0');
      const startDay = '01';
      const startDate = `${startYear}-${startMonth}-${startDay}`;
      
      // Format end date (last day of month)
      const endYear = year;
      const endMonth = String(month + 1).padStart(2, '0');
      const endDay = String(new Date(year, month + 1, 0).getDate()).padStart(2, '0');
      const endDate = `${endYear}-${endMonth}-${endDay}`;
      
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await fetch(
        `/api/free-assessments/availability-range?startDate=${startDate}&endDate=${endDate}`,
        Object.keys(headers).length ? { headers } : undefined
      );
      
      const data = await response.json();
      
      if (data.success) {
        // Convert array to object with date keys
        const availabilityObject = {};
        data.data.forEach(dayAvailability => {
          availabilityObject[dayAvailability.date] = dayAvailability;
        });
        
        setFreeAssessmentAvailability(availabilityObject);
      } else {
        console.error('Failed to fetch availability:', data);
        setFreeAssessmentAvailability({});
      }
    } catch (error) {
      console.error('Error fetching free assessment availability:', error);
      setFreeAssessmentAvailability({});
    } finally {
      setLoadingAvailability(false);
      console.log('[FreeAssess] fetchAvailability:done');
    }
  };

  // Fetch available timeslots for selected date
  const fetchAvailableTimeslots = async (date) => {
    try {
      setLoadingTimeslots(true);
      console.log('[FreeAssess] fetchAvailableTimeslots:start', { date, iso: date?.toISOString() });
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      console.log('[FreeAssess] fetchAvailableTimeslots:dateStr', dateStr);
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await fetch(
        `/api/free-assessments/available-slots?date=${dateStr}`,
        Object.keys(headers).length ? { headers } : undefined
      );
      
      const data = await response.json();
      console.log('[FreeAssess] fetchAvailableTimeslots:response', data);
      
      if (data.success) {
        setAvailableTimeslots(data.data.availableSlots || []);
      } else {
        console.error('Failed to fetch timeslots:', data);
        setAvailableTimeslots([]);
      }
    } catch (error) {
      console.error('Error fetching timeslots:', error);
      setAvailableTimeslots([]);
    } finally {
      setLoadingTimeslots(false);
      console.log('[FreeAssess] fetchAvailableTimeslots:done');
    }
  };

  const performBooking = async (dateObj, time) => {
    if (!dateObj || !time) return;
    
    // Check token from context first, then from localStorage (for cases where context hasn't updated yet)
    let authToken = token;
    if (!authToken && typeof window !== 'undefined') {
      try {
        const authData = loadAuthData();
        authToken = authData?.token;
      } catch (e) {
        console.error('Error loading auth data:', e);
      }
    }
    
    if (!authToken) {
      setShowAuth(true);
      return;
    }
    
    // Start timer immediately when booking starts - show modal after 3 seconds
    const successTimer = setTimeout(() => {
      setShowSuccessModal(true);
      setLoading(false);
    }, 3000);
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      // Use authToken (from context or localStorage)
      const response = await fetch('/api/free-assessments/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          scheduledDate: dateStr,
          scheduledTime: time
        })
      });

      const data = await response.json();

      if (data.success) {
        // Clear selections immediately
        setSelectedDate(null);
        setSelectedTime(null);
        setAvailableTimeslots([]);
        setPendingBooking(null);
        
        // Clear stored selection after successful booking
        if (typeof window !== 'undefined') {
          localStorage.removeItem('freeAssessmentPendingSelection');
        }
        
        // Refresh data
        // Check both context and localStorage for auth
        const hasAuth = (user && token) || (typeof window !== 'undefined' && loadAuthData()?.token);
        if (hasAuth) {
          fetchAssessmentStatus();
        }
        fetchFreeAssessmentAvailability(currentDate);
        
        // Modal will show after 2 seconds (already started timer above)
        // Don't set loading to false here - let the timer handle it
      } else {
        // If booking failed, cancel the success timer and show error
        clearTimeout(successTimer);
        setShowSuccessModal(false);
        setError(data.message || 'Failed to book assessment');
        setLoading(false);
      }
    } catch (error) {
      // If booking failed, cancel the success timer and show error
      clearTimeout(successTimer);
      setShowSuccessModal(false);
      console.error('Error booking assessment:', error);
      setError('Failed to book assessment');
      setLoading(false);
    }
  };

  const ensureContactAndBook = async (dateObj, time) => {
    if (!user || !token) {
      console.error('User not authenticated');
      return;
    }

    // Contact details are now collected during signup, so we can proceed directly
    // Still check contact but don't block if it's incomplete (signup form collects it)
    try {
      const profileResponse = await clientApi.getProfile();
      const profile = profileResponse?.data;
      if (!isClientContactComplete(profile)) {
        // Contact might be incomplete, but signup form should have collected it
        // Proceed with booking anyway - backend will handle validation
        console.log('⚠️ Contact info may be incomplete, but proceeding with booking');
      }
    } catch (err) {
      console.error('Error verifying contact information:', err);
      // Proceed anyway - backend will handle validation
    }

    await performBooking(dateObj, time);
  };

  // Book free assessment
  const bookAssessment = async () => {
    // Check for missing fields
    const missing = [];
    if (!selectedDate) missing.push('Date');
    if (!selectedTime) missing.push('Time');
    
    // If user is not authenticated
    if (!user || !token) {
      if (missing.length > 0) {
        // Show missing fields message
        setMissingFields(missing);
        return;
      } else {
        // All fields selected, save booking details to localStorage before showing signup
        const bookingDetails = {
          date: selectedDate ? {
            year: selectedDate.getFullYear(),
            month: selectedDate.getMonth(),
            day: selectedDate.getDate()
          } : null,
          time: selectedTime,
          currentMonth: currentDate ? {
            year: currentDate.getFullYear(),
            month: currentDate.getMonth(),
            day: currentDate.getDate()
          } : null,
          timestamp: Date.now()
        };
        localStorage.setItem('freeAssessmentPendingBooking', JSON.stringify(bookingDetails));
        
        // Also keep the old format for compatibility
      if (typeof window !== 'undefined') {
        const selectionToStore = {
          date: selectedDate.toISOString(),
          time: selectedTime,
          currentMonth: currentDate.toISOString()
        };
        localStorage.setItem('freeAssessmentPendingSelection', JSON.stringify(selectionToStore));
      }
        
        // Show signup modal
        setPendingBookingAfterAuth(true);
      setShowAuth(true);
        setMissingFields([]);
      return;
    }
    }

    // User is authenticated - proceed with normal flow
    setMissingFields([]);
    setPendingBookingAfterAuth(false);
    
    if (!selectedDate || !selectedTime) {
      setError('Please select both date and time');
      return;
    }

    const bookingDetails = { date: selectedDate, time: selectedTime };
    setPendingBooking(bookingDetails);
    await ensureContactAndBook(bookingDetails.date, bookingDetails.time);
  };

  const handleAuthSuccess = async () => {
    // After successful signup/login, check if there are pending booking details
    const savedBooking = localStorage.getItem('freeAssessmentPendingBooking');
    
    if (savedBooking && pendingBookingAfterAuth) {
      // Close modal immediately after signup succeeds and prevent it from reopening
    setShowAuth(false);
      setPendingBookingAfterAuth(false); // Set to false immediately to prevent reopening
      
        // Restore booking details from localStorage
        try {
          const bookingDetails = JSON.parse(savedBooking);
          // Restore date and time - store in variables to use directly
          let restoredDate = null;
          let restoredTime = null;
          
          if (bookingDetails.date) {
            restoredDate = new Date(
              bookingDetails.date.year,
              bookingDetails.date.month,
              bookingDetails.date.day
            );
            setSelectedDate(restoredDate);
          }
          // Restore time
          if (bookingDetails.time) {
            restoredTime = bookingDetails.time;
            setSelectedTime(restoredTime);
          }
          // Restore current month if available
          if (bookingDetails.currentMonth) {
            const restoredMonth = new Date(
              bookingDetails.currentMonth.year,
              bookingDetails.currentMonth.month,
              bookingDetails.currentMonth.day
            );
            setCurrentDate(restoredMonth);
          }
          
          // Clear saved booking details
          localStorage.removeItem('freeAssessmentPendingBooking');
          localStorage.removeItem('freeAssessmentPendingSelection');
          
          // Wait for auth state to update, then proceed with booking
          let attempts = 0;
          const maxAttempts = 100; // 10 seconds max
          
          const checkAuth = setInterval(() => {
            attempts++;
            const storedAuthReady = (() => {
              try {
                const authData = loadAuthData();
                return authData && authData.token && authData.user;
              } catch {
                return false;
              }
            })();
            
            const contextAuthReady = user && token;
            
            if ((storedAuthReady || contextAuthReady) && attempts >= 3) {
              clearInterval(checkAuth);
              console.log('✅ Free Assessment - Auth ready, proceeding with booking...');
              // Keep pendingBookingAfterAuth false to prevent modal from reopening
              setPendingBookingAfterAuth(false);
              
              // Proceed directly with booking (no payment needed for free assessment)
              // Use restored values directly instead of state (which might not be updated yet)
              setTimeout(async () => {
                const dateToUse = restoredDate || selectedDate;
                const timeToUse = restoredTime || selectedTime;
                
                if (dateToUse && timeToUse) {
                  const bookingDetails = { date: dateToUse, time: timeToUse };
                  setPendingBooking(bookingDetails);
                  // Free assessment: Directly book without payment or contact check
                  // Contact details are collected during signup, so proceed directly to booking
                  await performBooking(dateToUse, timeToUse);
                } else {
                  console.error('❌ Missing booking data after auth');
                  setError('Booking data was lost. Please select date and time again.');
                  setPendingBookingAfterAuth(false);
                }
              }, 300);
            } else if (attempts >= maxAttempts) {
              clearInterval(checkAuth);
              console.error('❌ Free Assessment - Auth state did not update in time');
              setError('Authentication failed. Please refresh the page and try booking again.');
              setPendingBookingAfterAuth(false);
            }
          }, 100);
      } catch (error) {
        console.error('Error restoring booking details:', error);
        setPendingBookingAfterAuth(false);
      }
    } else {
      // No pending booking - normal auth flow
      setPendingBookingAfterAuth(false);
      setShowAuth(false);
    }
  };

  const handleRequireContactInfo = () => {
    setShowAuth(false);
    // Set flag in sessionStorage so contact form shows after page reload
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('showQuickContact', 'true');
    }
    setShowQuickContact(true);
  };

  const handleQuickContactSaved = async () => {
    setShowQuickContact(false);
    await fetchAssessmentStatus();
    await fetchFreeAssessmentAvailability(currentDate);
    if (pendingBooking?.date && pendingBooking?.time) {
      // Clear stored selection before proceeding with booking
      if (typeof window !== 'undefined') {
        localStorage.removeItem('freeAssessmentPendingSelection');
      }
      await ensureContactAndBook(pendingBooking.date, pendingBooking.time);
    }
  };

  // Cancel assessment
  const cancelAssessment = async (assessmentId) => {
    if (!confirm('Are you sure you want to cancel this assessment?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/free-assessments/cancel/${assessmentId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess('Assessment cancelled successfully');
        fetchAssessmentStatus(); // Refresh status
      } else {
        setError(data.message || 'Failed to cancel assessment');
      }
    } catch (error) {
      console.error('Error cancelling assessment:', error);
      setError('Failed to cancel assessment');
    } finally {
      setLoading(false);
    }
  };

  // Format time for display
  const formatTime = (time) => {
    if (!time) return '';
    try {
      const [h, m] = time.split(':');
      const hour = parseInt(h, 10);
      const minute = parseInt(m, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
    } catch {
      return time;
    }
  };

  // Format date for display
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  useEffect(() => {
    if (authLoading) return;

    if (user && token) {
      console.log('[FreeAssess] useEffect:init', { user: { id: user?.id, role: user?.role, email: user?.email }, tokenPreview: (token || '').slice(0,10) + '...' });
      fetchAssessmentStatus();
      
      // Restore selected date and time from localStorage after login
      let hasRestoredSelection = false;
      if (typeof window !== 'undefined') {
        const storedSelection = localStorage.getItem('freeAssessmentPendingSelection');
        if (storedSelection) {
          try {
            const selection = JSON.parse(storedSelection);
            const restoredDate = new Date(selection.date);
            const restoredTime = selection.time;
            const restoredCurrentMonth = selection.currentMonth ? new Date(selection.currentMonth) : null;
            
            // Validate that the restored date is not in the past
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            const restoredDateOnly = new Date(restoredDate);
            restoredDateOnly.setHours(0, 0, 0, 0);
            
            if (restoredDateOnly >= now) {
              hasRestoredSelection = true;
              
              // Restore the current month view if available
              if (restoredCurrentMonth) {
                setCurrentDate(restoredCurrentMonth);
                fetchFreeAssessmentAvailability(restoredCurrentMonth);
              } else {
                // If no month stored, use the date's month
                const monthForDate = new Date(restoredDate.getFullYear(), restoredDate.getMonth(), 1);
                setCurrentDate(monthForDate);
                fetchFreeAssessmentAvailability(monthForDate);
              }
              
              // Restore selected date and time
              setSelectedDate(restoredDate);
              setSelectedTime(restoredTime);
              
              // Fetch timeslots for the restored date
              fetchAvailableTimeslots(restoredDate);
              
              console.log('[FreeAssess] Restored selection from localStorage:', { date: restoredDate, time: restoredTime });
            } else {
              // Clear invalid stored selection (past date)
              localStorage.removeItem('freeAssessmentPendingSelection');
            }
          } catch (e) {
            console.error('Error restoring selection from localStorage:', e);
            localStorage.removeItem('freeAssessmentPendingSelection');
          }
        }
      }
      
      // Only fetch availability if we didn't restore from localStorage
      if (!hasRestoredSelection) {
        fetchFreeAssessmentAvailability(currentDate);
        // Auto-select current date and fetch its timeslots on initial load (if not already selected)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDateOnly = selectedDate ? new Date(selectedDate) : null;
        if (selectedDateOnly) {
          selectedDateOnly.setHours(0, 0, 0, 0);
        }
        
        if (!selectedDate || !selectedDateOnly || selectedDateOnly.getTime() !== today.getTime()) {
          const todayFull = new Date();
          setSelectedDate(todayFull);
          fetchAvailableTimeslots(todayFull);
        } else if (selectedDate) {
          // Date is already selected (from initial state), just fetch timeslots
          fetchAvailableTimeslots(selectedDate);
        }
      }
      
      // Check if we need to show contact form (after signup/login)
      const shouldShowContact = typeof window !== 'undefined' && sessionStorage.getItem('showQuickContact') === 'true';
      if (shouldShowContact && user?.role === 'client') {
        // Check contact info completeness
        setTimeout(async () => {
          try {
            const clientProfileResponse = await clientApi.getProfile();
            const clientProfile = clientProfileResponse.data;
            if (!isClientContactComplete(clientProfile)) {
              setShowQuickContact(true);
            }
            // Clear the flag regardless of whether contact is complete
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('showQuickContact');
            }
          } catch (e) {
            console.error('Error checking profile after auth:', e);
            // If check fails and we have the flag, show contact form anyway
            setShowQuickContact(true);
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('showQuickContact');
            }
          }
        }, 500);
      }
    } else {
      setAssessmentStatus(null);
    fetchFreeAssessmentAvailability(currentDate);
      // Auto-select current date and fetch its timeslots on initial load (for non-authenticated users)
      // Only if not already selected (from initial state or localStorage)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDateOnly = selectedDate ? new Date(selectedDate) : null;
      if (selectedDateOnly) {
        selectedDateOnly.setHours(0, 0, 0, 0);
      }
      
      if (!selectedDate || !selectedDateOnly || selectedDateOnly.getTime() !== today.getTime()) {
        const todayFull = new Date();
        setSelectedDate(todayFull);
        fetchAvailableTimeslots(todayFull);
      } else if (selectedDate) {
        // Date is already selected (from initial state), just fetch timeslots
        fetchAvailableTimeslots(selectedDate);
      }
    }
  }, [authLoading, token, user]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h5 className="font-bold text-gray-900 mb-4">Free Assessment Sessions</h5>
        </div>

        {/* Login info for guests */}
        {!user && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
            Select a date and time that works for you. You'll be prompted to log in or sign up when you click
            <span className="font-semibold"> Book Free Assessment</span>.
          </div>
        )}

        {/* Error and Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <XCircle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-green-800">{success}</span>
            </div>
          </div>
        )}

        {/* Booking Section - Always show calendar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Show message if logged-in user can't book */}
          {user && assessmentStatus && !assessmentStatus.canBook && (
            <div className="col-span-2 mb-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                <p className="font-semibold mb-1">You've used all 3 free assessments</p>
                <p>You can still view your existing bookings below.</p>
              </div>
            </div>
          )}
            {/* Left Side - Calendar */}
            <div className="bg-white rounded-2xl shadow-2xl p-6">
              <div className="text-center mb-4 mt-4">
                <h6 className="font-bold text-gray-800 mb-1">Select Your Date</h6>
                {loadingAvailability && (
                  <div className="mt-2 flex items-center justify-center text-blue-600 text-xs">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
                    Loading availability...
                  </div>
                )}
              </div>
              
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-4">
                <button 
                  onClick={handlePrevMonth}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h6 className="font-semibold text-gray-800">{getMonthName(currentDate)}</h6>
                <button 
                  onClick={handleNextMonth}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              
              {/* Calendar Legend */}
              <div className="mb-3 text-xs text-gray-600">
                <div className="flex items-center justify-center space-x-4">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-[#f2fff1] border border-[#025545] rounded mr-1"></div>
                    <span>Available</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-[#d7fec5] rounded mr-1"></div>
                    <span>Today</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-[#025545] rounded mr-1"></div>
                    <span>Selected</span>
                  </div>
                </div>
              </div>
              
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 mb-4">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                  <div key={`header-${index}`} className="text-center text-xs font-medium text-gray-500 py-1">
                    {day}
                  </div>
                ))}
                {(() => {
                  const { daysInMonth, startingDay } = getDaysInMonth(currentDate);
                  const today = new Date();
                  const isCurrentMonth = currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
                  
                  // Create array for calendar grid
                  const calendarDays = [];
                  
                  // Add empty cells for days before the first day of the month
                  for (let i = 0; i < startingDay; i++) {
                    calendarDays.push(<div key={`empty-${i}`} className="text-center py-1 text-xs"></div>);
                  }
                  
                  // Add days of the month
                  for (let day = 1; day <= daysInMonth; day++) {
                    const isToday = isCurrentMonth && day === today.getDate();
                    const isSelected = selectedDate && selectedDate.getDate() === day && selectedDate.getMonth() === currentDate.getMonth() && selectedDate.getFullYear() === currentDate.getFullYear();
                    
                    // Properly check if date is in the past (same logic as therapist profile)
                    const calendarDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    todayStart.setHours(0, 0, 0, 0);
                    calendarDate.setHours(0, 0, 0, 0);
                    const isPastDate = calendarDate < todayStart;
                    const isAvailable = !isPastDate;
                    
                    // Get date string for availability lookup
                    const year = calendarDate.getFullYear();
                    const month = String(calendarDate.getMonth() + 1).padStart(2, '0');
                    const dayStr = String(calendarDate.getDate()).padStart(2, '0');
                    const dateStr = `${year}-${month}-${dayStr}`;
                    const dateAvailability = freeAssessmentAvailability[dateStr];
                    
                    // STRICT check: Only highlight dates that have isConfigured: true AND availableSlots > 0
                    // If date is not in availability object, treat as having 0 slots and not configured
                    let availableSlotsCount = 0;
                    let isConfigured = false;
                    
                    if (dateAvailability && typeof dateAvailability === 'object' && dateAvailability !== null) {
                      // Check if date is configured (has specific date config)
                      isConfigured = dateAvailability.isConfigured === true;
                      
                      const slots = dateAvailability.availableSlots;
                      // Only accept positive numbers - reject 0, negative, or non-numbers
                      if (typeof slots === 'number' && slots > 0 && Number.isFinite(slots)) {
                        availableSlotsCount = slots;
                      } else {
                        // Explicitly set to 0 if slots is 0, negative, or invalid
                        availableSlotsCount = 0;
                      }
                    }
                    // If dateAvailability is undefined/null, availableSlotsCount remains 0 and isConfigured remains false
                    
                    // Only consider available if: isConfigured is true AND slots count is strictly greater than 0
                    // This is the ONLY condition that determines if a date should be highlighted
                    const isFreeAssessmentAvailable = isConfigured && availableSlotsCount > 0;
                    
                    // Only show highlight/available indicator if it's configured AND has available slots (> 0) AND is not a past date
                    // CRITICAL: isConfigured MUST be true AND availableSlotsCount MUST be > 0 for any highlighting
                    const shouldHighlight = isFreeAssessmentAvailable && !isPastDate;
                    const isActuallyAvailable = shouldHighlight && isAvailable;
                    
                    calendarDays.push(
                      <div
                        key={`day-${day}`}
                        onClick={() => {
                          // Allow clicking on any future date, not just those with availability (same as therapist profile)
                          if (isAvailable) {
                            handleDateSelect(day);
                          }
                        }}
                        className={`text-center py-1 rounded-lg transition-all duration-200 text-xs ${
                          isSelected
                            ? 'bg-[#025545] text-white font-bold shadow-lg cursor-pointer border border-[#025545]'
                            : // Only highlight if: isConfigured is true AND slots > 0 AND actually available
                            (isConfigured && availableSlotsCount > 0 && isActuallyAvailable)
                              ? (isToday 
                              ? 'bg-[#189e4f] text-white font-semibold shadow-md cursor-pointer border border-[#189e4f]'
                                  : 'bg-[#f2fff1] text-[#025545] font-semibold cursor-pointer border border-[#025545] hover:bg-[#d7fec5]')
                              : // Today without config or slots - just show it's today, not highlighted
                            isToday
                                ? 'bg-[#d7fec5] text-[#025545] font-semibold cursor-pointer border border-[#d7fec5]'
                              : // Future date without config or slots - clickable but not highlighted
                            isAvailable
                                ? 'text-[#025545] cursor-pointer border border-transparent hover:bg-[#f2fff1]'
                              : // Past date
                            'text-gray-300 cursor-not-allowed'
                        }`}
                        title={isFreeAssessmentAvailable && !isPastDate ? (isToday ? 'Today - Available for free assessment' : 'Available for free assessment') : isAvailable ? 'Click to check availability' : 'Past date'}
                      >
                        {day}
                        {shouldHighlight && isConfigured && availableSlotsCount > 0 && (
                          <div
                            className={`w-2 h-2 rounded-full mx-auto mt-1 shadow-sm ${
                              isSelected 
                                ? 'bg-[#f2fff1]' 
                                : (isToday && isActuallyAvailable)
                                  ? 'bg-white'
                                  : 'bg-[#025545]'
                            }`}
                          ></div>
                        )}
                      </div>
                    );
                  }
                  
                  return calendarDays;
                })()}
              </div>
            </div>

            {/* Right Side - Time Selection and Booking */}
            <div className="bg-white rounded-2xl shadow-2xl p-6 flex flex-col">
              {/* Available Time Slots */}
              {selectedDate && (
                <div className="flex flex-col flex-grow mb-2">
                  <h6 className="font-semibold text-gray-800 mb-1">
                    Available Time Slots
                    <span className="ml-1">
                      (IST)
                    </span>
                  </h6>
                  {loadingTimeslots ? (
                    <div className="flex items-center justify-center py-4 min-h-[200px]">
                      <div className="flex flex-col items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mb-3"></div>
                        <span className="text-gray-600 text-sm">Creating a safe place for you</span>
                      </div>
                    </div>
                  ) : (() => {
                    const filteredSlots = availableTimeslots.filter((timeslot) => {
                          if (!selectedDate) return true;
                          const now = new Date();
                      const isToday =
                        selectedDate.getFullYear() === now.getFullYear() &&
                                         selectedDate.getMonth() === now.getMonth() &&
                                         selectedDate.getDate() === now.getDate();
                          if (!isToday) return true;
                          const [hh, mm] = timeslot.time.split(':');
                          const slotMinutes = parseInt(hh, 10) * 60 + parseInt(mm, 10);
                          const nowMinutes = now.getHours() * 60 + now.getMinutes();
                          return slotMinutes > nowMinutes;
                    });

                    if (filteredSlots.length === 0) {
                      return (
                        <div className="flex items-center justify-center h-32 text-gray-500 text-sm italic">
                          No available time slots for this date
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-3 gap-2">
                        {filteredSlots.map((timeslot, index) => {
                        const isSelected = selectedTime === timeslot.time;
                        const isFullyBooked = timeslot.currentBookings >= timeslot.maxBookings;
                        const remainingSlots = timeslot.maxBookings - timeslot.currentBookings;
                        
                        return (
                          <button
                            key={index}
                            onClick={() => !isFullyBooked && handleTimeSelect(timeslot.time)}
                            disabled={isFullyBooked}
                            className={`p-2 text-xs rounded-lg border transition-colors ${
                              isSelected
                                ? 'bg-[#025545] text-white border-[#025545]'
                                : isFullyBooked
                                  ? 'bg-red-100 text-red-600 border-red-300 cursor-not-allowed'
                                  : 'bg-white text-[#025545] border-[#025545] hover:bg-[#f2fff1]'
                            }`}
                            title={isFullyBooked ? 'Fully booked' : `Available: ${remainingSlots} slots left`}
                          >
                            <div className="text-center">
                              <div>{timeslot.displayTime || formatTime(timeslot.time)}</div>
                              {isFullyBooked && (
                                <div className="text-xs text-red-500 mt-1">Fully booked</div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    );
                  })()}
                  
                  {/* Missing Fields Message */}
                  {missingFields.length > 0 && (
                    <div className="mt-4 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-yellow-800 text-xs text-center">
                        Please select: {missingFields.join(', ')}
                      </p>
                </div>
              )}

                  {/* Booking Button - At the bottom of time slots div */}
                  <div className="mt-auto pt-2">
                  <button
                    onClick={bookAssessment}
                      disabled={loading || !canBookFreeAssessment || !selectedTime}
                    className="w-full bg-[#025545] text-white py-3 px-6 rounded-lg font-semibold transition-colors hover:bg-[#012f23] disabled:bg-gray-400 disabled:cursor-not-allowed"
                      title={!canBookFreeAssessment ? 'You have used all 3 free assessments' : !selectedTime ? 'Please select a time slot' : ''}
                  >
                    {loading ? 'Booking...' : 'Book Free Assessment'}
                  </button>
                  {!canBookFreeAssessment && (
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      You've used all available free assessments
                    </p>
                  )}
                  </div>
                </div>
              )}

              {/* Instructions - Only show if no date is selected (shouldn't happen since we auto-select current date) */}
              {!selectedDate && (
                <div className="text-center text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Select a date from the calendar to see available time slots</p>
                </div>
              )}
            </div>
          </div>

        {/* Information Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-8">
          <h5 className="font-semibold text-gray-900 mb-4">About Free Assessments</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h6 className="font-medium text-gray-900 mb-2">What to Expect</h6>
              <ul className="text-gray-600 space-y-1 text-sm">
                <li>• 20-minute initial consultation</li>
                <li>• Discussion of your concerns and goals</li>
                <li>• Professional assessment and recommendations</li>
                <li>• No cost or payment required</li>
                <li>• Conducted online via Google Meet</li>
              </ul>
            </div>
            <div>
              <h6 className="font-medium text-gray-900 mb-2">Important Notes</h6>
              <ul className="text-gray-600 space-y-1 text-sm">
                <li>• Limited to 3 free assessments per user</li>
                <li>• Available therapists are assigned automatically</li>
                <li>• Cancellation requires 24-hour notice</li>
                <li>• Join meeting 5 minutes before scheduled time</li>
                <li>• Ensure stable internet connection</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      {showAuth && (
        <AuthModal
          open={showAuth}
          defaultTab="signup"
          preventReload={pendingBookingAfterAuth} // Prevent page reload when booking is pending
          signupButtonText={pendingBookingAfterAuth ? "Book a free assessment" : "Create account"} // Change button text when booking is pending
          loginButtonText={pendingBookingAfterAuth ? "Book a free assessment" : "Sign in"} // Change login button text when booking is pending
          onAuthSuccess={handleAuthSuccess}
          onRequireContactInfo={handleRequireContactInfo}
          onClose={() => {
            setShowAuth(false);
            setPendingBookingAfterAuth(false);
            setMissingFields([]);
            // Clear saved booking if user closes modal
            localStorage.removeItem('freeAssessmentPendingBooking');
            localStorage.removeItem('freeAssessmentPendingSelection');
          }}
        />
      )}
      {showQuickContact && (
        <QuickContactModal
          open={showQuickContact}
          onClose={() => setShowQuickContact(false)}
          onSaved={handleQuickContactSaved}
        />
      )}

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-white rounded-lg shadow-xl max-w-md w-full relative"
            >
              {/* Close button at top right */}
              <button
                onClick={() => setShowSuccessModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Modal Content */}
              <div className="p-6 pt-12">
                <div className="text-center mb-6">
                  {/* Success Animation */}
                  <div className="mb-4 flex justify-center">
                    <SuccessAnimationContent />
                  </div>
                  <motion.h3
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                    className="text-xl font-semibold text-gray-900 mb-2"
                  >
                    Session Booked Successfully!
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.4 }}
                    className="text-gray-600 text-sm"
                  >
                    The meet link will be shared via WhatsApp and email and also will be listed in the sessions page.
                  </motion.p>
                </div>

                {/* Sessions Page Button */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.4 }}
                  className="mt-6"
                >
                  <button
                    onClick={() => {
                      setShowSuccessModal(false);
                      router.push('/profile/sessions');
                    }}
                    className="w-full py-3 px-4 text-base font-semibold text-white rounded-lg transition-colors duration-200"
                    style={{ backgroundColor: '#025545' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#012f23'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#025545'}
                  >
                    view Bookings
                  </button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
