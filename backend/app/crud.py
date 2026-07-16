from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from . import models, schemas
from .ai_engine import generate_task_suggestion


def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()


def update_user_password(db: Session, user: models.User, password_hash: str):
    user.password_hash = password_hash
    db.commit()
    db.refresh(user)
    return user


def create_user(db: Session, name: str, email: str, password_hash: str):
    user = models.User(name=name, email=email, password_hash=password_hash)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_routine(db: Session, user_id: str, routine: schemas.RoutineCreate, session_id: int = None):
    routine_data = routine.model_dump()
    if not routine_data.get("suggestion"):
        routine_data["suggestion"] = generate_task_suggestion(
            routine_data["title"],
            routine_data.get("description"),
            routine_data.get("priority", "Medium"),
        )
    # session_id passed explicitly takes precedence over anything in the payload
    if session_id is not None:
        routine_data["session_id"] = session_id
    db_routine = models.Routine(user_id=user_id, **routine_data)
    db.add(db_routine)
    db.commit()
    db.refresh(db_routine)
    return db_routine


def create_routine_session(
    db: Session,
    user_id: str,
    scheduled_for: date,
    conversation_id: int = None,
) -> models.RoutineSession:
    session = models.RoutineSession(
        user_id=user_id,
        conversation_id=conversation_id,
        scheduled_for=scheduled_for,
        status="active",
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


# ─── Orbit Session Memory helpers ────────────────────────────────────────────

def create_orbit_session(
    db: Session,
    user_id: str,
    conversation_id: int | None = None,
) -> models.OrbitSession:
    """Create a brand-new planning session for a conversation."""
    os = models.OrbitSession(
        user_id=user_id,
        conversation_id=conversation_id,
        status="active",
        current_state="WAITING_FOR_INPUT",
        context_json={
            "goal": None,
            "tasks": [],
            "duration": None,
            "fixed_events": [],
            "constraints": [],
            "pending_question": None,
            "pending_question_key": None,
            "generated_routines": [],
        },
    )
    db.add(os)
    db.commit()
    db.refresh(os)
    return os


def load_orbit_session(
    db: Session,
    user_id: str,
    conversation_id: int,
) -> models.OrbitSession | None:
    """Load the active OrbitSession for a given conversation."""
    return (
        db.query(models.OrbitSession)
        .filter(
            models.OrbitSession.user_id == user_id,
            models.OrbitSession.conversation_id == conversation_id,
            models.OrbitSession.status == "active",
        )
        .order_by(models.OrbitSession.created_at.desc())
        .first()
    )


def get_or_create_orbit_session(
    db: Session,
    user_id: str,
    conversation_id: int,
) -> models.OrbitSession:
    """Idempotent: load existing active session or create a new one."""
    existing = load_orbit_session(db, user_id, conversation_id)
    if existing:
        return existing
    return create_orbit_session(db, user_id, conversation_id)


def update_orbit_context(
    db: Session,
    session: models.OrbitSession,
    updates: dict,
) -> models.OrbitSession:
    """
    Merge `updates` into session.context_json and persist.
    Existing keys not in `updates` are preserved.
    """
    current = dict(session.context_json or {})
    current.update(updates)
    session.context_json = current
    db.commit()
    db.refresh(session)
    return session


def update_orbit_state(
    db: Session,
    session: models.OrbitSession,
    new_state: str,
) -> models.OrbitSession:
    """Update the state machine position and persist."""
    session.current_state = new_state
    db.commit()
    db.refresh(session)
    return session


def clear_completed_session(
    db: Session,
    session: models.OrbitSession,
) -> models.OrbitSession:
    """Mark the session as complete (does NOT delete it — keeps history)."""
    session.status = "complete"
    session.current_state = "COMPLETE"
    db.commit()
    db.refresh(session)
    return session




def get_routines(db: Session, user_id: str):
    """Returns ALL non-internal routines (used for legacy endpoints)."""
    return (
        db.query(models.Routine)
        .filter(models.Routine.user_id == user_id, models.Routine.is_internal == False)
        .order_by(models.Routine.date.asc(), models.Routine.start_time.asc())
        .all()
    )


def get_routines_by_date(db: Session, user_id: str, for_date: date):
    """Returns routines scheduled for a specific date (date-filtered Planner view)."""
    return (
        db.query(models.Routine)
        .filter(
            models.Routine.user_id == user_id,
            models.Routine.is_internal == False,
            models.Routine.date == for_date,
        )
        .order_by(models.Routine.start_time.asc())
        .all()
    )


def get_scheduled_blocks_for_date(db: Session, user_id: str, target_date: date) -> list[tuple[datetime, datetime]]:
    """
    Return the user's already-scheduled, still-active routine blocks for a date
    as (start_datetime, end_datetime) tuples. Fed to the AI planner so newly
    generated tasks slot into free gaps instead of overlapping existing ones.
    """
    blocks: list[tuple[datetime, datetime]] = []
    for r in get_routines_by_date(db, user_id, target_date):
        if r.status in ("Completed", "Skipped", "Missed"):
            continue
        if not r.start_time or not r.end_time:
            continue
        start_dt = datetime.combine(target_date, r.start_time)
        end_dt = datetime.combine(target_date, r.end_time)
        if end_dt > start_dt:
            blocks.append((start_dt, end_dt))
    blocks.sort(key=lambda b: b[0])
    return blocks


def get_overdue_routine_titles(db: Session, user_id: str, limit: int = 10) -> list[str]:
    """Titles of the user's past, still-incomplete routines (the 'Overdue' list)."""
    rows = (
        db.query(models.Routine)
        .filter(
            models.Routine.user_id == user_id,
            models.Routine.is_internal == False,
            models.Routine.date < date.today(),
            models.Routine.status != "Completed",
        )
        .order_by(models.Routine.date.asc())
        .limit(limit)
        .all()
    )
    seen, titles = set(), []
    for r in rows:
        t = (r.title or "").strip()
        if t and t.lower() not in seen:
            seen.add(t.lower())
            titles.append(t)
    return titles


def get_routines_sections(db: Session, user_id: str):
    """Returns routines bucketed into today, upcoming, and completed sections using optimized queries."""
    today = date.today()
    
    # 1. Today's Pending/Skipped/Partial tasks
    today_routines = (
        db.query(models.Routine)
        .filter(
            models.Routine.user_id == user_id, 
            models.Routine.is_internal == False,
            models.Routine.date == today,
            models.Routine.status != "Completed"
        )
        .order_by(models.Routine.start_time.asc())
        .all()
    )
    
    # 2. Upcoming tasks (Tomorrow onwards)
    upcoming_routines = (
        db.query(models.Routine)
        .filter(
            models.Routine.user_id == user_id, 
            models.Routine.is_internal == False,
            models.Routine.date > today,
            models.Routine.status != "Completed"
        )
        .order_by(models.Routine.date.asc(), models.Routine.start_time.asc())
        .all()
    )
    
    # 3. ONLY Today's Completed tasks (Historical tasks moved to /history API)
    completed_routines = (
        db.query(models.Routine)
        .filter(
            models.Routine.user_id == user_id, 
            models.Routine.is_internal == False,
            models.Routine.date == today,
            models.Routine.status == "Completed"
        )
        .order_by(models.Routine.start_time.asc())
        .all()
    )
    
    # 4. Overdue tasks (Past incomplete tasks)
    overdue_routines = (
        db.query(models.Routine)
        .filter(
            models.Routine.user_id == user_id, 
            models.Routine.is_internal == False,
            models.Routine.date < today,
            models.Routine.status != "Completed"
        )
        .order_by(models.Routine.date.asc(), models.Routine.start_time.asc())
        .all()
    )
    
    return {
        "overdue": overdue_routines,
        "today": today_routines,
        "upcoming": upcoming_routines,
        "completed": completed_routines,
    }


def get_weekly_routines(db: Session, user_id: str):
    today = date.today()
    end_of_window = today + timedelta(days=6)
    return (
        db.query(models.Routine)
        .filter(
            models.Routine.user_id == user_id,
            models.Routine.is_internal == False,
            models.Routine.date >= today,
            models.Routine.date <= end_of_window,
        )
        .order_by(models.Routine.date.asc(), models.Routine.start_time.asc())
        .all()
    )


def get_routine_by_id(db: Session, routine_id: int, user_id: str):
    return (
        db.query(models.Routine)
        .filter(models.Routine.id == routine_id, models.Routine.user_id == user_id)
        .first()
    )


def clear_existing_reset_otps(db: Session, user_id: str):
    (
        db.query(models.PasswordResetOTP)
        .filter(
            models.PasswordResetOTP.user_id == user_id,
            models.PasswordResetOTP.consumed_at.is_(None),
        )
        .delete(synchronize_session=False)
    )
    db.commit()


def create_password_reset_otp(db: Session, user_id: str, otp_hash: str, expires_at: datetime):
    clear_existing_reset_otps(db, user_id)
    db_otp = models.PasswordResetOTP(user_id=user_id, otp_hash=otp_hash, expires_at=expires_at)
    db.add(db_otp)
    db.commit()
    db.refresh(db_otp)
    return db_otp


def get_active_password_reset_otp(db: Session, user_id: str):
    return (
        db.query(models.PasswordResetOTP)
        .filter(
            models.PasswordResetOTP.user_id == user_id,
            models.PasswordResetOTP.consumed_at.is_(None),
            models.PasswordResetOTP.expires_at >= datetime.now(timezone.utc),
        )
        .order_by(models.PasswordResetOTP.created_at.desc())
        .first()
    )


def consume_password_reset_otp(db: Session, db_otp: models.PasswordResetOTP):
    db_otp.consumed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(db_otp)
    return db_otp

def update_routine(db: Session, db_routine: models.Routine, routine_update: schemas.RoutineUpdate):
    update_data = routine_update.model_dump(
        exclude_unset=True,
    )

    if "suggestion" in update_data and not update_data["suggestion"]:
        update_data["suggestion"] = generate_task_suggestion(
            update_data.get("title", db_routine.title),
            update_data.get("description", db_routine.description),
            update_data.get("priority", db_routine.priority),
        )

    for field, value in update_data.items():
        setattr(db_routine, field, value)

    if not db_routine.suggestion:
        db_routine.suggestion = generate_task_suggestion(
            db_routine.title,
            db_routine.description,
            db_routine.priority,
        )

    if "start_time" in update_data and db_routine.start_time != update_data["start_time"]:
        # User manually changed the time, let's learn this preference
        new_time = update_data["start_time"]
        if new_time:
            time_str = new_time.strftime("%H:%M")
            upsert_user_preference(db, db_routine.user_id, f"time_preference_{db_routine.title.lower()}", time_str)

    db.commit()
    db.refresh(db_routine)
    return db_routine


def check_routine_conflict(
    db: Session,
    user_id: str,
    routine_id: int,
    new_start: time | None,
    new_end: time | None,
    target_date: date | None,
) -> list[models.Routine]:
    """Returns any routines that overlap with the proposed new time slot."""
    if not new_start or not new_end:
        return []
    check_date = target_date or date.today()
    conflicts = (
        db.query(models.Routine)
        .filter(
            models.Routine.user_id == user_id,
            models.Routine.id != routine_id,
            models.Routine.date == check_date,
            models.Routine.start_time < new_end,
            models.Routine.end_time > new_start,
        )
        .all()
    )
    return conflicts


def get_daily_review(db: Session, user_id: str, review_date: date | None = None):
    """Compute today's execution stats: completed, skipped, partial, carry-forward."""
    target_date = review_date or date.today()
    routines = (
        db.query(models.Routine)
        .filter(
            models.Routine.user_id == user_id,
            models.Routine.date == target_date,
            models.Routine.is_internal == False,
        )
        .all()
    )
    completed = [r for r in routines if r.status == "Completed"]
    skipped = [r for r in routines if r.status == "Skipped"]
    partial = [r for r in routines if r.status == "Partial"]
    pending = [r for r in routines if r.status == "Pending"]

    focus_minutes = sum(
        (r.actual_duration or r.estimated_time) for r in completed + partial
        if (r.category or "").lower() not in ("recovery", "commute", "meal", "break")
    )
    recovery_minutes = sum(
        r.estimated_time for r in routines
        if (r.category or "").lower() in ("recovery", "break") and r.status == "Completed"
    )
    carry_forward = skipped + partial + pending
    return {
        "completed_count": len(completed),
        "skipped_count": len(skipped),
        "partial_count": len(partial),
        "pending_count": len(pending),
        "total_focus_minutes": focus_minutes,
        "total_recovery_minutes": recovery_minutes,
        "carry_forward": carry_forward,
    }


def upsert_user_preference(db: Session, user_id: str, category: str, value: str):
    db_pref = db.query(models.UserPreference).filter_by(user_id=user_id, category=category).first()
    if db_pref:
        db_pref.value = value
        db_pref.updated_at = datetime.now(timezone.utc)
    else:
        db_pref = models.UserPreference(
            user_id=user_id,
            category=category,
            value=value
        )
        db.add(db_pref)
    db.commit()
    return db_pref



def delete_routine(db: Session, db_routine: models.Routine):
    db.delete(db_routine)
    db.commit()


def create_many_routines(db: Session, user_id: str, routines: list[schemas.AIPlannedRoutine]):
    created_items = []
    for routine in routines:
        routine_data = routine.model_dump()
        if not routine_data.get("suggestion"):
            routine_data["suggestion"] = generate_task_suggestion(
                routine_data["title"],
                routine_data.get("description"),
                routine_data.get("priority", "Medium"),
            )
        db_routine = models.Routine(user_id=user_id, **routine_data)
        db.add(db_routine)
        created_items.append(db_routine)

    db.commit()
    for item in created_items:
        db.refresh(item)
    return created_items


def get_completion_rate(completed: int, total: int) -> float:
    """Safe float completion rate 0.0 – 1.0."""
    if total == 0:
        return 0.0
    return round(completed / total, 4)


def get_today_stats(db: Session, user_id: str) -> dict:
    """
    Returns routine counts scoped strictly to today's date.
    Uses date.today() which reflects the server's local date.
    """
    today = date.today()
    base = (
        db.query(models.Routine)
        .filter(
            models.Routine.user_id == user_id,
            models.Routine.date == today,
            models.Routine.is_internal == False,
        )
    )
    total = base.count()
    completed = base.filter(models.Routine.status == "Completed").count()
    pending = total - completed
    return {"total": total, "completed": completed, "pending": pending, "date": today}


def get_week_stats(db: Session, user_id: str) -> dict:
    """
    Returns routine counts for the current calendar week
    (Monday 00:00 → Sunday 23:59 in server-local time).
    """
    today = date.today()
    week_start = today - timedelta(days=today.weekday())   # Monday
    week_end = week_start + timedelta(days=6)              # Sunday

    base = (
        db.query(models.Routine)
        .filter(
            models.Routine.user_id == user_id,
            models.Routine.date >= week_start,
            models.Routine.date <= week_end,
            models.Routine.is_internal == False,
        )
    )
    total = base.count()
    completed = base.filter(models.Routine.status == "Completed").count()
    pending = total - completed
    return {
        "total": total,
        "completed": completed,
        "pending": pending,
        "week_start": week_start,
        "week_end": week_end,
    }


def get_dashboard_stats(db: Session, user_id: str, weeks: int = 1):
    # ── Scoped stats ──────────────────────────────────────────────────────────
    today_s = get_today_stats(db, user_id)
    week_s = get_week_stats(db, user_id)

    completion_rate = get_completion_rate(week_s["completed"], week_s["total"])
    productivity_score = int(completion_rate * 100)

    # ── Weekly overview (N weeks window, current week + N-1 prior weeks) ─────
    week_start = week_s["week_start"]
    window_start = week_start - timedelta(weeks=weeks - 1)
    window_end = week_s["week_end"]
    total_days = (window_end - window_start).days + 1

    # Fetch total per day
    total_rows = (
        db.query(models.Routine.date, func.count(models.Routine.id))
        .filter(
            models.Routine.user_id == user_id,
            models.Routine.is_internal == False,
            models.Routine.date >= window_start,
            models.Routine.date <= window_end,
        )
        .group_by(models.Routine.date)
        .all()
    )
    # Fetch completed per day
    completed_rows = (
        db.query(models.Routine.date, func.count(models.Routine.id))
        .filter(
            models.Routine.user_id == user_id,
            models.Routine.is_internal == False,
            models.Routine.status == "Completed",
            models.Routine.date >= window_start,
            models.Routine.date <= window_end,
        )
        .group_by(models.Routine.date)
        .all()
    )

    total_map = {d.isoformat(): cnt for d, cnt in total_rows}
    completed_map = {d.isoformat(): cnt for d, cnt in completed_rows}

    weekly_overview = []
    for i in range(total_days):
        day = window_start + timedelta(days=i)
        day_str = day.isoformat()
        day_total = total_map.get(day_str, 0)
        day_completed = completed_map.get(day_str, 0)
        weekly_overview.append({
            "date": day_str,
            "count": day_total,          # kept for backward compat
            "total": day_total,
            "completed": day_completed,
        })

    return schemas.DashboardStats(
        # Today-scoped
        today_total=today_s["total"],
        today_completed=today_s["completed"],
        today_pending=today_s["pending"],
        # Week-scoped
        week_total=week_s["total"],
        week_completed=week_s["completed"],
        week_pending=week_s["pending"],
        # Computed
        productivity_score=productivity_score,
        completion_rate=completion_rate,
        # Legacy aliases (backward compat)
        total_routines=week_s["total"],
        completed_routines=week_s["completed"],
        pending_routines=week_s["pending"],
        today_routines=today_s["total"],
        weekly_overview=weekly_overview,
    )


def get_project_tasks(
    db: Session,
    user_id: str,
    due_date: date | None = None,
    assignee: str | None = None,
    status: str | None = None,
    priority: str | None = None,
    search: str | None = None,
    sort_by: str = "due_date",
    sort_order: str = "asc",
):
    query = db.query(models.ProjectTask).filter(models.ProjectTask.user_id == user_id)

    if due_date:
        query = query.filter(models.ProjectTask.due_date == due_date)
    if assignee:
        query = query.filter(models.ProjectTask.assignee.ilike(f"%{assignee}%"))
    if status:
        query = query.filter(models.ProjectTask.status == status)
    if priority:
        query = query.filter(models.ProjectTask.priority == priority)
    if search:
        like_query = f"%{search}%"
        query = query.filter(
            models.ProjectTask.title.ilike(like_query)
            | models.ProjectTask.description.ilike(like_query)
            | models.ProjectTask.comments.ilike(like_query)
            | models.ProjectTask.assignee.ilike(like_query)
        )

    sort_map = {
        "due_date": models.ProjectTask.due_date,
        "created_at": models.ProjectTask.created_at,
        "priority": models.ProjectTask.priority,
        "status": models.ProjectTask.status,
        "assignee": models.ProjectTask.assignee,
        "title": models.ProjectTask.title,
    }
    sort_column = sort_map.get(sort_by, models.ProjectTask.due_date)
    if sort_order.lower() == "desc":
        sort_column = sort_column.desc()
    else:
        sort_column = sort_column.asc()

    return query.order_by(sort_column, models.ProjectTask.created_at.asc()).all()


def create_project_task(db: Session, user_id: str, payload: schemas.ProjectTaskCreate):
    db_task = models.ProjectTask(user_id=user_id, **payload.model_dump())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


def get_project_task_by_id(db: Session, task_id: int, user_id: str):
    return (
        db.query(models.ProjectTask)
        .filter(models.ProjectTask.id == task_id, models.ProjectTask.user_id == user_id)
        .first()
    )


def update_project_task(db: Session, db_task: models.ProjectTask, payload: schemas.ProjectTaskUpdate):
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_task, field, value)
    db.commit()
    db.refresh(db_task)
    return db_task


