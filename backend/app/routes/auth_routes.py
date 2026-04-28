from datetime import datetime, timedelta
import smtplib

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..auth import (
    create_access_token,
    generate_otp_code,
    hash_password,
    send_password_reset_email,
    verify_password,
)
from ..database import get_db

router = APIRouter(tags=["Authentication"])


# Register User
@router.post("/register", response_model=schemas.MessageResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    payload: schemas.UserRegister,
    db: Session = Depends(get_db)
):
    existing_user = crud.get_user_by_email(db, payload.email)

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email is already registered."
        )

    user = crud.create_user(
        db=db,
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password)
    )

    return schemas.MessageResponse(message="Registered successfully. Please login to continue.")


# Login User (FIXED FOR SWAGGER AUTHORIZE)
@router.post("/login", response_model=schemas.Token)
def login_user(
    user_data: schemas.UserLogin,
    db: Session = Depends(get_db)
):
    user = crud.get_user_by_email(db, user_data.email)

    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password."
        )

    token = create_access_token({"sub": str(user.id)})

    return schemas.Token(
        access_token=token,
        user=user
    )

@router.post("/token")
def swagger_login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = crud.get_user_by_email(db, form_data.username)

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password."
        )

    token = create_access_token({"sub": str(user.id)})

    return {
        "access_token": token,
        "token_type": "bearer"
    }


@router.post("/forgot-password/request", response_model=schemas.MessageResponse)
def request_password_reset(
    payload: schemas.PasswordResetRequest,
    db: Session = Depends(get_db),
):
    user = crud.get_user_by_email(db, payload.email)
    if not user:
        raise HTTPException(status_code=404, detail="Email is not registered.")

    otp_code = generate_otp_code()
    crud.create_password_reset_otp(
        db,
        user.id,
        hash_password(otp_code),
        datetime.utcnow() + timedelta(minutes=10),
    )
    try:
        send_password_reset_email(user.email, otp_code)
        return schemas.MessageResponse(message="OTP sent successfully. Enter OTP and new password.")
    except RuntimeError:
        raise HTTPException(
            status_code=500,
            detail="Password reset email is not configured on the server.",
        )
    except smtplib.SMTPAuthenticationError:
        raise HTTPException(
            status_code=500,
            detail="SMTP login failed. For Gmail, use a 16-character App Password, not your normal Gmail password.",
        )
    except (smtplib.SMTPException, OSError) as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not send OTP email: {exc}",
        )


@router.post("/forgot-password/verify", response_model=schemas.MessageResponse)
def verify_password_reset(
    payload: schemas.PasswordResetVerify,
    db: Session = Depends(get_db),
):
    user = crud.get_user_by_email(db, payload.email)
    if not user:
        raise HTTPException(status_code=404, detail="Email is not registered.")

    db_otp = crud.get_active_password_reset_otp(db, user.id)
    if not db_otp:
        raise HTTPException(status_code=400, detail="OTP expired or not requested.")

    if not verify_password(payload.otp, db_otp.otp_hash):
        raise HTTPException(status_code=400, detail="Invalid OTP.")

    crud.update_user_password(db, user, hash_password(payload.new_password))
    crud.consume_password_reset_otp(db, db_otp)
    return schemas.MessageResponse(message="Password reset successful. Please login again.")
