// Category Mapping for Entrepreneur Services
// Maps selected categories to their respective services

import { ENTREPRENEUR_SERVICES } from './servicesData';

// Map category IDs to their service category names in servicesData.ts
const CATEGORY_TO_SERVICE_MAP: { [key: string]: string[] } = {
  event_support: ['⛺ Event Support'],
  food_drink: ['🍔 Food & Drink Support'],
  occupation: ['🎤 Occupation'],
  marketing: ['📣 Marketing & Promotion'],
};

/**
 * Get filtered services based on selected categories
 * @param selectedCategories Array of category IDs (e.g., ['event_support', 'occupation'])
 * @returns Array of service names filtered by selected categories
 */
export function getServicesForCategories(selectedCategories: string[]): string[] {
  if (!selectedCategories || selectedCategories.length === 0) {
    // If no categories selected, return all services (fallback)
    return ENTREPRENEUR_SERVICES.flatMap(cat => cat.services).sort();
  }

  // Get the category names from the mapping
  const categoryNames = selectedCategories.flatMap(
    catId => CATEGORY_TO_SERVICE_MAP[catId] || []
  );

  // Filter services based on selected category names
  const filteredServices = ENTREPRENEUR_SERVICES
    .filter(cat => categoryNames.includes(cat.category))
    .flatMap(cat => cat.services)
    .sort();

  return filteredServices;
}

/**
 * Get category names for display from category IDs
 * @param selectedCategories Array of category IDs
 * @returns Array of category display names
 */
export function getCategoryDisplayNames(selectedCategories: string[]): string[] {
  const nameMap: { [key: string]: string } = {
    event_support: 'Event Support',
    food_drink: 'Food & Drink Support',
    occupation: 'Entertainment & Performance',
    marketing: 'Marketing & Promotion',
  };

  return selectedCategories.map(id => nameMap[id] || id);
}

/**
 * Check if a service belongs to any of the selected categories
 * @param service Service name
 * @param selectedCategories Array of category IDs
 * @returns boolean
 */
export function isServiceInCategories(service: string, selectedCategories: string[]): boolean {
  const allowedServices = getServicesForCategories(selectedCategories);
  return allowedServices.includes(service);
}
