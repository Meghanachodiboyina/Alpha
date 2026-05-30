from datetime import date, datetime, timedelta, timezone

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


def create_routine(db: Session, user_id: str, routine: schemas.RoutineCreate):
    routine_data = routine.model_dump()
    if not routine_data.get("suggestion"):
        routine_data["suggestion"] = generate_task_suggestion(
            routine_data["title"],
            routine_data.get("description"),
            routine_data.get("priority", "Medium"),
        )
    db_routine = models.Routine(user_id=user_id, **routine_data)
    db.add(db_routine)
    db.commit()
    db.refresh(db_routine)
    return db_routine


def get_routines(db: Session, user_id: str):
    return (
        db.query(models.Routine)
        .filter(models.Routine.user_id == user_id, models.Routine.is_internal == False)
        .order_by(models.Routine.date.asc(), models.Routine.start_time.asc())
        .all()
    )


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

    db.commit()
    db.refresh(db_routine)
    return db_routine



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


def get_dashboard_stats(db: Session, user_id: str, weeks: int = 1):
    total_routines = (
        db.query(func.count(models.Routine.id))
        .filter(models.Routine.user_id == user_id, models.Routine.is_internal == False)
        .scalar()
        or 0
    )
    completed_routines = (
        db.query(func.count(models.Routine.id))
        .filter(models.Routine.user_id == user_id, models.Routine.status == "Completed", models.Routine.is_internal == False)
        .scalar()
        or 0
    )
    pending_routines = total_routines - completed_routines
    today_routines = (
        db.query(func.count(models.Routine.id))
        .filter(models.Routine.user_id == user_id, models.Routine.date == date.today(), models.Routine.is_internal == False)
        .scalar()
        or 0
    )

    productivity_score = int((completed_routines / total_routines) * 100) if total_routines else 0

    # Build weekly overview for N weeks (current + past weeks)
    start_of_current_week = date.today() - timedelta(days=date.today().weekday())
    start_date = start_of_current_week - timedelta(weeks=weeks - 1)
    end_date = start_of_current_week + timedelta(days=6)
    total_days = (end_date - start_date).days + 1

    weekly_rows = (
        db.query(models.Routine.date, func.count(models.Routine.id))
        .filter(
            models.Routine.user_id == user_id,
            models.Routine.is_internal == False,
            models.Routine.date >= start_date,
            models.Routine.date <= end_date,
        )
        .group_by(models.Routine.date)
        .order_by(models.Routine.date.asc())
        .all()
    )

    weekly_map = {routine_date.isoformat(): count for routine_date, count in weekly_rows}
    weekly_overview = []
    for i in range(total_days):
        current_date = start_date + timedelta(days=i)
        weekly_overview.append({
            "date": current_date.isoformat(),
            "count": weekly_map.get(current_date.isoformat(), 0)
        })

    return schemas.DashboardStats(
        total_routines=total_routines,
        completed_routines=completed_routines,
        pending_routines=pending_routines,
        today_routines=today_routines,
        productivity_score=productivity_score,
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
