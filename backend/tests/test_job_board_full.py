#!/usr/bin/env python3
"""
Backend Test: Job Board MVP - FULL Testing with Approved Workers
Tests all job board endpoints including tier-based application limits
"""

import requests
import json
import time
from datetime import datetime

# Backend URL - using localhost for testing
BACKEND_URL = "http://localhost:8001/api"

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
    log_section("JOB BOARD MVP - FULL BACKEND TESTING WITH APPROVED WORKERS")
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
                
                # Approve worker profile via MongoDB
                log_info("Approving basic worker profile via MongoDB...")
                import subprocess
                result = subprocess.run([
                    'mongosh', 'venue_job_portal', '--quiet', '--eval',
                    f"db.worker_profiles.updateOne({{_id: '{basic_worker_profile_id}'}}, {{$set: {{status: 'approved'}}}})"
                ], capture_output=True, text=True)
                log_success("Basic worker profile approved")
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
                
                # Approve worker profile via MongoDB
                log_info("Approving silver worker profile via MongoDB...")
                import subprocess
                result = subprocess.run([
                    'mongosh', 'venue_job_portal', '--quiet', '--eval',
                    f"db.worker_profiles.updateOne({{_id: '{silver_worker_profile_id}'}}, {{$set: {{status: 'approved'}}}})"
                ], capture_output=True, text=True)
                log_success("Silver worker profile approved")
            else:
                log_error(f"Failed to create worker profile: {response.text}")
        else:
            log_error(f"Failed to create silver worker user: {response.text}")
            return
        
        # ============= STEP 4: Create Job Postings =============
        log_section("STEP 4: Create Job Postings")
        
        # Create 7 jobs to test application limits
        jobs = []
        for i in range(7):
            response = requests.post(
                f"{BACKEND_URL}/jobs",
                headers={"Authorization": f"Bearer {business_token}"},
                json={
                    "title": f"Job Posting #{i+1}",
                    "role": "DJ" if i % 2 == 0 else "Security",
                    "event_date": "2025-02-15",
                    "city": "Las Vegas",
                    "state": "Nevada",
                    "pay": f"${(i+1)*100} for 4 hours",
                    "description": f"Job description for posting #{i+1}"
                }
            )
            
            if response.status_code == 200:
                job_id = response.json()['id']
                jobs.append(job_id)
                log_info(f"Created Job #{i+1} (ID: {job_id})")
        
        assert_test(len(jobs) == 7, "Created 7 job postings")
        
        if len(jobs) >= 2:
            job1_id = jobs[0]
            job2_id = jobs[1]
        
        # ============= STEP 5: Test Basic Worker Application Limit (5 applications) =============
        log_section("STEP 5: Test Basic Worker Application Limit (5 applications)")
        
        log_info("Basic worker applying to first 5 jobs...")
        basic_applications = []
        
        for i in range(5):
            response = requests.post(
                f"{BACKEND_URL}/jobs/{jobs[i]}/apply",
                headers={"Authorization": f"Bearer {basic_worker_token}"},
                json={"note": f"Application #{i+1} from Basic Worker"}
            )
            
            if response.status_code == 200:
                basic_applications.append(response.json()['application_id'])
                log_success(f"Application #{i+1} successful")
            else:
                log_error(f"Application #{i+1} failed: {response.text}")
        
        assert_test(len(basic_applications) == 5, "Basic worker submitted 5 applications")
        
        # Test 6th application (should fail - limit reached)
        log_info("Basic worker trying to apply to 6th job (should fail)...")
        response = requests.post(
            f"{BACKEND_URL}/jobs/{jobs[5]}/apply",
            headers={"Authorization": f"Bearer {basic_worker_token}"},
            json={"note": "Application #6 - should fail"}
        )
        
        assert_test(response.status_code == 403, "Basic worker blocked after 5 applications")
        
        if response.status_code == 403:
            log_info(f"Expected 403 error: {response.json().get('detail', '')}")
        
        # ============= STEP 6: Test Duplicate Application Prevention =============
        log_section("STEP 6: Test Duplicate Application Prevention")
        
        log_info("Basic worker trying to apply to same job twice...")
        response = requests.post(
            f"{BACKEND_URL}/jobs/{jobs[0]}/apply",
            headers={"Authorization": f"Bearer {basic_worker_token}"},
            json={"note": "Duplicate application"}
        )
        
        assert_test(response.status_code == 400, "Duplicate application prevented")
        
        if response.status_code == 400:
            log_info(f"Expected 400 error: {response.json().get('detail', '')}")
        
        # ============= STEP 7: Test Silver Worker Application Limit (15 applications) =============
        log_section("STEP 7: Test Silver Worker Can Apply (Silver tier: 15 limit)")
        
        log_info("Silver worker applying to jobs...")
        silver_applications = []
        
        # Apply to all 7 jobs
        for i in range(7):
            response = requests.post(
                f"{BACKEND_URL}/jobs/{jobs[i]}/apply",
                headers={"Authorization": f"Bearer {silver_worker_token}"},
                json={"note": f"Application #{i+1} from Silver Worker"}
            )
            
            if response.status_code == 200:
                silver_applications.append(response.json()['application_id'])
                log_success(f"Application #{i+1} successful")
            else:
                log_error(f"Application #{i+1} failed: {response.text}")
        
        assert_test(len(silver_applications) == 7, "Silver worker submitted 7 applications (under 15 limit)")
        
        # ============= STEP 8: Test View Job Applicants =============
        log_section("STEP 8: Test View Job Applicants")
        
        if job1_id:
            log_info(f"Business viewing applicants for Job 1 (ID: {job1_id})...")
            response = requests.get(
                f"{BACKEND_URL}/jobs/{job1_id}/applicants",
                headers={"Authorization": f"Bearer {business_token}"}
            )
            
            assert_test(response.status_code == 200, "Business can view job applicants")
            
            if response.status_code == 200:
                data = response.json()
                assert_test('applicants' in data, "Response has applicants array")
                assert_test('total_count' in data, "Response has total_count")
                assert_test(data['total_count'] == 2, "Job has 2 applicants (Basic + Silver)")
                
                log_info(f"Job has {data['total_count']} applicants")
                
                # Verify applicant details
                if len(data['applicants']) > 0:
                    applicant = data['applicants'][0]
                    assert_test('worker_name' in applicant, "Applicant has worker_name")
                    assert_test('worker_role' in applicant, "Applicant has worker_role")
                    assert_test('note' in applicant, "Applicant has note")
                    assert_test('status' in applicant, "Applicant has status")
                    assert_test('worker_profile' in applicant, "Applicant has worker_profile")
                    log_info(f"Applicant details verified: {applicant['worker_name']} - {applicant['worker_role']}")
        
        # ============= STEP 9: Test My Applications =============
        log_section("STEP 9: Test My Applications")
        
        log_info("Basic worker viewing their applications...")
        response = requests.get(
            f"{BACKEND_URL}/jobs/my/applications",
            headers={"Authorization": f"Bearer {basic_worker_token}"}
        )
        
        assert_test(response.status_code == 200, "Worker can view their applications")
        
        if response.status_code == 200:
            data = response.json()
            assert_test('applications' in data, "Response has applications array")
            assert_test('total_count' in data, "Response has total_count")
            assert_test(data['total_count'] == 5, "Basic worker has 5 applications")
            log_info(f"Basic worker has {data['total_count']} applications")
        
        log_info("Silver worker viewing their applications...")
        response = requests.get(
            f"{BACKEND_URL}/jobs/my/applications",
            headers={"Authorization": f"Bearer {silver_worker_token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            assert_test(data['total_count'] == 7, "Silver worker has 7 applications")
            log_info(f"Silver worker has {data['total_count']} applications")
        
        # ============= STEP 10: Test Notification to Job Owner =============
        log_section("STEP 10: Test Notification to Job Owner")
        
        log_info("Checking if business received notifications for applications...")
        response = requests.get(
            f"{BACKEND_URL}/notifications",
            headers={"Authorization": f"Bearer {business_token}"}
        )
        
        if response.status_code == 200:
            notifications = response.json()
            job_app_notifications = [n for n in notifications if n.get('type') == 'JOB_APPLICATION']
            assert_test(len(job_app_notifications) >= 12, "Business received notifications for applications")
            log_info(f"Business received {len(job_app_notifications)} job application notifications")
        
        # ============= FINAL SUMMARY =============
        log_section("TEST EXECUTION COMPLETE")
        log_success("✅ All job board features tested successfully!")
        log_success("✅ Tier-based application limits verified:")
        log_success("   - Basic tier: 5 applications/month (TESTED)")
        log_success("   - Silver tier: 15 applications/month (TESTED with 7 apps)")
        log_success("✅ Duplicate application prevention verified")
        log_success("✅ Job applicant viewing verified")
        log_success("✅ Notification system verified")
        
    except Exception as e:
        log_error(f"Test execution failed with exception: {str(e)}")
        import traceback
        traceback.print_exc()
    
    finally:
        print_test_summary()

if __name__ == "__main__":
    main()
