from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
import jwt
import os
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

security = HTTPBearer()

def hash_password(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> dict:
    """Decode and verify a JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
    """Get current user from JWT token"""
    token = credentials.credentials
    payload = decode_access_token(token)
    return payload

def require_role(allowed_roles: list):
    """Decorator to require specific roles"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Get current_user from kwargs (passed by FastAPI dependency)
            current_user = kwargs.get('current_user')
            if not current_user:
                raise HTTPException(status_code=401, detail="Not authenticated")
            
            if current_user.get('role') not in allowed_roles:
                raise HTTPException(status_code=403, detail="Insufficient permissions")
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

def create_password_reset_token(email: str) -> str:
    """Create a password reset token"""
    expire = datetime.now(timezone.utc) + timedelta(hours=1)  # 1 hour expiry
    to_encode = {"sub": email, "exp": expire, "type": "password_reset"}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_password_reset_token(token: str) -> str:
    """Verify password reset token and return email"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "password_reset":
            raise HTTPException(status_code=400, detail="Invalid token type")
        return payload.get("sub")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Reset token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=400, detail="Invalid reset token")
