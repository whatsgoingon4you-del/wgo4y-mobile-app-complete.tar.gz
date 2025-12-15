import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def fix_issues():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'venue_job_portal')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # 1. Fix The Lace Nerd name
    result = await db.users.update_many(
        {'full_name': {'$regex': 'Lace'}},
        {'$set': {'full_name': 'The Lace Nerd', 'service_name': 'The Lace Nerd'}}
    )
    print(f'✅ Updated {result.modified_count} profiles to "The Lace Nerd"')
    
    print('\n📊 Checking for duplicates...')
    # Check current user counts
    users = await db.users.find({}, {'full_name': 1, 'email': 1, 'is_showcase': 1}).to_list(1000)
    
    real_users = [u for u in users if not u.get('is_showcase')]
    print(f'Real users: {len(real_users)}')
    for u in real_users[:10]:
        print(f'  - {u.get("full_name")} ({u.get("email")})')

asyncio.run(fix_issues())
