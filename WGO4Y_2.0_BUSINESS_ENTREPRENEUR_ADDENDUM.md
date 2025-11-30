# WGO4Y 2.0 - Business & Entrepreneur Implementation Addendum

## 🏢 Overview

This document extends the main implementation plan to include Business and Entrepreneur user types with their respective membership tiers, dashboards, and features.

---

## 📊 Membership Tiers Summary

### General Public
- **Basic** (Free): Profile, coupons, raffles, volunteer
- **Appreciation** ($1.99/mo): + Alerts, VIP access, messaging, job board viewing

### Business
- **Bronze** (Free): Basic page with content limits, coupon program
- **Silver** ($19.99/mo): Self-managed, unlimited content, event posting, job board (1 free/mo)
- **Gold** ($39.99/mo): WGO4Y-managed, all features, unlimited job posts, consultant access

### Entrepreneur
- **Basic** ($4.99/mo): Profile, limited content, 1 event/mo, directory listing
- **Starter** ($9.99/mo): More content, 2 events/mo, job board access, portfolio
- **Networking** ($19.99/mo): Unlimited everything, team hosting, VIP services

---

## 🗄️ Database Schema Extensions

### Users Collection - Business Fields
```javascript
{
  // ... existing fields ...
  user_type: "business",
  membership_tier: "bronze" | "silver" | "gold",
  
  // Business-specific fields
  business_name: string,
  business_description: string,
  business_category: string,              // e.g., "Nightclubs:Dance Clubs"
  business_photos: string[],              // Array of base64 images
  business_videos: string[],              // Array of video URLs/base64
  business_content: string,               // Written content
  content_character_count: number,        // Track against limits
  page_adjustments_count: number,         // Track for Bronze ($2.50 each)
  page_adjustments_this_month: number,    // Reset monthly for Silver
  stripe_account_id: string | null,       // For receiving payments
  analytics: {
    page_views: number,
    ticket_sales: number,
    engagement: number
  }
}
```

### Users Collection - Entrepreneur Fields
```javascript
{
  // ... existing fields ...
  user_type: "entrepreneur",
  membership_tier: "basic" | "starter" | "networking",
  
  // Entrepreneur-specific fields
  stage_name: string,
  entrepreneur_category: string,          // e.g., "DJs:Club"
  bio: string,
  photos: string[],
  videos: string[],
  music_files: string[],                  // URLs or references
  portfolio_items: PortfolioItem[],
  team_members: string[],                 // Array of user IDs (Networking tier)
  events_posted_this_month: number,
  job_posts_this_month: number,
  adjustments_this_month: number,
  stripe_account_id: string | null
}
```

### New Collections

#### business_pages
```javascript
{
  _id: string,
  user_id: string,
  business_name: string,
  description: string,
  content: string,
  photos: string[],
  videos: string[],
  category: string,
  tier: string,
  content_limits: {
    max_characters: number,
    max_photos: number,
    max_videos: number
  },
  adjustments_count: number,
  created_at: datetime,
  updated_at: datetime
}
```

#### entrepreneur_pages
```javascript
{
  _id: string,
  user_id: string,
  stage_name: string,
  bio: string,
  content: string,
  photos: string[],
  videos: string[],
  music: string[],
  category: string,
  tier: string,
  portfolio: PortfolioItem[],
  team_members: string[],
  created_at: datetime,
  updated_at: datetime
}
```

#### job_postings
```javascript
{
  _id: string,
  posted_by: string,                      // user_id
  company_name: string,
  job_title: string,
  description: string,
  category: string,
  location: string,
  salary_range: string | null,
  requirements: string[],
  applications: Application[],
  status: "active" | "closed",
  posted_at: datetime,
  expires_at: datetime
}
```

#### page_adjustments
```javascript
{
  _id: string,
  user_id: string,
  user_type: "business" | "entrepreneur",
  description: string,
  status: "pending" | "completed",
  cost: number,                           // $2.50 for Bronze business
  created_at: datetime,
  completed_at: datetime | null
}
```

#### vip_offerings
```javascript
{
  _id: string,
  created_by: string,                     // user_id
  creator_type: "business" | "entrepreneur",
  title: string,
  description: string,
  price: number,
  image: string,
  category: string,
  features: string[],
  available: boolean,
  created_at: datetime
}
```

