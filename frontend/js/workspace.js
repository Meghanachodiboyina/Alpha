const resolveApiBase = () => {
    const saved = localStorage.getItem("arc_api_base");
    if (saved) return saved;
    if (window.location.protocol.startsWith("http") && window.location.hostname) {
        return `${window.location.protocol}//${window.location.hostname}:8000`;
    }
    return "http://127.0.0.1:8000";
};

const API_BASE = resolveApiBase();
const token = localStorage.getItem("arc_token");
const currentUser = JSON.parse(localStorage.getItem("arc_user") || "null");
const savedTeamSpaces = JSON.parse(localStorage.getItem("workspace_custom_spaces") || "[]");
const allowedWorkspaceThemes = ["ocean", "dark", "light"];

if (!token) {
    window.location.href = "index.html";
}

const state = {
    tasks: [],
    projects: [],
    members: [],
    invites: [],
    aiTasks: [],
    aiTaskGroups: [],
    spaces: Array.isArray(savedTeamSpaces) ? savedTeamSpaces : [],
    settings: null,
    activeProject: null,
    activeView: "table",
    timelineRange: "today",
    activePage: "home",
    calendarDate: new Date(),
    filters: {
        search: "",
        status: "",
        priority: "",
        assignee: "",
        due_date: "",
        sort_by: "due_date",
        sort_order: "asc",
    },
};

const $ = (id) => document.getElementById(id);

const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
});

const fetchJson = async (url, options = {}) => {
    let response;
    try {
        response = await fetch(url, options);
    } catch (error) {
        throw new Error(`Failed to fetch workspace data. Make sure the backend is running at ${API_BASE}.`);
    }

    const data = response.status === 204 ? null : await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data?.detail || data?.message || "Something went wrong.");
    }
    return data;
};

const escapeHtml = (value = "") =>
    String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");

const setMessage = (message, type = "success") => {
    const box = $("workspaceMessage");
    box.textContent = message;
    box.className = `form-message ${message ? (type === "error" ? "error-text" : "success-text") : ""}`;
    window.clearTimeout(setMessage.timer);
    if (message) {
        setMessage.timer = window.setTimeout(() => {
            box.textContent = "";
            box.className = "form-message";
        }, 3600);
    }
};

const setLoading = (isLoading) => {
    const loader = $("workspaceLoading");

    if (isLoading) {
        loader.style.display = "flex";
    } else {
        loader.style.display = "none";
    }
};

const getInitials = (name = "") =>
    name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || "")
        .join("") || "U";

const formatDate = (value) => {
    if (!value) return "-";
    return new Date(`${value}T00:00:00`).toLocaleDateString([], { month: "short", day: "numeric" });
};

const formatProjectTitle = (name = "") => {
    const value = String(name).trim();
    if (!value) return "Team Space";
    return value === value.toLowerCase() ? value.charAt(0).toUpperCase() + value.slice(1) : value;
};

const buildQueryString = () => {
    const params = new URLSearchParams();
    Object.entries(state.filters).forEach(([key, value]) => {
        if (value && value !== "__invite__") {
            params.set(key, value);
        }
    });
    return params.toString() ? `?${params.toString()}` : "";
};

const persistSpaces = () => {
    localStorage.setItem("workspace_custom_spaces", JSON.stringify(state.spaces));
};

const setActivePage = (page) => {
    state.activePage = page;
};

const getVisibleTasks = () => state.activeProject
    ? state.tasks.filter((task) => task.project_name === state.activeProject)
    : state.tasks;
const getProjectAITasks = () => state.activeProject
    ? state.aiTasks.filter((task) => task.project_name === state.activeProject)
    : state.aiTasks;
const getProjectAITaskGroups = () => state.activeProject
    ? state.aiTaskGroups
        .map((group) => ({
            ...group,
            tasks: (group.tasks || []).filter((task) => task.project_name === state.activeProject),
        }))
        .filter((group) => group.tasks.length)
    : state.aiTaskGroups;

const getProjectCollections = () => {
    const projects = state.projects.length
        ? state.projects
        : [{ name: "Team Space", color: "#22c1c3" }, { name: "Project 1" }, { name: "Project 2" }];
    const storedSpaces = state.spaces
        .filter(Boolean)
        .map((name) => {
            const savedProject = projects.find((project) => project.name === name);
            return { id: savedProject?.id || 0, name, color: savedProject?.color || "#1779c6" };
        });
    const teamSpaces = [{ name: "Team Space", color: "#22c1c3" }, ...storedSpaces];
    const spaceNames = new Set(teamSpaces.map((space) => space.name));
    const otherProjects = projects.filter((project) => !spaceNames.has(project.name));
    return { teamSpaces, otherProjects };
};

const renderProjectButtons = (items, type, className = "workspace-project-item") =>
    items.map((project) => {
        const taskCount = state.tasks.filter((task) => task.project_name === project.name).length;
        const isDefaultTeamSpace = type === "space" && project.name === "Team Space";
        const canDelete = !isDefaultTeamSpace && (type === "space" || Number(project.id) > 0);
        return `
            <div class="workspace-project-row ${project.name === state.activeProject ? "active" : ""}">
                <button type="button" class="${className} ${project.name === state.activeProject ? "active" : ""}" data-project-filter="${escapeHtml(project.name)}">
                    <span>${escapeHtml(project.name)}</span>
                    <small>${taskCount}</small>
                </button>
                ${canDelete ? `
                    <button type="button" class="workspace-project-delete" aria-label="Delete ${escapeHtml(project.name)}" title="Delete" data-project-delete="${escapeHtml(project.name)}" data-project-type="${type}" data-project-id="${project.id || ""}">&times;</button>
                ` : ""}
            </div>
        `;
    }).join("");

const renderProjects = () => {
    const projects = state.projects.length
        ? state.projects
        : [{ name: "Team Space", color: "#22c1c3" }, { name: "Project 1" }, { name: "Project 2" }];
    const { teamSpaces, otherProjects } = getProjectCollections();
    const selectableItems = [...teamSpaces, ...otherProjects];

    if (state.activeProject && !selectableItems.some((project) => project.name === state.activeProject)) {
        state.activeProject = null;
    }

    $("workspaceProjectHeading").textContent = state.activeProject ? formatProjectTitle(state.activeProject) : "Workspace";
    $("workspaceTeamSpaceList").innerHTML = renderProjectButtons(teamSpaces, "space");
    $("workspaceProjectList").innerHTML = renderProjectButtons(otherProjects, "project");

    ["workspaceTaskProject", "workspaceAIProject"].forEach((id) => {
        const select = $(id);
        select.innerHTML = selectableItems.map((project) => `<option value="${escapeHtml(project.name)}">${escapeHtml(project.name)}</option>`).join("");
        select.value = state.activeProject || "Team Space";
    });
};

