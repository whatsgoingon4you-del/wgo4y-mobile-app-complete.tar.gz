# WGO4Y Complete Testing Plan
**Version:** 1.0  
**Date:** December 10, 2025  
**Purpose:** Comprehensive testing guide for WGO4Y mobile application

---

## 📱 Testing Environment Setup

### Prerequisites:
- [ ] App deployed to production
- [ ] Expo Go app installed on your mobile device (iOS/Android)
- [ ] Stable internet connection
- [ ] Test credentials ready (or create new accounts)

### Access Methods:
1. **Mobile (Primary):** Expo Go app with production URL
2. **Web (Secondary):** Browser at deployment URL
3. **Backend API:** Direct API testing if needed

---

## 🎯 Testing Strategy Overview

### User Types to Test:
1. **General Public** (Basic + Appreciation tiers)
2. **Business/Venue** (Basic, Silver, Gold tiers)
3. **Entrepreneur** (Basic, Silver, Networking tiers)
4. **Worker** (Basic, Silver, Gold tiers)

### Features to Test:
1. Authentication & Onboarding
2. Profile Management
3. Job Board (NEW - Priority)
4. Events & RSVP
5. Venues
6. Messaging System
7. Worker Network
8. Tier Upgrades
9. Notifications

---

# PHASE 1: AUTHENTICATION & BASIC SETUP

## Test 1.1: User Registration (All User Types)

### 1.1.1 General Public Registration
**Steps:**
1. Open app in Expo Go
2. Tap "Sign Up" / "Register"
3. Enter details:
   - Username: `test_gp_user`
   - Email: `testgp@example.com`
   - Password: `TestPass123!`
   - User Type: **General Public**
4. Tap "Create Account"

**Expected Results:**
- ✅ Registration successful
- ✅ Redirected to onboarding or home
- ✅ Welcome message appears
- ✅ Default tier: Basic

**Test:** Try invalid inputs (weak password, duplicate email)

---

### 1.1.2 Business Registration
**Steps:**
1. Sign up with:
   - Username: `test_venue_gold`
   - User Type: **Business**
2. Complete onboarding:
   - Business name: "Test Venue LLC"
   - Business type: Select "Nightclub"
   - Address: "123 Test St, Las Vegas, NV"
   - Phone: "702-555-TEST"

**Expected Results:**
- ✅ Business profile created
- ✅ Can add venue details
- ✅ Default tier: Basic

---

### 1.1.3 Entrepreneur Registration
**Steps:**
1. Sign up with:
   - Username: `test_dj_artist`
   - User Type: **Entrepreneur**
2. Complete onboarding:
   - Stage name: "DJ Test Artist"
   - Occupation: "DJ"
   - Services: Select 2-3 services
   - Portfolio upload (optional)

**Expected Results:**
- ✅ Entrepreneur profile created
- ✅ Can add portfolio
- ✅ Default tier: Basic

---

## Test 1.2: Login & Session Management

### 1.2.1 Standard Login
**Steps:**
1. Logout if logged in
2. Tap "Sign In"
3. Enter credentials from existing account
4. Tap "Sign In"

**Expected Results:**
- ✅ Login successful
- ✅ Redirected to appropriate dashboard based on user type
- ✅ User info displays correctly
- ✅ Session persists after app restart

---

### 1.2.2 Real Profile Login
**Test with real profiles:**
1. Login as: **Dboy Stackalini** (if you have credentials)
2. Verify:
   - ✅ Profile photo loads (img8.jpg)
   - ✅ Tier shows: GOLD
   - ✅ Premium features accessible

---

### 1.2.3 Error Cases
**Test:**
- [ ] Wrong password → Shows error message
- [ ] Non-existent email → Shows error
- [ ] Empty fields → Validation error

---

# PHASE 2: PROFILE MANAGEMENT

## Test 2.1: View Profile

### 2.1.1 Own Profile
**Steps:**
1. Navigate to Profile section
2. View profile details

