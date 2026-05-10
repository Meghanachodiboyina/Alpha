import json
import os
import re
from datetime import date, datetime, time, timedelta

import httpx

from .schemas import (
    AIGenerationResponse,
    AIPlannedRoutine,
    WorkspaceAIGeneratedTask,
)

GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_TRANSCRIPTIONS_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
GROQ_WHISPER_MODEL = "whisper-large-v3"


def _groq_headers() -> dict[str, str] | None:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return None
    return {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}


def _groq_model() -> str:
    return os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")


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
    except Exception:
        return None


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


async def transcribe_audio_with_groq(
    audio_bytes: bytes,
    filename: str = "voice.webm",
    content_type: str = "audio/webm",
) -> str:
    api_key = os.getenv("GROQ_API_KEY")
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
    "breakfast": time(7, 30),
    "lunch": time(12, 30),
    "dinner": time(19, 0),
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


def _build_schedule(tasks: list[str | dict], plan_scope: str) -> list[AIPlannedRoutine]:
    planned_routines: list[AIPlannedRoutine] = []
    current_slot_by_date: dict[date, datetime] = {}
    occupied_slots_by_date: dict[date, list[tuple[datetime, datetime]]] = {}

    for task_index, task_item in enumerate(tasks):
        if isinstance(task_item, dict):
            title_override = _clean_planner_title(str(task_item.get("title") or task_item.get("task") or ""))
            raw_task = str(task_item.get("source_text") or task_item.get("raw_text") or task_item.get("context") or title_override)
            priority = _normalize_priority(str(task_item.get("priority") or ""), raw_task)
            estimated_time = int(task_item.get("estimated_time") or _guess_duration(raw_task))
        else:
            raw_task = task_item
            title_override = _make_title(raw_task)
            priority = _guess_priority(raw_task)
            estimated_time = _guess_duration(raw_task)
        task_date = _assign_weekly_date(raw_task, task_index) if plan_scope == "weekly" else _extract_target_date(raw_task, plan_scope)
        occupied_slots = occupied_slots_by_date.setdefault(task_date, [])
        current_slot = current_slot_by_date.setdefault(task_date, datetime.combine(task_date, time(7, 0)))

        desired_start = _guess_start_time(raw_task, current_slot)
        start_dt = _find_next_available_start(task_date, desired_start, estimated_time, occupied_slots)
        end_dt = start_dt + timedelta(minutes=estimated_time)

        occupied_slots.append((start_dt, end_dt))
        occupied_slots.sort(key=lambda slot: slot[0])
        current_slot_by_date[task_date] = end_dt + timedelta(minutes=15)

        planned_routines.append(
            AIPlannedRoutine(
                title=title_override,
                description=f"AI planned task based on user input: {raw_task}",
                date=task_date,
                start_time=start_dt.time().replace(second=0, microsecond=0),
                end_time=end_dt.time().replace(second=0, microsecond=0),
                priority=priority,
                status="Pending",
                estimated_time=estimated_time,
                suggestion=_suggestion_for(raw_task, priority),
            )
        )

    return planned_routines


def generate_heuristic_plan(input_text: str, plan_scope: str) -> AIGenerationResponse:
    tasks = _extract_tasks(input_text)
    planned_routines = _build_schedule(tasks, plan_scope)

    tips = []
    if any("study" in task.lower() or "project" in task.lower() for task in tasks):
        tips.append("Your focus-heavy work was moved earlier so you can use your strongest attention window first.")
    if any("meeting" in task.lower() for task in tasks):
        tips.append("Meeting blocks were anchored to the requested time so the rest of the plan works around them.")
    if any("gym" in task.lower() or "workout" in task.lower() for task in tasks):
        tips.append("Fitness was placed later in the day to avoid interrupting your highest-focus work blocks.")
    if any("cook" in task.lower() or "food" in task.lower() for task in tasks):
        tips.append("Meal-related tasks were kept close to realistic meal times so the plan feels easier to follow.")
    tips.append("The schedule keeps buffer space between major tasks to reduce overlap and make the day more practical.")
    tips = tips[:4]

    return AIGenerationResponse(
        summary=f"Built a clearer {plan_scope} routine with {len(planned_routines)} separated task blocks, practical timings, and relevant suggestions.",
        productivity_tips=tips,
        routines=planned_routines,
    )


