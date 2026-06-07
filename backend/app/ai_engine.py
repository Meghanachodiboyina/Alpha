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


def _optimize_schedule(ai_tasks: list[dict], plan_scope: str, start_after: datetime | None = None, personality: str = "Balanced", travel_overrides: dict[int, str] | None = None) -> list[AIPlannedRoutine]:
    valid_tasks = [t for t in ai_tasks if t.get("confidence", 1.0) >= 0.5]
    if not valid_tasks:
        return []

    planned_routines: list[AIPlannedRoutine] = []
    
    today_date = start_after.date() if start_after else date.today()
    base_time = start_after if start_after else datetime.combine(today_date, time(8, 0))
    end_of_day = datetime.combine(today_date, time(23, 59))
    
    occupied_slots: list[tuple[datetime, datetime]] = []
    
    def add_slot(start: datetime, duration_mins: int) -> tuple[datetime, datetime]:
        end = start + timedelta(minutes=duration_mins)
        occupied_slots.append((start, end))
        occupied_slots.sort(key=lambda s: s[0])
        return start, end

    def is_slot_free(start: datetime, duration_mins: int) -> bool:
        end = start + timedelta(minutes=duration_mins)
        if end > end_of_day:
            return False
        for s_start, s_end in occupied_slots:
            if start < s_end and end > s_start:
                return False
        return True

    def find_free_slot(search_start: datetime, duration_mins: int, energy_req: str = "Medium", requires_business_hours: bool = False) -> datetime | None:
        candidate = search_start
        step = timedelta(minutes=15)
        remainder = candidate.minute % 15
        if remainder != 0:
            candidate += timedelta(minutes=(15 - remainder))
            
        while candidate + timedelta(minutes=duration_mins) <= end_of_day:
            if is_slot_free(candidate, duration_mins):
                # Reality Validation: Business hours constraint (10 AM to 9 PM in India)
                if requires_business_hours:
                    end_time = candidate + timedelta(minutes=duration_mins)
                    if candidate.time() < time(10, 0) or end_time.time() > time(21, 0):
                        candidate += step
                        continue

                # Calm personality avoids High energy tasks late at night if possible
                if energy_req == "High" and personality == "Calm" and candidate.time() >= time(17, 0):
                    pass # We ideally skip this, but we rely on fallback if no earlier slot exists
                return candidate
            candidate += step
        return None

    fixed_tasks = [t for t in valid_tasks if t.get("is_fixed_time", False)]
    flexible_tasks = [t for t in valid_tasks if not t.get("is_fixed_time", False)]
    
    # Layer 1: Fixed Events
    for ti, t in enumerate(fixed_tasks):
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
            start_dt = find_free_slot(base_time, duration, "High") or base_time

        s, e = add_slot(start_dt, duration)
        
        if t.get("requires_travel"):
            # Determine commute buffer from clarifications or task's travel_tier
            task_idx = valid_tasks.index(t)
            travel_key = f"travel_{task_idx}"
            if travel_overrides and travel_key in travel_overrides:
                travel_tier = travel_overrides[travel_key]
            else:
                travel_tier = t.get("travel_tier", "moderate")
            commute_mins = TRAVEL_TIER_BUFFERS.get(travel_tier, 30)

            buffer_start = max(base_time, s - timedelta(minutes=commute_mins))
            if buffer_start < s:
                add_slot(buffer_start, int((s - buffer_start).total_seconds() // 60))
                planned_routines.append({
                    "task": {
                        "title": f"Commute to {t.get('title', 'Event')}",
                        "priority": "Medium",
                        "energy_requirement": "Low",
                        "is_fixed_time": False,
                        "is_internal_logistic": True
                    },
                    "start": buffer_start,
                    "end": s
                })
            if e + timedelta(minutes=commute_mins) <= end_of_day:
                add_slot(e, commute_mins)
                planned_routines.append({
                    "task": {
                        "title": "Return Commute",
                        "priority": "Medium",
                        "energy_requirement": "Low",
                        "is_fixed_time": False,
                        "is_internal_logistic": True
                    },
                    "start": e,
                    "end": e + timedelta(minutes=commute_mins)
                })

        planned_routines.append({"task": t, "start": s, "end": e})

    # Layer 2: Flexible & Focus Tasks (Grouped by Context & Paced)
    def flex_sort_key(t):
        energy = str(t.get("energy_requirement", "Medium")).capitalize()
        e_score = 0 if energy == "High" else 1 if energy == "Medium" else 2
        ctx = str(t.get("context_group", "Other"))
        return (ctx, e_score)

    flexible_tasks.sort(key=flex_sort_key)
    
    current_search = base_time
    
    break_duration = 15
    if personality == "Aggressive":
        break_duration = 0
    elif personality == "Calm":
        break_duration = 30
        
    for i, t in enumerate(flexible_tasks):
        duration = t.get("estimated_duration") or 60
        energy = str(t.get("energy_requirement", "Medium")).capitalize()
        req_business = bool(t.get("requires_business_hours", False))
        
        slot = find_free_slot(current_search, duration, energy, requires_business_hours=req_business)
        
        if not slot:
            shrinked_duration = max(30, duration // 2)
            slot = find_free_slot(current_search, shrinked_duration, energy, requires_business_hours=req_business)
            if slot:
                duration = shrinked_duration
            else:
                # If still no slot (even after shrinking), fallback without business hour constraint if needed
                slot = find_free_slot(current_search, shrinked_duration, energy, requires_business_hours=False)
                if not slot:
                    slot = occupied_slots[-1][1] if occupied_slots else current_search
        
        s, e = add_slot(slot, duration)

        # Inject commute buffers for flexible tasks that require travel
        if t.get("requires_travel"):
            task_idx = valid_tasks.index(t)
            travel_key = f"travel_{task_idx}"
            if travel_overrides and travel_key in travel_overrides:
                travel_tier = travel_overrides[travel_key]
            else:
                travel_tier = t.get("travel_tier", "moderate")
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
                        "is_internal_logistic": True
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
                        "is_internal_logistic": True
                    },
                    "start": rc_s,
                    "end": rc_e
                })

        planned_routines.append({"task": t, "start": s, "end": e})
        
        # Inject Recovery Buffer
        if (t.get("requires_focus") or energy == "High") and break_duration > 0:
            if is_slot_free(e, break_duration):
                bs, be = add_slot(e, break_duration)
                planned_routines.append({
                    "task": {
                        "title": "Recovery Break",
                        "priority": "Low",
                        "energy_requirement": "Low",
                        "is_fixed_time": False,
                        "is_internal_logistic": True
                    },
                    "start": bs,
                    "end": be
                })
        
        # Add transition padding between different context groups to avoid jarring context switching
        next_t = flexible_tasks[i+1] if i + 1 < len(flexible_tasks) else None
        if next_t and next_t.get("context_group") != t.get("context_group"):
            padding = 15 if personality != "Aggressive" else 0
            current_search = e + timedelta(minutes=break_duration + padding)
        else:
            current_search = e + timedelta(minutes=break_duration)

    planned_routines.sort(key=lambda r: r["start"])
    
    results = []
    for r in planned_routines:
        t_data = r["task"]
        title = _clean_planner_title(t_data.get("title", ""))
        priority = "Medium"
        focus_mode_recommended = bool(t_data.get("focus_mode_recommended", False))
            
        desc = f"AI planned: {title}"
        if title == "Recovery Break":
            desc = "Mental recovery and pacing break to sustain cognitive energy."
        elif "Commute" in title:
            desc = "Automatically generated travel buffer time."
            
        results.append(
            AIPlannedRoutine(
                title=title,
                description=desc,
                date=today_date,
                start_time=r["start"].time().replace(second=0, microsecond=0),
                end_time=r["end"].time().replace(second=0, microsecond=0),
                priority=priority,
                status="Pending",
                estimated_time=int((r["end"] - r["start"]).total_seconds() // 60),
                focus_mode_recommended=focus_mode_recommended,
                is_internal=bool(t_data.get("is_internal_logistic", False)),
                suggestion=_suggestion_for(title, priority),
            )
        )
    return results, flexible_tasks

def generate_heuristic_plan(input_text: str, plan_scope: str, start_after: datetime | None = None) -> AIGenerationResponse:
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
    planned_routines, _ = _optimize_schedule(ai_tasks, plan_scope, start_after, "Balanced")
    return AIGenerationResponse(
        summary=f"Built a simple {plan_scope} routine.",
        productivity_tips=["Fallback scheduling used."],
        routines=planned_routines,
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


def _build_clarification_questions(parsed: dict, max_questions: int = 2) -> list[AIClarificationQuestion]:
    """Build lightweight clarification questions based on AI analysis results. Max 2 questions."""
    questions: list[AIClarificationQuestion] = []
    tasks = parsed.get("tasks", [])

    # 1. Travel clarification — ask for tasks that require travel to verify distance
    for i, task in enumerate(tasks):
        if len(questions) >= max_questions:
            break
        if task.get("requires_travel"):
            title = task.get("title", "this activity")
            questions.append(AIClarificationQuestion(
                id=f"travel_{i}",
                question=f"How far is the {title.lower()}?",
                type="single_choice",
                options=[
                    AIClarificationOption(value="nearby", label="Nearby", emoji="🏠"),
                    AIClarificationOption(value="moderate", label="Moderate Travel", emoji="🚗"),
                    AIClarificationOption(value="long_travel", label="Long Travel", emoji="✈️"),
                ],
                task_title=title,
                default_value="moderate",
            ))

    # 2. Personality suggestion — ask if schedule has multiple tasks
    if len(questions) < max_questions:
        density = parsed.get("schedule_density", "moderate")
        personality = parsed.get("inferred_personality", "Balanced")
        personality_conf = parsed.get("personality_confidence", 0.9)

        if density in ("packed", "moderate"):
            questions.append(AIClarificationQuestion(
                id="personality",
                question="How would you like to pace your schedule today?",
                type="single_choice",
                options=[
                    AIClarificationOption(value="Balanced", label="Keep Balanced", emoji="⚖️"),
                    AIClarificationOption(value="Aggressive", label="Tighter Schedule", emoji="⚡"),
                    AIClarificationOption(value="Calm", label="Relaxed Pacing", emoji="🧘"),
                ],
                task_title=None,
                default_value="Balanced",
            ))
        elif personality_conf < 0.7 and personality != "Balanced":
            questions.append(AIClarificationQuestion(
                id="personality",
                question=f"You seem to prefer a {personality.lower()} pace. Keep it?",
                type="single_choice",
                options=[
                    AIClarificationOption(value="Balanced", label="Keep Balanced", emoji="⚖️"),
                    AIClarificationOption(value=personality, label=f"Use {personality}", emoji="✦"),
                ],
                task_title=None,
                default_value="Balanced",
            ))

    # 3. Duration clarification for tasks where AI is somewhat uncertain
    for i, task in enumerate(tasks):
        if len(questions) >= max_questions:
            break
        if task.get("duration_confidence") == "low" or task.get("confidence", 1.0) < 0.85:
            title = task.get("title", "this task")
            est = task.get("estimated_duration", 60)
            questions.append(AIClarificationQuestion(
                id=f"duration_{i}",
                question=f"How long is {title.lower()}?",
                type="single_choice",
                options=[
                    AIClarificationOption(value=str(max(30, est // 2)), label=f"~{max(30, est // 2)} min", emoji="⏱️"),
                    AIClarificationOption(value=str(est), label=f"~{est} min", emoji="⏱️"),
                    AIClarificationOption(value=str(int(est * 1.5)), label=f"~{int(est * 1.5)} min", emoji="⏱️"),
                ],
                task_title=title,
                default_value=str(est),
            ))

    # 4. Business hours clarification
    for i, task in enumerate(tasks):
        if len(questions) >= max_questions:
            break
        if task.get("requires_business_hours") and not task.get("is_fixed_time") and not task.get("time_constraint"):
            title = task.get("title", "this task")
            questions.append(AIClarificationQuestion(
                id=f"biz_hours_{i}",
                question=f"Should {title.lower()} be done during business hours?",
                type="single_choice",
                options=[
                    AIClarificationOption(value="yes", label="Yes (10AM-9PM)", emoji="🏪"),
                    AIClarificationOption(value="no", label="Anytime", emoji="🕰️"),
                ],
                task_title=title,
                default_value="yes",
            ))

    # 5. Timing Ambiguity
    for i, task in enumerate(tasks):
        if len(questions) >= max_questions:
            break
        ideal_time = task.get("ideal_time_of_day", "any")
        if ideal_time == "any" and not task.get("is_fixed_time"):
            title = task.get("title", "this task")
            questions.append(AIClarificationQuestion(
                id=f"timing_{i}",
                question=f"When do you prefer to do {title.lower()}?",
                type="single_choice",
                options=[
                    AIClarificationOption(value="morning", label="Morning", emoji="🌅"),
                    AIClarificationOption(value="afternoon", label="Afternoon", emoji="☀️"),
                    AIClarificationOption(value="evening", label="Evening", emoji="🌙"),
                ],
                task_title=title,
                default_value="afternoon",
            ))

    return questions


async def analyze_ai_plan(input_text: str, plan_scope: str, current_time: str | None = None) -> AIAnalysisResponse:
    """Phase 1: Analyze the user's request and determine if clarification is needed."""
    start_after = None
    if current_time:
        try:
            dt = datetime.fromisoformat(current_time.replace('Z', '+00:00'))
            start_after = dt.replace(tzinfo=None)
        except ValueError:
            pass

    parsed = await _analyze_with_groq(input_text, current_time)

    if not parsed or not parsed.get("has_actionable_intent"):
        if parsed and not parsed.get("has_actionable_intent"):
            return AIAnalysisResponse(
                needs_clarification=False,
                result=AIGenerationResponse(
                    summary="I couldn't find any actionable tasks in that request. Please try describing your plans clearly.",
                    productivity_tips=[],
                    routines=[],
                ),
            )
        return AIAnalysisResponse(
            needs_clarification=False,
            result=generate_heuristic_plan(input_text, plan_scope, start_after),
        )

    # Build clarification questions
    questions = _build_clarification_questions(parsed, max_questions=2)

    if questions:
        return AIAnalysisResponse(
            needs_clarification=True,
            clarifications=questions,
        )

    # High confidence — generate directly
    groq_tasks = parsed.get("tasks", [])
    personality = parsed.get("inferred_personality", "Balanced")
    planned_routines, flex_tasks = _optimize_schedule(groq_tasks, plan_scope, start_after, personality)

    if planned_routines:
        avg_confidence = sum(t.get("confidence", 1.0) for t in groq_tasks) / len(groq_tasks) if groq_tasks else 1.0
        explanations = [f"Intelligently generated a {personality.lower()} schedule optimized for human energy and focus."]
        for t in flex_tasks:
            if t.get("requires_business_hours"):
                explanations.append(f"{t.get('title')} was constrained to business hours (10 AM - 9 PM).")
            if t.get("requires_focus"):
                explanations.append(f"{t.get('title')} was placed to avoid fragmentation.")

        return AIAnalysisResponse(
            needs_clarification=False,
            result=AIGenerationResponse(
                summary=" ".join(explanations[:2]), # Keep summary brief
                explanation=" ".join(explanations),
                schedule_confidence=round(avg_confidence, 2),
                productivity_tips=[
                    "Tasks were grouped by context to minimize mental switching.",
                    "Recovery breaks were automatically injected after intense focus blocks.",
                    "Your schedule respects your natural cognitive energy levels."
                ],
                routines=planned_routines,
            ),
        )

    return AIAnalysisResponse(
        needs_clarification=False,
        result=generate_heuristic_plan(input_text, plan_scope, start_after),
    )


async def generate_ai_plan(input_text: str, plan_scope: str, current_time: str | None = None, clarifications: dict[str, str] | None = None) -> AIGenerationResponse:
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

    system_prompt = f"""You are a Cognitive Scheduling Assistant. You schedule tasks based on human energy, mental fatigue, context switching, and realistic flow.
Analyze the user's natural language request and extract tasks with deep psychological reasoning.

Output STRICT JSON matching this schema:
{{
  "has_actionable_intent": true/false,
  "inferred_personality": "Balanced",
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
      "context_group": "Development",
      "focus_mode_recommended": true/false,
      "is_internal_logistic": true/false,
      "confidence": 0.95
    }}
  ]
}}

Rules:
1. INTENT: If the input is random noise, set has_actionable_intent=false and return an empty tasks array.
2. COGNITIVE LOAD: Accurately estimate 'energy_requirement'.
3. CONTEXT: Assign the same 'context_group' string to similar tasks to minimize context switching.
4. TIME CONSTRAINTS: Only output a time_constraint (HH:MM) if the user explicitly provided a time.
5. NO HALLUCINATION: DO NOT invent tasks the user didn't mention.
6. REALISM: For out-of-house events (movies=150-180min, gym=60-90min), estimate realistic durations and set requires_travel=true.
7. TRAVEL TIER: "nearby" (15min buffer), "moderate" (30min buffer), "long_travel" (60min buffer).
8. INTERNAL LOGISTICS: Set `is_internal_logistic = true` ONLY for purely internal spacing tasks like "returning home", generic transitions, or passive movement. If it's a primary human activity (e.g., "Movie", "Dinner"), set it to `false`. "Flight to Delhi" is an event, so it's `false`. "Return home" is usually just logistical, so `true`.
9. ANTI-HALLUCINATION: Do not invent locations, durations, or commitments. If uncertain, ask (set confidence < 0.7).
10. {time_context_prompt}"""

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

        planned_routines, flex_tasks = _optimize_schedule(groq_tasks, plan_scope, start_after, personality, travel_overrides=travel_overrides or None)
        
        if planned_routines:
            avg_confidence = sum(t.get("confidence", 1.0) for t in groq_tasks) / len(groq_tasks) if groq_tasks else 1.0
            explanations = [f"Intelligently generated a {personality.lower()} schedule optimized for human energy and focus."]
            for t in flex_tasks:
                if t.get("requires_business_hours"):
                    explanations.append(f"{t.get('title')} was constrained to business hours (10 AM - 9 PM).")
                if t.get("requires_focus"):
                    explanations.append(f"{t.get('title')} was placed to avoid fragmentation.")

            return AIGenerationResponse(
                summary=" ".join(explanations[:2]), # Keep summary brief
                explanation=" ".join(explanations),
                schedule_confidence=round(avg_confidence, 2),
                productivity_tips=[
                    "Tasks were grouped by context to minimize mental switching.",
                    "Recovery breaks were automatically injected after intense focus blocks.",
                    "Your schedule respects your natural cognitive energy levels."
                ],
                routines=planned_routines,
            )

    if parsed and not parsed.get("has_actionable_intent"):
        return AIGenerationResponse(
            summary="I couldn't find any actionable tasks in that request. Please try describing your plans clearly.",
            productivity_tips=[],
            routines=[],
        )

    return generate_heuristic_plan(input_text, plan_scope, start_after)

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
