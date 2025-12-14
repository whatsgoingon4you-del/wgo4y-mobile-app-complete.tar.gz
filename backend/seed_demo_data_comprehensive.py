"""
Comprehensive Demo Data Seeder
Populates the database with demo profiles, events, coupons, and raffles
All migrated WordPress profiles will be visible as demo/placeholder content
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone, timedelta
from uuid import uuid4
import json
from pathlib import Path

async def seed_demo_data():
    # Connect to MongoDB
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'venue_job_portal')
    
    print(f"📊 Connecting to database: {db_name}")
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Load profile mapping from WordPress migration
    profile_mapping_path = Path('/app/profile_image_mapping.json')
    profiles_data = []
    
    if profile_mapping_path.exists():
        with open(profile_mapping_path, 'r') as f:
            profiles_data = json.load(f)
        print(f"✅ Loaded {len(profiles_data)} profiles from WordPress migration")
    
    # Seed demo profiles from WordPress data
    demo_users_created = 0
    for profile in profiles_data[:50]:  # Limit to first 50 for demo
        # Check if profile already exists
        existing = await db.users.find_one({'email': profile.get('email')})
        if existing:
            continue
            
        user_id = str(uuid4())
        
        # Determine user type based on profile
        user_type = 'entrepreneur'  # Most WordPress profiles are entrepreneurs
        if 'venue' in profile.get('full_name', '').lower() or 'club' in profile.get('full_name', '').lower():
            user_type = 'business'
        
        # Create demo user
        demo_user = {
            'id': user_id,
            '_id': user_id,
            'username': profile.get('username', f"demo_{user_id[:8]}"),
            'email': profile.get('email', f"demo_{user_id[:8]}@wgo4y.com"),
            'password': 'DEMO_LOCKED',  # Cannot login
            'password_hash': 'DEMO_LOCKED',
            'user_type': user_type,
            'full_name': profile.get('full_name', 'Demo User'),
            'bio': profile.get('bio', 'Demo profile from WGO4Y migration'),
            'location': profile.get('location', 'Charleston, SC'),
            'profile_photo': profile.get('photo_url'),
            'membership_tier': profile.get('tier', 'silver'),
            'tier': profile.get('tier', 'silver'),
            'onboarding_completed': True,
            'profile_completed': True,
            'is_demo_profile': True,  # Mark as demo
            'created_at': datetime.now(timezone.utc),
            'updated_at': datetime.now(timezone.utc)
        }
        
        # Add type-specific fields
        if user_type == 'entrepreneur':
            demo_user['occupations'] = profile.get('occupations', ['Entertainer'])
            demo_user['service_name'] = profile.get('full_name')
        elif user_type == 'business':
            demo_user['business_name'] = profile.get('full_name')
            demo_user['business_type'] = 'venue'
        
        await db.users.insert_one(demo_user)
        demo_users_created += 1
    
    print(f"✅ Created {demo_users_created} demo user profiles")
    
    # Create demo events
    demo_events_created = 0
    event_categories = ['nightlife', 'live_music', 'networking', 'arts_culture', 'sports_recreation']
    
    for i in range(15):  # Create 15 demo events
        event_id = str(uuid4())
        event_date = datetime.now(timezone.utc) + timedelta(days=i*3 + 1)
        
        demo_event = {
            '_id': event_id,
            'title': f'Demo Event {i+1}: Live Music Night',
            'description': 'This is a demo event showcasing the platform. Join us for an unforgettable evening!',
            'image': 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
            'date': event_date,
            'venue': 'Demo Venue',
            'organizer': 'Demo Organizer',
            'event_categories': [event_categories[i % len(event_categories)]],
            'state': 'SC',
            'city': 'Charleston',
            'family_friendly': i % 2 == 0,
            'price_type': 'free' if i % 3 == 0 else 'paid',
            'price': 0 if i % 3 == 0 else 15 + (i * 5),
            'capacity': 100 + (i * 20),
            'status': 'published',
            'visibility': 'public',
            'featured': i < 3,
            'is_demo': True,
            'created_at': datetime.now(timezone.utc),
            'updated_at': datetime.now(timezone.utc)
        }
        
        await db.events.insert_one(demo_event)
        demo_events_created += 1
    
    print(f"✅ Created {demo_events_created} demo events")
    
    # Create demo coupons
    demo_coupons_created = 0
    for i in range(10):
        coupon_id = str(uuid4())
        valid_until = datetime.now(timezone.utc) + timedelta(days=30 + i*10)
        
        demo_coupon = {
            '_id': coupon_id,
            'title': f'Demo Coupon {i+1}: Special Offer',
            'description': 'Limited time offer! This is a demo coupon.',
            'code': f'DEMO{i+1}',
            'discount_type': ['amount_off', 'percent_off', 'bogo'][i % 3],
            'discount_value': 10 + (i * 5),
            'valid_from': datetime.now(timezone.utc),
            'valid_until': valid_until,
            'status': 'active',
            'is_demo': True,
            'owner_id': 'demo',
            'created_at': datetime.now(timezone.utc),
            'updated_at': datetime.now(timezone.utc)
        }
        
        await db.coupons.insert_one(demo_coupon)
        demo_coupons_created += 1
    
    print(f"✅ Created {demo_coupons_created} demo coupons")
    
    # Create demo raffles
    demo_raffles_created = 0
    for i in range(5):
        raffle_id = str(uuid4())
        end_date = datetime.now(timezone.utc) + timedelta(days=20 + i*10)
        
        demo_raffle = {
            '_id': raffle_id,
            'title': f'Demo Raffle {i+1}: Win Big!',
            'description': 'Enter to win amazing prizes. This is a demo raffle.',
            'prize': f'Prize Package #{i+1}',
            'ticket_price': 5 + i,
            'image': 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800',
            'status': 'active',
            'start_date': datetime.now(timezone.utc),
            'end_date': end_date,
            'max_tickets': 100 + (i * 50),
            'is_demo': True,
            'created_at': datetime.now(timezone.utc),
            'updated_at': datetime.now(timezone.utc)
        }
        
        await db.raffles.insert_one(demo_raffle)
        demo_raffles_created += 1
    
    print(f"✅ Created {demo_raffles_created} demo raffles")
    
    # Summary
    print("\n" + "="*60)
    print("📊 DEMO DATA SEEDING COMPLETE!")
    print("="*60)
    print(f"   Demo Users: {demo_users_created}")
    print(f"   Demo Events: {demo_events_created}")
    print(f"   Demo Coupons: {demo_coupons_created}")
    print(f"   Demo Raffles: {demo_raffles_created}")
    print("="*60)
    
    return {
        'users': demo_users_created,
        'events': demo_events_created,
        'coupons': demo_coupons_created,
        'raffles': demo_raffles_created
    }

if __name__ == "__main__":
    asyncio.run(seed_demo_data())
