"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { clientApi, authApi } from "../../../lib/backendApi";

export default function ProfilePage() {
  const { user, token, login, hasRole, isLoading: authLoading, isRemembered } = useAuth();
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    country_code: '+91',
    child_name: '',
    child_age: ''
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveMsg, setProfileSaveMsg] = useState("");
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;
      
      // First, try to use data from user context (already loaded by layout)
      const profile = user.profile || user;
      if (profile.first_name || profile.last_name) {
        // Data already available in context, no need to fetch
        // Parse phone number to extract country code and number
        const phoneNumber = profile.phone_number || '';
        let countryCode = '+91';
        let phoneNumberOnly = phoneNumber;
        
        if (phoneNumber.startsWith('+91')) {
          countryCode = '+91';
          phoneNumberOnly = phoneNumber.substring(3);
        } else if (phoneNumber.startsWith('91') && phoneNumber.length > 10) {
          countryCode = '+91';
          phoneNumberOnly = phoneNumber.substring(2);
        }
        
        // Filter out default/placeholder values when loading form
        const invalidValues = ['Pending', 'pending', 'Update', 'update'];
        const childName = profile.child_name && !invalidValues.includes(profile.child_name) 
          ? profile.child_name 
          : '';
        // Filter out default age value (1) - treat it as empty/cleared
        const childAge = profile.child_age && profile.child_age !== 1 && profile.child_age !== null
          ? String(profile.child_age) 
          : '';
        
        setProfileForm({
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          phone_number: phoneNumberOnly,
          country_code: countryCode,
          child_name: childName,
          child_age: childAge
        });
        setIsDataLoaded(true);
        return;
      }
      
      // Only fetch if data is not in context
      try {
        const response = await authApi.getProfile();
        if (response?.data?.user) {
          const profileData = response.data.user.profile || response.data.user;
          
          // Parse phone number to extract country code and number
          const phoneNumber = profileData.phone_number || '';
          let countryCode = '+91';
          let phoneNumberOnly = phoneNumber;
          
          if (phoneNumber.startsWith('+91')) {
            countryCode = '+91';
            phoneNumberOnly = phoneNumber.substring(3);
          } else if (phoneNumber.startsWith('91') && phoneNumber.length > 10) {
            countryCode = '+91';
            phoneNumberOnly = phoneNumber.substring(2);
          }
          
          // Filter out default/placeholder values when loading form
          const invalidValues = ['Pending', 'pending', 'Update', 'update'];
          const childName = profileData.child_name && !invalidValues.includes(profileData.child_name) 
            ? profileData.child_name 
            : '';
          // Filter out default age value (1) - treat it as empty/cleared
          const childAge = profileData.child_age && profileData.child_age !== 1 && profileData.child_age !== null
            ? String(profileData.child_age) 
            : '';
          
          setProfileForm({
            first_name: profileData.first_name || '',
            last_name: profileData.last_name || '',
            phone_number: phoneNumberOnly,
            country_code: countryCode,
            child_name: childName,
            child_age: childAge
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setIsDataLoaded(true);
      }
    };
    
    fetchProfileData();
  }, [user]);

  const handleProfileInputChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveContact = async (e) => {
    e?.preventDefault?.();
    setProfileSaveMsg("");
    try {
      setIsSavingProfile(true);
      
      if (!profileForm.first_name || !profileForm.phone_number) {
        setProfileSaveMsg('Please fill in all required fields: First Name and Phone Number.');
        return;
      }

      // Combine country code and phone number for storage
      const fullPhoneNumber = profileForm.country_code + profileForm.phone_number;

      // Build update payload
      const updatePayload = {
        first_name: profileForm.first_name,
        phone_number: fullPhoneNumber
      };
      
      // Handle last_name - allow clearing by sending empty string
      // If field is empty/cleared, send empty string to clear it
      if (profileForm.last_name !== undefined && profileForm.last_name !== null) {
        updatePayload.last_name = profileForm.last_name.trim() || '';
      }
      
      // Handle child_name - allow clearing by sending empty string or default
      // If field is empty/cleared, send empty string to clear it (backend will handle default if needed)
      if (profileForm.child_name !== undefined && profileForm.child_name !== null) {
        updatePayload.child_name = profileForm.child_name.trim() || '';
      }
      
      // Handle child_age - allow clearing by sending null
      // If field is empty/cleared, send null to clear it
      if (profileForm.child_age !== undefined && profileForm.child_age !== null && profileForm.child_age !== '' && profileForm.child_age !== '0') {
        const ageValue = Number(profileForm.child_age);
        if (!isNaN(ageValue) && ageValue > 0) {
          updatePayload.child_age = ageValue;
        }
      } else if (profileForm.child_age === '' || profileForm.child_age === null || profileForm.child_age === '0') {
        // Explicitly clear child_age by sending null
        updatePayload.child_age = null;
      }

      await clientApi.updateProfile(updatePayload);

      const refreshed = await authApi.getProfile();
      if (refreshed?.data?.user) {
        login(refreshed.data.user, token, { remember: isRemembered });
        
        const refreshedProfile = refreshed.data.user.profile || {};
        
        // Parse phone number to extract country code and number
        const phoneNumber = refreshedProfile.phone_number || '';
        let countryCode = '+91';
        let phoneNumberOnly = phoneNumber;
        
        if (phoneNumber.startsWith('+91')) {
          countryCode = '+91';
          phoneNumberOnly = phoneNumber.substring(3);
        } else if (phoneNumber.startsWith('91') && phoneNumber.length > 10) {
          countryCode = '+91';
          phoneNumberOnly = phoneNumber.substring(2);
        }
        
        // Filter out default/placeholder values when loading form
        const invalidValues = ['Pending', 'pending', 'Update', 'update'];
        const childName = refreshedProfile.child_name && !invalidValues.includes(refreshedProfile.child_name) 
          ? refreshedProfile.child_name 
          : '';
        // Filter out default age value (1) - treat it as empty/cleared
        const childAge = refreshedProfile.child_age && refreshedProfile.child_age !== 1 && refreshedProfile.child_age !== null
          ? String(refreshedProfile.child_age) 
          : '';
        
        setProfileForm({
          first_name: refreshedProfile.first_name || '',
          last_name: refreshedProfile.last_name || '',
          phone_number: phoneNumberOnly,
          country_code: countryCode,
          child_name: childName,
          child_age: childAge
        });
      }
      setProfileSaveMsg('Profile saved successfully.');
    } catch (err) {
      console.error('Save profile failed:', err);
      setProfileSaveMsg(err.message || 'Failed to save. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (authLoading || !isDataLoaded) {
    return (
      <div className="bg-white p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderBottomColor: '#025545' }}></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h5 className="text-gray-900 mb-6">Profile</h5>


      <form className="space-y-6" onSubmit={handleSaveContact}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="first_name"
              value={profileForm.first_name}
              onChange={handleProfileInputChange}
              className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${
                !profileForm.first_name ? 'border-red-300' : 'border-gray-300'
              }`}
              style={{ '--tw-ring-color': '#025545' }}
              onFocus={(e) => { if (profileForm.first_name) { e.currentTarget.style.borderColor = '#025545'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(63, 46, 115, 0.2)'; } }}
              onBlur={(e) => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = ''; }}
              placeholder="Enter your first name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <input
              type="text"
              name="last_name"
              value={profileForm.last_name}
              onChange={handleProfileInputChange}
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 border-gray-300"
              style={{ '--tw-ring-color': '#025545' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#025545'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(63, 46, 115, 0.2)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = ''; }}
              placeholder="Enter your last name"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <div className="flex">
            <select
              name="country_code"
              value={profileForm.country_code}
              onChange={handleProfileInputChange}
              className="border border-gray-300 rounded-l-md px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': '#025545' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#025545'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(63, 46, 115, 0.2)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = ''; }}
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
              name="phone_number"
              value={profileForm.phone_number}
              onChange={handleProfileInputChange}
              className={`flex-1 border border-l-0 rounded-r-md px-3 py-2 focus:outline-none focus:ring-2 ${
                !profileForm.phone_number ? 'border-red-300' : 'border-gray-300'
              }`}
              style={{ '--tw-ring-color': '#025545' }}
              onFocus={(e) => { if (profileForm.phone_number) { e.currentTarget.style.borderColor = '#025545'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(63, 46, 115, 0.2)'; } }}
              onBlur={(e) => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = ''; }}
              placeholder="Enter your phone number"
              required
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Full number: {profileForm.country_code}{profileForm.phone_number || 'XXXXXXXXXX'}
          </p>
        </div>

        {hasRole('client') && (
          <div className="border-t pt-6">
            <h6 className="text-gray-900 mb-4">Child Information (Optional)</h6>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Child Name
                </label>
                <input
                  type="text"
                  name="child_name"
                  value={profileForm.child_name}
                  onChange={handleProfileInputChange}
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 border-gray-300"
                  style={{ '--tw-ring-color': '#025545' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#025545'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(63, 46, 115, 0.2)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = ''; }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Child Age
                </label>
                <input
                  type="number"
                  name="child_age"
                  min="1"
                  max="18"
                  value={profileForm.child_age}
                  onChange={handleProfileInputChange}
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 border-gray-300"
                  style={{ '--tw-ring-color': '#025545' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#025545'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(63, 46, 115, 0.2)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = ''; }}
                />
              </div>
            </div>
          </div>
        )}

        {profileSaveMsg && (
          <div className={`p-3 rounded border text-sm ${profileSaveMsg.includes('successfully') ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            {profileSaveMsg}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSavingProfile}
            className="inline-flex items-center rounded-full px-3 md:px-4 py-2 text-sm md:text-base font-semibold text-white shadow-sm transition-colors duration-200 disabled:opacity-60"
            style={{ backgroundColor: '#025545' }}
            onMouseEnter={(e) => !isSavingProfile && (e.currentTarget.style.backgroundColor = '#012f23')}
            onMouseLeave={(e) => !isSavingProfile && (e.currentTarget.style.backgroundColor = '#025545')}
          >
            {isSavingProfile ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
