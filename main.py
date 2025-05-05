import datetime as dt  
from fastapi import FastAPI, Depends, HTTPException, status # type: ignore
import uvicorn # type: ignore
import firebase_admin # type: ignore
from firebase_admin import credentials, auth, firestore # type: ignore
import pyrebase # type: ignore
from pydantic import BaseModel # type: ignore
from fastapi.responses import JSONResponse # type: ignore
from fastapi.exceptions import HTTPException # type: ignore
from fastapi.requests import Request # type: ignore
import random, time
from typing import Dict
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

# For firebase configs

app = FastAPI(
    description="RigVana's backend",
    title="Rigvana Backend"
)


if not firebase_admin._apps:
    cred = credentials.Certificate("nuclearlaunchcode.json")
    firebase_admin.initialize_app(cred)


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
    expires_at = time.time() + 300  # 5 minutes expiry
    otp_store[email] = {"otp": otp, "expires_at": expires_at}

    # Send OTP via email
    send_email(email, f"Your RigVana OTP is: {otp}")

    return {"message": "OTP sent to your email."}

@app.post("/verify-otp")
async def verify_otp(data: OTPVerify):
    email = data.email
    otp = data.otp

    record = otp_store.get(email)
    if not record or time.time() > record["expires_at"]:
        raise HTTPException(status_code=400, detail="OTP expired or not found.")
    
    if record["otp"] != otp:
        raise HTTPException(status_code=401, detail="Invalid OTP.")

    return {"message": "OTP verified. You can now reset your password."}

@app.post("/reset-password")
async def reset_password(data: ResetPassword):
    email = data.email
    otp = data.otp
    new_password = data.new_password

    record = otp_store.get(email)
    if not record or time.time() > record["expires_at"]:
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
    otp_store.pop(email, None)

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
              401: {"description": "Invalid or missing authentication token"},
              500: {"description": "Internal server error"}
          })
async def create_build(
    build_data: BuildCreateSchema,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Create a new PC build for the authenticated user.
    
    Requires:
    - Valid JWT token in Authorization header (Bearer token)
    - Component document IDs for all required parts
    
    Returns:
    - Success message with the new build ID
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

    # Validate all component references exist
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

    # Check all components exist before creating the build
    for component_type, component_id in component_refs.items():
        doc_ref = db.collection(component_type).document(component_id)
        if not doc_ref.get().exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid {component_type} ID: {component_id}"
            )

    # Prepare the build data with Firestore references
    build_dict = {
        "name": build_data.name,
        "description": build_data.description,
        "createdAt": datetime.now(),
        "components": {
            component_type: db.collection(component_type).document(component_id)
            for component_type, component_id in component_refs.items()
        }
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
        user_ref = db.collection("users").document(user_uid)
        user_ref.set({
            "profile": profile_data.dict()
        }, merge=True)

        return {"message": "Profile updated successfully"}
    except Exception as e:
        print(f"Error updating profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to update user profile")
    


@app.get('/get-profile', summary="Fetch user profile")
async def get_profile(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        decoded_token = auth.verify_id_token(credentials.credentials)
        user_uid = decoded_token['uid']
        user_email = decoded_token.get('email', '')  # Safely get the email
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    try:
        user_doc = db.collection("users").document(user_uid).get()
        if not user_doc.exists:
            raise HTTPException(status_code=404, detail="User not found")

        user_data = user_doc.to_dict()
        profile = user_data.get("profile", {})

        # Add the email to the response
        profile["email"] = user_email

        return profile
    except Exception as e:
        print(f"Error fetching profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve profile")

#################################################################################################################


if __name__ == "__main__":
    uvicorn.run("main:app", reload=True, host="0.0.0.0", port=5049)
