"""
Create 90 UNIQUE Showcase Profiles
Each profile has a unique name, bio, and service name
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone
from uuid import uuid4

STATES = {
    'SC': {'name': 'South Carolina', 'cities': ['Charleston', 'Columbia', 'Greenville', 'Myrtle Beach']},
    'NC': {'name': 'North Carolina', 'cities': ['Charlotte', 'Raleigh', 'Durham', 'Asheville']},
    'GA': {'name': 'Georgia', 'cities': ['Atlanta', 'Savannah', 'Augusta', 'Macon']},
    'TN': {'name': 'Tennessee', 'cities': ['Nashville', 'Memphis', 'Knoxville', 'Chattanooga']},
    'VA': {'name': 'Virginia', 'cities': ['Richmond', 'Virginia Beach', 'Norfolk', 'Arlington']},
    'CT': {'name': 'Connecticut', 'cities': ['Hartford', 'New Haven', 'Stamford', 'Bridgeport']},
}

# 90 Unique names (15 per state)
UNIQUE_NAMES = [
    # SC (Charleston area)
    'Marcus "The Beat" Johnson', 'Jasmine Rivers', 'Tyler Kingston', 'Maya Sterling', 'Jordan Blake',
    'Alexis Monroe', 'Cameron Cross', 'Taylor Swift-Mix', 'Morgan Hayes', 'Riley Sanders',
    'Avery Stone', 'Casey Brooks', 'Drew Mitchell', 'Quinn Parker', 'Reese Davidson',
    
    # NC (Charlotte area)  
    'Antonio Garcia', 'Brianna Coleman', 'Carlos Mendez', 'Diana Foster', 'Ethan Wright',
    'Felicia Hughes', 'Gabriel Torres', 'Harper Bennett', 'Isaiah Collins', 'Jade Murphy',
    'Kai Rivera', 'Luna Gray', 'Nathan Cooper', 'Olivia Reed', 'Phoenix Cruz',
    
    # GA (Atlanta area)
    'Andre Washington', 'Bella Richardson', 'Christian Cox', 'Destiny Howard', 'Eric Ward',
    'Faith Peterson', 'George Bailey', 'Hannah Griffin', 'Ivan Russell', 'Jade Butler',
    'Kevin Powell', 'Layla Barnes', 'Michael Jenkins', 'Nina Perry', 'Oscar Coleman',
    
    # TN (Nashville area)
    'Blake Carter', 'Chloe Hayes', 'Dante Fisher', 'Elena Ross', 'Felix Morgan',
    'Grace Sullivan', 'Hugo Bell', 'Iris Watson', 'Jake Armstrong', 'Kendra Price',
    'Leo Sanders', 'Madison Scott', 'Noah Hughes', 'Penelope Ward', 'Quincy Adams',
    
    # VA (Richmond area)
    'Aaron Mitchell', 'Bianca Foster', 'Cole Harrison', 'Delilah Brooks', 'Eli Montgomery',
    'Fiona Reynolds', 'Grayson Pierce', 'Hazel Crawford', 'Isaac Fleming', 'Juliet Marsh',
    'Kieran Walsh', 'Lila Benson', 'Mason Garrett', 'Nora Flynn', 'Owen Chandler',
    
    # CT (Hartford area)
    'Alex Romano', 'Bella Marino', 'Connor O\'Brien', 'Daisy Sullivan', 'Evan McCarthy',
    'Francesca Ricci', 'Grant Murphy', 'Helena Rossi', 'Ian Kennedy', 'Josie Quinn',
    'Kyle Fitzgerald', 'Lucia Costa', 'Max Brennan', 'Nova Sterling', 'Preston Wade',
]

CORE_ROLES = ['DJ', 'Promoter', 'Bartender', 'Security', 'Photographer', 'Videographer', 'Caterer', 'Cleaning Crew/Event Cleanup', 'Transportation/Shuttle Service', 'Makeup Artist', 'Hair Stylist', 'Sound Engineer/Audio Tech', 'Lighting Technician/Designer', 'Event Planner/Coordinator', 'Booking Agent/Manager']

async def create_unique_showcase():
    client = AsyncIOMotorClient(os.environ.get('MONGO_URL'))
    db = client[os.environ.get('DB_NAME', 'venue_job_portal')]
    
    print("🎭 Creating 90 UNIQUE showcase profiles...")
    
    created = 0
    idx = 0
    
    for state_code, state_data in STATES.items():
        for role_idx, role in enumerate(CORE_ROLES):
            full_name = UNIQUE_NAMES[idx]
            city = state_data['cities'][role_idx % len(state_data['cities'])]
            
            user_id = str(uuid4())
            
            profile = {
                'id': user_id,
                '_id': user_id,
                'username': f"showcase_{state_code.lower()}_{idx}",
                'email': f"showcase_{state_code.lower()}_{idx}@wgo4y.com",
                'password': 'SHOWCASE_LOCKED',
                'password_hash': 'SHOWCASE_LOCKED',
                'user_type': 'entrepreneur',
                'full_name': full_name,
                'service_name': f"{full_name} - {role} Services",
                'bio': f"Professional {role.lower()} serving {city}, {state_code}. Experienced entertainment professional.",
                'location': f"{city}, {state_code}",
                'city': city,
                'state': state_code,
                'occupations': [role],
                'profile_photo': f'https://ui-avatars.com/api/?name={full_name.replace(" ", "+")}&size=200&background=random',
                'membership_tier': 'silver',
                'onboarding_completed': True,
                'is_showcase': True,
                'showcase_label': 'Showcase Profile',
                'created_at': datetime.now(timezone.utc),
            }
            
            await db.users.insert_one(profile)
            created += 1
            idx += 1
            
            if created % 15 == 0:
                print(f"  ✅ {state_data['name']}: 15 profiles created")
    
    print(f"\n✅ Created {created} unique showcase profiles!")
    total = await db.users.count_documents({})
    print(f"Total users: {total}")

asyncio.run(create_unique_showcase())
