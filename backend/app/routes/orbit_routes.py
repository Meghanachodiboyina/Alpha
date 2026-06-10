from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..ai_engine import analyze_ai_plan, generate_ai_plan
from ..auth import get_current_user
from ..database import get_db
from ..models import (
    OrbitConversation,
    OrbitMessage,
    OrbitTaskMemory,
    Routine,
    User,
)
from ..quota import check_and_increment_ai_quota
from ..rate_limiter import limiter

router = APIRouter(prefix="/orbit", tags=["Orbit"])


# ─── Helpers ───────────────────────────────────────────────────────────────

def _save_message(
    db: Session,
    conversation_id: int,
    role: str,
    content: str,
    message_type: str,
    metadata_json: Optional[dict] = None,
) -> OrbitMessage:
    msg = OrbitMessage(
        conversation_id=conversation_id,
        role=role,
        content=content,
        message_type=message_type,
        metadata_json=metadata_json,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def _auto_title(text: str) -> str:
    """Generate a short conversation title from the first user message."""
    words = text.strip().split()
    title = " ".join(words[:8])
    if len(words) > 8:
        title += "..."
    return title[:255]


# ─── Conversation CRUD ──────────────────────────────────────────────────────

@router.get("/conversations", response_model=list[schemas.OrbitConversationOut])
@limiter.limit("60/minute")
def list_conversations(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all conversations for the user, newest first, without messages."""
    convos = (
        db.query(OrbitConversation)
        .filter(OrbitConversation.user_id == current_user.id)
        .order_by(OrbitConversation.updated_at.desc())
        .all()
    )
    # Return without loading messages (lightweight list)
    for c in convos:
        c.messages = []
    return convos


@router.post("/conversations", response_model=schemas.OrbitConversationOut, status_code=201)
@limiter.limit("20/minute")
def create_conversation(
    request: Request,
    payload: schemas.OrbitConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    convo = OrbitConversation(user_id=current_user.id, title=payload.title)
    db.add(convo)
    db.commit()
    db.refresh(convo)
    return convo


@router.get("/conversations/{conversation_id}", response_model=schemas.OrbitConversationOut)
@limiter.limit("60/minute")
def get_conversation(
    request: Request,
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    convo = db.query(OrbitConversation).filter(
        OrbitConversation.id == conversation_id,
        OrbitConversation.user_id == current_user.id,
    ).first()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return convo


@router.patch("/conversations/{conversation_id}", response_model=schemas.OrbitConversationOut)
@limiter.limit("30/minute")
def rename_conversation(
    request: Request,
    conversation_id: int,
    payload: schemas.OrbitConversationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    convo = db.query(OrbitConversation).filter(
        OrbitConversation.id == conversation_id,
        OrbitConversation.user_id == current_user.id,
    ).first()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    convo.title = payload.title
    db.commit()
    db.refresh(convo)
    return convo


@router.delete("/conversations/{conversation_id}", status_code=204)
@limiter.limit("20/minute")
def delete_conversation(
    request: Request,
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    convo = db.query(OrbitConversation).filter(
        OrbitConversation.id == conversation_id,
        OrbitConversation.user_id == current_user.id,
    ).first()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    db.delete(convo)
    db.commit()


# ─── Main Chat Endpoint ─────────────────────────────────────────────────────

@router.post("/chat", response_model=schemas.OrbitChatResponse)
@limiter.limit("10/minute")
async def orbit_chat(
    request: Request,
    payload: schemas.OrbitChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Core Orbit chat endpoint.
    - Creates or resumes a conversation.
    - Saves the user message.
    - Runs AI analysis (clarification or full generation).
    - Saves Orbit's response messages.
    - Returns all new messages to append to the chat.
    """
    # 1. Get or create conversation
    if payload.conversation_id:
        convo = db.query(OrbitConversation).filter(
            OrbitConversation.id == payload.conversation_id,
            OrbitConversation.user_id == current_user.id,
        ).first()
        if not convo:
            raise HTTPException(status_code=404, detail="Conversation not found.")
    else:
        convo = OrbitConversation(
            user_id=current_user.id,
            title=_auto_title(payload.user_message),
        )
        db.add(convo)
        db.commit()
        db.refresh(convo)

    new_messages: list[OrbitMessage] = []
    routines_created = 0

    # 2. Save user message
    user_msg = _save_message(
        db, convo.id, "user", payload.user_message, "user_message"
    )
    new_messages.append(user_msg)

    # 3. Update conversation timestamp
    convo.updated_at = datetime.now(timezone.utc)
    db.commit()

    now_iso = payload.current_time or datetime.now(timezone.utc).isoformat()

    try:
        # 4a. If this is a clarification follow-up, generate immediately
        if payload.is_clarification_response and payload.clarifications:
            check_and_increment_ai_quota(db, current_user, "clarification_requests")
            ai_plan = await generate_ai_plan(
                payload.user_message,
                payload.plan_scope,
                now_iso,
                clarifications=payload.clarifications,
            )
            # Save routines
            for r in ai_plan.routines:
                routine_create = schemas.RoutineCreate(**r.model_dump())
                crud.create_routine(db, current_user.id, routine_create)
                routines_created += 1

            # Build thinking complete message
            thinking_msg = _save_message(
                db, convo.id, "orbit",
                "✓ Understanding your tasks\n✓ Identifying priorities\n✓ Detecting scheduling constraints\n✓ Validating real-world feasibility\n✓ Creating optimized routine",
                "thinking_state",
            )
            new_messages.append(thinking_msg)

            # Build summary message
            summary_content = ai_plan.summary
            if ai_plan.explanation:
                summary_content += f"\n\n{ai_plan.explanation}"
            summary_msg = _save_message(
                db, convo.id, "orbit", summary_content, "routine_summary",
                metadata_json={"productivity_tips": ai_plan.productivity_tips},
            )
            new_messages.append(summary_msg)

            # Build preview card
            card_msg = _save_message(
                db, convo.id, "orbit",
                "Your schedule is ready.",
                "routine_preview_card",
                metadata_json={
                    "task_count": len(ai_plan.routines),
                    "hours_planned": round(sum(r.estimated_time for r in ai_plan.routines) / 60, 1),
                    "focus_blocks": sum(1 for r in ai_plan.routines if r.focus_mode_recommended),
                },
            )
            new_messages.append(card_msg)

        else:
            # 4b. Analyze — may return clarifications or direct result
            check_and_increment_ai_quota(db, current_user, "analysis_requests")
            analysis = await analyze_ai_plan(payload.user_message, payload.plan_scope, now_iso)

            if analysis.needs_clarification and analysis.clarifications:
                # Return clarification questions as a chat message
                clarification_content = "\n".join(
                    f"• {q.question}" for q in analysis.clarifications
                )
                clarification_msg = _save_message(
                    db, convo.id, "orbit",
                    clarification_content,
                    "clarification_question",
                    metadata_json={
                        "clarifications": [q.model_dump() for q in analysis.clarifications],
                    },
                )
                new_messages.append(clarification_msg)

            elif analysis.result:
                # No clarification needed — save routines directly
                for r in analysis.result.routines:
                    routine_create = schemas.RoutineCreate(**r.model_dump())
                    crud.create_routine(db, current_user.id, routine_create)
                    routines_created += 1

                thinking_msg = _save_message(
                    db, convo.id, "orbit",
                    "✓ Understanding your tasks\n✓ Identifying priorities\n✓ Detecting scheduling constraints\n✓ Validating real-world feasibility\n✓ Creating optimized routine",
                    "thinking_state",
                )
                new_messages.append(thinking_msg)

                summary_content = analysis.result.summary
                if analysis.result.explanation if hasattr(analysis.result, 'explanation') else None:
                    summary_content += f"\n\n{analysis.result.explanation}"
                summary_msg = _save_message(
                    db, convo.id, "orbit", summary_content, "routine_summary",
                    metadata_json={"productivity_tips": analysis.result.productivity_tips},
                )
                new_messages.append(summary_msg)

                card_msg = _save_message(
                    db, convo.id, "orbit",
                    "Your schedule is ready.",
                    "routine_preview_card",
                    metadata_json={
                        "task_count": len(analysis.result.routines),
                        "hours_planned": round(sum(r.estimated_time for r in analysis.result.routines) / 60, 1),
                        "focus_blocks": sum(1 for r in analysis.result.routines if r.focus_mode_recommended),
                    },
                )
                new_messages.append(card_msg)

    except Exception as e:
        error_msg = _save_message(
            db, convo.id, "orbit",
            f"I ran into an issue: {str(e)}. Please try again.",
            "orbit_message",
        )
        new_messages.append(error_msg)

    return schemas.OrbitChatResponse(
        conversation_id=convo.id,
        messages=[schemas.OrbitMessageOut.model_validate(m) for m in new_messages],
        routines_created=routines_created,
    )


# ─── Task Memory ───────────────────────────────────────────────────────────

@router.post("/task-memory", response_model=schemas.OrbitTaskMemoryOut, status_code=201)
@limiter.limit("30/minute")
def record_task_outcome(
    request: Request,
    payload: schemas.OrbitTaskMemoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Record a task outcome (completed/skipped/deferred) into task memory."""
    # If routine_id provided, optionally update the routine's status
    if payload.routine_id:
        routine = db.query(Routine).filter(
            Routine.id == payload.routine_id,
            Routine.user_id == current_user.id,
        ).first()
        if routine:
            status_map = {
                "completed": "Completed",
                "skipped": "Skipped",
                "deferred": "Deferred",
            }
            routine.status = status_map.get(payload.status, routine.status)
            db.commit()

    memory = OrbitTaskMemory(
        user_id=current_user.id,
        routine_id=payload.routine_id,
        task_title=payload.task_title,
        task_date=payload.task_date,
        status=payload.status,
        deferred_to=payload.deferred_to,
    )
    db.add(memory)
    db.commit()
    db.refresh(memory)
    return memory


@router.get("/incomplete-tasks", response_model=schemas.OrbitIncompleteTasksResponse)
@limiter.limit("20/minute")
def get_incomplete_tasks(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns tasks from previous days that are still Pending or Skipped.
    Used by the frontend to show recovery prompts (once per day).
    """
    today = date.today()
    incomplete = (
        db.query(OrbitTaskMemory)
        .filter(
            OrbitTaskMemory.user_id == current_user.id,
            OrbitTaskMemory.task_date < today,
            OrbitTaskMemory.status.in_(["skipped", "pending"]),
        )
        .order_by(OrbitTaskMemory.task_date.desc())
        .limit(10)
        .all()
    )

    # Also check routines table for Pending routines from before today
    pending_routines = (
        db.query(Routine)
        .filter(
            Routine.user_id == current_user.id,
            Routine.date < today,
            Routine.status == "Pending",
            Routine.is_internal == False,
        )
        .order_by(Routine.date.desc())
        .limit(10)
        .all()
    )

    # Build synthetic task memory entries from pending routines (not yet tracked)
    tracked_routine_ids = {m.routine_id for m in incomplete if m.routine_id}
    for r in pending_routines:
        if r.id not in tracked_routine_ids:
            synthetic = OrbitTaskMemory(
                id=-r.id,  # negative id = synthetic
                user_id=current_user.id,
                routine_id=r.id,
                task_title=r.title,
                task_date=r.date,
                status="pending",
                deferred_to=None,
                created_at=datetime.now(timezone.utc),
            )
            incomplete.append(synthetic)

    return schemas.OrbitIncompleteTasksResponse(
        has_incomplete=len(incomplete) > 0,
        tasks=[schemas.OrbitTaskMemoryOut.model_validate(t) for t in incomplete],
        checked_at=datetime.now(timezone.utc),
    )
