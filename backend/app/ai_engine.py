import json
import os
import re
from datetime import date, datetime, time, timedelta

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from .config import settings

from .schemas import (
    AIGenerationResponse,
    AIPlannedRoutine,
    AIClarificationQuestion,
    AIClarificationOption,
    AIAnalysisResponse,
    WorkspaceAIGeneratedTask,
)

GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_TRANSCRIPTIONS_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
GROQ_WHISPER_MODEL = "whisper-large-v3"


def _groq_headers() -> dict[str, str] | None:
    api_key = settings.GROQ_API_KEY
    if not api_key:
        return None
    return {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}


def _groq_model() -> str:
    return settings.GROQ_MODEL


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10), retry=retry_if_exception_type(httpx.HTTPStatusError))
async def _groq_chat_json_async(messages: list[dict[str, str]], temperature: float = 0.35) -> dict | None:
    headers = _groq_headers()
    if not headers:
        return None

    payload = {
        "model": _groq_model(),
        "messages": messages,
        "temperature": temperature,
        "response_format": {"type": "json_object"},
    }

    try:
        async with httpx.AsyncClient(timeout=35.0) as client:
            response = await client.post(GROQ_CHAT_COMPLETIONS_URL, headers=headers, json=payload)
            response.raise_for_status()
        raw_content = response.json()["choices"][0]["message"]["content"]
        return json.loads(raw_content)
    except Exception as e:
        import traceback
        print(f"Groq API Error: {e}")
        traceback.print_exc()
        return None


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10), retry=retry_if_exception_type(httpx.HTTPStatusError))
def _groq_chat_json(messages: list[dict[str, str]], temperature: float = 0.45) -> dict | None:
    headers = _groq_headers()
    if not headers:
        return None

    payload = {
        "model": _groq_model(),
        "messages": messages,
        "temperature": temperature,
        "response_format": {"type": "json_object"},
    }

    try:
        with httpx.Client(timeout=35.0) as client:
            response = client.post(GROQ_CHAT_COMPLETIONS_URL, headers=headers, json=payload)
            response.raise_for_status()
        raw_content = response.json()["choices"][0]["message"]["content"]
        return json.loads(raw_content)
    except Exception:
        return None


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10), retry=retry_if_exception_type(httpx.HTTPStatusError))
async def transcribe_audio_with_groq(
    audio_bytes: bytes,
    filename: str = "voice.webm",
    content_type: str = "audio/webm",
) -> str:
    api_key = settings.GROQ_API_KEY
    if not api_key or not audio_bytes:
        return ""

    files = {
        "file": (filename or "voice.webm", audio_bytes, content_type or "audio/webm"),
    }
    data = {
        "model": GROQ_WHISPER_MODEL,
        "response_format": "json",
        "temperature": "0",
        "language": "en",
    }
    headers = {"Authorization": f"Bearer {api_key}"}

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(GROQ_TRANSCRIPTIONS_URL, headers=headers, data=data, files=files)
            if response.status_code != 200:
                print(f"Groq Transcription Error: {response.status_code} - {response.text}")
            response.raise_for_status()
        transcript = response.json().get("text", "")
        return re.sub(r"\s+", " ", str(transcript)).strip()
    except Exception as e:
        print(f"Transcription exception: {e}")
        return ""

TIME_HINTS = {
    "wake": time(6, 0),
    "wake up": time(6, 0),
    "study": time(8, 0),
    "learn": time(8, 30),
    "project": time(9, 0),
    "meeting": time(16, 0),
    "cook": time(12, 30),
    "cooking": time(12, 30),
    "food": time(12, 30),
    "breakfast": time(7, 30),
    "lunch": time(12, 30),
    "dinner": time(19, 0),
    "gym": time(18, 30),
    "workout": time(18, 30),
    "sleep": time(22, 0),
}

KEYWORD_PRIORITIES = {
    "meeting": "High",
    "project": "High",
    "deadline": "High",
    "exam": "High",
    "study": "High",
    "learn": "High",
    "sleep": "High",
    "exercise": "Medium",
    "practice": "Medium",
    "gym": "Medium",
    "workout": "Medium",
    "call": "Medium",
    "email": "Low",
}

KEYWORD_DURATIONS = {
    "wake": 30,
    "study": 120,
    "learn": 120,
    "project": 180,
    "meeting": 60,
    "cook": 60,
    "cooking": 60,
    "food": 60,
    "gym": 75,
    "workout": 75,
    "sleep": 480,
}

MEAL_TIME_HINTS = {
    "breakfast": time(8, 30),
    "lunch": time(13, 30),
    "dinner": time(20, 30),
}


def _combine(task_date: date, task_time: time) -> datetime:
    return datetime.combine(task_date, task_time.replace(second=0, microsecond=0))


def _strip_leading_phrase(task: str) -> str:
    cleaned = task.strip()
    filler_patterns = [
        r"\bmy\s+work\s+is\s+",
        r"\bmy\s+manager\s+(said|told\s+me|gave\s+me\s+work|asked\s+me)\s+(to\s+)?",
        r"\b(today\s+)?i\s+(have\s+to|need\s+to|should|must|want\s+to|had\s+to|will)\s+",
        r"\b(can\s+you|could\s+you)\s+(please\s+)?(help\s+me\s+)?(to\s+)?",
        r"\bplease\s+",
        r"\bwant\s+to\s+",
    ]
    for pattern in filler_patterns:
        cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\b(today|please|maybe)\b", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+", " ", cleaned)
    if cleaned.strip().lower() in {"i need to", "i have to", "i should", "i want to", "my work is", "to"}:
        return ""
    return cleaned.strip(" .,-")


