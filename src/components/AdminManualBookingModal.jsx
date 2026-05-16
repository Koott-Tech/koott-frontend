'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
  Clock, 
  X, 
  User,
  UserCheck,
  Package,
  DollarSign,
  Loader2,
  CalendarDays,
  CheckCircle,
  XCircle,
  Lock,
  Eye,
  EyeOff,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminApi } from '@/lib/backendApi';
import { publicApi } from '@/lib/backendApi';
import { useNotification } from '@/contexts/NotificationContext';
import { validatePassword } from '@/utils/passwordValidation';

export default function AdminManualBookingModal({ 
  isOpen, 
  onClose, 
  onBookingSuccess,
  recordOnly = false  // When true: add session record only, no Meet creation, no notifications; existing client only + optional meet link
}) {
  const { showError, showSuccess } = useNotification();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const isSubmittingRef = useRef(false); // Ref to prevent duplicate submissions
  const [error, setError] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [failureMessage, setFailureMessage] = useState('');
  
  // Client mode: 'existing' or 'new'
  const [isNewClient, setIsNewClient] = useState(false);
  
  // Form data - Existing client selection
  const [clientId, setClientId] = useState('');
  
  // Form data - New client creation
  const [newClientData, setNewClientData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    country_code: '+91',
    child_name: '',
    child_age: '',
    password: '' // Optional: client login password. If empty, a random one is generated.
  });
  const [showNewClientPassword, setShowNewClientPassword] = useState(false);
  
  // Form data - Booking
  const [psychologistId, setPsychologistId] = useState('');
  const [packageId, setPackageId] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentReceivedDate, setPaymentReceivedDate] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentScreenshotUrl, setPaymentScreenshotUrl] = useState('');
  const [paymentScreenshotName, setPaymentScreenshotName] = useState('');
  const [isUploadingPaymentScreenshot, setIsUploadingPaymentScreenshot] = useState(false);
  const [notes, setNotes] = useState('');
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  
  // Dropdown data
  const [clients, setClients] = useState([]);
  const [psychologists, setPsychologists] = useState([]);
  const [packages, setPackages] = useState([]);
  const [psychologistAvailability, setPsychologistAvailability] = useState({});
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateObj, setSelectedDateObj] = useState(null); // Store as Date object
  const [searchClient, setSearchClient] = useState('');
  const [searchPsychologist, setSearchPsychologist] = useState('');
  const [meetLink, setMeetLink] = useState(''); // For recordOnly: optional Meet link if created elsewhere
  const [status, setStatus] = useState('booked'); // For recordOnly: session status (booked, completed, cancelled, no_show, rescheduled)
  const [therapistCommission, setTherapistCommission] = useState('');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      resetForm();
      fetchInitialData();
    }
  }, [isOpen]);

  // Debug: Log loading states
  useEffect(() => {
    console.log('🔍 Loading states changed:', { isLoading, isLoadingData });
  }, [isLoading, isLoadingData]);

  // Fetch psychologist availability when psychologist changes or month changes
  useEffect(() => {
    if (psychologistId) {
      fetchPsychologistAvailability();
    }
  }, [psychologistId, currentDate]);

  // Fetch packages when psychologist changes; default to Individual Session
  useEffect(() => {
    if (psychologistId) {
      setPackageId(''); // Default to Individual Session when psychologist is selected/changed
      fetchPackages();
    } else {
      setPackages([]);
      setPackageId('');
    }
  }, [psychologistId]);

  // Update amount when package changes
  useEffect(() => {
    if (packageId && packages.length > 0) {
      const selectedPackage = packages.find(pkg => pkg.id === packageId);
      if (selectedPackage) {
        setAmount(selectedPackage.price.toString());
      }
    } else if (psychologistId && !packageId) {
      // Individual session by default: set amount to psychologist's individual session price
      const psych = psychologists.find(p => p.id === psychologistId);
      const individualPrice = psych?.individual_session_price ?? psych?.price;
      if (individualPrice != null && individualPrice !== '') {
        setAmount(String(individualPrice));
      }
    }
  }, [packageId, packages, psychologistId, psychologists]);

  // Handle auto-zero pricing for cancellations and refunds in recordOnly mode
  useEffect(() => {
    if (recordOnly && (status === 'cancelled' || status === 'refund_request')) {
      setAmount('0');
    }
  }, [status, recordOnly]);

  const resetForm = () => {
    setIsNewClient(false);
    setClientId('');
    setNewClientData({
      email: '',
      first_name: '',
      last_name: '',
      phone_number: '',
      country_code: '+91',
      child_name: '',
      child_age: '',
      password: ''
    });
    setPsychologistId('');
    setPackageId('');
    setSelectedDateObj(null);
    setSelectedTime('');
    setAmount('');
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    setPaymentReceivedDate(`${y}-${m}-${d}`);
    setPaymentMethod('cash');
    setPaymentScreenshotUrl('');
    setPaymentScreenshotName('');
    setIsUploadingPaymentScreenshot(false);
    setNotes('');
    setError(null);
    setPsychologistAvailability({});
    setCurrentDate(new Date());
    setSearchClient('');
    setSearchPsychologist('');
    setMeetLink('');
    setStatus('booked');
    setTherapistCommission('');
    setShowSuccessModal(false);
    setShowFailureModal(false);
    setFailureMessage('');
    setShowNewClientPassword(false);
    isSubmittingRef.current = false; // Reset submission flag when form resets
  };

  const handleNewClientInputChange = (field, value) => {
    setNewClientData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generateRandomPassword = () => {
    // Generate a secure random password (12 characters)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const fetchInitialData = async () => {
    console.log('🔄 Starting to fetch initial data...');
    setIsLoadingData(true);
    try {
      // Fetch clients and psychologists in parallel
      const [clientsRes, psychologistsRes] = await Promise.all([
        adminApi.getUsers({ role: 'client', limit: 100 }),
        adminApi.getPsychologists({ limit: 100 })
      ]);

      console.log('📦 Initial data fetched:', { clientsSuccess: clientsRes.success, psychologistsSuccess: psychologistsRes.success });

      if (clientsRes.success) {
        // Get all clients (from users and clients table)
        const clientList = clientsRes.data?.users || clientsRes.data || [];
        // Filter to only clients
        const filteredClients = clientList.filter(user => user.role === 'client' || !user.role);
        setClients(filteredClients);
        console.log('✅ Clients set:', filteredClients.length);
      }

      if (psychologistsRes.success) {
        // API returns { users: [...], pagination: {...} }
        const psychologistsList = psychologistsRes.data?.users || psychologistsRes.data?.psychologists;
        if (Array.isArray(psychologistsList)) {
          setPsychologists(psychologistsList);
          console.log('✅ Psychologists set:', psychologistsList.length);
        } else if (Array.isArray(psychologistsRes.data)) {
          setPsychologists(psychologistsRes.data);
          console.log('✅ Psychologists set (alt):', psychologistsRes.data.length);
        } else {
          setPsychologists([]);
          console.log('⚠️ Psychologists set to empty array');
        }
      } else {
        setPsychologists([]);
        console.log('⚠️ Psychologists response failed, set to empty');
      }
    } catch (error) {
      console.error('❌ Error fetching initial data:', error);
      showError('Failed to load clients or psychologists', 'Load Error');
    } finally {
      console.log('✅ Setting isLoadingData to false');
      setIsLoadingData(false);
    }
  };

  const fetchPackages = async () => {
    if (!psychologistId) return;
    
    try {
      const response = await publicApi.getPsychologistPackages(psychologistId);
      if (response.success && response.data.packages) {
        setPackages(response.data.packages);
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
    }
  };

  const fetchPsychologistAvailability = async () => {
    if (!psychologistId) {
      console.log('⚠️ [ADMIN BOOKING] No psychologist ID, skipping availability fetch');
      return;
    }

    try {
      setLoadingAvailability(true);
      console.log('🔄 [ADMIN BOOKING] Fetching availability for psychologist:', psychologistId);
      
      // Get month range using local formatting
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      
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

      console.log('📅 [ADMIN BOOKING] Fetching availability range:', startDate, 'to', endDate);

      const response = await adminApi.getPsychologistAvailabilityForReschedule(
        psychologistId, 
        startDate, 
        endDate
      );

      console.log('📦 [ADMIN BOOKING] Availability response:', {
        success: response.success,
        hasData: !!response.data,
        hasAvailability: !!response.data?.availability,
        availabilityLength: response.data?.availability?.length || 0,
        firstItem: response.data?.availability?.[0] || null
      });

      if (response.success && response.data && response.data.availability) {
        const availabilityObject = {};
        response.data.availability.forEach(dayAvailability => {
          if (dayAvailability.date) {
            availabilityObject[dayAvailability.date] = dayAvailability;
            console.log(`✅ [ADMIN BOOKING] Added availability for ${dayAvailability.date}:`, {
              available_slots: dayAvailability.available_slots?.length || 0,
              time_slots: dayAvailability.time_slots?.length || 0,
              is_available: dayAvailability.is_available
            });
          }
        });
        setPsychologistAvailability(availabilityObject);
        console.log('✅ [ADMIN BOOKING] Availability loaded:', Object.keys(availabilityObject).length, 'days');
      } else {
        console.warn('⚠️ [ADMIN BOOKING] Invalid response format:', response);
        setPsychologistAvailability({});
      }
    } catch (error) {
      console.error('❌ [ADMIN BOOKING] Error fetching availability:', error);
      setPsychologistAvailability({});
    } finally {
      setLoadingAvailability(false);
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
    setSelectedDateObj(null);
    setSelectedTime('');
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    setCurrentDate(newDate);
    setSelectedDateObj(null);
    setSelectedTime('');
  };

  const handleDateSelect = (day) => {
    const newSelectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDateObj(newSelectedDate);
    setSelectedTime(''); // Reset time when date changes
  };

  const handleTimeSelect = (time) => {
    setSelectedTime(time);
  };

  const handlePaymentScreenshotChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a JPG, PNG, WebP, or GIF image');
      e.target.value = '';
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError('Payment screenshot must be 15MB or smaller');
      e.target.value = '';
      return;
    }

    setError(null);
    setIsUploadingPaymentScreenshot(true);

    try {
      const response = await adminApi.uploadImage(file);
      if (!response?.success || !response?.url) {
        throw new Error(response?.message || response?.error || 'Failed to upload payment screenshot');
      }

      setPaymentScreenshotUrl(response.url);
      setPaymentScreenshotName(file.name);
    } catch (uploadError) {
      console.error('Payment screenshot upload failed:', uploadError);
      setPaymentScreenshotUrl('');
      setPaymentScreenshotName('');
      setError(uploadError.message || 'Failed to upload payment screenshot');
      e.target.value = '';
    } finally {
      setIsUploadingPaymentScreenshot(false);
    }
  };

  const getAvailableSlotsForDate = (dateObj) => {
    if (!dateObj) return [];
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dayStr = String(dateObj.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayStr}`;
    const dayAvailability = psychologistAvailability[dateStr];
    
    if (!dayAvailability) return [];
    
    // Admin API returns: { date, is_available, time_slots, booked_times, available_slots }
    // Therapist profile uses: { date, timeSlots: [{time, available, displayTime}], availableSlots }
    if (dayAvailability.available_slots && Array.isArray(dayAvailability.available_slots)) {
      // Admin API format - available_slots is already filtered
      return dayAvailability.available_slots;
    } else if (dayAvailability.timeSlots && Array.isArray(dayAvailability.timeSlots)) {
      // Therapist profile format - need to filter
      return dayAvailability.timeSlots
        .filter(slot => slot.available)
        .map(slot => slot.displayTime || slot.time);
    }
    
    return [];
  };

  const formatTime = (timeString) => {
    if (timeString.includes('AM') || timeString.includes('PM')) {
      return timeString;
    }
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const convertTo24Hour = (timeString) => {
    if (!timeString || typeof timeString !== 'string') return timeString;
    const trimmed = timeString.trim();
    if (!trimmed.includes('AM') && !trimmed.includes('PM')) {
      // Already 24h: strip seconds if present (backend expects HH:MM)
      const parts = trimmed.split(':');
      return parts.length >= 2 ? `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}` : trimmed;
    }
    const [time, ampm] = trimmed.split(' ');
    const [hours, minutes] = (time || '').split(':');
    let hour = parseInt(hours, 10);
    const min = (minutes || '00').padStart(2, '0');
    if (ampm === 'AM' && hour === 12) {
      hour = 0;
    } else if (ampm === 'PM' && hour !== 12) {
      hour += 12;
    }
    return `${String(hour).padStart(2, '0')}:${min}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🔵 Form submit triggered', { isLoading, isLoadingData, isNewClient, isSubmitting: isSubmittingRef.current });
    
    // Prevent duplicate submissions - check and set atomically to prevent race conditions
    if (isSubmittingRef.current) {
      console.log('⏭️ Submission already in progress (ref check), ignoring duplicate request');
      return;
    }
    
    if (isLoading || isLoadingData) {
      console.log('⏭️ Submission already in progress (state check), ignoring duplicate request');
      return;
    }

    if (isUploadingPaymentScreenshot) {
      setError('Please wait for the payment screenshot to finish uploading');
      return;
    }
    
    // Mark as submitting immediately (atomic operation)
    isSubmittingRef.current = true;
    console.log('🔒 Lock acquired for submission');
    setError(null);

    let finalClientId = clientId;

    // Record-only mode: existing client only
    if (recordOnly && !clientId) {
      setError('Please select a client');
      isSubmittingRef.current = false;
      return;
    }

    // If creating a new client (manual booking only), create it first
    if (!recordOnly && isNewClient) {
      // Validate new client data - only email, first_name, and phone_number are required
      // last_name, child_name, and child_age are optional
      if (!newClientData.email || !newClientData.first_name || !newClientData.phone_number) {
        setError('Please fill in all required client details: Email, First Name, and Phone Number');
        isSubmittingRef.current = false;
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newClientData.email)) {
        setError('Please enter a valid email address');
        isSubmittingRef.current = false;
        return;
      }

      // Validate child age only if provided
      if (newClientData.child_age && newClientData.child_age.trim() !== '') {
      const childAge = parseInt(newClientData.child_age);
      if (isNaN(childAge) || childAge < 1 || childAge > 18) {
        setError('Child age must be between 1 and 18');
        isSubmittingRef.current = false;
        return;
        }
      }

      // If admin entered a password, validate it (policy must be met for client login)
      const customPassword = newClientData.password?.trim();
      if (customPassword) {
        const passwordValidation = validatePassword(customPassword);
        if (!passwordValidation.valid) {
          setError(`Password does not meet requirements: ${passwordValidation.unmetRequirements.join(', ')}`);
          isSubmittingRef.current = false;
          return;
        }
      }

      setIsLoading(true);

      try {
        // Step 1: Create new client
        console.log('Creating new client...');
        const fullPhoneNumber = newClientData.country_code + newClientData.phone_number;
        const passwordToUse = customPassword || generateRandomPassword();
        
        const clientResponse = await adminApi.createUser({
          email: newClientData.email.trim().toLowerCase(),
          password: passwordToUse, // Admin-set or auto-generated client login password
          first_name: newClientData.first_name,
          last_name: newClientData.last_name || '', // Optional
          phone_number: fullPhoneNumber,
          child_name: newClientData.child_name || null, // Optional
          child_age: newClientData.child_age && newClientData.child_age.trim() !== '' ? parseInt(newClientData.child_age) : null // Optional
        });

        console.log('🔍 Client creation response:', JSON.stringify(clientResponse, null, 2));

        if (!clientResponse.success) {
          setError(clientResponse.message || 'Failed to create client');
          setIsLoading(false);
          isSubmittingRef.current = false;
          return;
        }

        // Extract client ID from response
        // Response structure: { success: true, data: { user: { id: user.id, email, role, profile: { id: client.id, ... } } } }
        // IMPORTANT: Must use profile.id (client ID), NOT user.id (user ID)
        const profile = clientResponse.data?.user?.profile;
        const userId = clientResponse.data?.user?.id;
        const clientIdFromProfile = profile?.id;
        
        // Use profile.id if available, otherwise fall back to checking if user.id matches (for backwards compatibility)
        finalClientId = clientIdFromProfile || userId;

        console.log('🔍 Client ID extraction:', {
          hasData: !!clientResponse.data,
          hasUser: !!clientResponse.data?.user,
          hasProfile: !!profile,
          userId: userId,
          clientIdFromProfile: clientIdFromProfile,
          finalClientId: finalClientId,
          fullProfile: profile,
          note: clientIdFromProfile ? 'Using profile.id (client ID)' : 'WARNING: Using user.id as fallback - backend will handle lookup'
        });

        if (!finalClientId) {
          console.error('❌ Client creation response structure:', {
            fullResponse: clientResponse,
            data: clientResponse.data,
            user: clientResponse.data?.user,
            profile: clientResponse.data?.user?.profile,
            profileId: profile?.id,
            userId: clientResponse.data?.user?.id,
            note: 'We need profile.id (client ID) or user.id (backend will lookup by user_id)'
          });
          setError('Failed to get client ID after creation. The client profile may not have been created correctly. Please check the console for details.');
          setIsLoading(false);
          isSubmittingRef.current = false;
          return;
        }

        console.log('✅ New client created with ID:', finalClientId, 'Profile:', profile);
      } catch (error) {
        console.error('Create client error:', error);
        setError(error.message || 'Failed to create client');
        setIsLoading(false);
        isSubmittingRef.current = false;
        return;
      }
    } else {
      // Validate existing client selection (manual or recordOnly)
      if (!clientId) {
        setError('Please select a client');
        if (!recordOnly) setIsLoading(false);
        isSubmittingRef.current = false;
        return;
      }
    }

    // Validate booking data
    if (!finalClientId || !psychologistId || !selectedDateObj || !selectedTime || !amount || !paymentReceivedDate) {
      setError('Please fill in all required booking fields');
      setIsLoading(false); // Reset loading state on validation error
      isSubmittingRef.current = false;
      return;
    }

    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      setIsLoading(false); // Reset loading state on validation error
      isSubmittingRef.current = false;
      return;
    }

    // If we get here and we created a new client, isLoading should already be true
    // If we're using an existing client, set loading now
    if (!isNewClient) {
      setIsLoading(true);
    }

    try {
      // Format selected date
      const year = selectedDateObj.getFullYear();
      const month = String(selectedDateObj.getMonth() + 1).padStart(2, '0');
      const dayStr = String(selectedDateObj.getDate()).padStart(2, '0');
      const scheduledDate = `${year}-${month}-${dayStr}`;

      // Step 2: Create booking
      const bookingData = {
        client_id: finalClientId,
        psychologist_id: psychologistId,
        package_id: packageId || null,
        scheduled_date: scheduledDate,
        scheduled_time: convertTo24Hour(selectedTime),
        amount: parseFloat(amount),
        payment_received_date: paymentReceivedDate,
        payment_method: paymentMethod,
        receipt_url: paymentScreenshotUrl || null,
        therapist_commission: therapistCommission ? parseFloat(therapistCommission) : 0,
        notes: notes || null
      };
      if (recordOnly) {
        bookingData.meet_link = meetLink?.trim() || undefined;
        bookingData.status = status;
      }

      console.log(recordOnly ? 'Creating record-only booking:' : 'Creating manual booking:', bookingData);
      console.log('Final client ID being used:', finalClientId);

      const response = recordOnly
        ? await adminApi.createRecordOnlyBooking(bookingData)
        : await adminApi.createManualBooking(bookingData);

      if (response.success) {
        console.log(recordOnly ? '✅ Session record added successfully' : '✅ Booking created successfully, showing success modal');
        setShowSuccessModal(true);
        onBookingSuccess?.(response.data);
        setTimeout(() => {
          isSubmittingRef.current = false;
          onClose();
        }, 1500);
      } else {
        console.error('Booking creation failed:', response);
        const errorMessage = response.message || 'Failed to create booking';
        setFailureMessage(errorMessage);
        setShowFailureModal(true);
        isSubmittingRef.current = false; // Reset on failure
      }
    } catch (error) {
      console.error('Create booking error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        bookingData: {
          client_id: finalClientId,
          psychologist_id: psychologistId,
          scheduled_date: selectedDateObj ? `${selectedDateObj.getFullYear()}-${String(selectedDateObj.getMonth() + 1).padStart(2, '0')}-${String(selectedDateObj.getDate()).padStart(2, '0')}` : null,
          scheduled_time: selectedTime
        }
      });
      const errorMessage = error.message || 'Failed to create booking';
      setFailureMessage(errorMessage);
      setShowFailureModal(true);
      isSubmittingRef.current = false; // Reset on error
    } finally {
      setIsLoading(false);
      // Note: isSubmittingRef is reset in success/error handlers above
      // Only reset here if we didn't already reset (shouldn't happen, but safety net)
      if (isSubmittingRef.current) {
        console.log('🔓 Resetting submission flag in finally block (safety net)');
        isSubmittingRef.current = false;
      }
    }
  };

  const filteredClients = Array.isArray(clients) ? clients.filter(client => {
    const name = `${client.first_name || ''} ${client.last_name || ''} ${client.email || ''}`.toLowerCase();
    return name.includes(searchClient.toLowerCase());
  }) : [];

  const filteredPsychologists = Array.isArray(psychologists) ? psychologists.filter(psych => {
    const name = `${psych.first_name || ''} ${psych.last_name || ''} ${psych.email || ''}`.toLowerCase();
    return name.includes(searchPsychologist.toLowerCase());
  }) : [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200/80">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#3f2e73]/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-[#3f2e73]" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900 tracking-tight" role="heading" aria-level={2}>
                {recordOnly ? 'Add session record' : 'Create Manual Booking'}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {recordOnly
                  ? 'Record only. No Meet creation, no notifications. Use if the meeting was created elsewhere.'
                  : 'For edge cases where payment/booking couldn\'t be completed normally'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form id="manual-booking-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-5">
            {/* Client Selection/Creation */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <User className="h-4 w-4 inline mr-1" />
                  Client *
                </label>
                {!recordOnly && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewClient(!isNewClient);
                      setClientId('');
                      setNewClientData({
                        email: '',
                        first_name: '',
                        last_name: '',
                        phone_number: '',
                        country_code: '+91',
                        child_name: '',
                        child_age: ''
                      });
                    }}
                    className="text-sm text-[#3f2e73] hover:text-[#1d1733] font-medium"
                  >
                    {isNewClient ? '← Select Existing Client' : '+ New Client'}
                  </button>
                )}
              </div>

              {!recordOnly && isNewClient ? (
                /* New Client Form */
                <div className="border border-slate-200 rounded-lg p-4 bg-white/60 space-y-4 mt-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Email */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={newClientData.email}
                        onChange={(e) => handleNewClientInputChange('email', e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#3f2e73]/20 focus:border-[#3f2e73] text-sm"
                        placeholder="client@example.com"
                      />
                    </div>

                    {/* First Name */}
                    <div>
                      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                        First Name *
                      </label>
                      <input
                        type="text"
                        value={newClientData.first_name}
                        onChange={(e) => handleNewClientInputChange('first_name', e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#3f2e73]/20 focus:border-[#3f2e73] text-sm"
                        placeholder="John"
                      />
                    </div>

                    {/* Last Name */}
                    <div>
                      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={newClientData.last_name}
                        onChange={(e) => handleNewClientInputChange('last_name', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#3f2e73]/20 focus:border-[#3f2e73] text-sm"
                        placeholder="Doe (optional)"
                      />
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                        Phone Number *
                      </label>
                      <div className="flex">
                        <select
                          value={newClientData.country_code}
                          onChange={(e) => handleNewClientInputChange('country_code', e.target.value)}
                          className="px-3 py-2 border border-slate-200 rounded-l-lg focus:ring-2 focus:ring-[#3f2e73]/20 focus:border-[#3f2e73] text-sm bg-slate-50 min-w-[7rem]"
                        >
                          <option value="+91">🇮🇳 +91</option>
                          <option value="+1">🇺🇸 +1</option>
                          <option value="+44">🇬🇧 +44</option>
                          <option value="+971">🇦🇪 +971</option>
                          <option value="+966">🇸🇦 +966</option>
                          <option value="+65">🇸🇬 +65</option>
                          <option value="+60">🇲🇾 +60</option>
                          <option value="+61">🇦🇺 +61</option>
                          <option value="+64">🇳🇿 +64</option>
                          <option value="+27">🇿🇦 +27</option>
                          <option value="+33">🇫🇷 +33</option>
                          <option value="+49">🇩🇪 +49</option>
                          <option value="+39">🇮🇹 +39</option>
                          <option value="+34">🇪🇸 +34</option>
                          <option value="+31">🇳🇱 +31</option>
                          <option value="+32">🇧🇪 +32</option>
                          <option value="+41">🇨🇭 +41</option>
                          <option value="+46">🇸🇪 +46</option>
                          <option value="+47">🇳🇴 +47</option>
                          <option value="+45">🇩🇰 +45</option>
                          <option value="+358">🇫🇮 +358</option>
                          <option value="+351">🇵🇹 +351</option>
                          <option value="+353">🇮🇪 +353</option>
                          <option value="+48">🇵🇱 +48</option>
                          <option value="+420">🇨🇿 +420</option>
                          <option value="+36">🇭🇺 +36</option>
                          <option value="+40">🇷🇴 +40</option>
                          <option value="+7">🇷🇺 +7</option>
                          <option value="+81">🇯🇵 +81</option>
                          <option value="+82">🇰🇷 +82</option>
                          <option value="+86">🇨🇳 +86</option>
                          <option value="+852">🇭🇰 +852</option>
                          <option value="+886">🇹🇼 +886</option>
                          <option value="+66">🇹🇭 +66</option>
                          <option value="+62">🇮🇩 +62</option>
                          <option value="+63">🇵🇭 +63</option>
                          <option value="+84">🇻🇳 +84</option>
                          <option value="+880">🇧🇩 +880</option>
                          <option value="+94">🇱🇰 +94</option>
                          <option value="+92">🇵🇰 +92</option>
                          <option value="+977">🇳🇵 +977</option>
                          <option value="+95">🇲🇲 +95</option>
                          <option value="+855">🇰🇭 +855</option>
                          <option value="+856">🇱🇦 +856</option>
                          <option value="+673">🇧🇳 +673</option>
                          <option value="+670">🇹🇱 +670</option>
                        </select>
                        <input
                          type="tel"
                          value={newClientData.phone_number}
                          onChange={(e) => handleNewClientInputChange('phone_number', e.target.value.replace(/\D/g, ''))}
                          required
                          className="flex-1 px-3 py-2 border border-slate-200 border-l-0 rounded-r-lg focus:ring-2 focus:ring-[#3f2e73]/20 focus:border-[#3f2e73] text-sm"
                          placeholder="9876543210"
                        />
                      </div>
                    </div>

                    {/* Child Name */}
                    <div>
                      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                        Child Name
                      </label>
                      <input
                        type="text"
                        value={newClientData.child_name}
                        onChange={(e) => handleNewClientInputChange('child_name', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#3f2e73]/20 focus:border-[#3f2e73] text-sm"
                        placeholder="Child's name (optional)"
                      />
                    </div>

                    {/* Child Age */}
                    <div>
                      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                        Child Age
                      </label>
                      <input
                        type="number"
                        value={newClientData.child_age}
                        onChange={(e) => handleNewClientInputChange('child_age', e.target.value)}
                        min="1"
                        max="18"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#3f2e73]/20 focus:border-[#3f2e73] text-sm"
                        placeholder="Age 1-18 (optional)"
                      />
                    </div>

                    {/* Client login password (optional) */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                        <Lock className="h-4 w-4 inline mr-1" />
                        Client login password (optional)
                      </label>
                      <div className="relative">
                        <input
                          type={showNewClientPassword ? 'text' : 'password'}
                          value={newClientData.password}
                          onChange={(e) => handleNewClientInputChange('password', e.target.value)}
                          className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#3f2e73]/20 focus:border-[#3f2e73] text-sm"
                          placeholder="Leave blank to auto-generate; if set, client uses this to log in"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewClientPassword(!showNewClientPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                          aria-label={showNewClientPassword ? 'Hide password' : 'Show password'}
                        >
                          {showNewClientPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        If you set a password, the client will use this to log in. Otherwise a random password is generated (they can reset it later).
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    A new client account will be created. Set a login password above or leave it blank to auto-generate.
                  </p>
                </div>
              ) : (
                /* Existing Client Selection */
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search client by name or email..."
                    value={searchClient}
                    onChange={(e) => setSearchClient(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg mb-2 focus:ring-2 focus:ring-[#3f2e73]/20 focus:border-[#3f2e73] text-sm"
                  />
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#3f2e73]/20 focus:border-[#3f2e73] text-sm"
                  >
                    <option value="">Select a client</option>
                    {filteredClients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.first_name || ''} {client.last_name || ''} {client.child_name ? `(Child: ${client.child_name})` : ''} {client.email ? `(${client.email})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Psychologist Selection */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                <UserCheck className="h-4 w-4 inline mr-1" />
                Psychologist *
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search psychologist by name or email..."
                  value={searchPsychologist}
                  onChange={(e) => setSearchPsychologist(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg mb-2 focus:ring-2 focus:ring-[#3f2e73]/20 focus:border-[#3f2e73] text-sm"
                />
                <select
                  value={psychologistId}
                  onChange={(e) => setPsychologistId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#3f2e73]/20 focus:border-[#3f2e73] text-sm"
                >
                  <option value="">Select a psychologist</option>
                  {filteredPsychologists.map(psych => (
                    <option key={psych.id} value={psych.id}>
                      {psych.first_name} {psych.last_name}{psych.email ? ` (${psych.email})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Package Selection (Optional) */}
            {psychologistId && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  <Package className="h-4 w-4 inline mr-1" />
                  Package (Optional)
                </label>
                <select
                  value={packageId}
                  onChange={(e) => setPackageId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#3f2e73]/20 focus:border-[#3f2e73] text-sm"
                >
                  <option value="">Individual Session</option>
                  {packages.map(pkg => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name || pkg.package_type} - ₹{pkg.price} ({pkg.session_count} sessions)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date Selection - Calendar */}
            {psychologistId && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  <CalendarDays className="h-4 w-4 inline mr-1" />
                  Session Date *
                </label>
                {/* Calendar */}
                <div className="border border-slate-200 rounded-lg p-4 bg-white">
                  {/* Month Navigation */}
                  <div className="flex items-center justify-between mb-3">
                    <button 
                      type="button"
                      onClick={handlePrevMonth}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 18l-6-6 6-6"/>
                      </svg>
                    </button>
                    <p className="text-sm font-semibold text-gray-800">{getMonthName(currentDate)}</p>
                    <button 
                      type="button"
                      onClick={handleNextMonth}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                    </button>
                  </div>

                  {loadingAvailability && (
                    <div className="text-center py-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#3f2e73] mx-auto"></div>
                    </div>
                  )}

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1 mb-3">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                      <div key={`header-${index}`} className="text-center text-xs font-medium text-gray-500 py-1">
                        {day}
                      </div>
                    ))}
                    {(() => {
                      const { daysInMonth, startingDay } = getDaysInMonth(currentDate);
                      const today = new Date();
                      const isCurrentMonth = currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
                      
                      const calendarDays = [];
                      
                      // Add empty cells for days before the first day of the month
                      for (let i = 0; i < startingDay; i++) {
                        calendarDays.push(<div key={`empty-${i}`} className="text-center py-1 text-xs"></div>);
                      }
                      
                      // Add days of the month
                      for (let day = 1; day <= daysInMonth; day++) {
                        const isToday = isCurrentMonth && day === today.getDate();
                        const isSelected = selectedDateObj && selectedDateObj.getDate() === day && selectedDateObj.getMonth() === currentDate.getMonth() && selectedDateObj.getFullYear() === currentDate.getFullYear();
                        const isAvailable = day >= today.getDate() || !isCurrentMonth;
                        
                        // Check if this specific date is available for the psychologist
                        const calendarDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                        const year = calendarDate.getFullYear();
                        const month = String(calendarDate.getMonth() + 1).padStart(2, '0');
                        const dayStr = String(calendarDate.getDate()).padStart(2, '0');
                        const dateStr = `${year}-${month}-${dayStr}`;
                        const dateAvailability = psychologistAvailability[dateStr];
                        const isPsychologistAvailable = dateAvailability && dateAvailability.is_available && (
                          (dateAvailability.available_slots && Array.isArray(dateAvailability.available_slots) && dateAvailability.available_slots.length > 0) ||
                          (dateAvailability.availableSlots && dateAvailability.availableSlots > 0) ||
                          (dateAvailability.timeSlots && Array.isArray(dateAvailability.timeSlots) && dateAvailability.timeSlots.some(slot => slot.available))
                        );
                        
                        const isActuallyAvailable = isPsychologistAvailable && isAvailable;
                        
                        calendarDays.push(
                          <div
                            key={`day-${day}`}
                            onClick={() => {
                              if (isAvailable) {
                                handleDateSelect(day);
                              }
                            }}
                            className={`text-center py-1 rounded-lg transition-all duration-200 text-xs cursor-pointer ${
                              isSelected
                                ? 'bg-[#3f2e73] text-white font-bold shadow-lg'
                                : (isToday && isActuallyAvailable)
                                  ? 'bg-green-500 text-white font-semibold shadow-md border-2 border-green-600 hover:bg-green-600'
                                  : isToday
                                    ? 'bg-[#3f2e73]/10 text-[#3f2e73] font-semibold'
                                  : isActuallyAvailable
                                    ? 'bg-green-500 text-white font-semibold shadow-md border-2 border-green-600 hover:bg-green-600'
                                  : isAvailable
                                    ? 'hover:bg-gray-100 text-gray-500'
                                    : 'text-gray-300 cursor-not-allowed'
                            }`}
                            title={isPsychologistAvailable ? (isToday ? 'Today - Available for booking' : 'Available for booking') : isAvailable ? 'Click to check availability' : 'Past date'}
                          >
                            {day}
                            {isActuallyAvailable && (
                              <div className="w-2 h-2 bg-white rounded-full mx-auto mt-1 shadow-sm"></div>
                            )}
                          </div>
                        );
                      }
                      
                      return calendarDays;
                    })()}
                  </div>
                </div>

                {/* Time Selection */}
                {selectedDateObj && (() => {
                  const availableSlots = getAvailableSlotsForDate(selectedDateObj);
                  
                  if (availableSlots.length > 0) {
                    return (
                      <div className="mt-4">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                          <Clock className="h-4 w-4 inline mr-1" />
                          Session Time *
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {availableSlots.map(time => (
                            <button
                              key={time}
                              type="button"
                              onClick={() => handleTimeSelect(time)}
                              className={`px-3 py-2 rounded-lg border transition-colors text-xs ${
                                selectedTime === time
                                  ? 'bg-[#3f2e73] text-white border-[#3f2e73]'
                                  : 'bg-white text-gray-700 border-gray-300 hover:border-[#3f2e73]'
                              }`}
                            >
                              {formatTime(time)}
                            </button>
                          ))}
                        </div>
                        {selectedTime && (
                          <p className="mt-2 text-sm text-gray-600">
                            Selected: {formatTime(selectedTime)}
                          </p>
                        )}
                      </div>
                    );
                  } else {
                    return (
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
                        No available time slots for this date. Please select another date.
                      </div>
                    );
                  }
                })()}

                {!selectedDateObj && (
                  <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 text-sm text-center">
                    Select a date to see available time slots
                  </div>
                )}
              </div>
            )}

            {!psychologistId && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  <CalendarDays className="h-4 w-4 inline mr-1" />
                  Session Date *
                </label>
                <p className="text-sm text-slate-500">Please select a psychologist first</p>
              </div>
            )}

            {/* Amount & Payment */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  <DollarSign className="h-4 w-4 inline mr-1" />
                  Amount (₹) *
                </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#3f2e73]/20 focus:border-[#3f2e73] text-sm"
                placeholder="Enter amount"
              />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Therapist Commission (₹)
                </label>
                <input
                  type="number"
                  value={therapistCommission}
                  onChange={(e) => setTherapistCommission(e.target.value)}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#3f2e73]/20 focus:border-[#3f2e73] text-sm"
                  placeholder="0.00"
                />
              </div>
              <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Payment Received Date *
              </label>
              <input
                type="date"
                value={paymentReceivedDate}
                onChange={(e) => setPaymentReceivedDate(e.target.value)}
                max={(function(){ const n=new Date(); const y=n.getFullYear(); const m=String(n.getMonth()+1).padStart(2,'0'); const d=String(n.getDate()).padStart(2,'0'); return `${y}-${m}-${d}`; })()}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#3f2e73]/20 focus:border-[#3f2e73] text-sm"
              />
              <p className="mt-1 text-xs text-slate-500">Date when payment was received manually</p>
              </div>
              <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                <DollarSign className="h-4 w-4 inline mr-1" />
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#3f2e73]/20 focus:border-[#3f2e73] text-sm"
              >
                <option value="cash">Cash</option>
                <option value="card">Card (Debit/Credit)</option>
                <option value="upi">UPI (GPay, PhonePe, etc.)</option>
                <option value="netbanking">Net Banking</option>
                <option value="wallet">Wallet (Paytm, etc.)</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
              <p className="mt-1 text-xs text-slate-500">Method used for manual payment</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  <ImageIcon className="h-4 w-4 inline mr-1" />
                  Payment Screenshot
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  onChange={handlePaymentScreenshotChange}
                  className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-[#3f2e73] file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-[#1d1733]"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Upload a screenshot of the payment confirmation. Optional, but useful for manual entries.
                </p>
                {isUploadingPaymentScreenshot && (
                  <p className="mt-2 text-xs text-[#3f2e73] flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Uploading screenshot...
                  </p>
                )}
                {!isUploadingPaymentScreenshot && paymentScreenshotUrl && (
                  <div className="mt-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
                    <div className="flex items-center gap-2">
                      <Upload className="h-3.5 w-3.5" />
                      <span>{paymentScreenshotName || 'Screenshot uploaded successfully'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Status (record-only): set session status when adding a record */}
            {recordOnly && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Status *
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#3f2e73]/20 focus:border-[#3f2e73] text-sm"
                >
                  <option value="booked">Booked</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancellation</option>
                  <option value="no_show">No show</option>
                  <option value="rescheduled">Reschedule</option>
                  <option value="refund_request">Refund Request</option>
                </select>
                <p className="mt-1 text-xs text-slate-500">Session status for this record</p>
              </div>
            )}

            {/* Meet link (record-only): optional if meeting was created elsewhere */}
            {recordOnly && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Meet link (optional)
                </label>
                <input
                  type="url"
                  value={meetLink}
                  onChange={(e) => setMeetLink(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#3f2e73]/20 focus:border-[#3f2e73] text-sm"
                  placeholder="https://meet.google.com/xxx-xxxx-xxx (if created in another email)"
                />
                <p className="mt-1 text-xs text-slate-500">Paste the Meet link if the meeting was already created elsewhere</p>
              </div>
            )}

            {/* Notes */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#3f2e73]/20 focus:border-[#3f2e73] text-sm"
                placeholder="Any additional notes about this booking..."
              />
            </div>
          </div>

          {/* Footer Buttons - Inside Form */}
          <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-slate-200 bg-slate-50/30 -mx-6 -mb-6 px-6 pb-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[#3f2e73] bg-white border border-[#3f2e73]/40 rounded-lg hover:bg-[#3f2e73]/10 transition-colors text-sm font-medium"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || isLoadingData || isSubmittingRef.current || isUploadingPaymentScreenshot}
              className="px-4 py-2 bg-[#3f2e73] text-white rounded-lg hover:bg-[#1d1733] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium shadow-sm"
              style={{ cursor: (isLoading || isLoadingData || isSubmittingRef.current || isUploadingPaymentScreenshot) ? 'not-allowed' : 'pointer' }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : isLoadingData ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading...</span>
                </>
              ) : isUploadingPaymentScreenshot ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Uploading proof...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>{recordOnly ? 'Add record' : 'Create Booking'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
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
                onClick={() => {
                  setShowSuccessModal(false);
                  onClose();
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Modal Content */}
              <div className="p-6 pt-12">
                <div className="text-center mb-6">
                  {/* Success Icon */}
                  <div className="mb-4 flex justify-center">
                    <div className="rounded-full bg-green-100 p-3">
                      <CheckCircle className="h-12 w-12 text-green-600" />
                    </div>
                  </div>
                  <motion.h3
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                    className="text-xl font-semibold text-gray-900 mb-2"
                  >
                    {recordOnly ? 'Session record added' : 'Booking Created Successfully!'}
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                    className="text-gray-600 text-sm"
                  >
                    {recordOnly
                      ? 'Session record has been added. No notifications were sent.'
                      : isNewClient 
                        ? 'New client created and manual booking created successfully!'
                        : 'Manual booking has been created successfully.'}
                  </motion.p>
                </div>

                {/* Close Button */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                  className="mt-6"
                >
                  <button
                    onClick={() => {
                      setShowSuccessModal(false);
                      onClose();
                    }}
                    className="w-full py-3 px-4 text-base font-semibold text-white rounded-lg transition-colors duration-200"
                    style={{ backgroundColor: '#3f2e73' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d1733'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3f2e73'}
                  >
                    Close
                  </button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Failure Modal */}
      <AnimatePresence>
        {showFailureModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
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
                onClick={() => setShowFailureModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Modal Content */}
              <div className="p-6 pt-12">
                <div className="text-center mb-6">
                  {/* Failure Icon */}
                  <div className="mb-4 flex justify-center">
                    <div className="rounded-full bg-red-100 p-3">
                      <XCircle className="h-12 w-12 text-red-600" />
                    </div>
                  </div>
                  <motion.h3
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                    className="text-xl font-semibold text-gray-900 mb-2"
                  >
                    Booking Failed
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                    className="text-gray-600 text-sm"
                  >
                    {failureMessage || 'Failed to create booking. Please try again.'}
                  </motion.p>
                </div>

                {/* Close Button */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                  className="mt-6"
                >
                  <button
                    onClick={() => setShowFailureModal(false)}
                    className="w-full py-3 px-4 text-base font-semibold text-white rounded-lg transition-colors duration-200 bg-red-600 hover:bg-red-700"
                  >
                    Close
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
