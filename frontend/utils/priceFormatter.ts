/**
 * Utility functions for formatting service prices consistently across the app
 */

export interface ServiceWithPrice {
  service_name: string;
  price: string;
  price_type: 'fixed' | 'hourly' | 'quote' | 'range';
}

/**
 * Formats a service price for display with currency symbol and appropriate unit
 * @param service - Service object with price and price_type
 * @returns Formatted price string (e.g., "$50/hour", "$100", "Contact for quote")
 */
export const formatServicePrice = (service: ServiceWithPrice): string => {
  if (service.price_type === 'quote') {
    return 'Contact for quote';
  }
  
  if (!service.price || service.price.trim() === '') {
    return service.price_type === 'hourly' ? 'Set hourly rate' : 'Set price';
  }
  
  // Remove any existing $ or non-numeric characters for clean formatting
  const cleanPrice = service.price.replace(/[^0-9.]/g, '');
  
  if (service.price_type === 'hourly') {
    return `$${cleanPrice}/hour`;
  } else {
    return `$${cleanPrice}`;
  }
};

/**
 * Formats a simple numeric price with dollar sign
 * @param price - Numeric price or string representation
 * @returns Formatted price string (e.g., "$50")
 */
export const formatSimplePrice = (price: number | string): string => {
  const cleanPrice = typeof price === 'number' ? price.toString() : price.replace(/[^0-9.]/g, '');
  return `$${cleanPrice}`;
};
