"""
Seed Promo Codes
Creates promotional codes for tier upgrades  
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone, timedelta
from uuid import uuid4

async def seed_promo_codes():
    # Connect to MongoDB - use environment variables
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'venue_job_portal')
    
    print(f"📊 Connecting to database: {db_name}")
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Define promo codes to create
    promo_codes = [
        {
            '_id': str(uuid4()),
            'code': 'WGO4Y60',
            'description': '60% discount on any paid tier upgrade',
            'discount_percent': 60,
            'trial_days': 0,
            'active': True,
            'usage_limit': 100,
            'used_count': 0,
            'expires_at': (datetime.now(timezone.utc) + timedelta(days=180)).isoformat(),  # 6 months
            'user_types': ['general_public', 'entrepreneur', 'business'],  # All user types
            'tiers': ['appreciation', 'silver', 'gold', 'networking'],  # All paid tiers
            'created_at': datetime.now(timezone.utc),
            'updated_at': datetime.now(timezone.utc)
        },
        {
            '_id': str(uuid4()),
            'code': 'WELCOME30',
            'description': '30 day free trial for new users',
            'discount_percent': 0,
            'trial_days': 30,
            'active': True,
            'usage_limit': 500,
            'used_count': 0,
            'expires_at': (datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),  # 1 year
            'user_types': ['general_public', 'entrepreneur', 'business'],
            'tiers': ['appreciation', 'silver', 'gold', 'networking'],
            'created_at': datetime.now(timezone.utc),
            'updated_at': datetime.now(timezone.utc)
        },
        {
            '_id': str(uuid4()),
            'code': 'ENTREPRENEUR50',
            'description': '50% discount for entrepreneurs',
            'discount_percent': 50,
            'trial_days': 0,
            'active': True,
            'usage_limit': 200,
            'used_count': 0,
            'expires_at': (datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
            'user_types': ['entrepreneur'],  # Entrepreneur only
            'tiers': ['appreciation', 'silver', 'gold'],
            'created_at': datetime.now(timezone.utc),
            'updated_at': datetime.now(timezone.utc)
        }
    ]
    
    # Insert or update each promo code
    for promo in promo_codes:
        existing = await db.promo_codes.find_one({'code': promo['code']})
        
        if existing:
            print(f"⚠️  Promo code '{promo['code']}' already exists - skipping")
        else:
            await db.promo_codes.insert_one(promo)
            print(f"✅ Created promo code: {promo['code']}")
            print(f"   Description: {promo['description']}")
            if promo['discount_percent'] > 0:
                print(f"   Discount: {promo['discount_percent']}%")
            if promo['trial_days'] > 0:
                print(f"   Trial Days: {promo['trial_days']}")
            print(f"   Usage Limit: {promo['usage_limit']}")
            print(f"   Valid for user types: {', '.join(promo['user_types'])}")
            print(f"   Valid for tiers: {', '.join(promo['tiers'])}")
            print(f"   Expires: {promo['expires_at'][:10]}")
            print()
    
    # Show summary
    total_codes = await db.promo_codes.count_documents({})
    print(f"📊 Total promo codes in database: {total_codes}")

if __name__ == "__main__":
    asyncio.run(seed_promo_codes())
