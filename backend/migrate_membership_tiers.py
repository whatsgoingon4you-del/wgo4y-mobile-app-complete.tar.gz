#!/usr/bin/env python3
"""
Migrate membership tiers to new structure:
- General Public: basic, appreciation
- Entrepreneur: basic, silver, networking (was gold)
- Business: basic, silver, gold
"""

from pymongo import MongoClient
from datetime import datetime

def migrate_tiers():
    """Migrate existing membership tiers to new structure"""
    
    client = MongoClient("mongodb://localhost:27017")
    db = client["test_database"]
    
    print("🔄 Starting membership tier migration...\n")
    
    # Step 1: Migrate Entrepreneurs - Change "gold" to "networking"
    entrepreneur_gold = db.users.count_documents({
        "user_type": "entrepreneur",
        "membership_tier": "gold"
    })
    
    if entrepreneur_gold > 0:
        print(f"📊 Found {entrepreneur_gold} entrepreneur(s) with 'gold' tier")
        result = db.users.update_many(
            {"user_type": "entrepreneur", "membership_tier": "gold"},
            {"$set": {"membership_tier": "networking"}}
        )
        print(f"✅ Updated {result.modified_count} entrepreneur(s) to 'networking' tier\n")
    else:
        print("✅ No entrepreneurs with 'gold' tier to migrate\n")
    
    # Step 2: Verify businesses still use correct tiers (basic, silver, gold)
    business_tiers = db.users.aggregate([
        {"$match": {"user_type": "business"}},
        {"$group": {"_id": "$membership_tier", "count": {"$sum": 1}}}
    ])
    
    print("📊 Business tier distribution:")
    for tier in business_tiers:
        print(f"   - {tier['_id']}: {tier['count']} business(es)")
    print()
    
    # Step 3: Verify general public tiers (basic, appreciation)
    public_tiers = db.users.aggregate([
        {"$match": {"user_type": "general_public"}},
        {"$group": {"_id": "$membership_tier", "count": {"$sum": 1}}}
    ])
    
    print("📊 General Public tier distribution:")
    for tier in public_tiers:
        print(f"   - {tier['_id']}: {tier['count']} user(s)")
    print()
    
    # Step 4: Summary report
    print("=" * 60)
    print("📋 FINAL TIER STRUCTURE")
    print("=" * 60)
    
    all_users = db.users.aggregate([
        {"$group": {
            "_id": {"type": "$user_type", "tier": "$membership_tier"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id.type": 1, "_id.tier": 1}}
    ])
    
    current_type = None
    for user_group in all_users:
        user_type = user_group['_id']['type']
        tier = user_group['_id']['tier'] or 'null'
        count = user_group['count']
        
        if user_type != current_type:
            print(f"\n{user_type.upper().replace('_', ' ')}:")
            current_type = user_type
        
        print(f"  ├─ {tier}: {count} user(s)")
    
    print("\n" + "=" * 60)
    print("✅ Migration complete!")
    print("=" * 60)
    
    client.close()

if __name__ == "__main__":
    migrate_tiers()
