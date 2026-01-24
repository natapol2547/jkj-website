from fastapi import FastAPI, Depends
from api.dependencies import verify_session_cookie, get_user_id

# Create the app instance
app = FastAPI()

# --- Endpoint 1: Simple Hello World (no auth required) ---
@app.get("/py/hello")
def hello_world():
    return {"message": "Hello from Python!"}

# --- Endpoint 2: Protected endpoint with session cookie verification ---
@app.get("/py/protected")
async def protected_endpoint(user_id: str = Depends(get_user_id)):
    """
    Example endpoint that requires authentication via session cookie.
    The user_id is automatically extracted from the verified session cookie.
    """
    return {
        "message": "This is a protected endpoint",
        "user_id": user_id
    }

# --- Endpoint 3: Access full claims if needed ---
@app.get("/py/user-info")
async def user_info(claims: dict = Depends(verify_session_cookie)):
    """
    Example endpoint that returns full user claims from the session cookie.
    """
    return {
        "user_id": claims.get("uid"),
        "email": claims.get("email"),
        "claims": claims
    }