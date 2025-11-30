# Event Categories for WGO4Y - Experiences (Events)
# These categories represent the "vibe" or type of event

EVENT_CATEGORIES = [
    {
        'id': 'parties_nightlife',
        'name': 'Parties & Nightlife',
        'description': 'Clubs, parties, nightlife events',
        'icon': '🎉'
    },
    {
        'id': 'live_music',
        'name': 'Live Music & Concerts',
        'description': 'Concerts, live performances, music festivals',
        'icon': '🎵'
    },
    {
        'id': 'food_drink',
        'name': 'Food & Drink',
        'description': 'Brunches, tastings, food festivals, dining events',
        'icon': '🍽️'
    },
    {
        'id': 'arts_culture',
        'name': 'Arts & Culture',
        'description': 'Paint & sip, poetry, galleries, cultural events',
        'icon': '🎨'
    },
    {
        'id': 'sports_games',
        'name': 'Sports & Games',
        'description': 'Tournaments, watch parties, bowling, pool, sports events',
        'icon': '⚽'
    },
    {
        'id': 'family_kids',
        'name': 'Family & Kids',
        'description': 'Family-friendly events, kids activities',
        'icon': '👨‍👩‍👧‍👦'
    },
    {
        'id': 'community_church',
        'name': 'Community & Church',
        'description': 'Community gatherings, church events, spiritual events',
        'icon': '⛪'
    },
    {
        'id': 'business_networking',
        'name': 'Business & Networking',
        'description': 'Networking events, business meetups, professional gatherings',
        'icon': '💼'
    },
    {
        'id': 'classes_workshops',
        'name': 'Classes & Workshops',
        'description': 'Educational classes, skill workshops, training sessions',
        'icon': '📚'
    },
    {
        'id': 'holidays_special',
        'name': 'Holidays & Special Events',
        'description': 'Holiday celebrations, seasonal events, special occasions',
        'icon': '🎊'
    }
]

# US States - Current targets for WGO4Y
US_STATES = [
    {'id': 'SC', 'name': 'South Carolina'},
    {'id': 'NC', 'name': 'North Carolina'},
    {'id': 'GA', 'name': 'Georgia'},
    {'id': 'TN', 'name': 'Tennessee'},
    {'id': 'VA', 'name': 'Virginia'},
    {'id': 'CT', 'name': 'Connecticut'}
]

# Price types for events
PRICE_TYPES = [
    {'id': 'free', 'name': 'Free'},
    {'id': 'paid', 'name': 'Paid'}
]

# Quick filter chips for browse screen
QUICK_FILTERS = [
    {'id': 'tonight', 'name': 'Tonight', 'description': 'Events happening today'},
    {'id': 'this_weekend', 'name': 'This Weekend', 'description': 'Events this Saturday and Sunday'},
    {'id': 'parties', 'name': 'Parties', 'category_id': 'parties_nightlife'},
    {'id': 'family', 'name': 'Family', 'category_id': 'family_kids'},
    {'id': 'live_music', 'name': 'Live Music', 'category_id': 'live_music'},
    {'id': 'free', 'name': 'Free', 'price_type': 'free'}
]

# OLD to NEW category mapping for migration
CATEGORY_MIGRATION_MAP = {
    # Old category name/id → New category id
    'party': 'parties_nightlife',
    'nightlife': 'parties_nightlife',
    'club': 'parties_nightlife',
    'music': 'live_music',
    'concert': 'live_music',
    'live music': 'live_music',
    'food': 'food_drink',
    'dining': 'food_drink',
    'brunch': 'food_drink',
    'art': 'arts_culture',
    'culture': 'arts_culture',
    'gallery': 'arts_culture',
    'sports': 'sports_games',
    'game': 'sports_games',
    'tournament': 'sports_games',
    'kids': 'family_kids',
    'family': 'family_kids',
    'children': 'family_kids',
    'community': 'community_church',
    'church': 'community_church',
    'spiritual': 'community_church',
    'business': 'business_networking',
    'networking': 'business_networking',
    'professional': 'business_networking',
    'workshop': 'classes_workshops',
    'class': 'classes_workshops',
    'training': 'classes_workshops',
    'holiday': 'holidays_special',
    'seasonal': 'holidays_special',
    'special': 'holidays_special'
}

def get_category_by_id(category_id: str):
    """Get category details by ID"""
    for cat in EVENT_CATEGORIES:
        if cat['id'] == category_id:
            return cat
    return None

def get_state_by_id(state_id: str):
    """Get state details by ID"""
    for state in US_STATES:
        if state['id'] == state_id:
            return state
    return None

def migrate_old_category(old_category: str):
    """
    Attempt to map an old category to a new one.
    Returns new category_id or None if no mapping found.
    """
    if not old_category:
        return None
    
    # Normalize: lowercase and strip
    normalized = old_category.lower().strip()
    
    # Check direct mapping
    if normalized in CATEGORY_MIGRATION_MAP:
        return CATEGORY_MIGRATION_MAP[normalized]
    
    # Check if any keyword matches
    for old_key, new_id in CATEGORY_MIGRATION_MAP.items():
        if old_key in normalized:
            return new_id
    
    return None
