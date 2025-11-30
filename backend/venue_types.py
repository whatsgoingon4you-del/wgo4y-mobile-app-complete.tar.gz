# Venue Types & Use Cases for WGO4Y - Places (Venues & Businesses)

VENUE_TYPES = [
    {
        'id': 'clubs_lounges',
        'name': 'Clubs & Lounges',
        'description': 'Nightclubs, lounges, dance clubs',
        'icon': '🎵'
    },
    {
        'id': 'bars_pubs',
        'name': 'Bars & Pubs',
        'description': 'Bars, pubs, taverns, sports bars',
        'icon': '🍺'
    },
    {
        'id': 'restaurants_cafes',
        'name': 'Restaurants & Cafes',
        'description': 'Restaurants, cafes, dining establishments',
        'icon': '🍽️'
    },
    {
        'id': 'event_halls',
        'name': 'Event Halls & Banquet Centers',
        'description': 'Event spaces, banquet halls, conference centers',
        'icon': '🏛️'
    },
    {
        'id': 'sports_recreation',
        'name': 'Sports & Recreation',
        'description': 'Bowling alleys, pool halls, skating rinks, recreational facilities',
        'icon': '🎳'
    },
    {
        'id': 'theaters_performance',
        'name': 'Theaters & Performance Spaces',
        'description': 'Theaters, concert halls, performance venues',
        'icon': '🎭'
    },
    {
        'id': 'parks_outdoor',
        'name': 'Parks & Outdoor Spaces',
        'description': 'Parks, gardens, outdoor event spaces',
        'icon': '🌳'
    },
    {
        'id': 'churches_community',
        'name': 'Churches & Community Centers',
        'description': 'Churches, community centers, religious venues',
        'icon': '⛪'
    }
]

# Use Case Tags - What the venue is good for
USE_CASE_TAGS = [
    {
        'id': 'date_night',
        'name': 'Date Night',
        'description': 'Perfect for romantic dates and couples',
        'icon': '💑'
    },
    {
        'id': 'birthday_celebration',
        'name': 'Birthday / Celebration Ready',
        'description': 'Great for birthdays, celebrations, parties',
        'icon': '🎂'
    },
    {
        'id': 'family_friendly',
        'name': 'Family-Friendly',
        'description': 'Welcoming to families with children',
        'icon': '👨‍👩‍👧‍👦'
    },
    {
        'id': 'corporate_friendly',
        'name': 'Corporate / Meeting Friendly',
        'description': 'Suitable for business meetings, corporate events',
        'icon': '💼'
    },
    {
        'id': 'late_night',
        'name': 'Late-Night',
        'description': 'Open late, good for nightlife',
        'icon': '🌙'
    }
]

# Quick filter chips for Places browse screen
VENUE_QUICK_FILTERS = [
    {'id': 'date_night', 'name': 'Date Night', 'use_case_id': 'date_night'},
    {'id': 'family_friendly', 'name': 'Family-Friendly', 'use_case_id': 'family_friendly'},
    {'id': 'late_night', 'name': 'Late-Night', 'use_case_id': 'late_night'},
    {'id': 'birthday', 'name': 'Birthday Spots', 'use_case_id': 'birthday_celebration'},
]

# OLD to NEW venue type mapping for migration
VENUE_TYPE_MIGRATION_MAP = {
    # Old type name → New type id
    'club': 'clubs_lounges',
    'lounge': 'clubs_lounges',
    'nightclub': 'clubs_lounges',
    'bar': 'bars_pubs',
    'pub': 'bars_pubs',
    'tavern': 'bars_pubs',
    'restaurant': 'restaurants_cafes',
    'cafe': 'restaurants_cafes',
    'dining': 'restaurants_cafes',
    'event hall': 'event_halls',
    'banquet': 'event_halls',
    'conference': 'event_halls',
    'bowling': 'sports_recreation',
    'pool hall': 'sports_recreation',
    'skating': 'sports_recreation',
    'sports': 'sports_recreation',
    'recreation': 'sports_recreation',
    'theater': 'theaters_performance',
    'performance': 'theaters_performance',
    'concert hall': 'theaters_performance',
    'park': 'parks_outdoor',
    'outdoor': 'parks_outdoor',
    'garden': 'parks_outdoor',
    'church': 'churches_community',
    'community center': 'churches_community',
    'community': 'churches_community'
}

def get_venue_type_by_id(type_id: str):
    """Get venue type details by ID"""
    for vtype in VENUE_TYPES:
        if vtype['id'] == type_id:
            return vtype
    return None

def get_use_case_by_id(use_case_id: str):
    """Get use case details by ID"""
    for use_case in USE_CASE_TAGS:
        if use_case['id'] == use_case_id:
            return use_case
    return None

def migrate_old_venue_type(old_type: str):
    """
    Attempt to map an old venue type to a new one.
    Returns new type_id or None if no mapping found.
    """
    if not old_type:
        return None
    
    # Normalize: lowercase and strip
    normalized = old_type.lower().strip()
    
    # Check direct mapping
    if normalized in VENUE_TYPE_MIGRATION_MAP:
        return VENUE_TYPE_MIGRATION_MAP[normalized]
    
    # Check if any keyword matches
    for old_key, new_id in VENUE_TYPE_MIGRATION_MAP.items():
        if old_key in normalized:
            return new_id
    
    return None