const renderAssignees = () => {
    const members = state.members.length
        ? state.members
        : [{ name: currentUser?.name || "User", email: currentUser?.email || "", role: "Owner", is_online: true }];
    const options = members.map((member) => `<option value="${escapeHtml(member.name)}">${escapeHtml(member.name)}</option>`).join("");

    const filter = $("workspaceAssigneeSelect");
    const previousValue = filter.value;
    filter.innerHTML = `<option value="">All Assignees</option>${options}<option value="__invite__">+ Invite People</option>`;
    if ([...filter.options].some((option) => option.value === previousValue)) {
        filter.value = previousValue;
    }

    ["workspaceTaskAssignee", "workspaceAIAssignee"].forEach((id) => {
        const select = $(id);
        const oldValue = select.value;
        select.innerHTML = `${options}<option value="__invite__">+ Invite People</option>`;
        select.value = [...select.options].some((option) => option.value === oldValue)
            ? oldValue
            : currentUser?.name || members[0]?.name || "";
    });
};

const renderMembers = () => {
    $("workspaceMemberCountSidebar").textContent = `(${state.members.length})`;
    $("workspaceSidebarMembers").innerHTML = "";
};

const renderTaskRow = (task) => `
        <tr>
            <td class="workspace-task-cell">
                <strong>${escapeHtml(task.title)}</strong>
                <small>${escapeHtml(task.description || task.project_name)}</small>
            </td>
            <td>
                <div class="workspace-assignee-cell">
                    <span class="workspace-member-avatar mini">${escapeHtml(getInitials(task.assignee))}</span>
                    <span>${escapeHtml(task.assignee)}</span>
                </div>
            </td>
            <td><span class="workspace-badge priority-${task.priority.toLowerCase()}">${escapeHtml(task.priority)}</span></td>
            <td>${formatDate(task.due_date)}</td>
            <td>
                <select class="workspace-control workspace-inline-select" data-status-task-id="${task.id}">
                    <option value="Todo" ${task.status === "Todo" ? "selected" : ""}>Todo</option>
                    <option value="In Progress" ${task.status === "In Progress" ? "selected" : ""}>In Progress</option>
                    <option value="Completed" ${task.status === "Completed" ? "selected" : ""}>Completed</option>
                </select>
            </td>
            <td>
                <div class="workspace-action-icons">
                    <button type="button" class="ghost-button workspace-edit" data-task-id="${task.id}">Edit</button>
                    <button type="button" class="ghost-button workspace-complete" data-task-id="${task.id}">Done</button>
                    <button type="button" class="ghost-button workspace-delete" data-task-id="${task.id}">Delete</button>
                </div>
            </td>
        </tr>
    `;

const renderTaskSection = (project, type) => {
    const tasks = state.tasks.filter((task) => task.project_name === project.name);
    return `
        <article class="workspace-list-card">
            <header class="workspace-list-card-header">
                <div>
                    <strong>${escapeHtml(formatProjectTitle(project.name))}</strong>
                </div>
                <small>${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}</small>
            </header>
            <div class="workspace-table-shell">
                <table class="workspace-table workspace-table-v2">
                    <thead>
                        <tr>
                            <th>Task Name</th>
                            <th>Assignee</th>
                            <th>Priority</th>
                            <th>Due Date</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tasks.length ? tasks.map(renderTaskRow).join("") : `<tr><td colspan="6"><div class="empty-state">No tasks found for this ${type}.</div></td></tr>`}
                    </tbody>
                </table>
            </div>
        </article>
    `;
};

const renderTable = () => {
    const { teamSpaces, otherProjects } = getProjectCollections();
    const allProjects = [...teamSpaces, ...otherProjects];
    if (!allProjects.length) {
        $("workspaceListSections").innerHTML = `<div class="empty-state">No spaces or projects found.</div>`;
        return;
    }
    const visibleProjects = state.activeProject
        ? allProjects.filter((project) => project.name === state.activeProject)
        : allProjects;
    $("workspaceListSections").innerHTML = visibleProjects.map((project) => {
        const type = teamSpaces.some((item) => item.name === project.name) ? "space" : "project";
        return renderTaskSection(project, type);
    }).join("");
};

const createBoardCard = (task) => {
    const card = document.createElement("article");
    card.className = "workspace-kanban-card";
    card.draggable = true;
    card.dataset.taskId = String(task.id);
    card.innerHTML = `
        <strong>${escapeHtml(task.title)}</strong>
        <span class="workspace-member-avatar mini workspace-board-avatar">${escapeHtml(getInitials(task.assignee))}</span>
        <div class="workspace-kanban-meta">
            <span class="workspace-badge priority-${task.priority.toLowerCase()}">${escapeHtml(task.priority)}</span>
            <span>${formatDate(task.due_date)}</span>
        </div>
    `;
    card.addEventListener("dragstart", (event) => {
        event.dataTransfer?.setData("text/plain", String(task.id));
        card.classList.add("dragging");
    });
    card.addEventListener("dragend", () => card.classList.remove("dragging"));
    card.addEventListener("dblclick", () => openTaskModal(task));
    return card;
};

const renderBoard = () => {
    const tasks = getVisibleTasks();
    ["Todo", "In Progress", "Completed"].forEach((status) => {
        const zone = document.querySelector(`.workspace-kanban-dropzone[data-workspace-status="${status}"]`);
        const items = tasks.filter((task) => task.status === status);
        zone.innerHTML = "";
        if (!items.length) {
            zone.innerHTML = `<div class="empty-state">No tasks</div>`;
            return;
        }
        items.forEach((task) => zone.appendChild(createBoardCard(task)));
    });

    $("workspaceTodoCount").textContent = String(tasks.filter((task) => task.status === "Todo").length);
    $("workspaceProgressCount").textContent = String(tasks.filter((task) => task.status === "In Progress").length);
    $("workspaceDoneCount").textContent = String(tasks.filter((task) => task.status === "Completed").length);
};

const getDateKey = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const productivityScoreForTasks = (tasks = []) => {
    if (!tasks.length) return 0;
    const score = tasks.reduce((total, task) => {
        if (task.status === "Completed") return total + 100;
        if (task.status === "In Progress") return total + 45;
        return total + 8;
    }, 0);
    return Math.round(score / tasks.length);
};

