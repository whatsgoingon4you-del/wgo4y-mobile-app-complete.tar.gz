#!/usr/bin/env python3
"""
Backend Test: API Endpoints Verification
Tests the specific API endpoints mentioned in the review request:
- POST /api/auth/login
- GET /api/profile  
- PUT /api/profile
"""

import requests
import json
import time
from datetime import datetime

# Backend URL from environment
BACKEND_URL = "https://profile-fixer-4.preview.emergentagent.com/api"

# Test data
timestamp = int(time.time())
test_username = f"api_test_user_{timestamp}"
test_password = "SecurePass123!"

# Color codes for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def log_success(message):
    print(f"{GREEN}✅ {message}{RESET}")

def log_error(message):
    print(f"{RED}❌ {message}{RESET}")

def log_info(message):
    print(f"{BLUE}ℹ️  {message}{RESET}")

def log_section(message):
    print(f"\n{BLUE}{'='*80}")
    print(f"  {message}")
    print(f"{'='*80}{RESET}\n")

# Test state
test_results = {
    'total': 0,
    'passed': 0,
    'failed': 0
}

def assert_test(condition, test_name):
    """Assert a test condition and track results"""
    test_results['total'] += 1
    if condition:
        test_results['passed'] += 1
        log_success(f"Test Passed: {test_name}")
        return True
    else:
        test_results['failed'] += 1
        log_error(f"Test Failed: {test_name}")
        return False

def print_test_summary():
    """Print final test summary"""
    log_section("TEST SUMMARY")
    print(f"Total Tests: {test_results['total']}")
    print(f"{GREEN}Passed: {test_results['passed']}{RESET}")
    print(f"{RED}Failed: {test_results['failed']}{RESET}")
    
    if test_results['failed'] == 0:
        log_success("ALL API ENDPOINTS WORKING! 🎉")
    else:
        log_error(f"{test_results['failed']} endpoint(s) failed")

