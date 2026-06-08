from datetime import date
import os
import smtplib
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..auth import create_invite_token, decode_invite_token, get_current_user, send_workspace_invite_email
from ..database import get_db
from ..models import User
from ..rate_limiter import limiter

router = APIRouter(tags=["Project Management"])


def _frontend_invite_url(invite_token: str) -> str:
    configured_frontend = (os.getenv("FRONTEND_URL") or os.getenv("FRONTEND_ORIGIN") or "").strip().rstrip("/")
    if not configured_frontend or configured_frontend == "*":
        configured_frontend = "http://127.0.0.1:5500/AutomatedRoutineCreator/frontend"
    return f"{configured_frontend}/accept-invite.html?{urlencode({'token': invite_token})}"


@router.get("/projects/tasks", response_model=list[schemas.ProjectTaskOut])
@limiter.limit("60/minute")
def list_project_tasks(
    request: Request,
    due_date: date | None = Query(default=None),
    assignee: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    priority: str | None = Query(default=None),
    search: str | None = Query(default=None),
    sort_by: str = Query(default="due_date"),
    sort_order: str = Query(default="asc"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.get_project_tasks(
        db=db,
        user_id=current_user.id,
        due_date=due_date,
        assignee=assignee,
        status=status_filter,
        priority=priority,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.post("/projects/tasks", response_model=schemas.ProjectTaskOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("60/minute")
def create_project_task(
    request: Request,
    payload: schemas.ProjectTaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.create_project_task(db, current_user.id, payload)


@router.put("/projects/tasks/{task_id}", response_model=schemas.ProjectTaskOut)
@limiter.limit("60/minute")
def update_project_task(
    request: Request,
    task_id: int,
    payload: schemas.ProjectTaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_task = crud.get_project_task_by_id(db, task_id, current_user.id)
    if not db_task:
        raise HTTPException(status_code=404, detail="Project task not found.")
    return crud.update_project_task(db, db_task, payload)


@router.delete("/projects/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("60/minute")
def delete_project_task(
    request: Request,
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_task = crud.get_project_task_by_id(db, task_id, current_user.id)
    if not db_task:
        raise HTTPException(status_code=404, detail="Project task not found.")
    crud.delete_project_task(db, db_task)


@router.get("/workspace/invitations", response_model=list[schemas.WorkspaceInviteOut])
@limiter.limit("60/minute")
def list_workspace_invitations(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    invites = crud.list_workspace_invites(db, current_user)
    return [
        schemas.WorkspaceInviteOut(
            id=invite.id,
            inviter_user_id=invite.inviter_user_id,
            inviter_name=inviter_name,
            invitee_email=invite.invitee_email,
            role=invite.role,
            status=invite.status,
            created_at=invite.created_at,
            responded_at=invite.responded_at,
        )
        for invite, inviter_name in invites
    ]


@router.post("/workspace/invitations", response_model=schemas.MessageResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("60/minute")
def create_workspace_invitation(
    request: Request,
    payload: schemas.WorkspaceInviteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.invitee_email.lower() == current_user.email.lower():
        raise HTTPException(status_code=400, detail="You cannot invite your own email.")
    invite = crud.create_workspace_invite(db, current_user.id, payload.invitee_email.lower(), payload.role)
    settings = crud.get_workspace_settings_record(db, current_user)
    invite_link = _frontend_invite_url(create_invite_token(invite.id, invite.invitee_email))
    smtp_config = {
        "smtp_host": settings.smtp_host,
        "smtp_port": settings.smtp_port,
        "smtp_username": settings.smtp_username,
        "smtp_password": settings.smtp_password,
        "smtp_from_email": settings.smtp_from_email,
        "smtp_use_tls": settings.smtp_use_tls,
    }
    try:
        send_workspace_invite_email(
            payload.invitee_email.lower(),
            current_user.name,
            invite_link,
            workspace_name=settings.workspace_name or "Automated Routine Creator Workspace",
            smtp_config=smtp_config,
        )
        message = "Workspace invitation created and emailed successfully."
    except RuntimeError:
        message = "Workspace invitation created successfully. Email delivery is not configured yet."
    except smtplib.SMTPAuthenticationError:
        message = "Workspace invitation saved, but SMTP login failed. For Gmail, use a 16-character App Password."
    except Exception as exc:
        message = f"Workspace invitation created, but email delivery failed: {exc}"
    return schemas.MessageResponse(message=message)


@router.post("/workspace/invitations/accept-token", response_model=schemas.MessageResponse)
@limiter.limit("60/minute")
def accept_workspace_invitation_by_token(
    request: Request,
    payload: schemas.WorkspaceInviteTokenAccept,
    db: Session = Depends(get_db),
):
    try:
        token_data = decode_invite_token(payload.token)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    invite = crud.get_workspace_invite_by_id(db, int(token_data["invite_id"]))
    if not invite or invite.invitee_email.lower() != str(token_data["email"]).lower():
        raise HTTPException(status_code=404, detail="Workspace invitation not found.")
    if invite.status == "Accepted":
        return schemas.MessageResponse(message="Invitation already accepted. Please login or register with this email.")
    if invite.status != "Pending":
        raise HTTPException(status_code=400, detail="This invitation is no longer pending.")

    crud.respond_workspace_invite(db, invite, "accept")
    return schemas.MessageResponse(message="Invitation accepted. Please login or register with this invited email to access the workspace.")


@router.post("/workspace/invitations/{invite_id}/respond", response_model=schemas.MessageResponse)
@limiter.limit("60/minute")
def respond_workspace_invitation(
    request: Request,
    invite_id: int,
    payload: schemas.WorkspaceInviteRespond,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    invite = crud.get_workspace_invite_by_id(db, invite_id)
    if not invite or invite.invitee_email.lower() != current_user.email.lower():
        raise HTTPException(status_code=404, detail="Workspace invitation not found.")
    if invite.status != "Pending":
        raise HTTPException(status_code=400, detail="This invitation has already been handled.")

    crud.respond_workspace_invite(db, invite, payload.action)
    return schemas.MessageResponse(
        message="Invitation accepted." if payload.action == "accept" else "Invitation declined."
    )


@router.get("/workspace/members", response_model=list[schemas.WorkspaceMemberOut])
@limiter.limit("60/minute")
def list_workspace_members(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.get_workspace_members(db, current_user)
