'use client';

/**
 * Therapist Profile Page
 * 
 * Performance Notes:
 * - This page must remain a client component due to heavy interactivity (calendar, booking, modals)
 * - Main performance improvements come from:
 *   1. CLS fixes in child components (HeroSection, TherapyTypesSplit, etc.)
 *   2. Image optimization with proper dimensions
 *   3. Code splitting where possible
 * - Consider splitting into smaller components for better code splitting in future
 */

import React, { useState, useEffect, Suspense, useMemo, useCallback } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { publicApi } from '../../../lib/backendApi';
import { clientApi, paymentApi } from '../../../lib/backendApi';
import backendApi from '../../../lib/backendApi';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { loadAuthData } from '../../../lib/authStorage';
import { formatCurrency } from '../../../lib/utils';
// import { isClientContactComplete, getIncompleteContactFields } from '../../../lib/contactValidation'; // Removed - contact details collected during signup
// import ContactCompletionWarning from '../../../components/ContactCompletionWarning'; // Removed - no longer needed
import AuthModal from '../../../components/AuthModal';
import ChildSpecSessionSelect, {
  DEFAULT_CHILD_SPEC_FU_TIER,
} from '@/components/ChildSpecSessionSelect';
import {
  CHILD_SPEC_FOLLOWUP_SESSION_DURATION,
  CHILD_SPEC_INITIAL_SESSION_DURATION,
  CHILD_SPEC_VARIANT_DISPLAY_ORDER,
} from '@/lib/childSpecSessionDurations';
import { normalizeImageUrl } from '../../../utils/urlNormalizer';
// import QuickContactModal from '@/components/QuickContactModal'; // Removed - contact details collected during signup

dayjs.extend(utc);
dayjs.extend(timezone);

// Booking Loading Animation Component
function BookingLoadingAnimation() {
  const dots = [0, 1, 2];
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        // Remove backdrop-filter on mobile for better performance
        backdropFilter: !isMobile ? 'blur(4px)' : 'none',
        WebkitBackdropFilter: !isMobile ? 'blur(4px)' : 'none',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        pointerEvents: 'auto'
      }}
    >
      {/* Calendar Icon Animation */}
      <motion.div
        initial={{ scale: 0, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={
          isMobile
            ? { type: 'tween', duration: 0.4, ease: 'easeOut' }
            : { type: 'spring', stiffness: 200, damping: 15, duration: 0.6 }
        }
        style={{
          width: '100px',
          height: '100px',
          borderRadius: '20px',
          backgroundColor: '#f5f1ff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 2,
          boxShadow: '0 8px 24px rgba(63, 46, 115, 0.25)',
          marginBottom: '32px',
          willChange: 'transform, opacity'
        }}
      >
        {/* Calendar Icon */}
        <motion.svg
          width="60"
          height="60"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <motion.rect
            x="3"
            y="4"
            width="18"
            height="18"
            rx="2"
            stroke="#3f2e73"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
          />
          <motion.line
            x1="8"
            y1="2"
            x2="8"
            y2="6"
            stroke="#3f2e73"
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          />
          <motion.line
            x1="16"
            y1="2"
            x2="16"
            y2="6"
            stroke="#3f2e73"
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.4, duration: 0.3 }}
          />
          <motion.circle
            cx="12"
            cy="14"
            r="3"
            stroke="#3f2e73"
            strokeWidth="2"
            fill="none"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 1] }}
            transition={{ delay: 0.6, duration: 0.4, repeat: Infinity, repeatType: 'reverse' }}
          />
        </motion.svg>
      </motion.div>

      {/* Loading Text with Animated Dots */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          delay: isMobile ? 0.15 : 0.3, 
          duration: isMobile ? 0.3 : 0.4 
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '20px',
          fontWeight: '600',
          color: '#3f2e73',
          willChange: 'transform, opacity'
        }}
      >
        <span>Booking Session</span>
        {dots.map((dot, index) => (
          <motion.span
            key={dot}
            animate={{
              opacity: [0.3, 1, 0.3],
              y: [0, -8, 0]
            }}
            transition={{
              duration: isMobile ? 0.9 : 1.2, // Faster on mobile
              repeat: Infinity,
              delay: index * (isMobile ? 0.15 : 0.2), // Shorter delay on mobile
              ease: 'easeInOut'
            }}
            style={{
              fontSize: '24px',
              lineHeight: 1,
              willChange: 'transform, opacity'
            }}
          >
            .
          </motion.span>
        ))}
      </motion.div>
    </motion.div>
  );
}

