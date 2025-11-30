#!/usr/bin/env python3
"""
Setup Featured Video Testing Environment
Creates test accounts with different membership tiers and portfolio videos
"""

from pymongo import MongoClient
import bcrypt
from datetime import datetime
import uuid

def create_test_accounts():
    """Create test accounts with different membership tiers"""
    
    client = MongoClient("mongodb://localhost:27017")
    db = client["test_database"]
    
    print("🚀 Setting up Featured Video Testing Environment...\n")
    
    # Test accounts configuration
    test_users = [
        {
            "username": "free_artist",
            "email": "free@test.com",
            "password": "test123",
            "full_name": "Free Artist",
            "membership_tier": "free",
            "user_type": "entrepreneur",
            "services": ["DJ", "Music Producer"],
            "location": "New York, NY",
            "bio": "Aspiring DJ and music producer looking to grow my audience",
            "portfolio_videos": [
                {
                    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                    "title": "My DJ Mix 2024",
                    "platform": "youtube",
                    "videoId": "dQw4w9WgXcQ",
                    "thumbnailUrl": "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
                    "featured": False,
                    "featured_approved": False
                },
                {
                    "url": "https://www.youtube.com/watch?v=jNQXAC9IVRw",
                    "title": "Live Performance at Club",
                    "platform": "youtube",
                    "videoId": "jNQXAC9IVRw",
                    "thumbnailUrl": "https://img.youtube.com/vi/jNQXAC9IVRw/maxresdefault.jpg",
                    "featured": False,
                    "featured_approved": False
                }
            ]
        },
        {
            "username": "silver_creator",
            "email": "silver@test.com",
            "password": "test123",
            "full_name": "Silver Creator",
            "membership_tier": "silver",
            "user_type": "entrepreneur",
            "services": ["Videographer", "Content Creator"],
            "location": "Los Angeles, CA",
            "bio": "Professional videographer specializing in events and weddings",
            "portfolio_videos": [
                {
                    "url": "https://www.youtube.com/watch?v=9bZkp7q19f0",
                    "title": "Wedding Highlight Reel",
                    "platform": "youtube",
                    "videoId": "9bZkp7q19f0",
                    "thumbnailUrl": "https://img.youtube.com/vi/9bZkp7q19f0/maxresdefault.jpg",
                    "featured": True,
                    "featured_approved": False,
                    "featured_date": datetime.utcnow().isoformat()
                },
                {
                    "url": "https://www.youtube.com/watch?v=kJQP7kiw5Fk",
                    "title": "Corporate Event Coverage",
                    "platform": "youtube",
                    "videoId": "kJQP7kiw5Fk",
                    "thumbnailUrl": "https://img.youtube.com/vi/kJQP7kiw5Fk/maxresdefault.jpg",
                    "featured": False,
                    "featured_approved": False
                },
                {
                    "url": "https://vimeo.com/148751763",
                    "title": "Commercial Showreel",
                    "platform": "vimeo",
                    "videoId": "148751763",
                    "thumbnailUrl": "https://i.vimeocdn.com/video/548499128-1920x1080.jpg",
                    "featured": False,
                    "featured_approved": False
                }
            ]
        },
        {
            "username": "gold_performer",
            "email": "gold@test.com",
            "password": "test123",
            "full_name": "Gold Performer",
            "membership_tier": "gold",
            "user_type": "entrepreneur",
            "services": ["Live Performer", "Singer"],
            "location": "Miami, FL",
            "bio": "Award-winning live performer with 10+ years of experience",
            "portfolio_videos": [
                {
                    "url": "https://www.youtube.com/watch?v=YQHsXMglC9A",
                    "title": "Live Concert Performance",
                    "platform": "youtube",
                    "videoId": "YQHsXMglC9A",
                    "thumbnailUrl": "https://img.youtube.com/vi/YQHsXMglC9A/maxresdefault.jpg",
                    "featured": True,
                    "featured_approved": False,
                    "featured_date": datetime.utcnow().isoformat()
                },
                {
                    "url": "https://www.youtube.com/watch?v=pAgnJDJN4VA",
                    "title": "Studio Session",
                    "platform": "youtube",
                    "videoId": "pAgnJDJN4VA",
                    "thumbnailUrl": "https://img.youtube.com/vi/pAgnJDJN4VA/maxresdefault.jpg",
                    "featured": False,
                    "featured_approved": False
                },
                {
                    "url": "https://www.youtube.com/watch?v=M7lc1UVf-VE",
                    "title": "Music Video",
                    "platform": "youtube",
                    "videoId": "M7lc1UVf-VE",
                    "thumbnailUrl": "https://img.youtube.com/vi/M7lc1UVf-VE/maxresdefault.jpg",
                    "featured": False,
                    "featured_approved": False
                }
            ]
        }
    ]
    
    created_users = []
    
    for user_data in test_users:
        # Check if user already exists
        existing = db.users.find_one({"username": user_data["username"]})
        
        if existing:
            print(f"⚠️  User '{user_data['username']}' already exists. Updating...")
            # Update existing user
            db.users.update_one(
                {"username": user_data["username"]},
                {"$set": {
                    "membership_tier": user_data["membership_tier"],
                    "services": user_data["services"],
                    "location": user_data["location"],
                    "bio": user_data["bio"],
                    "portfolio_videos": user_data["portfolio_videos"],
                    "profile_completed": True
                }}
            )
            created_users.append(user_data)
        else:
            # Create new user
            user_id = str(uuid.uuid4())
            hashed_password = bcrypt.hashpw(user_data["password"].encode('utf-8'), bcrypt.gensalt())
            
            user_doc = {
                '_id': user_id,
                'username': user_data['username'],
                'email': user_data['email'],
                'password_hash': hashed_password.decode('utf-8'),
                'user_type': user_data['user_type'],
                'full_name': user_data['full_name'],
                'membership_tier': user_data['membership_tier'],
                'services': user_data['services'],
                'location': user_data['location'],
                'bio': user_data['bio'],
                'portfolio_videos': user_data['portfolio_videos'],
                'created_at': datetime.utcnow(),
                'profile_completed': True,
                'isAdmin': False,
                'services_offered': [],
                'portfolio_photos': [],
                'social_links': {},
                'venue_categories': [],
                'entrepreneur_categories': [],
                'selected_categories': [],
                'venue_preferences': [],
                'service_preferences': []
            }
            
            db.users.insert_one(user_doc)
            created_users.append(user_data)
            print(f"✅ Created user: {user_data['username']} ({user_data['membership_tier'].upper()} tier)")
    
    client.close()
    
    return created_users