**Expected Results:**
- ✅ All profile info displays correctly
- ✅ Profile photo loads from R2
- ✅ Tier badge shows correctly
- ✅ Edit button available

---

### 2.1.2 Real Profiles Display
**Steps:**
1. Browse/search for real profiles:
   - D.Petty
   - La Mansion
   - McClellan's Tavern
   - Rack Em Up

**Expected Results:**
- ✅ All profile images load from R2
- ✅ Profile info displays correctly
- ✅ Demo profiles marked (if flagged)
- ✅ No broken images

---

## Test 2.2: Edit Profile

### 2.2.1 Update Basic Info
**Steps:**
1. Tap "Edit Profile"
2. Update:
   - Bio/description
   - Location
   - Contact info
3. Save changes

**Expected Results:**
- ✅ Changes saved successfully
- ✅ Updated info displays immediately
- ✅ No data loss

---

### 2.2.2 Upload Profile Photo
**Steps:**
1. Edit profile
2. Tap "Change Photo"
3. Select image from gallery
4. Upload

**Expected Results:**
- ✅ Image uploads successfully
- ✅ New photo displays in profile
- ✅ Photo accessible from R2 or backend storage

---

### 2.2.3 Portfolio Management (Entrepreneurs)
**Steps:**
1. Login as entrepreneur
2. Add portfolio photos/videos
3. Verify tier limits:
   - Basic: 2 photos, 0 videos
   - Silver: 10 photos, 2 videos
   - Networking: Unlimited photos, 8 videos

**Expected Results:**
- ✅ Tier limits enforced correctly
- ✅ Upload successful within limits
- ✅ Blocked when limit reached
- ✅ Upgrade prompt shows

---

# PHASE 3: JOB BOARD MVP (PRIORITY - NEW FEATURE)

## Test 3.1: Post a Job (Business/Entrepreneur - Gold Tier)

### 3.1.1 Create Job Posting
**Prerequisites:**
- Login as Gold tier business (create or use test account)

**Steps:**
1. Navigate to Job Board
2. Tap "Post a Job"
3. Fill in job details:
   - Title: "DJ Needed for Weekend Events"
   - Role: "DJ"
   - Description: "Looking for experienced DJ for Saturday night events"
   - Location: "Las Vegas, NV"
   - Pay Rate: "$200/night"
   - Event Date: Select future date
4. Tap "Post Job"

**Expected Results:**
- ✅ Job posted successfully
- ✅ Confirmation message appears
- ✅ Job appears in "My Posted Jobs"
- ✅ Job visible to workers

**Test Restrictions:**
- [ ] Basic tier business → Should be blocked (403)
- [ ] General Public user → Should be blocked (403)

---

### 3.1.2 Post Multiple Jobs
**Steps:**
1. Post 2-3 different jobs with various roles:
   - DJ
   - Security
   - Bartender

**Expected Results:**
- ✅ All jobs post successfully
- ✅ Each job has unique ID
- ✅ All visible in "My Posted Jobs"

---

## Test 3.2: Browse Jobs (Worker View)

### 3.2.1 View All Open Jobs
**Prerequisites:**
- Login as approved worker OR create worker profile:
  1. Register as General Public
  2. Apply to Worker Network
  3. Get profile approved (may need admin)

**Steps:**
1. Navigate to Job Board / Jobs section
2. View all available jobs

**Expected Results:**
- ✅ All open jobs display
- ✅ Job cards show: title, role, location, pay
- ✅ Can tap job to view details
- ✅ Own applications marked (if any)

---

### 3.2.2 Filter Jobs
**Steps:**
1. Apply filters:
   - By role (DJ, Security, Bartender)
   - By state (Nevada, California)
   - By status (Open)

**Expected Results:**
- ✅ Filters work correctly
- ✅ Results update in real-time
- ✅ Can clear filters

---

## Test 3.3: Apply to Jobs (Worker - TIER LIMITS)

