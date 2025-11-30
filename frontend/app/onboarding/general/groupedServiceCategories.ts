export interface ServiceGroup {
  name: string;
  icon: string;
  items: string[];
}

export const GROUPED_SERVICE_CATEGORIES: ServiceGroup[] = [
  {
    name: '🎤 Entertainment & Performance',
    icon: 'musical-notes',
    items: [
      'Band',
      'Choir',
      'Orchestra',
      'Musical Artist',
      'Singer',
      'Rapper',
      'Poet',
      'Spoken Word Artist',
      'DJ',
      'MC/Host',
      'Audio Engineer',
      'Dancer',
      'Choreographer',
      'Dance Company',
      'Comedian',
      'Actor',
      'Magician',
      'Circus Performer',
      'Tribute Act',
      'Cover Band',
      'Impersonator',
      'Live Painter',
      'Performance Artist',
    ],
  },
  {
    name: '📣 Marketing & Promotion',
    icon: 'megaphone',
    items: [
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
    name: '⛺ Event Support',
    icon: 'calendar',
    items: [
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
    name: '🍔 Food & Drink Support',
    icon: 'restaurant',
    items: [
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

// Flatten all items for search/filtering
export const ALL_SERVICE_ITEMS = GROUPED_SERVICE_CATEGORIES.flatMap(group => group.items);
