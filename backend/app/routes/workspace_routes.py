from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..ai_engine import AIServiceUnavailableError, generate_workspace_ai_tasks
from ..auth import get_current_user
from ..database import get_db
from ..models import User

router = APIRouter(tags=["Workspace"])


@router.get("/workspace/tasks", response_model=list[schemas.WorkspaceTaskOut])
def list_workspace_tasks(
    project_name: str | None = Query(default=None),
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
    return crud.get_workspace_tasks(
        db=db,
        current_user=current_user,
        project_name=project_name,
        due_date=due_date,
        assignee=assignee,
        status=status_filter,
        priority=priority,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get("/workspace/bootstrap", response_model=schemas.WorkspaceBootstrapResponse)
def get_workspace_bootstrap(
    project_name: str | None = Query(default=None),
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
    tasks = crud.get_workspace_tasks(
        db=db,
        current_user=current_user,
        project_name=project_name,
        due_date=due_date,
        assignee=assignee,
        status=status_filter,
        priority=priority,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return schemas.WorkspaceBootstrapResponse(
        projects=crud.get_workspace_projects(db, current_user),
        tasks=tasks,
        members=crud.get_workspace_members(db, current_user),
        invites=[
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
            for invite, inviter_name in crud.list_workspace_invites(db, current_user)
        ],
        ai_tasks=crud.get_workspace_ai_tasks(db, current_user, project_name=project_name),
        ai_task_groups=crud.get_workspace_ai_task_groups(db, current_user, project_name=project_name),
        reports=crud.get_workspace_reports(db, current_user, project_name=project_name),
        settings=crud.get_workspace_settings(db, current_user),
    )


@router.get("/workspace/projects", response_model=list[schemas.WorkspaceProjectOut])
def list_workspace_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.get_workspace_projects(db, current_user)


@router.post("/workspace/projects", response_model=schemas.WorkspaceProjectOut, status_code=status.HTTP_201_CREATED)
def create_workspace_project(
    payload: schemas.WorkspaceProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.create_workspace_project(db, current_user, payload)


@router.delete("/workspace/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workspace_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = crud.get_workspace_project_by_id(db, current_user, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Workspace project not found.")
    if project.name.strip().lower() == "team space":
        raise HTTPException(status_code=400, detail="Default Team Space cannot be deleted.")
    crud.delete_workspace_project(db, project)


@router.post("/workspace/tasks", response_model=schemas.WorkspaceTaskOut, status_code=status.HTTP_201_CREATED)
def create_workspace_task(
    payload: schemas.WorkspaceTaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.create_workspace_task(db, current_user.id, payload)


@router.put("/workspace/tasks/{task_id}", response_model=schemas.WorkspaceTaskOut)
def update_workspace_task(
    task_id: int,
    payload: schemas.WorkspaceTaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_task = crud.get_workspace_task_by_id(db, task_id, current_user.id)
    if not db_task:
        raise HTTPException(status_code=404, detail="Workspace task not found.")
    return crud.update_workspace_task(db, db_task, payload)


@router.delete("/workspace/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workspace_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_task = crud.get_workspace_task_by_id(db, task_id, current_user.id)
    if not db_task:
        raise HTTPException(status_code=404, detail="Workspace task not found.")
    crud.delete_workspace_task(db, db_task)


@router.post("/workspace/ai-generate", response_model=schemas.WorkspaceAIGenerateResponse)
def ai_generate_workspace_tasks(
    payload: schemas.WorkspaceAIGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        generated_tasks = generate_workspace_ai_tasks(
            prompt=payload.prompt,
            project_name=payload.project_name,
            assignee=payload.assignee or current_user.name,
        )
    except AIServiceUnavailableError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    created_tasks = crud.create_many_workspace_tasks(
        db,
        current_user.id,
        [
            schemas.WorkspaceTaskCreate(
                title=item.title,
                description=item.description,
                assignee=item.assignee,
                priority=item.priority,
                status=item.status,
                due_date=item.due_date,
                progress=item.progress,
                project_name=item.project_name,
            )
            for item in generated_tasks
        ],
    )
    crud.create_workspace_ai_task_records(db, current_user.id, [task.id for task in created_tasks], payload.prompt)
    return schemas.WorkspaceAIGenerateResponse(
        message=f"Generated {len(created_tasks)} workspace tasks from your prompt.",
        tasks=created_tasks,
    )


@router.get("/workspace/ai-tasks", response_model=list[schemas.WorkspaceTaskOut])
def list_workspace_ai_tasks(
    project_name: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.get_workspace_ai_tasks(db, current_user, project_name=project_name)


@router.get("/workspace/ai-task-groups", response_model=list[schemas.WorkspaceAITaskGroupOut])
def list_workspace_ai_task_groups(
    project_name: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.get_workspace_ai_task_groups(db, current_user, project_name=project_name)


@router.get("/workspace/reports", response_model=schemas.WorkspaceReportOut)
def get_workspace_reports(
    project_name: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.get_workspace_reports(db, current_user, project_name=project_name)


@router.get("/workspace/settings", response_model=schemas.WorkspaceSettingsOut)
def get_workspace_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.get_workspace_settings(db, current_user)


@router.put("/workspace/settings", response_model=schemas.WorkspaceSettingsOut)
def update_workspace_settings(
    payload: schemas.WorkspaceSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.update_workspace_settings(db, current_user, payload)
