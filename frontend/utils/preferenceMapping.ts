/**
 * Smart mapping between entertainment preferences and venue/service categories
 * Uses entertainment category IDs from entertainment_categories.py
 */

export const ENTERTAINMENT_TO_VENUE_MAPPING: { [key: string]: string[] } = {
  // Music Genres → Venues
  'music_hiphop': ['Nightclub', 'Bar', 'Lounge', 'Dance Club'],
  'music_rnb': ['Lounge', 'Bar', 'Nightclub'],
  'music_jazz': ['Jazz Club', 'Lounge', 'Wine Bar', 'Bar'],
  'music_edm': ['Nightclub', 'Dance Club'],
  'music_pop': ['Nightclub', 'Bar', 'Dance Club'],
  'music_country': ['Bar', 'Live Music Venue'],
  'music_rock': ['Live Music Venue', 'Concert Hall', 'Bar'],
  'music_reggae': ['Nightclub', 'Bar', 'Dance Club'],
  'music_latin': ['Nightclub', 'Dance Club', 'Bar'],
  'music_afrobeats': ['Nightclub', 'Dance Club', 'Bar'],
  'music_gospel': ['Concert Hall', 'Theater'],
  'music_southern_soul': ['Lounge', 'Bar'],
  
  // Live Entertainment → Venues
  'live_concerts': ['Concert Hall', 'Live Music Venue', 'Amphitheater'],
  'live_popup_concerts': ['Bar', 'Lounge', 'Outdoor Event Space'],
  'live_comedy': ['Comedy Club', 'Bar', 'Theater'],
  'live_karaoke': ['Karaoke Bar', 'Bar', 'Lounge'],
  'live_open_mic': ['Bar', 'Coffee Shop', 'Live Music Venue'],
  
  // Sports → Venues
  'sports_basketball': ['Sports Bar', 'Sports Arena/Stadium'],
  'sports_football': ['Sports Bar', 'Sports Arena/Stadium'],
  'sports_boxing': ['Sports Bar', 'Bar'],
  'sports_ufc_mma': ['Sports Bar', 'Bar'],
  'sports_march_madness': ['Sports Bar', 'Bar'],
  
  // Recreation → Venues
  'rec_bowling': ['Bowling Alley'],
  'rec_pool': ['Pool Hall/Billiards', 'Bar'],
  'rec_arcade': ['Arcade', 'Family Entertainment Center'],
  'rec_escape_room': ['Escape Room'],
  
  // Nightlife → Venues
  'night_club': ['Nightclub', 'Dance Club'],
  'night_lounge': ['Lounge', 'Cocktail Bar'],
  'night_bar': ['Bar', 'Sports Bar', 'Wine Bar'],
  'night_rooftop': ['Rooftop Venue', 'Lounge'],
  'night_speakeasy': ['Speakeasy', 'Cocktail Bar'],
  
  // Dining → Venues
  'dining_restaurant': ['Restaurant', 'Fine Dining', 'Casual Dining'],
  'dining_brunch': ['Restaurant', 'Casual Dining'],
  'dining_happy_hour': ['Bar', 'Restaurant', 'Lounge'],
  
  // Events → Venues
  'events_weddings': ['Wedding Venue', 'Banquet Hall', 'Hotel/Resort'],
  'events_corporate': ['Event Space', 'Conference Center', 'Hotel/Resort'],
  'events_birthday': ['Event Space', 'Restaurant', 'Bar'],
  'events_networking': ['Lounge', 'Conference Center', 'Hotel/Resort'],
};

export const ENTERTAINMENT_TO_SERVICE_MAPPING: { [key: string]: string[] } = {
  // Music → Services
  'music_hiphop': ['DJ', 'Rapper', 'MC/Host'],
  'music_rnb': ['Singer', 'Musical Artist', 'Band'],
  'music_jazz': ['Musical Artist', 'Singer', 'Band'],
  'music_edm': ['DJ', 'Audio Engineer'],
  'music_pop': ['Singer', 'Musical Artist', 'Band', 'DJ'],
  'music_country': ['Singer', 'Musical Artist', 'Band'],
  'music_rock': ['Band', 'Musical Artist'],
  'music_reggae': ['DJ', 'Musical Artist'],
  'music_latin': ['Band', 'DJ', 'Dancer'],
  'music_afrobeats': ['DJ', 'Musical Artist'],
  
  // Live Entertainment → Services
  'live_concerts': ['Musical Artist', 'Singer', 'Band', 'Audio Engineer'],
  'live_comedy': ['Comedian'],
  'live_karaoke': ['DJ', 'MC/Host'],
  'live_open_mic': ['MC/Host'],
  
  // Events → Services
  'events_weddings': ['Wedding Planner', 'Event Coordinator', 'Caterer', 'DJ', 'Photographer'],
  'events_corporate': ['Event Planner', 'Event Coordinator', 'Caterer'],
  'events_birthday': ['Event Planner', 'DJ', 'Caterer'],
  'dining_brunch': ['Caterer', 'Personal Chef'],
};

/**
 * Get venue preferences based on entertainment preferences
 */
export function getVenuesFromEntertainment(entertainmentPreferences: string[]): string[] {
  const venueSet = new Set<string>();
  
  entertainmentPreferences.forEach(entertainment => {
    const venues = ENTERTAINMENT_TO_VENUE_MAPPING[entertainment];
    if (venues) {
      venues.forEach(venue => venueSet.add(venue));
    }
  });
  
  return Array.from(venueSet);
}

/**
 * Get service preferences based on entertainment preferences
 */
export function getServicesFromEntertainment(entertainmentPreferences: string[]): string[] {
  const serviceSet = new Set<string>();
  
  entertainmentPreferences.forEach(entertainment => {
    const services = ENTERTAINMENT_TO_SERVICE_MAPPING[entertainment];
    if (services) {
      services.forEach(service => serviceSet.add(service));
    }
  });
  
  return Array.from(serviceSet);
}
