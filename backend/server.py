from fastapi import FastAPI, APIRouter, HTTPException, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timezone

from models import (
    UserCreate, User, UserLogin, UserResponse, PasswordResetRequest, PasswordReset,
    EventCreate, Event, EventRSVP,
    VenueCreate, Venue,
    JobCreate, Job, JobApplicationCreate, JobApplication,
    NotificationCreate, Notification,
    MessageCreate, Message, Conversation,
    WorkerProfileCreate, WorkerProfile,
    ConsultingRequestCreate, ConsultingRequest,
    RaffleCreate, Raffle, RaffleEntryCreate, RaffleEntry,
    CouponCreate, Coupon, CouponUsage
)
from auth_utils import (
    hash_password, verify_password, create_access_token, 
    get_current_user, create_password_reset_token, verify_password_reset_token
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'wgo4y_database')]

# Create the main app
app = FastAPI(title="WGO4Y API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== HELPER FUNCTIONS ====================

def serialize_datetime(obj):
    """Convert datetime objects to ISO strings for MongoDB"""
    if isinstance(obj, dict):
        return {k: serialize_datetime(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [serialize_datetime(item) for item in obj]
    elif isinstance(obj, datetime):
        return obj.isoformat()
    return obj

def deserialize_datetime(obj):
    """Convert ISO strings back to datetime objects"""
    if isinstance(obj, dict):
        result = {}
        for k, v in obj.items():
            if isinstance(v, str) and ('_at' in k or k == 'date' or k.endswith('_date')):
                try:
                    result[k] = datetime.fromisoformat(v)
                except:
                    result[k] = v
            else:
                result[k] = deserialize_datetime(v)
        return result
    elif isinstance(obj, list):
        return [deserialize_datetime(item) for item in obj]
    return obj

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/signup")
async def signup(user_data: UserCreate):
    """Register a new user with role selection"""
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate role
    valid_roles = ["business/venue", "entrepreneur/worker", "general"]
    if user_data.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {valid_roles}")
    
    # Create user object
    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        role=user_data.role,
        tier=user_data.tier if hasattr(user_data, 'tier') else "gold"
    )
    
    # Hash password and store
    user_dict = user.model_dump()
    user_dict['password_hash'] = hash_password(user_data.password)
    user_dict = serialize_datetime(user_dict)
    
    await db.users.insert_one(user_dict)
    
    # Create access token
    access_token = create_access_token({
        "sub": user.id,
        "email": user.email,
        "role": user.role,
        "tier": user.tier
    })
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(**user.model_dump())
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    """Login and get JWT token"""
    # Find user
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Verify password
    if not verify_password(credentials.password, user_doc['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create access token
    access_token = create_access_token({
        "sub": user_doc['id'],
        "email": user_doc['email'],
        "role": user_doc['role'],
        "tier": user_doc['tier']
    })
    
    user_doc = deserialize_datetime(user_doc)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(**user_doc)
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    user_doc = await db.users.find_one({"id": current_user['sub']}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_doc = deserialize_datetime(user_doc)
    return UserResponse(**user_doc)

@api_router.post("/auth/forgot-password")
async def forgot_password(request: PasswordResetRequest):
    """Request password reset"""
    user_doc = await db.users.find_one({"email": request.email}, {"_id": 0})
    if not user_doc:
        # Don't reveal if email exists
        return {"message": "If the email exists, a reset link has been sent"}
    
    # Create reset token
    reset_token = create_password_reset_token(request.email)
    
    # In production, send email with reset link
    # For now, just return the token (in production, don't return this!)
    logger.info(f"Password reset token for {request.email}: {reset_token}")
    
    return {
        "message": "If the email exists, a reset link has been sent",
        "reset_token": reset_token  # Remove this in production!
    }

@api_router.post("/auth/reset-password")
async def reset_password(reset_data: PasswordReset):
    """Reset password with token"""
    # Verify token and get email
    email = verify_password_reset_token(reset_data.token)
    
    # Update password
    new_password_hash = hash_password(reset_data.new_password)
    result = await db.users.update_one(
        {"email": email},
        {"$set": {"password_hash": new_password_hash}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "Password reset successful"}

@api_router.put("/users/profile")
async def update_profile(updates: dict, current_user: dict = Depends(get_current_user)):
    """Update user profile"""
    # Remove sensitive fields that shouldn't be updated this way
    disallowed_fields = ['id', 'password_hash', 'created_at', 'application_count']
    for field in disallowed_fields:
        updates.pop(field, None)
    
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    result = await db.users.update_one(
        {"id": current_user['sub']},
        {"$set": updates}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get updated user
    user_doc = await db.users.find_one({"id": current_user['sub']}, {"_id": 0})
    user_doc = deserialize_datetime(user_doc)
    return UserResponse(**user_doc)


# ==================== EVENTS ENDPOINTS ====================

@api_router.post("/events", response_model=Event)
async def create_event(event_data: EventCreate, current_user: dict = Depends(get_current_user)):
    """Create a new event (Business/Venue only)"""
    if current_user['role'] not in ['business/venue']:
        raise HTTPException(status_code=403, detail="Only business/venue accounts can create events")
    
    # Validate date is not in the past
    if event_data.date < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Event date cannot be in the past")
    
    # Create event object
    event = Event(
        **event_data.model_dump(),
        business_id=current_user['sub']
    )
    
    # Save to database
    event_dict = serialize_datetime(event.model_dump())
    await db.events.insert_one(event_dict)
    
    # Create notification for followers (simplified - would need followers system)
    # For now, just log the event creation
    logger.info(f"Event created: {event.name} by user {current_user['sub']}")
    
    return event

@api_router.get("/events", response_model=List[Event])
async def get_events(
    category: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
):
    """Get all events with optional filtering"""
    query = {}
    
    if category:
        query['category'] = category
    
    if search:
        query['$or'] = [
            {'name': {'$regex': search, '$options': 'i'}},
            {'description': {'$regex': search, '$options': 'i'}},
            {'location': {'$regex': search, '$options': 'i'}}
        ]
    
    events = await db.events.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    
    for event in events:
        event = deserialize_datetime(event)
    
    return [deserialize_datetime(event) for event in events]

@api_router.get("/events/{event_id}", response_model=Event)
async def get_event(event_id: str):
    """Get a specific event"""
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    return deserialize_datetime(event)

@api_router.put("/events/{event_id}", response_model=Event)
async def update_event(event_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    """Update an event (owner only)"""
    # Check if event exists and user is owner
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event['business_id'] != current_user['sub']:
        raise HTTPException(status_code=403, detail="You can only update your own events")
    
    # Remove fields that shouldn't be updated
    disallowed_fields = ['id', 'business_id', 'created_at', 'rsvp_count', 'waitlist_count']
    for field in disallowed_fields:
        updates.pop(field, None)
    
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    # Serialize datetime fields
    updates = serialize_datetime(updates)
    
    result = await db.events.update_one(
        {"id": event_id},
        {"$set": updates}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    
    updated_event = await db.events.find_one({"id": event_id}, {"_id": 0})
    return deserialize_datetime(updated_event)

@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an event (owner only)"""
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event['business_id'] != current_user['sub']:
        raise HTTPException(status_code=403, detail="You can only delete your own events")
    
    # Delete event
    await db.events.delete_one({"id": event_id})
    
    # Delete all RSVPs for this event
    await db.event_rsvps.delete_many({"event_id": event_id})
    
    return {"message": "Event deleted successfully"}

@api_router.get("/events/my/created", response_model=List[Event])
async def get_my_events(current_user: dict = Depends(get_current_user)):
    """Get events created by current user"""
    if current_user['role'] not in ['business/venue']:
        raise HTTPException(status_code=403, detail="Only business/venue accounts can view created events")
    
    events = await db.events.find(
        {"business_id": current_user['sub']},
        {"_id": 0}
    ).to_list(100)
    
    return [deserialize_datetime(event) for event in events]

# ==================== EVENT RSVP ENDPOINTS ====================

@api_router.post("/events/{event_id}/rsvp")
async def rsvp_to_event(event_id: str, current_user: dict = Depends(get_current_user)):
    """RSVP to an event with waitlist support"""
    # Get event
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check if user already RSVP'd
    existing_rsvp = await db.event_rsvps.find_one({
        "event_id": event_id,
        "user_id": current_user['sub']
    }, {"_id": 0})
    
    if existing_rsvp:
        raise HTTPException(status_code=400, detail="You have already RSVP'd to this event")
    
    # Determine if confirmed or waitlist
    status = "confirmed" if event['rsvp_count'] < event['capacity'] else "waitlist"
    
    # Create RSVP
    rsvp = EventRSVP(
        event_id=event_id,
        user_id=current_user['sub'],
        status=status
    )
    
    rsvp_dict = serialize_datetime(rsvp.model_dump())
    await db.event_rsvps.insert_one(rsvp_dict)
    
    # Update event counts
    if status == "confirmed":
        await db.events.update_one(
            {"id": event_id},
            {"$inc": {"rsvp_count": 1}}
        )
    else:
        await db.events.update_one(
            {"id": event_id},
            {"$inc": {"waitlist_count": 1}}
        )
    
    # Create notification
    notification = Notification(
        user_id=current_user['sub'],
        notification_type="RSVP" if status == "confirmed" else "Waitlist",
        title="RSVP Confirmed" if status == "confirmed" else "Added to Waitlist",
        message=f"You are {'confirmed' if status == 'confirmed' else 'on the waitlist'} for {event['name']}",
        link=f"/events/{event_id}"
    )
    notification_dict = serialize_datetime(notification.model_dump())
    await db.notifications.insert_one(notification_dict)
    
    action = "RSVP'd" if status == "confirmed" else "added to waitlist"
    return {
        "status": status,
        "message": f"Successfully {action} for {event['name']}"
    }

@api_router.delete("/events/{event_id}/rsvp")
async def cancel_rsvp(event_id: str, current_user: dict = Depends(get_current_user)):
    """Cancel RSVP and promote waitlist if applicable"""
    # Get RSVP
    rsvp = await db.event_rsvps.find_one({
        "event_id": event_id,
        "user_id": current_user['sub']
    }, {"_id": 0})
    
    if not rsvp:
        raise HTTPException(status_code=404, detail="RSVP not found")
    
    # Delete RSVP
    await db.event_rsvps.delete_one({
        "event_id": event_id,
        "user_id": current_user['sub']
    })
    
    # Update event counts
    if rsvp['status'] == "confirmed":
        await db.events.update_one(
            {"id": event_id},
            {"$inc": {"rsvp_count": -1}}
        )
        
        # Auto-promote from waitlist
        waitlist_user = await db.event_rsvps.find_one({
            "event_id": event_id,
            "status": "waitlist"
        }, {"_id": 0}, sort=[("created_at", 1)])
        
        if waitlist_user:
            # Promote to confirmed
            await db.event_rsvps.update_one(
                {"id": waitlist_user['id']},
                {"$set": {"status": "confirmed"}}
            )
            
            # Update counts
            await db.events.update_one(
                {"id": event_id},
                {
                    "$inc": {"rsvp_count": 1, "waitlist_count": -1}
                }
            )
            
            # Notify promoted user
            event = await db.events.find_one({"id": event_id}, {"_id": 0})
            notification = Notification(
                user_id=waitlist_user['user_id'],
                notification_type="RSVP",
                title="Promoted from Waitlist!",
                message=f"You've been promoted from the waitlist to confirmed for {event['name']}",
                link=f"/events/{event_id}"
            )
            notification_dict = serialize_datetime(notification.model_dump())
            await db.notifications.insert_one(notification_dict)
    else:
        await db.events.update_one(
            {"id": event_id},
            {"$inc": {"waitlist_count": -1}}
        )
    
    return {"message": "RSVP cancelled successfully"}

@api_router.get("/events/{event_id}/rsvps")
async def get_event_rsvps(event_id: str, current_user: dict = Depends(get_current_user)):
    """Get RSVPs for an event (owner only)"""
    # Check if user is event owner
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event['business_id'] != current_user['sub']:
        raise HTTPException(status_code=403, detail="You can only view RSVPs for your own events")
    
    rsvps = await db.event_rsvps.find({"event_id": event_id}, {"_id": 0}).to_list(1000)
    
    # Get user details for each RSVP
    for rsvp in rsvps:
        user = await db.users.find_one({"id": rsvp['user_id']}, {"_id": 0, "full_name": 1, "email": 1})
        rsvp['user'] = user
    
    return [deserialize_datetime(rsvp) for rsvp in rsvps]

@api_router.get("/events/my/rsvps")
async def get_my_rsvps(current_user: dict = Depends(get_current_user)):
    """Get events user has RSVP'd to"""
    rsvps = await db.event_rsvps.find(
        {"user_id": current_user['sub']},
        {"_id": 0}
    ).to_list(100)
    
    # Get event details for each RSVP
    result = []
    for rsvp in rsvps:
        event = await db.events.find_one({"id": rsvp['event_id']}, {"_id": 0})
        if event:
            result.append({
                "rsvp": deserialize_datetime(rsvp),
                "event": deserialize_datetime(event)
            })
    
    return result

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "WGO4Y API is running", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}

# Include the router in the main app
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
