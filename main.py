from fastapi import FastAPI # type: ignore
import uvicorn # type: ignore
import firebase_admin # type: ignore
from firebase_admin import credentials, auth # type: ignore
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
from google.cloud import firestore



db = firestore.Client()

app = FastAPI(
    description="RigVana's backend",
    title="Rigvana Backend"
)

# For firebase configs

if not firebase_admin._apps:
    cred = credentials.Certificate("nuclearlaunchcode.json")
    firebase_admin.initialize_app(cred)


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


# for reset pass otp
env_path = Path(__file__).parent / "email.env"
load_dotenv(dotenv_path=env_path)
EMAIL_ADDRESS = os.getenv("EMAIL_ADDRESS")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
otp_store: Dict[str, Dict[str, str]] = {}



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
#################################################################################################################


if __name__ == "__main__":
    uvicorn.run("main:app", reload=True, host="127.0.0.1", port=5049)