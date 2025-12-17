#!/usr/bin/env python3
"""
Backend Test: Message Archive Un-archive on Contact Request
Tests the un-archive logic when Business sends Request Contact to Worker after archiving
"""

import requests
import json
import time
from datetime import datetime

# Backend URL from environment
BACKEND_URL = "https://test-ready-preview.preview.emergentagent.com/api"

# Test data
timestamp = int(time.time())
business_username = f"club_h3_{timestamp}"
business_password = "SecurePass123!"
worker_username = f"dj_smooth_{timestamp}"
worker_password = "SecurePass456!"

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
    log_section("MESSAGE ARCHIVE UN-ARCHIVE TEST - WORKER CONTACT REQUEST")
    log_info(f"Backend URL: {BACKEND_URL}")
    log_info(f"Test timestamp: {timestamp}")
    
    # Test variables
    business_token = None
    business_user_id = None
    worker_token = None
    worker_user_id = None
    worker_profile_id = None
    
    try:
        # ============= STEP 1: Create Business User =============
        log_section("STEP 1: Create Business User (Club H3)")
        
        response = requests.post(f"{BACKEND_URL}/auth/register", json={
            "username": business_username,
            "password": business_password,
            "email": f"{business_username}@test.com",
            "user_type": "business",
            "full_name": "Club H3"
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
        
        # ============= STEP 2: Upgrade Business to Appreciation Tier =============
        log_section("STEP 2: Upgrade Business to Appreciation Tier")
        
        response = requests.put(
            f"{BACKEND_URL}/profile",
            headers={"Authorization": f"Bearer {business_token}"},
            json={
                "membership_tier": "appreciation",
                "business_name": "Club H3 Las Vegas"
            }
        )
        
        assert_test(response.status_code == 200, "Business tier upgrade to Appreciation")
        
        if response.status_code == 200:
            log_info("Business upgraded to Appreciation tier (messaging enabled)")
        else:
            log_error(f"Failed to upgrade business tier: {response.text}")
            return
        
        # ============= STEP 3: Create Worker User =============
        log_section("STEP 3: Create Worker User (DJ Smooth)")
        
        response = requests.post(f"{BACKEND_URL}/auth/register", json={
            "username": worker_username,
            "password": worker_password,
            "email": f"{worker_username}@test.com",
            "user_type": "entrepreneur",
            "full_name": "DJ Smooth"
        })
        
        assert_test(response.status_code == 200, "Worker user registration")
        
        if response.status_code == 200:
            data = response.json()
            worker_token = data['token']
            worker_user_id = data['user']['id']
            log_info(f"Worker User ID: {worker_user_id}")
            log_info(f"Worker Username: {worker_username}")
        else:
            log_error(f"Failed to create worker user: {response.text}")
            return
        
        # ============= STEP 4: Upgrade Worker to Appreciation Tier =============
        log_section("STEP 4: Upgrade Worker to Appreciation Tier")
        
        response = requests.put(
            f"{BACKEND_URL}/profile",
            headers={"Authorization": f"Bearer {worker_token}"},
            json={
                "membership_tier": "appreciation"
            }
        )
        
        assert_test(response.status_code == 200, "Worker tier upgrade to Appreciation")
        
        if response.status_code == 200:
            log_info("Worker upgraded to Appreciation tier (messaging enabled)")
        else:
            log_error(f"Failed to upgrade worker tier: {response.text}")
            return
        
        # ============= STEP 5: Create Worker Profile =============
        log_section("STEP 5: Create Worker Profile")
        
        response = requests.post(
            f"{BACKEND_URL}/workers/apply",
            headers={"Authorization": f"Bearer {worker_token}"},
            json={
                "role": "DJ",
                "city": "Las Vegas",
                "state": "Nevada",
                "experience": "10+ years of experience in nightclub and event DJing",
                "bio": "Professional DJ specializing in EDM and Hip-Hop",
                "why_join": "Want to connect with more venues and expand my network"
            }
        )
        
        assert_test(response.status_code == 200, "Worker profile creation")
        
        if response.status_code == 200:
            data = response.json()
            worker_profile_id = data['id']
            log_info(f"Worker Profile ID: {worker_profile_id}")
        else:
            log_error(f"Failed to create worker profile: {response.text}")
            return
        
        # ============= STEP 6: Business Sends Initial Message to Worker =============
        log_section("STEP 6: Business Sends Initial Message to Worker")
        
        response = requests.post(
            f"{BACKEND_URL}/messages",
            headers={"Authorization": f"Bearer {business_token}"},
            json={
                "to_user": worker_user_id,
                "content": "Hi DJ Smooth! We're interested in booking you for our Friday night event."
            }
        )
        
        assert_test(response.status_code == 200, "Initial message sent from Business to Worker")
        
        if response.status_code == 200:
            log_info("Initial message sent successfully")
        else:
            log_error(f"Failed to send initial message: {response.text}")
            return
        
        # Small delay to ensure message is processed
        time.sleep(1)
        
        # ============= STEP 7: Verify Both Users See Each Other in Contacts =============
        log_section("STEP 7: Verify Both Users See Each Other in Contacts")
        
        # Business checks contacts
        response = requests.get(
            f"{BACKEND_URL}/messages/contacts",
            headers={"Authorization": f"Bearer {business_token}"}
        )
        
        business_sees_worker = False
        if response.status_code == 200:
            contacts = response.json()
            business_sees_worker = any(c['id'] == worker_user_id for c in contacts)
            assert_test(business_sees_worker, "Business sees Worker in contacts list")
        else:
            log_error(f"Failed to get business contacts: {response.text}")
            assert_test(False, "Business sees Worker in contacts list")
        
        # Worker checks contacts
        response = requests.get(
            f"{BACKEND_URL}/messages/contacts",
            headers={"Authorization": f"Bearer {worker_token}"}
        )
        
        worker_sees_business = False
        if response.status_code == 200:
            contacts = response.json()
            worker_sees_business = any(c['id'] == business_user_id for c in contacts)
            assert_test(worker_sees_business, "Worker sees Business in contacts list")
        else:
            log_error(f"Failed to get worker contacts: {response.text}")
            assert_test(False, "Worker sees Business in contacts list")
        
        # ============= STEP 8: Business Archives Conversation =============
        log_section("STEP 8: Business Archives Conversation with Worker")
        
        response = requests.post(
            f"{BACKEND_URL}/messages/archive/{worker_user_id}",
            headers={"Authorization": f"Bearer {business_token}"}
        )
        
        assert_test(response.status_code == 200, "Business archives conversation")
        
        if response.status_code == 200:
            log_info("Business successfully archived conversation")
        else:
            log_error(f"Failed to archive conversation: {response.text}")
        
        time.sleep(1)
        
        # ============= STEP 9: Worker Archives Conversation =============
        log_section("STEP 9: Worker Archives Conversation with Business")
        
        response = requests.post(
            f"{BACKEND_URL}/messages/archive/{business_user_id}",
            headers={"Authorization": f"Bearer {worker_token}"}
        )
        
        assert_test(response.status_code == 200, "Worker archives conversation")
        
        if response.status_code == 200:
            log_info("Worker successfully archived conversation")
        else:
            log_error(f"Failed to archive conversation: {response.text}")
        
        time.sleep(1)
        
        # ============= STEP 10: Verify Neither User Sees Conversation =============
        log_section("STEP 10: Verify Neither User Sees Conversation After Archive")
        
        # Business checks contacts
        response = requests.get(
            f"{BACKEND_URL}/messages/contacts",
            headers={"Authorization": f"Bearer {business_token}"}
        )
        
        if response.status_code == 200:
            contacts = response.json()
            business_sees_worker = any(c['id'] == worker_user_id for c in contacts)
            assert_test(not business_sees_worker, "Business does NOT see Worker after archiving")
        else:
            log_error(f"Failed to get business contacts: {response.text}")
            assert_test(False, "Business does NOT see Worker after archiving")
        
        # Worker checks contacts
        response = requests.get(
            f"{BACKEND_URL}/messages/contacts",
            headers={"Authorization": f"Bearer {worker_token}"}
        )
        
        if response.status_code == 200:
            contacts = response.json()
            worker_sees_business = any(c['id'] == business_user_id for c in contacts)
            assert_test(not worker_sees_business, "Worker does NOT see Business after archiving")
        else:
            log_error(f"Failed to get worker contacts: {response.text}")
            assert_test(False, "Worker does NOT see Business after archiving")
        
        # ============= STEP 11: Business Sends Contact Request to Worker =============
        log_section("STEP 11: Business Sends Contact Request to Worker (CRITICAL TEST)")
        log_warning("This is the critical test - un-archive logic should trigger here!")
        
        response = requests.post(
            f"{BACKEND_URL}/workers/{worker_profile_id}/contact",
            headers={"Authorization": f"Bearer {business_token}"},
            json={
                "message": "Hi! I'd like to book you for an event. Are you available next Friday?"
            }
        )
        
        assert_test(response.status_code == 200, "Contact request sent successfully")
        
        if response.status_code == 200:
            log_info("Contact request sent successfully")
            log_info("Un-archive logic should have executed (lines 3128-3135 in server.py)")
        else:
            log_error(f"Failed to send contact request: {response.text}")
            log_error("Cannot proceed with un-archive verification")
            return
        
        time.sleep(2)  # Give time for un-archive to process
        
        # ============= STEP 12: Verify Business Sees Worker in Contacts =============
        log_section("STEP 12: Verify Business Sees Worker After Contact Request")
        
        response = requests.get(
            f"{BACKEND_URL}/messages/contacts",
            headers={"Authorization": f"Bearer {business_token}"}
        )
        
        business_sees_worker_after = False
        if response.status_code == 200:
            contacts = response.json()
            business_sees_worker_after = any(c['id'] == worker_user_id for c in contacts)
            
            if business_sees_worker_after:
                log_success("✅ CRITICAL TEST PASSED: Business sees Worker after contact request")
                log_info("Archive record was successfully deleted for Business")
            else:
                log_error("❌ CRITICAL TEST FAILED: Business does NOT see Worker after contact request")
                log_error("Archive record was NOT deleted for Business")
                log_info(f"Contacts returned: {len(contacts)}")
                log_info(f"Contact IDs: {[c['id'] for c in contacts]}")
            
            assert_test(business_sees_worker_after, "Business sees Worker in contacts after contact request")
        else:
            log_error(f"Failed to get business contacts: {response.text}")
            assert_test(False, "Business sees Worker in contacts after contact request")
        
        # ============= STEP 13: Verify Worker Sees Business in Contacts =============
        log_section("STEP 13: Verify Worker Sees Business After Contact Request")
        
        response = requests.get(
            f"{BACKEND_URL}/messages/contacts",
            headers={"Authorization": f"Bearer {worker_token}"}
        )
        
        worker_sees_business_after = False
        if response.status_code == 200:
            contacts = response.json()
            worker_sees_business_after = any(c['id'] == business_user_id for c in contacts)
            
            if worker_sees_business_after:
                log_success("✅ CRITICAL TEST PASSED: Worker sees Business after contact request")
                log_info("Archive record was successfully deleted for Worker")
            else:
                log_error("❌ CRITICAL TEST FAILED: Worker does NOT see Business after contact request")
                log_error("Archive record was NOT deleted for Worker")
                log_info(f"Contacts returned: {len(contacts)}")
                log_info(f"Contact IDs: {[c['id'] for c in contacts]}")
            
            assert_test(worker_sees_business_after, "Worker sees Business in contacts after contact request")
        else:
            log_error(f"Failed to get worker contacts: {response.text}")
            assert_test(False, "Worker sees Business in contacts after contact request")
        
        # ============= STEP 14: Verify Message Thread Contains New Message =============
        log_section("STEP 14: Verify Message Thread Contains New Message")
        
        response = requests.get(
            f"{BACKEND_URL}/messages/thread/{worker_user_id}",
            headers={"Authorization": f"Bearer {business_token}"}
        )
        
        if response.status_code == 200:
            messages = response.json()
            
            # Check if the new contact request message is in the thread
            new_message_found = any(
                "I'd like to book you for an event" in msg.get('content', '')
                for msg in messages
            )
            
            assert_test(new_message_found, "New contact request message appears in thread")
            
            if new_message_found:
                log_info(f"Message thread contains {len(messages)} messages")
                log_info("New contact request message is visible")
            else:
                log_warning("New contact request message not found in thread")
        else:
            log_error(f"Failed to get message thread: {response.text}")
            assert_test(False, "New contact request message appears in thread")
        
        # ============= FINAL SUMMARY =============
        print_test_summary()
        
        # Print detailed results
        log_section("DETAILED TEST RESULTS")
        
        if test_results['failed'] == 0:
            log_success("🎉 ALL TESTS PASSED!")
            log_success("The un-archive logic is working correctly!")
            log_info("Archive records are deleted when contact request is sent")
            log_info("Conversation reappears in both users' contact lists")
            log_info("New message is visible in the thread")
        else:
            log_error(f"❌ {test_results['failed']} TEST(S) FAILED")
            log_warning("The un-archive logic may not be working as expected")
            log_info("Please review the failed tests above")
        
    except Exception as e:
        log_error(f"Test execution error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