const buildTimelineSeries = (tasks, range) => {
    const now = new Date();
    const todayKey = getDateKey(now);
    if (range === "today") {
        const checkpoints = [8, 10, 12, 14, 16, 18, 20, 22].filter((hour) => hour <= Math.max(now.getHours(), 8));
        const hours = checkpoints.length ? checkpoints : [now.getHours()];
        const dueTasks = tasks.filter((task) => task.due_date === todayKey);
        const weightedScore = productivityScoreForTasks(dueTasks);
        return hours.map((hour) => ({
            label: `${hour}:00`,
            value: dueTasks.length ? Math.round(weightedScore * Math.min(1, Math.max(0.15, (hour + 1) / Math.max(now.getHours() + 1, 9)))) : 0,
            count: dueTasks.length,
        }));
    }
    if (range === "weekly") {
        const monday = new Date(now);
        const day = monday.getDay() || 7;
        monday.setDate(monday.getDate() - day + 1);
        return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label, index) => {
            const dayDate = new Date(monday);
            dayDate.setDate(monday.getDate() + index);
            const dayTasks = tasks.filter((task) => task.due_date === getDateKey(dayDate));
            return { label, value: productivityScoreForTasks(dayTasks), count: dayTasks.length };
        });
    }
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const bucketSize = Math.ceil(daysInMonth / 4);
    return [0, 1, 2, 3].map((bucket) => {
        const start = bucket * bucketSize + 1;
        const end = Math.min(daysInMonth, start + bucketSize - 1);
        const bucketTasks = tasks.filter((task) => {
            const taskDate = new Date(`${task.due_date}T00:00:00`);
            return taskDate >= new Date(now.getFullYear(), now.getMonth(), start)
                && taskDate <= new Date(now.getFullYear(), now.getMonth(), end);
        });
        return { label: `${start}-${end}`, value: productivityScoreForTasks(bucketTasks), count: bucketTasks.length };
    });
};

const renderTimeline = () => {
    const tasks = getVisibleTasks().slice().sort((a, b) => a.due_date.localeCompare(b.due_date));
    const timeline = $("workspaceTimeline");
    const filterMarkup = ["today", "weekly", "monthly"].map((range) => `
        <button type="button" class="workspace-graph-filter ${state.timelineRange === range ? "active" : ""}" data-timeline-range="${range}">
            ${range.charAt(0).toUpperCase() + range.slice(1)}
        </button>
    `).join("");

    if (!tasks.length) {
        timeline.innerHTML = `
            <section class="workspace-productivity-card">
                <div class="workspace-graph-filters">${filterMarkup}</div>
                <div class="empty-state">No task activity yet. Complete tasks to see growth.</div>
            </section>
        `;
        return;
    }

    const series = buildTimelineSeries(tasks, state.timelineRange);
    const hasActivity = series.some((point) => point.count > 0);
    if (!hasActivity) {
        timeline.innerHTML = `
            <section class="workspace-productivity-card">
                <div class="workspace-graph-filters">${filterMarkup}</div>
                <div class="empty-state">No task activity yet. Complete tasks to see growth.</div>
            </section>
        `;
        return;
    }

    const width = 720;
    const height = 260;
    const padding = 34;
    const points = series.map((point, index) => {
        const x = padding + (index * ((width - padding * 2) / Math.max(series.length - 1, 1)));
        const y = height - padding - ((point.value / 100) * (height - padding * 2));
        return { ...point, x, y };
    });
    const path = points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
    const areaPath = `${path} L ${points.at(-1).x} ${height - padding} L ${points[0].x} ${height - padding} Z`;
    const average = Math.round(series.reduce((sum, point) => sum + point.value, 0) / series.length);

    timeline.innerHTML = `
        <section class="workspace-productivity-card">
            <header class="workspace-productivity-header">
                <div>
                    <p class="eyebrow">Timeline Analytics</p>
                    <h4>Productivity Graph</h4>
                    <span>Completion trend from real workspace task statuses.</span>
                </div>
                <strong>${average}%</strong>
            </header>
            <div class="workspace-graph-filters">${filterMarkup}</div>
            <div class="workspace-graph-wrap">
                <svg class="workspace-productivity-graph" viewBox="0 0 ${width} ${height}" role="img" aria-label="Productivity percentage graph">
                    <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" />
                    <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" />
                    <path class="workspace-graph-area" d="${areaPath}" />
                    <path class="workspace-graph-line" d="${path}" />
                    ${points.map((point) => `
                        <g class="workspace-graph-point" tabindex="0">
                            <circle cx="${point.x}" cy="${point.y}" r="6"></circle>
                            <title>${point.label}: ${point.value}% (${point.count} task${point.count === 1 ? "" : "s"})</title>
                        </g>
                    `).join("")}
                    ${points.map((point) => `<text x="${point.x}" y="${height - 8}" text-anchor="middle">${escapeHtml(point.label)}</text>`).join("")}
                    <text x="8" y="${padding + 5}">100%</text>
                    <text x="14" y="${height - padding}">0%</text>
                </svg>
            </div>
        </section>
    `;
};
const renderCalendar = () => {
    const tasks = getVisibleTasks();
    const monthStart = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth(), 1);
    const monthEnd = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() + 1, 0);
    const firstGridDay = new Date(monthStart);
    firstGridDay.setDate(monthStart.getDate() - monthStart.getDay());
    const lastGridDay = new Date(monthEnd);
    lastGridDay.setDate(monthEnd.getDate() + (6 - monthEnd.getDay()));

    const taskMap = tasks.reduce((acc, task) => {
        if (!acc[task.due_date]) acc[task.due_date] = [];
        acc[task.due_date].push(task);
        return acc;
    }, {});

    $("workspaceCalendarCount").textContent = `${tasks.length} items`;
    $("workspaceCalendarMonthLabel").textContent = monthStart.toLocaleDateString([], { month: "long", year: "numeric" });

    const todayKey = new Date().toISOString().slice(0, 10);
    const cells = [];
    for (let day = new Date(firstGridDay); day <= lastGridDay; day.setDate(day.getDate() + 1)) {
        const dateKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
        const dayTasks = taskMap[dateKey] || [];
        const visibleTasks = dayTasks.slice(0, 3);
        const remainingCount = Math.max(0, dayTasks.length - visibleTasks.length);
        const isCurrentMonth = day.getMonth() === monthStart.getMonth();
        cells.push(`
            <article class="workspace-month-cell ${isCurrentMonth ? "" : "muted"} ${dateKey === todayKey ? "today" : ""}">
                <div class="workspace-month-date">
                    <span>${day.getDate()}</span>
                    ${dayTasks.length ? `<small>${dayTasks.length}</small>` : ""}
                </div>
                <div class="workspace-month-tasks">
                    ${dayTasks.length
                        ? `${visibleTasks.map((task) => `
                            <button type="button" class="workspace-calendar-task compact" data-task-id="${task.id}">
                                <strong>${escapeHtml(task.title)}</strong>
                                <small>${escapeHtml(task.assignee)}</small>
                            </button>
                        `).join("")}${remainingCount ? `<div class="workspace-calendar-more">+${remainingCount} More</div>` : ""}`
                        : `<div class="workspace-month-empty"></div>`}
                </div>
            </article>
        `);
    }
    $("workspaceCalendarGrid").innerHTML = cells.join("");
};

