"""
Seed Club Euphoria Business Account
Creates a Gold tier business profile for testing
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt
import os
from datetime import datetime, timezone
from uuid import uuid4

async def seed_club_euphoria():
    # Connect to MongoDB
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'wgo4y')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Check if Club Euphoria already exists
    existing = await db.users.find_one({'business_name': 'Club Euphoria'})
    if existing:
        print("⚠️  Club Euphoria already exists in database")
        return existing['id']
    
    # Create user ID
    user_id = str(uuid4())
    
    # Hash password
    password = "Test1234"
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Create Club Euphoria business profile
    club_euphoria = {
        'id': user_id,
        '_id': user_id,
        'username': 'club_euphoria',
        'email': 'club_euphoria@wgo4y.com',
        'password': password_hash,
        'password_hash': password_hash,
        'user_type': 'business',
        'full_name': 'Club Euphoria',
        'business_name': 'Club Euphoria',
        'business_type': 'nightclub',
        'membership_tier': 'gold',
        'tier': 'gold',
        
        # Business details
        'business_description': 'Premier nightclub and event venue in the heart of the city. Known for world-class DJs, VIP experiences, and unforgettable nights.',
        'business_address': '123 Nightlife Blvd, Downtown',
        'city': 'Charleston',
        'state': 'SC',
        'location': 'Charleston, SC',
        'business_phone': '843-555-CLUB',
        'phone': '843-555-2582',
        
        # Venue details
        'venue_type': 'clubs_lounges',
        'capacity': 500,
        'use_cases': ['date_night', 'late_night', 'live_music', 'special_events'],
        'amenities': [
            'Full Bar',
            'VIP Sections',
            'Bottle Service',
            'Dance Floor',
            'Professional Sound System',
            'LED Lighting',
            'Outdoor Patio',
            'Private Event Space',
            'Coat Check',
            'Valet Parking'
        ],
        
        # Hours
        'business_hours': {
            'monday': 'Closed',
            'tuesday': 'Closed',
            'wednesday': '9:00 PM - 2:00 AM',
            'thursday': '9:00 PM - 2:00 AM',
            'friday': '9:00 PM - 3:00 AM',
            'saturday': '9:00 PM - 3:00 AM',
            'sunday': 'Closed'
        },
        
        # Categories
        'venue_categories': ['Nightclub', 'Lounge', 'Event Venue'],
        'entertainment_categories': ['Electronic/EDM', 'Hip-Hop', 'Top 40', 'Live DJ'],
        'selected_categories': ['clubs_lounges', 'live_music', 'late_night'],
        
        # Social links
        'social_links': {
            'website': 'https://clubeuphoria.com',
            'instagram': '@clubeuphoria',
            'facebook': 'ClubEuphoria',
            'twitter': '@clubeuphoria'
        },
        
        # Profile status
        'onboarding_completed': True,
        'profile_completed': True,
        'is_demo_profile': False,
        'is_admin': False,
        
        # Timestamps
        'created_at': datetime.now(timezone.utc),
        'updated_at': datetime.now(timezone.utc),
        
        # Bio
        'bio': 'The ultimate nightlife destination. Experience world-class entertainment, premium bottle service, and an unmatched atmosphere.',
        
        # Profile photo (using a placeholder)
        'profile_photo': None,
        'business_logo': None,
        'business_photos': []
    }
    
    # Insert into database
    await db.users.insert_one(club_euphoria)
    
    print("✅ Club Euphoria business account created!")
    print(f"   User ID: {user_id}")
    print(f"   Username: club_euphoria")
    print(f"   Email: club_euphoria@wgo4y.com")
    print(f"   Password: Test1234")
    print(f"   Tier: Gold")
    print(f"   Type: Business (Nightclub)")
    
    return user_id

if __name__ == "__main__":
    asyncio.run(seed_club_euphoria())
