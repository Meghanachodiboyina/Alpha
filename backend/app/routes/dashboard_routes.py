from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..auth import get_current_user
from ..database import get_db
from ..models import User

router = APIRouter(tags=["Dashboard"])


@router.get("/dashboard/stats", response_model=schemas.DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.get_dashboard_stats(db, current_user.id)

