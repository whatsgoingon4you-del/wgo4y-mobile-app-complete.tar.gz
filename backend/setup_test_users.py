#!/usr/bin/env python3
"""
Setup Test Users for Featured Videos Testing
This script will update existing user accounts with membership tiers and admin access.
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def setup_test_users():
    print("🚀 Setting up test users for Featured Videos testing...\n")
    
    # Connect to MongoDB
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME')
    
    if not mongo_url or not db_name:
        print("❌ Error: MONGO_URL or DB_NAME not found in .env file")
        return
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print(f"📊 Connected to database: {db_name}\n")
    
    # List all existing users
    users = await db.users.find({}, {'email': 1, 'username': 1, 'full_name': 1}).to_list(length=100)
    
    if not users:
        print("❌ No users found in database. Please register some users first.\n")
        client.close()
        return
    
    print(f"Found {len(users)} existing users:\n")
    for idx, user in enumerate(users, 1):
        username = user.get('username', 'N/A')
        email = user.get('email', 'N/A')
        full_name = user.get('full_name', 'N/A')
        print(f"{idx}. {full_name} (@{username}) - {email}")
    
    print("\n" + "="*60)
    print("SETUP OPTIONS:")
    print("="*60)
    print("\nEnter the number of the user you want to configure, or:")
    print("  'all' - Set up multiple test users interactively")
    print("  'quit' - Exit without changes")
    print("\nChoice: ", end='')
    
    choice = input().strip().lower()
    
    if choice == 'quit':
        print("\n👋 Exiting without changes.")
        client.close()
        return
    
    if choice == 'all':
        await setup_multiple_users(db, users)
    else:
        try:
            idx = int(choice) - 1
            if 0 <= idx < len(users):
                await setup_single_user(db, users[idx])
            else:
                print("\n❌ Invalid selection")
        except ValueError:
            print("\n❌ Invalid input")
    
    client.close()
    print("\n✅ Setup complete!")

async def setup_single_user(db, user):
    """Setup a single user with tier and admin options"""
    print(f"\n📝 Configuring: {user.get('full_name', 'User')} ({user.get('email')})")
    print("\nSelect membership tier:")
    print("  1. Free (default)")
    print("  2. Bronze")
    print("  3. Silver (can feature videos)")
    print("  4. Gold (can feature videos)")
    print("\nTier (1-4): ", end='')
    
    tier_choice = input().strip()
    tiers = {'1': 'free', '2': 'bronze', '3': 'silver', '4': 'gold'}
    tier = tiers.get(tier_choice, 'free')
    
    print(f"\nMake this user an admin? (y/n): ", end='')
    is_admin = input().strip().lower() == 'y'
    
    # Update user
    update_data = {
        'membership_tier': tier,
        'is_admin': is_admin
    }
    
    result = await db.users.update_one(
        {'_id': user['_id']},
        {'$set': update_data}
    )
    
    if result.modified_count > 0:
        print(f"\n✅ Updated {user.get('email')}")
        print(f"   Tier: {tier.upper()}")
        print(f"   Admin: {'YES' if is_admin else 'NO'}")
    else:
        print(f"\n⚠️  No changes made to {user.get('email')}")

async def setup_multiple_users(db, users):
    """Setup multiple users at once"""
    print("\n" + "="*60)
    print("QUICK SETUP - Assign roles to users")
    print("="*60)
    
    for user in users:
        print(f"\n👤 {user.get('full_name', 'User')} ({user.get('email')})")
        print("   1=Free, 2=Bronze, 3=Silver, 4=Gold, A=Admin+Gold, S=Skip")
        print("   Choice: ", end='')
        
        choice = input().strip().upper()
        
        if choice == 'S':
            print("   ⏭️  Skipped")
            continue
        
        tier_map = {'1': 'free', '2': 'bronze', '3': 'silver', '4': 'gold', 'A': 'gold'}
        tier = tier_map.get(choice, 'free')
        is_admin = (choice == 'A')
        
        update_data = {
            'membership_tier': tier,
            'is_admin': is_admin
        }
        
        await db.users.update_one(
            {'_id': user['_id']},
            {'$set': update_data}
        )
        
        status = f"✅ {tier.upper()}"
        if is_admin:
            status += " + ADMIN"
        print(f"   {status}")

async def show_current_setup(db):
    """Display current user configuration"""
    users = await db.users.find(
        {},
        {'email': 1, 'username': 1, 'full_name': 1, 'membership_tier': 1, 'is_admin': 1}
    ).to_list(length=100)
    
    print("\n" + "="*60)
    print("CURRENT USER SETUP:")
    print("="*60)
    
    for user in users:
        name = user.get('full_name', 'N/A')
        email = user.get('email', 'N/A')
        tier = user.get('membership_tier', 'free').upper()
        is_admin = user.get('is_admin', False)
        admin_badge = " 👑 ADMIN" if is_admin else ""
        
        print(f"\n{name} ({email})")
        print(f"  Tier: {tier}{admin_badge}")

if __name__ == "__main__":
    print("\n" + "="*60)
    print("🎬 FEATURED VIDEOS TEST USER SETUP")
    print("="*60 + "\n")
    
    try:
        asyncio.run(setup_test_users())
        
        # Show final configuration
        async def show_final():
            client = AsyncIOMotorClient(os.environ.get('MONGO_URL'))
            db = client[os.environ.get('DB_NAME')]
            await show_current_setup(db)
            client.close()
        
        asyncio.run(show_final())
        
    except KeyboardInterrupt:
        print("\n\n👋 Setup cancelled by user.")
    except Exception as e:
        print(f"\n❌ Error: {e}")
