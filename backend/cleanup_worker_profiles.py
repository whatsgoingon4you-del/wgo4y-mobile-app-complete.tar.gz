"""
Cleanup Worker Profiles
Removes worker_profiles with no matching users (showing as "Unknown")
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def cleanup_worker_profiles():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'venue_job_portal')
    
    print(f"📊 Connecting to database: {db_name}")
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Get all worker profiles
    all_workers = await db.worker_profiles.find({}).to_list(1000)
    print(f"Total worker profiles: {len(all_workers)}")
    
    # Check which ones have matching users
    deleted_count = 0
    kept_count = 0
    
    for worker in all_workers:
        user = await db.users.find_one({'_id': worker['user_id']})
        
        if not user:
            # No matching user - delete this worker profile
            await db.worker_profiles.delete_one({'_id': worker['_id']})
            deleted_count += 1
            print(f"❌ Deleted: {worker.get('role', 'Unknown')} from {worker.get('city', 'Unknown')}, {worker.get('state', 'Unknown')} (no matching user)")
        else:
            kept_count += 1
            print(f"✅ Kept: {user.get('full_name', 'Unknown')} - {worker.get('role', 'Unknown')}")
    
    print("\n" + "="*60)
    print("📊 CLEANUP COMPLETE!")
    print("="*60)
    print(f"   Deleted: {deleted_count} profiles (no matching users)")
    print(f"   Kept: {kept_count} profiles (valid)")
    print("="*60)

if __name__ == "__main__":
    asyncio.run(cleanup_worker_profiles())
