"""
Reset all test account passwords to Test1234 for easier testing
"""
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt
import asyncio
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Standard test password
TEST_PASSWORD = "Test1234"

async def reset_test_passwords():
    """Reset all user passwords to Test1234"""
    
    # Hash the standard password
    hashed = bcrypt.hashpw(TEST_PASSWORD.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    print(f"\n🔐 Resetting all user passwords to: {TEST_PASSWORD}")
    print("=" * 60)
    
    # Get all users
    users = await db.users.find({}).to_list(length=1000)
    
    updated_count = 0
    for user in users:
        username = user.get('username', 'unknown')
        user_type = user.get('user_type', 'unknown')
        tier = user.get('membership_tier', 'basic')
        is_admin = user.get('is_admin', False)
        
        # Update password
        result = await db.users.update_one(
            {'_id': user['_id']},
            {'$set': {'password': hashed}}
        )
        
        if result.modified_count > 0:
            updated_count += 1
            admin_badge = " [ADMIN]" if is_admin else ""
            print(f"✅ {username:25} | {user_type:15} | {tier:12}{admin_badge}")
    
    print("=" * 60)
    print(f"\n✅ Password reset complete for {updated_count} accounts")
    print(f"📝 Standard password: {TEST_PASSWORD}")
    print(f"\n👤 Admin/Merchant Profile: Look for [ADMIN] badge above")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(reset_test_passwords())