// Helper function to create slug from doctor name
const createSlug = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Separate component that uses route params
const TherapistProfileContent = ({ slug, packageId }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const doctorParam = slug; // Use route param (slug) instead of id
  // Get package_id from query params if not passed as prop
  const packageIdFromQuery = packageId || searchParams?.get('package_id');
  const { user, token, isAuthenticated, hasRole } = useAuth();
  const { showError, showWarning, showSuccess } = useNotification();
  
  // State for doctor data and UI
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Calendar state (all times are handled and displayed in IST)
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  
  // FAQ state
  const [openFAQ, setOpenFAQ] = useState(null);
  
  // Treatment modal state
  const [selectedTreatment, setSelectedTreatment] = useState(null);
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
  
  // Pricing state
  const [selectedPricing, setSelectedPricing] = useState(null);
  
  // Package state
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [detailsFetched, setDetailsFetched] = useState({});
  const [childSpecFuTiers, setChildSpecFuTiers] = useState({
    parent: DEFAULT_CHILD_SPEC_FU_TIER,
    child: DEFAULT_CHILD_SPEC_FU_TIER,
    family: DEFAULT_CHILD_SPEC_FU_TIER,
  });

  const isChildSpecialistDoctor =
    selectedDoctor?.specialist_category === 'child_specialist' ||
    (!!selectedDoctor?.child_specialist_pricing?.initial &&
      selectedDoctor?.specialist_category !== 'better_parent');
  const childSpecInitPackages = useMemo(() => {
    const init = packages.filter((p) => p.package_type?.startsWith('cs_init_'));
    const rank = (pkg) => {
      const m = /^cs_init_(parent|child|family)$/.exec(pkg.package_type || '');
      const suffix = m?.[1];
      const idx = suffix ? CHILD_SPEC_VARIANT_DISPLAY_ORDER.indexOf(suffix) : -1;
      return idx >= 0 ? idx : CHILD_SPEC_VARIANT_DISPLAY_ORDER.length;
    };
    return [...init].sort((a, b) => rank(a) - rank(b));
  }, [packages]);

  const CHILD_SPEC_FU_SUFFIXES = CHILD_SPEC_VARIANT_DISPLAY_ORDER;
  const CHILD_SPEC_VARIANT_LABELS = {
    parent: 'Parent only',
    child: 'Child only',
    family: 'Family',
  };
  const CHILD_SPEC_FU_TIER_OPTIONS = [
    { value: '1', label: '1 session' },
    { value: '3', label: '3 sessions' },
    { value: '6', label: '6 sessions' },
    { value: '9', label: '9 sessions' },
    { value: '12plus', label: '12 sessions' },
  ];
  
  // Client package state (for booking remaining sessions)
  const [clientPackage, setClientPackage] = useState(null);
  const [isBookingRemaining, setIsBookingRemaining] = useState(false);
  const [loadingClientPackage, setLoadingClientPackage] = useState(false);
  
  // Contact completion warning state
  const [showContactWarning, setShowContactWarning] = useState(false);
  const [incompleteContactFields, setIncompleteContactFields] = useState([]);
  
  // Availability state
  const [psychologistAvailability, setPsychologistAvailability] = useState({});
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  
  // Booking state
  const [selectedPrice, setSelectedPrice] = useState(null);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  
  // Package booking success modal state
  const [showPackageBookingSuccess, setShowPackageBookingSuccess] = useState(false);
  const [packageBookingInfo, setPackageBookingInfo] = useState(null);

  // Auto-redirect to sessions page after showing package booking success modal
  useEffect(() => {
    if (showPackageBookingSuccess && packageBookingInfo) {
      const timer = setTimeout(() => {
        setShowPackageBookingSuccess(false);
        router.push('/profile/sessions');
      }, 4000); // Redirect after 4 seconds

      return () => clearTimeout(timer);
    }
  }, [showPackageBookingSuccess, packageBookingInfo, router]);

  // Share tooltip state
  const [showShareTooltip, setShowShareTooltip] = useState(false);

  // Fetch client package details (for booking remaining sessions)
  const fetchClientPackage = async (packageId) => {
    try {
      setLoadingClientPackage(true);
      const response = await clientApi.getClientPackages();
      if (response.success) {
        const packageData = response.data.clientPackages.find(pkg => pkg.id === packageId);
        if (packageData) {
          setClientPackage(packageData);
          setIsBookingRemaining(true);
          console.log('📦 Client package loaded:', packageData);
        } else {
          console.error('Package not found:', packageId);
          setError('Package not found');
        }
      } else {
        console.error('Failed to fetch client packages:', response);
        setError('Failed to load package information');
      }
    } catch (error) {
      console.error('Error fetching client package:', error);
      setError('Failed to load package information');
    } finally {
      setLoadingClientPackage(false);
    }
  };

  // Fetch psychologist packages
  const fetchPsychologistPackages = async (psychologistId) => {
    try {
      setLoadingPackages(true);
      const response = await publicApi.getPsychologistPackages(psychologistId);
      if (response.success) {
        setPackages(response.data.packages || []);
        console.log('📦 Packages loaded:', response.data.packages);
      } else {
        console.error('Failed to fetch packages:', response);
        setPackages([]);
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
      setPackages([]);
    } finally {
      setLoadingPackages(false);
    }
  };

  // Fetch psychologist availability for a given month (defaults to currentDate)
  // When called from therapist profile, we pass withSync=true so backend
  // runs a Google Calendar sync for this psychologist before computing availability.
  const fetchPsychologistAvailability = async (psychologistId, baseDate = null) => {
    try {
      setLoadingAvailability(true);
      
      // Use provided baseDate or fallback to currentDate
      const targetDate = baseDate instanceof Date ? baseDate : currentDate;
      
      // Get month range using local formatting to avoid timezone issues
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();
      
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
      
      // Get psychologist availability range.
      // Pass withSync = true so backend performs an on-demand Google Calendar sync
      // for this psychologist before returning availability, ensuring external
      // events are blocked in real-time when the therapist profile is opened.
      // Add timestamp to prevent caching stale data
      const response = await publicApi.getPsychologistAvailabilityRange(
        psychologistId,
        startDate,
        endDate,
        true // withSync
      );
      
      // Log for debugging
      console.log('📅 Fetched availability for', psychologistId, 'from', startDate, 'to', endDate);
      if (response.success && response.data?.data) {
        const dec25 = response.data.data.find(d => d.date === '2025-12-25');
        if (dec25) {
          console.log('📅 Dec 25 availability:', {
            totalSlots: dec25.totalSlots,
            availableSlots: dec25.availableSlots,
            blockedSlots: dec25.blockedSlots,
            timeSlots: dec25.timeSlots?.map(s => `${s.time} (${s.available ? 'available' : s.reason})`)
          });
        }
      }
      
      if (response.success) {

        
        // Convert array to object with date keys
        const availabilityObject = {};
        response.data.data.forEach(dayAvailability => {
          availabilityObject[dayAvailability.date] = dayAvailability;
        });
        

        setPsychologistAvailability(availabilityObject);
      } else {
        console.error('Failed to fetch availability:', response);
        setPsychologistAvailability({});
      }
    } catch (error) {
      console.error('Error fetching psychologist availability:', error);
      // Set default availability if API fails
      setPsychologistAvailability({});
    } finally {
      setLoadingAvailability(false);
    }
  };



  // Fetch doctors data
  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const response = await publicApi.getPsychologists();
      if (response.success) {
        const assessmentEmail = (process.env.NEXT_PUBLIC_FREE_ASSESSMENT_PSYCHOLOGIST_EMAIL || 'assessment.koott@gmail.com').toLowerCase();
        const allPsychologists = response.data.psychologists || [];
        const filteredPsychologists = allPsychologists.filter(
          (psych) => (psych.email || '').toLowerCase() !== assessmentEmail
        );
        setDoctors(filteredPsychologists);

        // Helper: fetch full profile (education, FAQs, etc.) and set doctor so it loads with name/designation (no pop-in)
        const setDoctorWithDetails = async (psychologist) => {
          try {
            const detailsRes = await publicApi.getPsychologistDetails(psychologist.id);
            if (detailsRes?.success && detailsRes.data?.psychologist) {
              setSelectedDoctor({ ...psychologist, ...detailsRes.data.psychologist });
              setDetailsFetched((prev) => ({ ...prev, [psychologist.id]: true }));
            } else {
              setSelectedDoctor(psychologist);
            }
          } catch (err) {
            console.error('Failed to fetch psychologist details:', err);
            setSelectedDoctor(psychologist);
          }
        };

        // Handle doctor parameter (name slug, UUID, or index for backward compatibility)
        if (doctorParam !== null) {
          // Helper function to create slug from name
          const createSlug = (name) => {
            return name
              .toLowerCase()
              .trim()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '');
          };

          // Check if it's a UUID (psychologist ID)
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(doctorParam);

          if (isUUID) {
            // If it's a UUID, find the psychologist by ID
            const psychologist = filteredPsychologists.find(doc => doc.id === doctorParam);
            if (psychologist) {
              await setDoctorWithDetails(psychologist);
            } else {
              setError('Doctor not found');
            }
          } else {
            // Try to find by name slug first
            const psychologist = filteredPsychologists.find(doc => {
              const name = doc.name || `${doc.first_name} ${doc.last_name}`;
              const slug = createSlug(name);
              return slug === doctorParam;
            });

            if (psychologist) {
              await setDoctorWithDetails(psychologist);
            } else {
              // Fallback: Check if it's a number (for backward compatibility)
              const index = parseInt(doctorParam);
              if (!Number.isNaN(index) && filteredPsychologists[index]) {
                await setDoctorWithDetails(filteredPsychologists[index]);
              } else {
                setError('Doctor not found');
              }
            }
          }
        }
      } else {
        setError('Failed to fetch doctors');
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
      setError('Failed to load doctor information');
    } finally {
      setLoading(false);
    }
  };

  // Calendar helper functions
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
    // Clear current day/time selection when changing months
    setSelectedDate(null);
    setSelectedTime(null);
    // Refetch availability for the new month (use the updated date)
    if (selectedDoctor) {
      fetchPsychologistAvailability(selectedDoctor.id, newDate);
    }
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    setCurrentDate(newDate);
    // Clear current day/time selection when changing months
    setSelectedDate(null);
    setSelectedTime(null);
    // Refetch availability for the new month (use the updated date)
    if (selectedDoctor) {
      fetchPsychologistAvailability(selectedDoctor.id, newDate);
    }
  };

  const handleDateSelect = (day) => {
    const newSelectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(newSelectedDate);
    // Clear selected time when date changes (keep selected package)
    setSelectedTime(null);
    // Clear missing fields message when user selects date
    setMissingFields(prev => prev.filter(f => f !== 'Date'));
    
    // Check if the selected date has availability
    // Use local date formatting to avoid timezone conversion issues
    const year = newSelectedDate.getFullYear();
    const month = String(newSelectedDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(newSelectedDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayStr}`;
    const dateAvailability = psychologistAvailability[dateStr];
    
    if (!dateAvailability || !dateAvailability.availableSlots || dateAvailability.availableSlots === 0) {
      
    } else {
      
    }
  };

  const handleTimeSelect = (time) => {
    if (selectedTime === time) {
      // Toggle off if clicking the already selected time
      setSelectedTime(null);
    } else {
      setSelectedTime(time);
      // Clear missing fields message when user selects time
      setMissingFields(prev => prev.filter(f => f !== 'Time'));
    }
    // Keep selected package intact when time changes
  };

  const parseTimeStringToMinutes = (timeStr) => {
    if (!timeStr) return null;
    const trimmed = timeStr.trim();

    // Match 12-hour format e.g., "10:30 AM"
    const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match12) {
      let hours = parseInt(match12[1], 10);
      const minutes = parseInt(match12[2], 10);
      const period = match12[3].toUpperCase();
      if (period === 'PM' && hours !== 12) {
        hours += 12;
      }
      if (period === 'AM' && hours === 12) {
        hours = 0;
      }
      return hours * 60 + minutes;
    }

    // Match 24-hour format e.g., "14:30" or "14:30:00"
    const match24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (match24) {
      const hours = parseInt(match24[1], 10);
      const minutes = parseInt(match24[2], 10);
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

  const formatSlotDisplayTime = (slot) => {
    if (!slot) return '';
    if (typeof slot === 'string') return slot;
    if (slot.displayTime) return slot.displayTime;
    const minutes = getSlotMinutes(slot);
    if (minutes === null) return slot.time || '';
    const hours24 = Math.floor(minutes / 60);
    const minutesPart = String(minutes % 60).padStart(2, '0');
    const period = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 || 12;
    return `${hours12}:${minutesPart} ${period}`;
  };

  // All calendar times are in IST; duration is explained in the package/label, not in the heading.

  const isSlotInPast = (slot, date) => {
    if (!slot || !date) return false;

    // Always compare using IST (Asia/Kolkata) so behaviour is consistent
    const now = new Date();
    const istString = now.toLocaleString('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const [datePart, timePart] = istString.split(', ');
    const [monthStr, dayStr, yearStr] = datePart.split('/');
    const [hourStr, minuteStr] = timePart.split(':');

    const istYear = parseInt(yearStr, 10);
    const istMonth = parseInt(monthStr, 10) - 1; // JS months 0-11
    const istDay = parseInt(dayStr, 10);
    const istHour = parseInt(hourStr, 10);
    const istMinute = parseInt(minuteStr, 10);

    const isSameDay =
      date.getFullYear() === istYear &&
      date.getMonth() === istMonth &&
      date.getDate() === istDay;

    if (!isSameDay) return false;

    const slotMinutes = getSlotMinutes(slot);
    if (slotMinutes === null) return false;

    const nowMinutes = istHour * 60 + istMinute;
    return slotMinutes <= nowMinutes;
  };

  const [showAuth, setShowAuth] = useState(false);
  const [missingFields, setMissingFields] = useState([]);
  const [pendingBookingAfterAuth, setPendingBookingAfterAuth] = useState(false);
  // const [showQuickContact, setShowQuickContact] = useState(false); // Removed - contact details collected during signup

  const scrollToCalendar = () => {
    const calendarSection = document.getElementById('calendar-section');
    if (calendarSection) {
      const elementPosition = calendarSection.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - 100; // 100px offset from top
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const hasEducationDetails = !!(
    selectedDoctor &&
    (
      (selectedDoctor.ug_college && selectedDoctor.ug_college !== 'N/A') ||
      (selectedDoctor.pg_college && selectedDoctor.pg_college !== 'N/A') ||
      (selectedDoctor.mphil_college && selectedDoctor.mphil_college !== 'N/A') ||
      (selectedDoctor.phd_college && selectedDoctor.phd_college !== 'N/A')
    )
  );

  const renderEducationSection = () => {
    if (!selectedDoctor || !hasEducationDetails) return null;
    return (
      <div className="p-4 rounded-lg education-section-container text-center md:text-left">
        <style>{`
          @media (max-width: 768px) {
            .education-section-container {
              margin-left: auto !important;
              margin-right: auto !important;
              max-width: 100% !important;
              text-align: center !important;
            }
            .education-section-container .education-section-heading,
            .education-section-container .education-section-list {
              text-align: center !important;
            }
          }
          @media (min-width: 769px) {
            .education-section-container { text-align: left; }
            .education-section-container > div { text-align: left; }
          }
        `}</style>
        <p className="font-semibold text-gray-800 mb-2 education-section-heading" style={{ lineHeight: '1.1' }}>I studied at</p>
        <div className="space-y-1 text-center md:text-left education-section-list" style={{ lineHeight: '1.1' }}>
          {selectedDoctor.ug_college && selectedDoctor.ug_college !== 'N/A' && (
            <p className="text-gray-700 text-sm" style={{ lineHeight: '1.1' }}>
              <strong>Bachelor's:</strong> {selectedDoctor.ug_college}
            </p>
          )}
          {selectedDoctor.pg_college && selectedDoctor.pg_college !== 'N/A' && (
            <p className="text-gray-700 text-sm" style={{ lineHeight: '1.1' }}>
              <strong>Post Graduate:</strong> {selectedDoctor.pg_college}
            </p>
          )}
          {selectedDoctor.mphil_college && selectedDoctor.mphil_college !== 'N/A' && (
            <p className="text-gray-700 text-sm" style={{ lineHeight: '1.1' }}>
              <strong>MPhil:</strong> {selectedDoctor.mphil_college}
            </p>
          )}
          {selectedDoctor.phd_college && selectedDoctor.phd_college !== 'N/A' && (
            <p className="text-gray-700 text-sm" style={{ lineHeight: '1.1' }}>
              <strong>PhD:</strong> {selectedDoctor.phd_college}
            </p>
          )}
        </div>
      </div>
    );
  };

  const getDoctorDesignation = (doctor) => {
    if (!doctor) return '';
    return (
      doctor.designation ||
      doctor.speaciality ||
      doctor.specialty ||
      doctor.title ||
      doctor.role ||
      ''
    );
  };

  // Primary personality trait chip text (from admin dashboard)
  const getPrimaryTrait = (doctor) => {
    if (!doctor) return null;
    
    const rawTraits =
      doctor.personality_traits ||
      doctor.personalityTraits ||
      doctor.personalities ||
      null;

    let traits = [];

    if (Array.isArray(rawTraits)) {
      traits = rawTraits;
    } else if (typeof rawTraits === 'string' && rawTraits.trim().length > 0) {
      traits = rawTraits
        .split(/[,|/]/)
        .map((t) => t.trim())
        .filter(Boolean);
    }

    return traits.length > 0 ? traits[0] : null;
  };

  // All personality traits as an array (for lists/chips)
  const getPersonalityTraits = (doctor) => {
    if (!doctor) return [];

    const rawTraits =
      doctor.personality_traits ||
      doctor.personalityTraits ||
      doctor.personalities ||
      null;

    if (Array.isArray(rawTraits)) {
      return rawTraits.filter((t) => typeof t === 'string' && t.trim().length > 0);
    }

    if (typeof rawTraits === 'string' && rawTraits.trim().length > 0) {
      return rawTraits
        .split(/[,|/]/)
        .map((t) => t.trim())
        .filter(Boolean);
    }

    return [];
  };

  const getDoctorLanguages = (doctor) => {
    if (!doctor) return [];

    const normalizeArray = (arr) =>
      Array.isArray(arr) ? arr.map((lang) => (typeof lang === 'string' ? lang.trim() : '')).filter(Boolean) : [];

    const tryParseJsonString = (value) => {
      if (typeof value !== 'string') return [];
      const trimmed = value.trim();
      if (!trimmed) return [];

      if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
        try {
          const parsed = JSON.parse(trimmed);
          return normalizeArray(parsed);
        } catch (error) {
          console.warn('Failed to parse JSON string language value:', value, error);
        }
      }
      return [];
    };

    const fromLanguagesArray = normalizeArray(doctor.languages);
    if (fromLanguagesArray.length > 0) return fromLanguagesArray;

    if (doctor.languages_json) {
      if (Array.isArray(doctor.languages_json)) {
        const parsed = normalizeArray(doctor.languages_json);
        if (parsed.length > 0) return parsed;
      } else if (typeof doctor.languages_json === 'string') {
        try {
          const parsed = JSON.parse(doctor.languages_json);
          const normalized = normalizeArray(parsed);
          if (normalized.length > 0) return normalized;
        } catch (error) {
          console.warn('Failed to parse languages_json:', doctor.languages_json, error);
        }
      }
    }

    if (typeof doctor.language === 'string' && doctor.language.trim()) {
      const parsed = tryParseJsonString(doctor.language);
      if (parsed.length > 0) return parsed;

      const splitted = doctor.language
        .split(/[,|/]/)
        .map((lang) => lang.trim())
        .filter(Boolean);
      if (splitted.length > 0) return splitted;
    }

    if (typeof doctor.languages === 'string' && doctor.languages.trim()) {
      const parsed = tryParseJsonString(doctor.languages);
      if (parsed.length > 0) return parsed;

      const splitted = doctor.languages
        .split(/[,|/]/)
        .map((lang) => lang.trim())
        .filter(Boolean);
      if (splitted.length > 0) return splitted;
    }

    return [];
  };

  // Theme-aligned bubble colors: each section has its own palette, cycles per bubble
  const SPECIALIZATION_BUBBLE_COLORS = [
    { bg: '#f3e8ff', text: '#5b21b6' },
    { bg: '#ede9fe', text: '#4c1d95' },
    { bg: '#e0e7ff', text: '#3730a3' },
    { bg: '#f5f3ff', text: '#3f2e73' }
  ];
  const LANGUAGES_BUBBLE_COLORS = [
    { bg: '#ccfbf1', text: '#0f766e' },
    { bg: '#cffafe', text: '#0e7490' },
    { bg: '#d1fae5', text: '#047857' },
    { bg: '#e0f2fe', text: '#0369a1' }
  ];
  const PERSONALITY_BUBBLE_COLORS = [
    { bg: '#fef3c7', text: '#b45309' },
    { bg: '#fce7f3', text: '#9d174d' },
    { bg: '#f3e8ff', text: '#6d28d9' },
    { bg: '#dcfce7', text: '#15803d' }
  ];

  const renderLanguagesSection = () => {
    const derivedLanguages = getDoctorLanguages(selectedDoctor);

    return (
      <div className="p-4 rounded-lg">
        <p className="font-semibold text-gray-800 mb-3">Languages spoken</p>
        {derivedLanguages.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {derivedLanguages.map((language, index) => {
              const colors = LANGUAGES_BUBBLE_COLORS[index % LANGUAGES_BUBBLE_COLORS.length];
              return (
                <div
                  key={`${language}-${index}`}
                  className="px-3 py-2 rounded-full text-sm font-medium"
                  style={{ backgroundColor: colors.bg, color: colors.text }}
                >
                  {language}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Languages not provided</p>
        )}
      </div>
    );
  };

  const handleShare = async () => {
    try {
      const currentUrl = window.location.href;
      await navigator.clipboard.writeText(currentUrl);
      setShowShareTooltip(true);
      setTimeout(() => {
        setShowShareTooltip(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setShowShareTooltip(true);
      setTimeout(() => {
        setShowShareTooltip(false);
      }, 2000);
    }
  };

  /** Bottom CTA: drop verbose "Initial session —" / "Follow-up package (…) —" prefixes from package titles */
  const bookButtonPackageLabel = (pkg) => {
    if (!pkg) return 'Session';
    const raw = String(pkg.name || '').trim();
    if (!raw) return 'Session';
    const cleaned = raw
      .replace(/^initial session\s*[—–-]\s*/i, '')
      .replace(/^follow-?up package\s*\([^)]*\)\s*[—–-]\s*/i, '')
      .trim();
    return cleaned || 'Session';
  };

  const handleBookSession = async () => {
    // Prevent duplicate calls while booking is in progress
    if (isBooking) {
      console.log('⚠️ Booking already in progress, ignoring duplicate call');
      return;
    }

    console.log('🎯 handleBookSession called', {
      isAuthenticated: isAuthenticated(),
      hasRole: hasRole('client'),
      user: user,
      selectedDate,
      selectedTime,
      selectedPackage,
      isBookingRemaining
    });
    
    // Check for missing fields FIRST (regardless of authentication)
    const missing = [];
    if (!selectedDate) missing.push('Date');
    if (!selectedTime) missing.push('Time');
    if (!isBookingRemaining && !selectedPackage) missing.push('Package');
    
    // If ANY fields are missing, show message above button and return (don't show popup)
    if (missing.length > 0) {
      setMissingFields(missing);
      return;
    }
    
    // Set loading state immediately after validation passes - gives instant UI feedback
    setIsBooking(true);
    
    // All fields are selected - now check authentication
    // Check authentication - if pendingBookingAfterAuth is true, also check localStorage
    let isAuthReady = isAuthenticated() && user;
    if (!isAuthReady && pendingBookingAfterAuth) {
      // Check localStorage directly since React context might not be updated yet
      const authData = loadAuthData();
      if (authData && authData.token && authData.user && authData.user.role === 'client') {
        console.log('✅ Auth found in localStorage, proceeding despite React context not updated');
        isAuthReady = true;
      }
    }
    
    // If user is not authenticated (but all fields are selected)
    if (!isAuthReady) {
      // Reset loading state since we're showing auth modal
      setIsBooking(false);
      // All fields selected, save booking details to localStorage before showing signup
      const bookingDetails = {
        date: selectedDate ? {
          year: selectedDate.getFullYear(),
          month: selectedDate.getMonth(),
          day: selectedDate.getDate()
        } : null,
        time: selectedTime,
        package: selectedPackage ? {
          id: selectedPackage.id,
          name: selectedPackage.name,
          price: selectedPackage.price,
          session_count: selectedPackage.session_count,
          package_type: selectedPackage.package_type
        } : null,
        doctorId: selectedDoctor?.id,
        isBookingRemaining: isBookingRemaining,
        timestamp: Date.now()
      };
      localStorage.setItem('pendingBookingDetails', JSON.stringify(bookingDetails));
      
      // Show signup modal
      setPendingBookingAfterAuth(true);
      setShowAuth(true);
      setMissingFields([]);
      return;
    }

    // User is authenticated and all fields are selected - proceed with normal flow
    setMissingFields([]);
    // Don't set pendingBookingAfterAuth to false yet - we'll do it after booking succeeds
    // This prevents the modal from reopening if there's an error

    // 2) Role check (avoid reading user.role directly)
    // If pendingBookingAfterAuth was true, we might be proceeding before React context updates
    // In that case, check localStorage for user role
    let userRole = null;
    let roleCheckPassed = hasRole('client');
    
    if (!roleCheckPassed && pendingBookingAfterAuth) {
      // Try to get role from localStorage
      try {
        const authData = loadAuthData();
        if (authData && authData.user) {
          userRole = authData.user?.role;
          roleCheckPassed = userRole === 'client';
          if (roleCheckPassed) {
            console.log('✅ Using role from localStorage:', userRole);
          }
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    
    if (!roleCheckPassed) {
      setIsBooking(false); // Reset loading state
      showError('Only clients can book sessions.', 'Access Denied');
      setPendingBookingAfterAuth(false);
      return;
    }

    // 3) Basic selections (double check for authenticated users)
    if (!selectedDate || !selectedTime) {
      setIsBooking(false); // Reset loading state
      showWarning('Please select a date and time', 'Selection Required');
      return;
    }

    // If booking from existing package, don't require package selection
    if (!isBookingRemaining && !selectedPackage) {
      setIsBooking(false); // Reset loading state
      showWarning('Please select a package', 'Selection Required');
      return;
    }

    if (!selectedDoctor) {
      setIsBooking(false); // Reset loading state
      showError('Doctor information not available', 'Booking Error');
      return;
    }

    // Contact details are now collected during signup, so no need to check here
    // Declare clientProfile at function level so it's accessible throughout
    let clientProfile = null;

    // Loading state already set above - continue with booking process

    // Get client profile for booking (but don't require contact completion check)
    // Run in parallel with other operations to reduce lag
    const profilePromise = (async () => {
      try {
        console.log('🔍 Fetching client profile for booking...');
      const clientProfileResponse = await clientApi.getProfile();
        return clientProfileResponse.data;
    } catch (error) {
        console.error('❌ Error fetching client profile:', error);
        // If profile fetch fails, try to get basic info from user object
        if (user) {
          return {
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            email: user.email || '',
            phone_number: user.phone_number || ''
          };
        }
        return null;
    }
    })();
    try {
      // Get current date and time in local timezone
      const now = new Date();
      
      // Format selected date for scheduled session using local formatting
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const dayStr = String(selectedDate.getDate()).padStart(2, '0');
      const scheduledDate = `${year}-${month}-${dayStr}`;
      
      // Convert time to 24-hour format for database
      const timeStr = selectedTime;
      let scheduledTime;
      if (timeStr.includes('PM') && !timeStr.includes('12')) {
        const hour = parseInt(timeStr.split(':')[0]) + 12;
        const minute = timeStr.split(':')[1].split(' ')[0];
        scheduledTime = `${hour.toString().padStart(2, '0')}:${minute}:00`;
      } else if (timeStr.includes('AM') && timeStr.includes('12')) {
        scheduledTime = `00:${timeStr.split(':')[1].split(' ')[0]}:00`;
      } else {
        const hour = timeStr.split(':')[0];
        const minute = timeStr.split(':')[1].split(' ')[0];
        scheduledTime = `${hour.padStart(2, '0')}:${minute}:00`;
      }

      // Get client profile (await the promise we started earlier)
      clientProfile = await profilePromise;
      if (clientProfile) {
        console.log('✅ Client profile fetched:', clientProfile);
      } else {
        console.log('⚠️ Using fallback client profile from user object');
      }

      // Real-time Google Calendar check - run in parallel with slot reservation to reduce lag
      // Make it non-blocking: if it fails or takes too long, proceed with booking
      const calendarCheckPromise = (async () => {
      try {
        console.log('🔍 Performing real-time Google Calendar check before booking...');
          const checkData = await Promise.race([
            backendApi.get(`/availability-controller/google-calendar-busy-times?psychologist_id=${selectedDoctor.id}&start_date=${scheduledDate}&end_date=${scheduledDate}`),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000)) // 2 second timeout
          ]);
          
        if (checkData?.success && Array.isArray(checkData.data) && checkData.data.length > 0) {
          const sessionStart = new Date(`${scheduledDate}T${scheduledTime}`);
          const sessionEnd = new Date(sessionStart.getTime() + 60 * 60 * 1000);
          const hasConflict = checkData.data.some(event => {
            const eventStart = new Date(event.start);
            const eventEnd = new Date(event.end);
            return (sessionStart < eventEnd && sessionEnd > eventStart);
          });
          if (hasConflict) {
              return { hasConflict: true };
          }
        }
          return { hasConflict: false };
      } catch (checkError) {
          console.log('⚠️ Real-time Google Calendar check failed or timed out, proceeding with booking:', checkError);
          return { hasConflict: false }; // Continue with booking if check fails
      }
      })();

      // First, reserve the time slot and get payment details
      // Run slot reservation in parallel with calendar check
      let slotReservation;
      let sessionResponse;
      if (isBookingRemaining && clientPackage) {
        // Book remaining session from package (no payment needed)
        const bookingData = {
          psychologist_id: selectedDoctor.id,
          scheduled_date: scheduledDate,
          scheduled_time: scheduledTime,
          package_id: clientPackage.id
        };

        sessionResponse = await clientApi.bookRemainingSession(bookingData);
      } else {
        // Reserve slot for payment
        const reservationData = {
          psychologist_id: selectedDoctor.id,
          scheduled_date: scheduledDate,
          scheduled_time: scheduledTime,
          package_id: selectedPackage.id
        };

        // Run slot reservation and calendar check in parallel
        const [reservationResult, calendarResult] = await Promise.all([
          clientApi.reserveSlot(reservationData),
          calendarCheckPromise
        ]);
        
        slotReservation = reservationResult;
        
        // Check calendar result (non-blocking - only show warning if conflict found)
        if (calendarResult?.hasConflict) {
          // Slot is already reserved, so we can't cancel, but warn the user
          console.warn('⚠️ Calendar conflict detected but slot already reserved');
          // Don't block - let the booking proceed, backend will handle conflicts
        }
      }

      if (isBookingRemaining && clientPackage) {
        if (!sessionResponse.success) {
          if (sessionResponse.statusCode === 401) {
            showError('Session expired. Please log in again.', 'Authentication Error');
            setShowAuth(true);
          } else if (sessionResponse.statusCode === 403) {
            showError('Only clients can book sessions. Please log in with a client account.', 'Access Denied');
            setShowAuth(true);
          } else if (sessionResponse.statusCode === 404) {
            showError('Client profile not found. Please complete your profile first.', 'Profile Not Found');
            router.push('/profile');
          } else {
            showError(`Booking failed: ${sessionResponse.message || 'Unknown error'}`, 'Booking Error');
          }
          return;
        }

        setBookingSuccess(true);
        setSelectedDate(null);
        setSelectedTime(null);
        setSelectedPackage(null);
        setSelectedPrice(null);
        setPendingBookingAfterAuth(false); // Clear pending flag after successful booking

      // Redirect to sessions page after booking succeeds
      router.push('/profile/sessions');
        return;
      }

      // Handle payment flow for new bookings
      if (!slotReservation.success) {
        if (slotReservation.statusCode === 401) {
          showError('Session expired. Please log in again.', 'Authentication Error');
          setShowAuth(true);
        } else if (slotReservation.statusCode === 403) {
          showError('Only clients can book sessions. Please log in with a client account.', 'Access Denied');
          setShowAuth(true);
        } else if (slotReservation.statusCode === 404) {
          showError('Client profile not found. Please complete your profile first.', 'Profile Not Found');
          router.push('/profile');
        } else {
          showError(`Slot reservation failed: ${slotReservation.message || 'Unknown error'}`, 'Reservation Error');
        }
        return;
      }

      // Create payment order for new package booking
      const clientId = slotReservation.data.clientId;
      const amount = slotReservation.data.price;
      const sessionType = selectedPackage.session_count > 1 ? 'Package Session' : 'Individual Session';

      // Debug logging
      console.log('🔍 Payment Debug Info:', {
        scheduledDate,
        scheduledTime,
        psychologistId: selectedDoctor.id,
        clientId: clientId,
        amount,
        packageId: selectedPackage.id,
        sessionType,
        clientName: `${clientProfile?.first_name || ''} ${clientProfile?.last_name || ''}`,
        clientEmail: user?.email,
        clientPhone: clientProfile?.phone_number,
        user: user,
        clientProfile: clientProfile,
        slotReservation: slotReservation.data
      });

      const paymentData = {
        scheduledDate: scheduledDate,
        scheduledTime: scheduledTime,
        psychologistId: selectedDoctor.id,
        clientId: clientId,
        amount: amount,
        packageId: selectedPackage.id,
        sessionType: sessionType,
        clientName: `${clientProfile?.first_name || ''} ${clientProfile?.last_name || ''}`,
        clientEmail: user?.email || clientProfile?.email || `${clientId}@placeholder.koott.in`,
        clientPhone: clientProfile?.phone_number
      };

      console.log('🔍 Creating payment order with data:', paymentData);
      const paymentResponse = await paymentApi.createPaymentOrder(paymentData);

      console.log('🔍 Payment Response:', paymentResponse);

      if (paymentResponse.success) {
        // Clear pending booking flag since we're proceeding to payment
        setPendingBookingAfterAuth(false);
        console.log('✅ Payment response successful, opening Razorpay checkout...');
        console.log('📋 Razorpay Order:', paymentResponse.data);

        // Razorpay script should already be pre-loaded, but check just in case
        if (!window.Razorpay) {
          console.warn('⚠️ Razorpay script not loaded, loading now...');
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => {
            openRazorpayCheckout(paymentResponse.data);
          };
          script.onerror = () => {
            console.error('❌ Failed to load Razorpay checkout script');
            showError('Payment gateway error: Failed to load payment script');
          setIsBooking(false);
          };
          document.body.appendChild(script);
        } else {
          // Script already loaded, open immediately
          openRazorpayCheckout(paymentResponse.data);
        }

        function openRazorpayCheckout(paymentData) {
          const options = {
            key: paymentData.keyId,
            amount: paymentData.amountInPaise,
            currency: paymentData.currency || 'INR',
            name: paymentData.name || 'Koott',
            description: paymentData.description,
            order_id: paymentData.orderId,
            prefill: paymentData.prefill || {},
            notes: paymentData.notes || {},
            theme: paymentData.theme || { color: '#3b82f6' },
            handler: async function (response) {
              console.log('✅ Razorpay payment successful:', response);
              console.log('📱 Device info:', {
                userAgent: navigator.userAgent,
                isIOS: /iPhone|iPad|iPod/i.test(navigator.userAgent),
                isSafari: /Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent)
              });
              
              // Store payment details in sessionStorage as backup (for iPhone)
              try {
                sessionStorage.setItem('razorpay_payment', JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  timestamp: Date.now()
                }));
                console.log('✅ Payment details stored in sessionStorage as backup');
              } catch (storageErr) {
                console.warn('⚠️ Could not store payment in sessionStorage:', storageErr);
              }
              
              // Store payment details in sessionStorage as backup (for iPhone and other edge cases)
              try {
                sessionStorage.setItem('razorpay_payment', JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  timestamp: Date.now()
                }));
              } catch (storageErr) {
                console.warn('⚠️ Could not store payment in sessionStorage:', storageErr);
              }
              
              const verifyUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api'}/payment/success`;
              const verifyBody = JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              });
              try {
                const ac = new AbortController();
                const tid = setTimeout(() => ac.abort(), 15000);
                const verifyRes = await fetch(verifyUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: verifyBody,
                  signal: ac.signal
                });
                clearTimeout(tid);
                if (!verifyRes.ok) {
                  console.warn('⚠️ payment/success returned', verifyRes.status);
                }
              } catch (verifyErr) {
                console.warn('⚠️ payment/success before redirect:', verifyErr?.message || verifyErr);
                fetch(verifyUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: verifyBody,
                  keepalive: true
                }).catch(() => {});
              }

              window.location.href = `/payment/success?razorpay_order_id=${response.razorpay_order_id}&razorpay_payment_id=${response.razorpay_payment_id}&razorpay_signature=${encodeURIComponent(response.razorpay_signature)}`;
            },
            modal: {
              ondismiss: function() {
                console.log('Payment modal closed');
                // Don't reset booking state if redirect is in progress
                // Only reset if payment was not successful (handled in error cases)
                // The redirect will handle navigation away from this page
              }
            }
          };

          const rzp = new window.Razorpay(options);
          rzp.on('payment.failed', function (response) {
            console.error('❌ Razorpay payment failed:', response);
            let errorMessage =
              response.error?.reason === 'payment_risk_check_failed'
                ? 'Payment was declined by the bank or payment security checks. This is not a booking error—try another card, UPI, or contact your bank. You can also reach Koott for help.'
                : response.error?.description || 'Payment failed. Please try again.';
            showError(errorMessage, 'Payment Failed');
            setIsBooking(false);

            fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api'}/payment/failure`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_order_id:
                  response.error?.metadata?.order_id || response.razorpay_order_id,
                error: response.error,
              }),
            }).catch((err) => console.error('Failed to send failure notification:', err));
          });
          
          rzp.open();
        }
      } else {
        console.error('❌ Payment response failed:', paymentResponse);
        showError(`Payment initiation failed: ${paymentResponse.message || 'Unknown error'}`, 'Payment Error');
      }
    } catch (error) {
      console.error('❌ Booking error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        error: error
      });
      // Clear pending booking flag on error to prevent modal from reopening
      setPendingBookingAfterAuth(false);

      const message = error?.message || '';
      const isSlotConflict =
        message.toLowerCase().includes('time slot is not available') ||
        message.toLowerCase().includes('time slot is already booked') ||
        message.toLowerCase().includes('slot is already booked');

      if (isSlotConflict) {
        // More user-friendly message when someone else just booked this slot
        // Use showWarning with custom styling for better UX (theme colors applied in NotificationPopup)
        showWarning(
          "That time slot was just booked by someone else. Please choose another available time.",
          'Slot Unavailable'
        );

        // Refresh availability so the UI reflects newly blocked slots
        if (selectedDoctor) {
          fetchPsychologistAvailability(selectedDoctor.id);
        }
      } else {
        showError(`Booking failed: ${message || 'Please try again.'}`, 'Booking Error');
      }
    } finally {
      setIsBooking(false);
    }
  };

  // Handle booking remaining session from package
  const handleBookRemainingSession = async () => {
    if (!selectedDate || !selectedTime || !selectedPackage) {
      showWarning('Please select a date and time', 'Selection Required');
      return;
    }

    if (!selectedDoctor) {
      showError('Doctor information not available', 'Booking Error');
      return;
    }

    setIsBooking(true);
    try {
      // Get current date and time in local timezone
      const now = new Date();
      
      // Format selected date for scheduled session using local formatting
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const dayStr = String(selectedDate.getDate()).padStart(2, '0');
      const scheduledDate = `${year}-${month}-${dayStr}`;
      
      // Convert time to 24-hour format for database
      const timeStr = selectedTime;
      let scheduledTime;
      if (timeStr.includes('PM') && !timeStr.includes('12')) {
        const hour = parseInt(timeStr.split(':')[0]) + 12;
        const minute = timeStr.split(':')[1].split(' ')[0];
        scheduledTime = `${hour.toString().padStart(2, '0')}:${minute}:00`;
      } else if (timeStr.includes('AM') && timeStr.includes('12')) {
        scheduledTime = `00:${timeStr.split(':')[1].split(' ')[0]}:00`;
      } else {
        const hour = timeStr.split(':')[0];
        const minute = timeStr.split(':')[1].split(' ')[0];
        scheduledTime = `${hour.padStart(2, '0')}:${minute}:00`;
      }

      const bookingData = {
        psychologist_id: selectedDoctor.id,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        package_id: selectedPackage.id
      };

      const response = await clientApi.bookRemainingSession(bookingData);

      if (response.success) {
        // Store package info for the success popup
        if (response.data?.packageInfo) {
          setPackageBookingInfo(response.data.packageInfo);
          setShowPackageBookingSuccess(true);
        } else {
          // Fallback to regular success message if packageInfo is not available
          setBookingSuccess(true);
          setTimeout(() => setBookingSuccess(false), 5000);
        }
        
        // Reset selections
        setSelectedDate(null);
        setSelectedTime(null);
      } else {
        showError(`Booking failed: ${response.message || 'Unknown error'}`, 'Booking Error');
      }
    } catch (error) {
      console.error('Remaining session booking error:', error);
      showError('Booking failed. Please try again.', 'Booking Error');
    } finally {
      setIsBooking(false);
    }
  };

  const toggleFAQ = (index) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  // Get FAQs from selectedDoctor
  const getFAQs = () => {
    if (!selectedDoctor) return [];
    const faqs = [];
    if (selectedDoctor.faq_question_1 && selectedDoctor.faq_answer_1) {
      faqs.push({ question: selectedDoctor.faq_question_1, answer: selectedDoctor.faq_answer_1 });
    }
    if (selectedDoctor.faq_question_2 && selectedDoctor.faq_answer_2) {
      faqs.push({ question: selectedDoctor.faq_question_2, answer: selectedDoctor.faq_answer_2 });
    }
    if (selectedDoctor.faq_question_3 && selectedDoctor.faq_answer_3) {
      faqs.push({ question: selectedDoctor.faq_question_3, answer: selectedDoctor.faq_answer_3 });
    }
    return faqs;
  };

  // Render FAQ item component (desktop version)
  const renderFAQItem = (faq, index) => (
    <div key={index} className="border-b border-gray-200 last:border-b-0">
      <button
        type="button"
        onClick={() => toggleFAQ(index)}
        className="flex w-full items-center justify-between py-3 md:py-4 text-left hover:bg-white transition-colors cursor-pointer"
      >
        <span className="faq-heading text-xs md:text-sm lg:text-base text-gray-900 w-full md:w-auto pr-2 md:pr-3 lg:pr-0">
          {faq.question}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-3 w-3 md:h-4 md:w-4 lg:h-5 lg:w-5 text-gray-800 transition-transform flex-shrink-0 ${openFAQ === index ? "rotate-180" : "rotate-0"}`}
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.19l3.71-2.96a.75.75 0 11.94 1.17l-4.24 3.38a.75.75 0 01-.94 0L5.27 8.34a.75.75 0 01-.04-1.13z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          openFAQ === index ? "max-h-96 md:max-h-64 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-0 pb-3 md:pb-4">
          <p className="faq-answer md:text-sm leading-relaxed text-gray-700">
            {faq.answer}
          </p>
        </div>
      </div>
    </div>
  );

  // Render FAQ item component (mobile version with different padding)
  const renderFAQItemMobile = (faq, index) => (
    <div key={index} className="border-b border-gray-200 last:border-b-0">
      <button
        type="button"
        onClick={() => toggleFAQ(index)}
        className="flex w-full items-center justify-between py-3 md:py-4 text-left hover:bg-white transition-colors px-2 md:px-0 cursor-pointer"
      >
        <span className="faq-heading text-xs md:text-sm lg:text-base text-gray-900 w-full md:w-auto pr-2 md:pr-3 lg:pr-0">
          {faq.question}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-3 w-3 md:h-4 md:w-4 lg:h-5 lg:w-5 text-gray-800 transition-transform flex-shrink-0 ${openFAQ === index ? "rotate-180" : "rotate-0"}`}
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.19l3.71-2.96a.75.75 0 11.94 1.17l-4.24 3.38a.75.75 0 01-.94 0L5.27 8.34a.75.75 0 01-.04-1.13z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          openFAQ === index ? "max-h-96 md:max-h-64 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-2 pb-3 md:px-0 md:pb-4">
          <p className="faq-answer md:text-sm leading-relaxed text-gray-700">
            {faq.answer}
          </p>
        </div>
      </div>
    </div>
  );

  const openTreatmentModal = (treatment) => {
    setSelectedTreatment(treatment);
    setShowTreatmentModal(true);
  };

  const closeTreatmentModal = () => {
    setShowTreatmentModal(false);
    setSelectedTreatment(null);
  };

  const handlePricingSelect = (pricing) => {
    setSelectedPricing(pricing);
  };



  // Scroll to top on page load/refresh and disable automatic scroll restoration
  useEffect(() => {
    // Disable browser's automatic scroll restoration
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    
    // Force scroll to top
    window.scrollTo(0, 0);
    
    // Cleanup: restore default behavior when component unmounts
    return () => {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'auto';
      }
    };
  }, []);

  useEffect(() => {
    fetchDoctors();
    
    // Pre-load Razorpay script to reduce lag when booking
    if (typeof window !== 'undefined' && !window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        console.log('✅ Razorpay script pre-loaded');
      };
      script.onerror = () => {
        console.warn('⚠️ Failed to pre-load Razorpay script, will load on demand');
      };
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (doctorParam !== null && doctors.length > 0) {
      // Find doctor by name slug (primary method)
      let doctor = doctors.find(doc => {
        const name = doc.name || `${doc.first_name || ''} ${doc.last_name || ''}`.trim();
        const docSlug = createSlug(name);
        return docSlug === doctorParam;
      });

      // Fallback: Try UUID if slug doesn't match (backward compatibility)
      if (!doctor) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(doctorParam);
        if (isUUID) {
          doctor = doctors.find(doc => doc.id === doctorParam);
        }
      }

      // Only set when switching to a different doctor (e.g. navigation). Don't overwrite merged data from fetchDoctors.
      if (doctor && selectedDoctor?.id !== doctor.id) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setSelectedDoctor(doctor);
      }
    }
  }, [doctorParam, doctors, selectedDoctor?.id]);

  useEffect(() => {
    if (selectedDoctor) {
      fetchPsychologistAvailability(selectedDoctor.id);
      fetchPsychologistPackages(selectedDoctor.id);
    }
  }, [selectedDoctor]);

  useEffect(() => {
    setChildSpecFuTiers({
      parent: DEFAULT_CHILD_SPEC_FU_TIER,
      child: DEFAULT_CHILD_SPEC_FU_TIER,
      family: DEFAULT_CHILD_SPEC_FU_TIER,
    });
  }, [selectedDoctor?.id]);

  useEffect(() => {
    if (selectedDoctor) {
      const designation = getDoctorDesignation(selectedDoctor);
      const langs = getDoctorLanguages(selectedDoctor);
      console.log('🪪 Therapist designation:', designation || '(empty)');
      console.log('🗣️ Therapist languages:', langs.length > 0 ? langs : '(none)');
    }
  }, [selectedDoctor]);

  useEffect(() => {
    if (!selectedDoctor?.id) return;
    if (detailsFetched[selectedDoctor.id]) return;

    // Always fetch details once per doctor so we get FAQs and full profile (designation/languages were optional skip)
    const fetchDetails = async () => {
      try {
        const response = await publicApi.getPsychologistDetails(selectedDoctor.id);
        if (response?.success && response.data?.psychologist) {
          setSelectedDoctor((prevDoctor) => ({
            ...prevDoctor,
            ...response.data.psychologist
          }));
        }
      } catch (error) {
        console.error('Failed to fetch detailed psychologist profile:', error);
      } finally {
        setDetailsFetched((prev) => ({
          ...prev,
          [selectedDoctor.id]: true
        }));
      }
    };

    fetchDetails();
  }, [
    selectedDoctor?.id,
    selectedDoctor?.designation,
    selectedDoctor?.languages,
    selectedDoctor?.languages_json,
    detailsFetched,
  ]);

  // Handle package_id parameter for booking remaining sessions
  useEffect(() => {
    if (packageIdFromQuery && isAuthenticated() && hasRole('client')) {
      fetchClientPackage(packageIdFromQuery);
    }
  }, [packageIdFromQuery, isAuthenticated, hasRole]);

  // Automatically select today's date if it exists in availability (even if no slots available)
  useEffect(() => {
    // Only auto-select if availability is loaded and no date is currently selected
    if (!loadingAvailability && Object.keys(psychologistAvailability).length > 0 && !selectedDate && selectedDoctor) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const dayStr = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${dayStr}`;
      
      const todayAvailability = psychologistAvailability[todayStr];
      
      // Auto-select today's date if it exists in availability (even if no slots available)
      // This allows showing "No available slots" message when appropriate
      if (todayAvailability) {
        // Automatically select today's date
        setSelectedDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
      }
    }
  }, [psychologistAvailability, loadingAvailability, selectedDate, selectedDoctor]);



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3f2e73] mx-auto mb-4"></div>
          <p className="font-bold text-gray-800 mb-4">Loading Psychologist Profile...</p>
        </div>
      </div>
    );
  }

  if (error || !selectedDoctor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="font-bold text-gray-800 mb-4">Doctor Not Found</p>
          <p className="text-gray-600 mb-4">{error || 'Unable to load doctor information'}</p>
          <button 
            onClick={() => router.push('/online-child-psychologist')}
            className="bg-[#3f2e73] hover:bg-[#1d1733] text-white px-6 py-2 rounded-lg transition-colors duration-200"
          >
            Back to Psychologists
          </button>
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-white -mt-0" style={{ marginTop: 0, paddingTop: 0, marginBottom: 0, paddingBottom: 0 }}>
      {/* Booking Loading Animation Overlay */}
      <AnimatePresence>
        {isBooking && <BookingLoadingAnimation />}
      </AnimatePresence>
      
      <style jsx>{`
        @media (min-width: 768px) and (max-width: 1180px) and (max-height: 1180px) {
          .therapist-header-padding {
            padding: 6rem 1.5rem 3rem !important;
          }
          .therapist-profile-image {
            width: 18rem !important;
            height: 18rem !important;
          }
          .therapist-content-padding {
            padding: 1.5rem !important;
          }
          .therapist-about-section {
            margin-top: 3rem !important;
          }
          .therapist-calendar-section {
            margin-top: 3rem !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }
        }
        /* Portrait tablet 810 x 1180 - add padding to FAQ */
        @media (min-width: 768px) and (max-width: 900px) and (max-height: 1180px) {
          .therapist-faq-mobile-section {
            padding-left: 3rem !important;
            padding-right: 3rem !important;
          }
          .therapist-faq-desktop-section {
            padding-left: 2rem !important;
            padding-right: 2rem !important;
          }
        }
      `}</style>
      {/* Header Section - Profile Card */}
      <div className="bg-white shadow-lg" style={{ marginTop: 0, paddingTop: 0 }}>
        <div className="w-full">
          {/* Top Section with Green Background */}
          <div className="w-screen max-w-[100vw] relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] px-6 md:px-12 pt-2 md:pt-3 pb-2 md:pb-3 therapist-header-padding" style={{ zIndex: 0, background: 'linear-gradient(to bottom, #f5f1ff, #eae4ff)', marginTop: 0, paddingTop: '24px' }}>
            
            {/* Mobile: Profile Picture at top */}
            <div className="relative z-10 flex items-center justify-center md:hidden h-full mt-20" style={{ pointerEvents: 'auto' }}>
              <div className="relative">
                <div className="w-48 h-52 rounded-[20px] overflow-hidden relative bg-white" style={{ paddingTop: '0', border: 'none' }}>
                  {/* Doctor Profile Picture or Fallback */}
                  {(selectedDoctor.profile_picture_url || selectedDoctor.cover_image_url ||
                    (selectedDoctor.name && (selectedDoctor.name.toLowerCase().includes('irene') ||
                                           selectedDoctor.name.toLowerCase().includes('marium')))) ? (
                    <img 
                      src={(() => {
                        const rawUrl = selectedDoctor.profile_picture_url || selectedDoctor.cover_image_url;
                        if (rawUrl) {
                          return normalizeImageUrl(rawUrl);
                        }
                        const name = selectedDoctor.name?.toLowerCase() || '';
                        if (name.includes('irene') || name.includes('marium')) return '/irene.jpeg';
                        if (name.includes('doug') || name.includes('douglas')) return '/doug.png';
                        if (name.includes('ashley') || name.includes('ash')) return '/mainlogo.webp';
                        if (name.includes('child') || name.includes('teen')) return '/kids.png';
                        return null;
                      })()}
                      alt={`${selectedDoctor.name || selectedDoctor.first_name} - Child psychologist profile photo`}
                    className="w-full h-full object-cover"
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
                      display: (selectedDoctor.profile_picture_url || selectedDoctor.cover_image_url ||
                                (selectedDoctor.name && (selectedDoctor.name.toLowerCase().includes('irene') || 
                                                       selectedDoctor.name.toLowerCase().includes('marium') ||
                                                       selectedDoctor.name.toLowerCase().includes('doug') ||
                                                       selectedDoctor.name.toLowerCase().includes('ashley') ||
                                                       selectedDoctor.name.toLowerCase().includes('child')))) ? 'none' : 'flex',
                      width: "100%",
                      height: "100%",
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "3rem",
                      fontWeight: "bold",
                      color: "#fff",
                      textShadow: "0 4px 16px rgba(0,0,0,0.5)"
                    }}
                  >
                    {selectedDoctor.name ? 
                      selectedDoctor.name.split(' ').map(n => n.charAt(0)).join('').toUpperCase() :
                      selectedDoctor.first_name ? 
                        selectedDoctor.first_name.charAt(0).toUpperCase() : 
                        'D'
                    }
                  </div>
                </div>
                
                {/* Experience text - Mobile positioning */}
                {selectedDoctor.experience_years && (
                <div className="absolute bottom-2 -right-2 bg-white/90 backdrop-blur-sm rounded-lg px-1.5 py-0.5 shadow-lg min-w-[90px]">
                  <p className="text-[10px] font-medium" style={{ color: '#3f2e73' }}>
                      <span className="font-semibold">{selectedDoctor.experience_years}+ yrs</span>
                  </p>
                </div>
                )}
              </div>
            </div>

          {/* Mobile: Doctor Name below image */}
            <div className="text-center md:hidden mb-6 mt-4">
              <div className="p-4 rounded-lg">
                <h2 className="text-3xl font-semibold mb-2">
                {selectedDoctor.name || `${selectedDoctor.first_name} ${selectedDoctor.last_name}`}
                </h2>
              <p className="text-sm text-gray-600" style={{ marginBottom: '0', marginTop: '0', lineHeight: '1.2' }}>
                {getDoctorDesignation(selectedDoctor)}
              </p>
              <p className="text-sm text-gray-800" style={{ marginTop: '4px', marginBottom: '0', lineHeight: '1.4' }}>
                {selectedDoctor.price ? `Starts at ₹${selectedDoctor.price}` : 'Pricing available upon request'}
              </p>
              </div>
            <div className="mt-4 space-y-4">
              {renderEducationSection()}
            </div>
          </div>
          
            {/* Desktop: Image and Name Section - Side by side */}
            <div className="hidden md:flex items-center gap-8 ml-32 mt-20">
          {/* Desktop: Profile Picture - Left aligned */}
              <div className="relative flex-shrink-0">
                <div className="w-80 h-88 rounded-[20px] overflow-hidden relative bg-white therapist-profile-image" style={{ border: 'none' }}>
                {/* Doctor Profile Picture or Fallback */}
                {(selectedDoctor.profile_picture_url || selectedDoctor.cover_image_url ||
                  (selectedDoctor.name && (selectedDoctor.name.toLowerCase().includes('irene') ||
                                         selectedDoctor.name.toLowerCase().includes('marium')))) ? (
                  <img 
                    src={(() => {
                      const rawUrl = selectedDoctor.profile_picture_url || selectedDoctor.cover_image_url;
                      if (rawUrl) {
                        return normalizeImageUrl(rawUrl);
                      }
                      const name = selectedDoctor.name?.toLowerCase() || '';
                      if (name.includes('irene') || name.includes('marium')) return '/irene.jpeg';
                      if (name.includes('doug') || name.includes('douglas')) return '/doug.png';
                      if (name.includes('ashley') || name.includes('ash')) return '/mainlogo.webp';
                      if (name.includes('child') || name.includes('teen')) return '/kids.png';
                      return null;
                    })()}
                    alt={`${selectedDoctor.name || selectedDoctor.first_name} - Child psychologist profile photo`}
                  className="w-full h-full object-cover"
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
                    display: (selectedDoctor.profile_picture_url || selectedDoctor.cover_image_url ||
                              (selectedDoctor.name && (selectedDoctor.name.toLowerCase().includes('irene') || 
                                                     selectedDoctor.name.toLowerCase().includes('marium') ||
                                                     selectedDoctor.name.toLowerCase().includes('doug') ||
                                                     selectedDoctor.name.toLowerCase().includes('ashley') ||
                                                     selectedDoctor.name.toLowerCase().includes('child')))) ? 'none' : 'flex',
                    width: "100%",
                    height: "100%",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "6rem",
                    fontWeight: "bold",
                    color: "#fff",
                    textShadow: "0 4px 16px rgba(0,0,0,0.5)"
                  }}
                >
                  {selectedDoctor.name ? 
                    selectedDoctor.name.split(' ').map(n => n.charAt(0)).join('').toUpperCase() :
                    selectedDoctor.first_name ? 
                      selectedDoctor.first_name.charAt(0).toUpperCase() : 
                      'D'
                  }
                </div>
              </div>
              
              {/* Experience text - Desktop positioning */}
              {selectedDoctor.experience_years && (
                <div className="absolute bottom-4 -right-8 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg min-w-[140px]">
                  <p className="text-xs font-medium" style={{ color: '#3f2e73' }}>
                    <span className="font-semibold">{selectedDoctor.experience_years}+ years of experience</span>
                </p>
              </div>
              )}
              </div>
              
              {/* Desktop: Name, Designation, and Pricing - Stacked */}
              <div className="flex-1">
                <div className="text-left">
                <div className="p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">
                    {selectedDoctor.name || `${selectedDoctor.first_name} ${selectedDoctor.last_name}`}
                  </h3>
                  <p className="text-lg text-gray-600 ">
                    {getDoctorDesignation(selectedDoctor)}
                  </p>
                  <p className="text-gray-800 text-sm" style={{ marginTop: '6px' }}>
                    <span className="font-medium">
                      {selectedDoctor.price ? `Starts at ₹${selectedDoctor.price}` : 'Pricing available upon request'}
                    </span>
                  </p>
                </div>
                <div className="mt-4 space-y-4 max-w-lg">
                  {renderEducationSection()}
                </div>
              </div>
            </div>
          </div>
          
            <div className="flex justify-center md:justify-end items-start mb-8 mt-4">
            {/* Action Buttons */}
            <div className="flex gap-2 md:gap-4">
              <button 
                  onClick={scrollToCalendar}
                  className="bg-[#3f2e73] hover:bg-[#1d1733] text-white font-semibold py-2 px-4 md:py-3 md:px-8 rounded-full transition-colors duration-200 shadow-lg text-sm md:text-base"
              >
                BOOK SESSION
              </button>
                <button 
                  onClick={handleShare}
                  className="relative w-10 h-10 md:w-12 md:h-12 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center transition-colors duration-200 border border-gray-300"
                >
                <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
                  <circle cx="18" cy="5" r="3"/>
                  <circle cx="6" cy="12" r="3"/>
                  <circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
                  {showShareTooltip && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-white text-gray-900 text-xs rounded-lg whitespace-nowrap z-50 shadow-lg border border-gray-200 animate-fade-in">
                      Link copied!
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-white"></div>
                    </div>
                  )}
              </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Calendar and About Section */}
      <div className="w-full p-4 md:p-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-12">
            {/* Left Side - About Description */}
            <div className="space-y-6 mt-[20px] md:mt-[40px] therapist-about-section">
              <p className="font-bold text-gray-800 mb-4">About {selectedDoctor.name || `${selectedDoctor.first_name} ${selectedDoctor.last_name}`}</p>
              <p className="text-gray-700 leading-relaxed mb-4 whitespace-pre-line">
                {selectedDoctor.description || "This doctor is passionate about helping people achieve mental wellness through evidence-based therapy and compassionate guidance."}
              </p>
              

              
              {/* Specialization */}
              {selectedDoctor.area_of_expertise && Array.isArray(selectedDoctor.area_of_expertise) && selectedDoctor.area_of_expertise.length > 0 && (
                <div className="p-4 rounded-lg">
                  <p className="font-semibold text-gray-800 mb-3">Specialization</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedDoctor.area_of_expertise.map((spec, i) => {
                      const colors = SPECIALIZATION_BUBBLE_COLORS[i % SPECIALIZATION_BUBBLE_COLORS.length];
                      return (
                        <div
                          key={i}
                          className="px-3 py-2 rounded-full text-sm font-medium"
                          style={{ backgroundColor: colors.bg, color: colors.text }}
                        >
                          {spec}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Personality Traits */}
              {(() => {
                const traits = getPersonalityTraits(selectedDoctor);
                if (!traits || traits.length === 0) return null;
                return (
                  <div className="p-4 rounded-lg">
                    <p className="font-semibold text-gray-800 mb-3">Personality Traits</p>
                    <div className="flex flex-wrap gap-2">
                      {traits.map((trait, i) => {
                        const colors = PERSONALITY_BUBBLE_COLORS[i % PERSONALITY_BUBBLE_COLORS.length];
                        return (
                          <div
                            key={i}
                            className="px-3 py-2 rounded-full text-sm font-medium"
                            style={{
                              backgroundColor: colors.bg,
                              color: colors.text,
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {trait}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              {/* Languages Section */}
              {renderLanguagesSection()}
              
              {/* FAQ Section - Desktop/Laptop View */}
              {getFAQs().length > 0 && (
                <div className="mt-20 hidden lg:block therapist-faq-desktop-section">
                <p className="font-semibold text-gray-800 mb-4">Frequently Asked Questions</p>
                <div className="space-y-0">
                    {getFAQs().map((faq, index) => renderFAQItem(faq, index))}
                      </div>
                    </div>
              )}
              
            </div>
            
            {/* Right Side - Calendar */}
            <div id="calendar-section" className="bg-white rounded-2xl p-4 md:p-6 max-w-md w-full mx-auto md:ml-32 self-start mt-[20px] md:mt-[40px] therapist-calendar-section" style={{ boxShadow: '0 25px 50px -12px rgba(63, 46, 115, 0.35), 0 10px 25px -5px rgba(63, 46, 115, 0.2)' }}>
              {/* Calendar Header */}
              <div className="text-center mb-4">
                <p className="font-bold text-gray-800 mb-1">Book Your Session</p>
                {!isChildSpecialistDoctor && (
                  <p className="text-gray-600 text-sm">Select a date and time that works for you</p>
                )}
                {loadingAvailability && (
                  <div className="mt-2 flex items-center justify-center text-xs" style={{ color: '#3f2e73' }}>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 mr-2" style={{ borderColor: '#3f2e73' }}></div>
                    Loading availability...
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-4">
              <div className={isChildSpecialistDoctor ? 'order-2' : 'order-1'}>
              {isChildSpecialistDoctor && (
                <p className="text-center text-gray-600 text-sm mb-2">
                  Select a date and time that works for you
                </p>
              )}
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-2">
                <button 
                  onClick={handlePrevMonth}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6"/>
                  </svg>
                </button>
                <p className="text-sm font-semibold text-gray-800">{getMonthName(currentDate)}</p>
                <button 
                  onClick={handleNextMonth}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </button>
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
                    
                                          // Check if this specific date is available for the psychologist
                      // Use local date formatting to avoid timezone conversion issues
                      const calendarDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                      const year = calendarDate.getFullYear();
                      const month = String(calendarDate.getMonth() + 1).padStart(2, '0');
                      const dayStr = String(calendarDate.getDate()).padStart(2, '0');
                      const dateStr = `${year}-${month}-${dayStr}`;
                      const dateAvailability = psychologistAvailability[dateStr];
                    
                    // Properly check if date is in the past
                    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    todayStart.setHours(0, 0, 0, 0);
                    calendarDate.setHours(0, 0, 0, 0);
                    const isPastDate = calendarDate < todayStart;
                    const isAvailable = !isPastDate;
                    
                    const isPsychologistAvailable = dateAvailability && (
                      (typeof dateAvailability.availableSlots === 'number' && dateAvailability.availableSlots > 0) ||
                      (Array.isArray(dateAvailability.timeSlots) && dateAvailability.timeSlots.some(slot => slot.available))
                    );
                    
                    // Only show highlight/available indicator if it's not a past date
                    const shouldHighlight = !!isPsychologistAvailable && !isPastDate;
                    const isActuallyAvailable = shouldHighlight && isAvailable;
                    
                    calendarDays.push(
                      <div
                        key={`day-${day}`}
                        onClick={() => {
                          // Allow clicking on any future date, not just those with availability
                          if (isAvailable) {
                            handleDateSelect(day);
                          }
                        }}
                        className={`text-center py-1 rounded-lg transition-all duration-200 text-xs ${
                          isSelected
                            ? 'bg-[#3f2e73] text-white font-bold shadow-lg cursor-pointer border border-[#3f2e73]'
                            : (isToday && isActuallyAvailable)
                              ? 'bg-[#6d5ba8] text-white font-semibold shadow-md cursor-pointer border border-[#6d5ba8]'
                              : isToday
                                ? 'bg-[#eae4ff] text-[#3f2e73] font-semibold cursor-pointer border border-[#d8ccff]'
                              : isActuallyAvailable
                                ? 'bg-[#f0edff] text-[#3f2e73] font-semibold cursor-pointer border border-[#3f2e73] hover:bg-[#e3dcff]'
                              : isAvailable
                                ? 'text-[#3f2e73] cursor-pointer border border-transparent hover:bg-[#f6f3ff]'
                                : 'text-gray-300 cursor-not-allowed'
                        }`}
                        title={isPsychologistAvailable && !isPastDate ? (isToday ? 'Today - Available for booking' : 'Available for booking') : isAvailable ? 'Click to check availability' : 'Past date'}
                      >
                        {day}
                        {shouldHighlight && (
                          <div
                            className={`w-2 h-2 rounded-full mx-auto mt-1 shadow-sm ${
                              isSelected 
                                ? 'bg-[#f0edff]' 
                                : (isToday && isActuallyAvailable)
                                  ? 'bg-white'
                                  : 'bg-[#3f2e73]'
                            }`}
                          ></div>
                        )}
                      </div>
                    );
                  }
                  
                  return calendarDays;
                })()}
              </div>
              
              {/* Calendar Legend */}
              

              {/* Time Slots */}
              <div className="space-y-4">
                {selectedDate ? (
                                      (() => {
                      // Use local date formatting to avoid timezone conversion issues
                      const year = selectedDate.getFullYear();
                      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                      const dayStr = String(selectedDate.getDate()).padStart(2, '0');
                      const dateStr = `${year}-${month}-${dayStr}`;
                    const dateAvailability = psychologistAvailability[dateStr];
                    const allTimeSlots = Array.isArray(dateAvailability?.timeSlots)
                      ? [...dateAvailability.timeSlots].sort((a, b) => {
                          const aMinutes = getSlotMinutes(a);
                          const bMinutes = getSlotMinutes(b);
                          return (aMinutes ?? Infinity) - (bMinutes ?? Infinity);
                        })
                      : [];
                    const availableSlots = allTimeSlots
                      .filter(slot => slot.available && !isSlotInPast(slot, selectedDate))
                      .map(slot => formatSlotDisplayTime(slot))
                      .filter(Boolean);
                    const hadAvailableSlots = allTimeSlots.some(slot => slot.available);
                    

                    
                    if (!dateAvailability || !allTimeSlots.length) {
                      return (
                        <div className="text-center py-8">
                          <div className="text-gray-500 text-sm">
                            <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p>No available time slot for this date</p>
                            <p className="text-xs mt-1">Please select another date</p>
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <div className="space-y-2">
                        {/* Available Time Slots */}
                        {availableSlots.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-[#3f2e73]">
                              Available Times
                              <span className="ml-1">
                                (IST)
                              </span>
                            </p>
                            <div className="grid grid-cols-3 md:grid-cols-5 gap-1">
                              {availableSlots.map((time) => (
                                <button
                                  key={time}
                                  onClick={() => handleTimeSelect(time)}
                                  className={`p-2 rounded-lg border text-xs transition-all duration-200 w-full h-10 flex items-center justify-center ${
                                    selectedTime === time
                                      ? 'border-[#3f2e73] bg-[#3f2e73] text-white font-bold shadow-lg' 
                                      : 'border-gray-300 bg-white hover:border-[#3f2e73] text-gray-700'
                                  }`}
                                >
                                  {time}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : hadAvailableSlots ? (
                          <div className="text-center py-3 text-xs text-gray-500">
                            <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p style={{ lineHeight: '1.1', margin: 0 }}>All earlier slots for today have passed.</p>
                            <p style={{ lineHeight: '1.1', marginTop: '2px' }}>Please pick another time or date.</p>
                          </div>
                        ) : (
                          <div className="text-center py-6 text-xs text-gray-500">
                            <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="font-medium">No available slots</p>
                            <p className="mt-1">Please select another date</p>
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v16a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
              </div>

                {/* Package Selection or Package Information */}
                <div className={isChildSpecialistDoctor ? 'order-1' : 'order-2'}>
                <div className={`mb-4 ${isChildSpecialistDoctor ? 'mt-0' : 'mt-6'}`}>
                {isBookingRemaining && clientPackage ? (
                  // Show package information when booking remaining sessions
                  <div>
                    <p className="font-semibold text-gray-800 mb-3 text-sm">Your Package</p>
                    <div className="p-4 rounded-lg border border-[#3f2e73] bg-[#f5f1ff] text-[#3f2e73] shadow-md">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-left">
                          <span className="font-semibold text-base">
                            {clientPackage.display_name ||
                              (clientPackage.package_type
                                ? clientPackage.package_type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
                                : 'Package')}
                          </span>
                          <span className="ml-2 text-xs bg-[#eae4ff] text-[#3f2e73] px-2 py-1 rounded-full">
                            Remaining Sessions
                          </span>
                        </div>
                        <span className="font-bold text-lg">Already Paid</span>
                      </div>
                      <div className="text-left text-gray-600 text-xs">
                        <p>Package purchased on {new Date(clientPackage.purchased_at).toLocaleDateString()}</p>
                        <p className="mt-1 font-medium">
                          {clientPackage.remaining_sessions} of {clientPackage.total_sessions} sessions remaining
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Show package selection for new bookings
                  <>
                    <p className="text-sm font-medium text-[#3f2e73] mb-3">Select Package</p>
                    
                    {/* Child specialist before psychiatrist so titles like Neuropsychiatrist still get CS packages */}
                    {isChildSpecialistDoctor ? (
                      loadingPackages ? (
                        <div className="text-center py-6">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3f2e73] mx-auto" />
                          <p className="text-gray-500 text-xs mt-2">Loading session options…</p>
                        </div>
                      ) : childSpecInitPackages.length > 0 ? (
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-semibold text-[#3f2e73] mb-2">Initial session</p>
                          <div className="space-y-1">
                            {childSpecInitPackages.map((pkg) => {
                              const suffix = /^cs_init_(parent|child|family)$/.exec(
                                pkg.package_type || ''
                              )?.[1];
                              const label =
                                suffix && CHILD_SPEC_VARIANT_LABELS[suffix]
                                  ? `${CHILD_SPEC_VARIANT_LABELS[suffix]} (${CHILD_SPEC_INITIAL_SESSION_DURATION[suffix]})`
                                  : pkg.name;
                              return (
                                <button
                                  key={pkg.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedPackage(pkg);
                                    setSelectedPrice(pkg.price);
                                    setMissingFields((prev) =>
                                      prev.filter((f) => f !== 'Package')
                                    );
                                  }}
                                  className={`p-2 rounded-lg border text-sm transition-all duration-200 w-full text-left ${
                                    selectedPackage?.id === pkg.id
                                      ? 'border-[#3f2e73] bg-[#f5f1ff] text-[#3f2e73] shadow-md'
                                      : 'border-gray-300 hover:border-[#3f2e73] text-gray-700 hover:shadow-sm'
                                  }`}
                                >
                                  <div className="flex justify-between items-center gap-2">
                                    <span className="font-semibold text-sm">{label}</span>
                                    <span className="font-bold text-base shrink-0">
                                      ₹{pkg.price}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div className="flex items-center my-1">
                          <div className="flex-1 border-t border-gray-300" />
                          <span className="px-3 text-xs text-gray-500 font-medium">OR</span>
                          <div className="flex-1 border-t border-gray-300" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#3f2e73] mb-2">
                            Follow-up package
                          </p>
                          <div className="space-y-1.5">
                            {CHILD_SPEC_FU_SUFFIXES.map((suffix) => {
                              const tier =
                                childSpecFuTiers[suffix] || DEFAULT_CHILD_SPEC_FU_TIER;
                              const fuPkg = packages.find(
                                (p) => p.package_type === `cs_fu_${tier}_${suffix}`
                              );
                              if (!fuPkg) return null;
                              const selected = selectedPackage?.id === fuPkg.id;
                              const selectFuRow = () => {
                                setSelectedPackage(fuPkg);
                                setSelectedPrice(fuPkg.price);
                                setMissingFields((prev) =>
                                  prev.filter((f) => f !== 'Package')
                                );
                              };
                              return (
                                <div
                                  key={suffix}
                                  role="button"
                                  tabIndex={0}
                                  onClick={selectFuRow}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      selectFuRow();
                                    }
                                  }}
                                  className={`rounded-lg border py-1.5 px-2 text-sm transition-colors w-full text-left cursor-pointer ${
                                    selected
                                      ? 'border-[#3f2e73] bg-[#f5f1ff] text-[#3f2e73] shadow-sm'
                                      : 'border-gray-300 bg-white hover:border-[#3f2e73]/60'
                                  }`}
                                >
                                  <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                                    <span className="font-semibold text-gray-900">
                                      {`${CHILD_SPEC_VARIANT_LABELS[suffix]} (${CHILD_SPEC_FOLLOWUP_SESSION_DURATION[suffix]})`}
                                    </span>
                                    <div
                                      className="flex flex-wrap items-center gap-1.5 sm:justify-end"
                                      onClick={(e) => e.stopPropagation()}
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onKeyDown={(e) => e.stopPropagation()}
                                      role="presentation"
                                    >
                                      <ChildSpecSessionSelect
                                        compact
                                        ariaLabel={`Sessions for ${CHILD_SPEC_VARIANT_LABELS[suffix]}, ${CHILD_SPEC_FOLLOWUP_SESSION_DURATION[suffix]} per session`}
                                        value={tier}
                                        options={CHILD_SPEC_FU_TIER_OPTIONS}
                                        onChange={(e) => {
                                          const nextTier = e.target.value;
                                          const nextPkg = packages.find(
                                            (p) =>
                                              p.package_type === `cs_fu_${nextTier}_${suffix}`
                                          );
                                          setChildSpecFuTiers((prev) => ({
                                            ...prev,
                                            [suffix]: nextTier,
                                          }));
                                          if (nextPkg) {
                                            setSelectedPackage(nextPkg);
                                            setSelectedPrice(nextPkg.price);
                                            setMissingFields((prev) =>
                                              prev.filter((f) => f !== 'Package')
                                            );
                                          }
                                        }}
                                      />
                                      <span className="font-bold text-sm text-[#3f2e73] px-1.5 py-0.5 rounded-md">
                                        ₹{fuPkg.price}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      ) : (
                        <p className="text-xs text-amber-800 text-center py-2">
                          Child specialist packages are not available yet. Please refresh the page or contact support.
                        </p>
                      )
                    ) : getDoctorDesignation(selectedDoctor).toLowerCase().includes('psychiatrist') ? (
                      <>
                        <button
                          onClick={() => {
                            const price15 = selectedDoctor.psychiatrist_15min_price || selectedDoctor.price;
                            setSelectedPackage({
                              id: 'individual-15',
                              name: 'Individual Session (15 min)',
                              description: 'One 15-minute psychiatrist session',
                              session_count: 1,
                              price: price15,
                              package_type: 'individual_15',
                              discount_percentage: 0
                            });
                            setSelectedPrice(price15);
                            setMissingFields(prev => prev.filter(f => f !== 'Package'));
                          }}
                          className={`p-2 rounded-lg border text-sm transition-all duration-200 w-full text-left ${
                            selectedPackage?.id === 'individual-15'
                              ? 'border-[#3f2e73] bg-[#f5f1ff] text-[#3f2e73] shadow-md' 
                              : 'border-gray-300 hover:border-[#3f2e73] text-gray-700 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div className="text-left">
                              <span className="font-semibold text-sm">Individual Session (15 min)</span>
                            </div>
                            <span className="font-bold text-base">
                              ₹{selectedDoctor.psychiatrist_15min_price || selectedDoctor.price}
                            </span>
                          </div>
                        </button>

                        <button
                          onClick={() => {
                            const price30 = selectedDoctor.psychiatrist_30min_price || selectedDoctor.price;
                            setSelectedPackage({
                              id: 'individual-30',
                              name: 'Individual Session (30 min)',
                              description: 'One 30-minute psychiatrist session',
                              session_count: 1,
                              price: price30,
                              package_type: 'individual_30',
                              discount_percentage: 0
                            });
                            setSelectedPrice(price30);
                            setMissingFields(prev => prev.filter(f => f !== 'Package'));
                          }}
                          className={`mt-1 p-2 rounded-lg border text-sm transition-all duration-200 w-full text-left ${
                            selectedPackage?.id === 'individual-30'
                              ? 'border-[#3f2e73] bg-[#f5f1ff] text-[#3f2e73] shadow-md' 
                              : 'border-gray-300 hover:border-[#3f2e73] text-gray-700 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div className="text-left">
                              <span className="font-semibold text-sm">Individual Session (30 min)</span>
                            </div>
                            <span className="font-bold text-base">
                              ₹{selectedDoctor.psychiatrist_30min_price || selectedDoctor.price}
                            </span>
                          </div>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedPackage({
                            id: 'individual',
                            name: 'Individual Session',
                            description: 'One therapy session',
                            session_count: 1,
                            price: selectedDoctor.price,
                            package_type: 'individual',
                            discount_percentage: 0
                          });
                          setSelectedPrice(selectedDoctor.price);
                          setMissingFields((prev) => prev.filter((f) => f !== 'Package'));
                        }}
                        className={`p-2 rounded-lg border text-sm transition-all duration-200 w-full text-left ${
                          selectedPackage?.id === 'individual'
                            ? 'border-[#3f2e73] bg-[#f5f1ff] text-[#3f2e73] shadow-md'
                            : 'border-gray-300 hover:border-[#3f2e73] text-gray-700 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="text-left">
                            <span className="font-semibold text-sm">Individual Session</span>
                          </div>
                          <span className="font-bold text-base">₹{selectedDoctor.price}</span>
                        </div>
                      </button>
                    )}
                    {/* Dynamic Packages from Database */}
                    {loadingPackages ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#3f2e73] mx-auto"></div>
                        <p className="text-gray-500 text-xs mt-2">Loading packages...</p>
                      </div>
                    ) : !isChildSpecialistDoctor &&
                      packages.some(
                        (pkg) =>
                          pkg.session_count > 1 && !String(pkg.package_type || '').startsWith('cs_')
                      ) ? (
                      <>
                        <div className="flex items-center my-4">
                          <div className="flex-1 border-t border-gray-300"></div>
                          <span className="px-3 text-xs text-gray-500 font-medium">OR</span>
                          <div className="flex-1 border-t border-gray-300"></div>
                        </div>
                        <div className="space-y-1">
                          {packages
                            .filter(
                              (pkg) =>
                                pkg.session_count > 1 &&
                                !String(pkg.package_type || '').startsWith('cs_')
                            )
                            .map((pkg) => (
                              <button
                                key={pkg.id}
                                onClick={() => {
                                  setSelectedPackage(pkg);
                                  setSelectedPrice(pkg.price);
                                  setMissingFields((prev) => prev.filter((f) => f !== 'Package'));
                                }}
                                className={`p-2 rounded-lg border text-sm transition-all duration-200 w-full text-left ${
                                  selectedPackage?.id === pkg.id
                                    ? 'border-[#3f2e73] bg-[#f5f1ff] text-[#3f2e73] shadow-md'
                                    : 'border-gray-300 hover:border-[#3f2e73] text-gray-700 hover:shadow-sm'
                                }`}
                              >
                                <div className="flex justify-between items-center">
                                  <div className="text-left">
                                    <span className="font-semibold text-sm">
                                      {pkg.name}
                                      {getDoctorDesignation(selectedDoctor)
                                        .toLowerCase()
                                        .includes('psychiatrist') && pkg.session_count > 1
                                        ? ` (${pkg.session_count} × 15 min)`
                                        : ''}
                                    </span>
                                    {pkg.discount_percentage > 0 && (
                                      <span className="ml-2 text-xs bg-[#eae4ff] text-[#3f2e73] px-1 py-0.5 rounded-full">
                                        Save {pkg.discount_percentage}%
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-bold text-base">₹{pkg.price}</span>
                                </div>
                              </button>
                            ))}
                        </div>
                      </>
                    ) : null}
                  </>
                )}
              </div>
              </div>
              </div>

              {/* Missing Fields Message */}
              {missingFields.length > 0 && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-xs text-center">
                    Please select: {missingFields.join(', ')}
                  </p>
                </div>
              )}

              {/* Book Button */}
              <button 
                onClick={handleBookSession}
                disabled={isBooking}
                className={`w-full mt-4 py-2 px-4 rounded-lg font-semibold transition-colors duration-200 text-sm ${
                  isBooking
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-[#3f2e73] text-white hover:bg-[#1d1733]'
                }`}
              >
                {isBooking ? 'Booking...' : isBookingRemaining ? 'Book Remaining Session' : `Book ${bookButtonPackageLabel(selectedPackage)}`}
              </button>

              {/* Success Message */}
              {bookingSuccess && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-700 text-sm text-center">
                    ✅ Session booked successfully! You will receive a confirmation email.
                  </p>
                </div>
              )}
              
            </div>
          </div>
        </div>
      </div>
      
      {/* FAQ Section - Mobile View */}
      <div className="w-full px-4 lg:px-6 pb-0 bg-white lg:hidden therapist-faq-mobile-section" style={{ marginTop: '4rem' }}>
        <div className="max-w-6xl mx-auto">
          <style dangerouslySetInnerHTML={{__html: `
            @media (max-width: 767px) {
              .faq-heading {
                font-size: 16px !important;
                font-weight: 400 !important;
                line-height: 1.4;
              }
              .faq-answer {
                font-size: 14px !important;
                line-height: 1.5;
              }
            }
          `}} />
          {getFAQs().length > 0 && (
          <div className="mt-6">
            <p className="font-semibold text-gray-800 mb-4">Frequently Asked Questions</p>
            <div className="space-y-0">
                {getFAQs().map((faq, index) => renderFAQItemMobile(faq, index))}
                  </div>
                </div>
          )}
        </div>
      </div>
      
      {/* Support Contact Section */}
      <div className="w-screen max-w-[100vw] relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] h-auto md:h-[100px] bg-[#3f2e73] flex items-center justify-center py-4 md:py-0 mt-8 md:mt-12" style={{ marginBottom: 0 }}>
        <p className="text-white text-xs md:text-sm text-center px-4 support-contact-text">
          If you didn&apos;t find what you were looking for, please reach out to us at hey@koott.com or +91-9539007766. We&apos;re here for you - for anything you might need.
        </p>
        <style dangerouslySetInnerHTML={{__html: `
          @media (max-width: 767px) {
            .support-contact-text {
              line-height: 1.2 !important;
              font-size: 10px !important;
            }
          }
        `}} />
      </div>
      {/* Treatment Method Modal */}
      {showTreatmentModal && selectedTreatment && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="bg-blue-50 rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="p-4 md:p-8">
              {/* Header with centered title and close button */}
              <div className="flex justify-between items-center mb-4 md:mb-6">
                <p className="font-bold text-gray-800 text-center flex-1">Treatment Method</p>
                <button
                  onClick={closeTreatmentModal}
                  className="text-gray-500 hover:text-gray-700 transition-colors duration-200 ml-4"
                >
                  <svg className="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              
              {/* Treatment title */}
              <p className="font-bold text-gray-800 mb-3 md:mb-4">
                {selectedTreatment}
              </p>
              
              {/* Description */}
              <p className="text-gray-700 leading-relaxed mb-4 md:mb-6 text-sm md:text-base">
                This treatment method is designed to help clients achieve their mental wellness goals through evidence-based approaches and compassionate care.
              </p>
              
              {/* Action button */}
              <div className="flex justify-center">
                <button
                  onClick={closeTreatmentModal}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 md:px-8 md:py-3 rounded-lg transition-colors duration-200 font-semibold text-xs md:text-sm uppercase tracking-wide"
                >
                  Got it, thanks
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Completion Warning Modal removed - contact details collected during signup */}

      {/* Auth modal for unauthenticated booking */}
      {showAuth && (
      <AuthModal
        open={showAuth}
        defaultTab="signup"
        preventReload={pendingBookingAfterAuth} // Prevent page reload when booking is pending
        signupButtonText={pendingBookingAfterAuth ? "Proceed to pay" : "Create account"} // Change button text when booking is pending
        onAuthSuccess={async () => {
            // After successful signup/login, check if there are pending booking details
            const savedBooking = localStorage.getItem('pendingBookingDetails');
            
            if (savedBooking && pendingBookingAfterAuth) {
              // Close modal immediately after signup succeeds
            setShowAuth(false);
              
              // Restore booking details from localStorage
              try {
                const bookingDetails = JSON.parse(savedBooking);
                  // Restore date
                  if (bookingDetails.date) {
                    const restoredDate = new Date(
                      bookingDetails.date.year,
                      bookingDetails.date.month,
                      bookingDetails.date.day
                    );
                    setSelectedDate(restoredDate);
                  }
                  // Restore time
                  if (bookingDetails.time) {
                    setSelectedTime(bookingDetails.time);
                  }
                  // Restore package
                  if (bookingDetails.package) {
                    setSelectedPackage(bookingDetails.package);
                    setSelectedPrice(bookingDetails.package.price);
                  }
                  // Restore booking remaining flag
                  if (bookingDetails.isBookingRemaining !== undefined) {
                    setIsBookingRemaining(bookingDetails.isBookingRemaining);
                  }
                  
                  // Clear saved booking details
                  localStorage.removeItem('pendingBookingDetails');
                  
                  // Wait for auth state to update, then proceed with booking
                  // The login() function updates the auth context, so we wait a bit for React to re-render
                  // Check localStorage directly since React context might not update immediately
                  const checkStoredAuth = () => {
                    try {
                      // Use loadAuthData from authStorage to check properly (it checks both localStorage and sessionStorage)
                      try {
                        const authData = loadAuthData();
                        if (authData && authData.token && authData.user) {
                          const hasRole = authData.user?.role === 'client';
                          console.log('✅ Found auth in storage:', { 
                            hasRole, 
                            role: authData.user?.role, 
                            email: authData.user?.email,
                            storage: authData.remember ? 'localStorage' : 'sessionStorage',
                            hasToken: !!authData.token
                          });
                          return hasRole;
                        }
                        
                        console.log('❌ No auth data found in storage');
                        // Log all storage keys for debugging
                        console.log('🔍 Storage keys:', {
                          localStorage: Object.keys(localStorage).filter(k => 
                            k.toLowerCase().includes('auth') || 
                            k.toLowerCase().includes('token') || 
                            k.toLowerCase().includes('user')
                          ),
                          sessionStorage: Object.keys(sessionStorage).filter(k => 
                            k.toLowerCase().includes('auth') || 
                            k.toLowerCase().includes('token') || 
                            k.toLowerCase().includes('user')
                          )
                        });
                        return false;
              } catch (e) {
                        console.error('Error checking auth storage:', e);
                        return false;
                      }
                    } catch (e) {
                      console.error('Error checking stored auth:', e);
                      return false;
                    }
                  };
                  
                  // Start checking immediately, then continue checking
                  let attempts = 0;
                  const maxAttempts = 100; // 10 seconds max
                  
                  const checkAuth = setInterval(() => {
                    attempts++;
                    const storedAuthReady = checkStoredAuth();
                    // Also check context, but prioritize localStorage since it's updated immediately
                    const contextAuthReady = isAuthenticated() && hasRole('client') && user;
                    
                    console.log(`🔍 Checking auth state (attempt ${attempts}/${maxAttempts}):`, {
                      storedAuthReady,
                      contextAuthReady,
                      isAuthenticated: isAuthenticated(),
                      hasRole: hasRole('client'),
                      hasUser: !!user,
                      hasToken: !!token,
                      localStorageKeys: Object.keys(localStorage).filter(k => k.includes('auth'))
                    });
                    
                    // If we have auth in localStorage, proceed (even if React context hasn't updated)
                    // API calls use localStorage directly, so they'll work
                    if (storedAuthReady && attempts >= 3) {
                      clearInterval(checkAuth);
                      console.log('✅ Auth found in localStorage, proceeding with booking...');
                      console.log('⚠️ Note: React context may not be updated yet, but API calls will use localStorage');
                      setPendingBookingAfterAuth(false);
                      
                      // Force a small delay to let React catch up, then proceed
                      setTimeout(() => {
                        console.log('🚀 Calling handleBookSession...');
                        console.log('🔍 Current booking state:', {
                          selectedDate: selectedDate ? `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}` : null,
                          selectedTime,
                          selectedPackage: selectedPackage?.name,
                          selectedDoctor: selectedDoctor?.id,
                          isBookingRemaining
                        });
                        
                        // Ensure we have all required data
                        if (!selectedDate || !selectedTime || (!isBookingRemaining && !selectedPackage)) {
                          console.error('❌ Missing booking data:', {
                            selectedDate: !!selectedDate,
                            selectedTime: !!selectedTime,
                            selectedPackage: !!selectedPackage,
                            isBookingRemaining
                          });
                          showError('Booking data was lost. Please select date, time, and package again.', 'Booking Error');
                          return;
                        }
                        
                        // Temporarily bypass auth checks since we know auth is in localStorage
                        // The API calls will work because backendApi reads from localStorage
                        console.log('🚀 Proceeding with booking - auth is in localStorage');
                        handleBookSession();
            }, 300);
                    } else if (contextAuthReady) {
                      // Context is ready, proceed immediately
                      clearInterval(checkAuth);
                      console.log('✅ Auth context ready, proceeding with booking...');
                      setPendingBookingAfterAuth(false);
                      
                      // Modal already closed, proceed with booking
                      setTimeout(() => {
                        console.log('🚀 Calling handleBookSession...');
                        handleBookSession();
                      }, 200);
                    } else if (attempts >= maxAttempts) {
                      clearInterval(checkAuth);
                      console.error('❌ Auth state did not update in time after signup');
                      console.error('❌ Final check:', {
                        storedAuthReady,
                        contextAuthReady,
                        localStorage: checkStoredAuth(),
                        allLocalStorageKeys: Object.keys(localStorage)
                      });
                      showError('Authentication failed. Please refresh the page and try booking again.', 'Auth Error');
                      setPendingBookingAfterAuth(false);
                    }
                  }, 100);
                } catch (error) {
                  console.error('Error restoring booking details:', error);
                  setPendingBookingAfterAuth(false);
                }
            } else {
              // No pending booking - normal auth flow (shouldn't happen from therapist page, but handle it)
              setPendingBookingAfterAuth(false);
              setShowAuth(false);
            }
          }}
          onClose={() => {
            setShowAuth(false);
            setPendingBookingAfterAuth(false);
            setMissingFields([]);
            // Clear saved booking if user closes modal
            localStorage.removeItem('pendingBookingDetails');
          }}
        />
      )}

      {/* Quick contact modal removed - contact details collected during signup */}

      {/* Package Booking Success Modal */}
      <AnimatePresence>
        {showPackageBookingSuccess && packageBookingInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
            onClick={() => {
              setShowPackageBookingSuccess(false);
              router.push('/profile/sessions');
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '32px',
                maxWidth: '500px',
                width: '100%',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                position: 'relative'
              }}
            >
              {/* Success Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px'
                }}
              >
                <motion.svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                >
                  <motion.path
                    d="M5 13l4 4L19 7"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </motion.svg>
              </motion.div>

              {/* Title */}
              <h2
                style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#1f2937',
                  textAlign: 'center',
                  marginBottom: '16px'
                }}
              >
                Package Session Booked!
              </h2>

              {/* Package Status */}
              <div
                style={{
                  backgroundColor: '#f5f1ff',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '24px',
                  textAlign: 'center'
                }}
              >
                <p
                  style={{
                    fontSize: '16px',
                    color: '#6b7280',
                    marginBottom: '12px'
                  }}
                >
                  Package Progress
                </p>
                <div
                  style={{
                    fontSize: '32px',
                    fontWeight: 'bold',
                    color: '#3f2e73',
                    marginBottom: '8px'
                  }}
                >
                  {packageBookingInfo.completedSessions || 0}/{packageBookingInfo.totalSessions || 0}
                </div>
                <p
                  style={{
                    fontSize: '14px',
                    color: '#6b7280'
                  }}
                >
                  {packageBookingInfo.completedSessions || 0} session{packageBookingInfo.completedSessions !== 1 ? 's' : ''} booked • {packageBookingInfo.remainingSessions || 0} remaining
                </p>
              </div>

              {/* Message */}
              <p
                style={{
                  fontSize: '16px',
                  color: '#4b5563',
                  textAlign: 'center',
                  marginBottom: '24px',
                  lineHeight: '1.5'
                }}
              >
                Your session has been successfully booked! You'll be redirected to your sessions page shortly.
              </p>

              {/* Close Button */}
              <button
                onClick={() => {
                  setShowPackageBookingSuccess(false);
                  router.push('/profile/sessions');
                }}
                style={{
                  width: '100%',
                  padding: '12px 24px',
                  backgroundColor: '#3f2e73',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d1733'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3f2e73'}
              >
                View My Sessions
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

// Loading fallback component
const TherapistProfileLoading = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <p className="font-bold text-gray-800 mb-4">Loading...</p>
    </div>
  </div>
);

// Main component with route params
export default function TherapistProfilePage({ params }) {
  const [doctorSlug, setDoctorSlug] = React.useState(null);
  const [packageId, setPackageId] = React.useState(null);

  React.useEffect(() => {
    // Get params asynchronously (Next.js 15+)
    if (params && typeof params.then === 'function') {
      params.then((resolvedParams) => {
        setDoctorSlug(resolvedParams.slug);
        // Check for package_id in URL search params if needed
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const pkgId = urlParams.get('package_id');
          if (pkgId) setPackageId(pkgId);
        }
      });
    } else if (params) {
      setDoctorSlug(params.slug);
      // Check for package_id in URL search params if needed
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const pkgId = urlParams.get('package_id');
        if (pkgId) setPackageId(pkgId);
      }
    }
  }, [params]);

  if (!doctorSlug) {
    return <TherapistProfileLoading />;
  }

  return (
    <Suspense fallback={<TherapistProfileLoading />}>
      <TherapistProfileContent slug={doctorSlug} packageId={packageId} />
    </Suspense>
  );
}
