#!/usr/bin/env python3
"""
Migration script to fix services field structure.

Problem: Occupations were being stored in 'services_offered' instead of 'services'
Solution: Move string arrays from 'services_offered' to 'services' field

This script:
1. Finds users where services_offered contains strings (old occupations)
2. Moves those strings to the 'services' field
3. Clears services_offered if it only contained strings
4. Preserves services_offered if it contains objects (actual services with pricing)
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from typing import List, Dict, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection
MONGODB_URL = os.environ['MONGO_URL']
DATABASE_NAME = os.environ['DB_NAME']

async def migrate_services_field():
    """Migrate services field structure for all users"""
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    users_collection = db.users
    
    print("🔍 Starting services field migration...")
    
    # Find all users with services_offered field
    users_cursor = users_collection.find({
        "services_offered": {"$exists": True, "$ne": []}
    })
    
    migration_count = 0
    users_processed = 0
    
    async for user in users_cursor:
        users_processed += 1
        username = user.get('username', 'Unknown')
        user_id = user['_id']
        services_offered = user.get('services_offered', [])
        current_services = user.get('services', [])
        
        print(f"\n👤 Processing user: {username}")
        print(f"   Current services: {current_services}")
        print(f"   Current services_offered: {services_offered}")
        
        # Skip if services_offered is empty
        if not services_offered:
            print("   ✅ No services_offered to migrate")
            continue
            
        # Check if services_offered contains strings (old occupations)
        has_strings = any(isinstance(item, str) for item in services_offered)
        has_objects = any(isinstance(item, dict) for item in services_offered)
        
        if has_strings and not has_objects:
            # All items are strings - these are occupations that should be in 'services'
            print(f"   🔄 MIGRATING: Moving occupations {services_offered} to services field")
            
            update_doc = {
                'services': services_offered,  # Move strings to services
                'services_offered': []  # Clear services_offered
            }
            
            await users_collection.update_one(
                {'_id': user_id},
                {'$set': update_doc}
            )
            
            migration_count += 1
            print(f"   ✅ MIGRATED: {username}")
            
        elif has_strings and has_objects:
            # Mixed content - extract strings for services, keep objects for services_offered
            occupations = [item for item in services_offered if isinstance(item, str)]
            actual_services = [item for item in services_offered if isinstance(item, dict)]
            
            print(f"   🔄 SPLITTING: Occupations {occupations} -> services, Services {actual_services} -> services_offered")
            
            update_doc = {
                'services': occupations,
                'services_offered': actual_services
            }
            
            await users_collection.update_one(
                {'_id': user_id},
                {'$set': update_doc}
            )
            
            migration_count += 1
            print(f"   ✅ SPLIT: {username}")
            
        else:
            # All objects - correct structure, no migration needed
            print("   ✅ Correct structure (all objects), no migration needed")
    
    print(f"\n🎉 Migration completed!")
    print(f"   Users processed: {users_processed}")
    print(f"   Users migrated: {migration_count}")
    
    # Close connection
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate_services_field())