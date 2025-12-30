# WGO4Y Foundation Live - Deployment Guide (Step 1)

## Status: Ready to Deploy ✅

---

## 🚀 Step 1: Deploy to Production (NO Domain Connection Yet)

### Deployment Process

**1. Preview First (Recommended)**
- Click **Preview** button in Emergent UI
- Verify application loads correctly
- Test a few key features

**2. Deploy**
- Click **Deploy** button in Emergent UI
- Click **"Deploy Now"**
- Wait 10-15 minutes for deployment to complete

**3. Get Production URL**
- Production URL will be displayed after deployment
- Also viewable from **Home** tab in Emergent UI
- URL format: `https://[your-app].ondigitalocean.app` or similar

**4. Send URL to Team**
- Share production URL for testing
- Do NOT connect custom domain yet

---

## ✅ Post-Deployment Verification Checklist

### Backend Health Checks

**1. API Health Endpoint**
```bash
curl https://[production-url]/api/health
```
Expected: `200 OK` with `{"status": "healthy"}` or similar

**2. API Documentation**
Visit: `https://[production-url]/api/docs`
Expected: FastAPI docs page loads

**3. API Stats**
```bash
curl https://[production-url]/api/
```
Expected: `{"message": "WGO4Y API v1.0"}`

---

### Frontend Checks

**1. Homepage Loads**
Visit: `https://[production-url]/`
Expected: App loads, no errors in console

**2. Login Page**
Visit: `https://[production-url]/(auth)/login`
Expected: Login form displays

**3. Registration**
Visit: `https://[production-url]/(auth)/register`
Expected: Sign up form displays

---

### Feature Tests

**Test 1: User Registration & Login**
1. Register new General Public user
2. Login with credentials
3. Verify dashboard loads
4. Logout
5. Login again → Session should work

**Test 2: Business Profile with Photos**
1. Register as Business user
2. Complete onboarding
3. Upload business photos
4. Save profile
5. Navigate away and back → Photos should persist
6. Logout and login → Photos should still be there

**Test 3: Session Persistence**
1. Login as any user
2. Edit profile (add bio, location, etc.)
3. Save
4. Navigate to different pages
5. Come back to profile → Should still be logged in
6. Close browser (don't logout)
7. Reopen browser → Session should persist (7-day JWT)

**Test 4: Approval System**
1. Login as Business
2. Create event
3. Event should be marked as "pending"
4. Login as approval_admin (approval@wgo4y.com / Admin2024!)
5. Go to `/admin/approval-dashboard`
6. Should see event in pending queue
7. Approve event
8. Event should now be visible to public

---

## 📊 Data Persistence Confirmation

### What Persists ✅
- **User accounts** - Stored in MongoDB
- **Profile data** - Stored in MongoDB
- **Uploaded images** - Stored as base64 in MongoDB
- **Events, coupons, raffles, jobs** - Stored in MongoDB
- **Messages & notifications** - Stored in MongoDB
- **Sessions (JWT tokens)** - 7-day expiration

### After Restart/Redeploy ✅
- All data remains intact
- Users stay logged in (unless 7 days expired)
- Photos/images persist
- No data loss

### MongoDB Storage
- Managed by Emergent
- Persistent across deployments
- Backed up automatically
- Production-grade reliability

---

## 🔧 Environment Variables (Configured)

These are already set and will work in production:
- `JWT_SECRET` - For token signing
- `MONGO_URL` - Database connection
- `DB_NAME` - Database name
- `REACT_APP_BACKEND_URL` - Frontend → Backend API

No additional configuration needed.

---

## ⚠️ Known Production Considerations

### Image Storage (Current: Base64 in MongoDB)
**Current Approach:**
- ✅ Works for Foundation Live
- ✅ Persists across restarts
- ✅ No additional setup needed
- ⚠️ MongoDB has 16MB document size limit
- ⚠️ Base64 encoding increases size by ~33%

**Practical Limits:**
- Profile photo: ~2-3MB original → Works fine
- Business photos: 5-10 photos × 2MB → Works fine
- Portfolio: 10-20 photos × 2MB → Works fine

**For Future Scale:**
- Consider cloud storage (R2/S3) if:
  - Individual images > 5MB
  - Users uploading 50+ photos
  - High-resolution galleries needed

**For Foundation Live:** Current approach is fine ✅

---

## 📝 Testing Script

After deployment, run these tests:

```bash
# Set your production URL
PROD_URL="https://[your-production-url]"

# 1. Health check
curl $PROD_URL/api/health

# 2. Root endpoint
curl $PROD_URL/api/

# 3. Test login (optional)
curl -X POST $PROD_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"approval_admin","password":"Admin2024!"}'

# 4. Test event categories
curl $PROD_URL/api/event-categories

# 5. Test docs (in browser)
open $PROD_URL/api/docs
```

---

## ✅ Success Criteria

**Before moving to Step 2 (domain connection), confirm:**

- [ ] `/api/health` returns 200 ✅
- [ ] `/api/docs` loads ✅
- [ ] Can register new user ✅
- [ ] Can login ✅
- [ ] Session persists after profile save ✅
- [ ] Business can upload photos ✅
- [ ] Photos persist after logout/login ✅
- [ ] Approval dashboard works ✅
- [ ] No errors in browser console ✅
- [ ] Mobile responsive ✅

---

## 🎯 What to Report Back

After testing, report:

1. **Production URL** - Share the URL you received
2. **Health Check** - Did `/api/health` return 200?
3. **Photo Upload** - Did business photo upload work?
4. **Session Test** - Did session persist after save + navigate?
5. **Data Persistence** - Did photos remain after logout/login?
6. **Any Issues** - Console errors, broken features, etc.

---

## 🚀 Ready for Step 1

**Action Required:**
1. Click **Deploy** button in Emergent UI
2. Wait 10-15 minutes
3. Get production URL
4. Run verification tests
5. Report back with results

**Then we'll proceed to Step 2: Domain Connection**

**Cost:** 50 credits/month (can cancel anytime)

---

## 📞 Need Help?

If deployment fails or issues arise:
- Check Emergent deployment logs
- Verify environment variables are set
- Contact Emergent support
- Report specific error messages

**Ready to deploy! 🚀**
