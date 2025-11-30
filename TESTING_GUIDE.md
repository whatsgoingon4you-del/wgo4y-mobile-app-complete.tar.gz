# 🎬 Featured Videos MVP - Testing Guide

## 📋 Test Accounts

All test accounts use the password: **test123**

### 🆓 Free Tier Account
- **Username:** `free_artist`
- **Password:** `test123`
- **Full Name:** Free Artist
- **Location:** New York, NY
- **Portfolio:** 2 videos (cannot be featured)

### 🥈 Silver Tier Account
- **Username:** `silver_creator`
- **Password:** `test123`
- **Full Name:** Silver Creator
- **Location:** Los Angeles, CA
- **Portfolio:** 3 videos
- **Pending Featured:** "Wedding Highlight Reel"

### 🥇 Gold Tier Account
- **Username:** `gold_performer`
- **Password:** `test123`
- **Full Name:** Gold Performer
- **Location:** Miami, FL
- **Portfolio:** 3 videos
- **Pending Featured:** "Live Concert Performance"

### 👑 Admin Account
- **Username:** `Test_User`
- **Password:** `testpass123`
- **Admin Status:** YES

---

## 🧪 Testing Checklist

### ✅ Phase 1: Free User Testing
**Objective:** Verify upgrade prompts work correctly

1. Log in as `free_artist` / `test123`
2. Navigate to Profile
3. Tap "Edit Profile"
4. Scroll to Portfolio Videos section
5. Try to tap "Feature This Video" button
6. **Expected:** "Upgrade to Feature" modal appears
7. **Expected:** Modal shows membership tiers (Silver/Gold)
8. **Expected:** Video remains unfeatured after closing modal
9. Check profile view - no "Featured" or "Pending" badges should appear

### ✅ Phase 2: Silver User - Video Submission
**Objective:** Verify video submission flow for paid members

1. Log in as `silver_creator` / `test123`
2. Navigate to Profile (view mode)
3. **Expected:** See "Wedding Highlight Reel" with "⏳ Pending" badge
4. **Expected:** See Silver membership badge displayed
5. Tap "Edit Profile"
6. Scroll to Portfolio Videos
7. **Expected:** "Wedding Highlight Reel" shows "Featured" button active
8. Try featuring another video ("Corporate Event Coverage")
9. **Expected:** Confirmation that video is now pending approval
10. Go back to profile view
11. **Expected:** Both videos now show "⏳ Pending" badges

### ✅ Phase 3: Gold User - Premium Features
**Objective:** Verify Gold tier benefits display correctly

1. Log in as `gold_performer` / `test123`
2. Navigate to Profile (view mode)
3. **Expected:** See "Live Concert Performance" with "⏳ Pending" badge
4. **Expected:** See Gold (🥇) membership badge prominently displayed
5. **Expected:** Premium styling/benefits visible
6. Tap "Edit Profile"
7. Verify all 3 videos are visible
8. Check that featured video shows correct status

### ✅ Phase 4: Admin Approval Workflow
**Objective:** Test admin approval/rejection functionality

1. Log in as `Test_User` / `testpass123`
2. Go to Dashboard tab
3. **Expected:** See "👑 Admin Dashboard" menu item at top
4. Tap "Admin Dashboard"
5. **Expected:** See "Featured Videos - Admin Dashboard" page
6. **Expected:** See badge showing "2" pending videos
7. **Expected:** See two video cards:
   - **Silver Creator** - "Wedding Highlight Reel"
   - **Gold Performer** - "Live Concert Performance"
8. For each video, verify:
   - Thumbnail displays correctly
   - YouTube/Vimeo badge visible
   - Creator name and membership tier shown
   - Location displays
   - Approve and Reject buttons visible
9. **Test Approval:**
   - Tap "Approve" on "Live Concert Performance"
   - **Expected:** Confirmation alert appears
   - Confirm approval
   - **Expected:** Video removed from pending list
   - **Expected:** Success message displays
10. **Test Rejection:**
    - Tap "Reject" on "Wedding Highlight Reel"
    - **Expected:** Rejection confirmation appears
    - Confirm rejection
    - **Expected:** Video removed from pending list
    - **Expected:** Success message displays
11. Pull to refresh
12. **Expected:** "All Caught Up!" message displays (0 pending)

### ✅ Phase 5: Homepage Display
**Objective:** Verify approved videos appear on homepage

1. Log out (or use incognito/different device)
2. Go to Home tab (main feed)
3. **Expected:** "Featured Artists" section appears near top
4. **Expected:** Approved video (Live Concert Performance) displays with:
   - Video thumbnail
   - Creator name: "Gold Performer"
   - Location: "Miami, FL"
   - Play button overlay
