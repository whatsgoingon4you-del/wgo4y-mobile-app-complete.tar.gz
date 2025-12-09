#!/usr/bin/env python3
"""
Backend Test: Job Board MVP - Complete Feature Testing
Tests all job board endpoints with tier-based application limits
"""

import requests
import json
import time
from datetime import datetime

# Backend URL from environment
BACKEND_URL = "https://218531ef-b8b5-427e-9d31-42563a974bff.preview.emergentagent.com/api"

# Test data
timestamp = int(time.time())

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
    log_section("JOB BOARD MVP - COMPREHENSIVE BACKEND TESTING")
    log_info(f"Backend URL: {BACKEND_URL}")
    log_info(f"Test timestamp: {timestamp}")
    
    # Test variables
    business_token = None
    business_user_id = None
    basic_worker_token = None
    basic_worker_user_id = None
    basic_worker_profile_id = None
    silver_worker_token = None
    silver_worker_user_id = None
    silver_worker_profile_id = None
    job1_id = None
    job2_id = None
    
    try:
        # ============= STEP 1: Create Business User (Gold Tier) =============
        log_section("STEP 1: Create Business User (Gold Tier)")
        
        business_username = f"venue_gold_{timestamp}"
        business_password = "SecurePass123!"
        
        response = requests.post(f"{BACKEND_URL}/auth/register", json={
            "username": business_username,
            "password": business_password,
            "email": f"{business_username}@test.com",
            "user_type": "business",
            "full_name": "Gold Venue LLC"
        })
        
        assert_test(response.status_code == 200, "Business user registration")
        
        if response.status_code == 200:
            data = response.json()
            business_token = data['token']
            business_user_id = data['user']['id']
            log_info(f"Business User ID: {business_user_id}")
            
            # Upgrade to Gold tier
            log_info("Upgrading business to Gold tier...")
            response = requests.put(
                f"{BACKEND_URL}/profile",
                headers={"Authorization": f"Bearer {business_token}"},
                json={
                    "membership_tier": "gold",
                    "business_name": "Gold Venue LLC",
                    "business_type": "nightclub",
                    "business_address": "123 Main St, Las Vegas, NV",
                    "business_phone": "555-0100"
                }
            )
            assert_test(response.status_code == 200, "Business tier upgrade to Gold")
        else:
            log_error(f"Failed to create business user: {response.text}")
            return
        
        # ============= STEP 2: Create Basic Worker User =============
        log_section("STEP 2: Create Basic Worker User")
        
        basic_worker_username = f"worker_basic_{timestamp}"
        basic_worker_password = "SecurePass456!"
        
        response = requests.post(f"{BACKEND_URL}/auth/register", json={
            "username": basic_worker_username,
            "password": basic_worker_password,
            "email": f"{basic_worker_username}@test.com",
            "user_type": "general_public",
            "full_name": "Basic Worker"
        })
        
        assert_test(response.status_code == 200, "Basic worker user registration")
        
        if response.status_code == 200:
            data = response.json()
            basic_worker_token = data['token']
            basic_worker_user_id = data['user']['id']
            log_info(f"Basic Worker User ID: {basic_worker_user_id}")
            
            # Create worker profile
            log_info("Creating worker profile for basic worker...")
            response = requests.post(
                f"{BACKEND_URL}/workers/apply",
                headers={"Authorization": f"Bearer {basic_worker_token}"},
                json={
                    "role": "DJ",
                    "city": "Las Vegas",
                    "state": "Nevada",
                    "experience": "5 years of experience in nightclubs",
                    "bio": "Professional DJ specializing in EDM and House music",
                    "why_join": "Want to connect with more venues"
                }
            )
            
            if response.status_code == 200:
                basic_worker_profile_id = response.json()['id']
                log_info(f"Basic Worker Profile ID: {basic_worker_profile_id}")
                
                # Approve worker profile (simulate admin approval)
                log_info("Approving basic worker profile...")
                # Direct database update would be needed here, but we'll test with the profile as-is
                # For testing, we need to manually approve via MongoDB or admin endpoint
                log_warning("Worker profile needs admin approval - will test with approved status")
            else:
                log_error(f"Failed to create worker profile: {response.text}")
        else:
            log_error(f"Failed to create basic worker user: {response.text}")
            return
        
        # ============= STEP 3: Create Silver Worker User =============
        log_section("STEP 3: Create Silver Worker User")
        
        silver_worker_username = f"worker_silver_{timestamp}"
        silver_worker_password = "SecurePass789!"
        
        response = requests.post(f"{BACKEND_URL}/auth/register", json={
            "username": silver_worker_username,
            "password": silver_worker_password,
            "email": f"{silver_worker_username}@test.com",
            "user_type": "general_public",
            "full_name": "Silver Worker"
        })
        
        assert_test(response.status_code == 200, "Silver worker user registration")
        
        if response.status_code == 200:
            data = response.json()
            silver_worker_token = data['token']
            silver_worker_user_id = data['user']['id']
            log_info(f"Silver Worker User ID: {silver_worker_user_id}")
            
            # Upgrade to Silver tier
            log_info("Upgrading worker to Silver tier...")
            response = requests.put(
                f"{BACKEND_URL}/profile",
                headers={"Authorization": f"Bearer {silver_worker_token}"},
                json={"membership_tier": "silver"}
            )
            assert_test(response.status_code == 200, "Worker tier upgrade to Silver")
            
            # Create worker profile
            log_info("Creating worker profile for silver worker...")
            response = requests.post(
                f"{BACKEND_URL}/workers/apply",
                headers={"Authorization": f"Bearer {silver_worker_token}"},
                json={
                    "role": "Security",
                    "city": "Las Vegas",
                    "state": "Nevada",
                    "experience": "10 years of security experience",
                    "bio": "Professional security guard with crowd management expertise",
                    "why_join": "Looking for more opportunities"
                }
            )
            
            if response.status_code == 200:
                silver_worker_profile_id = response.json()['id']
                log_info(f"Silver Worker Profile ID: {silver_worker_profile_id}")
                log_warning("Worker profile needs admin approval - will test with approved status")
            else:
                log_error(f"Failed to create worker profile: {response.text}")
        else:
            log_error(f"Failed to create silver worker user: {response.text}")
            return
        
        # ============= STEP 4: Test Job Posting (Premium Business Only) =============
        log_section("STEP 4: Test Job Posting (Premium Business Only)")
        
        # Test 4a: Business with Gold tier can post job
        log_info("Test 4a: Gold tier business posting job...")
        response = requests.post(
            f"{BACKEND_URL}/jobs",
            headers={"Authorization": f"Bearer {business_token}"},
            json={
                "title": "DJ Needed for Friday Night",
                "role": "DJ",
                "event_date": "2025-02-15",
                "city": "Las Vegas",
                "state": "Nevada",
                "pay": "$500 for 4 hours",
                "description": "Looking for an experienced DJ for our Friday night event. Must have own equipment."
            }
        )
        
        assert_test(response.status_code == 200, "Gold tier business can post job")
        
        if response.status_code == 200:
            job1_id = response.json()['id']
            log_info(f"Job 1 ID: {job1_id}")
        else:
            log_error(f"Failed to create job 1: {response.text}")
        
        # Test 4b: Create second job
        log_info("Test 4b: Creating second job posting...")
        response = requests.post(
            f"{BACKEND_URL}/jobs",
            headers={"Authorization": f"Bearer {business_token}"},
            json={
                "title": "Security Staff for Saturday Event",
                "role": "Security",
                "event_date": "2025-02-16",
                "city": "Las Vegas",
                "state": "Nevada",
                "pay": "$300 for 6 hours",
                "description": "Need experienced security staff for large event. Must be licensed."
            }
        )
        
        assert_test(response.status_code == 200, "Second job posting created")
        
        if response.status_code == 200:
            job2_id = response.json()['id']
            log_info(f"Job 2 ID: {job2_id}")
        else:
            log_error(f"Failed to create job 2: {response.text}")
        
        # Test 4c: Basic tier user cannot post job
        log_info("Test 4c: Basic tier user cannot post job...")
        response = requests.post(
            f"{BACKEND_URL}/jobs",
            headers={"Authorization": f"Bearer {basic_worker_token}"},
            json={
                "title": "Test Job",
                "role": "DJ",
                "city": "Las Vegas",
                "state": "Nevada",
                "description": "Test"
            }
        )
        
        # Should fail because: 1) GP users can't post jobs, 2) Basic tier
        assert_test(response.status_code == 403, "Basic tier GP user cannot post job")
        
        # ============= STEP 5: Test Browse Jobs =============
        log_section("STEP 5: Test Browse Jobs")
        
        # Note: Workers need approved profiles to browse jobs
        # Since we can't approve profiles in this test, we'll test with business view
        
        # Test 5a: Business can view their own jobs
        log_info("Test 5a: Business viewing their own jobs...")
        response = requests.get(
            f"{BACKEND_URL}/jobs",
            headers={"Authorization": f"Bearer {business_token}"}
        )
        
        assert_test(response.status_code == 200, "Business can view jobs")
        
        if response.status_code == 200:
            jobs = response.json()
            assert_test(len(jobs) >= 2, "Business sees their posted jobs")
            log_info(f"Business sees {len(jobs)} jobs")
        else:
            log_error(f"Failed to get jobs: {response.text}")
        
        # Test 5b: Filter by role
        log_info("Test 5b: Filtering jobs by role...")
        response = requests.get(
            f"{BACKEND_URL}/jobs?role=DJ",
            headers={"Authorization": f"Bearer {business_token}"}
        )
        
        if response.status_code == 200:
            jobs = response.json()
            dj_jobs = [j for j in jobs if j['role'] == 'DJ']
            assert_test(len(dj_jobs) >= 1, "Role filter works")
            log_info(f"Found {len(dj_jobs)} DJ jobs")
        
        # Test 5c: Filter by state
        log_info("Test 5c: Filtering jobs by state...")
        response = requests.get(
            f"{BACKEND_URL}/jobs?state=Nevada",
            headers={"Authorization": f"Bearer {business_token}"}
        )
        
        if response.status_code == 200:
            jobs = response.json()
            assert_test(len(jobs) >= 2, "State filter works")
            log_info(f"Found {len(jobs)} jobs in Nevada")
        
        # ============= STEP 6: Test View Single Job =============
        log_section("STEP 6: Test View Single Job")
        
        if job1_id:
            log_info(f"Viewing job details for Job 1 (ID: {job1_id})...")
            response = requests.get(
                f"{BACKEND_URL}/jobs/{job1_id}",
                headers={"Authorization": f"Bearer {business_token}"}
            )
            
            assert_test(response.status_code == 200, "Can view single job details")
            
            if response.status_code == 200:
                job = response.json()
                assert_test('title' in job, "Job has title")
                assert_test('role' in job, "Job has role")
                assert_test('description' in job, "Job has description")
                assert_test('city' in job, "Job has city")
                assert_test('state' in job, "Job has state")
                assert_test('status' in job, "Job has status")
                assert_test(job['status'] == 'open', "Job status is 'open'")
                log_info(f"Job details: {job['title']} - {job['role']}")
        
        # ============= STEP 7: Test My Posted Jobs =============
        log_section("STEP 7: Test My Posted Jobs")
        
        log_info("Business viewing their posted jobs...")
        response = requests.get(
            f"{BACKEND_URL}/jobs/my/posted",
            headers={"Authorization": f"Bearer {business_token}"}
        )
        
        assert_test(response.status_code == 200, "Business can view posted jobs")
        
        if response.status_code == 200:
            data = response.json()
            assert_test('jobs' in data, "Response has jobs array")
            assert_test('total_count' in data, "Response has total_count")
            assert_test(data['total_count'] >= 2, "Business has at least 2 posted jobs")
            log_info(f"Business has {data['total_count']} posted jobs")
        
        # ============= STEP 8: Test Worker Cannot Apply Without Approved Profile =============
        log_section("STEP 8: Test Worker Cannot Apply Without Approved Profile")
        
        if job1_id:
            log_info("Test 8: Worker without approved profile trying to apply...")
            response = requests.post(
                f"{BACKEND_URL}/jobs/{job1_id}/apply",
                headers={"Authorization": f"Bearer {basic_worker_token}"},
                json={"note": "I'm interested in this position"}
            )
            
            # Should fail with 403 because profile is not approved
            assert_test(response.status_code == 403, "Worker without approved profile cannot apply")
            
            if response.status_code == 403:
                log_info(f"Expected 403 error: {response.json().get('detail', '')}")
        
        # ============= MANUAL APPROVAL NOTICE =============
        log_section("MANUAL APPROVAL REQUIRED")
        log_warning("⚠️  TESTING LIMITATION: Worker profiles need admin approval")
        log_warning("⚠️  To test application limits and applicant viewing:")
        log_warning("⚠️  1. Manually approve worker profiles in MongoDB")
        log_warning("⚠️  2. Set status='approved' for both worker profiles")
        log_warning("⚠️  3. Re-run tests for application scenarios")
        log_info(f"Basic Worker Profile ID: {basic_worker_profile_id}")
        log_info(f"Silver Worker Profile ID: {silver_worker_profile_id}")
        
        # ============= STEP 9: Test My Applications (Empty) =============
        log_section("STEP 9: Test My Applications (Empty)")
        
        log_info("Basic worker viewing their applications (should be empty)...")
        response = requests.get(
            f"{BACKEND_URL}/jobs/my/applications",
            headers={"Authorization": f"Bearer {basic_worker_token}"}
        )
        
        assert_test(response.status_code == 200, "Worker can view their applications")
        
        if response.status_code == 200:
            data = response.json()
            assert_test('applications' in data, "Response has applications array")
            assert_test('total_count' in data, "Response has total_count")
            log_info(f"Worker has {data['total_count']} applications")
        
        # ============= STEP 10: Test View Job Applicants (Empty) =============
        log_section("STEP 10: Test View Job Applicants (Empty)")
        
        if job1_id:
            log_info("Business viewing applicants for Job 1...")
            response = requests.get(
                f"{BACKEND_URL}/jobs/{job1_id}/applicants",
                headers={"Authorization": f"Bearer {business_token}"}
            )
            
            assert_test(response.status_code == 200, "Business can view job applicants")
            
            if response.status_code == 200:
                data = response.json()
                assert_test('applicants' in data, "Response has applicants array")
                assert_test('total_count' in data, "Response has total_count")
                assert_test('job' in data, "Response has job details")
                log_info(f"Job has {data['total_count']} applicants")
        
        # Test 10b: Non-owner cannot view applicants
        if job1_id:
            log_info("Test 10b: Non-owner trying to view applicants...")
            response = requests.get(
                f"{BACKEND_URL}/jobs/{job1_id}/applicants",
                headers={"Authorization": f"Bearer {silver_worker_token}"}
            )
            
            assert_test(response.status_code == 403, "Non-owner cannot view applicants")
        
        # ============= STEP 11: Test Edge Cases =============
        log_section("STEP 11: Test Edge Cases")
        
        # Test 11a: Non-existent job
        log_info("Test 11a: Viewing non-existent job...")
        response = requests.get(
            f"{BACKEND_URL}/jobs/non-existent-job-id",
            headers={"Authorization": f"Bearer {business_token}"}
        )
        
        assert_test(response.status_code == 404, "Non-existent job returns 404")
        
        # Test 11b: Applying to non-existent job
        log_info("Test 11b: Applying to non-existent job...")
        response = requests.post(
            f"{BACKEND_URL}/jobs/non-existent-job-id/apply",
            headers={"Authorization": f"Bearer {basic_worker_token}"},
            json={"note": "Test"}
        )
        
        # Should fail with 403 (no approved profile) or 404 (job not found)
        assert_test(response.status_code in [403, 404], "Applying to non-existent job fails")
        
        # ============= FINAL SUMMARY =============
        log_section("TEST EXECUTION COMPLETE")
        log_info("✅ Core job board endpoints tested")
        log_info("✅ Premium tier validation tested")
        log_info("✅ Job posting and viewing tested")
        log_info("✅ Edge cases tested")
        log_warning("⚠️  Application limit testing requires approved worker profiles")
        log_warning("⚠️  Manual approval needed to test:")
        log_warning("    - Tier-based application limits (5 for Basic, 15 for Silver)")
        log_warning("    - Duplicate application prevention")
        log_warning("    - Notification to job owner on application")
        log_warning("    - Applicant details viewing")
        
    except Exception as e:
        log_error(f"Test execution failed with exception: {str(e)}")
        import traceback
        traceback.print_exc()
    
    finally:
        print_test_summary()

if __name__ == "__main__":
    main()
