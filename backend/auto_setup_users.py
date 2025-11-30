#!/usr/bin/env python3
"""
Quick Auto-Setup Script for Featured Videos Testing
This will automatically configure your existing users for testing.
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def auto_setup():
    print("\n🎬 Featured Videos - Auto Setup for Testing")
    print("="*60 + "\n")
    
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Get all users
    users = await db.users.find({}).to_list(length=100)
    
    if not users:
        print("❌ No users found. Please register some users first.")
        client.close()
        return
    
    print(f"Found {len(users)} users. Setting up for testing...\n")
    
    # Strategy: 
    # - First user: Admin + Gold
    # - Second user (if exists): Silver
    # - Third user (if exists): Gold
    # - Rest: Free (unchanged)
    
    for idx, user in enumerate(users):
        email = user.get('email', 'N/A')
        username = user.get('username', 'N/A')
        
        if idx == 0:
            # First user: Admin + Gold
            await db.users.update_one(
                {'_id': user['_id']},
                {'$set': {'is_admin': True, 'membership_tier': 'gold'}}
            )
            print(f"✅ {email} (@{username})")
            print(f"   → ADMIN + GOLD TIER")
            print(f"   → Can access /admin/featured-videos")
            print(f"   → Can feature videos\n")
            
        elif idx == 1 and len(users) > 1:
            # Second user: Silver
            await db.users.update_one(
                {'_id': user['_id']},
                {'$set': {'membership_tier': 'silver', 'is_admin': False}}
            )
            print(f"✅ {email} (@{username})")
            print(f"   → SILVER TIER")
            print(f"   → Can feature videos\n")
            
        elif idx == 2 and len(users) > 2:
            # Third user: Gold (non-admin)
            await db.users.update_one(
                {'_id': user['_id']},
                {'$set': {'membership_tier': 'gold', 'is_admin': False}}
            )
            print(f"✅ {email} (@{username})")
            print(f"   → GOLD TIER")
            print(f"   → Can feature videos\n")
    
    print("="*60)
    print("✅ SETUP COMPLETE!")
    print("="*60 + "\n")
    
    print("📋 TEST INSTRUCTIONS:\n")
    print("1. LOGIN AS ADMIN (first user)")
    print("   - Navigate to /admin/featured-videos")
    print("   - You'll approve videos here\n")
    
    print("2. LOGIN AS SILVER/GOLD USER (other users)")
    print("   - Go to Profile Edit")
    print("   - Add a YouTube/Vimeo video to portfolio")
    print("   - Click 'Feature This Video' button")
    print("   - Video will be marked PENDING\n")
    
    print("3. APPROVE AS ADMIN")
    print("   - Switch to admin account")
    print("   - Go to /admin/featured-videos")
    print("   - Approve the pending video\n")
    
    print("4. VIEW ON HOMEPAGE")
    print("   - Refresh homepage")
    print("   - See 'Featured Artists' section")
    print("   - Your video will be displayed!\n")
    
    print("="*60)
    print("FINAL USER SETUP:")
    print("="*60 + "\n")
    
    # Show final configuration
    users = await db.users.find({}).to_list(length=100)
    for user in users:
        email = user.get('email', 'N/A')
        username = user.get('username', 'N/A')
        tier = user.get('membership_tier', 'free').upper()
        is_admin = user.get('is_admin', False)
        
        admin_badge = " 👑 ADMIN" if is_admin else ""
        print(f"{email} (@{username})")
        print(f"  → {tier}{admin_badge}\n")
    
    client.close()

if __name__ == "__main__":
    try:
        asyncio.run(auto_setup())
    except Exception as e:
        print(f"\n❌ Error: {e}")
