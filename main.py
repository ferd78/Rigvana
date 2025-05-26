import datetime as dt
import threading  
from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, Query, BackgroundTasks, Depends, APIRouter# type: ignore
import uvicorn # type: ignore
import firebase_admin # type: ignore
from firebase_admin import credentials, auth, firestore, storage# type: ignore
import pyrebase # type: ignore
from pydantic import BaseModel # type: ignore
from fastapi.responses import JSONResponse # type: ignore
from fastapi.exceptions import HTTPException # type: ignore
from fastapi.requests import Request # type: ignore
import random, time
from typing import Dict, List, Optional, Any
import smtplib
from email.message import EmailMessage
import os
from dotenv import load_dotenv
from pathlib import Path as FilePath
import traceback
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime
from fastapi import Path
from fastapi.middleware.cors import CORSMiddleware
import uuid
import json
from fastapi.encoders import jsonable_encoder
import logging
import requests
from google.cloud.firestore_v1.base_query import FieldFilter
from google.api_core.exceptions import GoogleAPICallError



# For firebase configs

app = FastAPI(
    description="RigVana's backend",
    title="Rigvana Backend"
)


if not firebase_admin._apps:
    # Get credentials from environment variable
    firebase_credentials_str = os.getenv("FIREBASE_CREDENTIALS_JSON")
    
    if not firebase_credentials_str:
        raise Exception("FIREBASE_CREDENTIALS_JSON is not set")

    # Parse the JSON string into a dictionary
    firebase_credentials_dict = json.loads(firebase_credentials_str)

    # Create credentials object from dictionary
    cred = credentials.Certificate(firebase_credentials_dict)

    # Initialize Firebase app with storage bucket
    firebase_admin.initialize_app(cred, {
        "storageBucket": "rigvana445.firebasestorage.app"
    })
    


db = firestore.client()



firebase_config = {
    "apiKey": "AIzaSyCPFoIUX7AKuqdJYBMfD4dBREKq2JmausQ",
    "authDomain": "rigvana445.firebaseapp.com",
    "projectId": "rigvana445",
    "storageBucket": "rigvana445.firebasestorage.app",
    "messagingSenderId": "926756745740",
    "appId": "1:926756745740:web:e6c7302d575aab4c46f429",
    "measurementId": "G-4MRKBB3RHC",
    "databaseURL": ""
}

bucket = storage.bucket()
firebase = pyrebase.initialize_app(firebase_config)
revoked_tokens_ref = db.collection('revoked_tokens')

# for reset pass otp
env_path = FilePath(__file__).parent / "email.env"
load_dotenv(dotenv_path=env_path)
EMAIL_ADDRESS = os.getenv("EMAIL_ADDRESS")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
otp_store: Dict[str, Dict[str, str]] = {}


security = HTTPBearer()



# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods 
    allow_headers=["*"],  # Allows all headers 
)

otp_ref = db.collection('otp_store')

# Set up logging
logger = logging.getLogger(__name__)
######################################################### SCHEMAS ############################################

class SignupSchema(BaseModel):
    email: str
    password: str


class LoginSchema(BaseModel):
    email: str
    password: str

class OTPVerify(BaseModel):
    email: str
    otp: str

class ResetPassword(BaseModel):
    email: str
    otp: str
    new_password: str

class PasswordResetRequest(BaseModel):
    email: str

class ComponentReferences(BaseModel):
    cpu: str
    gpu: str
    motherboard: str
    ram: str
    storage: str
    cooling: str
    psu: str
    case: str

class BuildCreateSchema(BaseModel):
    name: str
    description: str
    components: ComponentReferences


class UserProfile(BaseModel):
    name: str
    description: str
    profile_picture_url: str

class ProfilePictureUpdate(BaseModel):
    profile_picture_url: str


class ForumPostCreate(BaseModel):
    text: str
    image_url: Optional[str] = None
    audio_url: Optional[str] = None
    location: Optional[Dict[str, float]] = None
    build_id: Optional[str] = None  

class ForumPostResponse(BaseModel):
    id: str
    user_id: str
    username: str
    profile_picture: Optional[str]
    text: str
    image_url: Optional[str]
    audio_url: Optional[str]
    location: Optional[Dict[str, float]]
    likes: int
    liked_by: List
    comments: List
    shares: int
    created_at: str  
    build_data: Optional[Dict]

class CommentCreate(BaseModel):
    text: str
    image_url: Optional[str] = None  

class FollowUserRequest(BaseModel):
    target_uid: str  # The UID of the user to follow/unfollow

class PostBuildWithTweet(BaseModel):
    build_id: str
    text: str
    image_url: Optional[str] = None
    audio_url: Optional[str] = None
    location: Optional[Dict[str, float]] = None

class NotificationResponse(BaseModel):
    id: str
    recipient_uid: str
    sender_uid: str
    type: str
    object_id: str
    message: str
    is_read: bool
    created_at: datetime

#################################################################################################################

def send_email(to_email: str, content: str):
    msg = EmailMessage()
    msg.set_content(content)
    msg["Subject"] = "RigVana OTP Verification"
    msg["From"] = EMAIL_ADDRESS
    msg["To"] = to_email

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
            smtp.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            smtp.send_message(msg)
    except Exception as e:
        print("Email sending failed:", e)
        traceback.print_exc()  # Show full error details
        raise HTTPException(status_code=500, detail="Failed to send email")
    


