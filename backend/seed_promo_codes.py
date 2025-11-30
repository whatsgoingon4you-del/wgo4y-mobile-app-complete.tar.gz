#!/usr/bin/env python3
"""
Seed promo codes for testing the free trial flow
"""

from pymongo import MongoClient
from datetime import datetime, timedelta

def seed_promo_codes():
    """Create test promo codes in database"""
    
    client = MongoClient("mongodb://localhost:27017")
    db = client["test_database"]
    
    print("🎫 Seeding promo codes...\n")
    
    # Clear existing promo codes
    db.promo_codes.delete_many({})
    
    promo_codes = [
        {
            "code": "WGO4Y60",
            "description": "60-day free trial for all tiers",
            "trial_days": 60,
            "discount_percent": 0,
            "user_types": ["general_public", "entrepreneur", "business"],
            "tiers": ["appreciation", "silver", "networking", "gold"],
            "usage_limit": 1000,
            "used_count": 0,
            "active": True,
            "expires_at": (datetime.utcnow() + timedelta(days=365)).isoformat(),
            "created_at": datetime.utcnow()
        },
        {
            "code": "ENTREPRENEUR60",
            "description": "60-day free trial for entrepreneurs only",
            "trial_days": 60,
            "discount_percent": 0,
            "user_types": ["entrepreneur"],
            "tiers": ["silver", "networking"],
            "usage_limit": 500,
            "used_count": 0,
            "active": True,
            "expires_at": (datetime.utcnow() + timedelta(days=365)).isoformat(),
            "created_at": datetime.utcnow()
        },
        {
            "code": "BUSINESS60",
            "description": "60-day free trial for businesses only",
            "trial_days": 60,
            "discount_percent": 0,
            "user_types": ["business"],
            "tiers": ["silver", "gold"],
            "usage_limit": 500,
            "used_count": 0,
            "active": True,
            "expires_at": (datetime.utcnow() + timedelta(days=365)).isoformat(),
            "created_at": datetime.utcnow()
        },
        {
            "code": "TESTCODE",
            "description": "Test promo code for development",
            "trial_days": 60,
            "discount_percent": 0,
            "user_types": ["general_public", "entrepreneur", "business"],
            "tiers": ["appreciation", "silver", "networking", "gold"],
            "usage_limit": None,  # Unlimited for testing
            "used_count": 0,
            "active": True,
            "expires_at": None,  # No expiration
            "created_at": datetime.utcnow()
        }
    ]
    
    result = db.promo_codes.insert_many(promo_codes)
    
    print(f"✅ Created {len(result.inserted_ids)} promo codes:\n")
    
    for code in promo_codes:
        print(f"   🎫 {code['code']}")
        print(f"      - {code['description']}")
        print(f"      - Trial Days: {code['trial_days']}")
        print(f"      - Valid for: {', '.join(code['user_types'])}")
        print(f"      - Tiers: {', '.join(code['tiers'])}")
        print(f"      - Usage: {code['used_count']}/{code['usage_limit'] or 'Unlimited'}")
        print()
    
    print("=" * 60)
    print("✅ Promo codes seeded successfully!")
    print("=" * 60)
    
    client.close()

if __name__ == "__main__":
    seed_promo_codes()
