# WGO4Y Tier-Based Limits Configuration

TIER_LIMITS = {
    'entrepreneur': {
        'basic': {
            'portfolio_photos': 2,
            'featured_videos': 0,
            'unlimited_photos': False,
            'unlimited_videos': False,
        },
        'silver': {
            'portfolio_photos': 10,
            'featured_videos': 2,
            'unlimited_photos': False,
            'unlimited_videos': False,
        },
        'networking': {
            'portfolio_photos': 999,  # Unlimited (use high number for calculations)
            'featured_videos': 8,
            'unlimited_photos': True,
            'unlimited_videos': False,
        },
    },
    'business': {
        'basic': {
            'business_photos': 5,
            'featured_videos': 1,
            'unlimited_photos': False,
            'unlimited_videos': False,
        },
        'silver': {
            'business_photos': 15,
            'featured_videos': 5,
            'unlimited_photos': False,
            'unlimited_videos': False,
        },
        'gold': {
            'business_photos': 999,  # Unlimited (use high number for calculations)
            'featured_videos': 8,
            'unlimited_photos': True,
            'unlimited_videos': False,
        },
    },
    'general_public': {
        'basic': {
            'rsvps_per_month': 3,
            'unlimited_rsvps': False,
        },
        'appreciation': {
            'rsvps_per_month': 999,  # Unlimited (use high number for calculations)
            'unlimited_rsvps': True,
        },
    }
}

def get_tier_limits(user_type: str, membership_tier: str):
    """Get limits for a specific user type and tier"""
    if user_type not in TIER_LIMITS:
        return None
    
    tier = membership_tier.lower()
    if tier not in TIER_LIMITS[user_type]:
        # Default to basic tier limits if tier not found
        tier = 'basic'
    
    return TIER_LIMITS[user_type][tier]

def can_add_photo(user_type: str, membership_tier: str, current_count: int):
    """Check if user can add another photo"""
    limits = get_tier_limits(user_type, membership_tier)
    if not limits:
        return False
    
    # Check photo limit based on user type
    if user_type == 'entrepreneur':
        if limits.get('unlimited_photos'):
            return True
        return current_count < limits.get('portfolio_photos', 0)
    elif user_type == 'business':
        if limits.get('unlimited_photos'):
            return True
        return current_count < limits.get('business_photos', 0)
    
    return False

def can_feature_video(user_type: str, membership_tier: str, current_featured_count: int):
    """Check if user can feature another video"""
    limits = get_tier_limits(user_type, membership_tier)
    if not limits:
        return False
    
    if limits.get('unlimited_videos'):
        return True
    
    return current_featured_count < limits.get('featured_videos', 0)

def get_photo_limit(user_type: str, membership_tier: str):
    """Get photo limit for display"""
    limits = get_tier_limits(user_type, membership_tier)
    if not limits:
        return 0
    
    if user_type == 'entrepreneur':
        if limits.get('unlimited_photos'):
            return 999  # Return high number instead of string
        return limits.get('portfolio_photos', 0)
    elif user_type == 'business':
        if limits.get('unlimited_photos'):
            return 999  # Return high number instead of string
        return limits.get('business_photos', 0)
    
    return 0

def get_video_limit(user_type: str, membership_tier: str):
    """Get featured video limit for display"""
    limits = get_tier_limits(user_type, membership_tier)
    if not limits:
        return 0
    
    if limits.get('unlimited_videos'):
        return 999  # Return high number instead of string
    
    return limits.get('featured_videos', 0)

def get_rsvp_limit(membership_tier: str):
    """Get RSVP limit for General Public users"""
    limits = get_tier_limits('general_public', membership_tier)
    if not limits:
        return 0
    
    if limits.get('unlimited_rsvps'):
        return 999  # Return high number instead of string
    
    return limits.get('rsvps_per_month', 0)

def is_near_limit(current: int, limit: int, threshold: int = 2):
    """Check if user is within threshold of limit"""
    if limit >= 999:  # Unlimited
        return False
    return (limit - current) <= threshold and current < limit
