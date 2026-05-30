from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from fastapi import Body
from .. import crud, schemas
from ..ai_engine import generate_ai_plan, analyze_ai_plan, transcribe_audio_with_groq
from ..auth import get_current_user
from ..database import get_db
from ..models import User

router = APIRouter(tags=["Routines"])


@router.get("/routines", response_model=list[schemas.RoutineOut])
def list_routines(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.get_routines(db, current_user.id)


@router.get("/routines/weekly", response_model=list[schemas.RoutineOut])
def list_weekly_routines(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.get_weekly_routines(db, current_user.id)


@router.post("/routines", response_model=schemas.RoutineOut, status_code=status.HTTP_201_CREATED)
def create_routine(
    payload: schemas.RoutineCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud.create_routine(db, current_user.id, payload)


@router.put("/routines/{routine_id}", response_model=schemas.RoutineOut)
def update_routine(
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
def delete_routine(
    routine_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_routine = crud.get_routine_by_id(db, routine_id, current_user.id)
    if not db_routine:
        raise HTTPException(status_code=404, detail="Routine not found.")
    crud.delete_routine(db, db_routine)


@router.post("/generate-routine", response_model=schemas.AIGenerationResponse)
async def generate_routine(
    payload: schemas.AIGenerationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ai_plan = await generate_ai_plan(payload.input_text, payload.plan_scope, getattr(payload, "current_time", None))
    # Save the generated routines to the database
    for r in ai_plan.routines:
        routine_create = schemas.RoutineCreate(**r.model_dump())
        crud.create_routine(db, current_user.id, routine_create)
    return ai_plan


@router.post("/ai/analyze", response_model=schemas.AIAnalysisResponse)
async def ai_analyze(
    payload: schemas.AIGenerationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Phase 1: Analyze the user's request. Returns clarification questions or final routines."""
    analysis = await analyze_ai_plan(payload.input_text, payload.plan_scope, getattr(payload, "current_time", None))
    # If no clarification needed and we have a result, save routines to DB
    if not analysis.needs_clarification and analysis.result:
        for r in analysis.result.routines:
            routine_create = schemas.RoutineCreate(**r.model_dump())
            crud.create_routine(db, current_user.id, routine_create)
    return analysis


@router.post("/ai/generate-with-clarifications", response_model=schemas.AIGenerationResponse)
async def ai_generate_with_clarifications(
    payload: schemas.AIGenerationWithClarifications,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Phase 2: Generate schedule with user-provided clarification answers."""
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
async def transcribe_audio(
    audio: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
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