def _clean_planner_title(task: str) -> str:
    cleaned = _strip_leading_phrase(task)
    cleaned = re.sub(r"\b(today|tomorrow|morning|afternoon|evening|night|tonight)\b", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\bbefore\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\bat\s+\d{1,2}(?::\d{2})?\s*(am|pm)\b", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\battend\s+a\s+meeting\b", "attend meeting", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\bgo\s+to\s+the\s+gym\b", "go to gym", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" .,-")
    if not cleaned:
        cleaned = "Planned Task"
    small_words = {"to", "in", "for", "with", "of", "the", "a", "an", "at", "on"}
    title_words = []
    for index, word in enumerate(cleaned.split()):
        if index > 0 and word.lower() in small_words:
            title_words.append(word.lower())
        else:
            title_words.append(word if word.isupper() else word.capitalize())
    return (
        " ".join(title_words)
        .replace("Fastapi", "FastAPI")
        .replace("Api", "API")
        .replace("Ui", "UI")
        .replace("Sql", "SQL")
    )


def _extract_tasks(input_text: str) -> list[str]:
    normalized = re.sub(r"[\r\n]+", ", ", input_text.strip())
    voice_corrections = {
        r"\bbacon\b": "backend",
        r"\bback end\b": "backend",
        r"\bfront hand\b": "frontend",
        r"\bdata bass\b": "database",
        r"\bdata base\b": "database",
        r"\ba p i\b": "API",
        r"\bfast api\b": "FastAPI",
    }
    for pattern, replacement in voice_corrections.items():
        normalized = re.sub(pattern, replacement, normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"\bgo\s+to\s+the\s+gym\b", "go to gym", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"\bgo\s+gym\b", "go to gym", normalized, flags=re.IGNORECASE)
    action_verbs = (
        "wake|study|learn|cook|sleep|call|send|practice|wash|clean|buy|complete|finish|fix|"
        "connect|create|update|deploy|book|pack|write|read|review|design|build|test|"
        "attend|go|submit|prepare|exercise|pay|schedule|visit|make|plan|debug|implement|work"
    )

    def split_chunk_on_actions(chunk: str) -> list[str]:
        cleaned_chunk = _strip_leading_phrase(chunk)
        if not cleaned_chunk:
            return []

        action_pattern = re.compile(rf"\b(?:{action_verbs})\b", flags=re.IGNORECASE)
        matches = list(action_pattern.finditer(cleaned_chunk))
        if len(matches) <= 1:
            return [cleaned_chunk]

        segments: list[str] = []
        for index, match in enumerate(matches):
            start = match.start()
            end = matches[index + 1].start() if index + 1 < len(matches) else len(cleaned_chunk)
            segment = cleaned_chunk[start:end].strip(" ,.;")
            if segment:
                segments.append(segment)
        return segments

    normalized = re.sub(r"\b(and then|then|also|after that|afterwards|next|plus|along with)\b", ",", normalized, flags=re.IGNORECASE)
    normalized = re.sub(rf"\s+\band\b\s+(?=\b(?:{action_verbs})\b)", ", ", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"\s*&\s*", ", ", normalized)
    normalized = normalized.lstrip(" ,")

    tasks: list[str] = []
    seen: set[str] = set()
    for chunk in re.split(r"[,;.!]+", normalized):
        for task in split_chunk_on_actions(chunk):
            cleaned = _strip_leading_phrase(task)
            cleaned = re.sub(r"^(to|and|then|also)\b", "", cleaned, flags=re.IGNORECASE).strip(" .,-")
            key = cleaned.lower()
            if cleaned and key not in {"to", "and", "then", "also"} and key not in seen:
                seen.add(key)
                tasks.append(cleaned)
    return tasks or [_strip_leading_phrase(input_text) or input_text.strip()]


def _extract_explicit_time(task: str) -> time | None:
    match = re.search(r"(\d{1,2})(?::(\d{2}))?\s*(am|pm)", task, flags=re.IGNORECASE)
    if not match:
        return None

    hour = int(match.group(1))
    minute = int(match.group(2) or 0)
    meridian = match.group(3).lower()

    if meridian == "pm" and hour != 12:
        hour += 12
    if meridian == "am" and hour == 12:
        hour = 0
    return time(hour, minute)


def _extract_target_date(task: str, scope: str) -> date:
    task_lower = task.lower()
    today = date.today()

    if "tomorrow" in task_lower:
        return today + timedelta(days=1)
    if "today" in task_lower or scope == "today":
        return today
    return today


def _extract_time_preference(task: str) -> str | None:
    task_lower = task.lower()
    if any(keyword in task_lower for keyword in ("morning", "early morning", "early")):
        return "morning"
    if "afternoon" in task_lower:
        return "afternoon"
    if any(keyword in task_lower for keyword in ("evening", "night")):
        return "evening"
    return None


def _guess_priority(task: str) -> str:
    task_lower = task.lower()
    for keyword, priority in KEYWORD_PRIORITIES.items():
        if keyword in task_lower:
            return priority
    if "before" in task_lower or "urgent" in task_lower:
        return "High"
    return "Medium"


def _guess_duration(task: str) -> int:
    task_lower = task.lower()
    for keyword, duration in KEYWORD_DURATIONS.items():
        if keyword in task_lower:
            return duration
    return 60


def _guess_start_time(task: str, current_slot: datetime) -> time:
    explicit = _extract_explicit_time(task)
    if explicit:
        return explicit

    task_lower = task.lower()
    preference = _extract_time_preference(task)

    if "wake" in task_lower:
        return time(6, 0)
    if "sleep" in task_lower:
        return time(22, 0)
    if "gym" in task_lower or "workout" in task_lower:
        if preference == "morning":
            return time(6, 30)
        if preference == "afternoon":
            return time(16, 30)
        return time(18, 30)
    if "cook" in task_lower or "cooking" in task_lower or "food" in task_lower:
        for meal_keyword, meal_time in MEAL_TIME_HINTS.items():
            if meal_keyword in task_lower:
                return meal_time
        if preference == "morning":
            return MEAL_TIME_HINTS["breakfast"]
        if preference == "evening":
            return MEAL_TIME_HINTS["dinner"]
        return MEAL_TIME_HINTS["lunch"]
    if "study" in task_lower or "learn" in task_lower or "project" in task_lower:
        if preference == "afternoon":
            return time(13, 30)
        if preference == "evening":
            return time(17, 0)
        return time(8, 0) if "study" in task_lower or "learn" in task_lower else time(9, 0)

    for keyword, preferred_time in TIME_HINTS.items():
        if keyword in task_lower:
            return preferred_time

    return current_slot.time().replace(second=0, microsecond=0)


def _make_title(task: str) -> str:
    return _clean_planner_title(task)


def _suggestion_for(task: str, priority: str) -> str:
    task_lower = task.lower()
    if "wake" in task_lower:
        return "Keep your alarm, water, and first task ready so waking up early feels friction-free."
    if "sleep" in task_lower:
        return "Start winding down 30 to 60 minutes earlier so an early bedtime is actually realistic."
    if "meeting" in task_lower:
        return "Keep a 15-minute buffer before the meeting and have your notes ready ahead of time."
    if "project" in task_lower:
        return "Break the project into milestones and tackle the hardest part first."
    if "cook" in task_lower or "cooking" in task_lower or "food" in task_lower:
        return "Prep ingredients in advance so cooking stays close to the planned meal time."
    if "study" in task_lower or "practice" in task_lower:
        return "Use a distraction-free deep-work block and review key learnings after the session."
    if "gym" in task_lower or "workout" in task_lower:
        return "Leave hydration and workout gear ready to reduce decision fatigue."
    if priority == "High":
        return "Schedule this during your highest-energy hours and protect it from interruptions."
    return "Pair this with a short break before the next task to maintain focus."


def generate_task_suggestion(title: str, description: str | None = None, priority: str = "Medium") -> str:
    combined_text = " ".join(part for part in [title, description or ""] if part).strip()
    return _suggestion_for(combined_text or title, priority)


def _priority_rank(task: str) -> int:
    return {"High": 0, "Medium": 1, "Low": 2}.get(_guess_priority(task), 1)


def _is_anchored_task(task: str) -> bool:
    task_lower = task.lower()
    return bool(_extract_explicit_time(task)) or any(
        keyword in task_lower
        for keyword in ("wake", "sleep", "meeting", "cook", "cooking", "food", "gym", "workout")
    )


def _assign_weekly_date(task: str, index: int) -> date:
    today = date.today()
    task_lower = task.lower()
    weekday_map = {
        "monday": 0,
        "tuesday": 1,
        "wednesday": 2,
        "thursday": 3,
        "friday": 4,
        "saturday": 5,
        "sunday": 6,
    }

    for weekday_name, weekday_index in weekday_map.items():
        if weekday_name in task_lower:
            current_weekday = today.weekday()
            delta = weekday_index - current_weekday
            if delta < 0:
                delta += 7
            return today + timedelta(days=delta)

    return today + timedelta(days=min(index, 6))


def _find_next_available_start(
    task_date: date,
    desired_start: time,
    duration_minutes: int,
    occupied_slots: list[tuple[datetime, datetime]],
) -> datetime:
    candidate = _combine(task_date, desired_start)
    latest_candidate = _combine(task_date, time(23, 30)) + timedelta(days=1)
    step = timedelta(minutes=15)
    duration_delta = timedelta(minutes=duration_minutes)

    while candidate <= latest_candidate:
        overlapping_slot = next(
            (
                (slot_start, slot_end)
                for slot_start, slot_end in occupied_slots
                if candidate < slot_end and candidate + duration_delta > slot_start
            ),
            None,
        )
        if not overlapping_slot:
            return candidate
        candidate = overlapping_slot[1] + step

    fallback_start = occupied_slots[-1][1] + step if occupied_slots else _combine(task_date, desired_start)
    return fallback_start


def _normalize_priority(value: str | None, fallback_task: str) -> str:
    if value:
        normalized = value.strip().capitalize()
        if normalized in {"High", "Medium", "Low"}:
            return normalized
    return _guess_priority(fallback_task)


TRAVEL_TIER_BUFFERS = {
    "nearby": 15,
    "moderate": 30,
    "long_travel": 60,
}


def _optimize_schedule(ai_tasks: list[dict], plan_scope: str, start_after: datetime | None = None, personality: str = "Balanced", travel_overrides: dict[int, str] | None = None, existing_blocks: list[tuple[datetime, datetime]] | None = None, user_memory_context: list[str] | None = None, clarifications: dict[str, str] | None = None) -> tuple[list[AIPlannedRoutine], list[dict], list[str], bool, int, int, list[str]]:
    valid_tasks = [t for t in ai_tasks if t.get("confidence", 1.0) >= 0.5]
    if not valid_tasks:
        return [], [], [], False, 0, 0, []

    today_date = start_after.date() if start_after else date.today()
    base_time = start_after if start_after else datetime.combine(today_date, time(8, 0))

    # ── Chronotype (peak energy window) ──────────────────────────────────────
    peak_preference = None
    if user_memory_context:
        mem_str = " ".join(user_memory_context).lower()
        if "night owl" in mem_str or "evening" in mem_str:
            peak_preference = "night owl"
        elif "morning" in mem_str:
            peak_preference = "morning"
        elif "afternoon" in mem_str:
            peak_preference = "afternoon"

    if clarifications and "energy_preference" in clarifications:
        peak_preference = clarifications["energy_preference"].lower()

    is_night_owl = bool(peak_preference and "night" in peak_preference)

    # ── Reality Validation Defaults ──────────────────────────────────────────
    SLEEP_START = time(23, 0)   # 11 PM
    SLEEP_END   = time(7, 0)    # 7 AM
    EXERCISE_LIMIT = time(22, 0) # 10 PM
    # Night owls get a later scheduling ceiling (1 AM next day) so deep work can
    # run late; everyone else stops at 11 PM to protect sleep. Exercise is still
    # cut off at 10 PM for everyone regardless of chronotype.
    if is_night_owl:
        end_of_day = datetime.combine(today_date + timedelta(days=1), time(1, 0))
    else:
        end_of_day = datetime.combine(today_date, SLEEP_START)

    if base_time.time() < SLEEP_END:
        base_time = datetime.combine(today_date, SLEEP_END)

    validation_warnings = []
    explanation_reasons = []

    # ── Stage 1: Deadline Prioritization Engine ──────────────────────────────
    fixed_tasks = []
    flexible_tasks = []

    for t in valid_tasks:
        if t.get("is_fixed_time", False):
            fixed_tasks.append(t)
        else:
            urgency = t.get("urgency_score", 5)
            importance = t.get("importance_score", 5)
            deadline = t.get("deadline_score", 3)
            priority_score = urgency + importance + deadline
            t["_priority_score"] = priority_score
            flexible_tasks.append(t)

    # Hybrid Sort: priority_tier (macro deadlines) → context_group (minimize context switching) → energy (schedule high-load tasks first)
    # Bin priority into tiers of 5 so critical deadlines still float to the top,
    # but tasks within the same tier are clustered by context_group to reduce cognitive switching.
    CONTEXT_GROUP_ORDER = {
        "Technical": 0, "Development": 0, "Engineering": 0,
        "Health": 1, "Fitness": 1,
        "Admin": 2, "Administrative": 2,
        "Personal": 3,
        "Entertainment": 4,
        "General": 5,
    }

    def _context_rank(task: dict) -> int:
        group = str(task.get("context_group", "General")).strip()
        for key, rank in CONTEXT_GROUP_ORDER.items():
            if key.lower() in group.lower():
                return rank
        return 5  # Unknown groups go last

    flexible_tasks.sort(
        key=lambda x: (
            -(x.get("_priority_score", 0) // 5),  # Tier bucket descending (higher priority = lower tier number)
            _context_rank(x),                       # Context group ascending (Technical first)
            -(x.get("energy_score", 5)),             # Energy descending (high energy work first in group)
        )
    )

    if flexible_tasks:
        top_task = flexible_tasks[0].get("title", "Task")
        explanation_reasons.append(f"Prioritized {top_task} based on deadline proximity and importance.")

    # Build context grouping explanation
    context_groups_used: list[str] = []
    for t in flexible_tasks:
        g = str(t.get("context_group", "General"))
        if g not in context_groups_used:
            context_groups_used.append(g)
    if len(context_groups_used) > 1:
        explanation_reasons.append(f"Grouped tasks by context to minimize mental context switching: {', '.join(context_groups_used)}.")

    # ── Stage 2: Reality Validation Engine ───────────────────────────────────
    # Workload Protection
    total_task_minutes = sum(t.get("estimated_duration", 60) for t in valid_tasks if not t.get("is_internal_logistic"))
    available_minutes = int((end_of_day - base_time).total_seconds() / 60)
    # Subtract time already booked today (within the remaining window) so the
    # overload check reflects the space that's actually free.
    if existing_blocks:
        for b_start, b_end in existing_blocks:
            overlap_start = max(b_start, base_time)
            overlap_end = min(b_end, end_of_day)
            if overlap_end > overlap_start:
                available_minutes -= int((overlap_end - overlap_start).total_seconds() / 60)
        available_minutes = max(0, available_minutes)
    effective_available = int(available_minutes * 0.80)
    is_overloaded = total_task_minutes > effective_available
    if is_overloaded:
        validation_warnings.append(f"This plan requires approximately {round(total_task_minutes/60, 1)} hours of work. I recommend moving some tasks to tomorrow.")

    # Exercise Protection
    for t in flexible_tasks:
        cat = str(t.get("category", "")).lower()
        title = str(t.get("title", "")).lower()
        if "gym" in title or "swim" in title or "workout" in title or cat == "health":
            # Just a flag, actual check relies on scheduling placement or fixed time
            t["_is_exercise"] = True

    for t in fixed_tasks:
        title = str(t.get("title", "")).lower()
        if "gym" in title or "swim" in title or "workout" in title:
            start_time_str = t.get("time_constraint")
            if start_time_str:
                try:
                    dt_time = datetime.strptime(start_time_str, "%H:%M").time()
                    if dt_time >= EXERCISE_LIMIT or dt_time < SLEEP_END:
                        validation_warnings.append(f"{t.get('title')} at {start_time_str} may negatively affect recovery and sleep.")
                except ValueError:
                    pass

    # Sleep Protection for Fixed Tasks
    for t in fixed_tasks:
        start_time_str = t.get("time_constraint")
        if start_time_str:
            try:
                dt_time = datetime.strptime(start_time_str, "%H:%M").time()
                energy = str(t.get("energy_requirement", "Medium")).capitalize()
                if (dt_time >= SLEEP_START or dt_time < SLEEP_END) and energy == "High":
                    validation_warnings.append(f"High-energy task '{t.get('title')}' is scheduled during sleep hours.")
            except ValueError:
                pass


    # ── Stage 3: Scheduling & Recovery Injection Engine ──────────────────────
    planned_routines: list[dict] = []
    occupied_slots: list[tuple[datetime, datetime]] = []

    # Seed the day with the user's already-scheduled blocks so newly planned
    # tasks slot into real gaps instead of overlapping what's already booked.
    if existing_blocks:
        for b_start, b_end in existing_blocks:
            if b_end > b_start:
                occupied_slots.append((b_start, b_end))
        occupied_slots.sort(key=lambda s: s[0])

    def add_slot(start: datetime, duration_mins: int) -> tuple[datetime, datetime]:
        end = start + timedelta(minutes=duration_mins)
        occupied_slots.append((start, end))
        occupied_slots.sort(key=lambda s: s[0])
        return start, end

    def is_slot_free(start: datetime, duration_mins: int) -> bool:
        end = start + timedelta(minutes=duration_mins)
        if end > end_of_day:
            return False
        if start.time() < SLEEP_END and start.date() == today_date:
            return False
        for s_start, s_end in occupied_slots:
            if start < s_end and end > s_start:
                return False
        return True

    def find_free_slot(search_start: datetime, duration_mins: int, energy_req: str = "Medium", requires_business_hours: bool = False, is_exercise: bool = False, peak_preference: str | None = None) -> datetime | None:
        windows_to_search = []
        
        if energy_req.lower() == "high" and peak_preference:
            pref = peak_preference.lower()
            if "night" in pref or "evening" in pref:
                windows_to_search.append((time(16, 0), time(23, 59)))
                windows_to_search.append((time(0, 0), time(23, 59)))
            elif "morning" in pref:
                windows_to_search.append((time(8, 0), time(12, 0)))
                windows_to_search.append((time(0, 0), time(23, 59)))
            elif "afternoon" in pref:
                windows_to_search.append((time(12, 0), time(17, 0)))
                windows_to_search.append((time(0, 0), time(23, 59)))
        
        if not windows_to_search:
            windows_to_search.append((time(0, 0), time(23, 59)))

        for window_start, window_end in windows_to_search:
            candidate = search_start
            
            # If candidate is before window_start (and we're on the same day), jump to window_start
            # We assume candidate.date() is today_date here.
            if candidate.time() < window_start:
                candidate = datetime.combine(candidate.date(), window_start)
                
            step = timedelta(minutes=15)
            remainder = candidate.minute % 15
            if remainder != 0:
                candidate += timedelta(minutes=(15 - remainder))

            while candidate + timedelta(minutes=duration_mins) <= end_of_day:
                if candidate.time() > window_end and window_end != time(23, 59):
                    break # outside window
                    
                if is_slot_free(candidate, duration_mins):
                    end_time_check = candidate + timedelta(minutes=duration_mins)
                    
                    # Business hours validation
                    if requires_business_hours:
                        if candidate.time() < time(10, 0) or end_time_check.time() > time(21, 0):
                            candidate += step
                            continue
                    
                    # Exercise limit validation: only allow between wake time and
                    # the 10 PM cutoff. Rejects late-night (>=22:00) AND post-midnight
                    # (<07:00) slots, which matters for night owls whose day runs past 1 AM.
                    if is_exercise:
                        if candidate.time() >= EXERCISE_LIMIT or candidate.time() < SLEEP_END:
                            candidate += step
                            continue
                    
                    return candidate
                candidate += step
        return None

    # Deep Work Engine
    def _fragment_deep_work(task: dict) -> list[dict]:
        duration = task.get("estimated_duration", 60)
        energy_score = task.get("energy_score", 5)
        energy = str(task.get("energy_requirement", "Medium")).capitalize()

        if (energy != "High" and energy_score < 7) or duration <= 90:
            return [task]

        fragments = []
        remaining = duration
        block_num = 1
        while remaining > 0:
            block_dur = min(90, remaining)
            frag = dict(task)
            frag["title"] = f"{task.get('title', 'Task')} (Block {block_num})"
            frag["estimated_duration"] = block_dur
            frag["_is_deep_work_fragment"] = True
            fragments.append(frag)
            remaining -= block_dur
            block_num += 1

        return fragments

    # Consecutive High-Energy Tracking
    consecutive_high_mins = 0
    def _needs_consecutive_break() -> bool:
        return consecutive_high_mins >= 180

    def _update_energy_counter(energy: str, mins: int):
        nonlocal consecutive_high_mins
        if energy == "High":
            consecutive_high_mins += mins
        else:
            consecutive_high_mins = 0

    # Process Flexible tasks for fragmentation
    fragmented_flexible_tasks: list[dict] = []
    for t in flexible_tasks:
        fragments = _fragment_deep_work(t)
        fragmented_flexible_tasks.extend(fragments)

    # Layer 1: Fixed Events
    for t in fixed_tasks:
        start_time_str = t.get("time_constraint")
        duration = t.get("estimated_duration") or 60
        start_dt = None
        if start_time_str:
            try:
                dt_time = datetime.strptime(start_time_str, "%H:%M").time()
                start_dt = datetime.combine(today_date, dt_time)
            except ValueError:
                pass

        if not start_dt:
            start_dt = find_free_slot(base_time, duration, "High", peak_preference=peak_preference) or base_time

        # Conflict guard: a fixed task landing on an already-occupied slot
        # (an existing routine or another fixed task) gets bumped to the next
        # free slot instead of silently overlapping.
        if not is_slot_free(start_dt, duration):
            relocated = find_free_slot(start_dt, duration, "High", peak_preference=peak_preference)
            if relocated and relocated != start_dt:
                original_label = start_dt.strftime("%H:%M")
                new_label = relocated.strftime("%H:%M")
                validation_warnings.append(
                    f"Moved '{t.get('title', 'a task')}' from {original_label} to {new_label} to avoid a conflict with another task."
                )
                start_dt = relocated

        s, e = add_slot(start_dt, duration)

        # Commute buffer
        if t.get("requires_travel"):
            task_idx = valid_tasks.index(t) if t in valid_tasks else -1
            travel_tier = travel_overrides.get(task_idx, t.get("travel_tier", "moderate")) if travel_overrides else t.get("travel_tier", "moderate")
            commute_mins = TRAVEL_TIER_BUFFERS.get(travel_tier, 30)

            buffer_start = max(base_time, s - timedelta(minutes=commute_mins))
            if buffer_start < s and is_slot_free(buffer_start, int((s - buffer_start).total_seconds() // 60)):
                add_slot(buffer_start, int((s - buffer_start).total_seconds() // 60))
                planned_routines.append({
                    "task": {
                        "title": f"Commute to {t.get('title', 'Event')}",
                        "priority": "Medium",
                        "energy_requirement": "Low",
                        "is_fixed_time": False,
                        "is_internal_logistic": True,
                        "category": "Commute",
                        "energy_score": 2,
                    },
                    "start": buffer_start,
                    "end": s
                })

            if e + timedelta(minutes=commute_mins) <= end_of_day and is_slot_free(e, commute_mins):
                rc_s, rc_e = add_slot(e, commute_mins)
                planned_routines.append({
                    "task": {
                        "title": "Return Commute",
                        "priority": "Medium",
                        "energy_requirement": "Low",
                        "is_fixed_time": False,
                        "is_internal_logistic": True,
                        "category": "Commute",
                        "energy_score": 2,
                    },
                    "start": rc_s,
                    "end": rc_e
                })

        planned_routines.append({"task": t, "start": s, "end": e})

    # Layer 2: Flexible Tasks
    current_search = base_time
    break_duration = 15 if personality != "Aggressive" else 0

    for i, t in enumerate(fragmented_flexible_tasks):
        duration = t.get("estimated_duration") or 60
        energy = str(t.get("energy_requirement", "Medium")).capitalize()
        req_business = bool(t.get("requires_business_hours", False))
        is_exercise = bool(t.get("_is_exercise", False))

        # Check consecutive high-energy
        if _needs_consecutive_break():
            recovery_dur = 30
            recovery_slot = find_free_slot(current_search, recovery_dur, peak_preference=peak_preference)
            if recovery_slot:
                rs, re = add_slot(recovery_slot, recovery_dur)
                planned_routines.append({
                    "task": {
                        "title": "Walk / Stretch Break",
                        "priority": "Low",
                        "energy_requirement": "Low",
                        "is_internal_logistic": True,
                        "category": "Recovery",
                        "energy_score": 1,
                        "scheduling_reason": "Injected to prevent mental exhaustion after 3 hours of focus.",
                    },
                    "start": rs,
                    "end": re
                })
                current_search = re
                consecutive_high_mins = 0
                explanation_reasons.append("Inserted recovery periods between high-focus tasks to reduce cognitive fatigue.")

        slot = find_free_slot(current_search, duration, energy, req_business, is_exercise, peak_preference=peak_preference)

        if not slot:
            shrinked_duration = max(30, duration // 2)
            slot = find_free_slot(current_search, shrinked_duration, energy, req_business, is_exercise, peak_preference=peak_preference)
            if slot:
                duration = shrinked_duration
            else:
                slot = occupied_slots[-1][1] if occupied_slots else current_search

        s, e = add_slot(slot, duration)
        _update_energy_counter(energy, duration)

        # Travel Buffer
        if t.get("requires_travel"):
            task_idx = valid_tasks.index(t) if t in valid_tasks else -1
            travel_tier = travel_overrides.get(task_idx, t.get("travel_tier", "moderate")) if travel_overrides else t.get("travel_tier", "moderate")
            commute_mins = TRAVEL_TIER_BUFFERS.get(travel_tier, 30)

            buffer_start = max(base_time, s - timedelta(minutes=commute_mins))
            if buffer_start < s and is_slot_free(buffer_start, int((s - buffer_start).total_seconds() // 60)):
                add_slot(buffer_start, int((s - buffer_start).total_seconds() // 60))
                planned_routines.append({
                    "task": {"title": f"Commute to {t.get('title')}", "is_internal_logistic": True, "category": "Commute"},
                    "start": buffer_start, "end": s
                })
            
            if e + timedelta(minutes=commute_mins) <= end_of_day and is_slot_free(e, commute_mins):
                rc_s, rc_e = add_slot(e, commute_mins)
                planned_routines.append({
                    "task": {"title": "Return Commute", "is_internal_logistic": True, "category": "Commute"},
                    "start": rc_s, "end": rc_e
                })

        planned_routines.append({"task": t, "start": s, "end": e})

        # Deep work fragment recovery
        if t.get("_is_deep_work_fragment") and break_duration > 0:
            if is_slot_free(e, break_duration):
                bs, be = add_slot(e, break_duration)
                planned_routines.append({
                    "task": {
                        "title": "Recovery Buffer",
                        "is_internal_logistic": True,
                        "category": "Recovery",
                        "energy_score": 1,
                        "scheduling_reason": "Recovery buffer after a 90m deep work block."
                    },
                    "start": bs, "end": be
                })
                explanation_reasons.append("Fragmented tasks > 90m and injected 15m recovery buffers.")

        current_search = e + timedelta(minutes=break_duration)

    # ── Meal Injection ───────────────────────────────────────────────────────
    meal_slots = [
        ("Lunch Break", time(12, 30), 45, "Health"),
        ("Dinner Break", time(19, 30), 45, "Health"),
    ]
    for meal_title, meal_time, meal_dur, meal_cat in meal_slots:
        meal_dt = datetime.combine(today_date, meal_time)
        if meal_dt >= base_time and is_slot_free(meal_dt, meal_dur):
            ms, me = add_slot(meal_dt, meal_dur)
            planned_routines.append({
                "task": {
                    "title": meal_title,
                    "is_internal_logistic": True,
                    "category": meal_cat,
                    "scheduling_reason": f"{meal_title} injected automatically to maintain energy levels.",
                },
                "start": ms, "end": me
            })
            explanation_reasons.append(f"Injected {meal_title} to ensure sustained energy.")

    # Sort
    planned_routines.sort(key=lambda r: r["start"])

    # ── Overlap self-check ────────────────────────────────────────────────────
    # Safety net: verify no two scheduled blocks overlap before we report the
    # plan as ready. If any do, surface it as a warning rather than silently
    # claiming success.
    for prev, curr in zip(planned_routines, planned_routines[1:]):
        if curr["start"] < prev["end"]:
            validation_warnings.append(
                f"Heads up: '{_clean_planner_title(curr['task'].get('title', 'a task'))}' overlaps "
                f"'{_clean_planner_title(prev['task'].get('title', 'a task'))}'. You may want to adjust the timing."
            )
            break

    # ── Map to AIPlannedRoutine ──────────────────────────────────────────────
    results: list[AIPlannedRoutine] = []
    for r in planned_routines:
        t_data = r["task"]
        title = _clean_planner_title(t_data.get("title", ""))
        desc = "AI planned: " + title
        if "Recovery" in title or "Commute" in title or "Break" in title:
            desc = "Internal logistics block."

        # Compute V2 cognitive scores explicitly for the fallback routines
        energy_score = t_data.get("energy_score", 5)
        complexity_score = t_data.get("complexity_score", 5)
        urgency_score = t_data.get("urgency_score", 5)
        importance_score = t_data.get("importance_score", 5)
        deadline_score = t_data.get("deadline_score", 3)
        category = t_data.get("category") or t_data.get("context_group") or "General"
        scheduling_reason = t_data.get("scheduling_reason")

        results.append(
            AIPlannedRoutine(
                title=title,
                description=desc,
                date=today_date,
                start_time=r["start"].time().replace(second=0, microsecond=0),
                end_time=r["end"].time().replace(second=0, microsecond=0),
                priority="Medium",
                status="Pending",
                estimated_time=int((r["end"] - r["start"]).total_seconds() // 60),
                focus_mode_recommended=bool(t_data.get("focus_mode_recommended", False)),
                is_internal=bool(t_data.get("is_internal_logistic", False)),
                suggestion=_suggestion_for(title, "Medium"),
                energy_score=energy_score,
                complexity_score=complexity_score,
                urgency_score=urgency_score,
                location=t_data.get("location"),
                category=category,
                scheduling_reason=scheduling_reason,
                fixed_time=bool(t_data.get("is_fixed_time", False)),
            )
        )

    # Deduplicate explanation reasons and cap at 3
    explanation_points = list(dict.fromkeys(explanation_reasons))[:3]
    return results, flexible_tasks, explanation_points, is_overloaded, total_task_minutes, available_minutes, validation_warnings



def generate_heuristic_plan(input_text: str, plan_scope: str, start_after: datetime | None = None, existing_blocks: list[tuple[datetime, datetime]] | None = None) -> AIGenerationResponse:
    tasks = _extract_tasks(input_text)
    ai_tasks = [
        {
            "title": t, 
            "is_fixed_time": False, 
            "requires_focus": False, 
            "estimated_duration": _guess_duration(t),
            "energy_requirement": "Medium",
            "context_group": "General",
            "focus_mode_recommended": False,
            "confidence": 0.8
        } 
        for t in tasks
    ]
    planned_routines, _, explanation_pts, is_over, total_mins, avail_mins, val_warns = _optimize_schedule(ai_tasks, plan_scope, start_after, "Balanced", existing_blocks=existing_blocks)
    return AIGenerationResponse(
        summary=f"Built a simple {plan_scope} routine.",
        productivity_tips=["Fallback scheduling used."],
        routines=planned_routines,
        explanation_points=explanation_pts,
        is_overloaded=is_over,
        overload_message=f"This plan requires {total_mins} minutes but only {avail_mins} are available." if is_over else None,
        validation_warnings=val_warns,
    )


async def _analyze_with_groq(input_text: str, current_time: str | None = None) -> dict | None:
    """First-pass AI analysis: extract tasks with confidence, travel tiers, and ambiguity flags."""
    today = date.today().isoformat()
    time_context_prompt = ""
    if current_time:
        time_context_prompt = f"The user's current local time is: {current_time}. Schedule strictly AFTER this time."

    system_prompt = f"""You are a Cognitive Scheduling Analyzer. Your job is to analyze the user's request and extract tasks
with REALISTIC assessments. Be honest about your confidence — do NOT pretend to know things you don't.

Output STRICT JSON matching this schema:
{{
  "has_actionable_intent": true/false,
  "inferred_personality": "Balanced",
  "personality_confidence": 0.9,
  "schedule_density": "light|moderate|packed",
  "tasks": [
    {{
      "title": "Short Clean Task Name",
      "is_fixed_time": true/false,
      "time_constraint": "HH:MM",
      "estimated_duration": 60,
      "requires_focus": true/false,
      "requires_travel": true/false,
      "requires_business_hours": true/false,
      "requires_physical_presence": true/false,
      "travel_tier": "nearby|moderate|long_travel|unknown",
      "can_be_interrupted": true/false,
      "ideal_time_of_day": "morning|afternoon|evening|night|any",
      "energy_requirement": "High|Medium|Low",
      "cognitive_load": "high|medium|low",
      "urgency_score": 1-10,
      "importance_score": 1-10,
      "deadline_score": 1-10,
      "context_group": "Development",
      "focus_mode_recommended": true/false,
      "is_internal_logistic": true/false,
      "confidence": 0.95,
      "duration_confidence": "high|medium|low"
    }}
  ]
}}

Rules:
1. INTENT: If the input is random noise, set has_actionable_intent=false and return empty tasks.
2. COGNITIVE LOAD: Accurately estimate 'energy_requirement'.
3. CONTEXT GROUPS: Group similar tasks to minimize context switching.
4. TIME CONSTRAINTS: Only output a time_constraint (HH:MM) if the user explicitly provided a time.
5. NO HALLUCINATION: DO NOT invent tasks the user didn't mention.
6. REALISM: For out-of-house events (movies=150-180min, gym=60-90min, flights=variable), estimate realistic durations and set requires_travel=true.
7. TRAVEL TIER: Classify travel realistically:
   - "nearby" = local grocery, nearby gym, neighborhood walk (15 min buffer)
   - "moderate" = movie theater, restaurant, shopping mall (30 min buffer)
   - "long_travel" = airport, railway station, concert venue, intercity (60+ min buffer)
   - "unknown" = you genuinely cannot determine distance from context
8. INTERNAL LOGISTICS: Set `is_internal_logistic = true` ONLY for purely internal spacing tasks like "returning home", generic transitions, or passive movement. If it's a primary human activity (e.g., "Movie", "Dinner"), set it to `false`. "Flight to Delhi" is an event, so it's `false`. "Return home" is usually just logistical, so `true`.
9. CONFIDENCE: Set confidence < 0.7 if the task is vague or ambiguous.
10. DURATION CONFIDENCE: Set to "low" if you are unsure about the duration estimate.
11. SCHEDULE DENSITY: Assess overall day load — "light" (1-3 easy tasks), "moderate" (4-6 tasks), "packed" (7+ tasks or many high-energy).
12. ANTI-HALLUCINATION: Do not invent locations, durations, or commitments. If uncertain, ask (set confidence < 0.7).
13. {time_context_prompt}"""

    user_prompt = f"Today is {today}. Analyze this request:\n\n{input_text}"

    return await _groq_chat_json_async(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,
    )


def _build_clarification_questions(parsed: dict, max_questions: int = 2, user_memory_context: list[str] | None = None) -> list[AIClarificationQuestion]:
    """Build lightweight clarification questions based on AI analysis results. Max 2 questions."""
    questions: list[AIClarificationQuestion] = []
    tasks = parsed.get("tasks", [])

    # 1. Travel clarification — ONLY ask if it's long travel or unknown. Nearby/Moderate get smart defaults.
    for i, task in enumerate(tasks):
        if len(questions) >= max_questions:
            break
        if task.get("requires_travel") and task.get("travel_tier") in ("unknown", "long_travel"):
            title = task.get("title", "this activity")
            questions.append(AIClarificationQuestion(
                id=f"travel_{i}",
                question=f"How far is {title.lower()}?",
                type="single_choice",
                options=[
                    AIClarificationOption(value="nearby", label="Nearby", emoji="🏠"),
                    AIClarificationOption(value="moderate", label="Moderate Travel", emoji="🚗"),
                    AIClarificationOption(value="long_travel", label="Long Travel", emoji="✈️"),
                ],
                task_title=title,
                default_value="moderate",
            ))

    # 2. Duration clarification — ONLY if confidence is very low and no good default exists
    for i, task in enumerate(tasks):
        if len(questions) >= max_questions:
            break
        if task.get("duration_confidence") == "low" and task.get("confidence", 1.0) < 0.7:
            title = task.get("title", "this task")
            est = task.get("estimated_duration", 60)
            questions.append(AIClarificationQuestion(
                id=f"duration_{i}",
                question=f"Roughly how long will {title.lower()} take?",
                type="single_choice",
                options=[
                    AIClarificationOption(value=str(max(30, est // 2)), label=f"~{max(30, est // 2)} min", emoji="⏱️"),
                    AIClarificationOption(value=str(est), label=f"~{est} min", emoji="⏱️"),
                    AIClarificationOption(value=str(int(est * 1.5)), label=f"~{int(est * 1.5)} min", emoji="⏱️"),
                ],
                task_title=title,
                default_value=str(est),
            ))

    # 3. Timing Ambiguity — ONLY if completely unspecified and critical
    for i, task in enumerate(tasks):
        if len(questions) >= max_questions:
            break
        ideal_time = task.get("ideal_time_of_day", "any")
        if ideal_time == "any" and not task.get("is_fixed_time") and task.get("energy_requirement") == "High":
            title = task.get("title", "this task")
            questions.append(AIClarificationQuestion(
                id=f"timing_{i}",
                question=f"When do you prefer to tackle {title.lower()}?",
                type="single_choice",
                options=[
                    AIClarificationOption(value="morning", label="Morning", emoji="🌅"),
                    AIClarificationOption(value="afternoon", label="Afternoon", emoji="☀️"),
                    AIClarificationOption(value="evening", label="Evening", emoji="🌙"),
                ],
                task_title=title,
                default_value="morning",
            ))

    # 4. Energy Preference - ONLY if not in memory and there's a high energy task
    has_high_energy = any(str(t.get("energy_requirement", "")).lower() == "high" for t in tasks)
    has_energy_pref = False
    if user_memory_context:
        mem_str = " ".join(user_memory_context).lower()
        if "night owl" in mem_str or "morning" in mem_str or "peak energy" in mem_str or "afternoon" in mem_str:
            has_energy_pref = True

    if has_high_energy and not has_energy_pref and len(questions) < max_questions:
        questions.append(AIClarificationQuestion(
            id="energy_preference",
            question="When do you typically have the most energy for deep work?",
            type="single_choice",
            options=[
                AIClarificationOption(value="Morning Person", label="Mornings", emoji="🌅"),
                AIClarificationOption(value="Afternoon Peak", label="Afternoons", emoji="☕"),
                AIClarificationOption(value="Night Owl", label="Night Owl", emoji="🦉"),
            ],
            task_title=None,
            default_value="Morning Person",
        ))

    return questions


async def classify_intent_with_groq(input_text: str) -> str:
    """Classifies the user intent quickly."""
    system_prompt = """You are an Intent Classifier for an AI Planning Assistant.
Categorize the user's input into EXACTLY ONE of these categories. Return ONLY the category name as a string in JSON.

Categories:
1. "Greeting" - E.g. "Hello", "Hi", "Good morning"
2. "Small Talk" - E.g. "How are you?", "What's up?"
3. "Unrelated Question" - E.g. "Who won IPL?", "What's the weather?", "Tell me a joke"
4. "Vague Request" - E.g. "I want to be productive today", "Help me work"
5. "Planning Request" - E.g. "Study SQL for 2 hours", "Gym at 6 PM", "Build a schedule"

Output format MUST be strictly:
{"intent": "Category Name"}
"""
    result = await _groq_chat_json_async(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": input_text},
        ],
        temperature=0.1,
    )
    if not result:
        return "Planning Request" # fallback
    return result.get("intent", "Planning Request")


async def classify_orbit_intent(message: str, session_context: dict | None) -> str:
    """
    Context-aware intent classifier. Uses the active session context (pending
    question, current state) to correctly interpret short replies like "yes",
    "4 hours", "no", "nearby", "tomorrow".

    Returns one of:
      greeting | small_talk | unrelated | planning_request |
      clarification_response | schedule_edit
    """
    pending_key = (session_context or {}).get("pending_question_key")
    pending_q   = (session_context or {}).get("pending_question")
    has_schedule = bool((session_context or {}).get("generated_routines"))

    context_block = ""
    if pending_q:
        context_block = f"\nThe assistant just asked: \"{pending_q}\"\nThe expected answer type: {pending_key or 'general'}"
    if has_schedule:
        context_block += "\nA schedule has already been generated."

    system_prompt = f"""You are an Intent Classifier for an AI Planning Assistant.
Given the conversation context below, classify the user message into EXACTLY ONE intent.

Context:{context_block}

Intent categories:
1. "greeting"              - "hello", "hi", "good morning"
2. "small_talk"            - "how are you", "what's up"
3. "unrelated"             - strictly off-topic questions (e.g. "who won IPL?", "what is the weather?")
4. "planning_request"      - new planning goal with tasks, goals, or schedule request
5. "clarification_response"- a direct answer to the assistant's last question. This includes literal answers ("4 hours", "yes") AND conversational answers deferring to the AI ("you decide", "schedule it around my events", "figure it out").
6. "schedule_edit"         - editing/modifying an EXISTING generated schedule: "move X to 9pm", "add lunch"

Rules:
- If there is a pending question AND the message is a plausible answer (even an informal one like "you pick" or "schedule it"), classify as "clarification_response".
- Single words like "yes", "no", "sure", "okay" in context of a pending question = "clarification_response".
- If a schedule exists and the message asks to modify it = "schedule_edit".
- If a schedule exists and the message reports a PROBLEM, complaint, or question about it (e.g. "tasks overlap", "these clash", "this is wrong", "have you checked?", "fix the timing") = "schedule_edit". Treat it as a request to correct the schedule.
- Pure greetings or truly off-topic queries = "greeting" / "small_talk" / "unrelated". Do NOT classify informal answers as unrelated.

Return ONLY JSON in this exact format: {{"intent": "one_of_the_above"}}
"""
    result = await _groq_chat_json_async(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": message},
        ],
        temperature=0.05,
    )
    if not result:
        # If there's a pending question, assume it's a clarification answer
        return "clarification_response" if pending_key else "planning_request"
    return result.get("intent", "planning_request")


async def extract_planning_context(message: str, existing_context: dict) -> dict:
    """
    Extracts structured planning fields from the user's message and merges
    them with the existing context. Returns the updated context dict.

    Fields it fills in: goal, tasks, duration, fixed_events, constraints.
    """
    current_tasks   = existing_context.get("tasks", [])
    current_goal    = existing_context.get("goal")
    pending_key     = existing_context.get("pending_question_key")

    system_prompt = f"""You are a planning context extractor.
Extract planning information from the user message and merge it with what we already know.

Current known context:
- goal: {current_goal or "unknown"}
- tasks: {current_tasks or []}
- pending_question_key: {pending_key or "none"}

Extract and return a JSON object with these fields (only include fields that are present in the message):
{{
  "goal": "string or null",
  "tasks": ["list", "of", "tasks"],
  "duration": "e.g. 2 hours, 90 minutes, auto, or null",
  "goal_has_duration": boolean,
  "fixed_events": ["fixed time events like meetings"],
  "constraints": ["constraints like no early morning, gym at 6pm"],
  "answer_to_pending": "direct answer to the pending question if present"
}}

Rules:
- If the message is a direct answer to {pending_key or "nothing"}, put it in "answer_to_pending"
- Extract tasks only from this message — do not repeat what is already known
- If the user explicitly asks you to figure out the duration, fit it around fixed events, or fill the gaps, set "duration" to "auto".
- Set "goal_has_duration" to true ONLY IF the tasks/events provided have universally obvious intrinsic durations (e.g., "Movie", "Dinner", "Flight", "Gym"). Otherwise false.
- Return null for fields not mentioned
"""
    result = await _groq_chat_json_async(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": message},
        ],
        temperature=0.1,
    )
    if not result:
        return existing_context

    # Merge: append new tasks, fill in nulls
    updated = dict(existing_context)
    if result.get("goal") and not updated.get("goal"):
        updated["goal"] = result["goal"]
        
    if result.get("tasks"):
        ex = updated.get("tasks")
        ex = ex if isinstance(ex, list) else ([ex] if ex else [])
        updated["tasks"] = ex + [t for t in result["tasks"] if t not in ex]
        
    if result.get("duration") and not updated.get("duration"):
        updated["duration"] = result["duration"]
        
    if result.get("fixed_events"):
        ex = updated.get("fixed_events")
        ex = ex if isinstance(ex, list) else ([ex] if ex else [])
        updated["fixed_events"] = ex + result["fixed_events"]
        
    if result.get("constraints"):
        ex = updated.get("constraints")
        ex = ex if isinstance(ex, list) else ([ex] if ex else [])
        updated["constraints"] = ex + result["constraints"]
        
    if result.get("answer_to_pending") and pending_key:
        ans = result["answer_to_pending"]
        if pending_key in ("tasks", "fixed_events", "constraints"):
            ex = updated.get(pending_key)
            ex = ex if isinstance(ex, list) else ([ex] if ex else [])
            if ans not in ex:
                updated[pending_key] = ex + [ans]
        else:
            updated[pending_key] = ans
            
    if result.get("goal_has_duration") is True:
        updated["goal_has_duration"] = True

    return updated


async def apply_schedule_edit(
    edit_request: str,
    generated_routines: list[dict],
    current_time: str | None = None,
) -> tuple[list[dict], str]:
    """
    Apply a targeted edit to an existing generated schedule without full regeneration.
    Returns (updated_routines, summary_message).

    Supported edits:
    - Move/reschedule: "move SQL to 9 PM"
    - Add: "add lunch break at 1 PM"
    - Remove: "remove groceries"
    - Shift earlier/later: "make gym 30 minutes earlier"
    """
    routines_json = json.dumps(generated_routines, default=str)
    time_ctx = f"Current time: {current_time}." if current_time else ""

    system_prompt = f"""You are a schedule editor. Apply the user's requested change to the existing schedule.
{time_ctx}

Return ONLY JSON in this exact format:
{{
  "updated_routines": [
    {{
      "title": "...",
      "date": "YYYY-MM-DD",
      "start_time": "HH:MM:SS",
      "end_time": "HH:MM:SS",
      "priority": "High|Medium|Low",
      "status": "Pending",
      "estimated_time": 60,
      "focus_mode_recommended": false,
      "is_internal": false,
      "description": "...",
      "suggestion": "..."
    }}
  ],
  "edit_summary": "One sentence describing what was changed."
}}

Rules:
- Apply ONLY the requested change. Keep all other tasks exactly the same.
- For time changes: use 24-hour HH:MM:SS format.
- For removals: omit the task entirely.
- For additions: add a new task with reasonable defaults.
- "edit_summary" must be one short sentence describing the change.
"""
    result = await _groq_chat_json_async(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Current schedule:\n{routines_json}\n\nEdit request: {edit_request}"},
        ],
        temperature=0.15,
    )
    if not result or "updated_routines" not in result:
        return generated_routines, "I couldn't apply that edit. Could you rephrase it?"

    return result["updated_routines"], result.get("edit_summary", "Schedule updated.")




async def analyze_ai_plan(input_text: str, plan_scope: str, current_time: str | None = None, existing_blocks: list[tuple[datetime, datetime]] | None = None, user_memory_context: list[str] | None = None) -> AIAnalysisResponse:
    """Phase 1: Analyze the user's request and determine if clarification is needed."""
    start_after = None
    if current_time:
        try:
            dt = datetime.fromisoformat(current_time.replace('Z', '+00:00'))
            start_after = dt.replace(tzinfo=None)
        except ValueError:
            pass

    intent = await classify_intent_with_groq(input_text)
    
    if intent == "Greeting":
        return AIAnalysisResponse(
            needs_clarification=False,
            result=AIGenerationResponse(
                summary="Hi! What would you like to plan today?",
                productivity_tips=[], routines=[]
            )
        )
    if intent == "Small Talk":
        return AIAnalysisResponse(
            needs_clarification=False,
            result=AIGenerationResponse(
                summary="I'm ready to help plan your day. What tasks or goals would you like to schedule?",
                productivity_tips=[], routines=[]
            )
        )
    if intent == "Unrelated Question":
        return AIAnalysisResponse(
            needs_clarification=False,
            result=AIGenerationResponse(
                summary="I'm designed specifically for planning, scheduling, productivity, and routine building. Tell me what you'd like to accomplish today.",
                productivity_tips=[], routines=[]
            )
        )
    if intent == "Vague Request":
        return AIAnalysisResponse(
            needs_clarification=False,
            result=AIGenerationResponse(
                summary="How would you define a productive day? Are there specific tasks you want to accomplish?",
                productivity_tips=[], routines=[]
            )
        )

    parsed = await _analyze_with_groq(input_text, current_time)

    if not parsed or not parsed.get("has_actionable_intent"):
        if parsed and not parsed.get("has_actionable_intent"):
            return AIAnalysisResponse(
                needs_clarification=False,
                result=AIGenerationResponse(
                    summary="I still need a few details before I can create your schedule. Could you specify what tasks you'd like to do, or how long they might take?",
                    productivity_tips=[],
                    routines=[],
                ),
            )
        return AIAnalysisResponse(
            needs_clarification=False,
            result=generate_heuristic_plan(input_text, plan_scope, start_after, existing_blocks=existing_blocks),
        )

    # Build clarification questions
    questions = _build_clarification_questions(parsed, max_questions=2, user_memory_context=user_memory_context)

    if questions:
        return AIAnalysisResponse(
            needs_clarification=True,
            clarifications=questions,
        )

    # High confidence — generate directly
    groq_tasks = parsed.get("tasks", [])
    personality = parsed.get("inferred_personality", "Balanced")
    planned_routines, flex_tasks, explanation_pts, is_over, total_mins, avail_mins, val_warns = _optimize_schedule(groq_tasks, plan_scope, start_after, personality, existing_blocks=existing_blocks, user_memory_context=user_memory_context)

    if is_over:
        # Build deferral suggestions from lowest-priority tasks
        suggested = [t.get("title", "task") for t in sorted(groq_tasks, key=lambda x: x.get("urgency_score", 5))[:2]]
        return AIAnalysisResponse(
            needs_clarification=False,
            result=AIGenerationResponse(
                summary=f"This plan requires {total_mins} minutes but only {avail_mins} are available.",
                productivity_tips=[],
                routines=planned_routines,
                explanation_points=explanation_pts,
                is_overloaded=True,
                overload_message=f"Your requested tasks need {total_mins} minutes, but you only have {avail_mins} minutes available today.",
                suggested_deferrals=suggested,
            ),
        )

    if planned_routines:
        avg_confidence = sum(t.get("confidence", 1.0) for t in groq_tasks) / len(groq_tasks) if groq_tasks else 1.0

        return AIAnalysisResponse(
            needs_clarification=False,
            result=AIGenerationResponse(
                summary="Your optimized schedule is ready.",
                explanation="\n".join(explanation_pts) if explanation_pts else None,
                schedule_confidence=round(avg_confidence, 2),
                productivity_tips=[
                    "Tasks were grouped by context to minimize mental switching.",
                    "Recovery breaks and meals were injected to keep your energy steady.",
                    "Long focus tasks were split into deep-work blocks with buffers."
                ],
                routines=planned_routines,
                explanation_points=explanation_pts,
            ),
        )

    return AIAnalysisResponse(
        needs_clarification=False,
        result=generate_heuristic_plan(input_text, plan_scope, start_after),
    )


async def generate_ai_plan(input_text: str, plan_scope: str, current_time: str | None = None, clarifications: dict[str, str] | None = None, user_memory_context: list[str] | None = None, existing_blocks: list[tuple[datetime, datetime]] | None = None) -> AIGenerationResponse:
    """Phase 2: Generate the schedule, optionally applying user clarifications."""
    today = date.today().isoformat()
    start_after = None
    time_context_prompt = ""
    if current_time:
        try:
            dt = datetime.fromisoformat(current_time.replace('Z', '+00:00'))
            start_after = dt.replace(tzinfo=None)
        except ValueError:
            pass
        time_context_prompt = f"The user's current local time is: {current_time}. Schedule strictly AFTER this time."

    memory_prompt = ""
    if user_memory_context:
        mem_str = "\n".join([f"- {m}" for m in user_memory_context])
        memory_prompt = f"\nUSER PAST BEHAVIORAL MEMORY:\n{mem_str}\n\nIMPORTANT: Accommodate the user's past behavioral preferences when scheduling their tasks."

    system_prompt = f"""You are a Cognitive Scheduling Assistant. You schedule tasks based on human energy, mental fatigue, context switching, and realistic flow.
Analyze the user's natural language request and extract tasks with deep psychological reasoning.

Output STRICT JSON matching this schema:
{{
  "has_actionable_intent": true/false,
  "inferred_personality": "Balanced",
  "new_behavioral_insights": ["Pattern Type: The insight", ...],
  "tasks": [
    {{
      "title": "Short Clean Task Name",
      "is_fixed_time": true/false,
      "time_constraint": "HH:MM",
      "estimated_duration": 60,
      "requires_focus": true/false,
      "requires_travel": true/false,
      "requires_business_hours": true/false,
      "requires_physical_presence": true/false,
      "travel_tier": "nearby|moderate|long_travel",
      "can_be_interrupted": true/false,
      "ideal_time_of_day": "morning|afternoon|evening|night|any",
      "energy_requirement": "High|Medium|Low",
      "cognitive_load": "high|medium|low",
      "urgency_score": 1-10,
      "importance_score": 1-10,
      "deadline_score": 1-10,
      "context_group": "Development",
      "focus_mode_recommended": true/false,
      "is_internal_logistic": true/false,
      "confidence": 0.95
    }}
  ]
}}

Rules:
1. INTENT: If the input is random noise, set has_actionable_intent=false and return an empty tasks array.
2. TIME CONSTRAINTS (CRITICAL): ONLY output a time_constraint (HH:MM) if the user EXPLICITLY provided a specific time for that exact task (e.g., "Movie at 9pm"). NEVER invent or guess times for flexible tasks. If a task has no explicit time, set is_fixed_time=false and time_constraint=null.
3. CONTEXT: Assign the same 'context_group' string to similar tasks to minimize context switching.
4. COGNITIVE LOAD: Accurately estimate 'energy_requirement'.
5. NO HALLUCINATION: DO NOT invent tasks the user didn't mention.
6. REALISM: For out-of-house events, estimate realistic durations and set requires_travel=true.
7. TRAVEL TIER: "nearby" (15min buffer), "moderate" (30min buffer), "long_travel" (60min buffer).
8. INTERNAL LOGISTICS: Set `is_internal_logistic = true` ONLY for purely internal spacing tasks like "returning home", generic transitions, or passive movement.
9. ANTI-HALLUCINATION: Do not invent locations, durations, or commitments. If uncertain, ask (set confidence < 0.7).
10. CURRENT TIME CONTEXT: {time_context_prompt} You are scheduling for the REMAINDER of the day. Do not schedule tasks in the past. If the user asks you to schedule flexible tasks, they must be placed AFTER the current time. Do not set time_constraints of 00:00 or 12:00 AM unless explicitly requested.
11. BEHAVIORAL MEMORY: Extract any explicitly stated new behavioral rules or preferences the user mentions in their prompt (e.g., "I like working out at night", "never schedule deep work after 5pm"). Output them as a list of strings formatted as 'Pattern Type: Insight' in 'new_behavioral_insights'. If none, return [].{memory_prompt}
"""

    user_prompt = f"Today is {today}. Parse this request:\n\n{input_text}"

    parsed = await _groq_chat_json_async(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,
    )

    if parsed and parsed.get("has_actionable_intent"):
        groq_tasks = parsed.get("tasks", [])
        personality = parsed.get("inferred_personality", "Balanced")
        new_insights = parsed.get("new_behavioral_insights", [])

        # Apply user clarifications
        if clarifications:
            if "personality" in clarifications:
                personality = clarifications["personality"]
            for i, task in enumerate(groq_tasks):
                dur_key = f"duration_{i}"
                if dur_key in clarifications:
                    try:
                        task["estimated_duration"] = int(clarifications[dur_key])
                    except ValueError:
                        pass

        # Build travel overrides from clarifications
        travel_overrides: dict[int, str] = {}
        if clarifications:
            for key, value in clarifications.items():
                if key.startswith("travel_"):
                    try:
                        idx = int(key.split("_")[1])
                        travel_overrides[idx] = value
                    except (ValueError, IndexError):
                        pass

        planned_routines, flex_tasks, explanation_pts, is_over, total_mins, avail_mins, val_warns = _optimize_schedule(groq_tasks, plan_scope, start_after, personality, travel_overrides=travel_overrides or None, existing_blocks=existing_blocks, user_memory_context=user_memory_context, clarifications=clarifications)
        
        if is_over and not planned_routines:
            suggested = [t.get("title", "task") for t in sorted(groq_tasks, key=lambda x: x.get("urgency_score", 5))[:2]]
            return AIGenerationResponse(
                summary=f"This plan requires {total_mins} minutes but only {avail_mins} are available.",
                productivity_tips=[],
                routines=[],
                explanation_points=explanation_pts,
                is_overloaded=True,
                overload_message=f"Your requested tasks need {total_mins} minutes, but you only have {avail_mins} minutes available today.",
                validation_warnings=val_warns,
                suggested_deferrals=suggested,
                new_behavioral_insights=new_insights
            )

        if planned_routines:
            avg_confidence = sum(t.get("confidence", 1.0) for t in groq_tasks) / len(groq_tasks) if groq_tasks else 1.0

            return AIGenerationResponse(
                summary="Your optimized schedule is ready.",
                explanation="\n".join(explanation_pts) if explanation_pts else None,
                schedule_confidence=round(avg_confidence, 2),
                productivity_tips=[
                    "Tasks were grouped by context to minimize mental switching.",
                    "Recovery breaks and meals were injected to keep your energy steady.",
                    "Long focus tasks were split into deep-work blocks with buffers."
                ],
                routines=planned_routines,
                explanation_points=explanation_pts,
                is_overloaded=is_over,
                overload_message=f"Your requested tasks need {total_mins} minutes, but only {avail_mins} are available. Some tasks may have been shortened." if is_over else None,
                validation_warnings=val_warns,
                new_behavioral_insights=new_insights
            )

    if parsed and not parsed.get("has_actionable_intent"):
        return AIGenerationResponse(
            summary="I still need a few details before I can create your schedule. Could you specify what tasks you'd like to do, or how long they might take?",
            productivity_tips=[],
            routines=[],
        )

    return generate_heuristic_plan(input_text, plan_scope, start_after, existing_blocks=existing_blocks)

def generate_workspace_ai_tasks(
    prompt: str,
    project_name: str = "Team Space",
    assignee: str | None = None,
    available_projects: list[str] | None = None,
    available_members: list[str] | None = None,
) -> list[WorkspaceAIGeneratedTask]:
    voice_corrections = {
        r"\bbacon\b": "backend",
        r"\bback end\b": "backend",
        r"\bfront hand\b": "frontend",
        r"\bfront end\b": "frontend",
        r"\bdata bass\b": "database",
        r"\bdata base\b": "database",
        r"\bfast api\b": "FastAPI",
        r"\ba p i\b": "API",
        r"\bpost gray sql\b": "PostgreSQL",
        r"\bsuper base\b": "Supabase",
        r"\bauthentification\b": "authentication",
    }

    prompt_clean = re.sub(r"\s+", " ", prompt.strip())
    for pattern, replacement in voice_corrections.items():
        prompt_clean = re.sub(pattern, replacement, prompt_clean, flags=re.IGNORECASE)
    subject = re.sub(r"^(build|create|make|design|develop|fix|implement)\s+", "", prompt_clean, flags=re.IGNORECASE).strip()
    subject = subject or prompt_clean
    due_today = bool(re.search(r"\btoday\b", prompt_clean, flags=re.IGNORECASE))

    priority_keywords = {
        "High": {"urgent", "important", "deadline", "backend", "bug", "bugfix", "critical", "fix", "production", "api", "database", "deploy", "meeting", "exam", "payment", "bill"},
        "Medium": {"development", "develop", "ui", "frontend", "integration", "testing", "test", "feature", "build", "connect", "study", "workout", "travel", "shopping"},
        "Low": {"documentation", "docs", "cleanup", "optional", "refactor", "polish", "laundry", "groceries", "clean"},
    }

    def infer_main_task_priority(text: str) -> str:
        lowered = text.lower()
        for priority, keywords in priority_keywords.items():
            if any(keyword in lowered for keyword in keywords):
                return priority
        return "Medium"

    quote_catalog = {
        "coding": [
            "Clean code today saves debugging tomorrow.",
            "Readable code moves teams faster.",
        ],
        "bug": [
            "Every bug solved sharpens the product.",
            "Small fixes create stronger releases.",
        ],
        "testing": [
            "Quality is built before release day.",
            "Reliable tests protect confident changes.",
        ],
        "deployment": [
            "Smooth releases come from careful preparation.",
            "Stable launches reward disciplined checks.",
        ],
        "meetings": [
            "Clear decisions move teams faster.",
            "Focused meetings turn discussion into action.",
        ],
        "documentation": [
            "Good docs save future hours.",
            "Clear notes reduce tomorrow's confusion.",
        ],
        "ui": [
            "Great interfaces feel effortless.",
            "Thoughtful UI reduces user friction.",
        ],
        "database": [
            "Strong data design prevents future chaos.",
            "Clean schemas keep products scalable.",
        ],
        "planning": [
            "A clear roadmap speeds execution.",
            "Better plans create calmer delivery.",
        ],
        "learning": [
            "Every new skill increases your value.",
            "Consistent learning compounds into expertise.",
        ],
        "fitness": [
            "Consistent movement builds lasting energy.",
            "Discipline in fitness strengthens every day.",
        ],
        "home": [
            "A clear space creates a calmer mind.",
            "Small routines keep life lighter.",
        ],
        "shopping": [
            "Prepared lists make smarter shopping.",
            "Simple errands feel better when organized.",
        ],
        "travel": [
            "Good travel starts with thoughtful planning.",
            "Prepared journeys feel effortless.",
        ],
        "fallback": [
            "Small focused progress compounds quickly.",
            "Smart execution turns ideas into outcomes.",
            "Precision today creates momentum tomorrow.",
            "Clear work beats busy work.",
            "Focused effort builds better products.",
        ],
    }

    used_quotes: set[str] = set()

    def task_quote(title: str) -> str:
        lowered = title.lower()
        if any(word in lowered for word in ("bug", "fix", "error", "issue", "debug")):
            category = "bug"
        elif any(word in lowered for word in ("test", "qa", "quality", "verify", "validation")):
            category = "testing"
        elif any(word in lowered for word in ("deploy", "release", "publish", "launch")):
            category = "deployment"
        elif any(word in lowered for word in ("meeting", "call", "review", "discussion", "standup")):
            category = "meetings"
        elif any(word in lowered for word in ("doc", "readme", "note", "documentation")):
            category = "documentation"
        elif any(word in lowered for word in ("ui", "ux", "screen", "interface", "design", "frontend")):
            category = "ui"
        elif any(word in lowered for word in ("database", "schema", "sql", "postgres", "mysql", "supabase", "data")):
            category = "database"
        elif any(word in lowered for word in ("plan", "roadmap", "requirement", "scope")):
            category = "planning"
        elif any(word in lowered for word in ("learn", "study", "practice", "course")):
            category = "learning"
        elif any(word in lowered for word in ("gym", "workout", "exercise", "run", "walk", "yoga", "fitness")):
            category = "fitness"
        elif any(word in lowered for word in ("wash", "clean", "cook", "laundry", "room", "home")):
            category = "home"
        elif any(word in lowered for word in ("buy", "shop", "shopping", "groceries", "purchase")):
            category = "shopping"
        elif any(word in lowered for word in ("travel", "trip", "book", "pack", "flight", "hotel")):
            category = "travel"
        elif any(word in lowered for word in ("code", "api", "backend", "fastapi", "connect", "build", "implement", "develop")):
            category = "coding"
        else:
            category = "fallback"

        for quote in quote_catalog[category] + quote_catalog["fallback"]:
            if quote not in used_quotes:
                used_quotes.add(quote)
                return quote
        return "Focused software work creates lasting momentum."

    def strip_filler_text(text: str) -> str:
        cleaned = text.strip(" .,-")
        filler_patterns = [
            r"\bmy\s+manager\s+(said|told\s+me|gave\s+me\s+work|give\s+me\s+work|asked\s+me)\s+(to\s+)?",
            r"\bmanager\s+(said|told\s+me|gave\s+me\s+work|give\s+me\s+work|asked\s+me)\s+(to\s+)?",
            r"\b(can\s+you|could\s+you)\s+(please\s+)?(make|do|help\s+me\s+with)\s+",
            r"\b(today\s+)?(i\s+)?(have\s+to|need\s+to|must|should|want\s+to|will|am\s+going\s+to|gotta)\s+",
            r"\bplease\s+(complete|do|make)\s+",
            r"\bgive\s+me\s+work\s+(to\s+)?",
            r"\blike\s+(this\s+)?",
            r"\bmaybe\s+",
        ]
        for pattern in filler_patterns:
            cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\b(today|tomorrow|this week)\b", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\bbackend\s+auth\b", "backend authentication", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"^(to|and|then|also)\b", "", cleaned, flags=re.IGNORECASE)
        return re.sub(r"\s+", " ", cleaned).strip(" .,-")

    def clean_main_task(text: str) -> str:
        cleaned = strip_filler_text(text)
        cleaned = re.sub(r"\s+", " ", cleaned).strip(" .,-")
        if not cleaned or cleaned.lower() in {"to", "and", "then", "also"}:
            return ""
        words = cleaned.split()
        small_words = {"on", "to", "in", "for", "with", "of", "the", "a", "an"}
        title_words = []
        for index, word in enumerate(words):
            if index > 0 and word.lower() in small_words:
                title_words.append(word.lower())
            else:
                title_words.append(word if word.isupper() else word.capitalize())
        title = " ".join(title_words)
        title = (
            title.replace("Fastapi", "FastAPI")
            .replace("Api", "API")
            .replace("Ui", "UI")
            .replace("Db", "DB")
        )
        return title[:120]

    def split_main_tasks(text: str) -> list[str]:
        action_verbs = (
            "complete|finish|fix|connect|create|update|deploy|wash|clean|buy|study|learn|attend|"
            "book|pack|cook|visit|submit|prepare|write|read|practice|exercise|pay|schedule|call|"
            "review|design|build|develop|implement|test|debug|shop|plan|go"
        )
        prepared = strip_filler_text(text)
        prepared = re.sub(
            r"\b(then|also|after that|afterwards|plus|along with)\b",
            ",",
            prepared,
            flags=re.IGNORECASE,
        )
        prepared = re.sub(rf"\s+\b({action_verbs})\b", r", \1", prepared, flags=re.IGNORECASE)
        prepared = prepared.lstrip(" ,")
        parts = [clean_main_task(part) for part in re.split(r",|;|\n|&|\band\b|\bafter\b", prepared, flags=re.IGNORECASE)]
        unique_parts: list[str] = []
        seen: set[str] = set()
        for part in parts:
            key = part.lower()
            if part and key not in seen:
                seen.add(key)
                unique_parts.append(part)
        fallback = clean_main_task(text)
        return unique_parts[:5] or ([fallback] if fallback else [clean_main_task(subject)])

    def normalize_generated_items(items: list[dict]) -> list[WorkspaceAIGeneratedTask]:
        normalized_items: list[WorkspaceAIGeneratedTask] = []
        for index, item in enumerate(items[:5], start=1):
            title = str(item.get("title") or item.get("task") or "").strip()
            if not title:
                continue
            priority = str(item.get("priority") or "Medium").strip().capitalize()
            if priority not in {"Low", "Medium", "High"}:
                priority = "Medium"
            description = str(item.get("description") or item.get("quote") or task_quote(title)).strip()

            guessed_project = item.get("project")
            guessed_assignee = item.get("assignee")

            proj = project_name
            if guessed_project and available_projects:
                matched_proj = next((p for p in available_projects if p.lower() == str(guessed_project).strip().lower()), None)
                if matched_proj:
                    proj = matched_proj
                elif str(guessed_project).strip().lower() == "team space":
                    proj = "Team Space"

            ass = assignee or "Unassigned"
            if guessed_assignee and available_members:
                matched_ass = next((m for m in available_members if m.lower() == str(guessed_assignee).strip().lower()), None)
                if matched_ass:
                    ass = matched_ass
                elif str(guessed_assignee).strip().lower() == "unassigned":
                    ass = "Unassigned"

            normalized_items.append(
                WorkspaceAIGeneratedTask(
                    title=clean_main_task(title)[:120],
                    description=description[:220],
                    assignee=ass,
                    priority=priority,
                    status="Todo",
                    due_date=date.today() if due_today else date.today() + timedelta(days=index),
                    progress=0,
                    project_name=proj,
                )
            )
        return normalized_items

    system_content = (
        "You are a senior productivity assistant. Extract only real actionable tasks from natural text "
        "across software, office work, study, home routines, fitness, shopping, meetings, travel, and "
        "mixed personal tasks. Remove filler like manager said, I need to, please do, can you help, and "
        "today I want. Create exactly as many main tasks as the user mentioned, up to 5. Do not create "
        "subtasks or step-by-step breakdown. Each description must be one short premium quote related "
        "to the task type, never repeat the task title, and never use generic completion filler. "
    )

    if available_projects or available_members:
        system_content += "\nYou must classify each task to a specific project and assign it to a team member if mentioned.\n"
        if available_projects:
            system_content += f"Available Projects: {json.dumps(available_projects)}. "
            system_content += "If a task mentions or relates to one of these projects, set its 'project' field to that exact project name. If none match, use 'Team Space'.\n"
        if available_members:
            system_content += f"Available Members: {json.dumps(available_members)}. "
            system_content += "If a task mentions or relates to one of these members, set its 'assignee' field to that exact member name. If none match, use 'Unassigned'.\n"

        system_content += (
            "Return JSON only: {\"tasks\":[{\"title\":\"...\",\"description\":\"short smart quote\","
            "\"priority\":\"Low|Medium|High\",\"project\":\"...\",\"assignee\":\"...\"}]}"
        )
    else:
        system_content += (
            "Return JSON only: {\"tasks\":[{\"title\":\"...\",\"description\":\"short smart quote\","
            "\"priority\":\"Low|Medium|High\"}]}"
        )

    groq_result = _groq_chat_json(
        messages=[
            {
                "role": "system",
                "content": system_content,
            },
            {"role": "user", "content": prompt_clean},
        ],
        temperature=0.55,
    )
    if groq_result:
        groq_tasks = normalize_generated_items(groq_result.get("tasks", []))
        if groq_tasks:
            return groq_tasks

    main_tasks = split_main_tasks(prompt_clean)
    return [
        WorkspaceAIGeneratedTask(
            title=title,
            description=task_quote(title),
            assignee=assignee or "Unassigned",
            priority=infer_main_task_priority(title),
            status="Todo",
            due_date=date.today() if due_today else date.today() + timedelta(days=index),
            progress=0,
            project_name=project_name,
        )
        for index, title in enumerate(main_tasks, start=1)
    ]
