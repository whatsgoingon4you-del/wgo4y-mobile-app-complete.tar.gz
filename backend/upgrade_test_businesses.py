#!/usr/bin/env python3
"""
Upgrade Sample Business Accounts for Testing
"""

from pymongo import MongoClient

def upgrade_business_accounts():
    client = MongoClient("mongodb://localhost:27017")
    db = client["test_database"]
    
    print("🔧 Upgrading sample business accounts for testing...\n")
    
    # Upgrade specific business accounts for testing
    test_businesses = [
        {"username": "The Rock", "tier": "gold"},
        {"username": "The Rooftop Lounge", "tier": "silver"},
        {"username": "The Clubhouse", "tier": "gold"},
    ]
    
    upgraded_count = 0
    
    for business in test_businesses:
        username = business['username']
        tier = business['tier']
        
        result = db.users.update_one(
            {"username": username},
            {"$set": {"membership_tier": tier}}
        )
        
        if result.matched_count > 0:
            upgraded_count += 1
            emoji = "🥇" if tier == "gold" else "🥈"
            print(f"{emoji} Upgraded: {username:30s} → {tier.upper()}")
        else:
            print(f"❌ Not found: {username}")
    
    print(f"\n✅ Successfully upgraded {upgraded_count} business accounts")
    print("\nThese accounts can now:")
    print("  • Add portfolio videos")
    print("  • Feature videos for homepage")
    print("  • Submit for admin approval")
    
    client.close()

if __name__ == "__main__":
    upgrade_business_accounts()
