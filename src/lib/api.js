import { clearAuthData, getStoredToken } from './authStorage';

const API_BASE_URL = 'http://localhost:3001/api';

// Helper function to handle API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    try {
      const error = await response.json();
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    } catch (parseError) {
      // If JSON parsing fails, throw a generic error with status
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
  return response.json();
};

// Helper function to make API requests
async function apiRequest(endpoint, options = {}) {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  const url = `${baseURL}${endpoint}`;
  
  // Get token from localStorage if available
  const token = typeof window !== 'undefined' ? getStoredToken() : null;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      try {
        const error = await response.json();
        console.error('API Error Response:', error);
        
        // Handle authentication errors specifically
        if (response.status === 401) {
          throw new Error('Access token required');
        }
        
        // Handle empty error responses - these are often successful responses with no data
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
            throw new Error(`HTTP error! status: ${response.status}`);
          }
        }
        
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
      } catch (parseError) {
        console.error('API Error Parse Failed:', parseError);
        // If JSON parsing fails, throw a generic error with status
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    }
    
    // Handle empty responses
    const responseText = await response.text();
    if (!responseText || responseText.trim() === '') {
      return null;
    }
    
    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      console.error('Response parsing failed:', parseError);
      return null;
    }
  } catch (error) {
    console.error('API Request Failed:', {
      url,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

// Doctors API
export const doctorsApi = {
  // Get all doctors
  getAll: async () => {
    try {
      const doctors = await apiRequest('/doctors');
      
      // Handle empty responses
      if (!doctors || doctors === null) {
        return [];
      }
      
      // Ensure doctors is an array
      if (!Array.isArray(doctors)) {
        return [];
      }
      
      // Transform backend data to match frontend expectations
      return doctors.map(doctor => {
        // Parse education and availability from JSON strings
        let education = {};
        let availability = [];
        
        try {
          if (doctor.education && doctor.education !== 'null') {
            education = JSON.parse(doctor.education);
            // Ensure it's an object
            if (typeof education !== 'object' || education === null) {
              education = { ug: '', pg: '', phd: '' };
            }
          } else {
            education = { ug: '', pg: '', phd: '' };
          }
        } catch (e) {
          education = { ug: '', pg: '', phd: '' };
        }
        
        try {
          if (doctor.availability && doctor.availability !== 'null') {
            availability = JSON.parse(doctor.availability);
            // Ensure it's an array
            if (!Array.isArray(availability)) {
              availability = [];
            }
          } else {
            availability = [];
          }
        } catch (error) {
          availability = [];
        }
        
        // Extract first and last name from full name
        const nameParts = (doctor.name || '').replace('Dr. ', '').split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        return {
          id: doctor.id,
          firstName,
          lastName,
          phone: doctor.phone || '',
          email: doctor.email,
          education,
          description: doctor.bio || '',
          price: doctor.hourly_rate || 0,
          packages: [
            { name: 'Individual Session', price: doctor.hourly_rate || 0, sessions: 1 }
          ],
          availability,
          specializations: [doctor.specialization || 'General Psychology'],
          coverImage: doctor.cover_image || null
        };
      }); // Close the map function
    } catch (error) {
      console.warn('Doctors API not available, returning empty array:', error.message);
      return [];
    }
  },

  // Get doctor by ID
  getById: async (id) => {
    try {
      return await apiRequest(`/doctors/${id}`);
    } catch (error) {
      console.warn('Doctor by ID API not available:', error.message);
      throw error;
    }
  },

  // Create new doctor
  create: async (doctorData) => {
    try {
      // Transform frontend data to match backend expectations
      const transformedData = {
        name: `Dr. ${doctorData.firstName} ${doctorData.lastName}`,
        email: doctorData.email,
        phone: doctorData.phone,
        specialization: doctorData.specializations?.[0] || 'General Psychology',
        licenseNumber: `LIC${Date.now()}`, // Generate a unique license number
        experience: 5, // Default experience
        education: JSON.stringify(doctorData.education),
        bio: doctorData.description,
        languages: ['English'],
        availability: JSON.stringify(doctorData.availability),
        hourlyRate: doctorData.price,
        cover_image: doctorData.coverImage || null
      };
      
      return await apiRequest('/doctors', {
        method: 'POST',
        body: JSON.stringify(transformedData),
      });
    } catch (error) {
      console.warn('Create doctor API not available:', error.message);
      throw error;
    }
  },

  // Update doctor
  update: async (id, doctorData) => {
    try {
      // Transform frontend data to match backend expectations
      const transformedData = {
        name: `Dr. ${doctorData.firstName} ${doctorData.lastName}`,
        email: doctorData.email,
        phone: doctorData.phone,
        specialization: doctorData.specializations?.[0] || 'General Psychology',
        licenseNumber: `LIC${Date.now()}`, // Generate a unique license number
        experience: 5, // Default experience
        education: JSON.stringify(doctorData.education),
        bio: doctorData.description,
        languages: ['English'],
        availability: JSON.stringify(doctorData.availability),
        hourlyRate: doctorData.price,
        cover_image: doctorData.coverImage || null
      };
      
      return await apiRequest(`/doctors/${id}`, {
        method: 'PUT',
        body: JSON.stringify(transformedData),
      });
    } catch (error) {
      console.warn('Update doctor API not available:', error.message);
      throw error;
    }
  },

  // Delete doctor
  delete: async (id) => {
    try {
      return await apiRequest(`/doctors/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.warn('Delete doctor API not available:', error.message);
      throw error;
    }
  },
};

// Users API
export const usersApi = {
  getAll: async () => {
    try {
      const response = await apiRequest('/auth/users');
      
      // Handle various response types
      if (response === null) {
        return [];
      }
      
      // Backend returns { users: [...], totalPages: ..., currentPage: ..., total: ... }
      if (response && response.users && Array.isArray(response.users)) {
        return response.users;
      }
      
      // If response is an array directly
      if (Array.isArray(response)) {
        return response;
      }
      
      return [];
    } catch (error) {
      console.warn('Users API not available, returning empty array:', error.message);
      return [];
    }
  },

  getById: async (id) => {
    try {
      return await apiRequest(`/auth/users/${id}`);
    } catch (error) {
      console.warn('User by ID API not available:', error.message);
      throw error;
    }
  },

  create: async (userData) => {
    try {
      // Transform frontend data to match backend expectations
      const transformedData = {
        name: `${userData.firstName} ${userData.lastName}`,
        email: userData.email,
        password: 'defaultPassword123!', // Generate a default password
        phone: userData.phone || null,
        role: userData.role || 'user',
        is_active: userData.status === 'active'
      };
      
      return await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(transformedData),
      });
    } catch (error) {
      console.warn('Create user API not available:', error.message);
      throw error;
    }
  },

  update: async (id, userData) => {
    try {
      // Transform frontend data to match backend expectations
      const transformedData = {
        name: `${userData.firstName} ${userData.lastName}`,
        phone: userData.phone || null,
        role: userData.role || 'user',
        is_active: userData.status === 'active'
      };
      
      return await apiRequest(`/auth/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(transformedData),
      });
    } catch (error) {
      console.warn('Update user API not available:', error.message);
      throw error;
    }
  },

  delete: async (id) => {
    try {
      const result = await apiRequest(`/auth/users/${id}`, {
        method: 'DELETE',
      });
      return result;
    } catch (error) {
      console.error('Delete user API error:', error);
      console.warn('Delete user API not available:', error.message);
      throw error;
    }
  },

  suspend: async (id) => {
    try {
      return await apiRequest(`/auth/users/${id}/suspend`, {
        method: 'PUT',
      });
    } catch (error) {
      console.warn('Suspend user API not available:', error.message);
      throw error;
    }
  },
};

// Bookings API
export const bookingsApi = {
  getAll: async () => {
    try {
      const result = await apiRequest('/bookings');
      
      // Handle various response types
      if (result === null) {
        return [];
      }
      
      if (Array.isArray(result)) {
        return result;
      }
      
      if (result && typeof result === 'object') {
        // If it's an object with a data property, extract it
        if (result.data && Array.isArray(result.data)) {
          return result.data;
        }
        // If it's an object but not an array, return empty array
        return [];
      }
      
      return [];
    } catch (error) {
      console.warn('Bookings API not available, returning empty array:', error.message);
      return [];
    }
  },

  getById: async (id) => {
    try {
      return await apiRequest(`/bookings/${id}`);
    } catch (error) {
      console.warn('Booking by ID API not available:', error.message);
      throw error;
    }
  },

  create: async (bookingData) => {
    try {
      const result = await apiRequest('/bookings', {
        method: 'POST',
        body: JSON.stringify(bookingData),
      });
      return result;
    } catch (error) {
      console.error('Error creating booking:', error);
      console.warn('Create booking API not available:', error.message);
      throw error;
    }
  },

  update: async (id, bookingData) => {
    try {
      return await apiRequest(`/bookings/${id}`, {
        method: 'PUT',
        body: JSON.stringify(bookingData),
      });
    } catch (error) {
      console.warn('Update booking API not available:', error.message);
      throw error;
    }
  },

  delete: async (id) => {
    try {
      return await apiRequest(`/bookings/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.warn('Delete booking API not available:', error.message);
      throw error;
    }
  },
};

// Dashboard API
export const dashboardApi = {
  getStats: async () => {
    try {
      return await apiRequest('/dashboard/stats');
    } catch (error) {
      console.warn('Dashboard stats API not available, returning default stats:', error.message);
      return {
        totalUsers: 0,
        totalBookings: 0,
        totalDoctors: 0,
        totalSessions: 0,
        totalAdmins: 0,
        systemHealth: 'excellent'
      };
    }
  },

  getRecentUsers: async () => {
    try {
      return await apiRequest('/dashboard/recent-users');
    } catch (error) {
      console.warn('Recent users API not available, returning empty array:', error.message);
      return [];
    }
  },

  getRecentBookings: async () => {
    try {
      return await apiRequest('/dashboard/recent-bookings');
    } catch (error) {
      console.warn('Recent bookings API not available, returning empty array:', error.message);
      return [];
    }
  },
};
