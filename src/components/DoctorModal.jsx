'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Plus, Minus, FileText } from 'lucide-react';
import { publicApi } from '@/lib/backendApi';
import { isChildSpecialistProfile } from '@/lib/doctorSpecialistProfile';

const CHILD_FOLLOW_TIERS = [
  { key: '1', label: '1 session' },
  { key: '3', label: '3 sessions' },
  { key: '6', label: '6 sessions' },
  { key: '9', label: '9 sessions' },
  { key: '12plus', label: '12 sessions' },
];

const DEFAULT_CHILD_SPECIALIST_FORM = {
  initial: {
    parent_only: { durationLabel: '1 hr', price: '1699' },
    child_only: { durationLabel: '1.5 hr', price: '1899' },
    family: { durationLabel: '2 hr', price: '2399' },
  },
  followUpPackages: {
    '1': {
      parent_only: { durationLabel: '1 hr', price: '1599' },
      child_only: { durationLabel: '1 hr', price: '1599' },
      family: { durationLabel: '1.5 hr', price: '1899' },
    },
    '3': {
      parent_only: { durationLabel: '1 hr', price: '4588' },
      child_only: { durationLabel: '1 hr', price: '4588' },
      family: { durationLabel: '1.5 hr', price: '5188' },
    },
    '6': {
      parent_only: { durationLabel: '1 hr', price: '8988' },
      child_only: { durationLabel: '1 hr', price: '8988' },
      family: { durationLabel: '1.5 hr', price: '10188' },
    },
    '9': {
      parent_only: { durationLabel: '1 hr', price: '13288' },
      child_only: { durationLabel: '1 hr', price: '13288' },
      family: { durationLabel: '1.5 hr', price: '15088' },
    },
    '12plus': {
      parent_only: { durationLabel: '1 hr', price: '17388' },
      child_only: { durationLabel: '1 hr', price: '17388' },
      family: { durationLabel: '1.5 hr', price: '19788' },
    },
  },
};

function mergeChildSpecialistFormFromApi(raw) {
  const next = JSON.parse(JSON.stringify(DEFAULT_CHILD_SPECIALIST_FORM));
  if (!raw || typeof raw !== 'object') return next;
  if (raw.initial && typeof raw.initial === 'object') {
    ['parent_only', 'child_only', 'family'].forEach((k) => {
      if (raw.initial[k]) {
        next.initial[k] = {
          ...next.initial[k],
          ...raw.initial[k],
          price:
            raw.initial[k].price != null && raw.initial[k].price !== ''
              ? String(raw.initial[k].price)
              : next.initial[k].price,
        };
      }
    });
  }
  if (raw.followUpPackages && typeof raw.followUpPackages === 'object') {
    CHILD_FOLLOW_TIERS.forEach(({ key: tier }) => {
      if (!raw.followUpPackages[tier]) return;
      ['parent_only', 'child_only', 'family'].forEach((k) => {
        if (raw.followUpPackages[tier][k]) {
          next.followUpPackages[tier][k] = {
            ...next.followUpPackages[tier][k],
            ...raw.followUpPackages[tier][k],
            price:
              raw.followUpPackages[tier][k].price != null &&
              raw.followUpPackages[tier][k].price !== ''
                ? String(raw.followUpPackages[tier][k].price)
                : next.followUpPackages[tier][k].price,
          };
        }
      });
    });
  }
  return next;
}

const DURATION_MINUTES = {
  initial: { parent_only: 60, child_only: 90, family: 120 },
  followUp: { parent_only: 60, child_only: 60, family: 90 },
};

function buildChildSpecialistPricingPayload(form) {
  const initial = {};
  ['parent_only', 'child_only', 'family'].forEach((k) => {
    const cell = form.initial[k];
    initial[k] = {
      durationLabel: cell.durationLabel,
      durationMinutes: DURATION_MINUTES.initial[k],
      price: parseInt(cell.price, 10),
    };
  });
  const followUpPackages = {};
  CHILD_FOLLOW_TIERS.forEach(({ key: tier }) => {
    followUpPackages[tier] = {};
    ['parent_only', 'child_only', 'family'].forEach((k) => {
      const cell = form.followUpPackages[tier][k];
      followUpPackages[tier][k] = {
        durationLabel: cell.durationLabel,
        durationMinutes: DURATION_MINUTES.followUp[k],
        price: parseInt(cell.price, 10),
      };
    });
  });
  return { initial, followUpPackages };
}

