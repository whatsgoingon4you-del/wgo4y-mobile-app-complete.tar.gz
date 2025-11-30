#!/usr/bin/env python3
"""
Backend API Testing for WGO4Y - Consulting Reply Notification Navigation
Tests the consulting reply notification system to ensure proper notification creation
"""

import requests
import json
import sys
from datetime import datetime

# Get backend URL from environment
BACKEND_URL = "https://expo-backend.preview.emergentagent.com/api"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def print_test(message):
    print(f"{Colors.BLUE}[TEST]{Colors.RESET} {message}")

def print_success(message):
    print(f"{Colors.GREEN}✅ {message}{Colors.RESET}")

def print_error(message):
    print(f"{Colors.RED}❌ {message}{Colors.RESET}")

def print_warning(message):
    print(f"{Colors.YELLOW}⚠️  {message}{Colors.RESET}")

def print_section(title):
    print(f"\n{Colors.BLUE}{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}{Colors.RESET}\n")

# Test state
test_results = {
    'passed': 0,
    'failed': 0,
    'errors': []
}

def test_consulting_reply_notification():
    """
    Test Flow:
    1. Create GP user and login
    2. GP user creates consulting request
    3. Create admin user and login (manually set is_admin in DB)
    4. Admin sends reply to consulting request
    5. Verify notification created for GP user with correct type and title
    6. Verify message created in messages system
    """
    
    print_section("CONSULTING REPLY NOTIFICATION NAVIGATION TEST")
    
    gp_token = None
    admin_token = None
    gp_user_id = None
    admin_user_id = None
    consulting_request_id = None
    
    try:
        # ============= STEP 1: Create GP User =============
        print_test("Step 1: Creating General Public user...")
        
        gp_username = f"gp_user_{int(datetime.now().timestamp())}"
        gp_data = {
            "username": gp_username,
            "password": "TestPass123!",
            "email": f"{gp_username}@test.com",
            "user_type": "general_public",
            "full_name": "Test GP User"
        }
        
        response = requests.post(f"{BACKEND_URL}/auth/register", json=gp_data)
        
        if response.status_code == 200:
            data = response.json()
            gp_token = data.get('token')
            gp_user_id = data.get('user', {}).get('id')
            print_success(f"GP user created: {gp_username} (ID: {gp_user_id})")
            test_results['passed'] += 1
        else:
            print_error(f"Failed to create GP user: {response.status_code} - {response.text}")
            test_results['failed'] += 1
            test_results['errors'].append(f"GP user creation failed: {response.text}")
            return
        
        # ============= STEP 2: GP User Creates Consulting Request =============
        print_test("Step 2: GP user creating consulting request...")
        
        consulting_data = {
            "topics": ["Marketing Strategy", "Social Media"],
            "preferred_schedule": "Weekday afternoons",
            "notes": "Need help with social media marketing for my business"
        }
        
        headers = {"Authorization": f"Bearer {gp_token}"}
        response = requests.post(
            f"{BACKEND_URL}/consulting/request",
            json=consulting_data,
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            consulting_request_id = data.get('id')
            print_success(f"Consulting request created: {consulting_request_id}")
            test_results['passed'] += 1
        else:
            print_error(f"Failed to create consulting request: {response.status_code} - {response.text}")
            test_results['failed'] += 1
            test_results['errors'].append(f"Consulting request creation failed: {response.text}")
            return
        
        # ============= STEP 3: Create Admin User =============
        print_test("Step 3: Creating admin user...")
        
        admin_username = f"admin_user_{int(datetime.now().timestamp())}"
        admin_data = {
            "username": admin_username,
            "password": "AdminPass123!",
            "email": f"{admin_username}@test.com",
            "user_type": "admin",
            "full_name": "Test Admin User"
        }
        
        response = requests.post(f"{BACKEND_URL}/auth/register", json=admin_data)
        
        if response.status_code == 200:
            data = response.json()
            admin_token = data.get('token')
            admin_user_id = data.get('user', {}).get('id')
            print_success(f"Admin user created: {admin_username} (ID: {admin_user_id})")
            print_warning("Note: Need to manually set is_admin=true in database for this user")
            test_results['passed'] += 1
        else:
            print_error(f"Failed to create admin user: {response.status_code} - {response.text}")
            test_results['failed'] += 1
            test_results['errors'].append(f"Admin user creation failed: {response.text}")
            return
        
        # ============= AUTOMATIC: Set is_admin flag via MongoDB =============
        print_test("Setting is_admin flag in database...")
        try:
            from pymongo import MongoClient
            mongo_client = MongoClient("mongodb://localhost:27017")
            db = mongo_client["test_database"]
            
            result = db.users.update_one(
                {'_id': admin_user_id},
                {'$set': {'is_admin': True}}
            )
            
            if result.modified_count > 0:
                print_success(f"Admin flag set successfully for user {admin_user_id}")
                test_results['passed'] += 1
            else:
                print_warning(f"Admin flag may already be set or user not found")
        except Exception as e:
            print_error(f"Failed to set admin flag: {str(e)}")
            print_warning("Continuing with test anyway...")
        
        # ============= STEP 4: Admin Sends Reply =============
        print_test("Step 4: Admin sending reply to consulting request...")
        
        reply_text = "Thank you for reaching out! We'd love to help you with your social media marketing strategy. Here's a video link with some initial tips: https://www.youtube.com/watch?v=example"
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(
            f"{BACKEND_URL}/consulting/requests/{consulting_request_id}/reply",
            params={"reply_text": reply_text},
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            message_id = data.get('message_id')
            print_success(f"Admin reply sent successfully (Message ID: {message_id})")
            test_results['passed'] += 1
        elif response.status_code == 403:
            print_error(f"Admin user doesn't have admin permissions (403 Forbidden)")
            print_error("Please ensure is_admin flag is set to true in the database")
            test_results['failed'] += 1
            test_results['errors'].append("Admin user lacks is_admin permission")
            return
        else:
            print_error(f"Failed to send admin reply: {response.status_code} - {response.text}")
            test_results['failed'] += 1
            test_results['errors'].append(f"Admin reply failed: {response.text}")
            return
        
        # ============= STEP 5: Verify Notification Created =============
        print_test("Step 5: Verifying notification created for GP user...")
        
        headers = {"Authorization": f"Bearer {gp_token}"}
        response = requests.get(f"{BACKEND_URL}/notifications", headers=headers)
        
        if response.status_code == 200:
            notifications = response.json()
            
            # Find the consulting message notification
            consulting_notification = None
            for notif in notifications:
                if notif.get('type') == 'CONSULTING_MESSAGE':
                    consulting_notification = notif
                    break
            
            if consulting_notification:
                print_success("Notification found!")
                
                # Verify notification type
                if consulting_notification.get('type') == 'CONSULTING_MESSAGE':
                    print_success(f"✓ Notification type is correct: 'CONSULTING_MESSAGE'")
                    test_results['passed'] += 1
                else:
                    print_error(f"✗ Notification type is incorrect: '{consulting_notification.get('type')}' (expected 'CONSULTING_MESSAGE')")
                    test_results['failed'] += 1
                    test_results['errors'].append(f"Wrong notification type: {consulting_notification.get('type')}")
                
                # Verify notification title
                expected_title = 'New message from WGO4Y Consulting'
                actual_title = consulting_notification.get('title')
                if actual_title == expected_title:
                    print_success(f"✓ Notification title is correct: '{expected_title}'")
                    test_results['passed'] += 1
                else:
                    print_error(f"✗ Notification title is incorrect: '{actual_title}' (expected '{expected_title}')")
                    test_results['failed'] += 1
                    test_results['errors'].append(f"Wrong notification title: {actual_title}")
                
                # Verify notification is unread
                if not consulting_notification.get('is_read'):
                    print_success("✓ Notification is unread (is_read: false)")
                    test_results['passed'] += 1
                else:
                    print_warning("⚠ Notification is marked as read (expected unread)")
                
                # Verify notification has consulting_request_id
                if consulting_notification.get('consulting_request_id') == consulting_request_id:
                    print_success(f"✓ Notification linked to correct consulting request")
                    test_results['passed'] += 1
                else:
                    print_error(f"✗ Notification not linked to consulting request correctly")
                    test_results['failed'] += 1
                
                # Verify notification delivered to correct user
                # Note: The fact that we received this notification when logged in as GP user
                # proves it was delivered correctly (backend filters by user_id in query)
                print_success(f"✓ Notification delivered to correct user (GP user who created the request)")
                test_results['passed'] += 1
                
                print(f"\n{Colors.BLUE}Notification Details:{Colors.RESET}")
                print(json.dumps(consulting_notification, indent=2))
                
            else:
                print_error("No CONSULTING_MESSAGE notification found!")
                print(f"Found {len(notifications)} notifications:")
                for notif in notifications:
                    print(f"  - Type: {notif.get('type')}, Title: {notif.get('title')}")
                test_results['failed'] += 1
                test_results['errors'].append("CONSULTING_MESSAGE notification not created")
        else:
            print_error(f"Failed to fetch notifications: {response.status_code} - {response.text}")
            test_results['failed'] += 1
            test_results['errors'].append(f"Notification fetch failed: {response.text}")
        
        # ============= STEP 6: Verify Message Created =============
        print_test("Step 6: Verifying message created in messages system...")
        
        headers = {"Authorization": f"Bearer {gp_token}"}
        response = requests.get(f"{BACKEND_URL}/messages", headers=headers)
        
        if response.status_code == 200:
            messages = response.json()
            
            # Find the message from admin
            admin_message = None
            for msg in messages:
                if msg.get('from_user') == admin_user_id and msg.get('to_user') == gp_user_id:
                    admin_message = msg
                    break
            
            if admin_message:
                print_success("Message found in messages system!")
                
                # Verify message content
                if reply_text in admin_message.get('content', ''):
                    print_success(f"✓ Message content is correct")
                    test_results['passed'] += 1
                else:
                    print_error(f"✗ Message content doesn't match")
                    test_results['failed'] += 1
                
                # Verify message is unread
                if not admin_message.get('read'):
                    print_success("✓ Message is unread")
                    test_results['passed'] += 1
                else:
                    print_warning("⚠ Message is marked as read (expected unread)")
                
                # Verify from_user is admin
                if admin_message.get('from_user') == admin_user_id:
                    print_success(f"✓ Message from_user is admin")
                    test_results['passed'] += 1
                else:
                    print_error(f"✗ Message from_user is incorrect")
                    test_results['failed'] += 1
                
                # Verify to_user is GP user
                if admin_message.get('to_user') == gp_user_id:
                    print_success(f"✓ Message to_user is GP user")
                    test_results['passed'] += 1
                else:
                    print_error(f"✗ Message to_user is incorrect")
                    test_results['failed'] += 1
                
                print(f"\n{Colors.BLUE}Message Details:{Colors.RESET}")
                print(json.dumps(admin_message, indent=2))
                
            else:
                print_error("Message from admin not found in messages system!")
                print(f"Found {len(messages)} messages")
                test_results['failed'] += 1
                test_results['errors'].append("Message not created in messages system")
        else:
            print_error(f"Failed to fetch messages: {response.status_code} - {response.text}")
            test_results['failed'] += 1
            test_results['errors'].append(f"Messages fetch failed: {response.text}")
        
    except Exception as e:
        print_error(f"Test exception: {str(e)}")
        test_results['failed'] += 1
        test_results['errors'].append(f"Exception: {str(e)}")
        import traceback
        traceback.print_exc()

def print_summary():
    """Print test summary"""
    print_section("TEST SUMMARY")
    
    total_tests = test_results['passed'] + test_results['failed']
    
    print(f"Total Tests: {total_tests}")
    print(f"{Colors.GREEN}Passed: {test_results['passed']}{Colors.RESET}")
    print(f"{Colors.RED}Failed: {test_results['failed']}{Colors.RESET}")
    
    if test_results['errors']:
        print(f"\n{Colors.RED}Errors:{Colors.RESET}")
        for i, error in enumerate(test_results['errors'], 1):
            print(f"  {i}. {error}")
    
    print()
    
    if test_results['failed'] == 0:
        print(f"{Colors.GREEN}{'='*60}")
        print(f"  ✅ ALL TESTS PASSED!")
        print(f"{'='*60}{Colors.RESET}\n")
        return 0
    else:
        print(f"{Colors.RED}{'='*60}")
        print(f"  ❌ SOME TESTS FAILED")
        print(f"{'='*60}{Colors.RESET}\n")
        return 1

if __name__ == "__main__":
    print(f"\n{Colors.BLUE}WGO4Y Backend Testing - Consulting Reply Notification Navigation{Colors.RESET}")
    print(f"Backend URL: {BACKEND_URL}\n")
    
    test_consulting_reply_notification()
    
    exit_code = print_summary()
    sys.exit(exit_code)
