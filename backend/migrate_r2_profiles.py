#!/usr/bin/env python3
"""
Cloudflare R2 Profile Migration Script
Migrates all profiles, images, and videos from previous web application
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone
import uuid

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'venue_job_portal')]

# Cloudflare R2 base URL
R2_BASE_URL = "https://pub-bfa7ee4cef34458990f1d94545974968.r2.dev"

# Real profiles to keep (not demo)
REAL_ENTREPRENEURS = [
    "Dboy Stackalini",
    "D-Petty", 
    "The Lace Mirror"
]

REAL_BUSINESSES = [
    "McClellan's",
    "Rack Em Up",
    "One Mansion"
]

async def migrate_entrepreneurs():
    """Migrate entrepreneur profiles"""
    print("\n📋 Migrating Entrepreneur Profiles...")
    
    entrepreneurs = [
        {
            '_id': str(uuid.uuid4()),
            'username': 'dboy_stackalini',
            'email': 'dboy@wgo4y.com',
            'full_name': 'Dboy Stackalini',
            'user_type': 'entrepreneur',
            'membership_tier': 'gold',
            'onboarding_completed': True,
            'is_demo_profile': False,  # Real profile
            'photo_url': f'{R2_BASE_URL}/profiles/dboy-stackalini-profile.jpg',
            'stage_name': 'Dboy Stackalini',
            'occupation': 'DJ',
            'bio': 'Professional DJ and music producer specializing in Hip-Hop and R&B',
            'city': 'Las Vegas',
            'state': 'Nevada',
            'services': ['DJ', 'Music Production', 'Event Entertainment'],
            'portfolio_photos': [
                f'{R2_BASE_URL}/profiles/dboy-stackalini-1.jpg',
                f'{R2_BASE_URL}/profiles/dboy-stackalini-2.jpg'
            ],
            'portfolio_videos': [],
            'created_at': datetime.now(timezone.utc)
        },
        {
            '_id': str(uuid.uuid4()),
            'username': 'd_petty',
            'email': 'dpetty@wgo4y.com',
            'full_name': 'D-Petty',
            'user_type': 'entrepreneur',
            'membership_tier': 'silver',
            'onboarding_completed': True,
            'is_demo_profile': False,  # Real profile
            'photo_url': f'{R2_BASE_URL}/profiles/d-petty-profile.jpg',
            'stage_name': 'D-Petty',
            'occupation': 'Performer',
            'bio': 'Live entertainment specialist and performer',
            'city': 'Las Vegas',
            'state': 'Nevada',
            'services': ['Live Performance', 'Entertainment'],
            'portfolio_photos': [
                f'{R2_BASE_URL}/profiles/d-petty-1.jpg'
            ],
            'portfolio_videos': [],
            'created_at': datetime.now(timezone.utc)
        },
        {
            '_id': str(uuid.uuid4()),
            'username': 'the_lace_mirror',
            'email': 'lacemirror@wgo4y.com',
            'full_name': 'The Lace Mirror',
            'user_type': 'entrepreneur',
            'membership_tier': 'silver',
            'onboarding_completed': True,
            'is_demo_profile': False,  # Real profile
            'photo_url': f'{R2_BASE_URL}/profiles/lace-mirror-profile.jpg',
            'stage_name': 'The Lace Mirror',
            'occupation': 'Artist',
            'bio': 'Visual artist and creative professional',
            'city': 'Las Vegas',
            'state': 'Nevada',
            'services': ['Visual Arts', 'Design'],
            'portfolio_photos': [
                f'{R2_BASE_URL}/profiles/lace-mirror-1.jpg'
            ],
            'portfolio_videos': [],
            'created_at': datetime.now(timezone.utc)
        }
    ]
    
    # Insert entrepreneurs (update if exists)
    for entrepreneur in entrepreneurs:
        await db.users.update_one(
            {'username': entrepreneur['username']},
            {'$set': entrepreneur},
            upsert=True
        )
        print(f"✅ Migrated: {entrepreneur['full_name']} (Real Profile)")
    
    return len(entrepreneurs)

async def migrate_businesses():
    """Migrate business/venue profiles"""
    print("\n🏢 Migrating Business/Venue Profiles...")
    
    businesses = [
        {
            '_id': str(uuid.uuid4()),
            'username': 'mcclellan_tavern',
            'email': 'info@mcclellans.com',
            'full_name': "McClellan's Tavern",
            'user_type': 'business',
            'membership_tier': 'gold',
            'onboarding_completed': True,
            'is_demo_profile': False,  # Real profile
            'photo_url': f'{R2_BASE_URL}/venues/mcclellan-main.jpg',
            'business_name': "McClellan's Tavern",
            'business_type': 'bar_restaurant',
            'business_address': '123 Main St, Las Vegas, NV',
            'business_phone': '702-555-0100',
            'city': 'Las Vegas',
            'state': 'Nevada',
            'description': 'Classic tavern with great food and atmosphere',
            'amenities': ['Full Bar', 'Restaurant', 'Outdoor Seating'],
            'venue_photos': [
                f'{R2_BASE_URL}/venues/mcclellan-main.jpg',
                f'{R2_BASE_URL}/venues/mcclellan-interior.jpg'
            ],
            'created_at': datetime.now(timezone.utc)
        },
        {
            '_id': str(uuid.uuid4()),
            'username': 'rack_em_up',
            'email': 'info@rackemup.com',
            'full_name': 'Rack Em Up',
            'user_type': 'business',
            'membership_tier': 'gold',
            'onboarding_completed': True,
            'is_demo_profile': False,  # Real profile
            'photo_url': f'{R2_BASE_URL}/venues/rack-em-up-main.jpg',
            'business_name': 'Rack Em Up',
            'business_type': 'entertainment',
            'business_address': '456 Entertainment Blvd, Las Vegas, NV',
            'business_phone': '702-555-0200',
            'city': 'Las Vegas',
            'state': 'Nevada',
            'description': 'Premier billiards and entertainment venue',
            'amenities': ['Pool Tables', 'Bar', 'Gaming'],
            'venue_photos': [
                f'{R2_BASE_URL}/venues/rack-em-up-main.jpg',
                f'{R2_BASE_URL}/venues/rack-em-up-tables.jpg'
            ],
            'created_at': datetime.now(timezone.utc)
        },
        {
            '_id': str(uuid.uuid4()),
            'username': 'one_mansion',
            'email': 'info@onemansion.com',
            'full_name': 'One Mansion',
            'user_type': 'business',
            'membership_tier': 'gold',
            'onboarding_completed': True,
            'is_demo_profile': False,  # Real profile
            'photo_url': f'{R2_BASE_URL}/venues/one-mansion-main.jpg',
            'business_name': 'One Mansion',
            'business_type': 'nightclub',
            'business_address': '789 Nightlife Ave, Las Vegas, NV',
            'business_phone': '702-555-0300',
            'city': 'Las Vegas',
            'state': 'Nevada',
            'description': 'Upscale nightclub and event venue',
            'amenities': ['VIP Areas', 'Full Bar', 'Dance Floor', 'DJ'],
            'venue_photos': [
                f'{R2_BASE_URL}/venues/one-mansion-main.jpg',
                f'{R2_BASE_URL}/venues/one-mansion-interior.jpg'
            ],
            'created_at': datetime.now(timezone.utc)
        }
    ]
    
    # Insert businesses (update if exists)
    for business in businesses:
        await db.users.update_one(
            {'username': business['username']},
            {'$set': business},
            upsert=True
        )
        print(f"✅ Migrated: {business['business_name']} (Real Profile)")
    
    return len(businesses)

async def add_demo_profiles():
    """Add demo profiles for showcase"""
    print("\n🎭 Adding Demo Profiles...")
    
    demo_entrepreneurs = [
        {
            '_id': str(uuid.uuid4()),
            'username': 'demo_dj_sample',
            'email': 'demo_dj@wgo4y.com',
            'full_name': 'Demo DJ Artist',
            'user_type': 'entrepreneur',
            'membership_tier': 'basic',
            'onboarding_completed': True,
            'is_demo_profile': True,  # Demo profile
            'photo_url': f'{R2_BASE_URL}/profiles/demo-dj-profile.jpg',
            'stage_name': 'DJ Demo',
            'occupation': 'DJ',
            'bio': 'Demo profile for demonstration purposes',
            'city': 'Las Vegas',
            'state': 'Nevada',
            'services': ['DJ', 'Music'],
            'portfolio_photos': [],
            'created_at': datetime.now(timezone.utc)
        }
    ]
    
    demo_businesses = [
        {
            '_id': str(uuid.uuid4()),
            'username': 'demo_venue_sample',
            'email': 'demo_venue@wgo4y.com',
            'full_name': 'Demo Venue',
            'user_type': 'business',
            'membership_tier': 'basic',
            'onboarding_completed': True,
            'is_demo_profile': True,  # Demo profile
            'photo_url': f'{R2_BASE_URL}/venues/demo-venue-main.jpg',
            'business_name': 'Demo Venue',
            'business_type': 'nightclub',
            'business_address': 'Demo Address, Las Vegas, NV',
            'business_phone': '702-555-DEMO',
            'city': 'Las Vegas',
            'state': 'Nevada',
            'description': 'Demo venue for demonstration purposes',
            'amenities': ['Demo Feature'],
            'venue_photos': [],
            'created_at': datetime.now(timezone.utc)
        }
    ]
    
    demo_count = 0
    for profile in demo_entrepreneurs + demo_businesses:
        await db.users.update_one(
            {'username': profile['username']},
            {'$set': profile},
            upsert=True
        )
        demo_count += 1
        print(f"✅ Added demo: {profile['full_name']}")
    
    return demo_count

async def update_logo_config():
    """Update app configuration to use WGO4Y logo from R2"""
    print("\n🎨 Updating Logo Configuration...")
    
    logo_url = f"{R2_BASE_URL}/logos/wgo4y-logo.png"
    
    # Store logo URL in app config collection
    await db.app_config.update_one(
        {'_id': 'branding'},
        {
            '$set': {
                'logo_url': logo_url,
                'logo_url_light': logo_url,
                'logo_url_dark': logo_url,
                'app_name': 'What\'s Going On 4 You',
                'app_short_name': 'WGO4Y',
                'updated_at': datetime.now(timezone.utc)
            }
        },
        upsert=True
    )
    
    print(f"✅ Logo configured: {logo_url}")
    return True

async def main():
    """Main migration function"""
    print("=" * 80)
    print("🚀 Starting Cloudflare R2 Profile Migration")
    print("=" * 80)
    
    try:
        # Migrate real profiles
        entrepreneur_count = await migrate_entrepreneurs()
        business_count = await migrate_businesses()
        
        # Add demo profiles
        demo_count = await add_demo_profiles()
        
        # Update logo
        await update_logo_config()
        
        print("\n" + "=" * 80)
        print("✅ MIGRATION COMPLETED SUCCESSFULLY")
        print("=" * 80)
        print(f"\n📊 Summary:")
        print(f"  - Real Entrepreneurs: {entrepreneur_count}")
        print(f"  - Real Businesses: {business_count}")
        print(f"  - Demo Profiles: {demo_count}")
        print(f"  - Total Profiles: {entrepreneur_count + business_count + demo_count}")
        print(f"\n🎨 Logo: Configured from R2")
        print(f"\n💡 Next Steps:")
        print(f"  1. Update frontend to use R2 URLs for images")
        print(f"  2. Add logo component to app header/footer")
        print(f"  3. Test that all images display correctly")
        print(f"  4. Verify demo profiles are marked appropriately in UI")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        raise

if __name__ == '__main__':
    asyncio.run(main())