def print_testing_guide(users):
    """Print comprehensive testing guide"""
    
    print("\n" + "="*70)
    print("🎬 FEATURED VIDEOS MVP - TESTING GUIDE")
    print("="*70)
    
    print("\n📋 TEST ACCOUNTS CREATED:\n")
    
    for user in users:
        tier_emoji = {"free": "🆓", "silver": "🥈", "gold": "🥇"}.get(user['membership_tier'], "")
        print(f"{tier_emoji} {user['membership_tier'].upper()} TIER - {user['full_name']}")
        print(f"   Username: {user['username']}")
        print(f"   Password: {user['password']}")
        print(f"   Videos: {len(user['portfolio_videos'])} portfolio videos")
        
        # Check if any videos are pending
        pending = [v for v in user['portfolio_videos'] if v.get('featured') and not v.get('featured_approved')]
        if pending:
            print(f"   📌 Pending Featured: {len(pending)} video(s)")
        print()
    
    print("="*70)
    print("🧪 TESTING CHECKLIST")
    print("="*70)
    
    print("\n✅ PHASE 1: Free User Testing")
    print("   1. Log in as 'free_artist' / 'test123'")
    print("   2. Go to Profile → Edit Profile")
    print("   3. Try to feature a video")
    print("   4. Verify 'Upgrade to Feature' modal appears")
    print("   5. Confirm video is NOT marked as featured")
    
    print("\n✅ PHASE 2: Silver User Testing")
    print("   1. Log in as 'silver_creator' / 'test123'")
    print("   2. Go to Profile → View profile")
    print("   3. Verify 'Wedding Highlight Reel' shows 'Pending' badge")
    print("   4. Edit profile and check featured status")
    
    print("\n✅ PHASE 3: Gold User Testing")
    print("   1. Log in as 'gold_performer' / 'test123'")
    print("   2. Go to Profile → View profile")
    print("   3. Verify 'Live Concert Performance' shows 'Pending' badge")
    print("   4. Verify Gold membership badge displays")
    
    print("\n✅ PHASE 4: Admin Approval Testing")
    print("   1. Log in as 'Test_User' / 'testpass123'")
    print("   2. Go to Dashboard → 👑 Admin Dashboard")
    print("   3. Verify 2 pending videos appear:")
    print("      - Silver Creator: Wedding Highlight Reel")
    print("      - Gold Performer: Live Concert Performance")
    print("   4. Test APPROVE on one video")
    print("   5. Test REJECT on another video")
    
    print("\n✅ PHASE 5: Homepage Display Testing")
    print("   1. Log out and go to Home tab")
    print("   2. Verify 'Featured Artists' section appears")
    print("   3. Check approved featured videos display")
    print("   4. Tap video to verify it opens correctly")
    print("   5. Verify creator info and location display")
    
    print("\n✅ PHASE 6: End-to-End Flow")
    print("   1. Log in as silver_creator")
    print("   2. Feature a different video")
    print("   3. Switch to admin account")
    print("   4. Approve the new video")
    print("   5. Verify it appears on homepage")
    
    print("\n" + "="*70)
    print("📝 NOTES:")
    print("="*70)
    print("• All test accounts use password: 'test123'")
    print("• Admin account: 'Test_User' / 'testpass123'")
    print("• Videos use real YouTube/Vimeo URLs for testing")
    print("• Silver and Gold users each have 1 pending featured video")
    print("• Free user has videos but cannot feature them")
    print("\n" + "="*70)
    
def main():
    print("\n" + "="*70)
    print("🎬 FEATURED VIDEOS MVP - TEST DATA SETUP")
    print("="*70 + "\n")
    
    # Create test accounts
    users = create_test_accounts()
    
    print("\n✅ Test environment setup complete!\n")
    
    # Print testing guide
    print_testing_guide(users)
    
    print("\n🚀 Ready to test! Follow the checklist above.\n")

if __name__ == "__main__":
    main()
