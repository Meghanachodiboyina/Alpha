from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..ai_engine import (
    analyze_ai_plan,
    generate_ai_plan,
    classify_orbit_intent,
    extract_planning_context,
    apply_schedule_edit,
)
from ..auth import get_current_user
from ..database import get_db
from ..models import (
    OrbitConversation,
    OrbitMessage,
    OrbitTaskMemory,
    Routine,
    RoutineSession,
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


def _has_overlaps(routines: list[dict]) -> bool:
    """True if any two non-internal generated routines overlap in time."""
    def _mins(t) -> int | None:
        if not t:
            return None
        parts = str(t).split(":")
        try:
            return int(parts[0]) * 60 + int(parts[1])
        except (ValueError, IndexError):
            return None

    spans = []
    for r in routines:
        if r.get("is_internal"):
            continue
        s, e = _mins(r.get("start_time")), _mins(r.get("end_time"))
        if s is not None and e is not None and e > s:
            spans.append((s, e))
    spans.sort()
    for (s1, e1), (s2, e2) in zip(spans, spans[1:]):
        if s2 < e1:
            return True
    return False


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
        .filter(OrbitConversation.user_id == str(current_user.id))
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
        OrbitConversation.user_id == str(current_user.id),
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
        OrbitConversation.user_id == str(current_user.id),
    ).first()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    convo.title = payload.title
    db.commit()
    db.refresh(convo)
    return convo


