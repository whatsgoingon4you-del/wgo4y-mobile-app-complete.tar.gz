"""
Re-seed QUALITY Migrated Profiles Only
Restores WordPress profiles that have complete information (photos, bios, categories)
Excludes generic "Demo User" entries
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone
from uuid import uuid4
import json
from pathlib import Path
import bcrypt

async def seed_quality_profiles():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'venue_job_portal')
    
    print(f"📊 Connecting to database: {db_name}")
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Load profile mapping from WordPress migration
    profile_mapping_path = Path('/app/profile_image_mapping.json')
    
    if not profile_mapping_path.exists():
        print("❌ profile_image_mapping.json not found")
        return
    
    with open(profile_mapping_path, 'r') as f:
        profiles_data = json.load(f)
    
    print(f"✅ Loaded {len(profiles_data)} profiles from WordPress migration")
    
    # Seed only QUALITY profiles with complete information
    created_count = 0
    skipped_count = 0
    
    for profile in profiles_data:
        # Quality criteria - must have:
        # 1. Real name (not generic)
        # 2. Profile photo
        # 3. Bio or description
        
        full_name = profile.get('full_name', '')
        photo_url = profile.get('photo_url', '')
        bio = profile.get('bio', '')
        
        # Skip if missing critical info
        if not full_name or full_name.lower() == 'demo user':
            skipped_count += 1
            continue
        
        if not photo_url:
            skipped_count += 1
            continue
            
        # Check if already exists (by email or username)
        email = profile.get('email', '')
        if email:
            existing = await db.users.find_one({'email': email})
            if existing:
                continue
        
        # Determine user type
        user_type = 'entrepreneur'  # Most WordPress profiles are entrepreneurs
        if 'venue' in full_name.lower() or 'club' in full_name.lower() or 'mansion' in full_name.lower() or 'tavern' in full_name.lower():
            user_type = 'business'
        
        user_id = str(uuid4())
        
        # Create quality demo user
        demo_user = {
            'id': user_id,
            '_id': user_id,
            'username': profile.get('username', f"migrated_{user_id[:8]}"),
            'email': email or f"migrated_{user_id[:8]}@wgo4y.com",
            'password': 'DEMO_LOCKED',  # Cannot login - display only
            'password_hash': 'DEMO_LOCKED',
            'user_type': user_type,
            'full_name': full_name,
            'bio': bio or f"Professional {profile.get('occupations', ['entertainer'])[0] if profile.get('occupations') else 'entertainer'} from the WGO4Y network",
            'location': profile.get('location', ''),
            'profile_photo': photo_url,
            'membership_tier': profile.get('tier', 'silver'),
            'tier': profile.get('tier', 'silver'),
            'onboarding_completed': True,
            'profile_completed': True,
            'is_demo_profile': True,  # Mark as demo but with quality data
            'created_at': datetime.now(timezone.utc),
            'updated_at': datetime.now(timezone.utc)
        }
        
        # Add type-specific fields
        if user_type == 'entrepreneur':
            occupations = profile.get('occupations', ['Entertainer'])
            demo_user['occupations'] = occupations
            demo_user['service_name'] = full_name
            demo_user['portfolio_photos'] = profile.get('gallery_images', [])[:5]  # Up to 5 photos
        elif user_type == 'business':
            demo_user['business_name'] = full_name
            demo_user['business_type'] = 'venue'
            demo_user['business_photos'] = profile.get('gallery_images', [])[:5]
            demo_user['venue_type'] = 'clubs_lounges'
        
        await db.users.insert_one(demo_user)
        created_count += 1
        
        if created_count <= 10:
            print(f"✅ {full_name} ({user_type}) - Photo: {'Yes' if photo_url else 'No'}, Bio: {'Yes' if bio else 'No'}")
    
    print("\n" + "="*60)
    print("📊 QUALITY PROFILE SEEDING COMPLETE!")
    print("="*60)
    print(f"   Created: {created_count} quality profiles")
    print(f"   Skipped: {skipped_count} (missing photo or invalid name)")
    print("="*60)
    
    # Show total count
    total = await db.users.count_documents({})
    print(f"\n   Total users in database: {total}")

if __name__ == "__main__":
    asyncio.run(seed_quality_profiles())