# Helper function to convert Firestore timestamps
def convert_firestore_timestamp(obj):
    if hasattr(obj, 'isoformat'):  # Handles both datetime and DatetimeWithNanoseconds
        return obj.isoformat()
    elif isinstance(obj, dict):
        return {k: convert_firestore_timestamp(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_firestore_timestamp(v) for v in obj]
    return obj



def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two coordinates in kilometers using Haversine formula.
    """
    from math import radians, sin, cos, sqrt, atan2
    
    # Convert coordinates to radians
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    radius_of_earth = 6371  # Earth's radius in km
    distance = radius_of_earth * c
    
    return distance


def convert_document_references(obj):
    if isinstance(obj, firestore.DocumentReference):
        return obj.path
    elif isinstance(obj, dict):
        return {k: convert_document_references(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_document_references(v) for v in obj]
    else:
        return obj
    


def notify_followers_on_new_post(poster_uid: str, post_id: str, post_type: str):
    try:
        # Get poster info
        poster_doc = db.collection("users").document(poster_uid).get()
        if not poster_doc.exists:
            return

        poster_data = poster_doc.to_dict()
        poster_profile = poster_data.get("profile", {})
        poster_name = poster_profile.get("username", "Someone")
        poster_pic = poster_profile.get("profile_picture_url", "")

        # Get followers
        followers = db.collection("users")\
                     .where("following", "array_contains", poster_uid)\
                     .stream()

        # Batch notifications
        batch = db.batch()
        notification_count = 0

        for follower in followers:
            notification_ref = db.collection("notifications").document()
            
            notification_data = {
                "recipient_uid": follower.id,
                "sender_uid": poster_uid,
                "sender_name": poster_name,
                "sender_image": poster_pic,
                "type": f"new_{post_type}",
                "object_id": post_id,
                "message": f"{poster_name} posted a new {post_type}",
                "is_read": False,
                "created_at": firestore.SERVER_TIMESTAMP,
                "metadata": {
                    "post_type": post_type,
                    "preview_content": poster_data.get("text", "")[:100] + "..."
                }
            }
            
            batch.set(notification_ref, notification_data)
            notification_count += 1

            # Commit every 400 operations (Firestore batch limit is 500)
            if notification_count % 400 == 0:
                batch.commit()
                batch = db.batch()

        # Commit remaining notifications
        if notification_count > 0:
            batch.commit()

        logger.info(f"Notified {notification_count} followers about post {post_id}")

    except Exception as e:
        logger.error(f"Notification error: {str(e)}\n{traceback.format_exc()}")


def notify_post_like(liker_uid: str, post_owner_uid: str, post_id: str):
    try:
        # Get liker's profile info
        liker_doc = db.collection("users").document(liker_uid).get()
        if not liker_doc.exists:
            return
            
        liker_data = liker_doc.to_dict()
        liker_profile = liker_data.get("profile", {})
        liker_name = liker_profile.get("username", "Someone")
        liker_pic = liker_profile.get("profile_picture_url", "")

        # Create notification
        notification_ref = db.collection("notifications").document()
        notification_data = {
            "recipient_uid": post_owner_uid,
            "sender_uid": liker_uid,
            "sender_name": liker_name,
            "sender_image": liker_pic,
            "type": "post_like",
            "object_id": post_id,
            "message": f"{liker_name} liked your post",
            "is_read": False,
            "created_at": firestore.SERVER_TIMESTAMP,
            "metadata": {
                "action": "like",
                "post_id": post_id
            }
        }
        
        notification_ref.set(notification_data)
        logger.info(f"Sent like notification to {post_owner_uid}")

    except Exception as e:
        logger.error(f"Error sending like notification: {str(e)}\n{traceback.format_exc()}")

######################################################### ENPOINTS ############################################

@app.get("/")
async def root():
    return {"message": "Welcome to Rigvana Backend"}



@app.post('/signup')
async def create_account(user_data: SignupSchema):
    email = user_data.email
    password = user_data.password

    try:
        user = auth.create_user(
            email = email,
            password = password
        )

        return JSONResponse(
                content={"message": f"User account successfully created for {user.uid}"},
                status_code=201
            )
    
    except auth.EmailAlreadyExistsError:
        raise HTTPException(
            status_code= 400,
            detail= f"account already exists for {email}"
        )
    

@app.post('/login')
async def create_access_token(user_data: LoginSchema):
    email = user_data.email
    password = user_data.password

    try:
        user = firebase.auth().sign_in_with_email_and_password(
            email = email,
            password = password
        )

        token = user['idToken']

        return JSONResponse(
            content = {
                "token":token
            }, status_code= 200
        )
    
    except:
        raise HTTPException(
            status_code= 400,
            detail = "Invalid Credentials"
        )

@app.post('/ping')
async def validate_token(request: Request):
    headers = request.headers
    jwt = headers.get('autherization')

    user = auth.verify_id_token(jwt)


    return user.uid

@app.post("/request-password-reset")
async def request_reset(user: PasswordResetRequest):
    email = user.email

    # Check if user exists
    try:
        user_record = auth.get_user_by_email(email)
    except firebase_admin.auth.UserNotFoundError:
        raise HTTPException(status_code=404, detail="No account with this email.")

    # Generate OTP
    otp = str(random.randint(1000, 9999))
    expires_at = datetime.now() + timedelta(minutes=5)  # Use datetime for consistency
    
    # Store in Firestore
    db.collection('otp_store').document(email).set({
        "otp": otp,
        "expires_at": expires_at,
        "created_at": datetime.now()
    })

    # Send OTP via email
    send_email(email, f"Your RigVana OTP is: {otp}")

    return {"message": "OTP sent to your email."}

@app.post("/verify-otp")
async def verify_otp(data: OTPVerify):
    try:
        email = data.email
        otp = data.otp
        
        # Debug logging
        logger.info(f"Verification attempt for {email} with OTP: {otp}")
        
        # Get from Firestore
        doc_ref = db.collection('otp_store').document(email)
        doc = doc_ref.get()
        
        if not doc.exists:
            logger.warning(f"No OTP record found for {email}")
            raise HTTPException(
                status_code=400,
                detail="OTP expired or not found. Please request a new one."
            )
            
        record = doc.to_dict()
        logger.info(f"Found OTP record: {record}")
        
        # Check expiration
        if datetime.now() > record["expires_at"]:
            doc_ref.delete()  # Clean up expired OTP
            raise HTTPException(
                status_code=400,
                detail="OTP has expired. Please request a new one."
            )
            
        # Verify OTP
        if record["otp"] != otp:
            raise HTTPException(
                status_code=401,
                detail="Invalid OTP. Please try again."
            )
            
        return {"message": "OTP verified successfully"}
        
    except Exception as e:
        logger.error(f"OTP verification error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred during verification"
        )

@app.post("/reset-password")
async def reset_password(data: ResetPassword):
    email = data.email
    otp = data.otp
    new_password = data.new_password

    # Get from Firestore (consistent with verify-otp)
    doc = db.collection('otp_store').document(email).get()
    if not doc.exists:
        raise HTTPException(status_code=400, detail="OTP expired or not found.")
    
    record = doc.to_dict()
    if datetime.now() > record["expires_at"]:
        raise HTTPException(status_code=400, detail="OTP expired or not found.")

    if record["otp"] != otp:
        raise HTTPException(status_code=401, detail="Invalid OTP.")

    # Reset password in Firebase
    try:
        user = auth.get_user_by_email(email)
        auth.update_user(user.uid, password=new_password)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to reset password")

    # Remove OTP after use
    db.collection('otp_store').document(email).delete()

    return {"message": "Password successfully reset"}

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    # Check if token is revoked
    doc = revoked_tokens_ref.document(token).get()
    if doc.exists:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked"
        )
    try:
        decoded_token = auth.verify_id_token(token)
        return {
            'uid': decoded_token['uid'],
            'token': token  # Include both uid and token
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )

@app.post('/logout')
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        # First verify the token to get user info
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token['uid']
        
        # Store the revoked token with an expiration time
        expires_at = dt.datetime.now() + dt.timedelta(hours=1)
        revoked_tokens_ref.document(token).set({
            'uid': uid,
            'revoked_at': dt.datetime.now(),
            'expires_at': expires_at
        })
        return {"message": "Successfully logged out"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@app.post('/create-build',
          summary="Create a new PC build",
          description="Create a new PC build with selected components. Requires authentication.",
          response_description="Returns the created build ID",
          status_code=status.HTTP_201_CREATED,
          responses={
              400: {"description": "Component compatibility error"},
              401: {"description": "Invalid or missing authentication token"},
              500: {"description": "Internal server error"}
          })
async def create_build(
    build_data: BuildCreateSchema,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Create a new PC build for the authenticated user with compatibility checks.
    
    Requires:
    - Valid JWT token in Authorization header (Bearer token)
    - Component document IDs for all required parts
    
    Returns:
    - Success message with the new build ID
    - 400 error if components are incompatible
    """
    jwt = credentials.credentials
    
    try:
        # Verify the token and get user UID
        decoded_token = auth.verify_id_token(jwt)
        user_uid = decoded_token['uid']
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

    # Validate all component references exist and get their compatibility data
    components = {}
    compatibility_issues = []
    
    for component_type, component_id in build_data.components.dict().items():
        doc_ref = db.collection(component_type).document(component_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid {component_type} ID: {component_id}"
            )
        
        components[component_type] = {
            'id': component_id,
            'data': doc.to_dict(),
            'compatibility': doc.to_dict().get('compatibility', {})
        }

    # Compatibility validation checks
    # 1. CPU and Motherboard socket match
    cpu_socket = components['cpu']['compatibility'].get('socket')
    mobo_socket = components['motherboard']['compatibility'].get('socket')
    if cpu_socket != mobo_socket:
        compatibility_issues.append(
            f"CPU socket ({cpu_socket}) doesn't match motherboard socket ({mobo_socket})"
        )

    # 2. RAM and Motherboard compatibility
    ram_type = components['ram']['compatibility'].get('type')
    mobo_ram_type = components['motherboard']['compatibility'].get('ram_type')
    if ram_type != mobo_ram_type:
        compatibility_issues.append(
            f"RAM type ({ram_type}) doesn't match motherboard supported type ({mobo_ram_type})"
        )

    # 3. Case and Motherboard form factor
    case_mobo_support = components['case']['compatibility'].get('motherboard_support', [])
    mobo_form_factor = components['motherboard']['compatibility'].get('form_factor')
    if mobo_form_factor not in case_mobo_support:
        compatibility_issues.append(
            f"Motherboard form factor ({mobo_form_factor}) not supported by case (supports: {', '.join(case_mobo_support)})"
        )

    # 4. Cooler and CPU socket
    cooler_sockets = components['cooling']['compatibility'].get('socket_support', [])
    if cpu_socket not in cooler_sockets:
        compatibility_issues.append(
            f"CPU socket ({cpu_socket}) not supported by cooler (supports: {', '.join(cooler_sockets)})"
        )

    # 5. Cooler and Case clearance
    if components['cooling']['compatibility'].get('type') == 'Air Cooler':
        cooler_height = components['cooling']['compatibility'].get('height', '0mm')
        case_max_height = components['case']['compatibility'].get('cooler_max_height', '0mm')
        
        # Simple numeric comparison (this could be enhanced with proper unit parsing)
        cooler_num = float(''.join(filter(str.isdigit, cooler_height)))
        case_num = float(''.join(filter(str.isdigit, case_max_height)))
        
        if cooler_num > case_num:
            compatibility_issues.append(
                f"Cooler height ({cooler_height}) exceeds case maximum ({case_max_height})"
            )

    # 6. GPU and Case length
    gpu_length = components['gpu']['compatibility'].get('length', '0mm')
    case_max_gpu_length = components['case']['compatibility'].get('gpu_max_length', '0mm')
    
    # Simple numeric comparison
    gpu_num = float(''.join(filter(str.isdigit, gpu_length)))
    case_gpu_num = float(''.join(filter(str.isdigit, case_max_gpu_length)))
    
    if gpu_num > case_gpu_num:
        compatibility_issues.append(
            f"GPU length ({gpu_length}) exceeds case maximum ({case_max_gpu_length})"
        )

    # 7. PSU wattage and components
    psu_wattage = components['psu']['compatibility'].get('wattage', '0W')
    min_required = components['gpu']['compatibility'].get('min_psu_wattage', '0W')
    
    # Simple numeric comparison
    psu_num = float(''.join(filter(str.isdigit, psu_wattage)))
    min_num = float(''.join(filter(str.isdigit, min_required)))
    
    if psu_num < min_num:
        compatibility_issues.append(
            f"PSU wattage ({psu_wattage}) may be insufficient for GPU (recommends {min_required})"
        )

    # 8. PSU and Case compatibility
    psu_type = components['psu']['compatibility'].get('type')
    case_psu_support = components['case']['compatibility'].get('psu_support', [])
    if psu_type not in case_psu_support:
        compatibility_issues.append(
            f"PSU type ({psu_type}) not supported by case (supports: {', '.join(case_psu_support)})"
        )

    # If any compatibility issues found, return them
    if compatibility_issues:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Component compatibility issues found",
                "issues": compatibility_issues
            }
        )

    # Prepare the build data with Firestore references
    build_dict = {
        "name": build_data.name,
        "description": build_data.description,
        "createdAt": datetime.now(),
        "components": {
            component_type: db.collection(component_type).document(component_id)
            for component_type, component_id in build_data.components.dict().items()
        },
        "compatibility_validated": True  # Mark that this build was checked
    }
    
    try:
        # Add the build to the user's builds subcollection
        builds_ref = db.collection("users").document(user_uid).collection("builds")
        new_build_ref = builds_ref.add(build_dict)
        
        return {
            "message": "Build created successfully",
            "build_id": new_build_ref[1].id,
            "user_id": user_uid
        }
    except Exception as e:
        print(f"Error creating build: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create build in database"
        )