### 3.3.1 Basic Tier Worker (5 applications/month limit)
**Steps:**
1. Create/Login as Basic tier worker
2. Apply to Job #1:
   - Tap job card
   - Tap "Apply"
   - Write cover letter/note: "I have 5 years experience..."
   - Submit application
3. Repeat for Jobs #2, #3, #4, #5

**Expected Results:**
- ✅ Applications 1-5: Success
- ✅ Each shows confirmation message
- ✅ Application appears in "My Applications"
- ✅ Notification sent to job owner

**Critical Test - Application #6:**
4. Try to apply to 6th job

**Expected Results:**
- ❌ Application BLOCKED
- ✅ Error message: "You have reached your monthly application limit (5 applications)"
- ✅ Upgrade prompt appears

---

### 3.3.2 Silver Tier Worker (15 applications/month limit)
**Steps:**
1. Create worker with Silver tier
2. Apply to 7-10 jobs (testing within limit)

**Expected Results:**
- ✅ All applications succeed
- ✅ Counter shows remaining applications
- ✅ No blocking until application #16

---

### 3.3.3 Gold Tier Worker (Unlimited)
**Steps:**
1. Create worker with Gold tier
2. Apply to 20+ jobs

**Expected Results:**
- ✅ All applications succeed
- ✅ No limit enforced
- ✅ "Unlimited" badge shows

---

### 3.3.4 Edge Cases
**Test:**
- [ ] Apply to same job twice → Should be blocked
- [ ] Apply to closed job → Should be blocked
- [ ] Apply without worker profile → Should be blocked (403)
- [ ] Apply with pending worker profile → Should be blocked

---

## Test 3.4: View Job Applicants (Business Owner)

### 3.4.1 View Applicants List
**Steps:**
1. Login as business who posted jobs
2. Navigate to "My Posted Jobs"
3. Select a job with applicants
4. Tap "View Applicants"

**Expected Results:**
- ✅ List of all applicants displays
- ✅ Each applicant shows:
  - Name
  - Role/occupation
  - Services offered
  - Cover letter/note
  - Application status
  - Application date
- ✅ Worker profile photo loads

---

### 3.4.2 Applicant Details
**Steps:**
1. Tap on an applicant
2. View full profile

**Expected Results:**
- ✅ Complete worker profile loads
- ✅ Portfolio visible
- ✅ Contact information available
- ✅ Can message worker (if messaging works)

---

### 3.4.3 Access Control
**Test:**
1. Login as different business (not job owner)
2. Try to view applicants for someone else's job

**Expected Results:**
- ❌ Access denied (403)
- ✅ Error message: "You can only view applicants for your own jobs"

---

## Test 3.5: My Applications (Worker View)

**Steps:**
1. Login as worker who applied to jobs
2. Navigate to "My Applications"

**Expected Results:**
- ✅ All applications listed
- ✅ Each shows:
  - Job title
  - Business name
  - Application date
  - Status (Pending/Accepted/Rejected)
  - Location
  - Pay rate
- ✅ Can tap to view job details

---

## Test 3.6: Job Management (Business)

### 3.6.1 My Posted Jobs
**Steps:**
1. Login as business
2. View "My Posted Jobs"

**Expected Results:**
- ✅ All posted jobs display
- ✅ Each shows applicant count
- ✅ Status visible (Open/Closed/Filled)

---

### 3.6.2 Update Job Status
**Steps:**
1. Select a job
2. Change status to "Closed" or "Filled"

**Expected Results:**
- ✅ Status updates successfully
- ✅ Job no longer accepts applications
- ✅ Workers see updated status

---

### 3.6.3 Delete Job
**Steps:**
1. Select a job
2. Tap "Delete"
3. Confirm deletion

**Expected Results:**
- ✅ Job deleted successfully
- ✅ No longer visible to workers
- ✅ Removed from "My Posted Jobs"

---

# PHASE 4: EVENTS & RSVP

