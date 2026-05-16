/**
 * Analytics utility functions for tracking custom events
 * Uses Vercel Analytics for tracking user interactions
 */

import { track } from '@vercel/analytics';

/**
 * Track button clicks
 * @param {string} buttonName - Name/identifier of the button
 * @param {object} properties - Additional properties (optional)
 */
export const trackButtonClick = (buttonName, properties = {}) => {
  track('Button Click', {
    button: buttonName,
    ...properties
  });
};

/**
 * Track form submissions
 * @param {string} formName - Name/identifier of the form
 * @param {object} properties - Additional properties (optional)
 */
export const trackFormSubmit = (formName, properties = {}) => {
  track('Form Submit', {
    form: formName,
    ...properties
  });
};

/**
 * Track page navigation/views (for client-side routing)
 * @param {string} pageName - Name of the page
 * @param {object} properties - Additional properties (optional)
 */
export const trackPageView = (pageName, properties = {}) => {
  track('Page View', {
    page: pageName,
    ...properties
  });
};

/**
 * Track booking/session creation
 * @param {object} bookingData - Booking details
 */
export const trackBooking = (bookingData) => {
  track('Booking Started', {
    psychologist: bookingData.psychologistName || 'Unknown',
    package: bookingData.packageType || 'individual',
    date: bookingData.date || 'Unknown',
    ...bookingData
  });
};

/**
 * Track package selection
 * @param {string} packageType - Type of package (e.g., 'package_3', 'package_6', 'individual')
 * @param {number} price - Package price
 */
export const trackPackageSelection = (packageType, price) => {
  track('Package Selected', {
    package_type: packageType,
    price: price
  });
};

/**
 * Track payment initiation
 * @param {object} paymentData - Payment details
 */
export const trackPayment = (paymentData) => {
  track('Payment Initiated', {
    amount: paymentData.amount,
    package: paymentData.packageId || 'individual',
    psychologist: paymentData.psychologistId || 'Unknown',
    ...paymentData
  });
};

/**
 * Track search/filter actions
 * @param {string} searchType - Type of search (e.g., 'therapist', 'service')
 * @param {object} filters - Applied filters
 */
export const trackSearch = (searchType, filters = {}) => {
  track('Search', {
    search_type: searchType,
    ...filters
  });
};

/**
 * Track external link clicks
 * @param {string} linkUrl - URL of the external link
 * @param {string} linkText - Text of the link
 */
export const trackExternalLink = (linkUrl, linkText) => {
  track('External Link Click', {
    url: linkUrl,
    text: linkText
  });
};

/**
 * Generic track function for custom events
 * @param {string} eventName - Name of the event
 * @param {object} properties - Event properties
 */
export const trackEvent = (eventName, properties = {}) => {
  track(eventName, properties);
};