#### portfolio_items
```javascript
{
  _id: string,
  entrepreneur_id: string,
  title: string,
  description: string,
  media_type: "image" | "video" | "audio",
  media_url: string,
  testimonials: Testimonial[],
  created_at: datetime
}
```

---

## 🔌 New Backend API Endpoints

### Business Endpoints

```
# Page Management
GET    /api/business/page                - Get business page
POST   /api/business/page/create         - Create business page
PUT    /api/business/page/update         - Update page content
POST   /api/business/page/add-photo      - Add photo (check limits)
POST   /api/business/page/add-video      - Add video (check limits)
DELETE /api/business/page/photo/{id}     - Remove photo
DELETE /api/business/page/video/{id}     - Remove video
POST   /api/business/page/request-adjustment - Request page adjustment (Bronze)
GET    /api/business/page/limits         - Get current usage vs limits

# Event Management
GET    /api/business/events              - Get business events
POST   /api/business/events/create       - Create event (check tier permissions)
PUT    /api/business/events/{id}         - Update event
DELETE /api/business/events/{id}         - Delete event
GET    /api/business/events/{id}/bookings - Get event bookings

# Coupon Management
GET    /api/business/coupons             - Get business coupons
POST   /api/business/coupons/create      - Create coupon
PUT    /api/business/coupons/{id}        - Update coupon
GET    /api/business/coupons/{id}/stats  - Redemption stats

# Raffle Management
GET    /api/business/raffles             - Get business raffles
POST   /api/business/raffles/create      - Create raffle
GET    /api/business/raffles/{id}/entries - Get raffle entries

# Job Board
POST   /api/business/jobs/create         - Post job (check limits, charge if needed)
GET    /api/business/jobs                - Get business job postings
PUT    /api/business/jobs/{id}           - Update job posting
DELETE /api/business/jobs/{id}           - Close job posting
GET    /api/business/jobs/{id}/applicants - Get job applicants

# VIP Offerings (Gold only)
POST   /api/business/vip/create          - Create VIP offering
GET    /api/business/vip                 - Get business VIP offerings
PUT    /api/business/vip/{id}            - Update VIP offering

# Analytics (All tiers)
GET    /api/business/analytics           - Get business analytics
GET    /api/business/analytics/events    - Event-specific analytics

# Contacts
GET    /api/business/contacts            - Get saved contacts
POST   /api/business/contacts/save       - Save contact
DELETE /api/business/contacts/{id}       - Remove contact

# Membership
POST   /api/business/upgrade             - Upgrade tier (Stripe)
POST   /api/business/downgrade           - Downgrade tier
```

### Entrepreneur Endpoints

```
# Page Management
GET    /api/entrepreneur/page            - Get entrepreneur page
POST   /api/entrepreneur/page/create     - Create page
PUT    /api/entrepreneur/page/update     - Update page
POST   /api/entrepreneur/page/add-media  - Add photo/video/music (check limits)
POST   /api/entrepreneur/page/request-adjustment - Request adjustment (Starter)

# Portfolio Management
GET    /api/entrepreneur/portfolio       - Get portfolio items
POST   /api/entrepreneur/portfolio/create - Add portfolio item
PUT    /api/entrepreneur/portfolio/{id}  - Update item
DELETE /api/entrepreneur/portfolio/{id}  - Remove item
POST   /api/entrepreneur/portfolio/{id}/testimonial - Add testimonial

# Event Posting
POST   /api/entrepreneur/events/create   - Post event (check limits, charge if needed)
GET    /api/entrepreneur/events          - Get entrepreneur events

# Services
GET    /api/entrepreneur/services        - Get services offered
POST   /api/entrepreneur/services/create - Create service
PUT    /api/entrepreneur/services/{id}   - Update service

# Bookings
GET    /api/entrepreneur/bookings        - Get all bookings/gigs
PUT    /api/entrepreneur/bookings/{id}   - Update booking status

# Job Board
GET    /api/entrepreneur/jobs            - Browse job postings
POST   /api/entrepreneur/jobs/{id}/apply - Apply to job
POST   /api/entrepreneur/jobs/create     - Post job (Starter/Networking)

# VIP Offerings
POST   /api/entrepreneur/vip/create      - Create VIP service
GET    /api/entrepreneur/vip             - Get entrepreneur VIP offerings

# Team (Networking tier only)
POST   /api/entrepreneur/team/invite     - Invite team member
GET    /api/entrepreneur/team            - Get team members
DELETE /api/entrepreneur/team/{id}       - Remove team member

# Membership
POST   /api/entrepreneur/upgrade         - Upgrade tier (Stripe)
```