async def generate_ai_plan(input_text: str, plan_scope: str) -> AIGenerationResponse:
    today = date.today().isoformat()
    fallback_tasks = _extract_tasks(input_text)
    system_prompt = """
    You are a senior productivity planner. Extract clean separate routine tasks from natural language.

    Return JSON only with:
    {
      "tasks": [
        {
          "title": "short clean professional task title",
          "source_text": "the original phrase with date/time words preserved",
          "priority": "High|Medium|Low",
          "estimated_time": 30-240
        }
      ],
      "productivity_tips": ["short useful tip"]
    }

    Rules:
    - Split every distinct action into its own task.
    - Split by commas, and, then, also, next, plus, &, time mentions, repeated action verbs, and multiple goals.
    - Never return one long combined task when multiple actions exist.
    - Remove filler from title: today, tomorrow, morning, afternoon, evening, night, please, I need to, I have to.
    - Keep date/time words only inside source_text so scheduling can use them.
    - Titles must be short and clean, like "Study Python" or "Work on FastAPI Backend".
    - Preserve prompt order unless a specific time makes a task naturally anchored.
    - For "Work on FastAPI backend and work on frontend Swagger UI", return two tasks.
    """

    user_prompt = f"""
    Today's date is {today}

    Split this {plan_scope} routine request:

    {input_text}
    """

    parsed = await _groq_chat_json_async(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.3,
    )
    if parsed:
        raw_items = parsed.get("tasks") or []
        groq_tasks: list[dict] = []
        seen_titles: set[str] = set()
        for item in raw_items:
            title = _clean_planner_title(str(item.get("title") or item.get("task") or ""))
            if not title or title.lower() in seen_titles:
                continue
            seen_titles.add(title.lower())
            groq_tasks.append({
                "title": title,
                "source_text": str(item.get("source_text") or item.get("raw_text") or item.get("context") or title),
                "priority": item.get("priority") or _guess_priority(title),
                "estimated_time": item.get("estimated_time") or _guess_duration(title),
            })

        if groq_tasks:
            planned_routines = _build_schedule(groq_tasks[:8], plan_scope)
            tips = parsed.get("productivity_tips") or [
                "The routine was split into clear action blocks so each item is easier to complete."
            ]
            return AIGenerationResponse(
                summary=f"Built a Groq-powered {plan_scope} routine with {len(planned_routines)} clean task blocks.",
                productivity_tips=[str(tip) for tip in tips[:4]],
                routines=planned_routines,
            )

    return generate_heuristic_plan(input_text, plan_scope)


def generate_workspace_ai_tasks(
    prompt: str,
    project_name: str = "Team Space",
    assignee: str | None = None,
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
            normalized_items.append(
                WorkspaceAIGeneratedTask(
                    title=clean_main_task(title)[:120],
                    description=description[:220],
                    assignee=assignee or "Unassigned",
                    priority=priority,
                    status="Todo",
                    due_date=date.today() if due_today else date.today() + timedelta(days=index),
                    progress=0,
                    project_name=project_name,
                )
            )
        return normalized_items

    groq_result = _groq_chat_json(
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a senior productivity assistant. Extract only real actionable tasks from natural text "
                    "across software, office work, study, home routines, fitness, shopping, meetings, travel, and "
                    "mixed personal tasks. Remove filler like manager said, I need to, please do, can you help, and "
                    "today I want. Create exactly as many main tasks as the user mentioned, up to 5. Do not create "
                    "subtasks or step-by-step breakdown. Each description must be one short premium quote related "
                    "to the task type, never repeat the task title, and never use generic completion filler. "
                    "Return JSON only: {\"tasks\":[{\"title\":\"...\",\"description\":\"short smart quote\","
                    "\"priority\":\"Low|Medium|High\"}]}"
                ),
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
