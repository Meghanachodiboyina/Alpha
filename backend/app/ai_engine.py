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
    cleaned = re.sub(
        r"^\s*(i\s+(?:have to|need to|should|must|want to|had to)|please|today i need to|today i have to)\s+",
        "",
        task.strip(),
        flags=re.IGNORECASE,
    )
    return cleaned.strip(" .")


def _extract_tasks(input_text: str) -> list[str]:
    normalized = re.sub(r"[\r\n]+", ". ", input_text)
    normalized = re.sub(
        r"\s+(?=(?:i\s+(?:have to|need to|should|must|want to|had to)))",
        ", ",
        normalized,
        flags=re.IGNORECASE,
    )
    normalized = re.sub(r"\b(and then|then|also|after that|next)\b", ",", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"\band\b(?=.*\b(?:study|project|meeting|gym|workout|cook|sleep|call|learn|practice)\b)", ",", normalized, flags=re.IGNORECASE)
    chunks = re.split(r"[,.!;]+", normalized)
    tasks = []
    for chunk in chunks:
        cleaned = _strip_leading_phrase(chunk)
        if cleaned:
            tasks.append(cleaned)
    return tasks or [input_text.strip()]


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
    cleaned = _strip_leading_phrase(task)
    cleaned = re.sub(r"\b(today|tomorrow|before thursday|before friday)\b", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" .")
    if not cleaned:
        cleaned = "Planned Task"
    return cleaned[:1].upper() + cleaned[1:]


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


def _build_schedule(tasks: list[str], plan_scope: str) -> list[AIPlannedRoutine]:
    planned_routines: list[AIPlannedRoutine] = []
    current_slot_by_date: dict[date, datetime] = {}
    occupied_slots_by_date: dict[date, list[tuple[datetime, datetime]]] = {}

    sorted_tasks = sorted(
        enumerate(tasks),
        key=lambda item: (
            _extract_target_date(item[1], plan_scope),
            0 if _is_anchored_task(item[1]) else 1,
            _priority_rank(item[1]),
            _guess_start_time(item[1], datetime.combine(date.today(), time(8, 0))),
        ),
    )

    for task_index, raw_task in sorted_tasks:
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
                title=_make_title(raw_task),
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

    planned_routines.sort(key=lambda routine: (routine.date, routine.start_time or time(23, 59)))
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
    api_key = os.getenv("OPENAI_API_KEY")
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    if not api_key:
        return generate_heuristic_plan(input_text, plan_scope)

    today = date.today().isoformat()
    system_prompt = """
    You are an expert AI productivity planner.

    Create a smart, realistic, time-blocked routine.

    Rules:
    - Understand all user tasks
    - Prioritize urgent and important tasks first
    - Arrange tasks logically
    - Start morning and end night
    - Include breaks and meals
    - Include gym, study, meetings, cooking, travel if mentioned
    - Include sleep if mentioned
    - Wake up early must be scheduled in the early morning, never around 9 AM
    - Sleep early must be scheduled at a realistic night time like 9:30 PM to 10:30 PM
    - Cooking should be placed near breakfast, lunch, or dinner
    - Gym should default to evening unless the user clearly prefers another time
    - Study and project work should be prioritized in the morning when possible
    - Meetings must respect the exact user-provided time
    - Avoid overlapping timings
    - Keep suggestions directly relevant to each task
    - Split combined user text into separate tasks instead of merging everything into one routine
    - Make routine practical and balanced

    Return valid JSON only with keys:
    summary
    productivity_tips
    routines

    Each routine must contain:
    title
    description
    date
    start_time
    end_time
    priority
    status
    estimated_time
    suggestion
    """

    user_prompt = f"""
    Today's date is {today}

    Create a {plan_scope} routine for:

    {input_text}
    """

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.3,
        "response_format": {"type": "json_object"},
    }

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            raw_content = response.json()["choices"][0]["message"]["content"]
            parsed = json.loads(raw_content)
            return AIGenerationResponse.model_validate(parsed)
    except Exception:
        return generate_heuristic_plan(input_text, plan_scope)


