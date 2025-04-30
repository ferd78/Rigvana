from fastapi import FastAPI
import uvicorn
import firebase_admin
from firebase_admin import credentials, auth
import pyrebase
from pydantic import BaseModel
from fastapi.responses import JSONResponse
from fastapi.exceptions import HTTPException
from fastapi.requests import Request

app = FastAPI(
    description="RigVana's backend",
    title="Rigvana Backend"
)


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


######################################################### SCHEMAS ############################################

class SignupSchema(BaseModel):
    email: str
    password: str


class LoginSchema(BaseModel):
    email: str
    password: str


#################################################################################################################



######################################################### ENDPOINTS ############################################

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



#################################################################################################################


if __name__ == "__main__":
    uvicorn.run("main:app", reload=True, host="127.0.0.1", port=5049)

