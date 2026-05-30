from datetime import datetime, timedelta, timezone
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
# Auth endpoints removed. 
# Mobile app now uses Supabase Auth directly for register, login, and forgot-password flows.
