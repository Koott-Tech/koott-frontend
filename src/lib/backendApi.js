import { clearAuthData, getStoredToken } from './authStorage';

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001/api';

// Global refresh token callback - will be set by AuthContext
let globalRefreshTokenCallback = null;

// Function to set the refresh token callback
export const setRefreshTokenCallback = (callback) => {
  globalRefreshTokenCallback = callback;
};

// Request deduplication - prevent duplicate simultaneous requests
const pendingRequests = new Map();

// Regional detection for timeout adjustment
const detectRegion = () => {
  if (typeof window === 'undefined') return 'default';
  
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Middle East and high-latency regions
    const highLatencyRegions = [
      'Asia/Dubai', 'Asia/Qatar', 'Asia/Kuwait', 'Asia/Bahrain', 
      'Asia/Riyadh', 'Asia/Muscat', 'Asia/Abu_Dhabi', 'Asia/Doha'
    ];
    return highLatencyRegions.some(tz => timezone === tz) ? 'high-latency' : 'default';
  } catch (error) {
    return 'default';
  }
};

// Get timeout based on region and endpoint type
const getTimeoutForRequest = (endpoint) => {
  const isPaymentEndpoint = endpoint.includes('/payment/');
  const isRescheduleEndpoint = endpoint.includes('/reschedule') || endpoint.includes('/reschedule-request');
  const isRecurringBlocksEndpoint = endpoint.includes('/recurring-blocks');
  const region = detectRegion();
  
  // Payment and reschedule endpoints always get 30s
  if (isPaymentEndpoint || isRescheduleEndpoint) {
    return 30000;
  }
  // Recurring blocks: multiple GCal API calls + DB upsert + sync availability — can exceed 15s
  if (isRecurringBlocksEndpoint) {
    return 45000;
  }
  // Wix Velo HTTP function can be slow (cold start, external APIs)
  if (endpoint.includes('/admin/wix/discover-inspect') || endpoint.includes('/admin/wix/sync')) {
    return 60000;
  }
  // Public psychologist availability range: optional ?sync=1 runs GCal sync — must not abort at 15s
  if (endpoint.includes('/availability/psychologist/') && endpoint.includes('/range')) {
    return 60000;
  }
  
  // High-latency regions get 25s, others get 15s
  return region === 'high-latency' ? 25000 : 15000;
};

// Helper function to handle API responses
const handleResponse = async (response, options = {}) => {
  if (!response.ok) {
    try {
      const error = await response.json();
      
      // Only log errors if not silenced
      if (!options.silent) {
        console.error('Backend API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          // Don't log full error object to avoid exposing sensitive data
          errorMessage: error?.message || error?.error || 'Unknown error',
          // Don't log headers to avoid exposing tokens or sensitive headers
        });
      }
      
      // Handle authentication/authorization errors - auto logout
      // Skip auto-redirect for login/register endpoints (they handle errors themselves)
      const isAuthEndpoint = options.endpoint?.includes('/auth/login') || 
                            options.endpoint?.includes('/auth/register');
      
      // For login/register endpoints, let them handle their own errors (including 400 for validation/duplicate email)
      if (isAuthEndpoint && (response.status === 400 || response.status === 401 || response.status === 403)) {
        // Return the actual error message from the backend for login/register
        const backendError = error?.message || error?.error || 'Authentication failed';
        // Create and throw error immediately - don't let it fall through to other handlers
        // This error will be caught by the outer catch and re-thrown
        const authError = new Error(backendError);
        // Store the error in a way that won't be caught by the parseError handler
        throw authError;
      }
      
      if ((response.status === 401 || response.status === 403) && !isAuthEndpoint) {
        // 403 from CSRF (Origin/Referer check) must not clear auth - it's a config issue, not a session issue.
        // In production, backend returns 403 when ALLOWED_ORIGINS doesn't include the frontend origin.
        const isCsrfFailure = response.status === 403 && (
          (error?.message && (error.message.includes('CSRF') || error.message.includes('ALLOWED_ORIGINS'))) ||
          (error?.error && String(error.error).includes('CSRF'))
        );
        if (isCsrfFailure) {
          throw new Error(error?.message || error?.error || 'CSRF validation failed. Ensure the backend ALLOWED_ORIGINS includes this site\'s URL.');
        }

        // Check if it's a token expiration error
        const isTokenExpired = error.error === 'Token expired' || 
                              error.error === 'bad_jwt' || 
                              error.message?.includes('expired') ||
                              error.message?.includes('token is expired');
        
        // Auth error detected
        
        // Clear auth data
        if (typeof window !== 'undefined') {
          clearAuthData();
          
          // Store error message for auth modal to display
          const errorMsg = isTokenExpired 
            ? 'Your session has expired. Please log in again to continue.' 
            : 'Authentication failed. Please log in again.';
          localStorage.setItem('auth_error', errorMsg);
          
          // Redirect to home - auth modal will be shown by components that need it
          window.location.href = '/';
        }
        
        throw new Error(isTokenExpired ? 'Session expired' : 'Authentication failed');
      }
      
      // Handle empty error responses
      if (!error || Object.keys(error).length === 0) {
        if (response.status === 404) {
          throw new Error('Resource not found');
        } else if (response.status === 204) {
          // No content - this is often successful for DELETE operations
          return null;
        } else if (response.status === 200) {
          // 200 with empty response - this is successful but no data
          return null;
        } else {
          throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }
      }
      
      // Preserve backend message and attach validation details for 400 so UI can show them
      const errorMsg = error?.message || error?.error || `HTTP error! status: ${response.status}`;
      const err = new Error(errorMsg);
      if (response.status === 400 && error?.details && Array.isArray(error.details)) {
        err.details = error.details;
      }
      throw err;
    } catch (parseError) {
      // If this is already an Error object (from our throw above), re-throw it immediately
      // This preserves the original error message from the backend
      if (parseError instanceof Error && parseError.message && !parseError.message.includes('HTTP error')) {
        // This is a valid error we threw - re-throw it as-is
        throw parseError;
      }
      
      // Only log if it's actually a parse error (not an Error we threw)
      if (!(parseError instanceof Error)) {
      console.error('Failed to parse error response:', parseError);
      }
      
      // If JSON parsing fails, provide a more helpful error message
      let errorMessage = `HTTP error! status: ${response.status}`;
      if (response.statusText) {
        errorMessage += ` - ${response.statusText}`;
      }
      
      // Add specific error messages for common status codes
      // But preserve any specific error message we might have
      const isAuthEndpoint = options.endpoint?.includes('/auth/login') || 
                            options.endpoint?.includes('/auth/register');
      
      switch (response.status) {
        case 400:
          // For auth endpoints, preserve the error message we threw earlier
          // The error should have been re-thrown above, but if we reach here, use the error message
          if (isAuthEndpoint) {
            // If parseError is an Error with a message, use it (it should have been re-thrown, but just in case)
            if (parseError instanceof Error && parseError.message && !parseError.message.includes('HTTP error')) {
              errorMessage = parseError.message;
            } else {
              // Fallback: try to get message from the error object if available
          errorMessage = 'Please check your input and try again.';
            }
          } else {
            errorMessage = 'Please check your input and try again.';
          }
          break;
        case 401:
        case 403:
          // Auto logout on auth errors even if parsing fails
          // Skip auto-redirect for login/register endpoints (they handle errors themselves)
          const isAuthEndpointParse = options.endpoint?.includes('/auth/login') || 
                                options.endpoint?.includes('/auth/register');
          if (typeof window !== 'undefined' && !isAuthEndpointParse) {
            clearAuthData();
            localStorage.setItem('auth_error', 'Your session has expired. Please log in again.');
            window.location.href = '/';
          }
          // For login/register endpoints, provide a more helpful message
          if (isAuthEndpointParse) {
            errorMessage = 'Invalid email or password. No account found. Please create a new account.';
          } else {
          errorMessage = 'Authentication required. Please log in again.';
          }
          break;
        case 404:
          errorMessage = 'Resource not found. The requested endpoint does not exist.';
          break;
        case 500:
          errorMessage = 'Internal server error. Please try again later.';
          break;
        case 502:
        case 503:
        case 504:
          errorMessage = 'Service temporarily unavailable. Please try again later.';
          break;
      }
      
      throw new Error(errorMessage);
    }
  }
  
  // Handle successful responses
  try {
    const responseText = await response.text();
    
    // Handle empty responses
    if (!responseText || responseText.trim() === '') {
      return null;
    }
    
    return JSON.parse(responseText);
  } catch (parseError) {
    console.error('Response parsing failed:', parseError);
    throw new Error('Invalid response format from server');
  }
};

