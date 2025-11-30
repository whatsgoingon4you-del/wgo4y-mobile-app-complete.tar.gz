from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid

# ==================== USER MODELS ====================

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    username: str  # Public username/handle
    role: str  # business/venue, entrepreneur/worker, general
    tier: str = "basic"  # basic, silver, gold (default basic)

class UserCreate(UserBase):
    password: str

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    application_count: int = 0  # Track monthly job applications
    application_reset_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: str
    application_count: int
    tier: str
    created_at: datetime

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordReset(BaseModel):
    token: str
    new_password: str

# ==================== EVENT MODELS ====================

class EventBase(BaseModel):
    name: str
    date: datetime
    category: str
    location: str
    description: str
    capacity: int

class EventCreate(EventBase):
    pass

class Event(EventBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    business_id: str
    rsvp_count: int = 0
    waitlist_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EventRSVP(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    user_id: str
    status: str  # confirmed, waitlist
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== VENUE MODELS ====================

class VenueBase(BaseModel):
    name: str
    address: str
    venue_type: str
    description: str
    photo_url: Optional[str] = None

class VenueCreate(VenueBase):
    pass

class Venue(VenueBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    business_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== JOB MODELS ====================

class JobBase(BaseModel):
    title: str
    category: str  # role/service type
    date: datetime
    location: str
    description: str
    pay_rate: str

class JobCreate(JobBase):
    pass

class Job(JobBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    business_id: str
    status: str = "open"  # open, closed
    applicant_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class JobApplicationBase(BaseModel):
    cover_letter: str  # Required, 50-500 chars
    experience: Optional[str] = None

class JobApplicationCreate(JobApplicationBase):
    job_id: str

class JobApplication(JobApplicationBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    job_id: str
    user_id: str
    status: str = "pending"  # pending, viewed, accepted, rejected
    applied_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== NOTIFICATION MODELS ====================

class NotificationBase(BaseModel):
    title: str
    message: str
    notification_type: str  # RSVP, Waitlist, Events, Consulting, Worker, Job_Application
    link: Optional[str] = None
    job_id: Optional[str] = None  # For job application notifications

class NotificationCreate(NotificationBase):
    user_id: str

class Notification(NotificationBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== MESSAGE MODELS ====================

class MessageBase(BaseModel):
    content: str

class MessageCreate(MessageBase):
    recipient_id: str

class Message(MessageBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    conversation_id: str
    sender_id: str
    recipient_id: str
    read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Conversation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user1_id: str
    user2_id: str
    archived_by: List[str] = []
    last_message_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== WORKER PROFILE MODELS ====================

class WorkerProfileBase(BaseModel):
    services: List[str]  # DJ, Bartender, etc.
    experience: str
    location: str
    photo_url: Optional[str] = None

class WorkerProfileCreate(WorkerProfileBase):
    pass

class WorkerProfile(WorkerProfileBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    approved: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== CONSULTING MODELS ====================

class ConsultingRequestBase(BaseModel):
    topic: str
    message: str

class ConsultingRequestCreate(ConsultingRequestBase):
    pass

class ConsultingRequest(ConsultingRequestBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    status: str = "new"  # new, in-progress, completed
    admin_reply: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== RAFFLE MODELS ====================

class RaffleBase(BaseModel):
    title: str
    prize: str
    entry_price: float
    start_date: datetime
    end_date: datetime

class RaffleCreate(RaffleBase):
    pass

class Raffle(RaffleBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    business_id: str
    winner_id: Optional[str] = None
    total_entries: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RaffleEntryCreate(BaseModel):
    raffle_id: str
    ticket_count: int

class RaffleEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    raffle_id: str
    user_id: str
    ticket_count: int
    payment_intent_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== COUPON MODELS ====================

class CouponBase(BaseModel):
    code: str
    description: str
    discount: str  # e.g., "20%", "$10 off"
    usage_limit: int
    expiration_date: datetime

class CouponCreate(CouponBase):
    pass

class Coupon(CouponBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    business_id: str
    usage_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CouponUsage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    coupon_id: str
    user_id: str
    used_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
