/**
 * Grouped Job Roles for Job Board
 * Organized by common roles + expandable categories
 */

export const COMMON_JOB_ROLES = [
  'Promoter',
  'Bartender',
  'Security',
  'DJ',
  'Host/MC',
  'Photographer',
  'Server/Wait Staff',
  'Event Planner/Coordinator',
  'Dancer (General)',
  'Videographer',
  'Sound Engineer/Audio Tech',
  'Lighting Technician/Designer',
  'Cleaning Crew/Event Cleanup',
];

export interface JobRoleCategory {
  name: string;
  icon: string;
  roles: string[];
}

export const GROUPED_JOB_ROLES: JobRoleCategory[] = [
  {
    name: '🎵 Entertainment',
    icon: 'musical-notes',
    roles: [
      'Band Leader',
      'Bassist',
      'Cellist',
      'Choir',
      'Comedian/Stand-Up',
      'Cover Band',
      'DJ',
      'Dance Crew/Team',
      'Dancer (General)',
      'Drag Performer',
      'Drummer/Percussionist',
      'Fire Performer',
      'Guitarist',
      'Juggler',
      'Karaoke Host',
      'Magician/Illusionist',
      'Mime Artist',
      'Opera Singer',
      'Pianist/Keyboardist',
      'Rapper/Hip-Hop Artist',
      'Singer/Vocalist',
      'Spoken Word Artist/Poet',
      'Stilt Walker',
      'Tribute Band',
      'Violinist',
    ],
  },
  {
    name: '🍔 Hospitality & Food Service',
    icon: 'restaurant',
    roles: [
      'Baker/Pastry Chef',
      'Barista/Coffee Service',
      'Bartender',
      'Caterer',
      'Concession Stand Operator',
      'Food Truck/Cart Vendor',
      'Mixologist/Cocktail Specialist',
      'Private Chef',
      'Server/Wait Staff',
      'Sommelier',
    ],
  },
  {
    name: '🎬 Creative & Media',
    icon: 'camera',
    roles: [
      'Content Creator (Photo/Video)',
      'Graphic Designer',
      'Photographer',
      'Videographer',
      'Video Technician/Projectionist',
      'Visual Artist (Live Painting, Graffiti)',
    ],
  },
  {
    name: '🔧 Technical & Production',
    icon: 'construct',
    roles: [
      'AV Equipment Rental',
      'Backline Provider',
      'Lighting Technician/Designer',
      'Live Stream Technician',
      'Set Designer/Stage Decorator',
      'Sound Engineer/Audio Tech',
      'Stage Manager',
      'Stagehand/Roadie',
    ],
  },
  {
    name: '🛡️ Security & Safety',
    icon: 'shield-checkmark',
    roles: [
      'Crowd Control Specialist',
      'First Aid/Medical Services',
      'Security/Event Guard',
    ],
  },
  {
    name: '📣 Promotion & Marketing',
    icon: 'megaphone',
    roles: [
      'Blogger/Vlogger',
      'Event Publicist',
      'Flyer Distribution',
      'Influencer/Brand Ambassador',
      'Marketing Consultant',
      'PR/Media Relations',
      'Promoter',
      'Social Media Marketing',
      'Street Team/Promoter',
    ],
  },
  {
    name: '👔 Event Management & Coordination',
    icon: 'clipboard',
    roles: [
      'Booking Agent/Manager',
      'Event Host/Emcee',
      'Event Planner/Coordinator',
      'Event Staffing Agency',
      'Guest List Manager',
      'Stage Manager',
      'Ticketing/Box Office',
      'Volunteer Coordinator',
    ],
  },
  {
    name: '💄 Beauty & Styling',
    icon: 'cut',
    roles: [
      'Hair Stylist',
      'Makeup Artist',
      'Stylist (Fashion/Wardrobe)',
      'Wardrobe/Costume Designer',
    ],
  },
  {
    name: '🧹 Support Services',
    icon: 'hand-left',
    roles: [
      'Babysitting/Childcare',
      'Cleaning Crew/Event Cleanup',
      'Coat Check Attendant',
      'Green Room Attendant',
      'Hospitality/Guest Services',
      'Parking Attendant',
      'Personal Assistant',
      'Runner/Errand Services',
      'Transportation/Shuttle Service',
      'Valet Service',
    ],
  },
];

// Flatten all roles for search
export const ALL_JOB_ROLES = [
  ...COMMON_JOB_ROLES,
  ...GROUPED_JOB_ROLES.flatMap(cat => cat.roles)
].filter((role, index, self) => self.indexOf(role) === index).sort();