// Helper function to make API requests with token refresh support, retry logic, and deduplication
async function apiRequest(endpoint, options = {}) {
  const url = `${BACKEND_BASE_URL}${endpoint}`;
  
  // Request deduplication - prevent duplicate simultaneous requests
  const requestKey = `${endpoint}-${JSON.stringify(options)}`;
  if (pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey);
  }
  
  // Get token from localStorage if available
  let token = typeof window !== 'undefined' ? getStoredToken() : null;
  
  const makeRequest = async (authToken, retryCount = 0) => {
    const timeoutMs = getTimeoutForRequest(endpoint);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
        ...options.headers,
      },
      signal: controller.signal,
      ...options,
    };

    try {
      const response = await fetch(url, config);
      clearTimeout(timeoutId);
      
      // If we get a 401 and have a refresh callback, try to refresh the token
      if (response.status === 401 && globalRefreshTokenCallback && authToken) {
        const newToken = await globalRefreshTokenCallback();
        
        if (newToken && newToken !== authToken) {
          // Retry the request with the new token
          const retryConfig = {
            ...config,
            headers: {
              ...config.headers,
              'Authorization': `Bearer ${newToken}`,
            },
          };
          clearTimeout(timeoutId);
          return await fetch(url, retryConfig);
        }
      }
      
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Better error messages
      if (error.name === 'AbortError') {
        const isNetworkError = typeof navigator !== 'undefined' && !navigator.onLine;
        throw new Error(
          isNetworkError 
            ? 'No internet connection. Please check your network and try again.'
            : `Request timeout after ${timeoutMs}ms. The server may be slow or unreachable. Please try again.`
        );
      }
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        // Provide more helpful error message with endpoint info
        const endpointInfo = endpoint ? ` while calling ${endpoint}` : '';
        throw new Error(`Unable to connect to the server${endpointInfo}. Please check if the backend server is running and try again.`);
      }
      
      throw error;
    }
  };

  // Retry logic with exponential backoff
  const makeRequestWithRetry = async (authToken, maxRetries = 2) => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await makeRequest(authToken, attempt);
        
        // Success or client error (4xx) - don't retry
        if (response.ok || response.status < 500) {
          return response;
        }
        
        // Server error (5xx) - retry
        if (attempt < maxRetries && response.status >= 500) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Exponential backoff, max 5s
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        return response;
      } catch (error) {
        // Network/timeout errors - retry
        if (attempt < maxRetries && (
          error.message.includes('timeout') || 
          error.message.includes('network') ||
          error.message.includes('Failed to fetch')
        )) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
  };

  const requestPromise = (async () => {
    try {
      const response = await makeRequestWithRetry(token);
      return await handleResponse(response, { silent: options.silent, endpoint: endpoint });
    } finally {
      // Clean up pending request
      pendingRequests.delete(requestKey);
    }
  })();
  
  // Store pending request
  pendingRequests.set(requestKey, requestPromise);
  
  try {
    return await requestPromise;
  } catch (error) {
    // Only log errors if not silenced
    if (!options.silent) {
      console.error('API Request Failed:', {
        url,
        error: error.message,
        errorType: error.constructor.name,
        errorStack: error.stack,
        fullError: error
      });
    }
    throw error;
  }
}

// Authentication API
export const authApi = {
  // Client registration (only clients can register)
  async registerClient(clientData) {
    return apiRequest('/auth/register/client', {
      method: 'POST',
      body: JSON.stringify(clientData),
    });
  },

  // User login (all user types)
  async login(credentials) {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  // Get registration information
  async getRegistrationInfo() {
    return apiRequest('/auth/registration-info');
  },

  // Get current user profile
  async getProfile(options = {}) {
    return apiRequest('/auth/profile', options);
  },

  // Update profile picture
  async updateProfilePicture(profilePictureUrl) {
    return apiRequest('/auth/profile-picture', {
      method: 'PUT',
      body: JSON.stringify({ profile_picture_url: profilePictureUrl }),
    });
  },

  // Change password
  async changePassword(passwords) {
    return apiRequest('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(passwords),
    });
  },

  // Logout
  async logout() {
    return apiRequest('/auth/logout', {
      method: 'POST',
    });
  },

  // Send password reset OTP
  async sendPasswordResetOTP(email) {
    return apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  // Google OAuth login
  async googleLogin(idToken) {
    return apiRequest('/auth/google-login', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
  },

  // Reset password with OTP
  async resetPassword(email, otp, newPassword) {
    return apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, newPassword }),
    });
  },
};

