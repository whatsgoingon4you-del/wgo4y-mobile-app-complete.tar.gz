#!/usr/bin/env python3
"""
Production Database Migration Script
Populates production Atlas MongoDB with all users, categories, and data
Run this on production backend to initialize the database
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone
import uuid
from passlib.context import CryptContext
import json

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# R2 base URL
R2_BASE_URL = "https://pub-bfa7ee4cef34458990f1d94545974968.r2.dev"

# Standard password for all test accounts
TEST_PASSWORD = "Test1234"

async def populate_production_db():
    """Populate production database with all necessary data"""
    
    # Connect to MongoDB (will use Atlas in production)
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'venue_job_portal')]
    
    print("="*80)
    print("🚀 Production Database Migration")
    print("="*80)
    
    # Check if already populated
    user_count = await db.users.count_documents({})
    
    if user_count > 10:
        print(f"\n⚠️  Database already has {user_count} users")
        print("Migration may have already run. Continue anyway? (This is safe)")
    
    print(f"\nCurrent users in database: {user_count}")
    print("Starting migration...\n")
    
    # Hash the standard password
    hashed_password = pwd_context.hash(TEST_PASSWORD)
    
    # Load WordPress mapping
    wordpress_file = '/app/profile_image_mapping.json'
    if os.path.exists(wordpress_file):
        with open(wordpress_file, 'r') as f:
            wp_profiles = json.load(f)
        print(f"✅ Loaded {len(wp_profiles)} WordPress profiles\n")
    else:
        wp_profiles = []
        print("⚠️  No WordPress mapping file found, using minimal seed data\n")
    
    # Define real profiles
    REAL_PROFILES = ['dboy stackalini', 'd.petty', 'the lace mirror', 
                     'mcclellan', "rack'em up", 'rack em up', 'one mansion', 'la mansion']
    
    # Migrate WordPress profiles
    migrated = 0
    
    for wp in wp_profiles:
        # Skip pages without images
        if wp['type'] == 'page' or not wp.get('featured_image_filename'):
            continue
        
        title = wp['title']
        title_lower = title.lower()
        
        # Check if real profile
        is_real = any(real_name in title_lower for real_name in REAL_PROFILES)
        
        # Determine type
        user_type = 'general_public'
        if 'dj' in title_lower or 'producer' in title_lower or 'artist' in title_lower or 'poet' in title_lower:
            user_type = 'entrepreneur'
        elif 'venue' in title_lower or 'lounge' in title_lower or 'bar' in title_lower or 'mansion' in title_lower or 'restaurant' in title_lower:
            user_type = 'business'
        
        # Create username
        clean_slug = wp['slug'].replace('-', '_')[:30]
        username = clean_slug if is_real else f"wp_{wp['post_id']}"
        
        # Build user document
        user = {
            '_id': str(uuid.uuid4()),
            'wordpress_post_id': wp['post_id'],
            'username': username,
            'email': f"{clean_slug}@wgo4y.com",
            'password_hash': hashed_password,
            'full_name': title,
            'user_type': user_type,
            'membership_tier': 'gold' if is_real else 'basic',
            'is_demo_profile': not is_real,
            'onboarding_completed': True,
            'photo_url': f"{R2_BASE_URL}/{wp['featured_image_filename']}",
            'city': 'Las Vegas',
            'state': 'Nevada',
            'created_at': datetime.now(timezone.utc)
        }
        
        # Type-specific fields
        if user_type == 'entrepreneur':
            user['stage_name'] = title
            user['occupation'] = 'Entertainer'
            user['portfolio_photos'] = [user['photo_url']]
            user['portfolio_videos'] = []
            user['services'] = []
        elif user_type == 'business':
            user['business_name'] = title
            user['business_type'] = 'entertainment'
            user['venue_photos'] = [user['photo_url']]
            user['amenities'] = []
            user['description'] = f'{title} - Entertainment venue in Las Vegas'
        
        # Insert (update if exists)
        await db.users.update_one(
            {'username': username},
            {'$set': user},
            upsert=True
        )
        
        migrated += 1
        
        if is_real:
            print(f"✅ REAL: {title}")
    
    # Add missing real profiles with specific info
    special_profiles = [
        {
            '_id': str(uuid.uuid4()),
            'username': 'the_lace_mirror',
            'email': 'lacemirror@wgo4y.com',
            'password_hash': hashed_password,
            'full_name': 'The Lace Mirror',
            'user_type': 'entrepreneur',
            'membership_tier': 'silver',
            'is_demo_profile': False,
            'onboarding_completed': True,
            'stage_name': 'The Lace Mirror',
            'occupation': 'Visual Artist',
            'bio': 'Professional visual artist and creative designer',
            'city': 'Las Vegas',
            'state': 'Nevada',
            'services': ['Visual Arts', 'Design'],
            'portfolio_photos': [f'{R2_BASE_URL}/The%20Lace%20Nerd%20profile%20image.jpeg'],
            'portfolio_videos': [],
            'photo_url': f'{R2_BASE_URL}/The%20Lace%20Nerd%20profile%20image.jpeg',
            'created_at': datetime.now(timezone.utc)
        },
        {
            '_id': str(uuid.uuid4()),
            'username': 'mcclellan_tavern',
            'email': 'info@mcclellans.com',
            'password_hash': hashed_password,
            'full_name': "McClellan's Tavern",
            'user_type': 'business',
            'membership_tier': 'gold',
            'is_demo_profile': False,
            'onboarding_completed': True,
            'business_name': "McClellan's Tavern",
            'business_type': 'bar_restaurant',
            'business_address': 'Las Vegas, NV',
            'business_phone': '702-555-0100',
            'city': 'Las Vegas',
            'state': 'Nevada',
            'description': 'Classic tavern with great food and atmosphere',
            'amenities': ['Full Bar', 'Restaurant', 'Outdoor Seating'],
            'venue_photos': [f'{R2_BASE_URL}/McClellans.jpg'],
            'photo_url': f'{R2_BASE_URL}/McClellans.jpg',
            'created_at': datetime.now(timezone.utc)
        },
        {
            '_id': str(uuid.uuid4()),
            'username': 'rack_em_up',
            'email': 'info@rackemup.com',
            'password_hash': hashed_password,
            'full_name': 'Rack Em Up',
            'user_type': 'business',
            'membership_tier': 'gold',
            'is_demo_profile': False,
            'onboarding_completed': True,
            'business_name': 'Rack Em Up',
            'business_type': 'entertainment',
            'business_address': 'Las Vegas, NV',
            'business_phone': '702-555-0200',
            'city': 'Las Vegas',
            'state': 'Nevada',
            'description': 'Premier billiards and entertainment venue',
            'amenities': ['Pool Tables', 'Bar', 'Gaming'],
            'venue_photos': [f'{R2_BASE_URL}/6-copy.jpg'],
            'photo_url': f'{R2_BASE_URL}/6-copy.jpg',
            'created_at': datetime.now(timezone.utc)
        },
        {
            '_id': str(uuid.uuid4()),
            'username': 'one_mansion',
            'email': 'info@onemansion.com',
            'password_hash': hashed_password,
            'full_name': 'One Mansion',
            'user_type': 'business',
            'membership_tier': 'gold',
            'is_demo_profile': False,
            'onboarding_completed': True,
            'business_name': 'One Mansion',
            'business_type': 'nightclub',
            'business_address': 'Las Vegas, NV',
            'business_phone': '702-555-0300',
            'city': 'Las Vegas',
            'state': 'Nevada',
            'description': 'Upscale nightclub and premier event venue',
            'amenities': ['VIP Areas', 'Full Bar', 'Dance Floor', 'DJ'],
            'venue_photos': [f'{R2_BASE_URL}/La-Mansion.png'],
            'photo_url': f'{R2_BASE_URL}/La-Mansion.png',
            'created_at': datetime.now(timezone.utc)
        }
    ]
    
    for profile in special_profiles:
        await db.users.update_one(
            {'username': profile['username']},
            {'$set': profile},
            upsert=True
        )
        print(f"✅ Added: {profile['full_name']}")
    
    # Configure logo
    await db.app_config.update_one(
        {'_id': 'branding'},
        {
            '$set': {
                'logo_url': f'{R2_BASE_URL}/WGO4Y%20Logo.png',
                'app_name': "What's Going On 4 You",
                'app_short_name': 'WGO4Y',
                'updated_at': datetime.now(timezone.utc)
            }
        },
        upsert=True
    )
    
    print("\n✅ Logo configured")
    
    # Get final counts
    final_count = await db.users.count_documents({})
    real_count = await db.users.count_documents({'is_demo_profile': False})
    
    print(f"\n{'='*80}")
    print(f"✅ MIGRATION COMPLETE")
    print("="*80)
    print(f"Total users: {final_count}")
    print(f"Real profiles: {real_count}")
    print(f"Demo profiles: {final_count - real_count}")
    print(f"\n🔐 All accounts use password: {TEST_PASSWORD}")
    
    return final_count

if __name__ == '__main__':
    result = asyncio.run(populate_production_db())
    print(f"\n✅ Migration successful! {result} users in database")
