#!/usr/bin/env python3
"""
Backend API Testing for WGO4Y - Weekly Featured Video Limits
Tests the implementation of weekly featured video limits (Silver: 1/week, Gold: 3/week)
"""

import requests
import json
import sys
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

# Backend URL from environment
BACKEND_URL = "https://profile-fixer-4.preview.emergentagent.com/api"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "test_database"

# Test data storage
test_users = {}
test_results = []

def print_section(title):
    """Print a formatted section header"""
    print(f"\n{'='*80}")
    print(f"  {title}")
    print(f"{'='*80}\n")

def print_test(test_name, passed, details=""):
    """Print test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status} - {test_name}")
    if details:
        print(f"    {details}")
    test_results.append({"test": test_name, "passed": passed, "details": details})

async def update_user_tier(user_id, tier):
    """Update user membership tier directly in database"""
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        await db.users.update_one(
            {'_id': user_id},
            {'$set': {'membership_tier': tier}}
        )
        client.close()
        return True
    except Exception as e:
        print(f"❌ Failed to update tier: {str(e)}")
        return False

def create_test_user(username, password, email, user_type, tier="basic"):
    """Create a test user and return auth token"""
    try:
        # Register user
        response = requests.post(
            f"{BACKEND_URL}/auth/register",
            json={
                "username": username,
                "password": password,
                "email": email,
                "user_type": user_type,
                "full_name": f"Test {username.title()}"
            }
        )
        
        if response.status_code == 400 and "already exists" in response.text:
            # User exists, try to login
            response = requests.post(
                f"{BACKEND_URL}/auth/login",
                json={"username": username, "password": password}
            )
        
        if response.status_code != 200:
            print(f"❌ Failed to create/login user {username}: {response.status_code} - {response.text}")
            return None
        
        data = response.json()
        token = data['token']
        user_id = data['user']['id']
        
        # Update membership tier if not basic
        if tier != "basic":
            asyncio.run(update_user_tier(user_id, tier))
        
        # Add portfolio videos for testing
        sample_video = {
            "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "title": f"Sample Video for {username}",
            "platform": "youtube",
            "video_id": "dQw4w9WgXcQ",
            "thumbnail_url": "https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg",
            "featured": False
        }
        
        # Add multiple videos for testing
        portfolio_videos = []
        for i in range(5):
            video = sample_video.copy()
            video['title'] = f"Sample Video {i+1} for {username}"
            portfolio_videos.append(video)
        
        # Update profile with videos
        headers = {"Authorization": f"Bearer {token}"}
        requests.put(
            f"{BACKEND_URL}/profile",
            headers=headers,
            json={"portfolio_videos": portfolio_videos}
        )
        
        return {
            "token": token,
            "user_id": user_id,
            "username": username,
            "tier": tier,
            "user_type": user_type
        }
    
    except Exception as e:
        print(f"❌ Exception creating user {username}: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def get_profile(token):
    """Get user profile"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BACKEND_URL}/profile", headers=headers)
    if response.status_code == 200:
        return response.json()
    return None

