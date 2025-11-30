#!/usr/bin/env python3
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def fix_dj_nyce():
    mongo_url = "mongodb://localhost:27017/"
    
    print('Connecting to database...')
    client = AsyncIOMotorClient(mongo_url)
    db = client.test_database
    
    # Find entrepreneur user
    print('Searching for entrepreneur user...')
    user = await db.users.find_one({'user_type': 'entrepreneur'})
    
    if not user:
        print('❌ No entrepreneur users found')
        client.close()
        return
    
    username = user.get('username')
    print(f'Found user: {username}')
    print(f'Current services: {user.get("services")}')
    
    # Update with occupations
    print(f'\nUpdating {username}...')
    result = await db.users.update_one(
        {'_id': user['_id']},
        {'$set': {'services': ['DJ', 'Content Creator']}}
    )
    
    print(f'✅ Modified {result.modified_count} document(s)')
    
    # Verify
    updated_user = await db.users.find_one({'_id': user['_id']}, {'username': 1, 'services': 1})
    print(f'✅ User services now: {updated_user.get("services")}')
    
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_dj_nyce())