def delete_project_task(db: Session, db_task: models.ProjectTask):
    db.delete(db_task)
    db.commit()


def create_workspace_invite(db: Session, inviter_user_id: str, invitee_email: str, role: str = "Member"):
    existing_invite = (
        db.query(models.WorkspaceInvite)
        .filter(
            models.WorkspaceInvite.inviter_user_id == inviter_user_id,
            models.WorkspaceInvite.invitee_email == invitee_email,
            models.WorkspaceInvite.status == "Pending",
        )
        .first()
    )
    if existing_invite:
        return existing_invite

    invite = models.WorkspaceInvite(
        inviter_user_id=inviter_user_id,
        invitee_email=invitee_email,
        role=role,
        status="Pending",
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)
    return invite


def get_workspace_invite_by_id(db: Session, invite_id: int):
    return db.query(models.WorkspaceInvite).filter(models.WorkspaceInvite.id == invite_id).first()


def list_workspace_invites(db: Session, current_user: models.User):
    return (
        db.query(models.WorkspaceInvite, models.User.name)
        .join(models.User, models.User.id == models.WorkspaceInvite.inviter_user_id)
        .filter(
            (models.WorkspaceInvite.inviter_user_id == current_user.id)
            | (models.WorkspaceInvite.invitee_email == current_user.email)
        )
        .order_by(models.WorkspaceInvite.created_at.desc())
        .all()
    )