5. Tap on featured video
6. **Expected:** Video opens in native YouTube/browser
7. **Expected:** Video plays successfully
8. Return to app
9. Verify featured section updates properly

### ✅ Phase 6: End-to-End Flow
**Objective:** Complete workflow from submission to display

1. Log in as `silver_creator` / `test123`
2. Go to Profile → Edit Profile
3. Feature a new video: "Commercial Showreel" (Vimeo)
4. **Expected:** Confirmation that video is pending
5. Log out
6. Log in as `Test_User` / `testpass123`
7. Go to Admin Dashboard
8. **Expected:** See "Commercial Showreel" in pending list
9. **Expected:** Vimeo badge displays correctly
10. Approve the video
11. **Expected:** Success message
12. Log out
13. Go to Home tab
14. **Expected:** "Commercial Showreel" now appears in Featured Artists
15. **Expected:** Vimeo video opens correctly when tapped

### ✅ Phase 7: Edge Cases & Error Handling
**Objective:** Test error scenarios and edge cases

1. **Free User Attempt:**
   - Log in as `free_artist`
   - Try to feature video
   - Verify upgrade modal shows correct pricing/tiers
   - Verify no backend changes occur

2. **Double Feature Attempt:**
   - Log in as paid user
   - Try to feature a second video when one is already featured
   - **Expected:** Appropriate messaging (if limit exists)

3. **Network Error Simulation:**
   - Turn off WiFi/data briefly
   - Try to approve/reject as admin
   - **Expected:** Error message displays
   - **Expected:** No partial state changes

4. **Concurrent Admin Access:**
   - Have admin approve video in one session
   - Refresh pending list in another session
   - **Expected:** Video disappears from both sessions

---

## 📝 Expected Behavior Summary

### For Free Users:
- ❌ Cannot feature videos
- ✅ See upgrade modal when attempting
- ✅ Can view other users' featured videos

### For Silver/Gold Users:
- ✅ Can feature one video at a time
- ✅ See "Pending" badge while awaiting approval
- ✅ See "Featured" badge after approval
- ✅ Can change which video is featured

### For Admins:
- ✅ See all pending featured videos in dashboard
- ✅ Can approve or reject any video
- ✅ See user details (name, tier, location)
- ✅ Real-time count of pending videos

### Homepage Display:
- ✅ Featured videos appear prominently
- ✅ Only approved videos show
- ✅ Videos open in native apps/browser
- ✅ Creator attribution visible

---

## 🐛 Known Issues / Edge Cases

1. **Video Thumbnails:** Some videos may have placeholder thumbnails if YouTube/Vimeo APIs rate-limit
2. **External Links:** Videos open in external apps - this is expected behavior
3. **Refresh Required:** After approval, users may need to refresh to see updated status
4. **Empty States:** Homepage won't show Featured section if no videos are approved

---

## 📞 Quick Reference

### Admin Endpoint Test (via curl):
```bash
# Login
TOKEN=$(curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"Test_User","password":"testpass123"}' \
  -s | python3 -c "import json, sys; print(json.load(sys.stdin)['token'])")

# Get pending videos
curl -X GET http://localhost:8001/api/admin/featured-videos/pending \
  -H "Authorization: Bearer $TOKEN" -s | python3 -m json.tool
```

### Database Check:
```bash
cd /app/backend && python3 << 'EOF'
from pymongo import MongoClient
client = MongoClient("mongodb://localhost:27017")
db = client["test_database"]
users = db.users.find({"portfolio_videos.featured": True}).to_list(None)
for u in users:
    print(f"{u['username']}: {len([v for v in u.get('portfolio_videos', []) if v.get('featured')])}")
EOF
```

---

## ✅ Success Criteria

The Featured Videos MVP is working correctly if:

1. ✅ Free users see upgrade prompts and cannot feature videos
2. ✅ Paid users can feature videos and see pending status
3. ✅ Admin can view, approve, and reject pending videos
4. ✅ Approved videos appear on homepage with correct attribution
5. ✅ Videos open and play correctly in native apps
6. ✅ All badges and status indicators display accurately
7. ✅ Error handling works for network issues and edge cases

---

## 🚀 Next Steps After Testing

Once all phases pass:
1. Document any bugs found
2. Test on physical devices (iOS/Android)
3. Performance testing with more videos
4. Consider analytics integration
5. Plan for automated featured video rotation
6. Implement view tracking
7. Add artist payout calculations

---

**Happy Testing! 🎉**

For issues or questions, reference this guide and the test accounts above.
