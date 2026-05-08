const resolveApiBase = () => {
    const configured = window.ARC_API_BASE || localStorage.getItem("arc_api_base");
    if (configured) return configured.replace(/\/$/, "");
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
        return "http://127.0.0.1:8000";
    }
    return "https://routine-creator.onrender.com";
};

const API_BASE = resolveApiBase();
const token = localStorage.getItem("arc_token");
const user = JSON.parse(localStorage.getItem("arc_user") || "null");
const frontendPath = (relativePath) => {
    const pathName = window.location.pathname.replace(/\\/g, "/");
    const rootPrefix = pathName.includes("/pages/") || pathName.includes("/auth/") ? "../" : "";
    return `${rootPrefix}${relativePath}`;
};
const clearSessionStorage = () => {
    const theme = localStorage.getItem("arc_theme");
    const apiBase = localStorage.getItem("arc_api_base");
    localStorage.clear();
    if (theme) localStorage.setItem("arc_theme", theme);
    if (apiBase) localStorage.setItem("arc_api_base", apiBase);
};

if (!token) {
    window.location.href = frontendPath("index.html");
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
    searchQuery: "",
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
let weeklyProgressChart = null;

const currentUserName = document.getElementById("currentUserName");
const currentUserAvatar = document.getElementById("currentUserAvatar");
const pageEyebrow = document.getElementById("pageEyebrow");
const pageTitle = document.getElementById("pageTitle");
const pageViews = Array.from(document.querySelectorAll("[data-view]"));
const viewLinks = Array.from(document.querySelectorAll("[data-view-link]"));

if (currentUserName && user) {
    currentUserName.textContent = user.name;
}

if (currentUserAvatar && user?.name) {
    currentUserAvatar.textContent = user.name.trim().charAt(0).toUpperCase();
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

const escapeHTML = (value = "") =>
    String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

const refreshIcons = () => {
    if (window.lucide?.createIcons) {
        window.lucide.createIcons();
    }
};

const normalizeRoutineText = (routine) =>
    `${routine.title || ""} ${routine.description || ""} ${routine.suggestion || ""}`.toLowerCase();

const matchesDashboardSearch = (routine) => {
    const query = dashboardState.searchQuery.trim().toLowerCase();
    if (!query) return true;
    return `${normalizeRoutineText(routine)} ${getRoutineCategory(routine).toLowerCase()} ${routine.priority || ""} ${routine.status || ""}`
        .toLowerCase()
        .includes(query);
};

const getRoutineCategory = (routine) => {
    const text = normalizeRoutineText(routine);
    if (/(gym|workout|health|walk|run|meditat|sleep|meal|cook|water|fitness)/.test(text)) return "Health";
    if (/(study|learn|course|read|python|practice|lesson|research|book)/.test(text)) return "Learning";
    if (/(meeting|client|project|work|email|report|launch|design|code|review)/.test(text)) return "Work";
    if (/(home|family|clean|errand|shop|personal|bill|call)/.test(text)) return "Personal";
    return "Focus";
};

const getRoutineCategoryIcon = (category) => ({
    Work: "briefcase-business",
    Health: "heart-pulse",
    Learning: "book-open-check",
    Personal: "home",
    Focus: "sparkles",
}[category] || "sparkles");

const formatTaskTimeRange = (routine) => {
    if (!routine.start_time && !routine.end_time) return "Flexible";
    if (routine.start_time && routine.end_time) return `${formatTime(routine.start_time)} - ${formatTime(routine.end_time)}`;
    return routine.start_time ? formatTime(routine.start_time) : formatTime(routine.end_time);
};

const getMinutesFromTime = (timeValue) => {
    if (!timeValue) return null;
    const [hours, minutes] = timeValue.split(":").map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
};

const getVisualRoutineStatus = (routine) => {
    if (routine.status === "Completed") return "Completed";
    if (routine.date !== todayDate) return "Pending";

    const startMinutes = getMinutesFromTime(routine.start_time);
    if (startMinutes === null) return "Pending";

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const estimatedEnd = startMinutes + Number(routine.estimated_time || 60);
    const endMinutes = getMinutesFromTime(routine.end_time) ?? estimatedEnd;

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes ? "In Progress" : "Pending";
};

const getWeekDates = () => {
    const monday = new Date();
    const dayOffset = (monday.getDay() + 6) % 7;
    monday.setDate(monday.getDate() - dayOffset);

    return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + index);
        return getLocalDateString(date);
    });
};