## Test 4.1: Browse Events

**Steps:**
1. Navigate to Events section
2. Browse available events

**Expected Results:**
- ✅ Events display with images
- ✅ Event details visible (date, venue, price)
- ✅ Can filter by category
- ✅ Featured events highlighted

---

## Test 4.2: RSVP to Event (Tier Limits - GP Users)

### 4.2.1 Basic Tier GP (3 RSVPs/month)
**Steps:**
1. Login as Basic tier General Public user
2. RSVP to Event #1, #2, #3
3. Try to RSVP to Event #4

**Expected Results:**
- ✅ First 3 RSVPs: Success
- ❌ 4th RSVP: Blocked
- ✅ Error: "RSVP limit reached (3/month)"
- ✅ Upgrade prompt shown

---

### 4.2.2 Appreciation Tier GP (Unlimited)
**Steps:**
1. Login as Appreciation tier user
2. RSVP to 10+ events

**Expected Results:**
- ✅ All RSVPs succeed
- ✅ No limit enforced

---

## Test 4.3: Create Event (Business - Premium)

**Steps:**
1. Login as Gold tier business
2. Tap "Create Event"
3. Fill in details:
   - Title, description, date, venue
   - Ticket price & tiers
   - Upload event image
4. Publish event

**Expected Results:**
- ✅ Event created successfully
- ✅ Visible to all users
- ✅ Business can manage event

**Test Restrictions:**
- [ ] Basic tier → Should require upgrade

---

# PHASE 5: VENUES

## Test 5.1: Browse Venues

**Steps:**
1. Navigate to Venues section
2. Browse venue listings
3. Verify real venues display:
   - La Mansion ✅
   - McClellan's Tavern ✅
   - Rack Em Up ✅
   - One Mansion ✅

**Expected Results:**
- ✅ All venue images load from R2
- ✅ Venue details display correctly
- ✅ Can filter by type/location
- ✅ Can bookmark/save venues

---

## Test 5.2: Venue Details

**Steps:**
1. Tap on "La Mansion"
2. View full details

**Expected Results:**
- ✅ Venue photo loads (La-Mansion.png)
- ✅ All venue info displays:
  - Description
  - Amenities
  - Location
  - Contact info
- ✅ Can message venue owner
- ✅ Can view upcoming events

---

# PHASE 6: WORKER NETWORK

## Test 6.1: Apply to Worker Network

**Steps:**
1. Login as General Public user
2. Navigate to Worker Network
3. Tap "Apply"
4. Fill application:
   - Role: "DJ"
   - Experience: "5 years..."
   - Why join: "Want to connect..."
   - Location: "Las Vegas, NV"
5. Submit

**Expected Results:**
- ✅ Application submitted
- ✅ Status shows "Pending Approval"
- ✅ Cannot apply to jobs yet
- ✅ Can view application status

---

## Test 6.2: Worker Profile Approval (Simulated)

**Note:** This requires admin access. Test if available.

**Steps:**
1. Admin approves worker profile
2. Worker receives notification
3. Worker can now apply to jobs

**Expected Results:**
- ✅ Status changes to "Approved"
- ✅ Job Board becomes accessible
- ✅ Can apply to jobs

---

# PHASE 7: MESSAGING SYSTEM

## Test 7.1: Send Message (Premium Users Only)

### 7.1.1 Business to Entrepreneur
**Steps:**
1. Login as Gold tier business
2. Find entrepreneur profile
3. Tap "Message" or contact button
4. Write message: "Interested in booking you..."
5. Send

**Expected Results:**
- ✅ Message sends successfully
- ✅ Appears in sent messages
- ✅ Recipient receives notification

---

### 7.1.2 View Messages
**Steps:**
1. Navigate to Messages/Inbox
2. View conversation list

**Expected Results:**
- ✅ All conversations display
- ✅ Recent messages show preview
- ✅ Unread count accurate
- ✅ Can tap to open conversation

---

