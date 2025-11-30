export interface AmenityCategory {
  category: string;
  amenities: string[];
}

export const COMPREHENSIVE_AMENITIES: AmenityCategory[] = [
  {
    category: 'Accessibility & Facilities',
    amenities: [
      'Accessible restrooms',
      'ATM on site',
      'Coat check',
      'Family restrooms',
      'Gender-neutral restrooms',
      'Lockers/storage',
      'Lost & found',
      'Wheelchair accessible entrances',
    ].sort(),
  },
  {
    category: 'Audio/Visual & Technology',
    amenities: [
      'Audio/visual equipment rental',
      'Charging stations',
      'Digital signage',
      'Event photography/videography',
      'Free Wi-Fi',
      'LED screens/video walls',
      'Professional lighting system',
      'Projector/screens',
      'Social media wall/live feed',
      'State-of-the-art sound system',
    ].sort(),
  },
  {
    category: 'Entertainment & Performance',
    amenities: [
      'Arcade machines',
      'Dance poles/stage props',
      'DJ booth',
      'Game room/pool tables/darts',
      'Karaoke rooms',
      'LED dance floor',
      'Live performance stage',
      'Multiple dance floors',
      'Photo booth/selfie stations',
      'Stage rigging',
    ].sort(),
  },
  {
    category: 'Event Services',
    amenities: [
      'Decoration services',
      'Event planning services',
      'In-house event coordinator',
      'Merchandise shop',
      'Themed decor',
    ].sort(),
  },
  {
    category: 'Family & Kids',
    amenities: [
      'Babysitting/childcare',
      'Kids\' play area',
    ].sort(),
  },
  {
    category: 'Food & Beverage',
    amenities: [
      'Bottle service',
      'Craft cocktails',
      'Extensive beer/wine list',
      'Food trucks/food stalls',
      'Full-service bar',
      'Specialty menu/late-night kitchen',
      'Water refill stations',
    ].sort(),
  },
  {
    category: 'Outdoor Features',
    amenities: [
      'Fire pits/heaters (outdoor)',
      'Outdoor games/lawn games',
      'Outdoor patio/terrace',
      'Outdoor tenting',
      'Pet-friendly areas',
      'Pool/hot tub (if applicable)',
      'Rooftop area',
      'Smoking area',
    ].sort(),
  },
  {
    category: 'Parking & Transportation',
    amenities: [
      'On-site parking',
      'Shuttle/transportation service',
      'Valet parking',
    ].sort(),
  },
  {
    category: 'Safety & Security',
    amenities: [
      'First aid station',
      'Non-smoking venue',
      'On-site medical staff',
      'Security staff/event guards',
      'Surveillance cameras',
    ].sort(),
  },
  {
    category: 'Seating & Spaces',
    amenities: [
      'Backstage access',
      'Conference/meeting rooms',
      'Dressing rooms',
      'Green room/artist lounge',
      'Prayer/meditation room',
      'Private party rooms',
      'Quiet/relaxation zones',
      'Table reservations',
      'VIP lounges/sections',
    ].sort(),
  },
  {
    category: 'Sustainability',
    amenities: [
      'Green initiatives/recycling',
    ].sort(),
  },
  {
    category: 'Ticketing & Payment',
    amenities: [
      'Contactless payment',
      'Early bird/express entry',
      'Membership/loyalty program',
      'Mobile ticketing',
      'VIP/priority entry',
    ].sort(),
  },
].sort((a, b) => a.category.localeCompare(b.category));

// Flatten all amenities for search/filter purposes
export const ALL_AMENITIES = COMPREHENSIVE_AMENITIES.flatMap(cat => cat.amenities).sort();