const formatDateLabel = (dateString, options) => {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString([], options);
};

const formatRelativeTime = (dateValue) => {
    if (!dateValue) return "Recently";
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "Recently";

    const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
    const ranges = [
        ["year", 31536000],
        ["month", 2592000],
        ["week", 604800],
        ["day", 86400],
        ["hour", 3600],
        ["minute", 60],
    ];
    const formatter = new Intl.RelativeTimeFormat([], { numeric: "auto" });
    for (const [unit, seconds] of ranges) {
        if (Math.abs(diffSeconds) >= seconds) {
            return formatter.format(Math.round(diffSeconds / seconds), unit);
        }
    }
    return "Just now";
};

const renderWeeklyProgressChart = (weekStats) => {
    const canvas = document.getElementById("weeklyProgressChart");
    const fallbackChart = document.getElementById("weeklyChart");
    if (!canvas || !fallbackChart) return;

    fallbackChart.innerHTML = "";

    if (window.Chart) {
        fallbackChart.hidden = true;
        const context = canvas.getContext("2d");
        if (weeklyProgressChart) {
            weeklyProgressChart.destroy();
        }
        weeklyProgressChart = new Chart(context, {
            type: "bar",
            data: {
                labels: weekStats.map((day) => formatDateLabel(day.date, { weekday: "short" })),
                datasets: [{
                    label: "Progress",
                    data: weekStats.map((day) => day.progress),
                    borderRadius: 12,
                    borderSkipped: false,
                    backgroundColor: (contextInfo) => {
                        const chart = contextInfo.chart;
                        const { ctx, chartArea } = chart;
                        if (!chartArea) return "#6366f1";
                        const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                        gradient.addColorStop(0, "#6366f1");
                        gradient.addColorStop(1, "#22c55e");
                        return gradient;
                    },
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (item) => `${item.raw}% complete`,
                        },
                    },
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: "#94a3b8", font: { weight: 700 } },
                    },
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: { color: "rgba(255,255,255,0.08)" },
                        ticks: {
                            color: "#94a3b8",
                            callback: (value) => `${value}%`,
                        },
                    },
                },
            },
        });
        return;
    }

    fallbackChart.hidden = false;
    weekStats.forEach((day) => {
        const bar = document.createElement("div");
        bar.className = "rc-chart-day";
        bar.style.setProperty("--bar-height", `${Math.max(day.progress, day.total ? 14 : 4)}%`);
        bar.innerHTML = `
            <div class="rc-chart-bar" title="${day.progress}% complete"></div>
            <span>${formatDateLabel(day.date, { weekday: "short" })}</span>
        `;
        fallbackChart.appendChild(bar);
    });
};

const renderEmptyState = (container, message) => {
    container.innerHTML = `<div class="empty-state">${message}</div>`;
};

const fetchJson = async (url, options = {}) => {
    let response;
    try {
        response = await fetch(url, options);
    } catch (error) {
        throw new Error(`Could not reach the backend API at ${API_BASE}. Please check the Render service and CORS settings.`);
    }
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
        const searchMatch = matchesDashboardSearch(routine);
        const statusMatch = statusFilter === "all" || routine.status.toLowerCase() === statusFilter;
        const presetMatch = matchesDatePreset(routine.date, datePreset);
        const exactMatch = !exactDate || routine.date === exactDate;
        const statMatch =
            statFilter === "all" ||
            (statFilter === "pending" && routine.status === "Pending") ||
            (statFilter === "completed" && routine.status === "Completed") ||
            (statFilter === "today" && routine.date === todayDate);
        return searchMatch && statusMatch && presetMatch && exactMatch && statMatch;
    });
};