### Shared Endpoints

```
# Messaging (Unrestricted for Business/Entrepreneur)
POST   /api/messages/send                - Send message (no category limit for B2B/E2E)
GET    /api/messages/check-permissions   - Check if user can message freely

# Directory
GET    /api/directory/businesses         - Browse businesses
GET    /api/directory/entrepreneurs      - Browse entrepreneurs
GET    /api/directory/search             - Search directory

# Job Board (Viewing)
GET    /api/jobs                         - Browse all job postings
GET    /api/jobs/{id}                    - Get job details
```

---

## 📱 Frontend Screens & Components

### Business User Screens

#### 1. Business Dashboard (`/(tabs-business)/dashboard`)
**Tabs:**
- Profile
- My Events
- My Coupons
- My Raffles
- Bookings
- Messages
- Jobs
- Analytics
- Saved Contacts
- VIP Offerings (Gold only)
- Consultant (Gold only)
- Log Out

#### 2. Business Profile/Page Management (`/business/profile`)
**Components:**
- Tier badge display
- Content editor (with character counter)
- Photo gallery manager (shows X/5 or X/∞)
- Video manager (shows limit based on tier)
- Category selection
- "Request Adjustment" button (Bronze) or "Edit Freely" (Silver/Gold)
- Upgrade CTA if not Gold

**Validation:**
- Check character limits before save
- Check photo/video count
- Alert when limit reached

#### 3. Business Event Management (`/business/events`)
**Features:**
- List of business events
- "Create Event" button (check tier: Silver/Gold only)
- Event cards showing:
  - Event details
  - Tickets sold
  - Bookings count
  - Edit/Delete options
- Event creation form
- Booking list per event

#### 4. Business Coupon Manager (`/business/coupons`)
**Features:**
- Create coupon form
- List of active coupons
- Redemption stats
- QR code generation
- Edit/deactivate options

#### 5. Business Raffle Manager (`/business/raffles`)
**Features:**
- Create raffle form
- Active raffles list
- Entry count
- Winner selection
- Prize management

#### 6. Job Board Manager (`/business/jobs`)
**Features:**
- "Post Job" button (check limits)
  - Bronze: Not available
  - Silver: 1 free/month, then $4.99 each
  - Gold: Unlimited
- List of active job postings
- Applicant list per job
- Application review interface
- Job status management

#### 7. Business Analytics (`/business/analytics`)
**Metrics:**
- Page views (chart)
- Ticket sales (breakdown by event)
- Coupon redemptions
- Raffle entries
- Message inquiries
- Top performing events
- Revenue tracking

#### 8. Business VIP Offerings (`/business/vip`) - Gold Only
**Features:**
- Create VIP package form
- List of offerings
- Pricing management
- Availability toggle
- Booking/purchase tracking

#### 9. Business Membership (`/business/membership`)
**Features:**
- Current tier display
- Feature comparison table
- Upgrade/downgrade options
- Billing history
- Cancel subscription

### Entrepreneur User Screens

#### 1. Entrepreneur Dashboard (`/(tabs-entrepreneur)/dashboard`)
**Tabs:**
- Profile
- My Events/Bookings
- My Coupons
- My Raffles
- Services
- Messages
- Portfolio
- Jobs
- Consultant
- VIP Offerings
- Saved Contacts
- Log Out

#### 2. Entrepreneur Profile/Page (`/entrepreneur/profile`)
**Components:**
- Stage name editor
- Bio editor (character counter)
- Photo gallery (limit based on tier)
- Video gallery (limit + cost for additional)
- Music gallery (limit + cost for additional)
- Category selection
- Team members (Networking tier only)
- Adjustment request button

#### 3. Portfolio Manager (`/entrepreneur/portfolio`)
**Features:**
- Grid of portfolio items
- "Add Item" button
- Item detail view:
  - Title/description
  - Media (image/video/audio)
  - Testimonials section
  - Share options
