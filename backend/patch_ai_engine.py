import sys
import re

def patch():
    with open('app/ai_engine.py', 'r') as f:
        content = f.read()

    # Find the start of _optimize_schedule
    match_start = re.search(r'def _optimize_schedule\(.*?\n.*?return results, flexible_tasks, explanation_points, is_overloaded, total_task_minutes, available_minutes\n', content, re.DOTALL)
    if not match_start:
        print("Could not find _optimize_schedule")
        return

    # We also need to update the callers:
    # generate_heuristic_plan
    # analyze_ai_plan
    # generate_ai_plan

    new_opt_schedule = '''def _optimize_schedule(ai_tasks: list[dict], plan_scope: str, start_after: datetime | None = None, personality: str = "Balanced", travel_overrides: dict[int, str] | None = None) -> tuple[list[AIPlannedRoutine], list[dict], list[str], bool, int, int, list[str]]:
    valid_tasks = [t for t in ai_tasks if t.get("confidence", 1.0) >= 0.5]
    if not valid_tasks:
        return [], [], [], False, 0, 0, []

    today_date = start_after.date() if start_after else date.today()
    base_time = start_after if start_after else datetime.combine(today_date, time(8, 0))

    # ── Reality Validation Defaults ──────────────────────────────────────────
    SLEEP_START = time(23, 0)   # 11 PM
    SLEEP_END   = time(7, 0)    # 7 AM
    EXERCISE_LIMIT = time(22, 0) # 10 PM
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

    # Sort flexible tasks strictly by priority_score descending
    flexible_tasks.sort(key=lambda x: x.get("_priority_score", 0), reverse=True)

    if flexible_tasks:
        top_task = flexible_tasks[0].get("title", "Task")
        explanation_reasons.append(f"Prioritized {top_task} based on deadline proximity and importance.")

    # ── Stage 2: Reality Validation Engine ───────────────────────────────────
    # Workload Protection
    total_task_minutes = sum(t.get("estimated_duration", 60) for t in valid_tasks if not t.get("is_internal_logistic"))
    available_minutes = int((end_of_day - base_time).total_seconds() / 60)
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

    def find_free_slot(search_start: datetime, duration_mins: int, energy_req: str = "Medium", requires_business_hours: bool = False, is_exercise: bool = False) -> datetime | None:
        candidate = search_start
        step = timedelta(minutes=15)
        remainder = candidate.minute % 15
        if remainder != 0:
            candidate += timedelta(minutes=(15 - remainder))

        while candidate + timedelta(minutes=duration_mins) <= end_of_day:
            if is_slot_free(candidate, duration_mins):
                end_time_check = candidate + timedelta(minutes=duration_mins)
                
                # Business hours validation
                if requires_business_hours:
                    if candidate.time() < time(10, 0) or end_time_check.time() > time(21, 0):
                        candidate += step
                        continue
                
                # Exercise limit validation
                if is_exercise:
                    if candidate.time() >= EXERCISE_LIMIT:
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
            start_dt = find_free_slot(base_time, duration, "High") or base_time

        s, e = add_slot(start_dt, duration)

        # Commute buffer
        if t.get("requires_travel"):
            task_idx = valid_tasks.index(t) if t in valid_tasks else -1
            travel_tier = travel_overrides.get(f"travel_{task_idx}", t.get("travel_tier", "moderate")) if travel_overrides else t.get("travel_tier", "moderate")
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
            recovery_slot = find_free_slot(current_search, recovery_dur)
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

        slot = find_free_slot(current_search, duration, energy, req_business, is_exercise)

        if not slot:
            shrinked_duration = max(30, duration // 2)
            slot = find_free_slot(current_search, shrinked_duration, energy, req_business, is_exercise)
            if slot:
                duration = shrinked_duration
            else:
                slot = occupied_slots[-1][1] if occupied_slots else current_search

        s, e = add_slot(slot, duration)
        _update_energy_counter(energy, duration)

        # Travel Buffer
        if t.get("requires_travel"):
            travel_tier = t.get("travel_tier", "moderate")
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
'''
    
    content = content.replace(match_start.group(0), new_opt_schedule + '\n')
    
    # Now update callers
    content = content.replace('planned_routines, _, explanation_pts, is_over, total_mins, avail_mins = _optimize_schedule(ai_tasks, plan_scope, start_after, "Balanced")',
                              'planned_routines, _, explanation_pts, is_over, total_mins, avail_mins, val_warns = _optimize_schedule(ai_tasks, plan_scope, start_after, "Balanced")')
    
    content = content.replace('planned_routines, flex_tasks, explanation_pts, is_over, total_mins, avail_mins = _optimize_schedule(groq_tasks, plan_scope, start_after, personality)',
                              'planned_routines, flex_tasks, explanation_pts, is_over, total_mins, avail_mins, val_warns = _optimize_schedule(groq_tasks, plan_scope, start_after, personality)')
    
    content = content.replace('planned_routines, flex_tasks, explanation_pts, is_over, total_mins, avail_mins = _optimize_schedule(groq_tasks, plan_scope, start_after, personality, travel_overrides=travel_overrides or None)',
                              'planned_routines, flex_tasks, explanation_pts, is_over, total_mins, avail_mins, val_warns = _optimize_schedule(groq_tasks, plan_scope, start_after, personality, travel_overrides=travel_overrides or None)')
                              
    # Update AIGenerationResponse to include validation_warnings
    content = content.replace('is_overloaded=is_over,\n        overload_message=f"This plan requires {total_mins} minutes but only {avail_mins} are available." if is_over else None,\n    )',
                              'is_overloaded=is_over,\n        overload_message=f"This plan requires {total_mins} minutes but only {avail_mins} are available." if is_over else None,\n        validation_warnings=val_warns,\n    )')

    with open('app/ai_engine.py', 'w') as f:
        f.write(content)
    print("Patch applied successfully.")

if __name__ == "__main__":
    patch()
