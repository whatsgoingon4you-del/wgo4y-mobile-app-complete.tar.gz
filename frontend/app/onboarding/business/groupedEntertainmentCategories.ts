export interface EntertainmentGroup {
  name: string;
  icon: string;
  items: string[];
}

export const GROUPED_ENTERTAINMENT_CATEGORIES: EntertainmentGroup[] = [
  {
    name: '🎵 Live Music & DJ',
    icon: 'musical-notes',
    items: [
      'DJ Nights',
      'Live Bands & Concerts',
      'Live Music',
      'Jazz Nights',
      'R&B Nights',
      'Hip-Hop Nights',
      'Latin Music Nights',
      'Country Music Nights',
      'Rock Concerts',
      'Electronic/EDM Events',
      'Open Mic Nights',
      'Acoustic Sessions',
    ]
  },
  {
    name: '🎭 Comedy & Theater',
    icon: 'happy',
    items: [
      'Comedy Shows',
      'Stand-Up Comedy',
      'Improv Comedy',
      'Theater Performances',
      'Cabaret Shows',
      'Drag Shows',
    ]
  },
  {
    name: '🎮 Interactive & Games',
    icon: 'game-controller',
    items: [
      'Karaoke',
      'Trivia Nights',
      'Game Nights',
      'Bingo Nights',
      'Dance Contests',
      'Talent Shows',
      'Battle of the Bands',
      'Dance Battles',
    ]
  },
  {
    name: '🎉 Themed Parties & Events',
    icon: 'balloon',
    items: [
      'Themed Parties',
      '80s/90s Theme Nights',
      'Costume Parties',
      'Holiday Celebrations',
      'New Year\'s Eve Events',
      'Halloween Parties',
      'Masquerade Balls',
      'Glow Parties',
      'Foam Parties',
      'Paint Parties',
    ]
  },
  {
    name: '💼 Social & Networking',
    icon: 'people',
    items: [
      'Speed Dating',
      'Singles Mixers',
      'Networking Events',
      'Industry Nights',
      'Ladies Night',
      'College Nights',
      'Industry Mixers',
    ]
  },
  {
    name: '🏈 Sports & Viewing Parties',
    icon: 'football',
    items: [
      'Sports Viewing Parties',
      'UFC/Boxing Viewing',
      'Tailgate Parties',
      'March Madness Events',
      'Super Bowl Parties',
    ]
  },
  {
    name: '🍷 Cultural & Tastings',
    icon: 'wine',
    items: [
      'Cultural Festivals',
      'Wine Tastings',
      'Craft Beer Tastings',
      'Whiskey Tastings',
      'Food Festivals',
      'Art Exhibitions',
      'Fashion Shows',
      'Fundraisers',
      'Charity Events',
      'Community Volunteer Nights',
      'Block Parties',
    ]
  },
  {
    name: '🎂 Special Occasions',
    icon: 'gift',
    items: [
      'Private Events',
      'Birthday Parties',
      'Bachelor/Bachelorette Parties',
      'Corporate Events',
      'Wedding Receptions',
      'Anniversary Celebrations',
      'Graduation Parties',
    ]
  },
  {
    name: '🏆 Competitions & Tournaments',
    icon: 'trophy',
    items: [
      'Pool Tournaments',
      'Dart Tournaments',
      'Video Game Tournaments',
      'Dance Competitions',
      'Singing Competitions',
    ]
  },
  {
    name: '🧘 Wellness & Lifestyle',
    icon: 'fitness',
    items: [
      'Yoga Events',
      'Meditation Sessions',
      'Wellness Workshops',
      'Fitness Classes',
    ]
  },
  {
    name: '✨ Special Performances',
    icon: 'sparkles',
    items: [
      'Magic Shows',
      'Circus Acts',
      'Fire Performances',
      'Aerial Performances',
      'Burlesque Shows',
      'Poetry Slams',
      'Spoken Word Events',
      'Live Podcast Recordings',
      'Live Art/Painting Events',
      'Silent Disco',
      'Glow-in-the-Dark Events',
    ]
  },
  {
    name: '🌅 Day & Special Events',
    icon: 'sunny',
    items: [
      'After-Hours Events',
      'Brunch Events',
      'Day Parties',
      'Rooftop Events',
      'Pool Parties',
      'Beach Parties',
    ]
  },
  {
    name: '📋 Other',
    icon: 'ellipsis-horizontal',
    items: [
      'Other',
    ]
  },
];

// Flatten all items for search/filtering
export const ALL_ENTERTAINMENT_ITEMS = GROUPED_ENTERTAINMENT_CATEGORIES.flatMap(group => group.items);