- Edit/delete items

#### 4. Entrepreneur Services (`/entrepreneur/services`)
**Features:**
- List of services offered
- Service creation form
- Pricing management
- Booking calendar
- Service packages

#### 5. Entrepreneur Bookings (`/entrepreneur/bookings`)
**Features:**
- Calendar view
- List of gigs/bookings
- Booking status (pending, confirmed, completed)
- Client info
- Payment tracking

#### 6. Entrepreneur Job Board (`/entrepreneur/jobs`)
**Features:**
- Browse job postings
- Filter by category
- Apply to jobs
- Track applications
- Post jobs (Starter/Networking)

#### 7. Entrepreneur VIP Services (`/entrepreneur/vip`)
**Features:**
- Create premium service packages
- Exclusive offerings
- Special pricing
- VIP client management

#### 8. Team Management (`/entrepreneur/team`) - Networking Only
**Features:**
- Invite team members
- Team roster
- Role assignment
- Shared bookings
- Team calendar

### Shared/Updated Screens

#### Updated Messaging Screen
**Business/Entrepreneur View:**
- No category restrictions
- Contact list (businesses + entrepreneurs)
- Direct messaging
- Group conversations
- Message threads

**General Public View:**
- Category dropdown (23 inquiry types)
- Can only message businesses/entrepreneurs
- Limited to service inquiries

#### Directory/Search Screens
**New Screens:**
- `/directory/businesses` - Browse all businesses
- `/directory/entrepreneurs` - Browse all entrepreneurs
- Category filters
- Tier badges
- Quick contact/message

#### Job Board (`/jobs`)
**For General Public (Appreciation members):**
- Browse job postings
- Filter by category/location
- View details
- External apply link

**For Entrepreneurs:**
- Browse + Apply
- Track applications

**For Businesses:**
- Post + Manage

---

## 💳 Stripe Integration Details

### Products & Prices to Create (Test Mode)

#### Business Tiers
```javascript
// Silver - Monthly
{
  product_name: "WGO4Y Business Silver",
  price: 19.99,
  interval: "month",
  features: ["Self-managed page", "Unlimited content", "Event posting", "Job board"]
}

// Silver - Semi-Annual (7 months billed as 6)
{
  product_name: "WGO4Y Business Silver (Semi-Annual)",
  price: 119.94,  // 6 months price, gets 7 months
  interval: "month",
  interval_count: 6
}

// Silver - Annual (14 months billed as 12)
{
  product_name: "WGO4Y Business Silver (Annual)",
  price: 239.88,  // 12 months price, gets 14 months
  interval: "year"
}

// Gold - Monthly
{
  product_name: "WGO4Y Business Gold",
  price: 39.99,
  interval: "month"
}

// Gold - Semi-Annual/Annual (same structure)
```

#### Entrepreneur Tiers
```javascript
// Basic - Monthly
{
  product_name: "WGO4Y Entrepreneur Basic",
  price: 4.99,
  interval: "month"
}

// Starter - Monthly
{
  product_name: "WGO4Y Entrepreneur Starter",
  price: 9.99,
  interval: "month"
}

// Starter - Semi-Annual (7 for 6)
{
  product_name: "WGO4Y Entrepreneur Starter (Semi-Annual)",
  price: 59.94,
  interval: "month",
  interval_count: 6
}

// Networking - Monthly
{
  product_name: "WGO4Y Entrepreneur Networking",
  price: 19.99,
  interval: "month"
}

// Networking - Semi-Annual/Annual (same structure)
```

#### Pay-Per-Use Products
```javascript
// Page Adjustment (Bronze Business)
{
  product_name: "Business Page Adjustment",
  price: 2.50,
  type: "one_time"
}

// Additional Video (Entrepreneur Starter)
{
  product_name: "Additional Video Slot",
  price: 4.99,
  type: "one_time"
}

// Additional Music (Entrepreneur Starter)
{
  product_name: "Additional Music Track",
  price: 0.99,
  type: "one_time"
}

// Additional Event Posting
{
  product_name: "Additional Event Posting",
  price: 4.99,
  type: "one_time"
}

// Additional Job Posting (Business Silver)
{
  product_name: "Additional Job Posting",
  price: 4.99,
  type: "one_time"
}
```

