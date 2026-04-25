import os
import random
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from . import models
from .database import get_db

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "development-secret-key")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def generate_otp_code(length: int = 6) -> str:
    return "".join(str(random.randint(0, 9)) for _ in range(length))


def send_password_reset_email(recipient_email: str, otp_code: str) -> None:
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_from = os.getenv("SMTP_FROM_EMAIL", smtp_username or "no-reply@example.com")

    if not smtp_host or not smtp_username or not smtp_password:
        raise RuntimeError("Password reset email is not configured on the server.")

    message = EmailMessage()
    message["Subject"] = "Your Automated Routine Creator OTP"
    message["From"] = smtp_from
    message["To"] = recipient_email
    message.set_content(
        "Use this OTP to reset your password for Automated Routine Creator.\n\n"
        f"OTP: {otp_code}\n\n"
        "This OTP expires in 10 minutes."
    )

    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.starttls()
        server.login(smtp_username, smtp_password)
        server.send_message(message)


def send_workspace_invite_email(recipient_email: str, inviter_name: str, smtp_config: dict | None = None) -> None:
    smtp_config = smtp_config or {}
    smtp_host = smtp_config.get("smtp_host") or os.getenv("SMTP_HOST")
    smtp_port = int(smtp_config.get("smtp_port") or os.getenv("SMTP_PORT", "587"))
    smtp_username = smtp_config.get("smtp_username") or os.getenv("SMTP_USERNAME")
    smtp_password = smtp_config.get("smtp_password") or os.getenv("SMTP_PASSWORD")
    smtp_from = smtp_config.get("smtp_from_email") or os.getenv("SMTP_FROM_EMAIL", smtp_username or "no-reply@example.com")
    smtp_use_tls = smtp_config.get("smtp_use_tls")
    if smtp_use_tls is None:
        smtp_use_tls = True

    if not smtp_host or not smtp_username or not smtp_password:
        raise RuntimeError("Workspace invite email is not configured on the server.")

    message = EmailMessage()
    message["Subject"] = f"{inviter_name} invited you to Automated Routine Creator Workspace"
    message["From"] = smtp_from
    message["To"] = recipient_email
    message.set_content(
        f"{inviter_name} invited you to collaborate in the Automated Routine Creator workspace.\n\n"
        "Log in with this email address to view and accept the invitation from the Project Management page."
    )

    with smtplib.SMTP(smtp_host, smtp_port) as server:
        if smtp_use_tls:
            server.starttls()
        server.login(smtp_username, smtp_password)
        server.send_message(message)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int | None = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError as exc:
        raise credentials_exception from exc

    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    return user
