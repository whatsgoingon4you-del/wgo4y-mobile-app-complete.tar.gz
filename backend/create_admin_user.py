#!/usr/bin/env python3
"""
Create Admin User
This script creates a test admin user directly in the database.
"""

from pymongo import MongoClient
import bcrypt
from datetime import datetime

def create_admin_user():
    print("🚀 Creating admin user...\n")
    
    # Connect to MongoDB
    client = MongoClient("mongodb://localhost:27017")
    db = client["wgo4y"]
    
    # Check if user already exists
    existing = db.users.find_one({"username": "testuser"})
    if existing:
        print("⚠️  User 'testuser' already exists. Updating to admin...")
        db.users.update_one(
            {"username": "testuser"},
            {"$set": {
                "isAdmin": True,
                "membership_tier": "gold"
            }}
        )
        print("✅ Updated existing user to admin!")
        return
    
    # Hash password
    password = "testpass123"
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    
    # Create admin user
    admin_user = {
        "username": "testuser",
        "email": "admin@wgo4y.com",
        "password": hashed.decode('utf-8'),
        "full_name": "Test Admin User",
        "userType": "entrepreneur",
        "isAdmin": True,
        "membership_tier": "gold",
        "created_at": datetime.utcnow(),
        "profile_complete": False
    }
    
    result = db.users.insert_one(admin_user)
    
    print("✅ Admin user created successfully!")
    print("\n📋 Login Credentials:")
    print(f"   Username: testuser")
    print(f"   Password: {password}")
    print(f"   Email: admin@wgo4y.com")
    print(f"   Admin Status: YES")
    print(f"   Membership: GOLD")
    print("\n🎯 You can now log in with these credentials!")
    
    client.close()

if __name__ == "__main__":
    create_admin_user()
