const API_BASE = "http://127.0.0.1:8000";
const token = localStorage.getItem("arc_token");
const user = JSON.parse(localStorage.getItem("arc_user") || "null");

if (!token) {
    window.location.href = "index.html";
}

const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
});

const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const todayDate = getLocalDateString();
const getWeekWindowEnd = () => {
    const weekEndDate = new Date();
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    return getLocalDateString(weekEndDate);
};

const buildWeeklyOverview = (routines) => {
    const startDate = todayDate;
    const endDate = getWeekWindowEnd();
    const groupedCounts = new Map();

    dedupeRoutines(routines)
        .filter((routine) => routine.date >= startDate && routine.date <= endDate)
        .forEach((routine) => {
            groupedCounts.set(routine.date, (groupedCounts.get(routine.date) || 0) + 1);
        });

    return Array.from(groupedCounts.entries())
        .sort((first, second) => first[0].localeCompare(second[0]))
        .map(([date, count]) => ({ date, count }));
};

const dashboardState = {
    routines: [],
    weeklyRoutines: [],
    activeStatFilter: "all",
    stats: {
        total_routines: 0,
        completed_routines: 0,
        pending_routines: 0,
        today_routines: 0,
        productivity_score: 0,
        weekly_overview: [],
    },
};
const messageTimers = new Map();
let plannerBreakdownTimer = null;
let latestPlannerPreviewRoutines = JSON.parse(sessionStorage.getItem("arc_latest_planner_preview") || "[]");

const currentUserName = document.getElementById("currentUserName");
const pageEyebrow = document.getElementById("pageEyebrow");
const pageTitle = document.getElementById("pageTitle");
const pageViews = Array.from(document.querySelectorAll("[data-view]"));
const viewLinks = Array.from(document.querySelectorAll("[data-view-link]"));

if (currentUserName && user) {
    currentUserName.textContent = user.name;
}

document.getElementById("date").value = todayDate;

const setMessage = (elementId, message, type = "success") => {
    const target = document.getElementById(elementId);
    if (!target) return;
    target.textContent = message;
    target.className = `form-message ${type === "success" ? "success-text" : "error-text"}`;
    window.clearTimeout(messageTimers.get(elementId));
    if (message) {
        const timer = window.setTimeout(() => {
            target.textContent = "";
            target.className = "form-message";
        }, 2600);
        messageTimers.set(elementId, timer);
    }
};

const normalizeApiError = (detail) => {
    if (!detail) return "Request failed.";
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
        return detail
            .map((item) => {
                if (typeof item === "string") return item;
                if (item?.msg) return item.msg;
                return JSON.stringify(item);
            })
            .join(", ");
    }
    if (typeof detail === "object") {
        if (detail.msg) return detail.msg;
        return JSON.stringify(detail);
    }
    return String(detail);
};

const formatTime = (timeValue) => {
    if (!timeValue) return "Flexible";
    const [hours, minutes] = timeValue.split(":");
    const date = new Date();
    date.setHours(Number(hours), Number(minutes));
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const renderEmptyState = (container, message) => {
    container.innerHTML = `<div class="empty-state">${message}</div>`;
};

const fetchJson = async (url, options = {}) => {
    const response = await fetch(url, options);
    const rawText = await response.text();
    let data = null;
    if (rawText) {
        try {
            data = JSON.parse(rawText);
        } catch {
            data = { detail: rawText };
        }
    }

    if (!response.ok) {
        throw new Error(normalizeApiError(data?.detail));
    }

    return data;
};

const calculateStats = (routines) => {
    const totalRoutines = routines.length;
    const completedRoutines = routines.filter((routine) => routine.status === "Completed").length;
    const todayRoutines = routines.filter((routine) => routine.date === todayDate).length;

    dashboardState.stats = {
        ...dashboardState.stats,
        total_routines: totalRoutines,
        completed_routines: completedRoutines,
        pending_routines: totalRoutines - completedRoutines,
        today_routines: todayRoutines,
        productivity_score: totalRoutines ? Math.round((completedRoutines / totalRoutines) * 100) : 0,
        weekly_overview: buildWeeklyOverview(routines),
    };
};

const dedupeRoutines = (routines) => {
    const uniqueMap = new Map();
    routines.forEach((routine) => {
        const key = [
            routine.title ?? "",
            routine.date ?? "",
            routine.start_time ?? "",
            routine.end_time ?? "",
            routine.status ?? "",
        ].join("|");
        if (!uniqueMap.has(key)) {
            uniqueMap.set(key, routine);
        }
    });
    return Array.from(uniqueMap.values());
};

const getTomorrowDateString = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return getLocalDateString(tomorrow);
};

