import os
import random
import smtplib
import ssl
from html import escape
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from pathlib import Path

import bcrypt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from . import models
from .database import get_db

load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")

SECRET_KEY = os.getenv("SECRET_KEY") or "development-secret-key"
ALGORITHM = os.getenv("ALGORITHM") or "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token")


def _clean_config_value(value: str | None) -> str | None:
    clean_value = (value or "").strip()
    return clean_value or None


def _bcrypt_bytes(password: str) -> bytes:
    return password.encode("utf-8")[:72]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_bcrypt_bytes(password), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(_bcrypt_bytes(plain_password), hashed_password.encode("utf-8"))
    except (TypeError, ValueError):
        return False


def generate_otp_code(length: int = 6) -> str:
    return "".join(str(random.randint(0, 9)) for _ in range(length))


def create_invite_token(invite_id: int, invitee_email: str, expires_delta: timedelta | None = None) -> str:
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(days=7))
    return jwt.encode(
        {"invite_id": invite_id, "email": invitee_email.lower(), "exp": expire},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def decode_invite_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise ValueError("Invalid or expired invitation link.") from exc
    if not payload.get("invite_id") or not payload.get("email"):
        raise ValueError("Invalid invitation link.")
    return payload


def _send_email_message(
    message: EmailMessage,
    smtp_host: str,
    smtp_port: int,
    smtp_username: str,
    smtp_password: str,
    use_tls: bool = True,
) -> None:
    if smtp_port == 465:
        with smtplib.SMTP_SSL(smtp_host, smtp_port, context=ssl.create_default_context(), timeout=20) as server:
            server.login(smtp_username, smtp_password)
            server.send_message(message)
        return

    with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as server:
        server.ehlo()
        if use_tls:
            server.starttls(context=ssl.create_default_context())
            server.ehlo()
        server.login(smtp_username, smtp_password)
        server.send_message(message)


def send_password_reset_email(recipient_email: str, otp_code: str) -> None:
    smtp_host = _clean_config_value(os.getenv("SMTP_HOST"))
    smtp_port = int(_clean_config_value(os.getenv("SMTP_PORT")) or "587")
    smtp_username = _clean_config_value(os.getenv("SMTP_USERNAME"))
    smtp_password = _clean_config_value(os.getenv("SMTP_PASSWORD"))
    smtp_from = _clean_config_value(os.getenv("SMTP_FROM_EMAIL")) or smtp_username or "no-reply@example.com"

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

    _send_email_message(message, smtp_host, smtp_port, smtp_username, smtp_password)


def send_workspace_invite_email(
    recipient_email: str,
    inviter_name: str,
    invite_link: str,
    workspace_name: str = "Automated Routine Creator Workspace",
    smtp_config: dict | None = None,
) -> None:
    smtp_config = smtp_config or {}
    smtp_host = _clean_config_value(smtp_config.get("smtp_host")) or _clean_config_value(os.getenv("SMTP_HOST"))
    smtp_port = int(smtp_config.get("smtp_port") or _clean_config_value(os.getenv("SMTP_PORT")) or "587")
    smtp_username = _clean_config_value(smtp_config.get("smtp_username")) or _clean_config_value(os.getenv("SMTP_USERNAME"))
    smtp_password = _clean_config_value(smtp_config.get("smtp_password")) or _clean_config_value(os.getenv("SMTP_PASSWORD"))
    smtp_from = (
        _clean_config_value(smtp_config.get("smtp_from_email"))
        or _clean_config_value(os.getenv("SMTP_FROM_EMAIL"))
        or smtp_username
        or "no-reply@example.com"
    )
    smtp_use_tls = smtp_config.get("smtp_use_tls")
    if smtp_use_tls is None:
        smtp_use_tls = True

    if not smtp_host or not smtp_username or not smtp_password:
        raise RuntimeError("Workspace invite email is not configured on the server.")

    safe_inviter_name = escape(inviter_name)
    safe_recipient_email = escape(recipient_email)
    safe_workspace_name = escape(workspace_name)
    safe_invite_link = escape(invite_link, quote=True)

    message = EmailMessage()
    message["Subject"] = f"{inviter_name} invited you to join {workspace_name}"
    message["From"] = smtp_from
    message["To"] = recipient_email
    message.set_content(
        f"{inviter_name} invited you to join {workspace_name}.\n\n"
        f"Accept invite: {invite_link}\n\n"
        "If you do not have an account yet, you can register with this email after accepting."
    )
    message.add_alternative(
        f"""
        <!doctype html>
        <html>
        <body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#172033;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fb;padding:28px 12px;">
                <tr>
                    <td align="center">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e4e8f0;">
                            <tr>
                                <td style="padding:28px 30px;border-bottom:1px solid #edf0f5;">
                                    <div style="font-size:22px;line-height:1.4;font-weight:700;">{safe_inviter_name} invited you to join Workspace</div>
                                    <div style="margin-top:14px;padding:18px;border:1px solid #edf0f5;border-radius:14px;background:#fbfcff;">
                                        <div style="font-size:16px;line-height:1.5;">{safe_workspace_name}</div>
                                        <div style="margin-top:8px;color:#687386;font-size:14px;">Invitation for {safe_recipient_email}</div>
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:26px 30px;text-align:center;">
                                    <a href="{safe_invite_link}" style="display:block;background:#111827;color:#ffffff;text-decoration:none;border-radius:10px;padding:16px 18px;font-size:17px;font-weight:700;">Accept Invite</a>
                                    <div style="margin-top:18px;color:#8a94a6;font-size:14px;">Open this link to join the workspace.</div>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:20px 30px;border-top:1px solid #edf0f5;color:#8a94a6;font-size:12px;text-align:center;">Automated Routine Creator</td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """,
        subtype="html",
    )

    _send_email_message(message, smtp_host, smtp_port, smtp_username, smtp_password, use_tls=bool(smtp_use_tls))


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