### Stripe Account Connection
- Both Business and Entrepreneur users need Stripe Connect accounts to receive payments
- Use Stripe Connect Express for easier onboarding
- Allow users to connect their Stripe account from dashboard

---

## 🔐 Feature Gating & Validation Logic

### Content Limits Enforcement

```javascript
// Example: Business Photo Upload
async function canUploadPhoto(userId) {
  const user = await getUser(userId);
  const page = await getBusinessPage(userId);
  
  const limits = {
    bronze: 5,
    silver: Infinity,
    gold: Infinity
  };
  
  const maxPhotos = limits[user.membership_tier];
  const currentPhotos = page.photos.length;
  
  if (currentPhotos >= maxPhotos) {
    return {
      allowed: false,
      message: `Photo limit reached. Upgrade to Silver for unlimited photos.`
    };
  }
  
  return { allowed: true };
}

// Example: Entrepreneur Event Posting
async function canPostEvent(userId) {
  const user = await getUser(userId);
  const eventsThisMonth = await getEventsPostedThisMonth(userId);
  
  const limits = {
    basic: 1,
    starter: 2,
    networking: Infinity
  };
  
  const maxEvents = limits[user.membership_tier];
  
  if (eventsThisMonth >= maxEvents) {
    // Offer to purchase additional
    if (user.membership_tier === "starter") {
      return {
        allowed: false,
        canPurchase: true,
        cost: 4.99,
        message: "Event limit reached. Purchase additional posting for $4.99?"
      };
    } else {
      return {
        allowed: false,
        message: "Event limit reached. Upgrade to Starter or Networking."
      };
    }
  }
  
  return { allowed: true };
}
```

### Job Board Access Logic

```javascript
async function canPostJob(userId, userType) {
  if (userType === "business") {
    const user = await getUser(userId);
    
    if (user.membership_tier === "bronze") {
      return { allowed: false, message: "Upgrade to Silver or Gold to post jobs." };
    }
    
    if (user.membership_tier === "silver") {
      const jobsThisMonth = await getJobsPostedThisMonth(userId);
      if (jobsThisMonth === 0) {
        return { allowed: true, free: true };
      } else {
        return {
          allowed: false,
          canPurchase: true,
          cost: 4.99,
          message: "Free job posting used. Additional posts are $4.99 each."
        };
      }
    }
    
    if (user.membership_tier === "gold") {
      return { allowed: true };
    }
  }
  
  if (userType === "entrepreneur") {
    const user = await getUser(userId);
    
    if (user.membership_tier === "basic") {
      return { allowed: false, message: "Upgrade to Starter to post jobs." };
    }
    
    const jobsThisMonth = await getJobsPostedThisMonth(userId);
    
    if (user.membership_tier === "starter") {
      if (jobsThisMonth === 0) {
        return { allowed: true, free: true };
      } else {
        return { allowed: false, canPurchase: true, cost: 4.99 };
      }
    }
    
    if (user.membership_tier === "networking") {
      return { allowed: true };
    }
  }
}

async function canViewJobs(userId, userType) {
  if (userType === "general_public") {
    const user = await getUser(userId);
    if (user.membership_tier !== "appreciation") {
      return { allowed: false, message: "Upgrade to Appreciation to view job board." };
    }
    return { allowed: true, canApply: false };  // View only
  }
  
  if (userType === "entrepreneur") {
    return { allowed: true, canApply: true };
  }
  
  if (userType === "business") {
    return { allowed: true, canPost: true };
  }
}
```

---

## 🧪 Testing Scenarios

### Business User Testing

**Bronze Tier:**
- [ ] Create page with content up to 1500 characters
- [ ] Upload 5 photos successfully
- [ ] Attempt 6th photo → blocked with upgrade prompt
- [ ] Upload 1 video
- [ ] Attempt 2nd video → blocked
- [ ] Request page adjustment → $2.50 charge initiated
- [ ] Create coupon
- [ ] Attempt to post event → blocked (Silver/Gold feature)
- [ ] Attempt to post job → blocked
- [ ] Message entrepreneur freely (no category limit)