@router.delete("/conversations/{conversation_id}")
@limiter.limit("20/minute")
def delete_conversation(
    request: Request,
    conversation_id: int,
    delete_routines: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    convo = db.query(OrbitConversation).filter(
        OrbitConversation.id == conversation_id,
        OrbitConversation.user_id == str(current_user.id),
    ).first()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    if delete_routines:
        # Delete all RoutineSessions (and cascading Routines) linked to this conversation
        linked_sessions = db.query(RoutineSession).filter(
            RoutineSession.conversation_id == conversation_id
        ).all()
        for rs in linked_sessions:
            db.delete(rs)
        db.commit()

    db.delete(convo)
    db.commit()
    return {"status": "success", "message": "Deleted successfully"}


# ─── Main Chat Endpoint ─────────────────────────────────────────────────────

@router.post("/chat/precheck")
@limiter.limit("20/minute")
async def orbit_chat_precheck(
    request: Request,
    payload: schemas.OrbitChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ctx = {}
    if payload.conversation_id:
        orbit_session = crud.get_or_create_orbit_session(db, current_user.id, payload.conversation_id)
        ctx = dict(orbit_session.context_json or {})
    
    intent = await classify_orbit_intent(payload.user_message, ctx)
    is_heavy = intent in ("planning_request", "schedule_edit", "clarification_response")
    return {"intent": intent, "is_heavy": is_heavy}


@router.post("/chat", response_model=schemas.OrbitChatResponse)
@limiter.limit("10/minute")
async def orbit_chat(
    request: Request,
    payload: schemas.OrbitChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Stateful Orbit chat endpoint with full session memory.

    Every message is dispatched based on the current session state:
      WAITING_FOR_INPUT      → classify intent → greet / plan / reject
      WAITING_FOR_TASKS      → store tasks, advance state
      WAITING_FOR_DURATION   → store duration, advance state
      WAITING_FOR_CONSTRAINTS→ store constraints, advance to READY
      READY_TO_GENERATE      → generate schedule
      COMPLETE               → handle schedule edits only
    """
    # ── 1. Get or create conversation ────────────────────────────────────────
    if payload.conversation_id:
        convo = db.query(OrbitConversation).filter(
            OrbitConversation.id == payload.conversation_id,
            OrbitConversation.user_id == str(current_user.id),
        ).first()
        if not convo:
            raise HTTPException(status_code=404, detail="Conversation not found.")
    else:
        convo = OrbitConversation(
            user_id=current_user.id,
            title=_auto_title(payload.user_message),
            status="WAITING_FOR_INPUT",
            original_prompt=payload.user_message,
        )
        db.add(convo)
        db.commit()
        db.refresh(convo)

    # ── 2. Load or create OrbitSession (persistent context) ──────────────────
    orbit_session = crud.get_or_create_orbit_session(db, current_user.id, convo.id)
    ctx = dict(orbit_session.context_json or {})
    state = orbit_session.current_state

    new_messages: list[OrbitMessage] = []
    routines_created = 0

    # ── 3. Save user message ─────────────────────────────────────────────────
    user_msg = _save_message(db, convo.id, "user", payload.user_message, "user_message")
    new_messages.append(user_msg)
    convo.updated_at = datetime.now(timezone.utc)
    if not convo.original_prompt:
        convo.original_prompt = payload.user_message
    db.commit()

    now_iso = payload.current_time or datetime.now(timezone.utc).isoformat()

    try:
        check_and_increment_ai_quota(db, current_user, "analysis_requests")
        # ── 4. Classify intent with full context awareness ───────────────────
        if payload.client_intent:
            intent = payload.client_intent
        else:
            intent = await classify_orbit_intent(payload.user_message, ctx)

        # ── 5. Handle non-planning intents first (regardless of state) ───────
        if intent == "greeting":
            reply = "Hi! I'm Orbit. Tell me your tasks, goals, or plans and I'll build your perfect schedule. ✦"
            msg = _save_message(db, convo.id, "orbit", reply, "orbit_message")
            new_messages.append(msg)
            return schemas.OrbitChatResponse(
                conversation_id=convo.id,
                session_id=orbit_session.id,
                messages=[schemas.OrbitMessageOut.model_validate(m) for m in new_messages],
                routines_created=0,
                status=state,
                session_state=state,
            )

        if intent == "gratitude":
            reply = "You're very welcome! Let me know if you need to adjust your schedule or plan anything else. ✦"
            msg = _save_message(db, convo.id, "orbit", reply, "orbit_message")
            new_messages.append(msg)
            return schemas.OrbitChatResponse(
                conversation_id=convo.id,
                session_id=orbit_session.id,
                messages=[schemas.OrbitMessageOut.model_validate(m) for m in new_messages],
                routines_created=0,
                status=state,
                session_state=state,
            )

        if intent == "small_talk":
            reply = "I'm here and ready to help plan your day! What would you like to accomplish today?"
            msg = _save_message(db, convo.id, "orbit", reply, "orbit_message")
            new_messages.append(msg)
            return schemas.OrbitChatResponse(
                conversation_id=convo.id,
                session_id=orbit_session.id,
                messages=[schemas.OrbitMessageOut.model_validate(m) for m in new_messages],
                routines_created=0,
                status=state,
                session_state=state,
            )

        if intent == "unrelated":
            reply = "I'm specifically designed for planning, scheduling, and productivity. Tell me what you'd like to accomplish today and I'll build your schedule!"
            msg = _save_message(db, convo.id, "orbit", reply, "orbit_message")
            new_messages.append(msg)
            return schemas.OrbitChatResponse(
                conversation_id=convo.id,
                session_id=orbit_session.id,
                messages=[schemas.OrbitMessageOut.model_validate(m) for m in new_messages],
                routines_created=0,
                status=state,
                session_state=state,
            )

        # ── 6. Schedule edit (only valid after COMPLETE) ──────────────────────
        if intent == "schedule_edit" and state == "COMPLETE":
            generated = ctx.get("generated_routines", [])
            edit_request = payload.user_message
            # If the current schedule actually has overlapping blocks, tell the
            # editor to resolve them regardless of how the user phrased it.
            if _has_overlaps(generated):
                edit_request += (
                    " Also, some tasks currently overlap in time. Reschedule them "
                    "so that no two tasks overlap, keeping their order and durations."
                )
            updated_routines, edit_summary = await apply_schedule_edit(
                edit_request, generated, now_iso
            )
            # Persist updated routines to DB
            # Delete old routines in this session and re-create
            if orbit_session.conversation_id:
                routine_sessions = db.query(RoutineSession).filter(
                    RoutineSession.conversation_id == orbit_session.conversation_id
                ).all()
                for rs in routine_sessions:
                    for r in list(rs.routines):
                        db.delete(r)
                    db.delete(rs)
                db.commit()

            # Create new RoutineSession + routines from updated list
            try:
                scheduled_date = date.fromisoformat(now_iso[:10])
            except Exception:
                scheduled_date = date.today()

            routine_session = crud.create_routine_session(
                db, current_user.id, scheduled_date, conversation_id=convo.id
            )
            for r_data in updated_routines:
                try:
                    routine_create = schemas.RoutineCreate(**{
                        k: v for k, v in r_data.items()
                        if k in schemas.RoutineCreate.model_fields
                    })
                    crud.create_routine(db, current_user.id, routine_create, session_id=routine_session.id)
                    routines_created += 1
                except Exception:
                    pass

            # Update context with new routines
            crud.update_orbit_context(db, orbit_session, {"generated_routines": updated_routines})

            # Reply with edit summary
            edit_msg = _save_message(db, convo.id, "orbit", f"✓ {edit_summary}", "orbit_message")
            new_messages.append(edit_msg)

            card_msg = _save_message(
                db, convo.id, "orbit",
                "Your updated schedule is ready.",
                "routine_preview_card",
                metadata_json={
                    "task_count": len(updated_routines),
                    "hours_planned": round(sum(r.get("estimated_time", 60) for r in updated_routines) / 60, 1),
                    "focus_blocks": sum(1 for r in updated_routines if r.get("focus_mode_recommended")),
                },
            )
            new_messages.append(card_msg)

            return schemas.OrbitChatResponse(
                conversation_id=convo.id,
                session_id=orbit_session.id,
                messages=[schemas.OrbitMessageOut.model_validate(m) for m in new_messages],
                routines_created=routines_created,
                status="COMPLETE",
                session_state="COMPLETE",
            )

        # ── 7. State machine: clarification_response ──────────────────────────
        if intent == "clarification_response" or state in (
            "WAITING_FOR_TASKS", "WAITING_FOR_DURATION", "WAITING_FOR_CONSTRAINTS"
        ):
            # Extract and merge context from this reply
            ctx = await extract_planning_context(payload.user_message, ctx)
            crud.update_orbit_context(db, orbit_session, ctx)

            # Determine what's still missing and advance state
            tasks_known      = bool(ctx.get("tasks"))
            duration_known   = bool(ctx.get("duration"))
            constraints_known = ctx.get("constraints_asked", False) or bool(ctx.get("fixed_events")) or bool(ctx.get("constraints"))

            if not tasks_known:
                question = "What would you like to work on today?"
                ctx["pending_question"] = question
                ctx["pending_question_key"] = "tasks"
                crud.update_orbit_context(db, orbit_session, ctx)
                crud.update_orbit_state(db, orbit_session, "WAITING_FOR_TASKS")
                msg = _save_message(db, convo.id, "orbit", question, "orbit_message")
                new_messages.append(msg)
                return schemas.OrbitChatResponse(
                    conversation_id=convo.id,
                    session_id=orbit_session.id,
                    messages=[schemas.OrbitMessageOut.model_validate(m) for m in new_messages],
                    routines_created=0,
                    status="WAITING_FOR_TASKS",
                    session_state="WAITING_FOR_TASKS",
                )

            if not duration_known:
                tasks_str = ", ".join(ctx["tasks"][:3])
                question = f"How long would you like to spend on {tasks_str}?"
                ctx["pending_question"] = question
                ctx["pending_question_key"] = "duration"
                crud.update_orbit_context(db, orbit_session, ctx)
                crud.update_orbit_state(db, orbit_session, "WAITING_FOR_DURATION")
                msg = _save_message(db, convo.id, "orbit", question, "orbit_message")
                new_messages.append(msg)
                return schemas.OrbitChatResponse(
                    conversation_id=convo.id,
                    session_id=orbit_session.id,
                    messages=[schemas.OrbitMessageOut.model_validate(m) for m in new_messages],
                    routines_created=0,
                    status="WAITING_FOR_DURATION",
                    session_state="WAITING_FOR_DURATION",
                )

            if not constraints_known:
                question = "Any fixed events, meetings, or time constraints I should know about?"
                ctx["pending_question"] = question
                ctx["pending_question_key"] = "constraints"
                ctx["constraints_asked"] = True
                crud.update_orbit_context(db, orbit_session, ctx)
                crud.update_orbit_state(db, orbit_session, "WAITING_FOR_CONSTRAINTS")
                msg = _save_message(db, convo.id, "orbit", question, "orbit_message")
                new_messages.append(msg)
                return schemas.OrbitChatResponse(
                    conversation_id=convo.id,
                    session_id=orbit_session.id,
                    messages=[schemas.OrbitMessageOut.model_validate(m) for m in new_messages],
                    routines_created=0,
                    status="WAITING_FOR_CONSTRAINTS",
                    session_state="WAITING_FOR_CONSTRAINTS",
                )

            # All info collected — fall through to generation below
            intent = "planning_request"

        # ── 8. Planning request / READY_TO_GENERATE: full pipeline ───────────
        if intent == "planning_request" or state in ("WAITING_FOR_INPUT", "READY_TO_GENERATE"):
            # If this is a fresh planning request, extract context first
            if intent == "planning_request" and state == "WAITING_FOR_INPUT":
                ctx = await extract_planning_context(payload.user_message, ctx)
                crud.update_orbit_context(db, orbit_session, ctx)

                tasks_known      = bool(ctx.get("tasks"))
                duration_known   = bool(ctx.get("duration"))
                constraints_known = ctx.get("constraints_asked", False) or bool(ctx.get("fixed_events")) or bool(ctx.get("constraints"))

                # Ask for missing info conversationally
                if not tasks_known:
                    question = "What would you like to work on today?"
                    ctx["pending_question"] = question
                    ctx["pending_question_key"] = "tasks"
                    crud.update_orbit_context(db, orbit_session, ctx)
                    crud.update_orbit_state(db, orbit_session, "WAITING_FOR_TASKS")
                    msg = _save_message(db, convo.id, "orbit", question, "orbit_message")
                    new_messages.append(msg)
                    return schemas.OrbitChatResponse(
                        conversation_id=convo.id,
                        session_id=orbit_session.id,
                        messages=[schemas.OrbitMessageOut.model_validate(m) for m in new_messages],
                        routines_created=0,
                        status="WAITING_FOR_TASKS",
                        session_state="WAITING_FOR_TASKS",
                    )

                if not duration_known and not ctx.get("goal_has_duration"):
                    tasks_str = ", ".join(ctx["tasks"][:3])
                    question = f"How long would you like to spend on {tasks_str}?"
                    ctx["pending_question"] = question
                    ctx["pending_question_key"] = "duration"
                    crud.update_orbit_context(db, orbit_session, ctx)
                    crud.update_orbit_state(db, orbit_session, "WAITING_FOR_DURATION")
                    msg = _save_message(db, convo.id, "orbit", question, "orbit_message")
                    new_messages.append(msg)
                    return schemas.OrbitChatResponse(
                        conversation_id=convo.id,
                        session_id=orbit_session.id,
                        messages=[schemas.OrbitMessageOut.model_validate(m) for m in new_messages],
                        routines_created=0,
                        status="WAITING_FOR_DURATION",
                        session_state="WAITING_FOR_DURATION",
                    )

                if not constraints_known:
                    question = "Any fixed events, meetings, or time constraints I should know about?"
                    ctx["pending_question"] = question
                    ctx["pending_question_key"] = "constraints"
                    ctx["constraints_asked"] = True
                    crud.update_orbit_context(db, orbit_session, ctx)
                    crud.update_orbit_state(db, orbit_session, "WAITING_FOR_CONSTRAINTS")
                    msg = _save_message(db, convo.id, "orbit", question, "orbit_message")
                    new_messages.append(msg)
                    return schemas.OrbitChatResponse(
                        conversation_id=convo.id,
                        session_id=orbit_session.id,
                        messages=[schemas.OrbitMessageOut.model_validate(m) for m in new_messages],
                        routines_created=0,
                        status="WAITING_FOR_CONSTRAINTS",
                        session_state="WAITING_FOR_CONSTRAINTS",
                    )

            # ── GENERATE SCHEDULE ────────────────────────────────────────────
            crud.update_orbit_state(db, orbit_session, "GENERATING")
            convo.status = "GENERATING"
            db.commit()

            # Build enriched prompt from accumulated context

            enriched_prompt = payload.user_message
            if ctx.get("tasks"):
                enriched_prompt = f"Tasks: {', '.join(ctx['tasks'])}"
            if ctx.get("duration"):
                enriched_prompt += f". Duration: {ctx['duration']}"
            if ctx.get("fixed_events"):
                enriched_prompt += f". Fixed events: {', '.join(ctx['fixed_events'])}"
            if ctx.get("constraints"):
                enriched_prompt += f". Constraints: {', '.join(ctx['constraints'])}"

            clarifications_dict = {k: v for k, v in ctx.items()
                                   if k not in ("goal", "tasks", "duration", "fixed_events",
                                                "constraints", "pending_question",
                                                "pending_question_key", "generated_routines",
                                                "constraints_asked")}

            user_memory = crud.get_user_behavioral_memory(db, str(current_user.id))

            # Load what's already booked for this day so the planner slots new
            # tasks into real gaps instead of overlapping existing routines.
            try:
                target_date = date.fromisoformat(now_iso[:10])
            except Exception:
                target_date = date.today()
            existing_blocks = crud.get_scheduled_blocks_for_date(db, str(current_user.id), target_date)

            ai_plan = await generate_ai_plan(
                enriched_prompt,
                payload.plan_scope,
                now_iso,
                clarifications=clarifications_dict or None,
                user_memory_context=user_memory,
                existing_blocks=existing_blocks,
            )

            if ai_plan.new_behavioral_insights:
                crud.update_user_behavioral_memory(db, str(current_user.id), ai_plan.new_behavioral_insights)

            # Determine scheduled date
            try:
                if ai_plan.target_date:
                    scheduled_date = date.fromisoformat(ai_plan.target_date)
                else:
                    scheduled_date = date.fromisoformat(now_iso[:10])
            except Exception:
                scheduled_date = date.today()

            if ai_plan.is_overloaded and not ai_plan.routines:
                # Overload: can't fit all tasks
                overload_msg = ai_plan.overload_message or "Your schedule is overloaded."
                if ai_plan.suggested_deferrals:
                    overload_msg += f"\n\nI recommend moving these to tomorrow:\n"
                    overload_msg += "\n".join(f"• {t}" for t in ai_plan.suggested_deferrals)
                overload_msg += "\n\nWould you like me to proceed with a trimmed schedule, or reschedule some tasks?"

                ctx["pending_question"] = overload_msg
                ctx["pending_question_key"] = "overload_resolution"
                crud.update_orbit_context(db, orbit_session, ctx)
                crud.update_orbit_state(db, orbit_session, "WAITING_FOR_OVERLOAD_RESOLUTION")
                convo.status = "WAITING_FOR_OVERLOAD_RESOLUTION"
                db.commit()

                msg = _save_message(db, convo.id, "orbit", overload_msg, "orbit_message")
                new_messages.append(msg)
                return schemas.OrbitChatResponse(
                    conversation_id=convo.id,
                    session_id=orbit_session.id,
                    messages=[schemas.OrbitMessageOut.model_validate(m) for m in new_messages],
                    routines_created=0,
                    status="WAITING_FOR_OVERLOAD_RESOLUTION",
                    session_state="WAITING_FOR_OVERLOAD_RESOLUTION",
                )

            if ai_plan.routines:
                # Cleanup previous generated routines in this conversation
                routine_sessions = db.query(RoutineSession).filter(
                    RoutineSession.conversation_id == convo.id
                ).all()
                for rs in routine_sessions:
                    for r in list(rs.routines):
                        db.delete(r)
                    db.delete(rs)
                db.commit()

                routine_session = crud.create_routine_session(
                    db, current_user.id, scheduled_date, conversation_id=convo.id
                )
                generated_list = []
                for r in ai_plan.routines:
                    routine_create = schemas.RoutineCreate(**r.model_dump())
                    new_r = crud.create_routine(db, current_user.id, routine_create, session_id=routine_session.id)
                    routines_created += 1
                    generated_list.append({
                        "id": new_r.id,
                        "title": new_r.title,
                        "date": str(new_r.date),
                        "start_time": str(new_r.start_time) if new_r.start_time else None,
                        "end_time": str(new_r.end_time) if new_r.end_time else None,
                        "estimated_time": new_r.estimated_time,
                        "focus_mode_recommended": new_r.focus_mode_recommended,
                        "priority": new_r.priority,
                        "status": new_r.status,
                        "is_internal": new_r.is_internal,
                        "description": new_r.description or "",
                        "suggestion": new_r.suggestion or "",
                        "energy_score": new_r.energy_score,
                        "complexity_score": new_r.complexity_score,
                        "urgency_score": new_r.urgency_score,
                        "category": new_r.category or "",
                        "scheduling_reason": new_r.scheduling_reason or "",
                    })

                # Persist generated routines in session context for future edits
                ctx["generated_routines"] = generated_list
                ctx["pending_question"] = None
                ctx["pending_question_key"] = None
                crud.update_orbit_context(db, orbit_session, ctx)
                crud.clear_completed_session(db, orbit_session)
                convo.status = "COMPLETE"
                db.commit()

                summary_content = ai_plan.summary
                if ai_plan.explanation_points:
                    summary_content += "\n\n" + "\n".join(f"• {pt}" for pt in ai_plan.explanation_points[:3])
                elif ai_plan.explanation:
                    summary_content += f"\n\n{ai_plan.explanation}"

                if ai_plan.is_overloaded and ai_plan.overload_message:
                    summary_content += f"\n\n⚠️ {ai_plan.overload_message}"

                if getattr(ai_plan, "validation_warnings", None):
                    for warning in ai_plan.validation_warnings:
                        summary_content += f"\n\n⚠️ {warning}"

                summary_msg = _save_message(
                    db, convo.id, "orbit", summary_content, "routine_summary",
                    metadata_json={"productivity_tips": ai_plan.productivity_tips},
                )
                new_messages.append(summary_msg)

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

                return schemas.OrbitChatResponse(
                    conversation_id=convo.id,
                    session_id=orbit_session.id,
                    messages=[schemas.OrbitMessageOut.model_validate(m) for m in new_messages],
                    routines_created=routines_created,
                    status="COMPLETE",
                    session_state="COMPLETE",
                )
            else:
                # Nothing generated — ask for more info
                convo.status = "WAITING_FOR_INPUT"
                crud.update_orbit_state(db, orbit_session, "WAITING_FOR_INPUT")
                db.commit()
                reply = ai_plan.summary or "I need a bit more detail. What tasks would you like to schedule?"
                msg = _save_message(db, convo.id, "orbit", reply, "orbit_message")
                new_messages.append(msg)

    except Exception as e:
        error_msg = _save_message(
            db, convo.id, "orbit",
            f"I ran into an issue: {str(e)}. Please try again.",
            "orbit_message",
        )
        new_messages.append(error_msg)

    return schemas.OrbitChatResponse(
        conversation_id=convo.id,
        session_id=orbit_session.id,
        messages=[schemas.OrbitMessageOut.model_validate(m) for m in new_messages],
        routines_created=routines_created,
        status=orbit_session.current_state,
        session_state=orbit_session.current_state,
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
            Routine.user_id == str(current_user.id),
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
    Returns tasks from the previous day only that are still Pending or Skipped.
    Intentionally limited to yesterday to avoid surfacing stale/replaced schedules.
    Used by the frontend to show recovery prompts (once per day).
    """
    today = date.today()
    yesterday = today - timedelta(days=1)

    # Only look at OrbitTaskMemory entries from yesterday (not an unbounded history)
    incomplete = (
        db.query(OrbitTaskMemory)
        .filter(
            OrbitTaskMemory.user_id == str(current_user.id),
            OrbitTaskMemory.task_date < today,
            OrbitTaskMemory.status.in_(["skipped", "pending"]),
        )
        .order_by(OrbitTaskMemory.task_date.desc())
        .limit(20)
        .all()
    )

    # Also check the routines table for any past Pending/Skipped routines.
    pending_routines = (
        db.query(Routine)
        .filter(
            Routine.user_id == str(current_user.id),
            Routine.date < today,
            Routine.status != "Completed",
            Routine.is_internal == False,
            Routine.fixed_time == False,  # Don't carry over fixed events like movies/flights
        )
        .order_by(Routine.date.desc())
        .limit(20)
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
