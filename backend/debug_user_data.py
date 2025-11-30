#!/usr/bin/env python3
"""
Debug script to check user data structure
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json

# Database connection
MONGODB_URL = os.environ['MONGO_URL']
DATABASE_NAME = os.environ['DB_NAME']

async def debug_user_data():
    """Check user data structure"""
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    users_collection = db.users
    
    print("🔍 Checking user data structure...")
    
    # Find all users
    users_cursor = users_collection.find({}).limit(5)
    
    async for user in users_cursor:
        username = user.get('username', 'Unknown')
        print(f"\n👤 User: {username}")
        print(f"   user_type: {user.get('user_type')}")
        print(f"   services: {user.get('services')}")
        print(f"   services_offered: {user.get('services_offered')}")
        print(f"   service_name: {user.get('service_name')}")
        
        # Show full user data for first entrepreneur
        if user.get('user_type') == 'entrepreneur':
            print(f"\n📋 Full data for {username}:")
            # Remove sensitive fields
            safe_user = {k: v for k, v in user.items() if k not in ['password', '_id']}
            print(json.dumps(safe_user, indent=2, default=str))
            break
    
    # Close connection
    client.close()

if __name__ == "__main__":
    asyncio.run(debug_user_data())