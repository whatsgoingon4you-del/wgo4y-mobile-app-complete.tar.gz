# WGO4Y Mobile App - MVP

A comprehensive mobile event discovery and booking platform built with Expo, React Native, FastAPI, and MongoDB.

## 🚀 Features Implemented

### ✅ Authentication & User Management
- **JWT-based authentication** with bcrypt password hashing
- User registration and login
- Multiple user types: General Public, Business, Entrepreneur, Admin
- Persistent authentication with AsyncStorage

### ✅ Home Page with 7 Main Sections
1. **Explorer Categories** - Horizontal carousel (Music, Comedy, Food & Drink, Sports, Arts, Nightlife)
2. **Featured Events** - Event cards with images, prices, dates
3. **Popular Venues** - Venue cards with ratings
4. **Featured Videos** - Video thumbnails (YouTube + uploaded support)
5. **WGO4Y Services** - Service offerings (DJ, Photography, Catering, etc.)
6. **Quick Actions** - Fast navigation buttons
7. **Pull-to-refresh** functionality

### ✅ Detail Pages
- **Event Detail** - Full flyer, date/time, venue, ticketing
- **Venue Detail** - Images, amenities, contact, booking
- **Service Detail** - Features, pricing, booking
- **Video Detail** - In-app video playbook
- **Coupon Detail** - Code, terms, redemption
- **Raffle Detail** - Prize, entry tracking, draw date

### ✅ Navigation
- **Bottom Tab Navigation**: Home, Dashboard, Messages
- **Stack Navigation** for detail pages
- User-type specific dashboards

### ✅ Payment Integration (Stripe - Test Mode Ready)
- Payment endpoints for tickets, bookings, services, coupons, raffles
- Payment confirmation and recording

### ✅ Backend API (FastAPI)
Complete REST API with 25+ endpoints for auth, events, venues, services, videos, coupons, raffles, messages, and payments.

### ✅ Mock Data
Pre-seeded database with 6 categories, 4 events, 3 venues, 4 services, 3 videos, 3 coupons, 3 raffles.

## 📱 Tech Stack

**Frontend:** Expo 54, React Native, Expo Router, TypeScript
**Backend:** FastAPI, Motor (MongoDB), PyJWT, bcrypt, Stripe
**Database:** MongoDB

## 🎯 Getting Started

### Test Account
- **Username**: testuser
- **Password**: password123

### Access the App
- Login/Register screen appears on first launch
- Browse categories, events, venues, services
- Click items to view details
- Check Dashboard for user-specific features

### Re-seed Database
```bash
cd /app/backend && python seed_data.py
```

## 🔧 API Testing

```bash
# Get categories
curl http://localhost:8001/api/categories

# Get events
curl http://localhost:8001/api/events?featured=true

# Register
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"user","password":"pass","email":"user@test.com","user_type":"general_public"}'
```

## 📋 What's Next

1. Complete Stripe payment UI
2. Video upload functionality
3. Real-time messaging (Socket.io)
4. Push notifications
5. Search and filters
6. User profiles with avatars
7. Review and ratings
8. Production deployment

## 🎨 Design

- Primary: #1565FF
- 8pt grid system
- Mobile-first design
- Touch targets: 48px minimum

---

**Built with Expo, FastAPI, and MongoDB**
