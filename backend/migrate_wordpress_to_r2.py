#!/usr/bin/env python3
"""
WordPress to R2 Profile Migration
Uses extracted WordPress data to populate database with R2 image URLs
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
from datetime import datetime, timezone
import uuid

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'venue_job_portal')]

# Cloudflare R2 base URL (files are at root, not in subfolders)
R2_BASE_URL = "https://pub-bfa7ee4cef34458990f1d94545974968.r2.dev"

# Load WordPress mapping data
with open('/app/profile_image_mapping.json', 'r') as f:
    wordpress_profiles = json.load(f)

print("=" * 80)
print("🚀 WordPress to R2 Migration")
print("=" * 80)
print(f"\nLoaded {len(wordpress_profiles)} profiles from WordPress export")

# Define which profiles are REAL (from your specification)
REAL_PROFILES = {
    'dboy stackalini': 'entrepreneur',
    'd.petty': 'entrepreneur', 
    'd-petty': 'entrepreneur',
    'the lace mirror': 'entrepreneur',
    "mcclellan": 'business',
    "rack'em up": 'business',
    "rack em up": 'business',
    "one mansion": 'business',
    "la mansion": 'business',
}

def is_real_profile(title):
    """Check if profile is real (not demo)"""
    title_lower = title.lower()
    for real_name in REAL_PROFILES.keys():
        if real_name in title_lower:
            return True
    return False

def get_profile_type(title):
    """Determine profile type"""
    title_lower = title.lower()
    
    # Check if it's a known real profile
    for real_name, ptype in REAL_PROFILES.items():
        if real_name in title_lower:
            return ptype
    
    # Classify based on keywords
    business_keywords = ['venue', 'lounge', 'bar', 'restaurant', 'club', 'pavilion', 
                         'hall', 'center', 'theatre', 'theater', 'mansion']
    entrepreneur_keywords = ['dj', 'artist', 'producer', 'poet', 'stylist', 
                             'photographer', 'videographer', 'comedian', 'model']
    
    for keyword in business_keywords:
        if keyword in title_lower:
            return 'business'
    
    for keyword in entrepreneur_keywords:
        if keyword in title_lower:
            return 'entrepreneur'
    
    return 'general_public'

async def migrate_profiles():
    """Migrate WordPress profiles to MongoDB with R2 URLs"""
    
    print("\n📋 Processing WordPress Profiles...")
    
    migrated_count = 0
    real_count = 0
    demo_count = 0
    missing_images = []
    
    for wp_profile in wordpress_profiles:
        # Skip pages without content (navigation pages, etc.)
        if wp_profile['type'] == 'page' and not wp_profile.get('featured_image_filename'):
            continue
        
        # Skip if no title
        if not wp_profile['title'] or len(wp_profile['title'].strip()) == 0:
            continue
        
        title = wp_profile['title']
        is_real = is_real_profile(title)
        profile_type = get_profile_type(title)
        
        # Create profile document
        profile = {
            '_id': str(uuid.uuid4()),
            'wordpress_id': wp_profile['post_id'],
            'username': wp_profile['slug'],
            'email': f"{wp_profile['slug']}@wgo4y.com",
            'full_name': title,
            'is_demo_profile': not is_real,
            'onboarding_completed': True,
            'created_at': datetime.now(timezone.utc)
        }
        
        # Set user type
        if profile_type == 'entrepreneur':
            profile['user_type'] = 'entrepreneur'
            profile['membership_tier'] = 'gold' if is_real else 'basic'
            profile['stage_name'] = title
            profile['occupation'] = 'Entertainer'
            profile['services'] = []
            profile['portfolio_photos'] = []
            profile['portfolio_videos'] = []
        elif profile_type == 'business':
            profile['user_type'] = 'business'
            profile['membership_tier'] = 'gold' if is_real else 'basic'
            profile['business_name'] = title
            profile['business_type'] = 'entertainment'
            profile['amenities'] = []
            profile['venue_photos'] = []
        else:
            profile['user_type'] = 'general_public'
            profile['membership_tier'] = 'basic'
        
        # Add profile photo from R2
        if wp_profile.get('featured_image_filename'):
            photo_url = f"{R2_BASE_URL}/{wp_profile['featured_image_filename']}"
            profile['photo_url'] = photo_url
            
            # Also add to portfolio/venue photos
            if profile_type == 'entrepreneur':
                profile['portfolio_photos'] = [photo_url]
            elif profile_type == 'business':
                profile['venue_photos'] = [photo_url]
        else:
            missing_images.append(title)
        
        # Add location (default to Las Vegas)
        profile['city'] = 'Las Vegas'
        profile['state'] = 'Nevada'
        
        # Insert or update profile
        await db.users.update_one(
            {'username': profile['username']},
            {'$set': profile},
            upsert=True
        )
        
        migrated_count += 1
        if is_real:
            real_count += 1
            print(f"✅ REAL: {title}")
            if wp_profile.get('featured_image_filename'):
                print(f"   📷 {wp_profile['featured_image_filename']}")
        else:
            demo_count += 1
            if migrated_count % 10 == 0:  # Print every 10th demo profile
                print(f"✅ Demo: {title}")
    
    return {
        'total': migrated_count,
        'real': real_count,
        'demo': demo_count,
        'missing_images': missing_images
    }

async def verify_sample_profiles():
    """Verify that sample profiles load correctly"""
    print("\n🔍 Verifying Sample Profiles...")
    
    # Check some real profiles
    real_profiles = await db.users.find({
        'is_demo_profile': False,
        'photo_url': {'$exists': True}
    }).limit(5).to_list(5)
    
    print("\n📸 Real Profiles with Images:")
    for profile in real_profiles:
        print(f"  ✅ {profile['full_name']}")
        print(f"     URL: {profile.get('photo_url', 'N/A')}")
    
    # Check total counts
    total_users = await db.users.count_documents({})
    real_users = await db.users.count_documents({'is_demo_profile': False})
    demo_users = await db.users.count_documents({'is_demo_profile': True})
    users_with_photos = await db.users.count_documents({'photo_url': {'$exists': True, '$ne': ''}})
    
    print(f"\n📊 Database Statistics:")
    print(f"  Total Users: {total_users}")
    print(f"  Real Profiles: {real_users}")
    print(f"  Demo Profiles: {demo_users}")
    print(f"  Users with Photos: {users_with_photos}")
    
    return {
        'total': total_users,
        'real': real_users,
        'demo': demo_users,
        'with_photos': users_with_photos
    }

async def update_logo():
    """Update logo configuration"""
    print("\n🎨 Updating Logo Configuration...")
    
    # The logo should be at R2 root
    logo_url = f"{R2_BASE_URL}/wgo4y-logo.png"
    
    await db.app_config.update_one(
        {'_id': 'branding'},
        {
            '$set': {
                'logo_url': logo_url,
                'logo_url_light': logo_url,
                'logo_url_dark': logo_url,
                'app_name': "What's Going On 4 You",
                'app_short_name': 'WGO4Y',
                'updated_at': datetime.now(timezone.utc)
            }
        },
        upsert=True
    )
    
    print(f"✅ Logo configured: {logo_url}")

async def main():
    try:
        # Migrate profiles
        results = await migrate_profiles()
        
        # Update logo
        await update_logo()
        
        # Verify
        stats = await verify_sample_profiles()
        
        # Print summary
        print("\n" + "=" * 80)
        print("✅ MIGRATION COMPLETED SUCCESSFULLY")
        print("=" * 80)
        
        print(f"\n📊 Migration Summary:")
        print(f"  Profiles Migrated: {results['total']}")
        print(f"  Real Profiles: {results['real']}")
        print(f"  Demo Profiles: {results['demo']}")
        print(f"  Profiles with Photos: {stats['with_photos']}")
        
        if results['missing_images']:
            print(f"\n⚠️  Profiles Missing Images ({len(results['missing_images'])}):")
            for title in results['missing_images'][:10]:  # Show first 10
                print(f"  - {title}")
            if len(results['missing_images']) > 10:
                print(f"  ... and {len(results['missing_images']) - 10} more")
        
        print(f"\n✅ Database now has {stats['total']} total users")
        print(f"✅ All images loading from: {R2_BASE_URL}")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise

if __name__ == '__main__':
    asyncio.run(main())
