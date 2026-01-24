import firebase_admin
from firebase_admin import credentials, auth
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Firebase Admin SDK
try:
    # Check if Firebase Admin is already initialized
    firebase_admin.get_app()
except ValueError:
    # Initialize Firebase Admin with credentials from environment variables
    cred = credentials.Certificate({
        "type": "service_account",
        "project_id": os.getenv("FB_PROJECT_ID"),
        "client_email": os.getenv("FB_CLIENT_EMAIL"),
        "private_key": os.getenv("FB_PRIVATE_KEY", ""),
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
    })
    firebase_admin.initialize_app(cred)

# Export auth instance
admin_auth = auth