const renderAITasks = () => {
    const tasks = getProjectAITasks();
    $("workspaceAITaskSummary").textContent = tasks.length ? `${tasks.length} AI tasks saved` : "Generate tasks with AI";
    $("workspaceAITasks").innerHTML = tasks.length
        ? tasks.map((task) => `
            <article class="workspace-report-card workspace-ai-task-card">
                <span>${escapeHtml(task.project_name)}</span>
                <strong>${escapeHtml(task.title)}</strong>
                <small>${escapeHtml(task.assignee)} • ${escapeHtml(task.status)} • ${formatDate(task.due_date)}</small>
                <button type="button" class="ghost-button" data-task-id="${task.id}">Open Task</button>
            </article>
        `).join("")
        : `
            <article class="workspace-report-card workspace-report-wide">
                <span>AI Generated Tasks</span>
                <strong>No AI-generated tasks yet.</strong>
                <small>Use the Add AI Tasks button to create a task list for this project.</small>
            </article>
        `;
};

const getAITaskEstimate = (task) => {
    const text = `${task.title} ${task.description || ""}`.toLowerCase();
    if (text.includes("deploy") || text.includes("database") || text.includes("backend") || text.includes("api")) return "3 to 5 hours";
    if (text.includes("bug") || text.includes("fix") || text.includes("test") || text.includes("qa")) return "1 to 2 hours";
    if (text.includes("ui") || text.includes("design") || text.includes("frontend")) return "2 to 4 hours";
    if (text.includes("meeting") || text.includes("documentation") || text.includes("docs")) return "45 to 90 minutes";
    return "2 to 3 hours";
};

const renderAITaskGroups = () => {
    const groups = getProjectAITaskGroups();
    const totalTasks = groups.reduce((sum, group) => sum + (group.tasks?.length || 0), 0);
    $("workspaceAITaskSummary").textContent = groups.length ? `${groups.length} AI groups • ${totalTasks} tasks` : "Generate tasks with AI";
    $("workspaceAITasks").innerHTML = groups.length
        ? groups.map((group) => `
            <article class="workspace-ai-group-card">
                <header>
                    <div>
                        <span>Prompt</span>
                        <strong>${escapeHtml(group.prompt)}</strong>
                    </div>
                    <small>${new Date(group.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</small>
                </header>
                <div class="workspace-ai-group-tasks">
                    ${(group.tasks || []).map((task) => `
                        <button type="button" class="workspace-ai-task-row" data-task-id="${task.id}">
                            <span class="workspace-ai-project-name">${escapeHtml(task.project_name)}</span>
                            <strong>${escapeHtml(task.title)}</strong>
                            <small class="workspace-ai-quote">${escapeHtml(task.description || "Focused effort builds better products.")}</small>
                            <div class="workspace-ai-meta-grid">
                                <small class="workspace-ai-estimate">Estimated Time: ${escapeHtml(getAITaskEstimate(task))}</small>
                                <small class="workspace-ai-priority">Priority: ${escapeHtml(task.priority)}</small>
                            </div>
                        </button>
                    `).join("")}
                </div>
            </article>
        `).join("")
        : `
            <article class="workspace-report-card workspace-report-wide">
                <span>AI Generated Tasks</span>
                <strong>No AI-generated tasks yet.</strong>
                <small>Use the Add AI Tasks button to create a task list for this project.</small>
            </article>
        `;
};

const buildProjectReports = () => {
    const tasks = getVisibleTasks();
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((task) => task.status === "Completed").length;
    const inProgressTasks = tasks.filter((task) => task.status === "In Progress").length;
    const pendingTasks = totalTasks - completedTasks;
    const overdueTasks = tasks.filter((task) => task.status !== "Completed" && new Date(`${task.due_date}T00:00:00`) < new Date()).length;
    const productivity = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const memberPerformance = state.members.map((member) => {
        const assigned = tasks.filter((task) => task.assignee === member.name);
        const completed = assigned.filter((task) => task.status === "Completed").length;
        return {
            name: member.name,
            role: member.role,
            assigned_tasks: assigned.length,
            completed_tasks: completed,
            completion_rate: assigned.length ? Math.round((completed / assigned.length) * 100) : 0,
        };
    }).sort((a, b) => b.completion_rate - a.completion_rate || b.completed_tasks - a.completed_tasks);

    return {
        totalTasks,
        completedTasks,
        inProgressTasks,
        pendingTasks,
        overdueTasks,
        productivity,
        memberPerformance,
    };
};

const renderReports = () => {
    const report = buildProjectReports();
    $("workspaceReportSummary").textContent = `${report.productivity}% productivity`;
    $("workspaceReports").innerHTML = `
        <article class="workspace-report-card"><span>Total Tasks</span><strong>${report.totalTasks}</strong></article>
        <article class="workspace-report-card"><span>Completed Tasks</span><strong>${report.completedTasks}</strong></article>
        <article class="workspace-report-card"><span>Pending Tasks</span><strong>${report.pendingTasks}</strong></article>
        <article class="workspace-report-card"><span>In Progress</span><strong>${report.inProgressTasks}</strong></article>
        <article class="workspace-report-card"><span>Overdue</span><strong>${report.overdueTasks}</strong></article>
        <article class="workspace-report-card"><span>Productivity</span><strong>${report.productivity}%</strong></article>
    `;

    $("workspaceMemberPerformance").innerHTML = report.memberPerformance.length
        ? report.memberPerformance.map((member) => `
            <article class="workspace-invite-row">
                <div>
                    <strong>${escapeHtml(member.name)}</strong>
                    <small>${member.assigned_tasks} assigned • ${member.completed_tasks} completed</small>
                </div>
                <span class="workspace-badge">${member.completion_rate}%</span>
            </article>
        `).join("")
        : `<div class="empty-state">No member performance data yet.</div>`;
};