def generate_workspace_ai_tasks(
    prompt: str,
    project_name: str = "Team Space",
    assignee: str | None = None,
) -> list[WorkspaceAIGeneratedTask]:
    prompt_clean = re.sub(r"\s+", " ", prompt.strip())
    subject = re.sub(r"^(build|create|make|design|develop|fix|implement)\s+", "", prompt_clean, flags=re.IGNORECASE).strip()
    subject = subject or prompt_clean

    def normalize_generated_items(items: list[dict]) -> list[WorkspaceAIGeneratedTask]:
        normalized_items: list[WorkspaceAIGeneratedTask] = []
        for index, item in enumerate(items[:5], start=1):
            title = str(item.get("title") or item.get("task") or "").strip()
            if not title:
                continue
            priority = str(item.get("priority") or "Medium").strip().capitalize()
            if priority not in {"Low", "Medium", "High", "Urgent"}:
                priority = "Medium"
            description = str(item.get("description") or item.get("details") or f"Complete {title.lower()} for {subject}.").strip()
            normalized_items.append(
                WorkspaceAIGeneratedTask(
                    title=title[:120],
                    description=description[:500],
                    assignee=assignee or "Unassigned",
                    priority=priority,
                    status="Todo",
                    due_date=date.today() + timedelta(days=index),
                    progress=0,
                    project_name=project_name,
                )
            )
        return normalized_items

    def generate_with_openai() -> list[WorkspaceAIGeneratedTask]:
        api_key = os.getenv("OPENAI_API_KEY")
        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        if not api_key:
            return []

        payload = {
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a senior corporate project manager. Convert the user prompt into 2 to 5 realistic, "
                        "specific, actionable workspace tasks. Avoid generic Plan/Build/Review patterns unless they "
                        "are genuinely appropriate. Return JSON only: {\"tasks\":[{\"title\":\"...\","
                        "\"description\":\"...\",\"priority\":\"Low|Medium|High|Urgent\"}]}"
                    ),
                },
                {"role": "user", "content": prompt_clean},
            ],
            "temperature": 0.65,
            "response_format": {"type": "json_object"},
        }
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
                response.raise_for_status()
                content = response.json()["choices"][0]["message"]["content"]
                parsed = json.loads(content)
            return normalize_generated_items(parsed.get("tasks", []))
        except Exception:
            return []

    openai_tasks = generate_with_openai()
    if openai_tasks:
        return openai_tasks

    stage_templates = {
        "learning": [
            ("Map learning outcomes", "Define the core skills, resources, and measurable outcomes for the learning goal."),
            ("Complete fundamentals practice", "Work through the essential concepts with short notes and examples."),
            ("Build hands-on exercises", "Create small practice programs or exercises to turn concepts into skill."),
            ("Apply learning in a mini project", "Use the new skill in a realistic project that can be reviewed or demonstrated."),
        ],
        "website": [
            ("Define website scope and sitemap", "Clarify pages, user journeys, content needs, and success criteria."),
            ("Design responsive UI screens", "Create the visual layout, spacing, components, and mobile/tablet behavior."),
            ("Develop frontend pages", "Build the website pages with reusable components and polished states."),
            ("Connect backend and forms", "Wire APIs, validations, submissions, and data flows where needed."),
            ("Test and deploy website", "Run browser checks, fix issues, and publish the site with final smoke testing."),
        ],
        "office": [
            ("Capture business requirements", "Document stakeholders, objectives, constraints, and expected deliverables."),
            ("Prepare project documentation", "Create the working notes, timeline, ownership, and approval checklist."),
            ("Execute assigned deliverables", "Complete the development or operational work according to priority."),
            ("Review progress with team", "Share status, collect feedback, resolve blockers, and align next steps."),
            ("Finalize handoff package", "Prepare final files, summary, and delivery notes for stakeholders."),
        ],
        "frontend": [
            ("Plan frontend screens", "Outline page structure, user flow, and responsive sections."),
            ("Implement frontend UI", "Build the interface and reusable visual components."),
            ("Polish frontend states", "Refine empty states, loading states, and validation feedback."),
        ],
        "backend": [
            ("Design backend APIs", "Define the required endpoints, payloads, and validation rules."),
            ("Implement backend logic", "Build route handlers, services, and persistence logic."),
            ("Verify backend flows", "Test API responses, edge cases, and failure handling."),
        ],
        "testing": [
            ("Prepare test scenarios", "List core user flows, edge cases, and expected results."),
            ("Run functional testing", "Validate the main workflow across frontend and backend."),
            ("Fix QA findings", "Resolve bugs or regressions found during testing."),
        ],
        "deployment": [
            ("Prepare deployment config", "Set environment values, secrets, and deployment settings."),
            ("Deploy application", "Release the latest build to the target environment."),
            ("Run post-deploy checks", "Confirm health, logs, and smoke-test key workflows."),
        ],
        "database": [
            ("Design database schema", "Define tables, relations, and indexes needed for the feature."),
            ("Implement database changes", "Create migrations or schema updates and connect them to the app."),
        ],
        "api": [
            ("Define API contract", "Document the request and response format before implementation."),
            ("Integrate API endpoints", "Connect the client workflow to the required API calls."),
        ],
        "ui": [
            ("Design UI flow", "Plan layout, spacing, and user interaction states."),
            ("Build UI components", "Create the required interface elements and interactions."),
        ],
        "docs": [
            ("Write implementation notes", "Document setup steps, assumptions, and usage details."),
            ("Clean up project documentation", "Update README or handoff notes for the latest flow."),
        ],
        "bug": [
            ("Investigate bug cause", "Trace the root cause and affected workflows."),
            ("Implement bug fix", "Apply the fix and verify the broken path is resolved."),
        ],
    }

    priority_keywords = {
        "High": {"urgent", "important", "deadline", "backend", "bug", "bugfix", "critical", "fix", "production", "api"},
        "Medium": {"development", "develop", "ui", "frontend", "integration", "testing", "test", "feature", "build"},
        "Low": {"documentation", "docs", "cleanup", "optional", "refactor", "polish"},
    }

    def infer_priority(text: str) -> str:
        lowered = text.lower()
        for priority, keywords in priority_keywords.items():
            if any(keyword in lowered for keyword in keywords):
                return priority
        return "Medium"

    def normalize_clause(text: str) -> str:
        return re.sub(r"\s+", " ", text.strip(" .,-")).strip()

    def split_prompt_into_workstreams(text: str) -> list[str]:
        prepared = re.sub(r"\b(with|including|covering|plus|then)\b", ",", text, flags=re.IGNORECASE)
        raw_parts = [
            normalize_clause(part)
            for part in re.split(r",|;|\n|\band\b|&", prepared, flags=re.IGNORECASE)
        ]
        parts = [part for part in raw_parts if part]
        if len(parts) > 1:
            return parts
        return [normalize_clause(text)]

    def classify_workstream(text: str) -> str | None:
        lowered = text.lower()
        if any(word in lowered for word in ("learn", "study", "course", "python", "java", "skill", "training")):
            return "learning"
        if any(word in lowered for word in ("website", "landing page", "web app", "site")):
            return "website"
        if any(word in lowered for word in ("office", "client", "corporate", "stakeholder", "delivery", "documentation")):
            return "office"
        for key in stage_templates:
            if key in lowered:
                return key
        if "doc" in lowered:
            return "docs"
        if "deploy" in lowered or "release" in lowered:
            return "deployment"
        if "qa" in lowered:
            return "testing"
        return None

    def build_generic_breakdown(text: str) -> list[tuple[str, str]]:
        noun_phrase = re.sub(r"^(build|create|make|design|develop|implement|fix)\s+", "", text, flags=re.IGNORECASE).strip()
        noun_phrase = noun_phrase or text or subject
        noun_phrase = noun_phrase[0].upper() + noun_phrase[1:]
        lowered = text.lower()
        if any(word in lowered for word in ("learn", "study", "understand", "practice")):
            return [
                (f"Identify learning path for {noun_phrase}", f"Break {text} into fundamentals, practice areas, and outcome goals."),
                (f"Practice core concepts of {noun_phrase}", f"Complete focused exercises and examples for the most important concepts."),
                (f"Create a practical {noun_phrase} project", f"Apply the learning in a small real-world deliverable."),
            ]
        if any(word in lowered for word in ("launch", "release", "publish")):
            return [
                (f"Confirm launch requirements for {noun_phrase}", f"Validate scope, owners, risks, and readiness criteria for {text}."),
                (f"Prepare launch assets for {noun_phrase}", f"Finalize build, content, configuration, and stakeholder approvals."),
                (f"Run launch validation for {noun_phrase}", f"Test the release path, fix blockers, and confirm post-launch checks."),
            ]
        return [
            (f"Clarify requirements for {noun_phrase}", f"Define expected outcome, dependencies, risks, and acceptance criteria for {text}."),
            (f"Execute core work for {noun_phrase}", f"Complete the main practical deliverables required for {text}."),
            (f"Validate and hand off {noun_phrase}", f"Check quality, document decisions, and prepare the final handoff for {text}."),
        ]

    workstreams = split_prompt_into_workstreams(subject)
    seen_titles: set[str] = set()
    task_items: list[WorkspaceAIGeneratedTask] = []
    current_day_offset = 1

    for stream in workstreams:
        stream_type = classify_workstream(stream)
        templates = stage_templates.get(stream_type, build_generic_breakdown(stream))
        if len(workstreams) == 1 and stream_type in {"frontend", "backend", "testing", "deployment"}:
            templates = templates[:2]

        for title, description in templates:
            unique_title = title
            if unique_title.lower() in seen_titles:
                unique_title = f"{title} for {stream[:40]}"
            seen_titles.add(unique_title.lower())

            priority = infer_priority(f"{stream} {title} {description}")
            if priority == "High":
                due_date = date.today() + timedelta(days=current_day_offset)
            elif priority == "Medium":
                due_date = date.today() + timedelta(days=current_day_offset + 1)
            else:
                due_date = date.today() + timedelta(days=current_day_offset + 2)

            task_items.append(
                WorkspaceAIGeneratedTask(
                    title=unique_title,
                    description=description.replace("the feature", stream).replace("the main workflow", stream),
                    assignee=assignee or "Unassigned",
                    priority=priority,
                    status="Todo",
                    due_date=due_date,
                    progress=0,
                    project_name=project_name,
                )
            )
            current_day_offset += 1

    if not task_items:
        fallback = build_generic_breakdown(subject)
        for index, (title, description) in enumerate(fallback, start=1):
            task_items.append(
                WorkspaceAIGeneratedTask(
                    title=title,
                    description=description,
                    assignee=assignee or "Unassigned",
                    priority=infer_priority(title),
                    status="Todo",
                    due_date=date.today() + timedelta(days=index),
                    progress=0,
                    project_name=project_name,
                )
            )

    return task_items[:5]
