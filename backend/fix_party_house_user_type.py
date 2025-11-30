#!/usr/bin/env python3
"""Fix Party House account user_type from general_public to business"""

import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

def fix_party_house_account():
    # Connect to MongoDB
    mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017/')
    client = MongoClient(mongo_url)
    db = client['wgo4y']
    users = db['users']
    
    # Find Party House user
    party_house = users.find_one({'username': 'Party_House'})
    
    if not party_house:
        print("❌ Party House account not found!")
        return
    
    print(f"Found Party House account:")
    print(f"  - Current user_type: {party_house.get('user_type')}")
    print(f"  - Email: {party_house.get('email')}")
    print(f"  - Business Name: {party_house.get('business_name', 'N/A')}")
    
    # Update user_type to business
    result = users.update_one(
        {'username': 'Party_House'},
        {'$set': {'user_type': 'business'}}
    )
    
    if result.modified_count > 0:
        print("\n✅ Successfully updated Party House user_type to 'business'!")
        
        # Verify
        updated_user = users.find_one({'username': 'Party_House'})
        print(f"  - New user_type: {updated_user.get('user_type')}")
    else:
        print("\n⚠️ No changes made (may already be correct)")

if __name__ == '__main__':
    fix_party_house_account()
