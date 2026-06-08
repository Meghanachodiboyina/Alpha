from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from .. import crud, schemas, models
from ..auth import get_current_user
from ..database import get_db
from ..rate_limiter import limiter

router = APIRouter(tags=["Authentication & Users"])

@router.delete("/users/me", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("5/minute")
def delete_current_user(
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    GDPR Right to be Forgotten.
    Deletes the user and all associated data from the backend.
    Note: Supabase Auth user must be deleted from the client via Supabase API.
    """
    # Delete the user from the database.
    # Due to cascade rules in models.py, this will delete:
    # routines, ai_usages, reset_otps, project_tasks, workspace_tasks, 
    # workspace_settings, workspace_ai_records.
    db.delete(current_user)
    db.commit()
    return None
