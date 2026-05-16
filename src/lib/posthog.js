/**
 * PostHog utility functions
 * Autocapture (pageviews, clicks, forms) is enabled in PostHogProvider.
 * Use these helpers for custom events, identify, group, and person properties.
 */

import posthog from 'posthog-js'

/**
 * Check if PostHog is loaded and available
 */
export function isPostHogLoaded() {
  return typeof window !== 'undefined' && posthog.__loaded
}

/**
 * Capture a custom event
 * @param {string} eventName - Name of the event
 * @param {object} properties - Additional properties to send with the event
 */
export function captureEvent(eventName, properties = {}) {
  if (isPostHogLoaded()) {
    try {
      posthog.capture(eventName, properties)
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[PostHog] Event capture failed (may be blocked):', eventName, error)
      }
    }
  } else if (process.env.NODE_ENV === 'development') {
    console.log('[PostHog] Event not captured (PostHog not loaded):', eventName, properties)
  }
}

/**
 * Identify a user (connects anonymous ID to a known ID, e.g. after login)
 * @param {string} distinctId - Unique identifier (e.g. email, user id)
 * @param {object} [properties] - Optional user properties to set at same time
 */
export function identifyUser(distinctId, properties = {}) {
  if (isPostHogLoaded()) {
    try {
      posthog.identify(distinctId, properties)
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[PostHog] identify failed:', error)
      }
    }
  } else if (process.env.NODE_ENV === 'development') {
    console.log('[PostHog] User not identified (PostHog not loaded):', distinctId, properties)
  }
}

/**
 * Reset user identification (call on logout)
 */
export function resetUser() {
  if (isPostHogLoaded()) {
    posthog.reset()
  }
}

/**
 * Set person properties (permanent, across events)
 * @param {object} set - Properties to set/overwrite
 * @param {object} [setOnce] - Properties to set only once (e.g. referred_by, first_seen)
 * @example
 * setUserProperties({ $set: { location: 'London' }, $set_once: { referred_by: 'ref_123' } })
 */
export function setUserProperties({ $set = {}, $set_once = {} } = {}) {
  if (!isPostHogLoaded()) return
  try {
    if (Object.keys($set).length) posthog.people.set($set)
    if (Object.keys($set_once).length) posthog.people.set_once($set_once)
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[PostHog] setUserProperties failed:', error)
    }
  }
}

/**
 * Capture event with $set / $set_once for person properties in one call
 * @param {string} eventName - Event name
 * @param {object} properties - Event properties; can include $set and $set_once for person props
 */
export function captureEventWithPerson(eventName, properties = {}) {
  if (isPostHogLoaded()) {
    try {
      posthog.capture(eventName, properties)
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[PostHog] captureEventWithPerson failed:', eventName, error)
      }
    }
  }
}

/**
 * Associate subsequent events with a group (e.g. company, organization, project)
 * @param {string} groupType - e.g. 'company', 'organization', 'project'
 * @param {string} groupKey - Unique group id, e.g. 'id:5' or company slug
 * @param {object} [properties] - Optional group properties
 */
export function setGroup(groupType, groupKey, properties = {}) {
  if (isPostHogLoaded()) {
    try {
      posthog.group(groupType, groupKey, properties)
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[PostHog] setGroup failed:', error)
      }
    }
  }
}

/**
 * Get PostHog instance (use for advanced usage: feature flags, surveys, etc.)
 */
export function getPostHog() {
  if (isPostHogLoaded()) {
    return posthog
  }
  return null
}
