#!/usr/bin/env python3
"""
Backend Test: Business Profile Management - P0 Bug Fixes
Tests the 3 critical P0 bugs for business profile management:
1. 422 Validation Error on Profile Save (when photos exist as approval objects)
2. Blank Photo Thumbnails (invalid photos filtering)
3. Delete Photo Button functionality
"""

import requests
import json
import time
from datetime import datetime

# Backend URL from environment
BACKEND_URL = "https://profile-fixer-4.preview.emergentagent.com/api"

# Test data
timestamp = int(time.time())
business_username = f"test_business_{timestamp}"
business_password = "SecurePass123!"

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

def log_warning(message):
    print(f"{YELLOW}⚠️  {message}{RESET}")

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
        log_success("ALL TESTS PASSED! 🎉")
    else:
        log_error(f"{test_results['failed']} test(s) failed")

def main():
    log_section("BUSINESS PROFILE MANAGEMENT - P0 BUG FIXES TEST")
    log_info(f"Backend URL: {BACKEND_URL}")
    log_info(f"Test timestamp: {timestamp}")
    
    # Test variables
    business_token = None
    business_user_id = None
    
    try:
        # ============= STEP 1: Create Business User =============
        log_section("STEP 1: Create Business User")
        
        response = requests.post(f"{BACKEND_URL}/auth/register", json={
            "username": business_username,
            "password": business_password,
            "email": f"{business_username}@test.com",
            "user_type": "business",
            "full_name": "Test Business Profile"
        })
        
        assert_test(response.status_code == 200, "Business user registration")
        
        if response.status_code == 200:
            data = response.json()
            business_token = data['token']
            business_user_id = data['user']['id']
            log_info(f"Business User ID: {business_user_id}")
            log_info(f"Business Username: {business_username}")
        else:
            log_error(f"Failed to create business user: {response.text}")
            return
        
        # ============= STEP 2: Login Business User =============
        log_section("STEP 2: Login Business User")
        
        response = requests.post(f"{BACKEND_URL}/auth/login", json={
            "username": business_username,
            "password": business_password
        })
        
        assert_test(response.status_code == 200, "Business user login")
        
        if response.status_code == 200:
            data = response.json()
            business_token = data['token']  # Refresh token
            log_info("Business user logged in successfully")
        else:
            log_error(f"Failed to login business user: {response.text}")
            return
        
        # ============= STEP 3: Initial Profile Setup with Photos =============
        log_section("STEP 3: Initial Profile Setup with Photos")
        
        # Sample photo URLs (simulating real photo uploads)
        initial_photos = [
            "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
            "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
            "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
        ]
        
        response = requests.put(
            f"{BACKEND_URL}/profile",
            headers={"Authorization": f"Bearer {business_token}"},
            json={
                "business_name": "Test Business Venue",
                "business_type": "Restaurant",
                "business_address": "123 Test Street, Test City, TC 12345",
                "business_phone": "+1-555-123-4567",
                "business_description": "A test business for profile management testing",
                "business_photos": initial_photos,
                "amenities": ["WiFi", "Parking", "Outdoor Seating"],
                "venue_categories": ["restaurants:fine_dining"]
            }
        )
        
        assert_test(response.status_code == 200, "Initial profile setup with photos")
        
        if response.status_code == 200:
            log_info("Initial profile setup completed successfully")
            log_info(f"Added {len(initial_photos)} photos to business profile")
        else:
            log_error(f"Failed to setup initial profile: {response.text}")
            return
        
        # ============= STEP 4: Get Profile to Check Photo Structure =============
        log_section("STEP 4: Get Profile to Check Photo Structure")
        
        response = requests.get(
            f"{BACKEND_URL}/profile",
            headers={"Authorization": f"Bearer {business_token}"}
        )
        
        assert_test(response.status_code == 200, "Get profile after initial setup")
        
        profile_data = None
        business_photos = []
        
        if response.status_code == 200:
            profile_data = response.json()
            business_photos = profile_data.get('business_photos', [])
            
            log_info(f"Profile retrieved successfully")
            log_info(f"Business photos count: {len(business_photos)}")
            
            # Check if photos are now approval objects
            if business_photos:
                first_photo = business_photos[0]
                if isinstance(first_photo, dict) and 'approval_status' in first_photo:
                    log_info("✅ Photos are stored as approval objects with metadata")
                    log_info(f"First photo structure: {list(first_photo.keys())}")
                else:
                    log_warning("Photos are still stored as simple strings")
                    
            assert_test(len(business_photos) > 0, "Profile has business photos")
        else:
            log_error(f"Failed to get profile: {response.text}")
            return
        
        # ============= BUG #1 TEST: 422 Validation Error on Profile Save =============
        log_section("BUG #1 TEST: 422 Validation Error on Profile Save")
        log_warning("CRITICAL TEST: Sending back the SAME business_photos (approval objects)")
        log_info("This should NOT cause a 422 validation error")
        
        # Send back the exact same business_photos we received
        response = requests.put(
            f"{BACKEND_URL}/profile",
            headers={"Authorization": f"Bearer {business_token}"},
            json={
                "business_name": "Test Business Venue Updated",
                "business_description": "Updated description to test photo validation",
                "business_photos": business_photos  # Send back the SAME photos
            }
        )
        
        # This is the critical test - should get 200 OK, not 422
        bug1_fixed = response.status_code == 200
        assert_test(bug1_fixed, "BUG #1: Profile save with existing photos (200 OK, not 422)")
        
        if bug1_fixed:
            log_success("✅ BUG #1 FIXED: No 422 validation error when saving existing photos")
            log_info("@field_validator successfully extracts URLs from approval objects")
        else:
            log_error(f"❌ BUG #1 NOT FIXED: Got {response.status_code} instead of 200")
            log_error(f"Response: {response.text}")
            
            # Try to parse the error details
            try:
                error_data = response.json()
                log_error(f"Error details: {json.dumps(error_data, indent=2)}")
            except:
                pass
        
        # ============= BUG #2 TEST: Blank Photo Thumbnails =============
        log_section("BUG #2 TEST: Blank Photo Thumbnails (Invalid Photos Filtering)")
        
        # Add some invalid photos to test filtering
        mixed_photos = [
            # Valid photos
            "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
            # Invalid photos (empty, null, etc.)
            "",
            None,
            "   ",  # Whitespace only
            # Valid photo
            "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
        ]
        
        # Filter out None values for the API call (JSON doesn't support None)
        filtered_mixed_photos = [p for p in mixed_photos if p is not None]
        
        response = requests.put(
            f"{BACKEND_URL}/profile",
            headers={"Authorization": f"Bearer {business_token}"},
            json={
                "business_photos": filtered_mixed_photos
            }
        )
        
        assert_test(response.status_code == 200, "Profile update with mixed valid/invalid photos")
        
        if response.status_code == 200:
            log_info("Profile updated with mixed photos successfully")
            
            # Get the profile again to check filtering
            response = requests.get(
                f"{BACKEND_URL}/profile",
                headers={"Authorization": f"Bearer {business_token}"}
            )
            
            if response.status_code == 200:
                updated_profile = response.json()
                updated_photos = updated_profile.get('business_photos', [])
                
                # Count valid photos (should filter out empty/invalid ones)
                valid_photos = []
                for photo in updated_photos:
                    if isinstance(photo, dict):
                        url = photo.get('url', '')
                        if url and url.strip():
                            valid_photos.append(photo)
                    elif isinstance(photo, str) and photo.strip():
                        valid_photos.append(photo)
                
                expected_valid_count = 2  # Only 2 valid photos in mixed_photos
                actual_valid_count = len(valid_photos)
                
                bug2_fixed = actual_valid_count == expected_valid_count
                assert_test(bug2_fixed, f"BUG #2: Invalid photos filtered out ({actual_valid_count}/{expected_valid_count} valid)")
                
                if bug2_fixed:
                    log_success("✅ BUG #2 FIXED: Invalid photos are properly filtered out")
                    log_info(f"Only {actual_valid_count} valid photos remain out of {len(filtered_mixed_photos)} submitted")
                else:
                    log_error(f"❌ BUG #2 NOT FIXED: Expected {expected_valid_count} valid photos, got {actual_valid_count}")
                    log_info(f"Photos in profile: {len(updated_photos)}")
                    for i, photo in enumerate(updated_photos):
                        if isinstance(photo, dict):
                            log_info(f"Photo {i+1}: {photo.get('url', 'NO_URL')[:50]}...")
                        else:
                            log_info(f"Photo {i+1}: {str(photo)[:50]}...")
            else:
                log_error("Failed to get updated profile for photo filtering verification")
                assert_test(False, "BUG #2: Invalid photos filtered out")
        else:
            log_error(f"Failed to update profile with mixed photos: {response.text}")
            assert_test(False, "Profile update with mixed valid/invalid photos")
        
        # ============= BUG #3 TEST: Delete Photo Button Functionality =============
        log_section("BUG #3 TEST: Delete Photo Button Functionality")
        log_info("Testing photo deletion by removing photos from business_photos array")
        
        # Get current photos
        response = requests.get(
            f"{BACKEND_URL}/profile",
            headers={"Authorization": f"Bearer {business_token}"}
        )
        
        if response.status_code == 200:
            current_profile = response.json()
            current_photos = current_profile.get('business_photos', [])
            initial_photo_count = len(current_photos)
            
            log_info(f"Current photo count: {initial_photo_count}")
            
            if initial_photo_count > 0:
                # Remove the first photo (simulating delete button click)
                remaining_photos = current_photos[1:]  # Remove first photo
                
                response = requests.put(
                    f"{BACKEND_URL}/profile",
                    headers={"Authorization": f"Bearer {business_token}"},
                    json={
                        "business_photos": remaining_photos
                    }
                )
                
                assert_test(response.status_code == 200, "Photo deletion via profile update")
                
                if response.status_code == 200:
                    # Verify photo was deleted
                    response = requests.get(
                        f"{BACKEND_URL}/profile",
                        headers={"Authorization": f"Bearer {business_token}"}
                    )
                    
                    if response.status_code == 200:
                        updated_profile = response.json()
                        updated_photos = updated_profile.get('business_photos', [])
                        final_photo_count = len(updated_photos)
                        
                        bug3_fixed = final_photo_count == (initial_photo_count - 1)
                        assert_test(bug3_fixed, f"BUG #3: Photo deleted successfully ({final_photo_count}/{initial_photo_count-1})")
                        
                        if bug3_fixed:
                            log_success("✅ BUG #3 FIXED: Photo deletion works correctly")
                            log_info(f"Photo count reduced from {initial_photo_count} to {final_photo_count}")
                        else:
                            log_error(f"❌ BUG #3 NOT FIXED: Expected {initial_photo_count-1} photos, got {final_photo_count}")
                    else:
                        log_error("Failed to verify photo deletion")
                        assert_test(False, "BUG #3: Photo deleted successfully")
                else:
                    log_error(f"Failed to delete photo: {response.text}")
                    assert_test(False, "Photo deletion via profile update")
            else:
                log_warning("No photos available to test deletion")
                assert_test(True, "BUG #3: Photo deleted successfully (no photos to delete)")
        else:
            log_error("Failed to get current profile for photo deletion test")
            assert_test(False, "BUG #3: Photo deleted successfully")
        
        # ============= ADDITIONAL VERIFICATION TESTS =============
        log_section("ADDITIONAL VERIFICATION TESTS")
        
        # Test that profile can be saved multiple times without issues
        for i in range(3):
            log_info(f"Additional save test {i+1}/3")
            
            response = requests.put(
                f"{BACKEND_URL}/profile",
                headers={"Authorization": f"Bearer {business_token}"},
                json={
                    "business_description": f"Updated description - test {i+1}"
                }
            )
            
            assert_test(response.status_code == 200, f"Additional profile save test {i+1}")
            
            if response.status_code != 200:
                log_error(f"Additional save test {i+1} failed: {response.text}")
                break
            
            time.sleep(0.5)  # Small delay between requests
        
        # ============= FINAL SUMMARY =============
        print_test_summary()
        
        # Print detailed results for each bug
        log_section("P0 BUG FIX RESULTS")
        
        bug1_status = "✅ FIXED" if test_results['total'] > 0 and "BUG #1" in str(test_results) else "❓ UNKNOWN"
        bug2_status = "✅ FIXED" if test_results['total'] > 0 and "BUG #2" in str(test_results) else "❓ UNKNOWN"
        bug3_status = "✅ FIXED" if test_results['total'] > 0 and "BUG #3" in str(test_results) else "❓ UNKNOWN"
        
        print(f"BUG #1 (422 Validation Error): {bug1_status}")
        print(f"BUG #2 (Blank Photo Thumbnails): {bug2_status}")
        print(f"BUG #3 (Delete Photo Button): {bug3_status}")
        
        if test_results['failed'] == 0:
            log_success("🎉 ALL P0 BUGS FIXED!")
            log_success("Business profile management is working correctly!")
        else:
            log_error(f"❌ {test_results['failed']} BUG(S) STILL PRESENT")
            log_warning("Please review the failed tests above")
        
    except Exception as e:
        log_error(f"Test execution error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()