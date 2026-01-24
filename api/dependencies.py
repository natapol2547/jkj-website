from fastapi import Cookie, HTTPException, Depends
from firebase_admin import auth
from api.admin import admin_auth
from typing import Optional

async def verify_session_cookie(
    __session: Optional[str] = Cookie(None, alias="__session")
) -> dict:
    """
    FastAPI dependency to verify Firebase session cookie.
    Returns decoded claims if valid, raises HTTPException if invalid.
    """
    print("Verifying session cookie")
    if not __session:
        raise HTTPException(status_code=401, detail="No session cookie provided")
    
    try:
        # Verify the session cookie
        decoded_claims = admin_auth.verify_session_cookie(__session, check_revoked=True)
        print("Decoded claims", decoded_claims)
        return decoded_claims
    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Invalid session cookie: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Session verification failed: {str(e)}")

async def get_user_id(
    claims: dict = Depends(verify_session_cookie)
) -> str:
    """
    FastAPI dependency that extracts user ID from verified session cookie.
    """
    print("Getting user ID", claims)
    return claims.get("uid")