def respond_workspace_invite(db: Session, invite: models.WorkspaceInvite, action: str):
    invite.status = "Accepted" if action == "accept" else "Declined"
    invite.responded_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(invite)
    return invite


def get_workspace_members(db: Session, current_user: models.User):
    accepted_invites = (
        db.query(models.WorkspaceInvite, models.User)
        .outerjoin(models.User, models.User.email == models.WorkspaceInvite.invitee_email)
        .filter(
            models.WorkspaceInvite.status == "Accepted",
            (
                (models.WorkspaceInvite.inviter_user_id == current_user.id)
                | (models.WorkspaceInvite.invitee_email == current_user.email)
            ),
        )
        .all()
    )

    members = {(current_user.email, current_user.name): ("Owner", True)}
    for invite, invited_user in accepted_invites:
        inviter = db.query(models.User).filter(models.User.id == invite.inviter_user_id).first()
        if inviter:
            members[(inviter.email, inviter.name)] = ("Owner" if inviter.id == current_user.id else "Admin", inviter.id == current_user.id)
        if invited_user:
            members[(invited_user.email, invited_user.name)] = (invite.role, invited_user.id == current_user.id)
        else:
            members[(invite.invitee_email, invite.invitee_email.split("@")[0])] = (invite.role, False)

    return [
        schemas.WorkspaceMemberOut(email=email, name=name, role=role, is_online=is_online)
        for (email, name), (role, is_online) in sorted(members.items(), key=lambda item: item[0][1].lower())
    ]