**Silver Tier:**
- [ ] Edit page content freely (unlimited characters)
- [ ] Upload unlimited photos
- [ ] Upload 5 videos
- [ ] Attempt 6th video → blocked
- [ ] Post event to local events page
- [ ] Post 1 free job
- [ ] Post 2nd job → $4.99 charge
- [ ] Access entrepreneur network
- [ ] View analytics

**Gold Tier:**
- [ ] All Silver features work
- [ ] Page managed by WGO4Y flag shown
- [ ] Post events to main + local pages
- [ ] Unlimited job postings
- [ ] Access consultants
- [ ] Create VIP offerings
- [ ] Social media posting integration (UI only for MVP)
- [ ] Text/email blast feature (UI only for MVP)

### Entrepreneur User Testing

**Basic Tier:**
- [ ] Create profile with 500 character bio
- [ ] Upload 5 photos
- [ ] Upload 1 video
- [ ] Upload 2 music files
- [ ] Post 1 event this month
- [ ] Attempt 2nd event → blocked with upgrade/purchase prompt
- [ ] View coupons/raffles (not create)
- [ ] Appear in directory

**Starter Tier:**
- [ ] 1500 character bio
- [ ] Upload 10 photos
- [ ] Upload 2 videos
- [ ] Purchase 3rd video for $4.99
- [ ] Upload 10 music tracks
- [ ] Purchase 11th track for $0.99
- [ ] Post 2 events this month
- [ ] Post 1 free job
- [ ] Access entrepreneur network
- [ ] 2 free page adjustments this month
- [ ] Add portfolio items

**Networking Tier:**
- [ ] Unlimited content, photos, videos, music
- [ ] Unlimited events
- [ ] Unlimited job posts
- [ ] Team hosting (invite members)
- [ ] Access VIP services
- [ ] Create VIP offerings

### Messaging Testing

**General Public → Business/Entrepreneur:**
- [ ] Must select inquiry category from dropdown
- [ ] Cannot send without category
- [ ] Rate limited to 5 new threads per hour

**Business ↔ Entrepreneur:**
- [ ] Can message freely without category
- [ ] No subject restrictions
- [ ] Can initiate conversations

**Entrepreneur ↔ Entrepreneur:**
- [ ] Unrestricted messaging
- [ ] Can collaborate/network

---

## 📊 Analytics & Tracking

### Business Analytics Dashboard

**Metrics to Track:**
```javascript
{
  page_views: number,
  page_views_chart: TimeSeriesData,
  
  events: {
    total_created: number,
    total_tickets_sold: number,
    revenue: number,
    top_event: Event
  },
  
  coupons: {
    total_created: number,
    total_redeemed: number,
    redemption_rate: number
  },
  
  raffles: {
    total_entries: number,
    revenue: number
  },
  
  messages: {
    inquiries_received: number,
    response_rate: number
  },
  
  job_postings: {
    total_posted: number,
    total_applicants: number,
    applications_per_posting: number
  }
}
```

### Entrepreneur Analytics (Future)

Similar structure tracking:
- Profile views
- Service inquiries
- Booking requests
- Portfolio engagement

---

## 🔄 Updated Implementation Phases

### Phase 1: Backend Foundation (3-4 hours) - UPDATED
**New Tasks:**
1. Extend user model for Business/Entrepreneur
2. Create business_pages, entrepreneur_pages collections
3. Create job_postings, page_adjustments collections
4. Add all Business endpoints
5. Add all Entrepreneur endpoints
6. Implement content limit validation logic
7. Add Stripe products for all tiers
8. Test with curl

### Phase 2: Onboarding Flow (2 hours) - UPDATED
**New Tasks:**
- Add Business/Entrepreneur specific onboarding
- Business: select tier, set up page
- Entrepreneur: select tier, set up profile
- Different category selections per user type

### Phase 3: Business Dashboard & Features (3-4 hours) - NEW
**Tasks:**
1. Create Business tab navigation
2. Build page management screen
3. Implement event management
4. Build coupon/raffle managers
5. Create job board posting UI
6. Add analytics dashboard
7. VIP offerings (Gold)
8. Test tier-specific features

