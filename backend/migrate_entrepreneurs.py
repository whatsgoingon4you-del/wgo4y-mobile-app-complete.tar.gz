#!/usr/bin/env python3
"""
Emergency migration script to mark ALL entrepreneur accounts as profile_completed=True
This fixes the critical issue where returning users are stuck in onboarding
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def migrate_all_entrepreneurs():
    # Connect to MongoDB
    mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017/')
    client = AsyncIOMotorClient(mongo_url)
    db = client.wgo4y
    
    print("Starting migration of all entrepreneur accounts...")
    
    # Find all entrepreneurs
    entrepreneurs = await db.users.find({'user_type': 'entrepreneur'}).to_list(length=None)
    
    print(f"Found {len(entrepreneurs)} entrepreneur accounts")
    
    migrated_count = 0
    for user in entrepreneurs:
        username = user.get('username', 'unknown')
        current_status = user.get('profile_completed', False)
        
        if not current_status:
            # Update to complete
            await db.users.update_one(
                {'_id': user['_id']},
                {'$set': {'profile_completed': True}}
            )
            migrated_count += 1
            print(f"✅ Migrated: {username} (was incomplete, now complete)")
        else:
            print(f"⏭️  Skipped: {username} (already complete)")
    
    print(f"\n✅ Migration complete!")
    print(f"Total accounts processed: {len(entrepreneurs)}")
    print(f"Accounts migrated: {migrated_count}")
    print(f"Accounts already complete: {len(entrepreneurs) - migrated_count}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate_all_entrepreneurs())