const renderInvites = () => {
    const pending = state.invites.filter((invite) => invite.status === "Pending");
    $("workspacePendingInviteCount").textContent = `${pending.length} pending`;
    $("viewAllMembersButton").textContent = pending.length
        ? `Invites (${pending.length})`
        : "Invites";
    const inviteMarkup = state.invites.length
        ? state.invites.map((invite) => `
            <article class="workspace-invite-row">
                <div>
                    <strong>${escapeHtml(invite.invitee_email)}</strong>
                    <small>${escapeHtml(invite.role || "Member")} • ${escapeHtml(invite.status)}${invite.created_at ? ` • ${new Date(invite.created_at).toLocaleDateString()}` : ""}</small>
                </div>
                <span class="workspace-badge">${escapeHtml(invite.status)}</span>
            </article>
        `).join("")
        : `<div class="empty-state">No invitations yet.</div>`;
    $("workspaceInviteList").innerHTML = inviteMarkup;
    const modalList = $("workspaceInviteModalList");
    if (modalList) modalList.innerHTML = inviteMarkup;
};

const renderSettings = () => {
    const settings = state.settings || {
        workspace_name: "Team Space",
        theme: "ocean",
        notifications_enabled: true,
        email_notifications_enabled: true,
    };

    $("workspaceNameInput").value = settings.workspace_name || "Team Space";
    const theme = allowedWorkspaceThemes.includes(settings.theme) ? settings.theme : "ocean";
    $("workspaceSettingsAccountName").textContent = currentUser?.name || "User";
    $("workspaceSettingsAccountEmail").textContent = currentUser?.email || "No email available";
    $("workspaceNotificationsInput").checked = Boolean(settings.notifications_enabled);
    $("workspaceEmailNotificationsInput").checked = Boolean(settings.email_notifications_enabled);
    $("workspaceSettingsStatus").textContent = "Profile, account, notifications";
    document.body.dataset.workspaceTheme = theme;
};

const renderPages = () => {
    const pageMap = {
        home: "workspaceHomePage",
        calendar: "workspaceCalendarPage",
        aiTasks: "workspaceAITasksPage",
        reports: "workspaceReportsPage",
        settings: "workspaceSettingsPage",
        invites: "workspaceInvitesPage",
    };
    document.querySelectorAll(".workspace-page").forEach((page) => {
        page.hidden = page.id !== pageMap[state.activePage];
    });
    document.querySelectorAll("[data-page-target]").forEach((button) => {
        button.classList.toggle("active", button.dataset.pageTarget === state.activePage);
    });
    $("workspaceTopbar").hidden = !["home", "calendar"].includes(state.activePage);
    $("workspaceProjectHeading").textContent = ["settings", "invites", "calendar", "aiTasks", "reports"].includes(state.activePage)
        ? ({
            settings: "Settings",
            invites: "Invitations",
            calendar: "Calendar",
            aiTasks: "AI Generated Tasks",
            reports: "Reports",
        }[state.activePage])
        : state.activeProject ? formatProjectTitle(state.activeProject) : "Workspace";
    const showViewSwitch = ["home", "calendar"].includes(state.activePage);
    document.querySelector(".workspace-view-switch").hidden = !showViewSwitch;
    document.body.classList.toggle("workspace-focus-tool", state.activePage !== "home");
};

const renderViews = () => {
    const panelMap = {
        table: "workspaceTableView",
        board: "workspaceBoardView",
        timeline: "workspaceTimelineView",
    };
    document.querySelectorAll(".workspace-view-panel").forEach((panel) => {
        panel.hidden = panel.id !== panelMap[state.activeView];
    });
    document.querySelectorAll("[data-workspace-view]").forEach((button) => {
        button.classList.toggle("active", state.activePage === "home" && button.dataset.workspaceView === state.activeView);
    });
};

const renderFilterActiveStates = () => {
    const filterState = {
        workspaceSearchWrap: Boolean(state.filters.search),
        workspaceFilterSelect: Boolean(state.filters.status),
        workspaceSortSelect: false,
        workspaceAssigneeSelect: Boolean(state.filters.assignee),
        workspacePrioritySelect: Boolean(state.filters.priority),
        workspaceDateFilterButton: Boolean(state.filters.due_date),
    };
    Object.entries(filterState).forEach(([id, isActive]) => {
        $(id)?.classList.toggle("active", isActive);
    });
};

const renderAll = () => {
    renderProjects();
    renderAssignees();
    renderMembers();
    renderTable();
    renderBoard();
    renderTimeline();
    renderCalendar();
    renderAITaskGroups();
    renderReports();
    renderInvites();
    renderSettings();
    $("workspaceDateFilterLabel").textContent = state.filters.due_date || "All Dates";
    renderViews();
    renderPages();
    renderFilterActiveStates();
};

const loadWorkspace = async () => {
    setLoading(true);
    try {
        const data = await fetchJson(`${API_BASE}/workspace/bootstrap${buildQueryString()}`, {
            headers: authHeaders(),
        });
        state.tasks = data.tasks || [];
        state.projects = data.projects || [];
        state.members = data.members || [];
        state.invites = data.invites || [];
        state.aiTasks = data.ai_tasks || [];
        state.aiTaskGroups = data.ai_task_groups || [];
        state.settings = data.settings || null;

        const { teamSpaces, otherProjects } = getProjectCollections();
        if (state.activeProject && ![...teamSpaces, ...otherProjects].some((project) => project.name === state.activeProject)) {
            state.activeProject = null;
        }

        renderAll();
    } catch (error) {
        setMessage(error.message, "error");
    } finally {
        setLoading(false);
    }
};

const openDialog = (id) => {
    const dialog = $(id);
    if (dialog.open) return;
    dialog.showModal();
};
const closeDialog = (id) => $(id).close();

const openTaskModal = (task = null) => {
    $("workspaceTaskModalTitle").textContent = task ? "Edit Workspace Task" : "Add Workspace Task";
    $("workspaceTaskId").value = task?.id || "";
    $("workspaceTaskTitle").value = task?.title || "";
    $("workspaceTaskDescription").value = task?.description || "";
    $("workspaceTaskPriority").value = task?.priority || "Medium";
    $("workspaceTaskStatus").value = task?.status || "Todo";
    $("workspaceTaskDueDate").value = task?.due_date || new Date().toISOString().slice(0, 10);
    $("workspaceTaskEstimate").value = task ? `${task.progress || 0}% complete` : "";
    $("workspaceTaskProject").value = task?.project_name || state.activeProject || "Team Space";
    $("workspaceTaskAssignee").value = task?.assignee || currentUser?.name || "";
    openDialog("workspaceTaskModal");
};

