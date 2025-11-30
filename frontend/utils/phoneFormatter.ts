/**
 * Phone number formatting and validation utilities
 * Format: (XXX) XXX-XXXX
 */

/**
 * Format phone number as user types (real-time)
 * Handles both adding and removing characters
 */
export const formatPhoneNumber = (value: string): string => {
  // Remove all non-numeric characters
  const phoneNumber = value.replace(/\D/g, '');
  
  // Return empty string if no input
  if (!phoneNumber) return '';
  
  // Format based on length
  if (phoneNumber.length <= 3) {
    return `(${phoneNumber}`;
  } else if (phoneNumber.length <= 6) {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
  } else {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  }
};

/**
 * Extract raw digits from formatted phone number
 */
export const getPhoneDigits = (formattedPhone: string): string => {
  return formattedPhone.replace(/\D/g, '');
};

/**
 * Validate phone number (must be exactly 10 digits)
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  const digits = getPhoneDigits(phone);
  return digits.length === 10;
};

/**
 * Check if phone number is partially valid (being typed)
 */
export const isPartiallyValid = (phone: string): boolean => {
  const digits = getPhoneDigits(phone);
  return digits.length > 0 && digits.length <= 10;
};

/**
 * Format phone for display (from stored format)
 */
export const displayPhoneNumber = (phone: string | null | undefined): string => {
  if (!phone) return '';
  return formatPhoneNumber(phone);
};
