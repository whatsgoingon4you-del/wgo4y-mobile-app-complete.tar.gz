#!/usr/bin/env python3
"""
Phase 1: Database Migration - Update Subscription Structure
- Change "free" tier → "basic" tier
- Add weekly featured video tracking
- Add profile media limits tracking
- Add exclusive event access flags
"""

from pymongo import MongoClient
from datetime import datetime

def migrate_subscription_structure():
    print("🔄 Phase 1: Migrating Subscription Structure...\n")
    
    client = MongoClient("mongodb://localhost:27017")
    db = client["test_database"]
    
    # Get all users
    all_users = list(db.users.find({}))
    print(f"📊 Found {len(all_users)} total users\n")
    
    updated_count = 0
    
    for user in all_users:
        username = user.get('username')
        current_tier = user.get('membership_tier', 'free')
        updates = {}
        
        # 1. Change "free" → "basic"
        if current_tier == 'free' or current_tier is None:
            updates['membership_tier'] = 'basic'
        
        # 2. Add weekly featured video tracking (if not exists)
        if 'featured_videos_this_week' not in user:
            updates['featured_videos_this_week'] = 0
            updates['last_featured_reset'] = datetime.utcnow()
        
        # 3. Add profile media count tracking (if not exists)
        if 'profile_media_count' not in user:
            portfolio_videos = len(user.get('portfolio_videos', []))
            portfolio_photos = len(user.get('portfolio_photos', []))
            business_photos = len(user.get('business_photos', []))
            total_media = portfolio_videos + portfolio_photos + business_photos
            updates['profile_media_count'] = total_media
        
        # 4. Add exclusive event access flag (if not exists)
        if 'has_exclusive_event_access' not in user:
            # Only Gold tier gets exclusive events
            tier = updates.get('membership_tier', current_tier)
            updates['has_exclusive_event_access'] = (tier == 'gold')
        
        # Apply updates if any
        if updates:
            db.users.update_one(
                {'_id': user['_id']},
                {'$set': updates}
            )
            updated_count += 1
            if current_tier == 'free':
                print(f"✅ {username:30s} free → basic")
    
    print(f"\n{'='*70}")
    print(f"📊 Migration Summary:")
    print(f"{'='*70}")
    print(f"✅ Updated: {updated_count} users")
    print(f"📋 Total: {len(all_users)} users")
    
    # Verify the changes
    print(f"\n{'='*70}")
    print(f"🔍 Verification:")
    print(f"{'='*70}")
    
    tier_counts = {}
    for user in db.users.find({}):
        tier = user.get('membership_tier', 'unknown')
        tier_counts[tier] = tier_counts.get(tier, 0) + 1
    
    print("\nUsers by Tier:")
    for tier, count in sorted(tier_counts.items()):
        print(f"  {tier:15s}: {count:3d} users")
    
    # Check a sample user
    sample = db.users.find_one({"membership_tier": "basic"})
    if sample:
        print(f"\nSample Basic User: {sample.get('username')}")
        print(f"  ✓ membership_tier: {sample.get('membership_tier')}")
        print(f"  ✓ featured_videos_this_week: {sample.get('featured_videos_this_week')}")
        print(f"  ✓ last_featured_reset: {sample.get('last_featured_reset')}")
        print(f"  ✓ profile_media_count: {sample.get('profile_media_count')}")
        print(f"  ✓ has_exclusive_event_access: {sample.get('has_exclusive_event_access')}")
    
    client.close()
    
    print(f"\n🎉 Phase 1 Database Migration Complete!\n")

if __name__ == "__main__":
    migrate_subscription_structure()
