"use client";

import React, { useEffect, useMemo, useState } from 'react';
import AuthModal from '@/components/AuthModal';
import QuickContactModal from '@/components/QuickContactModal';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { publicApi, clientApi, paymentApi } from '@/lib/backendApi';
import { isClientContactComplete } from '@/lib/contactValidation';
import { useRouter } from 'next/navigation';

export default function AssessmentBookingModal({ open, onClose, assessment, doctorIds = [] }) {
  const { user, isAuthenticated, hasRole } = useAuth();
  const { showError, showWarning, showSuccess } = useNotification();
  const router = useRouter();

  const [showAuth, setShowAuth] = useState(false);
  const [showQuickContact, setShowQuickContact] = useState(false);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null); // { time, doctorId }
  const [availabilityMap, setAvailabilityMap] = useState({}); // { [date]: Array<{ time, doctorId }> }
  const [loading, setLoading] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('online'); // 'online' or 'cash'

  // Helper function to format dates as YYYY-MM-DD using local formatting (IST)
  const dateStr = (d) => {
    if (!d) return '';
    if (typeof d === 'string') {
      // If it's already a YYYY-MM-DD string, return as is
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
      // If it's an ISO string, extract just the date part
      return d.split('T')[0];
    }
    const date = d instanceof Date ? d : new Date(d);
    // Use local formatting to avoid timezone conversion issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Merge availability from two doctors for visible month
  const monthRange = useMemo(() => {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    // Use local formatting to avoid timezone conversion issues
    const startYear = start.getFullYear();
    const startMonth = String(start.getMonth() + 1).padStart(2, '0');
    const startDay = String(start.getDate()).padStart(2, '0');
    const endYear = end.getFullYear();
    const endMonth = String(end.getMonth() + 1).padStart(2, '0');
    const endDay = String(end.getDate()).padStart(2, '0');
    return {
      start: `${startYear}-${startMonth}-${startDay}`,
      end: `${endYear}-${endMonth}-${endDay}`
    };
  }, [currentDate]);

  useEffect(() => {
    if (!open) return;
    async function loadAvailability() {
      try {
        setLoading(true);
        // Parse doctorIds - might be a JSON string from database
        let ids = Array.isArray(doctorIds) ? doctorIds : [];
        if (typeof doctorIds === 'string') {
          try {
            ids = JSON.parse(doctorIds);
          } catch (e) {
            console.warn('Failed to parse doctorIds as JSON:', e);
          }
        }
        ids = ids.filter(id => id).slice(0, 2); // Remove null/undefined and limit to 2
        
        console.log('🔍 AssessmentBookingModal - doctorIds prop:', doctorIds);
        console.log('🔍 AssessmentBookingModal - parsed ids:', ids);
        
        if (ids.length === 0) {
          // fallback: pick first two public doctors
          const docs = await publicApi.getPsychologists();
          const arr = docs?.data?.psychologists?.slice(0, 2)?.map(d => d.id) || [];
          ids.push(...arr);
          console.log('🔍 AssessmentBookingModal - using fallback doctors:', ids);
        }
        
        console.log('🔍 AssessmentBookingModal - fetching availability for', ids.length, 'doctors');
        const days = {};
        
        // Fetch availability for each doctor in parallel
        const availabilityPromises = ids.map(async (id) => {
          try {
            console.log('🔍 Fetching availability for doctor:', id);
            const res = await publicApi.getPsychologistAvailabilityRange(id, monthRange.start, monthRange.end);
            // API returns: { success: true, data: { data: [...] } }
            const items = res?.data?.data || res?.data?.availability || [];
            console.log('🔍 Availability response for doctor', id, ':', {
              responseKeys: Object.keys(res?.data || {}),
              itemsCount: items.length,
              firstItem: items[0] || null
            });
            console.log('🔍 Availability for doctor', id, ':', items.length, 'days');
            return { id, items };
          } catch (error) {
            console.error('Error fetching availability for doctor', id, ':', error);
            return { id, items: [] };
          }
        });
        
        const results = await Promise.all(availabilityPromises);
        
        console.log('🔍 AssessmentBookingModal - availability results:', results.map(r => ({
          id: r.id,
          itemsCount: r.items.length,
          firstItem: r.items[0] || null,
          firstItemKeys: r.items[0] ? Object.keys(r.items[0]) : [],
          firstItemSlots: r.items[0]?.time_slots || r.items[0]?.slots || r.items[0]?.timeSlots || 'N/A'
        })));
        
        // Merge all availability and keep track of which doctor owns each slot
        results.forEach(({ id, items }) => {
          items.forEach((it) => {
            // Normalize date format - handle different possible formats
            let date = it.date || it.day || it.scheduled_date;
            if (!date) {
              console.warn('⚠️ Missing date in availability item:', it);
              return;
            }
            
            // Ensure date is in YYYY-MM-DD format
            if (date instanceof Date) {
              date = dateStr(date);
            } else if (typeof date === 'string') {
              // Handle ISO strings like "2025-11-01T00:00:00.000Z"
              if (date.includes('T')) {
                date = date.split('T')[0];
              }
              // Ensure format is YYYY-MM-DD
              if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                try {
                  date = dateStr(new Date(date));
                } catch (e) {
                  console.warn('Invalid date format:', date, e);
                  return;
                }
              }
            }
            
            // Extract slots - prioritize available_slots if present (filtered by backend), otherwise use time_slots
            let slots = [];
            if (it.available_slots && Array.isArray(it.available_slots) && it.available_slots.length > 0) {
              slots = it.available_slots; // Backend has already filtered out booked slots
            } else if (it.time_slots && Array.isArray(it.time_slots)) {
              slots = it.time_slots; // Use time_slots (should be filtered by backend)
            } else if (it.slots && Array.isArray(it.slots)) {
              slots = it.slots;
            } else if (it.timeSlots && Array.isArray(it.timeSlots)) {
              slots = it.timeSlots;
            } else if (it.available_time_slots && Array.isArray(it.available_time_slots)) {
              slots = it.available_time_slots;
            } else if (it.availableSlots && Array.isArray(it.availableSlots)) {
              slots = it.availableSlots;
            }
            
            console.log(`🔍 Processing date ${date}: slots=${slots.length}, slotType=${Array.isArray(slots) ? 'array' : typeof slots}, firstSlot=${slots[0] || 'none'}, hasAvailableSlots=${!!it.available_slots}, hasTimeSlots=${!!it.time_slots}`);
            
            if (slots.length === 0) {
              // Ensure we still track the date to highlight “no timeslots”
              if (!days[date]) days[date] = new Map();
              return;
            }
            
            if (!days[date]) days[date] = new Map(); // time -> doctorId
            slots.forEach((s) => {
              if (!s) return;
              const slotValue = typeof s === 'string' ? s : (s.displayTime || s.time || s);
              if (!slotValue) return;
              // If multiple doctors have same time, prefer first unassigned then keep existing
              if (!days[date].has(slotValue)) {
                days[date].set(slotValue, id);
              }
              console.log(`✅ Added slot ${slotValue} for doctor ${id} on ${date}`);
            });
          });
        });
        
        // Convert to { date: [{ time, doctorId }] }
        const merged = Object.fromEntries(
          Object.entries(days).map(([k, v]) => [
            k,
            Array.from(v.entries()).map(([time, doctorId]) => ({ time, doctorId }))
          ])
        );
        console.log('🔍 AssessmentBookingModal - merged availability:', Object.keys(merged).length, 'days');
        console.log('🔍 AssessmentBookingModal - availability dates:', Object.keys(merged).sort());
        console.log('🔍 AssessmentBookingModal - sample availability:', Object.entries(merged).slice(0, 3).map(([date, slots]) => ({ date, slots: slots.slice(0, 3) })));
        setAvailabilityMap(merged);
      } catch (e) {
        console.error('Failed to load availability:', e);
      } finally {
        setLoading(false);
      }
    }
    loadAvailability();
  }, [open, doctorIds, monthRange.start, monthRange.end]);

  if (!open) return null;

  const changeMonth = (delta) => {
    const next = new Date(currentDate);
    next.setMonth(currentDate.getMonth() + delta);
    setCurrentDate(next);
  };

  // Get today's date using local formatting (IST)
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
  const todayDay = String(today.getDate()).padStart(2, '0');
  const todayStr = `${todayYear}-${todayMonth}-${todayDay}`;

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    return { firstDay, lastDay, days };
  }, [currentDate]);

  const handleSelectDate = (d) => {
    setSelectedDate(d);
    setSelectedTime(null);
    setSelectedSlot(null);
  };

  const proceedWithBooking = async () => {
    if (!selectedDate || !selectedTime) {
      showWarning('Select date and time');
      return;
    }

    setIsBooking(true);
    try {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const dayStr = String(selectedDate.getDate()).padStart(2, '0');
      const scheduledDate = `${year}-${month}-${dayStr}`;
      
      // Convert time to 24-hour format
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
      
      // Choose the doctor tied to the selected slot/time; fallback to the first doctor id
      let selectedDoctorId = selectedSlot?.doctorId || (doctorIds && doctorIds.length > 0 ? doctorIds[0] : null);
      
      if (!selectedDoctorId) {
        showError('No doctor assigned for this assessment. Please contact support.', 'Booking Error');
        setIsBooking(false);
        return;
      }

      // Reserve slot for assessment
      const reservationData = {
        assessment_id: assessment?.id,
        assessment_slug: assessment?.slug || assessment?.hero_title?.toLowerCase().replace(/\s+/g, '-'),
        psychologist_id: selectedDoctorId,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
      };

      console.log('🔍 Attempting to reserve assessment slot:', {
        endpoint: '/clients/assessments/reserve-slot',
        data: reservationData,
        assessment: {
          id: assessment?.id,
          slug: assessment?.slug,
          hero_title: assessment?.hero_title
        },
        isAuthenticated,
        userId: user?.id
      });

      let slotReservation;
      try {
        slotReservation = await clientApi.reserveAssessmentSlot(reservationData);
        console.log('🔍 Slot reservation response:', slotReservation);
      } catch (error) {
        console.error('🔍 Slot reservation error:', error);
        // Check if it's an assessment not found error
        if (error.message?.includes('Assessment not found')) {
          showError('Assessment not found. Please refresh the page and try again.', 'Assessment Error');
        } else if (error.message?.includes('time slot is already booked') || error.message?.includes('already booked')) {
          showError('This time slot is already booked. Please select another date and time.', 'Slot Unavailable');
          // Clear selection so user can choose again
          setSelectedDate(null);
          setSelectedTime(null);
        } else if (error.message?.includes('Resource not found') || error.message?.includes('endpoint does not exist')) {
          showError('Assessment booking endpoint not found. Please ensure the backend server is running and the route is registered.', 'Endpoint Not Found');
        } else if (error.message?.includes('Session expired') || error.message?.includes('Authentication')) {
          showError('Session expired. Please log in again.', 'Authentication Error');
          setShowAuth(true);
        } else {
          showError(`Reservation failed: ${error.message || 'Unknown error'}`, 'Reservation Error');
        }
        setIsBooking(false);
        return;
      }
      
      if (!slotReservation || !slotReservation.success) {
        console.error('🔍 Slot reservation failed:', {
          success: slotReservation?.success,
          statusCode: slotReservation?.statusCode,
          message: slotReservation?.message,
          error: slotReservation?.error,
          fullResponse: slotReservation
        });
        
        const statusCode = slotReservation?.statusCode;
        const errorMsg = slotReservation?.message || slotReservation?.error || 'Unknown error';
        
        if (statusCode === 401) {
          showError('Session expired. Please log in again.', 'Authentication Error');
          setShowAuth(true);
          setPendingBooking(true);
        } else if (statusCode === 403) {
          showError('Only clients can book assessments.', 'Access Denied');
          setShowAuth(true);
          setPendingBooking(true);
        } else if (statusCode === 404) {
          showError(`Assessment booking endpoint not found. Please contact support.`, 'Not Found');
        } else {
          showError(`Reservation failed: ${errorMsg}`, 'Reservation Error');
        }
        setIsBooking(false);
        return;
      }

      // Get client profile for payment
      const prof = await clientApi.getProfile();
      const clientProfile = prof?.data;

      // Create payment order
      const paymentData = {
        scheduledDate: scheduledDate,
        scheduledTime: scheduledTime,
        psychologistId: selectedDoctorId,
        clientId: slotReservation.data.clientId,
        amount: slotReservation.data.amount,
        packageId: null, // Assessment bookings don't use packages, set to null
        sessionType: 'Assessment Session',
        clientName: `${clientProfile?.first_name || ''} ${clientProfile?.last_name || ''}`.trim(),
        clientEmail: user?.email || clientProfile?.email || `${slotReservation.data.clientId}@placeholder.koott.in`,
        clientPhone: clientProfile?.phone_number,
        assessmentSessionId: slotReservation.data.assessmentSessionId,
        assessmentType: 'assessment',
        paymentMethod: paymentMethod // 'online' or 'cash'
      };

      // If cash payment, handle directly without Razorpay checkout
      if (paymentMethod === 'cash') {
        const cashPaymentResponse = await paymentApi.createCashPayment(paymentData);
        if (cashPaymentResponse.success) {
          showSuccess('Assessment booked successfully! Payment will be collected in cash.', 'Booking Successful');
          onClose();
          // Refresh page or reload data
          window.location.reload();
        } else {
          showError(cashPaymentResponse.message || 'Failed to process cash payment. Please try again.', 'Payment Error');
        }
        setIsBooking(false);
        return;
      }

      const paymentResponse = await paymentApi.createPaymentOrder(paymentData);

      if (paymentResponse.success) {
        console.log('✅ Payment response successful, opening Razorpay checkout...');
        
        // Load Razorpay checkout script if not already loaded
        if (!window.Razorpay) {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          
          // Add timeout for script loading (10 seconds)
          const scriptLoadTimeout = setTimeout(() => {
            if (!window.Razorpay) {
              console.error('❌ Razorpay script load timeout - upstream server not responding');
              showError(
                'Payment gateway script is taking too long to load. This may be due to network issues or Razorpay server problems. Please check your internet connection and try again.',
                'Script Load Timeout'
              );
              setIsBooking(false);
              // Remove script if it failed to load
              if (script.parentNode) {
                script.parentNode.removeChild(script);
              }
            }
          }, 10000);
          
          script.onload = () => {
            clearTimeout(scriptLoadTimeout);
            console.log('✅ Razorpay script loaded successfully');
            openRazorpayCheckout(paymentResponse.data);
          };
          
          script.onerror = () => {
            clearTimeout(scriptLoadTimeout);
            console.error('❌ Failed to load Razorpay checkout script - upstream server timeout');
            showError(
              'Failed to load payment gateway. This may be due to network issues or Razorpay server problems. Please check your internet connection and try again.',
              'Script Load Error'
            );
            setIsBooking(false);
            // Remove script on error
            if (script.parentNode) {
              script.parentNode.removeChild(script);
            }
          };
          
          document.body.appendChild(script);
        } else {
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
                isIOS: /iPhone|iPad|iPod/i.test(navigator.userAgent)
              });
              
              // Store payment details in sessionStorage as backup (for iPhone)
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
                setIsBooking(false);
            },
            modal: {
              ondismiss: function() {
                console.log('Payment modal closed');
                setIsBooking(false);
              }
            }
          };

          const rzp = new window.Razorpay(options);
          
          // Handle Razorpay initialization errors
          rzp.on('payment.error', function (response) {
            console.error('❌ Razorpay payment error:', response);
            let errorMessage = 'Payment gateway error occurred';
            
            if (response.error?.description) {
              errorMessage = response.error.description;
            } else if (response.error?.code === 'NETWORK_ERROR' || response.error?.code === 'TIMEOUT') {
              errorMessage = 'Payment gateway is taking too long to respond. Please check your internet connection and try again.';
            }
            
            showError(errorMessage, 'Payment Error');
            setIsBooking(false);
          });
          
          rzp.on('payment.failed', function (response) {
            console.error('❌ Razorpay payment failed:', response);
            
            // Provide user-friendly error message based on error type
            let errorMessage = 'Payment failed. Please try again.';
            if (response.error?.reason === 'payment_risk_check_failed') {
              errorMessage = 'Payment was declined due to security checks. Please try again with a different payment method or contact support if this persists.';
            } else if (response.error?.code === 'BAD_REQUEST_ERROR' && response.error?.description) {
              errorMessage = response.error.description;
            } else if (response.error?.description) {
              errorMessage = response.error.description;
            }
            
            // Always show error to user
            showError(errorMessage, 'Payment Failed');
            setIsBooking(false);
            
            // Send failure to backend (non-blocking)
            fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api'}/payment/failure`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_order_id: response.error?.metadata?.order_id || response.razorpay_order_id,
                error: response.error
              })
            }).catch(err => {
              console.error('Failed to send failure notification to backend:', err);
              // Don't show this error to user - backend failure notification is not critical
            });
          });
          
          // Track if checkout opened successfully
          let checkoutOpened = false;
          let openTimeout;
          
          // Add timeout for Razorpay checkout window opening
          openTimeout = setTimeout(() => {
            if (!checkoutOpened) {
              console.warn('⚠️ Razorpay checkout is taking too long to open - upstream server timeout');
              showError(
                'Payment gateway is taking too long to load. This may be due to network issues or Razorpay server problems. Please try again in a few moments or contact support if this persists.',
                'Connection Timeout'
              );
              setIsBooking(false);
            }
          }, 20000); // 20 second timeout (increased from 15s)
          
          // Handle successful checkout opening
          rzp.on('payment.open', function() {
            checkoutOpened = true;
            if (openTimeout) {
              clearTimeout(openTimeout);
            }
            console.log('✅ Razorpay checkout opened successfully');
          });
          
          // Handle checkout window close (user dismissed)
          rzp.on('payment.close', function() {
            if (openTimeout) {
              clearTimeout(openTimeout);
            }
            console.log('ℹ️ Razorpay checkout closed by user');
            setIsBooking(false);
          });
          
          try {
            rzp.open();
            console.log('📤 Razorpay checkout opening...');
          } catch (openError) {
            if (openTimeout) {
              clearTimeout(openTimeout);
            }
            console.error('❌ Failed to open Razorpay checkout:', openError);
            showError(
              'Failed to open payment gateway. This may be a temporary issue. Please try again or contact support if the problem persists.',
              'Payment Error'
            );
            setIsBooking(false);
          }
        }
      } else {
        showError('Failed to create payment order. Please try again.', 'Payment Error');
        setIsBooking(false);
      }
      
    } catch (error) {
      console.error('Assessment booking error:', error);
      showError(error?.message || 'Failed to book assessment. Please try again.', 'Booking Error');
    } finally {
      setIsBooking(false);
    }
  };

  const handleBook = async () => {
    // 1) Auth check first → show login/signup popup if needed
    if (!isAuthenticated || !user) {
      setShowAuth(true);
      return;
    }

    // 2) Role check
    if (!hasRole('client')) {
      showError('Only clients can book assessments.', 'Access Denied');
      return;
    }

    // 3) Basic selections
    if (!selectedDate || !selectedTime) {
      showWarning('Please select a date and time', 'Selection Required');
      return;
    }

    // 4) Check if client contact information is complete
    try {
      const clientProfileResponse = await clientApi.getProfile();
      const clientProfile = clientProfileResponse.data;
      
      if (!isClientContactComplete(clientProfile)) {
        setShowQuickContact(true);
        return;
      }
    } catch (error) {
      console.error('Error checking client profile:', error);
      showError('Unable to verify profile completion. Please try again.', 'Profile Error');
      return;
    }

    // 5) Proceed to assessment booking + payment
    await proceedWithBooking();
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm" onClick={(e)=>{ if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h6 className="m-0">{assessment?.hero_title || 'Assessment Booking'}</h6>
            <p className="text-xs text-gray-500 m-0">Select a suitable date and time</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5">
          {/* Left side - Time slots */}
          <div className="flex flex-col">
            {selectedDate ? (
              <>
                <div className="text-sm font-medium text-gray-900 mb-4">
                  Available times (IST) for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                    {(availabilityMap[dateStr(selectedDate)] || []).map((slot) => (
                      <button
                        key={`${slot.time}-${slot.doctorId}`}
                        type="button"
                        onClick={()=>{ setSelectedTime(slot.time); setSelectedSlot(slot); }}
                        className={`p-2 rounded-lg border text-xs transition-all duration-200 w-full h-10 flex items-center justify-center ${
                          selectedTime === slot.time && selectedSlot?.doctorId === slot.doctorId
                            ? 'bg-[#3f2e73] text-white border-[#3f2e73]'
                            : 'border-gray-300 bg-white hover:border-gray-400 text-gray-700'
                        }`}
                      >{slot.time}</button>
                    ))}
                  </div>
                  {(!availabilityMap[dateStr(selectedDate)] || availabilityMap[dateStr(selectedDate)].length === 0) && (
                    <div className="text-center text-sm text-gray-500 py-8">No times available for this date</div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-gray-500">
                Select a date to see available times
              </div>
            )}
          </div>
          
          {/* Right side - Calendar */}
          <div className="flex flex-col space-y-4">
            {/* Payment Method Selection - Only show if cash payment is allowed */}
            {assessment?.allow_cash_payment && selectedDate && selectedTime && (
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Payment Method</label>
                <div className="flex gap-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="online"
                      checked={paymentMethod === 'online'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="text-purple-600"
                    />
                    <span className="text-sm">Online Payment</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cash"
                      checked={paymentMethod === 'cash'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="text-purple-600"
                    />
                    <span className="text-sm">Cash Payment</span>
                  </label>
                </div>
                {paymentMethod === 'cash' && (
                  <p className="text-xs text-gray-500 mt-2">Payment will be collected in cash at the time of session.</p>
                )}
              </div>
            )}
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              {/* Calendar header */}
              <div className="flex items-center justify-between mb-3">
                <button className="px-2 py-1 border rounded" onClick={()=>changeMonth(-1)}>&lt;</button>
                <div className="text-sm font-medium">{currentDate.toLocaleString('default', { month: 'long' })} {currentDate.getFullYear()}</div>
                <button className="px-2 py-1 border rounded" onClick={()=>changeMonth(1)}>&gt;</button>
              </div>
              {/* Days grid */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 text-gray-600">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=> (<div key={d}>{d}</div>))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: daysInMonth.firstDay.getDay() }).map((_, idx) => (
                  <div key={`pad-${idx}`} />
                ))}
                {daysInMonth.days.map((d) => {
                  const ds = dateStr(d);
                  const exists = Object.prototype.hasOwnProperty.call(availabilityMap, ds);
                  const times = Array.isArray(availabilityMap[ds]) ? availabilityMap[ds] : [];
                  const has = times.length > 0;
                  const isPast = ds < todayStr;
                  const selected = selectedDate && dateStr(selectedDate) === ds;
                  
                  // Debug logging for first few dates and dates with availability
                  if (d.getDate() <= 5 || has) {
                    console.log(`🔍 Date ${ds}: has=${has}, slots=${availabilityMap[ds]?.length || 0}, isPast=${isPast}, availableDates=${Object.keys(availabilityMap).slice(0, 3).join(', ')}`);
                  }
                  
                  return (
                    <button
                      key={ds}
                      type="button"
                      disabled={!has || isPast}
                      onClick={()=>handleSelectDate(d)}
                      className={`rounded-md py-2 text-sm border ${
                        selected
                          ? 'bg-[#3f2e73] text-white border-[#3f2e73]'
                          : has && !isPast
                            ? 'border-gray-300 hover:bg-gray-50 bg-blue-50'
                            : 'border-gray-200 text-gray-300'
                      }`}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Continue button */}
            <div className="mt-6">
              <button 
                className="w-full px-6 py-2.5 rounded-md bg-[#3f2e73] text-white font-medium disabled:opacity-60 disabled:cursor-not-allowed transition-colors" 
                disabled={!selectedDate || !selectedTime || isBooking} 
                onClick={handleBook}
              >
                {isBooking ? 'Processing...' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Auth and quick contact */}
      {showAuth && (
        <AuthModal
          open={showAuth}
          onAuthSuccess={async () => {
            // After successful signup/login, check if contact details are complete
            setShowAuth(false);
            setTimeout(async () => {
              try {
                const clientProfileResponse = await clientApi.getProfile();
                const clientProfile = clientProfileResponse.data;
                if (!isClientContactComplete(clientProfile)) {
                  // Show quick contact modal to collect profile details
                  setShowQuickContact(true);
                } else {
                  // Profile complete → proceed with booking if selections made
                  if (selectedDate && selectedTime) {
                    await proceedWithBooking();
                  }
                }
              } catch (e) {
                // If check fails, show quick contact modal
                console.error('Error checking profile after auth:', e);
                setShowQuickContact(true);
              }
            }, 300);
          }}
          onClose={() => {
            setShowAuth(false);
          }}
        />
      )}
      {showQuickContact && (
        <QuickContactModal
          open={showQuickContact}
          onClose={() => {
            setShowQuickContact(false);
          }}
          onSaved={async () => {
            setShowQuickContact(false);
            // After saving contact details, proceed with booking if selections made
            if (selectedDate && selectedTime) {
              await proceedWithBooking();
            }
          }}
        />
      )}
    </div>
  );
}