### Phase 4: Entrepreneur Dashboard & Features (3-4 hours) - NEW
**Tasks:**
1. Create Entrepreneur tab navigation
2. Build profile/page management
3. Implement portfolio manager
4. Build services manager
5. Create bookings interface
6. Add job browsing/applying
7. Team management (Networking)
8. Test tier-specific features

### Phase 5: Membership & Stripe (3 hours) - UPDATED
**Tasks:**
1. Extend membership screens for all tiers
2. Implement pay-per-use purchases
3. Add Stripe Connect onboarding
4. Test subscription flows for all tiers
5. Test one-time purchases

### Phase 6: Messaging & Directory (2 hours) - UPDATED
**Tasks:**
1. Update messaging to allow unrestricted B2B/E2E
2. Maintain category restrictions for General Public
3. Create directory/search screens
4. Test messaging permissions

### Phase 7: Content Filtering & VIP (2 hours) - UPDATED
**Tasks:**
1. Implement content filtering for General Public
2. Add VIP content creation for Business/Entrepreneur
3. Gate VIP content properly
4. Test filtering accuracy

### Phase 8: Testing & Polish (2-3 hours)
**Tasks:**
1. End-to-end testing all user types
2. Test all tier transitions
3. Verify pay-per-use charges
4. Test all content limits
5. UI/UX polish

**Updated Total: 20-26 hours**

---

## 💡 Key Architectural Decisions

### 1. User Type Routing
```javascript
// app/index.tsx
if (user.user_type === "general_public") {
  router.replace("/(tabs)/home");
} else if (user.user_type === "business") {
  router.replace("/(tabs-business)/dashboard");
} else if (user.user_type === "entrepreneur") {
  router.replace("/(tabs-entrepreneur)/dashboard");
}
```

### 2. Shared vs. Specific Components
- Messaging: Shared component with conditional logic
- Events: Shared viewing, separate creation flows
- Directory: Shared search with role-aware actions

### 3. Tier Validation Middleware
```javascript
// Backend middleware
function requireTier(minTier) {
  return async (req, res, next) => {
    const user = req.user;
    if (!meetsMinimumTier(user.membership_tier, minTier)) {
      return res.status(403).json({
        error: "Upgrade required",
        current_tier: user.membership_tier,
        required_tier: minTier
      });
    }
    next();
  };
}

// Usage
app.post("/api/business/events", requireTier("silver"), createEvent);
```

---

## ⚠️ Additional Challenges & Solutions

### Challenge: Complex Tier Logic
**Solution**: Create tier configuration files with clear feature matrices

### Challenge: Pay-Per-Use Tracking
**Solution**: Monthly counters that reset, tracked in user document

### Challenge: Content Migration for Tier Changes
**Solution**: Gracefully handle downgrades (archive excess content, don't delete)

### Challenge: Multiple Dashboard Layouts
**Solution**: Separate navigation structures per user type

---

## 📋 Final Checklist

### Business Features
- [ ] Bronze tier: All limits enforced
- [ ] Silver tier: Self-management working
- [ ] Gold tier: All premium features
- [ ] Page adjustment requests work
- [ ] Job board posting with limits
- [ ] Analytics tracking accurate
- [ ] VIP offerings creation
- [ ] Stripe Connect for payments

### Entrepreneur Features
- [ ] Basic tier: All limits enforced
- [ ] Starter tier: Pay-per-use working
- [ ] Networking tier: All features unlocked
- [ ] Portfolio management
- [ ] Team hosting (Networking)
- [ ] Job board access
- [ ] Music upload working
- [ ] Stripe Connect for payments

### Cross-Cutting
- [ ] Messaging permissions correct
- [ ] Directory search working
- [ ] All Stripe integrations tested
- [ ] Mobile-responsive on all screens
- [ ] Analytics accurate
- [ ] Rate limiting in place

---

## 🎯 Success Criteria

After implementation:
1. All three user types have distinct experiences
2. Tier limits are enforced properly
3. Upgrade/downgrade flows work smoothly
4. Pay-per-use purchases are seamless
5. Messaging rules are respected
6. Content limits prevent overuse
7. Analytics provide useful insights
8. Mobile experience is excellent

---

**This addendum integrates with the main implementation plan to create a complete WGO4Y 2.0 platform supporting General Public, Business, and Entrepreneur users with appropriate features and monetization.**