### 7.1.3 Conversation Thread
**Steps:**
1. Open a conversation
2. Send multiple messages
3. Receive replies

**Expected Results:**
- ✅ Messages display in order
- ✅ Real-time updates (or refresh works)
- ✅ Can scroll through history
- ✅ Timestamps show correctly

---

### 7.1.4 Tier Restrictions
**Test:**
1. Login as Basic tier user
2. Try to send message

**Expected Results:**
- ❌ Message blocked
- ✅ Upgrade prompt shows
- ✅ Error: "Messaging requires premium tier"

---

### **🐛 KNOWN MESSAGING BUGS TO TEST:**
**Per your earlier mention, test messaging thoroughly and note:**
- Any messages not sending
- Messages not appearing in inbox
- Real-time sync issues
- Notification issues
- Any other bugs you experienced

---

# PHASE 8: TIER UPGRADES & PAYMENTS

## Test 8.1: View Tier Benefits

**Steps:**
1. Navigate to Upgrade/Tiers section
2. View tier comparison

**Expected Results:**
- ✅ All tiers listed (Basic, Silver, Gold, etc.)
- ✅ Benefits clearly shown
- ✅ Current tier highlighted
- ✅ Pricing displayed

---

## Test 8.2: Upgrade Tier (Stripe Integration)

**Prerequisites:**
- Stripe test mode configured
- Test card: 4242 4242 4242 4242

**Steps:**
1. Select higher tier (e.g., Basic → Gold)
2. Tap "Upgrade"
3. Enter Stripe test card details
4. Complete payment

**Expected Results:**
- ✅ Payment processing works
- ✅ Tier upgraded successfully
- ✅ New features immediately available
- ✅ Receipt/confirmation shown

**Note:** If Stripe not configured, this may show as "Coming Soon"

---

# PHASE 9: NOTIFICATIONS

## Test 9.1: Job Application Notifications

**Steps:**
1. Login as business who received job applications
2. Check notifications

**Expected Results:**
- ✅ Notification for each application
- ✅ Shows: "Worker X applied to your DJ position"
- ✅ Tap notification → Goes to applicant view
- ✅ Read/unread status works

---

## Test 9.2: Other Notifications

**Test:**
- [ ] Event RSVP notifications
- [ ] Message notifications
- [ ] System announcements
- [ ] Tier upgrade confirmations

---

# PHASE 10: BRANDING & UI/UX

## Test 10.1: Logo Display

**Check logo appears in:**
- [ ] App launch/splash screen
- [ ] Header/navigation
- [ ] Footer (if applicable)
- [ ] Login/signup screens
- [ ] About page

**Expected Results:**
- ✅ Logo loads from R2: `WGO4Y Logo.png`
- ✅ Properly sized (not pixelated/stretched)
- ✅ Color matches theme
- ✅ Consistent across all screens

---

## Test 10.2: Image Quality

**Check all profile/venue images:**
- [ ] No pixelation or stretching
- [ ] Proper aspect ratios
- [ ] Fast loading times
- [ ] Fallback for missing images

---

## Test 10.3: Demo Profile Badges

**Steps:**
1. Browse profiles
2. Look for demo profile indicators

**Expected Results:**
- ✅ Demo profiles clearly marked
- ✅ Real profiles prominent
- ✅ Visual distinction clear

---

# PHASE 11: EDGE CASES & ERROR HANDLING

## Test 11.1: Network Errors

**Steps:**
1. Turn off internet
2. Try to perform actions
3. Turn internet back on

**Expected Results:**
- ✅ Graceful error messages
- ✅ No app crashes
- ✅ Data syncs when back online

---

## Test 11.2: Invalid Inputs

**Test:**
- [ ] Empty form submissions
- [ ] Invalid email formats
- [ ] Too long text inputs
- [ ] Special characters in names

**Expected Results:**
- ✅ Validation errors show
- ✅ Helpful error messages
- ✅ No crashes

---

