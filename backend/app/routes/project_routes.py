from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..auth import get_current_user, send_workspace_invite_email
from ..database import get_db
from ..models import User

router = APIRouter(tags=["Project Management"])


@router.get("/projects/tasks", response_model=list[schemas.ProjectTaskOut])
def list_project_tasks(
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
def create_project_task(
    payload: schemas.ProjectTaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.create_project_task(db, current_user.id, payload)


@router.put("/projects/tasks/{task_id}", response_model=schemas.ProjectTaskOut)
def update_project_task(
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
def delete_project_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_task = crud.get_project_task_by_id(db, task_id, current_user.id)
    if not db_task:
        raise HTTPException(status_code=404, detail="Project task not found.")
    crud.delete_project_task(db, db_task)


@router.get("/workspace/invitations", response_model=list[schemas.WorkspaceInviteOut])
def list_workspace_invitations(
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
def create_workspace_invitation(
    payload: schemas.WorkspaceInviteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.invitee_email.lower() == current_user.email.lower():
        raise HTTPException(status_code=400, detail="You cannot invite your own email.")
    crud.create_workspace_invite(db, current_user.id, payload.invitee_email.lower(), payload.role)
    settings = crud.get_workspace_settings_record(db, current_user)
    smtp_config = {
        "smtp_host": settings.smtp_host,
        "smtp_port": settings.smtp_port,
        "smtp_username": settings.smtp_username,
        "smtp_password": settings.smtp_password,
        "smtp_from_email": settings.smtp_from_email,
        "smtp_use_tls": settings.smtp_use_tls,
    }
    try:
        send_workspace_invite_email(payload.invitee_email.lower(), current_user.name, smtp_config=smtp_config)
        message = "Workspace invitation created and emailed successfully."
    except RuntimeError:
        message = "Workspace invitation created successfully. Email delivery is not configured yet."
    except Exception as exc:
        message = f"Workspace invitation created, but email delivery failed: {exc}"
    return schemas.MessageResponse(message=message)


@router.post("/workspace/invitations/{invite_id}/respond", response_model=schemas.MessageResponse)
def respond_workspace_invitation(
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
def list_workspace_members(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.get_workspace_members(db, current_user)
