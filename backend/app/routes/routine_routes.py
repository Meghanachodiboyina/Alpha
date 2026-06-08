from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status, Request
from sqlalchemy.orm import Session
from fastapi import Body
from .. import crud, schemas
from ..ai_engine import generate_ai_plan, analyze_ai_plan, transcribe_audio_with_groq
from ..auth import get_current_user
from ..rate_limiter import limiter
from ..quota import check_and_increment_ai_quota
from ..database import get_db
from ..models import User

router = APIRouter(tags=["Routines"])


@router.get("/routines", response_model=list[schemas.RoutineOut])
@limiter.limit("60/minute")
def list_routines(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.get_routines(db, current_user.id)


@router.get("/routines/weekly", response_model=list[schemas.RoutineOut])
@limiter.limit("60/minute")
def list_weekly_routines(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.get_weekly_routines(db, current_user.id)


@router.post("/routines", response_model=schemas.RoutineOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("60/minute")
def create_routine(
    request: Request,
    payload: schemas.RoutineCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.create_routine(db, current_user.id, payload)


@router.put("/routines/{routine_id}", response_model=schemas.RoutineOut)
@limiter.limit("60/minute")
def update_routine(
    request: Request,
    routine_id: int,
    payload: schemas.RoutineUpdate = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_routine = crud.get_routine_by_id(db, routine_id, current_user.id)
    if not db_routine:
        raise HTTPException(status_code=404, detail="Routine not found.")
    return crud.update_routine(db, db_routine, payload)


@router.delete("/routines/{routine_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("60/minute")
def delete_routine(
    request: Request,
    routine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_routine = crud.get_routine_by_id(db, routine_id, current_user.id)
    if not db_routine:
        raise HTTPException(status_code=404, detail="Routine not found.")
    crud.delete_routine(db, db_routine)


@router.post("/generate-routine", response_model=schemas.AIGenerationResponse)
@limiter.limit("5/minute")
async def generate_routine(
    request: Request,
    payload: schemas.AIGenerationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_and_increment_ai_quota(db, current_user, "routine_generations")
    ai_plan = await generate_ai_plan(payload.input_text, payload.plan_scope, getattr(payload, "current_time", None))
    # Save the generated routines to the database
    for r in ai_plan.routines:
        routine_create = schemas.RoutineCreate(**r.model_dump())
        crud.create_routine(db, current_user.id, routine_create)
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
    analysis = await analyze_ai_plan(payload.input_text, payload.plan_scope, getattr(payload, "current_time", None))
    # If no clarification needed and we have a result, save routines to DB
    if not analysis.needs_clarification and analysis.result:
        for r in analysis.result.routines:
            routine_create = schemas.RoutineCreate(**r.model_dump())
            crud.create_routine(db, current_user.id, routine_create)
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
    ai_plan = await generate_ai_plan(
        payload.input_text,
        payload.plan_scope,
        payload.current_time,
        clarifications=payload.clarifications,
    )
    # Save the generated routines to the database
    for r in ai_plan.routines:
        routine_create = schemas.RoutineCreate(**r.model_dump())
        crud.create_routine(db, current_user.id, routine_create)
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