const matchesDatePreset = (routineDate, preset) => {
    if (preset === "all") return true;
    if (preset === "today") return routineDate === todayDate;
    if (preset === "tomorrow") return routineDate === getTomorrowDateString();
    if (preset === "week") {
        const weekEndDate = new Date();
        weekEndDate.setDate(weekEndDate.getDate() + 6);
        return routineDate >= todayDate && routineDate <= getLocalDateString(weekEndDate);
    }
    return true;
};

const applyRoutineFilters = (routines) => {
    const statusFilter = document.getElementById("routineStatusFilter")?.value || "all";
    const datePreset = document.getElementById("routineDatePreset")?.value || "all";
    const exactDate = document.getElementById("routineDateFilter")?.value || "";
    const statFilter = dashboardState.activeStatFilter;

    return routines.filter((routine) => {
        const statusMatch = statusFilter === "all" || routine.status.toLowerCase() === statusFilter;
        const presetMatch = matchesDatePreset(routine.date, datePreset);
        const exactMatch = !exactDate || routine.date === exactDate;
        const statMatch =
            statFilter === "all" ||
            (statFilter === "pending" && routine.status === "Pending") ||
            (statFilter === "completed" && routine.status === "Completed") ||
            (statFilter === "today" && routine.date === todayDate);
        return statusMatch && presetMatch && exactMatch && statMatch;
    });
};

const applyWeeklyFilters = (routines) => {
    const datePreset = document.getElementById("weeklyDatePreset")?.value || "week";
    const exactDate = document.getElementById("weeklyDateFilter")?.value || "";
    return routines.filter((routine) => matchesDatePreset(routine.date, datePreset) && (!exactDate || routine.date === exactDate));
};

const resetRoutineForm = () => {
    document.getElementById("routineForm").reset();
    document.getElementById("routineId").value = "";
    document.getElementById("date").value = todayDate;
    document.getElementById("estimatedTime").value = 60;
    document.getElementById("priority").value = "Medium";
    document.getElementById("status").value = "Pending";
    document.getElementById("startTime").value = "";
    document.getElementById("endTime").value = "";
    document.getElementById("suggestion").value = "";
};

const buildManualSuggestion = (title, description = "", priority = "Medium") => {
    const text = `${title} ${description}`.toLowerCase();
    if (!title.trim()) return "";
    if (text.includes("meeting")) return "Block prep time before the meeting and keep key points ready so the session starts smoothly.";
    if (text.includes("study") || text.includes("learn")) return "Treat this like a deep-focus session and keep your notes or practice material ready before you begin.";
    if (text.includes("project")) return "Break this into one clear milestone so you finish meaningful progress instead of scattered partial work.";
    if (text.includes("gym") || text.includes("workout")) return "Keep your clothes, water, and workout plan ready so starting feels automatic after your main work is done.";
    if (text.includes("cook") || text.includes("meal") || text.includes("dinner") || text.includes("lunch")) return "Do quick prep in advance so cooking stays easy and close to the meal time you want.";
    if (text.includes("sleep")) return "Start a lighter wind-down routine before this so the planned sleep time actually feels realistic.";
    if (priority === "High") return "Protect this with a distraction-free block and finish the most important part first.";
    return "Give this a clear start time and a simple next step so it is easier to follow through consistently.";
};

const setActiveView = (viewName) => {
    const viewConfig = {
        overview: {
            eyebrow: "Overview",
            title: "Track your routine progress at a glance",
        },
        planner: {
            eyebrow: "Planner",
            title: "Create AI and manual plans in one place",
        },
        routines: {
            eyebrow: "Routines",
            title: "Review and manage every saved routine",
        },
        weekly: {
            eyebrow: "Weekly View",
            title: "Focus on the upcoming week separately from today",
        },
    };

    const safeView = viewConfig[viewName] ? viewName : "overview";
    const config = viewConfig[safeView];

    pageViews.forEach((section) => {
        section.hidden = section.dataset.view !== safeView;
    });

    viewLinks.forEach((link) => {
        link.classList.toggle("active", link.dataset.viewLink === safeView);
    });

    pageEyebrow.textContent = config.eyebrow;
    pageTitle.textContent = config.title;
};

