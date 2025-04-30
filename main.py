<<<<<<< HEAD
from fastapi import FastAPI # type: ignore
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
from pathlib import Path
import traceback


# For firebase configs
=======
from fastapi import FastAPI
import uvicorn
import firebase_admin
from firebase_admin import credentials, auth
import pyrebase
from pydantic import BaseModel
from fastapi.responses import JSONResponse
from fastapi.exceptions import HTTPException
from fastapi.requests import Request
>>>>>>> b2024ae856e1cec60a8afde5ca10309399e9cab7

app = FastAPI(
    description="RigVana's backend",
    title="Rigvana Backend"
)


if not firebase_admin._apps:
    cred = credentials.Certificate("nuclearlaunchcode.json")
    firebase_admin.initialize_app(cred)
<<<<<<< HEAD
    db = firestore.client()

=======
>>>>>>> b2024ae856e1cec60a8afde5ca10309399e9cab7


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


<<<<<<< HEAD
# for reset pass otp
env_path = Path(__file__).parent / "email.env"
load_dotenv(dotenv_path=env_path)
EMAIL_ADDRESS = os.getenv("EMAIL_ADDRESS")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
otp_store: Dict[str, Dict[str, str]] = {}



=======
>>>>>>> b2024ae856e1cec60a8afde5ca10309399e9cab7
######################################################### SCHEMAS ############################################

class SignupSchema(BaseModel):
    email: str
    password: str


class LoginSchema(BaseModel):
    email: str
    password: str

<<<<<<< HEAD
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
=======

#################################################################################################################



######################################################### ENDPOINTS ############################################
>>>>>>> b2024ae856e1cec60a8afde5ca10309399e9cab7

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

<<<<<<< HEAD
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


@app.post('/create-build')
async def create_build(build_data: BuildCreateSchema, request: Request):
    # Verify user token and get UID
    headers = request.headers
    jwt = headers.get('authorization')  # Note: Corrected typo from 'autherization'
    
    if not jwt:
        raise HTTPException(
            status_code=401,
            detail="Authorization token missing"
        )
    
    try:
        # Verify the token and get user UID
        decoded_token = auth.verify_id_token(jwt)
        user_uid = decoded_token['uid']
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )
    
    # Prepare the build data with Firestore references
    build_dict = {
        "name": build_data.name,
        "description": build_data.description,
        "createdAt": datetime.now(),
        "components": {
            "cpu": db.collection("cpu").document(build_data.components.cpu),
            "gpu": db.collection("gpu").document(build_data.components.gpu),
            "motherboard": db.collection("motherboard").document(build_data.components.motherboard),
            "ram": db.collection("ram").document(build_data.components.ram),
            "storage": db.collection("storage").document(build_data.components.storage),
            "cooling": db.collection("cooling").document(build_data.components.cooling),
            "psu": db.collection("psu").document(build_data.components.psu),
            "case": db.collection("case").document(build_data.components.case)
        }
    }
    
    try:
        # Add the build to the user's builds subcollection
        builds_ref = db.collection("users").document(user_uid).collection("builds")
        new_build_ref = builds_ref.add(build_dict)
        
        return JSONResponse(
            content={
                "message": "Build created successfully",
                "build_id": new_build_ref[1].id
            },
            status_code=201
        )
    except Exception as e:
        print(f"Error creating build: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to create build"
        )
    

@app.get('/get-builds')
async def get_user_builds(request: Request):
    # Verify user token and get UID
    headers = request.headers
    jwt = headers.get('authorization')
    
    if not jwt:
        raise HTTPException(
            status_code=401,
            detail="Authorization token missing"
        )
    
    try:
        decoded_token = auth.verify_id_token(jwt)
        user_uid = decoded_token['uid']
    except Exception as e:
        raise HTTPException(
            status_code=401,
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
            status_code=500,
            detail="Failed to retrieve builds"
        )
=======


>>>>>>> b2024ae856e1cec60a8afde5ca10309399e9cab7
#################################################################################################################


if __name__ == "__main__":
<<<<<<< HEAD
    uvicorn.run("main:app", reload=True, host="0.0.0.0", port=5049)
=======
    uvicorn.run("main:app", reload=True, host="127.0.0.1", port=5049)

>>>>>>> b2024ae856e1cec60a8afde5ca10309399e9cab7