const suggestEstimate = () => {
    const title = $("workspaceTaskTitle").value.trim().toLowerCase();
    const description = $("workspaceTaskDescription").value.trim().toLowerCase();
    const text = `${title} ${description}`;
    let estimate = "2 to 3 hours";
    if (text.includes("api") || text.includes("backend")) estimate = "4 to 6 hours";
    if (text.includes("testing") || text.includes("qa")) estimate = "2 hours";
    if (text.includes("design") || text.includes("ui") || text.includes("frontend")) estimate = "3 to 5 hours";
    if (text.includes("deploy") || text.includes("integration")) estimate = "1 day";
    $("workspaceTaskEstimate").value = estimate;
};

const saveTask = async (event) => {
    event.preventDefault();
    const assignee = $("workspaceTaskAssignee").value;
    if (assignee === "__invite__") {
        openDialog("workspaceInviteModal");
        return;
    }

    const taskId = $("workspaceTaskId").value;
    const payload = {
        title: $("workspaceTaskTitle").value.trim(),
        description: $("workspaceTaskDescription").value.trim() || null,
        assignee,
        priority: $("workspaceTaskPriority").value,
        status: $("workspaceTaskStatus").value,
        due_date: $("workspaceTaskDueDate").value,
        progress: taskId ? undefined : 0,
        project_name: $("workspaceTaskProject").value,
    };

    try {
        const savedTask = await fetchJson(taskId ? `${API_BASE}/workspace/tasks/${taskId}` : `${API_BASE}/workspace/tasks`, {
            method: taskId ? "PUT" : "POST",
            headers: authHeaders(),
            body: JSON.stringify(payload),
        });
        if (taskId) {
            state.tasks = state.tasks.map((task) => task.id === savedTask.id ? savedTask : task);
            state.aiTasks = state.aiTasks.map((task) => task.id === savedTask.id ? savedTask : task);
        } else {
            state.tasks = [savedTask, ...state.tasks];
        }
        closeDialog("workspaceTaskModal");
        setMessage(taskId ? "Task updated." : "Task created.");
        renderAll();
    } catch (error) {
        setMessage(error.message, "error");
    }
};

const updateTask = async (taskId, patch, successMessage = "Task updated.") => {
    try {
        const updatedTask = await fetchJson(`${API_BASE}/workspace/tasks/${taskId}`, {
            method: "PUT",
            headers: authHeaders(),
            body: JSON.stringify(patch),
        });
        state.tasks = state.tasks.map((task) => task.id === updatedTask.id ? updatedTask : task);
        state.aiTasks = state.aiTasks.map((task) => task.id === updatedTask.id ? updatedTask : task);
        state.aiTaskGroups = state.aiTaskGroups.map((group) => ({
            ...group,
            tasks: group.tasks.map((task) => task.id === updatedTask.id ? updatedTask : task),
        }));
        setMessage(successMessage);
        renderAll();
    } catch (error) {
        setMessage(error.message, "error");
    }
};

const deleteTask = async (taskId) => {
    try {
        await fetchJson(`${API_BASE}/workspace/tasks/${taskId}`, {
            method: "DELETE",
            headers: authHeaders(),
        });
        state.tasks = state.tasks.filter((task) => task.id !== taskId);
        state.aiTasks = state.aiTasks.filter((task) => task.id !== taskId);
        state.aiTaskGroups = state.aiTaskGroups
            .map((group) => ({ ...group, tasks: group.tasks.filter((task) => task.id !== taskId) }))
            .filter((group) => group.tasks.length);
        setMessage("Task deleted.");
        renderAll();
    } catch (error) {
        setMessage(error.message, "error");
    }
};

const handleTableActions = async (event) => {
    const actionButton = event.target.closest("[data-task-id]");
    if (actionButton) {
        const taskId = Number(actionButton.dataset.taskId);
        const task = state.tasks.find((item) => item.id === taskId);
        if (!task) return;

        if (actionButton.classList.contains("workspace-edit")) {
            openTaskModal(task);
            return;
        }
        if (actionButton.classList.contains("workspace-complete")) {
            await updateTask(taskId, { status: "Completed", progress: 100 }, "Task marked complete.");
            return;
        }
        if (actionButton.classList.contains("workspace-delete")) {
            await deleteTask(taskId);
        }
    }

    const statusSelect = event.target.closest("[data-status-task-id]");
    if (statusSelect) {
        const taskId = Number(statusSelect.dataset.statusTaskId);
        const status = statusSelect.value;
        await updateTask(taskId, { status, progress: status === "Completed" ? 100 : undefined }, "Task status updated.");
    }
};

const handleInviteSubmit = async (event) => {
    event.preventDefault();
    try {
        const result = await fetchJson(`${API_BASE}/workspace/invitations`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({
                invitee_email: $("workspaceInviteEmail").value.trim(),
                role: $("workspaceInviteRole").value,
            }),
        });
        $("workspaceInviteEmail").value = "";
        closeDialog("workspaceInviteModal");
        setMessage(result?.message || "Invite sent.");
        await loadWorkspace();
    } catch (error) {
        setMessage(error.message, "error");
    }
};

const handleAIGenerate = async (event) => {
    event.preventDefault();
    const assignee = $("workspaceAIAssignee").value;
    if (assignee === "__invite__") {
        openDialog("workspaceInviteModal");
        return;
    }

    const prompt = $("workspaceAIPrompt").value.trim();
    if (!prompt) {
        setMessage("Enter a task prompt for AI generation.", "error");
        return;
    }

    const submit = document.querySelector("#workspaceAIForm button[type='submit']");
    try {
        if (submit) {
            submit.disabled = true;
            submit.textContent = "Generating...";
        }
        const result = await fetchJson(`${API_BASE}/workspace/ai-generate`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({
                prompt,
                project_name: $("workspaceAIProject").value,
                assignee,
            }),
        });
        closeDialog("workspaceAIModal");
        $("workspaceAIPrompt").value = "";
        state.activeProject = $("workspaceAIProject").value || null;
        state.tasks = [...(result.tasks || []), ...state.tasks];
        state.aiTasks = [...(result.tasks || []), ...state.aiTasks];
        if (result.tasks?.length) {
            state.aiTaskGroups = [
                {
                    prompt,
                    created_at: new Date().toISOString(),
                    tasks: result.tasks,
                },
                ...state.aiTaskGroups,
            ];
        }
        setActivePage("aiTasks");
        setMessage(result.message || "AI tasks generated.");
        renderAll();
    } catch (error) {
        setMessage(error.message, "error");
    } finally {
        if (submit) {
            submit.disabled = false;
            submit.textContent = "Generate";
        }
    }
};

