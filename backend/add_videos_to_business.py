#!/usr/bin/env python3
"""
Business Accounts - Add Featured Videos Support
Adds portfolio_videos field to all business accounts
"""

from pymongo import MongoClient

def add_videos_to_business_accounts():
    """Add portfolio_videos field to all business accounts"""
    
    print("🏢 Adding Featured Videos support to Business accounts...\n")
    
    client = MongoClient("mongodb://localhost:27017")
    db = client["test_database"]
    
    # Find all business accounts
    business_accounts = list(db.users.find({"user_type": "business"}))
    print(f"📊 Found {len(business_accounts)} business accounts\n")
    
    if len(business_accounts) == 0:
        print("No business accounts found.")
        client.close()
        return
    
    updated_count = 0
    
    for business in business_accounts:
        username = business.get('username')
        needs_update = False
        update_operations = {}
        
        # Add portfolio_videos if missing
        if 'portfolio_videos' not in business:
            update_operations['portfolio_videos'] = []
            needs_update = True
        
        # Add portfolio_photos if missing
        if 'portfolio_photos' not in business:
            update_operations['portfolio_photos'] = []
            needs_update = True
        
        # Add social_links if missing
        if 'social_links' not in business:
            update_operations['social_links'] = {}
            needs_update = True
        
        if needs_update:
            db.users.update_one(
                {'_id': business['_id']},
                {'$set': update_operations}
            )
            updated_count += 1
            print(f"✅ Updated: {username}")
            if 'portfolio_videos' in update_operations:
                print(f"   - Added portfolio_videos field")
    
    print(f"\n{'='*60}")
    print(f"📊 Summary:")
    print(f"{'='*60}")
    print(f"✅ Updated: {updated_count} business accounts")
    print(f"📋 Total: {len(business_accounts)} business accounts")
    
    # Verify a sample
    print(f"\n{'='*60}")
    print(f"🔍 Verification:")
    print(f"{'='*60}")
    
    sample = db.users.find_one({"user_type": "business"})
    if sample:
        print(f"Sample Business: {sample.get('username')}")
        print(f"  ✓ portfolio_videos: {type(sample.get('portfolio_videos', 'MISSING'))}")
        print(f"  ✓ portfolio_photos: {type(sample.get('portfolio_photos', 'MISSING'))}")
        print(f"  ✓ social_links: {type(sample.get('social_links', 'MISSING'))}")
    
    client.close()
    
    print(f"\n🎉 Business accounts now support Featured Videos!\n")

if __name__ == "__main__":
    add_videos_to_business_accounts()