const syncViewFromHash = () => {
    const hash = window.location.hash.replace("#", "");
    setActiveView(hash || "overview");
};

const fillRoutineForm = (routine) => {
    const normalizeTimeInput = (timeValue) => {
        if (!timeValue) return "";
        return timeValue.replace(/\s?(AM|PM)$/i, "").slice(0, 5);
    };

    document.getElementById("routineId").value = routine.id ?? "";
    document.getElementById("title").value = routine.title ?? "";
    document.getElementById("description").value = routine.description ?? "";
    document.getElementById("date").value = routine.date ?? todayDate;
    document.getElementById("startTime").value = normalizeTimeInput(routine.start_time);
    document.getElementById("endTime").value = normalizeTimeInput(routine.end_time);
    document.getElementById("priority").value = routine.priority ?? "Medium";
    document.getElementById("status").value = routine.status ?? "Pending";
    document.getElementById("estimatedTime").value = routine.estimated_time ?? 60;
    document.getElementById("suggestion").value = routine.suggestion ?? "";
    window.location.hash = "planner";
    setMessage("routineMessage", `Editing "${routine.title}"`);
    window.scrollTo({ top: 0, behavior: "smooth" });
};

const upsertRoutineInState = (routine) => {
    const existingIndex = dashboardState.routines.findIndex((item) => item.id === routine.id);
    if (existingIndex >= 0) {
        dashboardState.routines[existingIndex] = routine;
    } else {
        dashboardState.routines.push(routine);
    }

    dashboardState.routines.sort((a, b) => {
        const first = `${a.date} ${a.start_time || "23:59"}`;
        const second = `${b.date} ${b.start_time || "23:59"}`;
        return first.localeCompare(second);
    });

    dashboardState.weeklyRoutines = dashboardState.routines.filter(
        (item) => item.date >= todayDate && item.date <= getWeekWindowEnd()
    );
    calculateStats(dashboardState.routines);
};

const removeRoutineFromState = (routineId) => {
    dashboardState.routines = dashboardState.routines.filter((routine) => routine.id !== routineId);
    dashboardState.weeklyRoutines = dashboardState.weeklyRoutines.filter((routine) => routine.id !== routineId);
    calculateStats(dashboardState.routines);
};