def main():
    log_section("API ENDPOINTS VERIFICATION TEST")
    log_info(f"Backend URL: {BACKEND_URL}")
    log_info(f"Test timestamp: {timestamp}")
    
    # Test variables
    auth_token = None
    user_id = None
    
    try:
        # ============= TEST: POST /api/auth/login =============
        log_section("TEST: POST /api/auth/login")
        
        # First create a user to login with
        response = requests.post(f"{BACKEND_URL}/auth/register", json={
            "username": test_username,
            "password": test_password,
            "email": f"{test_username}@test.com",
            "user_type": "business",
            "full_name": "API Test User"
        })
        
        assert_test(response.status_code == 200, "User registration for login test")
        
        if response.status_code == 200:
            log_info("Test user created successfully")
        else:
            log_error(f"Failed to create test user: {response.text}")
            return
        
        # Now test the login endpoint
        response = requests.post(f"{BACKEND_URL}/auth/login", json={
            "username": test_username,
            "password": test_password
        })
        
        login_success = response.status_code == 200
        assert_test(login_success, "POST /api/auth/login endpoint")
        
        if login_success:
            data = response.json()
            auth_token = data.get('token')
            user_data = data.get('user', {})
            user_id = user_data.get('id')
            
            log_info("Login successful")
            log_info(f"Token received: {auth_token[:20]}..." if auth_token else "No token")
            log_info(f"User ID: {user_id}")
            
            # Verify token structure
            assert_test(auth_token is not None, "Login returns auth token")
            assert_test(user_id is not None, "Login returns user ID")
        else:
            log_error(f"Login failed: {response.text}")
            return
        
        # ============= TEST: GET /api/profile =============
        log_section("TEST: GET /api/profile")
        
        response = requests.get(
            f"{BACKEND_URL}/profile",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        get_profile_success = response.status_code == 200
        assert_test(get_profile_success, "GET /api/profile endpoint")
        
        if get_profile_success:
            profile_data = response.json()
            
            log_info("Profile retrieved successfully")
            log_info(f"Profile fields: {list(profile_data.keys())}")
            
            # Verify essential profile fields
            assert_test('id' in profile_data, "Profile contains user ID")
            assert_test('username' in profile_data, "Profile contains username")
            assert_test('email' in profile_data, "Profile contains email")
            assert_test('user_type' in profile_data, "Profile contains user_type")
            
            # Check business-specific fields
            if profile_data.get('user_type') == 'business':
                business_fields = ['business_name', 'business_photos', 'amenities']
                for field in business_fields:
                    field_exists = field in profile_data
                    assert_test(field_exists, f"Profile contains business field: {field}")
        else:
            log_error(f"Get profile failed: {response.text}")
            return
        
        # ============= TEST: PUT /api/profile =============
        log_section("TEST: PUT /api/profile")
        
        # Test profile update with various fields
        update_data = {
            "business_name": "Updated API Test Business",
            "business_description": "Updated via API endpoint test",
            "business_phone": "+1-555-999-8888",
            "amenities": ["WiFi", "Parking", "Updated Amenity"],
            "business_photos": [
                "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
            ]
        }
        
        response = requests.put(
            f"{BACKEND_URL}/profile",
            headers={"Authorization": f"Bearer {auth_token}"},
            json=update_data
        )
        
        put_profile_success = response.status_code == 200
        assert_test(put_profile_success, "PUT /api/profile endpoint")
        
        if put_profile_success:
            updated_profile = response.json()
            
            log_info("Profile updated successfully")
            
            # Verify the updates were applied
            assert_test(
                updated_profile.get('business_name') == update_data['business_name'],
                "Business name updated correctly"
            )
            assert_test(
                updated_profile.get('business_description') == update_data['business_description'],
                "Business description updated correctly"
            )
            assert_test(
                updated_profile.get('business_phone') == update_data['business_phone'],
                "Business phone updated correctly"
            )
            assert_test(
                len(updated_profile.get('business_photos', [])) > 0,
                "Business photos updated correctly"
            )
            
            # Check that photos have approval metadata
            photos = updated_profile.get('business_photos', [])
            if photos:
                first_photo = photos[0]
                if isinstance(first_photo, dict):
                    assert_test(
                        'approval_status' in first_photo,
                        "Photos have approval metadata"
                    )
                    log_info(f"Photo approval status: {first_photo.get('approval_status')}")
        else:
            log_error(f"Put profile failed: {response.text}")
            
            # Try to parse error details
            try:
                error_data = response.json()
                log_error(f"Error details: {json.dumps(error_data, indent=2)}")
            except:
                pass
        
        # ============= TEST: Multiple Profile Updates =============
        log_section("TEST: Multiple Profile Updates (Regression Test)")
        
        # Test multiple consecutive updates to ensure no validation issues
        for i in range(3):
            log_info(f"Update test {i+1}/3")
            
            response = requests.put(
                f"{BACKEND_URL}/profile",
                headers={"Authorization": f"Bearer {auth_token}"},
                json={
                    "business_description": f"Multiple update test #{i+1}",
                    "amenities": ["WiFi", "Parking", f"Test Amenity {i+1}"]
                }
            )
            
            assert_test(
                response.status_code == 200,
                f"Multiple profile update {i+1}"
            )
            
            if response.status_code != 200:
                log_error(f"Multiple update {i+1} failed: {response.text}")
                break
            
            time.sleep(0.5)  # Small delay between requests
        
        # ============= TEST: Profile with Existing Photos =============
        log_section("TEST: Profile Update with Existing Photos (Critical)")
        
        # Get current profile to get existing photos
        response = requests.get(
            f"{BACKEND_URL}/profile",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if response.status_code == 200:
            current_profile = response.json()
            existing_photos = current_profile.get('business_photos', [])
            
            log_info(f"Current photos count: {len(existing_photos)}")
            
            # Send back the existing photos (this was causing 422 errors)
            response = requests.put(
                f"{BACKEND_URL}/profile",
                headers={"Authorization": f"Bearer {auth_token}"},
                json={
                    "business_description": "Testing with existing photos",
                    "business_photos": existing_photos  # Send back existing photos
                }
            )
            
            critical_test_success = response.status_code == 200
            assert_test(
                critical_test_success,
                "CRITICAL: Profile update with existing photos (no 422 error)"
            )
            
            if critical_test_success:
                log_success("✅ CRITICAL TEST PASSED: No 422 validation error with existing photos")
            else:
                log_error(f"❌ CRITICAL TEST FAILED: Got {response.status_code} instead of 200")
                log_error(f"Response: {response.text}")
        
        # ============= FINAL SUMMARY =============
        print_test_summary()
        
        # Print endpoint status
        log_section("API ENDPOINT STATUS")
        
        print(f"POST /api/auth/login: {'✅ WORKING' if login_success else '❌ FAILED'}")
        print(f"GET /api/profile: {'✅ WORKING' if get_profile_success else '❌ FAILED'}")
        print(f"PUT /api/profile: {'✅ WORKING' if put_profile_success else '❌ FAILED'}")
        
        if test_results['failed'] == 0:
            log_success("🎉 ALL API ENDPOINTS WORKING CORRECTLY!")
            log_success("Business profile management APIs are ready for production!")
        else:
            log_error(f"❌ {test_results['failed']} API ISSUE(S) FOUND")
            log_error("Please review the failed tests above")
        
    except Exception as e:
        log_error(f"Test execution error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()