from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, timedelta, timezone
import bcrypt
import jwt
import stripe
import base64
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
from categories_data import (
    VENUE_CATEGORIES, 
    ENTREPRENEUR_CATEGORIES, 
    MESSAGE_INQUIRY_CATEGORIES,
    MEMBERSHIP_TIERS
)
from entertainment_categories import ENTERTAINMENT_CATEGORIES, get_categories_by_group
from event_categories import (
    EVENT_CATEGORIES,
    US_STATES,
    PRICE_TYPES,
    QUICK_FILTERS,
    get_category_by_id,
    migrate_old_category
)
from venue_types import (
    VENUE_TYPES,
    USE_CASE_TAGS,
    VENUE_QUICK_FILTERS,
    get_venue_type_by_id,
    get_use_case_by_id,
    migrate_old_venue_type
)
from tier_limits import (
    get_tier_limits,
    can_add_photo,
    can_feature_video,
    get_photo_limit,
    get_video_limit,
    get_rsvp_limit,
    is_near_limit
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT configuration
# JWT Configuration - REQUIRED in production
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET is required - set it in environment variables")
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Stripe configuration (test mode)
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY', 'sk_test_mock_key')
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', 'sk_test_emergent')

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ============= MODELS =============

class VideoLink(BaseModel):
    url: str
    title: Optional[str] = None
    platform: Optional[str] = None  # 'youtube' or 'vimeo'
    video_id: Optional[str] = None
    thumbnail_url: Optional[str] = None

class MembershipTier:
    BASIC = "basic"
    APPRECIATION = "appreciation"

class UserType:
    GENERAL_PUBLIC = "general_public"
    BUSINESS = "business"
    ENTREPRENEUR = "entrepreneur"
    ADMIN = "admin"

class UserRegister(BaseModel):
    username: str
    password: str
    email: str
    user_type: str = UserType.GENERAL_PUBLIC
    full_name: Optional[str] = None

class UserProfile(BaseModel):
    full_name: str
    location: Optional[str] = None
    bio: Optional[str] = None
    profile_photo: Optional[str] = None  # base64
    venue_categories: List[str] = []  # List of "Category:Subcategory"
    entrepreneur_categories: List[str] = []  # List of "Category:Subcategory"

class UserProfileUpdate(BaseModel):
    # Common fields
    user_type: Optional[str] = None  # Allow changing user type during onboarding
    full_name: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    profile_photo: Optional[str] = None
    venue_categories: Optional[List[str]] = None
    entrepreneur_categories: Optional[List[str]] = None
    selected_categories: Optional[List[str]] = None  # Category IDs selected during onboarding (entrepreneur/business)
    venue_preferences: Optional[List[str]] = None  # For general public
    service_preferences: Optional[List[str]] = None  # For general public
    entertainment_preferences: Optional[List[str]] = None  # Entertainment category preferences for all users
    membership_tier: Optional[str] = None  # For tier updates during onboarding
    
    # Business-specific fields
    business_name: Optional[str] = None
    business_type: Optional[str] = None
    business_address: Optional[str] = None
    business_phone: Optional[str] = None
    business_hours: Optional[dict] = None
    business_description: Optional[str] = None
    business_logo: Optional[str] = None
    business_photos: Optional[List[str]] = None
    capacity: Optional[int] = None
    amenities: Optional[List[str]] = None
    entertainment_categories: Optional[List[str]] = None
    pricing_info: Optional[str] = None
    social_links: Optional[Union[dict, List[str]]] = None  # Dictionary (Business) or array (Entrepreneur)
    
    # New venue categorization fields
    venue_type: Optional[str] = None  # Single selection from VENUE_TYPES (e.g., 'clubs_lounges')
    use_cases: Optional[List[str]] = None  # Multi-select from USE_CASE_TAGS (e.g., ['date_night', 'late_night'])
    state: Optional[str] = None  # State ID (e.g., 'SC')
    county: Optional[str] = None  # County name (text)
    city: Optional[str] = None  # City name (text)
    
    # Entrepreneur-specific fields
    service_name: Optional[str] = None
    occupations: Optional[List[str]] = None  # Professional identity: DJ, Band, etc.
    services: Optional[List[str]] = None  # Alias for occupations (backward compatibility)
    services_offered: Optional[List[dict]] = None  # Detailed services with pricing: [{service_name, price, price_type}]
    profile_completed: Optional[bool] = None  # Track if profile is fully set up
    locations_served: Optional[List[str]] = None
    years_experience: Optional[int] = None
    portfolio_photos: Optional[List[str]] = None
    portfolio_videos: Optional[List[dict]] = None  # Video links with metadata
    music_tracks: Optional[List[dict]] = None  # Music platform links (SoundCloud, Spotify, etc.)
    rate_structure: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class User(BaseModel):
    id: str
    username: str
    email: str
    user_type: str
    full_name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Category(BaseModel):
    id: str
    name: str
    icon: str
    description: Optional[str] = None

class Event(BaseModel):
    id: str
    title: str
    description: str
    image: str  # base64 cover image
    date: datetime
    venue: str  # Venue name
    venue_id: Optional[str] = None  # Reference to venue in database
    price: float
    organizer: str
    categories: List[str] = []  # Multi-select categories
    category: Optional[str] = None  # Kept for backward compatibility
    capacity: int = 100
    status: str = 'published'  # draft, published, cancelled
    visibility: str = 'public'  # public, private
    created_by: Optional[str] = None  # User ID of creator
    featured: bool = False
    tickets_available: int = 100
    ticket_tiers: Optional[List[dict]] = None  # [{"name": "General", "price": 25}, ...]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

class EventCreate(BaseModel):
    title: str
    description: str
    image: str  # base64 cover image
    date: datetime
    venue: str
    venue_id: Optional[str] = None
    price: float
    organizer: str
    
    # New category system (1-2 selections)
    event_categories: Optional[List[str]] = []  # New: List of category IDs (e.g., ['parties_nightlife', 'live_music'])
    
    # Location fields
    state: Optional[str] = None  # New: State ID (e.g., 'SC', 'NC')
    county: Optional[str] = None  # New: County name (text)
    city: Optional[str] = None  # New: City name (text)
    
    # Event attributes
    family_friendly: Optional[bool] = False  # New: Family-friendly flag
    price_type: Optional[str] = 'paid'  # New: 'free' or 'paid'
    
    # Old fields (kept for backward compatibility)
    categories: Optional[List[str]] = []  # Multi-select categories (old system)
    category: Optional[str] = None  # Kept for backward compatibility
    
    # RSVP/Capacity fields
    capacity: int = 100
    overbooking_percentage: int = 10  # Default 10% overbooking
    waitlist_enabled: bool = True  # Enable waitlist by default
    vip_early_access_hours: int = 24  # VIP can RSVP 24 hours early
    rsvp_start_time_regular: Optional[datetime] = None  # When regular RSVPs open
    
    # Publishing
    status: str = 'published'  # draft, published, cancelled
    visibility: str = 'public'  # public, private
    ticket_tiers: Optional[List[dict]] = None
    featured: bool = False

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    image: Optional[str] = None
    date: Optional[datetime] = None
    venue: Optional[str] = None
    venue_id: Optional[str] = None
    price: Optional[float] = None
    organizer: Optional[str] = None
    
    # New category system
    event_categories: Optional[List[str]] = None  # New: List of category IDs
    
    # Location fields
    state: Optional[str] = None  # New: State ID
    county: Optional[str] = None  # New: County name
    city: Optional[str] = None  # New: City name
    
    # Event attributes
    family_friendly: Optional[bool] = None  # New: Family-friendly flag
    price_type: Optional[str] = None  # New: 'free' or 'paid'
    
    # Old fields (kept for backward compatibility)
    categories: Optional[List[str]] = None  # Multi-select categories (old system)
    category: Optional[str] = None  # Kept for backward compatibility
    
    # RSVP/Capacity fields
    capacity: Optional[int] = None
    overbooking_percentage: Optional[int] = None
    waitlist_enabled: Optional[bool] = None
    vip_early_access_hours: Optional[int] = None
    rsvp_start_time_regular: Optional[datetime] = None
    
    # Publishing
    status: Optional[str] = None
    visibility: Optional[str] = None
    ticket_tiers: Optional[List[dict]] = None
    featured: Optional[bool] = None

class Venue(BaseModel):
    id: str
    name: str
    description: str
    image: str  # base64
    type: str
    rating: float
    amenities: List[str]
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    booking_price: float = 0.0
    popular: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class VenueCreate(BaseModel):
    name: str
    description: str
    image: str
    type: str
    rating: float = 4.5
    amenities: List[str] = []
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    booking_price: float = 0.0
    popular: bool = False

class Service(BaseModel):
    id: str
    name: str
    description: str
    image: str  # base64
    price: float
    features: List[str]
    category: str
    featured: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ServiceCreate(BaseModel):
    name: str
    description: str
    image: str
    price: float
    features: List[str]
    category: str
    featured: bool = False

class Video(BaseModel):
    id: str
    title: str
    description: str
    type: str  # 'youtube' or 'uploaded'
    url: str  # YouTube URL or video path
    thumbnail: str  # base64
    creator: str
    featured: bool = False
    views: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class VideoCreate(BaseModel):
    title: str
    description: str
    type: str
    url: str
    thumbnail: str
    creator: str
    featured: bool = False

class Coupon(BaseModel):
    id: str
    title: str  # Short title (e.g., "$5 Off Cover")
    description: str  # Longer explanation / fine print
    owner_id: str  # User ID of venue/entrepreneur who created it
    code: Optional[str] = None  # Optional coupon code
    discount_type: str  # amount_off, percent_off, bogo, free_item, other
    discount_value: float  # e.g., 5.00 for $5 off, or 20 for 20%
    valid_from: datetime
    valid_until: datetime
    days_of_week: Optional[List[str]] = None  # ['Monday', 'Friday', etc.]
    usage_limit_total: Optional[int] = None  # Max total redemptions (None = unlimited)
    usage_limit_per_user: int = 1  # Max per user (default 1)
    status: str = 'active'  # draft, active, expired, disabled
    image: Optional[str] = None  # base64
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

class CouponCreate(BaseModel):
    title: str
    description: str
    code: Optional[str] = None
    discount_type: str
    discount_value: float
    valid_from: datetime
    valid_until: datetime
    days_of_week: Optional[List[str]] = None
    usage_limit_total: Optional[int] = None
    usage_limit_per_user: int = 1
    status: str = 'active'
    image: Optional[str] = None
    age_restriction: Optional[str] = None  # e.g., "21+", "18+", None
    exclusions: Optional[str] = None  # e.g., "Not valid with other offers"

class CouponUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    days_of_week: Optional[List[str]] = None
    usage_limit_total: Optional[int] = None
    usage_limit_per_user: Optional[int] = None
    status: Optional[str] = None
    image: Optional[str] = None
    age_restriction: Optional[str] = None
    exclusions: Optional[str] = None

class CouponRedemption(BaseModel):
    id: str
    coupon_id: str
    user_id: str
    redeemed_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = 'redeemed'  # redeemed, cancelled

class ConsultingRequest(BaseModel):
    id: str
    owner_id: str  # User requesting consulting
    owner_type: str  # business, entrepreneur, general_public
    topics: List[str]  # What they need help with
    preferred_schedule: Optional[str] = None  # Preferred days/times
    notes: Optional[str] = None  # Goals/additional info
    status: str = 'new'  # new, in_progress, completed
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

class ConsultingRequestCreate(BaseModel):
    topics: List[str]
    preferred_schedule: Optional[str] = None
    notes: Optional[str] = None

class ConsultingRequestUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None

class WorkerProfile(BaseModel):
    id: str
    user_id: str
    role: str  # Influencer, Intern, Lighting Tech, Sound Engineer, Security, Event Staff
    city: str
    state: str
    experience: str  # Background/experience description
    bio: Optional[str] = None
    social_links: Optional[dict] = None  # Instagram, TikTok, etc. for influencers
    why_join: str  # Why they want to work with WGO4Y
    status: str = 'applicant'  # applicant, approved, rejected
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

class WorkerApplicationCreate(BaseModel):
    role: str
    city: str
    state: str
    experience: str
    bio: Optional[str] = None
    social_links: Optional[dict] = None
    why_join: str

class WorkerContactRequestCreate(BaseModel):
    message: Optional[str] = None


class ContactRequestStatusUpdate(BaseModel):
    status: str


class WorkerContactRequest(BaseModel):
    id: str
    worker_id: str  # Worker profile ID
    requester_id: str  # Venue/entrepreneur requesting contact
    message: Optional[str] = None
    status: str = 'new'  # new, contacted, completed
    created_at: datetime = Field(default_factory=datetime.utcnow)


class JobPostingCreate(BaseModel):
    title: str
    role: str
    event_date: Optional[str] = None  # Can be date or date range
    city: str
    state: str
    pay: Optional[str] = None  # Budget/pay info
    description: str

class JobApplicationCreate(BaseModel):
    note: Optional[str] = None  # Why they're a good fit

class Raffle(BaseModel):
    id: str
    title: str
    description: str
    prize: str
    ticket_price: float  # Price per entry
    currency: str = 'USD'
    status: str = 'draft'  # draft, active, closed
    start_date: datetime
    end_date: datetime
    max_tickets: Optional[int] = None  # None = unlimited
    image: str  # base64
    winner_user_id: Optional[str] = None
    winner_entry_id: Optional[str] = None
    winner_selected_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

class RaffleCreate(BaseModel):
    title: str
    description: str
    prize: str
    ticket_price: float
    currency: str = 'USD'
    status: str = 'draft'  # draft, active, closed
    start_date: datetime
    end_date: datetime
    max_tickets: Optional[int] = None
    image: str
    terms: Optional[str] = None  # Terms & exclusions (e.g., "Must be 21+, No cash value")

class RaffleEntry(BaseModel):
    id: str
    raffle_id: str
    user_id: str
    entry_number: int  # Sequential ticket number
    stripe_payment_id: str  # For traceability
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Message(BaseModel):
    id: str
    from_user: str
    to_user: str
    content: str
    read: bool = False
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class MessageCreate(BaseModel):
    to_user: str
    content: str

class PaymentIntent(BaseModel):
    type: str  # 'event', 'venue', 'service', 'coupon', 'raffle', 'vip', 'consultant'
    item_id: str
    amount: float

class PaymentConfirm(BaseModel):
    payment_intent_id: str
    item_type: str
    item_id: str

# Promo Code Models
class PromoCodeValidate(BaseModel):
    code: str
    user_type: str  # 'general_public', 'entrepreneur', 'business'
    tier: str  # The tier they want to apply the code to

class PromoCodeResponse(BaseModel):
    valid: bool
    trial_days: int = 0
    discount_percent: int = 0
    message: str

# Subscription Checkout Models  
class CheckoutRequest(BaseModel):
    tier: str  # 'appreciation', 'silver', 'networking', 'gold'
    user_type: Optional[str] = None  # Optional: onboarding user type (overrides database value)
    promo_code: Optional[str] = None
    origin_url: str

# ============= AUTH HELPERS =============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    from bson import ObjectId
    token = credentials.credentials
    payload = decode_token(token)
    user_id = payload['user_id']
    
    # Query by _id (the single source of truth)
    # Handle both ObjectId and string UUID formats
    try:
        # Try as ObjectId first (for legacy MongoDB ObjectIds)
        if len(user_id) == 24:  # ObjectId hex string length
            user = await db.users.find_one({'_id': ObjectId(user_id)})
        else:
            # UUID string format
            user = await db.users.find_one({'_id': user_id})
    except:
        # If ObjectId conversion fails, try as string
        user = await db.users.find_one({'_id': user_id})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Compatibility bridge: ensure 'id' field exists for backward compatibility
    if "id" not in user:
        user["id"] = str(user["_id"])
    
    return user

# ============= TIER CHECKING HELPER =============

def has_premium_tier(user: Dict[str, Any]) -> bool:
    """
    Check if user has a premium/upgraded membership tier.
    
    Premium tiers with messaging & consulting access:
    - appreciation
    - networking
    - gold
    - silver
    
    Blocked tiers (Basic):
    - basic
    - free
    - None (no tier set)
    
    Returns:
        bool: True if user has premium tier, False otherwise
    """
    tier = user.get('membership_tier', '').lower()
    premium_tiers = ['appreciation', 'networking', 'gold', 'silver']
    return tier in premium_tiers

def require_premium_tier(user: Dict[str, Any], feature_name: str = "This feature"):
    """
    Raise HTTPException if user doesn't have premium tier.
    
    Args:
        user: User document from database
        feature_name: Name of the feature for error message
    
    Raises:
        HTTPException: 403 if user has basic tier
    """
    if not has_premium_tier(user):
        tier = user.get('membership_tier', 'basic')
        raise HTTPException(
            status_code=403,
            detail=f"{feature_name} requires an upgraded membership. Your current tier: {tier}. Please upgrade to Appreciation, Networking, Gold, or Silver tier to access this feature."
        )


# ============= HEALTH CHECK & ROOT ENDPOINTS =============

@app.get("/")
async def root():
    """Root endpoint - API information"""
    return {
        "app": "WGO4Y API",
        "version": "2.0",
        "status": "operational",
        "docs": "/docs",
        "api_prefix": "/api"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for Kubernetes probes"""
    try:
        # Test database connection
        await db.command('ping')
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }

@api_router.get("/")
async def api_root():
    """API root endpoint - returns 200 OK for health checks"""
    return {
        "message": "WGO4Y API",
        "version": "2.0",
        "status": "ok"
    }

@api_router.get("/health")
async def api_health():
    """API health check endpoint"""
    try:
        await db.command('ping')
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database unhealthy: {str(e)}")


# ============= AUTH ROUTES =============

@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    # Sanitize username: remove spaces, special chars except underscore/hyphen, trim
    import re
    sanitized_username = re.sub(r'[^\w\-]', '_', user_data.username.strip())
    sanitized_username = re.sub(r'_+', '_', sanitized_username)  # Replace multiple underscores with single
    sanitized_username = sanitized_username.strip('_')  # Remove leading/trailing underscores
    
    # Check if user exists (check sanitized version)
    existing = await db.users.find_one({'username': sanitized_username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Create user
    import uuid
    user_id = str(uuid.uuid4())
    user_dict = {
        '_id': user_id,
        'username': sanitized_username,  # Use sanitized version
        'email': user_data.email,
        'password_hash': hash_password(user_data.password),
        'user_type': user_data.user_type,
        'full_name': user_data.full_name,
        'created_at': datetime.utcnow(),
        # New profile fields
        'profile_completed': False,
        'membership_tier': MembershipTier.BASIC,
        'location': None,
        'bio': None,
        'profile_photo': None,
        'venue_categories': [],
        'entrepreneur_categories': [],
        'entertainment_preferences': [],  # Initialize as empty array
        'subscription_start_date': None,
        'subscription_end_date': None
    }
    await db.users.insert_one(user_dict)
    
    token = create_token(user_id)
    return {
        'token': token,
        'user': {
            'id': user_id,
            'username': user_data.username,
            'email': user_data.email,
            'user_type': user_data.user_type,
            'full_name': user_data.full_name,
            'profile_completed': False,
            'membership_tier': MembershipTier.BASIC
        }
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    import re
    
    print(f"Login attempt for username: {credentials.username}")
    
    # Normalize the input (trim spaces)
    search_term = credentials.username.strip()
    
    # Try multiple lookup strategies for flexible login
    user = None
    
    # 1. Try exact username match
    user = await db.users.find_one({'username': search_term})
    
    # 2. Try case-insensitive username
    if not user:
        user = await db.users.find_one({'username': {'$regex': f'^{re.escape(search_term)}$', '$options': 'i'}})
    
    # 3. Try email
    if not user:
        user = await db.users.find_one({'email': search_term})
    
    # 4. Try email case-insensitive
    if not user:
        user = await db.users.find_one({'email': {'$regex': f'^{re.escape(search_term)}$', '$options': 'i'}})
    
    # 5. Try full name (exact match, case-insensitive)
    if not user:
        user = await db.users.find_one({'full_name': {'$regex': f'^{re.escape(search_term)}$', '$options': 'i'}})
    
    # 6. Try stage name for entrepreneurs
    if not user:
        user = await db.users.find_one({'stage_name': {'$regex': f'^{re.escape(search_term)}$', '$options': 'i'}})
    
    # 7. Try business name for businesses
    if not user:
        user = await db.users.find_one({'business_name': {'$regex': f'^{re.escape(search_term)}$', '$options': 'i'}})
    
    if not user:
        print(f"User not found with any identifier: {search_term}")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    print(f"User found: {user.get('full_name', user.get('username'))}")
    
    # Get password hash
    stored_password = user.get('password') or user.get('password_hash')
    if not stored_password:
        print(f"ERROR: No password field found for user {user.get('username')}")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    password_valid = verify_password(credentials.password, stored_password)
    print(f"Password valid: {password_valid}")
    
    if not password_valid:
        print(f"Password verification failed for user: {search_term}")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Always use _id as the single source of truth for JWT
    user_id = str(user['_id'])
    token = create_token(user_id)
    
    return {
        'token': token,
        'user': {
            'id': user_id,  # Return _id as 'id' for consistency
            'username': user['username'],
            'email': user['email'],
            'user_type': user['user_type'],
            'full_name': user.get('full_name')
        }
    }

@api_router.get("/auth/me")
async def get_me(user: Dict = Depends(get_current_user)):
    # AGGRESSIVE AUTO-FIX for entrepreneurs marked incomplete
    # This fixes ALL entrepreneur accounts that shouldn't be in onboarding
    if user['user_type'] == 'entrepreneur' and not user.get('profile_completed', False):
        # If user has ANY of these, mark as complete:
        # - full_name or service_name
        # - OR has logged in before (not first time)
        has_name = user.get('full_name') or user.get('service_name')
        has_any_profile_data = (
            user.get('bio') or 
            user.get('location') or 
            user.get('phone') or
            user.get('services') or  # occupations
            user.get('social_links') or
            user.get('portfolio_photos')
        )
        
        # If they have a name OR any profile data, mark complete
        # (They're clearly a returning user who completed onboarding)
        if has_name or has_any_profile_data:
            await db.users.update_one(
                {'_id': user['_id']},
                {'$set': {'profile_completed': True}}
            )
            user['profile_completed'] = True
            print(f"Auto-migrated user {user['username']} to profile_completed=True")
    
    return {
        'id': str(user['_id']),  # Convert ObjectId to string for JSON serialization
        'username': user['username'],
        'email': user['email'],
        'user_type': user['user_type'],
        'full_name': user.get('full_name'),
        'profile_completed': user.get('profile_completed', False),
        'membership_tier': user.get('membership_tier', 'basic')
    }

# ============= PROFILE ROUTES =============

@api_router.get("/profile/categories")
async def get_profile_categories():
    """Get available categories for profile selection"""
    return {
        'venue_categories': VENUE_CATEGORIES,
        'entrepreneur_categories': ENTREPRENEUR_CATEGORIES
    }

@api_router.get("/profile/tier-limits")
async def get_user_tier_limits(user: Dict = Depends(get_current_user)):
    """Get tier limits and current usage for the current user"""
    user_type = user.get('user_type')
    membership_tier = user.get('membership_tier', 'basic')
    
    # Get tier limits
    limits = get_tier_limits(user_type, membership_tier)
    
    # Calculate current usage
    usage = {}
    
    if user_type == 'entrepreneur':
        portfolio_photos = user.get('portfolio_photos', [])
        portfolio_videos = user.get('portfolio_videos', [])
        featured_videos = [v for v in portfolio_videos if v.get('featured') and v.get('featured_approved')]
        
        usage = {
            'portfolio_photos': {
                'current': len(portfolio_photos),
                'limit': get_photo_limit(user_type, membership_tier),
                'can_add': can_add_photo(user_type, membership_tier, len(portfolio_photos)),
                'near_limit': is_near_limit(len(portfolio_photos), limits.get('portfolio_photos', 0)) if limits else False,
            },
            'featured_videos': {
                'current': len(featured_videos),
                'limit': get_video_limit(user_type, membership_tier),
                'can_feature': can_feature_video(user_type, membership_tier, len(featured_videos)),
                'near_limit': is_near_limit(len(featured_videos), limits.get('featured_videos', 0)) if limits else False,
            }
        }
    
    elif user_type == 'business':
        business_photos = user.get('business_photos', [])
        portfolio_videos = user.get('portfolio_videos', [])
        featured_videos = [v for v in portfolio_videos if v.get('featured') and v.get('featured_approved')]
        
        usage = {
            'business_photos': {
                'current': len(business_photos),
                'limit': get_photo_limit(user_type, membership_tier),
                'can_add': can_add_photo(user_type, membership_tier, len(business_photos)),
                'near_limit': is_near_limit(len(business_photos), limits.get('business_photos', 0)) if limits else False,
            },
            'featured_videos': {
                'current': len(featured_videos),
                'limit': get_video_limit(user_type, membership_tier),
                'can_feature': can_feature_video(user_type, membership_tier, len(featured_videos)),
                'near_limit': is_near_limit(len(featured_videos), limits.get('featured_videos', 0)) if limits else False,
            }
        }
    
    elif user_type == 'general_public':
        # Get RSVP count for current month
        from datetime import datetime
        now = datetime.utcnow()
        month_start = datetime(now.year, now.month, 1)
        
        rsvp_count = await db.rsvps.count_documents({
            'user_id': user['_id'],
            'created_at': {'$gte': month_start}
        })
        
        rsvp_limit = get_rsvp_limit(membership_tier)
        
        usage = {
            'rsvps': {
                'current': rsvp_count,
                'limit': rsvp_limit,
                'can_rsvp': rsvp_count < rsvp_limit if rsvp_limit != 'unlimited' else True,
                'near_limit': is_near_limit(rsvp_count, rsvp_limit) if rsvp_limit != 'unlimited' else False,
                'month': now.strftime('%B %Y'),
            }
        }
    
    return {
        'user_type': user_type,
        'membership_tier': membership_tier,
        'limits': limits,
        'usage': usage
    }


@api_router.get("/users")
async def get_users(
    user_types: Optional[str] = None,
    limit: int = 100,
    user: Dict = Depends(get_current_user)
):
    """Get list of users (for messaging, search, etc.)"""
    query = {}
    
    # Filter by user types if provided
    if user_types:
        types_list = [t.strip() for t in user_types.split(',')]
        query['user_type'] = {'$in': types_list}
    
    # Exclude the current user
    query['_id'] = {'$ne': user['_id']}
    
    # Fetch users
    users_cursor = db.users.find(query).limit(limit)
    users = await users_cursor.to_list(length=limit)
    
    # Return minimal user info for display
    return [{
        'id': str(u['_id']),
        'username': u['username'],
        'full_name': u.get('full_name'),
        'business_name': u.get('business_name'),
        'user_type': u['user_type'],
        'profile_photo': u.get('profile_photo'),
    } for u in users]

@api_router.get("/profile")
async def get_profile(user: Dict = Depends(get_current_user)):
    """Get current user's profile"""
    # Calculate completion flags for entrepreneurs
    has_services_with_pricing = False
    has_portfolio = False
    
    if user.get('user_type') == 'entrepreneur':
        services_offered = user.get('services_offered', [])
        portfolio_photos = user.get('portfolio_photos', [])
        
        # Check if services_offered has valid entries (objects with pricing)
        has_services_with_pricing = len(services_offered) > 0 and any(
            isinstance(s, dict) and s.get('service_name') for s in services_offered
        )
        
        # Check if portfolio has photos
        has_portfolio = len(portfolio_photos) > 0
    
    return {
        'id': str(user['_id']),  # Convert ObjectId to string for JSON serialization
        'username': user['username'],
        'email': user['email'],
        'user_type': user['user_type'],
        'full_name': user.get('full_name'),
        'location': user.get('location'),
        'bio': user.get('bio'),
        'phone': user.get('phone'),
        'profile_photo': user.get('profile_photo'),
        'venue_categories': user.get('venue_categories', []),
        'entrepreneur_categories': user.get('entrepreneur_categories', []),
        'selected_categories': user.get('selected_categories', []),
        'venue_preferences': user.get('venue_preferences', []),
        'service_preferences': user.get('service_preferences', []),
        # Entrepreneur-specific fields
        'service_name': user.get('service_name'),
        'services': user.get('services', []),  # Occupations selected in onboarding
        'services_offered': user.get('services_offered', []),
        'portfolio_photos': user.get('portfolio_photos', []),
        'portfolio_videos': user.get('portfolio_videos', []),
        'music_tracks': user.get('music_tracks', []),
        'social_links': user.get('social_links', []),
        # Business-specific fields
        'business_name': user.get('business_name'),
        'business_type': user.get('business_type'),
        'business_address': user.get('business_address'),
        'business_phone': user.get('business_phone'),
        'business_hours': user.get('business_hours'),
        'business_description': user.get('business_description'),
        'business_logo': user.get('business_logo'),
        'business_photos': user.get('business_photos', []),
        'amenities': user.get('amenities', []),
        'entertainment_categories': user.get('entertainment_categories', []),
        'pricing_info': user.get('pricing_info'),
        # New venue categorization fields
        'venue_type': user.get('venue_type'),
        'use_cases': user.get('use_cases', []),
        'state': user.get('state'),
        'county': user.get('county'),
        'city': user.get('city'),
        # Status
        'profile_completed': user.get('profile_completed', False),
        'membership_tier': user.get('membership_tier', 'basic'),
        'is_admin': user.get('is_admin', False),
        'created_at': user.get('created_at'),
        # Entrepreneur completion flags (calculated dynamically)
        'has_services_with_pricing': has_services_with_pricing,
        'has_portfolio': has_portfolio,
        # Featured video tracking
        'featured_videos_this_week': user.get('featured_videos_this_week', 0),
        'last_featured_video_reset': user.get('last_featured_video_reset'),
        # Entertainment preferences (new onboarding)
        'entertainment_preferences': user.get('entertainment_preferences', [])
    }

@api_router.put("/profile")
async def update_profile(profile_data: UserProfileUpdate, user: Dict = Depends(get_current_user)):
    """Update user profile"""
    update_dict = {}
    
    # Allow changing user_type during onboarding (critical for user type selection)
    if profile_data.user_type is not None:
        update_dict['user_type'] = profile_data.user_type
    
    # Common fields
    if profile_data.full_name is not None:
        update_dict['full_name'] = profile_data.full_name
    if profile_data.location is not None:
        update_dict['location'] = profile_data.location
    if profile_data.bio is not None:
        update_dict['bio'] = profile_data.bio
    if profile_data.phone is not None:
        update_dict['phone'] = profile_data.phone
    if profile_data.email is not None:
        update_dict['email'] = profile_data.email
    if profile_data.profile_photo is not None:
        update_dict['profile_photo'] = profile_data.profile_photo
    if profile_data.venue_categories is not None:
        update_dict['venue_categories'] = profile_data.venue_categories
    if profile_data.entrepreneur_categories is not None:
        update_dict['entrepreneur_categories'] = profile_data.entrepreneur_categories
    if profile_data.selected_categories is not None:
        update_dict['selected_categories'] = profile_data.selected_categories
    if profile_data.venue_preferences is not None:
        update_dict['venue_preferences'] = profile_data.venue_preferences
    if profile_data.service_preferences is not None:
        update_dict['service_preferences'] = profile_data.service_preferences
    if profile_data.entertainment_preferences is not None:
        update_dict['entertainment_preferences'] = profile_data.entertainment_preferences
    if profile_data.membership_tier is not None:
        update_dict['membership_tier'] = profile_data.membership_tier
    
    # Business-specific fields
    if profile_data.business_name is not None:
        update_dict['business_name'] = profile_data.business_name
    if profile_data.business_type is not None:
        update_dict['business_type'] = profile_data.business_type
    if profile_data.business_address is not None:
        update_dict['business_address'] = profile_data.business_address
    if profile_data.business_phone is not None:
        update_dict['business_phone'] = profile_data.business_phone
    if profile_data.business_hours is not None:
        update_dict['business_hours'] = profile_data.business_hours
    if profile_data.business_description is not None:
        update_dict['business_description'] = profile_data.business_description
    if profile_data.business_logo is not None:
        update_dict['business_logo'] = profile_data.business_logo
    if profile_data.business_photos is not None:
        update_dict['business_photos'] = profile_data.business_photos
    if profile_data.capacity is not None:
        update_dict['capacity'] = profile_data.capacity
    if profile_data.amenities is not None:
        update_dict['amenities'] = profile_data.amenities
    if profile_data.entertainment_categories is not None:
        update_dict['entertainment_categories'] = profile_data.entertainment_categories
    if profile_data.pricing_info is not None:
        update_dict['pricing_info'] = profile_data.pricing_info
    if profile_data.social_links is not None:
        update_dict['social_links'] = profile_data.social_links
    
    # New venue categorization fields (for business/venue profiles)
    if profile_data.venue_type is not None:
        update_dict['venue_type'] = profile_data.venue_type
    if profile_data.use_cases is not None:
        update_dict['use_cases'] = profile_data.use_cases
    if profile_data.state is not None:
        update_dict['state'] = profile_data.state
    if profile_data.county is not None:
        update_dict['county'] = profile_data.county
    if profile_data.city is not None:
        update_dict['city'] = profile_data.city
    
    # Entrepreneur-specific fields
    if profile_data.service_name is not None:
        update_dict['service_name'] = profile_data.service_name
    if profile_data.services is not None:
        update_dict['services'] = profile_data.services  # Store occupations in 'services' field
    if profile_data.services_offered is not None:
        update_dict['services_offered'] = profile_data.services_offered
    if profile_data.locations_served is not None:
        update_dict['locations_served'] = profile_data.locations_served
    if profile_data.years_experience is not None:
        update_dict['years_experience'] = profile_data.years_experience
    if profile_data.portfolio_photos is not None:
        update_dict['portfolio_photos'] = profile_data.portfolio_photos
    if profile_data.portfolio_videos is not None:
        update_dict['portfolio_videos'] = profile_data.portfolio_videos
    if profile_data.music_tracks is not None:
        update_dict['music_tracks'] = profile_data.music_tracks
    if profile_data.rate_structure is not None:
        update_dict['rate_structure'] = profile_data.rate_structure
    
    # Check if profile is now complete based on user type
    user_type = user.get('user_type', 'general_public')
    
    if user_type == 'general_public':
        # General public needs: name (basic requirement)
        # Location and preferences are optional
        if (update_dict.get('full_name') or user.get('full_name')):
            update_dict['profile_completed'] = True
    
    elif user_type == 'business':
        # Business needs: business name, type, address, phone, at least 1 photo, venue category
        business_photos = update_dict.get('business_photos') or user.get('business_photos') or []
        venue_cats = update_dict.get('venue_categories') or user.get('venue_categories') or []
        
        if (update_dict.get('business_name') or user.get('business_name')) and \
           (update_dict.get('business_type') or user.get('business_type')) and \
           (update_dict.get('business_address') or user.get('business_address')) and \
           (update_dict.get('business_phone') or user.get('business_phone')) and \
           len(business_photos) > 0 and \
           len(venue_cats) > 0:
            update_dict['profile_completed'] = True
    
    elif user_type == 'entrepreneur':
        # Entrepreneur profile completion logic (updated for streamlined onboarding)
        # Basic completion: Has name and selected occupations (from onboarding)
        # Full completion: Also has services_offered (with pricing) and portfolio
        
        has_name = update_dict.get('service_name') or update_dict.get('full_name') or user.get('service_name') or user.get('full_name')
        services = update_dict.get('services') or user.get('services', [])
        services_offered = update_dict.get('services_offered') or user.get('services_offered', [])
        portfolio_photos = update_dict.get('portfolio_photos') or user.get('portfolio_photos', [])
        
        # Profile is complete if user has:
        # 1. Name (full_name or service_name)
        # 2. At least one occupation (services array)
        # Note: services_offered and portfolio are optional for basic completion
        # but encouraged for full profile (checked by dashboard prompt)
        
        if has_name and len(services) > 0:
            update_dict['profile_completed'] = True
        else:
            update_dict['profile_completed'] = False
        
        # Store additional completion status for dashboard prompts
        update_dict['has_services_with_pricing'] = len(services_offered) > 0
        update_dict['has_portfolio'] = len(portfolio_photos) > 0
    
    if update_dict:
        await db.users.update_one(
            {'_id': user['_id']},
            {'$set': update_dict}
        )
    
    # Return updated profile
    updated_user = await db.users.find_one({'_id': user['_id']})
    return {
        'id': str(updated_user['_id']),  # Convert ObjectId to string for JSON serialization
        'username': updated_user['username'],
        'email': updated_user['email'],
        'user_type': updated_user['user_type'],
        'full_name': updated_user.get('full_name'),
        'location': updated_user.get('location'),
        'bio': updated_user.get('bio'),
        'phone': updated_user.get('phone'),
        'profile_photo': updated_user.get('profile_photo'),
        'venue_categories': updated_user.get('venue_categories', []),
        'entrepreneur_categories': updated_user.get('entrepreneur_categories', []),
        'selected_categories': updated_user.get('selected_categories', []),
        'venue_preferences': updated_user.get('venue_preferences', []),
        'service_preferences': updated_user.get('service_preferences', []),
        'entertainment_preferences': updated_user.get('entertainment_preferences', []),
        # Business fields
        'business_name': updated_user.get('business_name'),
        'business_type': updated_user.get('business_type'),
        'business_address': updated_user.get('business_address'),
        'business_phone': updated_user.get('business_phone'),
        'business_hours': updated_user.get('business_hours'),
        'business_description': updated_user.get('business_description'),
        'business_logo': updated_user.get('business_logo'),
        'business_photos': updated_user.get('business_photos', []),
        'capacity': updated_user.get('capacity'),
        'amenities': updated_user.get('amenities', []),
        'pricing_info': updated_user.get('pricing_info'),
        'social_links': updated_user.get('social_links', []),
        # Entrepreneur fields
        'service_name': updated_user.get('service_name'),
        'services': updated_user.get('services', []),  # Occupations
        'services_offered': updated_user.get('services_offered', []),
        'locations_served': updated_user.get('locations_served', []),
        'years_experience': updated_user.get('years_experience'),
        'portfolio_photos': updated_user.get('portfolio_photos', []),
        'portfolio_videos': updated_user.get('portfolio_videos', []),
        'music_tracks': updated_user.get('music_tracks', []),
        'rate_structure': updated_user.get('rate_structure'),
        # Status
        'profile_completed': updated_user.get('profile_completed', False),
        'has_services_with_pricing': updated_user.get('has_services_with_pricing', False),
        'has_portfolio': updated_user.get('has_portfolio', False),
        'membership_tier': updated_user.get('membership_tier', 'basic')
    }

# ============= CATEGORY ROUTES =============

@api_router.get("/categories")
async def get_categories():
    categories = await db.categories.find().to_list(100)
    return [{**cat, 'id': cat['_id']} for cat in categories]

@api_router.get("/event-categories")
async def get_event_categories():
    """Get event categories, states, price types, and quick filters for Experiences"""
    return {
        'categories': EVENT_CATEGORIES,
        'states': US_STATES,
        'price_types': PRICE_TYPES,
        'quick_filters': QUICK_FILTERS
    }

@api_router.get("/venue-types")
async def get_venue_types():
    """Get venue types, use cases, states, and quick filters for Places"""
    return {
        'venue_types': VENUE_TYPES,
        'use_cases': USE_CASE_TAGS,
        'states': US_STATES,  # Same states as events
        'quick_filters': VENUE_QUICK_FILTERS
    }

@api_router.post("/categories")
async def create_category(name: str, icon: str, description: str = ""):
    import uuid
    cat_id = str(uuid.uuid4())
    category = {
        '_id': cat_id,
        'name': name,
        'icon': icon,
        'description': description
    }
    await db.categories.insert_one(category)
    return {**category, 'id': cat_id}

# ============= EVENT ROUTES =============

@api_router.get("/events")
async def get_events(
    featured: Optional[bool] = None,
    # New filter parameters
    event_category: Optional[str] = None,  # Filter by event category ID
    state: Optional[str] = None,  # Filter by state
    city: Optional[str] = None,  # Filter by city (case-insensitive partial match)
    county: Optional[str] = None,  # Filter by county (case-insensitive partial match)
    date_range: Optional[str] = None,  # 'tonight', 'this_weekend', 'this_week', 'next_30_days'
    price_type: Optional[str] = None,  # 'free' or 'paid'
    family_friendly: Optional[bool] = None,  # Filter family-friendly events
    # Old filter parameters (kept for backward compatibility)
    category: Optional[str] = None,
    status: Optional[str] = None,
    venue_id: Optional[str] = None
):
    # Default: only show published AND approved events for public view
    query = {'approval_status': 'approved'}  # CRITICAL: Only approved content visible
    
    if status:
        query['status'] = status
    else:
        query['status'] = 'published'  # Only published events by default
    
    # Featured filter
    if featured is not None:
        query['featured'] = featured
    
    # Old category filter (backward compatibility)
    if category:
        query['category'] = category
    
    # Venue filter
    if venue_id:
        query['venue_id'] = venue_id
    
    # New filters
    if event_category:
        query['event_categories'] = event_category  # Event has this category in its list
    
    if state:
        query['state'] = state
    
    if city:
        query['city'] = {'$regex': city, '$options': 'i'}  # Case-insensitive partial match
    
    if county:
        query['county'] = {'$regex': county, '$options': 'i'}  # Case-insensitive partial match
    
    if price_type:
        query['price_type'] = price_type
    
    if family_friendly is not None:
        query['family_friendly'] = family_friendly
    
    # Date range filter
    if date_range:
        from datetime import datetime, time
        now = datetime.utcnow()
        
        if date_range == 'tonight':
            # Today only
            start_of_today = datetime.combine(now.date(), time.min)
            end_of_today = datetime.combine(now.date(), time.max)
            query['date'] = {'$gte': start_of_today, '$lte': end_of_today}
        
        elif date_range == 'this_weekend':
            # Saturday and Sunday of current week
            days_until_saturday = (5 - now.weekday()) % 7  # Saturday is 5
            saturday = now.date() + timedelta(days=days_until_saturday)
            sunday = saturday + timedelta(days=1)
            
            start_of_saturday = datetime.combine(saturday, time.min)
            end_of_sunday = datetime.combine(sunday, time.max)
            query['date'] = {'$gte': start_of_saturday, '$lte': end_of_sunday}
        
        elif date_range == 'this_week':
            # Next 7 days
            end_of_week = now + timedelta(days=7)
            query['date'] = {'$gte': now, '$lte': end_of_week}
        
        elif date_range == 'next_30_days':
            # Next 30 days
            end_of_month = now + timedelta(days=30)
            query['date'] = {'$gte': now, '$lte': end_of_month}
    
    events = await db.events.find(query).sort('date', 1).to_list(1000)
    return [{**event, 'id': event['_id']} for event in events]

@api_router.get("/events/my-events")
async def get_my_events(user: Dict = Depends(get_current_user), status: Optional[str] = None):
    # Get events created by current user
    query = {'created_by': user['_id']}
    if status:
        query['status'] = status
    
    events = await db.events.find(query).sort('created_at', -1).to_list(1000)
    return [{**event, 'id': event['_id']} for event in events]

@api_router.get("/events/{event_id}")
async def get_event(event_id: str):
    event = await db.events.find_one({
        '_id': event_id,
        'approval_status': 'approved'
    })
    if not event:
        raise HTTPException(status_code=404, detail="Event not found or pending approval")
    
    # Calculate capacity info
    capacity = event.get('capacity', 100)
    overbooking_percentage = event.get('overbooking_percentage', 10)
    rsvp_limit = round(capacity * (1 + overbooking_percentage / 100))
    
    # Count current RSVPs
    current_rsvps = await db.rsvps.count_documents({'event_id': event_id})
    
    # Calculate remaining spots
    remaining = max(0, rsvp_limit - current_rsvps)
    
    # Determine status
    is_almost_full = remaining > 0 and remaining <= (capacity * 0.2)  # ≤20% remaining
    is_full = current_rsvps >= rsvp_limit
    
    return {
        **event,
        'id': event['_id'],
        'rsvp_limit': rsvp_limit,
        'current_rsvps': current_rsvps,
        'remaining_spots': remaining,
        'is_almost_full': is_almost_full,
        'is_full': is_full
    }

@api_router.post("/events")
async def create_event(event_data: EventCreate, user: Dict = Depends(get_current_user)):
    # Permission check: Only business and entrepreneur users can create events
    user_type = user.get('user_type')
    if user_type not in ['business', 'entrepreneur']:
        raise HTTPException(status_code=403, detail="Only business and entrepreneur users can create events")
    
    import uuid
    event_id = str(uuid.uuid4())
    event_dict = event_data.dict()
    event_dict['_id'] = event_id
    event_dict['created_by'] = user['_id']
    event_dict['created_at'] = datetime.utcnow()
    event_dict['updated_at'] = datetime.utcnow()
    event_dict['tickets_available'] = event_data.capacity
    
    # Backward compatibility: ensure categories is set
    if not event_dict.get('categories') and event_dict.get('category'):
        event_dict['categories'] = [event_dict['category']]
    elif not event_dict.get('categories'):
        event_dict['categories'] = []
    
    await db.events.insert_one(event_dict)
    return {**event_dict, 'id': event_id}

@api_router.put("/events/{event_id}")
async def update_event(event_id: str, event_data: EventUpdate, user: Dict = Depends(get_current_user)):
    # Check if event exists
    event = await db.events.find_one({'_id': event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check ownership
    if event.get('created_by') != user['_id']:
        raise HTTPException(status_code=403, detail="You can only edit your own events")
    
    # Update event
    update_dict = {k: v for k, v in event_data.dict().items() if v is not None}
    update_dict['updated_at'] = datetime.utcnow()
    
    await db.events.update_one(
        {'_id': event_id},
        {'$set': update_dict}
    )
    
    updated_event = await db.events.find_one({'_id': event_id})
    return {**updated_event, 'id': updated_event['_id']}

@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str, user: Dict = Depends(get_current_user)):
    # Check if event exists
    event = await db.events.find_one({'_id': event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check ownership
    if event.get('created_by') != user['_id']:
        raise HTTPException(status_code=403, detail="You can only delete your own events")
    
    # Delete event
    await db.events.delete_one({'_id': event_id})
    return {"message": "Event deleted successfully"}


# ============= EVENT RSVP ROUTES =============

@api_router.post("/events/{event_id}/rsvp")
async def create_rsvp(event_id: str, user: Dict = Depends(get_current_user)):
    """Create RSVP for an event (GP users only, with tier limits)"""
    from datetime import datetime
    
    # Only GP users can RSVP
    if user.get('user_type') != 'general_public':
        raise HTTPException(status_code=403, detail="Only General Public members can RSVP")
    
    # Check if event exists
    event = await db.events.find_one({'_id': event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check if already RSVP'd
    existing_rsvp = await db.rsvps.find_one({
        'event_id': event_id,
        'user_id': user['_id']
    })
    
    if existing_rsvp:
        raise HTTPException(status_code=400, detail="Already RSVP'd to this event")
    
    # Check VIP early access timing
    membership_tier = user.get('membership_tier', 'basic')
    rsvp_start_regular = event.get('rsvp_start_time_regular')
    vip_early_hours = event.get('vip_early_access_hours', 24)
    
    if rsvp_start_regular:
        now = datetime.utcnow()
        vip_start_time = rsvp_start_regular - timedelta(hours=vip_early_hours)
        
        # If current time is before VIP window starts, block everyone
        if now < vip_start_time:
            raise HTTPException(
                status_code=403,
                detail=f"[RSVP_NOT_OPEN] RSVPs for this event open on {rsvp_start_regular.strftime('%B %d at %I:%M %p')}."
            )
        
        # If in VIP window (after VIP start, before regular start)
        if vip_start_time <= now < rsvp_start_regular:
            # Only Appreciation users can RSVP during VIP window
            if membership_tier == 'basic':
                regular_time_str = rsvp_start_regular.strftime('%B %d at %I:%M %p')
                raise HTTPException(
                    status_code=403,
                    detail=f"[VIP_EARLY_ACCESS] This event is in VIP early access. Appreciation members can RSVP now. General access opens on {regular_time_str}."
                )
    
    # Check monthly RSVP limit for Basic tier
    
    if membership_tier == 'basic':
        # Count RSVPs this month
        now = datetime.utcnow()
        month_start = datetime(now.year, now.month, 1)
        
        rsvp_count = await db.rsvps.count_documents({
            'user_id': user['_id'],
            'created_at': {'$gte': month_start}
        })
        
        # Basic tier limit: 3 RSVPs per month
        if rsvp_count >= 3:
            raise HTTPException(
                status_code=403, 
                detail="[MONTHLY_LIMIT] You've reached your monthly RSVP limit (3/month). Upgrade to Appreciation for unlimited RSVPs."
            )
    
    # Check event capacity (applies to all GP users)
    capacity = event.get('capacity', 100)
    overbooking_percentage = event.get('overbooking_percentage', 10)
    
    # Calculate RSVP limit with overbooking
    rsvp_limit = round(capacity * (1 + overbooking_percentage / 100))
    
    # Count current RSVPs for this event
    current_rsvps = await db.rsvps.count_documents({'event_id': event_id})
    
    print(f"📊 Event capacity check: {current_rsvps}/{rsvp_limit} (capacity: {capacity}, overbooking: {overbooking_percentage}%)")
    
    # Check if event is full
    if current_rsvps >= rsvp_limit:
        # Event is at capacity
        waitlist_enabled = event.get('waitlist_enabled', True)
        
        if waitlist_enabled:
            # Future: This will trigger waitlist logic
            raise HTTPException(
                status_code=403,
                detail="[EVENT_FULL_WAITLIST] Event is full. Waitlist functionality coming soon."
            )
        else:
            raise HTTPException(
                status_code=403,
                detail="[EVENT_FULL] This event is full. All spots have been taken. Check out other events going on near you."
            )
    
    # Create RSVP
    import uuid
    rsvp_id = str(uuid.uuid4())
    rsvp_dict = {
        '_id': rsvp_id,
        'event_id': event_id,
        'user_id': user['_id'],
        'created_at': datetime.utcnow()
    }
    
    await db.rsvps.insert_one(rsvp_dict)
    return {'message': 'RSVP confirmed', 'rsvp_id': rsvp_id}

@api_router.delete("/events/{event_id}/rsvp")
async def cancel_rsvp(event_id: str, user: Dict = Depends(get_current_user)):
    """Cancel RSVP for an event"""
    import uuid
    
    # Delete the RSVP
    result = await db.rsvps.delete_one({
        'event_id': event_id,
        'user_id': user['_id']
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="RSVP not found")
    
    # Check if waitlist auto-promotion should happen
    event = await db.events.find_one({'_id': event_id})
    
    # Create RSVP cancelled notification
    notif_id = str(uuid.uuid4())
    await db.notifications.insert_one({
        '_id': notif_id,
        'user_id': user['_id'],
        'type': 'RSVP_CANCELLED',
        'event_id': event_id,
        'title': 'RSVP cancelled',
        'message': f"Your RSVP for {event.get('title', 'this event') if event else 'this event'} has been cancelled.",
        'is_read': False,
        'created_at': datetime.utcnow()
    })
    
    if event and event.get('waitlist_enabled', False):
        # Get first person in waitlist
        first_in_line = await db.waitlist.find_one(
            {'event_id': event_id},
            sort=[('position', 1)]
        )
        
        if first_in_line:
            # Auto-promote: Create RSVP for first person in waitlist
            import uuid
            rsvp_id = str(uuid.uuid4())
            promoted_rsvp = {
                '_id': rsvp_id,
                'event_id': event_id,
                'user_id': first_in_line['user_id'],
                'created_at': datetime.utcnow()
            }
            
            # Create RSVP (bypasses monthly limit - they earned the spot)
            await db.rsvps.insert_one(promoted_rsvp)
            
            # Remove from waitlist
            await db.waitlist.delete_one({'_id': first_in_line['_id']})
            
            # Reorder remaining waitlist positions and notify users of position changes
            remaining = await db.waitlist.find({'event_id': event_id}).sort('position', 1).to_list(1000)
            event_title = event.get('title', 'Event')
            
            for i, entry in enumerate(remaining, 1):
                old_position = entry['position']
                new_position = i
                
                if old_position != new_position:
                    # Update position
                    await db.waitlist.update_one(
                        {'_id': entry['_id']},
                        {'$set': {'position': new_position}}
                    )
                    
                    # Notify user of position change
                    notif_id = str(uuid.uuid4())
                    await db.notifications.insert_one({
                        '_id': notif_id,
                        'user_id': entry['user_id'],
                        'type': 'WAITLIST_POSITION_CHANGED',
                        'event_id': event_id,
                        'title': 'You moved up the list',
                        'message': f"Your position for {event_title} is now #{new_position}.",
                        'is_read': False,
                        'created_at': datetime.utcnow()
                    })
            
            # Create notification for promoted user
            notif_id = str(uuid.uuid4())
            await db.notifications.insert_one({
                '_id': notif_id,
                'user_id': first_in_line['user_id'],
                'type': 'WAITLIST_PROMOTED',
                'event_id': event_id,
                'title': "You're in!",
                'message': f"A spot opened up and your RSVP for {event_title} is now confirmed.",
                'is_read': False,
                'created_at': datetime.utcnow()
            })
            
            print(f"✅ Auto-promoted user {first_in_line['user_id']} from waitlist to RSVP for event {event_id}")
    
    return {'message': 'RSVP cancelled'}


# ============= WAITLIST ROUTES =============

@api_router.post("/events/{event_id}/waitlist")
async def join_waitlist(event_id: str, user: Dict = Depends(get_current_user)):
    """Join waitlist for a full event"""
    # Only GP users can join waitlist
    if user.get('user_type') != 'general_public':
        raise HTTPException(status_code=403, detail="Only General Public members can join waitlist")
    
    # Check if event exists
    event = await db.events.find_one({'_id': event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check if waitlist is enabled
    if not event.get('waitlist_enabled', True):
        raise HTTPException(status_code=403, detail="Waitlist is not available for this event")
    
    # Check if already on waitlist
    existing = await db.waitlist.find_one({
        'event_id': event_id,
        'user_id': user['_id']
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="[ALREADY_ON_WAITLIST] You're already on the waitlist for this event.")
    
    # Check if already RSVP'd
    existing_rsvp = await db.rsvps.find_one({
        'event_id': event_id,
        'user_id': user['_id']
    })
    
    if existing_rsvp:
        raise HTTPException(status_code=400, detail="You're already RSVP'd to this event")
    
    # Get current waitlist position (next available)
    max_position = await db.waitlist.count_documents({'event_id': event_id})
    
    # Create waitlist entry
    import uuid
    waitlist_id = str(uuid.uuid4())
    waitlist_dict = {
        '_id': waitlist_id,
        'event_id': event_id,
        'user_id': user['_id'],
        'position': max_position + 1,
        'created_at': datetime.utcnow()
    }
    
    await db.waitlist.insert_one(waitlist_dict)
    
    # Create notification for joining waitlist
    notif_id = str(uuid.uuid4())
    await db.notifications.insert_one({
        '_id': notif_id,
        'user_id': user['_id'],
        'type': 'WAITLIST_JOINED',
        'event_id': event_id,
        'title': 'You joined the waitlist',
        'message': f"You're now position #{max_position + 1} for {event.get('title', 'this event')}.",
        'is_read': False,
        'created_at': datetime.utcnow()
    })
    
    return {
        'message': 'Added to waitlist',
        'position': max_position + 1,
        'waitlist_id': waitlist_id
    }

@api_router.delete("/events/{event_id}/waitlist")
async def leave_waitlist(event_id: str, user: Dict = Depends(get_current_user)):
    """Leave waitlist for an event"""
    result = await db.waitlist.delete_one({
        'event_id': event_id,
        'user_id': user['_id']
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not on waitlist")
    
    # Reorder remaining waitlist positions
    remaining = await db.waitlist.find({'event_id': event_id}).sort('position', 1).to_list(1000)
    
    # Get event for notification messages
    event = await db.events.find_one({'_id': event_id})
    event_title = event.get('title', 'Event') if event else 'Event'
    
    for i, entry in enumerate(remaining, 1):
        old_position = entry['position']
        new_position = i
        
        if old_position != new_position:
            # Update position
            await db.waitlist.update_one(
                {'_id': entry['_id']},
                {'$set': {'position': new_position}}
            )
            
            # Notify user of position change
            import uuid
            notif_id = str(uuid.uuid4())
            await db.notifications.insert_one({
                '_id': notif_id,
                'user_id': entry['user_id'],
                'type': 'WAITLIST_POSITION_CHANGED',
                'event_id': event_id,
                'title': 'You moved up the list',
                'message': f"Your position for {event_title} is now #{new_position}.",
                'is_read': False,
                'created_at': datetime.utcnow()
            })
    
    return {'message': 'Removed from waitlist'}

@api_router.get("/events/{event_id}/waitlist-status")
async def get_waitlist_status(event_id: str, user: Dict = Depends(get_current_user)):
    """Check if user is on waitlist and their position"""
    waitlist_entry = await db.waitlist.find_one({
        'event_id': event_id,
        'user_id': user['_id']
    })
    
    if waitlist_entry:
        return {
            'on_waitlist': True,
            'position': waitlist_entry['position']
        }
    
    return {'on_waitlist': False, 'position': None}

async def cancel_rsvp(event_id: str, user: Dict = Depends(get_current_user)):
    """Cancel RSVP for an event"""
    result = await db.rsvps.delete_one({
        'event_id': event_id,
        'user_id': user['_id']
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="RSVP not found")
    
    return {'message': 'RSVP cancelled'}

@api_router.get("/events/{event_id}/rsvp-status")
async def get_rsvp_status(event_id: str, user: Dict = Depends(get_current_user)):
    """Check if user has RSVP'd to an event"""
    rsvp = await db.rsvps.find_one({
        'event_id': event_id,
        'user_id': user['_id']
    })
    
    return {'has_rsvpd': rsvp is not None}

@api_router.get("/my-rsvps")
async def get_my_rsvps(user: Dict = Depends(get_current_user)):
    """Get all events the current user has RSVP'd to"""
    # Get all RSVPs for this user
    rsvps = await db.rsvps.find({'user_id': user['_id']}).to_list(1000)
    
    # Get event details for each RSVP
    events_with_rsvp = []
    for rsvp in rsvps:
        event = await db.events.find_one({'_id': rsvp['event_id']})
        if event:
            events_with_rsvp.append({
                **event,
                'id': event['_id'],
                'rsvp_id': rsvp['_id'],
                'rsvp_date': rsvp['created_at']
            })
    
    # Sort by RSVP date (most recent first)
    events_with_rsvp.sort(key=lambda x: x.get('rsvp_date', ''), reverse=True)
    
    return events_with_rsvp

@api_router.get("/my-waitlist")
async def get_my_waitlist(user: Dict = Depends(get_current_user)):
    """Get all events the current user is waitlisted for"""
    # Get all waitlist entries for this user
    waitlist_entries = await db.waitlist.find({'user_id': user['_id']}).to_list(1000)
    
    # Get event details for each waitlist entry
    events_with_waitlist = []
    for entry in waitlist_entries:
        event = await db.events.find_one({'_id': entry['event_id']})
        if event:
            events_with_waitlist.append({
                **event,
                'id': event['_id'],
                'waitlist_id': entry['_id'],
                'waitlist_position': entry['position'],
                'joined_waitlist_at': entry['created_at']
            })
    
    # Sort by waitlist join date (most recent first)
    events_with_waitlist.sort(key=lambda x: x.get('joined_waitlist_at', ''), reverse=True)
    
    return events_with_waitlist

    
    return {'has_rsvpd': rsvp is not None}


# ============= VENUE ROUTES =============

@api_router.get("/venues")
async def get_venues(popular: Optional[bool] = None):
    query = {}
    if popular is not None:
        query['popular'] = popular
    venues = await db.venues.find(query).to_list(1000)
    return [{**venue, 'id': venue['_id']} for venue in venues]

@api_router.get("/places")
async def get_places(
    venue_type: Optional[str] = None,  # Filter by venue type ID
    state: Optional[str] = None,  # Filter by state
    city: Optional[str] = None,  # Filter by city (case-insensitive partial match)
    county: Optional[str] = None,  # Filter by county (case-insensitive partial match)
    use_case: Optional[str] = None  # Filter by use case (checks if use_case in use_cases array)
):
    """Get business/venue profiles (Places) with filters"""
    query = {'user_type': 'business'}  # Only business profiles
    
    # Venue type filter
    if venue_type:
        query['venue_type'] = venue_type
    
    # Location filters
    if state:
        query['state'] = state
    
    if city:
        query['city'] = {'$regex': city, '$options': 'i'}  # Case-insensitive partial match
    
    if county:
        query['county'] = {'$regex': county, '$options': 'i'}  # Case-insensitive partial match
    
    # Use case filter
    if use_case:
        query['use_cases'] = use_case  # MongoDB checks if value is in array
    
    venues = await db.users.find(query).to_list(1000)
    
    # Return minimal venue info for listing
    return [{
        'id': v['_id'],
        'business_name': v.get('business_name'),
        'venue_type': v.get('venue_type'),
        'use_cases': v.get('use_cases', []),
        'city': v.get('city'),
        'state': v.get('state'),
        'county': v.get('county'),
        'business_logo': v.get('business_logo'),
        'business_photos': v.get('business_photos', []),
        'business_description': v.get('business_description'),
        'business_address': v.get('business_address'),
        'amenities': v.get('amenities', []),
        'entertainment_categories': v.get('entertainment_categories', []),
        'membership_tier': v.get('membership_tier', 'basic')
    } for v in venues]

@api_router.get("/venues/{venue_id}")
async def get_venue(venue_id: str):
    venue = await db.venues.find_one({'_id': venue_id})
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    return {**venue, 'id': venue['_id']}

@api_router.post("/venues")
async def create_venue(venue_data: VenueCreate, user: Dict = Depends(get_current_user)):
    import uuid
    venue_id = str(uuid.uuid4())
    venue_dict = venue_data.dict()
    venue_dict['_id'] = venue_id
    venue_dict['created_at'] = datetime.utcnow()
    await db.venues.insert_one(venue_dict)
    return {**venue_dict, 'id': venue_id}

# ============= SERVICE ROUTES =============

@api_router.get("/services")
async def get_services(featured: Optional[bool] = None):
    query = {}
    if featured is not None:
        query['featured'] = featured
    services = await db.services.find(query).to_list(1000)
    return [{**service, 'id': service['_id']} for service in services]

@api_router.get("/services/{service_id}")
async def get_service(service_id: str):
    service = await db.services.find_one({'_id': service_id})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return {**service, 'id': service['_id']}

@api_router.post("/services")
async def create_service(service_data: ServiceCreate, user: Dict = Depends(get_current_user)):
    import uuid
    service_id = str(uuid.uuid4())
    service_dict = service_data.dict()
    service_dict['_id'] = service_id
    service_dict['created_at'] = datetime.utcnow()
    await db.services.insert_one(service_dict)
    return {**service_dict, 'id': service_id}

# ============= VIDEO ROUTES =============

@api_router.get("/videos")
async def get_videos(featured: Optional[bool] = None):
    query = {}
    if featured is not None:
        query['featured'] = featured
    videos = await db.videos.find(query).to_list(1000)
    return [{**video, 'id': video['_id']} for video in videos]

# Get featured portfolio videos for homepage (MUST be before /videos/{video_id})
@api_router.get("/videos/featured")
async def get_featured_videos(location: Optional[str] = None, limit: int = 10):
    """Get approved featured videos for homepage"""
    query = {
        'portfolio_videos': {'$exists': True},
        'portfolio_videos.featured': True,
        'portfolio_videos.featured_approved': True
    }
    
    # Note: Location filtering temporarily disabled to show all featured videos
    # Will be re-enabled in future update with better matching logic
    # if location:
    #     query['location'] = {'$regex': location, '$options': 'i'}
    
    users = await db.users.find(query).to_list(length=100)
    
    featured_videos = []
    for user in users:
        for video in user.get('portfolio_videos', []):
            if video.get('featured') and video.get('featured_approved'):
                featured_videos.append({
                    'video': video,
                    'user': {
                        'id': str(user['_id']),
                        'username': user.get('username'),
                        'full_name': user.get('full_name'),
                        'profile_photo': user.get('profile_photo'),
                        'user_type': user.get('user_type'),
                        'membership_tier': user.get('membership_tier', 'free'),
                        'location': user.get('location')
                    }
                })
    
    # Sort by featured date (newest first)
    # Use featured_approved_date as fallback if featured_date is missing
    featured_videos.sort(
        key=lambda x: x['video'].get('featured_date') or x['video'].get('featured_approved_date', ''),
        reverse=True
    )
    
    return featured_videos[:limit]

@api_router.get("/videos/{video_id}")
async def get_video(video_id: str):
    video = await db.videos.find_one({'_id': video_id})
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    # Increment views
    await db.videos.update_one({'_id': video_id}, {'$inc': {'views': 1}})
    return {**video, 'id': video['_id']}

@api_router.post("/videos")
async def create_video(video_data: VideoCreate, user: Dict = Depends(get_current_user)):
    import uuid
    video_id = str(uuid.uuid4())
    video_dict = video_data.dict()
    video_dict['_id'] = video_id
    video_dict['created_at'] = datetime.utcnow()
    video_dict['views'] = 0
    await db.videos.insert_one(video_dict)
    return {**video_dict, 'id': video_id}

# ============= COUPON ROUTES =============

@api_router.get("/coupons")
async def get_coupons(
    owner_id: Optional[str] = None,  # Filter by venue/entrepreneur
    state: Optional[str] = None,  # Filter by owner's state
    city: Optional[str] = None,  # Filter by owner's city
    owner_type: Optional[str] = None,  # business or entrepreneur
    discount_type: Optional[str] = None,  # amount_off, percent_off, etc.
    user: Dict = Depends(get_current_user)
):
    """Get list of active approved coupons (public endpoint)"""
    query = {
        'status': 'active',
        'approval_status': 'approved'  # CRITICAL: Only approved coupons
    }
    
    # Check if coupon is still valid (not expired)
    query['valid_until'] = {'$gte': datetime.utcnow()}
    
    if owner_id:
        query['owner_id'] = owner_id
    
    if discount_type:
        query['discount_type'] = discount_type
    
    coupons = await db.coupons.find(query).sort('created_at', -1).to_list(1000)
    
    # Enrich with owner info and user redemption count
    enriched = []
    for coupon in coupons:
        # Get owner info
        owner = await db.users.find_one({'_id': coupon['owner_id']})
        
        # Apply location filters if specified
        if state and owner and owner.get('state') != state:
            continue
        if city and owner and city.lower() not in (owner.get('city') or '').lower():
            continue
        if owner_type and owner and owner.get('user_type') != owner_type:
            continue
        
        # Get total redemption count
        total_redemptions = await db.coupon_redemptions.count_documents({'coupon_id': coupon['_id']})
        
        # Get user's redemption count
        user_redemptions = await db.coupon_redemptions.count_documents({
            'coupon_id': coupon['_id'],
            'user_id': user['_id']
        })
        
        enriched.append({
            **coupon,
            'id': coupon['_id'],
            'owner_name': owner.get('business_name') or owner.get('full_name') or owner.get('username') if owner else 'Unknown',
            'owner_type': owner.get('user_type') if owner else None,
            'owner_city': owner.get('city') if owner else None,
            'owner_state': owner.get('state') if owner else None,
            'total_redemptions': total_redemptions,
            'user_redemption_count': user_redemptions
        })
    
    return enriched

@api_router.get("/coupons/{coupon_id}")
async def get_coupon(coupon_id: str, user: Dict = Depends(get_current_user)):
    """Get coupon details with owner and redemption info"""
    coupon = await db.coupons.find_one({'_id': coupon_id})
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    
    # Get owner info
    owner = await db.users.find_one({'_id': coupon['owner_id']})
    
    # Get total redemption count
    total_redemptions = await db.coupon_redemptions.count_documents({'coupon_id': coupon_id})
    
    # Get user's redemption count
    user_redemptions = await db.coupon_redemptions.count_documents({
        'coupon_id': coupon_id,
        'user_id': user['_id']
    })
    
    return {
        **coupon,
        'id': coupon['_id'],
        'owner_name': owner.get('business_name') or owner.get('full_name') or owner.get('username') if owner else 'Unknown',
        'owner_type': owner.get('user_type') if owner else None,
        'owner_city': owner.get('city') if owner else None,
        'owner_state': owner.get('state') if owner else None,
        'total_redemptions': total_redemptions,
        'user_redemption_count': user_redemptions
    }

@api_router.post("/coupons")
async def create_coupon(coupon_data: CouponCreate, user: Dict = Depends(get_current_user)):
    """Create a coupon (venue/entrepreneur only)"""
    # Only businesses and entrepreneurs can create coupons
    if user.get('user_type') not in ['business', 'entrepreneur']:
        raise HTTPException(status_code=403, detail="Only venues and entrepreneurs can create coupons")
    
    # Check for duplicate coupon (same title by same owner)
    existing_coupon = await db.coupons.find_one({
        'owner_id': user['_id'],
        'title': coupon_data.title.strip(),
        'status': {'$ne': 'deleted'}  # Exclude deleted coupons
    })
    
    if existing_coupon:
        raise HTTPException(
            status_code=400,
            detail="You already have a coupon with this title. Please use a different title or edit the existing one."
        )
    
    import uuid
    coupon_id = str(uuid.uuid4())
    coupon_dict = coupon_data.dict()
    coupon_dict['_id'] = coupon_id
    coupon_dict['owner_id'] = user['_id']
    coupon_dict['created_at'] = datetime.utcnow()
    coupon_dict['updated_at'] = datetime.utcnow()
    
    # Auto-generate code if not provided
    if not coupon_dict.get('code'):
        # Generate code: OWNER_RANDOM (e.g., CLUBH3_A1B2)
        owner_prefix = (user.get('business_name') or user.get('username') or 'WGO4Y')[:6].upper().replace(' ', '')
        random_suffix = str(uuid.uuid4())[:4].upper()
        coupon_dict['code'] = f"{owner_prefix}_{random_suffix}"
    
    await db.coupons.insert_one(coupon_dict)
    return {**coupon_dict, 'id': coupon_id}

@api_router.put("/coupons/{coupon_id}")
async def update_coupon(
    coupon_id: str,
    coupon_data: CouponUpdate,
    user: Dict = Depends(get_current_user)
):
    """Update coupon (owner only)"""
    coupon = await db.coupons.find_one({'_id': coupon_id})
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    
    # Check ownership
    if coupon['owner_id'] != user['_id']:
        raise HTTPException(status_code=403, detail="Only the coupon owner can edit it")
    
    # Update coupon
    update_dict = {k: v for k, v in coupon_data.dict().items() if v is not None}
    update_dict['updated_at'] = datetime.utcnow()
    
    await db.coupons.update_one(
        {'_id': coupon_id},
        {'$set': update_dict}
    )
    
    updated_coupon = await db.coupons.find_one({'_id': coupon_id})
    return {**updated_coupon, 'id': updated_coupon['_id']}

@api_router.post("/coupons/{coupon_id}/redeem")
async def redeem_coupon(coupon_id: str, user: Dict = Depends(get_current_user)):
    """Redeem a coupon"""
    coupon = await db.coupons.find_one({'_id': coupon_id})
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    
    # Check if coupon is active
    if coupon.get('status') != 'active':
        raise HTTPException(status_code=400, detail="This coupon is not active")
    
    # Check if coupon is valid (date range)
    now = datetime.utcnow()
    if coupon.get('valid_from') and now < coupon['valid_from']:
        raise HTTPException(status_code=400, detail="This coupon is not valid yet")
    
    if coupon.get('valid_until') and now > coupon['valid_until']:
        raise HTTPException(status_code=400, detail="This coupon has expired")
    
    # Check day of week restriction
    if coupon.get('days_of_week'):
        current_day = now.strftime('%A')  # e.g., 'Monday'
        if current_day not in coupon['days_of_week']:
            raise HTTPException(
                status_code=400,
                detail=f"This coupon is only valid on: {', '.join(coupon['days_of_week'])}"
            )
    
    # Get user's redemption count
    user_redemptions = await db.coupon_redemptions.count_documents({
        'coupon_id': coupon_id,
        'user_id': user['_id'],
        'status': 'redeemed'
    })
    
    # Check per-user limit
    usage_limit_per_user = coupon.get('usage_limit_per_user', 1)
    if user_redemptions >= usage_limit_per_user:
        raise HTTPException(
            status_code=400,
            detail=f"You've already used this coupon {user_redemptions}/{usage_limit_per_user} times"
        )
    
    # Check total limit
    if coupon.get('usage_limit_total'):
        total_redemptions = await db.coupon_redemptions.count_documents({
            'coupon_id': coupon_id,
            'status': 'redeemed'
        })
        if total_redemptions >= coupon['usage_limit_total']:
            raise HTTPException(status_code=400, detail="This coupon has reached its redemption limit")
    
    # Create redemption record
    import uuid
    redemption_id = str(uuid.uuid4())
    redemption_dict = {
        '_id': redemption_id,
        'coupon_id': coupon_id,
        'user_id': user['_id'],
        'redeemed_at': datetime.utcnow(),
        'status': 'redeemed'
    }
    
    await db.coupon_redemptions.insert_one(redemption_dict)
    
    # Get updated user redemption count
    new_user_count = user_redemptions + 1
    
    print(f"✅ Coupon redeemed: {coupon['title']} by {user['_id']} ({new_user_count}/{usage_limit_per_user})")
    
    return {
        'message': 'Coupon redeemed successfully',
        'code': coupon.get('code'),
        'user_redemption_count': new_user_count,
        'usage_limit_per_user': usage_limit_per_user
    }

@api_router.get("/my-coupons")
async def get_my_coupons(user: Dict = Depends(get_current_user)):
    """Get coupons the current user has redeemed"""
    # Get all user's redemptions
    redemptions = await db.coupon_redemptions.find({
        'user_id': user['_id'],
        'status': 'redeemed'
    }).to_list(1000)
    
    # Get coupon details for each redemption
    coupons_with_redemptions = []
    for redemption in redemptions:
        coupon = await db.coupons.find_one({'_id': redemption['coupon_id']})
        if coupon:
            # Get owner info
            owner = await db.users.find_one({'_id': coupon['owner_id']})
            
            # Get user's total redemptions for this coupon
            user_redemption_count = await db.coupon_redemptions.count_documents({
                'coupon_id': coupon['_id'],
                'user_id': user['_id'],
                'status': 'redeemed'
            })
            
            coupons_with_redemptions.append({
                **coupon,
                'id': coupon['_id'],
                'owner_name': owner.get('business_name') or owner.get('full_name') if owner else 'Unknown',
                'redemption_id': redemption['_id'],
                'redeemed_at': redemption['redeemed_at'],
                'user_redemption_count': user_redemption_count,
                'is_expired': coupon.get('valid_until') and datetime.utcnow() > coupon['valid_until']
            })
    
    # Sort by redemption date (most recent first)
    coupons_with_redemptions.sort(key=lambda x: x['redeemed_at'], reverse=True)
    
    return coupons_with_redemptions

# ============= RAFFLE ROUTES =============

@api_router.get("/raffles")
async def get_raffles(
    status: Optional[str] = None,  # Filter by status: draft, active, closed
    upcoming_only: bool = False,
    user: Dict = Depends(get_current_user)
):
    """Get list of approved raffles (public endpoint)"""
    query = {'approval_status': 'approved'}  # CRITICAL: Only approved raffles
    
    if status:
        query['status'] = status
    elif upcoming_only:
        # Only show active raffles that haven't ended
        query['status'] = 'active'
        query['end_date'] = {'$gte': datetime.utcnow()}
    
    raffles = await db.raffles.find(query).sort('end_date', 1).to_list(1000)
    
    # Enrich with entry counts and user's entry count
    enriched = []
    for raffle in raffles:
        # Get total entry count
        total_entries = await db.raffle_entries.count_documents({'raffle_id': raffle['_id']})
        
        # Get user's entry count
        user_entries = await db.raffle_entries.count_documents({
            'raffle_id': raffle['_id'],
            'user_id': user['_id']
        })
        
        enriched.append({
            **raffle,
            'id': raffle['_id'],
            'total_entries': total_entries,
            'user_entry_count': user_entries
        })
    
    return enriched

@api_router.get("/raffles/{raffle_id}")
async def get_raffle(raffle_id: str, user: Dict = Depends(get_current_user)):
    """Get raffle details with user entry count"""
    raffle = await db.raffles.find_one({'_id': raffle_id})
    if not raffle:
        raise HTTPException(status_code=404, detail="Raffle not found")
    
    # Get total entry count
    total_entries = await db.raffle_entries.count_documents({'raffle_id': raffle_id})
    
    # Get user's entry count
    user_entries = await db.raffle_entries.count_documents({
        'raffle_id': raffle_id,
        'user_id': user['_id']
    })
    
    return {
        **raffle,
        'id': raffle['_id'],
        'total_entries': total_entries,
        'user_entry_count': user_entries
    }

@api_router.post("/raffles")
async def create_raffle(raffle_data: RaffleCreate, user: Dict = Depends(get_current_user)):
    """Create a raffle (Business and Entrepreneur only)"""
    # Only businesses and entrepreneurs can create raffles
    if user.get('user_type') not in ['business', 'entrepreneur']:
        raise HTTPException(status_code=403, detail="Only venues and entrepreneurs can create raffles")
    
    import uuid
    raffle_id = str(uuid.uuid4())
    raffle_dict = raffle_data.dict()
    raffle_dict['_id'] = raffle_id
    raffle_dict['owner_id'] = user['_id']  # Track who created it
    raffle_dict['created_by'] = user['_id']  # Also use created_by for consistency
    raffle_dict['owner_name'] = user.get('business_name') or user.get('full_name') or user.get('username')
    raffle_dict['owner_type'] = user.get('user_type')
    raffle_dict['created_at'] = datetime.utcnow()
    raffle_dict['updated_at'] = datetime.utcnow()
    raffle_dict['winner_user_id'] = None
    raffle_dict['winner_entry_id'] = None
    raffle_dict['winner_selected_at'] = None
    
    await db.raffles.insert_one(raffle_dict)
    print(f"✅ Raffle created: {raffle_data.title} by {raffle_dict['owner_name']}")
    return {**raffle_dict, 'id': raffle_id}

@api_router.post("/raffles/{raffle_id}/enter")
async def enter_raffle(raffle_id: str, user: Dict = Depends(get_current_user)):
    """Purchase a raffle entry with Stripe payment (TEST MODE)"""
    raffle = await db.raffles.find_one({'_id': raffle_id})
    if not raffle:
        raise HTTPException(status_code=404, detail="Raffle not found")
    
    # Check if raffle is active
    if raffle.get('status') != 'active':
        raise HTTPException(status_code=400, detail="Raffle is not currently active")
    
    # Check if raffle has ended
    if raffle.get('end_date') and datetime.utcnow() > raffle['end_date']:
        raise HTTPException(status_code=400, detail="Raffle has ended")
    
    # Check max tickets
    if raffle.get('max_tickets'):
        current_entries = await db.raffle_entries.count_documents({'raffle_id': raffle_id})
        if current_entries >= raffle['max_tickets']:
            raise HTTPException(status_code=400, detail="Raffle is sold out")
    
    # Create Stripe Checkout Session
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
        
        # Get origin URL from request (for success/cancel redirects)
        # For mobile, we'll use a simple success endpoint
        success_url = f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/raffle/{raffle_id}?payment=success"
        cancel_url = f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/raffle/{raffle_id}?payment=cancelled"
        
        # Create Stripe checkout
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
        
        # Prepare checkout request
        checkout_request = CheckoutSessionRequest(
            success_url=success_url,
            cancel_url=cancel_url,
            customer_email=user.get('email'),
            line_items=[{
                'price_data': {
                    'currency': raffle.get('currency', 'usd').lower(),
                    'product_data': {
                        'name': f"Raffle Entry: {raffle['title']}",
                        'description': f"Prize: {raffle['prize']}"
                    },
                    'unit_amount': int(raffle['ticket_price'] * 100)  # Convert to cents
                },
                'quantity': 1
            }],
            mode='payment',
            metadata={
                'raffle_id': raffle_id,
                'user_id': user['_id'],
                'type': 'raffle_entry'
            }
        )
        
        # Create checkout session
        session = stripe_checkout.create_session(checkout_request)
        
        print(f"✅ Stripe checkout session created: {session.id}")
        
        # Return checkout URL for frontend to redirect
        return {
            'checkout_url': session.url,
            'session_id': session.id,
            'message': 'Redirect to Stripe checkout'
        }
        
    except Exception as e:
        print(f"❌ Stripe error: {str(e)}")
        # Fallback to mock payment for testing if Stripe fails
        print(f"⚠️  Falling back to mock payment for testing")
        
        mock_payment_id = f"mock_pay_{user['_id'][:8]}_{int(datetime.utcnow().timestamp())}"
        
        # Get next entry number
        entry_count = await db.raffle_entries.count_documents({'raffle_id': raffle_id})
        next_entry_number = entry_count + 1
        
        # Create raffle entry
        import uuid
        entry_id = str(uuid.uuid4())
        entry_dict = {
            '_id': entry_id,
            'raffle_id': raffle_id,
            'user_id': user['_id'],
            'entry_number': next_entry_number,
            'stripe_payment_id': mock_payment_id,
            'created_at': datetime.utcnow()
        }
        
        await db.raffle_entries.insert_one(entry_dict)
        
        # Get user's total entry count
        user_total_entries = await db.raffle_entries.count_documents({
            'raffle_id': raffle_id,
            'user_id': user['_id']
        })
        
        return {
            'message': 'Successfully entered raffle (mock payment)',
            'entry_id': entry_id,
            'entry_number': next_entry_number,
            'user_entry_count': user_total_entries,
            'payment_id': mock_payment_id,
            'mock': True
        }

@api_router.post("/raffles/{raffle_id}/confirm-entry")
async def confirm_raffle_entry(
    raffle_id: str,
    session_id: str,
    user: Dict = Depends(get_current_user)
):
    """Confirm raffle entry after successful Stripe payment"""
    # Verify the Stripe session was successful
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout
        
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
        session_status = stripe_checkout.get_session_status(session_id)
        
        if session_status.status != 'complete':
            raise HTTPException(status_code=400, detail="Payment not completed")
        
        # Check if entry already created for this session
        existing_entry = await db.raffle_entries.find_one({'stripe_payment_id': session_id})
        if existing_entry:
            # Entry already created, return existing data
            user_total_entries = await db.raffle_entries.count_documents({
                'raffle_id': raffle_id,
                'user_id': user['_id']
            })
            
            return {
                'message': 'Entry already recorded',
                'entry_id': existing_entry['_id'],
                'entry_number': existing_entry['entry_number'],
                'user_entry_count': user_total_entries,
                'payment_id': session_id
            }
        
        # Get next entry number
        entry_count = await db.raffle_entries.count_documents({'raffle_id': raffle_id})
        next_entry_number = entry_count + 1
        
        # Create raffle entry
        import uuid
        entry_id = str(uuid.uuid4())
        entry_dict = {
            '_id': entry_id,
            'raffle_id': raffle_id,
            'user_id': user['_id'],
            'entry_number': next_entry_number,
            'stripe_payment_id': session_id,
            'created_at': datetime.utcnow()
        }
        
        await db.raffle_entries.insert_one(entry_dict)
        
        # Get user's total entry count
        user_total_entries = await db.raffle_entries.count_documents({
            'raffle_id': raffle_id,
            'user_id': user['_id']
        })
        
        print(f"✅ Raffle entry confirmed via Stripe: User {user['_id']} → Entry #{next_entry_number}")
        
        return {
            'message': 'Successfully entered raffle',
            'entry_id': entry_id,
            'entry_number': next_entry_number,
            'user_entry_count': user_total_entries,
            'payment_id': session_id
        }
        
    except Exception as e:
        print(f"Error confirming raffle entry: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to confirm raffle entry")

@api_router.get("/raffles/{raffle_id}/entries")
async def get_raffle_entries(raffle_id: str, user: Dict = Depends(get_current_user)):
    """Get raffle entries (admin only)"""
    # Check if user is admin
    if not user.get('is_admin', False):
        raise HTTPException(status_code=403, detail="Only admins can view raffle entries")
    
    entries = await db.raffle_entries.find({'raffle_id': raffle_id}).sort('created_at', 1).to_list(10000)
    
    # Enrich with user info
    enriched = []
    for entry in entries:
        user_info = await db.users.find_one({'_id': entry['user_id']})
        enriched.append({
            'id': entry['_id'],
            'entry_number': entry['entry_number'],
            'user_id': entry['user_id'],
            'username': user_info.get('username') if user_info else 'Unknown',
            'full_name': user_info.get('full_name') if user_info else None,
            'stripe_payment_id': entry['stripe_payment_id'],
            'created_at': entry['created_at']
        })
    
    return enriched

@api_router.post("/raffles/{raffle_id}/draw-winner")
async def draw_raffle_winner(raffle_id: str, user: Dict = Depends(get_current_user)):
    """Randomly select a winner from raffle entries (admin only)"""
    # Check if user is admin
    if not user.get('is_admin', False):
        raise HTTPException(status_code=403, detail="Only admins can draw raffle winners")
    
    raffle = await db.raffles.find_one({'_id': raffle_id})
    if not raffle:
        raise HTTPException(status_code=404, detail="Raffle not found")
    
    # Check if winner already selected
    if raffle.get('winner_user_id'):
        raise HTTPException(status_code=400, detail="Winner already selected for this raffle")
    
    # Get all entries
    entries = await db.raffle_entries.find({'raffle_id': raffle_id}).to_list(10000)
    
    if len(entries) == 0:
        raise HTTPException(status_code=400, detail="No entries in this raffle")
    
    # Randomly select a winner
    import random
    winning_entry = random.choice(entries)
    
    # Update raffle with winner
    await db.raffles.update_one(
        {'_id': raffle_id},
        {
            '$set': {
                'winner_user_id': winning_entry['user_id'],
                'winner_entry_id': winning_entry['_id'],
                'winner_selected_at': datetime.utcnow(),
                'status': 'closed',
                'updated_at': datetime.utcnow()
            }
        }
    )
    
    # Create notification for winner
    import uuid
    notif_id = str(uuid.uuid4())
    await db.notifications.insert_one({
        '_id': notif_id,
        'user_id': winning_entry['user_id'],
        'type': 'RAFFLE_WINNER',
        'raffle_id': raffle_id,
        'title': "You won the raffle!",
        'message': f"Congratulations! You won {raffle['prize']} in the {raffle['title']} raffle. We'll contact you with next steps.",
        'is_read': False,
        'created_at': datetime.utcnow()
    })
    
    print(f"✅ Raffle winner selected: {winning_entry['user_id']} (Entry #{winning_entry['entry_number']})")
    
    # Get winner info
    winner_user = await db.users.find_one({'_id': winning_entry['user_id']})
    
    return {
        'message': 'Winner selected successfully',
        'winner': {
            'user_id': winning_entry['user_id'],
            'username': winner_user.get('username') if winner_user else 'Unknown',
            'full_name': winner_user.get('full_name') if winner_user else None,
            'entry_number': winning_entry['entry_number'],
            'entry_id': winning_entry['_id']
        },
        'total_entries': len(entries)
    }

# ============= CONSULTING ROUTES =============

@api_router.post("/consulting/request")
async def create_consulting_request(
    request_data: ConsultingRequestCreate,
    user: Dict = Depends(get_current_user)
):
    """Create a consulting request (business/entrepreneur/GP) - Premium tier only"""
    import uuid
    
    # Check if user has premium tier
    require_premium_tier(user, "Consulting")
    
    request_id = str(uuid.uuid4())
    
    request_dict = request_data.dict()
    request_dict['_id'] = request_id
    request_dict['owner_id'] = user['_id']
    request_dict['owner_type'] = user.get('user_type', 'general_public')
    request_dict['status'] = 'new'
    request_dict['created_at'] = datetime.utcnow()
    request_dict['updated_at'] = datetime.utcnow()
    
    await db.consulting_requests.insert_one(request_dict)
    
    # Create notification for consultants/admins
    # For MVP, notify all admins
    admins = await db.users.find({'is_admin': True}).to_list(100)
    
    owner_name = user.get('business_name') or user.get('full_name') or user.get('username')
    
    for admin in admins:
        notif_id = str(uuid.uuid4())
        await db.notifications.insert_one({
            '_id': notif_id,
            'user_id': admin['_id'],
            'type': 'CONSULTING_REQUEST',
            'consulting_request_id': request_id,
            'title': 'New consulting request',
            'message': f"New consulting request from {owner_name} ({user.get('user_type', 'user')}). Topics: {', '.join(request_data.topics)}",
            'is_read': False,
            'created_at': datetime.utcnow()
        })
    
    print(f"✅ Consulting request created: {request_id} from {owner_name}")
    
    return {
        **request_dict,
        'id': request_id,
        'message': 'Consulting request submitted successfully'
    }

@api_router.get("/consulting/requests")
async def get_consulting_requests(
    status: Optional[str] = None,
    user: Dict = Depends(get_current_user)
):
    """Get consulting requests (admin sees all, users see their own)"""
    if user.get('is_admin', False):
        # Admins see all requests
        query = {}
        if status:
            query['status'] = status
        
        requests = await db.consulting_requests.find(query).sort('created_at', -1).to_list(1000)
        
        # Enrich with owner info
        enriched = []
        for req in requests:
            owner = await db.users.find_one({'_id': req['owner_id']})
            enriched.append({
                **req,
                'id': req['_id'],
                'owner_name': owner.get('business_name') or owner.get('full_name') or owner.get('username') if owner else 'Unknown',
                'owner_city': owner.get('city') if owner else None,
                'owner_state': owner.get('state') if owner else None
            })
        
        return enriched
    else:
        # Regular users see only their own requests
        requests = await db.consulting_requests.find({
            'owner_id': user['_id']
        }).sort('created_at', -1).to_list(1000)
        
        return [{**req, 'id': req['_id']} for req in requests]

@api_router.get("/consulting/requests/{request_id}")
async def get_consulting_request(request_id: str, user: Dict = Depends(get_current_user)):
    """Get consulting request details"""
    request = await db.consulting_requests.find_one({'_id': request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Check access: owner or admin
    if request['owner_id'] != user['_id'] and not user.get('is_admin', False):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get owner info
    owner = await db.users.find_one({'_id': request['owner_id']})
    
    return {
        **request,
        'id': request['_id'],
        'owner_name': owner.get('business_name') or owner.get('full_name') or owner.get('username') if owner else 'Unknown',
        'owner_email': owner.get('email') if owner else None,
        'owner_phone': owner.get('phone') or owner.get('business_phone') if owner else None,
        'owner_city': owner.get('city') if owner else None,
        'owner_state': owner.get('state') if owner else None
    }

@api_router.patch("/consulting/requests/{request_id}")
async def update_consulting_request(
    request_id: str,
    update_data: ConsultingRequestUpdate,
    user: Dict = Depends(get_current_user)
):
    """Update consulting request status (admin only)"""
    # Only admins can update status
    if not user.get('is_admin', False):
        raise HTTPException(status_code=403, detail="Only admins can update consulting requests")
    
    request = await db.consulting_requests.find_one({'_id': request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    old_status = request.get('status')
    
    # Import uuid for notification IDs
    import uuid
    
    # Update request
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    update_dict['updated_at'] = datetime.utcnow()
    
    await db.consulting_requests.update_one(
        {'_id': request_id},
        {'$set': update_dict}
    )
    
    # If status changed to completed, notify the requester
    if update_data.status == 'completed' and old_status != 'completed':
        owner = await db.users.find_one({'_id': request['owner_id']})
        
        notif_id = str(uuid.uuid4())
        await db.notifications.insert_one({
            '_id': notif_id,
            'user_id': request['owner_id'],
            'type': 'CONSULTING_COMPLETED',
            'consulting_request_id': request_id,
            'title': 'Your consulting session has been completed',
            'message': 'Thank you for using WGO4Y consulting! We hope the session was helpful. Feel free to request another session anytime.',
            'is_read': False,
            'created_at': datetime.utcnow()
        })
        
        print(f"✅ Consulting request {request_id} marked completed, notification sent")
    
    # If status changed to in_progress, notify the requester
    if update_data.status == 'in_progress' and old_status != 'in_progress':
        notif_id = str(uuid.uuid4())
        await db.notifications.insert_one({
            '_id': notif_id,
            'user_id': request['owner_id'],
            'type': 'CONSULTING_IN_PROGRESS',
            'consulting_request_id': request_id,
            'title': 'Your consulting request is in progress',
            'message': 'Our team has started working on your consulting request. We will reach out soon with next steps.',
            'is_read': False,
            'created_at': datetime.utcnow()
        })
        
        print(f"✅ Consulting request {request_id} marked in progress, notification sent")
    
    updated_request = await db.consulting_requests.find_one({'_id': request_id})
    return {**updated_request, 'id': updated_request['_id']}

@api_router.post("/consulting/requests/{request_id}/reply")
async def send_consulting_reply(
    request_id: str,
    reply_text: str,
    user: Dict = Depends(get_current_user)
):
    """Send a reply to a consulting request (admin only)"""
    if not user.get('is_admin', False):
        raise HTTPException(status_code=403, detail="Only admins can send replies")
    
    request = await db.consulting_requests.find_one({'_id': request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Check if the requester has premium tier (cannot send messages to Basic tier users)
    requester = await db.users.find_one({'_id': request['owner_id']})
    if not requester:
        raise HTTPException(status_code=404, detail="Requester not found")
    
    if not has_premium_tier(requester):
        requester_tier = requester.get('membership_tier', 'basic')
        raise HTTPException(
            status_code=403,
            detail=f"Cannot send reply to Basic tier user. The user who created this request (tier: {requester_tier}) does not have messaging access. They must upgrade to receive consulting replies."
        )
    
    # Create message to requester
    import uuid
    message_id = str(uuid.uuid4())
    
    message_dict = {
        '_id': message_id,
        'from_user': user['_id'],
        'to_user': request['owner_id'],
        'content': reply_text,
        'read': False,
        'timestamp': datetime.utcnow()
    }
    
    await db.messages.insert_one(message_dict)
    
    # Create notification
    notif_id = str(uuid.uuid4())
    await db.notifications.insert_one({
        '_id': notif_id,
        'user_id': request['owner_id'],
        'type': 'CONSULTING_MESSAGE',
        'consulting_request_id': request_id,
        'title': 'New message from WGO4Y Consulting',
        'message': 'You have a new message from our consulting team. Check your messages for details.',
        'is_read': False,
        'created_at': datetime.utcnow()
    })
    
    # Optionally update request with latest reply
    await db.consulting_requests.update_one(
        {'_id': request_id},
        {
            '$set': {
                'latest_reply': reply_text,
                'updated_at': datetime.utcnow()
            }
        }
    )
    
    print(f"✅ Consulting reply sent: {request_id}")
    
    return {
        'message': 'Reply sent successfully',
        'message_id': message_id
    }

# ============= WORKER NETWORK ROUTES =============

@api_router.post("/workers/apply")
async def apply_as_worker(
    application_data: WorkerApplicationCreate,
    user: Dict = Depends(get_current_user)
):
    """Apply to work with WGO4Y"""
    # Check if user already has a worker profile
    existing = await db.worker_profiles.find_one({'user_id': user['_id']})
    if existing:
        raise HTTPException(status_code=400, detail="You have already applied as a worker")
    
    import uuid
    worker_id = str(uuid.uuid4())
    
    worker_dict = application_data.dict()
    worker_dict['_id'] = worker_id
    worker_dict['user_id'] = user['_id']
    worker_dict['status'] = 'applicant'
    worker_dict['created_at'] = datetime.utcnow()
    worker_dict['updated_at'] = datetime.utcnow()
    
    await db.worker_profiles.insert_one(worker_dict)
    
    # Notify admins of new application
    admins = await db.users.find({'is_admin': True}).to_list(100)
    
    user_name = user.get('full_name') or user.get('username')
    
    for admin in admins:
        notif_id = str(uuid.uuid4())
        await db.notifications.insert_one({
            '_id': notif_id,
            'user_id': admin['_id'],
            'type': 'WORKER_APPLICATION',
            'worker_id': worker_id,
            'title': 'New worker application',
            'message': f"{user_name} applied to work as {application_data.role}. Location: {application_data.city}, {application_data.state}",
            'is_read': False,
            'created_at': datetime.utcnow()
        })
    
    print(f"✅ Worker application: {user_name} as {application_data.role}")
    
    return {
        **worker_dict,
        'id': worker_id,
        'message': 'Application submitted successfully'
    }

@api_router.get("/workers")
async def get_workers(
    role: Optional[str] = None,
    city: Optional[str] = None,
    state: Optional[str] = None,
    status: Optional[str] = None,
    user: Dict = Depends(get_current_user)
):
    """Get worker profiles (filtered) - Premium Business/Entrepreneur only (except admins)"""
    # Admins can access regardless of tier
    if not user.get('is_admin', False):
        # Only Business and Entrepreneur can access
        if user.get('user_type') not in ['business', 'entrepreneur']:
            raise HTTPException(
                status_code=403,
                detail="Worker Network is available for Business and Entrepreneur accounts only. General Public users cannot access this feature."
            )
        # Check if user has premium tier
        require_premium_tier(user, "Worker Network")
    
    # Strategy: Show both worker_profiles AND entrepreneur users
    enriched = []
    
    # 1. Get approved workers from worker_profiles collection
    worker_query = {}
    if user.get('is_admin', False):
        if status:
            worker_query['status'] = status
    else:
        worker_query['status'] = 'approved'
    
    if role:
        worker_query['role'] = role
    if city:
        worker_query['city'] = {'$regex': city, '$options': 'i'}
    if state:
        worker_query['state'] = state
    
    workers = await db.worker_profiles.find(worker_query).sort('created_at', -1).to_list(1000)
    worker_user_ids = set()
    
    # Enrich worker_profiles with user info
    for worker in workers:
        user_info = await db.users.find_one({'_id': worker['user_id']})
        worker_user_ids.add(worker['user_id'])
        enriched.append({
            **worker,
            'id': worker['_id'],
            'user_name': user_info.get('full_name') or user_info.get('username') if user_info else 'Unknown',
            'user_email': user_info.get('email') if user_info else None,
            'user_phone': user_info.get('phone') if user_info else None,
            'profile_photo': user_info.get('profile_photo') if user_info else None
        })
    
    # 2. Get entrepreneur users (including showcase)
    entrepreneur_query = {
        'user_type': 'entrepreneur',
        'onboarding_completed': True,
        '_id': {'$nin': list(worker_user_ids)}
    }
    
    # Role filtering for entrepreneurs (they have 'occupations' array, not 'role' field)
    if role:
        entrepreneur_query['occupations'] = role  # Match role in occupations array
    
    # City filtering
    if city:
        entrepreneur_query['$or'] = [
            {'city': {'$regex': city, '$options': 'i'}},
            {'location': {'$regex': city, '$options': 'i'}}
        ]
    
    # State filtering
    if state:
        entrepreneur_query['state'] = state
    
    entrepreneurs = await db.users.find(entrepreneur_query).sort('created_at', -1).to_list(1000)
    
    for entr in entrepreneurs:
        user_id = entr.get('id') or entr.get('_id')
        if user_id in worker_user_ids:
            continue  # Skip duplicates
        worker_user_ids.add(user_id)
        
        # Create a worker-like structure from entrepreneur user data
        enriched.append({
            'id': user_id,  # Ensure id is always set
            'user_id': user_id,
            'user_name': entr.get('full_name') or entr.get('service_name') or entr.get('username'),
            'service_name': entr.get('service_name'),
            'user_email': entr.get('email'),
            'user_phone': entr.get('phone'),
            'profile_photo': entr.get('profile_photo'),
            'bio': entr.get('bio'),
            'location': entr.get('location'),
            'city': entr.get('city'),  # Use actual city field
            'state': entr.get('state'),  # Use actual state field
            'role': ', '.join(entr.get('occupations', [])) if entr.get('occupations') else 'Entrepreneur',
            'status': 'approved',
            'years_experience': entr.get('years_experience'),
            'portfolio_photos': entr.get('portfolio_photos', []),
            'services_offered': entr.get('services_offered', []),
            'rate_structure': entr.get('rate_structure'),
            'created_at': entr.get('created_at'),
            'is_showcase': entr.get('is_showcase', False),
            'showcase_label': entr.get('showcase_label')
        })
    
    print(f"✅ Returned {len(enriched)} workers ({len(workers)} from worker_profiles, {len(entrepreneurs)} entrepreneurs)")
    return enriched


@api_router.get("/workers/contact-requests")
async def get_worker_contact_requests(user: Dict = Depends(get_current_user)):
    """Get contact requests for current worker or all requests for admin"""
    if user.get('is_admin', False):
        # Admin view: all contact requests
        requests = await db.worker_contact_requests.find({}).sort('created_at', -1).to_list(1000)
    else:
        # Worker view: only requests for their worker profile
        worker_profile = await db.worker_profiles.find_one({'user_id': user['_id']})
        if not worker_profile:
            return []
        
        requests = await db.worker_contact_requests.find({
            'worker_id': worker_profile['_id']
        }).sort('created_at', -1).to_list(1000)
    
    # Enrich with requester and worker details
    enriched = []
    for req in requests:
        requester = await db.users.find_one({'_id': req['requester_id']})
        worker_prof = await db.worker_profiles.find_one({'_id': req['worker_id']})
        worker_user = await db.users.find_one({'_id': worker_prof['user_id']}) if worker_prof else None
        
        enriched.append({
            **req,
            'id': req['_id'],
            'requester_name': requester.get('business_name') or requester.get('full_name') or requester.get('username') if requester else 'Unknown',
            'requester_type': requester.get('user_type') if requester else None,
            'requester_photo': requester.get('business_logo') or requester.get('profile_photo') if requester else None,
            'worker_name': worker_prof.get('stage_name') or (worker_user.get('full_name') if worker_user else 'Unknown') if worker_prof else 'Unknown',
            'worker_role': worker_prof.get('role') if worker_prof else None
        })
    
    return enriched



class ContactRequestStatusUpdate(BaseModel):
    status: str

@api_router.patch("/workers/contact-requests/{request_id}/status")
async def update_contact_request_status(
    request_id: str,
    status_data: ContactRequestStatusUpdate,
    user: Dict = Depends(get_current_user)
):
    """Update contact request status (worker or admin only)"""
    req = await db.worker_contact_requests.find_one({'_id': request_id})
    if not req:
        raise HTTPException(status_code=404, detail="Contact request not found")
    
    # Check if user is admin or the worker who received this request
    if not user.get('is_admin', False):
        worker_profile = await db.worker_profiles.find_one({'user_id': user['_id']})
        if not worker_profile or req['worker_id'] != worker_profile['_id']:
            raise HTTPException(status_code=403, detail="You can only update your own contact requests")
    
    # Update status
    await db.worker_contact_requests.update_one(
        {'_id': request_id},
        {'$set': {'status': status_data.status}}
    )
    
    return {'message': f'Status updated to {status_data.status}'}

@api_router.get("/workers/{worker_id}")
async def get_worker(worker_id: str, user: Dict = Depends(get_current_user)):
    """Get worker profile details"""
    print(f"🔍 Looking for worker: {worker_id}")
    
    # Try worker_profiles collection first
    worker = await db.worker_profiles.find_one({'_id': worker_id})
    if worker:
        print(f"✅ Found in worker_profiles")
        user_info = await db.users.find_one({'_id': worker['user_id']})
        return {
            **worker,
            'id': worker['_id'],
            'user_name': user_info.get('full_name') if user_info else 'Unknown',
            'profile_photo': user_info.get('profile_photo') if user_info else None,
            'is_showcase': user_info.get('is_showcase', False) if user_info else False
        }
    
    # Try users collection by 'id' field (UUID)
    print(f"🔍 Searching users by id field: {worker_id}")
    user_profile = await db.users.find_one({'id': worker_id})
    if not user_profile:
        print(f"🔍 Searching users by _id field: {worker_id}")
        user_profile = await db.users.find_one({'_id': worker_id})
    
    if not user_profile:
        print(f"❌ Worker not found in any collection")
        raise HTTPException(status_code=404, detail="Worker not found")
    
    if user_profile.get('user_type') != 'entrepreneur':
        print(f"❌ User is not an entrepreneur: {user_profile.get('user_type')}")
        raise HTTPException(status_code=404, detail="Worker not found")
    
    print(f"✅ Found entrepreneur: {user_profile.get('full_name')}")
    
    # Return entrepreneur as worker
    return {
        'id': user_profile.get('id') or user_profile.get('_id'),
        'user_id': user_profile.get('id') or user_profile.get('_id'),
        'user_name': user_profile.get('full_name') or user_profile.get('username'),
        'service_name': user_profile.get('service_name'),
        'user_email': user_profile.get('email'),
        'user_phone': user_profile.get('phone'),
        'profile_photo': user_profile.get('profile_photo'),
        'portfolio_photos': user_profile.get('portfolio_photos', []),
        'bio': user_profile.get('bio'),
        'location': user_profile.get('location'),
        'city': user_profile.get('city'),
        'state': user_profile.get('state'),
        'role': ', '.join(user_profile.get('occupations', [])) if user_profile.get('occupations') else 'Entrepreneur',
        'years_experience': user_profile.get('years_experience'),
        'services_offered': user_profile.get('services_offered', []),
        'rate_structure': user_profile.get('rate_structure'),
        'status': 'approved',
        'is_showcase': user_profile.get('is_showcase', False),
        'showcase_label': user_profile.get('showcase_label')
    }

@api_router.patch("/workers/{worker_id}/status")
async def update_worker_status(
    worker_id: str,
    status: str,
    user: Dict = Depends(get_current_user)
):
    """Update worker status (admin only)"""
    if not user.get('is_admin', False):
        raise HTTPException(status_code=403, detail="Only admins can update worker status")
    
    worker = await db.worker_profiles.find_one({'_id': worker_id})
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    
    old_status = worker.get('status')
    
    # Update status
    await db.worker_profiles.update_one(
        {'_id': worker_id},
        {'$set': {'status': status, 'updated_at': datetime.utcnow()}}
    )
    
    # Notify worker if approved
    if status == 'approved' and old_status != 'approved':
        notif_id = str(uuid.uuid4())
        await db.notifications.insert_one({
            '_id': notif_id,
            'user_id': worker['user_id'],
            'type': 'WORKER_APPROVED',
            'worker_id': worker_id,
            'title': 'Your application was approved!',
            'message': f"Congratulations! Your application to work as {worker['role']} with WGO4Y has been approved. Venues and entrepreneurs can now discover and contact you.",
            'is_read': False,
            'created_at': datetime.utcnow()
        })
        
        print(f"✅ Worker approved: {worker_id}, notification sent")
    
    return {'message': f'Worker status updated to {status}'}

@api_router.post("/workers/{worker_id}/contact")
async def request_worker_contact(
    worker_id: str,
    contact_data: WorkerContactRequestCreate,
    user: Dict = Depends(get_current_user)
):
    """Request contact with a worker (Premium Business/Entrepreneur only)"""
    # Only businesses and entrepreneurs can contact workers
    if user.get('user_type') not in ['business', 'entrepreneur']:
        raise HTTPException(status_code=403, detail="Only venues and entrepreneurs can contact workers")
    
    # Check if user has premium tier
    require_premium_tier(user, "Worker Network")
    
    worker = await db.worker_profiles.find_one({'_id': worker_id})
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    
    # Create contact request
    import uuid
    contact_id = str(uuid.uuid4())
    
    contact_dict = {
        '_id': contact_id,
        'worker_id': worker_id,
        'requester_id': user['_id'],
        'message': contact_data.message,
        'status': 'new',
        'created_at': datetime.utcnow()
    }
    
    await db.worker_contact_requests.insert_one(contact_dict)
    
    # Create a message in the messaging system so worker can reply
    message_id = str(uuid.uuid4())
    message_content = contact_data.message or "I'm interested in working with you. Please let me know your availability."
    
    await db.messages.insert_one({
        '_id': message_id,
        'from_user': user['_id'],
        'to_user': worker['user_id'],
        'content': message_content,
        'read': False,
        'timestamp': datetime.utcnow()
    })
    
    # Un-archive conversation: Remove any archive records when new contact request is sent
    # This ensures conversation reappears for both users
    await db.archived_conversations.delete_many({
        '$or': [
            {'user_id': user['_id'], 'contact_id': worker['user_id']},
            {'user_id': worker['user_id'], 'contact_id': user['_id']}
        ]
    })
    
    # Notify worker
    requester_name = user.get('business_name') or user.get('full_name') or user.get('username')
    
    notif_id = str(uuid.uuid4())
    await db.notifications.insert_one({
        '_id': notif_id,
        'user_id': worker['user_id'],
        'type': 'WORKER_CONTACT_REQUEST',
        'worker_id': worker_id,
        'requester_id': user['_id'],  # Add requester ID for navigation
        'title': 'Someone wants to work with you!',
        'message': f"{requester_name} is interested in working with you. Check your WGO4Y messages for details.",
        'is_read': False,
        'created_at': datetime.utcnow()
    })
    
    # Also notify admins
    admins = await db.users.find({'is_admin': True}).to_list(100)
    for admin in admins:
        admin_notif_id = str(uuid.uuid4())
        await db.notifications.insert_one({
            '_id': admin_notif_id,
            'user_id': admin['_id'],
            'type': 'WORKER_CONTACT_REQUEST',
            'worker_id': worker_id,
            'title': 'Worker contact request',
            'message': f"{requester_name} requested contact with {worker['role']} worker in {worker['city']}, {worker['state']}",
            'is_read': False,
            'created_at': datetime.utcnow()
        })
    
    print(f"✅ Contact request: {requester_name} → Worker {worker_id}")
    
    return {
        'message': 'Contact request sent successfully',
        'contact_id': contact_id
    }



# ============= JOB BOARD ROUTES =============

@api_router.post("/jobs")
async def create_job(
    job_data: JobPostingCreate,
    user: Dict = Depends(get_current_user)
):
    """Create a job posting (Premium Business/Entrepreneur only)"""
    # Only businesses and entrepreneurs can post jobs
    if user.get('user_type') not in ['business', 'entrepreneur']:
        raise HTTPException(status_code=403, detail="Only venues and entrepreneurs can post jobs")
    
    # Check if user has premium tier
    require_premium_tier(user, "Job Board")
    
    import uuid
    job_id = str(uuid.uuid4())
    
    job_dict = job_data.dict()
    job_dict['_id'] = job_id
    job_dict['owner_id'] = user['_id']
    job_dict['owner_name'] = user.get('business_name') or user.get('full_name') or user.get('username')
    job_dict['owner_type'] = user.get('user_type')
    job_dict['status'] = 'open'
    job_dict['created_at'] = datetime.utcnow()
    job_dict['updated_at'] = datetime.utcnow()
    
    await db.job_postings.insert_one(job_dict)
    
    print(f"✅ Job created: {job_data.title} by {job_dict['owner_name']}")
    
    return {
        **job_dict,
        'id': job_id,
        'message': 'Job posted successfully'
    }

@api_router.get("/jobs")
async def get_jobs(
    role: Optional[str] = None,
    state: Optional[str] = None,
    status: Optional[str] = None,
    user: Dict = Depends(get_current_user)
):
    """Get approved job postings (public endpoint)"""
    query = {'approval_status': 'approved'}  # CRITICAL: Only approved jobs
    
    # If user is a worker (has worker profile), show all open jobs
    worker_profile = await db.worker_profiles.find_one({
        'user_id': user['_id'],
        'status': 'approved'
    })
    
    if worker_profile:
        # Worker view: show all open jobs
        query['status'] = 'open'
    elif user.get('user_type') in ['business', 'entrepreneur']:
        # Business/Entrepreneur view: show their own jobs (any status)
        require_premium_tier(user, "Job Board")
        query['owner_id'] = user['_id']
    else:
        # GP users cannot access
        raise HTTPException(status_code=403, detail="Job Board is not available for General Public users")
    
    # Apply filters
    if role:
        query['role'] = role
    if state:
        query['state'] = state
    if status and user.get('user_type') in ['business', 'entrepreneur']:
        query['status'] = status
    
    jobs = await db.job_postings.find(query).sort('created_at', -1).to_list(1000)
    
    # Enrich with application count
    enriched = []
    for job in jobs:
        app_count = await db.job_applications.count_documents({'job_id': job['_id']})
        enriched.append({
            **job,
            'id': job['_id'],
            'application_count': app_count
        })
    
    return enriched

@api_router.get("/jobs/{job_id}")
async def get_job(job_id: str, user: Dict = Depends(get_current_user)):
    """Get job details"""
    job = await db.job_postings.find_one({'_id': job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Get application count
    app_count = await db.job_applications.count_documents({'job_id': job_id})
    
    # If user is the owner, also get applicant details
    applicants = []
    if job['owner_id'] == user['_id']:
        applications = await db.job_applications.find({'job_id': job_id}).sort('created_at', -1).to_list(1000)
        
        for app in applications:
            worker = await db.worker_profiles.find_one({'user_id': app['worker_id']})
            worker_user = await db.users.find_one({'_id': app['worker_id']})
            
            if worker and worker_user:
                applicants.append({
                    'application_id': app['_id'],
                    'worker_id': worker['_id'],
                    'worker_name': worker.get('stage_name') or worker_user.get('full_name') or worker_user.get('username'),
                    'worker_role': worker.get('role'),
                    'worker_location': f"{worker.get('city')}, {worker.get('state')}",
                    'note': app.get('note'),
                    'applied_at': app.get('created_at'),
                    'profile_photo': worker_user.get('profile_photo')
                })
    
    return {
        **job,
        'id': job['_id'],
        'application_count': app_count,
        'applicants': applicants
    }

@api_router.post("/jobs/{job_id}/apply")
async def apply_to_job(
    job_id: str,
    application_data: JobApplicationCreate,
    user: Dict = Depends(get_current_user)
):
    """Apply to a job (Approved workers only)"""
    # Check if user has an approved worker profile
    worker_profile = await db.worker_profiles.find_one({
        'user_id': user['_id'],
        'status': 'approved'
    })
    
    if not worker_profile:
        raise HTTPException(
            status_code=403,
            detail="Only approved workers can apply to jobs. Please apply to the Worker Network first."
        )
    
    # Check tier-based application limit
    from datetime import datetime, timezone
    from tier_limits import can_apply_to_job, get_job_application_limit
    
    # Count applications in current month
    now = datetime.now(timezone.utc)
    start_of_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    
    applications_this_month = await db.job_applications.count_documents({
        'worker_id': user['_id'],
        'created_at': {'$gte': start_of_month}
    })
    
    user_tier = user.get('membership_tier', 'basic')
    
    if not can_apply_to_job(user_tier, applications_this_month):
        limit = get_job_application_limit(user_tier)
        raise HTTPException(
            status_code=403,
            detail=f"You have reached your monthly application limit ({limit} applications). Upgrade your tier to apply to more jobs."
        )
    
    # Check if job exists
    job = await db.job_postings.find_one({'_id': job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job['status'] != 'open':
        raise HTTPException(status_code=400, detail="This job is no longer accepting applications")
    
    # Check if already applied
    existing = await db.job_applications.find_one({
        'job_id': job_id,
        'worker_id': user['_id']
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="You have already applied to this job")
    
    # Create application
    import uuid
    app_id = str(uuid.uuid4())
    
    application_dict = {
        '_id': app_id,
        'job_id': job_id,
        'worker_id': user['_id'],
        'worker_profile_id': worker_profile['_id'],
        'note': application_data.note,
        'status': 'pending',
        'created_at': datetime.utcnow()
    }
    
    await db.job_applications.insert_one(application_dict)
    
    # Notify job owner
    worker_name = worker_profile.get('stage_name') or user.get('full_name') or user.get('username')
    
    notif_id = str(uuid.uuid4())
    await db.notifications.insert_one({
        '_id': notif_id,
        'user_id': job['owner_id'],
        'type': 'JOB_APPLICATION',
        'job_id': job_id,
        'title': f"New application for {job['title']}",
        'message': f"{worker_name} has applied for your {job['role']} position.",
        'is_read': False,
        'created_at': datetime.utcnow()
    })
    
    print(f"✅ Job application: {worker_name} → Job {job_id}")
    
    return {
        'message': 'Application submitted successfully',
        'application_id': app_id
    }

@api_router.delete("/jobs/{job_id}")
async def delete_job(job_id: str, user: Dict = Depends(get_current_user)):
    """Delete a job posting (owner only)"""
    job = await db.job_postings.find_one({'_id': job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job['owner_id'] != user['_id']:
        raise HTTPException(status_code=403, detail="You can only delete your own jobs")
    
    await db.job_postings.delete_one({'_id': job_id})
    
    return {'message': 'Job deleted successfully'}

@api_router.patch("/jobs/{job_id}/status")
async def update_job_status(
    job_id: str,
    status: str,
    user: Dict = Depends(get_current_user)
):
    """Update job status (owner only)"""
    job = await db.job_postings.find_one({'_id': job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job['owner_id'] != user['_id']:
        raise HTTPException(status_code=403, detail="You can only update your own jobs")
    
    await db.job_postings.update_one(
        {'_id': job_id},
        {'$set': {'status': status, 'updated_at': datetime.utcnow()}}
    )
    
    return {'message': f'Job status updated to {status}'}


@api_router.get("/jobs/{job_id}/applicants")
async def get_job_applicants(
    job_id: str,
    user: Dict = Depends(get_current_user)
):
    """Get all applicants for a job (owner only)"""
    # Check if job exists and user is owner
    job = await db.job_postings.find_one({'_id': job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job['owner_id'] != user['_id']:
        raise HTTPException(status_code=403, detail="You can only view applicants for your own jobs")
    
    # Get all applications for this job
    applications = []
    async for app in db.job_applications.find({'job_id': job_id}).sort('created_at', -1):
        # Get worker profile details
        worker_profile = await db.worker_profiles.find_one({'_id': app['worker_profile_id']})
        worker = await db.users.find_one({'_id': app['worker_id']})
        
        if worker_profile and worker:
            applications.append({
                'id': app['_id'],
                'job_id': app['job_id'],
                'worker_id': app['worker_id'],
                'worker_name': worker_profile.get('stage_name') or worker.get('full_name') or worker.get('username'),
                'worker_role': worker_profile.get('role'),
                'worker_services': worker_profile.get('services', []),
                'note': app.get('note', ''),
                'status': app['status'],
                'created_at': app['created_at'].isoformat(),
                'worker_profile': {
                    'stage_name': worker_profile.get('stage_name'),
                    'role': worker_profile.get('role'),
                    'services': worker_profile.get('services', []),
                    'experience': worker_profile.get('experience'),
                    'location': worker_profile.get('location'),
                    'photo_url': worker_profile.get('photo_url')
                }
            })
    
    return {
        'job': {
            'id': job['_id'],
            'title': job['title'],
            'role': job['role'],
            'status': job['status']
        },
        'applicants': applications,
        'total_count': len(applications)
    }

@api_router.get("/jobs/my/posted")
async def get_my_posted_jobs(
    user: Dict = Depends(get_current_user)
):
    """Get all jobs posted by current user"""
    if user.get('user_type') not in ['business', 'entrepreneur']:
        raise HTTPException(status_code=403, detail="Only businesses and entrepreneurs can view posted jobs")
    
    jobs = []
    async for job in db.job_postings.find({'owner_id': user['_id']}).sort('created_at', -1):
        # Count applications for each job
        app_count = await db.job_applications.count_documents({'job_id': job['_id']})
        
        jobs.append({
            'id': job['_id'],
            'title': job['title'],
            'role': job['role'],
            'event_date': job.get('event_date'),
            'city': job.get('city'),
            'state': job.get('state'),
            'location': f"{job.get('city', '')}, {job.get('state', '')}",
            'description': job['description'],
            'pay': job.get('pay'),
            'status': job['status'],
            'applicant_count': app_count,
            'created_at': job['created_at'].isoformat(),
            'updated_at': job['updated_at'].isoformat()
        })
    
    return {
        'jobs': jobs,
        'total_count': len(jobs)
    }

@api_router.get("/jobs/my/applications")
async def get_my_applications(
    user: Dict = Depends(get_current_user)
):
    """Get all job applications submitted by current user"""
    # Check if user has worker profile
    worker_profile = await db.worker_profiles.find_one({'user_id': user['_id']})
    if not worker_profile:
        return {'applications': [], 'total_count': 0}
    
    applications = []
    async for app in db.job_applications.find({'worker_id': user['_id']}).sort('created_at', -1):
        # Get job details
        job = await db.job_postings.find_one({'_id': app['job_id']})
        if job:
            applications.append({
                'id': app['_id'],
                'job': {
                    'id': job['_id'],
                    'title': job['title'],
                    'role': job['role'],
                    'owner_name': job['owner_name'],
                    'city': job.get('city'),
                    'state': job.get('state'),
                    'location': f"{job.get('city', '')}, {job.get('state', '')}",
                    'event_date': job.get('event_date'),
                    'pay': job.get('pay'),
                    'status': job['status']
                },
                'note': app.get('note', ''),
                'status': app['status'],
                'created_at': app['created_at'].isoformat()
            })
    
    return {
        'applications': applications,
        'total_count': len(applications)
    }

@api_router.patch("/jobs/applications/{application_id}/status")
async def update_application_status(
    application_id: str,
    status: str,
    user: Dict = Depends(get_current_user)
):
    """Update application status (job owner only)"""
    if status not in ['pending', 'accepted', 'rejected']:
        raise HTTPException(status_code=400, detail="Invalid status. Must be: pending, accepted, or rejected")
    
    # Get application
    application = await db.job_applications.find_one({'_id': application_id})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Check if user owns the job
    job = await db.job_postings.find_one({'_id': application['job_id']})
    if not job or job['owner_id'] != user['_id']:
        raise HTTPException(status_code=403, detail="You can only update applications for your own jobs")
    
    # Update status
    await db.job_applications.update_one(
        {'_id': application_id},
        {'$set': {'status': status}}
    )
    
    # Notify worker
    import uuid
    notif_id = str(uuid.uuid4())
    status_message = {
        'accepted': 'Your application has been accepted!',
        'rejected': 'Your application was not selected this time.',
        'pending': 'Your application status has been updated.'
    }
    
    await db.notifications.insert_one({
        '_id': notif_id,
        'user_id': application['worker_id'],
        'type': 'JOB_APPLICATION_UPDATE',
        'job_id': application['job_id'],
        'title': f"Application Update: {job['title']}",
        'message': status_message.get(status, 'Your application status has changed.'),
        'is_read': False,
        'created_at': datetime.utcnow()
    })
    
    return {
        'message': f'Application status updated to {status}',
        'application_id': application_id,
        'new_status': status
    }

# ============= NOTIFICATION ROUTES =============

@api_router.get("/notifications")
async def get_notifications(
    user: Dict = Depends(get_current_user),
    unread_only: bool = False
):
    """Get notifications for current user"""
    query = {'user_id': user['_id']}
    
    if unread_only:
        query['is_read'] = False
    
    notifications = await db.notifications.find(query).sort('created_at', -1).to_list(100)
    
    # Enrich with event titles for display
    enriched = []
    for notif in notifications:
        event_id = notif.get('event_id')
        raffle_id = notif.get('raffle_id')
        consulting_request_id = notif.get('consulting_request_id')
        worker_id = notif.get('worker_id')
        event_title = None
        
        if event_id:
            event = await db.events.find_one({'_id': event_id})
            if event:
                event_title = event.get('title', 'Event')
        
        enriched.append({
            'id': notif['_id'],
            'type': notif['type'],
            'event_id': event_id,
            'raffle_id': raffle_id,
            'consulting_request_id': consulting_request_id,
            'worker_id': worker_id,
            'event_title': event_title or notif.get('title', 'Event'),
            'title': notif.get('title', ''),
            'message': notif.get('message', ''),
            'is_read': notif.get('is_read', False),
            'created_at': notif['created_at']
        })
    
    return enriched

@api_router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    user: Dict = Depends(get_current_user)
):
    """Mark a notification as read"""
    result = await db.notifications.update_one(
        {'_id': notification_id, 'user_id': user['_id']},
        {'$set': {'is_read': True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {'message': 'Notification marked as read'}

@api_router.delete("/notifications/{notification_id}")
async def delete_notification(
    notification_id: str,
    user: Dict = Depends(get_current_user)
):
    """Delete a notification"""
    result = await db.notifications.delete_one({
        '_id': notification_id,
        'user_id': user['_id']
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {'message': 'Notification deleted'}

# ============= MESSAGE ROUTES =============

@api_router.get("/messages")
async def get_messages(user: Dict = Depends(get_current_user)):
    messages = await db.messages.find({
        '$or': [
            {'from_user': user['_id']},
            {'to_user': user['_id']}
        ]
    }).sort('timestamp', -1).to_list(1000)
    return [{**msg, 'id': msg['_id']} for msg in messages]

@api_router.get("/messages/contacts")
async def get_contacts(user: Dict = Depends(get_current_user)):
    """Get list of contacts for messaging - Premium tier only"""
    # Check if user has premium tier
    require_premium_tier(user, "Messaging")
    
    # Get archived conversation IDs for this user
    archived = await db.archived_conversations.find({
        'user_id': user['_id']
    }).to_list(1000)
    archived_contact_ids = {a['contact_id'] for a in archived}
    
    # Get unique users who have messaged with current user
    messages = await db.messages.find({
        '$or': [
            {'from_user': user['_id']},
            {'to_user': user['_id']}
        ]
    }).to_list(1000)
    
    contact_ids = set()
    for msg in messages:
        if msg['from_user'] != user['_id']:
            contact_ids.add(msg['from_user'])
        if msg['to_user'] != user['_id']:
            contact_ids.add(msg['to_user'])
    
    # Get all paid members (not basic tier) as potential contacts
    paid_users = await db.users.find({
        '_id': {'$ne': user['_id']},  # Exclude current user
        'membership_tier': {'$nin': ['basic', None]}  # Only paid members
    }).to_list(1000)
    

    # Add paid users to contact list
    for paid_user in paid_users:
        contact_ids.add(paid_user['_id'])
    
    contacts = []
    for contact_id in contact_ids:
        # Skip archived conversations
        if contact_id in archived_contact_ids:
            continue
            
        contact_user = await db.users.find_one({'_id': contact_id})
        if contact_user:
            # Check if there are any messages with this contact
            has_messages = contact_id in {msg['from_user'] for msg in messages} or \
                          contact_id in {msg['to_user'] for msg in messages}
            
            contacts.append({
                'id': contact_user['_id'],
                'username': contact_user['username'],
                'full_name': contact_user.get('full_name', contact_user['username']),
                'user_type': contact_user.get('user_type', 'general_public'),
                'membership_tier': contact_user.get('membership_tier', 'basic'),
                'profile_photo': contact_user.get('profile_photo') or contact_user.get('business_logo'),  # Use business_logo as fallback
                'has_messages': has_messages  # Flag to show if they've messaged before
            })
    
    # Sort contacts: users with messages first, then alphabetically
    contacts.sort(key=lambda x: (not x['has_messages'], x['full_name'].lower()))
    
    return contacts

@api_router.get("/messages/preview/{contact_id}")
async def get_message_preview(contact_id: str, user: Dict = Depends(get_current_user)):
    """Get last message with a contact WITHOUT marking as read (for conversation list preview)"""
    messages = await db.messages.find({
        '$or': [
            {'from_user': user['_id'], 'to_user': contact_id},
            {'from_user': contact_id, 'to_user': user['_id']}
        ]
    }).sort('timestamp', -1).limit(1).to_list(1)
    
    if messages:
        last_msg = messages[0]
        return {
            'content': last_msg['content'],
            'timestamp': last_msg['timestamp'],
            'from_user': last_msg['from_user']
        }
    
    return {'content': '', 'timestamp': datetime.utcnow(), 'from_user': ''}

@api_router.post("/messages")
async def send_message(message_data: MessageCreate, user: Dict = Depends(get_current_user)):
    """Send a message to another user - Premium tier only"""
    import uuid
    
    # Check if sender has premium tier
    require_premium_tier(user, "Messaging")
    
    # Check if recipient has premium tier (cannot send to Basic users)
    recipient = await db.users.find_one({'_id': message_data.to_user})
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
    
    if not has_premium_tier(recipient):
        recipient_tier = recipient.get('membership_tier', 'basic')
        raise HTTPException(
            status_code=403,
            detail=f"Cannot send message to Basic tier user. The recipient (tier: {recipient_tier}) does not have messaging access."
        )
    
    message_id = str(uuid.uuid4())
    message_dict = {
        '_id': message_id,
        'from_user': user['_id'],
        'to_user': message_data.to_user,
        'content': message_data.content,
        'read': False,
        'timestamp': datetime.utcnow()
    }
    await db.messages.insert_one(message_dict)
    
    # Un-archive conversation: Remove any archive records when new message is sent
    # This ensures conversation reappears for both users
    await db.archived_conversations.delete_many({
        '$or': [
            {'user_id': user['_id'], 'contact_id': message_data.to_user},
            {'user_id': message_data.to_user, 'contact_id': user['_id']}
        ]
    })
    
    return {**message_dict, 'id': message_id}

@api_router.get("/messages/thread/{contact_id}")
async def get_message_thread(contact_id: str, user: Dict = Depends(get_current_user)):
    """Get message thread with a contact - Premium tier only"""
    # Check if user has premium tier
    require_premium_tier(user, "Messaging")
    
    messages = await db.messages.find({
        '$or': [
            {'from_user': user['_id'], 'to_user': contact_id},
            {'from_user': contact_id, 'to_user': user['_id']}
        ]
    }).sort('timestamp', 1).to_list(1000)
    
    # Mark messages as read
    await db.messages.update_many(
        {'from_user': contact_id, 'to_user': user['_id'], 'read': False},
        {'$set': {'read': True}}
    )
    
    return [{**msg, 'id': msg['_id']} for msg in messages]

@api_router.get("/messages/unread-count")
async def get_unread_count(user: Dict = Depends(get_current_user)):
    """Get count of unread messages for current user"""
    unread_count = await db.messages.count_documents({
        'to_user': user['_id'],
        'read': False
    })
    return {'count': unread_count}

@api_router.get("/messages/unread-by-contact")
async def get_unread_by_contact(user: Dict = Depends(get_current_user)):
    """Get unread message counts grouped by contact"""
    # Get all unread messages sent TO current user
    unread_messages = await db.messages.find({
        'to_user': user['_id'],
        'read': False
    }).to_list(1000)
    
    # Group by sender
    unread_by_contact = {}
    for msg in unread_messages:
        sender_id = msg['from_user']
        if sender_id not in unread_by_contact:
            unread_by_contact[sender_id] = {
                'count': 0,
                'last_message': msg['content'],
                'timestamp': msg['timestamp']
            }
        unread_by_contact[sender_id]['count'] += 1
        # Keep the most recent message
        if msg['timestamp'] > unread_by_contact[sender_id]['timestamp']:
            unread_by_contact[sender_id]['last_message'] = msg['content']
            unread_by_contact[sender_id]['timestamp'] = msg['timestamp']
    
    return unread_by_contact



@api_router.post("/messages/archive/{contact_id}")
async def archive_conversation(contact_id: str, user: Dict = Depends(get_current_user)):
    """Archive/hide a conversation with a specific contact"""
    import uuid
    
    # Create or update archive record
    archive_id = str(uuid.uuid4())
    archive_doc = {
        '_id': archive_id,
        'user_id': user['_id'],
        'contact_id': contact_id,
        'archived_at': datetime.utcnow()
    }
    
    # Use upsert to prevent duplicates
    await db.archived_conversations.update_one(
        {'user_id': user['_id'], 'contact_id': contact_id},
        {'$set': archive_doc},
        upsert=True
    )
    
    return {'message': 'Conversation archived successfully'}



# ============= PAYMENT ROUTES =============

@api_router.post("/payments/create-intent")
async def create_payment_intent(payment_data: PaymentIntent, user: Dict = Depends(get_current_user)):
    try:
        # Create Stripe payment intent
        intent = stripe.PaymentIntent.create(
            amount=int(payment_data.amount * 100),  # Convert to cents
            currency='usd',
            metadata={
                'user_id': user['_id'],
                'type': payment_data.type,
                'item_id': payment_data.item_id
            }
        )
        return {'client_secret': intent.client_secret, 'payment_intent_id': intent.id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/payments/confirm")
async def confirm_payment(payment_data: PaymentConfirm, user: Dict = Depends(get_current_user)):
    # Record payment in database
    import uuid
    payment_id = str(uuid.uuid4())
    payment_record = {
        '_id': payment_id,
        'user_id': user['_id'],
        'item_type': payment_data.item_type,
        'item_id': payment_data.item_id,
        'stripe_payment_id': payment_data.payment_intent_id,
        'status': 'completed',
        'timestamp': datetime.utcnow()
    }
    await db.payments.insert_one(payment_record)
    
    # Handle post-payment actions based on type
    if payment_data.item_type == 'event':
        await db.events.update_one(
            {'_id': payment_data.item_id},
            {'$inc': {'tickets_available': -1}}
        )
    elif payment_data.item_type == 'coupon':
        await db.coupons.update_one(
            {'_id': payment_data.item_id},
            {'$push': {'redeemed_by': user['_id']}}
        )
    elif payment_data.item_type == 'raffle':
        await db.raffles.update_one(
            {'_id': payment_data.item_id},
            {'$push': {'entries': user['_id']}}
        )
    
    return {'message': 'Payment confirmed', 'payment_id': payment_id}

# ============= UTILITY ROUTES =============

@api_router.get("/users")
async def get_users(user: Dict = Depends(get_current_user)):
    users = await db.users.find().to_list(1000)
    return [{
        'id': u['_id'],
        'username': u['username'],
        'full_name': u.get('full_name', u['username']),
        'user_type': u['user_type']
    } for u in users if u['_id'] != user['_id']]

@api_router.get("/users/{user_id}")
async def get_user_profile(user_id: str, user: Dict = Depends(get_current_user)):
    """Get public profile information for any user"""
    target_user = await db.users.find_one({'_id': user_id})
    
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Return public profile information
    return {
        'id': target_user['_id'],
        'username': target_user['username'],
        'full_name': target_user.get('full_name', target_user['username']),
        'user_type': target_user.get('user_type'),
        'membership_tier': target_user.get('membership_tier', 'basic'),
        'profile_photo': target_user.get('profile_photo'),
        'location': target_user.get('location'),
        'bio': target_user.get('bio'),
        'phone': target_user.get('phone'),
        'email': target_user.get('email'),
        # Business fields
        'business_name': target_user.get('business_name'),
        'business_type': target_user.get('business_type'),
        'business_address': target_user.get('business_address'),
        'business_phone': target_user.get('business_phone'),
        'business_description': target_user.get('business_description'),
        'business_logo': target_user.get('business_logo'),
        'business_photos': target_user.get('business_photos', []),
        'amenities': target_user.get('amenities', []),
        'venue_categories': target_user.get('venue_categories', []),
        'entertainment_categories': target_user.get('entertainment_categories', []),
        'social_links': target_user.get('social_links', {}),
        # Entrepreneur fields
        'services_offered': target_user.get('services_offered', []),
        'portfolio_photos': target_user.get('portfolio_photos', []),
        'pricing_info': target_user.get('pricing_info'),
        'services': target_user.get('services', []),
    }


@api_router.get("/")
async def root():
    return {"message": "WGO4Y API v1.0"}

# ============= FEATURED VIDEOS ENDPOINTS =============

# Feature/Unfeature a video (Paid members only)
@api_router.post("/profile/videos/{video_index}/feature")
async def feature_video(
    video_index: int,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Feature a portfolio video (Silver/Gold/Networking members only)"""
    user = await get_current_user(credentials)
    
    # Check membership tier - handle both entrepreneur (networking) and business (gold) top tiers
    membership_tier = user.get('membership_tier', 'basic')
    user_type = user.get('user_type', '')
    
    # Determine if user has paid tier
    # Entrepreneur: silver, networking
    # Business: silver, gold
    is_paid_tier = False
    if user_type == 'entrepreneur':
        is_paid_tier = membership_tier.lower() in ['silver', 'networking']
    elif user_type == 'business':
        is_paid_tier = membership_tier.lower() in ['silver', 'gold']
    
    if not is_paid_tier:
        raise HTTPException(
            status_code=403,
            detail="Only Silver and premium members can feature videos. Please upgrade your membership."
        )
    
    # Check weekly video limits
    # Silver: 1/week for both entrepreneur and business
    # Networking (entrepreneur): 3/week
    # Gold (business): 3/week
    featured_this_week = user.get('featured_videos_this_week', 0)
    last_reset = user.get('last_featured_reset')
    
    # Determine weekly limit based on tier
    is_top_tier = (user_type == 'entrepreneur' and membership_tier.lower() == 'networking') or \
                  (user_type == 'business' and membership_tier.lower() == 'gold')
    weekly_limit = 3 if is_top_tier else 1
    
    # Check if 7 days have passed since last reset (rolling window)
    if last_reset:
        from datetime import timedelta
        days_since_reset = (datetime.utcnow() - last_reset).days
        if days_since_reset >= 7:
            # Reset counter
            featured_this_week = 0
            last_reset = datetime.utcnow()
    
    # Get user's portfolio videos
    portfolio_videos = user.get('portfolio_videos', [])
    if video_index < 0 or video_index >= len(portfolio_videos):
        raise HTTPException(status_code=404, detail="Video not found")
    
    # If featuring a new video (not un-featuring)
    if not portfolio_videos[video_index].get('featured'):
        # FIRST: Check weekly limit (most important)
        if featured_this_week >= weekly_limit:
            days_until_reset = 7 - days_since_reset if last_reset else 7
            # Get proper tier display name
            if membership_tier.lower() == "silver":
                tier_name = "Silver"
            elif user_type == 'entrepreneur' and membership_tier.lower() == "networking":
                tier_name = "Networking"
            else:  # business gold
                tier_name = "Gold"
            
            raise HTTPException(
                status_code=429,
                detail=f"Weekly limit reached. {tier_name} members can feature {weekly_limit} video{'s' if weekly_limit > 1 else ''} per week. Resets in {days_until_reset} day{'s' if days_until_reset != 1 else ''}."
            )
        
        # SECOND: Check if user already has max active featured videos for their tier
        featured_count = sum(1 for v in portfolio_videos if v.get('featured'))
        max_active = 3 if is_top_tier else 1  # Top tier (Networking/Gold): 3 active, Silver: 1 active
        if featured_count >= max_active:
            # Get proper tier display name
            if membership_tier.lower() == "silver":
                tier_name = "Silver"
            elif user_type == 'entrepreneur' and membership_tier.lower() == "networking":
                tier_name = "Networking"
            else:  # business gold
                tier_name = "Gold"
            
            raise HTTPException(
                status_code=400,
                detail=f"You already have {featured_count} active featured video{'s' if featured_count > 1 else ''}. {tier_name} members can have up to {max_active} video{'s' if max_active > 1 else ''} featured at the same time. Please unfeature one first."
            )
        
        # Increment counter when featuring
        featured_this_week += 1
        if not last_reset:
            last_reset = datetime.utcnow()
    else:
        # Decrement counter when unfeaturing
        featured_this_week = max(0, featured_this_week - 1)
    
    # Toggle featured status
    portfolio_videos[video_index]['featured'] = not portfolio_videos[video_index].get('featured', False)
    portfolio_videos[video_index]['featured_approved'] = False  # Requires admin approval
    portfolio_videos[video_index]['featured_date'] = datetime.utcnow().isoformat()
    portfolio_videos[video_index]['featured_location'] = user.get('location', '')
    
    # Update database
    await db.users.update_one(
        {'_id': user['_id']},
        {'$set': {
            'portfolio_videos': portfolio_videos,
            'featured_videos_this_week': featured_this_week,
            'last_featured_reset': last_reset
        }}
    )
    
    status_msg = "pending approval" if portfolio_videos[video_index]['featured'] else "unfeatured"
    return {
        "message": f"Video {status_msg}",
        "featured": portfolio_videos[video_index]['featured'],
        "featured_approved": portfolio_videos[video_index]['featured_approved']
    }

# Duplicate endpoint removed - using the one at line 921

# Admin: Get pending featured videos
@api_router.get("/admin/featured-videos/pending")
async def get_pending_featured_videos(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get all pending featured videos (Admin only)"""
    user = await get_current_user(credentials)
    
    # Check if user is admin (is_admin field in database)
    if not user.get('is_admin', False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = await db.users.find({
        'portfolio_videos': {'$exists': True},
        'portfolio_videos.featured': True,
        'portfolio_videos.featured_approved': False
    }).to_list(length=100)
    
    pending_videos = []
    for user_doc in users:
        for idx, video in enumerate(user_doc.get('portfolio_videos', [])):
            if video.get('featured') and not video.get('featured_approved'):
                pending_videos.append({
                    'video_index': idx,
                    'video': video,
                    'user': {
                        'id': str(user_doc['_id']),
                        'username': user_doc.get('username'),
                        'full_name': user_doc.get('full_name'),
                        'email': user_doc.get('email'),
                        'membership_tier': user_doc.get('membership_tier', 'free'),
                        'location': user_doc.get('location')
                    }
                })
    
    # Sort by submission date
    pending_videos.sort(
        key=lambda x: x['video'].get('featured_date', ''),
        reverse=True
    )
    
    return pending_videos

# Admin: Approve/Reject featured video
@api_router.post("/admin/featured-videos/{user_id}/{video_index}/approve")
async def approve_featured_video(
    user_id: str,
    video_index: int,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    approved: bool = True
):
    """Approve or reject a featured video (Admin only)"""
    admin_user = await get_current_user(credentials)
    
    # Check if user is admin (is_admin field in database)
    if not admin_user.get('is_admin', False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Find user by string ID (UUID format)
    user = await db.users.find_one({'_id': user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    portfolio_videos = user.get('portfolio_videos', [])
    if video_index < 0 or video_index >= len(portfolio_videos):
        raise HTTPException(status_code=404, detail="Video not found")
    
    if approved:
        portfolio_videos[video_index]['featured_approved'] = True
        portfolio_videos[video_index]['featured_approved_date'] = datetime.utcnow().isoformat()
        message = "Video approved and is now featured"
    else:
        portfolio_videos[video_index]['featured'] = False
        portfolio_videos[video_index]['featured_approved'] = False
        message = "Video rejected and unfeatured"
    
    await db.users.update_one(
        {'_id': user_id},
        {'$set': {'portfolio_videos': portfolio_videos}}
    )
    
    return {"message": message, "approved": approved}


# ============= ONBOARDING & SUBSCRIPTION ENDPOINTS =============

# Get entertainment categories
@api_router.get("/entertainment-categories")
async def get_entertainment_categories():
    """Get all entertainment categories for user preference selection"""
    return {
        "categories": ENTERTAINMENT_CATEGORIES,
        "grouped": get_categories_by_group()
    }

# Validate promo code
@api_router.post("/promo-codes/validate")
async def validate_promo_code(promo_data: PromoCodeValidate):
    """Validate a promo code and return trial/discount information"""
    promo_code = await db.promo_codes.find_one({
        "code": promo_data.code.upper(),
        "active": True
    })
    
    if not promo_code:
        return PromoCodeResponse(
            valid=False,
            message="Invalid promo code"
        )
    
    # Check usage limit
    if promo_code.get('usage_limit') and promo_code.get('used_count', 0) >= promo_code['usage_limit']:
        return PromoCodeResponse(
            valid=False,
            message="This promo code has reached its usage limit"
        )
    
    # Check expiration
    if promo_code.get('expires_at'):
        expires_at = datetime.fromisoformat(promo_code['expires_at'])
        now = datetime.now(timezone.utc)
        if expires_at < now:
            return PromoCodeResponse(
                valid=False,
                message="This promo code has expired"
            )
    
    # Check if code applies to this user type
    if promo_code.get('user_types') and promo_data.user_type not in promo_code['user_types']:
        return PromoCodeResponse(
            valid=False,
            message="This promo code is not valid for your account type"
        )
    
    # Check if code applies to this tier
    if promo_code.get('tiers') and promo_data.tier not in promo_code['tiers']:
        return PromoCodeResponse(
            valid=False,
            message="This promo code is not valid for the selected tier"
        )
    
    return PromoCodeResponse(
        valid=True,
        trial_days=promo_code.get('trial_days', 0),
        discount_percent=promo_code.get('discount_percent', 0),
        message=f"Promo code applied! {promo_code.get('trial_days', 0)} days free trial"
    )

# Create checkout session
@api_router.post("/checkout/create-session")
async def create_checkout_session(
    checkout_data: CheckoutRequest,
    user: Dict = Depends(get_current_user)
):
    """Create Stripe checkout session for subscription upgrade"""
    
    logger.info(f"Checkout session request: user_type={user.get('user_type')}, tier={checkout_data.tier}, promo={checkout_data.promo_code}")
    
    # Define pricing based on user type and tier
    PRICING = {
        'general_public': {
            'appreciation': 1.99
        },
        'entrepreneur': {
            'silver': 9.99,
            'networking': 19.99
        },
        'business': {
            'silver': 19.99,
            'gold': 39.99
        }
    }
    
    # Use the selected onboarding user_type if provided, otherwise use database user_type
    # This allows users to change their type during onboarding before completing profile
    user_type = checkout_data.user_type if checkout_data.user_type else user.get('user_type')
    tier = checkout_data.tier.lower().strip()
    
    logger.info(f"Processing: user_type={user_type} (from_request={bool(checkout_data.user_type)}), tier={tier}")
    
    # Validate tier for user type
    if user_type not in PRICING or tier not in PRICING[user_type]:
        logger.error(f"Invalid tier '{tier}' for user_type '{user_type}'")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid tier '{tier}' for user type '{user_type}'"
        )
    
    # Get amount from server-side pricing (SECURITY: Never trust frontend)
    amount = PRICING[user_type][tier]
    
    # Validate promo code if provided
    trial_days = 0
    if checkout_data.promo_code:
        promo_result = await validate_promo_code(PromoCodeValidate(
            code=checkout_data.promo_code.strip(),
            user_type=user_type,
            tier=tier
        ))
        
        if not promo_result.valid:
            raise HTTPException(status_code=400, detail=promo_result.message)
        
        trial_days = promo_result.trial_days
        
        # Increment promo code usage
        await db.promo_codes.update_one(
            {"code": checkout_data.promo_code.upper()},
            {"$inc": {"used_count": 1}}
        )
    
    # Initialize Stripe checkout
    host_url = checkout_data.origin_url
    webhook_url = f"{host_url}/api/webhooks/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    # Determine if this is an upgrade (user already has a tier)
    current_tier = user.get('membership_tier', 'basic')
    is_upgrade = current_tier != 'basic' and current_tier != tier
    
    # Build success and cancel URLs
    # Add upgrade flag to success URL so payment-success page knows it's an upgrade
    success_url = f"{host_url}/onboarding/payment-success?session_id={{CHECKOUT_SESSION_ID}}&upgrade={str(is_upgrade).lower()}"
    cancel_url = f"{host_url}/onboarding/tier-selection"
    
    # Create checkout session with metadata
    metadata = {
        "user_id": str(user['_id']),
        "user_type": user_type,
        "tier": tier,
        "username": user.get('username'),
        "trial_days": str(trial_days),
        "promo_code": checkout_data.promo_code or ""
    }
    
    checkout_request = CheckoutSessionRequest(
        amount=amount,
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata
    )
    
    session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record (MANDATORY)
    transaction = {
        "session_id": session.session_id,
        "user_id": str(user['_id']),
        "username": user.get('username'),
        "user_type": user_type,
        "tier": tier,
        "amount": amount,
        "currency": "usd",
        "promo_code": checkout_data.promo_code,
        "trial_days": trial_days,
        "payment_status": "pending",
        "status": "initiated",
        "created_at": datetime.utcnow(),
        "metadata": metadata
    }
    
    await db.payment_transactions.insert_one(transaction)
    
    return {
        "checkout_url": session.url,
        "session_id": session.session_id
    }

# Check checkout status (no authentication required for return from Stripe)
@api_router.get("/checkout/status/{session_id}")
async def get_checkout_status(session_id: str):
    """Get status of a checkout session and update user membership if paid"""
    
    # Check if we've already processed this session
    existing_transaction = await db.payment_transactions.find_one({"session_id": session_id})
    
    if not existing_transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Get user_id from transaction (don't require authentication since user is returning from Stripe)
    user_id = existing_transaction['user_id']
    user = await db.users.find_one({'_id': user_id})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # If already processed as complete, return cached status
    if existing_transaction.get('payment_status') == 'paid' and existing_transaction.get('membership_updated'):
        return {
            "status": "complete",
            "payment_status": "paid",
            "tier": existing_transaction['tier'],
            "amount": existing_transaction['amount'],
            "membership_updated": True
        }
    
    # Initialize Stripe checkout
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
    
    # Get status from Stripe
    checkout_status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
    
    # Update transaction record
    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {
            "status": checkout_status.status,
            "payment_status": checkout_status.payment_status,
            "updated_at": datetime.utcnow()
        }}
    )
    
    # If payment successful and not yet updated membership, update user
    if checkout_status.payment_status == 'paid' and not existing_transaction.get('membership_updated'):
        tier = existing_transaction['tier']
        trial_days = existing_transaction.get('trial_days', 0)
        
        # Calculate subscription dates
        start_date = datetime.utcnow()
        # If trial, add trial days to start date for actual billing
        if trial_days > 0:
            end_date = start_date + timedelta(days=trial_days)
        else:
            end_date = start_date + timedelta(days=30)  # Monthly subscription
        
        # Update user membership
        await db.users.update_one(
            {'_id': user['_id']},
            {'$set': {
                'membership_tier': tier,
                'subscription_start_date': start_date,
                'subscription_end_date': end_date,
                'subscription_status': 'active',
                'stripe_customer_id': checkout_status.metadata.get('customer_id'),
                'updated_at': datetime.utcnow()
            }}
        )
        
        # Mark transaction as membership updated
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"membership_updated": True}}
        )
        
        return {
            "status": checkout_status.status,
            "payment_status": checkout_status.payment_status,
            "tier": tier,
            "amount": existing_transaction['amount'],
            "membership_updated": True,
            "trial_days": trial_days
        }
    
    return {
        "status": checkout_status.status,
        "payment_status": checkout_status.payment_status,
        "amount": existing_transaction['amount'],
        "membership_updated": False
    }

# Stripe webhook handler
@api_router.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    try:
        body_bytes = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
        webhook_response = await stripe_checkout.handle_webhook(body_bytes, signature)
        
        # Log webhook event
        await db.webhook_events.insert_one({
            "event_type": webhook_response.event_type,
            "event_id": webhook_response.event_id,
            "session_id": webhook_response.session_id,
            "payment_status": webhook_response.payment_status,
            "metadata": webhook_response.metadata,
            "received_at": datetime.utcnow()
        })
        
        # Handle different event types
        if webhook_response.event_type == "checkout.session.completed":
            # Update transaction status
            await db.payment_transactions.update_one(
                {"session_id": webhook_response.session_id},
                {"$set": {
                    "payment_status": webhook_response.payment_status,
                    "webhook_processed": True,
                    "processed_at": datetime.utcnow()
                }}
            )
        
        return {"status": "success"}
    
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))



# ============= EASY MIGRATION ENDPOINT (GET) =============

@api_router.get("/admin/populate-db-now")
async def populate_db_get(secret: str):
    """
    GET version of migration endpoint - just click the URL!
    Usage: GET /api/admin/populate-db-now?secret=POPULATE_NOW_2024
    """
    if secret != "POPULATE_NOW_2024":
        raise HTTPException(status_code=403, detail="Invalid secret")
    
    try:
        # Check if already populated
        existing = await db.users.count_documents({})
        
        if existing > 20:
            return {
                "status": "already_populated",
                "message": f"Database has {existing} users already",
                "user_count": existing
            }
        
        # Import modules
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        hashed_pw = pwd_context.hash("Test1234")
        
        R2 = "https://pub-bfa7ee4cef34458990f1d94545974968.r2.dev"
        
        # Create 7 real profiles
        profiles = [
            {
                '_id': str(uuid.uuid4()),
                'username': 'dboy_stackalini_rap_producer_s',
                'email': 'dboy_stackalini_rap_producer_s@wgo4y.com',
                'password_hash': hashed_pw,
                'full_name': 'Dboy Stackalini',
                'user_type': 'entrepreneur',
                'membership_tier': 'gold',
                'is_demo_profile': False,
                'onboarding_completed': True,
                'photo_url': f'{R2}/img8.jpg',
                'stage_name': 'Dboy Stackalini',
                'occupation': 'DJ/Producer/Song Writer',
                'bio': 'Professional DJ and music producer specializing in Hip-Hop and R&B',
                'city': 'Las Vegas',
                'state': 'Nevada',
                'services': ['DJ', 'Music Production', 'Live Performance'],
                'portfolio_photos': [f'{R2}/img8.jpg'],
                'portfolio_videos': [],
                'created_at': datetime.now(timezone.utc)
            },
            {
                '_id': str(uuid.uuid4()),
                'username': 'd_petty',
                'email': 'd_petty@wgo4y.com',
                'password_hash': hashed_pw,
                'full_name': 'D.Petty',
                'user_type': 'entrepreneur',
                'membership_tier': 'silver',
                'is_demo_profile': False,
                'onboarding_completed': True,
                'photo_url': f'{R2}/IMG_6465.jpg',
                'stage_name': 'D.Petty',
                'occupation': 'Entertainer',
                'bio': 'Live entertainment specialist and performer',
                'city': 'Las Vegas',
                'state': 'Nevada',
                'services': ['Live Performance', 'Entertainment'],
                'portfolio_photos': [f'{R2}/IMG_6465.jpg'],
                'portfolio_videos': [],
                'created_at': datetime.now(timezone.utc)
            },
            {
                '_id': str(uuid.uuid4()),
                'username': 'the_lace_mirror',
                'email': 'lacemirror@wgo4y.com',
                'password_hash': hashed_pw,
                'full_name': 'The Lace Mirror',
                'user_type': 'entrepreneur',
                'membership_tier': 'silver',
                'is_demo_profile': False,
                'onboarding_completed': True,
                'photo_url': f'{R2}/The%20Lace%20Nerd%20profile%20image.jpeg',
                'stage_name': 'The Lace Mirror',
                'occupation': 'Visual Artist',
                'bio': 'Professional visual artist and creative designer',
                'city': 'Las Vegas',
                'state': 'Nevada',
                'services': ['Visual Arts', 'Design', 'Creative Services'],
                'portfolio_photos': [f'{R2}/The%20Lace%20Nerd%20profile%20image.jpeg'],
                'portfolio_videos': [],
                'created_at': datetime.now(timezone.utc)
            },
            {
                '_id': str(uuid.uuid4()),
                'username': 'la_mansion_premier_event_venue',
                'email': 'la_mansion_premier_event_venue@wgo4y.com',
                'password_hash': hashed_pw,
                'full_name': 'La Mansion - Premier Event Venue',
                'user_type': 'business',
                'membership_tier': 'gold',
                'is_demo_profile': False,
                'onboarding_completed': True,
                'photo_url': f'{R2}/La-Mansion.png',
                'business_name': 'La Mansion',
                'business_type': 'nightclub',
                'business_address': 'Las Vegas, NV',
                'business_phone': '702-555-0400',
                'city': 'Las Vegas',
                'state': 'Nevada',
                'description': 'Premier event venue and upscale nightclub in Las Vegas',
                'amenities': ['VIP Areas', 'Full Bar', 'Dance Floor', 'DJ', 'Event Space'],
                'venue_photos': [f'{R2}/La-Mansion.png'],
                'created_at': datetime.now(timezone.utc)
            },
            {
                '_id': str(uuid.uuid4()),
                'username': 'mcclellan_tavern',
                'email': 'info@mcclellans.com',
                'password_hash': hashed_pw,
                'full_name': "McClellan's Tavern",
                'user_type': 'business',
                'membership_tier': 'gold',
                'is_demo_profile': False,
                'onboarding_completed': True,
                'photo_url': f'{R2}/McClellans.jpg',
                'business_name': "McClellan's Tavern",
                'business_type': 'bar_restaurant',
                'business_address': 'Las Vegas, NV',
                'business_phone': '702-555-0100',
                'city': 'Las Vegas',
                'state': 'Nevada',
                'description': 'Classic tavern with great food and atmosphere',
                'amenities': ['Full Bar', 'Restaurant', 'Outdoor Seating', 'Live Music'],
                'venue_photos': [f'{R2}/McClellans.jpg'],
                'created_at': datetime.now(timezone.utc)
            },
            {
                '_id': str(uuid.uuid4()),
                'username': 'rack_em_up',
                'email': 'info@rackemup.com',
                'password_hash': hashed_pw,
                'full_name': 'Rack Em Up',
                'user_type': 'business',
                'membership_tier': 'gold',
                'is_demo_profile': False,
                'onboarding_completed': True,
                'photo_url': f'{R2}/6-copy.jpg',
                'business_name': 'Rack Em Up',
                'business_type': 'entertainment',
                'business_address': 'Las Vegas, NV',
                'business_phone': '702-555-0200',
                'city': 'Las Vegas',
                'state': 'Nevada',
                'description': 'Premier billiards and entertainment venue',
                'amenities': ['Pool Tables', 'Bar', 'Gaming', 'Food Service', 'Events'],
                'venue_photos': [f'{R2}/6-copy.jpg'],
                'created_at': datetime.now(timezone.utc)
            }
        ]
        
        for demo_venue in demo_venues:
            await db.venues.insert_one(demo_venue)
        
        return {
            "status": "success",
            "message": "Demo data populated"
        }
    except Exception as e:
        print(f"Error in populate-db: {e}")
        return {"status": "error", "message": str(e)}

# ============= ADMIN R2 MEDIA & PROFILE MANAGEMENT =============

@api_router.get("/admin/r2-media")
async def list_r2_media(
    search: Optional[str] = None,
    page: int = 1,
    per_page: int = 50,
    user: Dict = Depends(get_current_user)
):
    """List R2 media with search (admin only)"""
    if not user.get('is_admin', False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    R2_BASE = "https://pub-bfa7ee4cef34458990f1d94545974968.r2.dev"
    
    # Known R2 media objects
    known_media = [
        # Dboy Stackalini
        {"url": f"{R2_BASE}/img8.jpg", "name": "img8.jpg", "category": "dboy"},
        {"url": f"{R2_BASE}/dboy-profile.jpg", "name": "dboy-profile.jpg", "category": "dboy"},
        
        # D.Petty  
        {"url": f"{R2_BASE}/IMG_6465.jpg", "name": "IMG_6465.jpg", "category": "petty"},
        {"url": f"{R2_BASE}/dpetty-profile.jpg", "name": "dpetty-profile.jpg", "category": "petty"},
        
        # Lace Nerd
        {"url": f"{R2_BASE}/The%20Lace%20Nerd%20profile%20image.jpeg", "name": "lace-nerd-profile.jpeg", "category": "lace"},
        {"url": f"{R2_BASE}/lace-profile.jpg", "name": "lace-profile.jpg", "category": "lace"},
    ]
    
    # Search filter
    filtered = [m for m in known_media if not search or search.lower() in m['name'].lower()] if search else known_media
    
    # Pagination
    start = (page - 1) * per_page
    paginated = filtered[start:start + per_page]
    
    return {
        'media': paginated,
        'total': len(filtered),
        'page': page,
        'total_pages': (len(filtered) + per_page - 1) // per_page
    }

@api_router.put("/admin/entrepreneurs/{user_id}")
async def admin_update_entrepreneur(
    user_id: str,
    profile_data: dict,
    user: Dict = Depends(get_current_user)
):
    """Admin update entrepreneur profile"""
    if not user.get('is_admin', False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    entrepreneur = await db.users.find_one({'id': user_id}) or await db.users.find_one({'_id': user_id})
    if not entrepreneur:
        raise HTTPException(status_code=404, detail="Entrepreneur not found")
    
    update_fields = {'updated_at': datetime.now(timezone.utc)}
    
    if 'full_name' in profile_data:
        update_fields['full_name'] = profile_data['full_name']
    if 'city' in profile_data and 'state' in profile_data:
        update_fields['city'] = profile_data['city']
        update_fields['state'] = profile_data['state']
        update_fields['location'] = f"{profile_data['city']}, {profile_data['state']}"
    if 'bio' in profile_data:
        update_fields['bio'] = profile_data['bio']
    if 'occupations' in profile_data:
        update_fields['occupations'] = profile_data['occupations']
    if 'profile_photo_url' in profile_data:
        update_fields['profile_photo'] = profile_data['profile_photo_url']
    if 'gallery_urls' in profile_data:
        update_fields['portfolio_photos'] = profile_data['gallery_urls']
    if 'flyer_urls' in profile_data:
        update_fields['flyer_urls'] = profile_data['flyer_urls']
    
    await db.users.update_one({'_id': entrepreneur['_id']}, {'$set': update_fields})
    
    updated = await db.users.find_one({'_id': entrepreneur['_id']})
    return {'message': 'Profile updated', 'profile': {
        'id': updated.get('id'),
        'full_name': updated.get('full_name'),
        'city': updated.get('city'),
        'state': updated.get('state')
    }}


@api_router.post("/admin/impersonate/{user_id}")
async def impersonate_user(user_id: str, user: Dict = Depends(get_current_user)):
    """Impersonate a user (admin only)"""
    if not user.get('is_admin', False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Find target user
    target_user = await db.users.find_one({'id': user_id})
    if not target_user:
        target_user = await db.users.find_one({'_id': user_id})
    
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Log impersonation for audit
    print(f"🔐 ADMIN IMPERSONATION: {user.get('full_name')} → {target_user.get('full_name')}")
    
    # Create token for target user
    token = create_token(target_user['_id'])
    
    return {
        'token': token,
        'user': {
            'id': target_user.get('id') or target_user.get('_id'),
            'username': target_user['username'],
            'email': target_user['email'],
            'user_type': target_user['user_type'],
            'full_name': target_user.get('full_name'),
            'membership_tier': target_user.get('membership_tier')
        },
        'impersonated_by': user.get('full_name'),
        'is_impersonation': True
    }



# ============= MODERATION / APPROVAL SYSTEM =============

class ApprovalAction(BaseModel):
    action: str  # 'approve' or 'reject'
    rejection_reason: Optional[str] = None

class BulkApprovalAction(BaseModel):
    content_type: str
    content_ids: List[str]
    action: str
    rejection_reason: Optional[str] = None

@api_router.get("/admin/approval/queue")
async def get_approval_queue(
    content_type: Optional[str] = None,
    status: str = 'pending',
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get moderation queue for approval admin"""
    try:
        user = await get_current_user(credentials)
        
        if not user.get('is_admin') and not user.get('is_approval_admin'):
            raise HTTPException(status_code=403, detail="Not authorized for moderation")
        
        queue_items = []
        
        content_types_map = {
            'profile_photo': ('users', 'profile_photo'),
            'gallery_image': ('users', 'portfolio_photos'),
            'profile_video': ('users', 'portfolio_videos'),
            'event': ('events', None),
            'raffle': ('raffles', None),
            'coupon': ('coupons', None),
            'job': ('job_postings', None),
        }
        
        if content_type:
            if content_type not in content_types_map:
                raise HTTPException(status_code=400, detail=f"Invalid content_type: {content_type}")
            check_types = {content_type: content_types_map[content_type]}
        else:
            check_types = content_types_map
        
        for ctype, (collection_name, field_name) in check_types.items():
            collection = db[collection_name]
            
            if ctype in ['event', 'raffle', 'coupon', 'job']:
                query = {'approval_status': status}
                docs = await collection.find(query, {'_id': 0}).to_list(1000)
                
                for doc in docs:
                    item = {
                        'content_type': ctype,
                        'content_id': doc.get('id', doc.get('event_id', doc.get('raffle_id', doc.get('coupon_id', doc.get('job_id'))))),
                        'user_id': doc.get('organizer_id', doc.get('business_id', doc.get('user_id'))),
                        'status': doc.get('approval_status', 'pending'),
                        'submitted_at': doc.get('created_at'),
                        'metadata': doc.get('approval_metadata', {}),
                        'content_data': doc
                    }
                    queue_items.append(item)
        
        queue_items.sort(key=lambda x: x.get('submitted_at', datetime.min), reverse=True)
        
        return {
            'total': len(queue_items),
            'status': status,
            'content_type': content_type or 'all',
            'items': queue_items
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error getting approval queue: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/approval/{content_type}/{content_id}/action")
async def moderate_content(
    content_type: str,
    content_id: str,
    action: ApprovalAction,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Approve or reject content"""
    try:
        user = await get_current_user(credentials)
        
        if not user.get('is_admin') and not user.get('is_approval_admin'):
            raise HTTPException(status_code=403, detail="Not authorized for moderation")
        
        if action.action not in ['approve', 'reject']:
            raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'")
        
        new_status = 'approved' if action.action == 'approve' else 'rejected'
        
        approval_metadata = {
            'moderated_at': datetime.now(timezone.utc),
            'moderated_by': user['id'],
            'moderator_name': user.get('full_name', user.get('username')),
            'action': action.action
        }
        
        if action.rejection_reason:
            approval_metadata['rejection_reason'] = action.rejection_reason
        
        collection_map = {
            'event': 'events',
            'raffle': 'raffles',
            'coupon': 'coupons',
            'job': 'job_postings'
        }
        
        # ID field mapping (different collections use different ID fields)
        id_field_map = {
            'event': 'event_id',
            'raffle': 'raffle_id',
            'coupon': 'coupon_id',
            'job': 'id'
        }
        
        if content_type in collection_map:
            collection = db[collection_map[content_type]]
            id_field = id_field_map[content_type]
            
            result = await collection.update_one(
                {id_field: content_id},
                {
                    '$set': {
                        'approval_status': new_status,
                        'approval_metadata': approval_metadata
                    }
                }
            )
            
            if result.matched_count == 0:
                raise HTTPException(status_code=404, detail=f"Content not found: {content_type} {content_id}")
            
            doc = await collection.find_one({id_field: content_id}, {'_id': 0})
            user_id = doc.get('organizer_id', doc.get('business_id', doc.get('user_id')))
            
            if new_status == 'rejected' and user_id:
                notification = {
                    'id': f"notif_{content_id}_{datetime.now().timestamp()}",
                    'user_id': user_id,
                    'type': 'content_rejected',
                    'content_type': content_type,
                    'content_id': content_id,
                    'title': f"{content_type.replace('_', ' ').title()} Rejected",
                    'message': f"Your {content_type.replace('_', ' ')} was rejected. {action.rejection_reason or ''}",
                    'rejection_reason': action.rejection_reason,
                    'created_at': datetime.now(timezone.utc),
                    'read': False
                }
                await db.notifications.insert_one(notification)
        
        return {
            'success': True,
            'content_type': content_type,
            'content_id': content_id,
            'new_status': new_status,
            'action': action.action,
            'metadata': approval_metadata
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error moderating content: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/approval/bulk-action")
async def bulk_moderate_content(
    bulk_action: BulkApprovalAction,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Bulk approve or reject multiple items"""
    try:
        user = await get_current_user(credentials)
        
        if not user.get('is_admin') and not user.get('is_approval_admin'):
            raise HTTPException(status_code=403, detail="Not authorized for moderation")
        
        results = []
        
        for content_id in bulk_action.content_ids:
            try:
                action = ApprovalAction(
                    action=bulk_action.action,
                    rejection_reason=bulk_action.rejection_reason
                )
                
                result = await moderate_content(
                    content_type=bulk_action.content_type,
                    content_id=content_id,
                    action=action,
                    credentials=credentials
                )
                
                results.append({
                    'content_id': content_id,
                    'success': True,
                    'status': result['new_status']
                })
            except Exception as e:
                results.append({
                    'content_id': content_id,
                    'success': False,
                    'error': str(e)
                })
        
        success_count = sum(1 for r in results if r['success'])
        
        return {
            'total_processed': len(results),
            'successful': success_count,
            'failed': len(results) - success_count,
            'results': results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in bulk moderation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/approval/stats")
async def get_approval_stats(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get approval queue statistics"""
    try:
        user = await get_current_user(credentials)
        
        if not user.get('is_admin') and not user.get('is_approval_admin'):
            raise HTTPException(status_code=403, detail="Not authorized")
        
        stats = {
            'pending': {},
            'approved': {},
            'rejected': {},
            'total_pending': 0
        }
        
        content_types = ['event', 'raffle', 'coupon', 'job']
        
        for content_type in content_types:
            for status in ['pending', 'approved', 'rejected']:
                queue = await get_approval_queue(content_type=content_type, status=status, credentials=credentials)
                count = queue['total']
                stats[status][content_type] = count
                
                if status == 'pending':
                    stats['total_pending'] += count
        
        return stats
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error getting approval stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/notifications")
async def get_user_notifications(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get notifications for current user"""
    try:
        user = await get_current_user(credentials)
        
        notifications = await db.notifications.find(
            {'user_id': user['id']},
            {'_id': 0}
        ).sort('created_at', -1).limit(50).to_list(50)
        
        unread_count = await db.notifications.count_documents({
            'user_id': user['id'],
            'read': False
        })
        
        return {
            'notifications': notifications,
            'unread_count': unread_count
        }
        
    except Exception as e:
        print(f"❌ Error getting notifications: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/notifications/{notification_id}/mark-read")
async def mark_notification_read(
    notification_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Mark notification as read"""
    try:
        user = await get_current_user(credentials)
        
        result = await db.notifications.update_one(
            {'id': notification_id, 'user_id': user['id']},
            {'$set': {'read': True}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        return {'success': True}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error marking notification as read: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



# Mount the router - moved to end of file after all routes are defined




# ============= ADMIN DATA MIGRATION ENDPOINT =============

@api_router.post("/admin/migrate-production-data")
async def migrate_production_data(secret_key: str):
    """
    ONE-TIME migration endpoint to populate production database
    Call this immediately after deployment to load all users and data
    
    Usage: POST /api/admin/migrate-production-data?secret_key=MIGRATE2024
    """
    if secret_key != "MIGRATE2024":
        raise HTTPException(status_code=403, detail="Invalid secret key")
    
    try:
        # Check if already run
        existing_count = await db.users.count_documents({})
        
        if existing_count > 50:
            return {
                "status": "already_migrated",
                "message": f"Database already has {existing_count} users",
                "user_count": existing_count
            }
        
        # Import required modules
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        hashed_pw = pwd_context.hash("Test1234")
        
        R2 = "https://pub-bfa7ee4cef34458990f1d94545974968.r2.dev"
        
        # Create essential real profiles
        users_to_create = [
            {
                '_id': str(uuid.uuid4()), 'username': 'dboy_stackalini_rap_producer_s',
                'email': 'dboy_stackalini_rap_producer_s@wgo4y.com', 'password_hash': hashed_pw,
                'full_name': 'Dboy Stackalini', 'user_type': 'entrepreneur',
                'membership_tier': 'gold', 'is_demo_profile': False, 'onboarding_completed': True,
                'photo_url': f'{R2}/img8.jpg', 'stage_name': 'Dboy Stackalini',
                'occupation': 'DJ/Producer', 'city': 'Las Vegas', 'state': 'Nevada',
                'services': ['DJ', 'Music Production'], 'portfolio_photos': [f'{R2}/img8.jpg'],
                'portfolio_videos': [], 'bio': 'Professional DJ and music producer',
                'created_at': datetime.now(timezone.utc)
            },
            {
                '_id': str(uuid.uuid4()), 'username': 'd_petty',
                'email': 'd_petty@wgo4y.com', 'password_hash': hashed_pw,
                'full_name': 'D.Petty', 'user_type': 'entrepreneur',
                'membership_tier': 'silver', 'is_demo_profile': False, 'onboarding_completed': True,
                'photo_url': f'{R2}/IMG_6465.jpg', 'stage_name': 'D.Petty',
                'occupation': 'Entertainer', 'city': 'Las Vegas', 'state': 'Nevada',
                'services': ['Entertainment'], 'portfolio_photos': [f'{R2}/IMG_6465.jpg'],
                'portfolio_videos': [], 'created_at': datetime.now(timezone.utc)
            },
            {
                '_id': str(uuid.uuid4()), 'username': 'the_lace_mirror',
                'email': 'lacemirror@wgo4y.com', 'password_hash': hashed_pw,
                'full_name': 'The Lace Mirror', 'user_type': 'entrepreneur',
                'membership_tier': 'silver', 'is_demo_profile': False, 'onboarding_completed': True,
                'photo_url': f'{R2}/The%20Lace%20Nerd%20profile%20image.jpeg',
                'stage_name': 'The Lace Mirror', 'occupation': 'Visual Artist',
                'city': 'Las Vegas', 'state': 'Nevada', 'services': ['Visual Arts', 'Design'],
                'portfolio_photos': [f'{R2}/The%20Lace%20Nerd%20profile%20image.jpeg'],
                'portfolio_videos': [], 'created_at': datetime.now(timezone.utc)
            },
            {
                '_id': str(uuid.uuid4()), 'username': 'la_mansion_premier_event_venue',
                'email': 'la_mansion_premier_event_venue@wgo4y.com', 'password_hash': hashed_pw,
                'full_name': 'La Mansion - Premier Event Venue', 'user_type': 'business',
                'membership_tier': 'gold', 'is_demo_profile': False, 'onboarding_completed': True,
                'photo_url': f'{R2}/La-Mansion.png', 'business_name': 'La Mansion',
                'business_type': 'nightclub', 'city': 'Las Vegas', 'state': 'Nevada',
                'venue_photos': [f'{R2}/La-Mansion.png'], 'amenities': ['VIP', 'Full Bar', 'DJ'],
                'description': 'Premier event venue and nightclub',
                'created_at': datetime.now(timezone.utc)
            },
            {
                '_id': str(uuid.uuid4()), 'username': 'mcclellan_tavern',
                'email': 'info@mcclellans.com', 'password_hash': hashed_pw,
                'full_name': "McClellan's Tavern", 'user_type': 'business',
                'membership_tier': 'gold', 'is_demo_profile': False, 'onboarding_completed': True,
                'photo_url': f'{R2}/McClellans.jpg', 'business_name': "McClellan's Tavern",
                'business_type': 'bar_restaurant', 'city': 'Las Vegas', 'state': 'Nevada',
                'venue_photos': [f'{R2}/McClellans.jpg'], 'amenities': ['Full Bar', 'Restaurant'],
                'description': 'Classic tavern with great atmosphere',
                'created_at': datetime.now(timezone.utc)
            },
            {
                '_id': str(uuid.uuid4()), 'username': 'rack_em_up',
                'email': 'info@rackemup.com', 'password_hash': hashed_pw,
                'full_name': 'Rack Em Up', 'user_type': 'business',
                'membership_tier': 'gold', 'is_demo_profile': False, 'onboarding_completed': True,
                'photo_url': f'{R2}/6-copy.jpg', 'business_name': 'Rack Em Up',
                'business_type': 'entertainment', 'city': 'Las Vegas', 'state': 'Nevada',
                'venue_photos': [f'{R2}/6-copy.jpg'], 'amenities': ['Pool Tables', 'Bar'],
                'description': 'Premier billiards and entertainment',
                'created_at': datetime.now(timezone.utc)
            },
            {
                '_id': str(uuid.uuid4()), 'username': 'one_mansion',
                'email': 'info@onemansion.com', 'password_hash': hashed_pw,
                'full_name': 'One Mansion', 'user_type': 'business',
                'membership_tier': 'gold', 'is_demo_profile': False, 'onboarding_completed': True,
                'photo_url': f'{R2}/La-Mansion.png', 'business_name': 'One Mansion',
                'business_type': 'nightclub', 'city': 'Las Vegas', 'state': 'Nevada',
                'venue_photos': [f'{R2}/La-Mansion.png'], 'amenities': ['VIP', 'DJ', 'Dance Floor'],
                'description': 'Upscale nightclub and event venue',
                'created_at': datetime.now(timezone.utc)
            }
        ]
        
        # Insert all users
        for user in users_to_create:
            await db.users.insert_one(user)
        
        # Configure logo and branding
        await db.app_config.insert_one({
            '_id': 'branding',
            'logo_url': f'{R2}/WGO4Y%20Logo.png',
            'app_name': "What's Going On 4 You",
            'app_short_name': 'WGO4Y'
        })
        
        return {
            "status": "success",
            "users_created": len(users_to_create),
            "total_users": await db.users.count_documents({}),
            "password": "Test1234",
            "message": "Production database populated successfully"
        }
        
    except Exception as e:
        import traceback
        return {
            "status": "error",
            "message": str(e),
            "traceback": traceback.format_exc()
        }



# ============= MIDDLEWARE & FINAL ROUTER SETUP =============

# CORS Configuration - Explicit allowlist for security
# Add your production domain here when deploying
ALLOWED_ORIGINS = [
    "http://localhost:3000",  # Local development
    "https://wgo4y.vercel.app",  # Production frontend
    "https://venue-job-portal-2ub46.ondigitalocean.app",  # Deployed app
]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=ALLOWED_ORIGINS,  # Explicit allowlist instead of ["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include router ONCE at the end after all @api_router routes are defined
app.include_router(api_router)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_populate_database():
    """Automatically populate database on startup if empty"""
    try:
        # Check if database needs population
        user_count = await db.users.count_documents({})
        
        if user_count < 5:  # If less than 5 users, populate
            print("="*80)
            print("🚀 AUTO-POPULATING PRODUCTION DATABASE")
            print("="*80)
            
            from passlib.context import CryptContext
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            hashed_pw = pwd_context.hash("Test1234")
            
            R2 = "https://pub-bfa7ee4cef34458990f1d94545974968.r2.dev"
            
            # Create 7 essential real profiles
            profiles = [
                {
                    '_id': str(uuid.uuid4()),
                    'username': 'dboy_stackalini_rap_producer_s',
                    'email': 'dboy_stackalini_rap_producer_s@wgo4y.com',
                    'password_hash': hashed_pw,
                    'full_name': 'Dboy Stackalini',
                    'user_type': 'entrepreneur',
                    'membership_tier': 'gold',
                    'is_demo_profile': False,
                    'onboarding_completed': True,
                    'photo_url': f'{R2}/img8.jpg',
                    'stage_name': 'Dboy Stackalini',
                    'occupation': 'DJ/Producer/Song Writer',
                    'bio': 'Professional DJ and music producer',
                    'city': 'Las Vegas',
                    'state': 'Nevada',
                    'services': ['DJ', 'Music Production'],
                    'portfolio_photos': [f'{R2}/img8.jpg'],
                    'portfolio_videos': [],
                    'created_at': datetime.now(timezone.utc)
                },
                {
                    '_id': str(uuid.uuid4()),
                    'username': 'd_petty',
                    'email': 'd_petty@wgo4y.com',
                    'password_hash': hashed_pw,
                    'full_name': 'D.Petty',
                    'user_type': 'entrepreneur',
                    'membership_tier': 'silver',
                    'is_demo_profile': False,
                    'onboarding_completed': True,
                    'photo_url': f'{R2}/IMG_6465.jpg',
                    'stage_name': 'D.Petty',
                    'occupation': 'Entertainer',
                    'city': 'Las Vegas',
                    'state': 'Nevada',
                    'services': ['Entertainment'],
                    'portfolio_photos': [f'{R2}/IMG_6465.jpg'],
                    'portfolio_videos': [],
                    'created_at': datetime.now(timezone.utc)
                },
                {
                    '_id': str(uuid.uuid4()),
                    'username': 'the_lace_mirror',
                    'email': 'lacemirror@wgo4y.com',
                    'password_hash': hashed_pw,
                    'full_name': 'The Lace Mirror',
                    'user_type': 'entrepreneur',
                    'membership_tier': 'silver',
                    'is_demo_profile': False,
                    'onboarding_completed': True,
                    'photo_url': f'{R2}/The%20Lace%20Nerd%20profile%20image.jpeg',
                    'stage_name': 'The Lace Mirror',
                    'occupation': 'Visual Artist',
                    'city': 'Las Vegas',
                    'state': 'Nevada',
                    'services': ['Visual Arts', 'Design'],
                    'portfolio_photos': [f'{R2}/The%20Lace%20Nerd%20profile%20image.jpeg'],
                    'portfolio_videos': [],
                    'created_at': datetime.now(timezone.utc)
                },
                {
                    '_id': str(uuid.uuid4()),
                    'username': 'la_mansion_premier_event_venue',
                    'email': 'la_mansion_premier_event_venue@wgo4y.com',
                    'password_hash': hashed_pw,
                    'full_name': 'La Mansion',
                    'user_type': 'business',
                    'membership_tier': 'gold',
                    'is_demo_profile': False,
                    'onboarding_completed': True,
                    'photo_url': f'{R2}/La-Mansion.png',
                    'business_name': 'La Mansion',
                    'business_type': 'nightclub',
                    'city': 'Las Vegas',
                    'state': 'Nevada',
                    'venue_photos': [f'{R2}/La-Mansion.png'],
                    'amenities': ['VIP', 'Full Bar', 'DJ'],
                    'description': 'Premier event venue',
                    'created_at': datetime.now(timezone.utc)
                },
                {
                    '_id': str(uuid.uuid4()),
                    'username': 'mcclellan_tavern',
                    'email': 'info@mcclellans.com',
                    'password_hash': hashed_pw,
                    'full_name': "McClellan's Tavern",
                    'user_type': 'business',
                    'membership_tier': 'gold',
                    'is_demo_profile': False,
                    'onboarding_completed': True,
                    'photo_url': f'{R2}/McClellans.jpg',
                    'business_name': "McClellan's Tavern",
                    'business_type': 'bar_restaurant',
                    'city': 'Las Vegas',
                    'state': 'Nevada',
                    'venue_photos': [f'{R2}/McClellans.jpg'],
                    'amenities': ['Full Bar', 'Restaurant'],
                    'description': 'Classic tavern',
                    'created_at': datetime.now(timezone.utc)
                },
                {
                    '_id': str(uuid.uuid4()),
                    'username': 'rack_em_up',
                    'email': 'info@rackemup.com',
                    'password_hash': hashed_pw,
                    'full_name': 'Rack Em Up',
                    'user_type': 'business',
                    'membership_tier': 'gold',
                    'is_demo_profile': False,
                    'onboarding_completed': True,
                    'photo_url': f'{R2}/6-copy.jpg',
                    'business_name': 'Rack Em Up',
                    'business_type': 'entertainment',
                    'city': 'Las Vegas',
                    'state': 'Nevada',
                    'venue_photos': [f'{R2}/6-copy.jpg'],
                    'amenities': ['Pool Tables', 'Bar'],
                    'description': 'Billiards venue',
                    'created_at': datetime.now(timezone.utc)
                },
                {
                    '_id': str(uuid.uuid4()),
                    'username': 'one_mansion',
                    'email': 'info@onemansion.com',
                    'password_hash': hashed_pw,
                    'full_name': 'One Mansion',
                    'user_type': 'business',
                    'membership_tier': 'gold',
                    'is_demo_profile': False,
                    'onboarding_completed': True,
                    'photo_url': f'{R2}/La-Mansion.png',
                    'business_name': 'One Mansion',
                    'business_type': 'nightclub',
                    'city': 'Las Vegas',
                    'state': 'Nevada',
                    'venue_photos': [f'{R2}/La-Mansion.png'],
                    'amenities': ['VIP', 'DJ', 'Dance Floor'],
                    'description': 'Upscale nightclub',
                    'created_at': datetime.now(timezone.utc)
                }
            ]
            
            for profile in profiles:
                await db.users.insert_one(profile)
                print(f"✅ Created: {profile['full_name']}")
            
            # Configure logo
            await db.app_config.update_one(
                {'_id': 'branding'},
                {'$set': {
                    'logo_url': f'{R2}/WGO4Y%20Logo.png',
                    'app_name': "What's Going On 4 You",
                    'app_short_name': 'WGO4Y'
                }},
                upsert=True
            )
            
            print(f"✅ Created 7 real profiles with password: Test1234")
            print("="*80)
        else:
            print(f"✅ Database already has {user_count} users - skipping auto-population")
            
    except Exception as e:
        print(f"⚠️  Startup population error: {str(e)}")
        # Don't fail startup if population fails
        pass

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
