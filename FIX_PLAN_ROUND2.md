# WGO4Y - Fix Plan Round 2

**Date:** December 12, 2025
**Status:** IN PROGRESS

---

## 🚨 CRITICAL ISSUES

### 1. Login Issue - "Club Euphoria" ❌ BLOCKED
**Problem:** User cannot login with "Club Euphoria" / "Test1234"  
**Root Cause:** "Club Euphoria" profile does not exist in current database (85 migrated users)  
**Investigation:**
- Searched all migrated profiles - not found
- Checked credentials file - not listed
- Profile was likely created in previous testing session before migration

**Solution Options:**
- **Option A:** User registers "Club Euphoria" as a new business account
- **Option B:** User uses existing business accounts (La Mansion, McClellan's Tavern, Rack Em Up, One Mansion)
- **Option C:** Create "Club Euphoria" manually via migration script

**Action:** WAITING FOR USER DECISION

---

### 2. Date Picker Not Working ⚙️ NEEDS INVESTIGATION
**Problem:** User clicks date field, sees "flash", no calendar appears (testing on web)  
**Current Code Status:** HTML5 date input fallback is implemented for web  
**Root Cause:** Frontend may not be using latest build with fixes  

**Checklist:**
- [x] Code fix implemented (HTML5 date input for web)
- [ ] Frontend rebuild/restart needed
- [ ] Verify Platform.OS detection is working
- [ ] Test in production environment

**Next Steps:**
1. Restart frontend service
2. Clear browser cache
3. Verify date picker shows HTML5 input on web
4. If still failing, add debug logging for Platform.OS

---

### 3. Payment/Upgrade Failures ❌ ISSUES FOUND
**Problem:** 500 error after "Proceed to Payment", promo code "WGO4Y60" shows "Invalid code"  

**Investigation:**
✅ Promo code "WGO4Y60" does NOT exist in database  
❌ No promo code seeding script exists  
⚠️ Need to check payment/upgrade endpoint for 500 error

**Solution:**
1. Create promo code seeding script
2. Add "WGO4Y60" with appropriate settings
3. Investigate 500 error in checkout/upgrade endpoint
4. Add better error handling

---

## 🔧 HIGH PRIORITY FIXES

### 4. No Confirmation After Coupon Creation ⚠️ PARTIALLY FIXED
**Problem:** After clicking "Create Coupon", UI flashes but no confirmation shown  
**Current Status:** Navigation fix applied (removed Alert callback)  
**Issue:** User still experiencing flash behavior  

**Possible Causes:**
- Frontend not rebuilt with new code
- Browser caching old JavaScript
- Static build not updated

**Solution:**
- Restart frontend service
- Rebuild static export
- Add explicit success message before navigation

---

### 5. Missing Demo Content 📊 TODO
**Problem:** Homepage empty after onboarding (no events, venues, services)  
**Solution:** Create demo data seeder script  

**Demo Data Needed:**
- 10-15 demo events (various categories, dates)
- 5-10 demo venues (different types)
- Demo services from entrepreneurs
- Populate "Explore Categories"
- Populate "Popular Venues"
- Populate "WGO4Y Services"

**Implementation:**
- Create `/app/backend/seed_demo_data.py`
- Add endpoint `/api/admin/seed-demo-data`
- Run automatically for new users or on-demand

---

### 6. Saved Contacts Unmatched Route ❌ TODO
**Problem:** Navigating to Saved Contacts page results in unmatched route error  
**Investigation Needed:**
- Find route path being used
- Check if file exists
- Create if missing

---

## 📊 MEDIUM PRIORITY

### 7. Occupation List Issues ✏️ TODO

**7a. Fix Typo**
- File: `/app/frontend/app/onboarding/general/groupedServiceCategories.ts`
- Change: "⛺ Event Support" (appears correct already)
- Also check: `/app/frontend/app/onboarding/entrepreneur/broadOccupations.ts`

**7b. Add Missing Occupations**
Required additions:
- ✅ Bartender (need to add)
- ✅ Server (need to add)
- ✅ Songwriter
- ✅ Producer
- ✅ Promoter
- ✅ Model
- ✅ Dancer
- ✅ Host/MC (may exist as MC/Host)
- ✅ Videographer
- ✅ Photographer
- ✅ Choreographer
- ✅ Lighting Tech
- ✅ Stage Manager
- ✅ Booking Agent
- ✅ Influencer
- ✅ Sound Engineer
- ✅ Stylist

**Files to Update:**
- `/app/frontend/app/onboarding/entrepreneur/servicesData.ts`
- `/app/frontend/app/onboarding/entrepreneur/broadOccupations.ts`
- Potentially group into dropdowns/subcategories

---

### 8. Raffle Button Not Visible 👀 INVESTIGATION NEEDED
**Problem:** User doesn't see "+" button for creating raffles on web  
**Current Status:** Button was added in previous fix  

**Checklist:**
- [x] Code added to `/app/frontend/app/raffles/index.tsx`
- [ ] Verify button is in correct location
- [ ] Check if frontend rebuilt/restarted
- [ ] Verify user is on correct page (/raffles)

**Solution:**
- Restart frontend
- Clear browser cache
- Verify button placement in header

---

### 9. Event Organizer Collaboration Feature 🤝 TODO
**Problem:** Organizer field is locked, should be editable with search  
**Requirements:**
- Make organizer field editable
- Add search/autocomplete for other entrepreneurs/businesses
- Allow collaboration selection

**Implementation:**
- Create search input with autocomplete
- Query users collection for entrepreneurs/businesses
- Allow selection and populate organizer field
- Store both user's ID and selected collaborator

---

### 10. Saved Venues Feature 📍 TODO
**Problem:** Saved venues section is empty with no way to add venues  
**Requirements:**
- Similar to organizer search
- Allow users to search and save venues
- Display saved venues list
- Allow removal from saved list

**Implementation:**
- Create search/add venue UI
- Store saved venues in user profile
- Display as cards/list
- Add delete functionality

---

## 💡 LONG-TERM (Brainstorming)

### 11. Entrepreneur Dashboard Customization
**User Preference:** Option B (Modular) or Option C (Multi-Role Hybrid)  

**Option B: Modular Dashboard**
- All users get same base modules
- Enable/disable: Events, Jobs, Networking, Portfolio
- Flexible but requires user configuration

**Option C: Multi-Role Hybrid** (RECOMMENDED)
- Core features for everyone: Events, Profile, Messages
- Role-specific tabs appear based on occupation
- DJ + Producer = DJ gigs + Studio booking options
- More automated, less configuration needed

**Next Steps:**
- Design mockups for modular approach
- Define which modules are core vs optional
- Plan backend data structure for preferences

---

## 📝 IMPLEMENTATION CHECKLIST

### Immediate (Now)
- [ ] Fix typo in occupation list
- [ ] Add missing 15 occupations
- [ ] Restart frontend service
- [ ] Create promo code "WGO4Y60"
- [ ] Investigate 500 error in payment flow
- [ ] Fix saved contacts route
- [ ] Verify raffle button visibility

### Short-term (Next Session)
- [ ] Create demo data seeder script
- [ ] Run demo data population
- [ ] Implement event organizer search
- [ ] Implement saved venues feature
- [ ] Resolve "Club Euphoria" login

### Medium-term (Future)
- [ ] Design modular dashboard system
- [ ] Implement dashboard customization
- [ ] Add event type selection for entrepreneurs
- [ ] Enhance collaboration features

---

## 🔍 DEBUGGING NOTES

### Frontend Issues
- Static build may be cached
- Need to restart supervisor for frontend
- Browser cache may show old version
- Check `Platform.OS` detection for web

### Backend Issues
- Promo codes collection is empty
- Payment endpoint may have Stripe integration issues
- Need better error logging for 500 errors

### Data Issues
- "Club Euphoria" missing from migration
- Demo data not seeded by default
- Some routes not created (saved contacts)

---

**Next Actions:**
1. Get user decision on "Club Euphoria" login
2. Fix occupation list + typo
3. Create promo code
4. Restart frontend to apply fixes
5. Test date picker and coupon creation
6. Create demo data seeder

**Status:** AWAITING USER INPUT + IMPLEMENTING FIXES
