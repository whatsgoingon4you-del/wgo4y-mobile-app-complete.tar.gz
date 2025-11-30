// SIMPLIFIED BROAD OCCUPATION CATEGORIES FOR INITIAL ONBOARDING
// Users select their primary occupation types here, then can add details later

export const BROAD_OCCUPATIONS = [
  {
    category: '🎤 Entertainment & Performance',
    occupations: [
      // Music Groups
      'Band',
      'Choir',
      'Orchestra',
      
      // Individual Performers
      'Musical Artist',
      'Singer',
      'Rapper',
      'Poet',
      'Spoken Word Artist',
      
      // DJs & Audio
      'DJ',
      'MC/Host',
      'Audio Engineer',
      
      // Dance & Movement
      'Dancer',
      'Choreographer',
      'Dance Company',
      
      // Comedy & Theater
      'Comedian',
      'Actor',
      'Magician',
      'Circus Performer',
      
      // Other Performance
      'Tribute Act',
      'Cover Band',
      'Impersonator',
      'Live Painter',
      'Performance Artist',
    ],
  },
  {
    category: '📣 Marketing & Promotion',
    occupations: [
      'Event Promoter',
      'Social Media Manager',
      'Influencer',
      'Brand Ambassador',
      'Marketing Consultant',
      'PR Specialist',
      'Content Creator',
      'Graphic Designer',
      'Video Producer',
      'Photographer',
      'Hair Stylist',
      'Makeup Artist',
    ],
  },
  {
    category: '⛺ Event Support',
    occupations: [
      'Event Planner',
      'Event Coordinator',
      'Wedding Planner',
      'Party Planner',
      'Stage Manager',
      'Event Decorator',
      'Lighting Technician',
      'Sound Technician',
      'AV Specialist',
      'Security Personnel',
      'Event Staff',
      'Venue Manager',
    ],
  },
  {
    category: '🍔 Food & Drink Support',
    occupations: [
      'Caterer',
      'Personal Chef',
      'Bartender',
      'Mixologist',
      'Food Truck Operator',
      'Baker/Pastry Chef',
      'Sommelier',
      'Wait Staff',
    ],
  },
];

// Flatten all occupations for easy access
export const ALL_BROAD_OCCUPATIONS = BROAD_OCCUPATIONS.flatMap(
  cat => cat.occupations
).sort();

// Prioritized occupations for profile editing (Entertainment first)
export const PRIORITY_OCCUPATIONS = [
  // Most Popular Entertainment Jobs (shown first)
  'DJ',
  'Musical Artist',
  'Singer',
  'Rapper',
  'Band',
  'Comedian',
  'Dancer',
  'MC/Host',
  'Actor',
  'Photographer',
  'Event Planner',
  'Caterer',
  'Bartender',
  'Event Coordinator',
  'Choreographer',
];

// All other occupations (alphabetically sorted)
export const OTHER_OCCUPATIONS = ALL_BROAD_OCCUPATIONS.filter(
  occ => !PRIORITY_OCCUPATIONS.includes(occ)
).sort();

// Combined list: Priority first, then others
export const ORDERED_OCCUPATIONS = [...PRIORITY_OCCUPATIONS, ...OTHER_OCCUPATIONS];