@app.get('/get-builds',
         summary="Get all builds for the authenticated user",
         description="Returns a list of all PC builds belonging to the current user",
         response_description="List of user's builds")
async def get_user_builds(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    try:
        # Verify the token using the HTTPBearer dependency
        jwt = credentials.credentials
        decoded_token = auth.verify_id_token(jwt)
        user_uid = decoded_token['uid']
    except Exception as e:
        print(f"Token verification error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    try:
        # Get all builds for the user
        builds_ref = db.collection("users").document(user_uid).collection("builds")
        builds = builds_ref.stream()
        
        build_list = []
        for build in builds:
            build_data = build.to_dict()
            # Convert references to component IDs for response
            components = {}
            for category, ref in build_data['components'].items():
                components[category] = ref.id
            
            build_list.append({
                "id": build.id,
                "name": build_data['name'],
                "description": build_data['description'],
                "createdAt": build_data['createdAt'].isoformat(),
                "components": components
            })
        
        return JSONResponse(
            content=build_list,
            status_code=200
        )
    except Exception as e:
        print(f"Error retrieving builds: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve builds"
        )
    

@app.get('/get-components/{component_type}',
         summary="Fetch all components of a specific type",
         description="Returns all documents in the specified component category (e.g., cpu, gpu, motherboard).",
         response_description="List of components")
async def get_components(component_type: str):
    valid_types = ["cpu", "gpu", "motherboard", "ram", "storage", "cooling", "psu", "case"]

    if component_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid component type '{component_type}'. Must be one of: {', '.join(valid_types)}"
        )

    try:
        components_ref = db.collection(component_type)
        components = components_ref.stream()

        component_list = []
        for doc in components:
            data = doc.to_dict()
            data["id"] = doc.id  # include document ID
            component_list.append(data)

        return JSONResponse(content=component_list, status_code=200)

    except Exception as e:
        print(f"Error retrieving {component_type}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve {component_type} components"
        )
    
@app.delete("/delete-build/{build_id}",
            summary="Delete a user's build",
            description="Deletes a specific PC build for the authenticated user.",
            response_description="Confirmation of deletion")

async def delete_build(
    build_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    try:
        decoded_token = auth.verify_id_token(credentials.credentials)
        user_uid = decoded_token['uid']
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    try:
        build_ref = db.collection("users").document(user_uid).collection("builds").document(build_id)
        build_snapshot = build_ref.get()

        if not build_snapshot.exists:
            raise HTTPException(status_code=404, detail="Build not found")

        build_ref.delete()

        return {"message": f"Build {build_id} successfully deleted"}
    except Exception as e:
        print(f"Error deleting build: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete build")



@app.get('/get-certain-build/{build_id}',
         summary="Get detailed information about a specific build",
         description="Returns all information about a specific build including component details",
         response_description="Detailed build information with components")
async def get_certain_build_details(
    build_id: str = Path(..., description="The ID of the build to retrieve"),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Get detailed information about a specific build, including all component data.
    
    Requires:
    - Valid JWT token in Authorization header (Bearer token)
    - Build ID that belongs to the authenticated user
    
    Returns:
    - Complete build information with expanded component details
    """
    try:
        # Verify the token and get user UID
        decoded_token = auth.verify_id_token(credentials.credentials)
        user_uid = decoded_token['uid']
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    try:
        # Get the build document
        build_ref = db.collection("users").document(user_uid).collection("builds").document(build_id)
        build_doc = build_ref.get()
        
        if not build_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Build not found"
            )
            
        if build_doc.exists:
            build_data = build_doc.to_dict()
            # Remove any non-serializable fields
            build_data = {
                k: v for k, v in build_data.items()
                if not k.startswith('_') and isinstance(v, (str, int, float, bool, dict, list, type(None), datetime))
            }
        
        # Prepare response with basic build info
        response = {
            "id": build_doc.id,
            "name": build_data['name'],
            "description": build_data['description'],
            "createdAt": build_data['createdAt'].isoformat(),
            "components": {}
        }
        
        # Fetch details for each component
        for component_type, component_ref in build_data['components'].items():
            component_doc = component_ref.get()
            if component_doc.exists:
                component_data = component_doc.to_dict()
                component_data['id'] = component_ref.id
                response['components'][component_type] = component_data
            else:
                response['components'][component_type] = {
                    "error": "Component not found",
                    "id": component_ref.id
                }
        
        return JSONResponse(content=response, status_code=200)
        
    except Exception as e:
        print(f"Error retrieving build details: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve build details"
        )
    
@app.get('/get-public-build/{build_id}/{user_id}',
         summary="Get detailed information about any user's build",
         description="Returns public information about a specific build including component details",
         response_description="Detailed build information with components")
async def get_public_build_details(
    build_id: str = Path(..., description="The ID of the build to retrieve"),
    user_id: str = Path(..., description="The ID of the user who owns the build"),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Get detailed information about any user's build when accessed through a forum post.
    """
    try:
        # Verify the token (but don't check if build belongs to this user)
        decoded_token = auth.verify_id_token(credentials.credentials)
        current_user_uid = decoded_token['uid']
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    try:
        # Get the build document from the specified user's collection
        build_ref = db.collection("users").document(user_id).collection("builds").document(build_id)
        build_doc = build_ref.get()
        
        if not build_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Build not found"
            )
            
        build_data = build_doc.to_dict()
        
        # Prepare response with basic build info
        response = {
            "id": build_doc.id,
            "name": build_data['name'],
            "description": build_data['description'],
            "createdAt": build_data['createdAt'].isoformat(),
            "components": {}
        }
        
        # Fetch details for each component
        for component_type, component_ref in build_data['components'].items():
            component_doc = component_ref.get()
            if component_doc.exists:
                component_data = component_doc.to_dict()
                component_data['id'] = component_ref.id
                response['components'][component_type] = component_data
            else:
                response['components'][component_type] = {
                    "error": "Component not found",
                    "id": component_ref.id
                }
        
        return JSONResponse(content=response, status_code=200)
        
    except Exception as e:
        print(f"Error retrieving build details: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve build details"
        )


@app.put('/update-build/{build_id}',
         summary="Update an existing build",
         description="Update the name, description, or components of an existing build",
         response_description="Confirmation of update",
         status_code=status.HTTP_200_OK)
async def update_build(
    build_id: str = Path(..., description="The ID of the build to update"),
    build_data: BuildCreateSchema = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Update an existing PC build for the authenticated user.
    
    Requires:
    - Valid JWT token in Authorization header (Bearer token)
    - Build ID that belongs to the authenticated user
    
    Optional:
    - New name
    - New description
    - New component references
    
    Returns:
    - Success message
    """
    try:
        # Verify the token and get user UID
        decoded_token = auth.verify_id_token(credentials.credentials)
        user_uid = decoded_token['uid']
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    try:
        # Get the build document reference
        build_ref = db.collection("users").document(user_uid).collection("builds").document(build_id)
        build_doc = build_ref.get()
        
        if not build_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Build not found"
            )
            
        # Prepare update data
        update_data = {}
        
        if build_data.name is not None:
            update_data['name'] = build_data.name
            
        if build_data.description is not None:
            update_data['description'] = build_data.description
            
        if build_data.components is not None:
            # Validate all new component references exist
            component_refs = {
                "cpu": build_data.components.cpu,
                "gpu": build_data.components.gpu,
                "motherboard": build_data.components.motherboard,
                "ram": build_data.components.ram,
                "storage": build_data.components.storage,
                "cooling": build_data.components.cooling,
                "psu": build_data.components.psu,
                "case": build_data.components.case
            }
            
            for component_type, component_id in component_refs.items():
                doc_ref = db.collection(component_type).document(component_id)
                if not doc_ref.get().exists:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid {component_type} ID: {component_id}"
                    )
            
            # Convert component IDs to Firestore references
            update_data['components'] = {
                component_type: db.collection(component_type).document(component_id)
                for component_type, component_id in component_refs.items()
            }
        
        # Only update if there's something to update
        if update_data:
            build_ref.update(update_data)
        
        return {
            "message": "Build updated successfully",
            "build_id": build_id
        }
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        print(f"Error updating build: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update build"
        )





@app.post('/set-profile', summary="Set or update user profile")
async def set_profile(
    profile_data: UserProfile,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    try:
        decoded_token = auth.verify_id_token(credentials.credentials)
        user_uid = decoded_token['uid']
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    try:
        # Convert the incoming data to a dictionary
        profile_dict = profile_data.dict()
        
        # Handle the name/username field
        if 'name' in profile_dict:
            profile_dict['username'] = profile_dict.pop('name')
        
        user_ref = db.collection("users").document(user_uid)
        user_ref.set({
            "profile": profile_dict
        }, merge=True)

        return {"message": "Profile updated successfully"}
    except Exception as e:
        print(f"Error updating profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to update user profile")
    
@app.post("/upload-profile-picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    try:
        print("[DEBUG] Verifying token...")
        decoded_token = auth.verify_id_token(credentials.credentials)
        user_uid = decoded_token['uid']
        print(f"[DEBUG] Token valid. UID: {user_uid}")
    except Exception as e:
        print("[ERROR] Token verification failed.")
        traceback.print_exc()
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    try:
        print(f"[DEBUG] Received file: {file.filename}, content type: {file.content_type}")

        # Validate file type
        allowed_types = ['image/jpeg', 'image/png', 'image/gif']
        if file.content_type not in allowed_types:
            print("[ERROR] Invalid file type.")
            raise HTTPException(status_code=400, detail="Invalid file type")

        # Generate unique filename
        file_ext = os.path.splitext(file.filename)[1]
        filename = f"user_profile_pictures/{user_uid}/{uuid.uuid4()}{file_ext}"
        print(f"[DEBUG] Generated filename: {filename}")

        # Upload to Firebase Storage
        file_bytes = await file.read()
        print(f"[DEBUG] File size: {len(file_bytes)} bytes")

        blob = bucket.blob(filename)
        print(f"[DEBUG] Uploading to bucket: {bucket.name}")
        blob.upload_from_string(file_bytes, content_type=file.content_type)
        blob.make_public()

        print(f"[DEBUG] Upload successful. Public URL: {blob.public_url}")

        # Update Firestore with the new profile picture URL
        user_ref = db.collection("users").document(user_uid)
        user_ref.set({
            "profile": {
                "profile_picture": blob.public_url
            }
        }, merge=True)

        return {"url": blob.public_url, "message": "Profile picture updated successfully"}

    except Exception as e:
        print("[ERROR] Exception during file upload.")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail="Failed to upload profile picture"
        )


@app.post('/update-profile-picture')
async def update_profile_picture(
    picture_data: ProfilePictureUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    try:
        decoded_token = auth.verify_id_token(credentials.credentials)
        user_uid = decoded_token['uid']
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    try:
        user_ref = db.collection("users").document(user_uid)
        # Changed from "profile.picture_url" to "profile.profile_picture"
        user_ref.set({
            "profile": {
                "profile_picture": picture_data.profile_picture_url
            }
        }, merge=True)

        return {"message": "Profile picture updated successfully"}
    except Exception as e:
        print(f"Error updating profile picture: {e}")
        raise HTTPException(status_code=500, detail="Failed to update profile picture")



@app.get('/get-profile', summary="Fetch user profile with follow stats")
async def get_profile(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        decoded_token = auth.verify_id_token(credentials.credentials)
        user_uid = decoded_token['uid']
        user_email = decoded_token.get('email', '')
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    try:
        profile = {
            "uid": user_uid,
            "email": user_email,
        }

        user_doc = db.collection("users").document(user_uid).get()
        
        if user_doc.exists:
            user_data = user_doc.to_dict()
            user_profile = user_data.get("profile", {})

            # Get profile fields
            username = user_profile.get("username", "").strip()
            description = user_profile.get("description", "").strip()
            profile_picture = user_profile.get("profile_picture", "").strip()

            # Use email prefix as default username if not set
            email_prefix = user_email.split('@')[0] if user_email else "user"
            profile["username"] = username if username else email_prefix
            profile["description"] = description if description else "not set"
            profile["profile_picture"] = profile_picture if profile_picture else "not set"

            # Get following count (people the user follows)
            following = user_data.get("following", [])
            profile["following_count"] = len(following)

            # Get follower count (people who follow the user)
            followers_query = db.collection("users").where("following", "array_contains", user_uid)
            profile["follower_count"] = len(list(followers_query.stream()))
        else:
            email_prefix = user_email.split('@')[0] if user_email else "user"
            profile.update({
                "username": email_prefix,
                "description": "not set",
                "profile_picture": "not set",
                "following_count": 0,
                "follower_count": 0
            })

        return profile
        
    except Exception as e:
        print(f"Error fetching profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve profile")

    
@app.get('/get-other-profile', 
         summary="Fetch another user's profile",
         description="Retrieves profile information for a specified user including follow status and follower count",
         response_description="The requested user's profile data with follow information")
async def get_other_profile(
    target_uid: str = Query(..., description="UID of the user whose profile to fetch"),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    try:
        # Verify the requesting user's token and get their UID
        decoded_token = auth.verify_id_token(credentials.credentials)
        current_user_uid = decoded_token['uid']
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    try:
        # Get the target user's document
        target_user_ref = db.collection("users").document(target_uid)
        target_user_doc = target_user_ref.get()
        
        if not target_user_doc.exists:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        # Get target user's profile data
        target_user_data = target_user_doc.to_dict()
        user_profile = target_user_data.get("profile", {})

        # Get current user's following list to determine follow status
        current_user_ref = db.collection("users").document(current_user_uid)
        current_user_data = current_user_ref.get().to_dict() or {}
        is_following = target_uid in current_user_data.get("following", [])

        # Calculate follower count (users who follow the target user)
        followers_query = db.collection("users").where("following", "array_contains", target_uid)
        follower_count = len(list(followers_query.stream()))

        profile = {
            "uid": target_uid,
            "username": user_profile.get("username", "").strip() or "not set",
            "description": user_profile.get("description", "").strip() or "not set",
            "profile_picture": user_profile.get("profile_picture", "").strip() or "not set",
            "is_following": is_following,
            "follower_count": follower_count,
            "following_count": len(target_user_data.get("following", [])),
            # Add any other public profile fields
        }

        return profile
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching other profile: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to retrieve profile"
        )



@app.get('/get-all-users',
         summary="Get list of all users",
         description="Returns basic information about all users including follower counts",
         response_description="List of user profiles")
async def get_all_users(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    try:
        # Verify authentication
        decoded_token = auth.verify_id_token(credentials.credentials)
        current_user_uid = decoded_token['uid']
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    try:
        users_ref = db.collection("users")
        users_docs = users_ref.stream()
        
        users_list = []
        
        for user_doc in users_docs:
            user_data = user_doc.to_dict()
            user_profile = user_data.get("profile", {})
            
            # Calculate follower count
            followers_query = db.collection("users").where("following", "array_contains", user_doc.id)
            follower_count = len(list(followers_query.stream()))
            
            users_list.append({
                "uid": user_doc.id,
                "username": user_profile.get("username", "").strip() or "not set",
                "profile_picture": user_profile.get("profile_picture", "").strip() or "not set",
                "follower_count": follower_count,
                "is_current_user": user_doc.id == current_user_uid  # Flag for current user
            })
        
        return users_list
        
    except Exception as e:
        print(f"Error fetching all users: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve user list"
        )



@app.post('/delete-profile-picture')
async def delete_profile_picture(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    try:
        decoded_token = auth.verify_id_token(credentials.credentials)
        user_uid = decoded_token['uid']
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    try:
        # Update Firestore to remove the profile picture
        user_ref = db.collection("users").document(user_uid)
        user_ref.set({
            "profile": {
                "profile_picture": "not set"
            }
        }, merge=True)

        return {"message": "Profile picture deleted successfully"}

    except Exception as e:
        print(f"Error deleting profile picture: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete profile picture")



    # Forum endpoints
# Forum endpoints
@app.post('/forum/posts',
          summary="Create a new forum post",
          description="Create a new post in the forum with user profile information",
          response_description="The created post with user profile data",
          response_model=ForumPostResponse)
def create_forum_post(
    post_data: ForumPostCreate,
    background_tasks: BackgroundTasks,
    credentials: HTTPAuthorizationCredentials = Depends(security)
    
) -> ForumPostResponse:
    try:
        # Authenticate user
        decoded_token = auth.verify_id_token(credentials.credentials)
        user_uid = decoded_token['uid']
        user_email = decoded_token.get('email', '')
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    try:
        # Validate post content
        if not post_data.text.strip():
            raise HTTPException(status_code=400, detail="Text is required for a post")

        # Fetch user profile
        user_doc = db.collection("users").document(user_uid).get()
        username = user_email.split("@")[0]
        profile_pic = None

        if user_doc.exists:
            user_data = user_doc.to_dict()
            profile = user_data.get("profile", {})
            username = profile.get("username", username)
            profile_pic = profile.get("profile_picture")

        # Build post dictionary
        post_ref = db.collection("forum_posts").document()
        post_dict = {
            "user_id": user_uid,
            "username": username,
            "profile_picture": profile_pic,
            "text": post_data.text,
            "image_url": post_data.image_url or None,
            "audio_url": post_data.audio_url or None,
            "location": post_data.location or None,
            "likes": 0,
            "liked_by": [],
            "comments": [],
            "shares": 0,
            "created_at": datetime.utcnow(),
        }

        if post_data.build_id:
            post_dict["build_id"] = post_data.build_id

        # Store post in Firestore
        post_ref.set(post_dict)
        post_id = post_ref.id

        # Optional: Attach build data
        build_data = None
        if post_data.build_id:
            build_doc = db.collection("users").document(user_uid)\
                          .collection("builds").document(post_data.build_id).get()
            if build_doc.exists:
                build_data = build_doc.to_dict()

                # Remove private and unserializable fields
                lock_type = type(threading.Lock())
                build_data = {
                    k: v for k, v in build_data.items()
                    if not k.startswith('_') and not isinstance(v, lock_type)
                }

                # Convert document references and other nested fields
                build_data = convert_document_references(build_data)

                # Convert any remaining non-serializable objects to strings
                for k, v in build_data.items():
                    if not isinstance(v, (str, int, float, bool, list, dict, type(None))):
                        build_data[k] = str(v)

        # Notify followers in background
        background_tasks.add_task(notify_followers_on_new_post, user_uid, post_id, "thread")

        return ForumPostResponse(
            id=post_id,
            user_id=user_uid,
            username=username,
            profile_picture=profile_pic,
            text=post_data.text,
            image_url=post_data.image_url,
            audio_url=post_data.audio_url,
            location=post_data.location,
            likes=0,
            liked_by=[],
            comments=[],
            shares=0,
            created_at=post_dict["created_at"].isoformat(),
            build_data=build_data
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating post: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Failed to create post")



    


@app.get('/forum/posts',
         summary="Get forum posts",
         description="Retrieve all forum posts with user profile information",
         response_description="List of posts with complete user data")
async def get_forum_posts(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    limit: int = Query(20, description="Number of posts to return"),
    last_post_id: str = Query(None, description="Last post ID for pagination")
):
    try:
        # Verify token
        decoded_token = auth.verify_id_token(credentials.credentials)
        user_uid = decoded_token['uid']

        # Query posts with pagination support
        posts_ref = db.collection("forum_posts").order_by("created_at", direction=firestore.Query.DESCENDING)
        
        if last_post_id:
            last_post = db.collection("forum_posts").document(last_post_id).get()
            if last_post.exists:
                posts_ref = posts_ref.start_after(last_post)

        posts = posts_ref.limit(limit).stream()

        # Batch fetch user profiles for optimization
        user_ids = set()
        post_list = []
        
        # First pass to collect all user IDs
        for post in posts:
            post_data = post.to_dict()
            user_ids.add(post_data['user_id'])
            post_list.append({
                **post_data,
                'id': post.id
            })

        # Batch fetch user profiles
        users_ref = db.collection("users")
        user_profiles = {}
        for user_id in user_ids:
            user_doc = users_ref.document(user_id).get()
            if user_doc.exists:
                user_data = user_doc.to_dict()
                user_profiles[user_id] = {
                    'profile_picture': user_data.get('profile', {}).get('profile_picture'),
                    'username': user_data.get('profile', {}).get('username', user_data.get('email', '').split('@')[0])
                }

        # Second pass to enrich post data
        enriched_posts = []
        for post in post_list:
            # Convert Firestore data types
            post_data = convert_document_references(post)
            post_data = convert_firestore_timestamp(post_data)

            # Add user profile data
            user_info = user_profiles.get(post_data['user_id'], {})
            post_data['profile_picture'] = user_info.get('profile_picture')
            if 'username' not in post_data:
                post_data['username'] = user_info.get('username')

            # Check if current user liked this post
            post_data['liked'] = user_uid in post_data.get('liked_by', [])

            # Include build data if present
            if post_data.get('build_id'):
                build_user_id = post_data['user_id']
                build_ref = db.collection("users").document(build_user_id)\
                              .collection("builds").document(post_data['build_id'])
                build_doc = build_ref.get()
                if build_doc.exists:
                    build_data = convert_firestore_timestamp(build_doc.to_dict())
                    build_data = convert_document_references(build_data)
                    post_data['build_data'] = build_data

            enriched_posts.append(post_data)

        return JSONResponse(content=enriched_posts)

    except Exception as e:
        logger.error(f"Error retrieving posts: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve posts"
        )

@app.post('/forum/posts/{post_id}/like',
          summary="Like or unlike a post",
          description="Toggle like status for a forum post",
          response_description="Updated like count")
def toggle_post_like(
    post_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    try:
        decoded_token = auth.verify_id_token(credentials.credentials)
        user_uid = decoded_token['uid']
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    try:
        post_ref = db.collection("forum_posts").document(post_id)
        post_doc = post_ref.get()

        if not post_doc.exists:
            raise HTTPException(status_code=404, detail="Post not found")

        post_data = post_doc.to_dict()
        liked_by = post_data.get("liked_by", [])
        likes = post_data.get("likes", 0)
        post_owner_uid = post_data.get("user_id")
        
        # Check if this is a like or unlike action
        is_like_action = user_uid not in liked_by

        if is_like_action:
            # Like action
            liked_by.append(user_uid)
            likes += 1
        else:
            # Unlike action
            liked_by.remove(user_uid)
            likes -= 1

        # Update the post
        post_ref.update({
            "likes": likes,
            "liked_by": liked_by
        })

        # Only send notification for like actions (not unlikes)
        if is_like_action and post_owner_uid != user_uid:  # Don't notify if user liked their own post
            threading.Thread(
                target=notify_post_like,
                args=(user_uid, post_owner_uid, post_id)
            ).start()

        return {"likes": likes, "liked": is_like_action}

    except Exception as e:
        logger.error(f"Error toggling like: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail="Failed to toggle like"
        )

@app.post('/forum/posts/{post_id}/comments')
async def add_comment(
    post_id: str,
    comment_data: CommentCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    try:
        # Verify user
        decoded_token = auth.verify_id_token(credentials.credentials)
        user_uid = decoded_token['uid']
        
        # Validate comment content
        if not comment_data.text.strip() and not comment_data.image_url:
            raise HTTPException(
                status_code=400,
                detail="Comment must have either text or image"
            )

        # Get post and author info
        post_ref = db.collection("forum_posts").document(post_id)
        post_doc = post_ref.get()
        
        if not post_doc.exists:
            raise HTTPException(status_code=404, detail="Post not found")
            
        post_data = post_doc.to_dict()
        post_author_uid = post_data.get("user_id")

        # Get commenter info
        user_doc = db.collection("users").document(user_uid).get()
        user_data = user_doc.to_dict() or {}
        user_profile = user_data.get("profile", {})
        username = user_profile.get("username", user_data.get("email", "").split("@")[0])
        profile_pic = user_profile.get("profile_picture_url")

        # Create comment with client timestamp
        comment_id = str(uuid.uuid4())
        comment = {
            "user_id": user_uid,
            "username": username,
            "text": comment_data.text.strip(),
            "image_url": comment_data.image_url,
            "comment_id": comment_id,
            "profile_picture_url": profile_pic,
            "created_at": datetime.now().isoformat()
        }

        # Add comment to array in the post document
        post_ref.update({
            "comments": firestore.ArrayUnion([comment])
        })

        # Add comment to a subcollection with server timestamp
        comment_ref = post_ref.collection("comments").document(comment_id)
        comment_ref.set({
            **comment,
            "created_at": firestore.SERVER_TIMESTAMP
        })

        # Send notification to post author
        if post_author_uid and post_author_uid != user_uid:
            notification_ref = db.collection("notifications").document()
            notification_data = {
                "recipient_uid": post_author_uid,
                "sender_uid": user_uid,
                "sender_name": username,
                "sender_image": profile_pic,
                "type": "new_comment",
                "object_id": post_id,
                "message": f"{username} commented on your post",
                "is_read": False,
                "created_at": firestore.SERVER_TIMESTAMP,
                "metadata": {
                    "comment_preview": comment_data.text[:100] + "..." if comment_data.text else "",
                    "post_preview": post_data.get("text", "")[:100] + "..." if post_data.get("text") else ""
                }
            }
            notification_ref.set(notification_data)

        return comment

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error adding comment: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail="Failed to add comment"
        )


@app.delete('/forum/posts/{post_id}',
          summary="Delete a forum post",
          description="Delete a forum post if the requesting user is the owner",
          response_description="Success message")
async def delete_forum_post(
    post_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    try:
        # Verify token and get user UID
        decoded_token = auth.verify_id_token(credentials.credentials)
        user_uid = decoded_token['uid']
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    try:
        # Get the post document
        post_ref = db.collection("forum_posts").document(post_id)
        post_doc = post_ref.get()

        # Check if post exists
        if not post_doc.exists:
            raise HTTPException(status_code=404, detail="Post not found")

        post_data = post_doc.to_dict()

        # Verify ownership
        if post_data.get('user_id') != user_uid:
            raise HTTPException(
                status_code=403,
                detail="You can only delete your own posts"
            )

        # Delete the post
        post_ref.delete()

        return {"message": "Post deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting post: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to delete post"
        )


@app.post('/upload-forum-image')
async def upload_forum_image(
    file: UploadFile = File(...),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    try:
        # Verify token
        decoded_token = auth.verify_id_token(credentials.credentials)
        user_uid = decoded_token['uid']

        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(400, detail="Only image files are allowed")

        # Generate unique filename with forum_post_images folder
        file_ext = file.filename.split('.')[-1]
        filename = f"forum_post_images/{user_uid}/{uuid.uuid4()}.{file_ext}"

        # Upload to Firebase Storage
        bucket = storage.bucket()
        blob = bucket.blob(filename)
        
        # Upload the file
        contents = await file.read()
        blob.upload_from_string(contents, content_type=file.content_type)
        
        # Make the file publicly readable
        blob.make_public()
        
        return {"url": blob.public_url}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload forum image: {str(e)}"
        )


@app.post('/upload-comment-image')
async def upload_comment_image(
    file: UploadFile = File(...),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    try:
        # Verify token
        decoded_token = auth.verify_id_token(credentials.credentials)
        user_uid = decoded_token['uid']

        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(400, detail="Only image files are allowed")

        # Generate unique filename
        file_ext = file.filename.split('.')[-1]
        filename = f"comments/{user_uid}/{uuid.uuid4()}.{file_ext}"

        # Upload to Firebase Storage
        bucket = storage.bucket()
        blob = bucket.blob(filename)
        
        # Upload the file
        contents = await file.read()
        blob.upload_from_string(contents, content_type=file.content_type)
        
        # Make the file publicly readable
        blob.make_public()
        
        return {"image_url": blob.public_url}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload image: {str(e)}"
        )


@app.delete('/forum/posts/{post_id}/comments/{comment_id}',
          summary="Delete a comment",
          description="Delete a comment if the requesting user is the comment author or post owner",
          response_description="Success message")
async def delete_comment(
    post_id: str,
    comment_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    try:
        # Verify token and get user UID
        decoded_token = auth.verify_id_token(credentials.credentials)
        user_uid = decoded_token['uid']
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    try:
        # Get the post document
        post_ref = db.collection("forum_posts").document(post_id)
        post_doc = post_ref.get()

        # Check if post exists
        if not post_doc.exists:
            raise HTTPException(status_code=404, detail="Post not found")

        post_data = post_doc.to_dict()
        comments = post_data.get('comments', [])

        # Find the comment to delete
        comment_to_delete = None
        comment_index = -1
        
        for i, comment in enumerate(comments):
            if comment.get('comment_id') == comment_id:
                comment_to_delete = comment
                comment_index = i
                break

        if not comment_to_delete:
            raise HTTPException(status_code=404, detail="Comment not found")

        # Check if user has permission (either comment author or post owner)
        is_comment_author = comment_to_delete.get('user_id') == user_uid
        is_post_owner = post_data.get('user_id') == user_uid

        if not (is_comment_author or is_post_owner):
            raise HTTPException(
                status_code=403,
                detail="You can only delete your own comments or comments on your posts"
            )

        # Remove the comment from the array
        updated_comments = [
            comment for comment in comments 
            if comment.get('comment_id') != comment_id
        ]

        # Update the post with the modified comments array
        post_ref.update({
            'comments': updated_comments
        })

        return {"message": "Comment deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting comment: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to delete comment"
        )




    

@app.post('/follow-user')
async def follow_user(
    follow_data: FollowUserRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    try:
        # Verify user
        decoded_token = auth.verify_id_token(credentials.credentials)
        current_user_uid = decoded_token['uid']
        target_user_uid = follow_data.target_uid

        # Validate request
        if current_user_uid == target_user_uid:
            raise HTTPException(status_code=400, detail="Cannot follow yourself")

        # Check if target user exists
        target_user_ref = db.collection("users").document(target_user_uid)
        target_user_doc = target_user_ref.get()
        if not target_user_doc.exists:
            raise HTTPException(status_code=404, detail="User not found")

        # Get current user data
        current_user_ref = db.collection("users").document(current_user_uid)
        current_user_doc = current_user_ref.get()
        current_user_data = current_user_doc.to_dict() or {}
        
        # Get profile data for notification
        current_profile = current_user_data.get("profile", {})
        current_username = current_profile.get("username", "Someone")
        current_profile_pic = current_profile.get("profile_picture_url")

        # Toggle follow status
        following = current_user_data.get("following", [])
        is_following = target_user_uid in following
        
        if is_following:
            # Unfollow
            following.remove(target_user_uid)
            action = "unfollowed"
        else:
            # Follow
            following.append(target_user_uid)
            action = "followed"
            
            # Create notification for the target user
            notification_ref = db.collection("notifications").document()
            notification_data = {
                "recipient_uid": target_user_uid,
                "sender_uid": current_user_uid,
                "sender_name": current_username,
                "sender_image": current_profile_pic,
                "type": "new_follower",
                "object_id": current_user_uid,
                "message": f"{current_username} started following you",
                "is_read": False,
                "created_at": firestore.SERVER_TIMESTAMP,
                "metadata": {
                    "follower_count": len(following) + 1  # +1 because we haven't updated yet
                }
            }
            notification_ref.set(notification_data)

        # Update following list
        current_user_ref.update({"following": following})

        return {
            "action": action,
            "currently_following": not is_following,
            "following_count": len(following)
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in follow operation: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail="Failed to process follow request"
        )
    


@app.get('/forum/following-posts',
         summary="Get posts from followed users",
         description="Returns all forum posts from users that the current user follows",
         response_description="List of posts from followed users")
async def get_following_posts(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    try:
        # Verify token and get current user
        decoded_token = auth.verify_id_token(credentials.credentials)
        current_user_uid = decoded_token['uid']

        # Get the current user's following list
        user_ref = db.collection("users").document(current_user_uid)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        user_data = user_doc.to_dict()
        following = user_data.get("following", [])
        
        # If not following anyone, return empty array
        if not following:
            return []

        # Query posts from followed users, ordered by date (newest first)
        posts_ref = db.collection("forum_posts")\
                      .where("user_id", "in", following)\
                      .order_by("created_at", direction=firestore.Query.DESCENDING)
        
        posts = posts_ref.stream()
        post_list = []

        for post in posts:
            post_data = post.to_dict()
            post_data['id'] = post.id

            # Convert Firestore DocumentReferences to strings
            post_data = convert_document_references(post_data)

            # Convert Firestore timestamps
            post_data = convert_firestore_timestamp(post_data)

            # Check if current user liked this post
            post_data['liked'] = current_user_uid in post_data.get('liked_by', [])

            # Include build data if exists
            if post_data.get('build_id'):
                build_user_id = post_data['user_id']
                build_ref = db.collection("users").document(build_user_id)\
                                .collection("builds").document(post_data['build_id'])
                build_doc = build_ref.get()
                if build_doc.exists:
                    build_data = convert_firestore_timestamp(build_doc.to_dict())
                    build_data = convert_document_references(build_data)
                    post_data['build_data'] = build_data

            post_list.append(post_data)

        return JSONResponse(content=post_list)

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error retrieving following posts: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve posts from followed users"
        )


@app.get("/get-followers-count")
async def get_followers_count(uid: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        # Verify token
        auth.verify_id_token(credentials.credentials)

        # Query followers
        query_ref = db.collection("users").where("following", "array_contains", uid)
        followers = query_ref.get()  

        return {"follower_count": len(followers)}

    except Exception as e:
        print("Error fetching follower count:", traceback.format_exc())
        raise HTTPException(status_code=500, detail="Failed to fetch follower count")


@app.get('/user-posts/{user_uid}',
         summary="Get all posts by a specific user",
         description="Returns all forum posts created by the specified user",
         response_description="List of user's posts")
async def get_user_posts(
    user_uid: str = Path(..., description="The UID of the user whose posts to retrieve"),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    def clean_firestore_data(data):
        def clean(value):
            if isinstance(value, firestore.DocumentReference):
                return str(value.path)  # or return None if you want to hide the path
            elif isinstance(value, dict):
                return {k: clean(v) for k, v in value.items()}
            elif isinstance(value, list):
                return [clean(v) for v in value]
            return value
        return clean(data)

    try:
        # Verify token
        decoded_token = auth.verify_id_token(credentials.credentials)
        requesting_user_uid = decoded_token['uid']

        # Check if target user exists
        user_ref = db.collection("users").document(user_uid)
        if not user_ref.get().exists:
            raise HTTPException(status_code=404, detail="User not found")

        # Query posts by this user
        posts_query = (
            db.collection("forum_posts")
            .where(filter=FieldFilter("user_id", "==", user_uid))
            .order_by("created_at", direction=firestore.Query.DESCENDING)
        )
        
        posts = posts_query.stream()

        post_list = []
        for post in posts:
            post_data = post.to_dict()
            post_data['id'] = post.id
            
            # Convert Firestore timestamps
            post_data = convert_firestore_timestamp(post_data)
            
            # Check if current user liked this post
            post_data['liked'] = requesting_user_uid in post_data.get('liked_by', [])

            # If there's a build reference, include build data
            if post_data.get('build_id'):
                build_ref = db.collection("users").document(user_uid).collection("builds").document(post_data['build_id'])
                build_doc = build_ref.get()
                if build_doc.exists:
                    build_data = convert_firestore_timestamp(build_doc.to_dict())
                    post_data['build_data'] = clean_firestore_data(build_data)

            # Clean out unserializable data
            post_list.append(clean_firestore_data(post_data))

        return JSONResponse(content=post_list)

    except firebase_admin.auth.InvalidIdTokenError:
        raise HTTPException(status_code=401, detail="Invalid authentication token")
    except firebase_admin.auth.ExpiredIdTokenError:
        raise HTTPException(status_code=401, detail="Expired authentication token")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error retrieving user posts: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve user posts"
        )


@app.post('/post-build-with-tweet',
          summary="Create a forum post with a build",
          description="Creates a forum post that showcases one of the user's PC builds",
          response_description="The created post with build details")
async def post_build_with_tweet(
    post_data: PostBuildWithTweet,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    try:
        # Verify the user
        decoded_token = auth.verify_id_token(credentials.credentials)
        user_uid = decoded_token['uid']
        user_email = decoded_token.get('email', '')

        # Verify the build exists and belongs to this user
        build_ref = db.collection("users").document(user_uid).collection("builds").document(post_data.build_id)
        build_doc = build_ref.get()
        
        if not build_doc.exists:
            raise HTTPException(
                status_code=404,
                detail="Build not found or doesn't belong to user"
            )

        # Get username from profile or use email prefix
        user_doc = db.collection("users").document(user_uid).get()
        username = "user"
        if user_doc.exists:
            profile = user_doc.to_dict().get("profile", {})
            username = profile.get("name", user_email.split("@")[0])

        # Create the post
        post_ref = db.collection("forum_posts").document()
        post_dict = {
            "user_id": user_uid,
            "username": username,
            "text": post_data.text,
            "image_url": post_data.image_url,
            "audio_url": post_data.audio_url,
            "location": post_data.location,
            "likes": 0,
            "liked_by": [],
            "comments": [],
            "shares": 0,
            "created_at": datetime.now(),
            "build_id": post_data.build_id
        }
        
        post_ref.set(post_dict)

        # Get the build data to include in response
        build_data = build_doc.to_dict()
        
        # Convert component references to component data
        components = {}
        for component_type, component_ref in build_data['components'].items():
            component_doc = component_ref.get()
            if component_doc.exists:
                components[component_type] = component_doc.to_dict()

        return {
            **post_dict,
            "id": post_ref.id,
            "build_data": {
                "name": build_data['name'],
                "description": build_data['description'],
                "createdAt": build_data['createdAt'].isoformat(),
                "components": components
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating build post: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to create build post"
        )

@app.get('/stores')
async def list_stores():
    """
    List all available stores with basic information (public endpoint).
    
    Returns:
    - List of stores with ID, name, address, and location
    """
    try:
        stores_ref = db.collection("stores")
        docs = stores_ref.stream()
        
        stores_list = []
        for doc in docs:
            store_data = doc.to_dict()
            stores_list.append({
                "store_id": doc.id,
                "name": store_data.get("name"),
                "address": store_data.get("address"),
                "location": store_data.get("location"),
                "rating": store_data.get("rating")
            })
        
        return stores_list
        
    except Exception as e:
        logger.error(f"Error listing stores: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve store list"
        )

@app.get('/stores/{store_id}/inventory')
async def get_store_inventory(
    store_id: str = Path(..., description="ID of the store to get inventory for"),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Get complete inventory of a specific store (without discounts).
    
    Returns:
    - store_id: ID of the store
    - store_name: Name of the store
    - address: Physical address
    - inventory: Dictionary of categories with items containing:
        - item_id: Unique identifier
        - name: Product name
        - quantity: Stock count
        - price: Regular price in IDR
    """
    try:
        # Verify the token
        decoded_token = auth.verify_id_token(credentials.credentials)
        
        # Get store document
        store_ref = db.collection("stores").document(store_id)
        store_doc = store_ref.get()
        
        if not store_doc.exists: 
            raise HTTPException(status_code=404, detail="Store not found")
        
        store_data = store_doc.to_dict()
        
        # Build simplified response
        response = {
            "store_id": store_id,
            "store_name": store_data.get("name"),
            "address": store_data.get("address"),
            "inventory": {}
        }
        
        # Process inventory without discounts
        for category, items in store_data.get("inventory", {}).items():
            response["inventory"][category] = [
                {
                    "item_id": item_id,
                    "name": details.get("name"),
                    "quantity": details.get("quantity", 0),
                    "price": details.get("price")
                }
                for item_id, details in items.items()
            ]
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching inventory: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve inventory"
        )
    
####################################### NOTIFICATIONS ENDPOINTS ################################

@app.get('/notifications',
         response_model=List[NotificationResponse],
         summary="Get user notifications",
         description="Retrieve all notifications for the current user",
         response_description="List of notifications")
async def get_user_notifications(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    limit: int = Query(20, description="Number of notifications to return"),
    unread_only: bool = Query(False, description="Return only unread notifications")
):
    try:
        # Verify user
        decoded_token = auth.verify_id_token(credentials.credentials)
        user_uid = decoded_token['uid']
        
        # Query notifications
        notifications_ref = db.collection("notifications")
        query = notifications_ref.where("recipient_uid", "==", user_uid)
        
        if unread_only:
            query = query.where("is_read", "==", False)
            
        notifications = query.order_by("created_at", direction=firestore.Query.DESCENDING).limit(limit).stream()
        
        notification_list = []
        for notif in notifications:
            notif_data = notif.to_dict()
            notif_data['id'] = notif.id
            # Convert Firestore timestamp to datetime
            if 'created_at' in notif_data:
                notif_data['created_at'] = notif_data['created_at'].isoformat()
            notification_list.append(notif_data)
        
        return notification_list

    except Exception as e:
        print(f"Error fetching notifications: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve notifications"
        )

@app.post('/notifications/{notification_id}/read',
          summary="Mark notification as read",
          description="Mark a specific notification as read",
          response_description="Confirmation of update")
async def mark_notification_as_read(
    notification_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    try:
        # Verify user
        decoded_token = auth.verify_id_token(credentials.credentials)
        user_uid = decoded_token['uid']
        
        # Get the notification
        notif_ref = db.collection("notifications").document(notification_id)
        notif_doc = notif_ref.get()
        
        if not notif_doc.exists:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        notif_data = notif_doc.to_dict()
        
        # Verify the notification belongs to the user
        if notif_data.get('recipient_uid') != user_uid:
            raise HTTPException(status_code=403, detail="Not authorized to modify this notification")
        
        # Update the notification
        notif_ref.update({"is_read": True})
        
        return {"status": "success", "message": "Notification marked as read"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error marking notification as read: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to update notification"
        )


#################################################################################################################


if __name__ == "__main__":
    uvicorn.run("main:app", reload=True, host="0.0.0.0", port=5049)