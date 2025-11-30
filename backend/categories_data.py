# WGO4Y Categories Data Structure

VENUE_CATEGORIES = {
    "Nightclubs": ["Dance Clubs", "VIP Lounges", "Themed", "Rooftop"],
    "Bars": ["Sports Bars", "Wine Bars", "Cocktail Bars", "Dive Bars", "Breweries"],
    "Event Centers": ["Wedding", "Conference", "Banquet", "Community"],
    "After-Event Cleaning": ["General", "Deep", "Eco-Friendly", "On-Demand"],
    "Event Equipment Rental": ["AV", "Furniture", "Lighting/Stage", "Tent/Outdoor"],
    "Bowling Alleys": ["Family", "Luxury", "League", "Glow-in-the-Dark"],
    "Restaurants": ["Fine", "Casual", "Food Trucks", "Themed"],
    "Lounges": ["Hookah", "Jazz", "Cigar", "R&B"],
    "Theaters": ["Movie", "Live", "Comedy", "Dinner"],
    "Outdoor Event Spaces": ["Parks/Gardens", "Rooftop", "Beachfront", "Amphitheaters"],
    "Hotels/Resorts": ["Ballrooms", "Poolside", "Conference"],
    "Other Unique Venues": ["Art Galleries", "Museums", "Warehouses", "Historic"]
}

ENTREPRENEUR_CATEGORIES = {
    "DJs": ["Club", "Wedding", "Mobile", "Radio"],
    "Promoters": ["Event", "Influencer", "Ambassador", "Nightlife"],
    "Baddie Models": ["Fashion", "Commercial", "Social Media", "Hostesses"],
    "Comedians": ["Stand-Up", "Improv", "Sketch", "Social Media"],
    "Musical Artists": ["Rap", "Pop", "Rock", "Country", "R&B", "Jazz", "Classical"],
    "Security Personnel": ["Event Guards", "VIP Bodyguards", "Crowd Control", "Door Supervisors"],
    "Bartenders": ["Craft", "Flair", "Mobile", "Event-Specific"],
    "Photographers": ["Event", "Portrait", "Wedding", "Commercial"],
    "Videographers": ["Event", "Music Video", "Documentary", "Social Media"],
    "Stylists": ["Hair", "Makeup", "Wardrobe", "Costume"],
    "Poets": ["Spoken Word", "Event", "Slam", "Social Media"],
    "Event Planners": ["Wedding", "Corporate", "Party", "Non-Profit"],
    "Catering Services": ["Event", "Food Truck", "Dessert"],
    "Entertainers": ["Magicians", "Dancers", "Bands", "Circus"],
    "Tech Specialists": ["Audio", "Lighting", "Stage"],
    "Event Hosts/MCs": ["MC", "Announcer", "Moderator"]
}

MESSAGE_INQUIRY_CATEGORIES = [
    "Book a DJ",
    "Hire a Live Band or Performer",
    "Request Event Catering",
    "Reserve a Venue or Space",
    "Book Event Security",
    "Request Photography/Videography",
    "Hire a Bartender or Mixologist",
    "Request Event Planning Services",
    "Rent Event Equipment (AV, Lighting, Decor)",
    "Book a Comedian or Host",
    "Request Promotional/Marketing Services",
    "Hire Entertainers (Dancers, Magicians, Circus Acts)",
    "Arrange Transportation or Valet",
    "Book After-Event Cleaning Services",
    "Request Custom Event Packages",
    "Inquire About VIP or Bottle Service",
    "Ask About Raffle Participation",
    "Redeem a Coupon or Special Offer",
    "Request a Quote for Services",
    "Ask About Collaboration or Partnerships",
    "Request Event Staffing (Hosts, Models, MCs)",
    "General Event Inquiry",
    "Feedback or Suggestions"
]

MEMBERSHIP_TIERS = {
    "BASIC": {
        "name": "Basic",
        "price": 0,
        "features": [
            "WGO4Y Profile",
            "Coupon Program Access",
            "Raffle Program Access",
            "Volunteer Program Access"
        ]
    },
    "APPRECIATION": {
        "name": "Appreciation",
        "price": 1.99,
        "features": [
            "All BASIC features",
            "Text & Email Alerts",
            "VIP Access",
            "Category-Limited Messaging",
            "Access to Entrepreneur Network & Job Board (additional fee)"
        ],
        "billing_options": {
            "monthly": {"price": 1.99, "months": 1},
            "semi_annual": {"price": 11.94, "months": 7, "discount": "1 month free"},
            "annual": {"price": 23.88, "months": 14, "discount": "2 months free"}
        }
    }
}

def get_all_venue_subcategories():
    """Get flat list of all venue subcategories"""
    subcats = []
    for category, subs in VENUE_CATEGORIES.items():
        for sub in subs:
            subcats.append(f"{category}:{sub}")
    return subcats

def get_all_entrepreneur_subcategories():
    """Get flat list of all entrepreneur subcategories"""
    subcats = []
    for category, subs in ENTREPRENEUR_CATEGORIES.items():
        for sub in subs:
            subcats.append(f"{category}:{sub}")
    return subcats
