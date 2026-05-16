"use client";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { psychologistApi } from "../../../lib/backendApi";
import { 
  User,
  Mail,
  GraduationCap,
  BookOpen,
  AlertCircle,
  CheckCircle,
  Calendar,
  RefreshCw
} from "lucide-react";

export default function PsychologistSettings() {
  const { user, token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isManualSubmit, setIsManualSubmit] = useState(false);
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    country_code: '+91',
    ug_college: '',
    pg_college: '',
    phd_college: '',
    area_of_expertise: '',
    description: ''
  });
  
  // Google Calendar states
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [calendarError, setCalendarError] = useState(null);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Track initial profile (API payload shape) so we only send changed fields on save
  const initialProfileRef = useRef(null);

  useEffect(() => {
    if (user && user.profile) {
      // Parse phone number to extract country code and number
      const phoneNumber = user.profile.phone || '';
      let countryCode = '+91';
      let phoneNumberOnly = phoneNumber;
      
      if (phoneNumber.startsWith('+91')) {
        countryCode = '+91';
        phoneNumberOnly = phoneNumber.substring(3);
      } else if (phoneNumber.startsWith('91') && phoneNumber.length > 10) {
        countryCode = '+91';
        phoneNumberOnly = phoneNumber.substring(2);
      }

      const areaArr = Array.isArray(user.profile.area_of_expertise)
        ? user.profile.area_of_expertise
        : (user.profile.area_of_expertise || '').split(',').map(s => s.trim()).filter(Boolean);
      const fullPhone = countryCode + phoneNumberOnly;

      const nextProfile = {
        first_name: user.profile.first_name || '',
        last_name: user.profile.last_name || '',
        email: user.email || '',
        phone: phoneNumberOnly,
        country_code: countryCode,
        ug_college: user.profile.ug_college || '',
        pg_college: user.profile.pg_college || '',
        phd_college: user.profile.phd_college || '',
        area_of_expertise: Array.isArray(user.profile.area_of_expertise) 
          ? user.profile.area_of_expertise.join(', ') 
          : user.profile.area_of_expertise || '',
        description: user.profile.description || ''
      };
      setProfile(nextProfile);

      // Store initial API payload shape for diffing (only send changed fields on save)
      initialProfileRef.current = {
        first_name: nextProfile.first_name,
        last_name: nextProfile.last_name,
        phone: fullPhone,
        ug_college: nextProfile.ug_college,
        pg_college: nextProfile.pg_college,
        phd_college: nextProfile.phd_college,
        area_of_expertise: areaArr,
        description: nextProfile.description || ''
      };
      
      // Check if Google Calendar is connected
      checkCalendarStatus();
    }
  }, [user]);
  
  const checkCalendarStatus = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api';
      const url = backendUrl.endsWith('/api') 
        ? `${backendUrl}/psychologists/google-calendar/status`
        : `${backendUrl}/api/psychologists/google-calendar/status`;
        
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsCalendarConnected(data.connected || false);
        setLastSyncTime(data.lastSync ? new Date(data.lastSync) : null);
        
        // Fetch calendar events if connected
        if (data.connected) {
          fetchCalendarEvents();
        }
      }
    } catch (error) {
      console.error('Error checking calendar status:', error);
    }
  };
  
  const fetchCalendarEvents = async () => {
    try {
      setIsLoadingEvents(true);
      
      // Fetch next 60 days of events
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 60);
      
      // 1. Fetch Google Calendar events (ALL events from their Gmail calendar)
      let googleEvents = [];
      try {
        const googleData = await psychologistApi.getGoogleCalendarEvents({
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString()
        });
        
        if (googleData.success) {
          googleEvents = (googleData.events || []).map(event => ({
            ...event,
            source: 'google_calendar',
            isExternal: true
          }));
        }
      } catch (error) {
        console.error('Error fetching Google events:', error);
      }
      
      // 2. Fetch Koott sessions (your platform bookings)
      let koottEvents = [];
      try {
        const sessionsData = await psychologistApi.getSessions();
        const sessions = sessionsData.data?.sessions || sessionsData.data || [];
        
        console.log('🔍 Raw sessions data:', sessions);
        
        // Convert sessions to calendar event format
        koottEvents = sessions
          .filter(session => session.status !== 'cancelled')
          .map(session => {
            // Parse time to add 1 hour for end time
            const [hours, minutes] = session.scheduled_time.split(':');
            const startDateTime = new Date(`${session.scheduled_date}T${session.scheduled_time}`);
            const endDateTime = new Date(startDateTime);
            endDateTime.setHours(endDateTime.getHours() + 1);
            
            return {
              summary: `Koott - ${session.client_name || 'Client'}`,
              start: {
                dateTime: `${session.scheduled_date}T${session.scheduled_time}`
              },
              end: {
                dateTime: endDateTime.toISOString()
              },
              description: `Status: ${session.status}${session.meeting_link ? '\n📹 Online Session' : ''}`,
              source: 'koott',
              isExternal: false,
              sessionId: session.id,
              status: session.status,
              clientName: session.client_name
            };
          });
      } catch (error) {
        console.error('Error fetching Koott sessions:', error);
      }
      
      // Combine both sources
      const allEvents = [...googleEvents, ...koottEvents];
      setCalendarEvents(allEvents);
      
      console.log('📅 Calendar Events Loaded:', {
        googleEvents: googleEvents.length,
        koottEvents: koottEvents.length,
        total: allEvents.length,
        sample: allEvents.slice(0, 2)
      });
      
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    } finally {
      setIsLoadingEvents(false);
    }
  };
  
  const handleConnectGoogleCalendar = () => {
  setCalendarError(null);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  const redirectUri = (process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI?.trim() ||
    `${window.location.origin}/auth/google-calendar/callback`);

  if (!clientId) {
    setCalendarError(
      'Google Calendar integration is not configured. Please contact support.'
    );
    console.error('Google Calendar connect failed: NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing');
    return;
  }

  if (!redirectUri) {
    setCalendarError(
      'Google Calendar redirect URL is not configured. Please contact support.'
    );
    console.error('Google Calendar connect failed: redirect URI is missing');
    return;
  }
    const scope = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events';
    
    console.log('🔍 Google Calendar Connection Debug:');
    console.log('📋 Scope being requested:', scope);
    console.log('🔗 Client ID:', clientId);
    console.log('🔗 Redirect URI:', redirectUri);
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scope)}` +
      `&access_type=offline` +
      `&prompt=consent`;
    
    console.log('🔗 Full Auth URL:', authUrl);
    window.location.href = authUrl;
  };
  
  const handleDisconnectGoogleCalendar = async () => {
    try {
      setIsSyncing(true);
      setCalendarError(null);
      
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api';
      const url = backendUrl.endsWith('/api') 
        ? `${backendUrl}/psychologists/google-calendar/disconnect`
        : `${backendUrl}/api/psychologists/google-calendar/disconnect`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        setIsCalendarConnected(false);
        setLastSyncTime(null);
        setSuccess('Google Calendar disconnected successfully');
      } else {
        const data = await response.json();
        setCalendarError(data.message || 'Failed to disconnect calendar');
      }
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      setCalendarError('Failed to disconnect Google Calendar');
    } finally {
      setIsSyncing(false);
    }
  };
  
  const handleSyncNow = async () => {
    try {
      setIsSyncing(true);
      setCalendarError(null);
      
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api';
      const url = backendUrl.endsWith('/api') 
        ? `${backendUrl}/availability-controller/sync-google-calendar`
        : `${backendUrl}/api/availability-controller/sync-google-calendar`;
      
      // Set date range for sync (next 30 days)
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          psychologist_id: user.id,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setLastSyncTime(new Date());
        setSuccess(`Synced successfully! Processed ${data.data?.blockedSlots?.length || 0} external bookings.`);
        // Refresh calendar events after sync
        fetchCalendarEvents();
      } else {
        const data = await response.json();
        setCalendarError(data.message || 'Failed to sync calendar');
      }
    } catch (error) {
      console.error('Error syncing calendar:', error);
      setCalendarError('Failed to sync with Google Calendar');
    } finally {
      setIsSyncing(false);
    }
  };
  
  const formatEventTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };
  
  const getEventColor = (summary, source) => {
    // Koott events are always green
    if (source === 'koott') {
      return 'bg-green-100 border-green-400 text-green-900';
    }
    
    // External events colored by type
    const lower = summary?.toLowerCase() || '';
    if (lower.includes('betterhelp') || lower.includes('therapy') || lower.includes('session')) {
      return 'bg-purple-100 border-purple-300 text-purple-800';
    }
    if (lower.includes('talkspace') || lower.includes('counseling')) {
      return 'bg-[#3f2e73]/10 border-[#3f2e73]/30 text-[#3f2e73]';
    }
    if (lower.includes('meeting') || lower.includes('call')) {
      return 'bg-orange-100 border-orange-300 text-orange-800';
    }
    return 'bg-gray-100 border-gray-300 text-gray-800';
  };
  
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek, year, month };
  };
  
  const getEventsForDate = (date) => {
    const toYmdLocal = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const dateStr = toYmdLocal(date);
    return calendarEvents.filter(event => {
      const startStr = event.start?.dateTime || event.start?.date;
      if (!startStr) return false;
      const evDateStr = toYmdLocal(new Date(startStr));
      return evDateStr === dateStr;
    });
  };
  
  const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('🔍 Form submitted - handleSubmit called');
    console.log('🔍 Event type:', e.type);
    console.log('🔍 Event target:', e.target);
    
    // Check if this is an automatic submission (no user interaction)
    if (e.type === 'submit' && !e.isTrusted) {
      console.log('⚠️ Automatic form submission detected, preventing...');
      return;
    }
    
    // Only proceed if this is a manual submission
    if (!isManualSubmit) {
      console.log('⚠️ Form submission not initiated by user, preventing...');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Combine country code and phone number for storage
      const fullPhoneNumber = profile.country_code + profile.phone;
      
      // Ensure area_of_expertise is an array (API expects array; form may store comma-separated string)
      const areaOfExpertise = Array.isArray(profile.area_of_expertise)
        ? profile.area_of_expertise
        : (profile.area_of_expertise || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);

      // Build current payload in same shape as API
      const currentPayload = {
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: fullPhoneNumber,
        ug_college: profile.ug_college,
        pg_college: profile.pg_college,
        phd_college: profile.phd_college || '',
        area_of_expertise: areaOfExpertise,
        description: profile.description || ''
      };

      // Send only changed fields (partial update)
      const initial = initialProfileRef.current || {};
      const changedFields = {};
      for (const key of Object.keys(currentPayload)) {
        const curr = currentPayload[key];
        const prev = initial[key];
        const same = Array.isArray(curr) && Array.isArray(prev)
          ? JSON.stringify(curr) === JSON.stringify(prev)
          : curr === prev;
        if (!same) changedFields[key] = curr;
      }

      if (Object.keys(changedFields).length === 0) {
        setSuccess('No changes to save.');
        return;
      }

      console.log('🔍 Profile data being sent (changed fields only):', changedFields);
      
      await psychologistApi.updateProfile(changedFields);
      
      // Update initial ref so next save only diffs from this state
      initialProfileRef.current = { ...initial, ...changedFields };
      
      setSuccess('Profile updated successfully!');
    } catch (err) {
      console.error('Profile update error:', err);
      // Validation details are attached by backendApi on 400 (err.details)
      let errorMessage = err.message || 'Failed to update profile. Please try again.';
      if (err.details && Array.isArray(err.details) && err.details.length > 0) {
        const validationErrors = err.details.map((d) => d.msg || d.message).join('. ');
        errorMessage = validationErrors;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 text-lg">User not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h6 className="font-semibold text-gray-900">Profile Settings</h6>
        </div>
      </div>

      {/* Profile Form */}
      <div className="mt-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Information */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <p className="font-medium text-gray-900 text-sm sm:text-base">Personal Information</p>
            </div>
            <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="inline h-4 w-4 mr-1" />
                    First Name
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    value={profile.first_name}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-[#3f2e73] focus:border-[#3f2e73]"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="inline h-4 w-4 mr-1" />
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    value={profile.last_name}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-[#3f2e73] focus:border-[#3f2e73]"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Mail className="inline h-4 w-4 mr-1" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={profile.email}
                    disabled
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📱 Phone Number
                  </label>
                  <div className="flex">
                    <select
                      name="country_code"
                      value={profile.country_code}
                      onChange={handleInputChange}
                      className="border border-gray-300 rounded-l-md px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#3f2e73] focus:border-[#3f2e73]"
                    >
                      <option value="+91">🇮🇳 +91</option>
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+44">🇬🇧 +44</option>
                      <option value="+33">🇫🇷 +33</option>
                      <option value="+49">🇩🇪 +49</option>
                      <option value="+81">🇯🇵 +81</option>
                      <option value="+86">🇨🇳 +86</option>
                      <option value="+971">🇦🇪 +971</option>
                      <option value="+966">🇸🇦 +966</option>
                      <option value="+65">🇸🇬 +65</option>
                    </select>
                    <input
                      type="tel"
                      name="phone"
                      value={profile.phone}
                      onChange={handleInputChange}
                      className="flex-1 border border-l-0 rounded-r-md px-3 py-2 focus:ring-[#3f2e73] focus:border-[#3f2e73]"
                      placeholder="Enter your phone number"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Full number: {profile.country_code}{profile.phone || 'XXXXXXXXXX'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Education */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <p className="font-medium text-gray-900 text-sm sm:text-base">Education</p>
            </div>
            <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <GraduationCap className="inline h-4 w-4 mr-1" />
                    Undergraduate College
                  </label>
                  <input
                    type="text"
                    name="ug_college"
                    value={profile.ug_college}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-[#3f2e73] focus:border-[#3f2e73]"
                    placeholder="e.g., University of California"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <GraduationCap className="inline h-4 w-4 mr-1" />
                    Postgraduate College
                  </label>
                  <input
                    type="text"
                    name="pg_college"
                    value={profile.pg_college}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-[#3f2e73] focus:border-[#3f2e73]"
                    placeholder="e.g., Stanford University"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <GraduationCap className="inline h-4 w-4 mr-1" />
                    PhD College (Optional)
                  </label>
                  <input
                    type="text"
                    name="phd_college"
                    value={profile.phd_college}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-[#3f2e73] focus:border-[#3f2e73]"
                    placeholder="e.g., Harvard University"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Professional Details */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <p className="font-medium text-gray-900 text-sm sm:text-base">Professional Details</p>
            </div>
            <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <BookOpen className="inline h-4 w-4 mr-1" />
                  Areas of Expertise
                </label>
                <input
                  type="text"
                  name="area_of_expertise"
                  value={profile.area_of_expertise}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-[#3f2e73] focus:border-[#3f2e73]"
                  placeholder="e.g., Child Psychology, Family Therapy, Anxiety Disorders"
                />
                <p className="mt-1 text-xs text-gray-500">Separate multiple areas with commas</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <BookOpen className="inline h-4 w-4 mr-1" />
                  Professional Description *
                </label>
                <textarea
                  name="description"
                  value={profile.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3f2e73] focus:border-[#3f2e73]"
                  placeholder="Describe the doctor's expertise and experience..."
                />
                <p className="mt-1 text-xs text-gray-500">This will be visible to potential clients</p>
              </div>
            </div>
          </div>

          {/* Google Calendar Integration */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <p className="font-medium text-gray-900 text-sm sm:text-base flex items-center">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Google Calendar Integration
              </p>
            </div>
            <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4">
              <div className="flex items-start">
                <div className="flex-1">
                  <p className="text-sm text-gray-700 mb-4">
                    Connect your Google Calendar to automatically prevent double bookings. When you have sessions booked on other platforms (BetterHelp, Talkspace, etc.), those time slots will be automatically blocked on Koott.
                  </p>
                  
                  {isCalendarConnected ? (
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                        <span className="text-sm text-green-700 font-medium">Google Calendar Connected</span>
                      </div>
                      
                      {lastSyncTime && (
                        <p className="text-xs text-gray-500">
                          Last synced: {lastSyncTime.toLocaleString()}
                        </p>
                      )}
                      
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={handleSyncNow}
                          disabled={isSyncing}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3f2e73] disabled:opacity-50"
                        >
                          {isSyncing ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700 mr-2"></div>
                              Syncing...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Sync Now
                            </>
                          )}
                        </button>
                        
                        <button
                          type="button"
                          onClick={handleDisconnectGoogleCalendar}
                          disabled={isSyncing}
                          className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                        >
                          Disconnect Calendar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConnectGoogleCalendar}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#3f2e73] hover:bg-[#1d1733] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3f2e73]"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Connect Google Calendar
                    </button>
                  )}
                  
                  {calendarError && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
                      <p className="text-sm text-red-700">{calendarError}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-4 bg-[#3f2e73]/10 border border-[#3f2e73]/20 rounded-md p-4">
                <p className="text-sm font-medium text-[#1d1733] mb-2">How it works:</p>
                <ul className="text-xs text-[#3f2e73] space-y-1 list-disc list-inside">
                  <li>System syncs your calendar every 30 minutes automatically</li>
                  <li>Bookings from other platforms are detected and blocked here</li>
                  <li>Prevents double bookings across all your therapy platforms</li>
                  <li>Read-only access - we never modify your calendar</li>
                </ul>
              </div>
              
              {/* Calendar Events Display */}
              {isCalendarConnected && (
                <div className="mt-6">
                  {/* Month Calendar View */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-semibold text-gray-900">Calendar View - Bookings from Other Platforms</p>
                      <button
                        onClick={fetchCalendarEvents}
                        disabled={isLoadingEvents}
                        className="text-xs text-[#3f2e73] hover:text-[#1d1733] flex items-center gap-1"
                      >
                        {isLoadingEvents ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-[#3f2e73]"></div>
                            Loading...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-3 w-3" />
                            Refresh
                          </>
                        )}
                      </button>
                    </div>
                    
                    {/* Calendar Header */}
                    <div className="bg-white border rounded-lg p-2 sm:p-3 w-full max-w-2xl mx-auto overflow-x-auto">
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <button
                          onClick={() => navigateMonth(-1)}
                          className="p-1 sm:p-1.5 hover:bg-gray-100 rounded-full"
                        >
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <p className="font-semibold text-sm sm:text-base">
                          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </p>
                        <button
                          onClick={() => navigateMonth(1)}
                          className="p-1 sm:p-1.5 hover:bg-gray-100 rounded-full"
                        >
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                      
                      {/* Calendar Grid */}
                      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                          <div key={day} className="text-center text-[10px] sm:text-xs font-semibold text-gray-600 py-1 sm:py-1.5">
                            {day}
                          </div>
                        ))}
                        
                        {(() => {
                          const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);
                          const days = [];
                          
                          // Empty cells before first day
                          for (let i = 0; i < startingDayOfWeek; i++) {
                            days.push(
                              <div key={`empty-${i}`} className="aspect-square"></div>
                            );
                          }
                          
                          // Days of month
                          for (let day = 1; day <= daysInMonth; day++) {
                            const date = new Date(year, month, day);
                            const eventsForDay = getEventsForDate(date);
                            const isToday = date.toDateString() === new Date().toDateString();
                            const isSelected = date.toDateString() === selectedDate.toDateString();
                            
                            days.push(
                              <button
                                key={day}
                                onClick={() => setSelectedDate(date)}
                                className={`aspect-square text-[10px] sm:text-xs rounded transition-colors ${
                                  isToday ? 'bg-[#3f2e73]/10 font-bold' : ''
                                } ${
                                  isSelected ? 'ring-1 sm:ring-2 ring-[#3f2e73]' : ''
                                } ${
                                  eventsForDay.length > 0 ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-100'
                                }`}
                              >
                                <div className="flex flex-col items-center justify-center h-full">
                                  <span className={eventsForDay.length > 0 ? 'text-red-700 font-semibold' : ''}>{day}</span>
                                  {eventsForDay.length > 0 && (
                                    <div className="flex gap-0.5 mt-0.5">
                                      {eventsForDay.slice(0, 3).map((_, i) => (
                                        <div key={i} className="w-0.5 h-0.5 sm:w-1 sm:h-1 bg-red-500 rounded-full"></div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </button>
                            );
                          }
                          
                          return days;
                        })()}
                      </div>
                    </div>
                  </div>
                  
                  {/* Selected Date Events */}
                  <div className="bg-white border rounded-lg p-4">
                    <p className="text-sm font-semibold text-gray-900 mb-3">
                      Events for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                    
                    {(() => {
                      const dayEvents = getEventsForDate(selectedDate);
                      return dayEvents.length > 0 ? (
                        <div className="space-y-2">
                          {dayEvents.map((event, index) => (
                            <div
                              key={index}
                              className={`p-3 rounded-lg border ${getEventColor(event.summary, event.source)}`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{event.summary || 'Untitled Event'}</p>
                                  <p className="text-xs mt-1 opacity-80">
                                    {new Date(event.start.dateTime || event.start.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                    {event.end && ` - ${new Date(event.end.dateTime || event.end.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`}
                                  </p>
                                  {event.location && (
                                    <p className="text-xs mt-1 opacity-70">📍 {event.location}</p>
                                  )}
                                  {event.description && (
                                    <p className="text-xs mt-2 opacity-60">{event.description}</p>
                                  )}
                                </div>
                                <div className="ml-3">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                    event.source === 'koott' 
                                      ? 'bg-green-200 text-green-900' 
                                      : 'bg-white/50'
                                  }`}>
                                    {event.source === 'koott' ? 'Koott' : 'External'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600">No events on this date</p>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Error and Success Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <p className="ml-3 text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <p className="ml-3 text-sm text-green-700">{success}</p>
              </div>
            </div>
          )}

        </form>
      </div>
    </div>
  );
}









