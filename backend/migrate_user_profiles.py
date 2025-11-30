#!/usr/bin/env python3
"""
User Profile Migration Script
Updates all existing user accounts to include the latest Featured Videos MVP fields
"""

from pymongo import MongoClient
from datetime import datetime

def migrate_user_profiles():
    """Migrate all user profiles to latest schema"""
    
    print("🔄 Starting User Profile Migration...\n")
    
    client = MongoClient("mongodb://localhost:27017")
    db = client["test_database"]
    
    # Get all users
    all_users = list(db.users.find({}))
    print(f"📊 Found {len(all_users)} total users\n")
    
    updated_count = 0
    skipped_count = 0
    
    for user in all_users:
        username = user.get('username')
        needs_update = False
        update_operations = {}
        
        # 1. Ensure isAdmin field exists
        if 'isAdmin' not in user:
            update_operations['isAdmin'] = False
            needs_update = True
        
        # 2. Ensure service_preferences exists
        if 'service_preferences' not in user:
            update_operations['service_preferences'] = []
            needs_update = True
        
        # 3. Ensure venue_preferences exists
        if 'venue_preferences' not in user:
            update_operations['venue_preferences'] = []
            needs_update = True
        
        # 4. Migrate portfolio_videos to include featured fields
        portfolio_videos = user.get('portfolio_videos', [])
        if portfolio_videos:
            updated_videos = []
            videos_updated = False
            
            for video in portfolio_videos:
                # Check if featured fields are missing
                if 'featured' not in video:
                    video['featured'] = False
                    video['featured_approved'] = False
                    videos_updated = True
                
                updated_videos.append(video)
            
            if videos_updated:
                update_operations['portfolio_videos'] = updated_videos
                needs_update = True
        
        # 5. Ensure membership_tier has proper default
        if 'membership_tier' not in user or user.get('membership_tier') in [None, '', 'basic']:
            # Keep existing value if it's silver/gold, otherwise set to free
            current_tier = user.get('membership_tier', '')
            if current_tier not in ['silver', 'gold']:
                update_operations['membership_tier'] = 'free'
                needs_update = True
        
        # Apply updates if needed
        if needs_update:
            db.users.update_one(
                {'_id': user['_id']},
                {'$set': update_operations}
            )
            updated_count += 1
            print(f"✅ Updated: {username}")
            if 'portfolio_videos' in update_operations:
                print(f"   - Added featured fields to {len(update_operations['portfolio_videos'])} video(s)")
            if 'isAdmin' in update_operations:
                print(f"   - Added isAdmin field")
            if 'service_preferences' in update_operations or 'venue_preferences' in update_operations:
                print(f"   - Added preference fields")
            if 'membership_tier' in update_operations:
                print(f"   - Updated membership_tier to: {update_operations['membership_tier']}")
        else:
            skipped_count += 1
    
    print(f"\n{'='*60}")
    print(f"📊 Migration Summary:")
    print(f"{'='*60}")
    print(f"✅ Updated: {updated_count} users")
    print(f"⏭️  Skipped: {skipped_count} users (already up-to-date)")
    print(f"📋 Total: {len(all_users)} users")
    
    # Verify a sample user
    print(f"\n{'='*60}")
    print(f"🔍 Verification - Checking DJ Nice account:")
    print(f"{'='*60}")
    
    dj_nyce = db.users.find_one({"username": "Dj_Nyce"})
    if dj_nyce:
        print(f"✓ isAdmin: {dj_nyce.get('isAdmin', 'MISSING')}")
        print(f"✓ membership_tier: {dj_nyce.get('membership_tier', 'MISSING')}")
        print(f"✓ service_preferences: {len(dj_nyce.get('service_preferences', []))} items")
        print(f"✓ venue_preferences: {len(dj_nyce.get('venue_preferences', []))} items")
        
        videos = dj_nyce.get('portfolio_videos', [])
        print(f"✓ portfolio_videos: {len(videos)} video(s)")
        if videos:
            video = videos[0]
            print(f"  - featured: {video.get('featured', 'MISSING')}")
            print(f"  - featured_approved: {video.get('featured_approved', 'MISSING')}")
            print(f"  - title: {video.get('title', 'N/A')}")
    
    client.close()
    
    print(f"\n🎉 Migration Complete!\n")

if __name__ == "__main__":
    migrate_user_profiles()
