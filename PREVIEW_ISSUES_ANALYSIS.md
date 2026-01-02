# Preview Environment Issues - Analysis & Solutions

**Date:** 2026-01-02  
**Preview URL:** https://profile-fixer-4.preview.emergentagent.com

## Issues Reported

### ✅ Issue 1: Backend Health Check Working
**Status:** CONFIRMED WORKING  
**Endpoint:** `/api/health` returns `{"status":"healthy","database":"connected"}`  
**Conclusion:** Backend is fully operational

---

### ❌ Issue 2: `/api/docs` Returns 404
**Status:** ROUTING ISSUE  
**Root Cause:** FastAPI documentation exists at `/docs` (root level), but the frontend SPA is catching ALL routes and showing React app instead of proxying backend requests.

**Current Behavior:**
- FastAPI auto-generates docs at `/docs` 
- Kubernetes ingress routes `/api/*` to backend (port 8001)
- All other routes go to frontend (port 3000)
- Frontend is a SPA that captures all non-`/api` routes

**Solutions:**
1. **Access docs directly via backend:** Not exposed in current ingress
2. **Add ingress rule:** Route `/docs` to backend (requires platform support)
3. **Alternative:** Access via localhost:8001/docs when debugging

**Recommendation:** This is by design for SPA deployments. Docs are typically disabled in production for security. If needed, contact Emergent support to expose `/docs` endpoint.

---

### 🔴 Issue 3: React Error #418 (CRITICAL)
**Status:** PRODUCTION MINIFICATION ISSUE  
**Error:** "Minified React error #418"  
**Actual Error:** "Rendered more hooks than during the previous render"

#### What is React Error #418?
This means a component is violating React Hooks rules:
- Using hooks conditionally (`if` statement before hook)
- Early returns before all hooks are called
- Changing number of hooks between renders

#### Common Causes in This Codebase:
```jsx
// ❌ WRONG - Conditional hook
function Component() {
  if (condition) {
    useState(0); // Error #418!
  }
}

// ❌ WRONG - Early return before hooks
function Component() {
  if (!user) return null;
  useEffect(() => {}); // Error #418!
}

// ✅ CORRECT
function Component() {
  const [state] = useState(0); // Always call
  useEffect(() => {});        // Always call
  
  if (condition) return null;  // Return after hooks
}
```

#### Affected Routes (Reported):
- **Coupons/Create** - Non-functional
- **Saved Contacts** - "Unmatched Route" (route doesn't exist)
- Multiple screens showing errors

#### Why It's Hard to Debug:
- Production build minifies code
- Error message is cryptic
- Stack trace points to minified bundle, not source

---

## Solutions Implemented

### Solution 1: Rebuilt Frontend
✅ **Status:** COMPLETED  
**Action:** Ran `npx expo export --platform web` to create fresh build  
**Result:** New bundle hash `entry-b26791cabc341fe4dc7d5e08cec165b4.js`  
**Deployed:** Frontend restarted and serving new build

### Solution 2: Analyzed Route Structure
✅ **Status:** COMPLETED  
**Finding:** This is the FULL APP with all routes present:
- Events, Coupons, Raffles, Jobs ✅
- Profile management (edit-business, edit-entrepreneur) ✅
- Admin (approval-dashboard, featured-videos) ✅
- Messaging, Workers, Analytics ✅

**"Saved Contacts" Issue:**  
- Route does NOT exist in codebase
- User might be looking for: `/workers/contact-requests`
- Or: `/saved-venues`

---

## Recommendations

### Short-term (Debugging React #418):

**Option A: Check Browser Console (IMMEDIATE)**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for the actual error above the #418 message
4. Check which component/route is failing
5. Share screenshot with component name

**Option B: Test Specific Routes**
Test these routes individually and report which ones throw #418:
- `/coupons/create`
- `/raffles/create`
- `/events/create`
- `/profile/edit-business`
- `/admin/approval-dashboard`

**Option C: Switch to Development Mode**
For detailed error messages, we need to run Expo dev server:
```bash
# This will show un-minified errors
cd /app/frontend
npx expo start --web --port 3000
```
**Note:** This requires modifying the readonly supervisor config

---

### Long-term (Fixes):

1. **Find and Fix Hooks Violations**
   - Search for early returns before hooks
   - Look for conditional `useState`/`useEffect`
   - Check components in `/app/frontend/app/coupons/`, `/app/frontend/app/raffles/`

2. **Add Error Boundaries**
   - Wrap routes in ErrorBoundary components
   - Show user-friendly errors instead of crashes

3. **Enable Source Maps in Production**
   - Configure Metro bundler to include source maps
   - Helps debug production builds

4. **Add Route Guards**
   - Check auth before rendering components
   - Prevent hooks from running in unauthenticated states

---

## Next Steps

**IMMEDIATE:** Please provide:
1. **Browser console screenshot** showing the full error (not just #418)
2. **Specific route** where error occurs (e.g., `/coupons/create`)
3. **User actions** that trigger the error (e.g., "Click Create Coupon button")

**With this information, I can:**
- Identify the exact component causing #418
- Fix the hooks violation
- Deploy updated build

---

## Technical Details

### Current Build Info:
- **Build Date:** 2026-01-02
- **Bundle Hash:** `entry-b26791cabc341fe4dc7d5e08cec165b4.js`
- **Platform:** Expo Web (React Native for Web)
- **Bundler:** Metro
- **Minification:** Enabled (production mode)
- **Source Maps:** Not included

### Environment:
- **Backend:** http://0.0.0.0:8001 (FastAPI + MongoDB)
- **Frontend:** http://0.0.0.0:3000 (Expo Web Static)
- **Deployment:** Kubernetes with Ingress routing
- **Supervisor:** Using `npx serve` for static files

### Ingress Routing:
```
/api/*    → Backend (port 8001)
/*        → Frontend (port 3000)
```

This means `/docs` gets caught by frontend, not backend.