// Client API
export const clientApi = {
  // Get client profile
  async getProfile() {
    return apiRequest('/clients/profile');
  },

  // Update client profile
  async updateProfile(profileData) {
    return apiRequest('/clients/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  // Get client sessions
  async getSessions(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    
    return apiRequest(`/clients/sessions?${queryParams}`);
  },

  // Get single session with summary
  async getSession(sessionId) {
    return apiRequest(`/clients/sessions/${sessionId}`);
  },

  // Book a session
  async bookSession(sessionData) {
    return apiRequest('/clients/book-session', {
      method: 'POST',
      body: JSON.stringify(sessionData),
    });
  },

  // Cancel a session
  async cancelSession(sessionId) {
    return apiRequest(`/clients/sessions/${sessionId}/cancel`, {
      method: 'PUT',
    });
  },

  // Request reschedule for a session
  async requestReschedule(sessionId) {
    return apiRequest(`/clients/sessions/${sessionId}/reschedule-request`, {
      method: 'POST',
    });
  },

  // Reschedule session with new date/time
  async rescheduleSession(sessionId, rescheduleData) {
    return apiRequest(`/clients/sessions/${sessionId}/reschedule`, {
      method: 'PUT',
      body: JSON.stringify(rescheduleData),
    });
  },

  // Get free assessment availability for rescheduling
  async getFreeAssessmentAvailabilityForReschedule(sessionId) {
    return apiRequest(`/clients/sessions/${sessionId}/free-assessment-availability`, {
      method: 'GET',
    });
  },

  // Submit session feedback
  async submitSessionFeedback(sessionId, feedbackData) {
    return apiRequest(`/clients/sessions/${sessionId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(feedbackData),
    });
  },

  // Get client packages
  async getClientPackages() {
    return apiRequest('/clients/packages', {
      method: 'GET'
    });
  },

  // Book remaining session from package
  async bookRemainingSession(data) {
    return apiRequest('/clients/book-remaining-session', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Reserve assessment slot for payment
  async reserveAssessmentSlot(data) {
    return apiRequest('/clients/assessments/reserve-slot', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Book assessment session (after payment)
  async bookAssessment(data) {
    return apiRequest('/clients/assessments/book', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Get assessment sessions
  async getAssessmentSessions(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    return apiRequest(`/clients/assessments/sessions?${queryParams}`);
  },

  // Reschedule assessment session (client)
  async rescheduleAssessmentSession(assessmentSessionId, data) {
    return apiRequest(`/clients/assessments/sessions/${assessmentSessionId}/reschedule`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Reserve time slot for payment
  async reserveSlot(data) {
    return apiRequest('/clients/reserve-slot', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Get available psychologists
  async getPsychologists(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    
    return apiRequest(`/clients/psychologists?${queryParams}`);
  },

  // Get client receipts
  async getReceipts() {
    return apiRequest('/clients/receipts');
  },

  // Download receipt (returns blob for PDF download)
  async downloadReceipt(receiptId) {
    const token = getStoredToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    // Use BACKEND_BASE_URL which already includes /api, so just add the path
    const response = await fetch(`${BACKEND_BASE_URL}/clients/receipts/${receiptId}/download`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to download receipt' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    // Check if response is a PDF (content-type: application/pdf)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/pdf')) {
      // Return blob for PDF download
      const blob = await response.blob();
      return { success: true, blob, contentType: 'application/pdf' };
    } else {
      // Fallback: try to parse as JSON (for legacy responses with downloadUrl)
      const data = await response.json();
      return data;
    }
  },

  // Get receipt by Razorpay order ID
  async getReceiptByOrderId(orderId) {
    // Add cache-busting timestamp to prevent stale data
    const timestamp = Date.now();
    return apiRequest(`/clients/receipts/order/${orderId}?_t=${timestamp}`);
  },
};

// Psychologist API
export const psychologistApi = {
  // Get psychologist profile
  async getProfile() {
    return apiRequest('/psychologists/profile');
  },

  // Update psychologist profile
  async updateProfile(profileData) {
    return apiRequest('/psychologists/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  // Get psychologist sessions
  async getSessions(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    
    return apiRequest(`/psychologists/sessions?${queryParams}`);
  },

  // Get client's completed session history (for History popup). Private notes only for sessions conducted by current psychologist.
  async getClientSessionHistory(clientId) {
    return apiRequest(`/psychologists/clients/${encodeURIComponent(clientId)}/session-history`);
  },

  // Get monthly stats (completed and upcoming sessions)
  async getMonthlyStats() {
    return apiRequest('/psychologists/stats/monthly');
  },

  // Update session (notes, summary, status)
  async updateSession(sessionId, updateData) {
    return apiRequest(`/psychologists/sessions/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  },

  // Complete session with summary, report, and notes
  async completeSession(sessionId, sessionData) {
    return apiRequest(`/psychologists/sessions/${sessionId}/complete`, {
      method: 'POST',
      body: JSON.stringify(sessionData),
    });
  },

  // Upload session completion attachment (psychologist)
  async uploadAttachment(file) {
    const url = `${BACKEND_BASE_URL}/psychologists/upload/file`;
    const token = typeof window !== 'undefined' ? getStoredToken() : null;
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: formData,
    });
    const result = await handleResponse(response);
    return result;
  },

  // Mark session as no-show
  async markSessionAsNoShow(sessionId, reason = '') {
    return apiRequest(`/psychologists/sessions/${sessionId}/no-show`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
  },

  // Delete regular session
  async deleteSession(sessionId) {
    return apiRequest(`/psychologists/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  },

  // Schedule pending assessment session
  async scheduleAssessmentSession(assessmentSessionId, scheduleData) {
    return apiRequest(`/psychologists/assessment-sessions/${assessmentSessionId}/schedule`, {
      method: 'POST',
      body: JSON.stringify(scheduleData),
    });
  },

  // Delete assessment session
  async deleteAssessmentSession(assessmentSessionId) {
    return apiRequest(`/psychologists/assessment-sessions/${assessmentSessionId}`, {
      method: 'DELETE',
    });
  },

  // Reschedule assessment session (psychologist)
  async rescheduleAssessmentSession(assessmentSessionId, data) {
    return apiRequest(`/psychologists/assessment-sessions/${assessmentSessionId}/reschedule`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // ── Private note password ──────────────────────────────
  async getPrivateNotePasswordStatus() {
    return apiRequest('/psychologists/private-notes/status');
  },
  async setupPrivateNotePassword(password) {
    return apiRequest('/psychologists/private-notes/setup', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  },
  async changePrivateNotePassword(currentPassword, newPassword) {
    return apiRequest('/psychologists/private-notes/change', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },
  async verifyPrivateNotePassword(password) {
    return apiRequest('/psychologists/private-notes/verify', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  },
  async resetPrivateNotePassword(loginPassword, newPassword) {
    return apiRequest('/psychologists/private-notes/reset', {
      method: 'POST',
      body: JSON.stringify({ loginPassword, newPassword }),
    });
  },


  // Get availability
  async getAvailability(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    
    return apiRequest(`/psychologists/availability?${queryParams}`);
  },

  // Update availability
  async updateAvailability(availabilityData) {
    return apiRequest('/psychologists/availability', {
      method: 'PUT',
      body: JSON.stringify(availabilityData),
    });
  },

  // Add new availability
  async addAvailability(availabilityData) {
    return apiRequest('/psychologists/availability', {
      method: 'POST',
      body: JSON.stringify(availabilityData),
    });
  },

  // Delete availability
  async deleteAvailability(availabilityId) {
    return apiRequest(`/psychologists/availability/${availabilityId}`, {
      method: 'DELETE',
    });
  },

  // Recurring blocks (e.g. block every Sunday - applies to all future weeks)
  async getRecurringBlocks() {
    return apiRequest('/psychologists/recurring-blocks');
  },
  async addRecurringBlock(data) {
    return apiRequest('/psychologists/recurring-blocks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async deleteRecurringBlock(blockId) {
    return apiRequest(`/psychologists/recurring-blocks/${blockId}`, {
      method: 'DELETE',
    });
  },

  // Get Google Calendar events
  async getGoogleCalendarEvents(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    
    return apiRequest(`/psychologists/google-calendar/events?${queryParams}`);
  },

  // Get notifications
  async getNotifications(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    
    return apiRequest(`/notifications?${queryParams}`);
  },

  // Get unread notification count
  async getUnreadNotificationCount() {
    return apiRequest('/notifications/unread-count');
  },

  // Mark notification as read
  async markNotificationAsRead(notificationId) {
    return apiRequest(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  },

  // Mark all notifications as read
  async markAllNotificationsAsRead() {
    return apiRequest('/notifications/mark-all-read', {
      method: 'PUT',
    });
  },

  // Delete notification
  async deleteNotification(notificationId) {
    return apiRequest(`/notifications/${notificationId}`, {
      method: 'DELETE',
    });
  },
};

// Admin API
export const adminApi = {
  // Get all users
  async getUsers(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    
    return apiRequest(`/admin/users?${queryParams}`);
  },

  // Get all psychologists directly from psychologists table
  async getPsychologists(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    
    return apiRequest(`/admin/psychologists?${queryParams}`);
  },

  // Get user details
  async getUserDetails(userId) {
    return apiRequest(`/admin/users/${userId}`);
  },

  // Update user role
  async updateUserRole(userId, newRole) {
    return apiRequest(`/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ new_role: newRole }),
    });
  },

  // Deactivate user
  async deactivateUser(userId, reason) {
    return apiRequest(`/admin/users/${userId}/deactivate`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
  },

  // Get platform statistics
  async getPlatformStats(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/admin/stats/platform?${queryString}` : '/admin/stats/platform';
    return apiRequest(endpoint);
  },

  // Search users
  async searchUsers(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    
    return apiRequest(`/admin/search/users?${queryParams}`);
  },

  // Create psychologist (admin only)
  async createPsychologist(psychologistData) {
    return apiRequest('/admin/psychologists', {
      method: 'POST',
      body: JSON.stringify(psychologistData),
    });
  },

  // Update psychologist (admin only)
  async updatePsychologist(psychologistId, psychologistData) {
    return apiRequest(`/admin/psychologists/${psychologistId}`, {
      method: 'PUT',
      body: JSON.stringify(psychologistData),
    });
  },

  // Upload image (admin). Optional `bucket` targets a specific storage bucket
  // (allowlist on backend: 'profile-pictures' default, 'manual-bookings' for payment proofs, etc.)
  async uploadImage(file, options = {}) {
    const url = `${BACKEND_BASE_URL}/admin/upload/image`;
    const token = typeof window !== 'undefined' ? getStoredToken() : null;
    const formData = new FormData();
    formData.append('file', file);
    if (options.bucket) formData.append('bucket', options.bucket);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: formData,
    });
    const result = await handleResponse(response);
    return result;
  },

  // Delete psychologist (admin only)
  async deletePsychologist(psychologistId) {
    return apiRequest(`/admin/psychologists/${psychologistId}`, {
      method: 'DELETE',
    });
  },

  // Create packages for psychologist (admin only)
  async createPsychologistPackages(psychologistId, packagesData) {
    return apiRequest(`/admin/psychologists/${psychologistId}/packages`, {
      method: 'POST',
      body: JSON.stringify(packagesData),
    });
  },

  // Create user (admin only)
  async createUser(userData) {
    return apiRequest('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // Update user (admin only)
  async updateUser(userId, userData) {
    return apiRequest(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  // Delete user (admin only)
  async deleteUser(userId) {
    return apiRequest(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  },

  // Transfer a platform session to a different therapist (optionally with a new date/time)
  async transferSession(sessionId, { new_psychologist_id, new_date, new_time, new_duration }) {
    return apiRequest(`/admin/sessions/${sessionId}/transfer`, {
      method: 'POST',
      body: JSON.stringify({ new_psychologist_id, new_date, new_time, new_duration }),
    });
  },

  // Transfer a Wix booking to a different therapist (optionally with a new date/time)
  async transferWixBooking(wixBookingId, { new_psychologist_id, new_date, new_time, new_duration }) {
    return apiRequest(`/admin/wix/bookings/${wixBookingId}/transfer`, {
      method: 'POST',
      body: JSON.stringify({ new_psychologist_id, new_date, new_time, new_duration }),
    });
  },

  async rescheduleWixBooking(wixBookingId, { new_date, new_time, noshow_fee_amount, noshow_fee_method, noshow_fee_receipt_url } = {}) {
    return apiRequest(`/admin/wix/bookings/${wixBookingId}/reschedule`, {
      method: 'POST',
      body: JSON.stringify({
        new_date, new_time,
        // No-show reschedule fee (only present when rescheduling a no-show session).
        ...(noshow_fee_amount !== undefined ? { noshow_fee_amount, noshow_fee_method, noshow_fee_receipt_url } : {}),
      }),
    });
  },

  // Cancel a Wix booking WITHOUT refund — frees the slot, keeps it reschedulable (on_hold).
  async cancelOnlyWixBooking(wixBookingId) {
    return apiRequest(`/admin/wix/bookings/${wixBookingId}/cancel-only`, {
      method: 'POST',
    });
  },

  // Reschedule session
  async rescheduleSession(sessionId, rescheduleData) {
    const mappedData = {
      // Admin backend expects updateSession payload keys
      scheduled_date: rescheduleData?.new_date || rescheduleData?.scheduled_date,
      scheduled_time: rescheduleData?.new_time || rescheduleData?.scheduled_time,
      // Keep status aligned with admin reschedule action
      status: rescheduleData?.status || 'rescheduled',
      ...(rescheduleData?.reason ? { reason: rescheduleData.reason } : {}),
      // No-show reschedule fee (only present when rescheduling a no-show session).
      ...(rescheduleData?.noshow_fee_amount !== undefined ? {
        noshow_fee_amount: rescheduleData.noshow_fee_amount,
        noshow_fee_method: rescheduleData.noshow_fee_method,
        noshow_fee_receipt_url: rescheduleData.noshow_fee_receipt_url,
      } : {}),
    };

    return apiRequest(`/admin/sessions/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify(mappedData),
    });
  },

  // Update session payment details
  async updateSessionPayment(sessionId, paymentData) {
    return apiRequest(`/admin/sessions/${sessionId}/payment`, {
      method: 'PUT',
      body: JSON.stringify(paymentData),
    });
  },

  // Update session (comprehensive - all fields)
  async updateSession(sessionId, sessionData) {
    return apiRequest(`/admin/sessions/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify(sessionData),
    });
  },

  // Complete session (admin - for free assessments and regular sessions)
  async completeSession(sessionId, sessionData) {
    return apiRequest(`/admin/sessions/${sessionId}/complete`, {
      method: 'POST',
      body: JSON.stringify(sessionData),
    });
  },

  // Get psychologist availability for reschedule
  async getPsychologistAvailabilityForReschedule(psychologistId, startDate, endDate) {
    return apiRequest(`/admin/psychologists/${psychologistId}/availability?startDate=${startDate}&endDate=${endDate}`);
  },

  // Get all reschedule requests
  async getRescheduleRequests(status) {
    const query = status ? `?status=${status}` : '';
    return apiRequest(`/admin/reschedule-requests${query}`);
  },

  // Handle reschedule request (approve/reject) - admin
  async handleRescheduleRequest(notificationId, action, reason = '') {
    return apiRequest(`/admin/reschedule-requests/${notificationId}`, {
      method: 'PUT',
      body: JSON.stringify({ action, reason }),
    });
  },

  // Approve assessment reschedule request
  async approveAssessmentRescheduleRequest(notificationId, data) {
    return apiRequest(`/admin/reschedule-requests/assessment/${notificationId}/approve`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Reschedule assessment session (admin)
  async rescheduleAssessmentSession(assessmentSessionId, data) {
    return apiRequest(`/admin/assessment-sessions/${assessmentSessionId}/reschedule`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete assessment session (admin)
  async deleteAssessmentSession(assessmentSessionId) {
    return apiRequest(`/admin/assessment-sessions/${assessmentSessionId}`, {
      method: 'DELETE',
    });
  },

  // Set availability for a psychologist (admin)
  async setPsychologistAvailability({ psychologist_id, date, time_slots, is_available = true }) {
    return apiRequest('/availability/set', {
      method: 'POST',
      body: JSON.stringify({ psychologist_id, date, time_slots, is_available })
    });
  },

  // Get psychologist calendar events
  async getPsychologistCalendarEvents(psychologistId, startDate, endDate) {
    return apiRequest(`/admin/psychologists/${psychologistId}/calendar-events?startDate=${startDate}&endDate=${endDate}`);
  },

  /**
   * Calls Wix `/_functions/discover` via backend (keys never exposed to browser).
   * @param {{ includeRaw?: boolean }} options — includeRaw adds full discover JSON (large).
   */
  async getWixDiscoverInspect(options = {}) {
    const params = new URLSearchParams();
    if (options.includeRaw) params.set('includeRaw', '1');
    const q = params.toString();
    return apiRequest(`/admin/wix/discover-inspect${q ? `?${q}` : ''}`);
  },

  /** Upsert all bookings from Wix discover into `wix_bookings`. */
  async syncWixBookings() {
    return apiRequest('/admin/wix/sync', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  /** Paginated list from Supabase `wix_bookings` (after sync). */
  async getWixBookings(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      queryParams.append(key, String(value));
    });
    const q = queryParams.toString();
    return apiRequest(`/admin/wix/bookings${q ? `?${q}` : ''}`);
  },

  /** Detect orphan / suspicious Wix bookings (unlinked ₹0, duplicates, dangling children). */
  async getWixOrphans() {
    return apiRequest('/admin/wix/orphans');
  },

  /** List therapists discovered from Wix booking mirror. */
  async getWixTherapists(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      queryParams.append(key, String(value));
    });
    const q = queryParams.toString();
    return apiRequest(`/admin/wix/therapists${q ? `?${q}` : ''}`);
  },

  /** Get a single wix_bookings row by Supabase id. */
  async getWixBookingDetails(id) {
    return apiRequest(`/admin/wix/bookings/${id}`);
  },

  /** Edit a Wix booking (sets locally_modified=true, sync-safe). */
  async editWixBooking(id, updates) {
    return apiRequest(`/admin/wix/bookings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  /** Soft-delete a Wix booking (status→deleted, locally_modified→true). */
  async deleteWixBooking(id) {
    return apiRequest(`/admin/wix/bookings/${id}`, {
      method: 'DELETE',
    });
  },

  /** Mark a Wix booking as completed (locally_modified→true). */
  async completeWixBooking(id) {
    return apiRequest(`/admin/wix/bookings/${id}/complete`, {
      method: 'PATCH',
      body: JSON.stringify({}),
    });
  },

  /** Mark a Wix booking as no-show (locally_modified→true). */
  async noShowWixBooking(id) {
    return apiRequest(`/admin/wix/bookings/${id}/no-show`, {
      method: 'PATCH',
      body: JSON.stringify({}),
    });
  },

  /** Cancel a session (any source) and mark as refunded. Removes the Google Calendar event. */
  async cancelRefundSession(sessionId) {
    return apiRequest(`/admin/sessions/${sessionId}/cancel-refund`, {
      method: 'PATCH',
      body: JSON.stringify({}),
    });
  },

  /** Finance: mark manual/admin session payment as verified. */
  async verifyPayment(sessionId) {
    return apiRequest(`/admin/sessions/${sessionId}/verify-payment`, {
      method: 'PATCH',
      body: JSON.stringify({}),
    });
  },

  /** Cancel a Wix booking and mark as refunded. Removes the Google Calendar event. */
  async cancelRefundWixBooking(id) {
    return apiRequest(`/admin/wix/bookings/${id}/cancel-refund`, {
      method: 'PATCH',
      body: JSON.stringify({}),
    });
  },

  // Create manual booking (admin only)
  async createManualBooking(bookingData) {
    return apiRequest('/admin/bookings/manual', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  },

  // Create a manual PACKAGE booking — schedules all N sessions upfront (one payment,
  // N sessions each with calendar event + Meet link + email/WhatsApp).
  async createManualPackageBooking(bookingData) {
    return apiRequest('/admin/bookings/manual-package', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  },

  // Create record-only booking (admin only): session record only, no Meet, no notifications
  async createRecordOnlyBooking(bookingData) {
    return apiRequest('/admin/bookings/record-only', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  },

  // Record-only PACKAGE: record N already-happened package sessions, rest bookable later.
  async createRecordOnlyPackage(data) {
    return apiRequest('/admin/bookings/record-only-package', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Book next package session (admin only) - for clients who prefer admin to book remaining sessions
  async bookPackageNextSession({ client_id, package_id, scheduled_date, scheduled_time }) {
    return apiRequest('/admin/bookings/book-package-next-session', {
      method: 'POST',
      body: JSON.stringify({ client_id, package_id, scheduled_date, scheduled_time }),
    });
  },

  // Book next session for a Wix package booking (uses wix_bookings.id, no internal package required)
  async bookWixNextSession({ wix_row_id, scheduled_date, scheduled_time, duration_minutes }) {
    return apiRequest(`/admin/wix/bookings/${wix_row_id}/book-next-session`, {
      method: 'POST',
      body: JSON.stringify({ scheduled_date, scheduled_time, duration_minutes }),
    });
  },

  // Get packages with remaining sessions (admin only - for Packages tab)
  async getPackagesWithRemaining() {
    return apiRequest('/admin/bookings/packages-with-remaining');
  },

  // Stable A/B/C labels for clients with multiple packages from the same therapist.
  // Returns { labels: { "<clientId>|<psychId>": { "<groupId>": "A", ... } } }.
  async getPackageLabels() {
    return apiRequest('/admin/bookings/package-labels');
  },

  // Free Assessment Timeslots API
  async getFreeAssessmentTimeslots() {
    return apiRequest('/free-assessment-timeslots');
  },

  async createFreeAssessmentTimeslot(timeslotData) {
    return apiRequest('/free-assessment-timeslots', {
      method: 'POST',
      body: JSON.stringify(timeslotData),
    });
  },

  async updateFreeAssessmentTimeslot(id, timeslotData) {
    return apiRequest(`/free-assessment-timeslots/${id}`, {
      method: 'PUT',
      body: JSON.stringify(timeslotData),
    });
  },

  async deleteFreeAssessmentTimeslot(id) {
    return apiRequest(`/free-assessment-timeslots/${id}`, {
      method: 'DELETE',
    });
  },

  async bulkCreateFreeAssessmentTimeslots(timeslotsData) {
    return apiRequest('/free-assessment-timeslots/bulk', {
      method: 'POST',
      body: JSON.stringify(timeslotsData),
    });
  },

  async bulkUpdateFreeAssessmentTimeslots(timeslotsData) {
    return apiRequest('/free-assessment-timeslots/bulk/update', {
      method: 'PUT',
      body: JSON.stringify(timeslotsData),
    });
  },

  async getDateConfigsRange(startDate, endDate) {
    return apiRequest(`/free-assessment-timeslots/date-configs-range?startDate=${startDate}&endDate=${endDate}`);
  },

  async createDateConfig(dateConfigData) {
    return apiRequest('/free-assessment-timeslots/date-config', {
      method: 'POST',
      body: JSON.stringify(dateConfigData),
    });
  },

  async getDateConfig(date) {
    return apiRequest(`/free-assessment-timeslots/date-config/${date}`);
  },

  async deleteDateConfig(date) {
    return apiRequest(`/free-assessment-timeslots/date-config/${date}`, {
      method: 'DELETE',
    });
  },

  async getAvailabilityRange(startDate, endDate) {
    return apiRequest(`/free-assessment-timeslots/availability-range?startDate=${startDate}&endDate=${endDate}`);
  },

  // Counselling Services Management
  async getCounsellingServices(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    
    return apiRequest(`/counselling/admin?${queryParams}`);
  },

  async getCounsellingService(id) {
    return apiRequest(`/counselling/admin/${id}`);
  },

  async createCounsellingService(serviceData) {
    return apiRequest('/counselling/admin', {
      method: 'POST',
      body: JSON.stringify(serviceData),
    });
  },

  async updateCounsellingService(id, serviceData) {
    return apiRequest(`/counselling/admin/${id}`, {
      method: 'PUT',
      body: JSON.stringify(serviceData),
    });
  },

  async deleteCounsellingService(id) {
    return apiRequest(`/counselling/admin/${id}`, {
      method: 'DELETE',
    });
  },

  // Assessment Services Management
  async getAssessments(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    
    return apiRequest(`/assessments/admin?${queryParams}`);
  },

  async getAssessment(id) {
    return apiRequest(`/assessments/admin/${id}`);
  },

  async createAssessment(assessmentData) {
    return apiRequest('/assessments/admin', {
      method: 'POST',
      body: JSON.stringify(assessmentData),
    });
  },

  async updateAssessment(id, assessmentData) {
    return apiRequest(`/assessments/admin/${id}`, {
      method: 'PUT',
      body: JSON.stringify(assessmentData),
    });
  },

  async deleteAssessment(id) {
    return apiRequest(`/assessments/admin/${id}`, {
      method: 'DELETE',
    });
  },
  
  // Update all psychologists with default availability
  async updateAllPsychologistsAvailability() {
    return apiRequest('/admin/availability/update-all', {
      method: 'POST',
    });
  },

  // Add next day availability (daily task)
  async addNextDayAvailability() {
    return apiRequest('/admin/availability/add-next-day', {
      method: 'POST',
    });
  },
  
  // Better Parenting CMS (admin)
  async getBetterParentingPages(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => { if (value) queryParams.append(key, value); });
    return apiRequest(`/better-parenting/admin?${queryParams}`);
  },
  async getBetterParentingPage(id) {
    return apiRequest(`/better-parenting/admin/${id}`);
  },
  async createBetterParentingPage(data) {
    return apiRequest('/better-parenting/admin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async updateBetterParentingPage(id, data) {
    return apiRequest(`/better-parenting/admin/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  async deleteBetterParentingPage(id) {
    return apiRequest(`/better-parenting/admin/${id}`, {
      method: 'DELETE',
    });
  },

  // Get free assessments (admin only)
  async getFreeAssessments(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    
    return apiRequest(`/free-assessments/admin/list${queryParams.toString() ? `?${queryParams}` : ''}`);
  },

  // Delete free assessment (admin only)
  async deleteFreeAssessment(assessmentId) {
    return apiRequest(`/free-assessments/admin/${assessmentId}`, {
      method: 'DELETE',
    });
  },

  // Workshop / event registrations (Supabase-backed)
  async getEventRegistrations() {
    return apiRequest('/admin/event-registrations');
  },
  async updateEventRegistration(registrationId, data) {
    return apiRequest(`/admin/event-registrations/${registrationId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  async deleteEventRegistration(registrationId) {
    return apiRequest(`/admin/event-registrations/${registrationId}`, {
      method: 'DELETE',
    });
  },

  // Marketing event pages CMS (/events/[slug])
  async getEventPagesAdmin(params = {}) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') q.append(k, v);
    });
    return apiRequest(`/event-pages/admin?${q}`);
  },
  async getEventPageAdmin(id) {
    return apiRequest(`/event-pages/admin/${id}`);
  },
  async createEventPage(data) {
    return apiRequest('/event-pages/admin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async updateEventPage(id, data) {
    return apiRequest(`/event-pages/admin/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  async deleteEventPage(id) {
    return apiRequest(`/event-pages/admin/${id}`, {
      method: 'DELETE',
    });
  },
};

// Careers API
export const careersApi = {
  // Public list
  async getCareers(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') query.append(k, v);
    });
    const qs = query.toString();
    return apiRequest(`/careers${qs ? `?${qs}` : ''}`);
  },

  // Public detail
  async getCareerBySlug(slug) {
    return apiRequest(`/careers/slug/${encodeURIComponent(slug)}`);
  },

  // Admin list
  async getCareersAdmin(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') query.append(k, v);
    });
    return apiRequest(`/careers/admin?${query.toString()}`);
  },

  async getCareer(id) {
    return apiRequest(`/careers/admin/${encodeURIComponent(id)}`);
  },

  async createCareer(data) {
    return apiRequest('/careers/admin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateCareer(id, data) {
    return apiRequest(`/careers/admin/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteCareer(id) {
    return apiRequest(`/careers/admin/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
};

// Superadmin API
export const superadminApi = {
  // Create admin user
  async createAdmin(adminData) {
    return apiRequest('/superadmin/create-admin', {
      method: 'POST',
      body: JSON.stringify(adminData),
    });
  },

  // Delete user
  async deleteUser(userId) {
    return apiRequest(`/superadmin/users/${userId}`, {
      method: 'DELETE',
    });
  },

  // Get platform analytics
  async getPlatformAnalytics(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    
    return apiRequest(`/superadmin/analytics/platform?${queryParams}`);
  },

  // System maintenance
  async systemMaintenance(action, target) {
    return apiRequest('/superadmin/maintenance', {
      method: 'POST',
      body: JSON.stringify({ action, target }),
    });
  },

  // Get system logs
  async getSystemLogs(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    
    return apiRequest(`/superadmin/logs/system?${queryParams}`);
  },
};

// Dashboard API
export const dashboardApi = {
  // Get recent users for dashboard
  async getRecentUsers(limit = 5) {
    return apiRequest(`/admin/recent-users?limit=${limit}`);
  },

  // Get recent bookings for dashboard
  async getRecentBookings(limit = 5) {
    return apiRequest(`/admin/recent-bookings?limit=${limit}`);
  },

  // Get dashboard statistics
  async getDashboardStats() {
    return apiRequest('/admin/stats/dashboard');
  },

  // Get recent activities
  async getRecentActivities(limit = 10) {
    return apiRequest(`/admin/activities?limit=${limit}`);
  },
};

// Sessions API
export const sessionsApi = {
  // Create session (admin only)
  async createSession(sessionData) {
    return apiRequest('/sessions', {
      method: 'POST',
      body: JSON.stringify(sessionData),
    });
  },

  // Get session by ID (public)
  async getSession(sessionId) {
    return apiRequest(`/sessions/${sessionId}`);
  },

  // Get all sessions (admin only)
  async getAllSessions(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      if (Array.isArray(value)) {
        value.forEach((v) => {
          if (v !== undefined && v !== null && v !== '') queryParams.append(key, String(v));
        });
        return;
      }
      queryParams.append(key, value);
    });

    return apiRequest(`/admin/sessions/all?${queryParams}`);
  },

  // Get single session details by ID (admin only) - for session details modal
  async getSessionDetails(sessionId) {
    return apiRequest(`/admin/sessions/${sessionId}`);
  },

  // Update session status (admin only)
  async updateSessionStatus(sessionId, status, notes) {
    return apiRequest(`/sessions/${sessionId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  },

  // Reschedule session (admin only)
  async rescheduleSession(sessionId, newDate, newTime) {
    return apiRequest(`/sessions/${sessionId}/reschedule`, {
      method: 'PUT',
      body: JSON.stringify({ new_date: newDate, new_time: newTime }),
    });
  },

  // Get session statistics (admin only)
  async getSessionStats(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    
    return apiRequest(`/sessions/stats/overview?${queryParams}`);
  },

  // Advanced session search (admin only)
  async searchSessions(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    
    return apiRequest(`/sessions/search/advanced?${queryParams}`);
  },

  // Delete session (admin only)
  async deleteSession(sessionId) {
    return apiRequest(`/admin/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  },

  // Mark session as no-show (admin or psychologist)
  async markSessionAsNoShow(sessionId, reason = '') {
    return apiRequest(`/admin/sessions/${sessionId}/no-show`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
  },
};

// Public API (no authentication required)
export const publicApi = {
  // Get all psychologists (public)
  async getPsychologists() {
    return apiRequest('/public/psychologists');
  },

  // Get psychologist availability (public)
  async getPsychologistAvailability(psychologistId) {
    return apiRequest(`/availability/public/psychologist/${psychologistId}`);
  },

  // Get psychologist availability range (public)
  // If withSync = true, backend will first run a Google Calendar sync
  // for that psychologist before computing availability (used on therapist profile)
  async getPsychologistAvailabilityRange(psychologistId, startDate, endDate, withSync = false) {
    const syncParam = withSync ? '&sync=1' : '';
    // Add timestamp to prevent browser/API caching
    const timestamp = Date.now();
    return apiRequest(
      `/availability/psychologist/${psychologistId}/range?startDate=${startDate}&endDate=${endDate}${syncParam}&_t=${timestamp}`
    );
  },

  // Get psychologist packages (public)
  async getPsychologistPackages(psychologistId) {
    return apiRequest(`/public/psychologists/${psychologistId}/packages`);
  },

  // Get single psychologist details (public)
  async getPsychologistDetails(psychologistId) {
    return apiRequest(`/public/psychologists/${psychologistId}/details`);
  },
};

// Messages API
export const messagesApi = {
  // Get user conversations
  async getConversations() {
    return apiRequest('/messages/conversations');
  },

  // Get messages for a conversation
  async getMessages(conversationId) {
    return apiRequest(`/messages/conversations/${conversationId}/messages`);
  },

  // Send a message
  async sendMessage(conversationId, messageData) {
    return apiRequest(`/messages/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  },

  // Mark messages as read
  async markAsRead(conversationId) {
    return apiRequest(`/messages/conversations/${conversationId}/read`, {
      method: 'PUT',
    });
  },

  // Create new conversation
  async createConversation(sessionId) {
    return apiRequest('/messages/conversations', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
  },
};

// Payment API
export const paymentApi = {
  // Create cash payment
  async createCashPayment(paymentData) {
    return apiRequest('/payment/cash', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  },

  // Create payment order
  async createPaymentOrder(paymentData) {
    return apiRequest('/payment/create-order', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  },

  // Get payment status
  async getPaymentStatus(transactionId) {
    return apiRequest(`/payment/status/${transactionId}`);
  },

  // Get booking status by order ID (for success page polling)
  async getBookingStatusByOrderId(orderId) {
    return apiRequest(`/payment/booking-status/${orderId}`);
  },

  // Verify payment signature (optional, doesn't create session)
  async verifyPaymentSignature(paymentData) {
    return apiRequest('/payment/verify-signature', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  },
};

// Doctors API (for superadmin)
export const doctorsApi = {
  async getAll() {
    return apiRequest('/psychologists');
  },

  async getById(id) {
    return apiRequest(`/psychologists/${id}`);
  },

  async create(doctorData) {
    return apiRequest('/psychologists', {
      method: 'POST',
      body: JSON.stringify(doctorData),
    });
  },

  async update(id, doctorData) {
    return apiRequest(`/psychologists/${id}`, {
      method: 'PUT',
      body: JSON.stringify(doctorData),
    });
  },

  async delete(id) {
    return apiRequest(`/psychologists/${id}`, {
      method: 'DELETE',
    });
  },
};

// Users API (for superadmin)
export const usersApi = {
  async getAll() {
    return apiRequest('/admin/users');
  },

  async getById(id) {
    return apiRequest(`/admin/users/${id}`);
  },

  async create(userData) {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  async update(id, userData) {
    return apiRequest(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  async delete(id) {
    return apiRequest(`/admin/users/${id}`, {
      method: 'DELETE',
    });
  },
};

// Bookings API (for superadmin)
export const bookingsApi = {
  async getAll() {
    return apiRequest('/admin/sessions');
  },

  async getById(id) {
    return apiRequest(`/sessions/${id}`);
  },

  async create(bookingData) {
    return apiRequest('/sessions', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  },

  async update(id, bookingData) {
    return apiRequest(`/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(bookingData),
    });
  },

  async delete(id) {
    return apiRequest(`/sessions/${id}`, {
      method: 'DELETE',
    });
  },
};

// Finance API
export const financeApi = {
  // Dashboard
  async getDashboard(params = {}) {
    const queryParams = new URLSearchParams();
    
    // Frontend should always pass valid date strings
    // If dates are provided, always send them (even if empty string, backend will handle)
    // If dates are undefined/null, don't send (backend will use IST defaults)
    if (params.dateFrom !== undefined && params.dateFrom !== null) {
      // Send the date (even if empty string - backend will default)
      queryParams.append('dateFrom', params.dateFrom);
    }
    if (params.dateTo !== undefined && params.dateTo !== null) {
      // Send the date (even if empty string - backend will default)
      queryParams.append('dateTo', params.dateTo);
    }
    if (params.includeCharts !== undefined) {
      queryParams.append('includeCharts', params.includeCharts.toString());
    }
    if (params.allTime === true || params.allTime === 'true') {
      queryParams.append('allTime', 'true');
    }
    const queryString = queryParams.toString();
    const url = queryString ? `/finance/dashboard?${queryString}` : '/finance/dashboard';
    console.log('Finance API getDashboard:', { 
      url, 
      receivedParams: { dateFrom: params.dateFrom, dateTo: params.dateTo, includeCharts: params.includeCharts },
      willSendDateFrom: params.dateFrom !== undefined && params.dateFrom !== null,
      willSendDateTo: params.dateTo !== undefined && params.dateTo !== null
    });
    return apiRequest(url);
  },

  // Sessions
  async getSessions(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/finance/sessions${queryString ? `?${queryString}` : ''}`);
  },

  async getDoctorBookings(psychologistId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(
      `/finance/doctors/${psychologistId}/bookings${queryString ? `?${queryString}` : ''}`
    );
  },

  // Get all sessions (same handler as admin, but finance-authenticated route — not /admin/sessions/all)
  async getAllSessions(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      if (Array.isArray(value)) {
        value.forEach((v) => {
          if (v !== undefined && v !== null && v !== '') queryParams.append(key, String(v));
        });
        return;
      }
      queryParams.append(key, value);
    });

    return apiRequest(`/finance/sessions/all?${queryParams}`);
  },

  async getSessionDetails(sessionId) {
    return apiRequest(`/finance/sessions/${sessionId}`);
  },

  async updateSession(sessionId, sessionData) {
    return apiRequest(`/finance/sessions/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify(sessionData),
    });
  },

  async updateSessionCommission(sessionId, commissionAmount) {
    return apiRequest(`/finance/sessions/${sessionId}/commission`, {
      method: 'PUT',
      body: JSON.stringify({ commission_amount: commissionAmount }),
    });
  },

  async getPsychologists() {
    return apiRequest('/finance/psychologists');
  },

  async getClients() {
    return apiRequest('/finance/clients');
  },

  // Revenue
  async getRevenue(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/finance/revenue${queryString ? `?${queryString}` : ''}`);
  },

  // Commissions
  async getCommissions(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/finance/commissions${queryString ? `?${queryString}` : ''}`);
  },

  async updateCommissionRate(psychologistId, data) {
    return apiRequest(`/finance/commissions/${psychologistId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Expenses
  async getExpenses(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/finance/expenses${queryString ? `?${queryString}` : ''}`);
  },

  async createExpense(data) {
    return apiRequest('/finance/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateExpense(expenseId, data) {
    return apiRequest(`/finance/expenses/${expenseId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteExpense(expenseId) {
    return apiRequest(`/finance/expenses/${expenseId}`, {
      method: 'DELETE',
    });
  },

  async approveExpense(expenseId) {
    return apiRequest(`/finance/expenses/${expenseId}/approve`, {
      method: 'POST',
    });
  },

  // Income
  async getIncome(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/finance/income${queryString ? `?${queryString}` : ''}`);
  },

  async createIncome(data) {
    return apiRequest('/finance/income', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateIncome(incomeId, data) {
    return apiRequest(`/finance/income/${incomeId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteIncome(incomeId) {
    return apiRequest(`/finance/income/${incomeId}`, {
      method: 'DELETE',
    });
  },


  // Settings
  async getExpenseCategories() {
    return apiRequest('/finance/settings/categories');
  },

  async createExpenseCategory(data) {
    return apiRequest('/finance/settings/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getIncomeSources() {
    return apiRequest('/finance/settings/income-sources');
  },

  async createIncomeSource(data) {
    return apiRequest('/finance/settings/income-sources', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Payouts
  async getPayouts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/finance/payouts${queryString ? `?${queryString}` : ''}`);
  },

  async getPendingPayouts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/finance/payouts/pending${queryString ? `?${queryString}` : ''}`);
  },

  async getDoctorPayouts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/finance/payouts/doctors${queryString ? `?${queryString}` : ''}`);
  },

  async getPayoutDetails(payoutId) {
    return apiRequest(`/finance/payouts/${payoutId}`);
  },

  async processPayout(data) {
    return apiRequest('/finance/payouts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async markPayoutAsPaid(data) {
    return apiRequest('/finance/payouts/mark-paid', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Free Assessments
  async getFreeAssessments(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/finance/free-assessments${queryString ? `?${queryString}` : ''}`);
  },

  /** Finance: verify manual session payment (finance-accessible route, no admin role needed). */
  async verifyPayment(sessionId) {
    return apiRequest(`/finance/sessions/${sessionId}/verify-payment`, {
      method: 'PATCH',
      body: JSON.stringify({}),
    });
  },

  /** Finance: cancel & refund a session. */
  async cancelRefundSession(sessionId) {
    return apiRequest(`/finance/sessions/${sessionId}/cancel-refund`, {
      method: 'PATCH',
      body: JSON.stringify({}),
    });
  },

  /** Finance: delete a session. */
  async deleteSession(sessionId) {
    return apiRequest(`/finance/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  },
};

// Default export with common methods for backward compatibility
export const backendApi = {
  auth: authApi,
  client: clientApi,
  psychologist: psychologistApi,
  admin: adminApi,
  superadmin: superadminApi,
  sessions: sessionsApi,
  dashboard: dashboardApi,
  doctors: doctorsApi,
  users: usersApi,
  bookings: bookingsApi,
  finance: financeApi,
  
  // Generic GET method for backward compatibility
  async get(endpoint) {
    return apiRequest(endpoint, { method: 'GET' });
  },
  
  // Generic POST method for backward compatibility
  async post(endpoint, data) {
    return apiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  // Generic PUT method for backward compatibility
  async put(endpoint, data) {
    return apiRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  
  // Generic DELETE method for backward compatibility
  async delete(endpoint) {
    return apiRequest(endpoint, {
      method: 'DELETE',
    });
  },
};

export default backendApi;
