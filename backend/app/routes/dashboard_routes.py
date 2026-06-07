from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..auth import get_current_user
from ..database import get_db
from ..models import User
from ..rate_limiter import limiter

router = APIRouter(tags=["Dashboard"])


@router.get("/dashboard/stats", response_model=schemas.DashboardStats)
@limiter.limit("60/minute")
def get_dashboard_stats(
    request: Request,
    weeks: int = Query(default=1, ge=1, le=4),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.get_dashboard_stats(db, current_user.id, weeks=weeks)


@router.get("/dashboard/search")
@limiter.limit("60/minute")
def dashboard_search(
    request: Request,
    q: str = Query(default="", min_length=1, max_length=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    like = f"%{q}%"

    # Search routines
    routine_results = (
        db.query(models.Routine)
        .filter(
            models.Routine.user_id == current_user.id,
            models.Routine.title.ilike(like),
        )
        .order_by(models.Routine.date.desc())
        .limit(5)
        .all()
    )

    # Search workspace tasks
    task_results = (
        db.query(models.WorkspaceTask)
        .filter(
            models.WorkspaceTask.user_id == current_user.id,
            (
                models.WorkspaceTask.title.ilike(like)
                | models.WorkspaceTask.description.ilike(like)
            ),
        )
        .order_by(models.WorkspaceTask.created_at.desc())
        .limit(5)
        .all()
    )

    return {
        "routines": [
            {"id": r.id, "title": r.title, "date": r.date, "status": r.status, "type": "routine"}
            for r in routine_results
        ],
        "tasks": [
            {"id": t.id, "title": t.title, "project_name": t.project_name, "status": t.status, "type": "task"}
            for t in task_results
        ],
    }