def feature_video(token, video_index):
    """Feature a video"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(
        f"{BACKEND_URL}/profile/videos/{video_index}/feature",
        headers=headers
    )
    return response

def test_profile_endpoint_tracking_fields():
    """Test 1: Profile Endpoint Returns Tracking Fields"""
    print_section("TEST 1: Profile Endpoint Returns Tracking Fields")
    
    all_passed = True
    
    for tier in ['silver', 'gold']:
        user = test_users.get(f'entrepreneur_{tier}')
        if not user:
            print_test(f"Profile tracking fields for {tier}", False, "User not created")
            all_passed = False
            continue
        
        profile = get_profile(user['token'])
        if not profile:
            print_test(f"Profile tracking fields for {tier}", False, "Failed to get profile")
            all_passed = False
            continue
        
        # Check required fields
        has_counter = 'featured_videos_this_week' in profile
        has_reset = 'last_featured_video_reset' in profile
        has_tier = 'membership_tier' in profile
        
        passed = has_counter and has_reset and has_tier
        
        details = f"Counter: {profile.get('featured_videos_this_week', 'MISSING')}, " \
                  f"Reset: {profile.get('last_featured_video_reset', 'MISSING')}, " \
                  f"Tier: {profile.get('membership_tier', 'MISSING')}"
        
        print_test(f"Profile tracking fields for {tier} tier", passed, details)
        
        if not passed:
            all_passed = False
    
    return all_passed

def test_silver_tier_weekly_limit():
    """Test 2: Silver Tier Weekly Limit (1 video/week)"""
    print_section("TEST 2: Silver Tier Weekly Limit (1 video/week)")
    
    user = test_users.get('entrepreneur_silver')
    if not user:
        print_test("Silver tier limit", False, "User not created")
        return False
    
    # Feature 1st video - should succeed
    response = feature_video(user['token'], 0)
    test1_passed = response.status_code == 200
    print_test("Feature 1st video (Silver)", test1_passed, 
               f"Status: {response.status_code}, Response: {response.text[:200]}")
    
    # Check counter incremented
    profile = get_profile(user['token'])
    counter = profile.get('featured_videos_this_week', 0)
    test2_passed = counter == 1
    print_test("Counter incremented to 1", test2_passed, f"Counter: {counter}")
    
    # Unfeature the first video (to test "one at a time" doesn't interfere)
    feature_video(user['token'], 0)
    
    # Try to feature 2nd video - should fail with weekly limit
    response = feature_video(user['token'], 1)
    test3_passed = response.status_code == 429  # Too Many Requests
    
    try:
        error_data = response.json()
        error_msg = error_data.get('detail', '')
    except:
        error_msg = response.text
    
    # Check error message contains required info
    has_silver = 'Silver' in error_msg or 'silver' in error_msg
    has_limit = '1 video' in error_msg or '1video' in error_msg
    has_week = 'week' in error_msg.lower()
    has_reset = 'reset' in error_msg.lower() or 'day' in error_msg.lower()
    
    test4_passed = has_silver and has_limit and has_week and has_reset
    
    print_test("Feature 2nd video blocked (Silver)", test3_passed, 
               f"Status: {response.status_code}")
    print_test("Error message contains tier, limit, and reset info", test4_passed,
               f"Message: {error_msg}")
    
    return test1_passed and test2_passed and test3_passed and test4_passed

def test_gold_tier_weekly_limit():
    """Test 3: Gold Tier Weekly Limit (3 videos/week)"""
    print_section("TEST 3: Gold Tier Weekly Limit (3 videos/week)")
    
    user = test_users.get('entrepreneur_gold')
    if not user:
        print_test("Gold tier limit", False, "User not created")
        return False
    
    all_passed = True
    
    # Feature 1st video
    response = feature_video(user['token'], 0)
    test1_passed = response.status_code == 200
    profile = get_profile(user['token'])
    counter1 = profile.get('featured_videos_this_week', 0)
    print_test("Feature 1st video (Gold)", test1_passed, 
               f"Status: {response.status_code}, Counter: {counter1}")
    all_passed = all_passed and test1_passed and (counter1 == 1)
    
    # Unfeature 1st video to test multiple features (due to "one at a time" rule)
    feature_video(user['token'], 0)
    
    # Feature 2nd video
    response = feature_video(user['token'], 1)
    test2_passed = response.status_code == 200
    profile = get_profile(user['token'])
    counter2 = profile.get('featured_videos_this_week', 0)
    print_test("Feature 2nd video (Gold)", test2_passed, 
               f"Status: {response.status_code}, Counter: {counter2}")
    all_passed = all_passed and test2_passed and (counter2 == 2)
    
    # Unfeature 2nd video
    feature_video(user['token'], 1)
    
    # Feature 3rd video
    response = feature_video(user['token'], 2)
    test3_passed = response.status_code == 200
    profile = get_profile(user['token'])
    counter3 = profile.get('featured_videos_this_week', 0)
    print_test("Feature 3rd video (Gold)", test3_passed, 
               f"Status: {response.status_code}, Counter: {counter3}")
    all_passed = all_passed and test3_passed and (counter3 == 3)
    
    # Unfeature 3rd video
    feature_video(user['token'], 2)
    
    # Try to feature 4th video - should fail
    response = feature_video(user['token'], 3)
    test4_passed = response.status_code == 429
    
    try:
        error_data = response.json()
        error_msg = error_data.get('detail', '')
    except:
        error_msg = response.text
    
    has_gold = 'Gold' in error_msg or 'gold' in error_msg
    has_limit = '3 video' in error_msg
    has_week = 'week' in error_msg.lower()
    
    print_test("Feature 4th video blocked (Gold)", test4_passed, 
               f"Status: {response.status_code}")
    print_test("Error message contains Gold, 3 videos, and week", 
               has_gold and has_limit and has_week,
               f"Message: {error_msg}")
    
    all_passed = all_passed and test4_passed and has_gold and has_limit and has_week
    
    return all_passed

def test_basic_tier_blocked():
    """Test 4: Basic Tier Blocked"""
    print_section("TEST 4: Basic Tier Blocked")
    
    user = test_users.get('entrepreneur_basic')
    if not user:
        print_test("Basic tier blocked", False, "User not created")
        return False
    
    # Try to feature video - should fail immediately
    response = feature_video(user['token'], 0)
    test_passed = response.status_code == 403  # Forbidden
    
    try:
        error_data = response.json()
        error_msg = error_data.get('detail', '')
    except:
        error_msg = response.text
    
    has_upgrade_msg = 'upgrade' in error_msg.lower() or 'silver' in error_msg.lower() or 'gold' in error_msg.lower()
    
    print_test("Basic tier blocked from featuring", test_passed,
               f"Status: {response.status_code}, Message: {error_msg}")
    print_test("Error message mentions upgrade", has_upgrade_msg)
    
    return test_passed and has_upgrade_msg

def test_unfeature_and_feature_again():
    """Test 5: Unfeature and Feature Again"""
    print_section("TEST 5: Unfeature and Feature Again")
    
    # Create a fresh Silver user for this test
    timestamp = int(datetime.now().timestamp())
    user = create_test_user(
        f"silver_unfeature_{timestamp}",
        "testpass123",
        f"silver_unfeature_{timestamp}@test.com",
        "entrepreneur",
        "silver"
    )
    
    if not user:
        print_test("Unfeature test", False, "Failed to create test user")
        return False
    
    # Feature 1st video
    response = feature_video(user['token'], 0)
    test1_passed = response.status_code == 200
    profile = get_profile(user['token'])
    counter1 = profile.get('featured_videos_this_week', 0)
    print_test("Feature 1st video", test1_passed, f"Counter: {counter1}")
    
    # Unfeature the video
    response = feature_video(user['token'], 0)
    test2_passed = response.status_code == 200
    profile = get_profile(user['token'])
    counter2 = profile.get('featured_videos_this_week', 0)
    counter_decremented = counter2 == 0
    print_test("Unfeature video (counter should decrement)", test2_passed and counter_decremented, 
               f"Counter: {counter2} (expected: 0)")
    
    # Feature same or different video again
    response = feature_video(user['token'], 1)
    test3_passed = response.status_code == 200
    profile = get_profile(user['token'])
    counter3 = profile.get('featured_videos_this_week', 0)
    counter_incremented = counter3 == 1
    print_test("Feature another video after unfeature", test3_passed and counter_incremented, 
               f"Counter: {counter3} (expected: 1)")
    
    return test1_passed and test2_passed and counter_decremented and test3_passed and counter_incremented

def test_business_profiles():
    """Test 6: Business Profiles"""
    print_section("TEST 6: Business Profiles (Same Limits Apply)")
    
    all_passed = True
    
    # Test Silver business
    user_silver = test_users.get('business_silver')
    if user_silver:
        response = feature_video(user_silver['token'], 0)
        test1_passed = response.status_code == 200
        print_test("Business Silver - Feature 1st video", test1_passed,
                   f"Status: {response.status_code}")
        
        # Unfeature to test limit
        feature_video(user_silver['token'], 0)
        
        response = feature_video(user_silver['token'], 1)
        test2_passed = response.status_code == 429
        print_test("Business Silver - 2nd video blocked", test2_passed,
                   f"Status: {response.status_code}")
        
        all_passed = all_passed and test1_passed and test2_passed
    else:
        print_test("Business Silver test", False, "User not created")
        all_passed = False
    
    # Test Gold business
    user_gold = test_users.get('business_gold')
    if user_gold:
        # Feature 3 videos
        for i in range(3):
            response = feature_video(user_gold['token'], i)
            passed = response.status_code == 200
            print_test(f"Business Gold - Feature video {i+1}", passed,
                       f"Status: {response.status_code}")
            all_passed = all_passed and passed
            
            # Unfeature to allow next one (due to "one at a time" rule)
            if i < 2:
                feature_video(user_gold['token'], i)
        
        # Unfeature last one
        feature_video(user_gold['token'], 2)
        
        # Try 4th video - should fail
        response = feature_video(user_gold['token'], 3)
        test_passed = response.status_code == 429
        print_test("Business Gold - 4th video blocked", test_passed,
                   f"Status: {response.status_code}")
        all_passed = all_passed and test_passed
    else:
        print_test("Business Gold test", False, "User not created")
        all_passed = False
    
    return all_passed

def main():
    """Main test execution"""
    print_section("WGO4Y Backend Testing - Weekly Featured Video Limits")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Test Start Time: {datetime.now().isoformat()}")
    
    # Setup Phase: Create test accounts
    print_section("SETUP: Creating Test Accounts")
    
    timestamp = int(datetime.now().timestamp())
    
    # Entrepreneur accounts
    test_users['entrepreneur_silver'] = create_test_user(
        f"ent_silver_{timestamp}", "testpass123", 
        f"ent_silver_{timestamp}@test.com", "entrepreneur", "silver"
    )
    print(f"✓ Created Silver entrepreneur: {test_users['entrepreneur_silver']['username'] if test_users['entrepreneur_silver'] else 'FAILED'}")
    
    test_users['entrepreneur_gold'] = create_test_user(
        f"ent_gold_{timestamp}", "testpass123",
        f"ent_gold_{timestamp}@test.com", "entrepreneur", "gold"
    )
    print(f"✓ Created Gold entrepreneur: {test_users['entrepreneur_gold']['username'] if test_users['entrepreneur_gold'] else 'FAILED'}")
    
    test_users['entrepreneur_basic'] = create_test_user(
        f"ent_basic_{timestamp}", "testpass123",
        f"ent_basic_{timestamp}@test.com", "entrepreneur", "basic"
    )
    print(f"✓ Created Basic entrepreneur: {test_users['entrepreneur_basic']['username'] if test_users['entrepreneur_basic'] else 'FAILED'}")
    
    # Business accounts
    test_users['business_silver'] = create_test_user(
        f"biz_silver_{timestamp}", "testpass123",
        f"biz_silver_{timestamp}@test.com", "business", "silver"
    )
    print(f"✓ Created Silver business: {test_users['business_silver']['username'] if test_users['business_silver'] else 'FAILED'}")
    
    test_users['business_gold'] = create_test_user(
        f"biz_gold_{timestamp}", "testpass123",
        f"biz_gold_{timestamp}@test.com", "business", "gold"
    )
    print(f"✓ Created Gold business: {test_users['business_gold']['username'] if test_users['business_gold'] else 'FAILED'}")
    
    # Run tests
    results = {}
    
    results['Test 1: Profile Endpoint Tracking Fields'] = test_profile_endpoint_tracking_fields()
    results['Test 2: Silver Tier Weekly Limit'] = test_silver_tier_weekly_limit()
    results['Test 3: Gold Tier Weekly Limit'] = test_gold_tier_weekly_limit()
    results['Test 4: Basic Tier Blocked'] = test_basic_tier_blocked()
    results['Test 5: Unfeature and Feature Again'] = test_unfeature_and_feature_again()
    results['Test 6: Business Profiles'] = test_business_profiles()
    
    # Summary
    print_section("TEST SUMMARY")
    total_tests = len(results)
    passed_tests = sum(1 for result in results.values() if result)
    
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {passed_tests}")
    print(f"Failed: {total_tests - passed_tests}")
    print(f"\nSuccess Rate: {(passed_tests/total_tests)*100:.1f}%")
    
    print("\nDetailed Results:")
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {status} - {test_name}")
    
    print(f"\nTest End Time: {datetime.now().isoformat()}")
    
    return passed_tests == total_tests

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ FATAL ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
