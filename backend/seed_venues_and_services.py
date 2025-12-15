"""
Seed Demo Venues and Services
Populates venues and entrepreneur services to make homepage rich
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone
from uuid import uuid4

async def seed_venues_and_services():
    # Connect to MongoDB
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'venue_job_portal')
    
    print(f"📊 Connecting to database: {db_name}")
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Get existing business users to create venue profiles
    business_users = await db.users.find({
        'user_type': 'business',
        'onboarding_completed': True
    }, {'_id': 0}).limit(10).to_list(100)
    
    print(f"Found {len(business_users)} business users")
    
    # Create venue profiles for existing businesses
    venues_created = 0
    for biz in business_users[:5]:  # Create 5 demo venues
        venue_id = str(uuid4())
        
        # Check if venue already exists for this user
        existing = await db.venues.find_one({'owner_id': biz['id']})
        if existing:
            continue
        
        venue = {
            '_id': venue_id,
            'owner_id': biz['id'],
            'name': biz.get('business_name', f"Demo Venue {venues_created + 1}"),
            'description': biz.get('business_description', 'Amazing venue for events and entertainment'),
            'venue_type': biz.get('venue_type', 'clubs_lounges'),
            'address': biz.get('business_address', '123 Main St'),
            'city': biz.get('city', 'Charleston'),
            'state': biz.get('state', 'SC'),
            'capacity': biz.get('capacity', 200),
            'amenities': biz.get('amenities', ['Full Bar', 'Dance Floor', 'VIP Section']),
            'images': biz.get('business_photos', []),
            'profile_photo': biz.get('business_logo') or biz.get('profile_photo'),
            'rating': 4.5,
            'popular': True,
            'featured': venues_created < 3,
            'status': 'active',
            'is_demo': True,
            'created_at': datetime.now(timezone.utc),
            'updated_at': datetime.now(timezone.utc)
        }
        
        await db.venues.insert_one(venue)
        venues_created += 1
        print(f"✅ Created venue: {venue['name']}")
    
    # Get entrepreneur users to create services
    entrepreneur_users = await db.users.find({
        'user_type': 'entrepreneur',
        'onboarding_completed': True
    }, {'_id': 0}).limit(15).to_list(100)
    
    print(f"Found {len(entrepreneur_users)} entrepreneur users")
    
    # Create services for entrepreneurs
    services_created = 0
    for entr in entrepreneur_users[:10]:  # Create 10 demo services
        service_id = str(uuid4())
        
        # Check if service already exists
        existing = await db.services.find_one({'provider_id': entr['id']})
        if existing:
            continue
        
        occupations = entr.get('occupations', ['Entertainer'])
        occupation = occupations[0] if occupations else 'Entertainer'
        
        service = {
            '_id': service_id,
            'provider_id': entr['id'],
            'title': f"{occupation} Services",
            'description': f"Professional {occupation.lower()} services for your events",
            'service_type': occupation,
            'price': 150 + (services_created * 50),
            'price_type': 'starting_at',
            'images': entr.get('portfolio_photos', [])[:3],
            'profile_photo': entr.get('profile_photo'),
            'provider_name': entr.get('service_name') or entr.get('full_name', 'Demo Provider'),
            'location': entr.get('location', 'Charleston, SC'),
            'rating': 4.0 + (services_created * 0.1),
            'reviews_count': 10 + services_created,
            'featured': services_created < 5,
            'status': 'active',
            'is_demo': True,
            'created_at': datetime.now(timezone.utc),
            'updated_at': datetime.now(timezone.utc)
        }
        
        await db.services.insert_one(service)
        services_created += 1
        print(f"✅ Created service: {service['title']} by {service['provider_name']}")
    
    print("\n" + "="*60)
    print("📊 VENUES & SERVICES SEEDING COMPLETE!")
    print("="*60)
    print(f"   Venues Created: {venues_created}")
    print(f"   Services Created: {services_created}")
    print("="*60)

if __name__ == "__main__":
    asyncio.run(seed_venues_and_services())
