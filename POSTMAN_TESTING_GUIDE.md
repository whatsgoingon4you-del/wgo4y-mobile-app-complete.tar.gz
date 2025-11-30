# Postman Testing Guide for WGO4Y Backend

## Your Backend URL
Use this base URL for all API requests in Postman:

```
https://218531ef-b8b5-427e-9d31-42563a974bff.preview.emergentagent.com/api
```

**Note:** Replace with your actual preview URL if different. The URL is shown in your Emergent dashboard.

---

## Test Endpoints

### 1. Get Events (No Auth Required)
**Method:** GET  
**URL:** `{{BASE_URL}}/events`  
**Expected:** 200 OK with array of events

### 2. Register User
**Method:** POST  
**URL:** `{{BASE_URL}}/auth/register`  
**Headers:**
```
Content-Type: application/json
```
**Body (JSON):**
```json
{
  "username": "testuser123",
  "email": "test@example.com",
  "password": "password123",
  "user_type": "business",
  "full_name": "Test User"
}
```
**Expected:** 200 OK with `token` and `user` object

**Save the token for authenticated requests!**

### 3. Get Current User (Requires Auth)
**Method:** GET  
**URL:** `{{BASE_URL}}/auth/me`  
**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json
```
**Expected:** 200 OK with user details

### 4. Create Job Posting (Requires Premium Tier)
**Method:** POST  
**URL:** `{{BASE_URL}}/jobs`  
**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json
```
**Body (JSON):**
```json
{
  "title": "DJ Needed for Event",
  "role": "DJ",
  "event_date": "2025-12-31",
  "city": "Charleston",
  "state": "SC",
  "pay": "$200-300",
  "description": "Looking for an experienced DJ"
}
```

**Note:** User must have premium tier (appreciation/silver/gold/networking)

### 5. Get All Jobs
**Method:** GET  
**URL:** `{{BASE_URL}}/jobs`  
**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
```
**Expected:** Array of jobs

### 6. Get Job Applicants (NEW - Owner Only)
**Method:** GET  
**URL:** `{{BASE_URL}}/jobs/{job_id}/applicants`  
**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
```
**Expected:** Job details with applicants array

### 7. Get My Applications (NEW - Worker)
**Method:** GET  
**URL:** `{{BASE_URL}}/jobs/my/applications`  
**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
```
**Expected:** Array of applications

---

## Setting Up Postman Collection

### Step 1: Create Environment Variable
1. Click "Environments" in Postman
2. Create a new environment called "WGO4Y"
3. Add variable:
   - **Variable:** `BASE_URL`
   - **Initial Value:** `https://218531ef-b8b5-427e-9d31-42563a974bff.preview.emergentagent.com/api`
   - **Current Value:** Same as above

### Step 2: Save Token After Registration
After registering a user:
1. Go to the "Tests" tab in the request
2. Add this script:
```javascript
var jsonData = pm.response.json();
pm.environment.set("AUTH_TOKEN", jsonData.token);
```

### Step 3: Use Token in Other Requests
In the Authorization tab of authenticated requests:
- **Type:** Bearer Token
- **Token:** `{{AUTH_TOKEN}}`

---

## Common Issues

### 404 Not Found
- **Problem:** Backend not accessible through preview URL
- **Solution:** 
  1. Verify you're using the correct preview URL
  2. Check that the backend is running: The backend should be running in the container
  3. Contact Emergent support if ingress routing is not working

### 401 Unauthorized
- **Problem:** Missing or invalid token
- **Solution:** Register a new user and use the returned token

### 403 Forbidden
- **Problem:** User doesn't have required permissions (e.g., premium tier for job posting)
- **Solution:** Upgrade user tier:
```json
PUT {{BASE_URL}}/profile
{
  "membership_tier": "appreciation"
}
```

---

## Testing Workflow

### Complete Job Board Flow:

1. **Register Business User**
   ```
   POST /auth/register
   Save token as BUSINESS_TOKEN
   ```

2. **Upgrade to Premium Tier**
   ```
   PUT /profile
   Body: {"membership_tier": "appreciation"}
   ```

3. **Create Job Posting**
   ```
   POST /jobs
   Save job_id
   ```

4. **Register Worker User**
   ```
   POST /auth/register
   Save token as WORKER_TOKEN
   ```

5. **Create Worker Profile**
   ```
   POST /workers/apply
   ```

6. **Apply to Job (as Worker)**
   ```
   POST /jobs/{job_id}/apply
   ```

7. **View Applicants (as Business Owner)**
   ```
   GET /jobs/{job_id}/applicants
   ```

8. **View My Applications (as Worker)**
   ```
   GET /jobs/my/applications
   ```

---

## Backend Health Check

Quick test to verify backend is running:

```
GET {{BASE_URL}}/events
```

If this returns 200 OK (even with empty array `[]`), the backend is healthy.

---

## Need Help?

If you're still experiencing issues:
1. Check backend logs: The logs should show any errors
2. Verify preview URL is correct
3. Ensure backend service is running
4. Contact Emergent support for ingress routing issues

---

**Last Updated:** 2025-11-30  
**Backend Version:** Job Board MVP Complete