const createRoutineCard = (routine) => {
    const wrapper = document.createElement("article");
    wrapper.className = "routine-item";
    wrapper.innerHTML = `
        <div>
            <strong>${routine.title}</strong>
            <div class="routine-meta">
                <span class="tag ${routine.priority.toLowerCase()}">${routine.priority}</span>
                <span class="tag ${routine.status.toLowerCase()}">${routine.status}</span>
                <span class="tag">${routine.date}</span>
                <span class="tag">${formatTime(routine.start_time)} - ${formatTime(routine.end_time)}</span>
                <span class="tag">${routine.estimated_time} mins</span>
            </div>
        </div>
        <div>${routine.description || "No description added."}</div>
        <div>${routine.suggestion || "No suggestion available."}</div>
        <div class="routine-actions">
            <button type="button" class="ghost-button edit-routine">Edit</button>
            ${routine.status === "Completed" ? '<div class="completed-badge"><span>✓</span><span>Completed Task</span></div>' : '<button type="button" class="secondary-button toggle-status">Mark Complete</button>'}
            <button type="button" class="ghost-button delete-routine">Delete</button>
        </div>
    `;

    wrapper.querySelector(".edit-routine").addEventListener("click", () => fillRoutineForm(routine));

    const toggleStatusButton = wrapper.querySelector(".toggle-status");
    if (toggleStatusButton) {
        toggleStatusButton.addEventListener("click", async () => {
            try {
                const updatedRoutine = await fetchJson(`${API_BASE}/routines/${routine.id}`, {
                    method: "PUT",
                    headers: authHeaders(),
                    body: JSON.stringify({
                        status: "Completed",
                    }),
                });
                upsertRoutineInState(updatedRoutine);
                renderDashboardState();
                setMessage("routineMessage", "Routine marked as completed.");
            } catch (error) {
                setMessage("routineMessage", error.message, "error");
            }
        });
    }

    wrapper.querySelector(".delete-routine").addEventListener("click", async () => {
        try {
            await fetchJson(`${API_BASE}/routines/${routine.id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            removeRoutineFromState(routine.id);
            renderDashboardState();
            setMessage("routineMessage", "Routine deleted.");
        } catch (error) {
            setMessage("routineMessage", error.message, "error");
        }
    });

    return wrapper;
};

const renderRoutines = (routines, weeklyRoutines) => {
    const routineContainer = document.getElementById("routineList");
    const weeklyContainer = document.getElementById("weeklyRoutineList");
    const routineSectionHeading = document.getElementById("routineSectionHeading");
    const routineSectionNote = document.getElementById("routineSectionNote");
    const filteredRoutines = applyRoutineFilters(dedupeRoutines(routines));
    const filteredWeeklyRoutines = applyWeeklyFilters(dedupeRoutines(weeklyRoutines));
    const headingMap = {
        all: "All saved routines",
        completed: "Completed tasks",
        pending: "Pending tasks",
        today: "Today's tasks",
    };

    routineContainer.innerHTML = "";
    weeklyContainer.innerHTML = "";

    if (routineSectionHeading) {
        routineSectionHeading.textContent = headingMap[dashboardState.activeStatFilter] || "Filtered routines";
    }
    if (routineSectionNote) {
        routineSectionNote.textContent =
            dashboardState.activeStatFilter === "all"
                ? "Use filters to explore today, tomorrow, completed, pending, or a specific date."
                : "Showing routines based on the overview card you selected. You can refine them with the filters below.";
    }

    if (!filteredRoutines.length) {
        renderEmptyState(routineContainer, "No routines saved yet.");
    } else {
        filteredRoutines.forEach((routine) => routineContainer.appendChild(createRoutineCard(routine)));
    }

    if (!filteredWeeklyRoutines.length) {
        renderEmptyState(weeklyContainer, "No upcoming routines scheduled for this week.");
    } else {
        filteredWeeklyRoutines.forEach((routine) => weeklyContainer.appendChild(createRoutineCard(routine)));
    }
};

const renderOverview = () => {
    const overviewTodayList = document.getElementById("overviewTodayList");
    const weeklyOverviewSummary = document.getElementById("weeklyOverviewSummary");
    const todayRoutines = dashboardState.routines.filter((routine) => routine.date === todayDate);

    overviewTodayList.innerHTML = "";
    weeklyOverviewSummary.innerHTML = "";

    if (!todayRoutines.length) {
        renderEmptyState(overviewTodayList, "No routines lined up for today yet.");
    } else {
        todayRoutines.forEach((routine) => {
            const item = document.createElement("div");
            item.className = "overview-note";
            item.innerHTML = `
                <h4>${routine.title}</h4>
                <div class="routine-meta">
                    <span class="tag ${routine.priority.toLowerCase()}">${routine.priority}</span>
                    <span class="tag time-badge">${formatTime(routine.start_time)} - ${formatTime(routine.end_time)}</span>
                </div>
                <div>${routine.suggestion || "Stay consistent and give this task a clean focus block."}</div>
            `;
            overviewTodayList.appendChild(item);
        });
    }

    if (!dashboardState.stats.weekly_overview?.length) {
        renderEmptyState(weeklyOverviewSummary, "Your weekly overview will appear here as soon as routines are planned.");
    } else {
        dashboardState.stats.weekly_overview.forEach((day) => {
            const item = document.createElement("div");
            item.className = "overview-note";
            item.innerHTML = `
                <h4>${day.date}</h4>
                <div>${day.count} task${day.count === 1 ? "" : "s"} planned</div>
            `;
            weeklyOverviewSummary.appendChild(item);
        });
    }
};

const renderPlannerBreakdown = (routines = [], { remember = true } = {}) => {
    const breakdownContainer = document.getElementById("plannerBreakdown");
    if (!breakdownContainer) return;
    window.clearTimeout(plannerBreakdownTimer);
    breakdownContainer.innerHTML = "";
    const sortedRoutines = Array.isArray(routines)
        ? [...routines].sort((first, second) => {
            const firstDate = first.date || "";
            const secondDate = second.date || "";
            if (firstDate !== secondDate) return firstDate.localeCompare(secondDate);
            const firstTime = first.start_time || "23:59";
            const secondTime = second.start_time || "23:59";
            return firstTime.localeCompare(secondTime);
        })
        : [];

    if (remember) {
        latestPlannerPreviewRoutines = sortedRoutines;
        sessionStorage.setItem("arc_latest_planner_preview", JSON.stringify(latestPlannerPreviewRoutines));
    }

    if (!sortedRoutines.length) {
        breakdownContainer.classList.remove("has-generated-routines");
        breakdownContainer.innerHTML = `<div class="generated-placeholder">Generated tasks will appear here.</div>`;
        return;
    }

    breakdownContainer.classList.add("has-generated-routines");

    sortedRoutines.forEach((routine) => {
        const card = document.createElement("div");
        card.className = "breakdown-card";
        card.innerHTML = `
            <h4>${routine.title}</h4>
            <div class="routine-meta">
                <span class="tag ${routine.priority.toLowerCase()}">${routine.priority}</span>
                <span class="tag ${routine.status === "Completed" ? "completed" : "pending"}">${routine.status || "Pending"}</span>
                <span class="tag info">${routine.date}</span>
                <span class="tag time-badge">${formatTime(routine.start_time)} - ${formatTime(routine.end_time)}</span>
            </div>
            <div>${routine.suggestion || "Planned with a practical time block."}</div>
        `;
        breakdownContainer.appendChild(card);
    });
    breakdownContainer.hidden = false;

};

const saveGeneratedRoutines = async (routines = []) => {
    const savedRoutines = [];
    for (const routine of routines) {
        const savedRoutine = await fetchJson(`${API_BASE}/routines`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({
                title: routine.title,
                description: routine.description || null,
                date: routine.date,
                start_time: routine.start_time || null,
                end_time: routine.end_time || null,
                priority: routine.priority || "Medium",
                status: routine.status || "Pending",
                estimated_time: routine.estimated_time || 60,
                suggestion: routine.suggestion || null,
            }),
        });
        savedRoutines.push(savedRoutine);
        upsertRoutineInState(savedRoutine);
    }
    calculateStats(dashboardState.routines);
    renderDashboardState();
    return savedRoutines;
};

const renderStats = (stats) => {
    document.getElementById("totalRoutines").textContent = stats.total_routines;
    document.getElementById("completedRoutines").textContent = stats.completed_routines;
    document.getElementById("pendingRoutines").textContent = stats.pending_routines;
    document.getElementById("todayRoutines").textContent = stats.today_routines;
    document.getElementById("productivityScore").textContent = stats.productivity_score;
};

const renderDashboardState = () => {
        renderStats(dashboardState.stats);
    renderRoutines(dashboardState.routines, dashboardState.weeklyRoutines);
    renderOverview();
    const breakdownContainer = document.getElementById("plannerBreakdown");
    if (latestPlannerPreviewRoutines.length && !breakdownContainer?.classList.contains("has-generated-routines")) {
        renderPlannerBreakdown(latestPlannerPreviewRoutines, { remember: false });
    }
    document.querySelectorAll(".clickable-stat").forEach((card) => {
        card.classList.toggle("active", card.dataset.filterTarget === dashboardState.activeStatFilter);
    });
};

const loadDashboard = async ({ keepPlannerPreview = true, preserveScroll = false } = {}) => {
    const scrollPosition = preserveScroll ? { x: window.scrollX, y: window.scrollY } : null;
    try {
        const [stats, routines, weeklyRoutines] = await Promise.all([
            fetchJson(`${API_BASE}/dashboard/stats`, { headers: authHeaders() }),
            fetchJson(`${API_BASE}/routines`, { headers: authHeaders() }),
            fetchJson(`${API_BASE}/routines/weekly`, { headers: authHeaders() }),
        ]);
        dashboardState.stats = stats;
        dashboardState.routines = dedupeRoutines(routines);
        dashboardState.weeklyRoutines = dedupeRoutines(weeklyRoutines);
        calculateStats(dashboardState.routines);
        renderDashboardState();
        if (keepPlannerPreview && latestPlannerPreviewRoutines.length) {
            renderPlannerBreakdown(latestPlannerPreviewRoutines, { remember: false });
        }
        if (scrollPosition) {
            requestAnimationFrame(() => window.scrollTo(scrollPosition.x, scrollPosition.y));
        }
    } catch (error) {
        if (error.message.toLowerCase().includes("credentials")) {
            localStorage.clear();
            window.location.href = "index.html";
            return;
        }
        setMessage("routineMessage", error.message, "error");
    }
};

document.getElementById("routineForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const routineId = document.getElementById("routineId").value;
    const payload = {
        title: document.getElementById("title").value.trim(),
        description: document.getElementById("description").value.trim() || null,
        date: document.getElementById("date").value,
        start_time: (document.getElementById("startTime").value || "").replace(/\s?(AM|PM)$/i, "") || null,
        end_time: (document.getElementById("endTime").value || "").replace(/\s?(AM|PM)$/i, "") || null,
        priority: document.getElementById("priority").value,
        status: document.getElementById("status").value,
        estimated_time: Number(document.getElementById("estimatedTime").value),
        suggestion: document.getElementById("suggestion").value.trim() || buildManualSuggestion(
            document.getElementById("title").value.trim(),
            document.getElementById("description").value.trim(),
            document.getElementById("priority").value,
        ),
    };

    const url = routineId ? `${API_BASE}/routines/${routineId}` : `${API_BASE}/routines`;
    const method = routineId ? "PUT" : "POST";

    try {
        const savedRoutine = await fetchJson(url, {
            method,
            headers: authHeaders(),
            body: JSON.stringify(payload),
        });
        upsertRoutineInState(savedRoutine);
        renderDashboardState();
        setMessage("routineMessage", routineId ? "Routine updated." : "Routine created.");
        resetRoutineForm();
    } catch (error) {
        setMessage("routineMessage", error.message, "error");
    }
});

document.getElementById("resetRoutineForm").addEventListener("click", () => {
    resetRoutineForm();
    setMessage("routineMessage", "");
});

document.getElementById("aiPlannerForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    delete form.dataset.submittedByVoice;
    const tipsContainer = document.getElementById("aiSuggestions");
    const breakdownContainer = document.getElementById("plannerBreakdown");
    tipsContainer.innerHTML = "";
    latestPlannerPreviewRoutines = [];
    sessionStorage.removeItem("arc_latest_planner_preview");
    renderPlannerBreakdown([], { remember: false });
    window.clearTimeout(plannerBreakdownTimer);

    try {
        const result = await fetchJson(`${API_BASE}/generate-routine`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({
                input_text: document.getElementById("plannerInput").value.trim(),
                plan_scope: document.getElementById("plannerScope").value,
            }),
        });

        setMessage("plannerMessage", result.summary);
        const generatedRoutines = result.routines || [];
        renderPlannerBreakdown(generatedRoutines);
        tipsContainer.innerHTML = "";
        document.getElementById("plannerInput").value = "";
        if (generatedRoutines.length) {
            await saveGeneratedRoutines(generatedRoutines);
            renderPlannerBreakdown(generatedRoutines, { remember: false });
        }
    } catch (error) {
        setMessage("plannerMessage", error.message, "error");
    }
});

document.getElementById("logoutButton").addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "index.html";
});

document.querySelectorAll(".clickable-stat").forEach((card) => {
    card.addEventListener("click", () => {
        dashboardState.activeStatFilter = card.dataset.filterTarget || "all";
        window.location.hash = "routines";
        renderDashboardState();
    });
});

[
    "routineStatusFilter",
    "routineDatePreset",
    "routineDateFilter",
    "weeklyDatePreset",
    "weeklyDateFilter",
].forEach((elementId) => {
    const element = document.getElementById(elementId);
    if (element) {
        element.addEventListener("change", renderDashboardState);
    }
});

document.getElementById("clearRoutineFilters").addEventListener("click", () => {
    document.getElementById("routineStatusFilter").value = "all";
    document.getElementById("routineDatePreset").value = "all";
    document.getElementById("routineDateFilter").value = "";
    dashboardState.activeStatFilter = "all";
    renderDashboardState();
});

document.getElementById("clearWeeklyFilters").addEventListener("click", () => {
    document.getElementById("weeklyDatePreset").value = "week";
    document.getElementById("weeklyDateFilter").value = "";
    renderDashboardState();
});

window.addEventListener("hashchange", syncViewFromHash);

["title", "description", "priority"].forEach((fieldId) => {
    document.getElementById(fieldId).addEventListener("input", () => {
        const suggestionField = document.getElementById("suggestion");
        if (document.getElementById("routineId").value || suggestionField.value.trim()) {
            return;
        }
        suggestionField.value = buildManualSuggestion(
            document.getElementById("title").value.trim(),
            document.getElementById("description").value.trim(),
            document.getElementById("priority").value,
        );
    });
});

window.initializeVoiceInput("voiceButton", "plannerInput", "voiceSendButton", "voiceStatus");
resetRoutineForm();
syncViewFromHash();
if (latestPlannerPreviewRoutines.length) {
    renderPlannerBreakdown(latestPlannerPreviewRoutines, { remember: false });
}
loadDashboard();
