export interface VenueGroup {
  name: string;
  icon: string;
  items: string[];
}

export const GROUPED_VENUE_CATEGORIES: VenueGroup[] = [
  {
    name: '🍸 Bars & Nightlife',
    icon: 'wine',
    items: [
      'Nightclub',
      'Live Music Venue',
      'Lounge',
      'Bar',
      'Sports Bar',
      'Wine Bar',
      'Cocktail Bar',
      'Karaoke Bar',
      'Dance Club',
      'Jazz Club',
      'Comedy Club',
      'Speakeasy',
    ]
  },
  {
    name: '🎪 Event & Rental Spaces',
    icon: 'business',
    items: [
      'Event Space',
      'Private Event Rental',
      'Banquet Hall',
      'Conference Center',
      'Wedding Venue',
      'Outdoor Event Space',
      'Community Center',
      'Multi-Purpose Venue',
      'Pop-Up Venue',
    ]
  },
  {
    name: '🎭 Performing Arts',
    icon: 'mic',
    items: [
      'Theater',
      'Concert Hall',
      'Performance Art Space',
      'Opera House',
      'Amphitheater',
      'Stand-Up Comedy Venue',
      'Live Podcast Venue',
      'Live Streaming Venue',
    ]
  },
  {
    name: '🍽️ Dining & Drinks',
    icon: 'restaurant',
    items: [
      'Restaurant',
      'Fine Dining',
      'Casual Dining',
      'Theme Restaurant',
      'Supper Club',
      'Food Hall',
      'Hotel/Resort',
      'Rooftop Venue',
    ]
  },
  {
    name: '⚽ Sports & Recreation',
    icon: 'football',
    items: [
      'Sports Arena/Stadium',
      'Bowling Alley',
      'Miniature Golf Course',
      'Indoor Trampoline Park',
      'Laser Tag Arena',
      'Arcade',
      'Pool Hall/Billiards',
      'Ice Rink',
      'Climbing Gym',
    ]
  },
  {
    name: '🎨 Arts & Culture',
    icon: 'color-palette',
    items: [
      'Museum',
      'Art Gallery',
      'Cultural Center',
      'Historical Site',
      'Library/Literary Space',
      'Craft and DIY Studio',
    ]
  },
  {
    name: '🎬 Entertainment Centers',
    icon: 'film',
    items: [
      'Cinema/Movie Theater',
      'Drive-In Theater',
      'Amusement Park',
      'Theme Park',
      'Water Park',
      'Family Entertainment Center',
      'Virtual Reality Center',
      'Casino',
      'Nightlife Complex',
    ]
  },
  {
    name: '🎯 Specialty Venues',
    icon: 'star',
    items: [
      'Escape Room',
      'Themed Escape Room',
      'Haunted House',
      'Winery/Vineyard',
      'Brewery/Brewpub',
      'Distillery',
      'Wine and Paint Bar',
      'Dance Studio',
      'Yoga Studio',
      'Pet Café',
      'Board Game Café',
      'Circus Venue',
      'Magic Show Venue',
    ]
  },
  {
    name: '🌳 Outdoor & Nature',
    icon: 'leaf',
    items: [
      'Outdoor Festival Grounds',
      'Park/Garden Venue',
      'Beach Club',
      'Ranch/Farm Venue',
      'Petting Zoo/Animal Farm',
      'Botanical Garden',
    ]
  },
  {
    name: '🕌 Religious & Community',
    icon: 'home',
    items: [
      'Religious Venue/Church',
      'Synagogue',
      'Temple',
      'Mosque',
    ]
  },
  {
    name: '📋 Other / Custom',
    icon: 'ellipsis-horizontal',
    items: [
      'Other',
    ]
  },
];

// Flatten all items for search/filtering
export const ALL_VENUE_ITEMS = GROUPED_VENUE_CATEGORIES.flatMap(group => group.items);
