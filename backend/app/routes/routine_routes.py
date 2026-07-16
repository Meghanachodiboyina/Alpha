from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status, Request, Query
from datetime import date as date_type
from sqlalchemy.orm import Session
from fastapi import Body
from .. import crud, schemas, models
from ..ai_engine import generate_ai_plan, analyze_ai_plan, transcribe_audio_with_groq
from ..auth import get_current_user
from ..rate_limiter import limiter
from ..quota import check_and_increment_ai_quota
from ..database import get_db
from ..models import User

router = APIRouter(tags=["Routines"])


def _existing_blocks(db: Session, user_id: str, current_time):
    """Load the user's already-scheduled blocks for the day being planned so the
    AI planner avoids overlapping them."""
    try:
        target_date = date_type.fromisoformat((current_time or "")[:10])
    except (ValueError, TypeError):
        target_date = date_type.today()
    return crud.get_scheduled_blocks_for_date(db, user_id, target_date)


@router.get("/routines", response_model=list[schemas.RoutineOut])
@limiter.limit("60/minute")
def list_routines(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.get_routines(db, str(current_user.id))


@router.get("/routines/planner")
@limiter.limit("60/minute")
def get_planner_sections(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns routines grouped into Today, Upcoming, and Completed sections."""
    sections = crud.get_routines_sections(db, str(current_user.id))
    return {
        "overdue": [schemas.RoutineOut.model_validate(r) for r in sections["overdue"]],
        "today": [schemas.RoutineOut.model_validate(r) for r in sections["today"]],
        "upcoming": [schemas.RoutineOut.model_validate(r) for r in sections["upcoming"]],
        "completed": [schemas.RoutineOut.model_validate(r) for r in sections["completed"]],
    }


@router.get("/routines/history", response_model=list[schemas.RoutineOut])
@limiter.limit("60/minute")
def get_historical_routines(
    request: Request,
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns past completed routines for the History tab with pagination."""
    from .. import models
    today = date_type.today()
    history = (
        db.query(models.Routine)
        .filter(
            models.Routine.user_id == str(current_user.id),
            models.Routine.is_internal == False,
            models.Routine.status == "Completed",
            models.Routine.date < today
        )
        .order_by(models.Routine.date.desc(), models.Routine.start_time.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return history


@router.get("/routines/date", response_model=list[schemas.RoutineOut])
@limiter.limit("60/minute")
def list_routines_by_date(
    request: Request,
    date: date_type = Query(..., description="Filter routines by scheduled date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns routines for a specific scheduled date only."""
    return crud.get_routines_by_date(db, str(current_user.id), date)


@router.get("/routines/weekly", response_model=list[schemas.RoutineOut])
@limiter.limit("60/minute")
def list_weekly_routines(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.get_weekly_routines(db, str(current_user.id))


@router.post("/routines", response_model=schemas.RoutineOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("60/minute")
def create_routine(
    request: Request,
    payload: schemas.RoutineCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.session_id:
        session = crud.get_routine_session_by_id(db, payload.session_id)
        if not session or str(session.user_id) != str(current_user.id):
            raise HTTPException(status_code=403, detail="Invalid session_id")
    return crud.create_routine(db, str(current_user.id), payload)


@router.put("/routines/{routine_id}", response_model=schemas.RoutineOut)
@limiter.limit("60/minute")
def update_routine(
    request: Request,
    routine_id: int,
    payload: schemas.RoutineUpdate = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_routine = crud.get_routine_by_id(db, routine_id, str(current_user.id))
    if not db_routine:
        raise HTTPException(status_code=404, detail="Routine not found.")
    return crud.update_routine(db, db_routine, payload)


@router.delete("/routines/{routine_id}")
@limiter.limit("60/minute")
def delete_routine(
    request: Request,
    routine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_routine = crud.get_routine_by_id(db, routine_id, str(current_user.id))
    if not db_routine:
        raise HTTPException(status_code=404, detail="Routine not found.")
    crud.delete_routine(db, db_routine)
    return {"status": "success", "message": "Deleted successfully"}


@router.delete("/routines/overdue/all")
@limiter.limit("10/minute")
def delete_all_overdue_routines(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete all overdue incomplete routines for the user."""
    from datetime import date
    today = date.today()
    db.query(models.Routine).filter(
        models.Routine.user_id == str(current_user.id),
        models.Routine.date < today,
        models.Routine.status != "Completed"
    ).delete()
    db.commit()
    return {"status": "success", "message": "All overdue routines deleted"}



@router.delete("/routines/history/by-date")
@limiter.limit("20/minute")
def delete_routines_by_date(
    request: Request,
    date: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete all history routines for a specific date (YYYY-MM-DD)."""
    db.query(models.Routine).filter(
        models.Routine.user_id == str(current_user.id),
        models.Routine.date == date
    ).delete()
    db.commit()
    return {"status": "success", "message": f"Deleted routines for {date}"}


@router.post("/generate-routine", response_model=schemas.AIGenerationResponse)
@limiter.limit("5/minute")
async def generate_routine(
    request: Request,
    payload: schemas.AIGenerationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_and_increment_ai_quota(db, current_user, "routine_generations")
    user_memory = crud.get_user_behavioral_memory(db, str(current_user.id))
    current_time = getattr(payload, "current_time", None)
    existing_blocks = _existing_blocks(db, str(current_user.id), current_time)
    ai_plan = await generate_ai_plan(payload.input_text, payload.plan_scope, current_time, user_memory_context=user_memory, existing_blocks=existing_blocks)
    if ai_plan.new_behavioral_insights:
        crud.update_user_behavioral_memory(db, str(current_user.id), ai_plan.new_behavioral_insights)
    # Save the generated routines to the database
    for r in ai_plan.routines:
        routine_create = schemas.RoutineCreate(**r.model_dump())
        crud.create_routine(db, str(current_user.id), routine_create)
    return ai_plan


@router.post("/ai/analyze", response_model=schemas.AIAnalysisResponse)
@limiter.limit("5/minute")
async def ai_analyze(
    request: Request,
    payload: schemas.AIGenerationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Phase 1: Analyze the user's request. Returns clarification questions or final routines."""
    check_and_increment_ai_quota(db, current_user, "analysis_requests")
    current_time = getattr(payload, "current_time", None)
    user_memory = crud.get_user_behavioral_memory(db, str(current_user.id))
    existing_blocks = _existing_blocks(db, str(current_user.id), current_time)
    analysis = await analyze_ai_plan(payload.input_text, payload.plan_scope, current_time, existing_blocks=existing_blocks, user_memory_context=user_memory)
    # If no clarification needed and we have a result, save routines to DB
    if not analysis.needs_clarification and analysis.result:
        for r in analysis.result.routines:
            routine_create = schemas.RoutineCreate(**r.model_dump())
            crud.create_routine(db, str(current_user.id), routine_create)
    return analysis


@router.post("/ai/generate-with-clarifications", response_model=schemas.AIGenerationResponse)
@limiter.limit("5/minute")
async def ai_generate_with_clarifications(
    request: Request,
    payload: schemas.AIGenerationWithClarifications,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Phase 2: Generate schedule with user-provided clarification answers."""
    check_and_increment_ai_quota(db, current_user, "clarification_requests")
    
    # Save energy preference permanently if the user answered it
    if payload.clarifications and "energy_preference" in payload.clarifications:
        pref = payload.clarifications["energy_preference"]
        crud.update_user_behavioral_memory(db, str(current_user.id), [f"Peak Energy Preference: {pref}"])

    user_memory = crud.get_user_behavioral_memory(db, str(current_user.id))
    existing_blocks = _existing_blocks(db, str(current_user.id), payload.current_time)
    ai_plan = await generate_ai_plan(
        payload.input_text,
        payload.plan_scope,
        payload.current_time,
        clarifications=payload.clarifications,
        user_memory_context=user_memory,
        existing_blocks=existing_blocks,
    )
    if ai_plan.new_behavioral_insights:
        crud.update_user_behavioral_memory(db, str(current_user.id), ai_plan.new_behavioral_insights)
    # Save the generated routines to the database
    for r in ai_plan.routines:
        routine_create = schemas.RoutineCreate(**r.model_dump())
        crud.create_routine(db, str(current_user.id), routine_create)
    return ai_plan


@router.post("/transcribe-audio")
@limiter.limit("5/minute")
async def transcribe_audio(
    request: Request,
    audio: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_and_increment_ai_quota(db, current_user, "audio_transcriptions")
    audio_bytes = await audio.read()
    text = await transcribe_audio_with_groq(
        audio_bytes=audio_bytes,
        filename=audio.filename or "voice.webm",
        content_type=audio.content_type or "audio/webm",
    )
    if not text:
        raise HTTPException(
            status_code=503,
            detail="Voice transcription is unavailable. Add API_KEY or try again.",
        )
    return {"text": text}


@router.post("/routines/check-conflict", response_model=schemas.ConflictCheckResponse)
@limiter.limit("60/minute")
def check_conflict(
    request: Request,
    payload: schemas.ConflictCheckRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check whether a proposed time change would conflict with existing routines."""
    conflicts = crud.check_routine_conflict(
        db,
        str(current_user.id),
        payload.routine_id,
        payload.new_start_time,
        payload.new_end_time,
        payload.new_date,
    )
    if conflicts:
        titles = ", ".join(str(c.title) for c in conflicts[:3])
        return schemas.ConflictCheckResponse(
            has_conflict=True,
            conflicting_routines=[schemas.ConflictingRoutineInfo.model_validate(c) for c in conflicts],
            message=f"This time slot overlaps with: {titles}. Would you like to keep the change or let Orbit re-optimize?",
        )
    return schemas.ConflictCheckResponse(has_conflict=False, message="No conflicts detected.")


@router.get("/orbit/daily-review", response_model=schemas.DailyReviewResponse)
@limiter.limit("20/minute")
def daily_review(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns today's execution stats and carry-forward suggestions."""
    review = crud.get_daily_review(db, str(current_user.id))
    completed = review["completed_count"]
    skipped = review["skipped_count"]
    partial = review["partial_count"]
    pending = review["pending_count"]
    total = completed + skipped + partial + pending
    focus_h = round(review["total_focus_minutes"] / 60, 1)

    if total == 0:
        msg = "No tasks were scheduled today."
    elif completed == total:
        msg = f"Outstanding day! You completed all {total} tasks with {focus_h}h of focused work."
    else:
        msg = f"You completed {completed}/{total} tasks today with {focus_h}h of focused work."
        carry = review["carry_forward"]
        if carry:
            carry_titles = ", ".join(c.title for c in carry[:3])
            msg += f" Unfinished: {carry_titles}."

    carry_forward_serialized = [schemas.DailyReviewCarryForward.model_validate(r) for r in review["carry_forward"]]
    return schemas.DailyReviewResponse(
        completed_count=review["completed_count"],
        skipped_count=review["skipped_count"],
        partial_count=review["partial_count"],
        pending_count=review["pending_count"],
        total_focus_minutes=review["total_focus_minutes"],
        total_recovery_minutes=review["total_recovery_minutes"],
        carry_forward=carry_forward_serialized,
        summary_message=msg,
    )


@router.patch("/routines/{routine_id}/complete", response_model=schemas.RoutineOut)
@limiter.limit("60/minute")
def mark_routine_complete(
    request: Request,
    routine_id: int,
    actual_duration: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a routine as completed, optionally recording the actual duration."""
    db_routine = crud.get_routine_by_id(db, routine_id, str(current_user.id))
    if not db_routine:
        raise HTTPException(status_code=404, detail="Routine not found.")
    update_payload = schemas.RoutineUpdate(status="Completed")
    if actual_duration is not None:
        update_payload.actual_duration = actual_duration
    return crud.update_routine(db, db_routine, update_payload)