const applyWeeklyFilters = (routines) => {
    const datePreset = document.getElementById("weeklyDatePreset")?.value || "week";
    const exactDate = document.getElementById("weeklyDateFilter")?.value || "";
    return routines.filter((routine) => matchesDashboardSearch(routine) && matchesDatePreset(routine.date, datePreset) && (!exactDate || routine.date === exactDate));
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
            ${routine.status === "Completed" ? '<div class="completed-badge"><span>Done</span><span>Completed Task</span></div>' : '<button type="button" class="secondary-button toggle-status">Mark Complete</button>'}
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
    const weeklyChart = document.getElementById("weeklyChart");
    const weeklyOverviewSummary = document.getElementById("weeklyOverviewSummary");
    const recentActivityList = document.getElementById("recentActivityList");
    const routineCategoryList = document.getElementById("routineCategoryList");
    const visibleRoutines = dedupeRoutines(dashboardState.routines).filter(matchesDashboardSearch);
    const todayRoutines = visibleRoutines
        .filter((routine) => routine.date === todayDate)
        .sort((first, second) => (first.start_time || "23:59").localeCompare(second.start_time || "23:59"));

    overviewTodayList.innerHTML = "";
    weeklyChart.innerHTML = "";
    weeklyOverviewSummary.innerHTML = "";
    recentActivityList.innerHTML = "";
    routineCategoryList.innerHTML = "";

    if (!todayRoutines.length) {
        renderEmptyState(overviewTodayList, "No routines lined up for today yet.");
    } else {
        todayRoutines.slice(0, 6).forEach((routine) => {
            const status = getVisualRoutineStatus(routine);
            const item = document.createElement("article");
            item.className = "rc-task-row";
            item.innerHTML = `
                <label class="rc-checkbox-wrap" aria-label="Toggle ${escapeHTML(routine.title)}">
                    <input type="checkbox" class="rc-task-checkbox" data-routine-id="${routine.id ?? ""}" ${routine.status === "Completed" ? "checked" : ""} ${routine.id ? "" : "disabled"}>
                    <span></span>
                </label>
                <div class="rc-task-copy">
                    <strong>${escapeHTML(routine.title)}</strong>
                    <small>${escapeHTML(getRoutineCategory(routine))}</small>
                </div>
                <time>${escapeHTML(formatTaskTimeRange(routine))}</time>
                <span class="rc-status ${status.toLowerCase().replace(/\s+/g, "-")}">${status}</span>
            `;
            overviewTodayList.appendChild(item);
        });

        overviewTodayList.querySelectorAll(".rc-task-checkbox").forEach((checkbox) => {
            checkbox.addEventListener("change", async (event) => {
                const routineId = event.currentTarget.dataset.routineId;
                if (!routineId) return;

                try {
                    const updatedRoutine = await fetchJson(`${API_BASE}/routines/${routineId}`, {
                        method: "PUT",
                        headers: authHeaders(),
                        body: JSON.stringify({
                            status: event.currentTarget.checked ? "Completed" : "Pending",
                        }),
                    });
                    upsertRoutineInState(updatedRoutine);
                    renderDashboardState();
                } catch (error) {
                    event.currentTarget.checked = !event.currentTarget.checked;
                    setMessage("routineMessage", error.message, "error");
                }
            });
        });
    }

    const weekDates = getWeekDates();
    const weekStats = weekDates.map((date) => {
        const dayRoutines = visibleRoutines.filter((routine) => routine.date === date);
        const completed = dayRoutines.filter((routine) => routine.status === "Completed").length;
        const progress = dayRoutines.length ? Math.round((completed / dayRoutines.length) * 100) : 0;
        return {
            date,
            total: dayRoutines.length,
            completed,
            pending: dayRoutines.length - completed,
            progress,
        };
    });

    renderWeeklyProgressChart(weekStats);

    const weeklyCompleted = weekStats.reduce((sum, day) => sum + day.completed, 0);
    const weeklyPending = weekStats.reduce((sum, day) => sum + day.pending, 0);
    const activeDays = weekStats.filter((day) => day.total > 0);
    const averageProgress = activeDays.length
        ? Math.round(activeDays.reduce((sum, day) => sum + day.progress, 0) / activeDays.length)
        : 0;

    [
        ["Completed", weeklyCompleted],
        ["Pending", weeklyPending],
        ["Avg progress", `${averageProgress}%`],
    ].forEach(([label, value]) => {
        const item = document.createElement("div");
        item.className = "rc-summary-item";
        item.innerHTML = `<strong>${value}</strong><span>${label}</span>`;
        weeklyOverviewSummary.appendChild(item);
    });

    const activityRoutines = [...visibleRoutines]
        .sort((first, second) => new Date(second.created_at || 0) - new Date(first.created_at || 0))
        .slice(0, 5);

    if (!activityRoutines.length) {
        renderEmptyState(recentActivityList, "Activity will appear when routines are created or completed.");
    } else {
        activityRoutines.forEach((routine) => {
            const status = getVisualRoutineStatus(routine);
            const item = document.createElement("article");
            item.className = "rc-activity-item";
            item.innerHTML = `
                <span class="rc-activity-icon"><i data-lucide="${status === "Completed" ? "check" : "activity"}"></i></span>
                <div>
                    <strong>${escapeHTML(routine.title)}</strong>
                    <small>${status} - ${escapeHTML(formatRelativeTime(routine.created_at))}</small>
                </div>
            `;
            recentActivityList.appendChild(item);
        });
    }

    const categoryMap = new Map();
    visibleRoutines.forEach((routine) => {
        const category = getRoutineCategory(routine);
        const current = categoryMap.get(category) || { total: 0, completed: 0 };
        current.total += 1;
        current.completed += routine.status === "Completed" ? 1 : 0;
        categoryMap.set(category, current);
    });

    const preferredOrder = ["Work", "Health", "Learning", "Personal", "Focus"];
    const categories = preferredOrder.map((name) => [name, categoryMap.get(name) || { total: 0, completed: 0 }]);

    categories.forEach(([category, counts]) => {
        const progress = counts.total ? Math.round((counts.completed / counts.total) * 100) : 0;
        const card = document.createElement("article");
        card.className = "rc-category-card";
        card.style.setProperty("--category-progress", `${progress}%`);
        card.innerHTML = `
            <div class="rc-category-head">
                <span><i data-lucide="${getRoutineCategoryIcon(category)}"></i></span>
                <strong>${category}</strong>
            </div>
            <div class="rc-category-meta">
                <span>${counts.completed}/${counts.total} done</span>
                <b>${progress}%</b>
            </div>
            <div class="rc-progress-track"><span></span></div>
        `;
        routineCategoryList.appendChild(card);
    });

    refreshIcons();
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
    document.getElementById("productivityProgressRing")?.style.setProperty("--score", `${stats.productivity_score}%`);
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
            clearSessionStorage();
            window.location.href = frontendPath("index.html");
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
    const plannerInput = document.getElementById("plannerInput");
    const plannerScope = document.getElementById("plannerScope");
    const plannerUrl = `${API_BASE}/generate-routine`;
    tipsContainer.innerHTML = "";
    latestPlannerPreviewRoutines = [];
    sessionStorage.removeItem("arc_latest_planner_preview");
    renderPlannerBreakdown([], { remember: false });
    window.clearTimeout(plannerBreakdownTimer);

    try {
        console.info("[Planner AI] Sending Groq-backed request", {
            url: plannerUrl,
            scope: plannerScope.value,
            inputLength: plannerInput.value.trim().length,
        });
        const result = await fetchJson(plannerUrl, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({
                input_text: plannerInput.value.trim(),
                plan_scope: plannerScope.value,
            }),
        });

        setMessage("plannerMessage", result.summary);
        const generatedRoutines = result.routines || [];
        console.info("[Planner AI] Groq response received", {
            routineCount: generatedRoutines.length,
            titles: generatedRoutines.map((routine) => routine.title),
        });
        renderPlannerBreakdown(generatedRoutines);
        tipsContainer.innerHTML = "";
        plannerInput.value = "";
        if (generatedRoutines.length) {
            await saveGeneratedRoutines(generatedRoutines);
            renderPlannerBreakdown(generatedRoutines, { remember: false });
        }
    } catch (error) {
        console.error("[Planner AI] Groq-backed request failed", error);
        setMessage("plannerMessage", error.message, "error");
    }
});

document.getElementById("logoutButton")?.addEventListener("click", () => {
    clearSessionStorage();
    window.location.href = frontendPath("index.html");
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

document.getElementById("dashboardSearchInput")?.addEventListener("input", (event) => {
    dashboardState.searchQuery = event.currentTarget.value;
    renderDashboardState();
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
refreshIcons();
if (latestPlannerPreviewRoutines.length) {
    renderPlannerBreakdown(latestPlannerPreviewRoutines, { remember: false });
}
loadDashboard();