## Test 11.3: Permission/Access Errors

**Test:**
- [ ] Access features without login
- [ ] Access premium features with basic tier
- [ ] Access other users' private data

**Expected Results:**
- ✅ Proper 401/403 errors
- ✅ Redirect to login or upgrade
- ✅ Clear error messages

---

# PHASE 12: PERFORMANCE & RELIABILITY

## Test 12.1: App Performance

**Check:**
- [ ] App launch time (< 3 seconds)
- [ ] Image loading speed
- [ ] Smooth scrolling
- [ ] No lag when switching screens
- [ ] Memory usage reasonable

---

## Test 12.2: Data Persistence

**Steps:**
1. Fill out forms partially
2. Close app / kill process
3. Reopen app

**Expected Results:**
- ✅ Unsaved data handled appropriately
- ✅ Session persists (if expected)
- ✅ No data loss

---

# TESTING CHECKLIST SUMMARY

## Critical Features (Must Work):
- [ ] Login/Signup (all user types)
- [ ] Profile viewing (images load from R2)
- [ ] Logo displays throughout app
- [ ] Job Board: Post jobs (Premium)
- [ ] Job Board: Browse jobs (Workers)
- [ ] Job Board: Apply with tier limits (CRITICAL)
- [ ] Job Board: View applicants (Business)
- [ ] Notifications work

## Important Features (Should Work):
- [ ] Events browsing and RSVP
- [ ] Venue browsing
- [ ] Profile editing
- [ ] Portfolio management
- [ ] Worker Network application
- [ ] Tier upgrades
- [ ] Messaging system

## Nice to Have (Test if time):
- [ ] Search functionality
- [ ] Filters
- [ ] Bookmarks/favorites
- [ ] Analytics
- [ ] Admin features

---

# BUG REPORTING FORMAT

When you find bugs, please report using this format:

```
**Feature:** Job Board - Apply to Job
**Severity:** High / Medium / Low
**User Type:** Worker (Basic Tier)
**Steps to Reproduce:**
1. Login as basic worker
2. Browse jobs
3. Click "Apply" on 6th job
4. Expected: Blocked, Actual: Allowed

**Expected Behavior:** Should show limit error
**Actual Behavior:** Application went through
**Device:** iPhone 14 Pro, iOS 17.2
**Screenshots:** [attach if available]
**Additional Notes:** Counter showed 5/5 before applying
```

---

# PRIORITY TESTING ORDER

## Priority 1 (Test First - 30 min):
1. ✅ Login with real profile (verify image loads)
2. ✅ Browse profiles (check R2 images)
3. ✅ Logo appears correctly
4. ✅ Job Board: Post job (Business)
5. ✅ Job Board: Apply (Worker with tier limits)

## Priority 2 (Core Features - 45 min):
6. ✅ Job Board: View applicants
7. ✅ Events browsing
8. ✅ Venues browsing
9. ✅ Profile editing
10. ✅ Messaging system

## Priority 3 (Full Coverage - 60+ min):
11. ✅ All tier limit scenarios
12. ✅ Worker Network flow
13. ✅ Notifications
14. ✅ Edge cases
15. ✅ Error handling

---

# SUCCESS CRITERIA

## Deployment Considered Successful If:
- ✅ All 7 real profiles display with images
- ✅ Logo appears throughout app
- ✅ Job Board posting works (Premium users)
- ✅ Job Board applications work with tier limits
- ✅ Basic tier: 5 apps/month enforced
- ✅ Silver tier: 15 apps/month enforced
- ✅ Gold tier: Unlimited works
- ✅ Applicants view works for job owners
- ✅ No critical bugs in core flows

## Minor Issues Acceptable:
- ⚠️ UI/UX improvements needed
- ⚠️ Some demo profiles missing images
- ⚠️ Non-critical features not working
- ⚠️ Performance optimization needed

---

**Good luck with testing! Report any issues you find and I'll fix them immediately!** 🚀