const createProject = async () => {
    const name = window.prompt("Enter the new project name");
    if (!name || !name.trim()) return;
    try {
        const project = await fetchJson(`${API_BASE}/workspace/projects`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({
                name: name.trim(),
                description: null,
                color: "#22c1c3",
            }),
        });
        state.activeProject = project.name;
        setActivePage("home");
        setMessage("Project created.");
        await loadWorkspace();
    } catch (error) {
        setMessage(error.message, "error");
    }
};

const createTeamSpace = () => {
    const name = window.prompt("Enter the new team space name");
    if (!name || !name.trim()) return;
    const normalized = name.trim();
    if (!state.spaces.includes(normalized) && normalized !== "Team Space") {
        state.spaces.push(normalized);
        persistSpaces();
    }
    state.activeProject = normalized;
    setActivePage("home");
    renderAll();
    setMessage("Team space created.");
};

const deleteWorkspaceProject = async (button) => {
    const name = button.dataset.projectDelete;
    const type = button.dataset.projectType;
    const projectId = Number(button.dataset.projectId);
    if (!name) return;
    const confirmed = window.confirm("Delete this project/space?");
    if (!confirmed) return;

    if (type === "space") {
        const spaceTasks = state.tasks.filter((task) => task.project_name === name);
        try {
            if (projectId) {
                await fetchJson(`${API_BASE}/workspace/projects/${projectId}`, {
                    method: "DELETE",
                    headers: authHeaders(),
                });
            } else {
                await Promise.all(spaceTasks.map((task) => fetchJson(`${API_BASE}/workspace/tasks/${task.id}`, {
                    method: "DELETE",
                    headers: authHeaders(),
                })));
            }
            state.spaces = state.spaces.filter((spaceName) => spaceName !== name);
            persistSpaces();
            if (state.activeProject === name) {
                state.activeProject = "Team Space";
                state.activeView = "table";
                setActivePage("home");
            }
            setMessage("Team space deleted.");
            await loadWorkspace();
        } catch (error) {
            setMessage(error.message, "error");
        }
        return;
    }

    if (!projectId) {
        setMessage("This project cannot be deleted yet.", "error");
        return;
    }

    try {
        await fetchJson(`${API_BASE}/workspace/projects/${projectId}`, {
            method: "DELETE",
            headers: authHeaders(),
        });
        if (state.activeProject === name) {
            state.activeProject = "Team Space";
            state.activeView = "table";
            setActivePage("home");
        }
        setMessage("Project deleted.");
        await loadWorkspace();
    } catch (error) {
        setMessage(error.message, "error");
    }
};

const saveSettings = async (event) => {
    event.preventDefault();
    try {
        const result = await fetchJson(`${API_BASE}/workspace/settings`, {
            method: "PUT",
            headers: authHeaders(),
            body: JSON.stringify({
                workspace_name: $("workspaceNameInput").value.trim(),
                theme: state.settings?.theme || "ocean",
                notifications_enabled: $("workspaceNotificationsInput").checked,
                email_notifications_enabled: $("workspaceEmailNotificationsInput").checked,
                permission_mode: state.settings?.permission_mode || "members_edit",
            }),
        });
        state.settings = result;
        renderSettings();
        setMessage("Workspace settings saved.");
    } catch (error) {
        setMessage(error.message, "error");
    }
};

const applyFilters = () => {
    const assignee = $("workspaceAssigneeSelect").value;
    if (assignee === "__invite__") {
        $("workspaceAssigneeSelect").value = "";
        openDialog("workspaceInviteModal");
        return;
    }

    state.filters.search = $("workspaceSearchInput").value.trim();
    state.filters.status = $("workspaceFilterSelect").value;
    state.filters.priority = $("workspacePrioritySelect").value;
    state.filters.assignee = assignee;
    state.filters.due_date = $("workspaceDateFilter").value;
    const [sortBy, sortOrder] = $("workspaceSortSelect").value.split(":");
    state.filters.sort_by = sortBy;
    state.filters.sort_order = sortOrder;
    renderFilterActiveStates();
    loadWorkspace();
};

$("workspaceUserAvatar").textContent = getInitials(currentUser?.name || "User");
$("workspaceProfileAvatar").textContent = getInitials(currentUser?.name || "User");
$("workspaceProfileName").textContent = currentUser?.name || "User";
$("workspaceProfileEmail").textContent = currentUser?.email || "No email available";

const closeProfileMenu = () => {
    $("workspaceProfileMenu").hidden = true;
    $("workspaceUserAvatar").setAttribute("aria-expanded", "false");
};

const toggleProfileMenu = () => {
    const menu = $("workspaceProfileMenu");
    menu.hidden = !menu.hidden;
    $("workspaceUserAvatar").setAttribute("aria-expanded", String(!menu.hidden));
};

const setupWorkspaceVoiceInput = ({ inputId, micId, sendId, statusId, formId, idleText }) => {
    const input = $(inputId);
    const mic = $(micId);
    const send = $(sendId);
    const status = $(statusId);
    const form = $(formId);

    if (!input || !mic || !send || !form) return;

    if (!window.createGroqVoiceInput) {
        mic.disabled = true;
        send.disabled = !input.value.trim();
        if (status) status.textContent = "Voice recorder could not load. Refresh and try again.";
        return;
    }

    window.createGroqVoiceInput({
        button: mic,
        input,
        sendButton: send,
        status,
        form,
        idleText,
        readyText: "Voice text ready. Click Send to submit.",
    });
};

