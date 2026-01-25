import os
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

security = HTTPBearer(auto_error=False)

# Initialize a separate simple client for auth checks if needed, 
# or just use the Supabase URL/Key vars for raw requests if we prefer.
# For simplicity, let's use the explicit API endpoint method which is robust.
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    print("Warning: SUPABASE_URL or SUPABASE_KEY not set in environment")

# We use a separate client or raw HTTP to verify tokens to avoiding mixing state
# But the simplest way is to use the client verify mechanism or just raw HTTP.
# Let's use `gotrue` via a fresh client or just raw python requests to avoid 
# library version ambiguity.
import requests

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> str:
    """
    Verify the token by calling Supabase Auth API directly.
    This works for both HS256 and RS256 and handles revocation.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    
    # Call Supabase Auth API to get user
    user_url = f"{SUPABASE_URL}/auth/v1/user"
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {token}"
    }
    
    try:
        response = requests.get(user_url, headers=headers)
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {response.text}",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        user_data = response.json()
        user_id = user_data.get("id")
        
        if not user_id:
             raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token valid but no user ID found",
            )
            
        return user_id

    except Exception as e:
        # If it's already an HTTPException, re-raise it
        if isinstance(e, HTTPException):
            raise e
            
        print(f"Auth verification error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[str]:
    """
    Optionally get user_id if token is present.
    """
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None