// Helper to normalize possible image fields and relative URLs
function resolveDoctorImage(doctor) {
  const candidates = [
    doctor?.coverImage,
    doctor?.cover_image,
    doctor?.cover_image_url,
    doctor?.profile_image,
    doctor?.profile_image_url,
    doctor?.profile_picture_url,
    doctor?.avatar_url,
    doctor?.photo_url,
    doctor?.profilePicture,
    doctor?.image_url,
    doctor?.image,
    doctor?.photo,
    doctor?.profile_pic,
    doctor?.photoPath,
    doctor?.picture,
    doctor?.avatar,
    doctor?.profile?.photo_url,
    doctor?.profile?.image_url,
    doctor?.profile?.avatar_url,
  ].filter(Boolean);

  if (candidates.length === 0) return null;
  let url = String(candidates[0]);

  // If it's a relative path, prefix with backend/public origin if available
  try {
    const isAbsolute = /^https?:\/\//i.test(url) || url.startsWith('data:');
    if (!isAbsolute) {
      const backend = process.env.NEXT_PUBLIC_BACKEND_URL;
      if (backend) {
        url = backend.replace(/\/$/, '') + '/' + url.replace(/^\//, '');
      }
    }
  } catch (_) {}

  return url;
}

export default function DoctorModal({ 
  isOpen, 
  onClose, 
  onSave, 
  doctor = null, 
  mode = 'add' 
}) {
  /** Snapshot of better-parent packages + original DB ids when switching to child specialist, or loaded from API while child UI is shown. */
  const betterParentPackagesDraftRef = useRef(null);

  const [originalPackages, setOriginalPackages] = useState([]);
  const [originalDoctorData, setOriginalDoctorData] = useState(null); // Store original doctor data for comparison
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    education: {
      ug: '',
      pg: '',
      mphil: '',
      phd: ''
    },
    description: '',
    designation: '',
    price: '',
    psychiatrist15Price: '',
    psychiatrist30Price: '',
    experience_years: '',
    display_order: '',
    packages: [
      { name: 'Individual Session', price: '', sessions: 1 }
    ],
    specializations: [''],
    personalities: [''],
    languages: [''],
    coverImage: null,
    faq_question_1: '',
    faq_answer_1: '',
    faq_question_2: '',
    faq_answer_2: '',
    faq_question_3: '',
    faq_answer_3: '',
    specialistCategory: 'better_parent'
  });

  const [childSpecialistPricing, setChildSpecialistPricing] = useState(() =>
    mergeChildSpecialistFormFromApi(null)
  );

  // Simple step-by-step availability state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTimes, setSelectedTimes] = useState([]);
  const [availabilityData, setAvailabilityData] = useState({});
  const [hasUserModifiedAvailability, setHasUserModifiedAvailability] = useState(false);
  const [step, setStep] = useState(1); // 1: select date, 2: select times, 3: next date or save

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [availablePackages, setAvailablePackages] = useState([
    { id: 2, name: 'Package of 2 Sessions', sessions: 2 },
    { id: 3, name: 'Package of 3 Sessions', sessions: 3 },
    { id: 4, name: 'Package of 4 Sessions', sessions: 4 },
    { id: 5, name: 'Package of 5 Sessions', sessions: 5 },
    { id: 6, name: 'Package of 6 Sessions', sessions: 6 },
    { id: 7, name: 'Package of 7 Sessions', sessions: 7 },
    { id: 8, name: 'Package of 8 Sessions', sessions: 8 }
  ]);

  // Common time slots for selection (1-hour intervals)
  const timeSlots = {
    morning: ['9:00 AM', '10:00 AM', '11:00 AM'],
    noon: ['12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'],
    evening: ['5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM'],
    night: ['9:00 PM', '10:00 PM']
  };

  const formatTimeSlotLabel = (slot) => {
    if (typeof slot === 'string') return slot;
    if (slot && typeof slot === 'object') {
      if (slot.displayTime) return slot.displayTime;
      if (slot.time) return slot.time;
    }
    return String(slot ?? '');
  };

  const parseTimeToMinutes = (timeLabel) => {
    if (!timeLabel) return Number.POSITIVE_INFINITY;
    const trimmed = timeLabel.trim();
    const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match12) {
      let hours = parseInt(match12[1], 10);
      const minutes = parseInt(match12[2], 10);
      const period = match12[3].toUpperCase();
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    }
    const match24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (match24) {
      const hours = parseInt(match24[1], 10);
      const minutes = parseInt(match24[2], 10);
      return hours * 60 + minutes;
    }
    return Number.POSITIVE_INFINITY;
  };

  const sortAndFormatTimeSlots = (slots = []) => {
    return [...slots]
      .sort((a, b) => parseTimeToMinutes(formatTimeSlotLabel(a)) - parseTimeToMinutes(formatTimeSlotLabel(b)))
      .map(formatTimeSlotLabel);
  };

  // Handlers for personalities similar to specializations
  const addPersonality = () => {
    setFormData(prev => ({ ...prev, personalities: [...prev.personalities, ''] }));
  };
  const removePersonality = (index) => {
    setFormData(prev => ({ ...prev, personalities: prev.personalities.filter((_, i) => i !== index) }));
  };
  const handlePersonalityChange = (index, value) => {
    setFormData(prev => {
      const next = [...prev.personalities];
      next[index] = value;
      return { ...prev, personalities: next };
    });
  };

  // Fetch packages for a psychologist when editing.
  // Child-specialist rows (package_type cs_*) are excluded from "better parenting" session packages.
  // If applyToForm is false (psychologist opens as child specialist), we only fill betterParentPackagesDraftRef
  // so switching back to Better parenting restores standard packages without losing them.
  const fetchPsychologistPackages = async (psychologistId, applyToForm) => {
    try {
      if (!psychologistId) return;

      console.log('📦 Fetching packages for psychologist:', psychologistId);

      const response = await publicApi.getPsychologistPackages(psychologistId);
      console.log('📦 API Response:', response);

      const isStandardMultiSessionRow = (pkg) =>
        pkg.session_count > 1 && !String(pkg.package_type || '').startsWith('cs_');

      const buildFromPackagesList = (packagesArr, individualPrice) => {
        const multiSessionPackages = (packagesArr || [])
          .filter(isStandardMultiSessionRow)
          .map((pkg) => ({
            id: pkg.id,
            name: pkg.name,
            price: pkg.price,
            sessions: pkg.session_count,
            description: pkg.description,
            discount_percentage: pkg.discount_percentage,
          }));
        const originalMultiSessionPackages = multiSessionPackages.filter(
          (pkg) => pkg.id && !pkg.id.toString().startsWith('pkg-')
        );
        const packages = [
          {
            name: 'Individual Session',
            price: individualPrice ?? '',
            sessions: 1,
          },
          ...multiSessionPackages,
        ];
        return { packages, originalPackages: originalMultiSessionPackages };
      };

      if (response.success && response.data?.packages) {
        console.log('📦 Packages fetched:', response.data.packages);

        let computedOriginal = [];

        setFormData((prev) => {
          const indPrice =
            prev.price || doctor?.price || doctor?.individual_session_price || '';
          const { packages, originalPackages } = buildFromPackagesList(
            response.data.packages,
            indPrice
          );
          computedOriginal = originalPackages;
          betterParentPackagesDraftRef.current = {
            packages: JSON.parse(JSON.stringify(packages)),
            originalPackages: [...originalPackages],
          };
          if (applyToForm) {
            return { ...prev, packages };
          }
          return prev;
        });

        if (applyToForm) {
          setOriginalPackages(computedOriginal);
        }
      } else {
        console.log('📦 No packages found or error:', response);
        setFormData((prev) => {
          const indPrice =
            prev.price || doctor?.price || doctor?.individual_session_price || '';
          const packages = [
            { name: 'Individual Session', price: indPrice, sessions: 1 },
          ];
          betterParentPackagesDraftRef.current = {
            packages: JSON.parse(JSON.stringify(packages)),
            originalPackages: [],
          };
          if (applyToForm) {
            return { ...prev, packages };
          }
          return prev;
        });
        if (applyToForm) setOriginalPackages([]);
      }
    } catch (error) {
      console.error('📦 Error fetching packages:', error);
      setFormData((prev) => {
        const indPrice =
          prev.price || doctor?.price || doctor?.individual_session_price || '';
        const packages = [
          { name: 'Individual Session', price: indPrice, sessions: 1 },
        ];
        betterParentPackagesDraftRef.current = {
          packages: JSON.parse(JSON.stringify(packages)),
          originalPackages: [],
        };
        if (applyToForm) {
          return { ...prev, packages };
        }
        return prev;
      });
      if (applyToForm) setOriginalPackages([]);
    }
  };

  useEffect(() => {
    // Reset original packages and original doctor data when opening in add mode
    if (mode === 'add') {
      betterParentPackagesDraftRef.current = null;
      setOriginalPackages([]);
      setOriginalDoctorData(null);
      setCountryCode('+91');
      setChildSpecialistPricing(mergeChildSpecialistFormFromApi(null));
    }
    
    if (doctor && mode === 'edit') {
      betterParentPackagesDraftRef.current = null;
      console.log('🔍 Doctor data for editing:', doctor);
      console.log('🔍 Doctor price field:', doctor.price);
      console.log('🔍 Doctor individual_session_price field:', doctor.individual_session_price);
      console.log('🔍 Doctor display_order field:', doctor.display_order);
      console.log('🔍 Doctor display_order type:', typeof doctor.display_order);
      console.log('🔍 Doctor designation field:', doctor.designation);
      
      // Reset the modification flag when opening for edit
      setHasUserModifiedAvailability(false);
      
      const derivedLanguages = (() => {
        if (Array.isArray(doctor.languages) && doctor.languages.length > 0) {
          return doctor.languages;
        }
        if (typeof doctor.language === 'string' && doctor.language.trim().length > 0) {
          return doctor.language.split(',').map(lang => lang.trim()).filter(Boolean);
        }
        if (doctor.languages_json && typeof doctor.languages_json === 'string') {
          try {
            const parsed = JSON.parse(doctor.languages_json);
            if (Array.isArray(parsed) && parsed.length > 0) {
              return parsed;
            }
          } catch (error) {
            console.warn('Failed to parse languages_json:', doctor.languages_json, error);
          }
        }
        return [''];
      })();

      // Filter and prepare languages for original data
      const filteredLanguagesForOriginal = derivedLanguages
        .map(lang => lang.trim())
        .filter(Boolean);

      // Parse phone number to extract country code and number
      // Since we only support India (+91), always default to +91
      const parsePhoneNumber = (phoneStr) => {
        if (!phoneStr) return { code: '+91', number: '' };
        
        const raw = String(phoneStr).trim();
        const digitsOnly = raw.replace(/[^\d+]/g, "");
        
        let extractedCode = "+91";
        let numberOnly = digitsOnly;
        
        if (digitsOnly.startsWith("+")) {
          // Check if it starts with +91 (India)
          if (digitsOnly.startsWith('+91')) {
            extractedCode = '+91';
            numberOnly = digitsOnly.slice(3); // Remove +91
          } else {
            // For any other country code, remove it and use +91
            // Try to find where the country code ends (1-4 digits after +)
            const match = digitsOnly.match(/^\+\d{1,4}/);
            if (match) {
              numberOnly = digitsOnly.slice(match[0].length);
            } else {
              // If no match, remove the + and use all digits
              numberOnly = digitsOnly.slice(1);
            }
            // Always use +91 as country code
            extractedCode = '+91';
          }
        } else if (digitsOnly.length > 10) {
          // For numbers without +, check if it starts with 91
          if (digitsOnly.startsWith('91') && digitsOnly.length >= 12) {
            extractedCode = '+91';
            numberOnly = digitsOnly.slice(2);
          } else {
            // Remove any leading digits that might be a country code
            // Indian numbers are 10 digits, so if longer, remove leading digits
            if (digitsOnly.length > 10) {
              numberOnly = digitsOnly.slice(-10); // Take last 10 digits
            } else {
              numberOnly = digitsOnly;
            }
            extractedCode = '+91';
          }
        } else {
          // 10 digits or less - assume it's already just the number
          numberOnly = digitsOnly;
          extractedCode = '+91';
        }
        
        // Clean the number (remove any non-digits)
        numberOnly = numberOnly.replace(/\D/g, "");
        
        return { code: extractedCode, number: numberOnly };
      };

      const parsedPhone = parsePhoneNumber(doctor.phone || '');
      const childSpecialistEffective = isChildSpecialistProfile(doctor);
      const mergedChildForm = mergeChildSpecialistFormFromApi(doctor.child_specialist_pricing);

      // Store original doctor data for comparison (normalize to match backend format)
      const originalData = {
        first_name: doctor.first_name || doctor.firstName || '',
        last_name: doctor.last_name || doctor.lastName || '',
        phone: doctor.phone || '',
        email: doctor.email || '',
        designation: doctor.designation || null,
        ug_college: doctor.ug_college || doctor.education?.ug || '',
        pg_college: doctor.pg_college || doctor.education?.pg || '',
        mphil_college: doctor.mphil_college || doctor.education?.mphil || '',
        phd_college: doctor.phd_college || doctor.education?.phd || '',
        description: doctor.description || '',
        price: doctor.price || doctor.individual_session_price || null,
        experience_years: doctor.experience_years || 0,
        display_order: doctor.display_order !== null && doctor.display_order !== undefined ? doctor.display_order : null,
        area_of_expertise: doctor.area_of_expertise || doctor.specializations || [],
        personality_traits: doctor.personality_traits || doctor.personalities || [],
        languages_json: filteredLanguagesForOriginal.length > 0 ? JSON.stringify(filteredLanguagesForOriginal) : null,
        cover_image_url: resolveDoctorImage(doctor) || null,
        faq_question_1: doctor.faq_question_1 || null,
        faq_answer_1: doctor.faq_answer_1 || null,
        faq_question_2: doctor.faq_question_2 || null,
        faq_answer_2: doctor.faq_answer_2 || null,
        faq_question_3: doctor.faq_question_3 || null,
        faq_answer_3: doctor.faq_answer_3 || null,
        specialist_category:
          doctor.specialist_category === 'child_specialist' ? 'child_specialist' : 'better_parent',
        child_specialist_pricing_json: childSpecialistEffective
          ? JSON.stringify(buildChildSpecialistPricingPayload(mergedChildForm))
          : ''
      };
      setOriginalDoctorData(originalData);

      // Set country code
      setCountryCode(parsedPhone.code);

      setChildSpecialistPricing(mergedChildForm);
      
      setFormData({
        firstName: doctor.first_name || doctor.firstName || '',
        lastName: doctor.last_name || doctor.lastName || '',
        phone: parsedPhone.number,
        email: doctor.email || '',
        designation: doctor.designation || '', // Use designation directly from doctor object (same as other fields)
        password: '', // Don't load password for editing (passwords are hashed)
        education: {
          ug: doctor.ug_college || doctor.education?.ug || '',
          pg: doctor.pg_college || doctor.education?.pg || '',
          mphil: doctor.mphil_college || doctor.education?.mphil || '',
          phd: doctor.phd_college || doctor.education?.phd || ''
        },
        description: doctor.description || '',
        price: doctor.price || doctor.individual_session_price || '',
        psychiatrist15Price: doctor.psychiatrist_15min_price || '',
        psychiatrist30Price: doctor.psychiatrist_30min_price || '',
        experience_years: doctor.experience_years || '',
        display_order: doctor.display_order !== null && doctor.display_order !== undefined ? String(doctor.display_order) : '',
        packages: [
          // Start with individual session package
          { name: 'Individual Session', price: doctor.price || doctor.individual_session_price || '', sessions: 1 }
        ],
        specializations: doctor.area_of_expertise || doctor.specializations || [''],
        personalities: doctor.personality_traits || doctor.personalities || [''],
        languages: derivedLanguages,
        coverImage: resolveDoctorImage(doctor),
        faq_question_1: doctor.faq_question_1 || '',
        faq_answer_1: doctor.faq_answer_1 || '',
        faq_question_2: doctor.faq_question_2 || '',
        faq_answer_2: doctor.faq_answer_2 || '',
        faq_question_3: doctor.faq_question_3 || '',
        faq_answer_3: doctor.faq_answer_3 || '',
        specialistCategory: childSpecialistEffective ? 'child_specialist' : 'better_parent'
      });
      
      // Fetch packages for this psychologist
      console.log('🔍 Doctor ID for package fetching:', doctor.id);
      console.log('🔍 Doctor psychologist_id:', doctor.psychologist_id);
      const fetchId = doctor.id || doctor.psychologist_id;
      if (fetchId) {
        // Always load standard (non–child-specialist) packages into draft ref; merge into form only for better-parent UI
        fetchPsychologistPackages(fetchId, !childSpecialistEffective);
      } else {
        console.warn('⚠️ No doctor ID found for package fetching');
      }
      
                    // Load existing availability if editing AND user hasn't modified it
      // This prevents overwriting user changes when they've already modified availability
      if (doctor.availability && Array.isArray(doctor.availability) && !hasUserModifiedAvailability) {
          // Convert existing availability to new format
          const convertedAvailability = {};
          doctor.availability.forEach((item, index) => {
            // Handle new structure: {date, time_slots, is_available}
            if (item && item.date && item.time_slots && Array.isArray(item.time_slots)) {
              const dateStr = item.date;
              
              // Helper function to normalize time format for comparison
              const normalizeTime = (time) => {
                // Handle object-based time slots
                if (typeof time === 'object' && time !== null) {
                  if (time.time) {
                    time = time.time;
                  } else if (time.displayTime) {
                    time = time.displayTime;
                  } else {
                    console.warn('Time object has no time property:', time);
                    return '';
                  }
                }
                
                // Ensure time is a string
                if (typeof time !== 'string') {
                  console.warn('Time is not a string:', time, typeof time);
                  return String(time || '');
                }
                // Remove AM/PM and convert to 24-hour format for comparison
                const cleanTime = time.replace(/\s*(AM|PM)/i, '').trim();
                return cleanTime;
              };
              
              // Helper function to check if a time slot matches any predefined slot
              const findMatchingSlot = (dbSlot) => {
                const normalizedDbSlot = normalizeTime(dbSlot);
                for (const [period, slots] of Object.entries(timeSlots)) {
                  for (const predefinedSlot of slots) {
                    if (normalizeTime(predefinedSlot) === normalizedDbSlot) {
                      return period;
                    }
                  }
                }
                return null;
              };
              
              // Categorize time slots into periods
              const categorizedSlots = { morning: [], noon: [], evening: [], night: [] };
              item.time_slots.forEach(slot => {
                try {
                  // Convert slot to string if it's an object
                  let slotString = slot;
                  if (typeof slot === 'object' && slot !== null) {
                    if (slot.displayTime) {
                      slotString = slot.displayTime;
                    } else if (slot.time) {
                      slotString = slot.time;
                    } else {
                      console.warn('Time slot object has no displayable time property:', slot);
                      slotString = String(slot);
                    }
                  } else if (typeof slot !== 'string') {
                    slotString = String(slot);
                  }
                  
                  const period = findMatchingSlot(slotString);
                  if (period) {
                    categorizedSlots[period].push(slotString);
                  } else {
                    // If no match found, add to the most appropriate period based on time
                    const hour = parseInt(String(slotString).split(':')[0]);
                    if (isNaN(hour)) {
                      console.warn('Invalid time slot format:', slotString);
                      // Default to noon if we can't parse the hour
                      categorizedSlots.noon.push(slotString);
                    } else if (hour >= 9 && hour < 12) {
                      categorizedSlots.morning.push(slotString);
                    } else if (hour >= 12 && hour < 17) {
                      categorizedSlots.noon.push(slotString);
                    } else if (hour >= 17 && hour < 21) {
                      categorizedSlots.evening.push(slotString);
                    } else if (hour >= 21 || hour < 9) {
                      categorizedSlots.night.push(slotString);
                    }
                  }
                } catch (error) {
                  console.error('Error processing time slot:', slot, error);
                  // Default to noon if there's an error
                  categorizedSlots.noon.push(String(slot));
                }
              });
              
              convertedAvailability[dateStr] = {
                available: item.is_available || true,
                timeSlots: categorizedSlots
              };
            }
            // Handle legacy structure: {day, slots}
            else if (item && item.day && item.slots && Array.isArray(item.slots)) {
              const nextOccurrence = getNextDayOccurrence(item.day);
              if (nextOccurrence) {
                const dateStr = nextOccurrence.toISOString().split('T')[0];
                
                // Helper function to normalize time format for comparison
                const normalizeTime = (time) => {
                  // Handle object-based time slots
                  if (typeof time === 'object' && time !== null) {
                    if (time.time) {
                      time = time.time;
                    } else if (time.displayTime) {
                      time = time.displayTime;
                    } else {
                      console.warn('Time object has no time property:', time);
                      return '';
                    }
                  }
                  
                  // Ensure time is a string
                  if (typeof time !== 'string') {
                    console.warn('Time is not a string:', time, typeof time);
                    return String(time || '');
                  }
                  // Remove AM/PM and convert to 24-hour format for comparison
                  const cleanTime = time.replace(/\s*(AM|PM)/i, '').trim();
                  return cleanTime;
                };
                
                // Helper function to check if a time slot matches any predefined slot
                const findMatchingSlot = (dbSlot) => {
                  const normalizedDbSlot = normalizeTime(dbSlot);
                  for (const [period, slots] of Object.entries(timeSlots)) {
                    for (const predefinedSlot of slots) {
                      if (normalizeTime(predefinedSlot) === normalizedDbSlot) {
                        return period;
                      }
                    }
                  }
                  return null;
                };
                
                // Categorize time slots into periods
                const categorizedSlots = { morning: [], noon: [], evening: [], night: [] };
                item.slots.forEach(slot => {
                  try {
                    // Convert slot to string if it's an object
                    let slotString = slot;
                    if (typeof slot === 'object' && slot !== null) {
                      if (slot.displayTime) {
                        slotString = slot.displayTime;
                      } else if (slot.time) {
                        slotString = slot.time;
                      } else {
                        console.warn('Time slot object has no displayable time property:', slot);
                        slotString = String(slot);
                      }
                    } else if (typeof slot !== 'string') {
                      slotString = String(slot);
                    }
                    
                    const period = findMatchingSlot(slotString);
                    if (period) {
                      categorizedSlots[period].push(slotString);
                    } else {
                      // If no match found, add to the most appropriate period based on time
                      const hour = parseInt(String(slotString).split(':')[0]);
                      if (isNaN(hour)) {
                        console.warn('Invalid time slot format:', slotString);
                        // Default to noon if we can't parse the hour
                        categorizedSlots.noon.push(slotString);
                      } else if (hour >= 9 && hour < 12) {
                        categorizedSlots.morning.push(slotString);
                      } else if (hour >= 12 && hour < 17) {
                        categorizedSlots.noon.push(slotString);
                      } else if (hour >= 17 && hour < 21) {
                        categorizedSlots.evening.push(slotString);
                      } else if (hour >= 21 || hour < 9) {
                        categorizedSlots.night.push(slotString);
                      }
                    }
                  } catch (error) {
                    console.error('Error processing time slot:', slot, error);
                    // Default to noon if there's an error
                    categorizedSlots.noon.push(String(slot));
                  }
                });
                
                convertedAvailability[dateStr] = {
                  available: true,
                  timeSlots: categorizedSlots
                };
              }
            }
            // Skip if item is invalid
            else {
              console.warn('Invalid availability item:', item);
              return;
            }
          });
          setAvailabilityData(convertedAvailability);
      } else if (doctor.availability && typeof doctor.availability === 'object') {
        // Handle case where availability might be in a different format
        // Try to convert or set empty availability
        setAvailabilityData({});
      } else {
        // No availability data, set empty
        setAvailabilityData({});
      }
    }
  }, [doctor, mode]);

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
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateSelect = (day) => {
    const newSelectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(newSelectedDate);
    setSelectedTimes([]);
    setStep(2); // Move to time selection step
  };

  const handleTimeSelect = (timeKey) => {
    setSelectedTimes(prev => {
      if (prev.includes(timeKey)) {
        return prev.filter(t => t !== timeKey);
      } else {
        return prev.concat(timeKey);
      }
    });
    // Mark that user has modified availability
    setHasUserModifiedAvailability(true);
  };

  const getNextDayOccurrence = (dayName) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDay = days.indexOf(dayName);
    const today = new Date();
    const currentDay = today.getDay();
    const daysUntilTarget = (targetDay - currentDay + 7) % 7;
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + daysUntilTarget);
    return nextDate;
  };



  const saveCurrentDateAvailability = () => {
    if (selectedTimes.length === 0) {
      setErrors(prev => ({ ...prev, availability: 'Please select at least one time slot' }));
      return;
    }

    // Build YYYY-MM-DD directly from the selected date without timezone conversions
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    const timeSlotsByPeriod = {
      morning: [],
      noon: [],
      evening: [],
      night: []
    };
    
    // Apply the currently selected time slots to this date
    selectedTimes.forEach(timeKey => {
      const colonIndex = timeKey.indexOf(':');
      const period = timeKey.substring(0, colonIndex);
      const time = timeKey.substring(colonIndex + 1);
      if (timeSlotsByPeriod[period]) {
        timeSlotsByPeriod[period].push(time);
      }
    });
    
    const newAvailability = { ...availabilityData };
    newAvailability[dateStr] = {
      available: true,
      timeSlots: timeSlotsByPeriod
    };
    
    setAvailabilityData(newAvailability);
    setHasUserModifiedAvailability(true);
    setSelectedDate(null);
    setSelectedTimes([]);
    setStep(1); // Back to date selection
    setErrors(prev => ({ ...prev, availability: '' }));
  };

  const goToNextDate = () => {
    if (selectedTimes.length === 0) {
      setErrors(prev => ({ ...prev, availability: 'Please select at least one time slot' }));
      return;
    }
    
    // Save current date availability first
    saveCurrentDateAvailability();
  };

  const saveAllAvailability = () => {
    if (Object.keys(availabilityData).length === 0) {
      setErrors(prev => ({ ...prev, availability: 'Please set at least one availability slot' }));
      return;
    }
    // This will be handled by the main form submission
    setErrors(prev => ({ ...prev, availability: '' }));
  };

  const removeAvailability = (dateStr) => {
    const newAvailability = { ...availabilityData };
    delete newAvailability[dateStr];
    setAvailabilityData(newAvailability);
    setHasUserModifiedAvailability(true);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSpecialistCategoryChange = (next) => {
    if ((formData.designation || '').toLowerCase().includes('psychiatrist')) return;
    const prev = formData.specialistCategory;

    if (prev === 'better_parent' && next === 'child_specialist') {
      betterParentPackagesDraftRef.current = {
        packages: JSON.parse(JSON.stringify(formData.packages)),
        originalPackages: [...originalPackages],
      };
      setFormData((p) => ({ ...p, specialistCategory: next }));
      return;
    }

    if (prev === 'child_specialist' && next === 'better_parent') {
      const snap = betterParentPackagesDraftRef.current;
      if (snap && Array.isArray(snap.packages)) {
        setFormData((p) => {
          const restored = JSON.parse(JSON.stringify(snap.packages));
          if (restored[0]?.sessions === 1) {
            restored[0] = {
              ...restored[0],
              price: p.price ?? restored[0].price ?? '',
            };
          }
          return { ...p, specialistCategory: next, packages: restored };
        });
        setOriginalPackages(
          snap.originalPackages && snap.originalPackages.length
            ? [...snap.originalPackages]
            : []
        );
        return;
      }
      const fetchId = doctor?.id || doctor?.psychologist_id;
      if (fetchId) {
        fetchPsychologistPackages(fetchId, true);
      }
      setFormData((p) => ({ ...p, specialistCategory: next }));
      return;
    }

    setFormData((p) => ({ ...p, specialistCategory: next }));
  };

  const handleEducationChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      education: {
        ...prev.education,
        [field]: value
      }
    }));
  };




  const handleImageUpload = async (field, file) => {
    try {
      if (!file) return;
      setIsSubmitting(true);
      const { adminApi } = await import('../lib/backendApi');
      const uploadRes = await adminApi.uploadImage(file);
      const imageUrl = uploadRes?.url;
      if (imageUrl) {
        setFormData(prev => ({
          ...prev,
          [field]: imageUrl
        }));
      }
    } catch (error) {
      console.error('Image upload failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Package management functions
  const addPackage = () => {
    const newPackage = {
      id: `pkg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: '',
      price: '',
      sessions: 1,
      discount: 0
    };
    setFormData(prev => ({
      ...prev,
      packages: [...prev.packages, newPackage]
    }));
  };

  const removePackage = (index) => {
    setFormData(prev => ({
      ...prev,
      packages: prev.packages.filter((_, i) => i !== index)
    }));
  };

  const updatePackage = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      packages: prev.packages.map((pkg, i) => 
        i === index ? { ...pkg, [field]: value } : pkg
      )
    }));
  };

  const selectPackageType = (index, sessionCount) => {
    const selectedPackage = availablePackages.find(p => p.sessions === sessionCount);
    if (selectedPackage) {
      updatePackage(index, 'name', selectedPackage.name);
      updatePackage(index, 'sessions', selectedPackage.sessions);
      updatePackage(index, 'discount', 0);
    }
  };

  // Legacy package functions for compatibility
  const handlePackageChange = (index, field, value) => {
    updatePackage(index, field, value);
  };

  const addSpecialization = () => {
    setFormData(prev => ({
      ...prev,
      specializations: [...prev.specializations, '']
    }));
  };

  const removeSpecialization = (index) => {
    setFormData(prev => ({
      ...prev,
      specializations: prev.specializations.filter((_, i) => i !== index)
    }));
  };

  const handleSpecializationChange = (index, value) => {
    setFormData(prev => ({
      ...prev,
      specializations: prev.specializations.map((spec, i) => 
        i === index ? value : spec
      )
    }));
  };

  const addLanguage = () => {
    setFormData(prev => ({
      ...prev,
      languages: [...prev.languages, '']
    }));
  };

  const removeLanguage = (index) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.filter((_, i) => i !== index)
    }));
  };

  const handleLanguageChange = (index, value) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.map((lang, i) => 
        i === index ? value : lang
      )
    }));
  };

  const removeImage = (field) => {
    setFormData(prev => ({
      ...prev,
      [field]: null
    }));
  };

  // Ensure all packages have unique IDs
  const ensurePackageIds = (packages) => {
    return packages.map((pkg, index) => ({
      ...pkg,
      id: pkg.id || `pkg-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`
    }));
  };



  // Helper function to compare values (handles arrays, objects, and primitives)
  const valuesAreEqual = (val1, val2) => {
    // Handle null/undefined
    if (val1 === null || val1 === undefined) return val2 === null || val2 === undefined;
    if (val2 === null || val2 === undefined) return false;
    
    // Handle arrays
    if (Array.isArray(val1) && Array.isArray(val2)) {
      if (val1.length !== val2.length) return false;
      const sorted1 = [...val1].sort().map(v => String(v).trim()).filter(Boolean);
      const sorted2 = [...val2].sort().map(v => String(v).trim()).filter(Boolean);
      return JSON.stringify(sorted1) === JSON.stringify(sorted2);
    }
    
    // Handle objects
    if (typeof val1 === 'object' && typeof val2 === 'object' && !Array.isArray(val1) && !Array.isArray(val2)) {
      return JSON.stringify(val1) === JSON.stringify(val2);
    }
    
    // Handle primitives (normalize for comparison)
    const normalized1 = typeof val1 === 'string' ? val1.trim() : val1;
    const normalized2 = typeof val2 === 'string' ? val2.trim() : val2;
    
    // Handle number comparison (convert strings to numbers if both are numeric)
    if (!isNaN(normalized1) && !isNaN(normalized2) && normalized1 !== '' && normalized2 !== '') {
      return Number(normalized1) === Number(normalized2);
    }
    
    return normalized1 === normalized2;
  };

  // Get only changed fields compared to original data
  const getChangedFields = (currentData, originalData) => {
    if (!originalData || mode === 'add') {
      // For new doctors, send all data
      return currentData;
    }

    const changedFields = {};

    // Compare simple fields
    const simpleFields = [
      'first_name', 'last_name', 'email', 'phone', 'designation', 'cover_image_url'
    ];

    simpleFields.forEach(field => {
      const currentValue = currentData[field];
      const originalValue = originalData[field];
      
      // Handle null/undefined comparison
      const currentNormalized = currentValue === null || currentValue === undefined ? null : currentValue;
      const originalNormalized = originalValue === null || originalValue === undefined ? null : originalValue;
      
      if (!valuesAreEqual(currentNormalized, originalNormalized)) {
        changedFields[field] = currentValue;
      }
    });

    // Always include password if it's being changed
    if (currentData.password) {
      changedFields.password = currentData.password;
    }

    return changedFields;
  };

  const isPsychiatristForm = (formData.designation || '').toLowerCase().includes('psychiatrist');

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🚀 Form submission started');
    console.log('📦 Packages being sent:', formData.packages);
    console.log('📦 Filtered packages:', formData.packages.filter(pkg => pkg.name && pkg.price && pkg.sessions));
    
    setIsSubmitting(true);
    setErrors({});

    // Validate required fields
    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      const resolvedImage = typeof formData.coverImage === 'string' ? formData.coverImage : null;
      const safeImageUrl = resolvedImage && !resolvedImage.startsWith('data:') ? resolvedImage : undefined;
      
      // Build full doctor data object (containing only the active UI fields)
      const fullDoctorData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: countryCode + formData.phone,
        designation: formData.designation?.trim() || null,
        cover_image_url: safeImageUrl,
      };

      // Handle password for edit/add mode
      if (mode === 'edit' && showPasswordReset && newPassword.trim()) {
        fullDoctorData.password = newPassword;
      } else if (mode === 'add') {
        fullDoctorData.password = formData.password;
      }

      // Get only changed fields (for edit mode)
      const doctorData = mode === 'edit' 
        ? getChangedFields(fullDoctorData, originalDoctorData)
        : fullDoctorData;

      console.log('📤 Form submitted successfully');
      console.log('📤 Submitting doctor data:', doctorData);

      await onSave(doctorData);
      handleClose();
    } catch (error) {
      console.error('Error saving doctor:', error);
      setErrors({ submit: error.message || 'Failed to save doctor' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset the modification flag when closing the modal
    setHasUserModifiedAvailability(false);
    // Reset original packages
    setOriginalPackages([]);
    // Reset original doctor data
    setOriginalDoctorData(null);
    onClose();
  };

  if (!isOpen) return null;

  const sectionHeading = 'text-sm font-semibold text-slate-700 tracking-tight mb-3';

  const updateChildInitialCell = (variantKey, valueDigits) => {
    setChildSpecialistPricing((prev) => ({
      ...prev,
      initial: {
        ...prev.initial,
        [variantKey]: { ...prev.initial[variantKey], price: valueDigits },
      },
    }));
  };

  const updateChildFollowCell = (tierKey, variantKey, valueDigits) => {
    setChildSpecialistPricing((prev) => ({
      ...prev,
      followUpPackages: {
        ...prev.followUpPackages,
        [tierKey]: {
          ...prev.followUpPackages[tierKey],
          [variantKey]: {
            ...prev.followUpPackages[tierKey][variantKey],
            price: valueDigits,
          },
        },
      },
    }));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 z-10 flex-shrink-0 bg-white/95 backdrop-blur border-b border-slate-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <p className="text-sm font-semibold text-slate-800 tracking-tight">
              {mode === 'add' ? 'Add New Doctor' : 'Edit Doctor'}
            </p>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-[#025545] hover:bg-[#025545]/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Personal Information */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name *
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#025545]/20 focus:border-[#025545] text-sm ${
                  errors.firstName ? 'border-red-400' : 'border-slate-200'
                }`}
                placeholder="Enter first name"
              />
              {errors.firstName && (
                <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name *
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#025545]/20 focus:border-[#025545] text-sm ${
                  errors.lastName ? 'border-red-400' : 'border-slate-200'
                }`}
                placeholder="Enter last name"
              />
              {errors.lastName && (
                <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-28 rounded-lg border border-slate-200 px-3 py-2 bg-slate-50 outline-none focus:ring-2 focus:ring-[#025545]/20 text-sm"
                >
                  <option value="+91">🇮🇳 +91</option>
                </select>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value.replace(/[^\d]/g, ''))}
                  className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#025545]/20 focus:border-[#025545] text-sm ${
                    errors.phone ? 'border-red-400' : 'border-slate-200'
                  }`}
                  placeholder="Enter phone number"
                  inputMode="tel"
                />
              </div>
              {errors.phone && (
                <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
              )}
            </div>

                        <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#025545]/20 focus:border-[#025545] text-sm ${
                  errors.email ? 'border-red-400' : 'border-slate-200'
                }`}
                placeholder="Enter email address"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Designation / Title
              </label>
              <input
                type="text"
                value={formData.designation}
                onChange={(e) => handleInputChange('designation', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#025545]/20 focus:border-[#025545] text-sm"
                placeholder="e.g., Consultant Psychologist"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              {mode === 'edit' ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="px-3 py-2 border border-slate-200 rounded-lg bg-[#025545]/5 w-full">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-[#025545] rounded-full flex-shrink-0"></div>
                          <span className="text-sm text-[#025545] font-medium">Password is set and secure</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPasswordReset(!showPasswordReset)}
                      className="px-4 py-2 bg-[#025545] hover:bg-[#012f23] text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                    >
                      {showPasswordReset ? 'Cancel Reset' : 'Reset Password'}
                    </button>
                  </div>
                  {showPasswordReset && (
                    <div className="space-y-2">
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#025545]/20 focus:border-[#025545] text-sm"
                        placeholder="Enter new password"
                      />
                      <p className="text-xs text-gray-600">
                        Leave empty to keep current password unchanged
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-gray-500">
                  Password will be automatically set to MyKoott@#2026
                </div>
              )}
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password}</p>
              )}
            </div>
          </div>
          </div>

        {/* Cover Image */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          <div className={sectionHeading} role="heading" aria-level={3}>Cover Image</div>
          <div className="flex items-center space-x-4">
            {formData.coverImage ? (
              <div className="relative">
                <img
                  src={formData.coverImage}
                  alt="Cover image preview"
                  className="w-64 h-36 rounded-lg object-cover border-2 border-slate-200"
                />
                <button
                  type="button"
                  onClick={() => removeImage('coverImage')}
                  className="absolute -top-2 -right-2 bg-[#025545] text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-[#012f23] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="w-64 h-36 rounded-lg bg-slate-100 flex items-center justify-center">
                <FileText className="w-12 h-12 text-gray-400" />
              </div>
            )}
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload('coverImage', e.target.files[0])}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#025545]/10 file:text-[#025545] hover:file:bg-[#025545]/20"
              />
              <p className="text-xs text-gray-500 mt-1">Recommended: 16:9 ratio, max 5MB</p>
            </div>
          </div>
        </div>




          {/* Submit Error */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-600 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-[#025545] bg-white border border-[#025545]/40 rounded-lg hover:bg-[#025545]/10 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#025545] text-white rounded-lg hover:bg-[#012f23] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-sm"
            >
              {isSubmitting ? 'Saving...' : mode === 'add' ? 'Add Doctor' : 'Update Doctor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

