"""
Cleanup Demo User Profiles
Removes generic "Demo User" profiles, keeps only real migrated profiles with proper names
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def cleanup_demo_users():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'venue_job_portal')
    
    print(f"📊 Connecting to database: {db_name}")
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Delete profiles with generic "Demo User" name or is_demo_profile flag
    deleted = await db.users.delete_many({
        '$or': [
            {'full_name': {'$regex': '^Demo User', '$options': 'i'}},
            {'full_name': 'Demo User'},
            {'is_demo_profile': True}
        ]
    })
    
    print(f"✅ Deleted {deleted.deleted_count} demo user profiles")
    
    # Count remaining users
    total = await db.users.count_documents({})
    entrepreneurs = await db.users.count_documents({'user_type': 'entrepreneur'})
    businesses = await db.users.count_documents({'user_type': 'business'})
    
    print("\n" + "="*60)
    print("📊 CLEANUP COMPLETE!")
    print("="*60)
    print(f"   Remaining users: {total}")
    print(f"   Entrepreneurs: {entrepreneurs}")
    print(f"   Businesses: {businesses}")
    print("="*60)
    
    # Show sample of remaining profiles
    print("\n✅ Sample of remaining profiles:")
    sample_users = await db.users.find({}, {'full_name': 1, 'user_type': 1, 'location': 1}).limit(10).to_list(10)
    for user in sample_users:
        print(f"   - {user.get('full_name', 'N/A')} ({user.get('user_type', 'N/A')}) - {user.get('location', 'N/A')}")

if __name__ == "__main__":
    asyncio.run(cleanup_demo_users())