def _serialize_workspace_settings(settings: models.WorkspaceSettings) -> schemas.WorkspaceSettingsOut:
    email_configured = bool(settings.smtp_host and settings.smtp_username and settings.smtp_password and settings.smtp_from_email)
    return schemas.WorkspaceSettingsOut(
        workspace_name=settings.workspace_name,
        theme=settings.theme,
        notifications_enabled=settings.notifications_enabled,
        email_notifications_enabled=settings.email_notifications_enabled,
        permission_mode=settings.permission_mode,
        smtp_host=settings.smtp_host,
        smtp_port=settings.smtp_port,
        smtp_username=settings.smtp_username,
        smtp_from_email=settings.smtp_from_email,
        smtp_use_tls=settings.smtp_use_tls,
        email_configured=email_configured,
    )


def ensure_workspace_project(
    db: Session,
    user_id: str,
    project_name: str,
    description: str | None = None,
    color: str = "#22c1c3",
):
    normalized_name = project_name.strip()
    existing = (
        db.query(models.WorkspaceProject)
        .filter(
            models.WorkspaceProject.user_id == user_id,
            func.lower(models.WorkspaceProject.name) == normalized_name.lower(),
        )
        .first()
    )
    if existing:
        return existing

    project = models.WorkspaceProject(
        user_id=user_id,
        name=normalized_name,
        description=description,
        color=color,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def get_workspace_settings(db: Session, current_user: models.User) -> schemas.WorkspaceSettingsOut:
    settings = db.query(models.WorkspaceSettings).filter(models.WorkspaceSettings.user_id == current_user.id).first()
    if not settings:
        settings = models.WorkspaceSettings(user_id=current_user.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return _serialize_workspace_settings(settings)


def get_workspace_settings_record(db: Session, current_user: models.User) -> models.WorkspaceSettings:
    settings = db.query(models.WorkspaceSettings).filter(models.WorkspaceSettings.user_id == current_user.id).first()
    if not settings:
        settings = models.WorkspaceSettings(user_id=current_user.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def update_workspace_settings(
    db: Session,
    current_user: models.User,
    payload: schemas.WorkspaceSettingsUpdate,
) -> schemas.WorkspaceSettingsOut:
    settings = get_workspace_settings_record(db, current_user)
    update_data = payload.model_dump(exclude_unset=True)
    if "smtp_password" in update_data and not update_data["smtp_password"]:
        update_data.pop("smtp_password")
    for field, value in update_data.items():
        setattr(settings, field, value)
    settings.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(settings)
    return _serialize_workspace_settings(settings)


def get_workspace_projects(db: Session, current_user: models.User) -> list[schemas.WorkspaceProjectOut]:
    scope_user_ids = _get_workspace_scope_user_ids(db, current_user)
    stored_projects = (
        db.query(models.WorkspaceProject)
        .filter(models.WorkspaceProject.user_id.in_(scope_user_ids))
        .order_by(models.WorkspaceProject.name.asc(), models.WorkspaceProject.created_at.asc())
        .all()
    )
    project_map = {project.name.lower(): project for project in stored_projects}

    task_project_names = (
        db.query(models.WorkspaceTask.project_name)
        .filter(models.WorkspaceTask.user_id.in_(scope_user_ids))
        .distinct()
        .all()
    )
    for (project_name,) in task_project_names:
        if project_name and project_name.lower() not in project_map:
            project_map[project_name.lower()] = schemas.WorkspaceProjectOut(
                id=0,
                user_id=current_user.id,
                name=project_name,
                description=None,
                color="#22c1c3",
                created_at=datetime.now(timezone.utc),
            )

    if "team space" not in project_map:
        ensure_workspace_project(db, current_user.id, "Team Space")
        stored = db.query(models.WorkspaceProject).filter(
            models.WorkspaceProject.user_id == current_user.id,
            func.lower(models.WorkspaceProject.name) == "team space",
        ).first()
        if stored:
            project_map["team space"] = stored

    items = list(project_map.values())
    items.sort(key=lambda item: item.name.lower())
    return [
        item if isinstance(item, schemas.WorkspaceProjectOut) else schemas.WorkspaceProjectOut.model_validate(item)
        for item in items
    ]


def create_workspace_project(
    db: Session,
    current_user: models.User,
    payload: schemas.WorkspaceProjectCreate,
) -> schemas.WorkspaceProjectOut:
    project = ensure_workspace_project(
        db,
        current_user.id,
        payload.name,
        description=payload.description,
        color=payload.color,
    )
    return schemas.WorkspaceProjectOut.model_validate(project)


def get_workspace_project_by_id(db: Session, current_user: models.User, project_id: int):
    return (
        db.query(models.WorkspaceProject)
        .filter(
            models.WorkspaceProject.id == project_id,
            models.WorkspaceProject.user_id == current_user.id,
        )
        .first()
    )


def delete_workspace_project(db: Session, project: models.WorkspaceProject):
    tasks = db.query(models.WorkspaceTask).filter(
        models.WorkspaceTask.user_id == project.user_id,
        models.WorkspaceTask.project_name == project.name,
    ).all()
    for task in tasks:
        db.delete(task)
    db.delete(project)
    db.commit()


def _get_workspace_scope_user_ids(db: Session, current_user: models.User) -> list[str]:
    accepted_invites = (
        db.query(models.WorkspaceInvite)
        .filter(
            models.WorkspaceInvite.status == "Accepted",
            (
                (models.WorkspaceInvite.inviter_user_id == current_user.id)
                | (models.WorkspaceInvite.invitee_email == current_user.email)
            ),
        )
        .all()
    )

    user_ids = {current_user.id}
    for invite in accepted_invites:
        user_ids.add(invite.inviter_user_id)
        invited_user = get_user_by_email(db, invite.invitee_email)
        if invited_user:
            user_ids.add(invited_user.id)
    return sorted(user_ids)


def get_workspace_tasks(
    db: Session,
    current_user: models.User,
    project_name: str | None = None,
    due_date: date | None = None,
    assignee: str | None = None,
    status: str | None = None,
    priority: str | None = None,
    search: str | None = None,
    sort_by: str = "due_date",
    sort_order: str = "asc",
):
    scope_user_ids = _get_workspace_scope_user_ids(db, current_user)
    query = db.query(models.WorkspaceTask).filter(models.WorkspaceTask.user_id.in_(scope_user_ids))

    if project_name and project_name.lower() != "all":
        query = query.filter(models.WorkspaceTask.project_name == project_name)
    if due_date:
        query = query.filter(models.WorkspaceTask.due_date == due_date)
    if assignee:
        query = query.filter(models.WorkspaceTask.assignee.ilike(f"%{assignee}%"))
    if status:
        query = query.filter(models.WorkspaceTask.status == status)
    if priority:
        query = query.filter(models.WorkspaceTask.priority == priority)
    if search:
        like_query = f"%{search}%"
        query = query.filter(
            models.WorkspaceTask.title.ilike(like_query)
            | models.WorkspaceTask.description.ilike(like_query)
            | models.WorkspaceTask.assignee.ilike(like_query)
            | models.WorkspaceTask.project_name.ilike(like_query)
        )

    sort_map = {
        "task": models.WorkspaceTask.title,
        "title": models.WorkspaceTask.title,
        "assignee": models.WorkspaceTask.assignee,
        "priority": models.WorkspaceTask.priority,
        "status": models.WorkspaceTask.status,
        "due_date": models.WorkspaceTask.due_date,
        "progress": models.WorkspaceTask.progress,
        "created_at": models.WorkspaceTask.created_at,
        "project_name": models.WorkspaceTask.project_name,
    }
    sort_column = sort_map.get(sort_by, models.WorkspaceTask.due_date)
    sort_column = sort_column.desc() if sort_order.lower() == "desc" else sort_column.asc()

    tasks = query.order_by(sort_column, models.WorkspaceTask.created_at.asc()).all()
    owner_lookup = {
        user.id: user.name
        for user in db.query(models.User).filter(models.User.id.in_(scope_user_ids)).all()
    }
    for task in tasks:
        setattr(task, "owner_name", owner_lookup.get(task.user_id))
    return tasks


def create_workspace_task(db: Session, user_id: str, payload: schemas.WorkspaceTaskCreate):
    ensure_workspace_project(db, user_id, payload.project_name)
    db_task = models.WorkspaceTask(user_id=user_id, **payload.model_dump())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


def create_many_workspace_tasks(db: Session, user_id: str, tasks: list[schemas.WorkspaceTaskCreate]):
    created_items = []
    for task in tasks:
        ensure_workspace_project(db, user_id, task.project_name)
        db_task = models.WorkspaceTask(user_id=user_id, **task.model_dump())
        db.add(db_task)
        created_items.append(db_task)
    db.commit()
    for item in created_items:
        db.refresh(item)
    return created_items


def get_workspace_task_by_id(db: Session, task_id: int, user_id: str):
    current_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not current_user:
        return None
    scope_user_ids = _get_workspace_scope_user_ids(db, current_user)
    return (
        db.query(models.WorkspaceTask)
        .filter(models.WorkspaceTask.id == task_id, models.WorkspaceTask.user_id.in_(scope_user_ids))
        .first()
    )


def check_workspace_task_edit_permission(db: Session, db_task: models.WorkspaceTask, current_user: models.User) -> bool:
    """Validate if the current_user is allowed to edit or delete db_task according to workspace permission_mode."""
    if db_task.user_id == str(current_user.id):
        return True

    task_owner = db.query(models.User).filter(models.User.id == db_task.user_id).first()
    if not task_owner:
        return False

    settings = get_workspace_settings_record(db, task_owner)
    permission_mode = settings.permission_mode if settings else "members_edit"

    if permission_mode in ["owner_only", "read_only"]:
        return False

    invite = db.query(models.WorkspaceInvite).filter(
        models.WorkspaceInvite.inviter_user_id == task_owner.id,
        models.WorkspaceInvite.invitee_email == current_user.email,
        models.WorkspaceInvite.status == "Accepted"
    ).first()

    if not invite:
        # Check reverse: did the current_user invite the task_owner?
        invite_reverse = db.query(models.WorkspaceInvite).filter(
            models.WorkspaceInvite.inviter_user_id == str(current_user.id),
            models.WorkspaceInvite.invitee_email == task_owner.email,
            models.WorkspaceInvite.status == "Accepted"
        ).first()
        if invite_reverse:
            return True
        return False

    role = (invite.role or "member").lower()
    if role == "viewer":
        return False
    if permission_mode == "admins_edit" and role != "admin":
        return False
    if permission_mode == "members_edit" and role in ["admin", "member"]:
        return True

    return False


def update_workspace_task(db: Session, db_task: models.WorkspaceTask, payload: schemas.WorkspaceTaskUpdate):
    update_data = payload.model_dump(exclude_unset=True)
    if update_data.get("project_name"):
        ensure_workspace_project(db, db_task.user_id, update_data["project_name"])
    for field, value in update_data.items():
        setattr(db_task, field, value)
    db.commit()
    db.refresh(db_task)
    return db_task


def delete_workspace_task(db: Session, db_task: models.WorkspaceTask):
    db.delete(db_task)
    db.commit()


def create_workspace_ai_task_records(
    db: Session,
    user_id: str,
    task_ids: list[str],
    prompt: str,
):
    batch_created_at = datetime.now(timezone.utc)
    for task_id in task_ids:
        db.add(models.WorkspaceAITaskRecord(user_id=user_id, task_id=task_id, prompt=prompt, created_at=batch_created_at))
    db.commit()


def get_workspace_ai_tasks(
    db: Session,
    current_user: models.User,
    project_name: str | None = None,
) -> list[models.WorkspaceTask]:
    scope_user_ids = _get_workspace_scope_user_ids(db, current_user)
    query = (
        db.query(models.WorkspaceTask)
        .join(models.WorkspaceAITaskRecord, models.WorkspaceAITaskRecord.task_id == models.WorkspaceTask.id)
        .filter(models.WorkspaceAITaskRecord.user_id.in_(scope_user_ids))
    )
    if project_name and project_name.lower() != "all":
        query = query.filter(models.WorkspaceTask.project_name == project_name)

    tasks = query.order_by(models.WorkspaceAITaskRecord.created_at.desc()).all()
    owner_lookup = {
        user.id: user.name
        for user in db.query(models.User).filter(models.User.id.in_(scope_user_ids)).all()
    }
    for task in tasks:
        setattr(task, "owner_name", owner_lookup.get(task.user_id))
    return tasks


def get_workspace_ai_task_groups(
    db: Session,
    current_user: models.User,
    project_name: str | None = None,
) -> list[schemas.WorkspaceAITaskGroupOut]:
    scope_user_ids = _get_workspace_scope_user_ids(db, current_user)
    query = (
        db.query(models.WorkspaceAITaskRecord, models.WorkspaceTask)
        .join(models.WorkspaceTask, models.WorkspaceAITaskRecord.task_id == models.WorkspaceTask.id)
        .filter(models.WorkspaceAITaskRecord.user_id.in_(scope_user_ids))
    )
    if project_name and project_name.lower() != "all":
        query = query.filter(models.WorkspaceTask.project_name == project_name)

    rows = query.order_by(models.WorkspaceAITaskRecord.created_at.desc(), models.WorkspaceAITaskRecord.id.asc()).all()
    owner_lookup = {
        user.id: user.name
        for user in db.query(models.User).filter(models.User.id.in_(scope_user_ids)).all()
    }
    groups: dict[tuple[str, datetime], list[models.WorkspaceTask]] = {}
    for record, task in rows:
        setattr(task, "owner_name", owner_lookup.get(task.user_id))
        groups.setdefault((record.prompt, record.created_at), []).append(task)

    return [
        schemas.WorkspaceAITaskGroupOut(
            prompt=prompt,
            created_at=created_at,
            tasks=[schemas.WorkspaceTaskOut.model_validate(task) for task in tasks],
        )
        for (prompt, created_at), tasks in sorted(groups.items(), key=lambda item: item[0][1], reverse=True)
    ]


def get_workspace_reports(
    db: Session,
    current_user: models.User,
    project_name: str | None = None,
) -> schemas.WorkspaceReportOut:
    tasks = get_workspace_tasks(db=db, current_user=current_user, project_name=project_name)
    members = get_workspace_members(db, current_user)

    total_tasks = len(tasks)
    completed_tasks = sum(1 for task in tasks if task.status == "Completed")
    in_progress_tasks = sum(1 for task in tasks if task.status == "In Progress")
    pending_tasks = total_tasks - completed_tasks
    today = date.today()
    overdue_tasks = sum(1 for task in tasks if task.due_date < today and task.status != "Completed")
    productivity_percentage = int((completed_tasks / total_tasks) * 100) if total_tasks else 0

    member_performance = []
    for member in members:
        assigned_tasks = [task for task in tasks if task.assignee == member.name]
        completed = sum(1 for task in assigned_tasks if task.status == "Completed")
        rate = int((completed / len(assigned_tasks)) * 100) if assigned_tasks else 0
        member_performance.append(
            schemas.WorkspaceMemberPerformance(
                name=member.name,
                role=member.role,
                assigned_tasks=len(assigned_tasks),
                completed_tasks=completed,
                completion_rate=rate,
            )
        )

    member_performance.sort(key=lambda item: (-item.completion_rate, -item.completed_tasks, item.name.lower()))
    return schemas.WorkspaceReportOut(
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        pending_tasks=pending_tasks,
        in_progress_tasks=in_progress_tasks,
        overdue_tasks=overdue_tasks,
        productivity_percentage=productivity_percentage,
        member_performance=member_performance,
    )

# ─── Behavioral Memory ────────────────────────────────────────────────────────

def get_user_behavioral_memory(db: Session, user_id: str) -> list[str]:
    memories = db.query(models.OrbitBehavioralMemory).filter(models.OrbitBehavioralMemory.user_id == user_id).all()
    if not memories:
        return []
    
    formatted_memories = []
    for mem in memories:
        # e.g., "Deep Work Preference: Prefers mornings"
        formatted_memories.append(f"{mem.pattern_type}: {mem.pattern_data}")
    return formatted_memories

def update_user_behavioral_memory(db: Session, user_id: str, insights: list[str]):
    for insight in insights:
        if ":" in insight:
            pattern_type, pattern_data = insight.split(":", 1)
            pattern_type = pattern_type.strip()
            pattern_data = pattern_data.strip()
        else:
            pattern_type = "General Preference"
            pattern_data = insight.strip()

        existing = db.query(models.OrbitBehavioralMemory).filter(
            models.OrbitBehavioralMemory.user_id == user_id,
            models.OrbitBehavioralMemory.pattern_type == pattern_type
        ).first()

        if existing:
            existing.pattern_data = pattern_data
            existing.updated_at = datetime.now(timezone.utc)
        else:
            new_mem = models.OrbitBehavioralMemory(
                user_id=user_id,
                pattern_type=pattern_type,
                pattern_data=pattern_data,
                updated_at=datetime.now(timezone.utc)
            )
            db.add(new_mem)
    db.commit()
