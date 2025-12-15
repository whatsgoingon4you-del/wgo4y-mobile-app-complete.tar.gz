"""
Create 90 Showcase Entrepreneur Profiles
6 states × 15 core categories = 90 profiles
States: SC, NC, GA, TN, VA, CT
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone
from uuid import uuid4

# States and their major cities
STATES = {
    'SC': {'name': 'South Carolina', 'cities': ['Charleston', 'Columbia', 'Greenville', 'Myrtle Beach']},
    'NC': {'name': 'North Carolina', 'cities': ['Charlotte', 'Raleigh', 'Durham', 'Asheville']},
    'GA': {'name': 'Georgia', 'cities': ['Atlanta', 'Savannah', 'Augusta', 'Macon']},
    'TN': {'name': 'Tennessee', 'cities': ['Nashville', 'Memphis', 'Knoxville', 'Chattanooga']},
    'VA': {'name': 'Virginia', 'cities': ['Richmond', 'Virginia Beach', 'Norfolk', 'Arlington']},
    'CT': {'name': 'Connecticut', 'cities': ['Hartford', 'New Haven', 'Stamford', 'Bridgeport']},
}

# 15 Core Categories
CORE_CATEGORIES = [
    {'role': 'DJ', 'prefix': ['DJ', 'DJ', 'DJ'], 'suffix': ['Spin Master', 'Beats', 'Rhythm', 'Vibe', 'Sound']},
    {'role': 'Promoter', 'prefix': [''], 'suffix': ['Promotions', 'Events', 'Marketing', 'Hype Squad']},
    {'role': 'Bartender', 'prefix': [''], 'suffix': ['Mixology', 'Cocktails', 'Bar Services']},
    {'role': 'Security', 'prefix': [''], 'suffix': ['Security', 'Protection', 'Safety Services']},
    {'role': 'Photographer', 'prefix': [''], 'suffix': ['Photography', 'Photo Studio', 'Visuals']},
    {'role': 'Videographer', 'prefix': [''], 'suffix': ['Video Production', 'Film Services', 'Media']},
    {'role': 'Caterer', 'prefix': [''], 'suffix': ['Catering', 'Food Services', 'Cuisine']},
    {'role': 'Cleaning Crew/Event Cleanup', 'prefix': [''], 'suffix': ['Cleaning', 'Janitorial', 'Event Cleanup']},
    {'role': 'Transportation/Shuttle Service', 'prefix': [''], 'suffix': ['Transport', 'Rides', 'Shuttle']},
    {'role': 'Makeup Artist', 'prefix': [''], 'suffix': ['Makeup Artistry', 'Beauty', 'Glam']},
    {'role': 'Hair Stylist', 'prefix': [''], 'suffix': ['Hair Studio', 'Styling', 'Salon']},
    {'role': 'Sound Engineer/Audio Tech', 'prefix': [''], 'suffix': ['Audio', 'Sound Tech', 'Production']},
    {'role': 'Lighting Technician/Designer', 'prefix': [''], 'suffix': ['Lighting', 'Illumination', 'Stage Lights']},
    {'role': 'Event Planner/Coordinator', 'prefix': [''], 'suffix': ['Events', 'Planning', 'Coordination']},
    {'role': 'Booking Agent/Manager', 'prefix': [''], 'suffix': ['Booking', 'Talent Management', 'Agency']},
]

# First names pool
FIRST_NAMES = ['Marcus', 'Jasmine', 'Tyler', 'Maya', 'Jordan', 'Alexis', 'Cameron', 'Taylor', 'Morgan', 'Riley', 'Avery', 'Casey', 'Drew', 'Quinn', 'Reese']

# Last names pool
LAST_NAMES = ['Johnson', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson']

async def create_showcase_profiles():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'venue_job_portal')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("="*80)
    print("🎭 CREATING 90 SHOWCASE ENTREPRENEUR PROFILES")
    print("="*80)
    
    created_count = 0
    profile_counter = 0
    
    for state_code, state_data in STATES.items():
        print(f"\n📍 {state_data['name']} ({state_code}):")
        
        for category in CORE_CATEGORIES:
            # Create one profile for this category in this state
            city = state_data['cities'][profile_counter % len(state_data['cities'])]
            
            # Generate realistic name
            first = FIRST_NAMES[profile_counter % len(FIRST_NAMES)]
            last = LAST_NAMES[profile_counter % len(LAST_NAMES)]
            full_name = f"{first} {last}"
            
            # Generate service name
            prefix = category['prefix'][0] if category['prefix'][0] else first
            suffix = category['suffix'][profile_counter % len(category['suffix'])]
            service_name = f"{prefix} {suffix}".strip()
            
            user_id = str(uuid4())
            username = f"showcase_{state_code.lower()}_{category['role'].lower().replace('/', '_').replace(' ', '_')}_{profile_counter}"
            
            # Generate bio
            bio = f"Professional {category['role'].lower()} serving {city}, {state_code} and surrounding areas. Over 5 years of experience in the entertainment and events industry."
            
            showcase_profile = {
                'id': user_id,
                '_id': user_id,
                'username': username,
                'email': f"{username}@showcase.wgo4y.com",
                'password': 'SHOWCASE_LOCKED',
                'password_hash': 'SHOWCASE_LOCKED',
                'user_type': 'entrepreneur',
                'full_name': full_name,
                'service_name': service_name,
                'bio': bio,
                'location': f"{city}, {state_code}",
                'city': city,
                'state': state_code,
                'occupations': [category['role']],
                'profile_photo': f'https://ui-avatars.com/api/?name={first}+{last}&size=200&background=1565FF&color=fff',
                'membership_tier': 'silver',
                'tier': 'silver',
                'onboarding_completed': True,
                'profile_completed': True,
                'is_showcase': True,
                'showcase_label': 'Showcase Profile',
                'created_at': datetime.now(timezone.utc),
                'updated_at': datetime.now(timezone.utc),
                'portfolio_photos': [],
                'years_experience': 5,
            }
            
            await db.users.insert_one(showcase_profile)
            created_count += 1
            profile_counter += 1
            
            print(f"  ✅ {full_name} - {category['role']} ({city})")
    
    print("\n" + "="*80)
    print(f"✅ CREATED {created_count} SHOWCASE PROFILES!")
    print("="*80)
    print(f"   Distribution: 15 categories × 6 states = 90 profiles")
    print("="*80)
    
    # Summary
    total_users = await db.users.count_documents({})
    showcase_users = await db.users.count_documents({'is_showcase': True})
    real_users = await db.users.count_documents({'is_showcase': {'$ne': True}})
    
    print(f"\n📊 Database Summary:")
    print(f"   Total users: {total_users}")
    print(f"   Real users: {real_users}")
    print(f"   Showcase profiles: {showcase_users}")

if __name__ == "__main__":
    asyncio.run(create_showcase_profiles())
