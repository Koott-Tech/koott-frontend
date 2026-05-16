/**
 * Password Validation Utility (Frontend)
 * 
 * Validates passwords against backend policy requirements.
 * Returns only unmet requirements for display.
 */

// Common weak passwords to blacklist
const COMMON_PASSWORDS = [
  'password', 'password123', '123456', '12345678', '123456789',
  'qwerty', 'abc123', 'monkey', '1234567', 'letmein', 'trustno1',
  'dragon', 'baseball', 'iloveyou', 'master', 'sunshine', 'ashley',
  'bailey', 'passw0rd', 'shadow', '123123', '654321', 'superman',
  'qazwsx', 'michael', 'football', 'welcome', 'jesus', 'ninja',
  'mustang', 'password1', '1234567890', 'adobe123', 'admin', 'root'
];

/**
 * Validate password and return only unmet requirements
 * @param {string} password - Password to validate
 * @returns {{valid: boolean, unmetRequirements: string[]}}
 */
export function validatePassword(password) {
  const unmetRequirements = [];

  if (!password || typeof password !== 'string') {
    return { valid: false, unmetRequirements: ['Password is required'] };
  }

  // Minimum length: 8 characters
  if (password.length < 8) {
    unmetRequirements.push('At least 8 characters');
  }

  // Maximum length: 128 characters
  if (password.length > 128) {
    unmetRequirements.push('Less than 128 characters');
  }

  // Require uppercase letter
  if (!/[A-Z]/.test(password)) {
    unmetRequirements.push('One uppercase letter (A-Z)');
  }

  // Require lowercase letter
  if (!/[a-z]/.test(password)) {
    unmetRequirements.push('One lowercase letter (a-z)');
  }

  // Require number
  if (!/[0-9]/.test(password)) {
    unmetRequirements.push('One number (0-9)');
  }

  // Require special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    unmetRequirements.push('One special character (!@#$%^&*...)');
  }

  // Check against common passwords
  const passwordLower = password.toLowerCase();
  if (COMMON_PASSWORDS.includes(passwordLower)) {
    unmetRequirements.push('Not a common password');
  }

  // Check for repeated characters (e.g., "aaaaaa")
  if (/(.)\1{3,}/.test(password)) {
    unmetRequirements.push('No repeated characters (e.g., aaaa)');
  }

  // Check for sequential characters (e.g., "12345", "abcde")
  if (/01234|12345|23456|34567|45678|56789|abcdef|bcdefg|cdefgh|defghi|efghij|fghijk|ghijkl|hijklm|ijklmn|jklmno|klmnop|lmnopq|mnopqr|nopqrs|opqrst|pqrstu|qrstuv|rstuvw|stuvwx|tuvwxy|uvwxyz/i.test(password)) {
    unmetRequirements.push('No sequential characters (e.g., 12345, abcde)');
  }

  return {
    valid: unmetRequirements.length === 0,
    unmetRequirements: unmetRequirements
  };
}