$("workspaceTaskForm").addEventListener("submit", saveTask);
$("workspaceAIForm").addEventListener("submit", handleAIGenerate);
$("workspaceInviteForm").addEventListener("submit", handleInviteSubmit);
$("workspaceSettingsForm").addEventListener("submit", saveSettings);
$("workspaceListSections").addEventListener("click", handleTableActions);
$("workspaceListSections").addEventListener("change", handleTableActions);
$("workspaceCalendarGrid").addEventListener("click", (event) => {
    const button = event.target.closest("[data-task-id]");
    if (!button) return;
    const task = state.tasks.find((item) => item.id === Number(button.dataset.taskId));
    if (task) openTaskModal(task);
});
$("workspaceAITasks").addEventListener("click", (event) => {
    const button = event.target.closest("[data-task-id]");
    if (!button) return;
    const task = state.tasks.find((item) => item.id === Number(button.dataset.taskId));
    if (task) openTaskModal(task);
});
$("workspaceTimeline").addEventListener("click", (event) => {
    const rangeButton = event.target.closest("[data-timeline-range]");
    if (!rangeButton) return;
    state.timelineRange = rangeButton.dataset.timelineRange || "today";
    renderTimeline();
});
$("viewAllMembersButton").addEventListener("click", () => {
    renderInvites();
    openDialog("workspaceInvitesListModal");
});
$("openTaskModalButton").addEventListener("click", () => openTaskModal());
$("openAIModalButton").addEventListener("click", () => {
    renderProjects();
    renderAssignees();
    openDialog("workspaceAIModal");
});
$("openInviteModalButton").addEventListener("click", () => openDialog("workspaceInviteModal"));
$("closeTaskModalButton").addEventListener("click", () => closeDialog("workspaceTaskModal"));
$("cancelTaskModalButton").addEventListener("click", () => closeDialog("workspaceTaskModal"));
$("closeAIModalButton").addEventListener("click", () => closeDialog("workspaceAIModal"));
$("cancelAIModalButton").addEventListener("click", () => closeDialog("workspaceAIModal"));
$("closeInviteModalButton").addEventListener("click", () => closeDialog("workspaceInviteModal"));
$("cancelInviteModalButton").addEventListener("click", () => closeDialog("workspaceInviteModal"));
$("closeInvitesListModalButton").addEventListener("click", () => closeDialog("workspaceInvitesListModal"));
$("suggestEstimateButton").addEventListener("click", suggestEstimate);
$("newProjectButton").addEventListener("click", createProject);
$("newTeamSpaceButton").addEventListener("click", createTeamSpace);
$("workspaceCalendarPrev").addEventListener("click", () => {
    state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() - 1, 1);
    renderCalendar();
});
$("workspaceCalendarNext").addEventListener("click", () => {
    state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() + 1, 1);
    renderCalendar();
});
$("workspaceLogoutButton").addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "index.html";
});
$("workspaceProfileLogoutButton").addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "index.html";
});
$("workspaceSettingsLogoutButton").addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "index.html";
});
$("workspaceUserAvatar").addEventListener("click", (event) => {
    event.stopPropagation();
    toggleProfileMenu();
});
setupWorkspaceVoiceInput({
    inputId: "workspaceTaskTitle",
    micId: "workspaceTaskMicButton",
    sendId: "workspaceTaskVoiceSendButton",
    statusId: "workspaceTaskVoiceStatus",
    formId: "workspaceTaskForm",
    idleText: "Use mic to fill the title.",
});
setupWorkspaceVoiceInput({
    inputId: "workspaceAIPrompt",
    micId: "workspaceAIMicButton",
    sendId: "workspaceAIVoiceSendButton",
    statusId: "workspaceAIVoiceStatus",
    formId: "workspaceAIForm",
    idleText: "Use mic to fill the prompt.",
});
$("workspaceDateFilterButton").addEventListener("click", () => {
    const input = $("workspaceDateFilter");
    if (typeof input.showPicker === "function") {
        input.showPicker();
    } else {
        input.click();
    }
});
$("workspaceSearchToggle").addEventListener("click", () => {
    $("workspaceSearchWrap").classList.toggle("collapsed");
    if (!$("workspaceSearchWrap").classList.contains("collapsed")) {
        $("workspaceSearchInput").focus();
    }
});
$("workspaceSearchInput").addEventListener("focus", () => {
    $("workspaceSearchWrap").classList.remove("collapsed");
});
$("workspaceSearchInput").addEventListener("blur", () => {
    if (!$("workspaceSearchInput").value.trim()) {
        $("workspaceSearchWrap").classList.add("collapsed");
    }
});
document.querySelectorAll("[data-workspace-view]").forEach((button) => {
    button.addEventListener("click", () => {
        state.activeView = button.dataset.workspaceView;
        setActivePage("home");
        renderViews();
        renderPages();
    });
});

document.querySelectorAll("[data-page-target]").forEach((button) => {
    button.addEventListener("click", () => {
        const nextPage = state.activePage === button.dataset.pageTarget ? "home" : button.dataset.pageTarget;
        setActivePage(nextPage);
        if (nextPage === "home") {
            state.activeProject = null;
            state.activeView = "table";
            renderAll();
            return;
        }
        renderPages();
    });
});

["workspaceSearchInput", "workspaceFilterSelect", "workspaceSortSelect", "workspaceAssigneeSelect", "workspacePrioritySelect", "workspaceDateFilter"].forEach((id) => {
    $(id).addEventListener(id === "workspaceSearchInput" ? "input" : "change", applyFilters);
});

document.querySelectorAll(".workspace-kanban-dropzone").forEach((zone) => {
    zone.addEventListener("dragover", (event) => {
        event.preventDefault();
        zone.classList.add("over");
    });
    zone.addEventListener("dragleave", () => zone.classList.remove("over"));
    zone.addEventListener("drop", async (event) => {
        event.preventDefault();
        zone.classList.remove("over");
        const taskId = Number(event.dataTransfer?.getData("text/plain"));
        if (taskId) {
            await updateTask(taskId, { status: zone.dataset.workspaceStatus }, "Task status updated.");
        }
    });
});

document.addEventListener("click", (event) => {
    if (!$("workspaceProfileMenu").hidden && !event.target.closest("#workspaceProfileMenu") && !event.target.closest("#workspaceUserAvatar")) {
        closeProfileMenu();
    }

    const deleteButton = event.target.closest("[data-project-delete]");
    if (deleteButton) {
        deleteWorkspaceProject(deleteButton);
        return;
    }

    const button = event.target.closest("[data-project-filter]");
    if (!button) return;
    state.activeProject = state.activeProject === button.dataset.projectFilter ? null : button.dataset.projectFilter;
    state.activeView = "table";
    setActivePage("home");
    renderAll();
});

$("workspaceDateFilter").addEventListener("change", () => {
    $("workspaceDateFilterLabel").textContent = $("workspaceDateFilter").value || "All Dates";
});

loadWorkspace();
