#!/usr/bin/env python3
"""
Comprehensive Approval System Backend Tests
Tests auth, queue, visibility blocking, approve/reject, bulk actions, and stats
"""

import requests
import json
from datetime import datetime, timezone
from uuid import uuid4

BASE_URL = "http://localhost:8001/api"

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

def log_request(method, endpoint, data=None):
    print(f"{YELLOW}➡️  {method} {endpoint}{RESET}")
    if data:
        print(f"   Data: {json.dumps(data, indent=2)[:200]}...")

def log_response(status, data):
    if status < 400:
        print(f"{GREEN}⬅️  Status: {status}{RESET}")
    else:
        print(f"{RED}⬅️  Status: {status}{RESET}")
    print(f"   Response: {json.dumps(data, indent=2)[:500]}...")

# Test state
test_results = {
    'total': 0,
    'passed': 0,
    'failed': 0,
    'test_data': {}
}

def assert_test(condition, test_name, details=""):
    """Assert a test condition and track results"""
    test_results['total'] += 1
    if condition:
        test_results['passed'] += 1
        log_success(f"Test Passed: {test_name}")
        if details:
            print(f"   {details}")
        return True
    else:
        test_results['failed'] += 1
        log_error(f"Test Failed: {test_name}")
        if details:
            print(f"   {details}")
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
    log_section("APPROVAL SYSTEM BACKEND TESTS")
    log_info(f"Base URL: {BASE_URL}")
    log_info(f"Test Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # ============= TEST 1: AUTH / PERMISSIONS =============
    log_section("TEST 1: AUTH / PERMISSIONS")
    
    # Login as approval_admin
    log_info("Logging in as approval_admin...")
    log_request("POST", "/auth/login", {"username": "approval_admin", "password": "Admin2024!"})
    
    response = requests.post(f"{BASE_URL}/auth/login", json={
        "username": "approval_admin",
        "password": "Admin2024!"
    })
    
    log_response(response.status_code, response.json())
    
    if response.status_code == 200:
        data = response.json()
        admin_token = data['token']
        admin_user = data['user']
        
        assert_test(True, "Approval admin login successful")
        assert_test(
            admin_user.get('is_admin') or admin_user.get('is_approval_admin'),
            "Approval admin has correct permissions",
            f"is_admin: {admin_user.get('is_admin')}, is_approval_admin: {admin_user.get('is_approval_admin')}"
        )
        
        test_results['test_data']['admin_token'] = admin_token
        test_results['test_data']['admin_user_id'] = admin_user['id']
    else:
        log_error("Failed to login as approval_admin")
        print("Cannot continue tests without admin token")
        return
    
    # Login as regular user (D.Petty)
    log_info("\nLogging in as regular user (D.Petty)...")
    log_request("POST", "/auth/login", {"username": "d_petty@wgo4y.com", "password": "Test1234"})
    
    response = requests.post(f"{BASE_URL}/auth/login", json={
        "username": "d_petty@wgo4y.com",
        "password": "Test1234"
    })
    
    if response.status_code == 200:
        regular_token = response.json()['token']
        test_results['test_data']['regular_token'] = regular_token
        log_success("Regular user login successful")
    else:
        log_error("Failed to login as regular user")
        regular_token = None
    
    # Test regular user cannot access admin endpoints
    if regular_token:
        log_info("\nTesting regular user cannot access admin endpoints...")
        log_request("GET", "/admin/approval/queue")
        
        response = requests.get(
            f"{BASE_URL}/admin/approval/queue",
            headers={"Authorization": f"Bearer {regular_token}"}
        )
        
        log_response(response.status_code, response.json())
        
        assert_test(
            response.status_code == 403,
            "Regular user blocked from admin approval endpoints",
            f"Expected 403, got {response.status_code}"
        )
    
    # ============= TEST 2: QUEUE + FILTERS =============
    log_section("TEST 2: QUEUE + FILTERS")
    
    # Test queue with all pending items
    log_info("Testing queue with status=pending...")
    log_request("GET", "/admin/approval/queue?status=pending")
    
    response = requests.get(
        f"{BASE_URL}/admin/approval/queue?status=pending",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    log_response(response.status_code, response.json())
    
    if response.status_code == 200:
        queue_data = response.json()
        assert_test(True, "Queue endpoint accessible")
        assert_test(
            'items' in queue_data and 'total' in queue_data,
            "Queue returns correct schema",
            f"Keys: {list(queue_data.keys())}"
        )
        
        log_info(f"Pending items in queue: {queue_data['total']}")
        
        # Show sample item if any
        if queue_data['items']:
            log_info("Sample queue item:")
            print(json.dumps(queue_data['items'][0], indent=2, default=str))
    else:
        assert_test(False, "Queue endpoint failed", f"Status: {response.status_code}")
    
    # Test queue filter by content_type
    log_info("\nTesting queue filter by content_type=event...")
    log_request("GET", "/admin/approval/queue?content_type=event&status=pending")
    
    response = requests.get(
        f"{BASE_URL}/admin/approval/queue?content_type=event&status=pending",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    if response.status_code == 200:
        filtered_data = response.json()
        assert_test(
            all(item['content_type'] == 'event' for item in filtered_data['items']),
            "Content type filter works correctly",
            f"All {len(filtered_data['items'])} items are type 'event'"
        )
    
    # ============= TEST 3: PENDING TRULY HIDDEN (CRITICAL) =============
    log_section("TEST 3: PENDING CONTENT VISIBILITY (CRITICAL)")
    
    log_info("This test will be manual - creating new pending items...")
    log_info("NOTE: New content should default to pending status")
    log_info("We'll verify existing approved content is visible")
    
    # Test events endpoint - should only return approved
    log_info("\nTesting public events endpoint...")
    log_request("GET", "/events")
    
    response = requests.get(f"{BASE_URL}/events")
    
    if response.status_code == 200:
        events = response.json()
        log_info(f"Public events returned: {len(events)}")
        
        # Check if any have approval_status
        events_with_status = [e for e in events if 'approval_status' in e]
        approved_only = all(e.get('approval_status') == 'approved' for e in events_with_status)
        
        assert_test(
            approved_only or len(events_with_status) == 0,
            "Public events endpoint returns only approved items",
            f"{len(events)} events, all approved or no status field"
        )
    
    # ============= TEST 4: APPROVE / REJECT SINGLE ITEM =============
    log_section("TEST 4: APPROVE / REJECT ACTIONS")
    
    # Get a pending item if any
    response = requests.get(
        f"{BASE_URL}/admin/approval/queue?status=pending",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    if response.status_code == 200 and response.json()['items']:
        pending_items = response.json()['items']
        test_item = pending_items[0]
        
        log_info(f"\nTesting approval on item: {test_item['content_type']} - {test_item['content_id']}")
        
        # Test approve action
        log_request("POST", f"/admin/approval/{test_item['content_type']}/{test_item['content_id']}/action",
                   {"action": "approve"})
        
        response = requests.post(
            f"{BASE_URL}/admin/approval/{test_item['content_type']}/{test_item['content_id']}/action",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"action": "approve"}
        )
        
        log_response(response.status_code, response.json())
        
        if response.status_code == 200:
            result = response.json()
            assert_test(
                result['new_status'] == 'approved',
                "Approve action sets status to approved",
                f"Status: {result['new_status']}"
            )
            
            # Save for later verification
            test_results['test_data']['approved_item'] = test_item
    else:
        log_info("No pending items to test approve action")
    
    # Test reject action (if we have more pending items)
    response = requests.get(
        f"{BASE_URL}/admin/approval/queue?status=pending",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    if response.status_code == 200 and response.json()['items']:
        pending_items = response.json()['items']
        if len(pending_items) > 0:
            test_item = pending_items[0]
            
            log_info(f"\nTesting reject on item: {test_item['content_type']} - {test_item['content_id']}")
            
            log_request("POST", f"/admin/approval/{test_item['content_type']}/{test_item['content_id']}/action",
                       {"action": "reject", "rejection_reason": "Test rejection"})
            
            response = requests.post(
                f"{BASE_URL}/admin/approval/{test_item['content_type']}/{test_item['content_id']}/action",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={
                    "action": "reject",
                    "rejection_reason": "Test rejection - automated testing"
                }
            )
            
            log_response(response.status_code, response.json())
            
            if response.status_code == 200:
                result = response.json()
                assert_test(
                    result['new_status'] == 'rejected',
                    "Reject action sets status to rejected",
                    f"Status: {result['new_status']}"
                )
                
                # Check if notification was created
                if 'user_id' in test_item:
                    log_info(f"Checking for rejection notification for user: {test_item['user_id']}")
                    # TODO: Check notifications endpoint
    
    # ============= TEST 5: BULK ACTION =============
    log_section("TEST 5: BULK ACTIONS")
    
    # Get multiple pending items
    response = requests.get(
        f"{BASE_URL}/admin/approval/queue?status=pending",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    if response.status_code == 200:
        pending_items = response.json()['items']
        
        if len(pending_items) >= 2:
            # Take first 2 items for bulk action
            bulk_items = pending_items[:2]
            content_ids = [item['content_id'] for item in bulk_items]
            content_type = bulk_items[0]['content_type']
            
            log_info(f"\nTesting bulk approve on {len(content_ids)} items...")
            log_request("POST", "/admin/approval/bulk-action", {
                "content_type": content_type,
                "content_ids": content_ids,
                "action": "approve"
            })
            
            response = requests.post(
                f"{BASE_URL}/admin/approval/bulk-action",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={
                    "content_type": content_type,
                    "content_ids": content_ids,
                    "action": "approve"
                }
            )
            
            log_response(response.status_code, response.json())
            
            if response.status_code == 200:
                result = response.json()
                assert_test(
                    result['successful'] == len(content_ids),
                    f"Bulk approve processed all {len(content_ids)} items",
                    f"Successful: {result['successful']}, Failed: {result['failed']}"
                )
        else:
            log_info(f"Not enough pending items for bulk test (found {len(pending_items)})")
    
    # ============= TEST 6: STATS ENDPOINT =============
    log_section("TEST 6: STATS ENDPOINT")
    
    log_info("Testing stats endpoint...")
    log_request("GET", "/admin/approval/stats")
    
    response = requests.get(
        f"{BASE_URL}/admin/approval/stats",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    log_response(response.status_code, response.json())
    
    if response.status_code == 200:
        stats = response.json()
        
        assert_test(
            'pending' in stats and 'approved' in stats and 'rejected' in stats,
            "Stats endpoint returns correct structure",
            f"Keys: {list(stats.keys())}"
        )
        
        assert_test(
            'total_pending' in stats,
            "Stats includes total_pending count",
            f"Total pending: {stats.get('total_pending')}"
        )
        
        log_info("\n📊 Current Stats:")
        print(json.dumps(stats, indent=2))
    
    # ============= FINAL SUMMARY =============
    print_test_summary()
    
    # ============= EXAMPLE CURL COMMANDS =============
    log_section("EXAMPLE CURL COMMANDS FOR MANUAL TESTING")
    
    print(f"""
# 1. Login as approval admin
curl -X POST "{BASE_URL}/auth/login" \\
  -H "Content-Type: application/json" \\
  -d '{{"username":"approval_admin","password":"Admin2024!"}}'

# 2. Get pending queue (save TOKEN from login)
curl -X GET "{BASE_URL}/admin/approval/queue?status=pending" \\
  -H "Authorization: Bearer $TOKEN"

# 3. Get stats
curl -X GET "{BASE_URL}/admin/approval/stats" \\
  -H "Authorization: Bearer $TOKEN"

# 4. Approve item (replace CONTENT_TYPE and CONTENT_ID)
curl -X POST "{BASE_URL}/admin/approval/CONTENT_TYPE/CONTENT_ID/action" \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{{"action":"approve"}}'

# 5. Reject item with reason
curl -X POST "{BASE_URL}/admin/approval/CONTENT_TYPE/CONTENT_ID/action" \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{{"action":"reject","rejection_reason":"Does not meet quality standards"}}'
    """)

if __name__ == "__main__":
    main()
